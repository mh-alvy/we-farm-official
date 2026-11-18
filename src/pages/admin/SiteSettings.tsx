import React, { useState, useEffect, useRef } from 'react';
import { db } from '../../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import {
  Save,
  Image as ImageIcon,
  Plus,
  X,
  Layout,
  Type,
  Info,
  CheckCircle2,
  ShieldAlert,
  Sparkles,
  Languages,
  Loader2
} from 'lucide-react';
import { SiteSettings } from '../../types';
import { motion } from 'motion/react';
import ImageUploader from '../../components/ImageUploader';
import AdminAICopywriter from '../../components/AdminAICopywriter';
import { cn } from '../../lib/utils';
import { mergeSiteSettings } from '../../lib/siteSettingsDefaults';

const DEFAULT_SETTINGS: SiteSettings = {
  logo: {
    navLogoUrl: '',
    footerLogoUrl: '',
    navLogoHeight: 24,
    footerLogoHeight: 32
  },
  hero: {
    tagline: 'SOIL TO SOUL',
    taglineBn: 'মাটি থেকে আত্মার বন্ধন',
    title: 'Fresh Farm Products From Our Farm',
    titleBn: 'আমাদের খামার থেকে সরাসরি তাজা ও বিশুদ্ধ পণ্য',
    titles: [
      'Fresh Farm Products From Our Farm',
      'Honest Food from Honest Soil',
      'Experience Regenerative Agriculture'
    ],
    titlesBn: [
      'আমাদের খামার থেকে সরাসরি তাজা ও বিশুদ্ধ পণ্য',
      'খাঁটি মাটির নির্ভেজাল ও নিরাপদ খাবার',
      'প্রকৃতিবান্ধব আধুনিক কৃষির অনন্য অভিজ্ঞতা'
    ],
    titleInterval: 5000,
    description:
      'Rooted in the philosophy of Soil to Soul. We practice regenerative farming to bring you meat and dairy that nourishes the body and respects the earth.',
    descriptionBn:
      'মাটি থেকে আত্মার দর্শনে অনুপ্রাণিত হয়ে আমরা প্রাকৃতিক ও টেকসই পদ্ধতিতে খামার পরিচালনা করি—যেন প্রতিটি খাবারে থাকে বিশুদ্ধ পুষ্টি এবং প্রকৃতির প্রতি ভালোবাসা।',
    images: ['https://images.unsplash.com/photo-1500595046743-cd271d694d30?auto=format&fit=crop&q=80&w=1200'],
    useScrollEffect: true,
    bgImageUrl: '',
    bgImageOpacity: 40
  },
  featuresSection: {
    tagline: 'WHY CHOOSE US',
    taglineBn: 'কেন আমাদের বেছে নেবেন',
    headline: 'Experience the Difference of Real Farming',
    headlineBn: 'প্রকৃত ও প্রাকৃতিক খামারের পার্থক্য অনুভব করুন',
    features: [
      {
        title: 'Natural Farming',
        titleBn: 'প্রাকৃতিক কৃষি পদ্ধতি',
        description: 'Regenerative practices that work with nature, not against it.',
        descriptionBn: 'প্রকৃতির সাথে সামঞ্জস্য রেখে মাটির উর্বরতা ও পরিবেশ রক্ষাকারী কৃষি ব্যবস্থা।',
        iconName: 'Leaf'
      },
      {
        title: 'Healthy Animals',
        titleBn: 'সুস্থ ও সবল প্রাণিসম্পদ',
        description: 'Free-range livestock raised on natural diets without hormones.',
        descriptionBn: 'কোনো ক্ষতিকর হরমোন বা অ্যান্টিবায়োটিক ছাড়াই প্রাকৃতিক খাদ্যে বেড়ে ওঠা গবাদিপশু।',
        iconName: 'Heart'
      },
      {
        title: 'Fresh Products',
        titleBn: 'সতেজ ও নির্ভেজাল পণ্য',
        description: 'Farm-to-table freshness delivered with care and speed.',
        descriptionBn: 'খামার থেকে সরাসরি আপনার ঘরে যত্ন ও দ্রুততার সাথে পৌঁছে দেওয়া তাজা পণ্য।',
        iconName: 'Zap'
      },
      {
        title: 'Trusted Farm',
        titleBn: 'বিশ্বস্ত ও স্বচ্ছ ব্যবস্থাপনা',
        description: 'Transparent practices you can trust, from soil to soul.',
        descriptionBn: 'মাটি থেকে পাত পর্যন্ত শতভাগ স্বচ্ছ ও নির্ভরযোগ্য খামার ব্যবস্থাপনা।',
        iconName: 'CheckCircle'
      }
    ]
  },
  statsSection: {
    stats: [
      { value: '50+', valueBn: '৫০+', label: 'Happy Animals', labelBn: 'সুস্থ প্রাণিসম্পদ' },
      { value: '100%', valueBn: '১০০%', label: 'Natural Soil', labelBn: 'প্রাকৃতিক মাটি' },
      { value: '1000+', valueBn: '১০০০+', label: 'Fresh Deliveries', labelBn: 'সফল ডেলিভারি' },
      { value: '5+', valueBn: '৫+', label: 'Successful Projects', labelBn: 'সফল প্রোজেক্ট' }
    ]
  },
  aboutUsSection: {
    promise: {
      tagline: 'ABOUT WEFARM',
      taglineBn: 'উইফার্ম সম্পর্কে',
      headline: 'From Soil to Soul — Our Promise',
      headlineBn: 'মাটি থেকে আত্মা — আমাদের অঙ্গীকার',
      description:
        "WeFarm was born from a belief that food should be grown with integrity. We're a family-run regenerative farm committed to nourishing communities while healing the land.",
      descriptionBn:
        'খাদ্য উৎপাদনে সততা ও বিশুদ্ধতার বিশ্বাস থেকেই উইফার্মের জন্ম। আমরা একটি পারিবারিক ও প্রকৃতিবান্ধব খামার, যা মাটির স্বাস্থ্য রক্ষা করে মানুষের কাছে পুষ্টিকর খাবার পৌঁছে দিতে প্রতিশ্রুতিবদ্ধ।',
      imageUrl: 'https://images.unsplash.com/photo-1500651230702-0e2d8a49d4ad?auto=format&fit=crop&q=80&w=1000'
    },
    vision: {
      headline: 'Our Vision',
      headlineBn: 'আমাদের লক্ষ্য ও স্বপ্ন',
      description:
        '"To create a world where every meal is a connection to the earth, where farming heals instead of harms, and where communities thrive on the bounty of honest soil."',
      descriptionBn:
        '"এমন এক পৃথিবী গড়ে তোলা যেখানে প্রতিটি খাবার হবে প্রকৃতির সাথে সেতুবন্ধন, যেখানে কৃষি প্রকৃতিকে ক্ষতির বদলে সজীব করবে এবং মানুষ খাঁটি মাটির ফসলে সমৃদ্ধ হবে।"'
    }
  },
  productsSection: {
    tagline: 'OUR PRODUCTS',
    taglineBn: 'আমাদের পণ্যসমূহ',
    headline: 'Honest Food from Honest Soil',
    headlineBn: 'খাঁটি মাটির নির্ভেজাল ও তাজা খাবার',
    description: 'Fresh products directly from WeFarm to your table.',
    descriptionBn: 'উইফার্মের খামার থেকে সরাসরি আপনার খাবার টেবিলে তাজা ও অর্গানিক পণ্য।'
  },
  investSection: {
    tagline: 'OUR PROJECTS',
    taglineBn: 'আমাদের প্রোজেক্টসমূহ',
    headline: 'Invest in Sustainable Future',
    headlineBn: 'টেকসই ও সবুজ ভবিষ্যতে বিনিয়োগ করুন',
    description:
      'Join the Soil to Soul movement. Support our regenerative farming projects and earn returns while healing the earth.',
    descriptionBn:
      'মাটি থেকে আত্মার এই যাত্রায় যুক্ত হোন। আমাদের প্রকৃতিবান্ধব কৃষি প্রোজেক্টে বিনিয়োগ করে হালাল ও স্বচ্ছ লভ্যাংশ অর্জনের পাশাপাশি প্রকৃতি রক্ষায় অংশ নিন।'
  },
  contactSection: {
    tagline: 'GET IN TOUCH',
    taglineBn: 'যোগাযোগ করুন',
    headline: 'Contact WeFarm',
    headlineBn: 'উইফার্মের সাথে যোগাযোগ করুন',
    description: "Reach out via WhatsApp or fill the form below — we'd love to hear from you.",
    descriptionBn: 'হোয়াটসঅ্যাপের মাধ্যমে বা নিচের ফর্মটি পূরণ করে আমাদের সাথে যোগাযোগ করুন — আমরা আপনার বার্তার অপেক্ষায় আছি।',
    info: {
      location: {
        title: 'Location',
        titleBn: 'ঠিকানা',
        text: '123 Farm Road, Dhaka, Bangladesh',
        textBn: '১২৩ ফার্ম রোড, ঢাকা, বাংলাদেশ'
      },
      whatsapp: {
        title: 'WhatsApp',
        titleBn: 'হোয়াটসঅ্যাপ',
        text: '+8801538392111',
        textBn: '+8801538392111'
      },
      email: {
        title: 'Email',
        titleBn: 'ইমেইল',
        text: 'wefarm.bd@gmail.com',
        textBn: 'wefarm.bd@gmail.com'
      }
    }
  },
  faqSection: {
    headline: 'Frequently Asked Questions',
    headlineBn: 'সচরাচর জিজ্ঞাসিত প্রশ্নাবলী (FAQ)',
    description: 'Everything you need to know about WeFarm and our farming ecosystem.',
    descriptionBn: 'উইফার্ম এবং আমাদের কৃষি ও বিনিয়োগ ব্যবস্থা সম্পর্কে আপনার মনে থাকা সকল প্রশ্নের উত্তর।',
    faqs: [
      {
        question: 'How do I invest in a farm project?',
        questionBn: 'আমি কীভাবে একটি কৃষি প্রোজেক্টে বিনিয়োগ করতে পারি?',
        answer:
          "To invest, simply browse our active projects, select one that interests you, and click 'Invest'. You'll need to be logged in with your account. You can track your investment progress directly from your dashboard.",
        answerBn:
          'বিনিয়োগ করতে আমাদের চলমান প্রোজেক্টগুলো দেখুন, আপনার পছন্দের প্রোজেক্টটি সিলেক্ট করে "Invest" বাটনে ক্লিক করুন। আপনার একাউন্ট দিয়ে লগইন করে সহজেই প্রোফাইল ড্যাশবোর্ড থেকে বিনিয়োগ ও প্রফিট ট্র্যাক করতে পারবেন।'
      },
      {
        question: 'What are the expected returns on investments?',
        questionBn: 'বিনিয়োগে কেমন লভ্যাংশ পাওয়া যায়?',
        answer:
          "Returns vary by project and are detailed in each project's description. Typically, our projects offer transparent monthly or one-time profit sharing based on real farm productivity.",
        answerBn:
          'প্রতিটি প্রোজেক্টের ধরন অনুযায়ী লভ্যাংশের হার প্রোজেক্টের বিস্তারিত অংশে উল্লেখ থাকে। আমাদের প্রোজেক্টগুলোতে মাসিক লভ্যাংশ অথবা এককালীন প্রফিট শেয়ারিং পদ্ধতিতে স্বচ্ছভাবে মুনাফা প্রদান করা হয়।'
      },
      {
        question: 'Is my investment secure?',
        questionBn: 'আমার বিনিয়োগ কি নিরাপদ?',
        answer:
          'WeFarm uses smart management and real-time tracking to minimize risks. While all agricultural investments carry natural dynamics, we provide full transparency into farm operations and financial reporting.',
        answerBn:
          'উইফার্ম আধুনিক ব্যবস্থাপনা ও নিয়মিত তদারকির মাধ্যমে ঝুঁকি সর্বনিম্ন রাখে। খামারের প্রতিটি ধাপের কার্যক্রম ও আর্থিক প্রতিবেদনে শতভাগ স্বচ্ছতা বজায় রাখা হয়।'
      },
      {
        question: 'Can I visit the farm?',
        questionBn: 'আমি কি সরাসরি খামার পরিদর্শন করতে পারব?',
        answer:
          'Yes! We encourage our investors to visit the farms they support. Please contact us to schedule a guided tour of our facilities.',
        answerBn:
          'হ্যাঁ, অবশ্যই! আমরা আমাদের সম্মানিত ইনভেস্টরদের খামার পরিদর্শনে উৎসাহিত করি। আমাদের সাথে যোগাযোগ করে যেকোনো সুবিধাজনক সময়ে খামার ঘুরে দেখতে পারেন।'
      },
      {
        question: 'How do I order products?',
        questionBn: 'আমি কীভাবে খামারের পণ্য অর্ডার করব?',
        answer:
          "Visit our Shop section, select the fresh farm products you need, and place an order. You'll receive a confirmation when your products are ready for delivery.",
        answerBn:
          'আমাদের ওয়েবসাইটের পণ্য সেকশনে গিয়ে আপনার পছন্দের তাজা পণ্য সিলেক্ট করে অর্ডার সম্পন্ন করুন। খুব দ্রুত আপনার ঠিকানায় বিশুদ্ধ পণ্য পৌঁছে যাবে।'
      }
    ]
  }
};

