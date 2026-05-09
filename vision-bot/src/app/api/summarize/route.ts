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

    // Fetch the URL content using Jina Reader (Extremely powerful for JS sites & YouTube captions)
    let extractedText = "";
    try {
      const response = await fetch('https://r.jina.ai/' + url, {
        headers: { 'X-Return-Format': 'markdown' }
      });
      extractedText = await response.text();
      
      // Check if Jina got blocked (e.g., share.google links)
      if (extractedText.includes("SecurityCompromiseError") || extractedText.includes("Anonymous access to domain") || extractedText.includes("DDoS attack")) {
        throw new Error("Jina blocked by target domain");
      }
      extractedText = extractedText.substring(0, 15000);
    } catch (e) {
      console.warn("Jina extraction failed, falling back to Cheerio:", e);
      try {
        const fallbackRes = await fetch(url);
        const html = await fallbackRes.text();
        const $ = cheerio.load(html);
        $('script, style, nav, footer, iframe').remove();
        extractedText = $('body').text().replace(/\s+/g, ' ').trim().substring(0, 10000);
        if (!extractedText || extractedText.length < 50) throw new Error("Cheerio extracted empty body");
      } catch (fallbackError) {
        console.warn("Cheerio fallback failed:", fallbackError);
        extractedText = `The user provided this link: ${url}. The content could not be directly scraped. Please provide a general highly detailed professional overview of what this link likely contains based on the URL.`;
      }
    }

    const systemPrompt = "You are a professional research AI. The user has provided text extracted directly from a website or YouTube video. Generate a highly detailed, beautifully formatted Professional PDF Summary of the content. Cover every important topic, extract key insights, use bullet points, headers, and clear structure.";

    const response = await groq.chat.completions.create({
      model: "meta-llama/llama-4-scout-17b-16e-instruct",
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: `Here is the extracted text from the link: \n\n${extractedText}`,
        },
      ],
      max_tokens: 4000,
    });

    return NextResponse.json({ summary: response.choices[0].message.content });
  } catch (error: any) {
    console.error('Summarize API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
