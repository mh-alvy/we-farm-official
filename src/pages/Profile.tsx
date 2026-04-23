import React, { useState, useEffect } from 'react';
import { auth, db, storage } from '../firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { User, Phone, Mail, MapPin, Briefcase, Landmark, Users, Save, ShieldCheck, Calendar, FileText, Upload, CheckCircle2, AlertCircle, FileType } from 'lucide-react';
import { UserProfile } from '../types';

export default function Profile() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<'nid' | 'nomineeNid' | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (authUser) => {
      if (authUser) {
        const userDoc = await getDoc(doc(db, 'users', authUser.uid));
        if (userDoc.exists()) {
          setUser({ uid: authUser.uid, ...userDoc.data() } as UserProfile);
        }
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
      const storageRef = ref(storage, `kyc/${user.uid}/${fileType}_${Date.now()}_${file.name}`);
      const snapshot = await uploadBytes(storageRef, file);
      const url = await getDownloadURL(snapshot.ref);
      
      setUser({
        ...user,
        investorProfile: {
          ...user.investorProfile,
          [field]: url
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
      const { uid, ...dataToSave } = user;
      await updateDoc(doc(db, 'users', uid), dataToSave as any);
      setMessage({ type: 'success', text: 'Profile updated successfully!' });
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
        <div className="text-center bg-white p-8 rounded-3xl shadow-xl max-w-md w-full">
          <ShieldCheck className="h-16 w-16 text-yellow-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Login Required</h2>
          <p className="text-gray-500 mb-6">Please login to view and manage your investor profile.</p>
          <a href="/login" className="inline-block bg-green-600 text-white font-bold py-3 px-8 rounded-xl hover:bg-green-700 transition-all">
            Go to Login
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-12 px-4 space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Profile</h1>
          <p className="text-gray-500">Manage your account information and investor profile</p>
        </div>
        <div className="flex items-center space-x-2 bg-green-50 text-green-700 px-4 py-2 rounded-full text-sm font-bold uppercase tracking-wider">
          <ShieldCheck className="h-4 w-4" />
          <span>{user.role} Account</span>
        </div>
      </div>

      {message && (
        <div className={`p-4 rounded-2xl flex items-center space-x-3 ${
          message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
        }`}>
          <span>{message.text}</span>
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
                  value={user.name}
                  onChange={(e) => setUser({ ...user, name: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-green-500 outline-none transition-all font-bold"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 uppercase">Email Address</label>
                <input
                  type="email"
                  readOnly
                  value={user.email}
                  className="w-full px-4 py-3 bg-gray-100 border-none rounded-xl text-gray-500 outline-none cursor-not-allowed font-medium"
                />
                <p className="text-[10px] text-gray-400">Email cannot be changed.</p>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 uppercase">Phone Number</label>
                <input
                  type="tel"
                  value={user.phone || ''}
                  onChange={(e) => setUser({ ...user, phone: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-green-500 outline-none transition-all font-bold"
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
            className="flex items-center space-x-2 bg-green-600 hover:bg-green-700 text-white font-bold py-4 px-10 rounded-2xl transition-all shadow-lg active:scale-95 disabled:bg-gray-400"
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
