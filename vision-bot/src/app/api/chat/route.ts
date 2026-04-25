import { NextRequest, NextResponse } from 'next/server';
import Groq from 'groq-sdk';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

export async function POST(req: NextRequest) {
  try {
    const { image, message, history = [] } = await req.json();

    if (!image && !message) {
      return NextResponse.json({ error: 'No input provided' }, { status: 400 });
    }

    // Map history to the required format
    const formattedHistory = history.map((msg: any) => ({
      role: msg.role === 'user' ? 'user' : 'assistant',
      content: msg.content
    }));

    const response = await groq.chat.completions.create({
      model: "meta-llama/llama-4-scout-17b-16e-instruct",
      messages: [
        {
          role: "system",
          content: "You are Epsilon, a smart AI Study Assistant. You can see the user's screen through a visual feed. If the user asks a general question (like 'what is your name?' or 'hello'), respond normally and conversationally. Only describe the screen if the user asks you to analyze it, explain something visible, or if the screen content is directly relevant to their question. Be highly intelligent, concise, and helpful."
        },
        ...formattedHistory,
        {
          role: "user",
          content: [
            { type: "text", text: message || "Analyze the current screen state." },
            // Only attach image if it was provided
            ...(image ? [{
              type: "image_url",
              image_url: {
                url: image,
              },
            }] : []),
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
