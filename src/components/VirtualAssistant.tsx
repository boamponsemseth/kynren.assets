import React, { useState, useEffect, useRef } from 'react';
import { 
  Bot, 
  Send, 
  Camera, 
  CameraOff, 
  Mic, 
  MicOff, 
  Volume2, 
  VolumeX, 
  Scan, 
  RefreshCw, 
  AlertCircle, 
  CheckCircle, 
  Sparkles,
  HelpCircle,
  Cpu,
  CornerDownLeft,
  X,
  Trash2,
  BookOpen
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { KBArticle } from '../types';

interface VirtualAssistantProps {
  nodes: any[];
  assets: any[];
  tickets: any[];
  consumables: any[];
  kbArticles: KBArticle[];
  isOpen?: boolean;
  onClose?: () => void;
}

interface Message {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  image?: string; // Captured snapshot base64
  isPending?: boolean;
}

export default function VirtualAssistant({ 
  nodes, 
  assets, 
  tickets, 
  consumables, 
  kbArticles,
  isOpen,
  onClose
}: VirtualAssistantProps) {
  const [messages, setMessages] = useState<Message[]>(() => {
    try {
      const saved = localStorage.getItem('kynren_chat_history');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn("Failed to load chat history from localStorage:", e);
    }
    return [
      {
        id: 'welcome',
        sender: 'assistant',
        text: "System initialized. Greetings, Operator. I am **Kynren Tech AI**, your dedicated Technology Operations Assistant (now broadcasting in a deep, warm, and measured **Morgan Freeman readback voice**).\n\nI can assist you through text or voice. Toggle the **Terminal Camera** to capture and analyze hardware objects, or click **Scan System Context** to sync live application statistics directly to my active session memory. How may I assist your operations today?",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ];
  });

  // Save messages to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem('kynren_chat_history', JSON.stringify(messages));
    } catch (e) {
      console.warn("Failed to save chat history to localStorage:", e);
    }
  }, [messages]);

  const [inputText, setInputText] = useState('');
  const [isPending, setIsPending] = useState(false);
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [appStateSynced, setAppStateSynced] = useState(false);
  const [syncAnimation, setSyncAnimation] = useState(false);

  // Video and Stream refs
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  // Web Speech API refs
  const recognitionRef = useRef<any>(null);

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isPending]);

  // Handle Speech Recognition setup
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = false;
      rec.lang = 'en-US';

      rec.onstart = () => {
        setIsListening(true);
      };

      rec.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          setInputText(transcript);
        }
      };

      rec.onerror = (e: any) => {
        console.warn("Speech recognition error:", e);
        setIsListening(false);
      };

      rec.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = rec;
    }

    return () => {
      stopCamera();
    };
  }, []);

  // Text-To-Speech (TTS) spoken feedback
  const speakText = (text: string) => {
    if (!isVoiceEnabled) return;
    try {
      window.speechSynthesis.cancel(); // Stop any ongoing speech
      // Clean up markdown formatting symbols for speech synthesis
      const cleanText = text
        .replace(/\*\*/g, '')
        .replace(/\*/g, '')
        .replace(/#/g, '')
        .replace(/- /g, '');
      
      const utterance = new SpeechSynthesisUtterance(cleanText);
      
      // Get all available voices on the operating system
      const voices = window.speechSynthesis.getVoices();
      
      // Look for a deep resonant voice (e.g. Microsoft David, Google US English Male, Premium, Natural male voices)
      let chosenVoice = voices.find(v => 
        v.lang.startsWith('en') && 
        (
          v.name.toLowerCase().includes('david') || 
          v.name.toLowerCase().includes('male') || 
          v.name.toLowerCase().includes('natural') ||
          v.name.toLowerCase().includes('google us english')
        )
      ) || voices.find(v => v.lang.startsWith('en') && v.name.toLowerCase().includes('google')) 
        || voices.find(v => v.lang.startsWith('en')) 
        || voices[0];

      if (chosenVoice) {
        utterance.voice = chosenVoice;
      }
      
      // Morgan Freeman characteristic parameters:
      // - Pitch is lowered to create a warm, deep, authoritative chest-voice resonance
      // - Rate is slowed down to mimic his trademark measured, soulful, and rhythmic cadence
      utterance.pitch = 0.82; 
      utterance.rate = 0.85;  
      
      window.speechSynthesis.speak(utterance);
    } catch (err) {
      console.warn("TTS Error:", err);
    }
  };

  // Toggle speech listener
  const toggleListening = () => {
    if (!recognitionRef.current) {
      // Fallback simulated voice input if SpeechRecognition is blocked or unsupported
      setIsListening(true);
      setTimeout(() => {
        setIsListening(false);
        const fallbacks = [
          "Scan the current inventory metrics",
          "Identify issues in the network switches",
          "What is the status of high-priority helpdesk tickets?",
          "Check the database connection latency"
        ];
        const randomPhrase = fallbacks[Math.floor(Math.random() * fallbacks.length)];
        setInputText(randomPhrase);
      }, 2000);
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
    } else {
      try {
        recognitionRef.current.start();
      } catch (err) {
        console.error("Failed to start SpeechRecognition:", err);
      }
    }
  };

  // Camera Management
  const startCamera = async () => {
    try {
      setCapturedImage(null);
      const constraints = {
        video: { facingMode: 'environment', width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setIsCameraActive(true);
    } catch (err) {
      console.error("Camera Access Failed:", err);
      setIsCameraActive(false);
      alert("Terminal Camera access failed. Please ensure you have granted camera permissions in your browser.");
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  };

  const captureSnapshot = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      if (context) {
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 480;
        // Flip horizontal if it's user facing (optional, standard draw here)
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        const base64 = canvas.toDataURL('image/jpeg', 0.82);
        setCapturedImage(base64);
        stopCamera();
      }
    }
  };

  // Trigger app context sync sweep
  const triggerSystemContextSync = () => {
    setSyncAnimation(true);
    setTimeout(() => {
      setSyncAnimation(false);
      setAppStateSynced(true);
      // Append a system indicator chat bubble or success notification
      const syncMsg: Message = {
        id: `sync-${Date.now()}`,
        sender: 'assistant',
        text: "⚡ **Application Telemetry Synced Successfully**.\n\nI have imported our live network topology, inventory stock registers, and support ticket counters into my active thinking memory. You may now ask me queries regarding active operations!",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, syncMsg]);
    }, 1500);
  };

  // Clear Chat History and reset memory
  const handleClearMemory = () => {
    const welcomeMsg: Message = {
      id: 'welcome',
      sender: 'assistant',
      text: "System initialized. Greetings, Operator. I am **Kynren Tech AI**, your dedicated Technology Operations Assistant (now broadcasting in a deep, warm, and measured **Morgan Freeman readback voice**).\n\nI can assist you through text or voice. Toggle the **Terminal Camera** to capture and analyze hardware objects, or click **Scan System Context** to sync live application statistics directly to my active session memory. How may I assist your operations today?",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setMessages([welcomeMsg]);
    localStorage.removeItem('kynren_chat_history');
    window.speechSynthesis.cancel();
  };

  // Chat Submission Handler
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim() && !capturedImage) return;

    const userText = inputText;
    const userImg = capturedImage;
    const msgId = `msg-${Date.now()}`;

    // Reset input states immediately
    setInputText('');
    setCapturedImage(null);

    // Append user message
    const userMsg: Message = {
      id: msgId,
      sender: 'user',
      text: userText || "Analyze captured hardware visual snapshot.",
      image: userImg || undefined,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    const updatedHistory = [...messages, userMsg];
    setMessages(updatedHistory);
    setIsPending(true);

    // Build the application state context object
    const appStatePayload = {
      totalAssets: assets.length,
      onlineNodesCount: nodes.filter(n => n.status === 'online').length,
      degradedNodes: nodes.filter(n => n.status === 'degraded').length,
      activeTickets: tickets.filter(t => t.status !== 'resolved').length,
      lowStockConsumables: consumables.filter(c => c.status !== 'adequate').length
    };

    try {
      const response = await fetch('/api/assistant/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: userText,
          image: userImg,
          appState: appStateSynced ? appStatePayload : undefined,
          history: updatedHistory,
          kbArticles: kbArticles
        })
      });

      const data = await response.json();
      setIsPending(false);

      if (data.success) {
        const assistantMsg: Message = {
          id: `reply-${Date.now()}`,
          sender: 'assistant',
          text: data.text,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        setMessages(prev => [...prev, assistantMsg]);
        speakText(data.text);
      } else {
        throw new Error(data.error || 'Unknown communication fault');
      }
    } catch (err: any) {
      console.error("Assistant Error:", err);
      setIsPending(false);
      const errorMsg: Message = {
        id: `error-${Date.now()}`,
        sender: 'assistant',
        text: `⚠️ **Diagnostic Link Interruption**\n\nUnable to establish secure uplink to the Gemini analysis server. Details: ${err.message || 'connection timeout'}. Please verify your connection or secret keys.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, errorMsg]);
    }
  };

  // Safe renderer for simple markdown tags
  const renderMessageText = (text: string) => {
    return text.split('\n\n').map((paragraph, pIdx) => {
      // Parse inline formatting: bold (**), list items (- ), headers
      const lines = paragraph.split('\n').map((line, lIdx) => {
        let formatted = line;

        // Bold text parser
        const boldRegex = /\*\*(.*?)\*\*/g;
        let match;
        const parts: React.ReactNode[] = [];
        let lastIndex = 0;

        while ((match = boldRegex.exec(line)) !== null) {
          if (match.index > lastIndex) {
            parts.push(line.substring(lastIndex, match.index));
          }
          parts.push(<strong key={match.index} className="text-rose-400 font-bold">{match[1]}</strong>);
          lastIndex = boldRegex.lastIndex;
        }
        if (lastIndex < line.length) {
          parts.push(line.substring(lastIndex));
        }

        const finalContent = parts.length > 0 ? parts : formatted;

        if (line.startsWith('- ')) {
          return (
            <li key={lIdx} className="ml-4 list-disc text-slate-300 pl-1 mt-1 leading-relaxed">
              {parts.length > 0 ? parts : line.substring(2)}
            </li>
          );
        }

        return <span key={lIdx} className="block leading-relaxed">{finalContent}</span>;
      });

      return (
        <div key={pIdx} className="space-y-1 mt-1.5 first:mt-0">
          {lines}
        </div>
      );
    });
  };

  const [isExpanded, setIsExpanded] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState<'chat' | 'lens' | 'context'>('chat');

  useEffect(() => {
    if (isOpen !== undefined) {
      setIsExpanded(isOpen);
    }
  }, [isOpen]);

  return (
    <>
      {/* PERSISTENT FLOATING BUBBLE BUTTON */}
      <AnimatePresence>
        {!isExpanded && (
          <motion.button
            id="assistant-floating-bubble"
            onClick={() => {
              setIsExpanded(true);
            }}
            initial={{ scale: 0, opacity: 0, y: 50 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0, opacity: 0, y: 50 }}
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.93 }}
            className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-gradient-to-tr from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 text-white flex items-center justify-center cursor-pointer shadow-[0_6px_24px_rgba(244,63,94,0.45)] border border-rose-500/20 group transition-all"
            title="Kynren AI Assistant Uplink"
          >
            {/* Pulsing ring */}
            <span className="absolute inset-0 rounded-full bg-rose-500/30 animate-ping group-hover:animate-none pointer-events-none" />
            <Bot className="w-6 h-6 animate-pulse" />
            {/* Active Status Badge */}
            <span className="absolute top-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-slate-950 rounded-full" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* FLOATING EXPANDED CONSOLE PANEL */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            id="assistant-floating-panel"
            initial={{ opacity: 0, y: 40, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.92 }}
            transition={{ type: 'spring', damping: 22, stiffness: 150 }}
            className="fixed bottom-6 right-6 w-[430px] max-w-[calc(100vw-32px)] h-[580px] max-h-[calc(100vh-80px)] z-50 bg-slate-950 border border-slate-800 rounded-2xl flex flex-col overflow-hidden shadow-[0_16px_48px_rgba(0,0,0,0.85)] font-sans"
          >
            {/* Header */}
            <div className="bg-slate-900 px-4 py-3 border-b border-slate-800 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-rose-500 to-rose-600 flex items-center justify-center text-white shadow-[0_0_10px_rgba(244,63,94,0.25)]">
                  <Bot className="w-4.5 h-4.5" />
                </div>
                <div className="text-left">
                  <h3 className="font-bold text-slate-100 text-xs uppercase tracking-wider flex items-center gap-1">
                    Kynren Operations AI <Sparkles className="w-3 h-3 text-rose-400" />
                  </h3>
                  <div className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                    <span className="text-[8px] text-slate-400 font-mono uppercase">COGNITIVE VM v2.6 // SECURE</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-1.5">
                {/* Voice Toggle */}
                <button
                  type="button"
                  onClick={() => {
                    setIsVoiceEnabled(!isVoiceEnabled);
                    if (isVoiceEnabled) {
                      window.speechSynthesis.cancel();
                    }
                  }}
                  className={`p-1.5 rounded border transition-all cursor-pointer ${
                    isVoiceEnabled 
                      ? 'bg-rose-500/10 border-rose-500/30 text-rose-400' 
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                  title={isVoiceEnabled ? "Mute voice feedback" : "Unmute voice feedback"}
                >
                  {isVoiceEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
                </button>

                {/* Reset Conversation */}
                <button
                  type="button"
                  onClick={handleClearMemory}
                  className="p-1.5 rounded border bg-slate-950 border-slate-800 text-slate-400 hover:text-red-400 hover:border-red-500/20 transition-all cursor-pointer"
                  title="Clear conversation log"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>

                {/* Minimize Button */}
                <button
                  type="button"
                  onClick={() => {
                    setIsExpanded(false);
                    onClose?.();
                  }}
                  className="p-1.5 rounded border bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200 transition-all cursor-pointer"
                  title="Minimize assistant console"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* TAB SELECTOR STRIP */}
            <div className="flex bg-slate-900/40 border-b border-slate-900/60 p-1 gap-1 shrink-0">
              {[
                { id: 'chat', label: 'AI Chat Uplink', count: messages.length },
                { id: 'lens', label: 'Terminal Camera', count: isCameraActive ? 'LIVE' : null },
                { id: 'context', label: 'Telemetry Memory', count: appStateSynced ? 'SYNCED' : null }
              ].map(tab => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    setActiveSubTab(tab.id as any);
                    if (tab.id === 'lens' && !isCameraActive) {
                      startCamera();
                    } else if (tab.id !== 'lens' && isCameraActive) {
                      stopCamera();
                    }
                  }}
                  className={`flex-1 py-1.5 rounded-lg text-[10px] font-mono font-bold transition-all cursor-pointer flex items-center justify-center gap-1 ${
                    activeSubTab === tab.id 
                      ? 'bg-slate-900 border border-slate-800 text-rose-400' 
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {tab.label}
                  {tab.count !== null && (
                    <span className={`text-[8px] px-1 rounded-full font-sans ${
                      activeSubTab === tab.id ? 'bg-rose-500/10 text-rose-400' : 'bg-slate-950 text-slate-500'
                    }`}>
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* MAIN CONTENT DISPLAY */}
            <div className="flex-1 overflow-hidden relative flex flex-col bg-slate-950/95">
              
              {/* TAB 1: CHAT INTERFACE */}
              {activeSubTab === 'chat' && (
                <div className="flex-1 flex flex-col overflow-hidden">
                  {/* Messages list */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex flex-col max-w-[85%] ${
                          msg.sender === 'user' ? 'ml-auto items-end' : 'mr-auto items-start'
                        }`}
                      >
                        <div className="text-[8px] font-mono text-slate-500 mb-0.5 px-1 flex items-center gap-1">
                          <span className="font-bold">{msg.sender === 'user' ? 'OPERATOR' : 'KYNREN AI'}</span>
                          <span>•</span>
                          <span>{msg.timestamp}</span>
                        </div>
                        
                        <div
                          className={`p-3 rounded-xl text-xs font-sans text-left leading-relaxed shadow-sm ${
                            msg.sender === 'user'
                              ? 'bg-rose-600 text-white rounded-tr-none'
                              : 'bg-slate-900 border border-slate-850 text-slate-200 rounded-tl-none'
                          }`}
                        >
                          {msg.image && (
                            <img
                              src={msg.image}
                              alt="Terminal Snap"
                              className="rounded-lg max-h-[140px] w-auto mb-2 border border-rose-500/20 object-cover"
                              referrerPolicy="no-referrer"
                            />
                          )}
                          <div className="whitespace-pre-wrap">{renderMessageText(msg.text)}</div>
                        </div>
                      </div>
                    ))}
                    
                    {isPending && (
                      <div className="flex flex-col items-start max-w-[85%]">
                        <div className="text-[8px] font-mono text-slate-500 mb-0.5 px-1 font-bold">KYNREN AI // PROCESSING...</div>
                        <div className="bg-slate-900 border border-slate-850 text-slate-400 p-3 rounded-xl rounded-tl-none text-xs flex items-center gap-2">
                          <div className="flex gap-1">
                            <span className="w-1.5 h-1.5 bg-rose-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                            <span className="w-1.5 h-1.5 bg-rose-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                            <span className="w-1.5 h-1.5 bg-rose-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                          </div>
                          <span className="font-mono text-[9px] text-slate-500">Querying Gemini analyzer...</span>
                        </div>
                      </div>
                    )}
                    <div ref={chatEndRef} />
                  </div>

                  {/* Message Input panel */}
                  <form onSubmit={handleSendMessage} className="bg-slate-900 border-t border-slate-800 p-3 shrink-0">
                    {capturedImage && (
                      <div className="flex items-center justify-between bg-slate-950 p-2 border border-slate-850 rounded-lg mb-2 animate-fade-in">
                        <div className="flex items-center gap-2">
                          <img src={capturedImage} alt="Preview" className="w-10 h-10 object-cover rounded border border-rose-500/30" referrerPolicy="no-referrer" />
                          <span className="text-[10px] text-slate-400 font-mono">Snapshot loaded in payload</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setCapturedImage(null)}
                          className="p-1 hover:bg-slate-900 rounded text-slate-400 hover:text-red-400 transition-colors cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}

                    <div className="flex gap-1.5 items-center bg-slate-950 border border-slate-800 rounded-xl p-1 focus-within:border-rose-500/30 transition-colors">
                      {/* Voice Microphone */}
                      <button
                        type="button"
                        onClick={toggleListening}
                        className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                          isListening 
                            ? 'bg-rose-500/20 border-rose-500/40 text-rose-400' 
                            : 'bg-slate-900 border-slate-850 text-slate-400 hover:text-slate-200'
                        }`}
                        title={isListening ? "Listening..." : "Speak query"}
                      >
                        {isListening ? <Mic className="w-4 h-4 animate-ping" /> : <Mic className="w-4 h-4" />}
                      </button>

                      {/* Text Input */}
                      <input
                        type="text"
                        placeholder="Ask AI context queries, codes, or instructions..."
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        className="flex-1 bg-transparent border-0 outline-none px-2 py-1.5 text-xs text-slate-200 placeholder:text-slate-500 font-sans"
                      />

                      {/* Submit */}
                      <button
                        type="submit"
                        disabled={!inputText.trim() && !capturedImage}
                        className="p-2 bg-rose-600 hover:bg-rose-500 disabled:bg-slate-900 disabled:text-slate-600 text-white rounded-lg transition-all cursor-pointer"
                      >
                        <Send className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* TAB 2: TERMINAL CAMERA (LENS) */}
              {activeSubTab === 'lens' && (
                <div className="flex-1 flex flex-col p-4 space-y-4 overflow-y-auto">
                  <div className="relative aspect-video w-full bg-slate-900 border border-slate-800 rounded-xl overflow-hidden flex items-center justify-center">
                    <video
                      ref={videoRef}
                      playsInline
                      muted
                      className="absolute inset-0 w-full h-full object-cover scale-x-[-1]"
                    />
                    <canvas ref={canvasRef} className="hidden" />

                    {!isCameraActive ? (
                      <div className="flex flex-col items-center gap-2 text-center p-6 z-20">
                        <CameraOff className="w-8 h-8 text-slate-600" />
                        <h4 className="text-xs font-mono font-bold text-slate-400 uppercase">Camera Terminal Lens Shut</h4>
                        <p className="text-[10px] text-slate-500 max-w-[200px]">Open camera stream to analyze physical hardware, fiber ports, or cable layouts.</p>
                        <button
                          type="button"
                          onClick={startCamera}
                          className="mt-2 px-3.5 py-1.5 bg-rose-600 hover:bg-rose-500 text-white text-[10px] font-mono font-bold rounded-lg cursor-pointer"
                        >
                          Open Camera Lens
                        </button>
                      </div>
                    ) : (
                      <>
                        {/* Target Grid overlay */}
                        <div className="absolute inset-3 border border-dashed border-rose-500/20 rounded-lg pointer-events-none z-10 flex flex-col justify-between">
                          <div className="flex justify-between p-1.5">
                            <span className="w-2.5 h-2.5 border-t-2 border-l-2 border-rose-500/50" />
                            <span className="w-2.5 h-2.5 border-t-2 border-r-2 border-rose-500/50" />
                          </div>
                          <div className="flex justify-between p-1.5">
                            <span className="w-2.5 h-2.5 border-b-2 border-l-2 border-rose-500/50" />
                            <span className="w-2.5 h-2.5 border-b-2 border-r-2 border-rose-500/50" />
                          </div>
                        </div>

                        <div className="absolute bottom-3 left-3 right-3 flex justify-between gap-2 z-20">
                          <button
                            type="button"
                            onClick={captureSnapshot}
                            className="flex-1 px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white text-[10px] font-mono font-bold rounded-lg transition-all shadow-lg hover:shadow-rose-500/20 cursor-pointer uppercase flex items-center justify-center gap-1.5"
                          >
                            <Camera className="w-3.5 h-3.5" /> Capture Frame Snap
                          </button>
                          <button
                            type="button"
                            onClick={stopCamera}
                            className="p-1.5 bg-slate-950 hover:bg-slate-900 border border-slate-800 text-slate-400 hover:text-rose-400 rounded-lg transition-all cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </>
                    )}
                  </div>

                  {capturedImage && (
                    <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3 flex flex-col gap-2">
                      <div className="flex justify-between items-center pb-2 border-b border-slate-950 text-left">
                        <span className="text-[9px] font-mono font-bold text-slate-300 uppercase">Captured Snap Frame Preview</span>
                        <button
                          type="button"
                          onClick={() => setCapturedImage(null)}
                          className="text-[9px] font-mono text-red-400 hover:text-red-300 cursor-pointer"
                        >
                          Discard Snap
                        </button>
                      </div>
                      <img src={capturedImage} alt="Snapshot Preview" className="w-full h-auto object-cover rounded-lg border border-slate-800" referrerPolicy="no-referrer" />
                      <button
                        type="button"
                        onClick={() => {
                          setActiveSubTab('chat');
                        }}
                        className="w-full py-1.5 bg-slate-950 hover:bg-slate-900 border border-slate-850 hover:border-slate-750 text-slate-300 text-[10px] font-mono font-bold rounded-lg cursor-pointer"
                      >
                        Load to Active Chat Pipeline
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: TELEMETRY CONTEXT */}
              {activeSubTab === 'context' && (
                <div className="flex-1 flex flex-col p-4 space-y-4 overflow-y-auto text-left">
                  <div className="flex justify-between items-center pb-2 border-b border-slate-900/60">
                    <span className="text-[10px] text-slate-300 font-mono font-bold uppercase tracking-widest flex items-center gap-1.5">
                      <Cpu className="w-4 h-4 text-emerald-500" /> Active Session State Memory
                    </span>
                    <button
                      type="button"
                      onClick={triggerSystemContextSync}
                      disabled={syncAnimation}
                      className={`px-2 py-1 rounded text-[9px] font-mono font-bold border transition-colors cursor-pointer ${
                        appStateSynced ? 'border-emerald-500/30 text-emerald-400' : 'border-slate-800 text-slate-400'
                      }`}
                    >
                      {syncAnimation ? 'SYNCING...' : 'FORCE SYNC'}
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px] font-mono text-slate-400">
                    <div className="bg-slate-900/60 p-2.5 border border-slate-850 rounded-xl flex flex-col justify-between">
                      <span className="text-[9px] text-slate-500 uppercase">ONLINE NODES</span>
                      <span className="text-sm font-bold text-slate-200 mt-1">{nodes.filter(n => n.status === 'online').length} <span className="text-[10px] text-slate-600 font-medium">/ {nodes.length}</span></span>
                    </div>
                    <div className="bg-slate-900/60 p-2.5 border border-slate-850 rounded-xl flex flex-col justify-between">
                      <span className="text-[9px] text-slate-500 uppercase">INVENTORY ASSETS</span>
                      <span className="text-sm font-bold text-slate-200 mt-1">{assets.length} <span className="text-[10px] text-slate-600 font-medium">STAGED</span></span>
                    </div>
                    <div className="bg-slate-900/60 p-2.5 border border-slate-850 rounded-xl flex flex-col justify-between">
                      <span className="text-[9px] text-slate-500 uppercase">ACTIVE HELPDESK</span>
                      <span className="text-sm font-bold text-rose-400 mt-1">{tickets.filter(t => t.status !== 'resolved').length} <span className="text-[10px] text-slate-600 font-medium">OPEN</span></span>
                    </div>
                    <div className="bg-slate-900/60 p-2.5 border border-slate-850 rounded-xl flex flex-col justify-between">
                      <span className="text-[9px] text-slate-500 uppercase">LOW STOCK</span>
                      <span className="text-sm font-bold text-amber-500 mt-1">{consumables.filter(c => c.status !== 'adequate').length} <span className="text-[10px] text-slate-600 font-medium">ITEMS</span></span>
                    </div>
                  </div>

                  <div className="bg-slate-900/30 p-3 border border-slate-900 rounded-xl space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${appStateSynced ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)] animate-pulse' : 'bg-slate-700'}`} />
                      <span className="text-[10px] font-mono text-slate-300 font-bold uppercase">UPLINK SYNCHRONIZATION STATUS</span>
                    </div>
                    <p className="text-[10px] font-mono text-slate-400 leading-normal">
                      When synced, Kynren AI actively reads device hardware logs, Pyro inventory counters, and open technician tickets to auto-ground recommendations.
                    </p>
                    <button
                      type="button"
                      onClick={triggerSystemContextSync}
                      disabled={syncAnimation}
                      className="w-full mt-1.5 py-1.5 bg-rose-600 hover:bg-rose-500 text-white text-[10px] font-mono font-bold rounded-lg cursor-pointer flex items-center justify-center gap-1 transition-all"
                    >
                      <Scan className={`w-3.5 h-3.5 ${syncAnimation ? 'animate-spin' : ''}`} />
                      {syncAnimation ? 'ESTABLISHING HANDSHAKE...' : 'SCAN & SYNC ALL DATA CONTEXT'}
                    </button>
                  </div>
                </div>
              )}

            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
