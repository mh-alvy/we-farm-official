import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, Send, X, Bot, User, RefreshCw, ChevronDown, Leaf, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { useLanguage } from '../lib/LanguageContext';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: Date;
}

const QUICK_SUGGESTIONS_EN = [
  "🌱 What is the Soil to Soul philosophy?",
  "📈 What investment projects are currently available?",
  "🛒 What farm products are available and their prices?",
  "📍 Where is WeFarm located in Bangladesh?"
];

const QUICK_SUGGESTIONS_BN = [
  "🌱 Soil to Soul ফিলোসফি কী?",
  "📈 আপনাদের কী কী ইনভেস্টমেন্ট প্রোজেক্ট আছে?",
  "🛒 কোন কোন খাদ্যপণ্য পাওয়া যায় এবং তাদের দাম কত?",
  "📍 আপনাদের খামারটি বাংলাদেশে কোথায় অবস্থিত?"
];

export default function SoilToSoulChatbot() {
  const { language } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [liveProjects, setLiveProjects] = useState<any[]>([]);
  const [liveProducts, setLiveProducts] = useState<any[]>([]);

  const defaultWelcomeEn = "Hello! Welcome to WeFarm. I am WeFarm AI, your intelligent farming assistant. How can I help you explore our regenerative farm, natural products, or crowd-farming investment projects today?";
  const defaultWelcomeBn = "আসসালামু আলাইকুম! উইফার্মে আপনাকে স্বাগতম। আমি WeFarm AI, আপনার স্মার্ট কৃষি সহকারী। আমাদের প্রাকৃতিক খামার, অর্গানিক খাদ্যপণ্য বা কৃষি বিনিয়োগ প্রকল্প সম্পর্কে কীভাবে সাহায্য করতে পারি?";

  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      text: language === 'bn' ? defaultWelcomeBn : defaultWelcomeEn,
      timestamp: new Date()
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const chatEndRef = useRef<HTMLDivElement>(null);

  // Real-time synchronization of Projects and Products directly from Firestore
  useEffect(() => {
    const unsubProjects = onSnapshot(collection(db, 'projects'), (snap) => {
      setLiveProjects(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => console.warn('Chatbot projects sync:', err));

    const unsubProducts = onSnapshot(collection(db, 'products'), (snap) => {
      setLiveProducts(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => console.warn('Chatbot products sync:', err));

    return () => {
      unsubProjects();
      unsubProducts();
    };
  }, []);

  useEffect(() => {
    if (isOpen) {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  const handleSend = async (textToSend?: string) => {
    const text = (textToSend || inputValue).trim();
    if (!text || isLoading) return;

    setErrorMsg(null);
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      text,
      timestamp: new Date()
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    if (!textToSend) setInputValue('');
    setIsLoading(true);

    try {
      const apiHistory = newMessages.map(m => ({
        role: m.role,
        text: m.text
      }));

      // Pack live dynamic snapshot of all projects and products
      const context = {
        projects: liveProjects.map(p => ({
          title: p.title || '',
          titleBn: p.titleBn || '',
          description: p.description || '',
          descriptionBn: p.descriptionBn || '',
          minInvestment: p.minInvestment || 0,
          roiRate: p.roiRate || 0,
          profitType: p.profitType || 'monthly',
          targetAmount: p.targetAmount || 0,
          currentAmount: p.currentAmount || 0,
          status: p.status || 'Active',
          batches: p.batches || []
        })),
        products: liveProducts.map(p => ({
          name: p.name || '',
          nameBn: p.nameBn || '',
          price: p.price || 0,
          unit: p.unit || 'Kg',
          stock: p.stock !== undefined ? p.stock : 10,
          description: p.description || '',
          descriptionBn: p.descriptionBn || ''
        }))
      };

      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          messages: apiHistory,
          context
        })
      });

      const data = await res.json();
      if (data.success && data.reply) {
        setMessages(prev => [
          ...prev,
          {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            text: data.reply,
            timestamp: new Date()
          }
        ]);
      } else {
        setErrorMsg(data.error || (language === 'bn' ? "দুঃখিত, এই মুহূর্তে উত্তর তৈরি করা সম্ভব হয়নি। আবার চেষ্টা করুন।" : "Sorry, I couldn't process your request. Please try again."));
      }
    } catch (err) {
      console.error("Chatbot request failed:", err);
      setErrorMsg(language === 'bn' ? "নেটওয়ার্ক সমস্যা। সংযোগ পরীক্ষা করে পুনরায় চেষ্টা করুন।" : "Network error. Please check your connection and try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSend();
    }
  };

  const clearChat = () => {
    setMessages([
      {
        id: 'welcome',
        role: 'assistant',
        text: language === 'bn' ? defaultWelcomeBn : defaultWelcomeEn,
        timestamp: new Date()
      }
    ]);
    setErrorMsg(null);
  };

  const currentSuggestions = language === 'bn' ? QUICK_SUGGESTIONS_BN : QUICK_SUGGESTIONS_EN;

  return (
    <>
      {/* Floating Trigger Button */}
      <div className="fixed bottom-6 right-6 z-40">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center space-x-2.5 bg-gradient-to-r from-emerald-800 to-green-700 text-white px-4 py-3.5 rounded-full shadow-2xl hover:shadow-emerald-900/30 border border-emerald-600/30 transition-all cursor-pointer group"
          id="wefarm-ai-chatbot-trigger"
        >
          <div className="relative">
            <Sparkles className="h-5 w-5 text-emerald-300 animate-pulse" />
            <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-400"></span>
            </span>
          </div>
          <span className="font-bold text-xs tracking-wider uppercase hidden sm:inline-block">WeFarm AI</span>
          <span className="bg-emerald-900/60 px-2 py-0.5 rounded-full text-[10px] font-semibold text-emerald-200 border border-emerald-500/20">Ask AI</span>
        </motion.button>
      </div>

      {/* Slide-over Chat Box */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-24 right-4 sm:right-6 w-[calc(100vw-2rem)] sm:w-[420px] h-[550px] max-h-[82vh] bg-white rounded-3xl shadow-2xl border border-emerald-100 flex flex-col z-50 overflow-hidden"
            id="wefarm-ai-chatbot-window"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-emerald-900 via-green-800 to-emerald-900 text-white p-4 flex items-center justify-between border-b border-emerald-800/50">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-emerald-700/50 rounded-2xl border border-emerald-500/30">
                  <Leaf className="h-5 w-5 text-emerald-300" />
                </div>
                <div>
                  <div className="flex items-center space-x-1.5">
                    <h3 className="font-bold text-sm tracking-wide text-white">WeFarm AI</h3>
                    <span className="px-1.5 py-0.2 bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-[9px] font-bold rounded-md uppercase">Soil to Soul</span>
                  </div>
                  <p className="text-[10px] text-emerald-200/80">
                    {language === 'bn' ? 'কৃষি, পণ্য ও বিনিয়োগ নির্দেশিকা (বাংলা ও English)' : 'Regenerative Farming & Investment Guide'}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-1">
                <button
                  onClick={clearChat}
                  title={language === 'bn' ? 'চ্যাট পরিষ্কার করুন' : 'Clear conversation'}
                  className="p-1.5 text-emerald-200 hover:text-white hover:bg-emerald-800/50 rounded-lg transition-colors cursor-pointer"
                >
                  <RefreshCw className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 text-emerald-200 hover:text-white hover:bg-emerald-800/50 rounded-lg transition-colors cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Messages Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-slate-50/50">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex items-start space-x-2.5 ${
                    msg.role === 'user' ? 'flex-row-reverse space-x-reverse' : ''
                  }`}
                >
                  <div
                    className={`p-1.5 rounded-xl flex-shrink-0 ${
                      msg.role === 'user'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-emerald-100/80 text-emerald-800'
                    }`}
                  >
                    {msg.role === 'user' ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                  </div>
                  <div
                    className={`max-w-[82%] rounded-2xl px-4 py-3 text-xs leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-emerald-600 text-white rounded-tr-none font-medium'
                        : 'bg-white text-gray-800 shadow-2xs border border-emerald-100/60 rounded-tl-none whitespace-pre-line'
                    }`}
                  >
                    {msg.text}
                  </div>
                </div>
              ))}

              {isLoading && (
                <div className="flex items-center space-x-2 text-emerald-700 bg-emerald-50/80 p-3 rounded-2xl w-max text-xs border border-emerald-100">
                  <Sparkles className="h-4 w-4 animate-spin text-emerald-600" />
                  <span className="font-medium animate-pulse">
                    {language === 'bn' ? 'খামার ও পণ্যের তথ্য যাচাই করা হচ্ছে...' : 'Analyzing live farm & product data...'}
                  </span>
                </div>
              )}

              {errorMsg && (
                <div className="p-3 bg-red-50 text-red-600 text-xs rounded-xl border border-red-100 font-medium">
                  {errorMsg}
                </div>
              )}

              {/* Quick suggestions when history is short */}
              {messages.length <= 2 && !isLoading && (
                <div className="pt-2 space-y-1.5">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-1">
                    {language === 'bn' ? 'সচরাচর জিজ্ঞাসিত প্রশ্নসমূহ' : 'Suggested Questions'}
                  </p>
                  <div className="grid grid-cols-1 gap-1.5">
                    {currentSuggestions.map((q, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSend(q)}
                        className="text-left text-[11px] bg-white hover:bg-emerald-50 text-emerald-900 border border-emerald-100 hover:border-emerald-300 px-3 py-2 rounded-xl transition-all font-medium flex items-center justify-between group cursor-pointer shadow-2xs"
                      >
                        <span>{q}</span>
                        <ArrowRight className="h-3 w-3 text-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div ref={chatEndRef} />
            </div>

            {/* Input Footer */}
            <div className="p-3 bg-white border-t border-gray-100">
              <div className="flex items-center bg-gray-50 rounded-2xl border border-gray-200 focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-500/20 px-3 py-1.5 transition-all">
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={language === 'bn' ? 'খামার, পণ্য, বিনিয়োগ সম্পর্কে লিখুন...' : 'Ask about our farm, products, investments...'}
                  disabled={isLoading}
                  className="w-full bg-transparent border-none text-xs text-gray-800 placeholder-gray-400 focus:outline-none py-1.5 font-medium"
                />
                <button
                  onClick={() => handleSend()}
                  disabled={!inputValue.trim() || isLoading}
                  className="p-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white rounded-xl transition-all cursor-pointer flex-shrink-0 ml-1"
                >
                  <Send className="h-3.5 w-3.5" />
                </button>
              </div>
              <p className="text-[9px] text-gray-400 text-center mt-2">
                WeFarm AI Assistant • Powered by Gemini 2.5 Flash
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
