"""
rag_pipeline.py — Core RAG Pipeline (LangChain 1.x / LCEL)

Handles: PDF loading → text chunking → embedding → FAISS indexing → retrieval → LLM generation.
Uses PyMuPDF for extraction, sentence-transformers for embeddings, FAISS for vector search,
and Groq's LLaMA 3.3 70B for answer generation.

Built with LCEL (LangChain Expression Language) — compatible with LangChain 1.x.
"""

import os
import tempfile
from typing import List, Dict, Tuple

import pymupdf  # PyMuPDF
from langchain_core.documents import Document
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.messages import HumanMessage, AIMessage
from langchain_core.output_parsers import StrOutputParser
from langchain_core.runnables import RunnablePassthrough, RunnableLambda
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain_community.vectorstores import FAISS
from langchain_groq import ChatGroq


# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------
EMBEDDING_MODEL = "sentence-transformers/all-MiniLM-L6-v2"
LLM_MODEL = "llama-3.3-70b-versatile"
CHUNK_SIZE = 1000
CHUNK_OVERLAP = 200
RETRIEVER_K = 4


# ---------------------------------------------------------------------------
# 1. PDF → Text Extraction (PyMuPDF)
# ---------------------------------------------------------------------------
def extract_text_from_pdf(file_bytes: bytes) -> List[Document]:
    """
    Extract text from a PDF file using PyMuPDF.
    Returns a list of LangChain Documents, one per page, with page metadata.
    """
    documents = []

    with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
        tmp.write(file_bytes)
        tmp_path = tmp.name

    try:
        doc = pymupdf.open(tmp_path)
        for page_num in range(len(doc)):
            page = doc[page_num]
            text = page.get_text("text", sort=True)
            if text.strip():  # Skip empty/image-only pages
                documents.append(
                    Document(
                        page_content=text,
                        metadata={"page": page_num + 1, "total_pages": len(doc)},
                    )
                )
        doc.close()
    finally:
        os.unlink(tmp_path)

    return documents


# ---------------------------------------------------------------------------
# 2. Text Chunking
# ---------------------------------------------------------------------------
def chunk_documents(documents: List[Document]) -> List[Document]:
    """Split documents into overlapping chunks, preserving page metadata."""
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=CHUNK_SIZE,
        chunk_overlap=CHUNK_OVERLAP,
        separators=["\n\n", "\n", ". ", " ", ""],
        length_function=len,
    )
    return splitter.split_documents(documents)


# ---------------------------------------------------------------------------
# 3. Embedding Model (singleton — loads once per process)
# ---------------------------------------------------------------------------
_embedding_model = None


def get_embedding_model() -> HuggingFaceEmbeddings:
    global _embedding_model
    if _embedding_model is None:
        _embedding_model = HuggingFaceEmbeddings(
            model_name=EMBEDDING_MODEL,
            model_kwargs={"device": "cpu"},
            encode_kwargs={"normalize_embeddings": True},
        )
    return _embedding_model


# ---------------------------------------------------------------------------
# 4. FAISS Vector Store
# ---------------------------------------------------------------------------
def create_vector_store(chunks: List[Document]) -> FAISS:
    """Embed chunks and build a FAISS index."""
    return FAISS.from_documents(chunks, get_embedding_model())


# ---------------------------------------------------------------------------
# 5. LLM
# ---------------------------------------------------------------------------
def get_llm(api_key: str) -> ChatGroq:
    return ChatGroq(
        model=LLM_MODEL,
        api_key=api_key,
        temperature=0.3,
        max_tokens=2048,
    )


# ---------------------------------------------------------------------------
# 6. LCEL RAG Chain (with manual chat history)
# ---------------------------------------------------------------------------

# Prompt to condense follow-up questions into standalone questions
CONDENSE_PROMPT = ChatPromptTemplate.from_messages([
    ("system",
     "Given the conversation history and a follow-up question, "
     "rephrase the follow-up as a standalone question. "
     "Return ONLY the rephrased question, nothing else."),
    MessagesPlaceholder(variable_name="chat_history"),
    ("human", "{question}"),
])

