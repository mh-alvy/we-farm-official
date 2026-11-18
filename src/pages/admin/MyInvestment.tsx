import React, { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, doc, getDoc } from 'firebase/firestore';
import { db, auth } from '../../firebase';
import { Investment, Project, UserProfile, InvestmentProfitRecord } from '../../types';
import { subscribeToAuthSession, normalizePhone } from '../../lib/authSession';
import { formatCurrency, formatDate } from '../../lib/utils';
import { formatMonthLabel } from './Investments';
import {
  TrendingUp,
  Wallet,
  Calendar,
  Target,
  Briefcase,
  UserCheck,
  Mail,
  Phone,
  FolderKanban,
  Layers,
  CalendarClock,
  CheckCircle2,
  Clock,
  Ban
} from 'lucide-react';

export default function AdminMyInvestment() {
  const [adminUser, setAdminUser] = useState<{
    uid: string;
    name: string;
    email: string;
    phone: string;
    role: string;
    profile: UserProfile | null;
  } | null>(null);
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [projects, setProjects] = useState<Record<string, Project>>({});
  const [profitRecords, setProfitRecords] = useState<InvestmentProfitRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubSession = subscribeToAuthSession(async (state) => {
      if (state.uid) {
        let phone = state.phone || '';
        let name = state.name || '';
        let email = state.email || auth.currentUser?.email || '';
        let profile = state.profile;

        try {
          const userSnap = await getDoc(doc(db, 'users', state.uid));
          if (userSnap.exists()) {
            const data = userSnap.data() as UserProfile;
            phone = data.phone || phone;
            name = data.name || name;
            email = data.email || email;
            profile = { ...data, uid: userSnap.id };
          }
        } catch (err) {
          console.warn('Could not fetch admin user doc for My Investment:', err);
        }

        setAdminUser({
          uid: state.uid,
          name: name || auth.currentUser?.displayName || 'Admin',
          email,
          phone,
          role: state.role || 'admin',
          profile
        });
      } else {
        setAdminUser(null);
      }
    });

    const unsubInvestments = onSnapshot(collection(db, 'investments'), (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Investment, 'id'>) }));
      setInvestments(list);
      setLoading(false);
    });

    const unsubProjects = onSnapshot(collection(db, 'projects'), (snap) => {
      const map: Record<string, Project> = {};
      snap.docs.forEach((d) => {
        map[d.id] = { id: d.id, ...(d.data() as Omit<Project, 'id'>) };
      });
      setProjects(map);
    });

    const unsubProfits = onSnapshot(collection(db, 'investmentProfits'), (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<InvestmentProfitRecord, 'id'>) }));
      setProfitRecords(list);
    });

    return () => {
      unsubSession();
      unsubInvestments();
      unsubProjects();
      unsubProfits();
    };
  }, []);

  const myInvestments = useMemo(() => {
    if (!adminUser) return [];
    const adminUid = adminUser.uid;
    const adminEmail = (adminUser.email || '').trim().toLowerCase();
    const adminPhone = normalizePhone(adminUser.phone || '');

    return investments
      .filter((inv) => {
        if (inv.investorUid && inv.investorUid === adminUid) return true;
        if (adminEmail && inv.investorEmail && inv.investorEmail.trim().toLowerCase() === adminEmail) {
          return true;
        }
        if (adminPhone && adminPhone.length >= 10 && inv.investorPhone) {
          if (normalizePhone(inv.investorPhone) === adminPhone) return true;
        }
        return false;
      })
      .sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());
  }, [adminUser, investments]);

  const myProfitRecords = useMemo(() => {
    const myInvIds = new Set(myInvestments.map((i) => i.id));
    return profitRecords
      .filter((r) => myInvIds.has(r.investmentId))
      .sort((a, b) => b.month.localeCompare(a.month));
  }, [myInvestments, profitRecords]);

  const totalInvested = useMemo(
    () => myInvestments.reduce((sum, inv) => sum + (Number(inv.amount) || 0), 0),
    [myInvestments]
  );

  const totalReceivedProfit = useMemo(
    () =>
      myProfitRecords
        .filter((r) => r.status === 'Sent')
        .reduce((sum, r) => sum + (Number(r.profitAmount) || 0), 0),
    [myProfitRecords]
  );

  const uniqueProjectsCount = useMemo(() => {
    const set = new Set(myInvestments.map((i) => i.projectId || i.projectTitle || 'unassigned'));
    return set.size;
  }, [myInvestments]);

  if (loading) {
    return (
      <div className="py-24 flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-green-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center space-x-2.5">
            <Briefcase className="h-7 w-7 text-green-600" />
            <span>My Investment</span>
          </h1>
          <p className="text-gray-500 text-xs sm:text-sm mt-1">
            আপনার এডমিন প্রোফাইলের সাথে যুক্ত ব্যক্তিগত বিনিয়োগ, ব্যাচ এবং মাসিক লভ্যাংশ বিবরণী।
          </p>
        </div>

        {adminUser && (
          <div className="bg-white border border-gray-100 rounded-2xl px-4 py-3 shadow-sm flex items-center space-x-3 self-start md:self-auto">
            <div className="w-10 h-10 rounded-xl bg-green-50 text-green-700 flex items-center justify-center font-bold">
              {(adminUser.name || 'A').charAt(0)}
            </div>
            <div className="text-xs">
              <div className="font-bold text-gray-900 flex items-center space-x-1.5">
                <span>{adminUser.name}</span>
                <span className="px-2 py-0.5 text-[10px] rounded-full bg-green-50 text-green-700 uppercase font-bold">
                  {adminUser.role === 'super_admin' ? 'Super Admin' : 'Admin'}
                </span>
              </div>
              <div className="text-gray-500 flex items-center space-x-2 mt-0.5">
                {adminUser.email && <span>{adminUser.email}</span>}
                {adminUser.phone && <span className="text-green-700 font-semibold">• {adminUser.phone}</span>}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-[#1A2E26] to-[#244136] text-white p-6 rounded-3xl shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-green-300">My Total Investment</span>
            <Wallet className="h-5 w-5 text-green-300" />
          </div>
          <div className="text-3xl font-extrabold tracking-tight">
            {myInvestments.length > 0 ? formatCurrency(totalInvested) : 'No Investment'}
          </div>
          <p className="text-xs text-gray-300 mt-2">
            {myInvestments.length > 0
              ? `মোট ${myInvestments.length}টি ব্যাচ/বিনিয়োগ রেকর্ড থেকে হিসাবকৃত`
              : 'আপনার নামে এখনো কোনো বিনিয়োগ নেই'}
          </p>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Received Monthly Profit</span>
            <TrendingUp className="h-5 w-5 text-green-600" />
          </div>
          <div className="text-3xl font-extrabold text-green-700">{formatCurrency(totalReceivedProfit)}</div>
          <p className="text-xs text-gray-500 mt-2">পরিশোধিত (Sent) মোট লভ্যাংশ</p>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Active Projects</span>
            <FolderKanban className="h-5 w-5 text-blue-600" />
          </div>
          <div className="text-3xl font-extrabold text-gray-900">{uniqueProjectsCount}</div>
          <p className="text-xs text-gray-500 mt-2">যে সকল প্রজেক্টে বিনিয়োগ রয়েছে</p>
        </div>
      </div>

      {/* Main Content: Either Empty State ("No Investment") or Investment List */}
      {myInvestments.length === 0 ? (
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-12 sm:p-16 text-center space-y-4">
          <div className="w-16 h-16 bg-gray-50 text-gray-400 rounded-2xl flex items-center justify-center mx-auto border border-gray-100">
            <Briefcase className="h-8 w-8" />
          </div>
          <div className="space-y-1.5">
            <h2 className="text-2xl font-extrabold text-gray-900">No Investment</h2>
            <p className="text-sm text-gray-500 max-w-md mx-auto">
              আপনার এডমিন প্রোফাইলের বিপরীতে এখনো কোনো ইনভেস্টমেন্ট রেকর্ড যুক্ত করা হয়নি। Investments পেইজ থেকে "Add Admin as Investor" বাটনের মাধ্যমে যেকোনো সময় আপনার বিনিয়োগ যুক্ত করতে পারবেন।
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-gray-900">My Investment Breakdown (Batch-wise)</h2>
                <p className="text-xs text-gray-500">আপনার প্রতিটি বিনিয়োগের প্রজেক্ট, ব্যাচ, প্রফিট শুরুর মাস এবং টাকার পরিমাণ।</p>
              </div>
              <span className="text-xs font-bold text-green-700 bg-green-50 px-3 py-1.5 rounded-xl border border-green-100">
                Total: {formatCurrency(totalInvested)}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 text-[10px] font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100">
                    <th className="py-4 px-6">Project & Batch</th>
                    <th className="py-4 px-6">Investor Profile Used</th>
                    <th className="py-4 px-6">Date & Profit Start</th>
                    <th className="py-4 px-6 text-right">Invested Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-sm">
                  {myInvestments.map((inv) => {
                    const linkedProject = inv.projectId ? projects[inv.projectId] : undefined;
                    const isMonthly = linkedProject
                      ? (linkedProject.profitType || 'monthly') === 'monthly'
                      : Boolean(inv.profitStartMonth);
                    return (
                      <tr key={inv.id} className="hover:bg-gray-50/70 transition-colors">
                        <td className="py-4 px-6">
                          <div className="flex items-center space-x-3">
                            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                              <Target className="h-4 w-4" />
                            </div>
                            <div className="space-y-1">
                              <div className="font-bold text-gray-900">
                                {linkedProject?.title || inv.projectTitle || 'General Fund'}
                              </div>
                              <div className="flex flex-wrap items-center gap-1.5">
                                {inv.batchName && (
                                  <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 text-[10px] font-bold border border-blue-100">
                                    <Layers className="h-2.5 w-2.5" />
                                    <span>{inv.batchName}</span>
                                  </span>
                                )}
                                <span
                                  className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                                    isMonthly
                                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                                      : 'bg-amber-50 text-amber-700 border border-amber-100'
                                  }`}
                                >
                                  {isMonthly ? 'মাসিক লভ্যাংশ' : 'এককালীন'}
                                </span>
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="py-4 px-6">
                          <div className="text-xs space-y-0.5">
                            <div className="font-bold text-gray-800 flex items-center space-x-1.5">
                              <UserCheck className="h-3.5 w-3.5 text-green-600" />
                              <span>{inv.investorName || adminUser?.name}</span>
                            </div>
                            <div className="text-gray-500 flex flex-wrap items-center gap-2">
                              {inv.investorPhone && (
                                <span className="inline-flex items-center text-green-700 font-semibold">
                                  <Phone className="h-3 w-3 mr-1" />
                                  {inv.investorPhone}
                                </span>
                              )}
                              {inv.investorEmail && (
                                <span className="inline-flex items-center">
                                  <Mail className="h-3 w-3 mr-1" />
                                  {inv.investorEmail}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        <td className="py-4 px-6 text-gray-600 whitespace-nowrap">
                          <div className="inline-flex items-center space-x-1.5 text-xs font-medium">
                            <Calendar className="h-3.5 w-3.5 text-gray-400" />
                            <span>{formatDate(inv.date)}</span>
                          </div>
                          {inv.profitStartMonth && (
                            <div className="text-[11px] font-bold text-emerald-700 mt-0.5 flex items-center space-x-1">
                              <CalendarClock className="h-3 w-3" />
                              <span>প্রফিট শুরু: {formatMonthLabel(inv.profitStartMonth)}</span>
                            </div>
                          )}
                        </td>

                        <td className="py-4 px-6 text-right whitespace-nowrap">
                          <span className="text-base font-extrabold text-green-600">
                            {formatCurrency(inv.amount)}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {myProfitRecords.length > 0 && (
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-6 py-5 border-b border-gray-100">
                <h2 className="text-base font-bold text-gray-900">মাসিক প্রফিট ও Dry Period বিবরণী</h2>
                <p className="text-xs text-gray-500">আপনার বিনিয়োগের মাসভিত্তিক প্রফিট স্ট্যাটাস (Sent / Pending / Dry Period)।</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 text-[10px] font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100">
                      <th className="py-3.5 px-6">মাস (Month)</th>
                      <th className="py-3.5 px-6">প্রোজেক্ট ও ব্যাচ</th>
                      <th className="py-3.5 px-6">প্রফিট এমাউন্ট</th>
                      <th className="py-3.5 px-6 text-right">স্ট্যাটাস</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-sm">
                    {myProfitRecords.map((rec) => (
                      <tr key={rec.id} className="hover:bg-gray-50/70">
                        <td className="py-3.5 px-6 font-bold text-gray-900">
                          {formatMonthLabel(rec.month)}
                        </td>
                        <td className="py-3.5 px-6">
                          <span className="font-bold text-gray-800">{rec.projectTitle}</span>
                          {rec.batchName && (
                            <span className="ml-2 px-2 py-0.5 rounded bg-blue-50 text-blue-700 text-[10px] font-bold">
                              {rec.batchName}
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-6 font-extrabold text-green-700">
                          {rec.status === 'Dry Period' ? '৳0 (Dry Period)' : formatCurrency(rec.profitAmount)}
                        </td>
                        <td className="py-3.5 px-6 text-right">
                          <span
                            className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-bold ${
                              rec.status === 'Sent'
                                ? 'bg-green-100 text-green-800'
                                : rec.status === 'Dry Period'
                                ? 'bg-rose-100 text-rose-700'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {rec.status === 'Sent' ? (
                              <CheckCircle2 className="h-3 w-3" />
                            ) : rec.status === 'Dry Period' ? (
                              <Ban className="h-3 w-3" />
                            ) : (
                              <Clock className="h-3 w-3" />
                            )}
                            <span>{rec.status}</span>
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
