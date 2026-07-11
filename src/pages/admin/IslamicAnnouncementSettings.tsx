import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { 
  Save, 
  ToggleLeft, 
  ToggleRight, 
  Plus, 
  Trash2, 
  Sparkles, 
  Eye, 
  Clock, 
  AlertCircle, 
  BookOpen, 
  MessageSquare, 
  Calendar, 
  CheckCircle2, 
  Pin, 
  ListPlus,
  HelpCircle
} from 'lucide-react';
import { motion } from 'motion/react';
import { AnnouncementBarConfig } from '../../components/IslamicAnnouncementBar';
import { QURAN_VERSES, HADITHS, DAILY_REMINDERS_1000 } from '../../data/islamicDatabase';

const DEFAULT_CONFIG: AnnouncementBarConfig = {
  enabled: true,
  rotationInterval: 12,
  selectedCategories: ['quran', 'hadith', 'reminder', 'prayer'],
  pinnedAnnouncementEnabled: false,
  pinnedAnnouncementText: '',
  pinnedAnnouncementType: 'custom',
  customReminders: [
    'আজ অন্তত একজনকে হাসিমুখে সালাম দিন—এটিও একটি সুন্নাহ।',
    'ফরজ ইবাদতের পাশাপাশি কিছু নফল আমল করার অভ্যাস গড়ে তুলুন।'
  ]
};

