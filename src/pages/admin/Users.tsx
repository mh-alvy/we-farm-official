import React, { useState, useEffect } from 'react';
import { db, auth } from '../../firebase';
import { collection, onSnapshot, query, orderBy, doc, updateDoc, setDoc, getDocs, where, limit, deleteDoc } from 'firebase/firestore';
import { User, Mail, Phone, Search, Shield, Printer, FileText, UserPlus, ShieldAlert, CheckCircle2, FileType, Pencil, X, Upload, MapPin, Briefcase, Landmark, Users as UsersIcon, Save, Trash2 } from 'lucide-react';
import { UserProfile } from '../../types';
import { normalizePhone, getPhoneSearchVariants } from '../../lib/authSession';
import { AnimatePresence, motion } from 'motion/react';

const emptyInvestorForm: Omit<UserProfile, 'uid'> = {
  name: '',
  email: '',
  phone: '',
  role: 'investor',
  createdAt: '',
  investorProfile: {
    dob: '',
    fatherName: '',
    motherName: '',
    gender: '',
    nidPassport: '',
    emergencyPhone: '',
    permanentAddress: '',
    currentAddress: '',
    occupation: '',
    organization: '',
    designation: '',
    bankName: '',
    branchName: '',
    accountName: '',
    accountNumber: '',
    routingNumber: '',
    nomineeName: '',
    nomineeRelation: '',
    nomineePhone: '',
    nomineeNid: '',
    nomineeNidFileUrl: '',
    nidFileUrl: ''
  }
};

