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
      extractedText = extractedText.substring(0, 16000);
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

    const systemPrompt = "You are a professional research AI. The user has provided text extracted directly from a website or YouTube video. Generate a highly detailed, beautifully formatted Professional PDF Summary of the content. You MUST return your response as a valid JSON object with exactly three keys: 'title' (a dynamic, catchy, descriptive academic title for the PDF, maximum 5-6 words), 'overview' (a concise 2-3 sentence executive summary explaining the main core focus of the content), and 'summary' (a beautifully structured, EXHAUSTIVE, highly detailed notes summary covering every important topic, using clear markdown subheadings (like ## and ###) based on the content, bullet points, and key terms. Do not skip any features or information, extract everything fully and comprehensively). IMPORTANT: The value for 'summary' must be a single string containing the markdown text.";

    const response = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: `Here is the extracted text from the link: \n\n${extractedText}`,
        },
      ],
      max_tokens: 3500,
      response_format: { type: "json_object" }
    });

    const rawContent = response.choices[0].message.content || '{}';
    let title = "Epsilon Notes Summary";
    let overview = "Detailed summary generated from the provided web link.";
    let summary = rawContent;

    try {
      const parsed = JSON.parse(rawContent);
      title = parsed.title || "Epsilon Notes Summary";
      overview = parsed.overview || "Detailed summary generated from the provided web link.";
      summary = parsed.summary || rawContent;
    } catch (e) {
      console.warn("JSON parsing failed, extracting from text fallback:", e);
      const titleMatch = rawContent.match(/^#+\s*(.*)/m);
      if (titleMatch) {
        title = titleMatch[1];
      }
    }

    return NextResponse.json({ title, overview, summary });
  } catch (error: any) {
    console.error('Summarize API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
