# 🎓 Epsilon: RAG-Powered AI Study Assistant & Desktop Vision Companion

<p align="left">
  <img src="https://img.shields.io/badge/Next.js-black?style=for-the-badge&logo=next.js&logoColor=white" />
  <img src="https://img.shields.io/badge/Electron-191970?style=for-the-badge&logo=Electron&logoColor=white" />
  <img src="https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white" />
  <img src="https://img.shields.io/badge/Streamlit-FF4B4B?style=for-the-badge&logo=streamlit&logoColor=white" />
  <img src="https://img.shields.io/badge/LangChain-1C3C3C?style=for-the-badge&logo=langchain&logoColor=white" />
</p>

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
* **🎙️ Live Meeting Audio Solver**: Integrates continuous background transcribing of meeting speaker audio in real-time. Features a glowing recording equalizer panel, a Web Audio API Voice Activity Detector (VAD) that automatically calibrates itself to ambient noise floors, and automatically transcribes via Groq's high-speed Whisper API when the speaker pauses for 1.2 seconds, seamlessly bypassing native SpeechRecognition network issues.
* **💬 Dynamic Chat Naming**: Automatically and continuously names your chat threads in the sidebar using `llama-3.1-8b-instant` based on the active conversation history, updating in real-time as you discuss new topics.
* **Live Screen-Sharing Vision**: Scans background apps, browsers, and text-books at a single click. (Automatically ignores its own chat window to analyze only target material!)
* **Specialized Code Debugger**: Detects programming layouts instantly. Politely rejects unrelated prompts and instructs the user to switch to General or Solver tools.
* **Step-by-Step Solver**: Breaks down visual equations, diagrams, and educational text into granular, zero-knowledge steps.
* **Smart Notes Engine (URL to PDF)**: Scrapes any web link using Jina Reader (with cheerio fallbacks) and generates structured academic notes using the highly advanced `llama-3.3-70b-versatile` model. Converts summaries into high-quality styled PDFs with magazine-quality layouts using `html2pdf.js`.
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