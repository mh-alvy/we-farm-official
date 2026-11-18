import { Product, Project } from '../types';
import { toBengaliDigits, toEnglishDigits } from './siteSettingsDefaults';

const PRODUCT_NAME_EN_TO_BN: Record<string, string> = {
  'hen meat': 'মুরগির মাংস',
  'chicken meat': 'মুরগির মাংস',
  'chicken': 'মুরগির মাংস',
  'deshi chicken': 'দেশি মুরগির মাংস',
  'country chicken': 'দেশি মুরগির মাংস',
  'rooster meat': 'মোরগের মাংস',
  'egg': 'ডিম',
  'eggs': 'ডিম',
  'fresh egg': 'তাজা ডিম',
  'fresh eggs': 'তাজা ডিম',
  'farm egg': 'খামারের ডিম',
  'hen egg': 'মুরগির ডিম',
  'duck egg': 'হাঁসের ডিম',
  'duck meat': 'হাঁসের মাংস',
  'duck': 'হাঁসের মাংস',
  'cow meat': 'গরুর মাংস',
  'beef': 'গরুর মাংস',
  'fresh cow meat': 'তাজা গরুর মাংস',
  'organic beef': 'অর্গানিক গরুর মাংস',
  'full cream milk': 'ফুল ক্রিম দুধ',
  'cow milk': 'গরুর দুধ',
  'fresh cow milk': 'তাজা গরুর দুধ',
  'fresh milk': 'তাজা দুধ',
  'milk': 'খাঁটি দুধ',
  'raw milk': 'খাঁটি কাঁচা দুধ',
  'organic milk': 'অর্গানিক দুধ',
  'mutton': 'খাসির মাংস',
  'goat meat': 'খাসির মাংস',
  'lamb meat': 'ভেড়ার মাংস',
  'ghee': 'খাঁটি ঘি',
  'pure ghee': 'খাঁটি গাওয়া ঘি',
  'cow ghee': 'গরুর খাঁটি ঘি',
  'deshi ghee': 'দেশি গাওয়া ঘি',
  'butter': 'মাখন',
  'yogurt': 'দই',
  'sweet yogurt': 'মিষ্টি দই',
  'sour yogurt': 'টক দই',
  'curd': 'দই',
  'cheese': 'পনির',
  'paneer': 'পনির',
  'honey': 'খাঁটি মধু',
  'natural honey': 'প্রাকৃতিক খাঁটি মধু',
  'mustard oil': 'খাঁটি সরিষার তেল',
};

const PRODUCT_NAME_BN_TO_EN: Record<string, string> = {
  'মুরগির মাংস': 'Hen Meat',
  'দেশি মুরগির মাংস': 'Deshi Chicken Meat',
  'ডিম': 'Egg',
  'তাজা ডিম': 'Fresh Egg',
  'খামারের ডিম': 'Farm Fresh Egg',
  'হাঁসের ডিম': 'Duck Egg',
  'হাঁসের মাংস': 'Duck Meat',
  'গরুর মাংস': 'Cow Meat',
  'তাজা গরুর মাংস': 'Fresh Cow Meat',
  'ফুল ক্রিম দুধ': 'Full Cream Milk',
  'গরুর দুধ': 'Cow Milk',
  'তাজা গরুর দুধ': 'Fresh Cow Milk',
  'খাঁটি দুধ': 'Pure Milk',
  'খাসির মাংস': 'Mutton',
  'খাঁটি ঘি': 'Pure Ghee',
  'খাঁটি গাওয়া ঘি': 'Pure Cow Ghee',
  'মাখন': 'Butter',
  'দই': 'Yogurt',
  'পনির': 'Cheese',
  'খাঁটি মধু': 'Pure Honey',
  'খাঁটি সরিষার তেল': 'Pure Mustard Oil',
};

