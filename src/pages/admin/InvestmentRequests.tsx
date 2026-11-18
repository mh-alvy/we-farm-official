import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { collection, onSnapshot, query, orderBy, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { InvestmentRequest } from '../../types';
import { formatCurrency } from '../../lib/utils';
import { Phone, MessageSquare, CheckCircle2, Clock, Trash2, ShieldAlert, FolderKanban, User } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function AdminInvestmentRequests() {
  const [requests, setRequests] = useState<InvestmentRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'investmentRequests'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(docSnap => ({ ...docSnap.data(), id: docSnap.id } as InvestmentRequest));
      setRequests(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleStatusChange = async (requestId: string, newStatus: 'pending' | 'contacted' | 'approved') => {
    try {
      await updateDoc(doc(db, 'investmentRequests', requestId), {
        status: newStatus
      });
      setActionMessage({ type: 'success', text: 'অনুরোধের স্ট্যাটাস আপডেট করা হয়েছে।' });
      setTimeout(() => setActionMessage(null), 3000);
    } catch (err) {
      console.error(err);
      setActionMessage({ type: 'error', text: 'স্ট্যাটাস আপডেট করতে ব্যর্থ হয়েছে।' });
    }
  };

  const handleDeleteRequest = async (requestId: string) => {
    try {
      await deleteDoc(doc(db, 'investmentRequests', requestId));
      setActionMessage({ type: 'success', text: 'অনুরোধটি সফলভাবে মুছে ফেলা হয়েছে।' });
      setDeletingId(null);
      setTimeout(() => setActionMessage(null), 3000);
    } catch (err) {
      console.error(err);
      setActionMessage({ type: 'error', text: 'অনুরোধ মুছতে ব্যর্থ হয়েছে।' });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Investment Requests (বিনিয়োগ অনুরোধ)</h1>
          <p className="text-gray-500 text-sm">Review incoming investment requests from investors and contact them.</p>
        </div>
        <div className="bg-white border border-gray-100 px-4 py-2.5 rounded-xl text-sm font-bold text-gray-600 shadow-sm">
          Total Requests: {requests.length}
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

      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Investor</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Project</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Amount</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Date</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto"></div>
                  </td>
                </tr>
              ) : requests.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500 italic">কোনো বিনিয়োগ অনুরোধ পাওয়া যায়নি।</td>
                </tr>
              ) : (
                requests.map((req) => (
                  <tr key={req.id || Math.random()} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center font-bold text-green-700">
                          <User className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="font-bold text-gray-900">{req.investorName}</div>
                          <div className="text-xs text-green-700 font-semibold">{req.investorPhone}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2 text-xs font-bold text-gray-800">
                        <FolderKanban className="h-4 w-4 text-green-600 shrink-0" />
                        <span>{req.projectTitle || 'N/A'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-extrabold text-green-700">{formatCurrency(req.amount)}</span>
                    </td>
                    <td className="px-6 py-4 text-xs text-gray-500">
                      {req.createdAt ? new Date(req.createdAt).toLocaleString() : 'N/A'}
                    </td>
                    <td className="px-6 py-4">
                      <select
                        value={req.status || 'pending'}
                        onChange={(e) => handleStatusChange(req.id!, e.target.value as any)}
                        className={`text-xs font-bold px-3 py-1.5 rounded-xl border outline-none cursor-pointer ${
                          req.status === 'approved' ? 'bg-green-50 text-green-700 border-green-200' :
                          req.status === 'contacted' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' :
                          'bg-amber-50 text-amber-700 border-amber-200'
                        }`}
                      >
                        <option value="pending">Pending (অপেক্ষমান)</option>
                        <option value="contacted">Contacted (যোগাযোগ করা হয়েছে)</option>
                        <option value="approved">Approved (অনুমোদিত)</option>
                      </select>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <a
                          href={`tel:${req.investorPhone}`}
                          className="p-2 bg-green-50 hover:bg-green-100 text-green-700 rounded-xl transition-all"
                          title="Call Investor"
                        >
                          <Phone className="h-4 w-4" />
                        </a>
                        <a
                          href={`https://wa.me/${req.investorPhone.replace(/\D/g, '')}?text=Assalamu%20Alaikum%20${encodeURIComponent(req.investorName)},%20We%20Farm%20received%20your%20investment%20request%20of%20৳${req.amount}%20for%20${encodeURIComponent(req.projectTitle || '')}.`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 bg-[#25D366]/10 hover:bg-[#25D366]/20 text-[#25D366] rounded-xl transition-all"
                          title="WhatsApp Investor"
                        >
                          <MessageSquare className="h-4 w-4" />
                        </a>
                        <button
                          onClick={() => setDeletingId(req.id!)}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all cursor-pointer"
                          title="Delete Request"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deletingId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDeletingId(null)}
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
                <h3 className="text-lg font-bold text-gray-900">অনুরোধ মুছে ফেলুন</h3>
                <p className="text-xs text-gray-500">
                  আপনি কি নিশ্চিত যে এই বিনিয়োগ অনুরোধটি মুছে ফেলতে চান?
                </p>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setDeletingId(null)}
                  className="flex-1 py-3 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl text-xs transition-all cursor-pointer"
                >
                  বাতিল
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteRequest(deletingId)}
                  className="flex-1 py-3 px-4 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-xs transition-all shadow-md cursor-pointer"
                >
                  মুছে ফেলুন
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
