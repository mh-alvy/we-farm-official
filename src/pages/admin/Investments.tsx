import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, orderBy, doc, getDoc, where, limit, deleteDoc, addDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { Investment, UserProfile } from '../../types';
import { TrendingUp, User, Mail, Calendar, DollarSign, Target, FileSearch, X, Phone, MapPin, Landmark, Briefcase, Droplets, FileType, Trash2, UserPlus, Send, Pencil } from 'lucide-react';
import { formatCurrency, formatDate } from '../../lib/utils';
import { AnimatePresence, motion } from 'motion/react';

export default function AdminInvestments() {
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedInvestor, setSelectedInvestor] = useState<UserProfile | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [investorLoading, setInvestorLoading] = useState(false);
  const [selectedInvestmentToDelete, setSelectedInvestmentToDelete] = useState<Investment | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // New manual investor/investment & SMS state variables
  const [projects, setProjects] = useState<any[]>([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSmsModalOpen, setIsSmsModalOpen] = useState(false);
  const [selectedInvIds, setSelectedInvIds] = useState<string[]>([]);
  
  const [addFormData, setAddFormData] = useState({
    investorName: '',
    investorEmail: '',
    investorPhone: '',
    projectId: '',
    projectTitle: '',
    amount: '',
    date: new Date().toISOString().split('T')[0]
  });

  // Edit investment/investor state variables
  const [selectedInvestmentToEdit, setSelectedInvestmentToEdit] = useState<Investment | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editFormData, setEditFormData] = useState({
    investorName: '',
    investorEmail: '',
    investorPhone: '',
    projectId: '',
    projectTitle: '',
    amount: '',
    date: ''
  });
  const [editLoading, setEditLoading] = useState(false);

  const [smsMessage, setSmsMessage] = useState('');
  const [smsSending, setSmsSending] = useState(false);
  const [smsRecipientType, setSmsRecipientType] = useState<'selected' | 'all'>('selected');
  const [smsStatus, setSmsStatus] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    fetchInvestments();
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const snapshot = await getDocs(collection(db, 'projects'));
      setProjects(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (err) {
      console.error("Error fetching projects:", err);
    }
  };

  const fetchInvestments = async () => {
    setLoading(true);
    const q = query(collection(db, 'investments'), orderBy('date', 'desc'));
    const querySnapshot = await getDocs(q);
    setInvestments(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Investment)));
    setLoading(false);
  };

  const handleDeleteInvestment = async (id: string) => {
    setIsDeleting(true);
    try {
      await deleteDoc(doc(db, 'investments', id));
      setSelectedInvestmentToDelete(null);
      fetchInvestments();
    } catch (err) {
      console.error(err);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleAddInvestment = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const name = addFormData.investorName.trim() || 'Anonymous Investor';
      const email = addFormData.investorEmail.trim() || `guest_${Date.now()}@wefarm.com`;
      const phone = addFormData.investorPhone.trim() || '';
      const amount = parseFloat(addFormData.amount) || 0;
      const dateStr = addFormData.date || new Date().toISOString().split('T')[0];
      
      let finalProjId = addFormData.projectId;
      let finalProjTitle = addFormData.projectTitle;
      
      if (finalProjId) {
        const selectedProj = projects.find(p => p.id === finalProjId);
        if (selectedProj) {
          finalProjTitle = selectedProj.title;
        }
      } else {
        finalProjId = 'unassigned';
        finalProjTitle = finalProjTitle.trim() || 'General Fund';
      }

      // Create/Update user document in 'users' collection
      const usersRef = collection(db, 'users');
      const qUser = query(usersRef, where('email', '==', email), limit(1));
      const userSnap = await getDocs(qUser);
      
      if (userSnap.empty) {
        await addDoc(collection(db, 'users'), {
          name: name,
          email: email,
          phone: phone,
          role: 'investor',
          createdAt: new Date().toISOString(),
          isPreCreated: true
        });
      } else {
        const existingDoc = userSnap.docs[0];
        const existingData = existingDoc.data();
        await updateDoc(doc(db, 'users', existingDoc.id), {
          name: existingData.name || name,
          phone: existingData.phone || phone
        });
      }

      // Add investment document
      await addDoc(collection(db, 'investments'), {
        investorName: name,
        investorEmail: email,
        projectId: finalProjId,
        projectTitle: finalProjTitle,
        amount: amount,
        date: new Date(dateStr).toISOString()
      });

      setIsAddModalOpen(false);
      setAddFormData({
        investorName: '',
        investorEmail: '',
        investorPhone: '',
        projectId: '',
        projectTitle: '',
        amount: '',
        date: new Date().toISOString().split('T')[0]
      });
      
      fetchInvestments();
    } catch (err) {
      console.error("Error adding manual investment:", err);
      alert("Failed to add investment");
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = async (inv: Investment) => {
    setSelectedInvestmentToEdit(inv);
    setEditLoading(true);
    setIsEditModalOpen(true);
    
    let phoneVal = '';
    try {
      const qUser = query(collection(db, 'users'), where('email', '==', inv.investorEmail), limit(1));
      const userSnap = await getDocs(qUser);
      if (!userSnap.empty) {
        phoneVal = userSnap.docs[0].data().phone || '';
      }
    } catch (err) {
      console.error("Error fetching user phone for editing:", err);
    }

    let formattedDate = '';
    if (inv.date) {
      try {
        formattedDate = new Date(inv.date).toISOString().split('T')[0];
      } catch (e) {
        formattedDate = inv.date.split('T')[0] || '';
      }
    }

    setEditFormData({
      investorName: inv.investorName || '',
      investorEmail: inv.investorEmail || '',
      investorPhone: phoneVal,
      projectId: inv.projectId === 'unassigned' ? '' : (inv.projectId || ''),
      projectTitle: inv.projectId === 'unassigned' ? (inv.projectTitle || '') : '',
      amount: inv.amount ? String(inv.amount) : '',
      date: formattedDate
    });
    setEditLoading(false);
  };

  const handleUpdateInvestment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvestmentToEdit) return;
    setLoading(true);
    try {
      const name = editFormData.investorName.trim() || 'Anonymous Investor';
      const email = editFormData.investorEmail.trim() || `guest_${Date.now()}@wefarm.com`;
      const phone = editFormData.investorPhone.trim() || '';
      const amount = parseFloat(editFormData.amount) || 0;
      const dateStr = editFormData.date || new Date().toISOString().split('T')[0];
      
      let finalProjId = editFormData.projectId;
      let finalProjTitle = editFormData.projectTitle;
      
      if (finalProjId) {
        const selectedProj = projects.find(p => p.id === finalProjId);
        if (selectedProj) {
          finalProjTitle = selectedProj.title;
        }
      } else {
        finalProjId = 'unassigned';
        finalProjTitle = finalProjTitle.trim() || 'General Fund';
      }

      const oldEmail = selectedInvestmentToEdit.investorEmail;
      
      const qOldUser = query(collection(db, 'users'), where('email', '==', oldEmail), limit(1));
      const oldUserSnap = await getDocs(qOldUser);
      
      if (!oldUserSnap.empty) {
        const userDocId = oldUserSnap.docs[0].id;
        await updateDoc(doc(db, 'users', userDocId), {
          name: name,
          email: email,
          phone: phone
        });
      } else {
        const qNewUser = query(collection(db, 'users'), where('email', '==', email), limit(1));
        const newUserSnap = await getDocs(qNewUser);
        if (newUserSnap.empty) {
          await addDoc(collection(db, 'users'), {
            name: name,
            email: email,
            phone: phone,
            role: 'investor',
            createdAt: new Date().toISOString(),
            isPreCreated: true
          });
        } else {
          const userDocId = newUserSnap.docs[0].id;
          await updateDoc(doc(db, 'users', userDocId), {
            name: name,
            phone: phone
          });
        }
      }

      await updateDoc(doc(db, 'investments', selectedInvestmentToEdit.id!), {
        investorName: name,
        investorEmail: email,
        projectId: finalProjId,
        projectTitle: finalProjTitle,
        amount: amount,
        date: new Date(dateStr).toISOString()
      });

      setIsEditModalOpen(false);
      setSelectedInvestmentToEdit(null);
      fetchInvestments();
    } catch (err) {
      console.error("Error updating investment:", err);
      alert("Failed to update investment");
    } finally {
      setLoading(false);
    }
  };

  const handleSendSms = async (e: React.FormEvent) => {
    e.preventDefault();
    setSmsSending(true);
    setSmsStatus(null);
    try {
      let emails: string[] = [];
      if (smsRecipientType === 'selected') {
        emails = investments
          .filter(inv => selectedInvIds.includes(inv.id!))
          .map(inv => inv.investorEmail);
        if (emails.length === 0) {
          throw new Error("No investors selected from the list.");
        }
      }

      const usersSnap = await getDocs(collection(db, 'users'));
      let phones: string[] = [];

      if (smsRecipientType === 'all') {
        phones = usersSnap.docs
          .map(doc => doc.data().phone)
          .filter(p => p && p.trim().length > 0);
      } else {
        phones = usersSnap.docs
          .filter(doc => emails.includes(doc.data().email))
          .map(doc => doc.data().phone)
          .filter(p => p && p.trim().length > 0);
      }

      const uniquePhones = Array.from(new Set(phones));
      
      if (uniquePhones.length === 0) {
        throw new Error("No valid phone numbers found for the selected recipients.");
      }

      const response = await fetch("/api/notify-investors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipients: uniquePhones.join(","),
          message: smsMessage
        })
      });

      const responseText = await response.text();
      let result;
      try {
        result = JSON.parse(responseText);
      } catch (parseErr) {
        throw new Error(`Server returned a non-JSON response (Status ${response.status}): ${responseText.substring(0, 150) || '(empty response)'}`);
      }

      if (result.success) {
        setSmsStatus({ type: 'success', text: `SMS sent successfully to ${uniquePhones.length} recipient(s)!` });
        setSmsMessage('');
      } else {
        setSmsStatus({ type: 'error', text: result.error || "Failed to send SMS." });
      }
    } catch (err: any) {
      console.error(err);
      setSmsStatus({ type: 'error', text: err.message || "An error occurred while sending SMS." });
    } finally {
      setSmsSending(false);
    }
  };

  const handleViewInvestor = async (email: string) => {
    setInvestorLoading(true);
    setIsModalOpen(true);
    try {
      // Find user by email in users collection using a targeted query
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('email', '==', email), limit(1));
      const snapshot = await getDocs(q);
      
      if (!snapshot.empty) {
        const userDoc = snapshot.docs[0];
        setSelectedInvestor({ uid: userDoc.id, ...userDoc.data() } as UserProfile);
      } else {
        setSelectedInvestor(null);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setInvestorLoading(false);
    }
  };

  const totalInvested = investments.reduce((sum, inv) => sum + (Number(inv.amount) || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Investment Tracking</h1>
          <p className="text-gray-500 text-sm">Monitor investor contributions and project funding.</p>
        </div>
        <div className="bg-green-50 px-6 py-3 rounded-2xl border border-green-100">
          <div className="text-xs font-bold text-green-600 uppercase tracking-wider mb-1">Total Funding</div>
          <div className="text-xl font-bold text-green-700">{formatCurrency(totalInvested)}</div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4 bg-gray-50 p-4 rounded-2xl border border-gray-100">
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center space-x-2 bg-green-600 hover:bg-green-700 text-white font-bold px-4 py-2.5 rounded-xl transition-all shadow-sm text-sm cursor-pointer"
          >
            <UserPlus className="h-4 w-4" />
            <span>Add Investor Manually</span>
          </button>
          
          <button
            onClick={() => {
              setSmsRecipientType(selectedInvIds.length > 0 ? 'selected' : 'all');
              setSmsStatus(null);
              setIsSmsModalOpen(true);
            }}
            className="flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-4 py-2.5 rounded-xl transition-all shadow-sm text-sm cursor-pointer"
          >
            <Mail className="h-4 w-4" />
            <span>Send SMS</span>
          </button>
        </div>

        {selectedInvIds.length > 0 && (
          <div className="flex items-center space-x-3">
            <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-100">
              {selectedInvIds.length} investments selected
            </span>
            <button
              onClick={() => setSelectedInvIds([])}
              className="text-xs font-bold text-gray-500 hover:text-gray-700"
            >
              Clear
            </button>
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-6 py-4 text-center w-12">
                  <input
                    type="checkbox"
                    checked={investments.length > 0 && selectedInvIds.length === investments.length}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedInvIds(investments.map(inv => inv.id!));
                      } else {
                        setSelectedInvIds([]);
                      }
                    }}
                    className="rounded text-green-600 focus:ring-green-500 cursor-pointer h-4 w-4"
                  />
                </th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Investor</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Project</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Date</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Amount</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={6} className="px-6 py-12 text-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto"></div></td></tr>
              ) : investments.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-12 text-center text-gray-500">No investments recorded yet.</td></tr>
              ) : investments.map(inv => (
                <tr key={inv.id} className="hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => handleViewInvestor(inv.investorEmail)}>
                  <td className="px-6 py-4 text-center w-12" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selectedInvIds.includes(inv.id!)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedInvIds([...selectedInvIds, inv.id!]);
                        } else {
                          setSelectedInvIds(selectedInvIds.filter(id => id !== inv.id));
                        }
                      }}
                      className="rounded text-green-600 focus:ring-green-500 cursor-pointer h-4 w-4"
                    />
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-amber-50 rounded-lg flex items-center justify-center"><User className="h-4 w-4 text-amber-600" /></div>
                      <div>
                        <div className="font-bold text-gray-900">{inv.investorName}</div>
                        <div className="text-xs text-gray-500">{inv.investorEmail}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-2">
                      <Target className="h-4 w-4 text-blue-500" />
                      <span className="text-sm font-medium text-gray-900">{inv.projectTitle}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">{formatDate(inv.date)}</td>
                  <td className="px-6 py-4 text-sm font-bold text-green-600">{formatCurrency(inv.amount)}</td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end space-x-1" onClick={(e) => e.stopPropagation()}>
                      <button 
                        onClick={() => handleViewInvestor(inv.investorEmail)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="View Investor Profile"
                      >
                        <FileSearch className="h-4 w-4" />
                      </button>
                      <button 
                        onClick={() => handleEditClick(inv)}
                        className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                        title="Edit Investment"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button 
                        onClick={() => setSelectedInvestmentToDelete(inv)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete Investment"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Investor Profile Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-green-50">
                <h3 className="text-xl font-bold text-gray-900 flex items-center space-x-2">
                  <User className="h-5 w-5 text-green-600" />
                  <span>Investor Details</span>
                </h3>
                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-white rounded-full transition-colors text-gray-400">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="p-8 max-h-[70vh] overflow-y-auto custom-scrollbar">
                {investorLoading ? (
                  <div className="py-20 text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
                    <p className="mt-4 text-gray-500 font-medium font-sans">Loading profile information...</p>
                  </div>
                ) : selectedInvestor ? (
                  <div className="space-y-8">
                    {/* Header */}
                    <div className="flex items-center space-x-4">
                      <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center text-2xl font-bold text-green-700">
                        {selectedInvestor.name.charAt(0)}
                      </div>
                      <div>
                        <h4 className="text-xl font-bold text-gray-900">{selectedInvestor.name}</h4>
                        <div className="flex items-center space-x-3 text-sm text-gray-500 mt-1">
                          <span className="flex items-center"><Mail className="h-3 w-3 mr-1" /> {selectedInvestor.email}</span>
                          {selectedInvestor.phone && <span className="flex items-center"><Phone className="h-3 w-3 mr-1" /> {selectedInvestor.phone}</span>}
                        </div>
                      </div>
                    </div>

                    {selectedInvestor.investorProfile ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
                        <div>
                          <h5 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center">
                            <User className="h-3 w-3 mr-2" /> Personal Details
                          </h5>
                          <div className="space-y-3">
                            <DetailRow label="Father's Name" value={selectedInvestor.investorProfile.fatherName} icon={<User className="h-3 w-3" />} />
                            <DetailRow label="Mother's Name" value={selectedInvestor.investorProfile.motherName} icon={<User className="h-3 w-3" />} />
                            <DetailRow label="Date of Birth" value={selectedInvestor.investorProfile.dob} icon={<Calendar className="h-3 w-3" />} />
                            <DetailRow label="NID / Passport" value={selectedInvestor.investorProfile.nidPassport} icon={<FileSearch className="h-3 w-3" />} />
                          </div>
                        </div>

                        <div>
                          <h5 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center">
                            <Briefcase className="h-3 w-3 mr-2" /> Occupational
                          </h5>
                          <div className="space-y-3">
                            <DetailRow label="Occupation" value={selectedInvestor.investorProfile.occupation} icon={<Briefcase className="h-3 w-3" />} />
                            <DetailRow label="Organization" value={selectedInvestor.investorProfile.organization} icon={<Target className="h-3 w-3" />} />
                            <DetailRow label="Designation" value={selectedInvestor.investorProfile.designation} icon={<Calendar className="h-3 w-3" />} />
                          </div>
                        </div>

                        <div className="md:col-span-2">
                          <h5 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center">
                            <Landmark className="h-3 w-3 mr-2" /> Bank Information
                          </h5>
                          <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-2xl">
                            <DetailRow label="Bank" value={selectedInvestor.investorProfile.bankName} />
                            <DetailRow label="Account No" value={selectedInvestor.investorProfile.accountNumber} />
                            <DetailRow label="Branch" value={selectedInvestor.investorProfile.branchName} />
                            <DetailRow label="Routing" value={selectedInvestor.investorProfile.routingNumber} />
                          </div>
                        </div>

                        <div className="md:col-span-2">
                          <h5 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center">
                            <MapPin className="h-3 w-3 mr-2" /> Address
                          </h5>
                          <div className="space-y-4">
                            <div>
                              <p className="text-[10px] font-bold text-gray-400 mb-1">Current Address</p>
                              <p className="text-sm text-gray-700 leading-relaxed font-medium">{selectedInvestor.investorProfile.currentAddress || 'N/A'}</p>
                            </div>
                            <div>
                              <p className="text-[10px] font-bold text-gray-400 mb-1">Permanent Address</p>
                              <p className="text-sm text-gray-700 leading-relaxed font-medium">{selectedInvestor.investorProfile.permanentAddress || 'N/A'}</p>
                            </div>
                          </div>
                        </div>

                        <div className="md:col-span-2 pt-4 border-t border-gray-100">
                          <h5 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center">
                            <FileType className="h-3 w-3 mr-2" /> Documents / Attachments
                          </h5>
                          <div className="grid grid-cols-2 gap-4">
                            {selectedInvestor.investorProfile.nidFileUrl ? (
                              <a 
                                href={selectedInvestor.investorProfile.nidFileUrl} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="flex items-center space-x-3 p-4 bg-green-50 text-green-700 rounded-2xl border border-green-100 hover:bg-green-100 transition-all shadow-sm"
                              >
                                <FileType className="h-5 w-5" />
                                <div className="flex flex-col">
                                  <span className="text-xs font-bold">Investor NID</span>
                                  <span className="text-[10px] opacity-60 font-medium">View Attachment</span>
                                </div>
                              </a>
                            ) : (
                              <div className="flex items-center space-x-3 p-4 bg-gray-50 text-gray-400 rounded-2xl border border-gray-100">
                                <FileType className="h-5 w-5 opacity-30" />
                                <div className="flex flex-col text-xs font-bold uppercase tracking-tight">No Investor NID</div>
                              </div>
                            )}

                            {selectedInvestor.investorProfile.nomineeNidFileUrl ? (
                              <a 
                                href={selectedInvestor.investorProfile.nomineeNidFileUrl} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="flex items-center space-x-3 p-4 bg-indigo-50 text-indigo-700 rounded-2xl border border-indigo-100 hover:bg-indigo-100 transition-all shadow-sm"
                              >
                                <FileType className="h-5 w-5" />
                                <div className="flex flex-col">
                                  <span className="text-xs font-bold">Nominee NID</span>
                                  <span className="text-[10px] opacity-60 font-medium">View Attachment</span>
                                </div>
                              </a>
                            ) : (
                              <div className="flex items-center space-x-3 p-4 bg-gray-50 text-gray-400 rounded-2xl border border-gray-100">
                                <FileType className="h-5 w-5 opacity-30" />
                                <div className="flex flex-col text-xs font-bold uppercase tracking-tight">No Nominee NID</div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="py-12 bg-amber-50 rounded-3xl text-center border border-dashed border-amber-200">
                        <FileSearch className="h-10 w-10 text-amber-400 mx-auto mb-3" />
                        <h5 className="text-amber-700 font-bold">Profile Incomplete</h5>
                        <p className="text-amber-600/70 text-sm max-w-xs mx-auto mt-1">This investor has not completed their detailed profile yet.</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="py-20 text-center">
                    <User className="h-12 w-12 text-gray-200 mx-auto mb-4" />
                    <p className="text-gray-400">User profile not found in database.</p>
                  </div>
                )}
              </div>
              
              <div className="p-6 bg-gray-50 border-t border-gray-100 flex justify-end">
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="px-6 py-2 bg-white border border-gray-200 text-gray-600 rounded-xl font-bold hover:bg-gray-100 transition-all shadow-sm"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {selectedInvestmentToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedInvestmentToDelete(null)}
              className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden p-6"
            >
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mb-4">
                  <Trash2 className="h-8 w-8 text-red-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Delete Investment</h3>
                <p className="text-sm text-gray-500 mb-6">
                  Are you sure you want to delete this investment record? This action cannot be undone.
                </p>

                {/* Investment Details Summary Card */}
                <div className="w-full bg-gray-50 rounded-2xl p-4 border border-gray-100 text-left mb-6 space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-400 font-bold uppercase">Investor</span>
                    <span className="text-gray-900 font-medium">{selectedInvestmentToDelete.investorName}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-400 font-bold uppercase">Project</span>
                    <span className="text-gray-900 font-medium">{selectedInvestmentToDelete.projectTitle}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-400 font-bold uppercase">Amount</span>
                    <span className="text-green-600 font-bold">{formatCurrency(selectedInvestmentToDelete.amount)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-400 font-bold uppercase">Date</span>
                    <span className="text-gray-900 font-medium">{formatDate(selectedInvestmentToDelete.date)}</span>
                  </div>
                </div>

                <div className="flex items-center space-x-3 w-full">
                  <button
                    onClick={() => setSelectedInvestmentToDelete(null)}
                    disabled={isDeleting}
                    className="flex-1 py-3 border border-gray-200 text-gray-600 rounded-xl font-bold hover:bg-gray-100 transition-all text-sm disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleDeleteInvestment(selectedInvestmentToDelete.id!)}
                    disabled={isDeleting}
                    className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 shadow-md shadow-red-100 transition-all text-sm flex items-center justify-center space-x-2 disabled:opacity-50"
                  >
                    {isDeleting ? (
                      <span className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white"></span>
                    ) : (
                      <span>Delete</span>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Investor & Investment Modal */}
      <AnimatePresence>
        {isEditModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsEditModalOpen(false)}
              className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden p-6 z-10 my-8 font-sans"
            >
              <div className="flex justify-between items-center pb-4 border-b border-gray-100 mb-6">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center">
                    <Pencil className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">Edit Investment Details</h3>
                    <p className="text-xs text-gray-500">Modify investor profile and investment records.</p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsEditModalOpen(false)}
                  className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {editLoading ? (
                <div className="py-12 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto mb-2"></div>
                  <p className="text-sm text-gray-500">Fetching details...</p>
                </div>
              ) : (
                <form onSubmit={handleUpdateInvestment} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase mb-1.5">Investor Name</label>
                    <input
                      type="text"
                      value={editFormData.investorName}
                      onChange={(e) => setEditFormData({ ...editFormData, investorName: e.target.value })}
                      placeholder="Enter full name"
                      required
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-400 uppercase mb-1.5">Email Address</label>
                      <input
                        type="email"
                        value={editFormData.investorEmail}
                        onChange={(e) => setEditFormData({ ...editFormData, investorEmail: e.target.value })}
                        placeholder="Enter email"
                        required
                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-400 uppercase mb-1.5">Phone Number</label>
                      <input
                        type="tel"
                        value={editFormData.investorPhone}
                        onChange={(e) => setEditFormData({ ...editFormData, investorPhone: e.target.value })}
                        placeholder="e.g. 017XXXXXXXX"
                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-400 uppercase mb-1.5">Select Project</label>
                      <select
                        value={editFormData.projectId}
                        onChange={(e) => setEditFormData({ ...editFormData, projectId: e.target.value })}
                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all"
                      >
                        <option value="">-- Custom/Unassigned --</option>
                        {projects.map(proj => (
                          <option key={proj.id} value={proj.id}>{proj.title}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-400 uppercase mb-1.5">Custom Project Title</label>
                      <input
                        type="text"
                        value={editFormData.projectTitle}
                        onChange={(e) => setEditFormData({ ...editFormData, projectTitle: e.target.value })}
                        placeholder="e.g. General Fund"
                        disabled={!!editFormData.projectId}
                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all disabled:opacity-50"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-400 uppercase mb-1.5">Investment Amount</label>
                      <input
                        type="number"
                        value={editFormData.amount}
                        onChange={(e) => setEditFormData({ ...editFormData, amount: e.target.value })}
                        placeholder="0.00"
                        required
                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-400 uppercase mb-1.5">Investment Date</label>
                      <input
                        type="date"
                        value={editFormData.date}
                        onChange={(e) => setEditFormData({ ...editFormData, date: e.target.value })}
                        required
                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all"
                      />
                    </div>
                  </div>

                  <div className="pt-4 border-t border-gray-100 flex items-center space-x-3">
                    <button
                      type="button"
                      onClick={() => setIsEditModalOpen(false)}
                      className="flex-1 py-3 border border-gray-200 text-gray-600 rounded-xl font-bold hover:bg-gray-100 transition-all text-sm"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="flex-1 py-3 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 shadow-md shadow-green-100 transition-all text-sm flex items-center justify-center space-x-2"
                    >
                      <span>Update Record</span>
                    </button>
                  </div>
                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add Investor & Investment Manually Modal */}
      <AnimatePresence>
        {isAddModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAddModalOpen(false)}
              className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden p-6 z-10 my-8"
            >
              <div className="flex justify-between items-center pb-4 border-b border-gray-100 mb-6">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center">
                    <UserPlus className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">Add Investor Manually</h3>
                    <p className="text-xs text-gray-500">Record a new investor and setup account.</p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsAddModalOpen(false)}
                  className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleAddInvestment} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-1.5">Investor Name</label>
                  <input
                    type="text"
                    value={addFormData.investorName}
                    onChange={(e) => setAddFormData({ ...addFormData, investorName: e.target.value })}
                    placeholder="Enter full name"
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase mb-1.5">Email Address</label>
                    <input
                      type="email"
                      value={addFormData.investorEmail}
                      onChange={(e) => setAddFormData({ ...addFormData, investorEmail: e.target.value })}
                      placeholder="Enter email"
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase mb-1.5">Phone Number</label>
                    <input
                      type="tel"
                      value={addFormData.investorPhone}
                      onChange={(e) => setAddFormData({ ...addFormData, investorPhone: e.target.value })}
                      placeholder="e.g. 017XXXXXXXX"
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase mb-1.5">Select Project</label>
                    <select
                      value={addFormData.projectId}
                      onChange={(e) => setAddFormData({ ...addFormData, projectId: e.target.value })}
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all"
                    >
                      <option value="">-- Custom/Unassigned --</option>
                      {projects.map(proj => (
                        <option key={proj.id} value={proj.id}>{proj.title}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase mb-1.5">Custom Project Title</label>
                    <input
                      type="text"
                      value={addFormData.projectTitle}
                      onChange={(e) => setAddFormData({ ...addFormData, projectTitle: e.target.value })}
                      placeholder="e.g. General Fund"
                      disabled={!!addFormData.projectId}
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all disabled:opacity-50"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase mb-1.5">Investment Amount</label>
                    <input
                      type="number"
                      value={addFormData.amount}
                      onChange={(e) => setAddFormData({ ...addFormData, amount: e.target.value })}
                      placeholder="0.00"
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase mb-1.5">Investment Date</label>
                    <input
                      type="date"
                      value={addFormData.date}
                      onChange={(e) => setAddFormData({ ...addFormData, date: e.target.value })}
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all"
                    />
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-100 flex items-center space-x-3">
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    className="flex-1 py-3 border border-gray-200 text-gray-600 rounded-xl font-bold hover:bg-gray-100 transition-all text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-3 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 shadow-md shadow-green-100 transition-all text-sm flex items-center justify-center space-x-2"
                  >
                    <span>Save Record</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Send SMS Modal */}
      <AnimatePresence>
        {isSmsModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSmsModalOpen(false)}
              className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden p-6 z-10"
            >
              <div className="flex justify-between items-center pb-4 border-b border-gray-100 mb-6">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center">
                    <Mail className="h-5 w-5 text-indigo-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">Send SMS Notification</h3>
                    <p className="text-xs text-gray-500">Dispatch SMS direct to investor phones.</p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsSmsModalOpen(false)}
                  className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleSendSms} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Recipients</label>
                  <div className="grid grid-cols-2 gap-2 p-1 bg-gray-50 rounded-xl border border-gray-100">
                    <button
                      type="button"
                      onClick={() => setSmsRecipientType('selected')}
                      disabled={selectedInvIds.length === 0}
                      className={`py-2 text-xs font-bold rounded-lg transition-all ${
                        smsRecipientType === 'selected'
                          ? 'bg-white text-indigo-600 shadow-sm'
                          : 'text-gray-400 hover:text-gray-600 disabled:opacity-50'
                      }`}
                    >
                      Selected ({selectedInvIds.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setSmsRecipientType('all')}
                      className={`py-2 text-xs font-bold rounded-lg transition-all ${
                        smsRecipientType === 'all'
                          ? 'bg-white text-indigo-600 shadow-sm'
                          : 'text-gray-400 hover:text-gray-600'
                      }`}
                    >
                      All Registered
                    </button>
                  </div>
                  {smsRecipientType === 'selected' && selectedInvIds.length === 0 && (
                    <p className="text-[10px] text-amber-600 font-bold mt-1.5">
                      ⚠️ No investments are selected in the list. Please choose "All Registered" or close and check rows in the table.
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-1.5">SMS Text Message</label>
                  <textarea
                    rows={4}
                    value={smsMessage}
                    onChange={(e) => setSmsMessage(e.target.value)}
                    placeholder="Enter message content..."
                    required
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all resize-none font-sans"
                  />
                  <div className="flex justify-between items-center mt-1 text-[10px] text-gray-400 font-bold">
                    <span>Standard rate applies</span>
                    <span className={smsMessage.length > 160 ? 'text-amber-500' : ''}>
                      {smsMessage.length} characters
                    </span>
                  </div>
                </div>

                {smsStatus && (
                  <div className={`p-4 rounded-xl text-xs font-bold flex items-center space-x-2 ${
                    smsStatus.type === 'success' 
                      ? 'bg-green-50 text-green-700 border border-green-100' 
                      : 'bg-red-50 text-red-700 border border-red-100'
                  }`}>
                    <span className="flex-1">{smsStatus.text}</span>
                  </div>
                )}

                <div className="pt-4 border-t border-gray-100 flex items-center space-x-3">
                  <button
                    type="button"
                    onClick={() => setIsSmsModalOpen(false)}
                    className="flex-1 py-3 border border-gray-200 text-gray-600 rounded-xl font-bold hover:bg-gray-100 transition-all text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={smsSending || (smsRecipientType === 'selected' && selectedInvIds.length === 0)}
                    className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 shadow-md shadow-indigo-100 transition-all text-sm flex items-center justify-center space-x-2 disabled:opacity-50"
                  >
                    {smsSending ? (
                      <span className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white"></span>
                    ) : (
                      <>
                        <Send className="h-4 w-4" />
                        <span>Send Message</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function DetailRow({ label, value, icon }: { label: string, value?: string, icon?: React.ReactNode }) {
  return (
    <div className="flex flex-col">
      <span className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter flex items-center">
        {icon && <span className="mr-1">{icon}</span>}
        {label}
      </span>
      <span className="text-sm font-bold text-gray-900 border-b border-gray-100 pb-1">{value || 'N/A'}</span>
    </div>
  );
}
