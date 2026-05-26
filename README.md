# 🎓 Epsilon: RAG-Powered AI Study Assistant & Desktop Vision Companion

Epsilon is a state-of-the-art academic suite combining a robust, high-performance Retrieval-Augmented Generation (RAG) backend web portal with an advanced, floating Next.js + Electron desktop vision assistant. 

Epsilon operates seamlessly across your system, analyzing your active workspace or browser tabs, explaining complex code, breaking down equations step-by-step, generating 3D-interactive flashcard decks, and compiling website references into beautiful, publication-grade academic PDFs.

---

## 🏛️ Ecosystem Architecture

```
                                  [ THE EPSILON SUITE ]
                                            │
               ┌────────────────────────────┴────────────────────────────┐
               ▼                                                         ▼
    [ Streamlit Portal ]                                       [ Epsilon Desktop Client ]
 (Python RAG Web Interface)                                   (Next.js + Electron Overlay)
               │                                                         │
   PDF Upload & Extraction (PyMuPDF)                             Real-time Screen Capture
               │                                                         │
   Text Chunking & Tokenization (LangChain)                     Specialized AI Engines:
               │                                                  ├─ Coder (Strict Code Inspector)
   Local Embeddings (sentence-transformers)                       ├─ Solver (Step-by-Step Breakdown)
               │                                                  ├─ Notes Engine (PDF Synthesizer)
   High-performance Vector DB (FAISS)                             └─ 3D Flashcard Generator
               │                                                         │
   Free LLaMA-based RAG Inference                               Groq Cloud LLaMA Vision API
```

---

## 🚀 Key Features

### 1. 🖥️ Epsilon Desktop Vision Client (Next.js + Electron)
A sleek, glassmorphic floating screen companion that sits on top of your workspace:
* **🔑 Local Multi-User Accounts**: Register and log into any number of offline-secured profiles. Epsilon isolates all active chats, histories, thread titles, and bookmarks dynamically under each username in LocalStorage, preventing user profile crossovers.
* **🎙️ Live Meeting Audio Solver**: Integrates continuous background transcribing of meeting speaker audio in real-time. Features a glowing recording equalizer panel and automatically solves spoken questions when the speaker pauses for 2 seconds.
* **Live Screen-Sharing Vision**: Scans background apps, browsers, and text-books at a single click. (Automatically ignores its own chat window to analyze only target material!)
* **Specialized Code Debugger**: Detects programming layouts instantly. Politely rejects unrelated prompts and instructs the user to switch to General or Solver tools.
* **Step-by-Step Solver**: Breaks down visual equations, diagrams, and educational text into granular, zero-knowledge steps.
* **Smart Notes Engine (URL to PDF)**: Takes any web page or video transcript, summarizes it, dynamically names it according to content, and designs a magazine-quality academic PDF document.
* **3D Flashcard Generator**: Select any conversation session from your history to automatically compile a high-performance interactive deck of flashcards with standard 3D flip transitions and direct Anki-desktop exports.

### 2. 📚 RAG Portal & Textbook Search (Streamlit + Python)
A dedicated Web-UI for indexing large PDF textbooks:
* **Vector Indexing**: Employs locally computed `sentence-transformers` embeddings (using the `all-MiniLM-L6-v2` model).
* **FAISS Vector DB**: Conducts millisecond similarity queries across thousands of textbook pages.
* **Conversational Memory**: Holds multi-turn dialogs with citation references mapping back to exact source pages.

---

## 📂 Repository Structure

```
├── vision-bot/              # Next.js + Electron Desktop Client (Epsilon Companion)
│   ├── src/
│   │   ├── app/             # Next.js App router & API routes
│   │   └── components/      # UI components (Epsilon, Lumina, VisionBot)
│   ├── main.js              # Electron window configuration
│   ├── package.json         # Desktop dependencies (Next.js, Electron, html2pdf.js)
│   └── tailwind.config.ts   # UI Theme styling
│
├── app.py                   # Streamlit RAG Portal Entrypoint
├── rag_pipeline.py          # Core FAISS + sentence-transformers retrieval pipeline
├── flashcard_generator.py   # Python-based material card compiler
├── requirements.txt         # Python library list
├── .env.example             # Environment config template
└── README.md                # This file
```

---

## ⚙️ Setup & Installation

### Prerequisite: API Key
Obtain a free high-speed API Key from the [Groq Console](https://console.groq.com).

### Running the RAG Portal (Python Backend)
1. Initialize the Python environment:
   ```bash
   pip install -r requirements.txt
   ```
2. Set up your environment variables:
   ```bash
   cp .env.example .env
   # Open .env and insert your GROQ_API_KEY
   ```
3. Boot the portal:
   ```bash
   streamlit run app.py
   ```

### Running Epsilon Desktop Client (Electron Companion)
1. Navigate to the desktop client folder:
   ```bash
   cd vision-bot
   npm install
   ```
2. Set up client-specific variables:
   ```bash
   cp .env.local.example .env.local
   # Insert your GROQ_API_KEY inside .env.local
   ```
3. Run the development server (runs Next.js & launches Electron window concurrently):
   ```bash
   npm run dev:electron
   ```

---

## 🔒 Security Notice: Risky & Environment Files
To safeguard your private credentials, API keys, and temporary environment data:
1. **Never commit `.env` or `.env.local` files**: These contain sensitive keys (`GROQ_API_KEY`). If pushed publicly to GitHub, crawlers will scrape them, resulting in API exploitation and potential charges.
2. **Proper `.gitignore` configuration**: The project's `.gitignore` rules explicitly include `.env*` to make sure environment configuration files are automatically skipped from being indexed or pushed.
3. **Local dependencies and cache exclusion**: Build directories (`.next`, `build`), Node scripts (`node_modules`), and temporary storage folders are correctly blacklisted in git tracking.

Always use `.env.example` as a template for other developers to populate their keys locally!

---

## 📋 License
This project is licensed under the MIT License. Feel free to modify and build upon this premium study tool!
