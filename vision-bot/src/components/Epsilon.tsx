"use client";

import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Menu, Sparkles, Image as ImageIcon, Code, ScanSearch, User, GripHorizontal } from "lucide-react";

export default function Epsilon() {
  const [messages, setMessages] = useState<{ role: string; content: string }[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

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

    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setIsLoading(true);

    try {
      const canvas = document.createElement("canvas");
      if (videoRef.current) {
        canvas.width = videoRef.current.videoWidth;
        canvas.height = videoRef.current.videoHeight;
        const ctx = canvas.getContext("2d");
        ctx?.drawImage(videoRef.current, 0, 0);
        const screenshot = canvas.toDataURL("image/jpeg", 0.7);

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
        className="w-full h-full bg-white/90 border border-white/60 rounded-[2.5rem] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.15)] flex flex-col overflow-hidden backdrop-blur-3xl relative"
      >
        {/* DRAGGABLE HEADER */}
        <div 
          className="h-20 flex items-center justify-between px-6 bg-transparent z-10 cursor-grab active:cursor-grabbing shrink-0"
          style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
        >
          <div className="w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center bg-white shadow-sm">
            <Menu size={18} className="text-gray-500" />
          </div>
          
          <div className="flex flex-col items-center">
            <h2 className="text-lg font-bold text-gray-800 tracking-tight">Epsilon</h2>
            <div className="flex items-center gap-1.5">
              <span className={`w-1.5 h-1.5 rounded-full ${isCapturing ? 'bg-green-500' : 'bg-yellow-500'}`} />
              <p className="text-[10px] text-gray-400 font-medium tracking-wider">
                {isCapturing ? 'Active' : 'Standby'}
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
          className="flex-1 overflow-y-auto px-6 pb-24 pt-2 space-y-6 scrollbar-hide z-0 relative"
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
              
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Welcome to Epsilon</h1>
              <p className="text-gray-500 text-sm mb-8 max-w-[80%]">
                Your smart AI assistant. I can see your screen and help you study.
              </p>

              <div className="flex gap-3 justify-center w-full mb-8">
                <button 
                  onClick={() => handleSend("Analyze everything currently visible on my screen.")}
                  className="px-5 py-2.5 bg-fuchsia-500 text-white text-xs font-bold rounded-full shadow-md shadow-fuchsia-500/20 hover:bg-fuchsia-600 transition-all flex items-center gap-2"
                >
                  <ScanSearch size={14} />
                  Analyze
                </button>
                <button 
                  onClick={() => handleSend("Describe the images or diagrams on my screen.")}
                  className="px-5 py-2.5 bg-blue-50 text-blue-600 text-xs font-bold rounded-full border border-blue-100 hover:bg-blue-100 transition-all flex items-center gap-2"
                >
                  <ImageIcon size={14} />
                  Image
                </button>
                <button 
                  onClick={() => handleSend("Explain the code visible on my screen.")}
                  className="px-5 py-2.5 bg-emerald-50 text-emerald-600 text-xs font-bold rounded-full border border-emerald-100 hover:bg-emerald-100 transition-all flex items-center gap-2"
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
                      ? "bg-fuchsia-500 text-white rounded-[1.5rem] rounded-br-sm"
                      : "bg-white border border-gray-100 text-gray-800 rounded-[1.5rem] rounded-bl-sm shadow-sm"
                  }`}
                >
                  {msg.content}
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

        {/* FLOATING INPUT BOX */}
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
    </div>
  );
}
