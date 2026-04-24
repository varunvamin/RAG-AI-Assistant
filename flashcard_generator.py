"""
flashcard_generator.py — Anki-Compatible Flashcard Generator

Uses the Groq LLM to auto-generate Q&A pairs from document chunks,
then exports them as semicolon-delimited CSV for Anki import.
"""

import csv
import io
import re
from typing import List, Dict

from langchain_core.documents import Document
from langchain_groq import ChatGroq
from langchain_core.prompts import PromptTemplate


# ---------------------------------------------------------------------------
# Keywords that indicate a non-content chunk (references, index, metadata)
# ---------------------------------------------------------------------------
SKIP_PATTERNS = re.compile(
    r"^\s*(references|bibliography|further reading|external links|see also"
    r"|notes|citations|works cited|footnotes|retrieved|doi:|isbn|pmid"
    r"|archived from|last edited|wikimedia|creative commons|retrieved on"
    r"|https?://|www\.|©|\[edit\])",
    re.IGNORECASE | re.MULTILINE,
)

# Minimum ratio of "skip lines" to total lines before we drop a chunk
SKIP_LINE_THRESHOLD = 0.45  # if >45% of lines look like references → skip


# ---------------------------------------------------------------------------
# Prompt for Flashcard Generation
# ---------------------------------------------------------------------------
FLASHCARD_PROMPT = PromptTemplate.from_template(
    """You are an expert educator creating study flashcards from an academic textbook or article.

Given the following text excerpt, generate exactly {num_cards} high-quality flashcard Q&A pairs.

STRICT RULES — follow every one:
- Questions must test KEY concepts, definitions, mechanisms, or facts.
- Answers must be concise (1–3 sentences) but medically/scientifically accurate.
- Do NOT ask about authors, dates, URLs, DOIs, journal names, publication years,
  or any bibliographic/citation information.
- Do NOT ask "what is the title of..." or "on what date was ... accessed".
- Do NOT ask about Wikipedia page metadata or archive details.
- Vary question types: definitions, explanations, comparisons, cause-and-effect.
- Only generate questions that can be answered from the excerpt content itself.

Text excerpt (from page {page}):
---
{text}
---

Return EXACTLY this format, one card per pair of lines:
Q: [question here]
A: [answer here]

Generate {num_cards} flashcards:"""
)


# ---------------------------------------------------------------------------
# Helper: decide whether a chunk should be skipped
# ---------------------------------------------------------------------------
def _is_reference_chunk(chunk: Document) -> bool:
    """Return True if this chunk looks like a references/bibliography section."""
    text = chunk.page_content
    lines = [l.strip() for l in text.splitlines() if l.strip()]
    if not lines:
        return True

    # Count lines that match reference patterns
    skip_lines = sum(1 for line in lines if SKIP_PATTERNS.search(line))
    ratio = skip_lines / len(lines)

    # Also skip very short chunks (likely headers / page footers)
    if len(text.strip()) < 120:
        return True

    return ratio >= SKIP_LINE_THRESHOLD