# Main QA prompt
QA_PROMPT = ChatPromptTemplate.from_messages([
    ("system",
     """You are a knowledgeable study assistant. Use the following context from a textbook to answer the student's question.

Guidelines:
- Be accurate and detailed, but explain in a way that's easy to understand.
- If the context contains the answer, provide it with specific references (e.g., "According to page X...").
- If the context does NOT contain enough information to answer, say so honestly — do NOT make up information.
- Use bullet points, numbered lists, or short paragraphs for clarity.
- When relevant, provide examples or analogies to aid understanding.

Context from textbook:
{context}"""),
    MessagesPlaceholder(variable_name="chat_history"),
    ("human", "{question}"),
])


def format_docs(docs: List[Document]) -> str:
    """Format retrieved documents into a single context string."""
    parts = []
    for doc in docs:
        page = doc.metadata.get("page", "?")
        parts.append(f"[Page {page}]\n{doc.page_content}")
    return "\n\n---\n\n".join(parts)


def create_rag_chain(vector_store: FAISS, api_key: str):
    """
    Build an LCEL RAG chain that supports multi-turn conversation.
    Returns the chain. Chat history is managed externally (in session state).
    """
    llm = get_llm(api_key)
    retriever = vector_store.as_retriever(
        search_type="similarity",
        search_kwargs={"k": RETRIEVER_K},
    )

    # Step 1: Condense the question (uses chat history for context)
    condense_chain = CONDENSE_PROMPT | llm | StrOutputParser()

    # Step 2: Full RAG chain
    def get_standalone_question(inputs):
        """If there's chat history, condense the question; otherwise use it as-is."""
        if inputs.get("chat_history"):
            return condense_chain.invoke(inputs)
        return inputs["question"]

    rag_chain = (
        RunnablePassthrough.assign(
            standalone_question=RunnableLambda(get_standalone_question)
        )
        | RunnablePassthrough.assign(
            context=RunnableLambda(
                lambda x: format_docs(retriever.invoke(x["standalone_question"]))
            ),
            source_docs=RunnableLambda(
                lambda x: retriever.invoke(x["standalone_question"])
            ),
        )
        | {
            "answer": QA_PROMPT | llm | StrOutputParser(),
            "source_docs": RunnableLambda(lambda x: x["source_docs"]),
        }
    )

    return rag_chain


# ---------------------------------------------------------------------------
# 7. Query Helper
# ---------------------------------------------------------------------------
def ask_question(
    chain,
    question: str,
    chat_history: List[Dict],
) -> Tuple[str, List[Dict]]:
    """
    Ask a question using the RAG chain.

    Args:
        chain: The LCEL RAG chain.
        question: The user's question.
        chat_history: List of {"role": "user"/"assistant", "content": str} dicts.

    Returns:
        (answer_text, list_of_source_dicts)
    """
    # Convert chat history to LangChain message objects
    lc_history = []
    for msg in chat_history:
        if msg["role"] == "user":
            lc_history.append(HumanMessage(content=msg["content"]))
        elif msg["role"] == "assistant":
            lc_history.append(AIMessage(content=msg["content"]))

    result = chain.invoke({
        "question": question,
        "chat_history": lc_history,
    })

    answer = result.get("answer", "I couldn't generate an answer.")

    sources = []
    for doc in result.get("source_docs", []):
        preview = doc.page_content[:200]
        if len(doc.page_content) > 200:
            preview += "..."
        sources.append({
            "page": doc.metadata.get("page", "?"),
            "content": preview,
        })

    return answer, sources


# ---------------------------------------------------------------------------
# 8. Full Ingestion Pipeline
# ---------------------------------------------------------------------------
def process_pdf(file_bytes: bytes) -> Tuple[FAISS, List[Document], int]:
    """
    Run the full ingestion pipeline: extract → chunk → embed → index.
    Returns (vector_store, chunks, page_count).
    """
    documents = extract_text_from_pdf(file_bytes)
    page_count = len(documents)

    if page_count == 0:
        raise ValueError(
            "No text could be extracted from this PDF. "
            "It may be a scanned/image-only document."
        )

    chunks = chunk_documents(documents)
    vector_store = create_vector_store(chunks)

    return vector_store, chunks, page_count
