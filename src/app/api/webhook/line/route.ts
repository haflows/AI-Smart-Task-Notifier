import { NextResponse } from 'next/server';
import * as crypto from 'crypto';
import { createAdminClient } from '@/lib/supabase/admin';

// export const runtime = 'edge'; // Remove Edge Runtime to use Node.js crypto

export async function POST(request: Request) {
    try {
        const body = await request.text();
        const signature = request.headers.get('x-line-signature');
        const channelSecret = process.env.LINE_CHANNEL_SECRET;
        const channelAccessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN;

        // 1. Signature Verification
        if (!channelSecret || !signature) {
            console.error('Missing Channel Secret or Signature');
            return NextResponse.json({ error: 'Configuration Error' }, { status: 500 });
        }

        const expectedSignature = crypto
            .createHmac('SHA256', channelSecret)
            .update(body)
            .digest('base64');

        console.log('Signature from LINE:', signature);
        console.log('Expected signature:', expectedSignature);
        console.log('Signatures match:', signature === expectedSignature);

        if (signature !== expectedSignature) {
            console.error('Invalid Signature');
            return NextResponse.json({ error: 'Invalid Signature' }, { status: 401 });
        }

        // 2. Parse Events
        const data = JSON.parse(body);
        const events = data.events;

        // 3. Process Events
        for (const event of events) {
            if (event.type === 'message' && event.message.type === 'text') {
                const userId = event.source.userId;
                const replyToken = event.replyToken;
                const userMessage = event.message.text;

                const textTrimmed = userMessage.trim();

                // Echo Logic for ID
                if (textTrimmed.toUpperCase() === 'ID' || textTrimmed === 'ＩＤ') {
                    await replyToLine(replyToken, `あなたのUser IDは:\n${userId}\nです！`, channelAccessToken);
                } else {
                    // Task Creation Logic
                    const supabase = createAdminClient();

                    // 1. Find user by LINE ID
                    const { data: profile } = await supabase
                        .from('profiles')
                        .select('id')
                        .eq('line_user_id', userId)
                        .single();

                    if (profile) {
                        // 2. Insert Task
                        const { error } = await supabase
                            .from('tasks')
                            .insert({
                                user_id: profile.id,
                                title: textTrimmed,
                                priority: 'Medium', // Default priority
                                status: 'Todo'
                            });

                        if (error) {
                            console.error('Task Insert Error:', error);
                            await replyToLine(replyToken, `エラーが発生しました: ${error.message}`, channelAccessToken);
                        } else {
                            await replyToLine(replyToken, `タスクを登録しました！\n「${textTrimmed}」`, channelAccessToken);
                        }
                    } else {
                        // User not found (LINE ID not linked)
                        await replyToLine(replyToken,
                            `ユーザーが見つかりません。\nまずはWebアプリで以下のIDを登録してください。\n\nYour ID: ${userId}`,
                            channelAccessToken
                        );
                    }
                }
            }
        }

        return NextResponse.json({ message: 'OK' });

    } catch (error) {
        console.error('Webhook Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

async function replyToLine(replyToken: string, text: string, channelAccessToken: string | undefined) {
    if (!channelAccessToken) {
        console.error('No channel access token provided');
        return { error: 'No access token' };
    }

    try {
        const response = await fetch('https://api.line.me/v2/bot/message/reply', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${channelAccessToken}`,
            },
            body: JSON.stringify({
                replyToken: replyToken,
                messages: [{ type: 'text', text: text }]
            }),
        });

        const responseData = await response.json();
        console.log('LINE API response status:', response.status);
        console.log('LINE API response:', responseData);

        return responseData;
    } catch (error) {
        console.error('Error calling LINE API:', error);
        return { error: String(error) };
    }
}
