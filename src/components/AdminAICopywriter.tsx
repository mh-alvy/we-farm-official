import React, { useState } from 'react';
import { Sparkles, Copy, Check, Wand2, X, RefreshCw, ArrowRight, FileText } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface AdminAICopywriterProps {
  isOpen?: boolean;
  onClose?: () => void;
  defaultPromptType?: 'hero_heading' | 'hero_tagline' | 'project_pitch' | 'product_description' | 'about_story' | 'custom';
  defaultInput?: string;
  onApplyCopy?: (selectedText: string) => void;
}

export default function AdminAICopywriter({
  isOpen: externalIsOpen,
  onClose: externalOnClose,
  defaultPromptType = 'hero_heading',
  defaultInput = '',
  onApplyCopy
}: AdminAICopywriterProps) {
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const isOpen = externalIsOpen !== undefined ? externalIsOpen : internalIsOpen;
  const onClose = externalOnClose || (() => setInternalIsOpen(false));

  const [promptType, setPromptType] = useState<string>(defaultPromptType);
  const [promptInput, setPromptInput] = useState<string>(defaultInput);
  const [tone, setTone] = useState<string>('Warm & Earthy');
  const [isGenerating, setIsGenerating] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const handleGenerate = async () => {
    if (!promptInput.trim() || isGenerating) return;

    setIsGenerating(true);
    setErrorMsg(null);
    setSuggestions([]);

    try {
      const res = await fetch('/api/ai/copywrite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ promptType, promptInput, tone })
      });

      const data = await res.json();
      if (data.success && Array.isArray(data.suggestions)) {
        setSuggestions(data.suggestions);
      } else {
        setErrorMsg(data.error || "Failed to generate copy.");
      }
    } catch (err) {
      console.error("Copywriter API error:", err);
      setErrorMsg("Network error. Could not connect to Gemini copywriter service.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleApply = (text: string) => {
    if (onApplyCopy) {
      onApplyCopy(text);
      onClose();
    }
  };

  return (
    <>
      {/* If used as a standalone trigger button when no props provided */}
      {externalIsOpen === undefined && (
        <button
          onClick={() => setInternalIsOpen(true)}
          className="flex items-center space-x-2 bg-gradient-to-r from-green-700 to-emerald-800 text-white px-3.5 py-2 rounded-xl shadow-md hover:shadow-lg hover:from-green-800 hover:to-emerald-900 transition-all font-bold text-xs cursor-pointer border border-green-600/30"
          id="admin-ai-copywriter-trigger"
        >
          <Wand2 className="h-4 w-4 text-emerald-300 animate-pulse" />
          <span>AI Copywriter</span>
        </button>
      )}

      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white rounded-3xl shadow-2xl border border-gray-100 w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              {/* Header */}
              <div className="bg-gradient-to-r from-emerald-900 via-green-900 to-emerald-950 text-white p-5 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2.5 bg-emerald-800/60 rounded-2xl border border-emerald-500/30">
                    <Sparkles className="h-6 w-6 text-emerald-300" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white flex items-center space-x-2">
                      <span>Admin AI Copywriter</span>
                      <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-[10px] font-extrabold rounded-md uppercase">Soil to Soul</span>
                    </h3>
                    <p className="text-xs text-emerald-200/80">Craft headlines, project pitches, taglines & product copy powered by Gemini</p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 text-emerald-200 hover:text-white hover:bg-emerald-800/50 rounded-xl transition-colors cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Body Form */}
              <div className="p-6 overflow-y-auto space-y-5 flex-1">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">
                      Content Type
                    </label>
                    <select
                      value={promptType}
                      onChange={(e) => setPromptType(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none text-xs font-semibold text-gray-800"
                    >
                      <option value="hero_heading">Hero Main Heading</option>
                      <option value="hero_tagline">Hero Tagline / Subtitle</option>
                      <option value="project_pitch">Project Pitch & Description</option>
                      <option value="product_description">Product Description</option>
                      <option value="about_story">Brand Story / Mission Statement</option>
                      <option value="custom">Custom Copywriting Prompt</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">
                      Tone of Voice
                    </label>
                    <select
                      value={tone}
                      onChange={(e) => setTone(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none text-xs font-semibold text-gray-800"
                    >
                      <option value="Warm & Earthy">Warm & Earthy (Soil to Soul)</option>
                      <option value="Professional & Inspiring">Professional & Inspiring</option>
                      <option value="Bold & Visionary">Bold & Visionary</option>
                      <option value="Concise & Impactful">Concise & Impactful</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">
                    Key Ideas / Context / Keywords
                  </label>
                  <textarea
                    value={promptInput}
                    onChange={(e) => setPromptInput(e.target.value)}
                    placeholder="e.g., Grass-fed raw milk in Cumilla, zero chemical preservatives, heritage breeds, 18% estimated return..."
                    rows={3}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none text-xs text-gray-800 placeholder-gray-400"
                  />
                </div>

                <button
                  onClick={handleGenerate}
                  disabled={!promptInput.trim() || isGenerating}
                  className="w-full py-3 bg-gradient-to-r from-emerald-700 to-green-700 hover:from-emerald-800 hover:to-green-800 disabled:opacity-50 text-white font-bold text-xs rounded-2xl shadow-lg shadow-emerald-900/10 flex items-center justify-center space-x-2 transition-all cursor-pointer"
                >
                  {isGenerating ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin text-emerald-200" />
                      <span>Writing Copy with Gemini...</span>
                    </>
                  ) : (
                    <>
                      <Wand2 className="h-4 w-4 text-emerald-300" />
                      <span>Generate 3 Variations</span>
                    </>
                  )}
                </button>

                {errorMsg && (
                  <div className="p-3 bg-red-50 text-red-600 text-xs rounded-xl border border-red-100 font-medium">
                    {errorMsg}
                  </div>
                )}

                {/* Suggestions List */}
                {suggestions.length > 0 && (
                  <div className="space-y-3 pt-2">
                    <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                      Generated Copy Options
                    </label>

                    <div className="space-y-3">
                      {suggestions.map((text, idx) => (
                        <div
                          key={idx}
                          className="p-4 bg-emerald-50/40 border border-emerald-100 hover:border-emerald-300 rounded-2xl transition-all space-y-3"
                        >
                          <p className="text-xs text-gray-800 font-medium leading-relaxed whitespace-pre-line">
                            "{text}"
                          </p>

                          <div className="flex items-center justify-between pt-2 border-t border-emerald-100/60">
                            <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-widest">
                              Option #{idx + 1}
                            </span>

                            <div className="flex items-center space-x-2">
                              <button
                                onClick={() => handleCopy(text, idx)}
                                className="px-3 py-1.5 bg-white hover:bg-emerald-50 text-gray-700 border border-gray-200 hover:border-emerald-300 text-xs font-semibold rounded-xl flex items-center space-x-1 transition-all cursor-pointer"
                              >
                                {copiedIndex === idx ? (
                                  <>
                                    <Check className="h-3.5 w-3.5 text-emerald-600" />
                                    <span className="text-emerald-600">Copied!</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy className="h-3.5 w-3.5 text-gray-500" />
                                    <span>Copy</span>
                                  </>
                                )}
                              </button>

                              {onApplyCopy && (
                                <button
                                  onClick={() => handleApply(text)}
                                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center space-x-1 transition-all cursor-pointer shadow-sm"
                                >
                                  <span>Use This Copy</span>
                                  <ArrowRight className="h-3.5 w-3.5" />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
