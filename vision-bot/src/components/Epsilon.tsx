"use client";

import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import { Send, Menu, Sparkles, Image as ImageIcon, Code, ScanSearch, User, Home, MessageCircle, Bookmark, ChevronLeft, Search, Folder, MoreHorizontal, Bot, FileText, Download, PanelLeft, Save, X, Monitor, MonitorOff, Paperclip, Plus, Mic, MicOff, Copy, Check } from "lucide-react";

const CodeBlock = ({ node, inline, className, children, ...props }: any) => {
  const match = /language-(\w+)/.exec(className || "");
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(String(children).replace(/\n$/, ""));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  if (!inline && match) {
    return (
      <div className="relative group my-4 rounded-xl overflow-hidden bg-[#1E1E1E] border border-gray-700 shadow-md">
        <div className="flex items-center justify-between px-4 py-2 bg-[#2D2D2D] border-b border-gray-700">
          <span className="text-xs font-mono text-gray-400">{match[1]}</span>
          <button
            onClick={handleCopy}
            className="text-gray-400 hover:text-white transition-colors"
            title="Copy code"
          >
            {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
          </button>
        </div>
        <div className="p-4 overflow-x-auto scrollbar-hide text-sm text-gray-100 font-mono">
          <code className={className} {...props}>
            {children}
          </code>
        </div>
      </div>
    );
  }
  return (
    <code className="bg-gray-100 text-pink-500 rounded px-1.5 py-0.5 text-sm font-mono" {...props}>
      {children}
    </code>
  );
};

export default function Epsilon() {
  const [messages, setMessages] = useState<{ role: string; content: string }[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  
  // Navigation State
  const [view, setView] = useState<'home' | 'chat' | 'bookmarks' | 'notes' | 'flashcards'>('home');
  const [activeTab, setActiveTab] = useState<'chat' | 'image' | 'code'>('chat');
  
  // New Feature States
  const [mode, setMode] = useState<'general' | 'flashcard' | 'solver' | 'coder'>('general');
  const [threads, setThreads] = useState<Record<string, { role: string; content: string }[]>>({
    general: [], flashcard: [], solver: [], coder: []
  });
  const [useVision, setUseVision] = useState(false);
  const [savedItems, setSavedItems] = useState<{ id: string; title: string; category: string; content: string }[]>([]);
  const [expandedBookmarkId, setExpandedBookmarkId] = useState<string | null>(null);
  const [threadTitles, setThreadTitles] = useState<Record<string, string>>({});
  const [pastChats, setPastChats] = useState<{ id: string; title: string; category: string; messages: { role: string; content: string }[] }[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [notesUrl, setNotesUrl] = useState("");
  
  // Flashcard Generation States
  const [generatingFlashcards, setGeneratingFlashcards] = useState(false);
  const [flashcardsDeck, setFlashcardsDeck] = useState<{ question: string; answer: string }[]>([]);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isCardFlipped, setIsCardFlipped] = useState(false);
  const [selectedChatTitle, setSelectedChatTitle] = useState("");
  const [successFeedback, setSuccessFeedback] = useState("");
  
  // Input Bar States
  const [attachedImage, setAttachedImage] = useState<string | null>(null);
  const [showActionMenu, setShowActionMenu] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Authentication & Multi-user state variables
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [authUsername, setAuthUsername] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authError, setAuthError] = useState("");

  // Live Audio Solver State Variables
  const [isListening, setIsListening] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState("");
  const recognitionRef = useRef<any>(null);
  const silenceTimeoutRef = useRef<any>(null);
  const isListeningRef = useRef(false);

  // Whisper VAD Refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);

  // Sync isListening to Ref for asynchronous callbacks
  useEffect(() => {
    isListeningRef.current = isListening;
  }, [isListening]);

  // Load User Data Partition from LocalStorage
  const loadUserProfile = (username: string) => {
    try {
      const data = localStorage.getItem(`epsilon_profile_${username}`);
      if (data) {
        const parsed = JSON.parse(data);
        if (parsed.threads) setThreads(parsed.threads);
        if (parsed.pastChats) setPastChats(parsed.pastChats);
        if (parsed.savedItems) setSavedItems(parsed.savedItems);
        if (parsed.threadTitles) setThreadTitles(parsed.threadTitles);
      } else {
        // Reset states for fresh user profile
        setThreads({ general: [], flashcard: [], solver: [], coder: [] });
        setPastChats([]);
        setSavedItems([]);
        setThreadTitles({});
      }
    } catch (e) {
      console.error("Failed to load user profile:", e);
    }
  };

  // Auto-Save User Profile on State Modifications
  useEffect(() => {
    if (currentUser) {
      const profileData = { threads, pastChats, savedItems, threadTitles };
      localStorage.setItem(`epsilon_profile_${currentUser}`, JSON.stringify(profileData));
    }
  }, [threads, pastChats, savedItems, threadTitles, currentUser]);

  // Initial authentication restore check
  useEffect(() => {
    const cachedUser = localStorage.getItem("epsilon_current_user");
    if (cachedUser) {
      setCurrentUser(cachedUser);
      loadUserProfile(cachedUser);
    }
  }, []);

  // Native Web Crypto SHA-256 Hashing for Secure Local Credentials
  const hashPassword = async (password: string): Promise<string> => {
    try {
      const msgBuffer = new TextEncoder().encode(password);
      const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      return hashHex;
    } catch (e) {
      // Obfuscated fallback in case Web Crypto is unsupported
      return btoa(password);
    }
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    if (!authUsername.trim() || !authPassword.trim()) {
      setAuthError("All fields are required.");
      return;
    }
    const usersRaw = localStorage.getItem("epsilon_registered_users") || "{}";
    let users: Record<string, string> = {};
    try {
      users = JSON.parse(usersRaw);
    } catch (err) {
      console.error("Failed to parse local user registry:", err);
    }

    const enteredHash = await hashPassword(authPassword);

    if (authMode === 'login') {
      const storedCred = users[authUsername];
      if (storedCred) {
        // Support both SHA-256 and old plaintext for seamless password migration
        const isValid = (storedCred === enteredHash) || (storedCred === authPassword);
        if (isValid) {
          // Upgrade password to SHA-256 if it was stored in plaintext
          if (storedCred === authPassword) {
            users[authUsername] = enteredHash;
            localStorage.setItem("epsilon_registered_users", JSON.stringify(users));
          }
          setCurrentUser(authUsername);
          localStorage.setItem("epsilon_current_user", authUsername);
          loadUserProfile(authUsername);
        } else {
          setAuthError("Invalid username or password.");
        }
      } else {
        setAuthError("Invalid username or password.");
      }
    } else {
      if (users[authUsername]) {
        setAuthError("Username already exists.");
      } else {
        users[authUsername] = enteredHash;
        localStorage.setItem("epsilon_registered_users", JSON.stringify(users));
        setCurrentUser(authUsername);
        localStorage.setItem("epsilon_current_user", authUsername);
        
        // Setup empty clean profile
        setThreads({ general: [], flashcard: [], solver: [], coder: [] });
        setPastChats([]);
        setSavedItems([]);
        setThreadTitles({});
      }
    }
  };

  const handleLogout = () => {
    stopAudioListening();
    setCurrentUser(null);
    localStorage.removeItem("epsilon_current_user");
    setAuthUsername("");
    setAuthPassword("");
    setAuthError("");
    setThreads({ general: [], flashcard: [], solver: [], coder: [] });
    setPastChats([]);
    setSavedItems([]);
    setThreadTitles({});
    setView('home');
  };

  // Whisper Voice Activity Detector (VAD) Pipeline
  const startWhisperVAD = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStreamRef.current = stream;

      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        if (audioBlob.size > 1000) {
          const formData = new FormData();
          formData.append('file', audioBlob, 'audio.webm');
          
          try {
            setLiveTranscript("Analyzing voice...");
            const res = await fetch('/api/transcribe', {
              method: 'POST',
              body: formData,
            });
            const data = await res.json();
            if (data.text && data.text.trim().length >= 2) {
              setLiveTranscript(data.text);
              handleSend(data.text, mode, false);
            } else {
              setLiveTranscript("");
            }
          } catch (err) {
            console.error("Whisper transcription failed:", err);
            setLiveTranscript("");
          }
        }
        
        // Continuous loop restart
        if (isListeningRef.current) {
          audioChunksRef.current = [];
          try {
            mediaRecorderRef.current?.start();
          } catch (e) {
            // ignore
          }
        }
      };

      // Set up Audio Context and Analyser for silence monitoring
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const audioContext = new AudioCtx();
      audioContextRef.current = audioContext;
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyserRef.current = analyser;
      analyser.fftSize = 256;
      source.connect(analyser);

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      
      let isSpeaking = false;
      let silenceStart = Date.now();

      // Adaptive Calibration Parameters
      let baselineVolume = 10; // Fallback baseline
      const calibrationSamples: number[] = [];
      const calibrationStartTime = Date.now();

      setIsListening(true);
      setLiveTranscript("Calibrating background noise...");
      mediaRecorder.start();

      const checkVolume = () => {
        if (!isListeningRef.current || !analyserRef.current) return;
        
        analyser.getByteFrequencyData(dataArray);
        
        let total = 0;
        for (let i = 0; i < bufferLength; i++) {
          total += dataArray[i];
        }
        const average = total / bufferLength;
        
        // Phase 1: Calibrate noise floor for the first 750ms
        if (Date.now() - calibrationStartTime < 750) {
          calibrationSamples.push(average);
          const sum = calibrationSamples.reduce((a, b) => a + b, 0);
          // Set baseline to the average ambient noise observed during calibration + small buffer
          baselineVolume = (sum / calibrationSamples.length) + 4;
        } else {
          // Phase 2: Dynamic Voice Activity Detection
          const speakingThreshold = Math.max(baselineVolume, 14); // Clamp at minimum of 14 to avoid mic hum triggers
          
          if (average > speakingThreshold) {
            if (!isSpeaking) {
              isSpeaking = true;
              setLiveTranscript("Listening...");
            }
            silenceStart = Date.now(); // Reset silence timestamp
          } else {
            if (isSpeaking) {
              // Pause detection: 1.2 seconds of consecutive silence triggers submission
              if (Date.now() - silenceStart > 1200) {
                isSpeaking = false;
                if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
                  mediaRecorderRef.current.stop();
                }
              }
            }
          }
        }
        
        requestAnimationFrame(checkVolume);
      };

      requestAnimationFrame(checkVolume);
    } catch (err) {
      console.error("Failed to boot Whisper VAD fallback:", err);
      setIsListening(false);
    }
  };

  // Speech Recognition Event Callbacks & Control handlers
  const startAudioListening = () => {
    try {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SpeechRecognition) {
        alert("Speech Recognition is not natively supported in this browser or OS shell.");
        return;
      }

      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      let lastErrorType = "";

      recognition.onstart = () => {
        setIsListening(true);
        setLiveTranscript("");
      };

      recognition.onerror = (event: any) => {
        const err = event.error;
        lastErrorType = err;
        
        if (err === 'network') {
          console.warn("Speech Recognition network status offline. Seamlessly switching to local Whisper VAD pipeline...");
          // Stop Web Speech without triggering default end handling
          if (recognitionRef.current) {
            try {
              recognitionRef.current.onend = null; // Prevent onend restart loop
              recognitionRef.current.stop();
            } catch (e) {}
            recognitionRef.current = null;
          }
          startWhisperVAD();
          return;
        }

        console.error("Speech Recognition error:", err);
        
        if (err === 'not-allowed') {
          alert("Audio hardware permission denied. Please allow microphone access.");
          stopAudioListening();
        }
      };

      recognition.onend = () => {
        if (isListeningRef.current) {
          // If the last error was network-related, wait 2 seconds before retrying to prevent crashing browser thread
          const restartDelay = lastErrorType === 'network' ? 2000 : 300;
          lastErrorType = ""; // Reset
          
          setTimeout(() => {
            if (isListeningRef.current) {
              try {
                recognitionRef.current?.start();
              } catch (e) {
                console.warn("Silent SpeechRecognition restart warning:", e);
              }
            }
          }, restartDelay);
        } else {
          setIsListening(false);
        }
      };

      recognition.onresult = (event: any) => {
        let finalTranscript = "";
        let interimTranscript = "";

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }

        const currentText = finalTranscript || interimTranscript;
        if (currentText.trim()) {
          setLiveTranscript(currentText);

          if (silenceTimeoutRef.current) {
            clearTimeout(silenceTimeoutRef.current);
          }

          // Auto-trigger Epsilon when speaker pauses for 1.5 seconds (quicker processing)
          silenceTimeoutRef.current = setTimeout(() => {
            const textCleaned = currentText.trim();
            const wordCount = textCleaned.split(/\s+/).length;

            // Submit if there are at least 2 words to filter out mic clicks/ambient noise
            if (wordCount >= 2 && isListeningRef.current) {
              handleSend(textCleaned, mode, false);
              setLiveTranscript("");
              recognition.stop();
            }
          }, 1500); // 1.5s is the optimal sweet spot for natural speech pauses
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (e) {
      console.error("Speech Recognition initialization failure:", e);
    }
  };

  const stopAudioListening = () => {
    setIsListening(false);
    
    // Stop Web Speech
    if (silenceTimeoutRef.current) {
      clearTimeout(silenceTimeoutRef.current);
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.onend = null;
        recognitionRef.current.stop();
      } catch (e) {
        // ignore
      }
      recognitionRef.current = null;
    }

    // Stop Whisper MediaRecorder and release tracks
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      try {
        mediaRecorderRef.current.stop();
      } catch (e) {
        // ignore
      }
    }
    mediaRecorderRef.current = null;

    if (micStreamRef.current) {
      try {
        micStreamRef.current.getTracks().forEach(track => track.stop());
      } catch (e) {
        // ignore
      }
      micStreamRef.current = null;
    }

    if (audioContextRef.current) {
      try {
        audioContextRef.current.close();
      } catch (e) {
        // ignore
      }
      audioContextRef.current = null;
    }

    setLiveTranscript("");
  };

  const toggleListening = () => {
    if (isListening) {
      stopAudioListening();
    } else {
      startAudioListening();
    }
  };

  // Clean up SpeechRecognition on unmount
  useEffect(() => {
    return () => {
      if (silenceTimeoutRef.current) clearTimeout(silenceTimeoutRef.current);
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          // ignore
        }
      }
    };
  }, []);

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

    const isFirstMessage = !threads[currentMode] || threads[currentMode].length === 0;

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
        const assistantReply = data.reply;
        setThreads((prev) => ({
          ...prev,
          [currentMode]: [...(prev[currentMode] || []), { role: "assistant", content: assistantReply }]
        }));
        
        // Dynamically generate/update the title based on the entire conversation content
        const updatedHistory = [
          ...(threads[currentMode] || []),
          { role: "user", content: userMessage },
          { role: "assistant", content: assistantReply }
        ];

        fetch("/api/title", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ history: updatedHistory }),
        })
          .then(res => res.json())
          .then(titleData => {
            if (titleData.title) {
              setThreadTitles(prev => ({ ...prev, [currentMode]: titleData.title }));
            }
          })
          .catch(console.error);
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

  const handleNewChat = () => {
    if (threads[mode] && threads[mode].length > 0) {
      setPastChats(prev => [...prev, {
        id: Date.now().toString(),
        title: threadTitles[mode] || threads[mode].find(m => m.role === 'user')?.content.substring(0, 30) + '...' || "Untitled Chat",
        category: mode,
        messages: threads[mode]
      }]);
    }
    setThreads(prev => ({ ...prev, [mode]: [] }));
    setThreadTitles(prev => {
      const copy = { ...prev };
      delete copy[mode];
      return copy;
    });
  };

  const loadPastChat = (chatId: string) => {
    const chatToLoad = pastChats.find(c => c.id === chatId);
    if (!chatToLoad) return;
    
    if (threads[mode] && threads[mode].length > 0) {
      setPastChats(prev => [
        ...prev.filter(c => c.id !== chatId),
        {
          id: Date.now().toString(),
          title: threadTitles[mode] || threads[mode].find(m => m.role === 'user')?.content.substring(0, 30) + '...' || "Untitled Chat",
          category: mode,
          messages: threads[mode]
        }
      ]);
    } else {
      setPastChats(prev => prev.filter(c => c.id !== chatId));
    }
    
    setMode(chatToLoad.category as any);
    setThreads(prev => ({ ...prev, [chatToLoad.category]: chatToLoad.messages }));
    setThreadTitles(prev => ({ ...prev, [chatToLoad.category]: chatToLoad.title }));
    setIsSidebarOpen(false);
  };

  const handleSaveChat = async () => {
    const currentChat = threads[mode];
    if (!currentChat || currentChat.length === 0 || isSaving) return;
    
    setIsSaving(true);
    const chatContent = currentChat.map(msg => `**${msg.role === 'user' ? 'You' : 'Epsilon'}**: ${msg.content}`).join('\n\n');
    
    // Fallback title
    let title = threadTitles[mode] || currentChat.find(m => m.role === 'user')?.content.substring(0, 30) + '...' || "Saved Chat";

    try {
      const res = await fetch("/api/title", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ history: currentChat }),
      });
      const data = await res.json();
      if (data.title) title = data.title;
    } catch (e) {
      console.error("Failed to generate title:", e);
    }
    
    setSavedItems((prev) => [...prev, { 
      id: Date.now().toString(), 
      title, 
      category: mode, 
      content: chatContent 
    }]);
    setIsSaving(false);
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
        const title = data.title || "Epsilon Notes Summary";
        const overview = data.overview || "Detailed academic summary generated from reference material.";
        
        // Dynamically import html2pdf so it doesn't break SSR
        const html2pdf = (await import('html2pdf.js')).default;
        
        // Create a hidden div to format the PDF content
        const element = document.createElement('div');
        
        // Build a robust and premium markdown-to-HTML formatter
        const formatMarkdownToHTML = (markdown: string) => {
          let html = markdown;
          
          // Replace headers
          html = html.replace(/^##\s+(.*)$/gmi, '<h2 style="color: #0F4C5C; font-size: 16px; font-weight: 700; border-bottom: 2px solid #E2E8F0; padding-bottom: 6px; margin-top: 24px; margin-bottom: 12px; page-break-after: avoid; font-family: \'Helvetica Neue\', Arial, sans-serif;">$1</h2>');
          html = html.replace(/^###\s+(.*)$/gmi, '<h3 style="color: #1A8099; font-size: 13px; font-weight: 600; margin-top: 18px; margin-bottom: 8px; font-family: \'Helvetica Neue\', Arial, sans-serif;">$1</h3>');
          
          // Replace bold text
          html = html.replace(/\*\*(.*?)\*\*/g, '<strong style="color: #0F4C5C; font-weight: 700;">$1</strong>');
          
          // Handle blockquotes
          html = html.replace(/^\>\s+(.*)$/gmi, '<div style="background-color: #F7FAFC; border-left: 4px solid #C5A880; padding: 12px 20px; margin: 16px 0; border-radius: 4px; font-style: italic; color: #4A5568;">$1</div>');
          
          // Custom parsing for bullet points to make them look absolutely amazing
          const lines = html.split('\n');
          let insideList = false;
          const processedLines = lines.map(line => {
            const trimmed = line.trim();
            const listMatch = trimmed.match(/^[-*+]\s+(.*)/);
            
            if (listMatch) {
              let itemContent = listMatch[1];
              let output = '';
              if (!insideList) {
                insideList = true;
                output += '<ul style="padding: 0; margin: 12px 0 16px 0;">';
              }
              output += `
                <li style="margin-bottom: 8px; font-size: 12.5px; color: #4A5568; line-height: 1.6; list-style-type: none; position: relative; padding-left: 20px; font-family: \'Helvetica Neue\', Arial, sans-serif;">
                  <span style="position: absolute; left: 0; top: 6px; width: 6px; height: 6px; background-color: #1A8099; border-radius: 50%;"></span>
                  ${itemContent}
                </li>`;
              return output;
            } else {
              let output = '';
              if (insideList) {
                insideList = false;
                output += '</ul>';
              }
              if (trimmed.length > 0 && !trimmed.startsWith('<h') && !trimmed.startsWith('<div') && !trimmed.startsWith('<ul') && !trimmed.startsWith('<li')) {
                output += `<p style="font-size: 12.5px; color: #2D3748; line-height: 1.7; margin-bottom: 14px; font-family: \'Helvetica Neue\', Arial, sans-serif;">${trimmed}</p>`;
              } else {
                output += trimmed;
              }
              return output;
            }
          });
          
          let finalHtml = processedLines.join('');
          if (insideList) {
            finalHtml += '</ul>';
          }
          return finalHtml;
        };
        
        const formattedContent = formatMarkdownToHTML(data.summary);
        
        // Construct the magazine-style PDF page layout matching Claude's designs
        element.innerHTML = `
          <div style="font-family: 'Helvetica Neue', Arial, sans-serif; color: #2C3E50; max-width: 800px; margin: 0 auto; background: #FFFFFF; padding: 0; box-sizing: border-box;">
            <!-- Header Banner -->
            <div style="background: linear-gradient(135deg, #0f4c5c 0%, #1a5f7a 100%); color: #FFFFFF; padding: 35px 45px; border-bottom: 5px solid #c5a880; position: relative; border-top-left-radius: 4px; border-top-right-radius: 4px;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
                <span style="font-size: 10px; text-transform: uppercase; letter-spacing: 2px; color: #C5A880; font-weight: 700;">EPSILON STUDY ENGINE</span>
                <span style="font-size: 10px; color: rgba(255,255,255,0.7); font-weight: 500;">DATE: ${new Date().toLocaleDateString()}</span>
              </div>
              <h1 style="font-size: 24px; font-weight: 800; line-height: 1.2; margin: 0 0 10px 0; color: #FFFFFF; letter-spacing: -0.5px;">${title}</h1>
              <div style="font-size: 12px; color: rgba(255,255,255,0.85); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; display: flex; align-items: center; gap: 6px;">
                <span style="color: #C5A880; font-weight: 700;">SOURCE:</span> 
                <span style="text-decoration: underline; opacity: 0.9;">${notesUrl}</span>
              </div>
            </div>
            
            <!-- Content Area -->
            <div style="padding: 40px 45px; background-color: #fafbfc;">
              <!-- Executive Summary Callout Box -->
              <div style="background: #FFFFFF; border-left: 4px solid #1a5f7a; border-radius: 6px; padding: 20px; margin-bottom: 25px; box-shadow: 0 4px 12px rgba(0,0,0,0.015);">
                <h4 style="margin: 0 0 8px 0; color: #1a5f7a; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; display: flex; align-items: center; gap: 6px;">
                  <span style="background: #1a5f7a; width: 6px; height: 6px; display: inline-block; border-radius: 50%;"></span>
                  Executive Summary Overview
                </h4>
                <p style="font-size: 12.5px; line-height: 1.6; color: #4A5568; margin: 0; font-style: italic;">
                  ${overview}
                </p>
              </div>
              
              <!-- Styled Body Content -->
              <div style="background: #FFFFFF; border-radius: 8px; padding: 30px; box-shadow: 0 4px 20px rgba(0,0,0,0.01);">
                ${formattedContent}
              </div>
            </div>
            
            <!-- Footer -->
            <div style="background: #F7FAFC; padding: 18px 45px; border-top: 1px solid #E2E8F0; display: flex; justify-content: space-between; align-items: center; border-bottom-left-radius: 4px; border-bottom-right-radius: 4px;">
              <span style="font-size: 10px; color: #A0AEC0; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">Epsilon Academic Assistant</span>
              <span style="font-size: 10px; color: #A0AEC0;">Page 1 of 1</span>
            </div>
          </div>
        `;
        
        // Clean name formatted dynamic filename based on actual content
        const cleanName = title.toLowerCase()
          .replace(/[^a-z0-9\s-]/g, '') // remove special characters
          .replace(/\s+/g, '_')         // replace spaces with underscores
          .replace(/-+/g, '_')          // replace dashes with underscores
          .substring(0, 35);            // limit length
        
        const dynamicFilename = `${cleanName || 'epsilon'}_notes.pdf`;
        
        const opt = {
          margin: 8,
          filename: dynamicFilename,
          image: { type: 'jpeg' as const, quality: 0.98 },
          html2canvas: { scale: 2.5, useCORS: true },
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

      {!currentUser ? (
        <div className="w-full h-full bg-slate-950 flex items-center justify-center relative p-8 rounded-[2.5rem] border border-slate-900 overflow-hidden shadow-2xl">
          {/* Stunning glowing background blobs */}
          <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-fuchsia-500/10 rounded-full blur-[80px] pointer-events-none" />
          <div className="absolute bottom-1/4 right-1/4 w-72 h-72 bg-indigo-500/10 rounded-full blur-[80px] pointer-events-none" />
          
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-sm bg-slate-900/45 border border-slate-800/80 backdrop-blur-xl rounded-[2rem] p-8 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)] flex flex-col items-center relative overflow-hidden z-10"
            style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
          >
            <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-fuchsia-500 to-indigo-500" />
            
            {/* Logo */}
            <div className="w-16 h-16 bg-gradient-to-br from-fuchsia-500/10 to-indigo-500/10 border border-fuchsia-500/30 rounded-2xl flex items-center justify-center mb-4">
              <Sparkles className="text-fuchsia-400 animate-pulse" size={28} />
            </div>
            
            <h1 className="text-2xl font-black text-white tracking-tight">Epsilon Engine</h1>
            <p className="text-slate-400 text-xs mt-1 text-center max-w-[240px]">Advanced AI Screen Reader & Personal Study Portal</p>
            
            {/* Login / Signup Toggle */}
            <div className="w-full bg-slate-950 p-1 rounded-xl flex items-center gap-1 mt-6 border border-slate-800/50">
              <button 
                onClick={() => { setAuthMode('login'); setAuthError(""); }}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${authMode === 'login' ? 'bg-fuchsia-500 text-white shadow-md shadow-fuchsia-500/20' : 'text-slate-400 hover:text-slate-300'}`}
              >
                Sign In
              </button>
              <button 
                onClick={() => { setAuthMode('signup'); setAuthError(""); }}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${authMode === 'signup' ? 'bg-fuchsia-500 text-white shadow-md shadow-fuchsia-500/20' : 'text-slate-400 hover:text-slate-300'}`}
              >
                Create Account
              </button>
            </div>
            
            {/* Form */}
            <form onSubmit={handleAuthSubmit} className="w-full space-y-4 mt-6">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Username</label>
                <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 focus-within:border-fuchsia-500 transition-colors">
                  <User size={16} className="text-slate-500 shrink-0" />
                  <input 
                    value={authUsername}
                    onChange={(e) => setAuthUsername(e.target.value)}
                    placeholder="Enter username" 
                    className="bg-transparent border-none outline-none text-xs w-full text-slate-200 placeholder:text-slate-600 focus:outline-none"
                  />
                </div>
              </div>
              
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Password</label>
                <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 focus-within:border-fuchsia-500 transition-colors">
                  <Code size={16} className="text-slate-500 shrink-0" />
                  <input 
                    type="password"
                    value={authPassword}
                    onChange={(e) => setAuthPassword(e.target.value)}
                    placeholder="••••••••" 
                    className="bg-transparent border-none outline-none text-xs w-full text-slate-200 placeholder:text-slate-600 focus:outline-none"
                  />
                </div>
              </div>
              
              {authError && (
                <p className="text-[10px] text-rose-450 font-bold uppercase tracking-wider text-center">{authError}</p>
              )}
              
              <button 
                type="submit" 
                className="w-full py-3 bg-fuchsia-500 hover:bg-fuchsia-600 active:scale-95 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition-all shadow-md shadow-fuchsia-500/20 mt-2 cursor-pointer"
              >
                {authMode === 'login' ? 'Authenticate Session' : 'Register Profile'}
              </button>
            </form>
            
            <p className="text-[10px] text-slate-500 mt-6 text-center italic">
              🔒 Offline security active. Profiles are saved locally.
            </p>
          </motion.div>
        </div>
      ) : (
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
                <button 
                  onClick={handleLogout} 
                  title={`Logged in as ${currentUser}. Click to logout.`}
                  className="w-10 h-10 rounded-full bg-fuchsia-100 flex items-center justify-center border border-fuchsia-200 shadow-sm overflow-hidden hover:bg-fuchsia-200 transition-colors cursor-pointer text-xs font-black text-fuchsia-600 uppercase"
                  style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
                >
                  {currentUser?.substring(0, 2)}
                </button>
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
                          setView('flashcards');
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
                            <span className="font-bold text-gray-800 text-sm group-hover:text-amber-500 transition-colors">Step-by-Step Explainer</span>
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
                    {mode === 'coder' ? 'Code Debugger Chat' : mode === 'solver' ? 'Step-by-Step Explainer' : mode === 'flashcard' ? 'Flashcard Generator' : 'AI Chat'}
                  </h2>
                  <div className="flex items-center gap-1.5">
                    <span className={`w-1.5 h-1.5 rounded-full ${isCapturing ? 'bg-green-500 animate-pulse' : 'bg-yellow-500'}`} />
                    <p className="text-[10px] text-gray-400 font-medium tracking-wider uppercase">
                      {isCapturing ? 'Vision Active' : 'Standby'}
                    </p>
                  </div>
                </div>

                <div className="flex gap-2" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
                  <button onClick={handleNewChat} className="w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center bg-white shadow-sm hover:bg-gray-50 transition-colors">
                    <Plus size={18} className="text-gray-500" />
                  </button>
                  <button onClick={handleSaveChat} disabled={isSaving} className="w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center bg-white shadow-sm hover:bg-gray-50 transition-colors disabled:opacity-50">
                    {isSaving ? (
                      <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }} className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full" />
                    ) : (
                      <Save size={18} className="text-gray-500" />
                    )}
                  </button>
                  <button 
                    onClick={handleLogout} 
                    title={`Logged in as ${currentUser}. Click to logout.`}
                    className="w-10 h-10 rounded-full bg-fuchsia-100 flex items-center justify-center border border-fuchsia-200 shadow-sm overflow-hidden hover:bg-fuchsia-200 transition-colors cursor-pointer text-xs font-black text-fuchsia-600 uppercase"
                    style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
                  >
                    {currentUser?.substring(0, 2)}
                  </button>
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
                            remarkPlugins={[remarkMath]}
                            rehypePlugins={[rehypeKatex]}
                            components={{
                              p: ({node, ...props}) => <p className="mb-2 last:mb-0" {...props} />,
                              ul: ({node, ...props}) => <ul className="list-disc ml-5 mb-2 space-y-1" {...props} />,
                              ol: ({node, ...props}) => <ol className="list-decimal ml-5 mb-2 space-y-1" {...props} />,
                              li: ({node, ...props}) => <li className="pl-1" {...props} />,
                              strong: ({node, ...props}) => <strong className="font-bold" {...props} />,
                              code: CodeBlock as any,
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
                {isListening && (
                  <div className="bg-slate-955/90 backdrop-blur-md border border-slate-800/80 rounded-2xl p-4 flex flex-col gap-2 relative shadow-lg shadow-fuchsia-500/10 animate-in slide-in-from-bottom-2 duration-300">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-450 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                        </span>
                        <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Live Meeting Transcribing</span>
                      </div>
                      
                      {/* Pulse Equalizer */}
                      <div className="flex gap-0.5 items-end h-3">
                        <span className="w-0.5 bg-fuchsia-500 animate-bounce h-2" style={{ animationDelay: '0.1s' }} />
                        <span className="w-0.5 bg-fuchsia-500 animate-bounce h-3" style={{ animationDelay: '0.3s' }} />
                        <span className="w-0.5 bg-fuchsia-500 animate-bounce h-1.5" style={{ animationDelay: '0.5s' }} />
                        <span className="w-0.5 bg-fuchsia-500 animate-bounce h-2.5" style={{ animationDelay: '0.2s' }} />
                      </div>
                    </div>
                    <p className="text-xs text-slate-200 italic leading-relaxed line-clamp-2 max-h-12 overflow-y-auto scrollbar-hide font-medium">
                      {liveTranscript || "Listening... Speak or play meeting audio to auto-solve."}
                    </p>
                  </div>
                )}
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

                  {/* Microphone Listener Button */}
                  <button
                    type="button"
                    onClick={toggleListening}
                    className={`w-10 h-10 rounded-full flex items-center justify-center transition-all shrink-0 ${isListening ? 'bg-fuchsia-500 text-white' : 'bg-gray-150 text-gray-400 hover:bg-gray-200'}`}
                    title={isListening ? "Stop listening to live meeting audio" : "Start listening to live meeting audio"}
                  >
                    {isListening ? (
                      <span className="relative flex h-4 w-4 items-center justify-center">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                        <Mic size={16} className="relative text-white" />
                      </span>
                    ) : (
                      <MicOff size={16} />
                    )}
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
                                  remarkPlugins={[remarkMath]}
                                  rehypePlugins={[rehypeKatex]}
                                  components={{
                                    p: ({node, ...props}) => <p className="mb-2 last:mb-0 text-sm text-gray-700" {...props} />,
                                    ul: ({node, ...props}) => <ul className="list-disc ml-5 mb-2 space-y-1 text-sm text-gray-700" {...props} />,
                                    strong: ({node, ...props}) => <strong className="font-bold" {...props} />,
                                    code: CodeBlock as any,
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
        {/* FLASHCARDS VIEW (Past Chats listing & Interactive 3D Studier) */}
        {/* ========================================================= */}
        <AnimatePresence mode="wait">
          {view === 'flashcards' && (
            <motion.div
              key="flashcards"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="flex flex-col h-full absolute inset-0 z-0 bg-gray-50/50 animate-in fade-in duration-250"
            >
              {/* HEADER */}
              <div 
                className="h-20 flex items-center justify-between px-6 bg-transparent z-10 cursor-grab shrink-0 pt-4"
                style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
              >
                <button 
                  onClick={() => {
                    setView('home');
                    setFlashcardsDeck([]);
                    setIsCardFlipped(false);
                  }} 
                  className="w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center bg-white shadow-sm hover:bg-gray-50 transition-colors" 
                  style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
                >
                  <ChevronLeft size={18} className="text-gray-500 pr-0.5" />
                </button>
                <h2 className="text-lg font-bold text-gray-800 tracking-tight">Flashcard Generator</h2>
                <div className="w-10 h-10 flex items-center justify-center" />
              </div>

              {/* CONTENT */}
              <div 
                className="flex-1 overflow-y-auto px-6 pb-24 pt-2 scrollbar-hide z-0"
                style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
              >
                {/* 1. LOADING STATE */}
                {generatingFlashcards && (
                  <div className="flex flex-col items-center justify-center h-full min-h-[350px]">
                    <div className="relative w-16 h-16 mb-6">
                      <motion.div 
                        animate={{ rotate: 360 }} 
                        transition={{ repeat: Infinity, duration: 1.2, ease: "linear" }} 
                        className="w-16 h-16 border-4 border-fuchsia-100 border-t-fuchsia-500 rounded-full"
                      />
                      <motion.div 
                        animate={{ scale: [0.8, 1.1, 0.8] }}
                        transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
                        className="absolute inset-0 m-auto w-8 h-8 bg-fuchsia-500 rounded-full flex items-center justify-center text-white"
                      >
                        <Sparkles size={14} />
                      </motion.div>
                    </div>
                    <h3 className="font-bold text-gray-800 text-base mb-2">Synthesizing Flashcards...</h3>
                    <p className="text-xs text-gray-400 text-center max-w-xs leading-relaxed">
                      Epsilon is analyzing your conversation transcript, extracting key terms, definitions, and concepts to build a custom study deck.
                    </p>
                  </div>
                )}

                {/* 2. CHAT HISTORY LISTING */}
                {!generatingFlashcards && flashcardsDeck.length === 0 && (
                  <div className="space-y-4">
                    <div className="bg-white border border-gray-100 p-6 rounded-3xl shadow-sm">
                      <h3 className="font-bold text-gray-800 text-sm mb-1.5">Convert Chats into Study Material</h3>
                      <p className="text-xs text-gray-500 leading-relaxed">
                        Select any of your recent or saved study dialogues below. Epsilon will extract the core topics and generate a custom deck of interactive cards.
                      </p>
                    </div>

                    {/* Unified Chat List */}
                    {(() => {
                      // Get active chats with messages
                      const activeModes = ['general', 'solver', 'coder'];
                      const activeChatsList = activeModes
                        .filter(m => threads[m] && threads[m].length > 0)
                        .map(m => ({
                          id: `active-${m}`,
                          title: threadTitles[m] || threads[m].find(msg => msg.role === 'user')?.content.substring(0, 30) + '...' || "Active Chat",
                          category: m,
                          messages: threads[m],
                          isActive: true
                        }));

                      // Get past saved chats
                      const pastChatsList = pastChats.map(c => ({
                        id: c.id,
                        title: c.title,
                        category: c.category,
                        messages: c.messages,
                        isActive: false
                      }));

                      const combinedChats = [...activeChatsList, ...pastChatsList];

                      if (combinedChats.length === 0) {
                        return (
                          <div className="bg-white border border-gray-100 p-8 rounded-[2rem] shadow-sm flex flex-col items-center justify-center text-center mt-6">
                            <div className="w-16 h-16 bg-fuchsia-50 rounded-full flex items-center justify-center mb-4">
                              <MessageCircle size={28} className="text-fuchsia-400" />
                            </div>
                            <h3 className="font-bold text-gray-800 text-base mb-1.5">No Conversation History</h3>
                            <p className="text-xs text-gray-500 leading-relaxed max-w-xs mb-6">
                              You haven't had any conversations in other modes yet. Start a study session or ask Epsilon to explain some concepts first!
                            </p>
                            <div className="flex flex-col w-full gap-2">
                              <button 
                                onClick={() => { setMode('general'); setView('chat'); }}
                                className="w-full py-2.5 bg-fuchsia-50 hover:bg-fuchsia-100 text-fuchsia-600 text-xs font-bold rounded-xl transition-all"
                              >
                                Start General Chat
                              </button>
                              <button 
                                onClick={() => { setMode('solver'); setView('chat'); }}
                                className="w-full py-2.5 bg-amber-50 hover:bg-amber-100 text-amber-600 text-xs font-bold rounded-xl transition-all"
                              >
                                Open Step-by-Step Solver
                              </button>
                              <button 
                                onClick={() => { setMode('coder'); setView('chat'); }}
                                className="w-full py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 text-xs font-bold rounded-xl transition-all"
                              >
                                Launch Code Debugger
                              </button>
                            </div>
                          </div>
                        );
                      }

                      return (
                        <div className="space-y-3">
                          <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-1">Available Conversations ({combinedChats.length})</h4>
                          {combinedChats.map((chat) => {
                            const catLabel = chat.category === 'coder' ? 'Code Debugger' : chat.category === 'solver' ? 'Step-by-Step Solver' : 'General Chat';
                            const badgeColor = chat.category === 'coder' ? 'bg-emerald-50 text-emerald-600 border-emerald-100/50' : chat.category === 'solver' ? 'bg-amber-50 text-amber-600 border-amber-100/50' : 'bg-fuchsia-50 text-fuchsia-600 border-fuchsia-100/50';
                            
                            const triggerFlashcardGen = async () => {
                              setGeneratingFlashcards(true);
                              setSelectedChatTitle(chat.title);
                              try {
                                const res = await fetch("/api/flashcard", {
                                  method: "POST",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({ messages: chat.messages }),
                                });
                                const responseData = await res.json();
                                if (responseData.flashcards && responseData.flashcards.length > 0) {
                                  setFlashcardsDeck(responseData.flashcards);
                                  setCurrentCardIndex(0);
                                  setIsCardFlipped(false);
                                } else {
                                  alert("Could not extract any clear flashcards from this conversation. Try a chat with more definitions or study questions!");
                                }
                              } catch (e) {
                                console.error("Error generating flashcards:", e);
                                alert("Failed to connect to the Flashcard Generator API.");
                              } finally {
                                setGeneratingFlashcards(false);
                              }
                            };

                            return (
                              <div 
                                key={chat.id} 
                                onClick={triggerFlashcardGen}
                                className="bg-white border border-gray-100 p-4 rounded-2xl shadow-sm hover:shadow-md hover:border-fuchsia-200 transition-all flex items-center justify-between cursor-pointer group"
                              >
                                <div className="flex flex-col gap-1.5 max-w-[75%]">
                                  <div className="flex items-center gap-2">
                                    <span className={`text-[9px] font-extrabold uppercase tracking-wider px-2 py-0.5 border rounded-full ${badgeColor}`}>
                                      {catLabel}
                                    </span>
                                    {chat.isActive && (
                                      <span className="text-[9px] bg-green-50 text-green-600 border border-green-100 px-2 py-0.5 rounded-full font-bold animate-pulse">
                                        Active
                                      </span>
                                    )}
                                  </div>
                                  <span className="text-xs font-bold text-gray-800 line-clamp-1 group-hover:text-fuchsia-600 transition-colors">{chat.title}</span>
                                  <span className="text-[10px] text-gray-400">{chat.messages.length} conversational statements</span>
                                </div>
                                <button className="w-8 h-8 rounded-full bg-fuchsia-50 group-hover:bg-fuchsia-500 group-hover:text-white text-fuchsia-500 flex items-center justify-center transition-all shrink-0">
                                  <Sparkles size={14} className="group-hover:animate-pulse" />
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}
                  </div>
                )}

                {/* 3. INTERACTIVE 3D DECK STUDIER */}
                {!generatingFlashcards && flashcardsDeck.length > 0 && (
                  <div className="space-y-6 max-w-sm mx-auto">
                    {/* Studier Header Info */}
                    <div className="flex items-center justify-between">
                      <button 
                        onClick={() => { setFlashcardsDeck([]); setIsCardFlipped(false); }} 
                        className="text-xs font-bold text-gray-500 hover:text-fuchsia-500 transition-colors flex items-center gap-1"
                      >
                        <ChevronLeft size={16} /> Choose Another Chat
                      </button>
                      <span className="text-[10px] font-extrabold text-fuchsia-500 uppercase tracking-widest bg-fuchsia-50 border border-fuchsia-100 px-3 py-1 rounded-full">
                        Study Session
                      </span>
                    </div>

                    <div className="text-center">
                      <h3 className="font-bold text-gray-800 text-sm line-clamp-1">{selectedChatTitle}</h3>
                      <p className="text-[10px] text-gray-400 mt-0.5">Click the card below to flip and reveal the answer</p>
                    </div>

                    {/* Progress Track */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center text-[10px] font-extrabold text-gray-400">
                        <span>CARD PROGRESS</span>
                        <span>{currentCardIndex + 1} OF {flashcardsDeck.length}</span>
                      </div>
                      <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-fuchsia-500 to-indigo-500 rounded-full transition-all duration-300"
                          style={{ width: `${((currentCardIndex + 1) / flashcardsDeck.length) * 100}%` }}
                        />
                      </div>
                    </div>

                    {/* 3D Flip Card Container */}
                    <div 
                      onClick={() => setIsCardFlipped(!isCardFlipped)}
                      className="perspective-1000 w-full aspect-[5/3] cursor-pointer relative"
                    >
                      <div 
                        className={`w-full h-full rounded-[2rem] transform-style-3d transition-transform duration-500 shadow-[0_15px_40px_-5px_rgba(0,0,0,0.06)] relative border border-gray-100/50 ${isCardFlipped ? 'rotate-y-180' : ''}`}
                      >
                        {/* Front Side: Question */}
                        <div className="absolute inset-0 w-full h-full rounded-[2rem] bg-gradient-to-br from-white to-gray-50 flex flex-col justify-between p-6 backface-hidden">
                          <div className="flex items-center gap-1.5">
                            <span className="w-5 h-5 rounded-full bg-fuchsia-50 flex items-center justify-center">
                              <Bot size={10} className="text-fuchsia-500" />
                            </span>
                            <span className="text-[9px] font-extrabold text-gray-400 uppercase tracking-widest">Question card</span>
                          </div>
                          <div className="flex-1 flex items-center justify-center text-center px-4">
                            <p className="text-sm font-bold text-gray-800 leading-relaxed max-h-[90px] overflow-y-auto scrollbar-hide">
                              {flashcardsDeck[currentCardIndex]?.question}
                            </p>
                          </div>
                          <p className="text-[9px] text-gray-450 font-bold tracking-wider text-center uppercase animate-pulse">
                            Click Card To Reveal Answer
                          </p>
                        </div>

                        {/* Back Side: Answer */}
                        <div className="absolute inset-0 w-full h-full rounded-[2rem] bg-gradient-to-br from-fuchsia-500 to-indigo-600 flex flex-col justify-between p-6 backface-hidden rotate-y-180 text-white shadow-xl shadow-fuchsia-500/10">
                          <div className="flex items-center gap-1.5">
                            <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center">
                              <Sparkles size={10} className="text-white" />
                            </span>
                            <span className="text-[9px] font-extrabold text-fuchsia-100 uppercase tracking-widest">Answer key</span>
                          </div>
                          <div className="flex-1 flex items-center justify-center text-center px-4">
                            <p className="text-sm font-medium text-white/95 leading-relaxed max-h-[90px] overflow-y-auto scrollbar-hide">
                              {flashcardsDeck[currentCardIndex]?.answer}
                            </p>
                          </div>
                          <p className="text-[9px] text-fuchsia-200/80 font-bold tracking-wider text-center uppercase">
                            Click Card To Flip Back
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Navigation Controls */}
                    <div className="flex items-center justify-between gap-4">
                      <button 
                        onClick={(e) => { 
                          e.stopPropagation(); 
                          if (currentCardIndex > 0) {
                            setCurrentCardIndex(currentCardIndex - 1); 
                            setIsCardFlipped(false);
                          }
                        }}
                        disabled={currentCardIndex === 0}
                        className="flex-1 py-3 border border-gray-200 hover:bg-gray-50 active:scale-95 disabled:opacity-50 disabled:hover:bg-white text-gray-600 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all shadow-sm"
                      >
                        <ChevronLeft size={16} /> Prev Card
                      </button>
                      
                      <button 
                        onClick={(e) => { 
                          e.stopPropagation(); 
                          if (currentCardIndex < flashcardsDeck.length - 1) {
                            setCurrentCardIndex(currentCardIndex + 1); 
                            setIsCardFlipped(false);
                          }
                        }}
                        disabled={currentCardIndex === flashcardsDeck.length - 1}
                        className="flex-1 py-3 bg-fuchsia-500 hover:bg-fuchsia-600 active:scale-95 disabled:opacity-50 disabled:hover:bg-fuchsia-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all shadow-md shadow-fuchsia-500/20"
                      >
                        Next Card <ChevronLeft size={16} className="rotate-180" />
                      </button>
                    </div>

                    {/* Actions and Export Bar */}
                    <div className="border-t border-gray-100 pt-4 flex flex-col gap-2">
                      <div className="flex gap-2">
                        <button 
                          onClick={() => {
                            const markdownContent = flashcardsDeck.map((card, i) => `### Card ${i + 1}\n\n**Question**: ${card.question}\n\n**Answer**: ${card.answer}`).join('\n\n---\n\n');
                            setSavedItems(prev => [...prev, {
                              id: Date.now().toString(),
                              title: `${selectedChatTitle} Flashcards`,
                              category: 'Flashcards',
                              content: markdownContent
                            }]);
                            setSuccessFeedback("Saved to Bookmarks!");
                            setTimeout(() => setSuccessFeedback(""), 2000);
                          }}
                          className="flex-1 py-2.5 bg-gray-150 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5"
                        >
                          <Bookmark size={14} /> Bookmark Deck
                        </button>
                        <button 
                          onClick={() => {
                            const fileContent = flashcardsDeck.map(card => `${card.question.replace(/\t/g, ' ')}\t${card.answer.replace(/\t/g, ' ')}`).join('\n');
                            const blob = new Blob([fileContent], { type: 'text/tab-separated-values;charset=utf-8' });
                            const url = URL.createObjectURL(blob);
                            const link = document.createElement('a');
                            link.href = url;
                            link.setAttribute('download', `${selectedChatTitle.toLowerCase().replace(/[^a-z0-9]/g, '_')}_anki_deck.txt`);
                            document.body.appendChild(link);
                            link.click();
                            document.body.removeChild(link);
                            
                            setSuccessFeedback("Downloaded Anki Deck!");
                            setTimeout(() => setSuccessFeedback(""), 2000);
                          }}
                          className="flex-1 py-2.5 bg-fuchsia-50 hover:bg-fuchsia-100 text-fuchsia-600 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5"
                        >
                          <Download size={14} /> Export to Anki
                        </button>
                      </div>

                      {successFeedback && (
                        <motion.p 
                          initial={{ opacity: 0, y: -5 }} 
                          animate={{ opacity: 1, y: 0 }} 
                          className="text-[10px] text-green-500 font-extrabold text-center uppercase tracking-wider"
                        >
                          {successFeedback}
                        </motion.p>
                      )}
                    </div>
                  </div>
                )}
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
                  {(() => {
                    const modes = ['general', 'flashcard', 'solver', 'coder'];
                    const hasAnyChats = modes.some(m => (threads[m] && threads[m].length > 0) || pastChats.some(c => c.category === m));
                    
                    if (!hasAnyChats) {
                      return <p className="text-xs text-gray-400 text-center mt-4">No chat history yet.</p>;
                    }

                    return modes.map(m => {
                      const activeMsgs = threads[m] || [];
                      const pastForMode = pastChats.filter(c => c.category === m);
                      if (activeMsgs.length === 0 && pastForMode.length === 0) return null;
                      
                      const titleCategory = m === 'coder' ? 'Code Debugger' : m === 'solver' ? 'Step-by-Step Solver' : m === 'flashcard' ? 'Flashcards' : 'General Chat';
                      const activeTitle = threadTitles[m] || (activeMsgs.length > 0 ? activeMsgs.find(x => x.role === 'user')?.content.substring(0, 30) + '...' : '');

                      return (
                        <div key={m} className="space-y-1 mb-4">
                          <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-2">{titleCategory}</h3>
                          
                          {activeMsgs.length > 0 && (
                            <div 
                              onClick={() => { setMode(m as any); setView('chat'); setIsSidebarOpen(false); }}
                              className="text-[13px] font-bold text-fuchsia-600 truncate p-3 bg-fuchsia-50/50 hover:bg-fuchsia-100 rounded-xl cursor-pointer transition-colors border border-fuchsia-200"
                            >
                              {activeTitle} (Active)
                            </div>
                          )}
                          
                          {pastForMode.map(pastChat => (
                            <div 
                              key={pastChat.id}
                              onClick={() => loadPastChat(pastChat.id)}
                              className="text-[13px] font-medium text-gray-600 truncate p-3 bg-gray-50 hover:bg-fuchsia-50 hover:text-fuchsia-600 rounded-xl cursor-pointer transition-colors border border-transparent hover:border-fuchsia-100"
                            >
                              {pastChat.title}
                            </div>
                          ))}
                        </div>
                      );
                    });
                  })()}
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

      </motion.div>
      )}
    </div>
  );
}
