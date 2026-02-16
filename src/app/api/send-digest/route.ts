
import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { Resend } from 'resend';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const runtime = 'edge';

// Initialize Clients
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
const resend = new Resend(process.env.RESEND_API_KEY);

export async function GET(request: Request) {
    return handleDigest(request);
}

export async function POST(request: Request) {
    return handleDigest(request);
}

async function handleDigest(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const mode = searchParams.get('mode'); // 'batch', 'test', or null

        // --- BATCH MODE (For Cron/Automation) ---
        // Requires Service Role Key or protected logic. For now, we assume this is triggered by cron.
        if (mode === 'batch') {
            const supabaseAdmin = createAdminClient();

            // 1. Find all users who have 'Todo' tasks
            // We can't do `distinct` easily with simple SDK select on some versions, but let's try or fetch all todos and group in JS.
            const { data: allTasks, error: tasksError } = await supabaseAdmin
                .from('tasks')
                .select('user_id, status')
                .eq('status', 'Todo');

            if (tasksError) throw new Error(`Fetch tasks error: ${tasksError.message}`);

            const userIds = Array.from(new Set(allTasks?.map(t => t.user_id).filter(Boolean)));

            const results = [];

            for (const userId of userIds) {
                try {
                    console.log(`Processing user: ${userId}`);
                    const result = await processUserDigest(userId as string, supabaseAdmin);
                    results.push({ userId, status: 'success', ...result });
                } catch (e) {
                    console.error(`Error processing user ${userId}:`, e);
                    results.push({ userId, status: 'error', error: (e as Error).message });
                }
            }

            return NextResponse.json({
                message: 'Batch processing completed',
                results
            });
        }

        // --- SINGLE USER MODE (Triggered from UI) ---
        else {
            const supabase = await createClient();
            const { data: { user } } = await supabase.auth.getUser();

            if (!user) {
                // Fallback for simple local test without auth if needed, but now we enforce auth or batch
                return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
            }

            const result = await processUserDigest(user.id, supabase); // Pass the user's client (or admin client if we want force)
            // Actually, to read profiles we generally need RLS or own access. 
            // If we use `supabase` (user client), we rely on RLS. user can read own tasks and profile. OK.
            // But we can't read email from `auth.users` easily with user client. 
            // So for UI trigger, we might pass email in body or assume we use `user.email`.

            return NextResponse.json({
                message: 'Digest sent successfully',
                data: result
            });
        }

    } catch (error) {
        console.error('Digest Error:', error);
        return NextResponse.json({ error: (error as Error).message }, { status: 500 });
    }
}

