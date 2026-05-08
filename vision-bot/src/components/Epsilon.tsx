"use client";

import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from 'react-markdown';
import { Send, Menu, Sparkles, Image as ImageIcon, Code, ScanSearch, User, Home, MessageCircle, Bookmark, ChevronLeft, Search, Folder, MoreHorizontal, Bot, FileText, Download, PanelLeft, Save, X, Monitor, MonitorOff, Paperclip } from "lucide-react";

export default function Epsilon() {
  const [messages, setMessages] = useState<{ role: string; content: string }[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  
  // Navigation State
  const [view, setView] = useState<'home' | 'chat' | 'bookmarks' | 'notes'>('home');
  const [activeTab, setActiveTab] = useState<'chat' | 'image' | 'code'>('chat');
  
  // New Feature States
  const [mode, setMode] = useState<'general' | 'flashcard' | 'solver' | 'coder'>('general');
  const [threads, setThreads] = useState<Record<string, { role: string; content: string }[]>>({
    general: [], flashcard: [], solver: [], coder: []
  });
  const [useVision, setUseVision] = useState(false);
  const [savedItems, setSavedItems] = useState<{ id: string; title: string; category: string; content: string }[]>([]);
  const [expandedBookmarkId, setExpandedBookmarkId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [notesUrl, setNotesUrl] = useState("");
  
  // Input Bar States
  const [attachedImage, setAttachedImage] = useState<string | null>(null);
  const [showActionMenu, setShowActionMenu] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll chat
  useEffect(() => {
    if (view === 'chat' && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [threads, isLoading, view, mode]);

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

  const handleSend = async (customMessage?: string, customMode?: 'general' | 'flashcard' | 'solver' | 'coder', forceCapture: boolean = false) => {
    const userMessage = customMessage || input;
    if (!userMessage.trim() || isLoading) return;

    const currentMode = customMode || mode;

    if ((useVision || forceCapture) && !isCapturing) {
      await startScreenCapture();
    }

    // Switch to chat view if not already there
    if (view !== 'chat') setView('chat');

    setInput("");
    setThreads((prev) => ({
      ...prev,
      [currentMode]: [...(prev[currentMode] || []), { role: "user", content: userMessage }]
    }));
    setIsLoading(true);

    try {
      let screenshot = undefined;
      
      if (attachedImage) {
        screenshot = attachedImage;
        setAttachedImage(null);
      } else if ((useVision || forceCapture) && videoRef.current && videoRef.current.videoWidth > 0) {
        const canvas = document.createElement("canvas");
        canvas.width = videoRef.current.videoWidth;
        canvas.height = videoRef.current.videoHeight;
        const ctx = canvas.getContext("2d");
        ctx?.drawImage(videoRef.current, 0, 0);
        screenshot = canvas.toDataURL("image/jpeg", 0.7);
      }

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMessage, image: screenshot, history: threads[currentMode] || [], mode: currentMode }),
      });

      const data = await response.json();
      if (data.reply) {
        setThreads((prev) => ({
          ...prev,
          [currentMode]: [...(prev[currentMode] || []), { role: "assistant", content: data.reply }]
        }));
      } else {
        throw new Error("No reply from Neural Core.");
      }
    } catch (error) {
      console.error("Chat error:", error);
      setThreads((prev) => ({
        ...prev,
        [currentMode]: [...(prev[currentMode] || []), { role: "assistant", content: "Oops! I couldn't process the request." }]
      }));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveChat = () => {
    const currentChat = threads[mode];
    if (!currentChat || currentChat.length === 0) return;
    
    // Generate a title from the first user message
    const firstUserMsg = currentChat.find(m => m.role === 'user')?.content || "Untitled Chat";
    const title = firstUserMsg.length > 40 ? firstUserMsg.substring(0, 40) + '...' : firstUserMsg;
    
    const chatContent = currentChat.map(msg => `**${msg.role === 'user' ? 'You' : 'Epsilon'}**: ${msg.content}`).join('\n\n');
    
    setSavedItems((prev) => [...prev, { 
      id: Date.now().toString(), 
      title, 
      category: mode, 
      content: chatContent 
    }]);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setAttachedImage(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const generatePDF = async () => {
    if (!notesUrl.trim() || pdfLoading) return;
    setPdfLoading(true);
    try {
      const response = await fetch("/api/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: notesUrl }),
      });
      const data = await response.json();
      if (data.summary) {
        // Dynamically import html2pdf so it doesn't break SSR
        const html2pdf = (await import('html2pdf.js')).default;
        
        // Create a hidden div to format the PDF content
        const element = document.createElement('div');
        element.innerHTML = `
          <div style="font-family: Arial, sans-serif; padding: 40px; color: #333; line-height: 1.6;">
            <h1 style="color: #d946ef; border-bottom: 2px solid #fdf4ff; padding-bottom: 10px;">Epsilon Notes</h1>
            <p style="color: #888; font-size: 12px; margin-bottom: 30px;">Source: ${notesUrl}</p>
            <div style="font-size: 14px;">${data.summary.replace(/\n/g, '<br/>').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')}</div>
          </div>
        `;
        
        const opt = {
          margin: 10,
          filename: 'Epsilon_Notes.pdf',
          image: { type: 'jpeg' as const, quality: 0.98 },
          html2canvas: { scale: 2 },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' as const }
        };
        
        html2pdf().set(opt).from(element).save();
      }
    } catch (error) {
      console.error("PDF generation failed:", error);
    } finally {
      setPdfLoading(false);
      setNotesUrl("");
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
                    onClick={() => setView('notes')}
                    className="flex-1 py-2 rounded-full text-xs font-bold transition-all text-gray-500 hover:text-gray-700"
                  >
                    Notes
                  </button>
                </div>

                {/* Functional Study Modules (Filtered by Active Tab) */}
                <div className="space-y-3">
                  
                  {/* STUDY TOOLS TAB */}
                  {activeTab === 'chat' && (
                    <>
                      <div 
                        className="bg-white border border-gray-100 p-5 rounded-3xl shadow-sm flex flex-col gap-2 cursor-pointer hover:shadow-md transition-all group" 
                        onClick={() => {
                          setMode('flashcard');
                          setView('chat');
                        }}
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
                        onClick={() => {
                          setMode('solver');
                          setView('chat');
                        }}
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
                      onClick={() => {
                        setMode('coder');
                        setView('chat');
                      }}
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

                  {/* NOTE: We removed the notes tab quick action here since Notes is now a full view */}
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
                <div className="flex gap-2" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
                  <button onClick={() => setView('home')} className="w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center bg-white shadow-sm hover:bg-gray-50 transition-colors">
                    <ChevronLeft size={18} className="text-gray-500 pr-0.5" />
                  </button>
                  <button onClick={() => setIsSidebarOpen(true)} className="w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center bg-white shadow-sm hover:bg-gray-50 transition-colors">
                    <PanelLeft size={18} className="text-gray-500" />
                  </button>
                </div>
                
                <div className="flex flex-col items-center">
                  <h2 className="text-lg font-bold text-gray-800 tracking-tight">
                    {mode === 'coder' ? 'Code Debugger Chat' : mode === 'solver' ? 'Step-by-Step Solver' : mode === 'flashcard' ? 'Flashcard Generator' : 'AI Chat'}
                  </h2>
                  <div className="flex items-center gap-1.5">
                    <span className={`w-1.5 h-1.5 rounded-full ${isCapturing ? 'bg-green-500 animate-pulse' : 'bg-yellow-500'}`} />
                    <p className="text-[10px] text-gray-400 font-medium tracking-wider uppercase">
                      {isCapturing ? 'Vision Active' : 'Standby'}
                    </p>
                  </div>
                </div>

                <div className="flex gap-2" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
                  <button onClick={handleSaveChat} className="w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center bg-white shadow-sm hover:bg-gray-50 transition-colors">
                    <Save size={18} className="text-gray-500" />
                  </button>
                  <div className="w-10 h-10 rounded-full bg-fuchsia-100 flex items-center justify-center border border-fuchsia-200 shadow-sm overflow-hidden">
                     <User size={20} className="text-fuchsia-500" />
                  </div>
                </div>
              </div>

              {/* MESSAGES AREA */}
              <div 
                ref={scrollRef}
                className="flex-1 overflow-y-auto px-6 pb-24 pt-2 space-y-6 scrollbar-hide z-0"
                style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
              >
                {(!threads[mode] || threads[mode].length === 0) && (
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
                  {(threads[mode] || []).map((msg, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                      <div className={`flex flex-col gap-1.5 ${msg.role === "user" ? "items-end" : "items-start"}`}>
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
                className="absolute bottom-6 left-6 right-6 z-20 flex flex-col gap-2"
                style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
              >
                {attachedImage && (
                  <div className="relative self-start ml-2">
                    <img src={attachedImage} alt="Attachment" className="h-16 w-16 object-cover rounded-xl border-2 border-fuchsia-500 shadow-md" />
                    <button onClick={() => setAttachedImage(null)} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors shadow-sm">
                      <X size={10} strokeWidth={3} />
                    </button>
                  </div>
                )}

                <div className="flex items-center gap-2 bg-white rounded-[2rem] p-2 shadow-[0_10px_40px_rgba(0,0,0,0.1)] border border-gray-100 relative">
                  
                  {/* File Upload Button */}
                  <button onClick={() => fileInputRef.current?.click()} className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-500 hover:bg-gray-100 hover:text-gray-800 transition-colors shrink-0">
                    <Paperclip size={18} />
                  </button>
                  <input type="file" accept="image/*" ref={fileInputRef} className="hidden" onChange={handleFileUpload} />

                  {/* Sparkles Context Menu */}
                  <div className="relative shrink-0">
                    <button onClick={() => setShowActionMenu(!showActionMenu)} className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${showActionMenu ? 'bg-fuchsia-500 text-white shadow-md' : 'bg-fuchsia-50 text-fuchsia-500 hover:bg-fuchsia-100'}`}>
                      <Sparkles size={18} />
                    </button>
                    
                    <AnimatePresence>
                      {showActionMenu && (
                        <motion.div initial={{ opacity: 0, y: 10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.95 }} className="absolute bottom-14 left-0 w-52 bg-white border border-gray-100 shadow-xl rounded-2xl p-2 z-50 flex flex-col gap-1">
                          <button onClick={() => { setShowActionMenu(false); handleSend("Please analyze the current screen in detail.", mode, true); }} className="flex items-center gap-3 p-2 hover:bg-blue-50 hover:text-blue-600 rounded-xl text-left text-xs font-bold text-gray-700 transition-colors">
                             <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center"><Monitor size={14} className="text-blue-500" /></div> Analyze Screen
                          </button>
                          <button onClick={() => { setShowActionMenu(false); handleSend("Extract all text from the screen and summarize it.", mode, true); }} className="flex items-center gap-3 p-2 hover:bg-orange-50 hover:text-orange-600 rounded-xl text-left text-xs font-bold text-gray-700 transition-colors">
                             <div className="w-7 h-7 rounded-full bg-orange-100 flex items-center justify-center"><FileText size={14} className="text-orange-500" /></div> Summarize Screen
                          </button>
                          <button onClick={() => { setShowActionMenu(false); handleSend("Find any code on screen and explain its logic or fix errors.", mode, true); }} className="flex items-center gap-3 p-2 hover:bg-emerald-50 hover:text-emerald-600 rounded-xl text-left text-xs font-bold text-gray-700 transition-colors">
                             <div className="w-7 h-7 rounded-full bg-emerald-100 flex items-center justify-center"><Code size={14} className="text-emerald-500" /></div> Explain Code
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Vision Toggle Button */}
                  <button
                    onClick={() => setUseVision(!useVision)}
                    className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors shrink-0 ${useVision ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'}`}
                    title={useVision ? "Vision: ON" : "Vision: OFF"}
                  >
                    {useVision ? <Monitor size={16} /> : <MonitorOff size={16} />}
                  </button>

                  <input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSend()}
                    placeholder="Ask me anything..."
                    className="flex-1 bg-transparent px-2 py-2 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none font-medium"
                  />
                  <button
                    onClick={() => handleSend()}
                    disabled={(!input.trim() && !attachedImage) || isLoading}
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
                {savedItems.length === 0 ? (
                  <div className="bg-white border border-gray-100 p-8 rounded-[2rem] shadow-sm flex flex-col items-center justify-center text-center mt-10">
                    <div className="w-16 h-16 bg-fuchsia-50 rounded-full flex items-center justify-center mb-4">
                      <Bookmark size={28} className="text-fuchsia-400" />
                    </div>
                    <h3 className="font-bold text-gray-800 text-lg mb-2">No Saved Items Yet</h3>
                    <p className="text-sm text-gray-500 leading-relaxed">
                      When you generate Flashcards or Notes, they will be saved here for easy export to Anki or PDF.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {savedItems.map((item) => (
                      <div key={item.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden transition-all">
                        <div 
                          className="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50 transition-colors"
                          onClick={() => setExpandedBookmarkId(expandedBookmarkId === item.id ? null : item.id)}
                        >
                          <div className="flex flex-col">
                            <span className="text-[10px] font-bold text-fuchsia-500 uppercase tracking-wider mb-1">{item.category}</span>
                            <span className="text-sm font-bold text-gray-800">{item.title}</span>
                          </div>
                          <div className={`w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center transition-transform ${expandedBookmarkId === item.id ? 'rotate-180' : ''}`}>
                            <ChevronLeft size={16} className="text-gray-400 -rotate-90" />
                          </div>
                        </div>
                        
                        <AnimatePresence>
                          {expandedBookmarkId === item.id && (
                            <motion.div 
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="border-t border-gray-100"
                            >
                              <div className="p-5 bg-gray-50/50">
                                <ReactMarkdown 
                                  components={{
                                    p: ({node, ...props}) => <p className="mb-2 last:mb-0 text-sm text-gray-700" {...props} />,
                                    ul: ({node, ...props}) => <ul className="list-disc ml-5 mb-2 space-y-1 text-sm text-gray-700" {...props} />,
                                    strong: ({node, ...props}) => <strong className="font-bold" {...props} />,
                                  }}
                                >
                                  {item.content}
                                </ReactMarkdown>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ========================================================= */}
        {/* NOTES VIEW (URL to PDF Summarizer) */}
        {/* ========================================================= */}
        <AnimatePresence mode="wait">
          {view === 'notes' && (
            <motion.div
              key="notes"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="flex flex-col h-full absolute inset-0 z-0 bg-white"
            >
              {/* HEADER */}
              <div 
                className="h-20 flex items-center justify-between px-6 bg-transparent z-10 cursor-grab shrink-0 pt-4"
                style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
              >
                <button onClick={() => setView('home')} className="w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center bg-white shadow-sm hover:bg-gray-50 transition-colors" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
                  <ChevronLeft size={18} className="text-gray-500 pr-0.5" />
                </button>
                <h2 className="text-lg font-bold text-gray-800 tracking-tight">Smart Notes Engine</h2>
                <div className="w-10 h-10 flex items-center justify-center" />
              </div>

              {/* CONTENT */}
              <div 
                className="flex-1 flex flex-col items-center justify-center px-8 pb-32 z-0"
                style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
              >
                <div className="w-24 h-24 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-3xl flex items-center justify-center shadow-lg shadow-blue-500/30 mb-8 transform -rotate-6">
                  <FileText size={48} className="text-white" strokeWidth={1.5} />
                </div>
                
                <h1 className="text-3xl font-black text-gray-900 tracking-tight mb-3 text-center">Transform links into PDFs</h1>
                <p className="text-sm text-gray-500 font-medium mb-10 text-center max-w-sm">
                  Paste any website or video URL. I will read the contents, extract key topics, and generate a professional PDF.
                </p>

                <div className="w-full max-w-md bg-white border-2 border-indigo-100 rounded-2xl p-2 flex flex-col shadow-xl shadow-indigo-100/50">
                  <div className="flex items-center gap-3 px-4 py-2 border-b border-indigo-50 mb-2">
                    <Search size={18} className="text-indigo-400" />
                    <input 
                      value={notesUrl}
                      onChange={(e) => setNotesUrl(e.target.value)}
                      placeholder="Paste link here (e.g., https://en.wikipedia...)" 
                      className="bg-transparent border-none outline-none text-sm w-full text-gray-700 placeholder:text-gray-400 font-medium" 
                    />
                  </div>
                  <button 
                    onClick={generatePDF}
                    disabled={!notesUrl.trim() || pdfLoading}
                    className="w-full py-3 bg-indigo-500 hover:bg-indigo-600 disabled:bg-indigo-300 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all shadow-md shadow-indigo-500/20"
                  >
                    {pdfLoading ? (
                      <>
                        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }} className="w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                        Generating PDF...
                      </>
                    ) : (
                      <>
                        <Download size={18} /> Generate Detailed PDF
                      </>
                    )}
                  </button>
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
                className="p-3 rounded-full transition-all text-gray-400 hover:text-gray-600"
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

        {/* ========================================================= */}
        {/* CHAT HISTORY SIDEBAR */}
        {/* ========================================================= */}
        <AnimatePresence>
          {isSidebarOpen && (
            <>
              <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/20 z-40 backdrop-blur-sm"
                onClick={() => setIsSidebarOpen(false)}
                style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
              />
              <motion.div
                initial={{ x: "-100%" }} animate={{ x: 0 }} exit={{ x: "-100%" }} transition={{ type: "spring", damping: 25, stiffness: 200 }}
                className="absolute top-0 left-0 h-full w-64 bg-white/95 backdrop-blur-xl shadow-2xl z-50 flex flex-col border-r border-gray-100"
                style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
              >
                <div className="p-4 h-20 flex items-center justify-between border-b border-gray-100/50 mt-2">
                  <h2 className="font-bold text-gray-800 text-lg">History</h2>
                  <button onClick={() => setIsSidebarOpen(false)} className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 hover:text-gray-800 hover:bg-gray-100 transition-colors">
                    <X size={16} />
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-6">
                  {Object.entries(threads).every(([_, msgs]) => msgs.length === 0) ? (
                    <p className="text-xs text-gray-400 text-center mt-4">No chat history yet.</p>
                  ) : (
                    Object.entries(threads).map(([tMode, msgs]) => {
                      if (msgs.length === 0) return null;
                      const title = tMode === 'coder' ? 'Code Debugger' : tMode === 'solver' ? 'Step-by-Step Solver' : tMode === 'flashcard' ? 'Flashcards' : 'General Chat';
                      return (
                        <div key={tMode} className="space-y-2">
                          <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-2">{title}</h3>
                          {msgs.filter(m => m.role === 'user').map((msg, idx) => (
                            <div 
                              key={idx} 
                              onClick={() => { setMode(tMode as any); setView('chat'); setIsSidebarOpen(false); }}
                              className="text-[13px] font-medium text-gray-600 truncate p-3 hover:bg-fuchsia-50 hover:text-fuchsia-600 rounded-xl cursor-pointer transition-colors border border-transparent hover:border-fuchsia-100"
                            >
                              {msg.content}
                            </div>
                          ))}
                        </div>
                      )
                    })
                  )}
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

      </motion.div>
    </div>
  );
}
