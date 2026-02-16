import { NextResponse } from 'next/server';

export const runtime = 'edge'; // Optional: Explicitly mark as edge

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

        const encoder = new TextEncoder();
        const key = await crypto.subtle.importKey(
            'raw',
            encoder.encode(channelSecret),
            { name: 'HMAC', hash: 'SHA-256' },
            false,
            ['sign']
        );

        const signatureBuffer = await crypto.subtle.sign(
            'HMAC',
            key,
            encoder.encode(body)
        );

        // Convert buffer to base64 string
        const signatureArray = Array.from(new Uint8Array(signatureBuffer));
        const expectedSignature = btoa(String.fromCharCode(...signatureArray));

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

                // Simple Echo Logic for ID
                if (userMessage.includes('ID') || userMessage.includes('id') || userMessage.includes('ＩＤ')) {
                    await replyToLine(replyToken, `あなたのUser IDは:\n${userId}\nです！`, channelAccessToken);
                } else {
                    // Optional: Echo back everything or just ignore
                    await replyToLine(replyToken, `IDを知りたい場合は「ID」と送ってください。\n(Your ID: ${userId})`, channelAccessToken);
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
    if (!channelAccessToken) return;

    await fetch('https://api.line.me/v2/bot/message/reply', {
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
}
