import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { db, auth } from '../firebase';
import { doc, getDoc, collection, addDoc, updateDoc } from 'firebase/firestore';
import { Project, Investment, UserProfile } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowLeft, 
  TrendingUp, 
  Calendar, 
  CheckCircle2, 
  Leaf, 
  Target, 
  FileText, 
  Download, 
  ShieldCheck, 
  Info, 
  ExternalLink, 
  Share2, 
  Copy, 
  Check, 
  Calculator, 
  DollarSign, 
  Users, 
  Clock, 
  Sparkles,
  X,
  Upload,
  FileType
} from 'lucide-react';
import { formatCurrency, cn } from '../lib/utils';
import { FARM_NAME } from '../constants';

export default function ProjectDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [investmentAmount, setInvestmentAmount] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [copied, setCopied] = useState(false);

  const [showKycModal, setShowKycModal] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileTab, setProfileTab] = useState<'personal' | 'contact' | 'bank' | 'nominee'>('personal');
  const [uploadingFile, setUploadingFile] = useState<'nid' | 'nomineeNid' | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  // Calculator states
  const [calcAmount, setCalcAmount] = useState('5000');
  const [estRoiRate, setEstRoiRate] = useState(15); // standard 15% ROI
  const [durationMonths, setDurationMonths] = useState(12);

  useEffect(() => {
    const fetchProject = async () => {
      if (!id) return;
      try {
        const docRef = doc(db, 'projects', id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setProject({ id: docSnap.id, ...docSnap.data() } as Project);
          // Set calculator default to min investment
          const data = docSnap.data();
          if (data.minInvestment) {
            setCalcAmount(data.minInvestment.toString());
          }
        } else {
          setProject(null);
        }
      } catch (err) {
        console.error('Error fetching project:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchProject();
  }, [id]);

  const isProfileComplete = (profile: UserProfile | null) => {
    if (!profile) return false;
    const ip = profile.investorProfile;
    if (!ip) return false;
    
    const requiredFields = [
      'fatherName',
      'motherName',
      'dob',
      'gender',
      'nidPassport',
      'nidFileUrl',
      'currentAddress',
      'permanentAddress',
      'occupation',
      'organization',
      'designation',
      'bankName',
      'branchName',
      'accountName',
      'accountNumber',
      'routingNumber',
      'nomineeName',
      'nomineeRelation',
      'nomineePhone',
      'nomineeNid',
      'nomineeNidFileUrl'
    ];

    return requiredFields.every(field => {
      const val = (ip as any)[field];
      return val && String(val).trim() !== '';
    });
  };

  const saveInvestment = async (amount: number, finalProfile: UserProfile) => {
    if (!auth.currentUser || !project) return;
    
    try {
      const investment: Investment = {
        investorName: finalProfile.name || auth.currentUser.displayName || 'Anonymous',
        investorEmail: finalProfile.email || auth.currentUser.email || '',
        projectId: project.id!,
        projectTitle: project.title,
        amount: amount,
        date: new Date().toISOString()
      };

      // Add to investments collection
      await addDoc(collection(db, 'investments'), investment);

      // Update currentAmount on the project
      const newAmount = (project.currentAmount || 0) + amount;
      await updateDoc(doc(db, 'projects', project.id!), {
        currentAmount: newAmount
      });

      // Update local state
      setProject(prev => prev ? { ...prev, currentAmount: newAmount } : null);

      setSuccess(true);
      setShowKycModal(false);
      setTimeout(() => {
        setSuccess(false);
        setInvestmentAmount('');
      }, 3000);
    } catch (err) {
      console.error(err);
      alert('বিনিয়োগ সম্পন্ন করতে ব্যর্থ হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।');
    }
  };

  const handleInvest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) {
      alert('বিনিয়োগ করতে অনুগ্রহ করে প্রথমে লগইন করুন।');
      navigate('/login');
      return;
    }
    if (!project) return;

    const amountNum = parseFloat(investmentAmount);
    if (isNaN(amountNum) || amountNum < (project.minInvestment || 1000)) {
      alert(`সর্বনিম্ন বিনিয়োগের পরিমাণ ৳${project.minInvestment || 1000}`);
      return;
    }

    setProfileLoading(true);
    setFormError(null);
    try {
      const userDocRef = doc(db, 'users', auth.currentUser.uid);
      const docSnap = await getDoc(userDocRef);
      if (docSnap.exists()) {
        const profileData = docSnap.data() as UserProfile;
        setUserProfile(profileData);
        
        // Check if profile is complete
        if (isProfileComplete(profileData)) {
          setSubmitting(true);
          await saveInvestment(amountNum, profileData);
        } else {
          // If investorProfile object doesn't exist, initialize it as empty object
          if (!profileData.investorProfile) {
            profileData.investorProfile = {};
          }
          setUserProfile(profileData);
          setShowKycModal(true);
          setProfileTab('personal');
        }
      } else {
        const initialProfile: UserProfile = {
          uid: auth.currentUser.uid,
          email: auth.currentUser.email || '',
          name: auth.currentUser.displayName || '',
          role: 'investor',
          createdAt: new Date().toISOString(),
          investorProfile: {}
        };
        setUserProfile(initialProfile);
        setShowKycModal(true);
        setProfileTab('personal');
      }
    } catch (err) {
      console.error(err);
      alert('বিনিয়োগ সম্পন্ন করতে ব্যর্থ হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।');
    } finally {
      setProfileLoading(false);
      setSubmitting(false);
    }
  };

  const handleModalFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: 'nidFileUrl' | 'nomineeNidFileUrl') => {
    if (!e.target.files || !e.target.files[0] || !userProfile) return;
    
    const file = e.target.files[0];
    const fileType = field === 'nidFileUrl' ? 'nid' : 'nomineeNid';
    setUploadingFile(fileType);
    setFormError(null);
    
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
          const originalDataUrl = event.target?.result as string;
          if (file.type.startsWith('image/')) {
            const img = new Image();
            img.src = originalDataUrl;
            img.onload = () => {
              const canvas = document.createElement('canvas');
              const MAX_WIDTH = 800;
              const MAX_HEIGHT = 600;
              let width = img.width;
              let height = img.height;

              if (width > height) {
                if (width > MAX_WIDTH) {
                  height *= MAX_WIDTH / width;
                  width = MAX_WIDTH;
                }
              } else {
                if (height > MAX_HEIGHT) {
                  width *= MAX_HEIGHT / height;
                  height = MAX_HEIGHT;
                }
              }

              canvas.width = width;
              canvas.height = height;
              const ctx = canvas.getContext('2d');
              if (!ctx) {
                resolve(originalDataUrl);
                return;
              }
              ctx.drawImage(img, 0, 0, width, height);
              resolve(canvas.toDataURL('image/jpeg', 0.7));
            };
            img.onerror = () => {
              resolve(originalDataUrl);
            };
          } else {
            resolve(originalDataUrl);
          }
        };
        reader.onerror = (err) => {
          reject(err);
        };
      });

      setUserProfile({
        ...userProfile,
        investorProfile: {
          ...userProfile.investorProfile,
          [field]: dataUrl
        }
      });
    } catch (err) {
      console.error(err);
      setFormError('Failed to upload file.');
    } finally {
      setUploadingFile(null);
    }
  };

  const handleSaveProfileAndInvest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser || !userProfile || !project) return;

    setFormError(null);

    const ip = userProfile.investorProfile || {};
    
    const fieldsWithLabels = [
      { key: 'fatherName', label: "Father's Name", tab: 'personal' },
      { key: 'motherName', label: "Mother's Name", tab: 'personal' },
      { key: 'dob', label: "Date of Birth", tab: 'personal' },
      { key: 'gender', label: "Gender", tab: 'personal' },
      { key: 'nidPassport', label: "NID/Passport Number", tab: 'personal' },
      { key: 'nidFileUrl', label: "NID Card Attachment", tab: 'personal' },
      { key: 'currentAddress', label: "Current Address", tab: 'contact' },
      { key: 'permanentAddress', label: "Permanent Address", tab: 'contact' },
      { key: 'occupation', label: "Occupation", tab: 'contact' },
      { key: 'organization', label: "Organization", tab: 'contact' },
      { key: 'designation', label: "Designation", tab: 'contact' },
      { key: 'bankName', label: "Bank Name", tab: 'bank' },
      { key: 'branchName', label: "Branch Name", tab: 'bank' },
      { key: 'accountName', label: "Account Name", tab: 'bank' },
      { key: 'accountNumber', label: "Account Number", tab: 'bank' },
      { key: 'routingNumber', label: "Routing Number", tab: 'bank' },
      { key: 'nomineeName', label: "Nominee Name", tab: 'nominee' },
      { key: 'nomineeRelation', label: "Relation with Nominee", tab: 'nominee' },
      { key: 'nomineePhone', label: "Nominee Phone Number", tab: 'nominee' },
      { key: 'nomineeNid', label: "Nominee NID", tab: 'nominee' },
      { key: 'nomineeNidFileUrl', label: "Nominee NID Attachment", tab: 'nominee' }
    ];

    const missing = fieldsWithLabels.find(f => {
      const val = (ip as any)[f.key];
      return !val || String(val).trim() === '';
    });

    if (missing) {
      setFormError(`Please fill in "${missing.label}" (located in the ${missing.tab.toUpperCase()} tab).`);
      setProfileTab(missing.tab as any);
      return;
    }

    setSubmitting(true);
    try {
      const userDocRef = doc(db, 'users', auth.currentUser.uid);
      const { uid, ...dataToSave } = userProfile;
      await updateDoc(userDocRef, dataToSave as any);

      await saveInvestment(parseFloat(investmentAmount), userProfile);
    } catch (err) {
      console.error(err);
      setFormError('Failed to save profile and submit investment.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopyLink = () => {
    const shareUrl = window.location.href;
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(err => {
      console.error('Failed to copy link:', err);
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FDFCF7] flex flex-col items-center justify-center space-y-4">
        <div className="w-12 h-12 border-4 border-green-700/15 border-t-green-700 rounded-full animate-spin" />
        <p className="text-sm font-medium text-gray-500">প্রজেক্টের তথ্য লোড হচ্ছে...</p>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-[#FDFCF7] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mb-6">
          <Info className="h-10 w-10 text-red-500" />
        </div>
        <h2 className="text-3xl font-extrabold text-[#1A2E26] tracking-tight">প্রজেক্টটি পাওয়া যায়নি</h2>
        <p className="text-gray-500 mt-2 max-w-md">
          আপনি যে বিনিয়োগ প্রজেক্টটি খুঁজছেন তা বিদ্যমান নেই অথবা এটি আর্কাইভ করা হয়েছে।
        </p>
        <Link 
          to="/#invest"
          className="mt-8 inline-flex items-center space-x-2 bg-[#1A2E26] text-white px-6 py-3 rounded-xl font-bold hover:bg-[#2A3E36] transition-all shadow-md active:scale-95"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>সকল প্রজেক্টে ফিরে যান</span>
        </Link>
      </div>
    );
  }

  // Calculate calculator variables
  const calcAmountNum = parseFloat(calcAmount) || 0;
  const estimatedReturn = calcAmountNum + (calcAmountNum * (estRoiRate / 100) * (durationMonths / 12));
  const estimatedProfit = estimatedReturn - calcAmountNum;
  const treesPlanted = Math.floor(calcAmountNum / 4000);
  const co2Avoided = (calcAmountNum * 0.08).toFixed(1);
  const organicDairyProduced = (calcAmountNum * 0.12).toFixed(1);

  const fundingProgress = Math.min(Math.round(((project.currentAmount || 0) / project.targetAmount) * 100), 100);

  return (
    <div className="bg-[#FDFCF7] min-h-screen pb-24">
      {/* Decorative top pattern */}
      <div className="absolute top-0 inset-x-0 h-48 bg-gradient-to-b from-green-50/20 to-transparent pointer-events-none" />

      {/* Navigation Header */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 relative z-10">
        <button
          onClick={() => navigate('/#invest')}
          className="inline-flex items-center space-x-2 text-gray-500 hover:text-green-700 font-bold text-sm transition-colors cursor-pointer group"
        >
          <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
          <span>প্রজেক্ট তালিকায় ফিরে যান</span>
        </button>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6 relative z-10">
        {/* Main Section Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          
          {/* Left Side: Media, Details, Calculator, Policy */}
          <div className="lg:col-span-8 space-y-12">
            
            {/* Banner Image Card */}
            <div className="relative rounded-[40px] overflow-hidden shadow-2xl bg-white border-4 border-white aspect-[16/9]">
              <img
                src={project.imageUrl}
                alt={project.title}
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent pointer-events-none" />
              
              <div className="absolute bottom-8 left-8 right-8 text-white">
                <div className={cn(
                  "inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase mb-4 backdrop-blur-md shadow-sm border border-white/20",
                  project.status === 'Active' ? "bg-green-600/90 text-white" : "bg-red-600/90 text-white"
                )}>
                  <div className={cn("h-1.5 w-1.5 rounded-full", project.status === 'Active' ? "bg-white animate-pulse" : "bg-gray-300")} />
                  <span>{project.status === 'Active' ? 'সক্রিয় / উন্মুক্ত' : 'বন্ধ'}</span>
                </div>
                <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold tracking-tight drop-shadow-md">
                  {project.title}
                </h1>
              </div>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-6 bg-white rounded-3xl border border-gray-100 shadow-sm flex flex-col justify-between">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 block">সর্বনিম্ন বিনিয়োগ</span>
                <span className="text-xl font-extrabold text-green-700">{formatCurrency(project.minInvestment || 1000)}</span>
              </div>
              <div className="p-6 bg-white rounded-3xl border border-gray-100 shadow-sm flex flex-col justify-between">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 block">প্রত্যাশিত লাভ (ROI)</span>
                <span className="text-xl font-extrabold text-[#1A2E26]">১৫% বার্ষিক</span>
              </div>
              <div className="p-6 bg-white rounded-3xl border border-gray-100 shadow-sm flex flex-col justify-between">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 block">ঝুঁকির মাত্রা</span>
                <span className="text-xl font-extrabold text-blue-700">কম থেকে মাঝারি</span>
              </div>
              <div className="p-6 bg-white rounded-3xl border border-gray-100 shadow-sm flex flex-col justify-between">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 block">সময়কাল</span>
                <span className="text-xl font-extrabold text-[#8B735B]">১২ মাস</span>
              </div>
            </div>

            {/* Description */}
            <div className="bg-white rounded-[32px] p-8 border border-gray-100 shadow-sm space-y-6">
              <h2 className="text-lg font-extrabold text-[#1A2E26] uppercase tracking-wider flex items-center">
                <Info className="h-5 w-5 mr-2 text-green-700" />
                প্রজেক্টের বিবরণ ও উদ্দেশ্য
              </h2>
              <div className="text-gray-600 text-sm leading-relaxed whitespace-pre-line">
                {project.description}
              </div>
            </div>

            {/* Interactive ROI Calculator */}
            <div className="bg-white rounded-[32px] p-8 border border-gray-100 shadow-sm space-y-8">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 pb-6">
                <div>
                  <h2 className="text-lg font-extrabold text-[#1A2E26] uppercase tracking-wider flex items-center">
                    <Calculator className="h-5 w-5 mr-2 text-green-700" />
                    বিনিয়োগ সিমুলেটর (হিসাবকারী)
                  </h2>
                  <p className="text-xs text-gray-400 mt-1">আপনার খামারের সম্ভাব্য উৎপাদন, মুনাফা এবং পরিবেশগত প্রভাব অনুমান করুন।</p>
                </div>
                <div className="flex items-center space-x-2 bg-green-50 px-3 py-1.5 rounded-xl border border-green-100">
                  <Sparkles className="h-4 w-4 text-green-700" />
                  <span className="text-xs font-bold text-green-800 uppercase tracking-wider">পুনরুৎপাদনশীল লাভ</span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Inputs */}
                <div className="space-y-6">
                  <div className="space-y-3">
                    <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block">বিনিয়োগের পরিমাণ (৳)</label>
                    <div className="relative">
                      <span className="absolute left-5 top-1/2 -translate-y-1/2 text-lg font-extrabold text-gray-400">৳</span>
                      <input
                        type="number"
                        min={project.minInvestment || 1000}
                        step="500"
                        value={calcAmount}
                        onChange={(e) => setCalcAmount(e.target.value)}
                        className="w-full bg-gray-50 border border-transparent rounded-2xl py-4 pl-12 pr-6 font-bold text-gray-800 outline-none focus:bg-white focus:border-green-600 transition-all text-lg"
                      />
                    </div>
                    <span className="text-[10px] text-gray-400">সর্বনিম্ন প্রয়োজনীয় পরিমাণ: ৳{project.minInvestment || 1000}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">সিমুলেটেড লাভ (ROI)</label>
                      <select 
                        value={estRoiRate}
                        onChange={(e) => setEstRoiRate(Number(e.target.value))}
                        className="w-full bg-gray-50 border border-transparent rounded-xl py-3 px-4 font-bold text-sm text-gray-700 outline-none focus:bg-white focus:border-green-600 transition-all"
                      >
                        <option value={10}>১০% সাধারণ (Standard)</option>
                        <option value={12}>১২% প্রবৃদ্ধি (Growth)</option>
                        <option value={15}>১৫% প্রিমিয়ার (Premier)</option>
                        <option value={18}>১৮% উচ্চ লাভ (High Yield)</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">সময়কাল</label>
                      <select 
                        value={durationMonths}
                        onChange={(e) => setDurationMonths(Number(e.target.value))}
                        className="w-full bg-gray-50 border border-transparent rounded-xl py-3 px-4 font-bold text-sm text-gray-700 outline-none focus:bg-white focus:border-green-600 transition-all"
                      >
                        <option value={6}>৬ মাস</option>
                        <option value={12}>১২ মাস</option>
                        <option value={18}>১৮ মাস</option>
                        <option value={24}>২৪ মাস</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Return metrics / impacts */}
                <div className="bg-green-50/30 rounded-3xl border border-green-100/50 p-6 space-y-6 flex flex-col justify-between">
                  <div className="space-y-4">
                    <div className="flex justify-between items-center border-b border-green-100/30 pb-3">
                      <span className="text-xs text-gray-500">আনুমানিক লাভ</span>
                      <span className="text-base font-extrabold text-green-700">+ {formatCurrency(estimatedProfit)}</span>
                    </div>
                    <div className="flex justify-between items-center border-b border-green-100/30 pb-3">
                      <span className="text-xs text-gray-500">মোট পরিশোধ (আসলসহ)</span>
                      <span className="text-base font-extrabold text-[#1A2E26]">{formatCurrency(estimatedReturn)}</span>
                    </div>
                  </div>

                  <div className="space-y-4 pt-2">
                    <span className="text-[10px] font-bold text-green-800 uppercase tracking-widest block border-b border-green-100/40 pb-2">তৈরিকৃত পরিবেশগত প্রভাব</span>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="bg-white p-2.5 rounded-xl border border-green-100/40 shadow-sm flex flex-col items-center">
                        <Leaf className="h-4 w-4 text-emerald-600 mb-1" />
                        <span className="text-[10px] text-gray-400 block">রোপণকৃত গাছ</span>
                        <span className="text-xs font-black text-emerald-800">{treesPlanted}</span>
                      </div>
                      <div className="bg-white p-2.5 rounded-xl border border-green-100/40 shadow-sm flex flex-col items-center">
                        <TrendingUp className="h-4 w-4 text-green-600 mb-1" />
                        <span className="text-[10px] text-gray-400 block">কার্বন হ্রাস (কেজি)</span>
                        <span className="text-xs font-black text-emerald-800">{co2Avoided}</span>
                      </div>
                      <div className="bg-white p-2.5 rounded-xl border border-green-100/40 shadow-sm flex flex-col items-center">
                        <Users className="h-4 w-4 text-blue-600 mb-1" />
                        <span className="text-[10px] text-gray-400 block">উৎপাদিত দুগ্ধ</span>
                        <span className="text-xs font-black text-emerald-800">{organicDairyProduced}L</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Terms and policies */}
            <div className="bg-white rounded-[32px] p-8 border border-gray-100 shadow-sm space-y-6">
              <h2 className="text-lg font-extrabold text-[#1A2E26] uppercase tracking-wider flex items-center">
                <ShieldCheck className="h-5 w-5 mr-2 text-green-700" />
                বিনিয়োগের নীতিমালা ও শর্তাবলী
              </h2>

              {project.policyContent ? (
                <div className="bg-[#F4F9F6] border border-green-100 rounded-2xl p-6 text-sm text-green-950 space-y-4 leading-relaxed whitespace-pre-line">
                  {project.policyContent}
                </div>
              ) : (
                <div className="bg-gray-50 border border-gray-200 rounded-2xl p-6 text-sm text-gray-500 italic">
                  এই প্রজেক্টের জন্য সাধারণ {FARM_NAME} বিনিয়োগ নির্দেশিকা প্রযোজ্য। সম্পূর্ণ শর্তাবলীর জন্য আমাদের সাপোর্ট টিমের সাথে যোগাযোগ করুন অথবা সংযুক্ত ডকুমেন্ট দেখুন।
                </div>
              )}

              {project.policyUrl && (
                <div className="flex justify-end pt-2">
                  <a
                    href={project.policyUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center space-x-2 px-5 py-3 bg-white hover:bg-green-50 border border-green-200 rounded-xl text-xs font-bold text-green-700 transition-all shadow-sm"
                  >
                    <FileText className="h-4 w-4" />
                    <span>সম্পূর্ণ নীতিমালা ডকুমেন্ট দেখুন/ডাউনলোড করুন</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              )}
            </div>

          </div>

          {/* Right Side: Sticky Investment Card & Funding Progress */}
          <div className="lg:col-span-4 space-y-8">
            <div className="sticky top-24 space-y-8">
              
              {/* Progress & Info Card */}
              <div className="bg-white rounded-[32px] p-8 border border-gray-100 shadow-sm space-y-6">
                <div>
                  <span className="text-[10px] font-bold text-[#8B735B] uppercase tracking-widest block mb-1">তহবিলের লক্ষ্য</span>
                  <div className="flex justify-between items-baseline">
                    <span className="text-2xl font-black text-[#1A2E26]">{formatCurrency(project.currentAmount || 0)}</span>
                    <span className="text-sm text-gray-400 font-medium">{formatCurrency(project.targetAmount)}-এর মধ্যে</span>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="space-y-2">
                  <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-green-700 rounded-full transition-all duration-500" 
                      style={{ width: `${fundingProgress}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs font-bold">
                    <span className="text-green-700 font-mono">{fundingProgress}% তহবিল সংগ্রহ হয়েছে</span>
                    <span className="text-gray-400">বাকি আছে: {formatCurrency(Math.max(project.targetAmount - (project.currentAmount || 0), 0))}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-100 text-center">
                  <div>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">তহবিলের অবস্থা</span>
                    <span className="text-sm font-bold text-green-800 flex items-center justify-center space-x-1">
                      <Target className="h-4 w-4" />
                      <span>{project.status === 'Active' ? 'গ্রহণ করা হচ্ছে' : 'সম্পন্ন'}</span>
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">সময়সীমা</span>
                    <span className="text-sm font-bold text-[#1A2E26] flex items-center justify-center space-x-1">
                      <Clock className="h-4 w-4" />
                      <span>{project.status === 'Active' ? 'চলমান' : 'অতিক্রান্ত'}</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Action: Direct Investment Form */}
              <div className="bg-[#1A2E26] text-white rounded-[32px] p-8 shadow-xl relative overflow-hidden">
                <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[radial-gradient(#FFFFFF_1px,transparent_1px)] [background-size:16px_16px]" />
                
                {success ? (
                  <div className="text-center py-10 space-y-6">
                    <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mx-auto">
                      <CheckCircle2 className="h-8 w-8 text-green-400" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold">বিনিয়োগ সফলভাবে সম্পন্ন হয়েছে!</h3>
                      <p className="text-xs text-green-200 mt-2">টেকসই এবং পরিবেশ বান্ধব খামার পদ্ধতিতে বিনিয়োগ করার জন্য আপনাকে ধন্যবাদ।</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-xl font-bold tracking-tight">তাৎক্ষণিক বিনিয়োগ করুন</h3>
                      <p className="text-xs text-green-200/70 mt-1">আপনার নিবন্ধিত ইনভেস্টর প্রোফাইল থেকে সরাসরি এই প্রজেক্টে অর্থায়ন করুন।</p>
                    </div>

                    <form onSubmit={handleInvest} className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-green-100 uppercase tracking-wider block">বিনিয়োগের পরিমাণ (৳)</label>
                        <div className="relative">
                          <span className="absolute left-5 top-1/2 -translate-y-1/2 text-lg font-bold text-green-300">৳</span>
                          <input
                            type="number"
                            required
                            min={project.minInvestment || 1000}
                            value={investmentAmount}
                            onChange={(e) => setInvestmentAmount(e.target.value)}
                            placeholder={`সর্বনিম্ন ৳${project.minInvestment || 1000}`}
                            className="w-full bg-white/10 border border-white/15 rounded-2xl py-4 pl-12 pr-6 text-white placeholder-green-300/40 font-bold outline-none focus:bg-white/20 focus:border-white transition-all text-lg"
                          />
                        </div>
                      </div>

                      <button
                        type="submit"
                        disabled={submitting || project.status !== 'Active'}
                        className={cn(
                          "w-full py-4 rounded-2xl font-bold text-sm tracking-wide uppercase transition-all flex items-center justify-center space-x-2 cursor-pointer",
                          project.status === 'Active'
                            ? "bg-white text-[#1A2E26] hover:bg-green-50 shadow-md active:scale-[0.98]"
                            : "bg-white/10 text-white/40 cursor-not-allowed"
                        )}
                      >
                        {submitting ? (
                          <div className="w-5 h-5 border-2 border-green-800/10 border-t-green-800 rounded-full animate-spin" />
                        ) : (
                          <>
                            <DollarSign className="h-4 w-4" />
                            <span>বিনিয়োগ নিশ্চিত করুন</span>
                          </>
                        )}
                      </button>
                    </form>

                    <div className="text-[10px] text-green-200/50 text-center flex items-center justify-center space-x-1.5">
                      <ShieldCheck className="h-3.5 w-3.5" />
                      <span>নিরাপদ ক্রিপ্টোগ্রাফিক লেনদেন পদ্ধতি</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Share & Outreach Widget */}
              <div className="bg-white rounded-[32px] p-6 border border-gray-100 shadow-sm space-y-4 text-center">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">শেয়ার করুন</span>
                <p className="text-xs text-gray-500 leading-relaxed max-w-xs mx-auto">
                  উচ্চ ফলনশীল এবং লাভজনক কৃষি কর্মসূচীতে আগ্রহী বিনিয়োগকারীদের সাথে এই প্রজেক্টটি শেয়ার করুন।
                </p>
                <div className="flex items-center justify-center space-x-2">
                  <button
                    onClick={handleCopyLink}
                    className="flex-1 inline-flex items-center justify-center space-x-2 py-3 px-4 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-xl text-xs font-bold border border-gray-100 transition-all cursor-pointer"
                  >
                    {copied ? (
                      <>
                        <Check className="h-4 w-4 text-green-600 animate-bounce" />
                        <span className="text-green-600">লিংক কপি হয়েছে!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4" />
                        <span>শেয়ার লিংক কপি করুন</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

            </div>
          </div>

        </div>
      </div>

      {/* KycModal overlay */}
      <AnimatePresence>
        {showKycModal && userProfile && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative bg-white rounded-[40px] shadow-2xl w-full max-w-3xl p-8 overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="flex justify-between items-start mb-6 flex-shrink-0">
                <div>
                  <h2 className="text-2xl font-bold text-[#1A2E26]">Investor KYC Verification</h2>
                  <p className="text-xs text-amber-600 mt-1 font-medium">Please complete all parts of your Investor Profile before proceeding.</p>
                </div>
                <button 
                  onClick={() => setShowKycModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors cursor-pointer"
                >
                  <X className="h-6 w-6 text-gray-400" />
                </button>
              </div>

              {/* Form Error Notice */}
              {formError && (
                <div className="mb-4 p-4 bg-red-50 border border-red-100 text-red-700 text-xs rounded-2xl font-medium flex-shrink-0">
                  {formError}
                </div>
              )}

              {/* Multi-Section Tabs */}
              <div className="flex border-b border-gray-100 mb-6 space-x-2 overflow-x-auto pb-1 scrollbar-none flex-shrink-0">
                {(['personal', 'contact', 'bank', 'nominee'] as const).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setProfileTab(tab)}
                    className={cn(
                      "px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-xl transition-all whitespace-nowrap cursor-pointer",
                      profileTab === tab 
                        ? "bg-[#1A2E26] text-white" 
                        : "bg-gray-50 text-gray-500 hover:bg-gray-100"
                    )}
                  >
                    {tab === 'personal' && '1. Personal Details'}
                    {tab === 'contact' && '2. Address & Job'}
                    {tab === 'bank' && '3. Bank Account'}
                    {tab === 'nominee' && '4. Nominee Details'}
                  </button>
                ))}
              </div>

              {/* Scrollable Form Body */}
              <form onSubmit={handleSaveProfileAndInvest} className="flex-grow overflow-y-auto pr-2 mb-6 space-y-6 max-h-[50vh]">
                {profileTab === 'personal' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-400 uppercase">Father's Name</label>
                        <input
                          type="text"
                          required
                          value={userProfile.investorProfile?.fatherName || ''}
                          onChange={(e) => setUserProfile({
                            ...userProfile,
                            investorProfile: { ...userProfile.investorProfile, fatherName: e.target.value }
                          })}
                          className="w-full px-4 py-2.5 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-green-500 outline-none text-sm font-medium"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-400 uppercase">Mother's Name</label>
                        <input
                          type="text"
                          required
                          value={userProfile.investorProfile?.motherName || ''}
                          onChange={(e) => setUserProfile({
                            ...userProfile,
                            investorProfile: { ...userProfile.investorProfile, motherName: e.target.value }
                          })}
                          className="w-full px-4 py-2.5 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-green-500 outline-none text-sm font-medium"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-400 uppercase">Date of Birth</label>
                        <input
                          type="date"
                          required
                          value={userProfile.investorProfile?.dob || ''}
                          onChange={(e) => setUserProfile({
                            ...userProfile,
                            investorProfile: { ...userProfile.investorProfile, dob: e.target.value }
                          })}
                          className="w-full px-4 py-2.5 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-green-500 outline-none text-sm font-medium"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-400 uppercase">Gender</label>
                        <select
                          required
                          value={userProfile.investorProfile?.gender || ''}
                          onChange={(e) => setUserProfile({
                            ...userProfile,
                            investorProfile: { ...userProfile.investorProfile, gender: e.target.value }
                          })}
                          className="w-full px-4 py-2.5 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-green-500 outline-none text-sm font-medium"
                        >
                          <option value="">Select Gender</option>
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-400 uppercase">NID / Passport Number</label>
                        <input
                          type="text"
                          required
                          value={userProfile.investorProfile?.nidPassport || ''}
                          onChange={(e) => setUserProfile({
                            ...userProfile,
                            investorProfile: { ...userProfile.investorProfile, nidPassport: e.target.value }
                          })}
                          className="w-full px-4 py-2.5 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-green-500 outline-none text-sm font-medium"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-400 uppercase">NID Card Attachment</label>
                        <div className="flex items-center space-x-2">
                          <label className="flex-1 cursor-pointer">
                            <div className={cn(
                              "flex items-center justify-center space-x-1 px-4 py-2.5 rounded-xl border-2 border-dashed text-xs font-bold uppercase tracking-wider transition-all",
                              uploadingFile === 'nid' ? 'bg-gray-100 border-gray-300' :
                              userProfile.investorProfile?.nidFileUrl ? 'bg-green-50 border-green-200 text-green-700' : 'bg-gray-50 border-gray-200 text-gray-400 hover:border-green-400'
                            )}>
                              {uploadingFile === 'nid' ? (
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-600"></div>
                              ) : userProfile.investorProfile?.nidFileUrl ? (
                                <CheckCircle2 className="h-4 w-4 text-green-600" />
                              ) : (
                                <Upload className="h-4 w-4" />
                              )}
                              <span>{uploadingFile === 'nid' ? 'Uploading...' : userProfile.investorProfile?.nidFileUrl ? 'Change NID' : 'Upload NID'}</span>
                            </div>
                            <input
                              type="file"
                              className="hidden"
                              accept="image/*,.pdf"
                              onChange={(e) => handleModalFileUpload(e, 'nidFileUrl')}
                              disabled={!!uploadingFile}
                            />
                          </label>
                          {userProfile.investorProfile?.nidFileUrl && (
                            <a
                              href={userProfile.investorProfile.nidFileUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-2.5 bg-green-100 text-green-700 rounded-xl hover:bg-green-200 transition-all flex items-center justify-center"
                              title="View NID Card"
                            >
                              <FileType className="h-4 w-4" />
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {profileTab === 'contact' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-400 uppercase">Current Address</label>
                        <textarea
                          rows={2}
                          required
                          value={userProfile.investorProfile?.currentAddress || ''}
                          onChange={(e) => setUserProfile({
                            ...userProfile,
                            investorProfile: { ...userProfile.investorProfile, currentAddress: e.target.value }
                          })}
                          className="w-full px-4 py-2.5 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-green-500 outline-none text-sm font-medium resize-none"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-400 uppercase">Permanent Address</label>
                        <textarea
                          rows={2}
                          required
                          value={userProfile.investorProfile?.permanentAddress || ''}
                          onChange={(e) => setUserProfile({
                            ...userProfile,
                            investorProfile: { ...userProfile.investorProfile, permanentAddress: e.target.value }
                          })}
                          className="w-full px-4 py-2.5 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-green-500 outline-none text-sm font-medium resize-none"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-400 uppercase">Occupation</label>
                        <input
                          type="text"
                          required
                          value={userProfile.investorProfile?.occupation || ''}
                          onChange={(e) => setUserProfile({
                            ...userProfile,
                            investorProfile: { ...userProfile.investorProfile, occupation: e.target.value }
                          })}
                          className="w-full px-4 py-2.5 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-green-500 outline-none text-sm font-medium"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-400 uppercase">Organization</label>
                        <input
                          type="text"
                          required
                          value={userProfile.investorProfile?.organization || ''}
                          onChange={(e) => setUserProfile({
                            ...userProfile,
                            investorProfile: { ...userProfile.investorProfile, organization: e.target.value }
                          })}
                          className="w-full px-4 py-2.5 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-green-500 outline-none text-sm font-medium"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-400 uppercase">Designation</label>
                        <input
                          type="text"
                          required
                          value={userProfile.investorProfile?.designation || ''}
                          onChange={(e) => setUserProfile({
                            ...userProfile,
                            investorProfile: { ...userProfile.investorProfile, designation: e.target.value }
                          })}
                          className="w-full px-4 py-2.5 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-green-500 outline-none text-sm font-medium"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {profileTab === 'bank' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-400 uppercase">Bank Name</label>
                        <input
                          type="text"
                          required
                          value={userProfile.investorProfile?.bankName || ''}
                          onChange={(e) => setUserProfile({
                            ...userProfile,
                            investorProfile: { ...userProfile.investorProfile, bankName: e.target.value }
                          })}
                          className="w-full px-4 py-2.5 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-green-500 outline-none text-sm font-medium"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-400 uppercase">Branch Name</label>
                        <input
                          type="text"
                          required
                          value={userProfile.investorProfile?.branchName || ''}
                          onChange={(e) => setUserProfile({
                            ...userProfile,
                            investorProfile: { ...userProfile.investorProfile, branchName: e.target.value }
                          })}
                          className="w-full px-4 py-2.5 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-green-500 outline-none text-sm font-medium"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-400 uppercase">Account Name</label>
                        <input
                          type="text"
                          required
                          value={userProfile.investorProfile?.accountName || ''}
                          onChange={(e) => setUserProfile({
                            ...userProfile,
                            investorProfile: { ...userProfile.investorProfile, accountName: e.target.value }
                          })}
                          className="w-full px-4 py-2.5 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-green-500 outline-none text-sm font-medium"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-400 uppercase">Account Number</label>
                        <input
                          type="text"
                          required
                          value={userProfile.investorProfile?.accountNumber || ''}
                          onChange={(e) => setUserProfile({
                            ...userProfile,
                            investorProfile: { ...userProfile.investorProfile, accountNumber: e.target.value }
                          })}
                          className="w-full px-4 py-2.5 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-green-500 outline-none text-sm font-medium"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-400 uppercase">Routing Number</label>
                        <input
                          type="text"
                          required
                          value={userProfile.investorProfile?.routingNumber || ''}
                          onChange={(e) => setUserProfile({
                            ...userProfile,
                            investorProfile: { ...userProfile.investorProfile, routingNumber: e.target.value }
                          })}
                          className="w-full px-4 py-2.5 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-green-500 outline-none text-sm font-medium"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {profileTab === 'nominee' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-400 uppercase">Nominee Name</label>
                        <input
                          type="text"
                          required
                          value={userProfile.investorProfile?.nomineeName || ''}
                          onChange={(e) => setUserProfile({
                            ...userProfile,
                            investorProfile: { ...userProfile.investorProfile, nomineeName: e.target.value }
                          })}
                          className="w-full px-4 py-2.5 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-green-500 outline-none text-sm font-medium"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-400 uppercase">Relation</label>
                        <input
                          type="text"
                          required
                          value={userProfile.investorProfile?.nomineeRelation || ''}
                          onChange={(e) => setUserProfile({
                            ...userProfile,
                            investorProfile: { ...userProfile.investorProfile, nomineeRelation: e.target.value }
                          })}
                          className="w-full px-4 py-2.5 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-green-500 outline-none text-sm font-medium"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-400 uppercase">Phone</label>
                        <input
                          type="tel"
                          required
                          value={userProfile.investorProfile?.nomineePhone || ''}
                          onChange={(e) => setUserProfile({
                            ...userProfile,
                            investorProfile: { ...userProfile.investorProfile, nomineePhone: e.target.value }
                          })}
                          className="w-full px-4 py-2.5 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-green-500 outline-none text-sm font-medium"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-400 uppercase">NID</label>
                        <input
                          type="text"
                          required
                          value={userProfile.investorProfile?.nomineeNid || ''}
                          onChange={(e) => setUserProfile({
                            ...userProfile,
                            investorProfile: { ...userProfile.investorProfile, nomineeNid: e.target.value }
                          })}
                          className="w-full px-4 py-2.5 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-green-500 outline-none text-sm font-medium"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase">Nominee NID Attachment</label>
                      <div className="flex items-center space-x-2">
                        <label className="flex-1 cursor-pointer">
                          <div className={cn(
                            "flex items-center justify-center space-x-1 px-4 py-2.5 rounded-xl border-2 border-dashed text-xs font-bold uppercase tracking-wider transition-all",
                            uploadingFile === 'nomineeNid' ? 'bg-gray-100 border-gray-300' :
                            userProfile.investorProfile?.nomineeNidFileUrl ? 'bg-green-50 border-green-200 text-green-700' : 'bg-gray-50 border-gray-200 text-gray-400 hover:border-green-400'
                          )}>
                            {uploadingFile === 'nomineeNid' ? (
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-600"></div>
                            ) : userProfile.investorProfile?.nomineeNidFileUrl ? (
                              <CheckCircle2 className="h-4 w-4 text-green-600" />
                            ) : (
                              <Upload className="h-4 w-4" />
                            )}
                            <span>{uploadingFile === 'nomineeNid' ? 'Uploading...' : userProfile.investorProfile?.nomineeNidFileUrl ? 'Change Nominee NID' : 'Upload Nominee NID'}</span>
                          </div>
                          <input
                            type="file"
                            className="hidden"
                            accept="image/*,.pdf"
                            onChange={(e) => handleModalFileUpload(e, 'nomineeNidFileUrl')}
                            disabled={!!uploadingFile}
                          />
                        </label>
                        {userProfile.investorProfile?.nomineeNidFileUrl && (
                          <a
                            href={userProfile.investorProfile.nomineeNidFileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2.5 bg-green-100 text-green-700 rounded-xl hover:bg-green-200 transition-all flex items-center justify-center"
                            title="View Nominee NID"
                          >
                            <FileType className="h-4 w-4" />
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Action buttons inside the scroll view */}
                <div className="flex items-center space-x-3 pt-4 border-t border-gray-100 flex-shrink-0">
                  {profileTab !== 'personal' && (
                    <button
                      type="button"
                      onClick={() => {
                        if (profileTab === 'contact') setProfileTab('personal');
                        else if (profileTab === 'bank') setProfileTab('contact');
                        else if (profileTab === 'nominee') setProfileTab('bank');
                      }}
                      className="px-6 py-4 bg-gray-50 hover:bg-gray-100 text-gray-500 font-bold rounded-2xl text-xs uppercase tracking-wider transition-all cursor-pointer"
                    >
                      Back
                    </button>
                  )}
                  {profileTab !== 'nominee' ? (
                    <button
                      type="button"
                      onClick={() => {
                        if (profileTab === 'personal') setProfileTab('contact');
                        else if (profileTab === 'contact') setProfileTab('bank');
                        else if (profileTab === 'bank') setProfileTab('nominee');
                      }}
                      className="flex-grow bg-[#1A2E26] hover:bg-[#2A3E36] text-white font-bold py-4 rounded-2xl text-xs uppercase tracking-wider transition-all cursor-pointer text-center"
                    >
                      Next Section
                    </button>
                  ) : (
                    <button
                      type="submit"
                      disabled={submitting || !!uploadingFile}
                      className="flex-grow bg-[#1A2E26] hover:bg-[#2A3E36] text-white font-bold py-4 rounded-2xl text-xs uppercase tracking-wider transition-all cursor-pointer text-center disabled:opacity-50"
                    >
                      {submitting ? 'Registering Details...' : 'Complete Profile & Confirm Investment'}
                    </button>
                  )}
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
