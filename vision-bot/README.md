# 🖥️ Epsilon Engine (Desktop & Web Client)

Epsilon is a fully synchronized Next.js hybrid application that runs as a sleek, semi-transparent desktop overlay (via Electron) and a responsive mobile web-app (via Vercel). Powered by a secure Neon PostgreSQL backend, it provides visual context-awareness, math solving, interactive 3D studying, and smart PDF generation.

---

## 🚀 Features

* **Cloud Sync (Offline-First)**: Automatically synchronizes your active chats, 3D flashcards, and bookmarked notes between your Desktop app and mobile Vercel deployment using Neon PostgreSQL, falling back to local cache if offline.
* **Visual Intelligence**: Real-time monitor-screen captures with dedicated context exclusion (ignores the Epsilon GUI to scan background active windows).
* **Robust Voice Solver & Fallback VAD**: Features a Voice Activity Detection (VAD) engine that calibrates background noise floors dynamically. If standard Web Speech recognition experiences `"network"` drops, it seamlessly hot-swaps to a local MediaRecorder pipeline transcribing audio via Groq's high-speed Whisper API upon speech breaks.
* **Dynamic Chat Naming**: Automatically names chat threads in real-time using `llama-3.1-8b-instant`.
* **3D Flashcard Studier**: Compiles conversation histories into elegant double-sided cards that flip with premium 3D CSS animations.
* **Professional PDF Generator**: Turns internet references and video transcripts into stunning academic publications.
* **Specialized Code Debugger**: Strictly monitors background code and explains logics.

---

## 🛠️ Development & Startup

To run the application locally on your system, execute the following commands in your shell:

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Local Keys
Create a `.env.local` file in this directory and populate it with your keys:
```env
# Required for AI Features
GROQ_API_KEY=your_groq_api_key_here

# Required for Secure Authentication (Neon PostgreSQL)
DATABASE_URL=postgresql://user:password@endpoint.neon.tech/neondb?sslmode=require
```

### 3. Launch the Application (Next.js + Electron)
Boot up both the Next.js local host server and the Electron shell wrapper concurrently:
```bash
npm run dev:electron
```

Alternatively, to run the Next.js web application standalone in your default browser, run:
```bash
npm run dev
```

---

## 📦 Build & Package

To bundle and compile Epsilon as a standalone desktop executable (`.exe` for Windows, etc.), run:
```bash
npm run build
```

---

## 🔒 Environment Security

Your private credentials are safe:
* **`.env.local`** is strictly added to the [.gitignore](.gitignore) configuration. It will **never** be indexed, staged, or pushed to remote repositories like GitHub.
* Build caches (`.next/`), OS-specific noise (`.DS_Store`), and dependency directories (`node_modules/`) are securely blacklisted.
