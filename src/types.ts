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

export interface DailyMilkEntry {
  id?: string;
  date: string;
  morningAmount: number;
  eveningAmount: number;
  totalAmount: number;
  notes?: string;
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
  voucherUrl?: string;
}

export interface Income {
  id?: string;
  date: string;
  category: string;
  amount: number;
  description: string;
  voucherUrl?: string;
}

export interface Product {
  id?: string;
  name: string;
  nameBn?: string;
  price: number;
  unit: 'Kg' | 'L' | 'pc' | string;
  stock: number;
  description: string;
  descriptionBn?: string;
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

export interface ProjectBatch {
  id: string;
  name: string;
  status: 'Open' | 'Closed';
  targetAmount?: number;
  createdAt?: string;
}

export interface ProjectRoiOption {
  rate: number;
  label?: string;
}

export interface Project {
  id?: string;
  title: string;
  titleBn?: string;
  description: string;
  descriptionBn?: string;
  targetAmount: number;
  currentAmount: number;
  minInvestment: number;
  roiRate?: number;
  roiOptions?: ProjectRoiOption[];
  status: 'Active' | 'Inactive';
  imageUrl: string;
  policyContent?: string;
  policyUrl?: string;
  profitType?: 'monthly' | 'one_time';
  dryPeriodMonthsPerYear?: number;
  batches?: ProjectBatch[];
}

export interface Investment {
  id?: string;
  investorUid?: string;
  investorName: string;
  investorEmail: string;
  investorPhone?: string;
  projectId: string;
  projectTitle?: string;
  batchId?: string;
  batchName?: string;
  profitStartMonth?: string; // YYYY-MM format (for monthly profit projects)
  amount: number;
  date: string;
}

export type MonthlyProfitStatus = 'Pending' | 'Sent' | 'Dry Period';

export interface BatchProfitRate {
  id?: string;
  projectId: string;
  batchId: string;
  month: string; // YYYY-MM
  profitPercentage: number;
  updatedAt: string;
}

export interface InvestmentProfitRecord {
  id?: string;
  investmentId: string;
  investorUid?: string;
  investorName: string;
  investorPhone?: string;
  investorEmail?: string;
  projectId: string;
  projectTitle: string;
  batchId: string;
  batchName: string;
  month: string; // YYYY-MM
  investedAmount: number;
  profitPercentage: number;
  profitAmount: number;
  status: MonthlyProfitStatus;
  smsSentAt?: string;
  updatedAt: string;
}

export interface SiteSettings {
  id?: string;
  logo?: LogoContent;
  hero: HeroContent;
  featuresSection: FeaturesSectionContent;
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
  taglineBn?: string;
  title: string;
  titleBn?: string;
  titles?: string[];
  titlesBn?: string[];
  titleInterval?: number; // interval in ms or seconds
  description: string;
  descriptionBn?: string;
  images: string[];
  useScrollEffect?: boolean;
  bgImageUrl?: string;
  bgImageOpacity?: number;
}

export interface FeaturesSectionContent {
  tagline: string;
  taglineBn?: string;
  headline: string;
  headlineBn?: string;
  features: FeatureItem[];
}

export interface FeatureItem {
  title: string;
  titleBn?: string;
  description: string;
  descriptionBn?: string;
  iconName: string; // Store icon name as string
}

export interface StatsSectionContent {
  stats: StatItem[];
}

export interface StatItem {
  value: string;
  valueBn?: string;
  label: string;
  labelBn?: string;
}

export interface AboutUsSectionContent {
  promise: {
    tagline: string;
    taglineBn?: string;
    headline: string;
    headlineBn?: string;
    description: string;
    descriptionBn?: string;
    imageUrl: string;
  };
  vision: {
    headline: string;
    headlineBn?: string;
    description: string;
    descriptionBn?: string;
  };
}

export interface SectionHeaderContent {
  tagline: string;
  taglineBn?: string;
  headline: string;
  headlineBn?: string;
  description: string;
  descriptionBn?: string;
}

export interface ContactSectionContent {
  tagline: string;
  taglineBn?: string;
  headline: string;
  headlineBn?: string;
  description: string;
  descriptionBn?: string;
  info: {
    location: ContactInfoItem;
    whatsapp: ContactInfoItem;
    email: ContactInfoItem;
  };
}

export interface ContactInfoItem {
  title: string;
  titleBn?: string;
  text: string;
  textBn?: string;
}

export interface FAQSectionContent {
  headline: string;
  headlineBn?: string;
  description: string;
  descriptionBn?: string;
  faqs: FAQItem[];
}

export interface FAQItem {
  question: string;
  questionBn?: string;
  answer: string;
  answerBn?: string;
}

export interface UserProfile {
  uid: string;
  email: string;
  name: string;
  phone?: string;
  role: 'super_admin' | 'admin' | 'investor';
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

export type AccountCategory = 'Client' | 'Customer' | 'Investor' | 'Owner / Partner' | 'Vendor / Supplier' | 'Employee' | 'Contractor' | 'Other';
export type TransactionType = 'Receivable' | 'Payable';
export type AccountStatus = 'Pending' | 'Partially Paid' | 'Fully Settled' | 'Cancelled';

export interface LedgerPayment {
  id: string;
  amount: number;
  date: string;
  paymentMethod: string;
  referenceNumber: string;
  notes: string;
  processedBy: string;
}

export interface LedgerAccount {
  id?: string;
  transactionId: string;
  personName: string;
  category: AccountCategory;
  contactNumber: string;
  email?: string;
  address?: string;
  transactionType: TransactionType;
  amount: number;
  currency: string;
  dueDate: string;
  description: string;
  referenceNumber: string;
  attachmentUrl?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  currentStatus: AccountStatus;
  isArchived: boolean;
  payments: LedgerPayment[];
}

export interface InvestmentRequest {
  id?: string;
  investorName: string;
  investorPhone: string;
  amount: number;
  projectId: string;
  projectTitle: string;
  batchId?: string;
  batchName?: string;
  status: 'pending' | 'contacted' | 'approved';
  createdAt: string;
}

export interface SmsConfig {
  id?: string;
  apiKey: string;
  senderId?: string;
  defaultContentId?: string;
  otpTemplate: string;
  updatedAt?: string;
}

export interface SmsTemplate {
  id?: string;
  name: string;
  category: 'General' | 'Investor Update' | 'Payment / Profit' | 'Order / Delivery' | 'OTP / Auth';
  content: string;
  contentId?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface SmsReportRecipient {
  number: string;
  charge: string;
  status: string;
}

export interface SmsLog {
  id?: string;
  requestId?: string;
  recipients: string[];
  recipientCount: number;
  message: string;
  type: 'otp' | 'bulk' | 'single' | 'scheduled';
  status: 'Submitted' | 'Complete' | 'Processing' | 'Scheduled' | 'Failed';
  charge?: string;
  errorCode?: number;
  errorMessage?: string;
  senderId?: string;
  contentId?: string;
  schedule?: string;
  reportRecipients?: SmsReportRecipient[];
  createdAt: string;
  updatedAt?: string;
}

export interface StockItem {
  id?: string;
  name: string;
  nameBn?: string;
  type: 'Food' | 'Medicine';
  category?: string;
  unit: string;
  quantity: number;
  minThreshold?: number;
  costPerUnit?: number;
  supplier?: string;
  expiryDate?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface StockLog {
  id?: string;
  itemId: string;
  itemName: string;
  itemType: 'Food' | 'Medicine';
  action: 'increase' | 'decrease';
  amount: number;
  previousQuantity: number;
  newQuantity: number;
  unit: string;
  comment?: string;
  date: string;
  createdAt: string;
  performedBy?: string;
}

