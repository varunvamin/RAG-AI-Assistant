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

    let systemPrompt = "You are Epsilon, a smart AI Study Assistant. You can see the user's screen through a visual feed. If the user asks a general question (like 'what is your name?' or 'hello'), respond normally and conversationally. Only describe the screen if the user asks you to analyze it, explain something visible, or if the screen content is directly relevant to their question. Be highly intelligent, concise, and helpful.";

    if (mode === 'flashcard') {
      systemPrompt = "You are Epsilon's Flashcard Generator. Use the conversation history and the user's screen to generate highly effective Anki-compatible Q&A flashcards. Format them clearly as Question / Answer pairs.";
    } else if (mode === 'solver') {
      systemPrompt = "You are Epsilon's Step-by-Step Solver. You must answer questions and solve problems in EXTREMELY full, detailed versions. Assume the user has zero knowledge and wants to know everything from scratch. Break down every tiny concept step-by-step so a complete beginner can understand.";
    } else if (mode === 'coder') {
      systemPrompt = "You are Epsilon's Specialized Coding Engine. You MUST ONLY answer questions related to code and programming. Explain code logic if asked, and fix any errors visible on screen. If the user asks a non-coding question, strictly refuse and state you are specialized in coding. Output clean, correct code blocks.";
    }

    const response = await groq.chat.completions.create({
      model: "meta-llama/llama-4-scout-17b-16e-instruct",
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
