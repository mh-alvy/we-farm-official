import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp, HelpCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { db } from '../firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { SiteSettings } from '../types';
import { useLanguage } from '../lib/LanguageContext';
import { DEFAULT_SITE_SETTINGS, mergeSiteSettings } from '../lib/siteSettingsDefaults';

export default function FAQ() {
  const { language, t } = useLanguage();
  const isBn = language === 'bn';
  const pick = (enVal?: string, bnVal?: string, fallback?: string) =>
    isBn
      ? (bnVal && bnVal.trim() ? bnVal : fallback || enVal || '')
      : (enVal && enVal.trim() ? enVal : fallback || bnVal || '');
  const [settings, setSettings] = useState<SiteSettings>(DEFAULT_SITE_SETTINGS);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'site'), (docSnap) => {
      if (docSnap.exists()) {
        setSettings(mergeSiteSettings(docSnap.data() as SiteSettings));
      } else {
        setSettings(DEFAULT_SITE_SETTINGS);
      }
    });
    return unsub;
  }, []);

  const defaultFaqs = DEFAULT_SITE_SETTINGS.faqSection.faqs;
  const faqs = settings?.faqSection?.faqs || defaultFaqs;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-12">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-11 h-11 bg-green-50 rounded-xl mb-3">
          <HelpCircle className="h-5 w-5 text-green-600" />
        </div>
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
          {pick(settings?.faqSection?.headline, settings?.faqSection?.headlineBn, t('faq.headline'))}
        </h1>
        <p className="text-sm text-gray-600 max-w-xl mx-auto">
          {pick(settings?.faqSection?.description, settings?.faqSection?.descriptionBn, t('faq.desc'))}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-start">
        {faqs.map((faq, idx) => (
          <div
            key={idx}
            className={cn(
              "border border-gray-100 rounded-xl overflow-hidden transition-all",
              activeIndex === idx ? "bg-white shadow-md shadow-green-50/80 border-green-100" : "bg-white hover:bg-gray-50/80"
            )}
          >
            <button
              onClick={() => setActiveIndex(activeIndex === idx ? null : idx)}
              className="w-full flex items-center justify-between px-4 py-3.5 text-left gap-3 cursor-pointer"
            >
              <span className="font-bold text-sm text-gray-900 leading-snug">
                {pick(faq.question, faq.questionBn, defaultFaqs[idx]?.question)}
              </span>
              {activeIndex === idx ? (
                <ChevronUp className="h-4 w-4 text-green-600 shrink-0" />
              ) : (
                <ChevronDown className="h-4 w-4 text-gray-400 shrink-0" />
              )}
            </button>
            <AnimatePresence>
              {activeIndex === idx && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="px-4 pb-3.5 pt-2.5 text-gray-600 text-xs sm:text-sm leading-relaxed border-t border-gray-50">
                    {pick(faq.answer, faq.answerBn, defaultFaqs[idx]?.answer)}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>
    </div>
  );
}
