import React, { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, doc, getDoc, updateDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { Project, Investment, SiteSettings, UserProfile } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { TrendingUp, Calendar, X, CheckCircle2, Leaf, Target, FileText, Download, ShieldCheck, Info, ExternalLink, Share2, Copy, Check, Upload, FileType, MapPin, Briefcase, Landmark, Users } from 'lucide-react';
import { formatCurrency, formatDate, cn } from '../lib/utils';
import { FARM_NAME } from '../constants';
import { useSearchParams, useNavigate } from 'react-router-dom';

export default function Projects() {
  const navigate = useNavigate();
  const [projects, setProducts] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [viewingProject, setViewingProject] = useState<Project | null>(null);
  const [investmentAmount, setInvestmentAmount] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [settings, setSettings] = useState<SiteSettings | null>(null);

  const [modalStep, setModalStep] = useState<'amount' | 'profile' | 'submitting' | 'success'>('amount');
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileTab, setProfileTab] = useState<'personal' | 'contact' | 'bank' | 'nominee'>('personal');
  const [uploadingFile, setUploadingFile] = useState<'nid' | 'nomineeNid' | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const [searchParams, setSearchParams] = useSearchParams();
  const [hasCheckedUrl, setHasCheckedUrl] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const projectIdParam = searchParams.get('project');

  useEffect(() => {
    const fetchProjects = async () => {
      const querySnapshot = await getDocs(collection(db, 'projects'));
      const projectsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Project));
      setProducts(projectsData);
      setLoading(false);
    };

    async function fetchSettings() {
      const docRef = doc(db, 'settings', 'site');
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setSettings(docSnap.data() as SiteSettings);
      }
    }

    fetchProjects();
    fetchSettings();
  }, []);

  // Sync URL query param to automatically redirect to details page
  useEffect(() => {
    if (!loading && projects.length > 0 && projectIdParam && !hasCheckedUrl) {
      const matched = projects.find(p => p.id === projectIdParam);
      if (matched) {
        navigate(`/project/${matched.id}`);
      }
      setHasCheckedUrl(true);
    }
  }, [loading, projects, projectIdParam, hasCheckedUrl, navigate]);

  const openProjectDetails = (project: Project) => {
    navigate(`/project/${project.id}`);
  };

  const closeProjectDetails = () => {
    setViewingProject(null);
    setSearchParams({});
  };

  const handleCopyLink = (projectId: string) => {
    const shareUrl = `${window.location.origin}/project/${projectId}`;
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopiedId(projectId);
      setTimeout(() => setCopiedId(null), 2000);
    }).catch(err => {
      console.error('Failed to copy link:', err);
    });
  };

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
    if (!auth.currentUser || !selectedProject) return;
    
    try {
      const investment: Investment = {
        investorName: finalProfile.name || auth.currentUser.displayName || 'Anonymous',
        investorEmail: finalProfile.email || auth.currentUser.email || '',
        projectId: selectedProject.id!,
        projectTitle: selectedProject.title,
        amount: amount,
        date: new Date().toISOString()
      };

      await addDoc(collection(db, 'investments'), investment);
      setSuccess(true);
      setModalStep('success');
      setTimeout(() => {
        setSuccess(false);
        setSelectedProject(null);
        setInvestmentAmount('');
        setModalStep('amount');
      }, 2500);
    } catch (err) {
      console.error(err);
      setFormError('Failed to process investment');
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

  const handleAmountSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) {
      alert('Please login to invest');
      return;
    }
    if (!selectedProject) return;

    const amt = parseFloat(investmentAmount);
    if (isNaN(amt) || amt < (selectedProject.minInvestment || 1000)) {
      setFormError(`Minimum investment is ৳${selectedProject.minInvestment || 1000}`);
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
          setModalStep('submitting');
          await saveInvestment(amt, profileData);
        } else {
          // If investorProfile object doesn't exist, initialize it as empty object
          if (!profileData.investorProfile) {
            profileData.investorProfile = {};
          }
          setUserProfile(profileData);
          setModalStep('profile');
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
        setModalStep('profile');
        setProfileTab('personal');
      }
    } catch (err) {
      console.error(err);
      setFormError('Failed to fetch profile. Please try again.');
    } finally {
      setProfileLoading(false);
    }
  };

  const handleSaveProfileAndInvest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser || !userProfile || !selectedProject) return;

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

  if (loading) {
    return (
      <div className="py-20 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
      <div className="text-center mb-16">
        <span className="text-xs font-bold tracking-[0.2em] text-[#8B735B] uppercase mb-4 block">
          {settings?.investSection?.tagline || "OUR PROJECTS"}
        </span>
        <h1 className="text-4xl md:text-5xl font-bold text-[#1A2E26] mb-4">
          {settings?.investSection?.headline || "Invest in Sustainable Future"}
        </h1>
        <p className="text-gray-600 max-w-2xl mx-auto">
          {settings?.investSection?.description || "Join the Soil to Soul movement. Support our regenerative farming projects and earn returns while healing the earth."}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {projects.map((project) => (
          <motion.div
            key={project.id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-[40px] overflow-hidden border border-gray-100 shadow-sm hover:shadow-xl transition-all flex flex-col group"
          >
              <div className="h-56 overflow-hidden relative">
                <img
                  src={project.imageUrl}
                  alt={project.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  referrerPolicy="no-referrer"
                />
                <div className={cn(
                  "absolute top-4 right-4 backdrop-blur-sm px-4 py-2 rounded-2xl text-xs font-bold shadow-sm flex items-center space-x-2",
                  project.status === 'Active' ? "bg-green-50/90 text-green-700" : "bg-red-50/90 text-red-700"
                )}>
                  <div className={cn("h-2 w-2 rounded-full animate-pulse", project.status === 'Active' ? "bg-green-500" : "bg-red-500")} />
                  <span>{project.status === 'Active' ? 'Active/Running' : 'Inactive/Not Running'}</span>
                </div>
              </div>
            <div className="p-8 flex-grow flex flex-col">
              <h3 className="text-xl font-bold text-[#1A2E26] mb-2">{project.title}</h3>
              <p className="text-gray-500 text-sm mb-3 leading-relaxed line-clamp-3">
                {project.description}
              </p>
              <div className="flex items-center justify-between mb-5">
                <button
                  onClick={() => openProjectDetails(project)}
                  className="text-green-700 hover:text-green-800 text-xs font-bold uppercase tracking-wider flex items-center transition-colors cursor-pointer text-left"
                >
                  <Info className="h-4 w-4 mr-1.5" />
                  <span>Read More / View Details</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleCopyLink(project.id!)}
                  className="inline-flex items-center space-x-1 text-gray-400 hover:text-green-700 text-xs font-bold transition-colors cursor-pointer"
                  title="Share Project Link"
                >
                  {copiedId === project.id ? (
                    <>
                      <Check className="h-4 w-4 text-green-600" />
                      <span className="text-green-600">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Share2 className="h-4 w-4" />
                      <span>Share</span>
                    </>
                  )}
                </button>
              </div>
              
              <div className="mb-6 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Min Investment</span>
                  <span className="text-lg font-bold text-green-700">{formatCurrency(project.minInvestment || 1000)}</span>
                </div>
              </div>
              
              <div className="mt-auto space-y-6">
                <div className="flex justify-between text-xs font-bold p-4 bg-gray-50 rounded-2xl border border-gray-100">
                  <span className="text-gray-400 uppercase tracking-wider">Target Amount</span>
                  <span className="text-[#1A2E26]">{formatCurrency(project.targetAmount)}</span>
                </div>

                <button
                  onClick={() => {
                    setSelectedProject(project);
                    setModalStep('amount');
                    setInvestmentAmount('');
                    setFormError(null);
                    setProfileTab('personal');
                  }}
                  disabled={project.status !== 'Active'}
                  className={cn(
                    "w-full font-bold py-4 rounded-2xl transition-all shadow-lg",
                    project.status === 'Active' 
                      ? "bg-[#1A2E26] hover:bg-[#2A3E36] text-white shadow-green-100" 
                      : "bg-gray-200 text-gray-500 cursor-not-allowed shadow-none"
                  )}
                >
                  {project.status === 'Active' ? 'Invest Now' : 'Currently Closed'}
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Investment Modal */}
      <AnimatePresence>
        {selectedProject && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedProject(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className={cn(
                "relative bg-white rounded-[40px] shadow-2xl w-full p-8 overflow-hidden transition-all duration-300 flex flex-col max-h-[90vh]",
                modalStep === 'profile' ? "max-w-3xl" : "max-w-md"
              )}
            >
              {profileLoading ? (
                <div className="text-center py-16 flex flex-col items-center justify-center space-y-4">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
                  <h3 className="text-lg font-bold text-gray-700">Verifying Profile...</h3>
                  <p className="text-xs text-gray-400">Checking your Investor KYC details.</p>
                </div>
              ) : modalStep === 'submitting' || submitting ? (
                <div className="text-center py-16 flex flex-col items-center justify-center space-y-4">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
                  <h3 className="text-lg font-bold text-gray-700">Processing Investment...</h3>
                  <p className="text-xs text-gray-400">Registering your funds with the project.</p>
                </div>
              ) : modalStep === 'success' || success ? (
                <div className="text-center py-12">
                  <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <CheckCircle2 className="h-10 w-10 text-green-600" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">Investment Received!</h2>
                  <p className="text-gray-500">Thank you for growing with {FARM_NAME}.</p>
                </div>
              ) : modalStep === 'amount' ? (
                <>
                  <div className="flex justify-between items-start mb-8">
                    <div>
                      <h2 className="text-2xl font-bold text-[#1A2E26]">Invest in Project</h2>
                      <p className="text-sm text-gray-500 mt-1">{selectedProject.title}</p>
                    </div>
                    <button 
                      onClick={() => setSelectedProject(null)}
                      className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                    >
                      <X className="h-6 w-6 text-gray-400" />
                    </button>
                  </div>

                  <form onSubmit={handleAmountSubmit} className="space-y-6">
                    {formError && (
                      <div className="p-4 bg-red-50 border border-red-100 text-red-700 text-xs rounded-2xl font-medium">
                        {formError}
                      </div>
                    )}

                    <div className="space-y-3">
                      <label className="text-sm font-bold text-gray-700">Investment Amount (৳)</label>
                      <div className="relative">
                        <span className="absolute left-6 top-1/2 -translate-y-1/2 text-xl font-bold text-gray-400">৳</span>
                        <input
                          type="number"
                          required
                          min={selectedProject.minInvestment || 1000}
                          value={investmentAmount}
                          onChange={(e) => setInvestmentAmount(e.target.value)}
                          className="w-full bg-gray-50 border border-transparent rounded-2xl py-5 pl-12 pr-6 focus:bg-white focus:border-green-500 outline-none transition-all text-xl font-bold"
                          placeholder="0"
                        />
                      </div>
                      <p className="text-xs text-gray-400 font-medium">Minimum investment: {formatCurrency(selectedProject.minInvestment || 1000)}</p>
                    </div>

                    <div className="bg-green-50 p-6 rounded-3xl flex items-start space-x-4 border border-green-100">
                      <div className="bg-green-100 p-2 rounded-xl">
                        <Leaf className="h-5 w-5 text-green-700" />
                      </div>
                      <p className="text-xs text-green-800 leading-relaxed font-medium">
                        Your investment directly supports regenerative farming. We'll send you regular updates on project milestones and impact.
                      </p>
                    </div>

                    <button
                      type="submit"
                      className="w-full bg-[#1A2E26] hover:bg-[#2A3E36] text-white font-bold py-5 rounded-2xl transition-all shadow-lg shadow-green-200"
                    >
                      Continue
                    </button>
                  </form>
                </>
              ) : modalStep === 'profile' && userProfile ? (
                <>
                  <div className="flex justify-between items-start mb-6 flex-shrink-0">
                    <div>
                      <h2 className="text-2xl font-bold text-[#1A2E26]">Investor KYC Verification</h2>
                      <p className="text-xs text-amber-600 mt-1 font-medium">Please complete all parts of your Investor Profile before proceeding.</p>
                    </div>
                    <button 
                      onClick={() => setSelectedProject(null)}
                      className="p-2 hover:bg-gray-100 rounded-full transition-colors"
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
                </>
              ) : null}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* View Details / Policy Modal */}
      <AnimatePresence>
        {viewingProject && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeProjectDetails}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative bg-white rounded-[40px] shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
            >
              {/* Image banner */}
              <div className="h-64 overflow-hidden relative flex-shrink-0">
                <img
                  src={viewingProject.imageUrl}
                  alt={viewingProject.title}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                
                <div className="absolute top-6 right-6 flex items-center space-x-2">
                  <button 
                    type="button"
                    onClick={() => handleCopyLink(viewingProject.id!)}
                    className="p-2 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-full transition-colors text-white flex items-center justify-center cursor-pointer"
                    title="Copy Share Link"
                  >
                    {copiedId === viewingProject.id ? (
                      <Check className="h-5 w-5 text-green-400" />
                    ) : (
                      <Share2 className="h-5 w-5" />
                    )}
                  </button>
                  <button 
                    type="button"
                    onClick={closeProjectDetails}
                    className="p-2 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-full transition-colors text-white flex items-center justify-center cursor-pointer"
                    title="Close"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
                
                <div className="absolute bottom-6 left-8 right-8">
                  <div className={cn(
                    "inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase mb-3 backdrop-blur-md shadow-sm",
                    viewingProject.status === 'Active' ? "bg-green-500/90 text-white" : "bg-red-500/90 text-white"
                  )}>
                    <div className={cn("h-1.5 w-1.5 rounded-full", viewingProject.status === 'Active' ? "bg-white animate-pulse" : "bg-gray-300")} />
                    <span>{viewingProject.status === 'Active' ? 'Active/Running' : 'Inactive/Not Running'}</span>
                  </div>
                  <h2 className="text-2xl md:text-3xl font-bold text-white drop-shadow-sm">{viewingProject.title}</h2>
                </div>
              </div>

              {/* Scrollable Content */}
              <div className="p-8 overflow-y-auto space-y-8 flex-grow">
                {/* Statistics panel */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 flex flex-col">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Minimum Investment</span>
                    <span className="text-lg sm:text-xl font-bold text-green-700">{formatCurrency(viewingProject.minInvestment || 1000)}</span>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 flex flex-col">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Target Funding Amount</span>
                    <span className="text-lg sm:text-xl font-bold text-[#1A2E26]">{formatCurrency(viewingProject.targetAmount)}</span>
                  </div>
                </div>

                {/* Direct Share Link Section */}
                <div className="p-4 bg-green-50/50 rounded-2xl border border-green-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1 min-w-0 flex-1">
                    <span className="text-[10px] font-bold text-green-800 uppercase tracking-wider flex items-center">
                      <Share2 className="h-3.5 w-3.5 mr-1 text-green-700" />
                      Direct Share Link
                    </span>
                    <p className="text-xs text-gray-500 truncate max-w-full select-all">
                      {`${window.location.origin}/?project=${viewingProject.id}#invest`}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopyLink(viewingProject.id!)}
                    className="flex-shrink-0 inline-flex items-center space-x-1.5 px-4 py-2 bg-green-700 hover:bg-green-800 text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
                  >
                    {copiedId === viewingProject.id ? (
                      <>
                        <Check className="h-3.5 w-3.5" />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" />
                        <span>Copy Link</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Description */}
                <div>
                  <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-3 flex items-center">
                    <Info className="h-4 w-4 mr-2 text-green-700" />
                    Project Description
                  </h3>
                  <p className="text-gray-600 text-sm leading-relaxed whitespace-pre-line bg-[#F9FBFA] p-6 rounded-2xl border border-green-50/50">
                    {viewingProject.description}
                  </p>
                </div>

                {/* Investment Policy section */}
                <div className="border-t border-gray-100 pt-8">
                  <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-3 flex items-center">
                    <ShieldCheck className="h-4 w-4 mr-2 text-green-700" />
                    Investment Policy & Terms
                  </h3>
                  
                  {viewingProject.policyContent ? (
                    <div className="bg-[#F4F9F6] border border-green-100 rounded-2xl p-6 text-sm text-green-950 space-y-4">
                      <p className="whitespace-pre-line leading-relaxed">
                        {viewingProject.policyContent}
                      </p>
                    </div>
                  ) : (
                    <div className="bg-gray-50 border border-gray-200 rounded-2xl p-6 text-sm text-gray-500 italic">
                      Standard {FARM_NAME} investment guidelines apply to this project. Please contact our support team or refer to the attached document for full terms.
                    </div>
                  )}

                  {viewingProject.policyUrl && (
                    <div className="mt-4 flex justify-end">
                      <a
                        href={viewingProject.policyUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center space-x-2 px-5 py-3 bg-white hover:bg-green-50 border border-green-200 rounded-xl text-xs font-bold text-green-700 transition-all shadow-sm"
                      >
                        <FileText className="h-4 w-4" />
                        <span>View/Download Full Policy Document</span>
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Footer */}
              <div className="p-6 border-t border-gray-100 bg-gray-50 flex-shrink-0 flex items-center justify-between gap-4">
                <button
                  onClick={closeProjectDetails}
                  className="px-6 py-4 border border-gray-200 hover:bg-gray-100 rounded-2xl text-sm font-bold text-gray-500 transition-all cursor-pointer"
                >
                  Close Window
                </button>
                <button
                  onClick={() => {
                    setSelectedProject(viewingProject);
                    setModalStep('amount');
                    setInvestmentAmount('');
                    setFormError(null);
                    setProfileTab('personal');
                    closeProjectDetails();
                  }}
                  disabled={viewingProject.status !== 'Active'}
                  className={cn(
                    "flex-1 font-bold py-4 rounded-2xl transition-all shadow-lg text-center cursor-pointer",
                    viewingProject.status === 'Active' 
                      ? "bg-[#1A2E26] hover:bg-[#2A3E36] text-white shadow-green-100" 
                      : "bg-gray-200 text-gray-500 cursor-not-allowed shadow-none"
                  )}
                >
                  {viewingProject.status === 'Active' ? 'Invest in this Project' : 'Currently Closed'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