interface BilingualInputProps {
  label: string;
  enValue: string;
  bnValue: string;
  onChange: (nextEn: string, nextBn: string) => void;
  multiline?: boolean;
  rows?: number;
  contextHint?: string;
  enPlaceholder?: string;
  bnPlaceholder?: string;
  onOpenAiCopywriter?: () => void;
  onNotify?: (type: 'success' | 'error', text: string) => void;
}

function BilingualField({
  label,
  enValue,
  bnValue,
  onChange,
  multiline = false,
  rows = 3,
  contextHint = 'website content',
  enPlaceholder = 'Type in English...',
  bnPlaceholder = 'বাংলায় লিখুন...',
  onOpenAiCopywriter,
  onNotify
}: BilingualInputProps) {
  const [translatingDir, setTranslatingDir] = useState<'en_to_bn' | 'bn_to_en' | null>(null);

  const handleTranslate = async (direction: 'en_to_bn' | 'bn_to_en') => {
    const sourceText = direction === 'en_to_bn' ? enValue : bnValue;
    if (!sourceText || !sourceText.trim()) {
      onNotify?.(
        'error',
        direction === 'en_to_bn'
          ? 'প্রথমে ইংরেজি বক্সে কিছু লিখুন, তারপর AI বাংলায় কনভার্ট করবে।'
          : 'প্রথমে বাংলা বক্সে কিছু লিখুন, তারপর AI ইংরেজিতে কনভার্ট করবে।'
      );
      return;
    }

    setTranslatingDir(direction);
    try {
      const response = await fetch('/api/ai/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: sourceText,
          sourceLang: direction === 'en_to_bn' ? 'en' : 'bn',
          targetLang: direction === 'en_to_bn' ? 'bn' : 'en',
          fieldContext: `${label} (${contextHint})`
        })
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'AI translation failed');
      }
      if (direction === 'en_to_bn') {
        onChange(enValue, data.translatedText);
      } else {
        onChange(data.translatedText, bnValue);
      }
    } catch (err: any) {
      console.error('Translation error:', err);
      onNotify?.('error', err.message || 'AI কনভার্ট করতে সমস্যা হয়েছে।');
    } finally {
      setTranslatingDir(null);
    }
  };

  return (
    <div className="p-4 rounded-2xl bg-gray-50/70 border border-gray-100 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label className="text-[10px] font-extrabold text-gray-500 uppercase tracking-widest flex items-center space-x-1.5">
          <Type className="h-3 w-3 text-green-600" />
          <span>{label}</span>
        </label>
        {onOpenAiCopywriter && (
          <button
            type="button"
            onClick={onOpenAiCopywriter}
            className="text-[10px] font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200/70 px-2.5 py-1 rounded-lg transition-all flex items-center space-x-1 cursor-pointer"
          >
            <Sparkles className="h-3 w-3" />
            <span>AI Ideas</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* English Side */}
        <div className="bg-white p-3 rounded-xl border border-gray-200/80 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md">
              English (EN)
            </span>
            <button
              type="button"
              disabled={translatingDir !== null}
              onClick={() => handleTranslate('en_to_bn')}
              className="inline-flex items-center space-x-1 text-[10px] font-bold px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200/80 transition-all cursor-pointer disabled:opacity-50"
              title="ইংরেজি লেখাটি AI এর মাধ্যমে গুছিয়ে বাংলায় কনভার্ট করুন"
            >
              {translatingDir === 'en_to_bn' ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Sparkles className="h-3 w-3" />
              )}
              <span>AI বাংলায় কনভার্ট →</span>
            </button>
          </div>

          {multiline ? (
            <textarea
              rows={rows}
              value={enValue || ''}
              onChange={(e) => onChange(e.target.value, bnValue)}
              placeholder={enPlaceholder}
              className="w-full px-3 py-2 bg-gray-50/70 border border-gray-100 rounded-lg focus:bg-white focus:ring-2 focus:ring-green-500/20 focus:border-green-500 outline-none transition-all text-xs sm:text-sm font-medium text-gray-900 leading-relaxed"
            />
          ) : (
            <input
              type="text"
              value={enValue || ''}
              onChange={(e) => onChange(e.target.value, bnValue)}
              placeholder={enPlaceholder}
              className="w-full px-3 py-2 bg-gray-50/70 border border-gray-100 rounded-lg focus:bg-white focus:ring-2 focus:ring-green-500/20 focus:border-green-500 outline-none transition-all text-xs sm:text-sm font-bold text-gray-900"
            />
          )}
        </div>

        {/* Bengali Side */}
        <div className="bg-white p-3 rounded-xl border border-emerald-200/80 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md">
              বাংলা (BN)
            </span>
            <button
              type="button"
              disabled={translatingDir !== null}
              onClick={() => handleTranslate('bn_to_en')}
              className="inline-flex items-center space-x-1 text-[10px] font-bold px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200/80 transition-all cursor-pointer disabled:opacity-50"
              title="বাংলা লেখাটি AI এর মাধ্যমে গুছিয়ে ইংরেজিতে কনভার্ট করুন"
            >
              {translatingDir === 'bn_to_en' ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Sparkles className="h-3 w-3" />
              )}
              <span>← AI Convert to English</span>
            </button>
          </div>

          {multiline ? (
            <textarea
              rows={rows}
              value={bnValue || ''}
              onChange={(e) => onChange(enValue, e.target.value)}
              placeholder={bnPlaceholder}
              className="w-full px-3 py-2 bg-emerald-50/20 border border-emerald-100 rounded-lg focus:bg-white focus:ring-2 focus:ring-green-500/20 focus:border-green-500 outline-none transition-all text-xs sm:text-sm font-medium text-gray-900 leading-relaxed"
            />
          ) : (
            <input
              type="text"
              value={bnValue || ''}
              onChange={(e) => onChange(enValue, e.target.value)}
              placeholder={bnPlaceholder}
              className="w-full px-3 py-2 bg-emerald-50/20 border border-emerald-100 rounded-lg focus:bg-white focus:ring-2 focus:ring-green-500/20 focus:border-green-500 outline-none transition-all text-xs sm:text-sm font-bold text-gray-900"
            />
          )}
        </div>
      </div>
    </div>
  );
}

