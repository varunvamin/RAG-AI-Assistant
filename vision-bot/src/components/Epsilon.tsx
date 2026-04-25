"use client";

import React, { useState, useRef, useEffect } from "react";
import { Send, Camera, X, Loader2, Zap, Hexagon } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function Epsilon() {
  const [messages, setMessages] = useState<{ role: string; content: string }[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const startScreenCapture = async () => {
    try {
      // PROPER: This now connects directly to the monitor without a picker
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { 
          displaySurface: "monitor" 
        } as any,
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

  const captureFrame = (): string | null => {
    if (videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        return canvas.toDataURL("image/jpeg", 0.6);
      }
    }
    return null;
  };

  const handleSend = async () => {
    if (!input.trim() && !isCapturing) return;

    const userMessage = input.trim() || "Analyze my current screen state.";
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setInput("");
    setIsLoading(true);

    try {
      const screenshot = captureFrame();
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image: screenshot,
          query: userMessage,
          history: messages.slice(-8),
        }),
      });

      const data = await res.json();
      if (data.answer) {
        setMessages((prev) => [...prev, { role: "assistant", content: data.answer }]);
      }
    } catch (err: any) {
      setMessages((prev) => [...prev, { role: "assistant", content: "Epsilon Error: " + err.message }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full h-full p-5 flex flex-col font-sans select-none overflow-hidden rounded-[32px] bg-[#020617]/90 backdrop-blur-3xl border border-cyan-500/20 shadow-[0_0_60px_rgba(6,182,212,0.15)]">
      {/* Tech Header */}
      <div className="flex items-center justify-between pb-5 border-b border-white/5">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="w-12 h-12 bg-gradient-to-br from-cyan-500 to-emerald-500 rounded-2xl flex items-center justify-center shadow-[0_0_25px_rgba(6,182,212,0.4)] rotate-3">
              <Hexagon className="text-[#020617] w-6 h-6 fill-current" />
            </div>
            {isCapturing && <div className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-400 rounded-full border-[3px] border-[#020617] animate-pulse" />}
          </div>
          <div>
            <h1 className="text-white font-black text-xl tracking-[0.1em]">EPSILON</h1>
            <div className="flex items-center gap-1">
              <Zap size={10} className="text-cyan-400" />
              <p className="text-[9px] text-cyan-400/80 font-black uppercase tracking-[0.2em]">Vision Node v1.0</p>
            </div>
          </div>
        </div>
        <button onClick={() => window.close()} className="p-2.5 hover:bg-white/5 text-gray-500 hover:text-cyan-400 rounded-xl transition-all">
          <X size={20} />
        </button>
      </div>

      {/* Terminal Chat Space */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto py-6 space-y-6 scrollbar-hide">
        {messages.length === 0 && (
          <div className="text-center py-16 space-y-8">
            <motion.div 
              animate={{ rotate: 360 }}
              transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
              className="w-28 h-28 border-2 border-dashed border-cyan-500/30 rounded-full flex items-center justify-center mx-auto"
            >
              <Camera className="text-cyan-500/50 w-10 h-10" />
            </motion.div>
            <div className="space-y-3">
              <p className="text-white text-xl font-black italic tracking-wide">SYSTEM INITIALIZED</p>
              <p className="text-[11px] text-gray-500 px-12 leading-relaxed uppercase tracking-widest font-bold">
                I am Epsilon. Connect to your display stream to begin analysis.
              </p>
            </div>
            <button
              onClick={startScreenCapture}
              className="px-10 py-3.5 bg-transparent border-2 border-cyan-500 text-cyan-500 hover:bg-cyan-500 hover:text-[#020617] text-xs font-black rounded-full transition-all duration-300 tracking-[0.2em]"
            >
              START STREAM
            </button>
          </div>
        )}

        {messages.map((msg, i) => (
          <motion.div 
            initial={{ opacity: 0, x: msg.role === "user" ? 10 : -10 }}
            animate={{ opacity: 1, x: 0 }}
            key={i} 
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div className={`max-w-[92%] p-4 rounded-2xl text-[13px] leading-relaxed font-medium ${
              msg.role === "user" 
                ? "bg-cyan-500 text-[#020617] rounded-br-none shadow-lg shadow-cyan-500/20" 
                : "bg-white/5 text-gray-300 rounded-bl-none border border-white/10"
            }`}>
              {msg.content}
            </div>
          </motion.div>
        ))}
        
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
              <Loader2 className="w-5 h-5 text-cyan-500 animate-spin" />
            </div>
          </div>
        )}
      </div>

      <video ref={videoRef} autoPlay playsInline className="hidden" />
      <canvas ref={canvasRef} className="hidden" />

      {/* Command Input */}
      <div className="pt-5 border-t border-white/5">
        <div className="relative flex items-center bg-[#1e293b]/30 rounded-2xl border border-white/5 p-1 focus-within:border-cyan-500/40 transition-all">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder={isCapturing ? "Awaiting command..." : "Initialize stream first..."}
            disabled={!isCapturing || isLoading}
            className="w-full bg-transparent text-white text-sm py-4 px-5 focus:outline-none placeholder:text-gray-600 disabled:opacity-30"
          />
          <button
            onClick={handleSend}
            disabled={!isCapturing || isLoading}
            className="p-4 bg-cyan-500 hover:bg-cyan-400 disabled:bg-gray-800 text-[#020617] rounded-xl transition-all shadow-[0_0_15px_rgba(6,182,212,0.3)]"
          >
            <Send size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}
