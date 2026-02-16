
import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Gemini API
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(request: Request) {
    try {
        const { title, detail } = await request.json();

        if (!process.env.GEMINI_API_KEY) {
            return NextResponse.json({ error: 'Gemini API Key is not configured' }, { status: 500 });
        }

        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

        const prompt = `
    Assuming you are an excellent secretary, please analyze the following tasks and output them in JSON format.
    
    Task Title: ${title}
    Task Details: ${detail}

    Please deduce the following information:
    1. priority: Importance (High, Medium, Low)
    2. suggested_detail: Improved task details (summarized or supplemented to be more clearer)
    3. due_date_suggestion: Suggested deadline (e.g. "tomorrow 10:00 AM", or specific date if mentioned in text. If not mentioned, return null)

    Output format (JSON only, no markdown code block):
    {
      "priority": "High" | "Medium" | "Low",
      "suggested_detail": "string",
      "due_date_suggestion": "string" | null
    }
    `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        let text = response.text();

        // Clean up markdown if present
        text = text.replace(/```json/g, '').replace(/```/g, '').trim();

        const analysis = JSON.parse(text);

        return NextResponse.json({ analysis });
    } catch (error) {
        console.error('AI Analysis Error:', error);
        return NextResponse.json({ error: (error as Error).message }, { status: 500 });
    }
}
