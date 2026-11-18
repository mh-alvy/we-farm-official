import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Leaf, Heart, ShieldCheck } from 'lucide-react';
import { db } from '../firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { SiteSettings } from '../types';
import { useLanguage } from '../lib/LanguageContext';
import { DEFAULT_SITE_SETTINGS, mergeSiteSettings } from '../lib/siteSettingsDefaults';

export default function About() {
  const { language, t } = useLanguage();
  const isBn = language === 'bn';
  const pick = (enVal?: string, bnVal?: string, fallback?: string) =>
    isBn
      ? (bnVal && bnVal.trim() ? bnVal : fallback || enVal || '')
      : (enVal && enVal.trim() ? enVal : fallback || bnVal || '');
  const [settings, setSettings] = useState<SiteSettings>(DEFAULT_SITE_SETTINGS);

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

  const values = [
    {
      title: t('about.val1'),
      description: t('about.val1Desc'),
      icon: Leaf
    },
    {
      title: t('about.val2'),
      description: t('about.val2Desc'),
      icon: Heart
    },
    {
      title: t('about.val3'),
      description: t('about.val3Desc'),
      icon: ShieldCheck
    }
  ];

  return (
    <div className="py-16">
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
          {/* Left Column: About WeFarm & Core Values */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="lg:col-span-7"
          >
            <span className="text-xs font-bold tracking-[0.2em] text-[#8B735B] uppercase mb-3 block">
              {pick(settings?.aboutUsSection?.promise?.tagline, settings?.aboutUsSection?.promise?.taglineBn, t('about.tagline'))}
            </span>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-[#1A2E26] mb-4 leading-tight whitespace-pre-line">
              {pick(settings?.aboutUsSection?.promise?.headline, settings?.aboutUsSection?.promise?.headlineBn, t('about.headline'))}
            </h1>
            <p className="text-base sm:text-lg text-gray-600 mb-7 leading-relaxed">
              {pick(settings?.aboutUsSection?.promise?.description, settings?.aboutUsSection?.promise?.descriptionBn, t('about.desc'))}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-7">
              {values.map((value, idx) => (
                <div key={idx} className="bg-[#F7F8F2] p-4 rounded-2xl border border-green-100/60 flex flex-col">
                  <div className="bg-white w-10 h-10 rounded-xl flex items-center justify-center mb-3 shadow-xs">
                    <value.icon className="h-5 w-5 text-green-700" />
                  </div>
                  <h3 className="font-bold text-[#1A2E26] text-sm mb-1">{value.title}</h3>
                  <p className="text-xs text-gray-500 leading-relaxed">{value.description}</p>
                </div>
              ))}
            </div>

            {/* Integrated Our Vision Card inside About WeFarm */}
            <div className="bg-gradient-to-br from-[#F7F8F2] to-green-50/50 border border-green-100 rounded-3xl p-6 shadow-xs">
              <div className="flex items-center space-x-2 mb-2">
                <span className="w-2 h-2 rounded-full bg-green-600" />
                <h2 className="text-sm font-extrabold uppercase tracking-wider text-[#1A2E26]">
                  {pick(settings?.aboutUsSection?.vision?.headline, settings?.aboutUsSection?.vision?.headlineBn, t('about.vision'))}
                </h2>
              </div>
              <p className="text-sm sm:text-base text-gray-600 leading-relaxed italic">
                {pick(settings?.aboutUsSection?.vision?.description, settings?.aboutUsSection?.vision?.descriptionBn, t('about.visionDesc'))}
              </p>
            </div>
          </motion.div>

          {/* Right Column: Farm Image */}
          <div className="lg:col-span-5 relative">
            <img
              src={settings?.aboutUsSection?.promise?.imageUrl || "https://images.unsplash.com/photo-1500651230702-0e2d8a49d4ad?auto=format&fit=crop&q=80&w=1000"}
              alt="Farm soil"
              className="w-full h-full max-h-[520px] object-cover rounded-[36px] shadow-2xl"
              referrerPolicy="no-referrer"
            />
          </div>
        </div>
      </section>
    </div>
  );
}
