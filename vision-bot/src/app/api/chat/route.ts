import { NextRequest, NextResponse } from 'next/server';
import Groq from 'groq-sdk';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

export async function POST(req: NextRequest) {
  try {
    const { image, query, history } = await req.json();

    if (!image) {
      return NextResponse.json({ error: 'No screen capture provided' }, { status: 400 });
    }

    const response = await groq.chat.completions.create({
      model: "llama-3.2-90b-vision-preview",
      messages: [
        {
          role: "system",
          content: "You are a helpful study assistant. You can see the user's screen. Help them understand what they are looking at. Be concise and educational."
        },
        ...history,
        {
          role: "user",
          content: [
            { type: "text", text: query || "What am I looking at on my screen? Explain the key concepts." },
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
      answer: response.choices[0].message.content 
    });

  } catch (error: any) {
    console.error('Vision API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