export default function AdminSiteSettings() {
  const [settings, setSettings] = useState<SiteSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [rotatingTranslateIdx, setRotatingTranslateIdx] = useState<{ idx: number; dir: 'en_to_bn' | 'bn_to_en' } | null>(null);
  const [newImageUrl, setNewImageUrl] = useState('');
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const [aiModalState, setAiModalState] = useState<{
    isOpen: boolean;
    type: 'hero_heading' | 'hero_tagline' | 'project_pitch' | 'product_description' | 'about_story' | 'custom';
    input: string;
    fieldTarget?: string;
  }>({
    isOpen: false,
    type: 'hero_heading',
    input: ''
  });

  const showNotice = (type: 'success' | 'error', text: string) => {
    setActionMessage({ type, text });
    setTimeout(() => setActionMessage(null), 4500);
  };

  const handleApplyAICopy = (selectedText: string) => {
    if (aiModalState.fieldTarget === 'hero_title') {
      const updatedTitles = [...(settings.hero.titles || [])];
      if (updatedTitles.length > 0) updatedTitles[0] = selectedText;
      else updatedTitles.push(selectedText);
      setSettings({
        ...settings,
        hero: { ...settings.hero, title: selectedText, titles: updatedTitles }
      });
    } else if (aiModalState.fieldTarget === 'hero_tagline') {
      setSettings({
        ...settings,
        hero: { ...settings.hero, tagline: selectedText }
      });
    } else if (aiModalState.fieldTarget === 'hero_description') {
      setSettings({
        ...settings,
        hero: { ...settings.hero, description: selectedText }
      });
    }
  };

  useEffect(() => {
    async function fetchSettings() {
      try {
        const docRef = doc(db, 'settings', 'site');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data() as SiteSettings;
          const merged = mergeSiteSettings(data);
          setSettings(merged);

          // Automatically persist merged Bengali (*Bn) fields if Firestore doc was missing them
          const needsBackfill =
            !data.hero?.taglineBn ||
            !data.hero?.titleBn ||
            !data.featuresSection?.taglineBn ||
            !data.aboutUsSection?.promise?.taglineBn ||
            !data.productsSection?.taglineBn ||
            !data.investSection?.taglineBn ||
            !data.contactSection?.taglineBn ||
            !data.faqSection?.headlineBn;
          if (needsBackfill) {
            setDoc(docRef, merged).catch(() => {});
          }
        } else {
          await setDoc(docRef, DEFAULT_SETTINGS);
          setSettings(DEFAULT_SETTINGS);
        }
      } catch (error) {
        console.error('Error fetching settings:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchSettings();
  }, []);

  const handleTranslateRotatingHeading = async (idx: number, dir: 'en_to_bn' | 'bn_to_en') => {
    const enList = [...(settings.hero.titles || [settings.hero.title])];
    const bnList = [...(settings.hero.titlesBn || enList.map(() => ''))];
    const sourceText = dir === 'en_to_bn' ? enList[idx] : bnList[idx];

    if (!sourceText || !sourceText.trim()) {
      showNotice(
        'error',
        dir === 'en_to_bn'
          ? 'প্রথমে ইংরেজি রোটেটিং হেডিং লিখুন।'
          : 'প্রথমে বাংলা রোটেটিং হেডিং লিখুন।'
      );
      return;
    }

    setRotatingTranslateIdx({ idx, dir });
    try {
      const res = await fetch('/api/ai/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: sourceText,
          sourceLang: dir === 'en_to_bn' ? 'en' : 'bn',
          targetLang: dir === 'en_to_bn' ? 'bn' : 'en',
          fieldContext: 'Hero Rotating Banner Heading'
        })
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Translation failed');

      if (dir === 'en_to_bn') {
        bnList[idx] = data.translatedText;
        setSettings({
          ...settings,
          hero: {
            ...settings.hero,
            titlesBn: bnList,
            titleBn: idx === 0 ? data.translatedText : settings.hero.titleBn
          }
        });
      } else {
        enList[idx] = data.translatedText;
        setSettings({
          ...settings,
          hero: {
            ...settings.hero,
            titles: enList,
            title: idx === 0 ? data.translatedText : settings.hero.title
          }
        });
      }
    } catch (err: any) {
      showNotice('error', err.message || 'রোটেটিং হেডিং কনভার্ট করতে সমস্যা হয়েছে।');
    } finally {
      setRotatingTranslateIdx(null);
    }
  };

  const compressBase64IfNeeded = async (
    base64Str: string,
    maxWidth = 640,
    maxHeight = 480,
    quality = 0.5,
    forceJpeg = false
  ): Promise<string> => {
    if (!base64Str || !base64Str.startsWith('data:image/')) {
      return base64Str;
    }
    if (base64Str.length < 70000) {
      return base64Str;
    }
    return new Promise<string>((resolve) => {
      const img = new Image();
      img.src = base64Str;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height *= maxWidth / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width *= maxHeight / height;
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(base64Str);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        let compressed;
        const isPng = base64Str.startsWith('data:image/png');
        if (isPng && !forceJpeg) {
          compressed = canvas.toDataURL('image/png');
        } else {
          compressed = canvas.toDataURL('image/jpeg', quality);
        }

        if (compressed.length < base64Str.length) {
          resolve(compressed);
        } else {
          resolve(base64Str);
        }
      };
      img.onerror = () => {
        resolve(base64Str);
      };
    });
  };

  const compressSettingsImages = async (s: SiteSettings): Promise<SiteSettings> => {
    const cloned = JSON.parse(JSON.stringify(s)) as SiteSettings;

    if (cloned.logo?.navLogoUrl) {
      const isPng = cloned.logo.navLogoUrl.startsWith('data:image/png');
      cloned.logo.navLogoUrl = await compressBase64IfNeeded(cloned.logo.navLogoUrl, 240, 240, isPng ? 1.0 : 0.6);
    }
    if (cloned.logo?.footerLogoUrl) {
      const isPng = cloned.logo.footerLogoUrl.startsWith('data:image/png');
      cloned.logo.footerLogoUrl = await compressBase64IfNeeded(cloned.logo.footerLogoUrl, 240, 240, isPng ? 1.0 : 0.6);
    }

    if (cloned.hero?.images && cloned.hero.images.length > 0) {
      cloned.hero.images = await Promise.all(
        cloned.hero.images.map(img => compressBase64IfNeeded(img, 640, 480, 0.55, true))
      );
    }

    if (cloned.hero?.bgImageUrl) {
      cloned.hero.bgImageUrl = await compressBase64IfNeeded(cloned.hero.bgImageUrl, 640, 480, 0.55, true);
    }

    if (cloned.aboutUsSection?.promise?.imageUrl) {
      cloned.aboutUsSection.promise.imageUrl = await compressBase64IfNeeded(
        cloned.aboutUsSection.promise.imageUrl,
        640,
        480,
        0.55,
        true
      );
    }

    return cloned;
  };

  const handleSave = async () => {
    setSaving(true);
    setActionMessage(null);
    try {
      const optimizedSettings = await compressSettingsImages(settings);
      await setDoc(doc(db, 'settings', 'site'), optimizedSettings);
      setSettings(optimizedSettings);
      setActionMessage({ type: 'success', text: 'Site settings (English & বাংলা) updated successfully!' });
    } catch (error) {
      console.error('Error saving settings:', error);
      setActionMessage({ type: 'error', text: 'Failed to update site settings.' });
    } finally {
      setSaving(false);
      setTimeout(() => setActionMessage(null), 3500);
    }
  };

  const addImage = () => {
    if (!newImageUrl.trim()) return;
    setSettings({
      ...settings,
      hero: {
        ...settings.hero,
        images: [...settings.hero.images, newImageUrl.trim()]
      }
    });
    setNewImageUrl('');
  };

  const removeImage = (index: number) => {
    setSettings({
      ...settings,
      hero: {
        ...settings.hero,
        images: settings.hero.images.filter((_, i) => i !== index)
      }
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
      </div>
    );
  }

  const rotatingTitlesEn = settings.hero.titles || [settings.hero.title];
  const rotatingTitlesBn = settings.hero.titlesBn || rotatingTitlesEn.map(() => '');

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Top Header & Save / Bulk AI Translation Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center space-x-2">
            <span>Site Content Management</span>
            <span className="text-xs font-extrabold px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200">
              English + বাংলা (AI Bilingual)
            </span>
          </h1>
          <p className="text-gray-500 text-xs sm:text-sm mt-1">
            প্রতিটি টেক্সট ফিল্ডে ইংরেজি ও বাংলা দুটি অংশ রয়েছে। যেকোনো ভাষায় লিখে AI বাটনে ক্লিক করলে অপর ভাষায় গুছিয়ে কনভার্ট হয়ে যাবে।
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center justify-center space-x-2 bg-green-600 hover:bg-green-700 text-white font-bold py-2.5 px-6 rounded-xl transition-all shadow-md active:scale-[0.98] disabled:opacity-50 text-xs sm:text-sm cursor-pointer"
          >
            {saving ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            ) : (
              <>
                <Save className="h-4 w-4" />
                <span>Save Changes</span>
              </>
            )}
          </button>
        </div>
      </div>

      {actionMessage && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-4 rounded-2xl flex items-center space-x-3 text-sm ${
            actionMessage.type === 'success'
              ? 'bg-green-50 text-green-800 border border-green-200'
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}
        >
          {actionMessage.type === 'success' ? (
            <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
          ) : (
            <ShieldAlert className="h-5 w-5 text-red-600 shrink-0" />
          )}
          <span className="font-bold">{actionMessage.text}</span>
        </motion.div>
      )}

      {/* Logo Customization Editor */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="bg-gray-50 px-8 py-4 border-b border-gray-100 flex items-center space-x-3">
          <div className="bg-green-100 p-2 rounded-lg">
            <ImageIcon className="h-5 w-5 text-green-600" />
          </div>
          <h2 className="font-bold text-gray-900 uppercase tracking-widest text-xs">Site Logo & Branding</h2>
        </div>

        <div className="p-8 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Navbar Logo Config */}
            <div className="space-y-6">
              <h3 className="text-sm font-bold text-gray-900 border-b border-gray-100 pb-2 flex items-center space-x-2">
                <span className="w-2 h-2 rounded-full bg-green-500"></span>
                <span>Navigation Bar Logo</span>
              </h3>

              <div className="space-y-4">
                <ImageUploader
                  label="Upload Navigation Logo"
                  currentImageUrl={settings.logo?.navLogoUrl || ''}
                  onUploadSuccess={(url) =>
                    setSettings({
                      ...settings,
                      logo: {
                        ...(settings.logo || { navLogoHeight: 24, footerLogoHeight: 32 }),
                        navLogoUrl: url
                      }
                    })
                  }
                  onClear={() =>
                    setSettings({
                      ...settings,
                      logo: {
                        ...(settings.logo || { navLogoHeight: 24, footerLogoHeight: 32 }),
                        navLogoUrl: ''
                      }
                    })
                  }
                  folder="branding"
                />

                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">
                    Or Paste Navigation Logo URL
                  </label>
                  <input
                    type="text"
                    value={settings.logo?.navLogoUrl || ''}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        logo: {
                          ...(settings.logo || { navLogoHeight: 24, footerLogoHeight: 32 }),
                          navLogoUrl: e.target.value
                        }
                      })
                    }
                    className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-green-500 outline-none transition-all text-xs"
                    placeholder="https://..."
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 flex justify-between">
                    <span>Navigation Logo Height (px)</span>
                    <span className="text-green-600 font-extrabold">{settings.logo?.navLogoHeight || 24}px</span>
                  </label>
                  <div className="flex items-center space-x-4">
                    <input
                      type="range"
                      min="16"
                      max="120"
                      value={settings.logo?.navLogoHeight || 24}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          logo: {
                            ...(settings.logo || { navLogoHeight: 24, footerLogoHeight: 32 }),
                            navLogoHeight: parseInt(e.target.value, 10)
                          }
                        })
                      }
                      className="flex-grow accent-green-600"
                    />
                    <input
                      type="number"
                      min="16"
                      max="120"
                      value={settings.logo?.navLogoHeight || 24}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          logo: {
                            ...(settings.logo || { navLogoHeight: 24, footerLogoHeight: 32 }),
                            navLogoHeight: parseInt(e.target.value, 10) || 24
                          }
                        })
                      }
                      className="w-16 px-2 py-1 bg-gray-50 border-none rounded-lg text-center text-xs font-bold focus:ring-2 focus:ring-green-500 outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Footer Logo Config */}
            <div className="space-y-6">
              <h3 className="text-sm font-bold text-gray-900 border-b border-gray-100 pb-2 flex items-center space-x-2">
                <span className="w-2 h-2 rounded-full bg-green-500"></span>
                <span>Footer Section Logo</span>
              </h3>

              <div className="space-y-4">
                <ImageUploader
                  label="Upload Footer Logo"
                  currentImageUrl={settings.logo?.footerLogoUrl || ''}
                  onUploadSuccess={(url) =>
                    setSettings({
                      ...settings,
                      logo: {
                        ...(settings.logo || { navLogoHeight: 24, footerLogoHeight: 32 }),
                        footerLogoUrl: url
                      }
                    })
                  }
                  onClear={() =>
                    setSettings({
                      ...settings,
                      logo: {
                        ...(settings.logo || { navLogoHeight: 24, footerLogoHeight: 32 }),
                        footerLogoUrl: ''
                      }
                    })
                  }
                  folder="branding"
                />

                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">
                    Or Paste Footer Logo URL
                  </label>
                  <input
                    type="text"
                    value={settings.logo?.footerLogoUrl || ''}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        logo: {
                          ...(settings.logo || { navLogoHeight: 24, footerLogoHeight: 32 }),
                          footerLogoUrl: e.target.value
                        }
                      })
                    }
                    className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-green-500 outline-none transition-all text-xs"
                    placeholder="https://..."
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 flex justify-between">
                    <span>Footer Logo Height (px)</span>
                    <span className="text-green-600 font-extrabold">{settings.logo?.footerLogoHeight || 32}px</span>
                  </label>
                  <div className="flex items-center space-x-4">
                    <input
                      type="range"
                      min="16"
                      max="120"
                      value={settings.logo?.footerLogoHeight || 32}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          logo: {
                            ...(settings.logo || { navLogoHeight: 24, footerLogoHeight: 32 }),
                            footerLogoHeight: parseInt(e.target.value, 10)
                          }
                        })
                      }
                      className="flex-grow accent-green-600"
                    />
                    <input
                      type="number"
                      min="16"
                      max="120"
                      value={settings.logo?.footerLogoHeight || 32}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          logo: {
                            ...(settings.logo || { navLogoHeight: 24, footerLogoHeight: 32 }),
                            footerLogoHeight: parseInt(e.target.value, 10) || 32
                          }
                        })
                      }
                      className="w-16 px-2 py-1 bg-gray-50 border-none rounded-lg text-center text-xs font-bold focus:ring-2 focus:ring-green-500 outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Hero Section Editor */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="bg-gray-50 px-8 py-4 border-b border-gray-100 flex items-center space-x-3">
          <div className="bg-green-100 p-2 rounded-lg">
            <Layout className="h-5 w-5 text-green-600" />
          </div>
          <h2 className="font-bold text-gray-900 uppercase tracking-widest text-xs">Hero Section (English + বাংলা)</h2>
        </div>

        <div className="p-8 space-y-8">
          {/* Hero Style Selection */}
          <div className="bg-green-50/40 p-6 rounded-2xl border border-green-100/50 space-y-4">
            <label className="block text-[10px] font-bold text-green-800 uppercase tracking-widest flex items-center space-x-2">
              <Layout className="h-4 w-4" />
              <span>Hero Section Display Style</span>
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() =>
                  setSettings({
                    ...settings,
                    hero: { ...settings.hero, useScrollEffect: true }
                  })
                }
                className={cn(
                  'p-5 rounded-xl border text-left transition-all flex flex-col space-y-2 cursor-pointer',
                  settings.hero.useScrollEffect !== false
                    ? 'bg-white border-green-600 ring-2 ring-green-100 shadow-sm'
                    : 'bg-white border-gray-100 hover:border-gray-200'
                )}
              >
                <span className="font-bold text-sm text-gray-900">Scroll-scraped Animation</span>
                <span className="text-xs text-gray-500 leading-relaxed">
                  Displays interactive frames that animate beautifully as the user scrolls down the page.
                </span>
              </button>

              <button
                type="button"
                onClick={() =>
                  setSettings({
                    ...settings,
                    hero: { ...settings.hero, useScrollEffect: false }
                  })
                }
                className={cn(
                  'p-5 rounded-xl border text-left transition-all flex flex-col space-y-2 cursor-pointer',
                  settings.hero.useScrollEffect === false
                    ? 'bg-white border-green-600 ring-2 ring-green-100 shadow-sm'
                    : 'bg-white border-gray-100 hover:border-gray-200'
                )}
              >
                <span className="font-bold text-sm text-gray-900">Normal Hero Slider</span>
                <span className="text-xs text-gray-500 leading-relaxed">
                  Displays a clean, classic hero section with a sliding gallery of the uploaded images.
                </span>
              </button>
            </div>

            {settings.hero.useScrollEffect === false && (
              <div className="mt-6 p-6 bg-amber-50/40 rounded-2xl border border-amber-100/50 space-y-4 animate-fade-in">
                <label className="block text-[10px] font-bold text-amber-800 uppercase tracking-widest flex items-center space-x-2">
                  <ImageIcon className="h-4 w-4" />
                  <span>Hero Section Background Photo (Scroll Effect is Off)</span>
                </label>
                <p className="text-xs text-gray-500">
                  This photo will be shown as the full-bleed background of the entire hero section on the home page, darkened with low transparency for a darker tone and high text readability.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                  <ImageUploader
                    label="Upload Hero Background Photo"
                    onUploadSuccess={(url) => {
                      setSettings({
                        ...settings,
                        hero: {
                          ...settings.hero,
                          bgImageUrl: url
                        }
                      });
                    }}
                    folder="hero_bg"
                  />
                  <div className="space-y-2">
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                      Or paste Background Image URL
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="https://images.unsplash.com/..."
                        value={settings.hero.bgImageUrl || ''}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            hero: {
                              ...settings.hero,
                              bgImageUrl: e.target.value
                            }
                          })
                        }
                        className="flex-grow px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 outline-none transition-all text-xs"
                      />
                      {settings.hero.bgImageUrl && (
                        <button
                          type="button"
                          onClick={() =>
                            setSettings({
                              ...settings,
                              hero: {
                                ...settings.hero,
                                bgImageUrl: ''
                              }
                            })
                          }
                          className="px-3 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl transition-all cursor-pointer"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {settings.hero.bgImageUrl && (
                  <div className="space-y-2 pt-2">
                    <div className="flex justify-between items-center">
                      <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                        Background Image Opacity: {settings.hero.bgImageOpacity ?? 40}% (low transparency)
                      </label>
                      <span className="text-xs text-gray-400">
                        Higher % = darker/more visible photo, Lower % = lighter/more subtle.
                      </span>
                    </div>
                    <input
                      type="range"
                      min="10"
                      max="90"
                      value={settings.hero.bgImageOpacity ?? 40}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          hero: {
                            ...settings.hero,
                            bgImageOpacity: parseInt(e.target.value)
                          }
                        })
                      }
                      className="w-full accent-green-700 cursor-pointer h-1 bg-gray-200 rounded-lg appearance-none"
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          <hr className="border-gray-100" />

          {/* Hero Bilingual Text Content */}
          <div className="space-y-6">
            <BilingualField
              label="Small Tagline"
              enValue={settings.hero.tagline}
              bnValue={settings.hero.taglineBn || ''}
              contextHint="Hero Small Tagline"
              onOpenAiCopywriter={() =>
                setAiModalState({
                  isOpen: true,
                  type: 'hero_tagline',
                  input: settings.hero.tagline || 'Soil to Soul Regenerative Farm',
                  fieldTarget: 'hero_tagline'
                })
              }
              onChange={(nextEn, nextBn) =>
                setSettings({
                  ...settings,
                  hero: { ...settings.hero, tagline: nextEn, taglineBn: nextBn }
                })
              }
              onNotify={showNotice}
            />

            <BilingualField
              label="Main Heading (Primary / Fallback)"
              enValue={settings.hero.title}
              bnValue={settings.hero.titleBn || ''}
              multiline
              rows={2}
              contextHint="Hero Main Heading"
              onOpenAiCopywriter={() =>
                setAiModalState({
                  isOpen: true,
                  type: 'hero_heading',
                  input: settings.hero.title || 'Fresh Farm Products From Our Farm',
                  fieldTarget: 'hero_title'
                })
              }
              onChange={(nextEn, nextBn) => {
                const updatedTitles = [...(settings.hero.titles || [settings.hero.title])];
                const updatedTitlesBn = [...(settings.hero.titlesBn || updatedTitles.map(() => ''))];
                if (updatedTitles.length > 0) updatedTitles[0] = nextEn;
                else updatedTitles.push(nextEn);
                if (updatedTitlesBn.length > 0) updatedTitlesBn[0] = nextBn;
                else updatedTitlesBn.push(nextBn);

                setSettings({
                  ...settings,
                  hero: {
                    ...settings.hero,
                    title: nextEn,
                    titleBn: nextBn,
                    titles: updatedTitles,
                    titlesBn: updatedTitlesBn
                  }
                });
              }}
              onNotify={showNotice}
            />

            <BilingualField
              label="Description Text"
              enValue={settings.hero.description}
              bnValue={settings.hero.descriptionBn || ''}
              multiline
              rows={3}
              contextHint="Hero Section Paragraph Description"
              onChange={(nextEn, nextBn) =>
                setSettings({
                  ...settings,
                  hero: { ...settings.hero, description: nextEn, descriptionBn: nextBn }
                })
              }
              onNotify={showNotice}
            />

            {/* Bilingual Rotating Headings */}
            <div className="p-5 rounded-2xl bg-gray-50/70 border border-gray-100 space-y-4">
              <div className="flex flex-wrap justify-between items-center gap-2">
                <label className="text-[10px] font-extrabold text-gray-500 uppercase tracking-widest flex items-center space-x-2">
                  <Plus className="h-3.5 w-3.5 text-green-600" />
                  <span>Rotating Headings (Typewriter Cycles — English + বাংলা)</span>
                </label>
                <span className="text-[10px] text-gray-400 font-medium">Auto-rotates sequentially</span>
              </div>

              <div className="space-y-3">
                {rotatingTitlesEn.map((tEn, idx) => {
                  const tBn = rotatingTitlesBn[idx] || '';
                  return (
                    <div key={idx} className="p-3.5 bg-white rounded-xl border border-gray-200/80 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-extrabold text-green-700 bg-green-50 px-2.5 py-0.5 rounded-md">
                          Rotating Heading #{idx + 1}
                        </span>
                        {rotatingTitlesEn.length > 1 && (
                          <button
                            type="button"
                            onClick={() => {
                              const updatedEn = rotatingTitlesEn.filter((_, i) => i !== idx);
                              const updatedBn = rotatingTitlesBn.filter((_, i) => i !== idx);
                              setSettings({
                                ...settings,
                                hero: {
                                  ...settings.hero,
                                  titles: updatedEn,
                                  titlesBn: updatedBn,
                                  title: updatedEn[0] || '',
                                  titleBn: updatedBn[0] || ''
                                }
                              });
                            }}
                            className="p-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition-all cursor-pointer"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {/* EN Rotating Heading */}
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="text-[9px] font-bold text-blue-700 uppercase">English (EN)</span>
                            <button
                              type="button"
                              disabled={rotatingTranslateIdx !== null}
                              onClick={() => handleTranslateRotatingHeading(idx, 'en_to_bn')}
                              className="inline-flex items-center space-x-1 text-[9px] font-bold px-2 py-0.5 rounded bg-emerald-50 hover:bg-emerald-100 text-emerald-700 cursor-pointer disabled:opacity-50"
                            >
                              {rotatingTranslateIdx?.idx === idx && rotatingTranslateIdx?.dir === 'en_to_bn' ? (
                                <Loader2 className="h-2.5 w-2.5 animate-spin" />
                              ) : (
                                <Sparkles className="h-2.5 w-2.5" />
                              )}
                              <span>AI বাংলায় →</span>
                            </button>
                          </div>
                          <input
                            type="text"
                            value={tEn}
                            onChange={(e) => {
                              const updatedEn = [...rotatingTitlesEn];
                              updatedEn[idx] = e.target.value;
                              setSettings({
                                ...settings,
                                hero: {
                                  ...settings.hero,
                                  titles: updatedEn,
                                  title: idx === 0 ? e.target.value : settings.hero.title
                                }
                              });
                            }}
                            placeholder={`English Heading #${idx + 1}`}
                            className="w-full px-3 py-2 bg-gray-50 border border-gray-100 rounded-lg focus:bg-white focus:ring-2 focus:ring-green-500/20 outline-none text-xs font-bold"
                          />
                        </div>

                        {/* BN Rotating Heading */}
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="text-[9px] font-bold text-emerald-800 uppercase">বাংলা (BN)</span>
                            <button
                              type="button"
                              disabled={rotatingTranslateIdx !== null}
                              onClick={() => handleTranslateRotatingHeading(idx, 'bn_to_en')}
                              className="inline-flex items-center space-x-1 text-[9px] font-bold px-2 py-0.5 rounded bg-blue-50 hover:bg-blue-100 text-blue-700 cursor-pointer disabled:opacity-50"
                            >
                              {rotatingTranslateIdx?.idx === idx && rotatingTranslateIdx?.dir === 'bn_to_en' ? (
                                <Loader2 className="h-2.5 w-2.5 animate-spin" />
                              ) : (
                                <Sparkles className="h-2.5 w-2.5" />
                              )}
                              <span>← AI English</span>
                            </button>
                          </div>
                          <input
                            type="text"
                            value={tBn}
                            onChange={(e) => {
                              const updatedBn = [...rotatingTitlesBn];
                              while (updatedBn.length < rotatingTitlesEn.length) updatedBn.push('');
                              updatedBn[idx] = e.target.value;
                              setSettings({
                                ...settings,
                                hero: {
                                  ...settings.hero,
                                  titlesBn: updatedBn,
                                  titleBn: idx === 0 ? e.target.value : settings.hero.titleBn
                                }
                              });
                            }}
                            placeholder={`বাংলা হেডিং #${idx + 1}`}
                            className="w-full px-3 py-2 bg-emerald-50/20 border border-emerald-100 rounded-lg focus:bg-white focus:ring-2 focus:ring-green-500/20 outline-none text-xs font-bold"
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={() => {
                  const updatedEn = [...rotatingTitlesEn, ''];
                  const updatedBn = [...rotatingTitlesBn, ''];
                  setSettings({
                    ...settings,
                    hero: {
                      ...settings.hero,
                      titles: updatedEn,
                      titlesBn: updatedBn
                    }
                  });
                }}
                className="w-full py-2.5 border-2 border-dashed border-gray-200 rounded-xl text-gray-500 hover:border-green-300 hover:text-green-700 transition-all text-xs font-bold flex items-center justify-center space-x-1 cursor-pointer bg-white"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add Rotating Heading (English + বাংলা)</span>
              </button>

              <div className="pt-2">
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">
                  Heading Display Interval: {((settings.hero.titleInterval || 5000) / 1000).toFixed(1)} seconds
                </label>
                <input
                  type="range"
                  min="2000"
                  max="10000"
                  step="500"
                  value={settings.hero.titleInterval || 5000}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      hero: {
                        ...settings.hero,
                        titleInterval: parseInt(e.target.value, 10)
                      }
                    })
                  }
                  className="w-full accent-green-600 cursor-pointer h-1 bg-gray-200 rounded-lg appearance-none"
                />
              </div>
            </div>
          </div>

          <hr className="border-gray-100" />

          {/* Image Gallery */}
          <div className="space-y-6">
            <div>
              <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center space-x-2">
                <ImageIcon className="h-3 w-3" />
                <span>Image Gallery (Slider)</span>
              </h3>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                {settings.hero.images.map((url, idx) => (
                  <div key={idx} className="relative group aspect-video rounded-2xl overflow-hidden border border-gray-100">
                    <img
                      src={url}
                      alt={`Slide ${idx + 1}`}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <button
                        onClick={() => removeImage(idx)}
                        className="bg-white/20 hover:bg-red-500 text-white p-2 rounded-full transition-colors"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="absolute top-2 left-2 bg-white/90 backdrop-blur px-2 py-0.5 rounded-lg text-[8px] font-bold text-gray-900">
                      #{idx + 1}
                    </div>
                  </div>
                ))}
                <button
                  onClick={() => imageInputRef.current?.focus()}
                  className="aspect-video rounded-2xl border-2 border-dashed border-gray-100 flex items-center justify-center bg-gray-50/50 hover:bg-gray-100 hover:border-green-200 transition-all group"
                >
                  <p className="text-[10px] text-gray-400 font-bold uppercase group-hover:text-green-600 transition-colors">
                    Add Image Below
                  </p>
                </button>
              </div>

              <div className="space-y-4">
                <div className="max-w-md">
                  <ImageUploader
                    label="Upload Image to Gallery"
                    onUploadSuccess={(url) => {
                      setSettings({
                        ...settings,
                        hero: {
                          ...settings.hero,
                          images: [...settings.hero.images, url]
                        }
                      });
                    }}
                    folder="gallery"
                  />
                </div>

                <div className="flex gap-2">
                  <input
                    ref={imageInputRef}
                    type="text"
                    placeholder="Or paste direct image URL here..."
                    value={newImageUrl}
                    onChange={(e) => setNewImageUrl(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addImage()}
                    className="flex-1 px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-green-500 outline-none transition-all text-xs"
                  />
                  <button
                    onClick={addImage}
                    className="bg-green-100 hover:bg-green-200 text-green-700 px-6 rounded-xl transition-all flex items-center space-x-2 font-bold text-xs"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Add Image URL</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section Editor */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="bg-gray-50 px-8 py-4 border-b border-gray-100 flex items-center space-x-3">
          <div className="bg-amber-100 p-2 rounded-lg">
            <Layout className="h-5 w-5 text-amber-600" />
          </div>
          <h2 className="font-bold text-gray-900 uppercase tracking-widest text-xs">
            Features (Why Choose Us — English + বাংলা)
          </h2>
        </div>

        <div className="p-8 space-y-6">
          <BilingualField
            label="Section Tagline"
            enValue={settings.featuresSection?.tagline || ''}
            bnValue={settings.featuresSection?.taglineBn || ''}
            contextHint="Features Section Tagline"
            onChange={(nextEn, nextBn) =>
              setSettings({
                ...settings,
                featuresSection: {
                  ...(settings.featuresSection || DEFAULT_SETTINGS.featuresSection),
                  tagline: nextEn,
                  taglineBn: nextBn
                }
              })
            }
            onNotify={showNotice}
          />

          <BilingualField
            label="Section Headline"
            enValue={settings.featuresSection?.headline || ''}
            bnValue={settings.featuresSection?.headlineBn || ''}
            contextHint="Features Section Main Headline"
            onChange={(nextEn, nextBn) =>
              setSettings({
                ...settings,
                featuresSection: {
                  ...(settings.featuresSection || DEFAULT_SETTINGS.featuresSection),
                  headline: nextEn,
                  headlineBn: nextBn
                }
              })
            }
            onNotify={showNotice}
          />

          <div className="space-y-4 pt-2">
            <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Edit Feature Cards</h3>
            <div className="grid grid-cols-1 gap-6">
              {(settings.featuresSection?.features || DEFAULT_SETTINGS.featuresSection.features).map((feature, idx) => (
                <div key={idx} className="p-6 bg-amber-50/20 rounded-2xl border border-amber-100 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold text-amber-700 uppercase">Feature #{idx + 1}</span>
                  </div>

                  <BilingualField
                    label={`Feature #${idx + 1} — Title`}
                    enValue={feature.title}
                    bnValue={feature.titleBn || ''}
                    contextHint="Feature Card Title"
                    onChange={(nextEn, nextBn) => {
                      const currentFeatures =
                        settings.featuresSection?.features || DEFAULT_SETTINGS.featuresSection.features;
                      const newFeatures = [...currentFeatures];
                      newFeatures[idx] = { ...feature, title: nextEn, titleBn: nextBn };
                      setSettings({
                        ...settings,
                        featuresSection: {
                          ...(settings.featuresSection || DEFAULT_SETTINGS.featuresSection),
                          features: newFeatures
                        }
                      });
                    }}
                    onNotify={showNotice}
                  />

                  <BilingualField
                    label={`Feature #${idx + 1} — Description`}
                    enValue={feature.description}
                    bnValue={feature.descriptionBn || ''}
                    multiline
                    rows={2}
                    contextHint="Feature Card Short Description"
                    onChange={(nextEn, nextBn) => {
                      const currentFeatures =
                        settings.featuresSection?.features || DEFAULT_SETTINGS.featuresSection.features;
                      const newFeatures = [...currentFeatures];
                      newFeatures[idx] = { ...feature, description: nextEn, descriptionBn: nextBn };
                      setSettings({
                        ...settings,
                        featuresSection: {
                          ...(settings.featuresSection || DEFAULT_SETTINGS.featuresSection),
                          features: newFeatures
                        }
                      });
                    }}
                    onNotify={showNotice}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Stats Section Editor */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="bg-gray-50 px-8 py-4 border-b border-gray-100 flex items-center space-x-3">
          <div className="bg-purple-100 p-2 rounded-lg">
            <Layout className="h-5 w-5 text-purple-600" />
          </div>
          <h2 className="font-bold text-gray-900 uppercase tracking-widest text-xs">
            Stats Section (English + বাংলা)
          </h2>
        </div>

        <div className="p-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {(settings.statsSection?.stats || DEFAULT_SETTINGS.statsSection.stats).map((stat, idx) => (
              <div key={idx} className="p-5 bg-purple-50/20 rounded-2xl border border-purple-100 space-y-4">
                <span className="text-xs font-extrabold text-purple-700 uppercase block">Stat #{idx + 1}</span>

                <BilingualField
                  label="Value (e.g. 500+ / ৫০০+)"
                  enValue={stat.value}
                  bnValue={stat.valueBn || ''}
                  contextHint="Statistic Numeric Value"
                  onChange={(nextEn, nextBn) => {
                    const currentStats = settings.statsSection?.stats || DEFAULT_SETTINGS.statsSection.stats;
                    const newStats = [...currentStats];
                    newStats[idx] = { ...stat, value: nextEn, valueBn: nextBn };
                    setSettings({
                      ...settings,
                      statsSection: { ...(settings.statsSection || DEFAULT_SETTINGS.statsSection), stats: newStats }
                    });
                  }}
                  onNotify={showNotice}
                />

                <BilingualField
                  label="Label (e.g. Happy Animals)"
                  enValue={stat.label}
                  bnValue={stat.labelBn || ''}
                  contextHint="Statistic Label"
                  onChange={(nextEn, nextBn) => {
                    const currentStats = settings.statsSection?.stats || DEFAULT_SETTINGS.statsSection.stats;
                    const newStats = [...currentStats];
                    newStats[idx] = { ...stat, label: nextEn, labelBn: nextBn };
                    setSettings({
                      ...settings,
                      statsSection: { ...(settings.statsSection || DEFAULT_SETTINGS.statsSection), stats: newStats }
                    });
                  }}
                  onNotify={showNotice}
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* AboutUs Section (About Page) */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="bg-gray-50 px-8 py-4 border-b border-gray-100 flex items-center space-x-3">
          <div className="bg-green-100 p-2 rounded-lg">
            <Layout className="h-5 w-5 text-green-600" />
          </div>
          <h2 className="font-bold text-gray-900 uppercase tracking-widest text-xs">
            About Page Content (English + বাংলা)
          </h2>
        </div>

        <div className="p-8 space-y-8">
          <div className="space-y-6">
            <h3 className="text-sm font-bold text-gray-900">Promise Sub-section</h3>

            <BilingualField
              label="Promise Tagline"
              enValue={settings.aboutUsSection?.promise?.tagline || ''}
              bnValue={settings.aboutUsSection?.promise?.taglineBn || ''}
              contextHint="About Us Promise Tagline"
              onChange={(nextEn, nextBn) =>
                setSettings({
                  ...settings,
                  aboutUsSection: {
                    ...settings.aboutUsSection,
                    promise: { ...settings.aboutUsSection.promise, tagline: nextEn, taglineBn: nextBn }
                  }
                })
              }
              onNotify={showNotice}
            />

            <BilingualField
              label="Promise Headline"
              enValue={settings.aboutUsSection?.promise?.headline || ''}
              bnValue={settings.aboutUsSection?.promise?.headlineBn || ''}
              multiline
              rows={2}
              contextHint="About Us Promise Headline"
              onChange={(nextEn, nextBn) =>
                setSettings({
                  ...settings,
                  aboutUsSection: {
                    ...settings.aboutUsSection,
                    promise: { ...settings.aboutUsSection.promise, headline: nextEn, headlineBn: nextBn }
                  }
                })
              }
              onNotify={showNotice}
            />

            <BilingualField
              label="Promise Description"
              enValue={settings.aboutUsSection?.promise?.description || ''}
              bnValue={settings.aboutUsSection?.promise?.descriptionBn || ''}
              multiline
              rows={4}
              contextHint="About Us Promise Story Description"
              onChange={(nextEn, nextBn) =>
                setSettings({
                  ...settings,
                  aboutUsSection: {
                    ...settings.aboutUsSection,
                    promise: { ...settings.aboutUsSection.promise, description: nextEn, descriptionBn: nextBn }
                  }
                })
              }
              onNotify={showNotice}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
              <ImageUploader
                label="Upload Promise Section Image"
                currentImageUrl={settings.aboutUsSection?.promise?.imageUrl || ''}
                onUploadSuccess={(url) =>
                  setSettings({
                    ...settings,
                    aboutUsSection: {
                      ...settings.aboutUsSection,
                      promise: { ...settings.aboutUsSection.promise, imageUrl: url }
                    }
                  })
                }
                onClear={() =>
                  setSettings({
                    ...settings,
                    aboutUsSection: {
                      ...settings.aboutUsSection,
                      promise: { ...settings.aboutUsSection.promise, imageUrl: '' }
                    }
                  })
                }
                folder="promise"
              />
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                  Or Paste Direct Image URL
                </label>
                <input
                  type="text"
                  value={settings.aboutUsSection?.promise?.imageUrl || ''}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      aboutUsSection: {
                        ...settings.aboutUsSection,
                        promise: { ...settings.aboutUsSection.promise, imageUrl: e.target.value }
                      }
                    })
                  }
                  className="w-full px-4 py-2.5 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-green-500 outline-none transition-all text-xs"
                  placeholder="https://..."
                />
              </div>
            </div>
          </div>

          <hr className="border-gray-100" />

          <div className="space-y-6">
            <h3 className="text-sm font-bold text-gray-900">Vision Sub-section</h3>

            <BilingualField
              label="Vision Headline"
              enValue={settings.aboutUsSection?.vision?.headline || ''}
              bnValue={settings.aboutUsSection?.vision?.headlineBn || ''}
              contextHint="Our Vision Headline"
              onChange={(nextEn, nextBn) =>
                setSettings({
                  ...settings,
                  aboutUsSection: {
                    ...settings.aboutUsSection,
                    vision: { ...settings.aboutUsSection.vision, headline: nextEn, headlineBn: nextBn }
                  }
                })
              }
              onNotify={showNotice}
            />

            <BilingualField
              label="Vision Description (Quote)"
              enValue={settings.aboutUsSection?.vision?.description || ''}
              bnValue={settings.aboutUsSection?.vision?.descriptionBn || ''}
              multiline
              rows={3}
              contextHint="Our Vision Inspirational Quote"
              onChange={(nextEn, nextBn) =>
                setSettings({
                  ...settings,
                  aboutUsSection: {
                    ...settings.aboutUsSection,
                    vision: { ...settings.aboutUsSection.vision, description: nextEn, descriptionBn: nextBn }
                  }
                })
              }
              onNotify={showNotice}
            />
          </div>
        </div>
      </div>

      {/* Products Section Header Editor */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="bg-gray-50 px-8 py-4 border-b border-gray-100 flex items-center space-x-3">
          <div className="bg-blue-100 p-2 rounded-lg">
            <Layout className="h-5 w-5 text-blue-600" />
          </div>
          <h2 className="font-bold text-gray-900 uppercase tracking-widest text-xs">
            Products Page Header (English + বাংলা)
          </h2>
        </div>

        <div className="p-8 space-y-6">
          <BilingualField
            label="Tagline"
            enValue={settings.productsSection?.tagline || ''}
            bnValue={settings.productsSection?.taglineBn || ''}
            contextHint="Products Section Tagline"
            onChange={(nextEn, nextBn) =>
              setSettings({
                ...settings,
                productsSection: { ...settings.productsSection, tagline: nextEn, taglineBn: nextBn }
              })
            }
            onNotify={showNotice}
          />

          <BilingualField
            label="Headline"
            enValue={settings.productsSection?.headline || ''}
            bnValue={settings.productsSection?.headlineBn || ''}
            contextHint="Products Section Headline"
            onChange={(nextEn, nextBn) =>
              setSettings({
                ...settings,
                productsSection: { ...settings.productsSection, headline: nextEn, headlineBn: nextBn }
              })
            }
            onNotify={showNotice}
          />

          <BilingualField
            label="Description"
            enValue={settings.productsSection?.description || ''}
            bnValue={settings.productsSection?.descriptionBn || ''}
            multiline
            rows={2}
            contextHint="Products Section Description"
            onChange={(nextEn, nextBn) =>
              setSettings({
                ...settings,
                productsSection: { ...settings.productsSection, description: nextEn, descriptionBn: nextBn }
              })
            }
            onNotify={showNotice}
          />
        </div>
      </div>

      {/* Invest Section Header Editor */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="bg-gray-50 px-8 py-4 border-b border-gray-100 flex items-center space-x-3">
          <div className="bg-indigo-100 p-2 rounded-lg">
            <Layout className="h-5 w-5 text-indigo-600" />
          </div>
          <h2 className="font-bold text-gray-900 uppercase tracking-widest text-xs">
            Invest Page Header (English + বাংলা)
          </h2>
        </div>

        <div className="p-8 space-y-6">
          <BilingualField
            label="Tagline"
            enValue={settings.investSection?.tagline || ''}
            bnValue={settings.investSection?.taglineBn || ''}
            contextHint="Investment Projects Section Tagline"
            onChange={(nextEn, nextBn) =>
              setSettings({
                ...settings,
                investSection: { ...settings.investSection, tagline: nextEn, taglineBn: nextBn }
              })
            }
            onNotify={showNotice}
          />

          <BilingualField
            label="Headline"
            enValue={settings.investSection?.headline || ''}
            bnValue={settings.investSection?.headlineBn || ''}
            contextHint="Investment Projects Section Headline"
            onChange={(nextEn, nextBn) =>
              setSettings({
                ...settings,
                investSection: { ...settings.investSection, headline: nextEn, headlineBn: nextBn }
              })
            }
            onNotify={showNotice}
          />

          <BilingualField
            label="Description"
            enValue={settings.investSection?.description || ''}
            bnValue={settings.investSection?.descriptionBn || ''}
            multiline
            rows={2}
            contextHint="Investment Projects Section Description"
            onChange={(nextEn, nextBn) =>
              setSettings({
                ...settings,
                investSection: { ...settings.investSection, description: nextEn, descriptionBn: nextBn }
              })
            }
            onNotify={showNotice}
          />
        </div>
      </div>

      {/* Contact Section Editor */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="bg-gray-50 px-8 py-4 border-b border-gray-100 flex items-center space-x-3">
          <div className="bg-orange-100 p-2 rounded-lg">
            <Layout className="h-5 w-5 text-orange-600" />
          </div>
          <h2 className="font-bold text-gray-900 uppercase tracking-widest text-xs">
            Contact Page Content (English + বাংলা)
          </h2>
        </div>

        <div className="p-8 space-y-6">
          <BilingualField
            label="Tagline"
            enValue={settings.contactSection?.tagline || ''}
            bnValue={settings.contactSection?.taglineBn || ''}
            contextHint="Contact Section Tagline"
            onChange={(nextEn, nextBn) =>
              setSettings({
                ...settings,
                contactSection: { ...settings.contactSection, tagline: nextEn, taglineBn: nextBn }
              })
            }
            onNotify={showNotice}
          />

          <BilingualField
            label="Headline"
            enValue={settings.contactSection?.headline || ''}
            bnValue={settings.contactSection?.headlineBn || ''}
            contextHint="Contact Section Headline"
            onChange={(nextEn, nextBn) =>
              setSettings({
                ...settings,
                contactSection: { ...settings.contactSection, headline: nextEn, headlineBn: nextBn }
              })
            }
            onNotify={showNotice}
          />

          <BilingualField
            label="Description"
            enValue={settings.contactSection?.description || ''}
            bnValue={settings.contactSection?.descriptionBn || ''}
            multiline
            rows={2}
            contextHint="Contact Section Description"
            onChange={(nextEn, nextBn) =>
              setSettings({
                ...settings,
                contactSection: { ...settings.contactSection, description: nextEn, descriptionBn: nextBn }
              })
            }
            onNotify={showNotice}
          />

          <hr className="border-gray-100" />

          <div className="space-y-6">
            {/* Location */}
            <div className="p-6 bg-orange-50/20 rounded-2xl border border-orange-100 space-y-4">
              <span className="text-xs font-extrabold text-orange-700 uppercase block">Location Box</span>
              <BilingualField
                label="Location Card Title"
                enValue={settings.contactSection?.info?.location?.title || ''}
                bnValue={settings.contactSection?.info?.location?.titleBn || ''}
                contextHint="Location Card Heading"
                onChange={(nextEn, nextBn) =>
                  setSettings({
                    ...settings,
                    contactSection: {
                      ...settings.contactSection,
                      info: {
                        ...settings.contactSection.info,
                        location: { ...settings.contactSection.info.location, title: nextEn, titleBn: nextBn }
                      }
                    }
                  })
                }
                onNotify={showNotice}
              />
              <BilingualField
                label="Location Address Text"
                enValue={settings.contactSection?.info?.location?.text || ''}
                bnValue={settings.contactSection?.info?.location?.textBn || ''}
                contextHint="Physical Address"
                onChange={(nextEn, nextBn) =>
                  setSettings({
                    ...settings,
                    contactSection: {
                      ...settings.contactSection,
                      info: {
                        ...settings.contactSection.info,
                        location: { ...settings.contactSection.info.location, text: nextEn, textBn: nextBn }
                      }
                    }
                  })
                }
                onNotify={showNotice}
              />
            </div>

            {/* WhatsApp */}
            <div className="p-6 bg-orange-50/20 rounded-2xl border border-orange-100 space-y-4">
              <span className="text-xs font-extrabold text-orange-700 uppercase block">WhatsApp Box</span>
              <BilingualField
                label="WhatsApp Card Title"
                enValue={settings.contactSection?.info?.whatsapp?.title || ''}
                bnValue={settings.contactSection?.info?.whatsapp?.titleBn || ''}
                contextHint="WhatsApp Card Heading"
                onChange={(nextEn, nextBn) =>
                  setSettings({
                    ...settings,
                    contactSection: {
                      ...settings.contactSection,
                      info: {
                        ...settings.contactSection.info,
                        whatsapp: { ...settings.contactSection.info.whatsapp, title: nextEn, titleBn: nextBn }
                      }
                    }
                  })
                }
                onNotify={showNotice}
              />
              <div>
                <label className="block text-[10px] font-extrabold text-gray-500 uppercase mb-1.5">
                  WhatsApp Number
                </label>
                <input
                  type="text"
                  value={settings.contactSection?.info?.whatsapp?.text || ''}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      contactSection: {
                        ...settings.contactSection,
                        info: {
                          ...settings.contactSection.info,
                          whatsapp: {
                            ...settings.contactSection.info.whatsapp,
                            text: e.target.value,
                            textBn: e.target.value
                          }
                        }
                      }
                    })
                  }
                  className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none transition-all text-xs font-bold"
                />
              </div>
            </div>

            {/* Email */}
            <div className="p-6 bg-orange-50/20 rounded-2xl border border-orange-100 space-y-4">
              <span className="text-xs font-extrabold text-orange-700 uppercase block">Email Box</span>
              <BilingualField
                label="Email Card Title"
                enValue={settings.contactSection?.info?.email?.title || ''}
                bnValue={settings.contactSection?.info?.email?.titleBn || ''}
                contextHint="Email Card Heading"
                onChange={(nextEn, nextBn) =>
                  setSettings({
                    ...settings,
                    contactSection: {
                      ...settings.contactSection,
                      info: {
                        ...settings.contactSection.info,
                        email: { ...settings.contactSection.info.email, title: nextEn, titleBn: nextBn }
                      }
                    }
                  })
                }
                onNotify={showNotice}
              />
              <div>
                <label className="block text-[10px] font-extrabold text-gray-500 uppercase mb-1.5">
                  Email Address
                </label>
                <input
                  type="email"
                  value={settings.contactSection?.info?.email?.text || ''}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      contactSection: {
                        ...settings.contactSection,
                        info: {
                          ...settings.contactSection.info,
                          email: {
                            ...settings.contactSection.info.email,
                            text: e.target.value,
                            textBn: e.target.value
                          }
                        }
                      }
                    })
                  }
                  className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none transition-all text-xs font-bold"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* FAQ Section Editor */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="bg-gray-50 px-8 py-4 border-b border-gray-100 flex items-center space-x-3">
          <div className="bg-gray-200 p-2 rounded-lg">
            <Layout className="h-5 w-5 text-gray-600" />
          </div>
          <h2 className="font-bold text-gray-900 uppercase tracking-widest text-xs">
            FAQ Page Content (English + বাংলা)
          </h2>
        </div>

        <div className="p-8 space-y-6">
          <BilingualField
            label="FAQ Headline"
            enValue={settings.faqSection?.headline || ''}
            bnValue={settings.faqSection?.headlineBn || ''}
            contextHint="FAQ Section Headline"
            onChange={(nextEn, nextBn) =>
              setSettings({
                ...settings,
                faqSection: { ...settings.faqSection, headline: nextEn, headlineBn: nextBn }
              })
            }
            onNotify={showNotice}
          />

          <BilingualField
            label="FAQ Description"
            enValue={settings.faqSection?.description || ''}
            bnValue={settings.faqSection?.descriptionBn || ''}
            multiline
            rows={2}
            contextHint="FAQ Section Subtitle Description"
            onChange={(nextEn, nextBn) =>
              setSettings({
                ...settings,
                faqSection: { ...settings.faqSection, description: nextEn, descriptionBn: nextBn }
              })
            }
            onNotify={showNotice}
          />

          <div className="space-y-4 pt-2">
            <h3 className="text-sm font-bold text-gray-900">Manage FAQs (English + বাংলা)</h3>
            <div className="space-y-4">
              {(settings.faqSection?.faqs || []).map((faq, idx) => (
                <div key={idx} className="p-5 bg-gray-50/80 rounded-2xl border border-gray-200/70 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold text-gray-700 uppercase">FAQ #{idx + 1}</span>
                    <button
                      type="button"
                      onClick={() => {
                        const newFaqs = settings.faqSection.faqs.filter((_, i) => i !== idx);
                        setSettings({ ...settings, faqSection: { ...settings.faqSection, faqs: newFaqs } });
                      }}
                      className="text-red-500 hover:text-red-700 p-1 cursor-pointer"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  <BilingualField
                    label={`Question #${idx + 1}`}
                    enValue={faq.question}
                    bnValue={faq.questionBn || ''}
                    contextHint="Frequently Asked Question"
                    onChange={(nextEn, nextBn) => {
                      const newFaqs = [...settings.faqSection.faqs];
                      newFaqs[idx] = { ...faq, question: nextEn, questionBn: nextBn };
                      setSettings({ ...settings, faqSection: { ...settings.faqSection, faqs: newFaqs } });
                    }}
                    onNotify={showNotice}
                  />

                  <BilingualField
                    label={`Answer #${idx + 1}`}
                    enValue={faq.answer}
                    bnValue={faq.answerBn || ''}
                    multiline
                    rows={3}
                    contextHint="FAQ Answer"
                    onChange={(nextEn, nextBn) => {
                      const newFaqs = [...settings.faqSection.faqs];
                      newFaqs[idx] = { ...faq, answer: nextEn, answerBn: nextBn };
                      setSettings({ ...settings, faqSection: { ...settings.faqSection, faqs: newFaqs } });
                    }}
                    onNotify={showNotice}
                  />
                </div>
              ))}
              <button
                type="button"
                onClick={() => {
                  const newFaqs = [
                    ...(settings.faqSection?.faqs || []),
                    { question: '', questionBn: '', answer: '', answerBn: '' }
                  ];
                  setSettings({
                    ...settings,
                    faqSection: { ...(settings.faqSection || DEFAULT_SETTINGS.faqSection), faqs: newFaqs }
                  });
                }}
                className="w-full py-3 border-2 border-dashed border-gray-200 rounded-2xl text-gray-500 hover:border-green-300 hover:text-green-700 transition-all text-xs font-bold cursor-pointer"
              >
                + Add New FAQ (English + বাংলা)
              </button>
            </div>
          </div>
        </div>

        <AdminAICopywriter
          isOpen={aiModalState.isOpen}
          onClose={() => setAiModalState(prev => ({ ...prev, isOpen: false }))}
          defaultPromptType={aiModalState.type}
          defaultInput={aiModalState.input}
          onApplyCopy={handleApplyAICopy}
        />
      </div>
    </div>
  );
}
