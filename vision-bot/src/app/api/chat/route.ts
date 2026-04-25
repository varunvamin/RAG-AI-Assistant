import { NextRequest, NextResponse } from 'next/server';
import Groq from 'groq-sdk';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

export async function POST(req: NextRequest) {
  try {
    const { image, message } = await req.json();

    if (!image) {
      return NextResponse.json({ error: 'No screen capture provided' }, { status: 400 });
    }

    const response = await groq.chat.completions.create({
      model: "meta-llama/llama-4-scout-17b-16e-instruct",
      messages: [
        {
          role: "system",
          content: "You are Epsilon, a premium Cyber-Tech AI assistant. You can see the user's screen. Answer the user's question based strictly on what is visible on the screen. Be helpful, sharp, and concise."
        },
        {
          role: "user",
          content: [
            { type: "text", text: message || "Analyze my current screen state." },
            {
              type: "image_url",
              image_url: {
                url: image, // This is the base64 data URL from the screen capture
              },
            },
          ],
        },
      ],
      max_tokens: 1024,
    });

    return NextResponse.json({ 
      reply: response.choices[0].message.content 
    });

  } catch (error: any) {
    console.error('Vision API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
