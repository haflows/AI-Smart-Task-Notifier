
import { NextResponse } from 'next/server';

export const runtime = 'edge';

export async function POST(request: Request) {
    try {
        const { message } = await request.json();
        const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
        const userId = process.env.LINE_USER_ID;

        if (!token || !userId) {
            return NextResponse.json({ error: 'LINE credentials not configured' }, { status: 500 });
        }

        const response = await fetch('https://api.line.me/v2/bot/message/push', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({
                to: userId,
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
