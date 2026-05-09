import { NextRequest, NextResponse } from 'next/server';
import Groq from 'groq-sdk';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

export async function POST(req: NextRequest) {
  try {
    const { history } = await req.json();

    if (!history || history.length === 0) {
      return NextResponse.json({ title: 'New Chat' });
    }

    const chatContent = history.map((msg: any) => `${msg.role}: ${msg.content}`).join('\n').substring(0, 2000);

    const response = await groq.chat.completions.create({
      model: "meta-llama/llama-4-scout-17b-16e-instruct",
      messages: [
        { role: "system", content: "You are a title generator. Generate a very short, concise, and accurate title (maximum 4 words) for the following chat. Do not use quotes, prefixes, or punctuation. Just the title itself." },
        { role: "user", content: chatContent },
      ],
      max_tokens: 15,
      temperature: 0.3,
    });

    let title = response.choices[0].message.content?.trim() || "Untitled Chat";
    title = title.replace(/["']/g, ''); // Remove quotes

    return NextResponse.json({ title });
  } catch (error: any) {
    console.error('Title Generation Error:', error);
    return NextResponse.json({ title: 'Saved Chat' });
  }
}
