export interface Cow {
  id?: string;
  name: string;
  category: 'Dairy' | 'Fattening' | 'Heifer';
  father?: string;
  mother?: string;
  age?: string;
  teethCount?: number;
  color?: string;
  purchaseStatus: 'Purchased' | 'Self Breed';
  date: string; // Purchase Date or Birth Date
  purchasePrice?: number;
  initialWeight?: number; // Purchase/Birth Weight
  healthStatus: 'Fit' | 'Unfit';
  healthDescription?: string;
  healthFileUrl?: string; // URL for attachment
  dailyFoodConsumption: number;
  
  // Dairy specific
  milkingStatus?: 'Milking Period' | 'Dry Period';
  dailyMilkSupply?: number;
  pregnancy?: 'Pregnant' | 'With Baby' | 'Without Baby';
  lactationCount?: number;
  
  // Fattening/Heifer specific
  breed?: 'Cross' | 'HF' | 'Native breed' | 'HWL' | 'RCC' | string;
  
  // Heifer specific
  gender?: 'Male' | 'Female';
  tagId?: string;

  // Legacy/System fields
  vaccination?: string;
  currentWeight?: number;
  sellingPrice?: number;
}

export interface MilkLog {
  id?: string;
  cowId: string;
  cowName: string;
  date: string;
  amount: number;
  unit: 'Kg' | 'L';
  type: 'Milking' | 'Consumption';
}

export interface VaccinationLog {
  id?: string;
  cowId: string;
  cowName: string;
  date: string;
  vaccineName: string;
  description: string;
}

export interface WeightLog {
  id?: string;
  cowId: string;
  cowName: string;
  date: string;
  weight: number; // kg
}

export interface Expense {
  id?: string;
  date: string;
  category: string;
  amount: number;
  description: string;
}

export interface Income {
  id?: string;
  date: string;
  category: string;
  amount: number;
  description: string;
}

export interface Product {
  id?: string;
  name: string;
  price: number;
  unit: 'Kg' | 'L' | 'pc';
  stock: number;
  description: string;
  imageUrl: string;
}

export interface Order {
  id?: string;
  customerName: string;
  customerEmail: string;
  productId: string;
  productName?: string;
  quantity: number;
  totalPrice: number;
  status: 'pending' | 'shipped' | 'delivered';
  date: string;
}

export interface Project {
  id?: string;
  title: string;
  description: string;
  targetAmount: number;
  currentAmount: number;
  minInvestment: number;
  status: 'Active' | 'Inactive';
  imageUrl: string;
  policyContent?: string;
  policyUrl?: string;
}

export interface Investment {
  id?: string;
  investorName: string;
  investorEmail: string;
  projectId: string;
  projectTitle?: string;
  amount: number;
  date: string;
}

export interface SiteSettings {
  id?: string;
  logo?: LogoContent;
  hero: HeroContent;
  featuresSection: FeaturesSectionContent;
  aboutSection: AboutSectionContent;
  statsSection: StatsSectionContent;
  aboutUsSection: AboutUsSectionContent;
  productsSection: SectionHeaderContent;
  investSection: SectionHeaderContent;
  contactSection: ContactSectionContent;
  faqSection: FAQSectionContent;
}

export interface LogoContent {
  navLogoUrl?: string;
  footerLogoUrl?: string;
  navLogoHeight?: number;
  footerLogoHeight?: number;
}

export interface HeroContent {
  tagline: string;
  title: string;
  description: string;
  images: string[];
  useScrollEffect?: boolean;
}

export interface FeaturesSectionContent {
  tagline: string;
  headline: string;
  features: FeatureItem[];
}

export interface FeatureItem {
  title: string;
  description: string;
  iconName: string; // Store icon name as string
}

export interface AboutSectionContent {
  tagline: string;
  headline: string;
  description: string;
  imageUrl: string;
  primaryButtonText: string;
  secondaryButtonText: string;
}

export interface StatsSectionContent {
  stats: StatItem[];
}

export interface StatItem {
  value: string;
  label: string;
}

export interface AboutUsSectionContent {
  promise: {
    tagline: string;
    headline: string;
    description: string;
    imageUrl: string;
  };
  vision: {
    headline: string;
    description: string;
  };
}

export interface SectionHeaderContent {
  tagline: string;
  headline: string;
  description: string;
}

export interface ContactSectionContent {
  tagline: string;
  headline: string;
  description: string;
  info: {
    location: ContactInfoItem;
    whatsapp: ContactInfoItem;
    email: ContactInfoItem;
  };
}

export interface ContactInfoItem {
  title: string;
  text: string;
}

export interface FAQSectionContent {
  headline: string;
  description: string;
  faqs: FAQItem[];
}

export interface FAQItem {
  question: string;
  answer: string;
}

export interface UserProfile {
  uid: string;
  email: string;
  name: string;
  phone?: string;
  role: 'admin' | 'investor';
  createdAt: string;
  investorProfile?: {
    // Personal Info
    dob?: string;
    fatherName?: string;
    motherName?: string;
    gender?: string;
    nidPassport?: string;
    
    // Contact Info
    emergencyPhone?: string;
    permanentAddress?: string;
    currentAddress?: string;
    
    // Occupational Info
    occupation?: string;
    organization?: string;
    designation?: string;
    
    // Bank Details
    bankName?: string;
    branchName?: string;
    accountName?: string;
    accountNumber?: string;
    routingNumber?: string;
    
    // Nominee Info
    nomineeName?: string;
    nomineeRelation?: string;
    nomineePhone?: string;
    nomineeNid?: string;
    nomineeNidFileUrl?: string;
    nidFileUrl?: string;
  };
}