const PRODUCT_DESC_EN_TO_BN: Record<string, string> = {
  'fresh duck meat': 'খামারের প্রাকৃতিক পরিবেশে পালিত তাজা ও সুস্বাদু হাঁসের মাংস।',
  'fresh cow meat with high protein & extra ordinary fiber.':
    'উচ্চ প্রোটিন ও পুষ্টিসমৃদ্ধ খামারের ১০০% হালাল ও তাজা গরুর মাংস।',
  'fresh cow meat with high protein & extraordinary fiber.':
    'উচ্চ প্রোটিন ও পুষ্টিসমৃদ্ধ খামারের ১০০% হালাল ও তাজা গরুর মাংস।',
  'fresh cow meat': 'খামারের প্রাকৃতিক খাদ্যে বেড়ে ওঠা সুস্থ গরুর তাজা মাংস।',
  'fresh cow milk': 'খামার থেকে সরাসরি সংগৃহীত ১০০% খাঁটি ও ভেজালমুক্ত তাজা গরুর দুধ।',
  'fresh full cream milk': 'খামার থেকে সরাসরি সংগৃহীত ঘন ও পুষ্টিকর ফুল ক্রিম গরুর দুধ।',
  'fresh hen meat': 'প্রাকৃতিক পরিবেশে পালিত খামারের তাজা ও নিরাপদ মুরগির মাংস।',
  'fresh egg': 'খামারের প্রাকৃতিক খাদ্যে পালিত মুরগির পুষ্টিকর তাজা ডিম।',
  'fresh eggs': 'খামারের প্রাকৃতিক খাদ্যে পালিত মুরগির পুষ্টিকর তাজা ডিম।',
};

const DEFAULT_PRODUCT_DESC_BY_NAME_BN: Record<string, string> = {
  'hen meat': 'প্রাকৃতিক পরিবেশে পালিত খামারের তাজা ও নিরাপদ মুরগির মাংস।',
  'مুরগির মাংস': 'প্রাকৃতিক পরিবেশে পালিত খামারের তাজা ও নিরাপদ মুরগির মাংস।',
  'মুরগির মাংস': 'প্রাকৃতিক পরিবেশে পালিত খামারের তাজা ও নিরাপদ মুরগির মাংস।',
  'egg': 'খামারের প্রাকৃতিক খাদ্যে পালিত মুরগির পুষ্টিকর তাজা ডিম।',
  'eggs': 'খামারের প্রাকৃতিক খাদ্যে পালিত মুরগির পুষ্টিকর তাজা ডিম।',
  'ডিম': 'খামারের প্রাকৃতিক খাদ্যে পালিত মুরগির পুষ্টিকর তাজা ডিম।',
  'duck meat': 'খামারের প্রাকৃতিক পরিবেশে পালিত তাজা ও সুস্বাদু হাঁসের মাংস।',
  'হাঁসের মাংস': 'খামারের প্রাকৃতিক পরিবেশে পালিত তাজা ও সুস্বাদু হাঁসের মাংস।',
  'cow meat': 'উচ্চ প্রোটিন ও পুষ্টিসমৃদ্ধ খামারের ১০০% হালাল ও তাজা গরুর মাংস।',
  'গরুর মাংস': 'উচ্চ প্রোটিন ও পুষ্টিসমৃদ্ধ খামারের ১০০% হালাল ও তাজা গরুর মাংস।',
  'full cream milk': 'খামার থেকে সরাসরি সংগৃহীত ১০০% খাঁটি ও তাজা ফুল ক্রিম গরুর দুধ।',
  'ফুল ক্রিম দুধ': 'খামার থেকে সরাসরি সংগৃহীত ১০০% খাঁটি ও তাজা ফুল ক্রিম গরুর দুধ।',
};

const DEFAULT_PRODUCT_DESC_BY_NAME_EN: Record<string, string> = {
  'hen meat': 'Farm-fresh, naturally raised hen meat free from hormones and antibiotics.',
  'মুরগির মাংস': 'Farm-fresh, naturally raised hen meat free from hormones and antibiotics.',
  'egg': 'Nutritious farm-fresh eggs from naturally fed free-range hens.',
  'eggs': 'Nutritious farm-fresh eggs from naturally fed free-range hens.',
  'ডিম': 'Nutritious farm-fresh eggs from naturally fed free-range hens.',
  'duck meat': 'Fresh, tender duck meat raised in a clean, natural farm environment.',
  'হাঁসের মাংস': 'Fresh, tender duck meat raised in a clean, natural farm environment.',
  'cow meat': 'Fresh cow meat with high protein and rich natural nutrition.',
  'গরুর মাংস': 'Fresh cow meat with high protein and rich natural nutrition.',
  'full cream milk': '100% pure, farm-fresh full cream cow milk with zero preservatives.',
  'ফুল ক্রিম দুধ': '100% pure, farm-fresh full cream cow milk with zero preservatives.',
};

