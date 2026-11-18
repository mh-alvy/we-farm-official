import React, { createContext, useContext, useState } from 'react';

type Language = 'bn' | 'en';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const translations: { [key: string]: { bn: string; en: string } } = {
  // Navbar
  'nav.home': { bn: 'হোম', en: 'Home' },
  'nav.products': { bn: 'পণ্যসমূহ', en: 'Products' },
  'nav.about': { bn: 'আমাদের সম্পর্কে', en: 'About' },
  'nav.invest': { bn: 'বিনিয়োগ', en: 'Invest' },
  'nav.contact': { bn: 'যোগাযোগ', en: 'Contact' },
  'nav.login': { bn: 'লগইন', en: 'Login' },
  'nav.logout': { bn: 'লগআউট', en: 'Logout' },
  'nav.profile': { bn: 'প্রোফাইল', en: 'Profile' },
  'nav.dashboard': { bn: 'ড্যাশবোর্ড', en: 'Dashboard' },

  // Hero / Home
  'hero.tagline': { bn: 'মাটি থেকে আত্মার বন্ধন', en: 'SOIL TO SOUL' },
  'hero.title': { bn: 'আমাদের খামার থেকে সরাসরি তাজা ও বিশুদ্ধ পণ্য', en: 'Fresh Farm Products From Our Farm' },
  'hero.desc': {
    bn: 'মাটি থেকে আত্মার দর্শনে অনুপ্রাণিত হয়ে আমরা প্রাকৃতিক ও টেকসই পদ্ধতিতে খামার পরিচালনা করি—যেন প্রতিটি খাবারে থাকে বিশুদ্ধ পুষ্টি এবং প্রকৃতির প্রতি ভালোবাসা।',
    en: 'Rooted in the philosophy of Soil to Soul. We practice regenerative farming to bring you meat and dairy that nourishes the body and respects the earth.'
  },
  'hero.investBtn': { bn: 'ইনভেস্টর হোন', en: 'Become an Investor' },
  'hero.shopBtn': { bn: 'পণ্য দেখুন', en: 'Explore Shop' },

  // Stats
  'stats.animals': { bn: 'সুস্থ প্রাণিসম্পদ', en: 'Happy Animals' },
  'stats.soil': { bn: 'প্রাকৃতিক মাটি', en: 'Natural Soil' },
  'stats.care': { bn: 'সফল ডেলিভারি', en: 'Fresh Deliveries' },
  'stats.projects': { bn: 'সফল প্রোজেক্ট', en: 'Successful Projects' },

  // Why choose us
  'features.tagline': { bn: 'কেন আমাদের বেছে নেবেন', en: 'WHY CHOOSE US' },
  'features.headline': { bn: 'প্রকৃত ও প্রাকৃতিক খামারের পার্থক্য অনুভব করুন', en: 'Experience the Difference of Real Farming' },
  'features.natural': { bn: 'প্রাকৃতিক কৃষি পদ্ধতি', en: 'Natural Farming' },
  'features.naturalDesc': { bn: 'প্রকৃতির সাথে সামঞ্জস্য রেখে মাটির উর্বরতা ও পরিবেশ রক্ষাকারী কৃষি ব্যবস্থা।', en: 'Regenerative practices that work with nature, not against it.' },
  'features.animals': { bn: 'সুস্থ ও সবল প্রাণিসম্পদ', en: 'Healthy Animals' },
  'features.animalsDesc': { bn: 'কোনো ক্ষতিকর হরমোন বা অ্যান্টিবায়োটিক ছাড়াই প্রাকৃতিক খাদ্যে বেড়ে ওঠা গবাদিপশু।', en: 'Free-range livestock raised on natural diets without hormones.' },
  'features.fresh': { bn: 'সতেজ ও নির্ভেজাল পণ্য', en: 'Fresh Products' },
  'features.freshDesc': { bn: 'খামার থেকে সরাসরি আপনার ঘরে যত্ন ও দ্রুততার সাথে পৌঁছে দেওয়া তাজা পণ্য।', en: 'Farm-to-table freshness delivered with care and speed.' },
  'features.trusted': { bn: 'বিশ্বস্ত ও স্বচ্ছ ব্যবস্থাপনা', en: 'Trusted Farm' },
  'features.trustedDesc': { bn: 'মাটি থেকে পাত পর্যন্ত শতভাগ স্বচ্ছ ও নির্ভরযোগ্য খামার ব্যবস্থাপনা।', en: 'Transparent practices you can trust, from soil to soul.' },

  // About Section
  'about.tagline': { bn: 'উইফার্ম সম্পর্কে', en: 'ABOUT WEFARM' },
  'about.headline': { bn: 'মাটি থেকে আত্মা — আমাদের অঙ্গীকার', en: 'From Soil to Soul — Our Promise' },
  'about.desc': {
    bn: 'খাদ্য উৎপাদনে সততা ও বিশুদ্ধতার বিশ্বাস থেকেই উইফার্মের জন্ম। আমরা একটি পারিবারিক ও প্রকৃতিবান্ধব খামার, যা মাটির স্বাস্থ্য রক্ষা করে মানুষের কাছে পুষ্টিকর খাবার পৌঁছে দিতে প্রতিশ্রুতিবদ্ধ।',
    en: "WeFarm was born from a belief that food should be grown with integrity. We're a family-run regenerative farm committed to nourishing communities while healing the land."
  },
  'about.val1': { bn: 'উর্বর ও প্রাকৃতিক মাটি', en: 'Regenerative Soil' },
  'about.val1Desc': {
    bn: 'জৈব সার ও প্রাকৃতিক আবর্তনের মাধ্যমে আমরা মাটির স্বাস্থ্য ও উর্বরতা রক্ষা করি।',
    en: 'We nurture the earth that nurtures us, building soil health through composting and crop rotation.'
  },
  'about.val2': { bn: 'মানবিক ও যত্নশীল পশুপালন', en: 'Ethical Husbandry' },
  'about.val2Desc': {
    bn: 'আমাদের প্রাণিসম্পদ মুক্ত পরিবেশে প্রাকৃতিক খাবার খেয়ে সুস্থ ও চাপমুক্তভাবে বেড়ে ওঠে।',
    en: 'Our animals roam freely, eat naturally, and live stress-free — the way nature intended.'
  },
  'about.val3': { bn: 'শতভাগ কেমিক্যালমুক্ত', en: 'Zero Chemicals' },
  'about.val3Desc': {
    bn: 'কোনো অ্যান্টিবায়োটিক, হরমোন বা কীটনাশক নেই—খামার থেকে সরাসরি আপনার টেবিলে বিশুদ্ধ খাবার।',
    en: 'No antibiotics, no hormones, no pesticides. Just pure, honest food from our farm to your table.'
  },
  'about.vision': { bn: 'আমাদের লক্ষ্য ও স্বপ্ন', en: 'Our Vision' },
  'about.visionDesc': {
    bn: '"এমন এক পৃথিবী গড়ে তোলা যেখানে প্রতিটি খাবার হবে প্রকৃতির সাথে সেতুবন্ধন, যেখানে কৃষি প্রকৃতিকে ক্ষতির বদলে সজীব করবে এবং মানুষ খাঁটি মাটির ফসলে সমৃদ্ধ হবে।"',
    en: '"To create a world where every meal is a connection to the earth, where farming heals instead of harms, and where communities thrive on the bounty of honest soil."'
  },

  // Projects Section
  'projects.tagline': { bn: 'আমাদের প্রোজেক্টসমূহ', en: 'OUR PROJECTS' },
  'projects.headline': { bn: 'টেকসই ও সবুজ ভবিষ্যতে বিনিয়োগ করুন', en: 'Invest in Sustainable Future' },
  'projects.desc': {
    bn: 'মাটি থেকে আত্মার এই যাত্রায় যুক্ত হোন। আমাদের প্রকৃতিবান্ধব কৃষি প্রোজেক্টে বিনিয়োগ করে হালাল ও স্বচ্ছ লভ্যাংশ অর্জনের পাশাপাশি প্রকৃতি রক্ষায় অংশ নিন।',
    en: 'Join the Soil to Soul movement. Support our regenerative farming projects and earn returns while healing the earth.'
  },
  'projects.minInvestment': { bn: 'সর্বনিম্ন বিনিয়োগ', en: 'Min Investment' },
  'projects.targetAmount': { bn: 'লক্ষ্যমাত্রা', en: 'Target Amount' },
  'projects.investNow': { bn: 'বিনিয়োগ করুন', en: 'Invest Now' },
  'projects.viewDetails': { bn: 'বিস্তারিত দেখুন', en: 'View Details' },
  'projects.share': { bn: 'শেয়ার', en: 'Share' },
  'projects.copied': { bn: 'কপি হয়েছে!', en: 'Copied!' },
  'projects.active': { bn: 'সক্রিয় / চলমান', en: 'Active / Running' },
  'projects.closed': { bn: 'বন্ধ / সমাপ্ত', en: 'Closed / Inactive' },

  // Shop Section
  'shop.tagline': { bn: 'আমাদের পণ্যসমূহ', en: 'OUR PRODUCTS' },
  'shop.headline': { bn: 'খাঁটি মাটির নির্ভেজাল ও তাজা খাবার', en: 'Honest Food from Honest Soil' },
  'shop.desc': { bn: 'উইফার্মের খামার থেকে সরাসরি আপনার খাবার টেবিলে তাজা ও অর্গানিক পণ্য।', en: 'Fresh products directly from WeFarm to your table.' },
  'shop.natural': { bn: 'প্রাকৃতিক', en: 'Natural' },
  'shop.order': { bn: 'অর্ডার করুন', en: 'Order' },
  'shop.addToCart': { bn: 'কার্টে যোগ করুন', en: 'Add to Cart' },
  'shop.quantity': { bn: 'পরিমাণ', en: 'Quantity' },
  'shop.totalPrice': { bn: 'মোট মূল্য', en: 'Total Price' },
  'shop.placeOrder': { bn: 'অর্ডার নিশ্চিত করুন', en: 'Place Order' },
  'shop.processing': { bn: 'প্রক্রিয়াধীন...', en: 'Processing...' },
  'shop.orderPlaced': { bn: 'অর্ডার সম্পন্ন হয়েছে!', en: 'Order Placed!' },
  'shop.orderReadyNotice': { bn: 'আপনার অর্ডারটি প্রস্তুত হলে আমরা আপনাকে জানাবো।', en: "We'll notify you when your order is ready." },

  // Contact Section
  'contact.tagline': { bn: 'যোগাযোগ করুন', en: 'GET IN TOUCH' },
  'contact.headline': { bn: 'উইফার্মের সাথে যোগাযোগ করুন', en: 'Contact WeFarm' },
  'contact.desc': {
    bn: 'হোয়াটসঅ্যাপের মাধ্যমে বা নিচের ফর্মটি পূরণ করে আমাদের সাথে যোগাযোগ করুন — আমরা আপনার বার্তার অপেক্ষায় আছি।',
    en: "Reach out via WhatsApp or fill the form below — we'd love to hear from you."
  },
  'contact.name': { bn: 'আপনার নাম', en: 'Your Name' },
  'contact.phone': { bn: 'মোবাইল নম্বর', en: 'Phone Number' },
  'contact.message': { bn: 'আপনার বার্তা', en: 'Your Message' },
  'contact.sendBtn': { bn: 'হোয়াটসঅ্যাপে পাঠান', en: 'Send via WhatsApp' },
  'contact.redirecting': { bn: 'হোয়াটসঅ্যাপে নিয়ে যাওয়া হচ্ছে...', en: 'Redirecting to WhatsApp...' },
  'contact.thanks': { bn: 'আমাদের সাথে যোগাযোগ করার জন্য ধন্যবাদ।', en: 'Thank you for reaching out to us.' },
  'contact.location': { bn: 'ঠিকানা', en: 'Location' },
  'contact.whatsapp': { bn: 'হোয়াটসঅ্যাপ', en: 'WhatsApp' },
  'contact.email': { bn: 'ইমেইল', en: 'Email' },

  // FAQ Section
  'faq.headline': { bn: 'সচরাচর জিজ্ঞাসিত প্রশ্নাবলী (FAQ)', en: 'Frequently Asked Questions' },
  'faq.desc': {
    bn: 'উইফার্ম এবং আমাদের কৃষি ও বিনিয়োগ ব্যবস্থা সম্পর্কে আপনার মনে থাকা সকল প্রশ্নের উত্তর।',
    en: 'Everything you need to know about WeFarm and our farming ecosystem.'
  },

  // Footer
  'footer.taglineDesc': {
    bn: 'মাটি থেকে আত্মার বন্ধন। টেকসই ও প্রকৃতিবান্ধব কৃষি ব্যবস্থা এবং লাভজনক কৃষি বিনিয়োগের বিশ্বস্ত মাধ্যম।',
    en: 'Soil to Soul. Empowering sustainable farming and connecting investors with high-impact agricultural projects.'
  },
  'footer.quickLinks': { bn: 'প্রয়োজনীয় লিংক', en: 'Quick Links' },
  'footer.aboutUs': { bn: 'আমাদের সম্পর্কে', en: 'About Us' },
  'footer.ourProjects': { bn: 'আমাদের প্রোজেক্টসমূহ', en: 'Our Projects' },
  'footer.shopProducts': { bn: 'পণ্য ক্রয় করুন', en: 'Shop Products' },
  'footer.faq': { bn: 'সচরাচর জিজ্ঞাসা (FAQ)', en: 'FAQ' },
  'footer.contactUs': { bn: 'যোগাযোগের ঠিকানা', en: 'Contact Us' },
  'footer.ourLocation': { bn: 'আমাদের অবস্থান', en: 'Our Location' },
  'footer.openMap': { bn: 'গুগল ম্যাপে দেখুন', en: 'Open in Google Maps' },

  // Common
  'common.rights': { bn: 'সর্বস্বত্ব সংরক্ষিত', en: 'All rights reserved' }
};

const LanguageContext = createContext<LanguageContextType>({
  language: 'bn',
  setLanguage: () => {},
  t: (key) => key
});

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    return (localStorage.getItem('wefarm_lang') as Language) || 'bn';
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('wefarm_lang', lang);
  };

  const t = (key: string): string => {
    if (translations[key] && translations[key][language]) {
      return translations[key][language];
    }
    return key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);
