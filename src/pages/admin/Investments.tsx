import React, { useState, useEffect, useMemo } from 'react';
import {
  collection,
  getDocs,
  query,
  orderBy,
  doc,
  getDoc,
  where,
  limit,
  deleteDoc,
  addDoc,
  updateDoc,
  setDoc
} from 'firebase/firestore';
import { db } from '../../firebase';
import {
  Investment,
  UserProfile,
  Project,
  ProjectBatch,
  BatchProfitRate,
  InvestmentProfitRecord,
  MonthlyProfitStatus
} from '../../types';
import {
  User,
  Mail,
  Calendar,
  Target,
  FileSearch,
  X,
  Phone,
  MapPin,
  Landmark,
  Briefcase,
  FileType,
  Trash2,
  UserPlus,
  Send,
  Pencil,
  Upload,
  CheckCircle2,
  Users as UsersIcon,
  Shield,
  Layers,
  Percent,
  CalendarClock,
  AlertCircle,
  Check,
  Clock,
  Ban,
  Calculator,
  Plus,
  Search,
  Filter,
  Hash,
  Sparkles
} from 'lucide-react';
import { formatCurrency, formatDate } from '../../lib/utils';
import { normalizePhone, getPhoneSearchVariants } from '../../lib/authSession';
import { AnimatePresence, motion } from 'motion/react';

export interface InvestmentEntryFormItem {
  id?: string;
  tempId: string;
  projectId: string;
  projectTitle: string;
  batchId: string;
  batchName: string;
  profitStartMonth: string;
  amount: string;
  date: string;
}

const emptyKycProfile = {
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
};

const getCurrentYearMonth = () => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
};

