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

    let systemPrompt = "You are Epsilon, a smart AI Study Assistant.";

    if (image) {
      systemPrompt += " You are currently receiving a live screenshot of the user's screen. IMPORTANT: The screenshot captures the entire desktop, which includes the Epsilon AI chat interface (this bot's UI). DO NOT analyze, mention, or describe the Epsilon chat window itself! Ignore it completely. Only analyze the user's actual background content, apps, or code.";
      
      if (mode === 'flashcard') {
        systemPrompt = "You are Epsilon's Flashcard Generator. IMPORTANT: Ignore the Epsilon chat window in the screenshot! Look only at the background apps to generate highly effective Anki-compatible Q&A flashcards based on the visible text. Format them clearly as Question / Answer pairs.";
      } else if (mode === 'solver') {
        systemPrompt = "You are Epsilon's Step-by-Step Solver. IMPORTANT: Ignore the Epsilon chat window in the screenshot! Look only at the background apps to find the problem. You must answer questions and solve problems in EXTREMELY full, detailed versions. Assume the user has zero knowledge and break down every tiny concept step-by-step.";
      } else if (mode === 'coder') {
        systemPrompt = "You are Epsilon's Specialized Coding Engine. You HAVE full visual capabilities. IMPORTANT: Ignore the Epsilon chat window in the screenshot! Your job is to scan the background apps for ANY code. If the user says 'analyze the screen', you MUST look at the background, find the code, and explain it. NEVER say you cannot see the screen.";
      }
    } else {
      systemPrompt += " The user has NOT provided an image or screenshot. If the user asks you to analyze the screen, explain the code, or look at something, you MUST politely inform them that your 'Vision' toggle is turned off, and they need to turn it on (the monitor icon) to share their screen with you. Otherwise, just answer their text-based query normally.";
      
      if (mode === 'flashcard') systemPrompt += " You are the Flashcard Generator. Answer text questions normally.";
      if (mode === 'solver') systemPrompt += " You are the Step-by-Step Solver. Solve text problems step-by-step.";
      if (mode === 'coder') systemPrompt += " You are the Code Debugger. Answer text-based coding questions normally.";
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
