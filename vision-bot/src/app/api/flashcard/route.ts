import { NextRequest, NextResponse } from 'next/server';
import Groq from 'groq-sdk';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json();

    if (!messages || messages.length === 0) {
      return NextResponse.json({ error: 'No messages provided' }, { status: 400 });
    }

    // Format the history transcript
    const transcript = messages.map((msg: any) => `${msg.role === 'user' ? 'User' : 'Epsilon'}: ${msg.content}`).join('\n\n');

    const systemPrompt = "You are a professional educational tool designed to generate high-quality, effective study flashcards. Based on the provided conversation transcript, extract the most important core educational concepts, facts, terms, formulas, or definitions, and convert them into beautifully structured Question / Answer (Q&A) flashcard pairs. You MUST return your response as a valid JSON object containing an array of objects called 'flashcards', where each object has exactly two keys: 'question' (a clear, descriptive question or prompt, maximum 15-20 words) and 'answer' (a concise, highly accurate explanation, definition, or solution, maximum 30-40 words). Respond only with this JSON. Do not include markdown code block syntax or any other conversational text.";

    const response = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Here is the conversation transcript:\n\n${transcript}` },
      ],
      temperature: 0.3,
      response_format: { type: "json_object" }
    });

    const content = response.choices[0].message.content || '{"flashcards": []}';
    let parsedData = { flashcards: [] };
    try {
      parsedData = JSON.parse(content);
    } catch (e) {
      console.error("Failed to parse flashcard JSON, fallback to standard parsing:", e);
    }
    
    return NextResponse.json(parsedData);
  } catch (error: any) {
    console.error('Flashcard API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