const PROJECT_TITLE_EN_TO_BN: Record<string, string> = {
  'dairy project': 'ডেইরি প্রোজেক্ট (গাভী পালন)',
  'dairy farming project': 'ডেইরি খামার প্রোজেক্ট',
  'solar powered dairy unit': 'সোলার চালিত আধুনিক ডেইরি ইউনিট',
  'cattle fattening project': 'গরু মোটাতাজাকরণ প্রোজেক্ট',
  'fattening project': 'গরু মোটাতাজাকরণ প্রোজেক্ট',
  'organic dairy expansion': 'অর্গানিক ডেইরি সম্প্রসারণ প্রোজেক্ট',
  'poultry project': 'পোল্ট্রি খামার প্রোজেক্ট',
  'duck farming project': 'হাঁস পালন প্রোজেক্ট',
};

export function hasBengaliChars(text?: string): boolean {
  return Boolean(text && /[\u0980-\u09FF]/.test(text));
}

export function hasEnglishLetters(text?: string): boolean {
  return Boolean(text && /[a-zA-Z]/.test(text));
}

export function translateProductNameSync(name?: string, targetLang: 'bn' | 'en' = 'bn'): string {
  const raw = (name || '').trim();
  if (!raw) return '';
  const lower = raw.toLowerCase();

  if (targetLang === 'bn') {
    if (PRODUCT_NAME_EN_TO_BN[lower]) return PRODUCT_NAME_EN_TO_BN[lower];
    if (hasBengaliChars(raw) && !hasEnglishLetters(raw)) return raw;

    // Word-level smart fallback for composite English product names
    let result = raw
      .replace(/\bfull\s+cream\s+milk\b/gi, 'ফুল ক্রিম দুধ')
      .replace(/\bfresh\s+cow\s+milk\b/gi, 'তাজা গরুর দুধ')
      .replace(/\bcow\s+milk\b/gi, 'গরুর দুধ')
      .replace(/\bcow\s+meat\b/gi, 'গরুর মাংস')
      .replace(/\bhen\s+meat\b/gi, 'মুরগির মাংস')
      .replace(/\bchicken\s+meat\b/gi, 'মুরগির মাংস')
      .replace(/\bduck\s+meat\b/gi, 'হাঁসের মাংস')
      .replace(/\bgoat\s+meat\b/gi, 'খাসির মাংস')
      .replace(/\bfresh\b/gi, 'তাজা')
      .replace(/\borganic\b/gi, 'অর্গানিক')
      .replace(/\bpure\b/gi, 'খাঁটি')
      .replace(/\bnatural\b/gi, 'প্রাকৃতিক')
      .replace(/\bmilk\b/gi, 'দুধ')
      .replace(/\bmeat\b/gi, 'মাংস')
      .replace(/\bbeef\b/gi, 'গরুর মাংস')
      .replace(/\bmutton\b/gi, 'খাসির মাংস')
      .replace(/\bchicken\b/gi, 'মুরগি')
      .replace(/\bhen\b/gi, 'মুরগি')
      .replace(/\bduck\b/gi, 'হাঁস')
      .replace(/\bcow\b/gi, 'গরু')
      .replace(/\begg\b/gi, 'ডিম')
      .replace(/\beggs\b/gi, 'ডিম')
      .replace(/\bghee\b/gi, 'ঘি')
      .replace(/\bhoney\b/gi, 'মধু')
      .replace(/\bcheese\b/gi, 'পনির')
      .replace(/\byogurt\b/gi, 'দই')
      .replace(/\bbutter\b/gi, 'মাখন');
    return toBengaliDigits(result.trim());
  } else {
    if (PRODUCT_NAME_BN_TO_EN[raw]) return PRODUCT_NAME_BN_TO_EN[raw];
    return toEnglishDigits(raw);
  }
}

