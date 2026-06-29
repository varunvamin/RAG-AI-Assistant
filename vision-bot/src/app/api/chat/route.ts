import { NextRequest, NextResponse } from 'next/server';
import Groq from 'groq-sdk';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

/**
 * Handles conversational queries using Groq's llama-3.3-70b-versatile model.
 * 
 * Features:
 * - Ingests message history array to maintain conversational context
 * - Streams responses back to the client using a ReadableStream
 * 
 * @param req - The NextRequest containing the JSON body with 'messages' array
 * @returns A streaming NextResponse representing the LLM's generated reply
 */
export async function POST(req: NextRequest) {
  try {
    const { image, message, history = [], mode = 'general' } = await req.json();

    if (!image && !message) {
      return NextResponse.json({ error: 'No input provided' }, { status: 400 });
    }

    let formattedHistory = history.map((msg: any) => ({
      role: msg.role === 'user' ? 'user' : 'assistant',
      content: msg.content
    }));

    // CRITICAL FIX: If the user explicitly asks to analyze the screen, drop the history 
    // to prevent the vision model from hallucinating based on past text descriptions.
    const msgLower = message.toLowerCase();
    const isNewAnalysis = msgLower.includes("analyze") || msgLower.includes("analyse") || msgLower.includes("describe");
    if (image && isNewAnalysis) {
      formattedHistory = [];
    }

    let systemPrompt = "You are Epsilon, a smart AI Study Assistant.";

    if (image) {
      systemPrompt += " You are currently receiving a live screenshot of the user's screen. IMPORTANT: The screenshot captures the entire desktop, which includes the Epsilon AI chat interface (this bot's UI). DO NOT analyze, mention, or describe the Epsilon chat window itself! Ignore it completely. Only analyze the user's actual background content, apps, or code. CRITICAL RULE: If there is chat history, ignore any previous descriptions of the screen. ONLY describe and analyze the CURRENT, LATEST screenshot provided in this message.";
      
      if (mode === 'flashcard') {
        systemPrompt = "You are Epsilon's Flashcard Generator. IMPORTANT: Ignore the Epsilon chat window in the screenshot! Look only at the background apps to generate highly effective Anki-compatible Q&A flashcards based on the visible text. Format them clearly as Question / Answer pairs.";
      } else if (mode === 'solver') {
        systemPrompt = "You are Epsilon's Step-by-Step Explainer. IMPORTANT: Ignore the Epsilon chat window in the screenshot! Look only at the background apps to find the problem. You must answer questions and solve problems in EXTREMELY full, detailed versions. Assume the user has zero knowledge and break down every tiny concept step-by-step. You MUST make proper, structured headings for each step to make it easy for the user to understand. For any math or equations, you MUST use standard LaTeX formatting (e.g., $$ for block equations and $ for inline math) so they render correctly. DO NOT reference past answers, ONLY focus on the current image.";
      } else if (mode === 'coder') {
        systemPrompt = "You are Epsilon's Specialized Coding Engine. You HAVE full visual capabilities. IMPORTANT: Ignore the Epsilon chat window in the screenshot! Your job is to scan the background apps for ANY code. If the user says 'analyze the screen', you MUST look at the background, find the code, and explain it. NEVER say you cannot see the screen. CRITICAL RULE: If there is absolutely no code visible in the background, AND the user's question is not related to programming, you MUST politely refuse to answer and ask the user to switch to the 'General Chat' or 'Study Tools' section. When explaining code, you MUST include a dedicated 'Logic Explanation' section detailing how the code works, and if you provide any code, you MUST provide the FULL, complete code inside proper markdown code blocks so the user can copy it easily.";
      }
    } else {
      systemPrompt += " The user has NOT provided an image or screenshot. If the user asks you to analyze the screen, explain the code, or look at something, you MUST politely inform them that your 'Vision' toggle is turned off, and they need to turn it on (the monitor icon) to share their screen with you. Otherwise, just answer their text-based query normally.";
      
      if (mode === 'flashcard') systemPrompt += " You are the Flashcard Generator. Answer text questions normally.";
      if (mode === 'solver') systemPrompt += " You are the Step-by-Step Explainer. You must answer questions and solve problems in EXTREMELY full, detailed versions. Assume the user has zero knowledge and break down every tiny concept step-by-step with clear, publication-grade definitions, formulas, and sequential guides so that the user has the absolute best answer to present in a class or meeting immediately. ALWAYS use dynamic, content-specific headings for your response based on the actual problem instead of generic titles. For any math or equations, you MUST use standard LaTeX formatting (e.g., $$ for block equations and $ for inline math) so they render correctly.";
      if (mode === 'coder') systemPrompt += " You are the Code Debugger. CRITICAL RULE: You MUST ONLY answer text questions related to code and programming. If the user asks a non-coding question, politely refuse and ask them to switch to the 'General Chat' or 'Study Tools' section. When explaining code, you MUST include a dedicated 'Logic Explanation' section detailing how the code works, and if you provide any code, you MUST provide the FULL, complete code inside proper markdown code blocks so the user can copy it easily.";
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
