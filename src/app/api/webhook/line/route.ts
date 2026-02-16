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

        // Convert buffer to base64 string (Edge Runtime compatible)
        const bytes = new Uint8Array(signatureBuffer);
        let binary = '';
        for (let i = 0; i < bytes.length; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        const expectedSignature = btoa(binary);

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

        console.log('Received events:', events);

        // 3. Process Events
        for (const event of events) {
            console.log('Processing event:', event.type);
            if (event.type === 'message' && event.message.type === 'text') {
                const userId = event.source.userId;
                const replyToken = event.replyToken;
                const userMessage = event.message.text;

                console.log('User message:', userMessage);
                console.log('User ID:', userId);
                console.log('Reply token:', replyToken);
                console.log('Channel access token exists:', !!channelAccessToken);

                // Simple Echo Logic for ID
                if (userMessage.includes('ID') || userMessage.includes('id') || userMessage.includes('ＩＤ')) {
                    console.log('Sending ID response');
                    const response = await replyToLine(replyToken, `あなたのUser IDは:\n${userId}\nです！`, channelAccessToken);
                    console.log('Reply response:', response);
                } else {
                    // Optional: Echo back everything or just ignore
                    console.log('Sending default response');
                    const response = await replyToLine(replyToken, `IDを知りたい場合は「ID」と送ってください。\n(Your ID: ${userId})`, channelAccessToken);
                    console.log('Reply response:', response);
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