export default function AdminUsers() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [pendingRoleChange, setPendingRoleChange] = useState<{ userId: string; role: 'investor' | 'admin' | 'super_admin' } | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);

  // Add / Edit Investor Modal States
  const [isInvestorModalOpen, setIsInvestorModalOpen] = useState(false);
  const [editingUid, setEditingUid] = useState<string | null>(null);
  const [activeFormTab, setActiveFormTab] = useState<'personal' | 'contact' | 'bank' | 'nominee'>('personal');
  const [investorForm, setInvestorForm] = useState<Omit<UserProfile, 'uid'>>(emptyInvestorForm);
  const [uploadingFile, setUploadingFile] = useState<'nid' | 'nomineeNid' | null>(null);
  const [savingInvestor, setSavingInvestor] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [userToDelete, setUserToDelete] = useState<UserProfile | null>(null);

  const handleDeleteUser = async () => {
    if (!userToDelete || !isSuperAdmin) return;
    if (userToDelete.email === 'alvymahamudulhasan@gmail.com') {
      setActionMessage({ type: 'error', text: 'Cannot delete the primary Super Admin account.' });
      setUserToDelete(null);
      return;
    }
    try {
      await deleteDoc(doc(db, 'users', userToDelete.uid));
      setActionMessage({ type: 'success', text: `Admin ${userToDelete.name || userToDelete.email} deleted successfully.` });
      if (selectedUser?.uid === userToDelete.uid) {
        setSelectedUser(null);
      }
      setUserToDelete(null);
    } catch (err) {
      console.error(err);
      setActionMessage({ type: 'error', text: 'Failed to delete user.' });
    } finally {
      setTimeout(() => setActionMessage(null), 4000);
    }
  };

  useEffect(() => {
    const currentUid = auth.currentUser?.uid;
    if (!currentUid) return;

    const userDocRef = doc(db, 'users', currentUid);
    const unsubscribe = onSnapshot(userDocRef, (docSnap) => {
      if (docSnap.exists()) {
        setCurrentUserRole(docSnap.data().role || null);
      }
    });
    return () => unsubscribe();
  }, []);

  const isSuperAdmin = currentUserRole === 'super_admin' || auth.currentUser?.email === 'alvymahamudulhasan@gmail.com';

  useEffect(() => {
    const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'), limit(150));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const usersData = snapshot.docs.map(docSnap => ({ ...docSnap.data(), uid: docSnap.id } as UserProfile));
      setUsers(usersData);

      if (selectedUser) {
        const updated = usersData.find(u => u.uid === selectedUser.uid);
        if (updated) setSelectedUser(updated);
      }

      setLoading(false);
    });
    return () => unsubscribe();
  }, [selectedUser?.uid]);

  const openAddInvestorModal = () => {
    setEditingUid(null);
    setInvestorForm({
      ...emptyInvestorForm,
      investorProfile: { ...emptyInvestorForm.investorProfile }
    });
    setActiveFormTab('personal');
    setModalError(null);
    setIsInvestorModalOpen(true);
  };

  const openEditInvestorModal = (targetUser: UserProfile) => {
    setEditingUid(targetUser.uid);
    setInvestorForm({
      name: targetUser.name || '',
      email: targetUser.email || '',
      phone: targetUser.phone || '',
      role: targetUser.role || 'investor',
      createdAt: targetUser.createdAt || new Date().toISOString(),
      investorProfile: {
        ...emptyInvestorForm.investorProfile,
        ...(targetUser.investorProfile || {})
      }
    });
    setActiveFormTab('personal');
    setModalError(null);
    setIsInvestorModalOpen(true);
  };

  const handleModalFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: 'nidFileUrl' | 'nomineeNidFileUrl') => {
    if (!e.target.files || !e.target.files[0]) return;
    const file = e.target.files[0];
    const fileType = field === 'nidFileUrl' ? 'nid' : 'nomineeNid';
    setUploadingFile(fileType);
    setModalError(null);

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
            img.onerror = () => resolve(originalDataUrl);
          } else {
            resolve(originalDataUrl);
          }
        };
        reader.onerror = (err) => reject(err);
      });

      setInvestorForm(prev => ({
        ...prev,
        investorProfile: {
          ...prev.investorProfile,
          [field]: dataUrl
        }
      }));
    } catch (err) {
      console.error(err);
      setModalError('ফাইল আপলোড করতে সমস্যা হয়েছে।');
    } finally {
      setUploadingFile(null);
    }
  };

  const handleSaveInvestor = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);

    const trimmedName = investorForm.name.trim();
    const normPhone = normalizePhone(investorForm.phone || '');

    if (!trimmedName) {
      setModalError('অনুগ্রহ করে ইনভেস্টরের পূর্ণ নাম লিখুন (Full Name is required)।');
      setActiveFormTab('personal');
      return;
    }

    if (!normPhone || normPhone.length < 10) {
      setModalError('অনুগ্রহ করে একটি সঠিক মোবাইল নম্বর দিন যা দিয়ে ইনভেস্টর OTP লগইন করবেন।');
      setActiveFormTab('personal');
      return;
    }

    setSavingInvestor(true);
    try {
      let targetUid = editingUid;

      if (!targetUid) {
        // Check if a user with this phone already exists
        const variants = getPhoneSearchVariants(normPhone);
        const usersRef = collection(db, 'users');
        for (const variant of variants) {
          const q = query(usersRef, where('phone', '==', variant), limit(1));
          const snap = await getDocs(q);
          if (!snap.empty) {
            targetUid = snap.docs[0].id;
            break;
          }
        }
        if (!targetUid) {
          targetUid = `phone_${normPhone}`;
        }
      }

      const payload: UserProfile = {
        uid: targetUid,
        name: trimmedName,
        phone: normPhone,
        email: (investorForm.email || '').trim(),
        role: editingUid ? (investorForm.role || 'investor') : 'investor',
        createdAt: investorForm.createdAt || new Date().toISOString(),
        investorProfile: {
          ...(investorForm.investorProfile || {})
        }
      };

      const { uid, ...docData } = payload;
      await setDoc(doc(db, 'users', targetUid), { ...docData, uid: targetUid }, { merge: true });

      setSelectedUser(payload);
      setIsInvestorModalOpen(false);
      setActionMessage({
        type: 'success',
        text: editingUid
          ? 'ইনভেস্টরের প্রোফাইল সফলভাবে আপডেট করা হয়েছে!'
          : `নতুন ইনভেস্টর (${trimmedName}) যুক্ত করা হয়েছে! এখন তিনি ${normPhone} নম্বরে OTP দিয়ে লগইন করতে পারবেন।`
      });
      setTimeout(() => setActionMessage(null), 5000);
    } catch (err: any) {
      console.error(err);
      setModalError(err.message || 'ইনভেস্টর তথ্য সংরক্ষণ করতে ব্যর্থ হয়েছে।');
    } finally {
      setSavingInvestor(false);
    }
  };

  const changeUserRole = (targetUser: UserProfile, newRole: 'investor' | 'admin' | 'super_admin') => {
    if (!isSuperAdmin) {
      setActionMessage({ type: 'error', text: 'Role management is restricted. Only the Super Admin / Developer can perform role management actions.' });
      return;
    }

    if (targetUser.email === 'alvymahamudulhasan@gmail.com' && newRole !== 'super_admin') {
      setActionMessage({ type: 'error', text: 'The Super Admin/Developer account cannot be demoted.' });
      return;
    }

    if (targetUser.role === newRole) {
      setPendingRoleChange(null);
      return;
    }

    setPendingRoleChange({ userId: targetUser.uid, role: newRole });
  };

  const confirmRoleChange = async () => {
    if (!pendingRoleChange || !selectedUser) return;

    const { userId, role } = pendingRoleChange;
    setPendingRoleChange(null);
    setUpdating(userId);
    setActionMessage(null);
    try {
      await updateDoc(doc(db, 'users', userId), {
        role: role
      });
      setActionMessage({ type: 'success', text: `User role updated to ${role} successfully.` });
    } catch (err) {
      console.error(err);
      setActionMessage({ type: 'error', text: 'Failed to update user role.' });
    } finally {
      setUpdating(null);
      setTimeout(() => setActionMessage(null), 3000);
    }
  };

  const adminUsersOnly = users.filter(user => user.role === 'admin' || user.role === 'super_admin');
  const filteredUsers = adminUsersOnly.filter(user => {
    const searchLower = searchTerm.toLowerCase();
    const nameMatch = user.name?.toLowerCase().includes(searchLower) || false;
    const emailMatch = user.email?.toLowerCase().includes(searchLower) || false;
    const phoneMatch = user.phone?.includes(searchTerm) || false;
    return nameMatch || emailMatch || phoneMatch;
  });

  const handlePrint = (user: UserProfile) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const profile = user.investorProfile;
    const joinDate = user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A';
    
    printWindow.document.write(`
      <html>
        <head>
          <title>Investor Profile - ${user.name || 'Anonymous'}</title>
          <style>
            body { font-family: sans-serif; line-height: 1.6; color: #333; padding: 40px; }
            h1 { color: #16a34a; border-bottom: 2px solid #16a34a; padding-bottom: 10px; margin-bottom: 30px; }
            h2 { color: #4b5563; font-size: 18px; margin-top: 30px; border-left: 4px solid #16a34a; padding-left: 10px; }
            .section { margin-bottom: 20px; display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
            .item { margin-bottom: 10px; }
            .label { font-weight: bold; color: #6b7280; font-size: 12px; text-transform: uppercase; }
            .value { font-size: 14px; font-weight: 500; }
            @media print {
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <h1>We Farm - Investor Information Sheet</h1>
          
          <div class="section">
            <div class="item"><div class="label">Full Name</div><div class="value">${user.name || 'N/A'}</div></div>
            <div class="item"><div class="label">Phone (OTP Login)</div><div class="value">${user.phone || 'N/A'}</div></div>
            <div class="item"><div class="label">Email</div><div class="value">${user.email || 'N/A'}</div></div>
            <div class="item"><div class="label">Emergency Phone</div><div class="value">${profile?.emergencyPhone || 'N/A'}</div></div>
            <div class="item"><div class="label">Role</div><div class="value">${user.role || 'investor'}</div></div>
            <div class="item"><div class="label">Joined Date</div><div class="value">${joinDate}</div></div>
          </div>

          <h2>1. Personal Details</h2>
          <div class="section">
            <div class="item"><div class="label">Father's Name</div><div class="value">${profile?.fatherName || 'N/A'}</div></div>
            <div class="item"><div class="label">Mother's Name</div><div class="value">${profile?.motherName || 'N/A'}</div></div>
            <div class="item"><div class="label">Date of Birth</div><div class="value">${profile?.dob || 'N/A'}</div></div>
            <div class="item"><div class="label">Gender</div><div class="value">${profile?.gender || 'N/A'}</div></div>
            <div class="item"><div class="label">NID/Passport</div><div class="value">${profile?.nidPassport || 'N/A'}</div></div>
          </div>

          <h2>2. Contact Information</h2>
          <div class="section">
            <div class="item"><div class="label">Current Address</div><div class="value">${profile?.currentAddress || 'N/A'}</div></div>
            <div class="item"><div class="label">Permanent Address</div><div class="value">${profile?.permanentAddress || 'N/A'}</div></div>
          </div>

          <h2>3. Occupational Details</h2>
          <div class="section">
            <div class="item"><div class="label">Occupation</div><div class="value">${profile?.occupation || 'N/A'}</div></div>
            <div class="item"><div class="label">Organization</div><div class="value">${profile?.organization || 'N/A'}</div></div>
            <div class="item"><div class="label">Designation</div><div class="value">${profile?.designation || 'N/A'}</div></div>
          </div>

          <h2>4. Bank Details</h2>
          <div class="section">
            <div class="item"><div class="label">Bank Name</div><div class="value">${profile?.bankName || 'N/A'}</div></div>
            <div class="item"><div class="label">Branch</div><div class="value">${profile?.branchName || 'N/A'}</div></div>
            <div class="item"><div class="label">Account Name</div><div class="value">${profile?.accountName || 'N/A'}</div></div>
            <div class="item"><div class="label">Account Number</div><div class="value">${profile?.accountNumber || 'N/A'}</div></div>
            <div class="item"><div class="label">Routing Number</div><div class="value">${profile?.routingNumber || 'N/A'}</div></div>
          </div>

          <h2>5. Nominee Details</h2>
          <div class="section">
            <div class="item"><div class="label">Nominee Name</div><div class="value">${profile?.nomineeName || 'N/A'}</div></div>
            <div class="item"><div class="label">Relation</div><div class="value">${profile?.nomineeRelation || 'N/A'}</div></div>
            <div class="item"><div class="label">Phone</div><div class="value">${profile?.nomineePhone || 'N/A'}</div></div>
            <div class="item"><div class="label">NID</div><div class="value">${profile?.nomineeNid || 'N/A'}</div></div>
          </div>

          <h2>6. Attachments Provided</h2>
          <div class="section">
            <div class="item"><div class="label">Investor NID Card</div><div class="value">${profile?.nidFileUrl ? 'YES (Digital Copy Available)' : 'NO'}</div></div>
            <div class="item"><div class="label">Nominee NID Card</div><div class="value">${profile?.nomineeNidFileUrl ? 'YES (Digital Copy Available)' : 'NO'}</div></div>
          </div>

          <p style="margin-top: 50px; font-size: 10px; color: #999;">Printed on: ${new Date().toLocaleString()}</p>
          <script>window.print();</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Administration</h1>
          <p className="text-gray-500 text-sm">Manage system administrators, roles, profile information, and access permissions.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="bg-white border border-gray-100 px-4 py-2.5 rounded-xl text-sm font-bold text-gray-600 shadow-sm">
            Total Admins: {filteredUsers.length}
          </div>
        </div>
      </div>

      {actionMessage && (
        <div className={`p-4 rounded-2xl text-sm font-bold flex items-center space-x-2 border ${
          actionMessage.type === 'success' ? 'bg-green-50 text-green-700 border-green-100' : 'bg-red-50 text-red-700 border-red-100'
        }`}>
          {actionMessage.type === 'success' ? <CheckCircle2 className="h-5 w-5 shrink-0" /> : <ShieldAlert className="h-5 w-5 shrink-0" />}
          <span>{actionMessage.text}</span>
        </div>
      )}

      {/* Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name, phone number, or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-green-500 outline-none transition-all"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* User List */}
        <div className="xl:col-span-2 bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">User</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Phone / Email</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Role</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Joined</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto"></div>
                    </td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-gray-500 italic">No users found.</td>
                  </tr>
                ) : (
                  filteredUsers.map((user, index) => (
                    <tr 
                      key={user.uid || `user-${index}`} 
                      className={`hover:bg-gray-50 transition-colors cursor-pointer ${selectedUser?.uid === user.uid ? 'bg-green-50' : ''}`}
                      onClick={() => {
                        setPendingRoleChange(null);
                        setSelectedUser(user);
                      }}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center font-bold text-green-700">
                            {(user.name || 'A').charAt(0)}
                          </div>
                          <div className="flex flex-col">
                            <span className="font-bold text-gray-900">{user.name || 'Anonymous'}</span>
                            <span className="text-[10px] text-gray-400">{(user.uid || 'unknown').substring(0, 12)}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col space-y-1">
                          {user.phone && (
                            <div className="flex items-center space-x-2 text-xs font-bold text-green-700">
                              <Phone className="h-3 w-3" />
                              <span>{user.phone}</span>
                            </div>
                          )}
                          {user.email && (
                            <div className="flex items-center space-x-2 text-xs text-gray-500">
                              <Mail className="h-3 w-3" />
                              <span>{user.email}</span>
                            </div>
                          )}
                          {!user.phone && !user.email && (
                            <span className="text-xs text-gray-400 italic">No contact info</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${
                          user.role === 'super_admin' ? 'bg-purple-50 text-purple-600' :
                          user.role === 'admin' ? 'bg-indigo-50 text-indigo-600' : 'bg-green-50 text-green-600'
                        }`}>
                          {user.role === 'super_admin' ? 'super admin' : user.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs text-gray-500">
                        {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end space-x-1" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => openEditInvestorModal(user)}
                            className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-all cursor-pointer"
                            title="Edit Admin Profile"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button 
                            onClick={() => handlePrint(user)}
                            className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-all cursor-pointer"
                            title="Print Details"
                          >
                            <Printer className="h-4 w-4" />
                          </button>
                          {isSuperAdmin && user.email !== 'alvymahamudulhasan@gmail.com' && (
                            <button
                              onClick={() => setUserToDelete(user)}
                              className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all cursor-pointer"
                              title="Delete Admin"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* User Details / Preview */}
        <div className="xl:col-span-1 space-y-6">
          {selectedUser ? (
            <div className="bg-white rounded-3xl border border-gray-100 shadow-xl p-8 sticky top-6 max-h-[85vh] overflow-y-auto">
              <div className="text-center mb-6">
                <div className="w-20 h-20 bg-green-50 text-green-600 rounded-3xl flex items-center justify-center text-3xl font-bold mx-auto mb-3">
                  {(selectedUser.name || 'A').charAt(0)}
                </div>
                <h2 className="text-2xl font-bold text-gray-900">{selectedUser.name || 'Anonymous'}</h2>
                <span className="text-xs text-gray-400 uppercase font-bold tracking-widest">{selectedUser.role}</span>
              </div>

              <div className="space-y-6">
                <div>
                  <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Core Contact (OTP Login)</h3>
                  <div className="space-y-2.5 bg-gray-50 p-4 rounded-2xl">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-500">Phone (OTP)</span>
                      <span className="font-bold text-green-700">{selectedUser.phone || 'Not Set'}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-500">Email</span>
                      <span className="font-bold text-gray-900">{selectedUser.email || 'N/A'}</span>
                    </div>
                    {selectedUser.investorProfile?.emergencyPhone && (
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-500">Emergency Phone</span>
                        <span className="font-bold text-gray-900">{selectedUser.investorProfile.emergencyPhone}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Investor KYC Details</h3>
                  {selectedUser.investorProfile ? (
                    <div className="space-y-3 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-500">Father's Name</span>
                        <span className="font-bold text-gray-900">{selectedUser.investorProfile.fatherName || 'N/A'}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-500">Mother's Name</span>
                        <span className="font-bold text-gray-900">{selectedUser.investorProfile.motherName || 'N/A'}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-500">DOB / Gender</span>
                        <span className="font-bold text-gray-900">
                          {selectedUser.investorProfile.dob || 'N/A'} {selectedUser.investorProfile.gender ? `(${selectedUser.investorProfile.gender})` : ''}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-500">NID / Passport</span>
                        <span className="font-bold text-gray-900">{selectedUser.investorProfile.nidPassport || 'N/A'}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-500">Occupation</span>
                        <span className="font-bold text-gray-900">
                          {selectedUser.investorProfile.occupation || 'N/A'}
                          {selectedUser.investorProfile.organization ? ` (${selectedUser.investorProfile.organization})` : ''}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-500">Bank Account</span>
                        <span className="font-bold text-gray-900">
                          {selectedUser.investorProfile.bankName ? `${selectedUser.investorProfile.bankName} - ${selectedUser.investorProfile.accountNumber || ''}` : 'N/A'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-500">Nominee</span>
                        <span className="font-bold text-gray-900">
                          {selectedUser.investorProfile.nomineeName
                            ? `${selectedUser.investorProfile.nomineeName} (${selectedUser.investorProfile.nomineeRelation || ''})`
                            : 'N/A'}
                        </span>
                      </div>
                      <div className="bg-gray-50 p-3.5 rounded-xl mt-2 space-y-2">
                        <div>
                          <p className="text-[10px] text-gray-400 uppercase font-bold">Current Address</p>
                          <p className="text-xs text-gray-700">{selectedUser.investorProfile.currentAddress || 'N/A'}</p>
                        </div>
                        {selectedUser.investorProfile.permanentAddress && (
                          <div>
                            <p className="text-[10px] text-gray-400 uppercase font-bold">Permanent Address</p>
                            <p className="text-xs text-gray-700">{selectedUser.investorProfile.permanentAddress}</p>
                          </div>
                        )}
                      </div>

                      <div className="pt-2 space-y-2">
                        <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Attachments</h3>
                        <div className="grid grid-cols-2 gap-2">
                          {selectedUser.investorProfile.nidFileUrl ? (
                            <a 
                              href={selectedUser.investorProfile.nidFileUrl} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="flex items-center space-x-2 p-2 bg-green-50 text-green-700 rounded-lg border border-green-100 hover:bg-green-100 transition-all text-[10px] font-bold"
                            >
                              <FileType className="h-3 w-3" />
                              <span>Investor NID</span>
                            </a>
                          ) : (
                            <div className="flex items-center space-x-2 p-2 bg-gray-50 text-gray-400 rounded-lg border border-gray-100 text-[10px] font-bold">
                              <FileType className="h-3 w-3 opacity-30" />
                              <span>No Investor NID</span>
                            </div>
                          )}

                          {selectedUser.investorProfile.nomineeNidFileUrl ? (
                            <a 
                              href={selectedUser.investorProfile.nomineeNidFileUrl} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="flex items-center space-x-2 p-2 bg-indigo-50 text-indigo-700 rounded-lg border border-indigo-100 hover:bg-indigo-100 transition-all text-[10px] font-bold"
                            >
                              <FileType className="h-3 w-3" />
                              <span>Nominee NID</span>
                            </a>
                          ) : (
                            <div className="flex items-center space-x-2 p-2 bg-gray-50 text-gray-400 rounded-lg border border-gray-100 text-[10px] font-bold">
                              <FileType className="h-3 w-3 opacity-30" />
                              <span>No Nominee NID</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-amber-50 p-4 rounded-2xl flex items-center space-x-3">
                      <Shield className="h-5 w-5 text-amber-500" />
                      <p className="text-xs text-amber-600 font-medium">Investor profile not yet completed.</p>
                    </div>
                  )}
                </div>

                <div className="pt-4 border-t border-gray-100">
                  <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Role Management</h3>
                  {isSuperAdmin ? (
                    <div className="space-y-3">
                      <div className="grid grid-cols-3 gap-2">
                        {(['investor', 'admin', 'super_admin'] as const).map((r) => {
                          const isCurrent = selectedUser.role === r;
                          return (
                            <button
                              key={r}
                              disabled={updating === selectedUser.uid || (selectedUser.email === 'alvymahamudulhasan@gmail.com' && r !== 'super_admin')}
                              onClick={() => changeUserRole(selectedUser, r)}
                              className={`py-2 px-1 rounded-xl text-[10px] font-bold transition-all border text-center flex flex-col items-center justify-center gap-1 cursor-pointer ${
                                isCurrent
                                  ? r === 'super_admin'
                                    ? 'bg-purple-600 text-white border-purple-600 shadow-sm shadow-purple-100'
                                    : r === 'admin'
                                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm shadow-indigo-100'
                                    : 'bg-green-600 text-white border-green-600 shadow-sm shadow-green-100'
                                  : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                              }`}
                            >
                              <span>{r === 'super_admin' ? 'Super' : r === 'admin' ? 'Admin' : 'Investor'}</span>
                            </button>
                          );
                        })}
                      </div>

                      {pendingRoleChange && pendingRoleChange.userId === selectedUser.uid && (
                        <div className="mt-3 bg-amber-50 border border-amber-200 rounded-xl p-3 space-y-2 text-center">
                          <p className="text-[11px] text-amber-800 font-bold">
                            Change {selectedUser.name || 'this user'}'s role to {pendingRoleChange.role.toUpperCase()}?
                          </p>
                          <div className="flex gap-2 justify-center">
                            <button
                              onClick={() => confirmRoleChange()}
                              className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-[10px] font-bold transition-all shadow-sm cursor-pointer"
                            >
                              Confirm
                            </button>
                            <button
                              onClick={() => setPendingRoleChange(null)}
                              className="px-3 py-1 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-lg text-[10px] font-bold transition-all cursor-pointer"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="bg-amber-50/60 border border-amber-100 p-3 rounded-2xl">
                      <p className="text-[11px] text-amber-800 font-semibold text-center">
                        Only Super Admins can change user privileges.
                      </p>
                    </div>
                  )}
                </div>

                <div className="pt-4 border-t border-gray-100 flex gap-3">
                  <button 
                    onClick={() => openEditInvestorModal(selectedUser)}
                    className="flex-1 flex items-center justify-center space-x-2 bg-gray-900 text-white py-3 rounded-xl font-bold hover:bg-gray-800 transition-all shadow-sm cursor-pointer text-xs"
                  >
                    <Pencil className="h-4 w-4" />
                    <span>Edit Full Info</span>
                  </button>
                  <button 
                    onClick={() => handlePrint(selectedUser)}
                    className="flex-1 flex items-center justify-center space-x-2 bg-green-600 text-white py-3 rounded-xl font-bold hover:bg-green-700 transition-all shadow-md cursor-pointer text-xs"
                  >
                    <Printer className="h-4 w-4" />
                    <span>Print Sheet</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-3xl border border-dashed border-gray-200 p-12 text-center text-gray-400">
              <User className="h-12 w-12 mx-auto mb-4 opacity-20" />
              <p className="text-sm">Select a user to view or edit their complete investor profile, or click "Add New Investor".</p>
            </div>
          )}
        </div>
      </div>

      {/* Add / Edit Investor Full Profile Modal */}
      <AnimatePresence>
        {isInvestorModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsInvestorModalOpen(false)}
              className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-3xl bg-white rounded-3xl shadow-2xl overflow-hidden z-10 my-8 flex flex-col max-h-[90vh]"
            >
              {/* Modal Header */}
              <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-green-50/70 shrink-0">
                <div className="flex items-center space-x-3">
                  <div className="w-11 h-11 bg-green-600 text-white rounded-2xl flex items-center justify-center shadow-sm">
                    {editingUid ? <Pencil className="h-5 w-5" /> : <UserPlus className="h-5 w-5" />}
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">
                      {editingUid ? 'ইনভেস্টর প্রোফাইল আপডেট করুন (Edit Investor)' : 'নতুন ইনভেস্টর যুক্ত করুন (Add Complete Investor Profile)'}
                    </h3>
                    <p className="text-xs text-gray-500">
                      ফোন নম্বর ও সকল প্রয়োজনীয় KYC তথ্য প্রদান করুন। ইনভেস্টর এই ফোন নম্বরে OTP দিয়ে লগইন করতে পারবেন।
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsInvestorModalOpen(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-white rounded-full transition-colors cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Section Navigation Tabs */}
              <div className="px-6 pt-4 border-b border-gray-100 flex gap-2 overflow-x-auto bg-white shrink-0">
                {([
                  { id: 'personal', label: '১. মৌলিক ও ব্যক্তিগত তথ্য', icon: User },
                  { id: 'contact', label: '২. ঠিকানা ও পেশা', icon: MapPin },
                  { id: 'bank', label: '৩. ব্যাংক অ্যাকাউন্ট', icon: Landmark },
                  { id: 'nominee', label: '৪. নমিনির তথ্য', icon: UsersIcon }
                ] as const).map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveFormTab(tab.id)}
                      className={`flex items-center space-x-2 px-4 py-2.5 border-b-2 text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                        activeFormTab === tab.id
                          ? 'border-green-600 text-green-700 bg-green-50/50 rounded-t-xl'
                          : 'border-transparent text-gray-500 hover:text-gray-800'
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Form Body */}
              <form onSubmit={handleSaveInvestor} className="p-6 overflow-y-auto space-y-6 flex-1">
                {modalError && (
                  <div className="p-4 bg-red-50 border border-red-100 text-red-600 rounded-2xl text-xs font-bold flex items-center space-x-2">
                    <ShieldAlert className="h-4 w-4 shrink-0" />
                    <span>{modalError}</span>
                  </div>
                )}

                {activeFormTab === 'personal' && (
                  <div className="space-y-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-gray-600 uppercase mb-1.5">
                          পূর্ণ নাম (Full Name) <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="ইনভেস্টরের নাম লিখুন"
                          value={investorForm.name}
                          onChange={(e) => setInvestorForm({ ...investorForm, name: e.target.value })}
                          className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-green-500 outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-green-700 uppercase mb-1.5">
                          মোবাইল নম্বর (OTP লগইনের জন্য) <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="tel"
                          required
                          placeholder="017XXXXXXXX"
                          value={investorForm.phone || ''}
                          onChange={(e) => setInvestorForm({ ...investorForm, phone: e.target.value })}
                          className="w-full px-4 py-2.5 bg-green-50/40 border border-green-300 rounded-xl text-sm font-bold text-gray-900 focus:bg-white focus:ring-2 focus:ring-green-500 outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">
                          ইমেইল অ্যাড্রেস (ঐচ্ছিক / Optional)
                        </label>
                        <input
                          type="email"
                          placeholder="example@email.com"
                          value={investorForm.email}
                          onChange={(e) => setInvestorForm({ ...investorForm, email: e.target.value })}
                          className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-green-500 outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">
                          জরুরি যোগাযোগের নম্বর (Emergency Phone)
                        </label>
                        <input
                          type="tel"
                          placeholder="018XXXXXXXX"
                          value={investorForm.investorProfile?.emergencyPhone || ''}
                          onChange={(e) => setInvestorForm({
                            ...investorForm,
                            investorProfile: { ...investorForm.investorProfile, emergencyPhone: e.target.value }
                          })}
                          className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-green-500 outline-none"
                        />
                      </div>
                    </div>

                    <div className="border-t border-gray-100 pt-4">
                      <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">ব্যক্তিগত পরিচিতি (Personal KYC)</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1">পিতার নাম (Father's Name)</label>
                          <input
                            type="text"
                            value={investorForm.investorProfile?.fatherName || ''}
                            onChange={(e) => setInvestorForm({
                              ...investorForm,
                              investorProfile: { ...investorForm.investorProfile, fatherName: e.target.value }
                            })}
                            className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-green-500 outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1">মাতার নাম (Mother's Name)</label>
                          <input
                            type="text"
                            value={investorForm.investorProfile?.motherName || ''}
                            onChange={(e) => setInvestorForm({
                              ...investorForm,
                              investorProfile: { ...investorForm.investorProfile, motherName: e.target.value }
                            })}
                            className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-green-500 outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1">জন্ম তারিখ (Date of Birth)</label>
                          <input
                            type="date"
                            value={investorForm.investorProfile?.dob || ''}
                            onChange={(e) => setInvestorForm({
                              ...investorForm,
                              investorProfile: { ...investorForm.investorProfile, dob: e.target.value }
                            })}
                            className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-green-500 outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1">লিঙ্গ (Gender)</label>
                          <select
                            value={investorForm.investorProfile?.gender || ''}
                            onChange={(e) => setInvestorForm({
                              ...investorForm,
                              investorProfile: { ...investorForm.investorProfile, gender: e.target.value }
                            })}
                            className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-green-500 outline-none"
                          >
                            <option value="">Select Gender</option>
                            <option value="Male">Male</option>
                            <option value="Female">Female</option>
                            <option value="Other">Other</option>
                          </select>
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1">NID / Passport Number</label>
                          <input
                            type="text"
                            placeholder="জাতীয় পরিচয়পত্র বা পাসপোর্ট নম্বর"
                            value={investorForm.investorProfile?.nidPassport || ''}
                            onChange={(e) => setInvestorForm({
                              ...investorForm,
                              investorProfile: { ...investorForm.investorProfile, nidPassport: e.target.value }
                            })}
                            className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-green-500 outline-none"
                          />
                        </div>
                      </div>

                      <div className="mt-4">
                        <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1.5">NID Card কপি আপলোড (Image/PDF)</label>
                        <div className="flex items-center space-x-3">
                          <label className="flex-1 cursor-pointer">
                            <div className={`flex items-center justify-center space-x-2 px-4 py-3 rounded-xl border-2 border-dashed transition-all ${
                              investorForm.investorProfile?.nidFileUrl
                                ? 'bg-green-50 border-green-300 text-green-700'
                                : 'bg-gray-50 border-gray-200 text-gray-500 hover:border-green-400'
                            }`}>
                              {uploadingFile === 'nid' ? (
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-600"></div>
                              ) : investorForm.investorProfile?.nidFileUrl ? (
                                <CheckCircle2 className="h-4 w-4 text-green-600" />
                              ) : (
                                <Upload className="h-4 w-4" />
                              )}
                              <span className="text-xs font-bold">
                                {uploadingFile === 'nid'
                                  ? 'Uploading...'
                                  : investorForm.investorProfile?.nidFileUrl
                                  ? 'NID Card সংযুক্ত করা হয়েছে (পরিবর্তন করতে ক্লিক করুন)'
                                  : 'NID Card ফাইল আপলোড করুন'}
                              </span>
                            </div>
                            <input
                              type="file"
                              className="hidden"
                              accept="image/*,.pdf"
                              onChange={(e) => handleModalFileUpload(e, 'nidFileUrl')}
                            />
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeFormTab === 'contact' && (
                  <div className="space-y-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-gray-600 uppercase mb-1.5">বর্তমান ঠিকানা (Current Address)</label>
                        <textarea
                          rows={3}
                          placeholder="বাসা/রোড, এলাকা, জেলা..."
                          value={investorForm.investorProfile?.currentAddress || ''}
                          onChange={(e) => setInvestorForm({
                            ...investorForm,
                            investorProfile: { ...investorForm.investorProfile, currentAddress: e.target.value }
                          })}
                          className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-green-500 outline-none resize-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-600 uppercase mb-1.5">স্থায়ী ঠিকানা (Permanent Address)</label>
                        <textarea
                          rows={3}
                          placeholder="গ্রাম/মহল্লা, ডাকঘর, উপজেলা, জেলা..."
                          value={investorForm.investorProfile?.permanentAddress || ''}
                          onChange={(e) => setInvestorForm({
                            ...investorForm,
                            investorProfile: { ...investorForm.investorProfile, permanentAddress: e.target.value }
                          })}
                          className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-green-500 outline-none resize-none"
                        />
                      </div>
                    </div>

                    <div className="border-t border-gray-100 pt-4">
                      <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">পেশাগত তথ্য (Occupational Details)</h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1">পেশা (Occupation)</label>
                          <input
                            type="text"
                            placeholder="যেমন: ব্যবসায়ী / চাকুরিজীবী"
                            value={investorForm.investorProfile?.occupation || ''}
                            onChange={(e) => setInvestorForm({
                              ...investorForm,
                              investorProfile: { ...investorForm.investorProfile, occupation: e.target.value }
                            })}
                            className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-green-500 outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1">প্রতিষ্ঠান (Organization)</label>
                          <input
                            type="text"
                            placeholder="প্রতিষ্ঠানের নাম"
                            value={investorForm.investorProfile?.organization || ''}
                            onChange={(e) => setInvestorForm({
                              ...investorForm,
                              investorProfile: { ...investorForm.investorProfile, organization: e.target.value }
                            })}
                            className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-green-500 outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1">পদবী (Designation)</label>
                          <input
                            type="text"
                            placeholder="পদবী"
                            value={investorForm.investorProfile?.designation || ''}
                            onChange={(e) => setInvestorForm({
                              ...investorForm,
                              investorProfile: { ...investorForm.investorProfile, designation: e.target.value }
                            })}
                            className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-green-500 outline-none"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeFormTab === 'bank' && (
                  <div className="space-y-4">
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">ব্যাংক অ্যাকাউন্টের তথ্য (Bank Information)</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-gray-600 uppercase mb-1">ব্যাংকের নাম (Bank Name)</label>
                        <input
                          type="text"
                          placeholder="যেমন: Islami Bank Bangladesh PLC"
                          value={investorForm.investorProfile?.bankName || ''}
                          onChange={(e) => setInvestorForm({
                            ...investorForm,
                            investorProfile: { ...investorForm.investorProfile, bankName: e.target.value }
                          })}
                          className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-green-500 outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-600 uppercase mb-1">শাখার নাম (Branch Name)</label>
                        <input
                          type="text"
                          placeholder="শাখার নাম"
                          value={investorForm.investorProfile?.branchName || ''}
                          onChange={(e) => setInvestorForm({
                            ...investorForm,
                            investorProfile: { ...investorForm.investorProfile, branchName: e.target.value }
                          })}
                          className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-green-500 outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-600 uppercase mb-1">অ্যাকাউন্টের নাম (Account Holder Name)</label>
                        <input
                          type="text"
                          placeholder="অ্যাকাউন্ট হোল্ডারের নাম"
                          value={investorForm.investorProfile?.accountName || ''}
                          onChange={(e) => setInvestorForm({
                            ...investorForm,
                            investorProfile: { ...investorForm.investorProfile, accountName: e.target.value }
                          })}
                          className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-green-500 outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-600 uppercase mb-1">অ্যাকাউন্ট নম্বর (Account Number)</label>
                        <input
                          type="text"
                          placeholder="অ্যাকাউন্ট নম্বর"
                          value={investorForm.investorProfile?.accountNumber || ''}
                          onChange={(e) => setInvestorForm({
                            ...investorForm,
                            investorProfile: { ...investorForm.investorProfile, accountNumber: e.target.value }
                          })}
                          className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-green-500 outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-600 uppercase mb-1">রাউটিং নম্বর (Routing Number)</label>
                        <input
                          type="text"
                          placeholder="রাউটিং নম্বর"
                          value={investorForm.investorProfile?.routingNumber || ''}
                          onChange={(e) => setInvestorForm({
                            ...investorForm,
                            investorProfile: { ...investorForm.investorProfile, routingNumber: e.target.value }
                          })}
                          className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-green-500 outline-none"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {activeFormTab === 'nominee' && (
                  <div className="space-y-4">
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">নমিনির তথ্য (Nominee Details)</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-gray-600 uppercase mb-1">নমিনির নাম (Nominee Name)</label>
                        <input
                          type="text"
                          placeholder="নমিনির পূর্ণ নাম"
                          value={investorForm.investorProfile?.nomineeName || ''}
                          onChange={(e) => setInvestorForm({
                            ...investorForm,
                            investorProfile: { ...investorForm.investorProfile, nomineeName: e.target.value }
                          })}
                          className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-green-500 outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-600 uppercase mb-1">সম্পর্ক (Relation)</label>
                        <input
                          type="text"
                          placeholder="যেমন: স্ত্রী / সন্তান / ভাই"
                          value={investorForm.investorProfile?.nomineeRelation || ''}
                          onChange={(e) => setInvestorForm({
                            ...investorForm,
                            investorProfile: { ...investorForm.investorProfile, nomineeRelation: e.target.value }
                          })}
                          className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-green-500 outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-600 uppercase mb-1">নমিনির ফোন নম্বর (Nominee Phone)</label>
                        <input
                          type="tel"
                          placeholder="017XXXXXXXX"
                          value={investorForm.investorProfile?.nomineePhone || ''}
                          onChange={(e) => setInvestorForm({
                            ...investorForm,
                            investorProfile: { ...investorForm.investorProfile, nomineePhone: e.target.value }
                          })}
                          className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-green-500 outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-600 uppercase mb-1">নমিনির NID নম্বর (Nominee NID)</label>
                        <input
                          type="text"
                          placeholder="নমিনির জাতীয় পরিচয়পত্র নম্বর"
                          value={investorForm.investorProfile?.nomineeNid || ''}
                          onChange={(e) => setInvestorForm({
                            ...investorForm,
                            investorProfile: { ...investorForm.investorProfile, nomineeNid: e.target.value }
                          })}
                          className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-green-500 outline-none"
                        />
                      </div>
                    </div>

                    <div className="mt-4">
                      <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1.5">নমিনির NID ফাইল আপলোড (Image/PDF)</label>
                      <label className="block cursor-pointer">
                        <div className={`flex items-center justify-center space-x-2 px-4 py-3 rounded-xl border-2 border-dashed transition-all ${
                          investorForm.investorProfile?.nomineeNidFileUrl
                            ? 'bg-green-50 border-green-300 text-green-700'
                            : 'bg-gray-50 border-gray-200 text-gray-500 hover:border-green-400'
                        }`}>
                          {uploadingFile === 'nomineeNid' ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-600"></div>
                          ) : investorForm.investorProfile?.nomineeNidFileUrl ? (
                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                          ) : (
                            <Upload className="h-4 w-4" />
                          )}
                          <span className="text-xs font-bold">
                            {uploadingFile === 'nomineeNid'
                              ? 'Uploading...'
                              : investorForm.investorProfile?.nomineeNidFileUrl
                              ? 'Nominee NID সংযুক্ত করা হয়েছে (পরিবর্তন করতে ক্লিক করুন)'
                              : 'Nominee NID ফাইল আপলোড করুন'}
                          </span>
                        </div>
                        <input
                          type="file"
                          className="hidden"
                          accept="image/*,.pdf"
                          onChange={(e) => handleModalFileUpload(e, 'nomineeNidFileUrl')}
                        />
                      </label>
                    </div>
                  </div>
                )}

                {/* Modal Footer */}
                <div className="pt-6 border-t border-gray-100 flex items-center justify-between gap-3">
                  <div className="flex gap-2">
                    {activeFormTab !== 'personal' && (
                      <button
                        type="button"
                        onClick={() => {
                          const order: ('personal' | 'contact' | 'bank' | 'nominee')[] = ['personal', 'contact', 'bank', 'nominee'];
                          const idx = order.indexOf(activeFormTab);
                          if (idx > 0) setActiveFormTab(order[idx - 1]);
                        }}
                        className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
                      >
                        পূর্ববর্তী ধাপ
                      </button>
                    )}
                    {activeFormTab !== 'nominee' && (
                      <button
                        type="button"
                        onClick={() => {
                          const order: ('personal' | 'contact' | 'bank' | 'nominee')[] = ['personal', 'contact', 'bank', 'nominee'];
                          const idx = order.indexOf(activeFormTab);
                          if (idx < order.length - 1) setActiveFormTab(order[idx + 1]);
                        }}
                        className="px-4 py-2.5 bg-green-50 hover:bg-green-100 text-green-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
                      >
                        পরবর্তী ধাপ
                      </button>
                    )}
                  </div>

                  <div className="flex items-center space-x-3">
                    <button
                      type="button"
                      onClick={() => setIsInvestorModalOpen(false)}
                      className="px-5 py-2.5 border border-gray-200 text-gray-600 rounded-xl font-bold hover:bg-gray-50 transition-all text-xs cursor-pointer"
                    >
                      বাতিল করুন
                    </button>
                    <button
                      type="submit"
                      disabled={savingInvestor}
                      className="flex items-center space-x-2 px-6 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold shadow-md transition-all text-xs cursor-pointer disabled:opacity-50"
                    >
                      {savingInvestor ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      ) : (
                        <>
                          <Save className="h-4 w-4" />
                          <span>{editingUid ? 'আপডেট সংরক্ষণ করুন' : 'ইনভেস্টর যুক্ত করুন'}</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {userToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setUserToDelete(null)}
              className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl p-6 z-10 space-y-4"
            >
              <div className="w-12 h-12 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center mx-auto">
                <ShieldAlert className="h-6 w-6" />
              </div>
              <div className="text-center space-y-1">
                <h3 className="text-lg font-bold text-gray-900">Confirm Admin Deletion</h3>
                <p className="text-xs text-gray-500">
                  Are you sure you want to delete <span className="font-bold text-gray-800">{userToDelete.name || userToDelete.email}</span>? This action cannot be undone.
                </p>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setUserToDelete(null)}
                  className="flex-1 py-3 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl text-xs transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDeleteUser}
                  className="flex-1 py-3 px-4 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-xs transition-all shadow-md cursor-pointer"
                >
                  Delete Admin
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
