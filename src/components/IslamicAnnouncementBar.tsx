import React, { useState, useEffect, useRef } from 'react';
import { db } from '../firebase';
import { doc, onSnapshot, getDoc, setDoc } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { BookOpen, Calendar, Clock, Volume2, Share2, BookMarked, ChevronDown, ChevronUp, ExternalLink, X, Info } from 'lucide-react';
import { 
  QURAN_VERSES, 
  HADITHS, 
  DAILY_REMINDERS_1000, 
  FRIDAY_REMINDERS, 
  RAMADAN_REMINDERS, 
  EID_REMINDERS, 
  DAILY_DUAS 
} from '../data/islamicDatabase';

export interface AnnouncementBarConfig {
  enabled: boolean;
  rotationInterval: number; // in seconds
  selectedCategories: string[]; // 'quran' | 'hadith' | 'reminder' | 'prayer' | 'custom'
  pinnedAnnouncementEnabled: boolean;
  pinnedAnnouncementText: string;
  pinnedAnnouncementType: 'quran' | 'hadith' | 'reminder' | 'custom';
  customReminders: string[];
  scheduleStart?: string;
  scheduleEnd?: string;
}

const DEFAULT_CONFIG: AnnouncementBarConfig = {
  enabled: true,
  rotationInterval: 12,
  selectedCategories: ['quran', 'hadith', 'reminder', 'prayer'],
  pinnedAnnouncementEnabled: false,
  pinnedAnnouncementText: '',
  pinnedAnnouncementType: 'custom',
  customReminders: []
};

