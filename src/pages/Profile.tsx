import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { db } from '../firebase';
import { doc, setDoc, collection, getDocs, query, orderBy } from 'firebase/firestore';
import { User, Phone, Mail, MapPin, Briefcase, Landmark, Users, Save, ShieldCheck, FileText, Upload, CheckCircle2, FileType, TrendingUp, Target, Calendar, Smartphone } from 'lucide-react';
import { Investment, UserProfile } from '../types';
import { subscribeToAuthSession, setPhoneSession, normalizePhone } from '../lib/authSession';
import { formatCurrency, formatDate } from '../lib/utils';

export default function Profile() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isPhoneAuth, setIsPhoneAuth] = useState(false);
  const [myInvestments, setMyInvestments] = useState<Investment[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<'nid' | 'nomineeNid' | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeToAuthSession(async (state) => {
      if (state.uid && state.profile) {
        setUser(state.profile);
        setIsPhoneAuth(state.isPhoneAuth);

        // Fetch investor's own investments matching phone, email, or uid
        try {
          const q = query(collection(db, 'investments'), orderBy('date', 'desc'));
          const snap = await getDocs(q);
          const normUserPhone = normalizePhone(state.profile.phone || '');
          const userEmail = (state.profile.email || '').trim().toLowerCase();

          const matched = snap.docs
            .map(d => ({ id: d.id, ...d.data() } as Investment))
            .filter(inv => {
              if (inv.investorUid && inv.investorUid === state.uid) return true;
              if (normUserPhone && inv.investorPhone && normalizePhone(inv.investorPhone) === normUserPhone) return true;
              if (userEmail && inv.investorEmail && inv.investorEmail.trim().toLowerCase() === userEmail) return true;
              return false;
            });
          setMyInvestments(matched);
        } catch (err) {
          console.warn('Could not load investor investments:', err);
        }
      } else {
        setUser(null);
        setIsPhoneAuth(false);
        setMyInvestments([]);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: 'nidFileUrl' | 'nomineeNidFileUrl') => {
    if (!e.target.files || !e.target.files[0] || !user) return;
    
    const file = e.target.files[0];
    const fileType = field === 'nidFileUrl' ? 'nid' : 'nomineeNid';
    setUploading(fileType);
    
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

      setUser({
        ...user,
        investorProfile: {
          ...user.investorProfile,
          [field]: dataUrl
        }
      });
      setMessage({ type: 'success', text: 'File uploaded successfully! Click save to update profile.' });
    } catch (err) {
      console.error(err);
      setMessage({ type: 'error', text: 'Failed to upload file.' });
    } finally {
      setUploading(null);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    setSaving(true);
    setMessage(null);
    try {
      const normalizedPhoneVal = normalizePhone(user.phone || '');
      const updatedUser: UserProfile = {
        ...user,
        phone: normalizedPhoneVal || user.phone || ''
      };
      const { uid, ...dataToSave } = updatedUser;
      await setDoc(doc(db, 'users', uid), { ...dataToSave, uid }, { merge: true });
      if (isPhoneAuth) {
        setPhoneSession(updatedUser);
      }
      setUser(updatedUser);
      setMessage({ type: 'success', text: 'প্রোফাইল সফলভাবে আপডেট করা হয়েছে (Profile updated successfully)!' });
    } catch (err) {
      console.error(err);
      setMessage({ type: 'error', text: 'Failed to update profile.' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center bg-white p-8 rounded-3xl shadow-xl max-w-md w-full border border-gray-100">
          <Smartphone className="h-16 w-16 text-green-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">ইনভেস্টর লগইন প্রয়োজন</h2>
          <p className="text-gray-500 mb-6 text-sm">আপনার ইনভেস্টর প্রোফাইল দেখতে ও পরিচালনা করতে মোবাইল নম্বর এবং OTP দিয়ে লগইন করুন।</p>
          <Link to="/login" className="inline-block bg-green-600 text-white font-bold py-3.5 px-8 rounded-xl hover:bg-green-700 transition-all shadow-md">
            ফোন ও OTP দিয়ে লগইন করুন
          </Link>
        </div>
      </div>
    );
  }

  const totalMyInvestment = myInvestments.reduce((sum, inv) => sum + (Number(inv.amount) || 0), 0);

  return (
    <div className="max-w-4xl mx-auto py-12 px-4 space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Investor Profile</h1>
          <p className="text-gray-500">Manage your account information, KYC details, and investments</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {user.phone && (
            <div className="flex items-center space-x-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 px-3.5 py-2 rounded-full text-xs font-bold">
              <Phone className="h-3.5 w-3.5" />
              <span>{user.phone}</span>
            </div>
          )}
          <div className="flex items-center space-x-2 bg-green-50 text-green-700 px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider">
            <ShieldCheck className="h-4 w-4" />
            <span>{user.role} Account</span>
          </div>
        </div>
      </div>

      {/* My Investments Summary Section */}
      {myInvestments.length > 0 && (
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="bg-gradient-to-r from-[#1A2E26] to-green-800 px-6 py-4 flex items-center justify-between text-white">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5 text-green-300" />
              <h2 className="font-bold">আমার বিনিয়োগসমূহ (My Investments)</h2>
            </div>
            <div className="text-right">
              <span className="text-[10px] uppercase tracking-wider text-green-200 block">মোট বিনিয়োগ</span>
              <span className="text-lg font-extrabold text-white">{formatCurrency(totalMyInvestment)}</span>
            </div>
          </div>
          <div className="divide-y divide-gray-100">
            {myInvestments.map((inv) => (
              <div key={inv.id} className="p-4 sm:px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-gray-50 transition-colors">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-green-50 text-green-700 rounded-xl flex items-center justify-center shrink-0">
                    <Target className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="font-bold text-gray-900 text-sm">{inv.projectTitle || 'General Farm Project'}</h4>
                      {inv.batchName && (
                        <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 text-[10px] font-bold border border-blue-100">
                          {inv.batchName}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 mt-0.5">
                      <span className="inline-flex items-center space-x-1">
                        <Calendar className="h-3 w-3" />
                        <span>{formatDate(inv.date)}</span>
                      </span>
                      {inv.profitStartMonth && (
                        <span className="text-emerald-700 font-bold">
                          • প্রফিট শুরু: {inv.profitStartMonth}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="text-left sm:text-right font-extrabold text-green-700 text-base">
                  {formatCurrency(inv.amount)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {message && (
        <div className={`p-4 rounded-2xl flex items-center space-x-3 ${
          message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-red-50 text-red-700 border border-red-100'
        }`}>
          <CheckCircle2 className="h-5 w-5 shrink-0" />
          <span className="text-sm font-medium">{message.text}</span>
        </div>
      )}

      <form onSubmit={handleUpdateProfile} className="space-y-8">
        {/* Basic Info */}
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="bg-gray-50 px-6 py-4 border-b border-gray-100 flex items-center space-x-2">
            <User className="h-5 w-5 text-gray-400" />
            <h2 className="font-bold text-gray-900">Basic Information</h2>
          </div>
          <div className="p-6 md:p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 uppercase">Full Name</label>
                <input
                  type="text"
                  value={user.name || ''}
                  onChange={(e) => setUser({ ...user, name: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-green-500 outline-none transition-all font-bold"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 uppercase">Phone Number (OTP Login)</label>
                <input
                  type="tel"
                  readOnly={isPhoneAuth}
                  value={user.phone || ''}
                  onChange={(e) => setUser({ ...user, phone: e.target.value })}
                  className={`w-full px-4 py-3 border-none rounded-xl outline-none transition-all font-bold ${
                    isPhoneAuth ? 'bg-gray-100 text-gray-600 cursor-not-allowed' : 'bg-gray-50 focus:ring-2 focus:ring-green-500'
                  }`}
                />
                {isPhoneAuth && (
                  <p className="text-[10px] text-green-600 font-semibold">✓ Verified Phone Number for OTP Login</p>
                )}
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 uppercase">Email Address (Optional)</label>
                <input
                  type="email"
                  readOnly={!isPhoneAuth && !!user.email}
                  value={user.email || ''}
                  placeholder="Enter your email address"
                  onChange={(e) => setUser({ ...user, email: e.target.value })}
                  className={`w-full px-4 py-3 border-none rounded-xl outline-none transition-all font-medium ${
                    !isPhoneAuth && !!user.email ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : 'bg-gray-50 focus:ring-2 focus:ring-green-500'
                  }`}
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 uppercase">Emergency Contact Phone</label>
                <input
                  type="tel"
                  value={user.investorProfile?.emergencyPhone || ''}
                  placeholder="Emergency phone number"
                  onChange={(e) => setUser({ ...user, investorProfile: { ...user.investorProfile, emergencyPhone: e.target.value } })}
                  className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-green-500 outline-none transition-all font-medium"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Investor Profile */}
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="bg-green-600 px-6 py-4 flex items-center justify-between">
            <div className="flex items-center space-x-2 text-white">
              <Landmark className="h-5 w-5" />
              <h2 className="font-bold">Investor Profile (KYC)</h2>
            </div>
            <span className="text-[10px] bg-white/20 text-white px-3 py-1 rounded-full font-bold uppercase">Required for Investment</span>
          </div>
          
          <div className="p-6 md:p-8 space-y-10">
            {/* Personal Part */}
            <div className="space-y-6">
              <div className="flex items-center space-x-3 text-gray-400">
                <FileText className="h-4 w-4" />
                <h3 className="text-xs font-bold uppercase tracking-widest">Personal Details</h3>
                <div className="flex-1 border-t border-gray-100"></div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="col-span-1 space-y-2">
                  <label className="text-[10px] font-bold text-gray-400 uppercase">Father's Name</label>
                  <input
                    type="text"
                    value={user.investorProfile?.fatherName || ''}
                    onChange={(e) => setUser({ ...user, investorProfile: { ...user.investorProfile, fatherName: e.target.value } })}
                    className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-green-500 outline-none transition-all"
                  />
                </div>
                <div className="col-span-1 space-y-2">
                  <label className="text-[10px] font-bold text-gray-400 uppercase">Mother's Name</label>
                  <input
                    type="text"
                    value={user.investorProfile?.motherName || ''}
                    onChange={(e) => setUser({ ...user, investorProfile: { ...user.investorProfile, motherName: e.target.value } })}
                    className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-green-500 outline-none transition-all"
                  />
                </div>
                <div className="col-span-1 space-y-2">
                  <label className="text-[10px] font-bold text-gray-400 uppercase">Date of Birth</label>
                  <input
                    type="date"
                    value={user.investorProfile?.dob || ''}
                    onChange={(e) => setUser({ ...user, investorProfile: { ...user.investorProfile, dob: e.target.value } })}
                    className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-green-500 outline-none transition-all"
                  />
                </div>
                <div className="col-span-1 space-y-2">
                  <label className="text-[10px] font-bold text-gray-400 uppercase">Gender</label>
                  <select
                    value={user.investorProfile?.gender || ''}
                    onChange={(e) => setUser({ ...user, investorProfile: { ...user.investorProfile, gender: e.target.value } })}
                    className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-green-500 outline-none transition-all"
                  >
                    <option value="">Select Gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div className="col-span-2 lg:col-span-1 space-y-2">
                  <label className="text-[10px] font-bold text-gray-400 uppercase">NID / Passport Number</label>
                  <input
                    type="text"
                    value={user.investorProfile?.nidPassport || ''}
                    onChange={(e) => setUser({ ...user, investorProfile: { ...user.investorProfile, nidPassport: e.target.value } })}
                    className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-green-500 outline-none transition-all"
                  />
                </div>
                <div className="col-span-2 lg:col-span-2 space-y-2">
                  <label className="text-[10px] font-bold text-gray-400 uppercase">NID Card Attachment</label>
                  <div className="flex items-center space-x-4">
                    <label className="flex-1 cursor-pointer">
                      <div className={`flex items-center justify-center space-x-2 px-4 py-3 rounded-xl border-2 border-dashed transition-all ${
                        uploading === 'nid' ? 'bg-gray-100 border-gray-300' : 
                        user.investorProfile?.nidFileUrl ? 'bg-green-50 border-green-200 text-green-700' : 'bg-gray-50 border-gray-200 text-gray-400 hover:border-green-400'
                      }`}>
                        {uploading === 'nid' ? (
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-green-600"></div>
                        ) : user.investorProfile?.nidFileUrl ? (
                          <CheckCircle2 className="h-5 w-5 text-green-600" />
                        ) : (
                          <Upload className="h-5 w-5" />
                        )}
                        <span className="text-xs font-bold uppercase tracking-wider">
                          {uploading === 'nid' ? 'Uploading...' : 
                           user.investorProfile?.nidFileUrl ? 'Update NID File' : 'Upload NID Card'}
                        </span>
                      </div>
                      <input 
                        type="file" 
                        className="hidden" 
                        accept="image/*,.pdf" 
                        onChange={(e) => handleFileUpload(e, 'nidFileUrl')}
                        disabled={!!uploading}
                      />
                    </label>
                    {user.investorProfile?.nidFileUrl && (
                      <a 
                        href={user.investorProfile.nidFileUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="p-3 bg-green-100 text-green-700 rounded-xl hover:bg-green-200 transition-all"
                        title="View File"
                      >
                        <FileType className="h-5 w-5" />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Contact Part */}
            <div className="space-y-6">
              <div className="flex items-center space-x-3 text-gray-400">
                <MapPin className="h-4 w-4" />
                <h3 className="text-xs font-bold uppercase tracking-widest">Contact Information</h3>
                <div className="flex-1 border-t border-gray-100"></div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-400 uppercase">Current Address</label>
                  <textarea
                    rows={2}
                    value={user.investorProfile?.currentAddress || ''}
                    onChange={(e) => setUser({ ...user, investorProfile: { ...user.investorProfile, currentAddress: e.target.value } })}
                    className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-green-500 outline-none transition-all resize-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-400 uppercase">Permanent Address</label>
                  <textarea
                    rows={2}
                    value={user.investorProfile?.permanentAddress || ''}
                    onChange={(e) => setUser({ ...user, investorProfile: { ...user.investorProfile, permanentAddress: e.target.value } })}
                    className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-green-500 outline-none transition-all resize-none"
                  />
                </div>
              </div>
            </div>

            {/* Occupational Part */}
            <div className="space-y-6">
              <div className="flex items-center space-x-3 text-gray-400">
                <Briefcase className="h-4 w-4" />
                <h3 className="text-xs font-bold uppercase tracking-widest">Occupational Details</h3>
                <div className="flex-1 border-t border-gray-100"></div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-400 uppercase">Occupation</label>
                  <input
                    type="text"
                    value={user.investorProfile?.occupation || ''}
                    onChange={(e) => setUser({ ...user, investorProfile: { ...user.investorProfile, occupation: e.target.value } })}
                    className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-green-500 outline-none transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-400 uppercase">Organization</label>
                  <input
                    type="text"
                    value={user.investorProfile?.organization || ''}
                    onChange={(e) => setUser({ ...user, investorProfile: { ...user.investorProfile, organization: e.target.value } })}
                    className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-green-500 outline-none transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-400 uppercase">Designation</label>
                  <input
                    type="text"
                    value={user.investorProfile?.designation || ''}
                    onChange={(e) => setUser({ ...user, investorProfile: { ...user.investorProfile, designation: e.target.value } })}
                    className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-green-500 outline-none transition-all"
                  />
                </div>
              </div>
            </div>

            {/* Bank Part */}
            <div className="space-y-6">
              <div className="flex items-center space-x-3 text-gray-400">
                <Landmark className="h-4 w-4" />
                <h3 className="text-xs font-bold uppercase tracking-widest">Bank Details</h3>
                <div className="flex-1 border-t border-gray-100"></div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-400 uppercase">Bank Name</label>
                  <input
                    type="text"
                    value={user.investorProfile?.bankName || ''}
                    onChange={(e) => setUser({ ...user, investorProfile: { ...user.investorProfile, bankName: e.target.value } })}
                    className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-green-500 outline-none transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-400 uppercase">Branch Name</label>
                  <input
                    type="text"
                    value={user.investorProfile?.branchName || ''}
                    onChange={(e) => setUser({ ...user, investorProfile: { ...user.investorProfile, branchName: e.target.value } })}
                    className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-green-500 outline-none transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-400 uppercase">Account Name</label>
                  <input
                    type="text"
                    value={user.investorProfile?.accountName || ''}
                    onChange={(e) => setUser({ ...user, investorProfile: { ...user.investorProfile, accountName: e.target.value } })}
                    className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-green-500 outline-none transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-400 uppercase">Account Number</label>
                  <input
                    type="text"
                    value={user.investorProfile?.accountNumber || ''}
                    onChange={(e) => setUser({ ...user, investorProfile: { ...user.investorProfile, accountNumber: e.target.value } })}
                    className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-green-500 outline-none transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-400 uppercase">Routing Number</label>
                  <input
                    type="text"
                    value={user.investorProfile?.routingNumber || ''}
                    onChange={(e) => setUser({ ...user, investorProfile: { ...user.investorProfile, routingNumber: e.target.value } })}
                    className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-green-500 outline-none transition-all"
                  />
                </div>
              </div>
            </div>

            {/* Nominee Part */}
            <div className="space-y-6">
              <div className="flex items-center space-x-3 text-gray-400">
                <Users className="h-4 w-4" />
                <h3 className="text-xs font-bold uppercase tracking-widest">Nominee Details</h3>
                <div className="flex-1 border-t border-gray-100"></div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-400 uppercase">Nominee Name</label>
                  <input
                    type="text"
                    value={user.investorProfile?.nomineeName || ''}
                    onChange={(e) => setUser({ ...user, investorProfile: { ...user.investorProfile, nomineeName: e.target.value } })}
                    className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-green-500 outline-none transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-400 uppercase">Relation</label>
                  <input
                    type="text"
                    value={user.investorProfile?.nomineeRelation || ''}
                    onChange={(e) => setUser({ ...user, investorProfile: { ...user.investorProfile, nomineeRelation: e.target.value } })}
                    className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-green-500 outline-none transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-400 uppercase">Phone</label>
                  <input
                    type="tel"
                    value={user.investorProfile?.nomineePhone || ''}
                    onChange={(e) => setUser({ ...user, investorProfile: { ...user.investorProfile, nomineePhone: e.target.value } })}
                    className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-green-500 outline-none transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-400 uppercase">NID</label>
                  <input
                    type="text"
                    value={user.investorProfile?.nomineeNid || ''}
                    onChange={(e) => setUser({ ...user, investorProfile: { ...user.investorProfile, nomineeNid: e.target.value } })}
                    className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-green-500 outline-none transition-all"
                  />
                </div>
                <div className="col-span-1 md:col-span-2 lg:col-span-4 space-y-2 pt-2">
                  <label className="text-[10px] font-bold text-gray-400 uppercase">Nominee NID Attachment</label>
                  <div className="flex items-center space-x-4">
                    <label className="flex-1 cursor-pointer">
                      <div className={`flex items-center justify-center space-x-2 px-4 py-3 rounded-xl border-2 border-dashed transition-all ${
                        uploading === 'nomineeNid' ? 'bg-gray-100 border-gray-300' : 
                        user.investorProfile?.nomineeNidFileUrl ? 'bg-green-50 border-green-200 text-green-700' : 'bg-gray-50 border-gray-200 text-gray-400 hover:border-green-400'
                      }`}>
                        {uploading === 'nomineeNid' ? (
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-green-600"></div>
                        ) : user.investorProfile?.nomineeNidFileUrl ? (
                          <CheckCircle2 className="h-5 w-5 text-green-600" />
                        ) : (
                          <Upload className="h-5 w-5" />
                        )}
                        <span className="text-xs font-bold uppercase tracking-wider">
                          {uploading === 'nomineeNid' ? 'Uploading...' : 
                           user.investorProfile?.nomineeNidFileUrl ? 'Update Nominee NID' : 'Upload Nominee NID'}
                        </span>
                      </div>
                      <input 
                        type="file" 
                        className="hidden" 
                        accept="image/*,.pdf" 
                        onChange={(e) => handleFileUpload(e, 'nomineeNidFileUrl')}
                        disabled={!!uploading}
                      />
                    </label>
                    {user.investorProfile?.nomineeNidFileUrl && (
                      <a 
                        href={user.investorProfile.nomineeNidFileUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="p-3 bg-green-100 text-green-700 rounded-xl hover:bg-green-200 transition-all"
                        title="View File"
                      >
                        <FileType className="h-5 w-5" />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center space-x-2 bg-green-600 hover:bg-green-700 text-white font-bold py-4 px-10 rounded-2xl transition-all shadow-lg active:scale-95 disabled:bg-gray-400 cursor-pointer"
          >
            {saving ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
            ) : (
              <>
                <Save className="h-5 w-5" />
                <span>Save Profile Information</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
