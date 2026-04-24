"use client";

import React, { useState, useRef, useEffect } from "react";
import { Bot, Maximize2, Minimize2, Send, Camera, X, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function VisionBot() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<{ role: string; content: string }[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
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
        return canvas.toDataURL("image/jpeg", 0.7);
      }
    }
    return null;
  };

  const handleSend = async () => {
    if (!input.trim() && !isCapturing) return;

    const userMessage = input.trim() || "Analyze my screen";
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
          history: messages.slice(-5),
        }),
      });

      const data = await res.json();
      if (data.answer) {
        setMessages((prev) => [...prev, { role: "assistant", content: data.answer }]);
      } else {
        throw new Error(data.error || "Failed to get answer");
      }
    } catch (err: any) {
      setMessages((prev) => [...prev, { role: "assistant", content: "⚠️ Error: " + err.message }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-[9999] font-sans">
      <AnimatePresence>
        {!isOpen ? (
          <motion.button
            initial={{ scale: 0, rotate: -45 }}
            animate={{ scale: 1, rotate: 0 }}
            exit={{ scale: 0, rotate: 45 }}
            onClick={() => setIsOpen(true)}
            className="w-16 h-16 bg-gradient-to-br from-violet-600 to-indigo-600 rounded-full flex items-center justify-center shadow-2xl hover:shadow-violet-500/50 transition-shadow border-2 border-white/20"
          >
            <Bot className="text-white w-8 h-8" />
          </motion.button>
        ) : (
          <motion.div
            initial={{ y: 50, opacity: 0, scale: 0.9 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            className={`bg-[#0F172A]/90 backdrop-blur-xl border border-white/10 shadow-2xl rounded-3xl overflow-hidden flex flex-col ${
              isMinimized ? "w-72 h-14" : "w-[400px] h-[600px]"
            }`}
          >
            {/* Header */}
            <div className="bg-white/5 p-4 flex items-center justify-between border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-violet-600 rounded-lg flex items-center justify-center">
                  <Bot className="text-white w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-white font-bold text-sm">VisionBot AI</h3>
                  <div className="flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${isCapturing ? "bg-green-500 animate-pulse" : "bg-gray-500"}`} />
                    <span className="text-[10px] text-gray-400 uppercase tracking-wider font-medium">
                      {isCapturing ? "Seeing Screen" : "Standby"}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => setIsMinimized(!isMinimized)} className="p-1.5 hover:bg-white/10 rounded-md text-gray-400">
                  {isMinimized ? <Maximize2 size={16} /> : <Minimize2 size={16} />}
                </button>
                <button onClick={() => setIsOpen(false)} className="p-1.5 hover:bg-red-500/20 hover:text-red-400 rounded-md text-gray-400">
                  <X size={16} />
                </button>
              </div>
            </div>

            {!isMinimized && (
              <>
                {/* Chat Area */}
                <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide">
                  {messages.length === 0 && (
                    <div className="text-center py-10 space-y-4">
                      <div className="w-16 h-16 bg-violet-600/20 rounded-2xl flex items-center justify-center mx-auto">
                        <Camera className="text-violet-400 w-8 h-8" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-white font-medium">Ready to see your screen</p>
                        <p className="text-xs text-gray-400 px-10">Click "Start Seeing" then ask me anything about your textbook or documents.</p>
                      </div>
                      <button
                        onClick={startScreenCapture}
                        className="px-6 py-2.5 bg-violet-600 hover:bg-violet-500 text-white text-sm font-bold rounded-xl transition-colors shadow-lg shadow-violet-600/30"
                      >
                        Start Seeing Screen
                      </button>
                    </div>
                  )}

                  {messages.map((msg, i) => (
                    <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[85%] p-3 rounded-2xl text-sm ${
                        msg.role === "user" 
                          ? "bg-violet-600 text-white rounded-tr-none" 
                          : "bg-white/10 text-gray-200 rounded-tl-none border border-white/5"
                      }`}>
                        {msg.content}
                      </div>
                    </div>
                  ))}
                  
                  {isLoading && (
                    <div className="flex justify-start">
                      <div className="bg-white/10 p-3 rounded-2xl rounded-tl-none border border-white/5">
                        <Loader2 className="w-4 h-4 text-violet-400 animate-spin" />
                      </div>
                    </div>
                  )}
                </div>

                {/* Hidden components for capture */}
                <video ref={videoRef} autoPlay playsInline className="hidden" />
                <canvas ref={canvasRef} className="hidden" />

                {/* Input Area */}
                <div className="p-4 bg-white/5 border-t border-white/10">
                  <div className="relative flex items-center">
                    <input
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleSend()}
                      placeholder={isCapturing ? "Ask about your screen..." : "Start capture first..."}
                      disabled={!isCapturing || isLoading}
                      className="w-full bg-[#1E293B] text-white text-sm rounded-xl py-3 pl-4 pr-12 border border-white/10 focus:border-violet-500 focus:outline-none transition-colors disabled:opacity-50"
                    />
                    <button
                      onClick={handleSend}
                      disabled={!isCapturing || isLoading}
                      className="absolute right-2 p-2 bg-violet-600 hover:bg-violet-500 disabled:bg-gray-700 text-white rounded-lg transition-colors"
                    >
                      <Send size={18} />
                    </button>
                  </div>
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