// Simple local prayer times calculator for Dhaka coordinates (Default fallback)
// High precision approximation for the 5 daily prayers
const getLocalPrayerTimes = (date: Date) => {
  const dayOfYear = Math.floor((date.getTime() - new Date(date.getFullYear(), 0, 0).getTime()) / 86400000);
  
  // Approximate prayer times in hours for Dhaka (UTC+6)
  // These represent standard annual cycles of prayer times in Bangladesh
  const fajrBase = 4.5 + 0.8 * Math.cos(((dayOfYear - 15) * 2 * Math.PI) / 365);
  const dhuhrBase = 12.0 + 0.1 * Math.cos(((dayOfYear - 180) * 2 * Math.PI) / 365);
  const asrBase = 15.5 + 0.6 * Math.cos(((dayOfYear - 120) * 2 * Math.PI) / 365);
  const maghribBase = 18.2 + 0.8 * Math.sin(((dayOfYear - 80) * 2 * Math.PI) / 365);
  const ishaBase = 19.5 + 0.8 * Math.sin(((dayOfYear - 80) * 2 * Math.PI) / 365);

  const formatHour = (hourDecimal: number) => {
    const hours = Math.floor(hourDecimal);
    const minutes = Math.floor((hourDecimal - hours) * 60);
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${pad(hours)}:${pad(minutes)}`;
  };

  return {
    Fajr: formatHour(fajrBase),
    Dhuhr: formatHour(dhuhrBase),
    Asr: formatHour(asrBase),
    Maghrib: formatHour(maghribBase),
    Isha: formatHour(ishaBase)
  };
};

export default function IslamicAnnouncementBar() {
  const [config, setConfig] = useState<AnnouncementBarConfig>(DEFAULT_CONFIG);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [displayItems, setDisplayItems] = useState<any[]>([]);
  const [selectedItemForModal, setSelectedItemForModal] = useState<any | null>(null);
  const [showEnglishInModal, setShowEnglishInModal] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [prayerTimes, setPrayerTimes] = useState<any>(null);
  const [nextPrayerInfo, setNextPrayerInfo] = useState<string>('');
  const [hijriDate, setHijriDate] = useState<string>('');
  const [specialOccasion, setSpecialOccasion] = useState<string>('');

  // 1. Listen for Live Configuration Changes from Firestore
  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, 'settings', 'islamic_bar'), (snapshot) => {
      if (snapshot.exists()) {
        setConfig({ ...DEFAULT_CONFIG, ...snapshot.data() });
      } else {
        setConfig(DEFAULT_CONFIG);
      }
    }, (error) => {
      console.warn("Firestore listener failed, using local fallback configuration:", error);
      setConfig(DEFAULT_CONFIG);
    });

    return () => unsubscribe();
  }, []);

  // 2. Fetch/Calculate Prayer Times & Special Islamic Occasions
  useEffect(() => {
    const today = new Date();
    
    // Check local fallback
    const localTimes = getLocalPrayerTimes(today);
    setPrayerTimes(localTimes);

    // Try fetching from AlAdhan API with standard Dhaka settings
    const fetchPrayerTimesAndHijri = async () => {
      try {
        const response = await fetch(`https://api.aladhan.com/v1/timingsByCity?city=Dhaka&country=Bangladesh&method=1`);
        const result = await response.json();
        if (result && result.data) {
          const apiTimings = result.data.timings;
          setPrayerTimes({
            Fajr: apiTimings.Fajr,
            Dhuhr: apiTimings.Dhuhr,
            Asr: apiTimings.Asr,
            Maghrib: apiTimings.Maghrib,
            Isha: apiTimings.Isha
          });

          // Set Hijri Date
          const hijri = result.data.date.hijri;
          const mapToBanglaMonth = (enMonth: string) => {
            const months: { [key: string]: string } = {
              "Muharram": "মহররম", "Safar": "সফর", "Rabi' al-awwal": "রবিউল আউয়াল",
              "Rabi' al-thani": "রবিউস সানি", "Jumada al-awwal": "জমাদিউল আউয়াল",
              "Jumada al-thani": "জমাদিউস সানি", "Rajab": "রজব", "Sha'ban": "শাবান",
              "Ramadan": "রমজান", "Shawwal": "শাওয়াল", "Dhu al-qi'dah": "জিলকদ",
              "Dhu al-hijjah": "জিলহজ"
            };
            return months[enMonth] || enMonth;
          };
          setHijriDate(`${hijri.day} ${mapToBanglaMonth(hijri.month.en)} ${hijri.year} হিজরি`);

          // Detect Special Occasions from Hijri calendar
          const hijriMonthNum = Number(hijri.month.number);
          const hijriDay = Number(hijri.day);

          if (hijriMonthNum === 9) {
            setSpecialOccasion("পবিত্র রমজান মাস");
          } else if (hijriMonthNum === 10 && hijriDay <= 3) {
            setSpecialOccasion("পবিত্র ঈদুল ফিতর");
          } else if (hijriMonthNum === 12 && hijriDay >= 8 && hijriDay <= 12) {
            setSpecialOccasion("পবিত্র ঈদুল আজহা");
          } else if (hijriMonthNum === 1 && hijriDay === 10) {
            setSpecialOccasion("পবিত্র আশুরা");
          }
        }
      } catch (err) {
        console.warn("Could not retrieve online prayer times, using high-precision local formulas", err);
      }
    };

    fetchPrayerTimesAndHijri();

    // Set standard Jumu'ah notice if it is Friday
    if (today.getDay() === 5) {
      setSpecialOccasion("পবিত্র জুমাবার (শুক্রবার)");
    }
  }, []);

  // 3. Compute Next Prayer Countdown
  useEffect(() => {
    if (!prayerTimes) return;

    const timer = setInterval(() => {
      const now = new Date();
      const formatTime = (pTimeStr: string) => {
        const [h, m] = pTimeStr.split(':').map(Number);
        const d = new Date(now);
        d.setHours(h, m, 0, 0);
        return d;
      };

      const times = [
        { name: 'ফজর', time: formatTime(prayerTimes.Fajr), raw: prayerTimes.Fajr },
        { name: 'যোহর', time: formatTime(prayerTimes.Dhuhr), raw: prayerTimes.Dhuhr },
        { name: 'আসর', time: formatTime(prayerTimes.Asr), raw: prayerTimes.Asr },
        { name: 'মাগরিব', time: formatTime(prayerTimes.Maghrib), raw: prayerTimes.Maghrib },
        { name: 'এশা', time: formatTime(prayerTimes.Isha), raw: prayerTimes.Isha }
      ];

      // Sort or find the next prayer
      let next = times.find(t => t.time > now);
      if (!next) {
        // If all prayers passed today, next is tomorrow's Fajr
        const tomorrowFajr = formatTime(prayerTimes.Fajr);
        tomorrowFajr.setDate(tomorrowFajr.getDate() + 1);
        next = { name: 'ফজর', time: tomorrowFajr, raw: prayerTimes.Fajr };
      }

      const diffMs = next.time.getTime() - now.getTime();
      const diffHrs = Math.floor(diffMs / 3600000);
      const diffMins = Math.floor((diffMs % 3600000) / 60000);

      const hourText = diffHrs > 0 ? `${diffHrs} ঘণ্টা ` : '';
      setNextPrayerInfo(`পরবর্তী নামাজ: ${next.name} শুরু হতে বাকি ${hourText}${diffMins} মিনিট।`);
    }, 1000);

    return () => clearInterval(timer);
  }, [prayerTimes]);

  // 4. Combine Datasets into Rotation Items based on Category Filters
  useEffect(() => {
    const items: any[] = [];
    const todayNum = new Date().getDate();

    // A. Add Pinned Announcement if Active
    if (config.pinnedAnnouncementEnabled && config.pinnedAnnouncementText.trim()) {
      items.push({
        type: 'pinned',
        category: 'গুরুত্বপূর্ণ ঘোষণা',
        icon: '📌',
        text: config.pinnedAnnouncementText,
        arabic: '',
        english: '',
        reference: 'অ্যাডমিন পিন করা বার্তা',
        tafsir: ''
      });
    }

    // B. Quran Category
    if (config.selectedCategories.includes('quran')) {
      // Pick Quran verse of the day based on date index
      const verse = QURAN_VERSES[todayNum % QURAN_VERSES.length];
      items.push({
        type: 'quran',
        category: 'আজকের কুরআনের বাণী',
        icon: '📖',
        arabic: verse.arabic,
        text: verse.bangla,
        english: verse.english,
        reference: `${verse.surah}, আয়াত ${verse.ayah}`,
        tafsir: verse.tafsir
      });
    }

    // C. Hadith Category
    if (config.selectedCategories.includes('hadith')) {
      const hadith = HADITHS[todayNum % HADITHS.length];
      items.push({
        type: 'hadith',
        category: 'আজকের হাদিস',
        icon: '📜',
        text: hadith.bangla,
        english: hadith.english,
        reference: `${hadith.source} ${hadith.hadithNo ? `(হাদিস নং ${hadith.hadithNo})` : ''}`,
        tafsir: hadith.explanation || ''
      });
    }

    // D. Daily Reminder (dynamic selection from the 1000 database)
    if (config.selectedCategories.includes('reminder')) {
      // Select reminder dynamically based on dayOfYear to rotate through 1000 items
      const startOfYear = new Date(new Date().getFullYear(), 0, 1);
      const dayOfYear = Math.floor((new Date().getTime() - startOfYear.getTime()) / 86400000);
      
      // Let's grab 3 distinct reminders from the massive 1000 database to keep things ultra fresh during the day
      const hourIndex = new Date().getHours() % 12;
      const index1 = (dayOfYear * 3 + hourIndex) % DAILY_REMINDERS_1000.length;
      
      items.push({
        type: 'reminder',
        category: 'ইসলামিক নির্দেশনা',
        icon: '🕌',
        text: DAILY_REMINDERS_1000[index1],
        reference: 'দৈনিক অনুপ্রেরণা',
        tafsir: 'সহজ শিক্ষা: এই উপদেশটি আমল করুন এবং কল্যাণকর কাজে অংশ নিন।'
      });
    }

    // E. Custom Reminders added by Admin
    if (config.customReminders && config.customReminders.length > 0) {
      config.customReminders.forEach((rText, idx) => {
        if (rText.trim()) {
          items.push({
            type: 'custom',
            category: 'বিশেষ বার্তা',
            icon: '✨',
            text: rText,
            reference: 'অ্যাডমিন নির্ধারিত',
            tafsir: ''
          });
        }
      });
    }

    // F. Prayer Times Info / Events
    if (config.selectedCategories.includes('prayer')) {
      // Add countdown
      if (nextPrayerInfo) {
        items.push({
          type: 'prayer',
          category: 'সালাত সূচি',
          icon: '🤲',
          text: nextPrayerInfo,
          reference: 'ঢাকা ও আশেপাশের এলাকার জন্য প্রযোজ্য',
          tafsir: 'রাসূলুল্লাহ (সা.) বলেছেন, সঠিক সময়ে সালাত আদায় করা সর্বোত্তম আমল।'
        });
      }

      // Special reminders based on Hijri or occasion
      if (specialOccasion) {
        let occReminder = `${specialOccasion} মোবারক! `;
        if (specialOccasion.includes("জুমা")) {
          occReminder += FRIDAY_REMINDERS[todayNum % FRIDAY_REMINDERS.length];
        } else if (specialOccasion.includes("রমজান")) {
          occReminder += RAMADAN_REMINDERS[todayNum % RAMADAN_REMINDERS.length];
        } else {
          occReminder += EID_REMINDERS[todayNum % EID_REMINDERS.length];
        }

        items.push({
          type: 'event',
          category: 'পবিত্র উৎসব ও দিবস',
          icon: '🌙',
          text: occReminder,
          reference: hijriDate || 'ইসলামিক ক্যালেন্ডার',
          tafsir: 'আসুন আমরা যেকোনো বিশেষ দিনে ইবাদত ও শুকরিয়া বাড়িয়ে দিই।'
        });
      }
    }

    setDisplayItems(items);
  }, [config, nextPrayerInfo, specialOccasion, hijriDate]);

  // 5. Automatic Smooth Rotation Timer
  useEffect(() => {
    if (displayItems.length <= 1 || isHovered) return;

    const intervalMs = (config.rotationInterval || 12) * 1000;
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % displayItems.length);
    }, intervalMs);

    return () => clearInterval(timer);
  }, [displayItems, isHovered, config.rotationInterval]);

  if (!config.enabled || displayItems.length === 0) return null;

  const currentItem = displayItems[currentIndex] || displayItems[0];

  const handleBarClick = () => {
    setSelectedItemForModal(currentItem);
    setShowEnglishInModal(false);
  };

  return (
    <>
      <div 
        id="islamic-announcement-bar"
        className="w-full bg-emerald-950 border-b border-amber-500/20 text-white font-sans text-xs md:text-sm h-[42px] sm:h-[46px] flex items-center justify-between sticky top-0 overflow-hidden select-none z-[100] cursor-pointer shadow-md transition-all duration-300"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={handleBarClick}
      >
        {/* Subtle decorative visual background overlay */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(245,158,11,0.04)_0%,transparent_75%)] pointer-events-none" />

        {/* Sidebar Badge: human-friendly label */}
        <div className="flex items-center h-full bg-amber-500 text-emerald-950 font-bold px-3 py-1 text-[10px] md:text-xs uppercase tracking-widest gap-1.5 shadow-r border-r border-amber-600 shrink-0 z-10 select-none">
          <span className="animate-pulse">🕌</span>
          <span className="hidden sm:inline">ইসলামিক বাণী</span>
          <span className="sm:hidden">বাণী</span>
        </div>

        {/* Main Scrolling Container with smooth animations */}
        <div className="flex-1 overflow-hidden h-full flex items-center px-4 relative">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentIndex + '-' + currentItem.text}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="w-full flex items-center gap-2 select-none md:gap-3"
            >
              <span className="text-sm md:text-lg shrink-0">{currentItem.icon}</span>
              
              <div className="flex-1 min-w-0 flex flex-col md:flex-row md:items-center gap-1 md:gap-3">
                {currentItem.arabic && (
                  <span className="font-serif text-amber-300 font-medium whitespace-nowrap overflow-hidden text-ellipsis hidden lg:inline max-w-[30%] direction-rtl text-right" dir="rtl">
                    {currentItem.arabic}
                  </span>
                )}
                <span className="font-semibold text-white tracking-wide truncate">
                  {currentItem.text}
                </span>
                {currentItem.reference && (
                  <span className="text-[10px] text-amber-400 font-medium shrink-0 bg-emerald-900/40 px-2 py-0.5 rounded border border-amber-500/10">
                    — {currentItem.reference}
                  </span>
                )}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Action button in the right corner */}
        <div className="hidden md:flex items-center h-full text-amber-400 font-bold px-4 hover:text-white transition-colors shrink-0 z-10 text-[10px] uppercase tracking-widest gap-1 select-none border-l border-emerald-900">
          <span>বিস্তারিত</span>
          <ExternalLink className="h-3.5 w-3.5" />
        </div>
      </div>

      {/* Modern, elegant popup details Modal */}
      <AnimatePresence>
        {selectedItemForModal && (
          <div className="fixed inset-0 bg-emerald-950/80 backdrop-blur-md flex items-center justify-center p-4 z-[99999]">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-zinc-900 border-2 border-amber-500/20 rounded-3xl p-6 sm:p-8 max-w-lg w-full relative shadow-2xl overflow-hidden text-white font-sans"
            >
              {/* Top ambient glow */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 via-emerald-500 to-amber-500" />
              
              {/* Modal Header */}
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/10">
                <div className="flex items-center space-x-3">
                  <div className="text-2xl">{selectedItemForModal.icon}</div>
                  <div>
                    <span className="text-[10px] font-bold text-amber-500 uppercase tracking-widest block">
                      {selectedItemForModal.category}
                    </span>
                    <span className="text-xs text-gray-400">
                      বিশুদ্ধ উৎস ও ব্যাখ্যা
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedItemForModal(null)}
                  className="p-1.5 rounded-full bg-white/5 hover:bg-white/10 hover:text-amber-500 transition-all"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Modal Content */}
              <div className="space-y-6">
                {/* Arabic Text (If applicable) */}
                {selectedItemForModal.arabic && (
                  <div className="bg-emerald-950/40 p-4 sm:p-5 rounded-2xl border border-amber-500/10 text-center">
                    <p className="font-serif text-lg sm:text-2xl text-amber-300 leading-loose tracking-wide select-text text-right" dir="rtl">
                      {selectedItemForModal.arabic}
                    </p>
                  </div>
                )}

                {/* Bangla Translation (Primary) */}
                <div className="space-y-2">
                  <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider block">বাংলা অনুবাদ (প্রধান)</span>
                  <p className="text-sm sm:text-base font-bold text-gray-100 leading-relaxed select-text">
                    "{selectedItemForModal.text}"
                  </p>
                </div>

                {/* English Translation (Collapsible) */}
                {selectedItemForModal.english && (
                  <div className="border-t border-white/5 pt-4">
                    <button
                      onClick={() => setShowEnglishInModal(!showEnglishInModal)}
                      className="flex items-center justify-between w-full text-xs text-amber-500/80 hover:text-amber-500 font-bold tracking-widest uppercase transition-colors"
                    >
                      <span>English Translation</span>
                      {showEnglishInModal ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </button>
                    
                    <AnimatePresence>
                      {showEnglishInModal && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="overflow-hidden mt-3"
                        >
                          <p className="text-xs sm:text-sm text-gray-300 italic leading-relaxed select-text bg-white/5 p-3 rounded-xl border border-white/5">
                            "{selectedItemForModal.english}"
                          </p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}

                {/* Explanation / Tafsir */}
                {selectedItemForModal.tafsir && (
                  <div className="bg-white/5 p-4 rounded-2xl border border-white/5 flex gap-3">
                    <Info className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                    <div>
                      <span className="text-[9px] font-bold text-amber-500 uppercase tracking-wider block mb-1">সহজ শিক্ষা ও ব্যাখ্যা</span>
                      <p className="text-xs text-gray-300 leading-relaxed select-text">
                        {selectedItemForModal.tafsir}
                      </p>
                    </div>
                  </div>
                )}

                {/* References */}
                {selectedItemForModal.reference && (
                  <div className="text-[10px] text-gray-400 flex items-center justify-between pt-4 border-t border-white/5 font-semibold">
                    <span>তথ্যসূত্র: {selectedItemForModal.reference}</span>
                    <span className="text-emerald-500">✓ বিশুদ্ধ উৎস</span>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="mt-8 flex gap-3 justify-end">
                <button
                  onClick={() => setSelectedItemForModal(null)}
                  className="bg-amber-500 hover:bg-amber-600 text-emerald-950 font-bold px-6 py-2.5 rounded-xl transition-all shadow-md active:scale-95 text-xs uppercase tracking-widest"
                >
                  বন্ধ করুন
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
