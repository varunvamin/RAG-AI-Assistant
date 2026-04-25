"use client";

import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, ScanFace, Sparkles, GripHorizontal, Activity } from "lucide-react";

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

  // Auto-start the hidden stream for a seamless experience
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

    // Ensure stream is active silently
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
          body: JSON.stringify({ message: userMessage, image: screenshot }),
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
      setMessages((prev) => [...prev, { role: "assistant", content: "⚠️ Interface Error: Could not process the display frame." }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center h-screen w-screen bg-transparent p-2 font-sans antialiased select-none overflow-hidden">
      {/* HIDDEN VIDEO ELEMENT REQUIRED FOR CAPTURE */}
      <video ref={videoRef} autoPlay playsInline muted className="hidden" />

      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 20 }}
        className="w-full h-full bg-white/20 border border-white/40 rounded-[2rem] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] flex flex-col overflow-hidden backdrop-blur-3xl relative"
      >
        {/* DRAGGABLE HEADER */}
        <div 
          className="h-16 flex items-center justify-between px-6 bg-white/30 border-b border-white/40 shadow-sm z-10 cursor-grab active:cursor-grabbing"
          style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-full flex items-center justify-center shadow-lg shadow-cyan-500/30">
               <Sparkles size={18} className="text-white fill-white" />
            </div>
            <div>
              <h2 className="text-sm font-black text-slate-800 tracking-widest uppercase">Epsilon</h2>
              <div className="flex items-center gap-1.5">
                <span className={`w-1.5 h-1.5 rounded-full ${isCapturing ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
                <p className="text-[9px] text-slate-500 font-bold uppercase tracking-[0.2em]">
                  {isCapturing ? 'Vision Sync Active' : 'Awaiting Sync'}
                </p>
              </div>
            </div>
          </div>
          <GripHorizontal size={20} className="text-slate-400" />
        </div>

        {/* MESSAGES AREA */}
        <div 
          ref={scrollRef}
          className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-hide z-0"
          style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
        >
          {messages.length === 0 && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="h-full flex flex-col items-center justify-center text-center space-y-8 mt-4"
            >
              <div className="relative">
                <div className="absolute inset-0 bg-cyan-400 blur-2xl opacity-20 rounded-full animate-pulse" />
                <div className="w-24 h-24 border border-cyan-400/30 rounded-full flex items-center justify-center bg-white/20 backdrop-blur-md shadow-xl">
                  <ScanFace size={40} className="text-cyan-600" />
                </div>
              </div>
              
              <div className="space-y-2">
                <h3 className="text-slate-800 font-bold text-lg">Ready to Analyze</h3>
                <p className="text-slate-500 text-xs px-4 leading-relaxed font-medium">
                  I am actively monitoring your screen. Ask me a question or click the button below for a full analysis.
                </p>
              </div>

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleSend("Analyze everything currently visible on my screen.")}
                className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 text-white text-sm font-bold rounded-2xl shadow-lg shadow-cyan-500/20 flex items-center gap-2 transition-all hover:shadow-cyan-500/40 cursor-pointer"
              >
                <Activity size={16} />
                Analyze Screen Now
              </motion.button>
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
                  className={`max-w-[85%] p-4 rounded-3xl text-[14px] leading-relaxed shadow-sm ${
                    msg.role === "user"
                      ? "bg-gradient-to-br from-cyan-500 to-blue-500 text-white rounded-br-sm"
                      : "bg-white/70 border border-white/60 text-slate-800 rounded-bl-sm backdrop-blur-md"
                  }`}
                >
                  {msg.content}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-white/70 border border-white/60 p-4 rounded-3xl rounded-bl-sm flex gap-2 shadow-sm backdrop-blur-md items-center">
                <span className="text-xs text-cyan-600 font-bold tracking-widest uppercase">Processing</span>
                <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1 }} className="w-1.5 h-1.5 bg-cyan-500 rounded-full" />
                <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1, delay: 0.2 }} className="w-1.5 h-1.5 bg-cyan-500 rounded-full" />
                <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1, delay: 0.4 }} className="w-1.5 h-1.5 bg-cyan-500 rounded-full" />
              </div>
            </div>
          )}
        </div>

        {/* INPUT BOX */}
        <div 
          className="p-5 bg-white/40 backdrop-blur-2xl border-t border-white/50 z-10 shadow-[0_-10px_40px_rgba(0,0,0,0.03)]"
          style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
        >
          <div className="flex items-center gap-3">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              placeholder="Ask anything about your screen..."
              className="flex-1 bg-white/60 border border-white/60 rounded-2xl px-5 py-3.5 text-sm text-slate-800 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 shadow-inner transition-all font-medium"
            />
            <button
              onClick={() => handleSend()}
              disabled={!input.trim() || isLoading}
              className="w-12 h-12 bg-gradient-to-br from-slate-700 to-slate-900 rounded-2xl flex items-center justify-center text-white shadow-md hover:scale-105 transition-all active:scale-95 disabled:opacity-50 disabled:hover:scale-100 cursor-pointer"
            >
              <Send size={18} />
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