const createDefaultInvestmentEntry = (projectsList: Project[] = []): InvestmentEntryFormItem => {
  const defaultProj = projectsList[0];
  const openBatch = defaultProj?.batches?.find(b => b.status === 'Open') || defaultProj?.batches?.[0];
  return {
    tempId: `entry_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    projectId: defaultProj?.id || '',
    projectTitle: defaultProj?.title || '',
    batchId: openBatch?.id || '',
    batchName: openBatch?.name || '',
    profitStartMonth: getCurrentYearMonth(),
    amount: '',
    date: new Date().toISOString().split('T')[0]
  };
};

const monthToIndex = (ym: string): number => {
  const [yStr, mStr] = (ym || '').split('-');
  const y = parseInt(yStr, 10);
  const m = parseInt(mStr, 10);
  if (isNaN(y) || isNaN(m)) return 0;
  return y * 12 + (m - 1);
};

const indexToMonth = (idx: number): string => {
  const y = Math.floor(idx / 12);
  const m = (idx % 12) + 1;
  return `${y}-${String(m).padStart(2, '0')}`;
};

export const formatMonthLabel = (ym?: string): string => {
  if (!ym || !ym.includes('-')) return ym || 'N/A';
  const [y, m] = ym.split('-');
  const monthNames = [
    'জানুয়ারি (Jan)',
    'ফেব্রুয়ারি (Feb)',
    'মার্চ (Mar)',
    'এপ্রিল (Apr)',
    'মে (May)',
    'জুন (Jun)',
    'জুলাই (Jul)',
    'আগস্ট (Aug)',
    'সেপ্টেম্বর (Sep)',
    'অক্টোবর (Oct)',
    'নভেম্বর (Nov)',
    'ডিসেম্বর (Dec)'
  ];
  const mIdx = parseInt(m, 10) - 1;
  return `${monthNames[mIdx] || m} ${y}`;
};

export const getEffectiveStartMonth = (inv: { profitStartMonth?: string; date?: string }): string => {
  if (inv.profitStartMonth && inv.profitStartMonth.includes('-')) {
    return inv.profitStartMonth;
  }
  if (inv.date) {
    try {
      return new Date(inv.date).toISOString().slice(0, 7);
    } catch {
      return inv.date.slice(0, 7);
    }
  }
  return getCurrentYearMonth();
};

export const isEligibleForMonth = (inv: { profitStartMonth?: string; date?: string }, targetMonth: string): boolean => {
  const startYm = getEffectiveStartMonth(inv);
  return monthToIndex(targetMonth) >= monthToIndex(startYm);
};

export const getInvestorKey = (inv: { investorPhone?: string; investorEmail?: string; investorUid?: string; investorName?: string }): string => {
  if (inv.investorUid && inv.investorUid.trim()) {
    return `uid:${inv.investorUid.trim()}`;
  }
  const normPhone = inv.investorPhone ? normalizePhone(inv.investorPhone) : '';
  if (normPhone && normPhone.length >= 10) {
    return `phone:${normPhone}`;
  }
  if (inv.investorEmail && inv.investorEmail.trim()) {
    return `email:${inv.investorEmail.trim().toLowerCase()}`;
  }
  return `name:${inv.investorName?.trim().toLowerCase() || 'unknown'}`;
};

export default function AdminInvestments() {
  const [activePageTab, setActivePageTab] = useState<'investments' | 'monthly_profit'>('investments');

  const [investments, setInvestments] = useState<Investment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedInvestor, setSelectedInvestor] = useState<UserProfile | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [investorLoading, setInvestorLoading] = useState(false);
  const [selectedInvestmentToDelete, setSelectedInvestmentToDelete] = useState<Investment | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [projects, setProjects] = useState<Project[]>([]);
  const [adminUsers, setAdminUsers] = useState<UserProfile[]>([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addInvestorMode, setAddInvestorMode] = useState<'manual' | 'admin'>('manual');
  const [selectedAdminUid, setSelectedAdminUid] = useState<string>('');
  const [isSmsModalOpen, setIsSmsModalOpen] = useState(false);
  const [selectedInvIds, setSelectedInvIds] = useState<string[]>([]);
  const [modalTab, setModalTab] = useState<'investment' | 'personal' | 'contact' | 'bank' | 'nominee'>('investment');
  const [uploadingFile, setUploadingFile] = useState<'nid' | 'nomineeNid' | null>(null);
  const [pageBanner, setPageBanner] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [addFormData, setAddFormData] = useState({
    investorName: '',
    investorEmail: '',
    investorPhone: '',
    projectId: '',
    projectTitle: '',
    batchId: '',
    batchName: '',
    profitStartMonth: getCurrentYearMonth(),
    amount: '',
    date: new Date().toISOString().split('T')[0],
    investmentEntries: [createDefaultInvestmentEntry()],
    investorProfile: { ...emptyKycProfile }
  });

  // Edit investment/investor state variables
  const [selectedInvestmentToEdit, setSelectedInvestmentToEdit] = useState<Investment | null>(null);
  const [initialEditInvestmentIds, setInitialEditInvestmentIds] = useState<string[]>([]);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editModalTab, setEditModalTab] = useState<'investment' | 'personal' | 'contact' | 'bank' | 'nominee'>('investment');
  const [editFormData, setEditFormData] = useState({
    investorName: '',
    investorEmail: '',
    investorPhone: '',
    projectId: '',
    projectTitle: '',
    batchId: '',
    batchName: '',
    profitStartMonth: getCurrentYearMonth(),
    amount: '',
    date: '',
    investmentEntries: [] as InvestmentEntryFormItem[],
    investorProfile: { ...emptyKycProfile }
  });
  const [editLoading, setEditLoading] = useState(false);

  const [smsMessage, setSmsMessage] = useState('');
  const [smsSending, setSmsSending] = useState(false);
  const [smsRecipientType, setSmsRecipientType] = useState<'selected' | 'all'>('selected');
  const [smsStatus, setSmsStatus] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // ============================================================================
  // Monthly Profit & Dry Period Management States
  // ============================================================================
  const [profitProjectId, setProfitProjectId] = useState<string>('');
  const [profitBatchId, setProfitBatchId] = useState<string>('all');
  const [profitMonth, setProfitMonth] = useState<string>(getCurrentYearMonth());
  const [batchPercentageInput, setBatchPercentageInput] = useState<string>('');
  const [batchProfitRates, setBatchProfitRates] = useState<BatchProfitRate[]>([]);
  const [investmentProfits, setInvestmentProfits] = useState<InvestmentProfitRecord[]>([]);
  const [profitLoading, setProfitLoading] = useState<boolean>(false);
  const [applyingRate, setApplyingRate] = useState<boolean>(false);
  const [updatingProfitId, setUpdatingProfitId] = useState<string | null>(null);
  const [customProfitAmounts, setCustomProfitAmounts] = useState<Record<string, string>>({});
  const [profitBanner, setProfitBanner] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Filters & Investor ID States for Investments tab
  const [invSearchTerm, setInvSearchTerm] = useState('');
  const [filterProjectId, setFilterProjectId] = useState<string>('all');
  const [filterProfitMonth, setFilterProfitMonth] = useState<string>('');
  const [onlyProfitEligible, setOnlyProfitEligible] = useState<boolean>(false);
  const [selectedInvestorIdFilter, setSelectedInvestorIdFilter] = useState<string | null>(null);

  // Group and assign permanent, stable Investor IDs (INV-001, INV-002, etc.)
  const investorIdMap = useMemo(() => {
    const earliestDateByKey: Record<string, string> = {};
    const countByKey: Record<string, number> = {};

    for (const inv of investments) {
      const key = getInvestorKey(inv);
      countByKey[key] = (countByKey[key] || 0) + 1;
      const invDate = inv.date || '9999-99-99';
      if (!earliestDateByKey[key] || invDate < earliestDateByKey[key]) {
        earliestDateByKey[key] = invDate;
      }
    }

    // Sort chronologically so earliest investors get INV-001, INV-002...
    const sortedKeys = Object.keys(earliestDateByKey).sort((a, b) => {
      const cmp = earliestDateByKey[a].localeCompare(earliestDateByKey[b]);
      if (cmp !== 0) return cmp;
      return a.localeCompare(b);
    });

    const map = new Map<string, { id: string; count: number }>();
    sortedKeys.forEach((key, idx) => {
      const seq = (idx + 1).toString().padStart(3, '0');
      map.set(key, {
        id: `INV-${seq}`,
        count: countByKey[key] || 1
      });
    });

    return map;
  }, [investments]);

  // Filtered Investments based on search, project, investor ID, and profit month eligibility
  const filteredInvestments = useMemo(() => {
    return investments.filter(inv => {
      const term = invSearchTerm.toLowerCase().trim();
      const key = getInvestorKey(inv);
      const invIdObj = investorIdMap.get(key);
      const invIdStr = invIdObj ? invIdObj.id.toLowerCase() : '';

      const matchesSearch = !term || (
        (inv.investorName && inv.investorName.toLowerCase().includes(term)) ||
        (inv.investorPhone && inv.investorPhone.toLowerCase().includes(term)) ||
        (inv.investorEmail && inv.investorEmail.toLowerCase().includes(term)) ||
        (inv.projectTitle && inv.projectTitle.toLowerCase().includes(term)) ||
        (inv.batchName && inv.batchName.toLowerCase().includes(term)) ||
        invIdStr.includes(term)
      );

      const matchesProject = filterProjectId === 'all' || inv.projectId === filterProjectId;

      const matchesInvestorId = !selectedInvestorIdFilter || (invIdObj && invIdObj.id === selectedInvestorIdFilter);

      let matchesProfitMonth = true;
      if (filterProfitMonth) {
        const projObj = projects.find(p => p.id === inv.projectId);
        const isMonthly = projObj ? (projObj.profitType || 'monthly') === 'monthly' : Boolean(inv.profitStartMonth);
        const isEligible = isMonthly && isEligibleForMonth(inv, filterProfitMonth);
        if (onlyProfitEligible) {
          matchesProfitMonth = isEligible;
        }
      }

      return matchesSearch && matchesProject && matchesInvestorId && matchesProfitMonth;
    });
  }, [investments, invSearchTerm, filterProjectId, filterProfitMonth, onlyProfitEligible, selectedInvestorIdFilter, investorIdMap, projects]);

  const showPageBanner = (type: 'success' | 'error', text: string) => {
    setPageBanner({ type, text });
    setTimeout(() => setPageBanner(null), 5000);
  };

  const showProfitNotice = (type: 'success' | 'error', text: string) => {
    setProfitBanner({ type, text });
    setTimeout(() => setProfitBanner(null), 6500);
  };

  useEffect(() => {
    fetchInvestments();
    fetchProjects();
    fetchAdmins();
    fetchProfitData();
  }, []);

  const fetchAdmins = async () => {
    try {
      const snapshot = await getDocs(collection(db, 'users'));
      const admins = snapshot.docs
        .map(d => ({ ...(d.data() as UserProfile), uid: d.id }))
        .filter(u => u.role === 'admin' || u.role === 'super_admin' || u.email === 'alvymahamudulhasan@gmail.com');
      setAdminUsers(admins);
    } catch (err) {
      console.error('Error fetching admins:', err);
    }
  };

  const applyAdminProfileToForm = (admin: UserProfile) => {
    setSelectedAdminUid(admin.uid);
    setAddFormData(prev => ({
      ...prev,
      investorName: admin.name || '',
      investorEmail: admin.email || '',
      investorPhone: admin.phone || '',
      investorProfile: {
        ...emptyKycProfile,
        ...(admin.investorProfile || {})
      }
    }));
  };

  const fetchProjects = async () => {
    try {
      const snapshot = await getDocs(collection(db, 'projects'));
      const loaded = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Project));
      setProjects(loaded);
      const firstMonthly = loaded.find(p => (p.profitType || 'monthly') === 'monthly');
      if (firstMonthly && firstMonthly.id && !profitProjectId) {
        setProfitProjectId(firstMonthly.id);
        if (firstMonthly.batches && firstMonthly.batches.length > 0) {
          setProfitBatchId(firstMonthly.batches[0].id);
        }
      }
    } catch (err) {
      console.error('Error fetching projects:', err);
    }
  };

  const fetchInvestments = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'investments'), orderBy('date', 'desc'));
      const [querySnapshot, projSnapshot] = await Promise.all([
        getDocs(q),
        getDocs(collection(db, 'projects'))
      ]);
      const invList = querySnapshot.docs.map(d => ({ id: d.id, ...d.data() } as Investment));
      setInvestments(invList);

      // Recalculate and sync each project's currentAmount with actual investments
      const raisedMap: Record<string, number> = {};
      invList.forEach(inv => {
        if (inv.projectId) {
          raisedMap[inv.projectId] = (raisedMap[inv.projectId] || 0) + (Number(inv.amount) || 0);
        }
      });

      projSnapshot.docs.forEach(pDoc => {
        const pData = pDoc.data();
        const actualRaised = raisedMap[pDoc.id] || 0;
        if (Number(pData.currentAmount || 0) !== actualRaised) {
          updateDoc(doc(db, 'projects', pDoc.id), { currentAmount: actualRaised }).catch(e =>
            console.warn('Could not sync project currentAmount:', e)
          );
        }
      });
    } catch (err) {
      console.error('Error fetching investments:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchProfitData = async () => {
    setProfitLoading(true);
    try {
      const [ratesSnap, profitsSnap] = await Promise.all([
        getDocs(collection(db, 'batchProfitRates')),
        getDocs(collection(db, 'investmentProfits'))
      ]);
      const rates = ratesSnap.docs.map(d => ({ id: d.id, ...d.data() } as BatchProfitRate));
      const profits = profitsSnap.docs.map(d => ({ id: d.id, ...d.data() } as InvestmentProfitRecord));
      setBatchProfitRates(rates);
      setInvestmentProfits(profits);
    } catch (err) {
      console.error('Error fetching profit data:', err);
    } finally {
      setProfitLoading(false);
    }
  };

  // Sync batchPercentageInput when project/batch/month changes
  useEffect(() => {
    if (!profitProjectId || !profitMonth) return;
    const rateDoc = batchProfitRates.find(
      r => r.projectId === profitProjectId && r.batchId === profitBatchId && r.month === profitMonth
    );
    if (rateDoc) {
      setBatchPercentageInput(String(rateDoc.profitPercentage));
    } else {
      setBatchPercentageInput('');
    }
  }, [profitProjectId, profitBatchId, profitMonth, batchProfitRates]);

  const handleFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    field: 'nidFileUrl' | 'nomineeNidFileUrl',
    mode: 'add' | 'edit'
  ) => {
    if (!e.target.files || !e.target.files[0]) return;
    const file = e.target.files[0];
    setUploadingFile(field === 'nidFileUrl' ? 'nid' : 'nomineeNid');

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

      if (mode === 'add') {
        setAddFormData(prev => ({
          ...prev,
          investorProfile: { ...prev.investorProfile, [field]: dataUrl }
        }));
      } else {
        setEditFormData(prev => ({
          ...prev,
          investorProfile: { ...prev.investorProfile, [field]: dataUrl }
        }));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setUploadingFile(null);
    }
  };

  const findExistingUserDoc = async (phone: string, email: string, uid?: string) => {
    if (uid) {
      const directSnap = await getDoc(doc(db, 'users', uid));
      if (directSnap.exists()) return directSnap;
    }
    const normPhone = normalizePhone(phone);
    if (normPhone) {
      const directPhoneSnap = await getDoc(doc(db, 'users', `phone_${normPhone}`));
      if (directPhoneSnap.exists()) return directPhoneSnap;

      const variants = getPhoneSearchVariants(normPhone);
      for (const v of variants) {
        const qPhone = query(collection(db, 'users'), where('phone', '==', v), limit(1));
        const snap = await getDocs(qPhone);
        if (!snap.empty) return snap.docs[0];
      }
    }
    if (email && email.trim()) {
      const qEmail = query(collection(db, 'users'), where('email', '==', email.trim()), limit(1));
      const snap = await getDocs(qEmail);
      if (!snap.empty) return snap.docs[0];
    }
    return null;
  };

  const handleDeleteInvestment = async (id: string) => {
    setIsDeleting(true);
    try {
      const targetInv = investments.find((i) => i.id === id) || selectedInvestmentToDelete;
      await deleteDoc(doc(db, 'investments', id));

      if (targetInv) {
        const remainingForInvestor = investments.filter((i) => {
          if (i.id === id) return false;
          if (targetInv.investorUid && i.investorUid === targetInv.investorUid) return true;
          if (
            targetInv.investorPhone &&
            i.investorPhone &&
            normalizePhone(targetInv.investorPhone) === normalizePhone(i.investorPhone)
          ) {
            return true;
          }
          return false;
        });

        if (remainingForInvestor.length === 0) {
          const userSnap = await findExistingUserDoc(
            targetInv.investorPhone || '',
            targetInv.investorEmail || '',
            targetInv.investorUid
          );
          if (userSnap && userSnap.data()?.role === 'investor') {
            await deleteDoc(doc(db, 'users', userSnap.id));
          }
        }
      }

      setSelectedInvestmentToDelete(null);
      fetchInvestments();
      showPageBanner('success', 'ইনভেস্টমেন্ট রেকর্ড মুছে ফেলা হয়েছে।');
    } catch (err) {
      console.error(err);
    } finally {
      setIsDeleting(false);
    }
  };

  const resolveAndValidateInvestmentEntries = (
    entries: InvestmentEntryFormItem[]
  ): {
    valid: boolean;
    errorMsg?: string;
    resolved: Array<{
      id?: string;
      projectId: string;
      projectTitle: string;
      batchId: string;
      batchName: string;
      profitStartMonth: string;
      amount: number;
      dateIso: string;
    }>;
  } => {
    if (!entries || entries.length === 0) {
      return {
        valid: false,
        errorMsg: 'অনুগ্রহ করে অন্তত একটি ইনভেস্টমেন্ট তথ্য যুক্ত করুন।',
        resolved: []
      };
    }

    const resolvedList: Array<{
      id?: string;
      projectId: string;
      projectTitle: string;
      batchId: string;
      batchName: string;
      profitStartMonth: string;
      amount: number;
      dateIso: string;
    }> = [];

    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      const idxLabel = entries.length > 1 ? ` (ইনভেস্টমেন্ট #${i + 1})` : '';
      let finalProjId = entry.projectId;
      let finalProjTitle = entry.projectTitle;
      let finalBatchId = entry.batchId || '';
      let finalBatchName = entry.batchName || '';
      let finalProfitStartMonth = entry.profitStartMonth || '';

      const selectedProj = projects.find(p => p.id === finalProjId);
      if (selectedProj) {
        finalProjTitle = selectedProj.title;
        const projBatches = selectedProj.batches || [];
        if (projBatches.length > 0) {
          if (!finalBatchId) {
            return {
              valid: false,
              errorMsg: `অনুগ্রহ করে "${selectedProj.title}" প্রোজেক্টের একটি ব্যাচ নির্বাচন করুন${idxLabel}।`,
              resolved: []
            };
          }
          const chosenBatch = projBatches.find(b => b.id === finalBatchId) || projBatches[0];
          if (!chosenBatch) {
            return {
              valid: false,
              errorMsg: `নির্বাচিত ব্যাচটি পাওয়া যায়নি${idxLabel}।`,
              resolved: []
            };
          }
          if (!entry.id && chosenBatch.status === 'Closed') {
            return {
              valid: false,
              errorMsg: `"${chosenBatch.name}" ব্যাচটির ইনভেস্টমেন্ট বর্তমানে Closed (বন্ধ) রয়েছে${idxLabel}। অনুগ্রহ করে একটি Open ব্যাচ নির্বাচন করুন।`,
              resolved: []
            };
          }
          finalBatchId = chosenBatch.id;
          finalBatchName = chosenBatch.name;
        } else {
          finalBatchId = finalBatchId || 'default_batch';
          finalBatchName = finalBatchName || 'Batch 1';
        }

        if ((selectedProj.profitType || 'monthly') === 'monthly' && !finalProfitStartMonth) {
          return {
            valid: false,
            errorMsg: `মাসিক লভ্যাংশভিত্তিক প্রোজেক্টের জন্য "কোন মাস থেকে প্রফিট পাবে" তা নির্বাচন করুন${idxLabel}।`,
            resolved: []
          };
        }
        if (selectedProj.profitType === 'one_time') {
          finalProfitStartMonth = '';
        }
      } else {
        finalProjId = 'unassigned';
        finalProjTitle = finalProjTitle.trim() || 'General Fund';
        finalBatchId = '';
        finalBatchName = '';
        finalProfitStartMonth = '';
      }

      const amountNum = parseFloat(entry.amount) || 0;
      if (amountNum <= 0) {
        return {
          valid: false,
          errorMsg: `অনুগ্রহ করে সঠিক ইনভেস্টমেন্টের পরিমাণ (Amount) লিখুন${idxLabel}।`,
          resolved: []
        };
      }

      const dateStr = entry.date || new Date().toISOString().split('T')[0];
      let dateIso = new Date().toISOString();
      try {
        dateIso = new Date(dateStr).toISOString();
      } catch (e) {
        dateIso = new Date().toISOString();
      }

      resolvedList.push({
        id: entry.id,
        projectId: finalProjId,
        projectTitle: finalProjTitle,
        batchId: finalBatchId,
        batchName: finalBatchName,
        profitStartMonth: finalProfitStartMonth,
        amount: amountNum,
        dateIso
      });
    }

    return { valid: true, resolved: resolvedList };
  };

  const handleAddInvestment = async (e: React.FormEvent) => {
    e.preventDefault();
    const isAddingAdmin = addInvestorMode === 'admin' && Boolean(selectedAdminUid);
    const normPhone = normalizePhone(addFormData.investorPhone);

    if (!isAddingAdmin && (!normPhone || normPhone.length < 10)) {
      showPageBanner('error', 'অনুগ্রহ করে ইনভেস্টরের সঠিক মোবাইল নম্বর দিন (OTP লগইনের জন্য আবশ্যক)।');
      setModalTab('investment');
      return;
    }

    if (isAddingAdmin && !selectedAdminUid) {
      showPageBanner('error', 'অনুগ্রহ করে তালিকা থেকে একজন এডমিন নির্বাচন করুন।');
      setModalTab('investment');
      return;
    }

    const entriesToProcess =
      addFormData.investmentEntries && addFormData.investmentEntries.length > 0
        ? addFormData.investmentEntries
        : [
            {
              tempId: 'fallback_add',
              projectId: addFormData.projectId,
              projectTitle: addFormData.projectTitle,
              batchId: addFormData.batchId,
              batchName: addFormData.batchName,
              profitStartMonth: addFormData.profitStartMonth,
              amount: addFormData.amount,
              date: addFormData.date
            }
          ];

    const validation = resolveAndValidateInvestmentEntries(entriesToProcess);
    if (!validation.valid) {
      showPageBanner('error', validation.errorMsg || 'ইনভেস্টমেন্ট তথ্য যাচাই করুন।');
      setModalTab('investment');
      return;
    }

    setLoading(true);
    try {
      const selectedAdmin = isAddingAdmin ? adminUsers.find(a => a.uid === selectedAdminUid) : null;
      const name = addFormData.investorName.trim() || selectedAdmin?.name || `Investor (${normPhone || 'Admin'})`;
      const email = addFormData.investorEmail.trim() || selectedAdmin?.email || '';
      const finalPhone = normPhone || normalizePhone(selectedAdmin?.phone || '');

      const existingUserDoc = isAddingAdmin
        ? await getDoc(doc(db, 'users', selectedAdminUid))
        : await findExistingUserDoc(finalPhone, email);

      const targetUid = isAddingAdmin
        ? selectedAdminUid
        : existingUserDoc && existingUserDoc.exists()
        ? existingUserDoc.id
        : `phone_${finalPhone}`;
      const existingData = existingUserDoc && existingUserDoc.exists() ? existingUserDoc.data() : {};

      const mergedInvestorProfile = {
        ...(existingData.investorProfile || {}),
        ...Object.fromEntries(
          Object.entries(addFormData.investorProfile).filter(([_, v]) => v && String(v).trim() !== '')
        )
      };

      await setDoc(
        doc(db, 'users', targetUid),
        {
          ...existingData,
          uid: targetUid,
          name: name,
          email: email || existingData.email || '',
          phone: finalPhone || existingData.phone || '',
          role: existingData.role || (isAddingAdmin ? selectedAdmin?.role || 'admin' : 'investor'),
          createdAt: existingData.createdAt || new Date().toISOString(),
          investorProfile: mergedInvestorProfile,
          isPreCreated: true
        },
        { merge: true }
      );

      // Save each investment entry as a separate document in Firestore
      for (const item of validation.resolved) {
        await addDoc(collection(db, 'investments'), {
          investorUid: targetUid,
          investorName: name,
          investorEmail: email,
          investorPhone: finalPhone,
          projectId: item.projectId,
          projectTitle: item.projectTitle,
          batchId: item.batchId,
          batchName: item.batchName,
          profitStartMonth: item.profitStartMonth,
          amount: item.amount,
          date: item.dateIso
        });
      }

      setIsAddModalOpen(false);
      setAddInvestorMode('manual');
      setSelectedAdminUid('');
      setAddFormData({
        investorName: '',
        investorEmail: '',
        investorPhone: '',
        projectId: '',
        projectTitle: '',
        batchId: '',
        batchName: '',
        profitStartMonth: getCurrentYearMonth(),
        amount: '',
        date: new Date().toISOString().split('T')[0],
        investmentEntries: [createDefaultInvestmentEntry(projects)],
        investorProfile: { ...emptyKycProfile }
      });
      setModalTab('investment');

      fetchInvestments();
      fetchAdmins();
      showPageBanner(
        'success',
        validation.resolved.length > 1
          ? `${validation.resolved.length} টি নতুন ইনভেস্টমেন্ট সফলভাবে যুক্ত করা হয়েছে!`
          : 'নতুন ইনভেস্টমেন্ট ও ব্যাচ তথ্য সফলভাবে যুক্ত করা হয়েছে!'
      );
    } catch (err) {
      console.error('Error adding manual investment:', err);
      showPageBanner('error', 'ইনভেস্টমেন্ট সংরক্ষণ করতে সমস্যা হয়েছে।');
    } finally {
      setLoading(false);
    }
  };

  const formatInvToEntryItem = (item: Investment): InvestmentEntryFormItem => {
    let formattedDate = '';
    if (item.date) {
      try {
        formattedDate = new Date(item.date).toISOString().split('T')[0];
      } catch (e) {
        formattedDate = item.date.split('T')[0] || '';
      }
    }
    return {
      id: item.id,
      tempId: item.id || `entry_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      projectId: item.projectId === 'unassigned' ? '' : item.projectId || '',
      projectTitle: item.projectId === 'unassigned' ? item.projectTitle || '' : '',
      batchId: item.batchId || '',
      batchName: item.batchName || '',
      profitStartMonth:
        item.profitStartMonth || (formattedDate ? formattedDate.slice(0, 7) : getCurrentYearMonth()),
      amount: item.amount ? String(item.amount) : '',
      date: formattedDate || new Date().toISOString().split('T')[0]
    };
  };

  const handleEditClick = async (inv: Investment) => {
    setSelectedInvestmentToEdit(inv);
    setEditLoading(true);
    setEditModalTab('investment');
    setIsEditModalOpen(true);

    let phoneVal = inv.investorPhone || '';
    let emailVal = inv.investorEmail || '';
    let existingKyc = { ...emptyKycProfile };
    let matchedUid = inv.investorUid || '';

    try {
      const userSnap = await findExistingUserDoc(phoneVal, emailVal, inv.investorUid);
      if (userSnap) {
        matchedUid = userSnap.id;
        const uData = userSnap.data();
        phoneVal = uData.phone || phoneVal;
        emailVal = uData.email || emailVal;
        if (uData.investorProfile) {
          existingKyc = { ...emptyKycProfile, ...uData.investorProfile };
        }
      }
    } catch (err) {
      console.error('Error fetching user details for editing:', err);
    }

    const normTargetPhone = normalizePhone(phoneVal || inv.investorPhone || '');
    const normTargetEmail = (emailVal || inv.investorEmail || '').trim().toLowerCase();

    // Find all existing investments for this same investor so Admin can see/edit all of them or click "+ Add Investment"
    const investorAllInvestments = investments.filter(item => {
      if (item.id === inv.id) return true;
      if (matchedUid && item.investorUid && item.investorUid === matchedUid) return true;
      if (inv.investorUid && item.investorUid && item.investorUid === inv.investorUid) return true;
      if (normTargetPhone && item.investorPhone && normalizePhone(item.investorPhone) === normTargetPhone) return true;
      if (normTargetEmail && item.investorEmail && item.investorEmail.trim().toLowerCase() === normTargetEmail)
        return true;
      return false;
    });

    // Put the clicked investment first, followed by the investor's other investments
    const sortedInvestorInvestments = [
      inv,
      ...investorAllInvestments.filter(item => item.id !== inv.id)
    ];

    const entries = sortedInvestorInvestments.map(formatInvToEntryItem);
    setInitialEditInvestmentIds(
      sortedInvestorInvestments.map(item => item.id!).filter(Boolean)
    );

    const primaryEntry = entries[0] || createDefaultInvestmentEntry(projects);

    setEditFormData({
      investorName: inv.investorName || '',
      investorEmail: emailVal,
      investorPhone: phoneVal,
      projectId: primaryEntry.projectId,
      projectTitle: primaryEntry.projectTitle,
      batchId: primaryEntry.batchId,
      batchName: primaryEntry.batchName,
      profitStartMonth: primaryEntry.profitStartMonth,
      amount: primaryEntry.amount,
      date: primaryEntry.date,
      investmentEntries: entries,
      investorProfile: existingKyc
    });
    setEditLoading(false);
  };

  const handleUpdateInvestment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvestmentToEdit) return;

    const entriesToProcess =
      editFormData.investmentEntries && editFormData.investmentEntries.length > 0
        ? editFormData.investmentEntries
        : [
            {
              id: selectedInvestmentToEdit.id,
              tempId: selectedInvestmentToEdit.id || 'fallback_edit',
              projectId: editFormData.projectId,
              projectTitle: editFormData.projectTitle,
              batchId: editFormData.batchId,
              batchName: editFormData.batchName,
              profitStartMonth: editFormData.profitStartMonth,
              amount: editFormData.amount,
              date: editFormData.date
            }
          ];

    const validation = resolveAndValidateInvestmentEntries(entriesToProcess);
    if (!validation.valid) {
      showPageBanner('error', validation.errorMsg || 'ইনভেস্টমেন্ট তথ্য যাচাই করুন।');
      setEditModalTab('investment');
      return;
    }

    setLoading(true);
    try {
      const normPhone = normalizePhone(editFormData.investorPhone);
      const name = editFormData.investorName.trim() || 'Anonymous Investor';
      const email = editFormData.investorEmail.trim() || '';

      const existingUserDoc = await findExistingUserDoc(
        normPhone || selectedInvestmentToEdit.investorPhone || '',
        email || selectedInvestmentToEdit.investorEmail || '',
        selectedInvestmentToEdit.investorUid
      );

      const targetUid = existingUserDoc
        ? existingUserDoc.id
        : normPhone
        ? `phone_${normPhone}`
        : `investor_${Date.now()}`;

      const existingData = existingUserDoc ? existingUserDoc.data() : {};

      await setDoc(
        doc(db, 'users', targetUid),
        {
          ...existingData,
          uid: targetUid,
          name: name,
          email: email,
          phone: normPhone || existingData.phone || '',
          role: existingData.role || 'investor',
          createdAt: existingData.createdAt || new Date().toISOString(),
          investorProfile: {
            ...(existingData.investorProfile || {}),
            ...editFormData.investorProfile
          }
        },
        { merge: true }
      );

      // Delete any existing investments that were removed in the Edit modal
      const keptIds = new Set(validation.resolved.map(r => r.id).filter(Boolean));
      for (const oldId of initialEditInvestmentIds) {
        if (!keptIds.has(oldId)) {
          await deleteDoc(doc(db, 'investments', oldId));
        }
      }

      // Update existing investments and add any newly added investments ("+ Add Investment")
      let newAddedCount = 0;
      for (const item of validation.resolved) {
        const payload = {
          investorUid: targetUid,
          investorName: name,
          investorEmail: email,
          investorPhone: normPhone,
          projectId: item.projectId,
          projectTitle: item.projectTitle,
          batchId: item.batchId,
          batchName: item.batchName,
          profitStartMonth: item.profitStartMonth,
          amount: item.amount,
          date: item.dateIso
        };

        if (item.id) {
          await updateDoc(doc(db, 'investments', item.id), payload);
        } else {
          await addDoc(collection(db, 'investments'), payload);
          newAddedCount++;
        }
      }

      setIsEditModalOpen(false);
      setSelectedInvestmentToEdit(null);
      setInitialEditInvestmentIds([]);
      fetchInvestments();
      showPageBanner(
        'success',
        newAddedCount > 0
          ? `ইনভেস্টরের তথ্য আপডেট হয়েছে এবং ${newAddedCount} টি নতুন ইনভেস্টমেন্ট সফলভাবে যুক্ত করা হয়েছে!`
          : 'ইনভেস্টমেন্ট রেকর্ড সফলভাবে আপডেট করা হয়েছে!'
      );
    } catch (err) {
      console.error('Error updating investment:', err);
      showPageBanner('error', 'ইনভেস্টমেন্ট আপডেট করতে সমস্যা হয়েছে।');
    } finally {
      setLoading(false);
    }
  };

  const handleSendSms = async (e: React.FormEvent) => {
    e.preventDefault();
    setSmsSending(true);
    setSmsStatus(null);
    try {
      let selectedInvestments: Investment[] = [];
      if (smsRecipientType === 'selected') {
        selectedInvestments = investments.filter(inv => selectedInvIds.includes(inv.id!));
        if (selectedInvestments.length === 0) {
          throw new Error('No investors selected from the list.');
        }
      }

      const targetInvestments = smsRecipientType === 'all' ? investments : selectedInvestments;
      if (targetInvestments.length === 0) {
        throw new Error('No investors found in the investment list.');
      }

      const usersSnap = await getDocs(collection(db, 'users'));
      const directPhones = targetInvestments.map(inv => inv.investorPhone).filter(Boolean) as string[];
      const targetEmails = targetInvestments.map(inv => inv.investorEmail).filter(Boolean);
      const targetUids = targetInvestments.map(inv => inv.investorUid).filter(Boolean);
      const matchedUserPhones = usersSnap.docs
        .filter(d => targetUids.includes(d.id) || (d.data().email && targetEmails.includes(d.data().email)))
        .map(d => d.data().phone)
        .filter(Boolean);
      const phones = [...directPhones, ...matchedUserPhones];

      const uniquePhones = Array.from(new Set(phones.map(p => normalizePhone(p)).filter(p => p.length >= 10)));

      if (uniquePhones.length === 0) {
        throw new Error('No valid phone numbers found for the selected recipients.');
      }

      const response = await fetch('/api/notify-investors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipients: uniquePhones.join(','),
          message: smsMessage
        })
      });

      const responseText = await response.text();
      let result;
      try {
        result = JSON.parse(responseText);
      } catch (parseErr) {
        throw new Error(
          `Server returned a non-JSON response (Status ${response.status}): ${
            responseText.substring(0, 150) || '(empty response)'
          }`
        );
      }

      if (result.success) {
        await addDoc(collection(db, 'smsLogs'), {
          requestId: result.requestId ? String(result.requestId) : '',
          recipients: uniquePhones,
          recipientCount: uniquePhones.length,
          message: smsMessage.trim(),
          type: uniquePhones.length > 1 ? 'bulk' : 'single',
          status: 'Submitted',
          errorCode: 0,
          createdAt: new Date().toISOString()
        });
        setSmsStatus({ type: 'success', text: `SMS sent successfully to ${uniquePhones.length} recipient(s)!` });
        setSmsMessage('');
      } else {
        await addDoc(collection(db, 'smsLogs'), {
          recipients: uniquePhones,
          recipientCount: uniquePhones.length,
          message: smsMessage.trim(),
          type: uniquePhones.length > 1 ? 'bulk' : 'single',
          status: 'Failed',
          errorCode: result.errorCode ?? -1,
          errorMessage: result.error || 'Failed to send SMS.',
          createdAt: new Date().toISOString()
        });
        setSmsStatus({ type: 'error', text: result.error || 'Failed to send SMS.' });
      }
    } catch (err: any) {
      console.error(err);
      setSmsStatus({ type: 'error', text: err.message || 'An error occurred while sending SMS.' });
    } finally {
      setSmsSending(false);
    }
  };

  const handleViewInvestor = async (inv: Investment) => {
    setInvestorLoading(true);
    setIsModalOpen(true);
    try {
      const userDoc = await findExistingUserDoc(inv.investorPhone || '', inv.investorEmail || '', inv.investorUid);
      if (userDoc) {
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

  // ============================================================================
  // Monthly Profit & Dry Period Logic
  // ============================================================================

  const monthlyProjects = useMemo(
    () => projects.filter(p => (p.profitType || 'monthly') === 'monthly'),
    [projects]
  );

  const selectedProfitProject = useMemo(
    () => projects.find(p => p.id === profitProjectId) || null,
    [projects, profitProjectId]
  );

  const availableProfitBatches = useMemo<ProjectBatch[]>(() => {
    if (!selectedProfitProject) return [];
    if (selectedProfitProject.batches && selectedProfitProject.batches.length > 0) {
      return selectedProfitProject.batches;
    }
    return [{ id: 'default_batch', name: 'Batch 1', status: 'Open' }];
  }, [selectedProfitProject]);

  // All investments matching selectedProfitProject and profitBatchId
  const batchInvestmentsForProfit = useMemo(() => {
    if (!profitProjectId) return [];
    return investments.filter(inv => {
      if (inv.projectId !== profitProjectId) return false;
      if (profitBatchId && profitBatchId !== 'all') {
        const invBatch = inv.batchId || 'default_batch';
        return invBatch === profitBatchId;
      }
      return true;
    });
  }, [investments, profitProjectId, profitBatchId]);

  // Helper: calculate 12-month Dry Period usage for an investment around `targetMonth`
  const getDryPeriodUsage = (inv: Investment, targetMonth: string) => {
    const maxAllowed = selectedProfitProject?.dryPeriodMonthsPerYear ?? 2;
    const startYm = getEffectiveStartMonth(inv);
    const startIdx = monthToIndex(startYm);
    const targetIdx = monthToIndex(targetMonth);

    // Determine the 12-month cycle window starting from startIdx
    const cycleNumber = targetIdx >= startIdx ? Math.floor((targetIdx - startIdx) / 12) : 0;
    const cycleStartIdx = startIdx + cycleNumber * 12;
    const cycleEndIdx = cycleStartIdx + 11;

    // Find all Dry Period records for this investmentId (excluding targetMonth itself when checking if we can add a new one)
    const allDryForInv = investmentProfits.filter(
      r => r.investmentId === inv.id && r.status === 'Dry Period'
    );

    // Dry periods inside the current 12-month cycle OR within any 12-consecutive-month window containing targetMonth
    const dryInCurrent12MonthSpan = allDryForInv.filter(r => {
      const rIdx = monthToIndex(r.month);
      const inCycle = rIdx >= cycleStartIdx && rIdx <= cycleEndIdx;
      const inRolling12 = Math.abs(targetIdx - rIdx) < 12;
      return inCycle || inRolling12;
    });

    const otherDryInSpan = dryInCurrent12MonthSpan.filter(r => r.month !== targetMonth);

    return {
      maxAllowed,
      usedCount: dryInCurrent12MonthSpan.length,
      otherUsedCount: otherDryInSpan.length,
      usedMonths: dryInCurrent12MonthSpan.map(r => r.month).sort(),
      otherUsedMonths: otherDryInSpan.map(r => r.month).sort(),
      cycleStartYm: indexToMonth(cycleStartIdx),
      cycleEndYm: indexToMonth(cycleEndIdx)
    };
  };

  // Dispatch automated SMS and log to smsLogs
  const sendAutomatedProfitSms = async (phone: string | undefined, message: string): Promise<boolean> => {
    const norm = normalizePhone(phone || '');
    if (!norm || norm.length < 10) return false;
    try {
      const response = await fetch('/api/sms/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: norm,
          message
        })
      });
      const result = await response.json();
      await addDoc(collection(db, 'smsLogs'), {
        requestId: result.requestId ? String(result.requestId) : '',
        recipients: [norm],
        recipientCount: 1,
        message,
        type: 'single',
        status: result.success ? 'Submitted' : 'Failed',
        errorCode: result.errorCode ?? (result.success ? 0 : -1),
        errorMessage: result.success ? '' : result.error || 'SMS Failed',
        createdAt: new Date().toISOString()
      });
      return Boolean(result.success);
    } catch (err) {
      console.error('Automated SMS dispatch error:', err);
      return false;
    }
  };

  // Apply Batch Profit Percentage to all eligible investments in the selected Project + Batch + Month
  const handleApplyBatchProfitPercentage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProfitProject || !profitProjectId) {
      showProfitNotice('error', 'অনুগ্রহ করে একটি প্রোজেক্ট নির্বাচন করুন।');
      return;
    }
    if (!profitBatchId || profitBatchId === 'all') {
      showProfitNotice('error', 'শতাংশ নির্ধারণের জন্য একটি নির্দিষ্ট ব্যাচ নির্বাচন করুন।');
      return;
    }
    const pct = parseFloat(batchPercentageInput);
    if (isNaN(pct) || pct < 0) {
      showProfitNotice('error', 'অনুগ্রহ করে সঠিক প্রফিট শতাংশ (%) প্রদান করুন।');
      return;
    }

    setApplyingRate(true);
    try {
      const rateDocId = `${profitProjectId}_${profitBatchId}_${profitMonth}`;
      const rateData: BatchProfitRate = {
        projectId: profitProjectId,
        batchId: profitBatchId,
        month: profitMonth,
        profitPercentage: pct,
        updatedAt: new Date().toISOString()
      };
      await setDoc(doc(db, 'batchProfitRates', rateDocId), rateData, { merge: true });

      const eligibleInvs = batchInvestmentsForProfit.filter(inv => isEligibleForMonth(inv, profitMonth));
      const selectedBatchObj = availableProfitBatches.find(b => b.id === profitBatchId);
      const batchLabel = selectedBatchObj?.name || 'Batch 1';

      for (const inv of eligibleInvs) {
        if (!inv.id) continue;
        const profitDocId = `${inv.id}_${profitMonth}`;
        const existingRecord = investmentProfits.find(r => r.id === profitDocId || (r.investmentId === inv.id && r.month === profitMonth));

        // If already Sent or Dry Period, keep its status; if Dry Period, profitAmount stays 0; otherwise calculate from percentage
        const currentStatus: MonthlyProfitStatus = existingRecord ? existingRecord.status : 'Pending';
        const calculatedAmount =
          currentStatus === 'Dry Period' ? 0 : Math.round(((Number(inv.amount) || 0) * pct) / 100);

        const recordPayload: Omit<InvestmentProfitRecord, 'id'> = {
          investmentId: inv.id,
          investorUid: inv.investorUid || '',
          investorName: inv.investorName,
          investorPhone: inv.investorPhone || '',
          investorEmail: inv.investorEmail || '',
          projectId: profitProjectId,
          projectTitle: selectedProfitProject.title,
          batchId: inv.batchId || profitBatchId,
          batchName: inv.batchName || batchLabel,
          month: profitMonth,
          investedAmount: Number(inv.amount) || 0,
          profitPercentage: pct,
          profitAmount: calculatedAmount,
          status: currentStatus,
          updatedAt: new Date().toISOString()
        };

        await setDoc(doc(db, 'investmentProfits', profitDocId), recordPayload, { merge: true });
      }

      await fetchProfitData();
      showProfitNotice(
        'success',
        `${selectedProfitProject.title} (${batchLabel}) — ${formatMonthLabel(profitMonth)} মাসের জন্য ${pct}% প্রফিট হিসাব করে ${eligibleInvs.length} জন যোগ্য ইনভেস্টরের নামের পাশে বসানো হয়েছে!`
      );
    } catch (err) {
      console.error('Error applying batch profit rate:', err);
      showProfitNotice('error', 'প্রফিট শতাংশ প্রয়োগ করতে সমস্যা হয়েছে।');
    } finally {
      setApplyingRate(false);
    }
  };

  // Change an individual investor's monthly profit status: Pending | Sent | Dry Period
  const handleStatusChangeForInvestorMonth = async (
    inv: Investment,
    newStatus: MonthlyProfitStatus
  ) => {
    if (!inv.id || !selectedProfitProject) return;
    const profitDocId = `${inv.id}_${profitMonth}`;
    const existingRecord = investmentProfits.find(
      r => r.id === profitDocId || (r.investmentId === inv.id && r.month === profitMonth)
    );

    const rateDoc = batchProfitRates.find(
      r =>
        r.projectId === inv.projectId &&
        r.batchId === (inv.batchId || profitBatchId) &&
        r.month === profitMonth
    );
    const pct =
      existingRecord?.profitPercentage ??
      rateDoc?.profitPercentage ??
      (parseFloat(batchPercentageInput) || 0);

    const customAmtStr = customProfitAmounts[inv.id];
    const baseCalculatedAmount =
      customAmtStr !== undefined && customAmtStr !== ''
        ? parseFloat(customAmtStr) || 0
        : existingRecord && existingRecord.status !== 'Dry Period'
        ? existingRecord.profitAmount
        : Math.round(((Number(inv.amount) || 0) * pct) / 100);

    // 1. Validate 12-Month Dry Period Rule if selecting 'Dry Period'
    if (newStatus === 'Dry Period') {
      const usage = getDryPeriodUsage(inv, profitMonth);
      if (usage.maxAllowed <= 0) {
        showProfitNotice(
          'error',
          `এই প্রোজেক্টে কোনো Dry Period অনুমোদিত নয় (Dry Period সীমা: ০ মাস)।`
        );
        return;
      }
      if (usage.otherUsedCount >= usage.maxAllowed) {
        showProfitNotice(
          'error',
          `ড্রাই পিরিয়ড সীমা পূর্ণ! "${selectedProfitProject.title}" প্রোজেক্টের সেটিংস অনুযায়ী প্রতি ১২ মাসে সর্বোচ্চ ${usage.maxAllowed} মাস Dry Period দেওয়া যাবে। ইনভেস্টর "${inv.investorName}"-কে ইতিমধ্যে ১২ মাসের সাইকেলে (${formatMonthLabel(usage.cycleStartYm)} – ${formatMonthLabel(usage.cycleEndYm)}) ${usage.otherUsedCount} বার Dry Period (${usage.otherUsedMonths.map(formatMonthLabel).join(', ')}) দেওয়া হয়েছে। ১২ মাস পূর্ণ হওয়ার আগে আর Dry Period দেওয়া যাবে না!`
        );
        return;
      }
    }

    setUpdatingProfitId(inv.id);
    try {
      const finalProfitAmount = newStatus === 'Dry Period' ? 0 : baseCalculatedAmount;
      const batchLabel =
        inv.batchName ||
        availableProfitBatches.find(b => b.id === inv.batchId)?.name ||
        'Batch 1';

      const payload: Omit<InvestmentProfitRecord, 'id'> = {
        investmentId: inv.id,
        investorUid: inv.investorUid || '',
        investorName: inv.investorName,
        investorPhone: inv.investorPhone || '',
        investorEmail: inv.investorEmail || '',
        projectId: inv.projectId,
        projectTitle: selectedProfitProject.title,
        batchId: inv.batchId || 'default_batch',
        batchName: batchLabel,
        month: profitMonth,
        investedAmount: Number(inv.amount) || 0,
        profitPercentage: pct,
        profitAmount: finalProfitAmount,
        status: newStatus,
        smsSentAt:
          newStatus === 'Sent' || newStatus === 'Dry Period'
            ? new Date().toISOString()
            : existingRecord?.smsSentAt || '',
        updatedAt: new Date().toISOString()
      };

      await setDoc(doc(db, 'investmentProfits', profitDocId), payload, { merge: true });
      await fetchProfitData();

      // Resolve investor phone (from investment or users collection)
      let investorPhone = inv.investorPhone || '';
      if (!investorPhone) {
        const uSnap = await findExistingUserDoc('', inv.investorEmail || '', inv.investorUid);
        if (uSnap) investorPhone = uSnap.data()?.phone || '';
      }

      if (newStatus === 'Sent') {
        const smsText = `সম্মানিত ${inv.investorName}, WeFarm-এর "${selectedProfitProject.title}" (${batchLabel}) প্রোজেক্টে আপনার ${formatMonthLabel(profitMonth)} মাসের লভ্যাংশ ৳${finalProfitAmount.toLocaleString()} প্রদান (Sent) করা হয়েছে। ধন্যবাদ।`;
        const smsOk = await sendAutomatedProfitSms(investorPhone, smsText);
        showProfitNotice(
          'success',
          `${inv.investorName}-এর ${formatMonthLabel(profitMonth)} মাসের প্রফিট (${formatCurrency(finalProfitAmount)}) "Sent" হিসেবে কনফার্ম করা হয়েছে ${
            smsOk ? 'এবং স্বয়ংক্রিয়ভাবে SMS পাঠানো হয়েছে!' : '(ফোন নম্বর না থাকায় বা গেটওয়ে ত্রুটিতে SMS যায়নি)।'
          }`
        );
      } else if (newStatus === 'Dry Period') {
        const usage = getDryPeriodUsage(inv, profitMonth);
        const newUsedCount = usage.otherUsedCount + 1;
        const smsText = `সম্মানিত ${inv.investorName}, WeFarm-এর "${selectedProfitProject.title}" (${batchLabel}) প্রোজেক্টে ${formatMonthLabel(profitMonth)} মাসটি আপনার বিনিয়োগের জন্য Dry Period হিসেবে নির্ধারিত হয়েছে (১২ মাসে ব্যবহৃত: ${newUsedCount}/${usage.maxAllowed} মাস)। এই মাসে প্রফিট প্রদেয় নয়। ধন্যবাদ।`;
        const smsOk = await sendAutomatedProfitSms(investorPhone, smsText);
        showProfitNotice(
          'success',
          `${inv.investorName}-এর ${formatMonthLabel(profitMonth)} মাসটি "Dry Period" (${newUsedCount}/${usage.maxAllowed} মাস) হিসেবে সেট করা হয়েছে ${
            smsOk ? 'এবং ইনভেস্টরকে অটোমেটিক SMS পাঠানো হয়েছে!' : '।'
          }`
        );
      } else {
        showProfitNotice(
          'success',
          `${inv.investorName}-এর ${formatMonthLabel(profitMonth)} মাসের প্রফিট স্ট্যাটাস "Pending" হিসেবে সংরক্ষিত হয়েছে।`
        );
      }
    } catch (err) {
      console.error('Error updating monthly profit status:', err);
      showProfitNotice('error', 'স্ট্যাটাস পরিবর্তন করতে সমস্যা হয়েছে।');
    } finally {
      setUpdatingProfitId(null);
    }
  };

  // Save custom edited profit amount for an investor in Pending state
  const handleSaveCustomProfitAmount = async (inv: Investment) => {
    if (!inv.id || !selectedProfitProject) return;
    const rawVal = customProfitAmounts[inv.id];
    if (rawVal === undefined) return;
    const newAmt = parseFloat(rawVal) || 0;
    const profitDocId = `${inv.id}_${profitMonth}`;
    const existingRecord = investmentProfits.find(
      r => r.id === profitDocId || (r.investmentId === inv.id && r.month === profitMonth)
    );
    const pct = existingRecord?.profitPercentage ?? (parseFloat(batchPercentageInput) || 0);
    const batchLabel =
      inv.batchName ||
      availableProfitBatches.find(b => b.id === inv.batchId)?.name ||
      'Batch 1';

    setUpdatingProfitId(inv.id);
    try {
      const payload: Omit<InvestmentProfitRecord, 'id'> = {
        investmentId: inv.id,
        investorUid: inv.investorUid || '',
        investorName: inv.investorName,
        investorPhone: inv.investorPhone || '',
        investorEmail: inv.investorEmail || '',
        projectId: inv.projectId,
        projectTitle: selectedProfitProject.title,
        batchId: inv.batchId || 'default_batch',
        batchName: batchLabel,
        month: profitMonth,
        investedAmount: Number(inv.amount) || 0,
        profitPercentage: pct,
        profitAmount: newAmt,
        status: existingRecord?.status === 'Sent' ? 'Sent' : 'Pending',
        updatedAt: new Date().toISOString()
      };
      await setDoc(doc(db, 'investmentProfits', profitDocId), payload, { merge: true });
      await fetchProfitData();
      showProfitNotice('success', `${inv.investorName}-এর প্রফিট এমাউন্ট ৳${newAmt} সংরক্ষিত হয়েছে।`);
    } catch (err) {
      console.error(err);
      showProfitNotice('error', 'প্রফিট এমাউন্ট সংরক্ষণ করতে সমস্যা হয়েছে।');
    } finally {
      setUpdatingProfitId(null);
    }
  };

  const totalInvested = investments.reduce((sum, inv) => sum + (Number(inv.amount) || 0), 0);

  const renderKycTabs = (
    activeTab: 'investment' | 'personal' | 'contact' | 'bank' | 'nominee',
    setTab: (t: 'investment' | 'personal' | 'contact' | 'bank' | 'nominee') => void
  ) => (
    <div className="flex gap-1.5 overflow-x-auto pb-3 mb-5 border-b border-gray-100">
      {([
        { id: 'investment', label: '১. বিনিয়োগ, ব্যাচ ও প্রফিট মাস' },
        { id: 'personal', label: '২. ব্যক্তিগত তথ্য (KYC)' },
        { id: 'contact', label: '৩. ঠিকানা ও পেশা' },
        { id: 'bank', label: '৪. ব্যাংক তথ্য' },
        { id: 'nominee', label: '৫. নমিনির তথ্য' }
      ] as const).map(t => (
        <button
          key={t.id}
          type="button"
          onClick={() => setTab(t.id)}
          className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
            activeTab === t.id
              ? 'bg-green-600 text-white shadow-sm'
              : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
          }`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );

  const renderKycFields = (
    formState: typeof addFormData,
    setFormState: React.Dispatch<React.SetStateAction<typeof addFormData>>,
    activeTab: 'investment' | 'personal' | 'contact' | 'bank' | 'nominee',
    mode: 'add' | 'edit'
  ) => {
    if (activeTab === 'personal') {
      return (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">পিতার নাম (Father's Name)</label>
              <input
                type="text"
                value={formState.investorProfile.fatherName || ''}
                onChange={(e) =>
                  setFormState({
                    ...formState,
                    investorProfile: { ...formState.investorProfile, fatherName: e.target.value }
                  })
                }
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:bg-white focus:border-green-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">মাতার নাম (Mother's Name)</label>
              <input
                type="text"
                value={formState.investorProfile.motherName || ''}
                onChange={(e) =>
                  setFormState({
                    ...formState,
                    investorProfile: { ...formState.investorProfile, motherName: e.target.value }
                  })
                }
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:bg-white focus:border-green-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">জন্ম তারিখ (Date of Birth)</label>
              <input
                type="date"
                value={formState.investorProfile.dob || ''}
                onChange={(e) =>
                  setFormState({
                    ...formState,
                    investorProfile: { ...formState.investorProfile, dob: e.target.value }
                  })
                }
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:bg-white focus:border-green-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">লিঙ্গ (Gender)</label>
              <select
                value={formState.investorProfile.gender || ''}
                onChange={(e) =>
                  setFormState({
                    ...formState,
                    investorProfile: { ...formState.investorProfile, gender: e.target.value }
                  })
                }
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:bg-white focus:border-green-500"
              >
                <option value="">Select Gender</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">NID / Passport Number</label>
              <input
                type="text"
                value={formState.investorProfile.nidPassport || ''}
                onChange={(e) =>
                  setFormState({
                    ...formState,
                    investorProfile: { ...formState.investorProfile, nidPassport: e.target.value }
                  })
                }
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:bg-white focus:border-green-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">জরুরি যোগাযোগের নম্বর (Emergency Phone)</label>
              <input
                type="tel"
                value={formState.investorProfile.emergencyPhone || ''}
                onChange={(e) =>
                  setFormState({
                    ...formState,
                    investorProfile: { ...formState.investorProfile, emergencyPhone: e.target.value }
                  })
                }
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:bg-white focus:border-green-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">NID Card Attachment</label>
            <label className="block cursor-pointer">
              <div
                className={`flex items-center justify-center space-x-2 px-4 py-3 rounded-xl border-2 border-dashed transition-all ${
                  formState.investorProfile.nidFileUrl
                    ? 'bg-green-50 border-green-300 text-green-700'
                    : 'bg-gray-50 border-gray-200 text-gray-500 hover:border-green-400'
                }`}
              >
                {uploadingFile === 'nid' ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-600"></div>
                ) : formState.investorProfile.nidFileUrl ? (
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                ) : (
                  <Upload className="h-4 w-4" />
                )}
                <span className="text-xs font-bold">
                  {uploadingFile === 'nid'
                    ? 'Uploading...'
                    : formState.investorProfile.nidFileUrl
                    ? 'NID Card ফাইল সংযুক্ত হয়েছে'
                    : 'NID Card ফাইল আপলোড করুন'}
                </span>
              </div>
              <input
                type="file"
                className="hidden"
                accept="image/*,.pdf"
                onChange={(e) => handleFileUpload(e, 'nidFileUrl', mode)}
              />
            </label>
          </div>
        </div>
      );
    }

    if (activeTab === 'contact') {
      return (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">বর্তমান ঠিকানা (Current Address)</label>
              <textarea
                rows={2}
                value={formState.investorProfile.currentAddress || ''}
                onChange={(e) =>
                  setFormState({
                    ...formState,
                    investorProfile: { ...formState.investorProfile, currentAddress: e.target.value }
                  })
                }
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:bg-white focus:border-green-500 resize-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">স্থায়ী ঠিকানা (Permanent Address)</label>
              <textarea
                rows={2}
                value={formState.investorProfile.permanentAddress || ''}
                onChange={(e) =>
                  setFormState({
                    ...formState,
                    investorProfile: { ...formState.investorProfile, permanentAddress: e.target.value }
                  })
                }
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:bg-white focus:border-green-500 resize-none"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">পেশা (Occupation)</label>
              <input
                type="text"
                value={formState.investorProfile.occupation || ''}
                onChange={(e) =>
                  setFormState({
                    ...formState,
                    investorProfile: { ...formState.investorProfile, occupation: e.target.value }
                  })
                }
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:bg-white focus:border-green-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">প্রতিষ্ঠান (Organization)</label>
              <input
                type="text"
                value={formState.investorProfile.organization || ''}
                onChange={(e) =>
                  setFormState({
                    ...formState,
                    investorProfile: { ...formState.investorProfile, organization: e.target.value }
                  })
                }
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:bg-white focus:border-green-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">পদবী (Designation)</label>
              <input
                type="text"
                value={formState.investorProfile.designation || ''}
                onChange={(e) =>
                  setFormState({
                    ...formState,
                    investorProfile: { ...formState.investorProfile, designation: e.target.value }
                  })
                }
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:bg-white focus:border-green-500"
              />
            </div>
          </div>
        </div>
      );
    }

    if (activeTab === 'bank') {
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">ব্যাংকের নাম (Bank Name)</label>
            <input
              type="text"
              value={formState.investorProfile.bankName || ''}
              onChange={(e) =>
                setFormState({
                  ...formState,
                  investorProfile: { ...formState.investorProfile, bankName: e.target.value }
                })
              }
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:bg-white focus:border-green-500"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">শাখা (Branch Name)</label>
            <input
              type="text"
              value={formState.investorProfile.branchName || ''}
              onChange={(e) =>
                setFormState({
                  ...formState,
                  investorProfile: { ...formState.investorProfile, branchName: e.target.value }
                })
              }
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:bg-white focus:border-green-500"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">অ্যাকাউন্টের নাম (Account Name)</label>
            <input
              type="text"
              value={formState.investorProfile.accountName || ''}
              onChange={(e) =>
                setFormState({
                  ...formState,
                  investorProfile: { ...formState.investorProfile, accountName: e.target.value }
                })
              }
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:bg-white focus:border-green-500"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">অ্যাকাউন্ট নম্বর (Account Number)</label>
            <input
              type="text"
              value={formState.investorProfile.accountNumber || ''}
              onChange={(e) =>
                setFormState({
                  ...formState,
                  investorProfile: { ...formState.investorProfile, accountNumber: e.target.value }
                })
              }
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:bg-white focus:border-green-500"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">রাউটিং নম্বর (Routing Number)</label>
            <input
              type="text"
              value={formState.investorProfile.routingNumber || ''}
              onChange={(e) =>
                setFormState({
                  ...formState,
                  investorProfile: { ...formState.investorProfile, routingNumber: e.target.value }
                })
              }
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:bg-white focus:border-green-500"
            />
          </div>
        </div>
      );
    }

    if (activeTab === 'nominee') {
      return (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">নমিনির নাম (Nominee Name)</label>
              <input
                type="text"
                value={formState.investorProfile.nomineeName || ''}
                onChange={(e) =>
                  setFormState({
                    ...formState,
                    investorProfile: { ...formState.investorProfile, nomineeName: e.target.value }
                  })
                }
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:bg-white focus:border-green-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">সম্পর্ক (Relation)</label>
              <input
                type="text"
                value={formState.investorProfile.nomineeRelation || ''}
                onChange={(e) =>
                  setFormState({
                    ...formState,
                    investorProfile: { ...formState.investorProfile, nomineeRelation: e.target.value }
                  })
                }
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:bg-white focus:border-green-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">নমিনির ফোন নম্বর (Nominee Phone)</label>
              <input
                type="tel"
                value={formState.investorProfile.nomineePhone || ''}
                onChange={(e) =>
                  setFormState({
                    ...formState,
                    investorProfile: { ...formState.investorProfile, nomineePhone: e.target.value }
                  })
                }
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:bg-white focus:border-green-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">নমিনির NID (Nominee NID)</label>
              <input
                type="text"
                value={formState.investorProfile.nomineeNid || ''}
                onChange={(e) =>
                  setFormState({
                    ...formState,
                    investorProfile: { ...formState.investorProfile, nomineeNid: e.target.value }
                  })
                }
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:bg-white focus:border-green-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">নমিনির NID কপি আপলোড</label>
            <label className="block cursor-pointer">
              <div
                className={`flex items-center justify-center space-x-2 px-4 py-3 rounded-xl border-2 border-dashed transition-all ${
                  formState.investorProfile.nomineeNidFileUrl
                    ? 'bg-green-50 border-green-300 text-green-700'
                    : 'bg-gray-50 border-gray-200 text-gray-500 hover:border-green-400'
                }`}
              >
                {uploadingFile === 'nomineeNid' ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-600"></div>
                ) : formState.investorProfile.nomineeNidFileUrl ? (
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                ) : (
                  <Upload className="h-4 w-4" />
                )}
                <span className="text-xs font-bold">
                  {uploadingFile === 'nomineeNid'
                    ? 'Uploading...'
                    : formState.investorProfile.nomineeNidFileUrl
                    ? 'Nominee NID ফাইল সংযুক্ত হয়েছে'
                    : 'Nominee NID ফাইল আপলোড করুন'}
                </span>
              </div>
              <input
                type="file"
                className="hidden"
                accept="image/*,.pdf"
                onChange={(e) => handleFileUpload(e, 'nomineeNidFileUrl', mode)}
              />
            </label>
          </div>
        </div>
      );
    }

    return null;
  };

  // Render Project + Batch + ProfitStartMonth selector inside Add/Edit Investment modals (supports multiple investments via "+ Add Investment")
  const renderProjectBatchAndMonthFields = <
    T extends {
      projectId: string;
      projectTitle: string;
      batchId: string;
      batchName: string;
      profitStartMonth: string;
      amount: string;
      date: string;
      investmentEntries: InvestmentEntryFormItem[];
    }
  >(
    formState: T,
    setFormState: React.Dispatch<React.SetStateAction<T>>
  ) => {
    const entries: InvestmentEntryFormItem[] =
      formState.investmentEntries && formState.investmentEntries.length > 0
        ? formState.investmentEntries
        : [
            {
              tempId: 'default_0',
              projectId: formState.projectId,
              projectTitle: formState.projectTitle,
              batchId: formState.batchId,
              batchName: formState.batchName,
              profitStartMonth: formState.profitStartMonth || getCurrentYearMonth(),
              amount: formState.amount,
              date: formState.date || new Date().toISOString().split('T')[0]
            }
          ];

    const syncEntriesToState = (nextEntries: InvestmentEntryFormItem[]) => {
      const first = nextEntries[0] || createDefaultInvestmentEntry(projects);
      setFormState(prev => ({
        ...prev,
        projectId: first.projectId,
        projectTitle: first.projectTitle,
        batchId: first.batchId,
        batchName: first.batchName,
        profitStartMonth: first.profitStartMonth,
        amount: first.amount,
        date: first.date,
        investmentEntries: nextEntries
      }));
    };

    const handleUpdateEntry = (index: number, patch: Partial<InvestmentEntryFormItem>) => {
      const next = entries.map((item, idx) => (idx === index ? { ...item, ...patch } : item));
      syncEntriesToState(next);
    };

    const handleAddEntry = () => {
      const lastEntry = entries[entries.length - 1];
      const baseProj = projects.find(p => p.id === lastEntry?.projectId) || projects[0];
      const openBatch =
        baseProj?.batches?.find(b => b.id === lastEntry?.batchId && b.status === 'Open') ||
        baseProj?.batches?.find(b => b.status === 'Open') ||
        baseProj?.batches?.[0];

      const newEntry: InvestmentEntryFormItem = {
        tempId: `entry_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        projectId: baseProj?.id || '',
        projectTitle: baseProj?.title || '',
        batchId: openBatch?.id || '',
        batchName: openBatch?.name || '',
        profitStartMonth: getCurrentYearMonth(),
        amount: '',
        date: new Date().toISOString().split('T')[0]
      };

      syncEntriesToState([...entries, newEntry]);
    };

    const handleRemoveEntry = (index: number) => {
      if (entries.length <= 1) return;
      const next = entries.filter((_, idx) => idx !== index);
      syncEntriesToState(next);
    };

    const totalEntriesAmount = entries.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);

    return (
      <div className="space-y-4">
        {/* Header bar with "+ Add Investment" button */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-gray-100">
          <div>
            <h4 className="text-xs font-extrabold text-gray-800 uppercase tracking-wider flex items-center space-x-2">
              <Layers className="h-4 w-4 text-green-600" />
              <span>ইনভেস্টমেন্টসমূহ ({entries.length} টি)</span>
              {totalEntriesAmount > 0 && (
                <span className="px-2.5 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-200 text-[11px] font-extrabold">
                  মোট: {formatCurrency(totalEntriesAmount)}
                </span>
              )}
            </h4>
            <p className="text-[11px] text-gray-500 mt-0.5">
              একই প্রোজেক্টের একই ব্যাচে বা ভিন্ন ব্যাচে বিভিন্ন সময়ে একাধিক ইনভেস্টমেন্ট যুক্ত করতে পারবেন।
            </p>
          </div>

          <button
            type="button"
            onClick={handleAddEntry}
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-green-600 hover:bg-green-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Add Investment</span>
          </button>
        </div>

        {/* List of Investment Entries */}
        <div className="space-y-4">
          {entries.map((entry, idx) => {
            const selectedProj = projects.find(p => p.id === entry.projectId);
            const batches = selectedProj?.batches || [];
            const isMonthlyProject = selectedProj ? (selectedProj.profitType || 'monthly') === 'monthly' : false;
            const isNewUnsaved = !entry.id;

            return (
              <div
                key={entry.tempId || idx}
                className={`p-4 rounded-2xl border transition-all space-y-4 ${
                  isNewUnsaved && entries.length > 1
                    ? 'bg-emerald-50/30 border-emerald-200 shadow-sm'
                    : 'bg-white border-gray-200/80 shadow-xs'
                }`}
              >
                <div className="flex items-center justify-between border-b border-gray-100 pb-2.5">
                  <div className="flex items-center space-x-2">
                    <span className="px-2.5 py-1 rounded-lg bg-green-100 text-green-800 text-xs font-extrabold">
                      Investment #{idx + 1}
                    </span>
                    {entry.id ? (
                      <span className="text-[11px] font-bold text-gray-500">
                        সংরক্ষিত ইনভেস্টমেন্ট (Existing)
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-md bg-emerald-600 text-white text-[10px] font-bold">
                        নতুন ইনভেস্টমেন্ট (New)
                      </span>
                    )}
                  </div>

                  {entries.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveEntry(idx)}
                      className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs font-bold text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                      title="এই ইনভেস্টমেন্টটি মুছে ফেলুন"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span>Remove</span>
                    </button>
                  )}
                </div>

                {/* Row 1: SELECT PROJECT & SELECT BATCH */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">
                      প্রোজেক্ট নির্বাচন করুন (SELECT PROJECT) *
                    </label>
                    <select
                      value={entry.projectId}
                      onChange={(e) => {
                        const newProjId = e.target.value;
                        const projObj = projects.find(p => p.id === newProjId);
                        const firstOpenBatch =
                          projObj?.batches?.find(b => b.status === 'Open') || projObj?.batches?.[0];
                        handleUpdateEntry(idx, {
                          projectId: newProjId,
                          projectTitle: projObj ? projObj.title : entry.projectTitle,
                          batchId: firstOpenBatch ? firstOpenBatch.id : '',
                          batchName: firstOpenBatch ? firstOpenBatch.name : ''
                        });
                      }}
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all"
                    >
                      <option value="">-- Custom / Unassigned --</option>
                      {projects.map(proj => (
                        <option key={proj.id} value={proj.id}>
                          {proj.title} ({(proj.profitType || 'monthly') === 'monthly' ? 'মাসিক লভ্যাংশ' : 'এককালীন'})
                        </option>
                      ))}
                    </select>
                  </div>

                  {selectedProj ? (
                    <div>
                      <label className="block text-xs font-bold text-green-700 uppercase mb-1.5">
                        ব্যাচ নির্বাচন করুন (SELECT BATCH) *
                      </label>
                      {batches.length > 0 ? (
                        <select
                          value={entry.batchId}
                          onChange={(e) => {
                            const bObj = batches.find(b => b.id === e.target.value);
                            handleUpdateEntry(idx, {
                              batchId: e.target.value,
                              batchName: bObj ? bObj.name : ''
                            });
                          }}
                          required
                          className="w-full px-4 py-2.5 bg-green-50/40 border border-green-300 rounded-xl text-sm font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all"
                        >
                          <option value="">-- ব্যাচ নির্বাচন করুন --</option>
                          {batches.map(b => (
                            <option key={b.id} value={b.id} disabled={!entry.id && b.status === 'Closed'}>
                              {b.name} — {b.status === 'Open' ? 'Open (চালু)' : 'Closed (বন্ধ)'}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <div className="px-4 py-2.5 bg-gray-100 border border-gray-200 rounded-xl text-xs font-bold text-gray-600">
                          Batch 1 (Default Open Batch)
                        </div>
                      )}
                      <p className="text-[10px] text-gray-500 mt-1">
                        একজন ইনভেস্টর একই প্রোজেক্টের একাধিক ব্যাচে আলাদাভাবে ইনভেস্ট করতে পারবেন।
                      </p>
                    </div>
                  ) : (
                    <div>
                      <label className="block text-xs font-bold text-gray-400 uppercase mb-1.5">
                        Custom Project Title
                      </label>
                      <input
                        type="text"
                        value={entry.projectTitle}
                        onChange={(e) => handleUpdateEntry(idx, { projectTitle: e.target.value })}
                        placeholder="e.g. General Fund"
                        disabled={!!entry.projectId}
                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all disabled:opacity-50"
                      />
                    </div>
                  )}
                </div>

                {/* Row 2: INVESTMENT AMOUNT (৳), INVESTMENT DATE (তারিখ), and কোন মাস থেকে প্রফিট পাবে? */}
                <div className={`grid grid-cols-1 ${isMonthlyProject ? 'md:grid-cols-3' : 'md:grid-cols-2'} gap-4`}>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">
                      INVESTMENT AMOUNT (৳) *
                    </label>
                    <input
                      type="number"
                      required
                      value={entry.amount}
                      onChange={(e) => handleUpdateEntry(idx, { amount: e.target.value })}
                      placeholder="0.00"
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">
                      INVESTMENT DATE (তারিখ) *
                    </label>
                    <input
                      type="date"
                      required
                      value={entry.date}
                      onChange={(e) => {
                        const newDate = e.target.value;
                        handleUpdateEntry(idx, {
                          date: newDate,
                          profitStartMonth: entry.profitStartMonth || (newDate ? newDate.slice(0, 7) : getCurrentYearMonth())
                        });
                      }}
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all"
                    />
                  </div>

                  {isMonthlyProject && (
                    <div>
                      <label className="block text-xs font-bold text-emerald-700 uppercase mb-1.5">
                        কোন মাস থেকে প্রফিট পাবে? *
                      </label>
                      <input
                        type="month"
                        required
                        value={entry.profitStartMonth}
                        onChange={(e) => handleUpdateEntry(idx, { profitStartMonth: e.target.value })}
                        className="w-full px-4 py-2.5 bg-emerald-50/60 border border-emerald-300 rounded-xl text-sm font-bold text-emerald-950 focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all"
                      />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom "+ Add Investment" button */}
        <button
          type="button"
          onClick={handleAddEntry}
          className="w-full py-3 border-2 border-dashed border-green-300 hover:border-green-500 bg-green-50/40 hover:bg-green-50 text-green-700 rounded-2xl text-xs font-extrabold transition-all flex items-center justify-center space-x-2 cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          <span>+ Add Investment (নতুন আরেকটি ইনভেস্টমেন্ট যুক্ত করুন)</span>
        </button>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Investment & Profit Management</h1>
          <p className="text-gray-500 text-sm">
            ব্যাচ ওয়াইজ ইনভেস্টমেন্ট এন্ট্রি, মাসিক লভ্যাংশ হিসাব, এবং Dry Period ও অটোমেটিক SMS ব্যবস্থাপনা।
          </p>
        </div>
        <div className="bg-green-50 px-6 py-3 rounded-2xl border border-green-100 self-start sm:self-auto">
          <div className="text-xs font-bold text-green-600 uppercase tracking-wider mb-1">Total Funding</div>
          <div className="text-xl font-bold text-green-700">{formatCurrency(totalInvested)}</div>
        </div>
      </div>

      {/* Top-Level Page Tab Switcher */}
      <div className="flex flex-wrap gap-2 bg-white p-1.5 rounded-2xl border border-gray-100 shadow-sm">
        <button
          type="button"
          onClick={() => setActivePageTab('investments')}
          className={`flex-1 sm:flex-initial flex items-center justify-center space-x-2 px-5 py-3 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
            activePageTab === 'investments'
              ? 'bg-green-600 text-white shadow-sm'
              : 'text-gray-600 hover:bg-gray-50'
          }`}
        >
          <Layers className="h-4 w-4" />
          <span>বিনিয়োগ তালিকা ও ব্যাচ এন্ট্রি ({investments.length})</span>
        </button>
        <button
          type="button"
          onClick={() => setActivePageTab('monthly_profit')}
          className={`flex-1 sm:flex-initial flex items-center justify-center space-x-2 px-5 py-3 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
            activePageTab === 'monthly_profit'
              ? 'bg-emerald-700 text-white shadow-sm'
              : 'text-gray-600 hover:bg-gray-50'
          }`}
        >
          <Calculator className="h-4 w-4" />
          <span>মাসিক প্রফিট ও Dry Period ব্যবস্থাপনা</span>
        </button>
      </div>

      {pageBanner && (
        <div
          className={`p-4 rounded-2xl border flex items-center space-x-3 text-sm font-bold ${
            pageBanner.type === 'success'
              ? 'bg-green-50 border-green-200 text-green-800'
              : 'bg-red-50 border-red-200 text-red-700'
          }`}
        >
          {pageBanner.type === 'success' ? (
            <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
          ) : (
            <AlertCircle className="h-5 w-5 text-red-600 shrink-0" />
          )}
          <span>{pageBanner.text}</span>
        </div>
      )}

      {activePageTab === 'investments' ? (
        <>
          <div className="flex flex-wrap items-center justify-between gap-4 bg-gray-50 p-4 rounded-2xl border border-gray-100">
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => {
                  setAddInvestorMode('manual');
                  setSelectedAdminUid('');
                  const defaultEntry = createDefaultInvestmentEntry(projects);
                  setAddFormData({
                    investorName: '',
                    investorEmail: '',
                    investorPhone: '',
                    projectId: defaultEntry.projectId,
                    projectTitle: defaultEntry.projectTitle,
                    batchId: defaultEntry.batchId,
                    batchName: defaultEntry.batchName,
                    profitStartMonth: defaultEntry.profitStartMonth,
                    amount: '',
                    date: defaultEntry.date,
                    investmentEntries: [defaultEntry],
                    investorProfile: { ...emptyKycProfile }
                  });
                  setModalTab('investment');
                  setIsAddModalOpen(true);
                }}
                className="flex items-center space-x-2 bg-green-600 hover:bg-green-700 text-white font-bold px-4 py-2.5 rounded-xl transition-all shadow-sm text-sm cursor-pointer"
              >
                <UserPlus className="h-4 w-4" />
                <span>Add Investor Manually</span>
              </button>

              <button
                onClick={() => {
                  setAddInvestorMode('admin');
                  setModalTab('investment');
                  const defaultEntry = createDefaultInvestmentEntry(projects);
                  setAddFormData(prev => ({
                    ...prev,
                    investmentEntries: [defaultEntry]
                  }));
                  if (adminUsers.length > 0) {
                    applyAdminProfileToForm(adminUsers[0]);
                  } else {
                    setSelectedAdminUid('');
                  }
                  setIsAddModalOpen(true);
                }}
                className="flex items-center space-x-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 font-bold px-4 py-2.5 rounded-xl transition-all shadow-sm text-sm cursor-pointer"
              >
                <Shield className="h-4 w-4 text-emerald-700" />
                <span>Add Admin as Investor</span>
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

          {/* Enhanced Search, Project Filter & Profit Month Filter Bar */}
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
              {/* Search Field */}
              <div className="md:col-span-5 relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by Investor ID (e.g. INV-001), Name, Phone, Email..."
                  value={invSearchTerm}
                  onChange={(e) => setInvSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs sm:text-sm focus:bg-white focus:ring-2 focus:ring-green-500 outline-none"
                />
                {invSearchTerm && (
                  <button
                    onClick={() => setInvSearchTerm('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-gray-600"
                  >
                    Clear
                  </button>
                )}
              </div>

              {/* Project Filter */}
              <div className="md:col-span-4">
                <div className="relative">
                  <Target className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <select
                    value={filterProjectId}
                    onChange={(e) => setFilterProjectId(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs sm:text-sm font-semibold text-gray-700 focus:bg-white focus:ring-2 focus:ring-green-500 outline-none cursor-pointer"
                  >
                    <option value="all">All Projects (সকল প্রোজেক্ট - {investments.length})</option>
                    {projects.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.title} ({investments.filter(i => i.projectId === p.id).length})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Profit Month Filter Field */}
              <div className="md:col-span-3">
                <div className="relative flex items-center">
                  <CalendarClock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-600 pointer-events-none" />
                  <input
                    type="month"
                    value={filterProfitMonth}
                    onChange={(e) => {
                      setFilterProfitMonth(e.target.value);
                      if (e.target.value) setOnlyProfitEligible(true);
                    }}
                    title="Filter by profit eligibility month"
                    className={`w-full pl-9 pr-3 py-2 bg-gray-50 border rounded-xl text-xs font-bold focus:bg-white focus:ring-2 outline-none cursor-pointer ${
                      filterProfitMonth ? 'border-emerald-400 text-emerald-900 bg-emerald-50/40 ring-1 ring-emerald-300' : 'border-gray-200 text-gray-700 focus:ring-green-500'
                    }`}
                  />
                  {filterProfitMonth && (
                    <button
                      type="button"
                      onClick={() => {
                        setFilterProfitMonth('');
                        setOnlyProfitEligible(false);
                      }}
                      className="absolute right-2 text-xs text-gray-400 hover:text-red-600 font-bold px-1"
                      title="Clear Month Filter"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Profit Month Quick Actions & Filter Pills */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-gray-100 text-xs">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-gray-400 font-bold uppercase text-[10px] tracking-wider">
                  Quick Month Filter:
                </span>
                <button
                  type="button"
                  onClick={() => {
                    const currentYm = getCurrentYearMonth();
                    setFilterProfitMonth(currentYm);
                    setOnlyProfitEligible(true);
                  }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all border ${
                    filterProfitMonth === getCurrentYearMonth()
                      ? 'bg-emerald-600 text-white border-emerald-700'
                      : 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                  }`}
                >
                  চলতি মাস ({formatMonthLabel(getCurrentYearMonth())})
                </button>

                {filterProfitMonth && (
                  <button
                    type="button"
                    onClick={() => setOnlyProfitEligible(!onlyProfitEligible)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all border ${
                      onlyProfitEligible
                        ? 'bg-emerald-700 text-white border-emerald-800 shadow-xs'
                        : 'bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-200'
                    }`}
                  >
                    {onlyProfitEligible
                      ? `✓ শুধুমাত্র ${formatMonthLabel(filterProfitMonth)} এ প্রফিট প্রাপ্যরা (Filtered)`
                      : `সকল বিনিয়োগসহ দেখুন`}
                  </button>
                )}

                {selectedInvestorIdFilter && (
                  <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-indigo-100 text-indigo-800 border border-indigo-200">
                    <span>Investor: {selectedInvestorIdFilter}</span>
                    <button
                      type="button"
                      onClick={() => setSelectedInvestorIdFilter(null)}
                      className="ml-1 text-indigo-600 hover:text-indigo-900 font-bold"
                    >
                      ✕
                    </button>
                  </span>
                )}
              </div>

              {(invSearchTerm || filterProjectId !== 'all' || filterProfitMonth || selectedInvestorIdFilter) && (
                <button
                  type="button"
                  onClick={() => {
                    setInvSearchTerm('');
                    setFilterProjectId('all');
                    setFilterProfitMonth('');
                    setOnlyProfitEligible(false);
                    setSelectedInvestorIdFilter(null);
                  }}
                  className="text-xs font-bold text-red-600 hover:underline"
                >
                  Reset All Filters
                </button>
              )}
            </div>

            {/* Profit Eligibility Highlight Banner when month is chosen */}
            {filterProfitMonth && (
              <div className="p-3 bg-emerald-50/80 rounded-xl border border-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                <div className="flex items-center space-x-2 text-emerald-900">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>
                    <strong>{formatMonthLabel(filterProfitMonth)}</strong> মাসে মোট{' '}
                    <strong className="text-emerald-800 font-extrabold text-sm">
                      {investments.filter(inv => {
                        const p = projects.find(x => x.id === inv.projectId);
                        return (p?.profitType || 'monthly') === 'monthly' && isEligibleForMonth(inv, filterProfitMonth);
                      }).length}
                    </strong>{' '}
                    জন ইনভেস্টর প্রফিট পাওয়ার উপযুক্ত (প্রোজেক্ট সেটিংস অনুযায়ী)।
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setProfitMonth(filterProfitMonth);
                    setActivePageTab('monthly_profit');
                  }}
                  className="self-start sm:self-auto px-3 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-[11px] font-bold transition-all whitespace-nowrap shadow-xs"
                >
                  মাসিক প্রফিট ও SMS ম্যানেজারে যান &rarr;
                </button>
              </div>
            )}
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="px-4 py-4 text-center w-12">
                      <input
                        type="checkbox"
                        checked={filteredInvestments.length > 0 && selectedInvIds.length === filteredInvestments.length}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedInvIds(filteredInvestments.map(inv => inv.id!));
                          } else {
                            setSelectedInvIds([]);
                          }
                        }}
                        className="rounded text-green-600 focus:ring-green-500 cursor-pointer h-4 w-4"
                      />
                    </th>
                    <th className="px-4 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Investor ID</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Investor Details</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Project & Batch</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Date & Profit Start</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Amount</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto"></div>
                      </td>
                    </tr>
                  ) : filteredInvestments.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                        {invSearchTerm || filterProjectId !== 'all' || filterProfitMonth || selectedInvestorIdFilter ? (
                          <div>
                            <p className="font-semibold text-gray-700">কোনো বিনিয়োগ এই ফিল্টারের সাথে মিলেনি।</p>
                            <button
                              onClick={() => {
                                setInvSearchTerm('');
                                setFilterProjectId('all');
                                setFilterProfitMonth('');
                                setOnlyProfitEligible(false);
                                setSelectedInvestorIdFilter(null);
                              }}
                              className="mt-2 text-xs font-bold text-green-600 hover:underline"
                            >
                              সকল ফিল্টার রিসেট করুন
                            </button>
                          </div>
                        ) : (
                          'No investments recorded yet.'
                        )}
                      </td>
                    </tr>
                  ) : (
                    filteredInvestments.map(inv => {
                      const projObj = projects.find(p => p.id === inv.projectId);
                      const isMonthly = projObj ? (projObj.profitType || 'monthly') === 'monthly' : Boolean(inv.profitStartMonth);
                      const investorKey = getInvestorKey(inv);
                      const invIdObj = investorIdMap.get(investorKey);
                      const startYm = getEffectiveStartMonth(inv);
                      const isProfitEligibleInSelected = filterProfitMonth ? (isMonthly && isEligibleForMonth(inv, filterProfitMonth)) : false;

                      return (
                        <tr
                          key={inv.id}
                          className="hover:bg-gray-50 transition-colors cursor-pointer"
                          onClick={() => handleViewInvestor(inv)}
                        >
                          <td className="px-4 py-4 text-center w-12" onClick={(e) => e.stopPropagation()}>
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

                          {/* Investor ID Column */}
                          <td className="px-4 py-4" onClick={(e) => e.stopPropagation()}>
                            <div className="flex flex-col items-start space-y-1">
                              <button
                                type="button"
                                onClick={() => setSelectedInvestorIdFilter(prev => prev === invIdObj?.id ? null : (invIdObj?.id || null))}
                                className={`font-mono text-xs font-extrabold px-2 py-0.5 rounded-lg border transition-all ${
                                  selectedInvestorIdFilter === invIdObj?.id
                                    ? 'bg-indigo-600 text-white border-indigo-700 shadow-xs'
                                    : 'bg-gray-100 hover:bg-indigo-50 text-gray-800 hover:text-indigo-700 border-gray-200'
                                }`}
                                title="Click to filter all investments by this investor ID"
                              >
                                {invIdObj?.id || 'INV-001'}
                              </button>
                              {invIdObj && invIdObj.count > 1 && (
                                <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.2 rounded border border-indigo-100 whitespace-nowrap">
                                  {invIdObj.count} investments
                                </span>
                              )}
                            </div>
                          </td>

                          <td className="px-6 py-4">
                            <div className="flex items-center space-x-3">
                              <div className="w-8 h-8 bg-amber-50 rounded-lg flex items-center justify-center shrink-0">
                                <User className="h-4 w-4 text-amber-600" />
                              </div>
                              <div>
                                <div className="font-bold text-gray-900 flex items-center space-x-1.5">
                                  <span>{inv.investorName}</span>
                                  {adminUsers.some(
                                    (a) =>
                                      (inv.investorUid && a.uid === inv.investorUid) ||
                                      (a.email &&
                                        inv.investorEmail &&
                                        a.email.toLowerCase() === inv.investorEmail.toLowerCase())
                                  ) && (
                                    <span className="px-2 py-0.5 text-[9px] font-bold uppercase rounded-full bg-emerald-100 text-emerald-800">
                                      Admin
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center space-x-2 text-xs text-gray-500">
                                  {inv.investorPhone && (
                                    <span className="text-green-700 font-semibold">{inv.investorPhone}</span>
                                  )}
                                  {inv.investorEmail && <span>{inv.investorEmail}</span>}
                                </div>
                              </div>
                            </div>
                          </td>

                          <td className="px-6 py-4">
                            <div className="space-y-1">
                              <div className="flex items-center space-x-2">
                                <Target className="h-4 w-4 text-blue-500 shrink-0" />
                                <span className="text-sm font-bold text-gray-900">{inv.projectTitle}</span>
                              </div>
                              <div className="flex flex-wrap items-center gap-1.5 pl-6">
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
                          </td>

                          <td className="px-6 py-4">
                            <div className="text-sm text-gray-700 font-medium">{formatDate(inv.date)}</div>
                            {isMonthly && (
                              <div className="text-[11px] font-bold text-emerald-700 mt-0.5 flex items-center space-x-1">
                                <CalendarClock className="h-3 w-3" />
                                <span>প্রফিট শুরু: {formatMonthLabel(startYm)}</span>
                              </div>
                            )}
                            {filterProfitMonth && (
                              <div className="mt-1">
                                {isProfitEligibleInSelected ? (
                                  <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                    <Check className="h-3 w-3 text-emerald-600" />
                                    <span>{formatMonthLabel(filterProfitMonth)} এ প্রফিট প্রাপ্য</span>
                                  </span>
                                ) : !isMonthly ? (
                                  <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                    <span>এককালীন / মেয়াদান্তে</span>
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-bold bg-gray-100 text-gray-500">
                                    <span>প্রফিট শুরু হয়নি ({formatMonthLabel(startYm)})</span>
                                  </span>
                                )}
                              </div>
                            )}
                          </td>

                          <td className="px-6 py-4 text-sm font-bold text-green-600">
                            {formatCurrency(inv.amount)}
                          </td>

                          <td className="px-6 py-4 text-right">
                            <div
                              className="flex items-center justify-end space-x-1"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <button
                                onClick={() => handleViewInvestor(inv)}
                                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                title="View Investor Profile"
                              >
                                <FileSearch className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleEditClick(inv)}
                                className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                title="Edit Investment & KYC"
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
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        /* ============================================================================
           TAB 2: MONTHLY PROFIT & DRY PERIOD MANAGEMENT SYSTEM
           ============================================================================ */
        <div className="space-y-6">
          {/* Filter & Batch Percentage Calculator Bar */}
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 pb-4">
              <div>
                <h2 className="text-lg font-extrabold text-gray-900 flex items-center space-x-2">
                  <Calculator className="h-5 w-5 text-emerald-600" />
                  <span>ব্যাচ ওয়াইজ মাসিক প্রফিট ও Dry Period ব্যবস্থাপনা</span>
                </h2>
                <p className="text-xs text-gray-500 mt-1">
                  প্রোজেক্ট, ব্যাচ ও মাস সিলেক্ট করে উক্ত মাসের প্রফিটের শতাংশ (%) দিন। যোগ্য ইনভেস্টরদের প্রফিটের পরিমাণ স্বয়ংক্রিয়ভাবে বসে যাবে এবং স্ট্যাটাস <strong>Pending</strong>, <strong>Sent</strong> বা <strong>Dry Period</strong> করতে পারবেন।
                </p>
              </div>
              {selectedProfitProject && (
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <span className="px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-800">
                    মাসিক লভ্যাংশভিত্তিক প্রোজেক্ট
                  </span>
                  <span className="px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-xs font-bold text-amber-900">
                    Dry Period সীমা: প্রতি ১২ মাসে সর্বোচ্চ {selectedProfitProject.dryPeriodMonthsPerYear ?? 2} মাস
                  </span>
                </div>
              )}
            </div>

            {monthlyProjects.length === 0 ? (
              <div className="p-8 text-center bg-amber-50/60 border border-amber-200 rounded-2xl text-amber-800 text-sm font-bold">
                কোনো মাসিক লভ্যাংশভিত্তিক (Monthly Profit) প্রোজেক্ট পাওয়া যায়নি। অনুগ্রহ করে Projects পেইজ থেকে প্রোজেক্টের ধরন "মাসিক লভ্যাংশভিত্তিক" নির্বাচন করুন।
              </div>
            ) : (
              <form
                onSubmit={handleApplyBatchProfitPercentage}
                className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end"
              >
                <div className="md:col-span-4 space-y-1.5">
                  <label className="block text-xs font-bold text-gray-600 uppercase">
                    ১. প্রোজেক্ট নির্বাচন করুন (Monthly Project)
                  </label>
                  <select
                    value={profitProjectId}
                    onChange={(e) => {
                      const newPid = e.target.value;
                      setProfitProjectId(newPid);
                      const pObj = projects.find(p => p.id === newPid);
                      if (pObj?.batches && pObj.batches.length > 0) {
                        setProfitBatchId(pObj.batches[0].id);
                      } else {
                        setProfitBatchId('default_batch');
                      }
                    }}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-gray-900 outline-none focus:bg-white focus:border-emerald-600"
                  >
                    {monthlyProjects.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.title} (Dry Limit: {p.dryPeriodMonthsPerYear ?? 2}m/12m)
                      </option>
                    ))}
                  </select>
                </div>

                <div className="md:col-span-3 space-y-1.5">
                  <label className="block text-xs font-bold text-gray-600 uppercase">
                    ২. ব্যাচ নির্বাচন করুন (Batch)
                  </label>
                  <select
                    value={profitBatchId}
                    onChange={(e) => setProfitBatchId(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-gray-900 outline-none focus:bg-white focus:border-emerald-600"
                  >
                    {availableProfitBatches.map(b => (
                      <option key={b.id} value={b.id}>
                        {b.name} ({b.status})
                      </option>
                    ))}
                    <option value="all">সকল ব্যাচ একসাথে দেখুন (All Batches)</option>
                  </select>
                </div>

                <div className="md:col-span-2 space-y-1.5">
                  <label className="block text-xs font-bold text-gray-600 uppercase">
                    ৩. প্রফিটের মাস (Month)
                  </label>
                  <input
                    type="month"
                    value={profitMonth}
                    onChange={(e) => setProfitMonth(e.target.value)}
                    className="w-full px-3.5 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-gray-900 outline-none focus:bg-white focus:border-emerald-600"
                  />
                </div>

                <div className="md:col-span-3 space-y-1.5">
                  <label className="block text-xs font-bold text-emerald-800 uppercase">
                    ৪. উক্ত মাসের প্রফিট শতাংশ (%)
                  </label>
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <Percent className="h-4 w-4 text-emerald-600 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={batchPercentageInput}
                        onChange={(e) => setBatchPercentageInput(e.target.value)}
                        placeholder="যেমন: 2.5"
                        className="w-full pl-9 pr-3 py-3 bg-emerald-50/50 border border-emerald-300 rounded-xl text-sm font-extrabold text-emerald-950 outline-none focus:bg-white focus:border-emerald-600"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={applyingRate || profitBatchId === 'all'}
                      className="px-4 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer shrink-0"
                    >
                      {applyingRate ? 'হিসাব হচ্ছে...' : 'প্রফিট বসান'}
                    </button>
                  </div>
                </div>
              </form>
            )}

            {profitBanner && (
              <div
                className={`p-4 rounded-2xl border flex items-start space-x-3 text-xs sm:text-sm font-bold ${
                  profitBanner.type === 'success'
                    ? 'bg-green-50 border-green-200 text-green-800'
                    : 'bg-red-50 border-red-200 text-red-700'
                }`}
              >
                {profitBanner.type === 'success' ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
                )}
                <span className="leading-relaxed">{profitBanner.text}</span>
              </div>
            )}
          </div>

          {/* Monthly Profit Distribution Table */}
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-6 py-4 bg-gray-50 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-extrabold text-gray-900">
                  {selectedProfitProject?.title || 'Project'} —{' '}
                  {profitBatchId === 'all'
                    ? 'সকল ব্যাচ'
                    : availableProfitBatches.find(b => b.id === profitBatchId)?.name || 'Batch'}{' '}
                  ({formatMonthLabel(profitMonth)})
                </h3>
                <p className="text-xs text-gray-500">
                  যে সকল ইনভেস্টর এই মাসের প্রফিট পাওয়ার যোগ্য, তাদের প্রফিট এমাউন্ট পাশে দেখানো হচ্ছে। <strong>Sent</strong> বা <strong>Dry Period</strong> সিলেক্ট করলেই অটোমেটিক SMS চলে যাবে।
                </p>
              </div>
              <div className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200 self-start sm:self-auto">
                মোট ইনভেস্টমেন্ট এন্ট্রি: {batchInvestmentsForProfit.length}টি
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50/70 border-b border-gray-100 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                    <th className="py-3.5 px-5">ইনভেস্টর ও ফোন</th>
                    <th className="py-3.5 px-5">ব্যাচ ও বিনিয়োগ</th>
                    <th className="py-3.5 px-5">প্রফিট শুরুর মাস</th>
                    <th className="py-3.5 px-5">১২ মাসে Dry Period ব্যবহার</th>
                    <th className="py-3.5 px-5">{formatMonthLabel(profitMonth)}-এর প্রফিট এমাউন্ট</th>
                    <th className="py-3.5 px-5 text-right">স্ট্যাটাস (Pending / Sent / Dry Period)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-sm">
                  {profitLoading ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto" />
                      </td>
                    </tr>
                  ) : batchInvestmentsForProfit.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-gray-500 text-sm">
                        নির্বাচিত প্রোজেক্ট ও ব্যাচে কোনো ইনভেস্টমেন্ট পাওয়া যায়নি।
                      </td>
                    </tr>
                  ) : (
                    batchInvestmentsForProfit.map(inv => {
                      const eligible = isEligibleForMonth(inv, profitMonth);
                      const startYm = getEffectiveStartMonth(inv);
                      const profitDocId = `${inv.id}_${profitMonth}`;
                      const existingRec = investmentProfits.find(
                        r => r.id === profitDocId || (r.investmentId === inv.id && r.month === profitMonth)
                      );
                      const rateDoc = batchProfitRates.find(
                        r =>
                          r.projectId === inv.projectId &&
                          r.batchId === (inv.batchId || profitBatchId) &&
                          r.month === profitMonth
                      );
                      const effectivePct =
                        existingRec?.profitPercentage ??
                        rateDoc?.profitPercentage ??
                        (parseFloat(batchPercentageInput) || 0);

                      const currentStatus: MonthlyProfitStatus = existingRec?.status || 'Pending';
                      const calculatedProfit =
                        currentStatus === 'Dry Period'
                          ? 0
                          : existingRec
                          ? existingRec.profitAmount
                          : Math.round(((Number(inv.amount) || 0) * effectivePct) / 100);

                      const dryUsage = getDryPeriodUsage(inv, profitMonth);
                      const isRowUpdating = updatingProfitId === inv.id;

                      return (
                        <tr
                          key={inv.id}
                          className={`transition-colors ${
                            !eligible ? 'bg-gray-50/60 opacity-65' : 'hover:bg-gray-50/80'
                          }`}
                        >
                          <td className="py-4 px-5">
                            <div className="font-bold text-gray-900">{inv.investorName}</div>
                            <div className="text-xs text-green-700 font-semibold">
                              {inv.investorPhone || 'ফোন নম্বর নেই'}
                            </div>
                          </td>

                          <td className="py-4 px-5">
                            <div className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 text-[10px] font-bold border border-blue-100 mb-1">
                              <Layers className="h-3 w-3" />
                              <span>{inv.batchName || 'Batch 1'}</span>
                            </div>
                            <div className="font-extrabold text-gray-900">{formatCurrency(inv.amount)}</div>
                          </td>

                          <td className="py-4 px-5">
                            <div className="text-xs font-bold text-gray-800">{formatMonthLabel(startYm)}</div>
                            {!eligible && (
                              <span className="inline-block mt-1 px-2 py-0.5 rounded bg-amber-100 text-amber-800 text-[10px] font-bold">
                                এই মাসে প্রফিট প্রযোজ্য নয় ({formatMonthLabel(startYm)} থেকে শুরু)
                              </span>
                            )}
                          </td>

                          <td className="py-4 px-5">
                            <div className="space-y-1">
                              <span
                                className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs font-bold ${
                                  dryUsage.usedCount >= dryUsage.maxAllowed
                                    ? 'bg-red-50 text-red-700 border border-red-200'
                                    : dryUsage.usedCount > 0
                                    ? 'bg-amber-50 text-amber-800 border border-amber-200'
                                    : 'bg-gray-100 text-gray-700'
                                }`}
                              >
                                <span>
                                  {dryUsage.usedCount} / {dryUsage.maxAllowed} মাস ব্যবহৃত
                                </span>
                              </span>
                              <div className="text-[10px] text-gray-400">
                                সাইকেল: {formatMonthLabel(dryUsage.cycleStartYm)} –{' '}
                                {formatMonthLabel(dryUsage.cycleEndYm)}
                              </div>
                              {dryUsage.usedMonths.length > 0 && (
                                <div className="text-[10px] text-rose-600 font-bold">
                                  Dry মাস: {dryUsage.usedMonths.map(formatMonthLabel).join(', ')}
                                </div>
                              )}
                            </div>
                          </td>

                          <td className="py-4 px-5">
                            {!eligible ? (
                              <span className="text-xs text-gray-400 font-semibold">—</span>
                            ) : currentStatus === 'Dry Period' ? (
                              <div className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-extrabold">
                                <Ban className="h-3.5 w-3.5" />
                                <span>৳0 (Dry Period)</span>
                              </div>
                            ) : (
                              <div className="space-y-1">
                                <div className="flex items-center space-x-1.5">
                                  <div className="relative w-28">
                                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">
                                      ৳
                                    </span>
                                    <input
                                      type="number"
                                      value={
                                        customProfitAmounts[inv.id!] !== undefined
                                          ? customProfitAmounts[inv.id!]
                                          : String(calculatedProfit)
                                      }
                                      onChange={(e) =>
                                        setCustomProfitAmounts(prev => ({
                                          ...prev,
                                          [inv.id!]: e.target.value
                                        }))
                                      }
                                      onBlur={() => {
                                        if (customProfitAmounts[inv.id!] !== undefined) {
                                          handleSaveCustomProfitAmount(inv);
                                        }
                                      }}
                                      className="w-full pl-6 pr-2 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs font-extrabold text-emerald-800 outline-none focus:bg-white focus:border-emerald-600"
                                    />
                                  </div>
                                  {effectivePct > 0 && (
                                    <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-md">
                                      {effectivePct}%
                                    </span>
                                  )}
                                </div>
                              </div>
                            )}
                          </td>

                          <td className="py-4 px-5 text-right">
                            {!eligible ? (
                              <span className="text-xs text-gray-400 italic">অপেক্ষমাণ মাস</span>
                            ) : (
                              <div className="inline-flex items-center justify-end gap-1.5">
                                {/* Pending Button */}
                                <button
                                  type="button"
                                  disabled={isRowUpdating}
                                  onClick={() => handleStatusChangeForInvestorMonth(inv, 'Pending')}
                                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center space-x-1 ${
                                    currentStatus === 'Pending'
                                      ? 'bg-amber-500 text-white shadow-sm'
                                      : 'bg-gray-100 text-gray-600 hover:bg-amber-50 hover:text-amber-700'
                                  }`}
                                >
                                  <Clock className="h-3.5 w-3.5" />
                                  <span>Pending</span>
                                </button>

                                {/* Sent Button */}
                                <button
                                  type="button"
                                  disabled={isRowUpdating}
                                  onClick={() => handleStatusChangeForInvestorMonth(inv, 'Sent')}
                                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center space-x-1 ${
                                    currentStatus === 'Sent'
                                      ? 'bg-green-600 text-white shadow-sm'
                                      : 'bg-gray-100 text-gray-600 hover:bg-green-50 hover:text-green-700'
                                  }`}
                                  title="Confirm Profit Sent & Dispatch Automated SMS"
                                >
                                  <Check className="h-3.5 w-3.5" />
                                  <span>Sent</span>
                                </button>

                                {/* Dry Period Button */}
                                <button
                                  type="button"
                                  disabled={isRowUpdating}
                                  onClick={() => handleStatusChangeForInvestorMonth(inv, 'Dry Period')}
                                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center space-x-1 ${
                                    currentStatus === 'Dry Period'
                                      ? 'bg-rose-600 text-white shadow-sm'
                                      : 'bg-gray-100 text-gray-600 hover:bg-rose-50 hover:text-rose-700'
                                  }`}
                                  title="Mark as Dry Period & Dispatch Automated SMS"
                                >
                                  <Ban className="h-3.5 w-3.5" />
                                  <span>Dry Period</span>
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

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
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-2 hover:bg-white rounded-full transition-colors text-gray-400"
                >
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
                    <div className="flex items-center space-x-4">
                      <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center text-2xl font-bold text-green-700">
                        {(selectedInvestor.name || 'I').charAt(0)}
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <h4 className="text-xl font-bold text-gray-900">{selectedInvestor.name}</h4>
                          {(() => {
                            const key = getInvestorKey({
                              investorPhone: selectedInvestor.phone,
                              investorEmail: selectedInvestor.email,
                              investorUid: selectedInvestor.uid,
                              investorName: selectedInvestor.name
                            });
                            const invObj = investorIdMap.get(key);
                            return invObj ? (
                              <span className="font-mono text-xs font-extrabold px-2.5 py-0.5 rounded-lg bg-indigo-100 text-indigo-800 border border-indigo-200 shadow-2xs">
                                {invObj.id} ({invObj.count} investments)
                              </span>
                            ) : null;
                          })()}
                        </div>
                        <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500 mt-1">
                          {selectedInvestor.phone && (
                            <span className="flex items-center font-bold text-green-700">
                              <Phone className="h-3.5 w-3.5 mr-1" /> {selectedInvestor.phone}
                            </span>
                          )}
                          {selectedInvestor.email && (
                            <span className="flex items-center">
                              <Mail className="h-3.5 w-3.5 mr-1" /> {selectedInvestor.email}
                            </span>
                          )}
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
                            <DetailRow
                              label="Father's Name"
                              value={selectedInvestor.investorProfile.fatherName}
                              icon={<User className="h-3 w-3" />}
                            />
                            <DetailRow
                              label="Mother's Name"
                              value={selectedInvestor.investorProfile.motherName}
                              icon={<User className="h-3 w-3" />}
                            />
                            <DetailRow
                              label="Date of Birth"
                              value={selectedInvestor.investorProfile.dob}
                              icon={<Calendar className="h-3 w-3" />}
                            />
                            <DetailRow
                              label="NID / Passport"
                              value={selectedInvestor.investorProfile.nidPassport}
                              icon={<FileSearch className="h-3 w-3" />}
                            />
                          </div>
                        </div>

                        <div>
                          <h5 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center">
                            <Briefcase className="h-3 w-3 mr-2" /> Occupational
                          </h5>
                          <div className="space-y-3">
                            <DetailRow
                              label="Occupation"
                              value={selectedInvestor.investorProfile.occupation}
                              icon={<Briefcase className="h-3 w-3" />}
                            />
                            <DetailRow
                              label="Organization"
                              value={selectedInvestor.investorProfile.organization}
                              icon={<Target className="h-3 w-3" />}
                            />
                            <DetailRow
                              label="Designation"
                              value={selectedInvestor.investorProfile.designation}
                              icon={<Calendar className="h-3 w-3" />}
                            />
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
                            <UsersIcon className="h-3 w-3 mr-2" /> Nominee Information
                          </h5>
                          <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-2xl">
                            <DetailRow label="Nominee Name" value={selectedInvestor.investorProfile.nomineeName} />
                            <DetailRow label="Relation" value={selectedInvestor.investorProfile.nomineeRelation} />
                            <DetailRow label="Nominee Phone" value={selectedInvestor.investorProfile.nomineePhone} />
                            <DetailRow label="Nominee NID" value={selectedInvestor.investorProfile.nomineeNid} />
                          </div>
                        </div>

                        <div className="md:col-span-2">
                          <h5 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center">
                            <MapPin className="h-3 w-3 mr-2" /> Address
                          </h5>
                          <div className="space-y-4">
                            <div>
                              <p className="text-[10px] font-bold text-gray-400 mb-1">Current Address</p>
                              <p className="text-sm text-gray-700 leading-relaxed font-medium">
                                {selectedInvestor.investorProfile.currentAddress || 'N/A'}
                              </p>
                            </div>
                            <div>
                              <p className="text-[10px] font-bold text-gray-400 mb-1">Permanent Address</p>
                              <p className="text-sm text-gray-700 leading-relaxed font-medium">
                                {selectedInvestor.investorProfile.permanentAddress || 'N/A'}
                              </p>
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
                                <div className="flex flex-col text-xs font-bold uppercase tracking-tight">
                                  No Investor NID
                                </div>
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
                                <div className="flex flex-col text-xs font-bold uppercase tracking-tight">
                                  No Nominee NID
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="py-12 bg-amber-50 rounded-3xl text-center border border-dashed border-amber-200">
                        <FileSearch className="h-10 w-10 text-amber-400 mx-auto mb-3" />
                        <h5 className="text-amber-700 font-bold">Profile Incomplete</h5>
                        <p className="text-amber-600/70 text-sm max-w-xs mx-auto mt-1">
                          This investor has not completed their detailed profile yet.
                        </p>
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

                <div className="w-full bg-gray-50 rounded-2xl p-4 border border-gray-100 text-left mb-6 space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-400 font-bold uppercase">Investor</span>
                    <span className="text-gray-900 font-medium">{selectedInvestmentToDelete.investorName}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-400 font-bold uppercase">Project</span>
                    <span className="text-gray-900 font-medium">{selectedInvestmentToDelete.projectTitle}</span>
                  </div>
                  {selectedInvestmentToDelete.batchName && (
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-400 font-bold uppercase">Batch</span>
                      <span className="text-blue-700 font-bold">{selectedInvestmentToDelete.batchName}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-400 font-bold uppercase">Amount</span>
                    <span className="text-green-600 font-bold">
                      {formatCurrency(selectedInvestmentToDelete.amount)}
                    </span>
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
              className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden p-6 z-10 my-8 font-sans max-h-[90vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center pb-4 border-b border-gray-100 mb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center">
                    <Pencil className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">Edit Investment, Batch & KYC</h3>
                    <p className="text-xs text-gray-500">
                      Modify investment records, batch assignment, profit start month, and KYC profile.
                    </p>
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
                  {renderKycTabs(editModalTab, setEditModalTab)}

                  {editModalTab === 'investment' ? (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">
                          Investor Name *
                        </label>
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
                          <label className="block text-xs font-bold text-green-700 uppercase mb-1.5">
                            Phone Number (OTP Login) *
                          </label>
                          <input
                            type="tel"
                            value={editFormData.investorPhone}
                            onChange={(e) => setEditFormData({ ...editFormData, investorPhone: e.target.value })}
                            placeholder="e.g. 017XXXXXXXX"
                            required
                            className="w-full px-4 py-2.5 bg-green-50/40 border border-green-300 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-gray-400 uppercase mb-1.5">
                            Email Address (Optional)
                          </label>
                          <input
                            type="email"
                            value={editFormData.investorEmail}
                            onChange={(e) => setEditFormData({ ...editFormData, investorEmail: e.target.value })}
                            placeholder="Enter email (optional)"
                            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all"
                          />
                        </div>
                      </div>

                      {renderProjectBatchAndMonthFields(editFormData, setEditFormData)}
                    </div>
                  ) : (
                    renderKycFields(editFormData, setEditFormData, editModalTab, 'edit')
                  )}

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
              className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden p-6 z-10 my-8 font-sans max-h-[90vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center pb-4 border-b border-gray-100 mb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center">
                    {addInvestorMode === 'admin' ? (
                      <Shield className="h-5 w-5 text-green-600" />
                    ) : (
                      <UserPlus className="h-5 w-5 text-green-600" />
                    )}
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">
                      {addInvestorMode === 'admin'
                        ? 'Add Admin as Investor'
                        : 'Add Investor & Batch Investment'}
                    </h3>
                    <p className="text-xs text-gray-500">
                      {addInvestorMode === 'admin'
                        ? 'এডমিনের প্রোফাইল তথ্য ব্যবহার করে ইনভেস্টমেন্ট পেইজে ইনভেস্টর হিসেবে যুক্ত করুন।'
                        : 'প্রোজেক্টের ব্যাচ, ইনভেস্টের তারিখ এবং কোন মাস থেকে প্রফিট পাবে তা উল্লেখ করুন।'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsAddModalOpen(false)}
                  className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Mode Switcher: Manual Investor vs Admin Profile */}
              <div className="grid grid-cols-2 gap-2 p-1 bg-gray-50 rounded-xl border border-gray-100 mb-4">
                <button
                  type="button"
                  onClick={() => {
                    setAddInvestorMode('manual');
                    setSelectedAdminUid('');
                    setAddFormData({
                      ...addFormData,
                      investorName: '',
                      investorEmail: '',
                      investorPhone: '',
                      investorProfile: { ...emptyKycProfile }
                    });
                  }}
                  className={`py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center space-x-1.5 ${
                    addInvestorMode === 'manual'
                      ? 'bg-white text-green-700 shadow-sm'
                      : 'text-gray-500 hover:text-gray-800'
                  }`}
                >
                  <UserPlus className="h-3.5 w-3.5" />
                  <span>New / Manual Investor</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAddInvestorMode('admin');
                    if (adminUsers.length > 0 && !selectedAdminUid) {
                      applyAdminProfileToForm(adminUsers[0]);
                    }
                  }}
                  className={`py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center space-x-1.5 ${
                    addInvestorMode === 'admin'
                      ? 'bg-white text-green-700 shadow-sm'
                      : 'text-gray-500 hover:text-gray-800'
                  }`}
                >
                  <Shield className="h-3.5 w-3.5" />
                  <span>Select Admin ({adminUsers.length})</span>
                </button>
              </div>

              <form onSubmit={handleAddInvestment} className="space-y-4">
                {renderKycTabs(modalTab, setModalTab)}

                {modalTab === 'investment' ? (
                  <div className="space-y-4">
                    {addInvestorMode === 'admin' && (
                      <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-2xl space-y-2">
                        <label className="block text-xs font-bold text-emerald-900 uppercase">
                          এডমিন নির্বাচন করুন (Select Admin Profile) *
                        </label>
                        <select
                          value={selectedAdminUid}
                          onChange={(e) => {
                            const found = adminUsers.find(a => a.uid === e.target.value);
                            if (found) applyAdminProfileToForm(found);
                          }}
                          required
                          className="w-full px-4 py-2.5 bg-white border border-emerald-300 rounded-xl text-sm font-bold text-gray-900 outline-none focus:ring-2 focus:ring-emerald-500/20"
                        >
                          <option value="">-- এডমিন নির্বাচন করুন --</option>
                          {adminUsers.map((admin) => (
                            <option key={admin.uid} value={admin.uid}>
                              {admin.name || 'Admin'} ({admin.email || admin.phone || admin.uid.slice(0, 8)}) —{' '}
                              {admin.role === 'super_admin' ? 'Super Admin' : 'Admin'}
                            </option>
                          ))}
                        </select>
                        <p className="text-[11px] text-emerald-800">
                          নির্বাচিত এডমিনের প্রোফাইল তথ্য স্বয়ংক্রিয়ভাবে যুক্ত হয়েছে এবং তিনি একাধিক ব্যাচে আলাদাভাবে ইনভেস্ট করতে পারবেন।
                        </p>
                      </div>
                    )}

                    <div>
                      <label className="block text-xs font-bold text-gray-600 uppercase mb-1.5">
                        Investor Full Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={addFormData.investorName}
                        onChange={(e) => setAddFormData({ ...addFormData, investorName: e.target.value })}
                        placeholder="Enter full name"
                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-green-700 uppercase mb-1.5">
                          {addInvestorMode === 'admin'
                            ? 'Phone Number (Admin Profile)'
                            : 'Phone Number (OTP Login & Profit SMS) *'}
                        </label>
                        <input
                          type="tel"
                          required={addInvestorMode !== 'admin'}
                          value={addFormData.investorPhone}
                          onChange={(e) => setAddFormData({ ...addFormData, investorPhone: e.target.value })}
                          placeholder="e.g. 017XXXXXXXX"
                          className="w-full px-4 py-2.5 bg-green-50/40 border border-green-300 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase mb-1.5">Email Address</label>
                        <input
                          type="email"
                          value={addFormData.investorEmail}
                          onChange={(e) => setAddFormData({ ...addFormData, investorEmail: e.target.value })}
                          placeholder="Enter email (optional)"
                          className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all"
                        />
                      </div>
                    </div>

                    {renderProjectBatchAndMonthFields(addFormData, setAddFormData)}
                  </div>
                ) : (
                  renderKycFields(addFormData, setAddFormData, modalTab, 'add')
                )}

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
                    <span>Save Investor & Record</span>
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
                      No investments are selected in the list. Please choose "All Registered" or close and check rows in the table.
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
                  <div
                    className={`p-4 rounded-xl text-xs font-bold flex items-center space-x-2 ${
                      smsStatus.type === 'success'
                        ? 'bg-green-50 text-green-700 border border-green-100'
                        : 'bg-red-50 text-red-700 border border-red-100'
                    }`}
                  >
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

function DetailRow({ label, value, icon }: { label: string; value?: string; icon?: React.ReactNode }) {
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
