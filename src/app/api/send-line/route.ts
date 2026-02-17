// export const runtime = 'edge'; // Switch to Node.js for better stability
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { message, to } = body; // Accept 'to' (userId) from body
        const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;

        // Use provided userId or fallback to Env Var
        const targetUserId = to || process.env.LINE_USER_ID;

        if (!token) {
            return NextResponse.json({ error: 'LINE_CHANNEL_ACCESS_TOKEN is missing in server environment' }, { status: 500 });
        }

        if (!targetUserId) {
            return NextResponse.json({ error: 'User ID is missing. Provide it in body or set LINE_USER_ID env var.' }, { status: 400 });
        }

        const response = await fetch('https://api.line.me/v2/bot/message/push', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({
                to: targetUserId,
                messages: [
                    {
                        type: 'text',
                        text: message || 'Test message from Task Notifier',
                    },
                ],
            }),
        });

        const data = await response.json();

        if (!response.ok) {
            return NextResponse.json({ error: data.message || 'Failed to send LINE message' }, { status: response.status });
        }

        return NextResponse.json({ success: true, data });
    } catch (error) {
        console.error('LINE Send Error:', error);
        return NextResponse.json({ error: (error as Error).message }, { status: 500 });
    }
}