export default function AdminIslamicAnnouncementSettings() {
  const [config, setConfig] = useState<AnnouncementBarConfig>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [newCustomReminder, setNewCustomReminder] = useState('');
  const [previewItem, setPreviewItem] = useState<any | null>(null);

  // Load configuration from Firestore
  useEffect(() => {
    const docRef = doc(db, 'settings', 'islamic_bar');
    const unsubscribe = onSnapshot(docRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data() as AnnouncementBarConfig;
        setConfig({
          ...DEFAULT_CONFIG,
          ...data,
          customReminders: data.customReminders || DEFAULT_CONFIG.customReminders
        });
      } else {
        setConfig(DEFAULT_CONFIG);
      }
      setLoading(false);
    }, (error) => {
      console.error("Error reading Islamic Bar settings:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Save changes to Firestore
  const handleSave = async (updatedConfig = config) => {
    setSaving(true);
    setActionMessage(null);
    try {
      await setDoc(doc(db, 'settings', 'islamic_bar'), updatedConfig);
      setActionMessage({ type: 'success', text: 'ইসলামিক অ্যানাউন্সমেন্ট বার সেটিংস সফলভাবে সংরক্ষিত হয়েছে!' });
    } catch (error) {
      console.error("Error saving settings:", error);
      setActionMessage({ type: 'error', text: 'সেটিংস সংরক্ষণ করতে ব্যর্থ হয়েছে।' });
    } finally {
      setSaving(false);
      setTimeout(() => setActionMessage(null), 4000);
    }
  };

  // Toggle general enable status
  const handleToggleEnable = () => {
    const newConfig = { ...config, enabled: !config.enabled };
    setConfig(newConfig);
    handleSave(newConfig);
  };

  // Toggle individual categories
  const handleToggleCategory = (cat: string) => {
    let newCats = [...config.selectedCategories];
    if (newCats.includes(cat)) {
      newCats = newCats.filter(c => c !== cat);
    } else {
      newCats.push(cat);
    }
    setConfig({ ...config, selectedCategories: newCats });
  };

  // Add a new custom reminder
  const handleAddCustomReminder = () => {
    if (!newCustomReminder.trim()) return;
    const updatedCustoms = [...config.customReminders, newCustomReminder.trim()];
    setConfig({ ...config, customReminders: updatedCustoms });
    setNewCustomReminder('');
  };

  // Delete a custom reminder
  const handleRemoveCustomReminder = (index: number) => {
    const updatedCustoms = config.customReminders.filter((_, i) => i !== index);
    setConfig({ ...config, customReminders: updatedCustoms });
  };

  // Generate interactive preview of active elements
  const generatePreview = () => {
    const previewList: any[] = [];
    const today = new Date().getDate();

    if (config.pinnedAnnouncementEnabled && config.pinnedAnnouncementText.trim()) {
      previewList.push({
        title: "📌 পিন করা বিশেষ বার্তা (Pinned Announcement)",
        text: config.pinnedAnnouncementText,
        reference: "অ্যাডমিন পিন করা বার্তা",
        arabic: "",
        tafsir: "অ্যাডমিন কর্তৃক পিন করা বিশেষ বার্তা।"
      });
    }

    if (config.selectedCategories.includes('quran')) {
      const verse = QURAN_VERSES[today % QURAN_VERSES.length];
      previewList.push({
        title: "📖 আজকের পবিত্র কুরআনের আয়াত",
        arabic: verse.arabic,
        text: verse.bangla,
        reference: `${verse.surah}, আয়াত ${verse.ayah}`,
        tafsir: verse.tafsir
      });
    }

    if (config.selectedCategories.includes('hadith')) {
      const hadith = HADITHS[today % HADITHS.length];
      previewList.push({
        title: "📜 আজকের হাদিস শরিফ",
        text: hadith.bangla,
        reference: hadith.source,
        tafsir: hadith.explanation || ""
      });
    }

    if (config.selectedCategories.includes('reminder')) {
      previewList.push({
        title: "🕌 ইসলামিক নির্দেশনা (১০০০+ ডাটাবেজ থেকে)",
        text: DAILY_REMINDERS_1000[today % DAILY_REMINDERS_1000.length],
        reference: "দৈনিক ইসলামিক রিমাইন্ডার",
        tafsir: "সহজ শিক্ষা: এই সুন্দর নির্দেশনাটি আমল করার চেষ্টা করুন।"
      });
    }

    config.customReminders.forEach((reminderText, idx) => {
      previewList.push({
        title: `✨ কাস্টম অ্যাডমিন রিমাইন্ডার #${idx + 1}`,
        text: reminderText,
        reference: "অ্যাডমিন নির্ধারিত",
        tafsir: ""
      });
    });

    if (previewList.length === 0) {
      setPreviewItem({
        title: "⚠️ কোনো কনটেন্ট সোর্স সক্রিয় নেই",
        text: "দয়া করে কনটেন্ট ক্যাটাগরি সোর্স সক্রিয় করুন অথবা কাস্টম রিমাইন্ডার যোগ করুন।",
        reference: "সিস্টেম নোটিশ",
        tafsir: ""
      });
    } else {
      // Pick random or cycle
      setPreviewItem(previewList[Math.floor(Math.random() * previewList.length)]);
    }
  };

  useEffect(() => {
    if (!loading) {
      generatePreview();
    }
  }, [config, loading]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 font-sans">
      
      {/* Header and Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-emerald-950 p-6 sm:p-8 rounded-3xl border border-emerald-800 shadow-xl text-white relative overflow-hidden">
        {/* Subtle glow effect */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div>
          <span className="text-amber-400 font-bold tracking-widest uppercase text-[10px] bg-emerald-900/60 px-3 py-1 rounded-full border border-amber-500/20 mb-2 inline-block">🕌 Islamic Services</span>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">Smart Islamic Announcement Bar</h1>
          <p className="text-emerald-200/80 text-xs sm:text-sm mt-1">
            মুমিনদের অনুপ্রেরণা জোগাতে ওয়েবসাইটের শীর্ষে বাংলা-প্রথম ইসলামিক বাণী প্রদর্শন নিয়ন্ত্রণ করুন।
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={handleToggleEnable}
            className={`flex items-center gap-2 px-5 py-3 rounded-2xl font-bold transition-all border ${
              config.enabled 
                ? 'bg-emerald-600 border-emerald-500 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/40' 
                : 'bg-zinc-800 border-zinc-700 hover:bg-zinc-700 text-zinc-400'
            }`}
          >
            {config.enabled ? (
              <>
                <ToggleRight className="h-6 w-6 text-amber-300" />
                <span>সক্রিয় (Active)</span>
              </>
            ) : (
              <>
                <ToggleLeft className="h-6 w-6 text-zinc-500" />
                <span>নিষ্ক্রিয় (Disabled)</span>
              </>
            )}
          </button>
        </div>
      </div>

      {actionMessage && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-4 rounded-xl flex items-center space-x-3 shadow-md ${
            actionMessage.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          {actionMessage.type === 'success' ? <CheckCircle2 className="h-5 w-5 text-emerald-600" /> : <AlertCircle className="h-5 w-5 text-red-600" />}
          <span className="font-bold text-sm">{actionMessage.text}</span>
        </motion.div>
      )}

      {/* Main Settings Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        
        {/* Left Columns (Settings & Custom Messages) */}
        <div className="md:col-span-2 space-y-8">
          
          {/* Content Source Picker */}
          <div className="bg-white rounded-3xl border border-zinc-150 p-6 shadow-sm space-y-6">
            <div className="flex items-center gap-2 pb-4 border-b border-zinc-100">
              <BookOpen className="h-5 w-5 text-emerald-600" />
              <h3 className="font-bold text-zinc-800">কনটেন্ট ক্যাটাগরি ও রোটেটর সোর্স</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              {/* Category Quran */}
              <button
                onClick={() => handleToggleCategory('quran')}
                className={`p-4 rounded-2xl border text-left transition-all flex items-start gap-3 ${
                  config.selectedCategories.includes('quran')
                    ? 'bg-emerald-50/50 border-emerald-200 text-emerald-950'
                    : 'bg-zinc-50/50 border-zinc-150 hover:bg-zinc-50 text-zinc-600'
                }`}
              >
                <div className={`p-2 rounded-xl shrink-0 ${config.selectedCategories.includes('quran') ? 'bg-emerald-100 text-emerald-700' : 'bg-zinc-100 text-zinc-500'}`}>
                  📖
                </div>
                <div>
                  <div className="font-bold text-sm flex items-center gap-1.5">
                    <span>কুরআনের আয়াত</span>
                    {config.selectedCategories.includes('quran') && <span className="text-[10px] text-emerald-600 bg-emerald-100 px-1.5 py-0.5 rounded-full font-bold">অন</span>}
                  </div>
                  <p className="text-[11px] text-zinc-500 mt-1">পবিত্র কুরআনের আয়াতসমূহ বাংলা অর্থ, আরবি পাঠ ও ব্যাখ্যাসহ প্রদর্শন করে।</p>
                </div>
              </button>

              {/* Category Hadith */}
              <button
                onClick={() => handleToggleCategory('hadith')}
                className={`p-4 rounded-2xl border text-left transition-all flex items-start gap-3 ${
                  config.selectedCategories.includes('hadith')
                    ? 'bg-emerald-50/50 border-emerald-200 text-emerald-950'
                    : 'bg-zinc-50/50 border-zinc-150 hover:bg-zinc-50 text-zinc-600'
                }`}
              >
                <div className={`p-2 rounded-xl shrink-0 ${config.selectedCategories.includes('hadith') ? 'bg-emerald-100 text-emerald-700' : 'bg-zinc-100 text-zinc-500'}`}>
                  📜
                </div>
                <div>
                  <div className="font-bold text-sm flex items-center gap-1.5">
                    <span>হাদিস শরিফ</span>
                    {config.selectedCategories.includes('hadith') && <span className="text-[10px] text-emerald-600 bg-emerald-100 px-1.5 py-0.5 rounded-full font-bold">অন</span>}
                  </div>
                  <p className="text-[11px] text-zinc-500 mt-1">বুখারী ও মুসলিম শরিফের নির্ভরযোগ্য শিক্ষণীয় হাদিসসমূহ প্রদর্শন করে।</p>
                </div>
              </button>

              {/* Category Reminder */}
              <button
                onClick={() => handleToggleCategory('reminder')}
                className={`p-4 rounded-2xl border text-left transition-all flex items-start gap-3 ${
                  config.selectedCategories.includes('reminder')
                    ? 'bg-emerald-50/50 border-emerald-200 text-emerald-950'
                    : 'bg-zinc-50/50 border-zinc-150 hover:bg-zinc-50 text-zinc-600'
                }`}
              >
                <div className={`p-2 rounded-xl shrink-0 ${config.selectedCategories.includes('reminder') ? 'bg-emerald-100 text-emerald-700' : 'bg-zinc-100 text-zinc-500'}`}>
                  🕌
                </div>
                <div>
                  <div className="font-bold text-sm flex items-center gap-1.5">
                    <span>১০০০+ বাংলা রিমাইন্ডার</span>
                    {config.selectedCategories.includes('reminder') && <span className="text-[10px] text-emerald-600 bg-emerald-100 px-1.5 py-0.5 rounded-full font-bold">অন</span>}
                  </div>
                  <p className="text-[11px] text-zinc-500 mt-1">আমল বাড়াতে আমাদের ১০০০+ বাংলা ইসলামিক রিমাইন্ডার ডাটাবেজ থেকে প্রদর্শন।</p>
                </div>
              </button>

              {/* Category Prayer / Events */}
              <button
                onClick={() => handleToggleCategory('prayer')}
                className={`p-4 rounded-2xl border text-left transition-all flex items-start gap-3 ${
                  config.selectedCategories.includes('prayer')
                    ? 'bg-emerald-50/50 border-emerald-200 text-emerald-950'
                    : 'bg-zinc-50/50 border-zinc-150 hover:bg-zinc-50 text-zinc-600'
                }`}
              >
                <div className={`p-2 rounded-xl shrink-0 ${config.selectedCategories.includes('prayer') ? 'bg-emerald-100 text-emerald-700' : 'bg-zinc-100 text-zinc-500'}`}>
                  🤲
                </div>
                <div>
                  <div className="font-bold text-sm flex items-center gap-1.5">
                    <span>নামাজ ও ইসলামিক দিবস</span>
                    {config.selectedCategories.includes('prayer') && <span className="text-[10px] text-emerald-600 bg-emerald-100 px-1.5 py-0.5 rounded-full font-bold">অন</span>}
                  </div>
                  <p className="text-[11px] text-zinc-500 mt-1">পরবর্তী নামাজের সময় কাউন্টডাউন এবং জুমা, রমজান ও ঈদের বিশেষ নোটিশ।</p>
                </div>
              </button>

            </div>

            {/* Rotator Interval Selector */}
            <div className="pt-4 border-t border-zinc-100 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5 text-zinc-400" />
                  <span>রোটেট বিরতি বা ইন্টারভাল (সেকেন্ড)</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    min="5"
                    max="60"
                    value={config.rotationInterval}
                    onChange={(e) => setConfig({ ...config, rotationInterval: Number(e.target.value) })}
                    className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:bg-white outline-none font-bold text-zinc-800"
                  />
                  <span className="flex items-center px-3 bg-zinc-100 text-zinc-500 font-semibold text-xs rounded-xl border border-zinc-200">সেকেন্ড</span>
                </div>
              </div>

              <div className="flex items-end">
                <p className="text-[11px] text-zinc-500 leading-relaxed italic">
                  * স্বাভাবিক পঠনযোগ্যতার জন্য ১০ থেকে ১৫ সেকেন্ডের ইন্টারভাল বা সময় ব্যবধান সুপারিশ করা হয়।
                </p>
              </div>
            </div>
          </div>

          {/* Pinned Announcement Feature */}
          <div className="bg-white rounded-3xl border border-zinc-150 p-6 shadow-sm space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-zinc-100">
              <div className="flex items-center gap-2">
                <Pin className="h-5 w-5 text-amber-500 rotate-45" />
                <h3 className="font-bold text-zinc-800">পিন করা বিশেষ ঘোষণা (Pinned Bar Notice)</h3>
              </div>
              <button
                onClick={() => setConfig({ ...config, pinnedAnnouncementEnabled: !config.pinnedAnnouncementEnabled })}
                className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                  config.pinnedAnnouncementEnabled
                    ? 'bg-amber-100 text-amber-800 border border-amber-200'
                    : 'bg-zinc-100 text-zinc-400 border border-zinc-200'
                }`}
              >
                {config.pinnedAnnouncementEnabled ? 'সক্রিয় (Active)' : 'নিষ্ক্রিয় (Disabled)'}
              </button>
            </div>

            {config.pinnedAnnouncementEnabled && (
              <div className="space-y-4 animate-fadeIn">
                <div>
                  <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-2">ঘোষণার মূল পাঠ্য (বাংলায়)</label>
                  <textarea
                    rows={2}
                    value={config.pinnedAnnouncementText}
                    onChange={(e) => setConfig({ ...config, pinnedAnnouncementText: e.target.value })}
                    placeholder="যেমন: পবিত্র রমজান মাস উপলক্ষে আমাদের অফিস সময় সকাল ৯টা থেকে বিকাল ৩টা পর্যন্ত।"
                    className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:bg-white outline-none font-medium text-zinc-800"
                  />
                </div>
                <div className="p-3 bg-amber-50 text-amber-900 border border-amber-200 rounded-2xl flex gap-2.5">
                  <AlertCircle className="h-5 w-5 shrink-0 text-amber-600 mt-0.5" />
                  <p className="text-[11px] leading-relaxed">
                    <strong>দৃষ্টি আকর্ষণ:</strong> এই পিন করা বার্তাটি অন্য যেকোনো বাণী বা হাদিসের সাথে রোটেটরে সবচেয়ে বেশি অগ্রাধিকার নিয়ে নিয়মিত প্রদর্শিত হবে।
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Custom Bangla Reminders */}
          <div className="bg-white rounded-3xl border border-zinc-150 p-6 shadow-sm space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-zinc-100">
              <div className="flex items-center gap-2">
                <ListPlus className="h-5 w-5 text-emerald-600" />
                <h3 className="font-bold text-zinc-800">কাস্টম বাংলা রিমাইন্ডার ও নোটিশ যোগ করুন</h3>
              </div>
              <span className="text-xs text-zinc-400 font-bold bg-zinc-100 px-2.5 py-1 rounded-full">মোট: {config.customReminders.length} টি</span>
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                placeholder="নতুন ইসলামিক রিমাইন্ডার বাংলায় লিখুন..."
                value={newCustomReminder}
                onChange={(e) => setNewCustomReminder(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddCustomReminder()}
                className="flex-1 px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:bg-white outline-none text-sm font-medium text-zinc-800"
              />
              <button
                onClick={handleAddCustomReminder}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-5 rounded-xl transition-all shadow-md flex items-center gap-1 shrink-0"
              >
                <Plus className="h-5 w-5" />
                <span>যোগ করুন</span>
              </button>
            </div>

            {config.customReminders.length === 0 ? (
              <div className="text-center py-6 text-zinc-400 text-xs italic bg-zinc-50 rounded-2xl border border-dashed border-zinc-150">
                কোনো কাস্টম রিমাইন্ডার বা বিশেষ নোটিশ এখনো যোগ করা হয়নি।
              </div>
            ) : (
              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 no-scrollbar">
                {config.customReminders.map((reminder, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3.5 bg-zinc-50 hover:bg-zinc-100/70 border border-zinc-150 rounded-2xl transition-all">
                    <div className="flex items-start gap-2.5 min-w-0">
                      <span className="text-emerald-600 font-bold text-xs shrink-0 bg-emerald-100/50 w-5 h-5 flex items-center justify-center rounded-full mt-0.5">{idx + 1}</span>
                      <p className="text-xs text-zinc-800 font-medium leading-relaxed truncate">{reminder}</p>
                    </div>
                    <button
                      onClick={() => handleRemoveCustomReminder(idx)}
                      className="p-1 text-zinc-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all shrink-0"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* Right Columns (Live Interactive Preview and Instructions) */}
        <div className="space-y-8">
          
          {/* Active Preview */}
          <div className="bg-zinc-900 text-white rounded-3xl border border-zinc-800 p-6 shadow-xl relative overflow-hidden flex flex-col justify-between">
            {/* Ambient gold glow */}
            <div className="absolute top-0 right-0 w-48 h-48 bg-amber-500/5 rounded-full blur-2xl pointer-events-none" />
            
            <div className="space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
                <div className="flex items-center gap-2">
                  <Eye className="h-5 w-5 text-amber-500 animate-pulse" />
                  <h4 className="font-bold text-sm tracking-wide uppercase text-amber-400">রিয়েল-টাইম প্রিভিউ</h4>
                </div>
                <button
                  onClick={generatePreview}
                  className="text-[10px] text-zinc-400 hover:text-white bg-zinc-800 px-2 py-1 rounded font-bold uppercase transition-colors"
                >
                  অন্য বার্তা (Cycle)
                </button>
              </div>

              {previewItem && (
                <div className="space-y-5">
                  <div className="space-y-1">
                    <span className="text-[10px] text-amber-500 font-bold tracking-widest uppercase block">{previewItem.title}</span>
                    <span className="text-[9px] text-zinc-500 block">উৎস: {previewItem.reference}</span>
                  </div>

                  {previewItem.arabic && (
                    <p className="font-serif text-lg text-amber-300 leading-loose text-right border-y border-zinc-800 py-3" dir="rtl">
                      {previewItem.arabic}
                    </p>
                  )}

                  <p className="text-xs sm:text-sm font-bold text-zinc-100 leading-relaxed italic bg-zinc-950 p-4 rounded-2xl border border-zinc-800 shadow-inner">
                    "{previewItem.text}"
                  </p>

                  {previewItem.tafsir && (
                    <div className="bg-zinc-800/40 p-3 rounded-xl border border-zinc-800 text-[11px] text-zinc-400 leading-relaxed">
                      <strong>শিক্ষা/ব্যাখ্যা:</strong> {previewItem.tafsir}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="pt-6 mt-6 border-t border-zinc-800 text-center">
              <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block">ওয়েবসাইটের শীর্ষে প্রদর্শন হবে</span>
            </div>
          </div>

          {/* Quick Info & Authenticity Rules */}
          <div className="bg-emerald-50 rounded-3xl border border-emerald-100 p-6 space-y-4 shadow-sm text-emerald-950">
            <h4 className="font-bold text-emerald-900 flex items-center gap-2 text-sm">
              <Sparkles className="h-5 w-5 text-emerald-700" />
              <span>ইসলামিক সঠিকতা ও নিয়মাবলী</span>
            </h4>
            <ul className="space-y-3.5 text-xs text-emerald-800 font-medium leading-relaxed list-disc list-inside">
              <li>আমরা শুধুমাত্র পবিত্র কুরআনের আয়াত ও সহিহ বুখারী/মুসলিম শরিফের বিশুদ্ধ হাদিসসমূহ সংকলন করেছি।</li>
              <li>পবিত্র কুরআনের আয়াত বা হাদিসের বাণী কখনোই নিজের মতো পরিবর্তন করে প্রকাশ করবেন না।</li>
              <li>বিশেষ দিনে যেমন জুমাবার, রমজান বা ঈদে সিস্টেম স্বয়ংক্রিয়ভাবে প্রাসঙ্গিক বার্তা ও শুভেচ্ছা স্লাইড প্রদর্শন করে।</li>
              <li>আপনার যেকোনো কাস্টম মেসেজ যুক্ত করার আগে অবশ্যই এর তথ্য ও সত্যতা যাচাই করে নিন।</li>
            </ul>
          </div>

          {/* Submit Action */}
          <button
            onClick={() => handleSave()}
            disabled={saving}
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black py-4.5 rounded-2xl shadow-lg hover:shadow-emerald-900/30 active:scale-[0.99] transition-all flex items-center justify-center space-x-2 text-sm uppercase tracking-wider"
          >
            {saving ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
            ) : (
              <>
                <Save className="h-5 w-5" />
                <span>সব সেটিংস সংরক্ষণ করুন (Save Settings)</span>
              </>
            )}
          </button>

        </div>

      </div>

    </div>
  );
}