export function translateProductDescSync(
  description?: string,
  productName?: string,
  targetLang: 'bn' | 'en' = 'bn'
): string {
  const raw = (description || '').trim();
  const lower = raw.toLowerCase();
  const nameKey = (productName || '').trim().toLowerCase();

  if (targetLang === 'bn') {
    if (!raw) {
      return DEFAULT_PRODUCT_DESC_BY_NAME_BN[nameKey] || 'খামার থেকে সরাসরি সংগৃহীত ১০০% প্রাকৃতিক ও তাজা পণ্য।';
    }
    if (PRODUCT_DESC_EN_TO_BN[lower]) return PRODUCT_DESC_EN_TO_BN[lower];
    if (hasBengaliChars(raw) && !hasEnglishLetters(raw)) return raw;

    // Phrase-level smart conversion for common English product descriptions
    let result = raw
      .replace(/fresh cow meat with high protein\s*&\s*extra\s*ordinary fiber\.?/gi, 'উচ্চ প্রোটিন ও পুষ্টিসমৃদ্ধ খামারের ১০০% হালাল ও তাজা গরুর মাংস।')
      .replace(/fresh duck meat\.?/gi, 'খামারের প্রাকৃতিক পরিবেশে পালিত তাজা ও সুস্বাদু হাঁসের মাংস।')
      .replace(/fresh cow milk\.?/gi, 'খামার থেকে সরাসরি সংগৃহীত ১০০% খাঁটি ও ভেজালমুক্ত তাজা গরুর দুধ।')
      .replace(/fresh hen meat\.?/gi, 'প্রাকৃতিক পরিবেশে পালিত খামারের তাজা ও নিরাপদ মুরগির মাংস।')
      .replace(/\bfull\s+cream\s+milk\b/gi, 'ফুল ক্রিম দুধ')
      .replace(/\bcow\s+meat\b/gi, 'গরুর মাংস')
      .replace(/\bduck\s+meat\b/gi, 'হাঁসের মাংস')
      .replace(/\bhen\s+meat\b/gi, 'মুরগির মাংস')
      .replace(/\bcow\s+milk\b/gi, 'গরুর দুধ')
      .replace(/\bhigh\s+protein\b/gi, 'উচ্চ প্রোটিন')
      .replace(/\bextra\s*ordinary\s+fiber\b/gi, 'সমৃদ্ধ ফাইবার ও পুষ্টিগুণ')
      .replace(/\bwith\b/gi, 'সমৃদ্ধ')
      .replace(/\bfresh\b/gi, 'তাজা')
      .replace(/\borganic\b/gi, 'অর্গানিক')
      .replace(/\bpure\b/gi, 'খাঁটি')
      .replace(/\bnatural\b/gi, 'প্রাকৃতিক');

    return toBengaliDigits(result.trim());
  } else {
    if (!raw) {
      return DEFAULT_PRODUCT_DESC_BY_NAME_EN[nameKey] || '100% natural, chemical-free farm fresh product.';
    }
    return toEnglishDigits(raw);
  }
}

export function getLocalizedProductName(product: Product, isBn: boolean): string {
  if (isBn) {
    if (product.nameBn && product.nameBn.trim()) return product.nameBn.trim();
    return translateProductNameSync(product.name, 'bn');
  } else {
    if (product.name && !hasBengaliChars(product.name)) return product.name.trim();
    return translateProductNameSync(product.name, 'en');
  }
}

export function getLocalizedProductDesc(product: Product, isBn: boolean): string {
  if (isBn) {
    if (product.descriptionBn && product.descriptionBn.trim()) return product.descriptionBn.trim();
    return translateProductDescSync(product.description, product.name, 'bn');
  } else {
    if (product.description && product.description.trim() && !hasBengaliChars(product.description)) {
      return product.description.trim();
    }
    return translateProductDescSync(product.description, product.name, 'en');
  }
}

