import { NextRequest, NextResponse } from 'next/server';
import * as cheerio from 'cheerio';
import Groq from 'groq-sdk';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();

    if (!url) {
      return NextResponse.json({ error: 'No URL provided' }, { status: 400 });
    }

    // Fetch the URL content
    let extractedText = "";
    try {
      const response = await fetch(url);
      const html = await response.text();
      const $ = cheerio.load(html);
      
      // Remove scripts and styles
      $('script, style, nav, footer, iframe').remove();
      extractedText = $('body').text().replace(/\s+/g, ' ').trim().substring(0, 5000); // Limit context
    } catch (e) {
      console.error("Scraping error:", e);
      // Fallback if it fails (like for some videos)
      extractedText = `The user provided this link: ${url}. Please provide a general highly detailed professional overview of what this link likely contains or what topics are related to it.`;
    }

    const systemPrompt = "You are a professional research AI. The user has provided text extracted from a website/link. Generate a highly detailed, beautifully formatted Professional PDF Summary of the content. Cover every important topic, use bullet points, headers, and clear structure.";

    const response = await groq.chat.completions.create({
      model: "meta-llama/llama-4-scout-17b-16e-instruct",
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: `Here is the extracted text from the link: \n\n${extractedText}`,
        },
      ],
      max_tokens: 3000,
    });

    return NextResponse.json({ summary: response.choices[0].message.content });
  } catch (error: any) {
    console.error('Summarize API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
