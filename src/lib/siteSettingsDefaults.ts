import { SiteSettings } from '../types';

const EN_DIGITS = '0123456789';
const BN_DIGITS = '০১২৩৪৫৬৭৮৯';

export function toBengaliDigits(str: string): string {
  return String(str || '').replace(/[0-9]/g, (d) => BN_DIGITS[EN_DIGITS.indexOf(d)] || d);
}

export function toEnglishDigits(str: string): string {
  return String(str || '').replace(/[০-৯]/g, (d) => EN_DIGITS[BN_DIGITS.indexOf(d)] || d);
}

export const DEFAULT_SITE_SETTINGS: SiteSettings = {
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
          'বিনিয়োগ করতে আমাদের চলমান প্রোজেক্টগুলো দেখুন, আপনার পছন্দের প্রোজেক্টটি সিলেক্ট করে "বিনিয়োগ করুন" বাটনে ক্লিক করুন। আপনার একাউন্ট দিয়ে লগইন করে সহজেই প্রোফাইল ড্যাশবোর্ড থেকে বিনিয়োগ ও প্রফিট ট্র্যাক করতে পারবেন।'
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

function nonEmpty(val?: string, fallback = ''): string {
  return val && String(val).trim() ? String(val) : fallback;
}

export function mergeSiteSettings(data?: Partial<SiteSettings> | null): SiteSettings {
  if (!data) return DEFAULT_SITE_SETTINGS;

  const def = DEFAULT_SITE_SETTINGS;
  const heroTitles =
    data.hero?.titles && data.hero.titles.length > 0 ? data.hero.titles : def.hero.titles || [def.hero.title];
  const rawHeroTitlesBn = data.hero?.titlesBn || [];
  const defHeroTitlesBn = def.hero.titlesBn || [];

  const mergedTitlesBn = heroTitles.map((_, i) => nonEmpty(rawHeroTitlesBn[i], defHeroTitlesBn[i] || def.hero.titleBn || ''));

  const mergedFeatures = (data.featuresSection?.features || def.featuresSection.features).map((f, i) => {
    const df = def.featuresSection.features[i] || def.featuresSection.features[0];
    return {
      ...df,
      ...f,
      title: nonEmpty(f.title, df.title),
      titleBn: nonEmpty(f.titleBn, df.titleBn || ''),
      description: nonEmpty(f.description, df.description),
      descriptionBn: nonEmpty(f.descriptionBn, df.descriptionBn || '')
    };
  });

  const mergedStats = (data.statsSection?.stats || def.statsSection.stats).map((st, i) => {
    const dst = def.statsSection.stats[i] || def.statsSection.stats[0];
    const valEn = nonEmpty(st.value, dst.value);
    return {
      ...dst,
      ...st,
      value: valEn,
      valueBn: nonEmpty(st.valueBn, toBengaliDigits(valEn) || dst.valueBn || ''),
      label: nonEmpty(st.label, dst.label),
      labelBn: nonEmpty(st.labelBn, dst.labelBn || '')
    };
  });

  const mergedFaqs = (data.faqSection?.faqs || def.faqSection.faqs).map((fq, i) => {
    const dfq = def.faqSection.faqs[i] || def.faqSection.faqs[0];
    return {
      ...dfq,
      ...fq,
      question: nonEmpty(fq.question, dfq.question),
      questionBn: nonEmpty(fq.questionBn, dfq.questionBn || ''),
      answer: nonEmpty(fq.answer, dfq.answer),
      answerBn: nonEmpty(fq.answerBn, dfq.answerBn || '')
    };
  });

  return {
    ...def,
    ...data,
    logo: {
      ...def.logo,
      ...(data.logo || {})
    },
    hero: {
      ...def.hero,
      ...(data.hero || {}),
      tagline: nonEmpty(data.hero?.tagline, def.hero.tagline),
      taglineBn: nonEmpty(data.hero?.taglineBn, def.hero.taglineBn || ''),
      title: nonEmpty(data.hero?.title, def.hero.title),
      titleBn: nonEmpty(data.hero?.titleBn, def.hero.titleBn || ''),
      titles: heroTitles,
      titlesBn: mergedTitlesBn,
      description: nonEmpty(data.hero?.description, def.hero.description),
      descriptionBn: nonEmpty(data.hero?.descriptionBn, def.hero.descriptionBn || '')
    },
    featuresSection: {
      ...def.featuresSection,
      ...(data.featuresSection || {}),
      tagline: nonEmpty(data.featuresSection?.tagline, def.featuresSection.tagline),
      taglineBn: nonEmpty(data.featuresSection?.taglineBn, def.featuresSection.taglineBn || ''),
      headline: nonEmpty(data.featuresSection?.headline, def.featuresSection.headline),
      headlineBn: nonEmpty(data.featuresSection?.headlineBn, def.featuresSection.headlineBn || ''),
      features: mergedFeatures
    },
    statsSection: {
      ...def.statsSection,
      ...(data.statsSection || {}),
      stats: mergedStats
    },
    aboutUsSection: {
      promise: {
        ...def.aboutUsSection.promise,
        ...(data.aboutUsSection?.promise || {}),
        tagline: nonEmpty(data.aboutUsSection?.promise?.tagline, def.aboutUsSection.promise.tagline),
        taglineBn: nonEmpty(data.aboutUsSection?.promise?.taglineBn, def.aboutUsSection.promise.taglineBn || ''),
        headline: nonEmpty(data.aboutUsSection?.promise?.headline, def.aboutUsSection.promise.headline),
        headlineBn: nonEmpty(data.aboutUsSection?.promise?.headlineBn, def.aboutUsSection.promise.headlineBn || ''),
        description: nonEmpty(data.aboutUsSection?.promise?.description, def.aboutUsSection.promise.description),
        descriptionBn: nonEmpty(
          data.aboutUsSection?.promise?.descriptionBn,
          def.aboutUsSection.promise.descriptionBn || ''
        )
      },
      vision: {
        ...def.aboutUsSection.vision,
        ...(data.aboutUsSection?.vision || {}),
        headline: nonEmpty(data.aboutUsSection?.vision?.headline, def.aboutUsSection.vision.headline),
        headlineBn: nonEmpty(data.aboutUsSection?.vision?.headlineBn, def.aboutUsSection.vision.headlineBn || ''),
        description: nonEmpty(data.aboutUsSection?.vision?.description, def.aboutUsSection.vision.description),
        descriptionBn: nonEmpty(
          data.aboutUsSection?.vision?.descriptionBn,
          def.aboutUsSection.vision.descriptionBn || ''
        )
      }
    },
    productsSection: {
      ...def.productsSection,
      ...(data.productsSection || {}),
      tagline: nonEmpty(data.productsSection?.tagline, def.productsSection.tagline),
      taglineBn: nonEmpty(data.productsSection?.taglineBn, def.productsSection.taglineBn || ''),
      headline: nonEmpty(data.productsSection?.headline, def.productsSection.headline),
      headlineBn: nonEmpty(data.productsSection?.headlineBn, def.productsSection.headlineBn || ''),
      description: nonEmpty(data.productsSection?.description, def.productsSection.description),
      descriptionBn: nonEmpty(data.productsSection?.descriptionBn, def.productsSection.descriptionBn || '')
    },
    investSection: {
      ...def.investSection,
      ...(data.investSection || {}),
      tagline: nonEmpty(data.investSection?.tagline, def.investSection.tagline),
      taglineBn: nonEmpty(data.investSection?.taglineBn, def.investSection.taglineBn || ''),
      headline: nonEmpty(data.investSection?.headline, def.investSection.headline),
      headlineBn: nonEmpty(data.investSection?.headlineBn, def.investSection.headlineBn || ''),
      description: nonEmpty(data.investSection?.description, def.investSection.description),
      descriptionBn: nonEmpty(data.investSection?.descriptionBn, def.investSection.descriptionBn || '')
    },
    contactSection: {
      ...def.contactSection,
      ...(data.contactSection || {}),
      tagline: nonEmpty(data.contactSection?.tagline, def.contactSection.tagline),
      taglineBn: nonEmpty(data.contactSection?.taglineBn, def.contactSection.taglineBn || ''),
      headline: nonEmpty(data.contactSection?.headline, def.contactSection.headline),
      headlineBn: nonEmpty(data.contactSection?.headlineBn, def.contactSection.headlineBn || ''),
      description: nonEmpty(data.contactSection?.description, def.contactSection.description),
      descriptionBn: nonEmpty(data.contactSection?.descriptionBn, def.contactSection.descriptionBn || ''),
      info: {
        location: {
          ...def.contactSection.info.location,
          ...(data.contactSection?.info?.location || {}),
          title: nonEmpty(data.contactSection?.info?.location?.title, def.contactSection.info.location.title),
          titleBn: nonEmpty(
            data.contactSection?.info?.location?.titleBn,
            def.contactSection.info.location.titleBn || ''
          ),
          text: nonEmpty(data.contactSection?.info?.location?.text, def.contactSection.info.location.text),
          textBn: nonEmpty(data.contactSection?.info?.location?.textBn, def.contactSection.info.location.textBn || '')
        },
        whatsapp: {
          ...def.contactSection.info.whatsapp,
          ...(data.contactSection?.info?.whatsapp || {}),
          title: nonEmpty(data.contactSection?.info?.whatsapp?.title, def.contactSection.info.whatsapp.title),
          titleBn: nonEmpty(
            data.contactSection?.info?.whatsapp?.titleBn,
            def.contactSection.info.whatsapp.titleBn || ''
          ),
          text: nonEmpty(data.contactSection?.info?.whatsapp?.text, def.contactSection.info.whatsapp.text),
          textBn: nonEmpty(data.contactSection?.info?.whatsapp?.textBn, def.contactSection.info.whatsapp.textBn || '')
        },
        email: {
          ...def.contactSection.info.email,
          ...(data.contactSection?.info?.email || {}),
          title: nonEmpty(data.contactSection?.info?.email?.title, def.contactSection.info.email.title),
          titleBn: nonEmpty(data.contactSection?.info?.email?.titleBn, def.contactSection.info.email.titleBn || ''),
          text: nonEmpty(data.contactSection?.info?.email?.text, def.contactSection.info.email.text),
          textBn: nonEmpty(data.contactSection?.info?.email?.textBn, def.contactSection.info.email.textBn || '')
        }
      }
    },
    faqSection: {
      ...def.faqSection,
      ...(data.faqSection || {}),
      headline: nonEmpty(data.faqSection?.headline, def.faqSection.headline),
      headlineBn: nonEmpty(data.faqSection?.headlineBn, def.faqSection.headlineBn || ''),
      description: nonEmpty(data.faqSection?.description, def.faqSection.description),
      descriptionBn: nonEmpty(data.faqSection?.descriptionBn, def.faqSection.descriptionBn || ''),
      faqs: mergedFaqs
    }
  };
}
