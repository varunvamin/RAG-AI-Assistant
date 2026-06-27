import { NextResponse } from 'next/server';
import * as cheerio from 'cheerio';
import Groq from 'groq-sdk';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function POST(req: Request) {
  try {
    const { query } = await req.json();

    if (!query) {
      return NextResponse.json({ error: "Query is required" }, { status: 400 });
    }

    // 1. Fetch raw HTML from DuckDuckGo Lite
    const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
    const response = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36',
      }
    });

    if (!response.ok) {
      throw new Error("Failed to fetch search results");
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // 2. Parse the top results
    let searchResults: { title: string; snippet: string; url: string }[] = [];
    $('.result').each((i, element) => {
      if (i >= 5) return; // limit to top 5 results
      
      const title = $(element).find('.result__title').text().trim();
      const snippet = $(element).find('.result__snippet').text().trim();
      const url = $(element).find('.result__url').text().trim();
      
      if (title && snippet) {
        searchResults.push({ title, snippet, url });
      }
    });

    if (searchResults.length === 0) {
      return NextResponse.json({ reply: "I couldn't find any recent information on that topic." });
    }

    // 3. Summarize with Groq
    const contextStr = searchResults.map(r => `[Title: ${r.title}]\nSnippet: ${r.snippet}\nSource: ${r.url}`).join('\n\n');
    
    const prompt = `You are a helpful AI assistant with real-time web access.
Answer the user's query based ONLY on the following search results. 
Synthesize a clear, helpful response and include citations to the sources where appropriate.
If the search results do not contain the answer, say you don't know based on current information.

User Query: ${query}

Search Results:
${contextStr}`;

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.2,
      max_tokens: 1024,
    });

    const reply = completion.choices[0]?.message?.content || "No response generated.";

    return NextResponse.json({ reply, results: searchResults });
  } catch (error: any) {
    console.error("Search API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
