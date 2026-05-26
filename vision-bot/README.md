# 🖥️ Epsilon Desktop Vision Client

This is the Next.js + Electron companion desktop application for the Epsilon AI Study Suite. It provides a sleek, semi-transparent overlay window that runs directly on your desktop, enabling visual context-awareness, coding acceleration, step-by-step math solving, interactive 3D studying, and smart PDF generation.

---

## 🚀 Features

* **Visual Intelligence**: Real-time monitor-screen captures with dedicated context exclusion (ignores the Epsilon GUI to scan background active windows).
* **3D Flashcard Studier**: Loads conversation histories (active & past) and compiles them into elegant double-sided cards that flip with premium 3D CSS animations.
* **Professional PDF Generator**: Turns internet references and video transcripts into stunning academic publications, matching high-end graphic design templates.
* **Specialized Code Debugger**: Strictly monitors background code, explains logics, and politely redirects general questions.

---

## 🛠️ Development & Startup

To run the application locally on your system, execute the following commands in your shell:

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Local Keys
Create a `.env.local` file in this directory and populate it with your key:
```env
GROQ_API_KEY=your_groq_api_key_here
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
