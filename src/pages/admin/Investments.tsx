import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, orderBy, doc, getDoc, where, limit } from 'firebase/firestore';
import { db } from '../../firebase';
import { Investment, UserProfile } from '../../types';
import { TrendingUp, User, Mail, Calendar, DollarSign, Target, FileSearch, X, Phone, MapPin, Landmark, Briefcase, Droplets, FileType } from 'lucide-react';
import { formatCurrency, formatDate } from '../../lib/utils';
import { AnimatePresence, motion } from 'motion/react';

export default function AdminInvestments() {
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedInvestor, setSelectedInvestor] = useState<UserProfile | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [investorLoading, setInvestorLoading] = useState(false);

  useEffect(() => {
    fetchInvestments();
  }, []);

  const fetchInvestments = async () => {
    setLoading(true);
    const q = query(collection(db, 'investments'), orderBy('date', 'desc'));
    const querySnapshot = await getDocs(q);
    setInvestments(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Investment)));
    setLoading(false);
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

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Investor</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Project</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Date</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Amount</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={5} className="px-6 py-12 text-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto"></div></td></tr>
              ) : investments.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-12 text-center text-gray-500">No investments recorded yet.</td></tr>
              ) : investments.map(inv => (
                <tr key={inv.id} className="hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => handleViewInvestor(inv.investorEmail)}>
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
                    <button className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                      <FileSearch className="h-4 w-4" />
                    </button>
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