// Helper to process a single user
async function processUserDigest(userId: string, supabaseClient: any) {
    // Determine which client to use for which part
    // If supabaseClient is the Admin Client, we can do everything.
    // If it is the User Client, we might be limited accessing `auth.users`.

    // Check if client is admin (hacky check: check if we can list users or just try)
    // Safer: Always use Admin client for fetching specific user details like Email if needed, 
    // but we can pass email if known.
    // For simplicity: If this function is called, we assume we want to send digest for `userId`.

    // We need Admin Privileges to fetch tasks OF another user (if batching) OR if we are the user (RLS).
    // To keep it simple: Let's use Admin Client for fetches if we are in batch, and specific client if not.
    // Actually, let's just use Admin Client for the data fetching inside this helper if possible, 
    // OR rely on the passed client being appropriate.
    // BUT: RLS prevents admin client? No, Admin key bypasses RLS.
    // So for Batch: passed client IS admin.
    // For Single User: passed client IS user.
    // User client CAN read own tasks. User client CAN read own profile.
    // User client CANNOT read `auth.users` to get email directly usually.
    // So for Single User, we rely on `user.email` from `getUser()`.

    let email = '';

    // 1. Get User Email
    // Try to get from auth.users (requires admin) OR from the session (if available)
    // If supabaseClient has `auth.getUser()`, use that.
    const { data: { user } } = await supabaseClient.auth.getUser();

    if (user && user.id === userId) {
        email = user.email;
    } else {
        // We are likely in Admin/Batch mode, need to fetch user by ID
        // Only admin client can do `auth.admin.getUserById`
        const supabaseAdmin = createAdminClient(); // Always safe to create here for this specific lookup
        const { data, error } = await supabaseAdmin.auth.admin.getUserById(userId);
        if (data?.user) {
            email = data.user.email || '';
        }
    }

    if (!email && process.env.TARGET_EMAIL) {
        email = process.env.TARGET_EMAIL; // Fallback for dev/debug
    }

    if (!email) {
        return { message: 'No email found for user', userId };
    }

    // 2. Fetch Tasks
    const { data: tasks, error: dbError } = await supabaseClient
        .from('tasks')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'Todo')
        .order('created_at', { ascending: false });

    if (dbError) throw new Error(dbError.message);

    if (!tasks || tasks.length === 0) {
        return { message: 'No pending tasks.', userId };
    }

    // 3. Fetch LINE ID (from profiles)
    let lineUserId = null;
    const { data: profile } = await supabaseClient
        .from('profiles')
        .select('line_user_id')
        .eq('id', userId)
        .single();

    if (profile) lineUserId = profile.line_user_id;


    // 4. Generate AI Summary
    if (!process.env.GEMINI_API_KEY) throw new Error('Gemini API Key missing');

    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    const taskListText = tasks.map((t: any) =>
        `- [${t.priority}] ${t.title} (Due: ${t.due_date ? t.due_date : 'None'})`
    ).join('\n');

    // Get user name for personalization
    let userName = 'ユーザー';
    if (userId) {
        // Try to get name from Auth User Metadata first
        const { data: { user } } = await supabaseClient.auth.getUser();
        if (user && user.id === userId && user.user_metadata?.full_name) {
            userName = user.user_metadata.full_name;
        } else if (user && user.id === userId && user.user_metadata?.name) {
            userName = user.user_metadata.name;
        }
    }

    const prompt = `
    You are an excellent executive secretary.
    Create a daily briefing email for ${userName}様.
    
    [Task List]
    ${taskListText}

    [Requirements]
    - Subject: Brief & Encouraging (Japanese, include "${userName}様")
    - Body: HTML format. Start with "Run: ${userName}様, process..." style greeting if appropriate, or standard Japanese business greeting "${userName}様、おはようございます". Highlight critical tasks.
    - line_message: Short plain text for chat (max 400 chars). Start with "${userName}様".
    - Body: HTML format. Highlight critical tasks.
    - line_message: Short plain text for chat (max 400 chars).
    
    Output JSON:
    {
      "subject": " Subject",
      "html_body": "HTML Content",
      "line_message": "Text Content"
    }
    `;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text().replace(/```json/g, '').replace(/```/g, '').trim();
    const digest = JSON.parse(responseText);

    // 5. Send Email
    const { data: emailData, error: emailError } = await resend.emails.send({
        from: 'noreply@karadanoarekore.com',
        to: email, // Use the fetched email
        subject: digest.subject,
        html: digest.html_body,
    });

    if (emailError) throw new Error(emailError.message);

    // 6. Send LINE
    let lineResult = null;
    const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;

    // Prioritize User Specific LINE ID, fallback to Env LINE_USER_ID only if not in batch mode (or maybe never?)
    // Let's stick to: Use profile LINE ID if exists.
    const targetLineId = lineUserId || (userId === process.env.LINE_USER_ID_OWNER ? process.env.LINE_USER_ID : null);
    // ^ Environment variable LINE_USER_ID is likely the developer's ID. 
    // We should only use it if we are sure. For now, let's purely rely on Profile OR fall back only if explicitly debugging.

    if (token && targetLineId) {
        try {
            const lineResp = await fetch('https://api.line.me/v2/bot/message/push', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({
                    to: targetLineId,
                    messages: [{ type: 'text', text: digest.line_message }]
                }),
            });
            lineResult = await lineResp.json();
        } catch (e) {
            console.error('LINE Send Error:', e);
        }
    }

    return { email: emailData, line: lineResult };
}

