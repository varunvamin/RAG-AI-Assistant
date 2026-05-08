import { NextRequest, NextResponse } from 'next/server';
import Groq from 'groq-sdk';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

export async function POST(req: NextRequest) {
  try {
    const { image, message, history = [], mode = 'general' } = await req.json();

    if (!image && !message) {
      return NextResponse.json({ error: 'No input provided' }, { status: 400 });
    }

    const formattedHistory = history.map((msg: any) => ({
      role: msg.role === 'user' ? 'user' : 'assistant',
      content: msg.content
    }));

    let systemPrompt = "You are Epsilon, a smart AI Study Assistant. You are currently receiving a live screenshot of the user's screen as an image attachment. You HAVE the capability to see and analyze this screen perfectly. If the user asks you to 'analyze the screen', DO NOT REFUSE. Look at the attached image and describe what you see. If the user asks a general question (like 'hello'), respond normally.";

    if (mode === 'flashcard') {
      systemPrompt = "You are Epsilon's Flashcard Generator. You are receiving a screenshot of the user's screen. Look at the attached image and use the conversation history to generate highly effective Anki-compatible Q&A flashcards based on the visible text. Format them clearly as Question / Answer pairs.";
    } else if (mode === 'solver') {
      systemPrompt = "You are Epsilon's Step-by-Step Solver. You are receiving a screenshot of the user's screen. Look at the attached image to find the problem. You must answer questions and solve problems in EXTREMELY full, detailed versions. Assume the user has zero knowledge and break down every tiny concept step-by-step.";
    } else if (mode === 'coder') {
      systemPrompt = "You are Epsilon's Specialized Coding Engine. You are receiving a live screenshot of the user's screen. You HAVE full visual capabilities. Your job is to scan the attached image for ANY code. If the user says 'analyze the screen', you MUST look at the image, find the code, and explain it. NEVER say you cannot see the screen. ONLY refuse if the user asks a completely non-coding question AND there is absolutely no code on the screen.";
    }

    const response = await groq.chat.completions.create({
      model: "llama-3.2-11b-vision-preview",
      messages: [
        { role: "system", content: systemPrompt },
        ...formattedHistory,
        {
          role: "user",
          content: [
            { type: "text", text: message || "Analyze the current screen state." },
            ...(image ? [{ type: "image_url", image_url: { url: image } }] : []),
          ],
        },
      ],
      max_tokens: 2048,
    });

    return NextResponse.json({ reply: response.choices[0].message.content });
  } catch (error: any) {
    console.error('Vision API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
