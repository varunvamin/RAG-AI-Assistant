"use client";

import React, { useState, useRef, useEffect } from "react";
import { Send, Camera, X, Loader2, Sparkles, Move } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function Lumina() {
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
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { cursor: "always" } as any,
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

    const userMessage = input.trim() || "What do you see on my screen?";
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
          history: messages.slice(-10),
        }),
      });

      const data = await res.json();
      if (data.answer) {
        setMessages((prev) => [...prev, { role: "assistant", content: data.answer }]);
      }
    } catch (err: any) {
      setMessages((prev) => [...prev, { role: "assistant", content: "Lumina encountered a flicker: " + err.message }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full h-full p-4 flex flex-col font-sans select-none overflow-hidden rounded-[40px] bg-[#0F172A]/80 backdrop-blur-2xl border border-white/10 shadow-[0_0_50px_rgba(124,58,237,0.3)]">
      {/* Draggable Header / Orb Identity */}
      <div className="flex items-center justify-between pb-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 bg-gradient-to-tr from-violet-600 to-fuchsia-500 rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(124,58,237,0.6)] pulse">
              <Sparkles className="text-white w-5 h-5" />
            </div>
            {isCapturing && <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-[#0F172A] animate-pulse" />}
          </div>
          <div>
            <h1 className="text-white font-black tracking-tight text-lg">LUMINA</h1>
            <p className="text-[10px] text-violet-400 font-bold uppercase tracking-widest">AI Vision Scout</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
            <button onClick={() => window.close()} className="p-2 hover:bg-red-500/20 text-gray-400 hover:text-red-400 rounded-full transition-colors">
                <X size={18} />
            </button>
        </div>
      </div>

      {/* Chat Space */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto py-6 space-y-6 scrollbar-hide">
        {messages.length === 0 && (
          <div className="text-center py-12 space-y-6">
            <motion.div 
              animate={{ scale: [1, 1.1, 1], opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 4, repeat: Infinity }}
              className="w-24 h-24 bg-violet-600/10 rounded-full flex items-center justify-center mx-auto border border-violet-500/20"
            >
              <Camera className="text-violet-400 w-10 h-10" />
            </motion.div>
            <div className="space-y-2">
              <p className="text-white text-lg font-bold">Hello, I'm Lumina</p>
              <p className="text-xs text-gray-400 px-8">I analyze your screen in real-time. Start my vision to begin our study session.</p>
            </div>
            <button
              onClick={startScreenCapture}
              className="px-8 py-3 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-sm font-black rounded-full transition-all shadow-[0_10px_20px_rgba(124,58,237,0.4)] hover:shadow-[0_15px_30px_rgba(124,58,237,0.6)]"
            >
              START VISION
            </button>
          </div>
        )}

        {messages.map((msg, i) => (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            key={i} 
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div className={`max-w-[90%] p-4 rounded-3xl text-sm leading-relaxed ${
              msg.role === "user" 
                ? "bg-violet-600 text-white rounded-tr-none shadow-lg shadow-violet-900/20" 
                : "bg-white/5 text-gray-200 rounded-tl-none border border-white/10"
            }`}>
              {msg.content}
            </div>
          </motion.div>
        ))}
        
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white/5 p-4 rounded-3xl rounded-tl-none border border-white/10">
              <Loader2 className="w-5 h-5 text-violet-400 animate-spin" />
            </div>
          </div>
        )}
      </div>

      {/* Hidden capture elements */}
      <video ref={videoRef} autoPlay playsInline className="hidden" />
      <canvas ref={canvasRef} className="hidden" />

      {/* Control Input */}
      <div className="pt-4 border-t border-white/10">
        <div className="relative flex items-center bg-white/5 rounded-2xl border border-white/10 p-1 focus-within:border-violet-500/50 transition-colors">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder={isCapturing ? "Ask Lumina about your screen..." : "Start vision to ask..."}
            disabled={!isCapturing || isLoading}
            className="w-full bg-transparent text-white text-sm py-3 px-4 focus:outline-none disabled:opacity-50"
          />
          <button
            onClick={handleSend}
            disabled={!isCapturing || isLoading}
            className="p-3 bg-violet-600 hover:bg-violet-500 disabled:bg-gray-800 text-white rounded-xl transition-all shadow-lg"
          >
            <Send size={20} />
          </button>
        </div>
      </div>
      
      <style jsx>{`
        .pulse {
          box-shadow: 0 0 0 0 rgba(124, 58, 237, 0.7);
          animation: pulse 2s infinite cubic-bezier(0.66, 0, 0, 1);
        }
        @keyframes pulse {
          to { box-shadow: 0 0 0 15px rgba(124, 58, 237, 0); }
        }
      `}</style>
    </div>
  );
}
