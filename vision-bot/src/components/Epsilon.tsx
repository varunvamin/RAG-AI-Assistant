"use client";

import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Zap, Monitor, MessageSquare, X, GripHorizontal, BrainCircuit } from "lucide-react";

export default function Epsilon() {
  const [messages, setMessages] = useState<{ role: string; content: string }[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll chat
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

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
      console.error("Error capturing screen:", err);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || !isCapturing || isLoading) return;

    const userMessage = input;
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
          body: JSON.stringify({ message: userMessage, image: screenshot }),
        });

        const data = await response.json();
        if (data.reply) {
          setMessages((prev) => [...prev, { role: "assistant", content: data.reply }]);
        }
      }
    } catch (error) {
      console.error("Chat error:", error);
      setMessages((prev) => [...prev, { role: "assistant", content: "CRITICAL SYSTEM ERROR: NEURAL LINK FAILED." }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-transparent p-4 font-sans antialiased select-none">
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-[380px] h-[600px] bg-[#020617]/95 border border-cyan-500/30 rounded-[2.5rem] shadow-[0_0_80px_rgba(6,182,212,0.15)] flex flex-col overflow-hidden backdrop-blur-2xl relative ring-1 ring-white/5"
      >
        {/* DRAGGABLE HEADER */}
        <div className="drag-region h-14 flex items-center justify-between px-6 bg-cyan-500/5 border-b border-white/5 cursor-grab active:cursor-grabbing">
          <div className="flex items-center gap-2">
            <div className="relative">
               <div className="w-8 h-8 bg-gradient-to-br from-cyan-400 to-emerald-400 rounded-lg flex items-center justify-center shadow-[0_0_15px_rgba(34,211,238,0.4)]">
                 <Zap size={16} className="text-[#020617] fill-current" />
               </div>
               {isCapturing && (
                 <motion.div 
                   animate={{ scale: [1, 1.2, 1] }}
                   transition={{ repeat: Infinity, duration: 2 }}
                   className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border-2 border-[#020617]"
                 />
               )}
            </div>
            <div>
              <h2 className="text-sm font-black text-white tracking-widest uppercase">Epsilon</h2>
              <p className="text-[9px] text-cyan-400/70 font-bold uppercase tracking-[0.2em]">Neural Node v2.0</p>
            </div>
          </div>
          <GripHorizontal size={18} className="text-white/20" />
        </div>

        {/* MONITOR PREVIEW (Small & Discreet) */}
        <div className="relative w-full h-32 bg-black/40 overflow-hidden group">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={`w-full h-full object-cover grayscale opacity-40 transition-all duration-700 ${isCapturing ? 'opacity-60 grayscale-0' : ''}`}
          />
          {!isCapturing && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 no-drag">
              <button
                onClick={startScreenCapture}
                className="px-6 py-2 bg-cyan-500 text-[#020617] text-xs font-black uppercase tracking-widest rounded-full hover:bg-cyan-400 transition-all shadow-[0_0_20px_rgba(6,182,212,0.3)] active:scale-95"
              >
                Sync Display
              </button>
              <p className="text-[9px] text-white/30 uppercase font-black tracking-widest">Awaiting Vision Stream</p>
            </div>
          )}
          {isCapturing && (
             <div className="absolute top-2 right-4 flex items-center gap-2">
               <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
               <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">Stream Active</span>
             </div>
          )}
        </div>

        {/* MESSAGES AREA */}
        <div 
          ref={scrollRef}
          className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-hide no-drag"
        >
          {messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center opacity-20 text-center space-y-4">
              <BrainCircuit size={48} className="text-cyan-400" />
              <p className="text-[10px] text-white font-black uppercase tracking-[0.3em]">Neural Interface Ready</p>
            </div>
          )}
          
          <AnimatePresence initial={false}>
            {messages.map((msg, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: msg.role === "user" ? 10 : -10 }}
                animate={{ opacity: 1, x: 0 }}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] p-4 rounded-2xl text-[13px] leading-relaxed shadow-sm ${
                    msg.role === "user"
                      ? "bg-cyan-500/10 border border-cyan-500/20 text-cyan-50"
                      : "bg-white/5 border border-white/10 text-gray-300"
                  }`}
                >
                  {msg.content}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-white/5 border border-white/10 p-4 rounded-2xl flex gap-1.5 shadow-sm">
                <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1 }} className="w-1.5 h-1.5 bg-cyan-400 rounded-full" />
                <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1, delay: 0.2 }} className="w-1.5 h-1.5 bg-cyan-400 rounded-full" />
                <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1, delay: 0.4 }} className="w-1.5 h-1.5 bg-cyan-400 rounded-full" />
              </div>
            </div>
          )}
        </div>

        {/* INPUT BOX */}
        <div className="p-6 bg-[#020617]/50 backdrop-blur-md border-t border-white/5 no-drag">
          <div className="flex items-center gap-3">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              placeholder={isCapturing ? "Awaiting neural input..." : "Connect display to start..."}
              disabled={!isCapturing}
              className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-5 py-3.5 text-xs text-white placeholder:text-white/20 focus:outline-none focus:ring-1 focus:ring-cyan-500/50 transition-all disabled:opacity-50"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || !isCapturing || isLoading}
              className="w-11 h-11 bg-cyan-500 rounded-xl flex items-center justify-center text-[#020617] shadow-[0_0_15px_rgba(6,182,212,0.3)] hover:bg-cyan-400 transition-all active:scale-95 disabled:opacity-50 disabled:grayscale"
            >
              <Send size={18} fill="currentColor" />
            </button>
          </div>
        </div>

        {/* BOTTOM GLOW */}
        <div className="absolute bottom-0 inset-x-0 h-32 bg-gradient-to-t from-cyan-500/10 to-transparent pointer-events-none" />
      </motion.div>
    </div>
  );
}
