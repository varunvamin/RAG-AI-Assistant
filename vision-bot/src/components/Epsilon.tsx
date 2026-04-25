"use client";

import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from 'react-markdown';
import { Send, Menu, Sparkles, Image as ImageIcon, Code, ScanSearch, User, Home, MessageCircle, Bookmark, ChevronLeft, Search, Folder, MoreHorizontal, Bot } from "lucide-react";

export default function Epsilon() {
  const [messages, setMessages] = useState<{ role: string; content: string }[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  
  // Navigation State
  const [view, setView] = useState<'home' | 'chat' | 'bookmarks'>('home');
  const [activeTab, setActiveTab] = useState<'chat' | 'image' | 'code'>('chat');

  const videoRef = useRef<HTMLVideoElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll chat
  useEffect(() => {
    if (view === 'chat' && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading, view]);

  // Auto-start hidden stream
  useEffect(() => {
    startScreenCapture();
  }, []);

  const startScreenCapture = async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { displaySurface: "monitor" } as any,
        audio: false,
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsCapturing(true);
      }
    } catch (err) {
      console.error("Screen capture pending user action:", err);
    }
  };

  const handleSend = async (customMessage?: string) => {
    const userMessage = customMessage || input;
    if (!userMessage.trim() || isLoading) return;

    if (!isCapturing) {
      await startScreenCapture();
    }

    // Switch to chat view if not already there
    if (view !== 'chat') setView('chat');

    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setIsLoading(true);

    try {
      let screenshot = undefined;
      const canvas = document.createElement("canvas");
      
      // Prevent crash if video is not yet fully loaded
      if (videoRef.current && videoRef.current.videoWidth > 0) {
        canvas.width = videoRef.current.videoWidth;
        canvas.height = videoRef.current.videoHeight;
        const ctx = canvas.getContext("2d");
        ctx?.drawImage(videoRef.current, 0, 0);
        screenshot = canvas.toDataURL("image/jpeg", 0.7);
      }

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMessage, image: screenshot, history: messages }),
      });

      const data = await response.json();
      if (data.reply) {
        setMessages((prev) => [...prev, { role: "assistant", content: data.reply }]);
      } else {
        throw new Error("No reply from Neural Core.");
      }
    } catch (error) {
      console.error("Chat error:", error);
      setMessages((prev) => [...prev, { role: "assistant", content: "Oops! I couldn't process the screen frame." }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center h-screen w-screen bg-transparent p-2 font-sans antialiased select-none overflow-hidden">
      <video ref={videoRef} autoPlay playsInline muted className="hidden" />

      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 20 }}
        className="w-full h-full bg-white/95 border border-white/60 rounded-[2.5rem] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.15)] flex flex-col overflow-hidden backdrop-blur-3xl relative"
      >
        {/* ========================================================= */}
        {/* HOME VIEW (Epsilon Dashboard) */}
        {/* ========================================================= */}
        <AnimatePresence mode="wait">
          {view === 'home' && (
            <motion.div
              key="home"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex flex-col h-full absolute inset-0 z-0"
            >
              {/* HEADER */}
              <div 
                className="h-20 flex items-center justify-between px-6 bg-transparent z-10 cursor-grab active:cursor-grabbing shrink-0 pt-4"
                style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
              >
                <div className="w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center bg-white shadow-sm" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
                  <Menu size={18} className="text-gray-500" />
                </div>
                <h2 className="text-lg font-bold text-gray-800 tracking-tight">Epsilon</h2>
                <div className="w-10 h-10 rounded-full bg-fuchsia-100 flex items-center justify-center border border-fuchsia-200 shadow-sm overflow-hidden">
                   <User size={20} className="text-fuchsia-500" />
                </div>
              </div>

              {/* HOME CONTENT */}
              <div 
                className="flex-1 overflow-y-auto px-6 pb-24 pt-2 space-y-6 scrollbar-hide z-0"
                style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
              >
                {/* Greeting Section */}
                <div className="flex flex-col items-center justify-center text-center pb-2">
                  <div className="w-20 h-20 bg-gradient-to-br from-fuchsia-400 to-fuchsia-600 rounded-[2rem] flex items-center justify-center shadow-[0_10px_30px_rgba(217,70,239,0.3)] mb-4">
                    <Bot size={40} className="text-white" strokeWidth={1.5} />
                  </div>
                  <h1 className="text-2xl font-black text-gray-900 tracking-tight">Hi there, I'm Epsilon.</h1>
                  <p className="text-sm text-gray-500 font-medium mt-1">How can I assist you today?</p>
                </div>

                {/* Search */}
                <div className="flex items-center gap-3 bg-gray-50 rounded-2xl px-4 py-3 border border-gray-100 shadow-sm">
                  <Search size={18} className="text-gray-400" />
                  <input placeholder="Search modules..." className="bg-transparent border-none outline-none text-sm w-full text-gray-700 placeholder:text-gray-400" />
                </div>

                {/* Tabs */}
                <div className="flex gap-2 bg-gray-50 p-1 rounded-full border border-gray-100">
                  <button 
                    onClick={() => setActiveTab('chat')}
                    className={`flex-1 py-2 rounded-full text-xs font-bold transition-all ${activeTab==='chat' ? 'bg-fuchsia-500 text-white shadow-md shadow-fuchsia-500/20' : 'text-gray-500 hover:text-gray-700'}`}
                  >
                    Study Tools
                  </button>
                  <button 
                    onClick={() => setActiveTab('code')}
                    className={`flex-1 py-2 rounded-full text-xs font-bold transition-all ${activeTab==='code' ? 'bg-fuchsia-500 text-white shadow-md shadow-fuchsia-500/20' : 'text-gray-500 hover:text-gray-700'}`}
                  >
                    Coding
                  </button>
                  <button 
                    onClick={() => setActiveTab('image')}
                    className={`flex-1 py-2 rounded-full text-xs font-bold transition-all ${activeTab==='image' ? 'bg-fuchsia-500 text-white shadow-md shadow-fuchsia-500/20' : 'text-gray-500 hover:text-gray-700'}`}
                  >
                    Notes
                  </button>
                </div>

                {/* Functional Study Modules (Filtered by Active Tab) */}
                <div className="space-y-3">
                  
                  {/* STUDY TOOLS TAB */}
                  {(activeTab === 'chat' || activeTab === 'study') && (
                    <>
                      <div 
                        className="bg-white border border-gray-100 p-5 rounded-3xl shadow-sm flex flex-col gap-2 cursor-pointer hover:shadow-md transition-all group" 
                        onClick={() => handleSend("Read the text currently on my screen and automatically generate 5 Anki-compatible Q&A flashcards based on the key concepts.")}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Folder size={18} className="text-fuchsia-500 fill-fuchsia-500" />
                            <span className="font-bold text-gray-800 text-sm group-hover:text-fuchsia-500 transition-colors">Flashcard Generator</span>
                          </div>
                          <MoreHorizontal size={16} className="text-gray-300" />
                        </div>
                        <p className="text-xs text-gray-500 leading-relaxed">Auto-generate Anki-compatible flashcard Q&A pairs from the textbook on screen.</p>
                      </div>

                      <div 
                        className="bg-white border border-gray-100 p-5 rounded-3xl shadow-sm flex flex-col gap-2 cursor-pointer hover:shadow-md transition-all group" 
                        onClick={() => handleSend("Analyze the problem currently on my screen and provide a step-by-step educational solution.")}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Folder size={18} className="text-amber-400 fill-amber-400" />
                            <span className="font-bold text-gray-800 text-sm group-hover:text-amber-500 transition-colors">Step-by-Step Solver</span>
                          </div>
                          <MoreHorizontal size={16} className="text-gray-300" />
                        </div>
                        <p className="text-xs text-gray-500 leading-relaxed">Breaks down complex problems into easy-to-understand educational steps.</p>
                      </div>
                    </>
                  )}

                  {/* CODING TAB */}
                  {activeTab === 'code' && (
                    <div 
                      className="bg-white border border-gray-100 p-5 rounded-3xl shadow-sm flex flex-col gap-2 cursor-pointer hover:shadow-md transition-all group" 
                      onClick={() => handleSend("Scan my screen for any code snippets. Explain what the code does, and identify any bugs or logic errors if they exist.")}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Folder size={18} className="text-emerald-500 fill-emerald-500" />
                          <span className="font-bold text-gray-800 text-sm group-hover:text-emerald-500 transition-colors">Code Debugger</span>
                        </div>
                        <MoreHorizontal size={16} className="text-gray-300" />
                      </div>
                      <p className="text-xs text-gray-500 leading-relaxed">Scan the screen for code snippets and identify errors or explain the logic.</p>
                      <div className="mt-2 bg-slate-50 p-3 rounded-xl border border-slate-100">
                        <p className="text-[10px] font-mono text-emerald-600">def debug_code():<br/>  return "Analyzing..."</p>
                      </div>
                    </div>
                  )}

                  {/* NOTES TAB */}
                  {activeTab === 'image' && (
                    <div 
                      className="bg-white border border-gray-100 p-5 rounded-3xl shadow-sm flex flex-col gap-2 cursor-pointer hover:shadow-md transition-all group" 
                      onClick={() => handleSend("Read the current screen and create a beautifully formatted summary of the key notes, ignoring any clutter.")}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Folder size={18} className="text-blue-500 fill-blue-500" />
                          <span className="font-bold text-gray-800 text-sm group-hover:text-blue-500 transition-colors">Smart Summarizer</span>
                        </div>
                        <MoreHorizontal size={16} className="text-gray-300" />
                      </div>
                      <p className="text-xs text-gray-500 leading-relaxed">Extract and summarize all the important text into clean, structured notes.</p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {/* ========================================================= */}
          {/* CHAT VIEW */}
          {/* ========================================================= */}
          {view === 'chat' && (
            <motion.div
              key="chat"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="flex flex-col h-full absolute inset-0 z-0"
            >
              {/* HEADER */}
              <div 
                className="h-20 flex items-center justify-between px-6 bg-transparent z-10 cursor-grab active:cursor-grabbing shrink-0 pt-4"
                style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
              >
                <button onClick={() => setView('home')} className="w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center bg-white shadow-sm hover:bg-gray-50 transition-colors" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
                  <ChevronLeft size={18} className="text-gray-500 pr-0.5" />
                </button>
                
                <div className="flex flex-col items-center">
                  <h2 className="text-lg font-bold text-gray-800 tracking-tight">AI Chat</h2>
                  <div className="flex items-center gap-1.5">
                    <span className={`w-1.5 h-1.5 rounded-full ${isCapturing ? 'bg-green-500 animate-pulse' : 'bg-yellow-500'}`} />
                    <p className="text-[10px] text-gray-400 font-medium tracking-wider uppercase">
                      {isCapturing ? 'Vision Active' : 'Standby'}
                    </p>
                  </div>
                </div>

                <div className="w-10 h-10 rounded-full bg-fuchsia-100 flex items-center justify-center border border-fuchsia-200 shadow-sm overflow-hidden">
                   <User size={20} className="text-fuchsia-500" />
                </div>
              </div>

              {/* MESSAGES AREA */}
              <div 
                ref={scrollRef}
                className="flex-1 overflow-y-auto px-6 pb-24 pt-2 space-y-6 scrollbar-hide z-0"
                style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
              >
                {messages.length === 0 && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="flex flex-col items-center justify-center text-center mt-6"
                  >
                    <div className="w-24 h-24 bg-gradient-to-br from-fuchsia-500 to-pink-500 rounded-full flex items-center justify-center shadow-lg shadow-fuchsia-500/30 mb-6 relative">
                      <Sparkles size={40} className="text-white" />
                      <motion.div 
                         animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
                         transition={{ repeat: Infinity, duration: 3 }}
                         className="absolute inset-0 border-4 border-fuchsia-300 rounded-full blur-sm"
                      />
                    </div>
                    
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">Welcome to AI Chat</h1>
                    <p className="text-gray-500 text-sm mb-8 max-w-[80%]">
                      I can see your screen. Select a quick action or type a message below.
                    </p>

                    <div className="flex gap-2 justify-center w-full">
                      <button 
                        onClick={() => handleSend("Analyze everything currently visible on my screen.")}
                        className="px-4 py-2 bg-fuchsia-50 text-fuchsia-600 text-[11px] font-bold rounded-full border border-fuchsia-100 hover:bg-fuchsia-100 transition-all flex items-center gap-1.5"
                      >
                        <ScanSearch size={14} />
                        Analyze
                      </button>
                      <button 
                        onClick={() => handleSend("Describe the images or diagrams on my screen.")}
                        className="px-4 py-2 bg-blue-50 text-blue-600 text-[11px] font-bold rounded-full border border-blue-100 hover:bg-blue-100 transition-all flex items-center gap-1.5"
                      >
                        <ImageIcon size={14} />
                        Image
                      </button>
                      <button 
                        onClick={() => handleSend("Explain the code visible on my screen.")}
                        className="px-4 py-2 bg-emerald-50 text-emerald-600 text-[11px] font-bold rounded-full border border-emerald-100 hover:bg-emerald-100 transition-all flex items-center gap-1.5"
                      >
                        <Code size={14} />
                        Code
                      </button>
                    </div>
                  </motion.div>
                )}
                
                <AnimatePresence initial={false}>
                  {messages.map((msg, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[85%] p-4 text-[14px] leading-relaxed shadow-sm ${
                          msg.role === "user"
                            ? "bg-fuchsia-500 text-white rounded-[1.5rem] rounded-br-sm shadow-fuchsia-500/20"
                            : "bg-white border border-gray-100 text-gray-800 rounded-[1.5rem] rounded-bl-sm shadow-sm"
                        }`}
                      >
                        <ReactMarkdown 
                          components={{
                            p: ({node, ...props}) => <p className="mb-2 last:mb-0" {...props} />,
                            ul: ({node, ...props}) => <ul className="list-disc ml-5 mb-2 space-y-1" {...props} />,
                            ol: ({node, ...props}) => <ol className="list-decimal ml-5 mb-2 space-y-1" {...props} />,
                            li: ({node, ...props}) => <li className="pl-1" {...props} />,
                            strong: ({node, ...props}) => <strong className="font-bold" {...props} />,
                          }}
                        >
                          {msg.content}
                        </ReactMarkdown>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="bg-white border border-gray-100 p-4 rounded-[1.5rem] rounded-bl-sm flex gap-1.5 shadow-sm items-center h-12">
                      <motion.div animate={{ y: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 0.8 }} className="w-2 h-2 bg-fuchsia-400 rounded-full" />
                      <motion.div animate={{ y: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 0.8, delay: 0.15 }} className="w-2 h-2 bg-fuchsia-400 rounded-full" />
                      <motion.div animate={{ y: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 0.8, delay: 0.3 }} className="w-2 h-2 bg-fuchsia-400 rounded-full" />
                    </div>
                  </div>
                )}
              </div>

              {/* FLOATING INPUT BOX (Only in Chat View) */}
              <div 
                className="absolute bottom-6 left-6 right-6 z-20"
                style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
              >
                <div className="flex items-center gap-2 bg-white rounded-full p-2 shadow-[0_10px_40px_rgba(0,0,0,0.1)] border border-gray-100">
                  <input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSend()}
                    placeholder="Ask me anything..."
                    className="flex-1 bg-transparent px-4 py-2 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none font-medium"
                  />
                  <button
                    onClick={() => handleSend()}
                    disabled={!input.trim() || isLoading}
                    className="w-10 h-10 bg-fuchsia-500 rounded-full flex items-center justify-center text-white shadow-md shadow-fuchsia-500/20 hover:scale-105 transition-all active:scale-95 disabled:opacity-50 disabled:hover:scale-100 cursor-pointer shrink-0"
                  >
                    <Send size={16} className="-ml-0.5" />
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ========================================================= */}
        {/* BOOKMARKS VIEW (Saved Items) */}
        {/* ========================================================= */}
        <AnimatePresence mode="wait">
          {view === 'bookmarks' && (
            <motion.div
              key="bookmarks"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="flex flex-col h-full absolute inset-0 z-0 bg-gray-50/50"
            >
              {/* HEADER */}
              <div 
                className="h-20 flex items-center justify-between px-6 bg-transparent z-10 cursor-grab shrink-0 pt-4"
                style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
              >
                <div className="w-10 h-10 flex items-center justify-center" /> {/* Spacer */}
                <h2 className="text-lg font-bold text-gray-800 tracking-tight">Saved Items</h2>
                <div className="w-10 h-10 flex items-center justify-center" /> {/* Spacer */}
              </div>

              {/* CONTENT */}
              <div 
                className="flex-1 overflow-y-auto px-6 pb-24 pt-4 space-y-4 scrollbar-hide z-0"
                style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
              >
                <div className="bg-white border border-gray-100 p-8 rounded-[2rem] shadow-sm flex flex-col items-center justify-center text-center mt-10">
                  <div className="w-16 h-16 bg-fuchsia-50 rounded-full flex items-center justify-center mb-4">
                    <Bookmark size={28} className="text-fuchsia-400" />
                  </div>
                  <h3 className="font-bold text-gray-800 text-lg mb-2">No Saved Items Yet</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">
                    When you generate Flashcards or Notes, they will be saved here for easy export to Anki or PDF.
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ========================================================= */}
        {/* BOTTOM NAVIGATION (Only in Home or Bookmarks View) */}
        {/* ========================================================= */}
        <AnimatePresence>
          {(view === 'home' || view === 'bookmarks') && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-white/95 backdrop-blur-md rounded-full px-4 py-2 shadow-[0_15px_40px_rgba(0,0,0,0.15)] border border-gray-100 z-20" 
              style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
            >
              <button 
                onClick={() => setView('home')} 
                className={`p-3 rounded-full transition-all ${view==='home' ? 'bg-fuchsia-500 text-white shadow-md shadow-fuchsia-500/20' : 'text-gray-400 hover:text-gray-600'}`}
              >
                <Home size={20} />
              </button>
              <button 
                onClick={() => setView('chat')} 
                className={`p-3 rounded-full transition-all ${view==='chat' ? 'bg-fuchsia-500 text-white shadow-md shadow-fuchsia-500/20' : 'text-gray-400 hover:text-gray-600'}`}
              >
                <MessageCircle size={20} />
              </button>
              <button 
                onClick={() => setView('bookmarks')} 
                className={`p-3 rounded-full transition-all ${view==='bookmarks' ? 'bg-fuchsia-500 text-white shadow-md shadow-fuchsia-500/20' : 'text-gray-400 hover:text-gray-600'}`}
              >
                <Bookmark size={20} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

      </motion.div>
    </div>
  );
}