export function getLocalizedUnit(unit?: string, productName?: string, isBn: boolean = false): string {
  const rawUnit = (
    unit ||
    ((productName || '').toLowerCase().includes('egg') || (productName || '').includes('ডিম')
      ? 'pc'
      : (productName || '').toLowerCase().includes('milk') || (productName || '').includes('দুধ')
      ? 'L'
      : 'kg')
  ).trim();

  const lower = rawUnit.toLowerCase();
  if (isBn) {
    if (lower === 'kg' || lower === 'kilogram' || lower === 'কেজি') return 'কেজি';
    if (lower === 'pc' || lower === 'pcs' || lower === 'piece' || lower === 'পিস' || lower === 'টি') return 'পিস';
    if (lower === 'l' || lower === 'liter' || lower === 'litre' || lower === 'লিটার') return 'লিটার';
    if (lower === 'gm' || lower === 'g' || lower === 'gram' || lower === 'গ্রাম') return 'গ্রাম';
    if (lower === 'dozen' || lower === 'ডজন') return 'ডজন';
    return rawUnit;
  } else {
    if (lower === 'kg' || lower === 'kilogram' || rawUnit === 'কেজি') return 'kg';
    if (lower === 'pc' || lower === 'pcs' || lower === 'piece' || rawUnit === 'পিস' || rawUnit === 'টি') return 'pc';
    if (lower === 'l' || lower === 'liter' || lower === 'litre' || rawUnit === 'লিটার') return 'L';
    return rawUnit;
  }
}

export function formatLocalizedPrice(amount: number, isBn: boolean): string {
  const formatted = `৳${Number(amount || 0).toLocaleString('en-BD')}`;
  return isBn ? toBengaliDigits(formatted) : formatted;
}

export function formatLocalizedNumber(value: number | string, isBn: boolean): string {
  const str = String(value ?? '');
  return isBn ? toBengaliDigits(str) : toEnglishDigits(str);
}

export function getFallbackProductImage(productName?: string): string {
  const lower = (productName || '').toLowerCase();
  if (lower.includes('milk') || lower.includes('দুধ')) {
    return 'https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&q=80&w=800';
  }
  if (lower.includes('egg') || lower.includes('ডিম')) {
    return 'https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?auto=format&fit=crop&q=80&w=800';
  }
  if (lower.includes('duck') || lower.includes('হাঁস')) {
    return 'https://images.unsplash.com/photo-1604503468506-a8da13d82791?auto=format&fit=crop&q=80&w=800';
  }
  if (lower.includes('cow') || lower.includes('beef') || lower.includes('গরু')) {
    return 'https://images.unsplash.com/photo-1603048297172-c92544798d5a?auto=format&fit=crop&q=80&w=800';
  }
  if (lower.includes('hen') || lower.includes('chicken') || lower.includes('মুরগি')) {
    return 'https://images.unsplash.com/photo-1587593810167-a84920ea0781?auto=format&fit=crop&q=80&w=800';
  }
  return 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=800';
}

export function getLocalizedProjectTitle(project: Project, isBn: boolean): string {
  if (isBn) {
    if (project.titleBn && project.titleBn.trim()) return project.titleBn.trim();
    const raw = (project.title || '').trim();
    const lower = raw.toLowerCase();
    if (PROJECT_TITLE_EN_TO_BN[lower]) return PROJECT_TITLE_EN_TO_BN[lower];
    if (hasBengaliChars(raw) && !hasEnglishLetters(raw)) return raw;
    return toBengaliDigits(
      raw
        .replace(/\bdairy\s+project\b/gi, 'ডেইরি প্রোজেক্ট')
        .replace(/\bfattening\s+project\b/gi, 'মোটাতাজাকরণ প্রোজেক্ট')
        .replace(/\bcattle\s+fattening\b/gi, 'গরু মোটাতাজাকরণ')
        .replace(/\bpoultry\s+project\b/gi, 'পোল্ট্রি প্রোজেক্ট')
        .replace(/\bproject\b/gi, 'প্রোজেক্ট')
        .replace(/\bdairy\b/gi, 'ডেইরি')
    );
  } else {
    return (project.title || '').trim();
  }
}

export function getLocalizedProjectDesc(project: Project, isBn: boolean): string {
  if (isBn) {
    if (project.descriptionBn && project.descriptionBn.trim()) return project.descriptionBn.trim();
    const raw = (project.description || '').trim();
    if (hasBengaliChars(raw) && !hasEnglishLetters(raw)) return raw;
    return toBengaliDigits(raw);
  } else {
    return (project.description || '').trim();
  }
}
