import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp, HelpCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';
import { SiteSettings } from '../types';

export default function FAQ() {
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [activeIndex, setActiveIndex] = useState<number | null>(0);

  useEffect(() => {
    async function fetchSettings() {
      const docRef = doc(db, 'settings', 'site');
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setSettings(docSnap.data() as SiteSettings);
      }
    }
    fetchSettings();
  }, []);

  const defaultFaqs = [
    {
      question: "How do I invest in a farm project?",
      answer: "To invest, simply browse our active projects, select one that interests you, and click 'Invest'. You'll need to be logged in with your Google account. You can track your investment progress directly from your dashboard."
    },
    {
      question: "What are the expected returns on investments?",
      answer: "Returns vary by project and are detailed in each project's description. Typically, our projects aim for a 10-15% annual return, though this depends on farm productivity and market conditions."
    },
    {
      question: "Is my investment secure?",
      answer: "AgroVest uses smart management and real-time tracking to minimize risks. While all investments carry some risk, we provide full transparency into farm operations and financial reporting."
    },
    {
      question: "Can I visit the farm?",
      answer: "Yes! We encourage our investors to visit the farms they support. Please contact us to schedule a guided tour of our facilities."
    },
    {
      question: "How do I order products?",
      answer: "Visit our Shop section, add products to your cart, and place an order. You'll receive a notification when your fresh farm products are ready for pickup or delivery."
    }
  ];

  const faqs = settings?.faqSection?.faqs || defaultFaqs;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
      <div className="text-center mb-16">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-green-50 rounded-2xl mb-6">
          <HelpCircle className="h-8 w-8 text-green-600" />
        </div>
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          {settings?.faqSection?.headline || "Frequently Asked Questions"}
        </h1>
        <p className="text-gray-600">
          {settings?.faqSection?.description || "Everything you need to know about AgroVest and our farming ecosystem."}
        </p>
      </div>

      <div className="space-y-4">
        {faqs.map((faq, idx) => (
          <div 
            key={idx}
            className={cn(
              "border border-gray-100 rounded-2xl overflow-hidden transition-all",
              activeIndex === idx ? "bg-white shadow-lg shadow-green-50" : "bg-white hover:bg-gray-50"
            )}
          >
            <button
              onClick={() => setActiveIndex(activeIndex === idx ? null : idx)}
              className="w-full flex items-center justify-between p-6 text-left"
            >
              <span className="font-bold text-gray-900">{faq.question}</span>
              {activeIndex === idx ? (
                <ChevronUp className="h-5 w-5 text-green-600" />
              ) : (
                <ChevronDown className="h-5 w-5 text-gray-400" />
              )}
            </button>
            <AnimatePresence>
              {activeIndex === idx && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="px-6 pb-6 text-gray-600 text-sm leading-relaxed border-t border-gray-50 pt-4">
                    {faq.answer}
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