# ---------------------------------------------------------------------------
# Generate Flashcards from Chunks
# ---------------------------------------------------------------------------
def generate_flashcards(
    chunks: List[Document],
    api_key: str,
    cards_per_chunk: int = 3,
    max_chunks: int = 10,
) -> List[Dict[str, str]]:
    """
    Generate flashcards from document chunks using Groq LLM.

    Args:
        chunks: List of LangChain Document chunks.
        api_key: Groq API key.
        cards_per_chunk: Number of flashcards to generate per chunk.
        max_chunks: Max number of chunks to process (to stay within rate limits).

    Returns:
        List of dicts with 'question', 'answer', and 'page' keys.
    """
    llm = ChatGroq(
        model="llama-3.3-70b-versatile",
        api_key=api_key,
        temperature=0.4,
        max_tokens=1500,
    )

    # --- Step 1: Filter out reference/bibliography chunks ---
    content_chunks = [c for c in chunks if not _is_reference_chunk(c)]

    # Fallback: if filtering removed everything, use original chunks
    if not content_chunks:
        content_chunks = chunks

    # --- Step 2: Sample evenly from content chunks ---
    step = max(1, len(content_chunks) // max_chunks)
    sampled_chunks = content_chunks[::step][:max_chunks]

    flashcards = []
    for chunk in sampled_chunks:
        page = chunk.metadata.get("page", "?")
        prompt = FLASHCARD_PROMPT.format(
            num_cards=cards_per_chunk,
            page=page,
            text=chunk.page_content,
        )

        try:
            response = llm.invoke(prompt)
            cards = parse_flashcard_response(response.content, page)
            flashcards.extend(cards)
        except Exception as e:
            # Skip chunks that fail (e.g., rate limit) and continue
            print(f"Warning: Failed to generate flashcards for page {page}: {e}")
            continue

    return flashcards


# ---------------------------------------------------------------------------
# Parse LLM Response into Flashcards
# ---------------------------------------------------------------------------
def parse_flashcard_response(response_text: str, page) -> List[Dict[str, str]]:
    """Parse the Q:/A: format from the LLM response."""
    cards = []
    lines = response_text.strip().split("\n")

    current_q = None
    current_a = None

    for line in lines:
        line = line.strip()
        if line.upper().startswith("Q:"):
            # Save previous card if complete
            if current_q and current_a:
                cards.append(
                    {
                        "question": current_q,
                        "answer": current_a,
                        "page": str(page),
                    }
                )
            current_q = line[2:].strip()
            current_a = None
        elif line.upper().startswith("A:"):
            current_a = line[2:].strip()

    # Save the last card
    if current_q and current_a:
        cards.append(
            {
                "question": current_q,
                "answer": current_a,
                "page": str(page),
            }
        )

    # Post-filter: drop any cards that slipped through with citation content
    cards = _filter_citation_cards(cards)

    return cards


# ---------------------------------------------------------------------------
# Post-filter: drop cards that are still citation/reference-style
# ---------------------------------------------------------------------------
CITATION_Q_PATTERNS = re.compile(
    r"(what is the (title|doi|url|date|year|name of the (study|article|journal|webpage|website))"
    r"|on what date|in what year|what (year|month) was"
    r"|who (wrote|published|authored)"
    r"|what is the (issn|isbn|pmid|pmcid)"
    r"|when was .* (published|accessed|retrieved|archived)"
    r"|what is the name of the online resource)",
    re.IGNORECASE,
)


def _filter_citation_cards(cards: List[Dict[str, str]]) -> List[Dict[str, str]]:
    """Remove any cards whose question looks like a citation/reference query."""
    return [c for c in cards if not CITATION_Q_PATTERNS.search(c["question"])]


# ---------------------------------------------------------------------------
# Export Flashcards to Anki-Compatible CSV
# ---------------------------------------------------------------------------
def export_to_csv(flashcards: List[Dict[str, str]]) -> str:
    """
    Export flashcards to a semicolon-delimited CSV string (Anki-compatible).

    Format: Question;Answer;Tags
    - Semicolon delimiter avoids issues with commas in content
    - Tags column uses the page number for easy filtering in Anki
    """
    output = io.StringIO()
    writer = csv.writer(output, delimiter=";", quoting=csv.QUOTE_ALL)

    # Anki ignores rows starting with # — used as a comment/header
    writer.writerow(["#Question", "Answer", "Tags"])

    for card in flashcards:
        question = card["question"].replace(";", ",")
        answer = card["answer"].replace(";", ",")
        tags = f"page_{card['page']}"
        writer.writerow([question, answer, tags])

    return output.getvalue()


# ---------------------------------------------------------------------------
# Summary Stats
# ---------------------------------------------------------------------------
def get_flashcard_stats(flashcards: List[Dict[str, str]]) -> Dict:
    """Get summary statistics about generated flashcards."""
    pages = set(card["page"] for card in flashcards)
    return {
        "total_cards": len(flashcards),
        "pages_covered": len(pages),
        "page_list": sorted(pages, key=lambda x: int(x) if x.isdigit() else 0),
    }
