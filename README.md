# 📚 RAG-Powered Study Assistant

A full retrieval-augmented generation (RAG) pipeline — upload any PDF textbook, chunk & embed it with `sentence-transformers`, store vectors in FAISS, and chat with it via Groq's free LLaMA 3.3 70B API.

**Bonus:** Auto-generate Anki-compatible flashcards from your study material!

![Python](https://img.shields.io/badge/Python-3.9+-blue?logo=python&logoColor=white)
![Streamlit](https://img.shields.io/badge/Streamlit-1.30+-FF4B4B?logo=streamlit&logoColor=white)
![LangChain](https://img.shields.io/badge/LangChain-0.3+-green)
![License](https://img.shields.io/badge/License-MIT-yellow)

---

## 🏗️ Architecture

```
PDF Upload → PyMuPDF (text extraction)
           → LangChain (chunking, 1000 chars / 200 overlap)
           → sentence-transformers (all-MiniLM-L6-v2 embeddings)
           → FAISS (vector indexing)

User Question → Embed query
              → FAISS similarity search (top-4 chunks)
              → LangChain ConversationalRetrievalChain
              → Groq API (LLaMA 3.3 70B)
              → Answer + Source Citations
```

## 🚀 Quick Start

### 1. Clone & Install

```bash
git clone https://github.com/YOUR_USERNAME/rag-study-assistant.git
cd rag-study-assistant
pip install -r requirements.txt
```

### 2. Get a Groq API Key (Free)

1. Go to [console.groq.com](https://console.groq.com)
2. Sign up (no credit card required)
3. Create an API key

### 3. Set Up Environment

```bash
cp .env.example .env
# Edit .env and paste your Groq API key
```

Or enter it directly in the app's sidebar.

### 4. Run the App

```bash
streamlit run app.py
```

The app will open at `http://localhost:8501`.

---

## 🎯 Features

| Feature | Description |
|---------|-------------|
| 📄 **PDF Upload** | Upload any PDF textbook (up to 50MB) |
| 💬 **Chat Interface** | Ask questions in natural language with multi-turn memory |
| 📖 **Source Citations** | See which pages the answer came from |
| 📝 **Flashcard Generator** | Auto-generate Anki-compatible Q&A flashcards |
| ⬇️ **CSV Export** | Download flashcards as semicolon-delimited CSV for Anki |
| 🎨 **Premium Dark UI** | Sleek dark theme with custom styling |

---

## 🛠️ Tech Stack

| Tool | Purpose | Why It's Free |
|------|---------|---------------|
| **Groq API** | LLM inference (LLaMA 3.3 70B) | Free tier: ~1000 req/day |
| **FAISS** | Vector similarity search | Fully open-source, runs locally |
| **sentence-transformers** | Text embeddings | Open-source, runs locally |
| **PyMuPDF** | PDF text extraction | Open-source |
| **LangChain** | RAG orchestration | Open-source |
| **Streamlit** | Web UI + free hosting | Community Cloud is free |

---

## ☁️ Deploy to Streamlit Community Cloud

1. Push your code to a **public GitHub repository**
2. Go to [share.streamlit.io](https://share.streamlit.io)
3. Connect your GitHub repo and select `app.py`
4. Add your `GROQ_API_KEY` in **Settings → Secrets**:
   ```toml
   GROQ_API_KEY = "your_key_here"
   ```
5. Click **Deploy**!

---

## 📁 Project Structure

```
├── app.py                  # Main Streamlit application
├── rag_pipeline.py         # Core RAG logic
├── flashcard_generator.py  # Anki flashcard generation & export
├── requirements.txt        # Python dependencies
├── .env.example            # Environment variable template
├── .gitignore              # Git ignore rules
├── .streamlit/
│   └── config.toml         # Streamlit theme configuration
└── README.md               # This file
```

---

## 📋 License

MIT License — feel free to use, modify, and distribute.
