import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../../firebase';
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDoc,
  setDoc,
  onSnapshot,
  query,
  orderBy,
  limit
} from 'firebase/firestore';
import {
  MessageSquare,
  Wallet,
  History,
  FileText,
  Settings as SettingsIcon,
  Send,
  RefreshCw,
  Plus,
  Trash2,
  Edit2,
  CheckCircle2,
  AlertCircle,
  Search,
  Users,
  Clock,
  Eye,
  EyeOff,
  Check,
  X,
  Calendar,
  ShieldCheck,
  Sparkles
} from 'lucide-react';
import { SmsConfig, SmsLog, SmsTemplate, UserProfile, Investment } from '../../types';
import { normalizePhone } from '../../lib/authSession';

const DEFAULT_API_KEY = 'TEwV8j6kIyK2CrBlcvlf3Oa5ic39R6qdlPhAVGGn';
const DEFAULT_OTP_TEMPLATE = 'WeFarm Investor Login OTP: {otp}. Valid for 5 minutes. Do not share this code.';

const TEMPLATE_CATEGORIES: SmsTemplate['category'][] = [
  'General',
  'Investor Update',
  'Payment / Profit',
  'Order / Delivery',
  'OTP / Auth',
];

function formatScheduleForGateway(datetimeLocal: string): string {
  if (!datetimeLocal) return '';
  // datetime-local gives "YYYY-MM-DDTHH:mm" -> Gateway requires "Y-m-d H:i:s"
  const normalized = datetimeLocal.replace('T', ' ');
  return normalized.length === 16 ? `${normalized}:00` : normalized;
}

function getSmsMetrics(text: string) {
  const isUnicode = /[^\u0000-\u007F]/.test(text);
  const length = text.length;
  if (length === 0) return { isUnicode, length: 0, segments: 0, perSegment: isUnicode ? 70 : 160 };
  const singleLimit = isUnicode ? 70 : 160;
  const multiLimit = isUnicode ? 67 : 153;
  const segments = length <= singleLimit ? 1 : Math.ceil(length / multiLimit);
  return { isUnicode, length, segments, perSegment: segments === 1 ? singleLimit : multiLimit };
}

export default function AdminSmsManager() {
  const [activeTab, setActiveTab] = useState<'send' | 'history' | 'templates' | 'settings'>('send');

  // Balance State
  const [balance, setBalance] = useState<string | null>(null);
  const [validity, setValidity] = useState<string | null>(null);
  const [balanceLoading, setBalanceLoading] = useState(false);
  const [balanceError, setBalanceError] = useState<string | null>(null);

  // Config State
  const [config, setConfig] = useState<SmsConfig>({
    apiKey: DEFAULT_API_KEY,
    senderId: '',
    defaultContentId: '',
    otpTemplate: DEFAULT_OTP_TEMPLATE,
  });
  const [showApiKey, setShowApiKey] = useState(false);
  const [savingConfig, setSavingConfig] = useState(false);
  const [configStatus, setConfigStatus] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Recipients & Contacts
  const [investors, setInvestors] = useState<{ uid: string; name: string; phone: string }[]>([]);

  // Send SMS State
  const [recipientMode, setRecipientMode] = useState<'manual' | 'all_investors' | 'selected_investors'>('manual');
  const [manualNumbers, setManualNumbers] = useState('');
  const [selectedInvestorPhones, setSelectedInvestorPhones] = useState<string[]>([]);
  const [investorSearch, setInvestorSearch] = useState('');
  const [smsBody, setSmsBody] = useState('');
  const [scheduleInput, setScheduleInput] = useState('');
  const [senderIdOverride, setSenderIdOverride] = useState('');
  const [contentIdOverride, setContentIdOverride] = useState('');
  const [sendingSms, setSendingSms] = useState(false);
  const [sendStatus, setSendStatus] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // History State
  const [logs, setLogs] = useState<SmsLog[]>([]);
  const [historySearch, setHistorySearch] = useState('');
  const [historyTypeFilter, setHistoryTypeFilter] = useState<'all' | SmsLog['type']>('all');
  const [historyStatusFilter, setHistoryStatusFilter] = useState<'all' | SmsLog['status']>('all');
  const [checkingReportId, setCheckingReportId] = useState<string | null>(null);
  const [selectedLogReport, setSelectedLogReport] = useState<SmsLog | null>(null);

  // Templates State
  const [templates, setTemplates] = useState<SmsTemplate[]>([]);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<SmsTemplate | null>(null);
  const [templateForm, setTemplateForm] = useState<{
    name: string;
    category: SmsTemplate['category'];
    content: string;
    contentId: string;
  }>({
    name: '',
    category: 'General',
    content: '',
    contentId: '',
  });
  const [savingTemplate, setSavingTemplate] = useState(false);

  const fetchBalance = async (overrideKey?: string) => {
    setBalanceLoading(true);
    setBalanceError(null);
    try {
      const keyParam = overrideKey ? `?apiKey=${encodeURIComponent(overrideKey)}` : '';
      const res = await fetch(`/api/sms/balance${keyParam}`);
      const text = await res.text();
      const data = JSON.parse(text);
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to fetch SMS balance');
      }
      setBalance(String(data.balance ?? '0.0000'));
      setValidity(data.validity || null);
    } catch (err: any) {
      setBalanceError(err.message || 'Could not load balance');
    } finally {
      setBalanceLoading(false);
    }
  };

  // Sync OTP logs recorded on the backend into Firestore smsLogs so history is complete & persistent
  const syncServerOtpLogs = async (existingLogs: SmsLog[]) => {
    try {
      const res = await fetch('/api/sms/otp-logs');
      if (!res.ok) return;
      const data = await res.json();
      if (!data.success || !Array.isArray(data.logs)) return;

      const existingIds = new Set(
        existingLogs.map((l) => l.requestId || l.createdAt)
      );

      for (const otpLog of data.logs) {
        const key = otpLog.requestId || otpLog.createdAt;
        if (!existingIds.has(key)) {
          existingIds.add(key);
          await setDoc(doc(db, 'smsLogs', otpLog.id), {
            requestId: otpLog.requestId || '',
            recipients: otpLog.recipients || [],
            recipientCount: otpLog.recipientCount || 1,
            message: otpLog.message || 'Investor OTP SMS',
            type: 'otp',
            status: otpLog.status || 'Submitted',
            errorCode: otpLog.errorCode ?? 0,
            errorMessage: otpLog.errorMessage || '',
            senderId: otpLog.senderId || '',
            createdAt: otpLog.createdAt || new Date().toISOString(),
          });
        }
      }
    } catch (err) {
      console.warn('OTP log sync skipped:', err);
    }
  };

  useEffect(() => {
    // 1. Load & sync SMS config
    const loadConfig = async () => {
      try {
        const snap = await getDoc(doc(db, 'smsConfig', 'default'));
        if (snap.exists()) {
          const data = snap.data() as SmsConfig;
          const merged: SmsConfig = {
            apiKey: data.apiKey || DEFAULT_API_KEY,
            senderId: data.senderId || '',
            defaultContentId: data.defaultContentId || '',
            otpTemplate: data.otpTemplate || DEFAULT_OTP_TEMPLATE,
            updatedAt: data.updatedAt,
          };
          setConfig(merged);
          setSenderIdOverride(merged.senderId || '');
          setContentIdOverride(merged.defaultContentId || '');
          // Ensure server runtime has the saved config
          await fetch('/api/sms/config', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(merged),
          });
          fetchBalance(merged.apiKey);
        } else {
          // Initialize Firestore smsConfig/default with user's configured API key
          const initial: SmsConfig = {
            apiKey: DEFAULT_API_KEY,
            senderId: '',
            defaultContentId: '',
            otpTemplate: DEFAULT_OTP_TEMPLATE,
            updatedAt: new Date().toISOString(),
          };
          await setDoc(doc(db, 'smsConfig', 'default'), initial);
          setConfig(initial);
          fetchBalance(initial.apiKey);
        }
      } catch (err) {
        console.error('Error loading SMS config:', err);
        fetchBalance();
      }
    };
    loadConfig();

    // 2. Listen to SMS Templates
    const templatesQ = query(collection(db, 'smsTemplates'), orderBy('createdAt', 'desc'));
    const unsubTemplates = onSnapshot(templatesQ, (snap) => {
      setTemplates(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<SmsTemplate, 'id'>) })));
    });

    // 3. Listen to SMS History Logs
    const logsQ = query(collection(db, 'smsLogs'), orderBy('createdAt', 'desc'), limit(200));
    let otpSyncedOnce = false;
    const unsubLogs = onSnapshot(logsQ, (snap) => {
      const items = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<SmsLog, 'id'>) }));
      setLogs(items);
      if (!otpSyncedOnce) {
        otpSyncedOnce = true;
        syncServerOtpLogs(items);
      }
    });

    // 4. Listen to active Investments as the single source of truth for Investors (matching the Investments page)
    let latestUsersDocs: { id: string; data: UserProfile }[] = [];
    let latestInvestmentDocs: { id: string; data: Investment }[] = [];
    let usersLoaded = false;
    let investmentsLoaded = false;
    let orphanCleanupDone = false;

    const recomputeActiveInvestors = () => {
      const userByUid = new Map<string, UserProfile>();
      const userByEmail = new Map<string, UserProfile>();
      latestUsersDocs.forEach(({ id, data }) => {
        userByUid.set(id, data);
        if (data.email) userByEmail.set(data.email.toLowerCase(), data);
      });

      const activeInvestorMap = new Map<string, { uid: string; name: string; phone: string }>();
      const activeUids = new Set<string>();
      const activePhones = new Set<string>();

      latestInvestmentDocs.forEach(({ id, data: inv }) => {
        if (inv.investorUid) activeUids.add(inv.investorUid);

        let rawPhone = inv.investorPhone || '';
        let name = inv.investorName || 'Investor';

        if (!rawPhone && inv.investorUid && userByUid.has(inv.investorUid)) {
          const u = userByUid.get(inv.investorUid)!;
          rawPhone = u.phone || '';
          if (!inv.investorName && u.name) name = u.name;
        } else if (!rawPhone && inv.investorEmail && userByEmail.has(inv.investorEmail.toLowerCase())) {
          const u = userByEmail.get(inv.investorEmail.toLowerCase())!;
          rawPhone = u.phone || '';
          if (!inv.investorName && u.name) name = u.name;
        }

        const norm = normalizePhone(rawPhone);
        if (norm.length >= 10) {
          activePhones.add(norm);
          activeUids.add(`phone_${norm}`);
          if (!activeInvestorMap.has(norm)) {
            activeInvestorMap.set(norm, {
              uid: inv.investorUid || id,
              name,
              phone: norm,
            });
          }
        }
      });

      setInvestors(Array.from(activeInvestorMap.values()));

      // Clean up any orphaned 'investor' user profiles in 'users' only after both collections have loaded
      if (!orphanCleanupDone && usersLoaded && investmentsLoaded) {
        orphanCleanupDone = true;
        latestUsersDocs.forEach(({ id, data: u }) => {
          if (u.role === 'investor') {
            const norm = normalizePhone(u.phone || '');
            const isLinked = activeUids.has(id) || (norm && activePhones.has(norm));
            if (!isLinked) {
              deleteDoc(doc(db, 'users', id)).catch((err) =>
                console.warn('Skipped orphan investor cleanup:', err)
              );
            }
          }
        });
      }
    };

    const unsubUsers = onSnapshot(collection(db, 'users'), (usersSnap) => {
      latestUsersDocs = usersSnap.docs.map((d) => ({ id: d.id, data: d.data() as UserProfile }));
      usersLoaded = true;
      recomputeActiveInvestors();
    });

    const unsubInvestments = onSnapshot(collection(db, 'investments'), (invSnap) => {
      latestInvestmentDocs = invSnap.docs.map((d) => ({ id: d.id, data: d.data() as Investment }));
      investmentsLoaded = true;
      recomputeActiveInvestors();
    });

    return () => {
      unsubTemplates();
      unsubLogs();
      unsubUsers();
      unsubInvestments();
    };
  }, []);

  const smsMetrics = useMemo(() => getSmsMetrics(smsBody), [smsBody]);

  const resolvedRecipients = useMemo(() => {
    if (recipientMode === 'all_investors') {
      return investors.map((i) => i.phone);
    }
    if (recipientMode === 'selected_investors') {
      return selectedInvestorPhones;
    }
    return Array.from(
      new Set(
        manualNumbers
          .split(/[\n,;]+/)
          .map((s) => normalizePhone(s.trim()))
          .filter((s) => s.length >= 10)
      )
    );
  }, [recipientMode, investors, selectedInvestorPhones, manualNumbers]);

  const filteredInvestors = useMemo(() => {
    const q = investorSearch.trim().toLowerCase();
    if (!q) return investors;
    return investors.filter(
      (i) => i.name.toLowerCase().includes(q) || i.phone.includes(q)
    );
  }, [investors, investorSearch]);

  const filteredLogs = useMemo(() => {
    const q = historySearch.trim().toLowerCase();
    return logs.filter((log) => {
      if (historyTypeFilter !== 'all' && log.type !== historyTypeFilter) return false;
      if (historyStatusFilter !== 'all' && log.status !== historyStatusFilter) return false;
      if (!q) return true;
      return (
        log.message.toLowerCase().includes(q) ||
        (log.requestId || '').toLowerCase().includes(q) ||
        log.recipients.some((r) => r.toLowerCase().includes(q))
      );
    });
  }, [logs, historySearch, historyTypeFilter, historyStatusFilter]);

  const historyStats = useMemo(() => {
    const total = logs.length;
    const delivered = logs.filter((l) => l.status === 'Complete' || l.status === 'Submitted' || l.status === 'Scheduled').length;
    const failed = logs.filter((l) => l.status === 'Failed').length;
    const totalCharge = logs.reduce((sum, l) => sum + (parseFloat(l.charge || '0') || 0), 0);
    return { total, delivered, failed, totalCharge };
  }, [logs]);

  const handleSendSms = async (e: React.FormEvent) => {
    e.preventDefault();
    setSendStatus(null);

    if (resolvedRecipients.length === 0) {
      setSendStatus({ type: 'error', text: 'অন্তত একটি সঠিক মোবাইল নম্বর দিন অথবা ইনভেস্টর নির্বাচন করুন।' });
      return;
    }
    if (!smsBody.trim()) {
      setSendStatus({ type: 'error', text: 'SMS মেসেজ লিখুন।' });
      return;
    }

    setSendingSms(true);
    const formattedSchedule = formatScheduleForGateway(scheduleInput);
    const smsType: SmsLog['type'] = formattedSchedule
      ? 'scheduled'
      : resolvedRecipients.length > 1
        ? 'bulk'
        : 'single';

    try {
      const response = await fetch('/api/sms/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipients: resolvedRecipients.join(','),
          message: smsBody.trim(),
          schedule: formattedSchedule || undefined,
          senderId: senderIdOverride.trim() || undefined,
          contentId: contentIdOverride.trim() || undefined,
          apiKey: config.apiKey || DEFAULT_API_KEY,
        }),
      });

      const rawText = await response.text();
      let data: any;
      try {
        data = JSON.parse(rawText);
      } catch {
        throw new Error(`Invalid server response (${response.status})`);
      }

      if (response.ok && data.success) {
        const logEntry: Omit<SmsLog, 'id'> = {
          requestId: data.requestId ? String(data.requestId) : '',
          recipients: resolvedRecipients,
          recipientCount: resolvedRecipients.length,
          message: smsBody.trim(),
          type: smsType,
          status: formattedSchedule ? 'Scheduled' : 'Submitted',
          errorCode: 0,
          senderId: senderIdOverride.trim() || '',
          contentId: contentIdOverride.trim() || '',
          schedule: formattedSchedule || '',
          createdAt: new Date().toISOString(),
        };
        await addDoc(collection(db, 'smsLogs'), logEntry);

        setSendStatus({
          type: 'success',
          text: `SMS সফলভাবে পাঠানো হয়েছে! (${resolvedRecipients.length} জন প্রাপক${data.requestId ? `, Request ID: ${data.requestId}` : ''})`,
        });
        setSmsBody('');
        setScheduleInput('');
        if (recipientMode === 'manual') setManualNumbers('');
        fetchBalance(config.apiKey);
      } else {
        await addDoc(collection(db, 'smsLogs'), {
          recipients: resolvedRecipients,
          recipientCount: resolvedRecipients.length,
          message: smsBody.trim(),
          type: smsType,
          status: 'Failed',
          errorCode: data.errorCode ?? -1,
          errorMessage: data.error || 'Failed to send SMS',
          senderId: senderIdOverride.trim() || '',
          contentId: contentIdOverride.trim() || '',
          schedule: formattedSchedule || '',
          createdAt: new Date().toISOString(),
        });
        setSendStatus({ type: 'error', text: data.error || 'SMS পাঠানো যায়নি।' });
      }
    } catch (err: any) {
      setSendStatus({ type: 'error', text: err.message || 'SMS পাঠাতে ত্রুটি হয়েছে।' });
    } finally {
      setSendingSms(false);
    }
  };

  const handleCheckReport = async (logItem: SmsLog) => {
    if (!logItem.requestId || !logItem.id) return;
    setCheckingReportId(logItem.id);
    try {
      const res = await fetch(
        `/api/sms/report/${encodeURIComponent(logItem.requestId)}?apiKey=${encodeURIComponent(config.apiKey || DEFAULT_API_KEY)}`
      );
      const data = await res.json();
      if (!res.ok || !data.success || !data.report) {
        throw new Error(data.error || 'Report could not be retrieved');
      }

      const report = data.report;
      const mappedStatus: SmsLog['status'] =
        report.request_status === 'Complete'
          ? 'Complete'
          : report.request_status === 'Failed'
            ? 'Failed'
            : 'Processing';

      const updatedFields: Partial<SmsLog> = {
        status: mappedStatus,
        charge: report.request_charge ? String(report.request_charge) : logItem.charge,
        reportRecipients: Array.isArray(report.recipients) ? report.recipients : [],
        updatedAt: new Date().toISOString(),
      };

      await updateDoc(doc(db, 'smsLogs', logItem.id), updatedFields);
      setSelectedLogReport({ ...logItem, ...updatedFields });
    } catch (err: any) {
      setConfigStatus({ type: 'error', text: err.message || 'Delivery report fetch failed' });
    } finally {
      setCheckingReportId(null);
    }
  };

  const handleSaveTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!templateForm.name.trim() || !templateForm.content.trim()) return;
    setSavingTemplate(true);
    try {
      const now = new Date().toISOString();
      if (editingTemplate?.id) {
        await updateDoc(doc(db, 'smsTemplates', editingTemplate.id), {
          name: templateForm.name.trim(),
          category: templateForm.category,
          content: templateForm.content.trim(),
          contentId: templateForm.contentId.trim(),
          updatedAt: now,
        });
      } else {
        await addDoc(collection(db, 'smsTemplates'), {
          name: templateForm.name.trim(),
          category: templateForm.category,
          content: templateForm.content.trim(),
          contentId: templateForm.contentId.trim(),
          createdAt: now,
          updatedAt: now,
        });
      }
      setIsTemplateModalOpen(false);
      setEditingTemplate(null);
      setTemplateForm({ name: '', category: 'General', content: '', contentId: '' });
    } catch (err) {
      console.error('Failed to save template:', err);
    } finally {
      setSavingTemplate(false);
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'smsTemplates', id));
    } catch (err) {
      console.error('Failed to delete template:', err);
    }
  };

  const handleUseTemplate = (tpl: SmsTemplate) => {
    setSmsBody(tpl.content);
    if (tpl.contentId) setContentIdOverride(tpl.contentId);
    setActiveTab('send');
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingConfig(true);
    setConfigStatus(null);
    try {
      const payload: SmsConfig = {
        apiKey: config.apiKey.trim() || DEFAULT_API_KEY,
        senderId: (config.senderId || '').trim(),
        defaultContentId: (config.defaultContentId || '').trim(),
        otpTemplate: (config.otpTemplate || DEFAULT_OTP_TEMPLATE).trim(),
        updatedAt: new Date().toISOString(),
      };

      await setDoc(doc(db, 'smsConfig', 'default'), payload);
      const res = await fetch('/api/sms/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Server config sync failed');

      setConfig(payload);
      setSenderIdOverride(payload.senderId || '');
      setContentIdOverride(payload.defaultContentId || '');
      await fetchBalance(payload.apiKey);
      setConfigStatus({ type: 'success', text: 'SMS Gateway কনফিগারেশন সফলভাবে সেভ ও যাচাই হয়েছে!' });
    } catch (err: any) {
      setConfigStatus({ type: 'error', text: err.message || 'সেটিংস সেভ করতে সমস্যা হয়েছে।' });
    } finally {
      setSavingConfig(false);
    }
  };

  const toggleInvestorPhone = (phone: string) => {
    setSelectedInvestorPhones((prev) =>
      prev.includes(phone) ? prev.filter((p) => p !== phone) : [...prev, phone]
    );
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight flex items-center space-x-2.5">
            <MessageSquare className="h-7 w-7 text-green-600" />
            <span>SMS & OTP Gateway Manager</span>
          </h1>
          <p className="text-gray-500 text-xs sm:text-sm mt-1">
            Alpha Net SMS (`api.sms.net.bd`) ব্যালেন্স, বাল্ক/সিঙ্গেল SMS, OTP কনফিগারেশন, টেমপ্লেট ও হিস্টোরি পরিচালনা করুন।
          </p>
        </div>

        <button
          type="button"
          onClick={() => fetchBalance(config.apiKey)}
          disabled={balanceLoading}
          className="inline-flex items-center space-x-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-semibold px-4 py-2.5 rounded-xl text-xs shadow-sm transition-all cursor-pointer self-start md:self-auto"
        >
          <RefreshCw className={`h-4 w-4 text-green-600 ${balanceLoading ? 'animate-spin' : ''}`} />
          <span>Refresh Balance</span>
        </button>
      </div>

      {/* Top Metrics & Balance Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-[#1A2E26] to-[#244136] text-white p-5 rounded-2xl shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-green-300">SMS Balance</span>
            <Wallet className="h-5 w-5 text-green-300" />
          </div>
          {balanceLoading ? (
            <div className="h-8 w-28 bg-white/10 animate-pulse rounded-lg my-1" />
          ) : balanceError ? (
            <div className="text-xs text-red-300 font-semibold mt-1">{balanceError}</div>
          ) : (
            <div className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              ৳{balance !== null ? Number(balance).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}
            </div>
          )}
          <div className="text-[11px] text-gray-300 mt-2 flex items-center justify-between">
            <span>{validity ? `Valid till: ${validity.split(' ')[0]}` : 'Alpha Net Active'}</span>
            {balance !== null && <span className="font-mono text-[10px] opacity-80">Raw: {balance}</span>}
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Total SMS Sent</span>
            <Send className="h-5 w-5 text-blue-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-gray-900">{historyStats.total}</div>
          <div className="text-xs text-gray-500 mt-2">
            Success/Submitted: <span className="font-bold text-green-600">{historyStats.delivered}</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Saved Templates</span>
            <FileText className="h-5 w-5 text-amber-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-gray-900">{templates.length}</div>
          <div className="text-xs text-gray-500 mt-2">
            Reusable SMS & Notification templates
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Failed / Charge</span>
            <ShieldCheck className="h-5 w-5 text-purple-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-gray-900">
            {historyStats.failed} <span className="text-sm font-semibold text-gray-400">failed</span>
          </div>
          <div className="text-xs text-gray-500 mt-2">
            Reported Cost: <span className="font-bold text-gray-800">৳{historyStats.totalCharge.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white p-1.5 rounded-2xl border border-gray-100 shadow-sm flex flex-wrap gap-1.5">
        {([
          { id: 'send', label: 'Send SMS', icon: Send },
          { id: 'history', label: `SMS History (${logs.length})`, icon: History },
          { id: 'templates', label: `Templates (${templates.length})`, icon: FileText },
          { id: 'settings', label: 'API & OTP Config', icon: SettingsIcon },
        ] as const).map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              activeTab === tab.id
                ? 'bg-green-600 text-white shadow-sm'
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            }`}
          >
            <tab.icon className="h-4 w-4" />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* TAB 1: SEND SMS */}
      {activeTab === 'send' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <form onSubmit={handleSendSms} className="lg:col-span-2 bg-white rounded-3xl border border-gray-100 shadow-sm p-6 sm:p-8 space-y-6">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Compose & Dispatch SMS</h2>
              <p className="text-xs text-gray-500 mt-0.5">একজন বা একাধিক প্রাপকের নম্বরে সাথে সাথে অথবা শিডিউল করে SMS পাঠান।</p>
            </div>

            {sendStatus && (
              <div className={`p-4 rounded-xl text-xs font-semibold flex items-start space-x-2.5 ${
                sendStatus.type === 'success'
                  ? 'bg-green-50 text-green-700 border border-green-100'
                  : 'bg-red-50 text-red-700 border border-red-100'
              }`}>
                {sendStatus.type === 'success' ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                )}
                <span>{sendStatus.text}</span>
              </div>
            )}

            {/* Recipient Selection Mode */}
            <div className="space-y-3">
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">Recipients</label>
              <div className="grid grid-cols-3 gap-2 p-1 bg-gray-50 rounded-xl border border-gray-100">
                <button
                  type="button"
                  onClick={() => setRecipientMode('manual')}
                  className={`py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    recipientMode === 'manual' ? 'bg-white text-green-700 shadow-sm' : 'text-gray-500 hover:text-gray-800'
                  }`}
                >
                  Manual Number(s)
                </button>
                <button
                  type="button"
                  onClick={() => setRecipientMode('all_investors')}
                  className={`py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    recipientMode === 'all_investors' ? 'bg-white text-green-700 shadow-sm' : 'text-gray-500 hover:text-gray-800'
                  }`}
                >
                  All Investors ({investors.length})
                </button>
                <button
                  type="button"
                  onClick={() => setRecipientMode('selected_investors')}
                  className={`py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    recipientMode === 'selected_investors' ? 'bg-white text-green-700 shadow-sm' : 'text-gray-500 hover:text-gray-800'
                  }`}
                >
                  Pick Investors ({selectedInvestorPhones.length})
                </button>
              </div>

              {recipientMode === 'manual' && (
                <div>
                  <textarea
                    rows={2}
                    value={manualNumbers}
                    onChange={(e) => setManualNumbers(e.target.value)}
                    placeholder="01712345678, 8801812345678 (একাধিক নম্বর কমা বা নতুন লাইন দিয়ে লিখুন)"
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all"
                  />
                  <p className="text-[11px] text-gray-400 mt-1">
                    সঠিক ফরম্যাটে প্রাপ্ত নম্বর: <span className="font-bold text-gray-700">{resolvedRecipients.length}</span> টি
                  </p>
                </div>
              )}

              {recipientMode === 'all_investors' && (
                <div className="bg-green-50/70 border border-green-100 rounded-xl p-4 flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Users className="h-5 w-5 text-green-600" />
                    <div>
                      <p className="text-xs font-bold text-green-900">সকল নিবন্ধিত ইনভেস্টর ({investors.length} জন)</p>
                      <p className="text-[11px] text-green-700">সিস্টেমে থাকা সকল ইনভেস্টরের বৈধ মোবাইল নম্বরে SMS যাবে।</p>
                    </div>
                  </div>
                </div>
              )}

              {recipientMode === 'selected_investors' && (
                <div className="border border-gray-200 rounded-xl p-3 space-y-2.5 bg-gray-50/50">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      value={investorSearch}
                      onChange={(e) => setInvestorSearch(e.target.value)}
                      placeholder="নাম বা নম্বর দিয়ে ইনভেস্টর খুঁজুন..."
                      className="w-full pl-9 pr-3 py-2 bg-white border border-gray-200 rounded-lg text-xs outline-none focus:border-green-500"
                    />
                  </div>
                  <div className="max-h-40 overflow-y-auto space-y-1 pr-1">
                    {filteredInvestors.length === 0 ? (
                      <p className="text-xs text-gray-400 text-center py-3">কোনো ইনভেস্টর পাওয়া যায়নি।</p>
                    ) : (
                      filteredInvestors.map((inv) => {
                        const checked = selectedInvestorPhones.includes(inv.phone);
                        return (
                          <button
                            key={inv.phone}
                            type="button"
                            onClick={() => toggleInvestorPhone(inv.phone)}
                            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs transition-all cursor-pointer ${
                              checked ? 'bg-green-50 border border-green-200 text-green-900 font-bold' : 'bg-white border border-gray-100 text-gray-700 hover:bg-gray-50'
                            }`}
                          >
                            <span>{inv.name}</span>
                            <div className="flex items-center space-x-2">
                              <span className="font-mono">{inv.phone}</span>
                              {checked && <Check className="h-3.5 w-3.5 text-green-600" />}
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Template Quick Select */}
            {templates.length > 0 && (
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                  Use Saved Template (Optional)
                </label>
                <select
                  onChange={(e) => {
                    const found = templates.find((t) => t.id === e.target.value);
                    if (found) {
                      setSmsBody(found.content);
                      if (found.contentId) setContentIdOverride(found.contentId);
                    }
                  }}
                  defaultValue=""
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-700 outline-none focus:border-green-500"
                >
                  <option value="">-- একটি সেভ করা টেমপ্লেট বেছে নিন --</option>
                  {templates.map((tpl) => (
                    <option key={tpl.id} value={tpl.id}>
                      [{tpl.category}] {tpl.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Message Body */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">Message Content</label>
                <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${
                  smsMetrics.isUnicode ? 'bg-amber-50 text-amber-700' : 'bg-gray-100 text-gray-600'
                }`}>
                  {smsMetrics.isUnicode ? 'Unicode (Bangla)' : 'GSM-7 (English)'}
                </span>
              </div>
              <textarea
                rows={5}
                required
                value={smsBody}
                onChange={(e) => setSmsBody(e.target.value)}
                placeholder="আপনার SMS বার্তা এখানে লিখুন..."
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all"
              />
              <div className="flex items-center justify-between text-[11px] text-gray-500 mt-1.5 font-semibold">
                <span>
                  {smsMetrics.length} characters • {smsMetrics.segments} SMS part(s)
                </span>
                <span>
                  Recipients: {resolvedRecipients.length} • Est. Parts: {resolvedRecipients.length * smsMetrics.segments}
                </span>
              </div>
            </div>

            {/* Optional Gateway Parameters */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 border-t border-gray-100">
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1 flex items-center space-x-1">
                  <Calendar className="h-3 w-3" />
                  <span>Schedule (Optional)</span>
                </label>
                <input
                  type="datetime-local"
                  value={scheduleInput}
                  onChange={(e) => setScheduleInput(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs outline-none focus:border-green-500"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Sender ID (Optional)</label>
                <input
                  type="text"
                  value={senderIdOverride}
                  onChange={(e) => setSenderIdOverride(e.target.value)}
                  placeholder="Approved Sender ID"
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs outline-none focus:border-green-500"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Content ID (Bulk Optional)</label>
                <input
                  type="text"
                  value={contentIdOverride}
                  onChange={(e) => setContentIdOverride(e.target.value)}
                  placeholder="Campaign Content ID"
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs outline-none focus:border-green-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={sendingSms || resolvedRecipients.length === 0 || !smsBody.trim()}
              className="w-full py-3.5 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl shadow-md shadow-green-100 transition-all text-sm flex items-center justify-center space-x-2 disabled:opacity-50 cursor-pointer"
            >
              {sendingSms ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  <span>
                    {scheduleInput ? 'Schedule SMS' : `Send SMS Now (${resolvedRecipients.length})`}
                  </span>
                </>
              )}
            </button>
          </form>

          {/* Right Sidebar: Quick Templates & Formatting Guide */}
          <div className="space-y-6">
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-gray-900 flex items-center space-x-2">
                  <Sparkles className="h-4 w-4 text-amber-500" />
                  <span>Quick Templates</span>
                </h3>
                <button
                  type="button"
                  onClick={() => {
                    setEditingTemplate(null);
                    setTemplateForm({ name: '', category: 'General', content: '', contentId: '' });
                    setIsTemplateModalOpen(true);
                  }}
                  className="text-xs font-bold text-green-600 hover:underline cursor-pointer"
                >
                  + New
                </button>
              </div>
              {templates.length === 0 ? (
                <p className="text-xs text-gray-400">কোনো টেমপ্লেট সেভ করা নেই। Templates ট্যাব থেকে নতুন টেমপ্লেট তৈরি করুন।</p>
              ) : (
                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {templates.map((tpl) => (
                    <button
                      key={tpl.id}
                      type="button"
                      onClick={() => handleUseTemplate(tpl)}
                      className="w-full text-left p-3 rounded-xl bg-gray-50 hover:bg-green-50 border border-gray-100 hover:border-green-200 transition-all cursor-pointer"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-gray-900">{tpl.name}</span>
                        <span className="text-[10px] font-bold text-green-700 bg-green-100 px-2 py-0.5 rounded-md">
                          {tpl.category}
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-500 line-clamp-2">{tpl.content}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-amber-50/70 rounded-3xl border border-amber-100 p-6 space-y-2.5 text-xs text-amber-900">
              <h4 className="font-bold flex items-center space-x-1.5">
                <ShieldCheck className="h-4 w-4 text-amber-700" />
                <span>Alpha Net SMS Guidelines</span>
              </h4>
              <ul className="space-y-1.5 text-[11px] text-amber-800 list-disc pl-4">
                <li>বাংলাদেশের যেকোনো <code>01XXXXXXXXX</code> বা <code>8801XXXXXXXXX</code> নম্বর অটোমেটিক কনভার্ট হয়।</li>
                <li>ইংরেজি (GSM-7) প্রতি পার্ট ১৬০ অক্ষর এবং বাংলা (Unicode) প্রতি পার্ট ৭০ অক্ষর।</li>
                <li>বাল্ক ক্যাম্পেইন SMS-এর জন্য অনুমোদিত <code>content_id</code> প্রয়োজন হতে পারে।</li>
                <li>OTP SMS স্বয়ংক্রিয়ভাবে ইনভেস্টর লগইন পেইজ থেকে পাঠানো হয় এবং History-তে সংরক্ষিত থাকে।</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: SMS HISTORY */}
      {activeTab === 'history' && (
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-gray-900">SMS & OTP Dispatch History</h2>
              <p className="text-xs text-gray-500">পাঠানো প্রতিটি SMS-এর স্ট্যাটাস, খরচ এবং লাইভ ডেলিভারি রিপোর্ট দেখুন।</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  value={historySearch}
                  onChange={(e) => setHistorySearch(e.target.value)}
                  placeholder="নম্বর, মেসেজ বা Request ID..."
                  className="pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs outline-none focus:border-green-500"
                />
              </div>
              <select
                value={historyTypeFilter}
                onChange={(e) => setHistoryTypeFilter(e.target.value as any)}
                className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold outline-none"
              >
                <option value="all">All Types</option>
                <option value="otp">OTP</option>
                <option value="single">Single</option>
                <option value="bulk">Bulk</option>
                <option value="scheduled">Scheduled</option>
              </select>
              <select
                value={historyStatusFilter}
                onChange={(e) => setHistoryStatusFilter(e.target.value as any)}
                className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold outline-none"
              >
                <option value="all">All Status</option>
                <option value="Submitted">Submitted</option>
                <option value="Complete">Complete</option>
                <option value="Scheduled">Scheduled</option>
                <option value="Failed">Failed</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 text-[10px] font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100">
                  <th className="py-3.5 px-5">Date & Time</th>
                  <th className="py-3.5 px-4">Type</th>
                  <th className="py-3.5 px-4">Recipients</th>
                  <th className="py-3.5 px-4">Message</th>
                  <th className="py-3.5 px-4">Request ID</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Charge</th>
                  <th className="py-3.5 px-5 text-right">Report</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-xs">
                {filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-gray-400">
                      এখনো কোনো SMS হিস্টোরি পাওয়া যায়নি।
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50/70 transition-colors">
                      <td className="py-3.5 px-5 whitespace-nowrap text-gray-600">
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${
                          log.type === 'otp'
                            ? 'bg-purple-50 text-purple-700'
                            : log.type === 'bulk'
                              ? 'bg-blue-50 text-blue-700'
                              : log.type === 'scheduled'
                                ? 'bg-amber-50 text-amber-700'
                                : 'bg-gray-100 text-gray-700'
                        }`}>
                          {log.type}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-mono font-semibold text-gray-800">
                          {log.recipients[0] || '-'}
                          {log.recipientCount > 1 && (
                            <span className="ml-1.5 text-[10px] bg-gray-100 px-1.5 py-0.5 rounded font-sans text-gray-600">
                              +{log.recipientCount - 1} more
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 max-w-xs">
                        <p className="text-gray-700 line-clamp-2">{log.message}</p>
                        {log.errorMessage && (
                          <p className="text-[10px] text-red-600 font-semibold mt-0.5">{log.errorMessage}</p>
                        )}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-gray-600">
                        {log.requestId || '—'}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          log.status === 'Complete'
                            ? 'bg-green-100 text-green-800'
                            : log.status === 'Submitted' || log.status === 'Processing'
                              ? 'bg-blue-100 text-blue-800'
                              : log.status === 'Scheduled'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-red-100 text-red-800'
                        }`}>
                          {log.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-gray-700">
                        {log.charge ? `৳${log.charge}` : '—'}
                      </td>
                      <td className="py-3.5 px-5 text-right whitespace-nowrap">
                        {log.requestId ? (
                          <button
                            type="button"
                            onClick={() => handleCheckReport(log)}
                            disabled={checkingReportId === log.id}
                            className="inline-flex items-center space-x-1 px-2.5 py-1.5 bg-green-50 hover:bg-green-100 text-green-700 rounded-lg text-[11px] font-bold transition-colors cursor-pointer disabled:opacity-50"
                          >
                            <RefreshCw className={`h-3 w-3 ${checkingReportId === log.id ? 'animate-spin' : ''}`} />
                            <span>Check Report</span>
                          </button>
                        ) : (
                          <span className="text-[11px] text-gray-400">N/A</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: SMS TEMPLATES */}
      {activeTab === 'templates' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
            <div>
              <h2 className="text-lg font-bold text-gray-900">SMS Templates Library</h2>
              <p className="text-xs text-gray-500">বারবার ব্যবহৃত নোটিশ, পেমেন্ট রিমাইন্ডার বা প্রজেক্ট আপডেট টেমপ্লেট হিসেবে সেভ করে রাখুন।</p>
            </div>
            <button
              type="button"
              onClick={() => {
                setEditingTemplate(null);
                setTemplateForm({ name: '', category: 'General', content: '', contentId: '' });
                setIsTemplateModalOpen(true);
              }}
              className="inline-flex items-center space-x-2 bg-green-600 hover:bg-green-700 text-white font-bold px-5 py-2.5 rounded-xl text-xs shadow-sm transition-all cursor-pointer self-start sm:self-auto"
            >
              <Plus className="h-4 w-4" />
              <span>Create Template</span>
            </button>
          </div>

          {templates.length === 0 ? (
            <div className="bg-white rounded-3xl border border-dashed border-gray-200 p-12 text-center space-y-3">
              <FileText className="h-10 w-10 text-gray-300 mx-auto" />
              <p className="text-sm font-bold text-gray-700">এখনো কোনো SMS টেমপ্লেট তৈরি করা হয়নি</p>
              <p className="text-xs text-gray-400">নতুন টেমপ্লেট তৈরি করলে এক ক্লিকেই SMS পাঠানো যাবে।</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {templates.map((tpl) => {
                const metrics = getSmsMetrics(tpl.content);
                return (
                  <div key={tpl.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col justify-between space-y-4">
                    <div className="space-y-2.5">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="inline-block text-[10px] font-bold uppercase px-2 py-0.5 rounded-md bg-green-50 text-green-700 mb-1">
                            {tpl.category}
                          </span>
                          <h3 className="text-sm font-bold text-gray-900">{tpl.name}</h3>
                        </div>
                        <div className="flex items-center space-x-1">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingTemplate(tpl);
                              setTemplateForm({
                                name: tpl.name,
                                category: tpl.category,
                                content: tpl.content,
                                contentId: tpl.contentId || '',
                              });
                              setIsTemplateModalOpen(true);
                            }}
                            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => tpl.id && handleDeleteTemplate(tpl.id)}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                      <p className="text-xs text-gray-600 bg-gray-50 p-3 rounded-xl leading-relaxed whitespace-pre-wrap">
                        {tpl.content}
                      </p>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                      <span className="text-[10px] font-semibold text-gray-400">
                        {metrics.length} chars • {metrics.segments} part(s)
                      </span>
                      <button
                        type="button"
                        onClick={() => handleUseTemplate(tpl)}
                        className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
                      >
                        <Send className="h-3 w-3" />
                        <span>Use Template</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 4: API & OTP SETTINGS */}
      {activeTab === 'settings' && (
        <form onSubmit={handleSaveConfig} className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 sm:p-8 max-w-3xl space-y-6">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Alpha Net SMS & OTP Configuration</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Gateway Endpoint: <code>https://api.sms.net.bd</code> — API Key, Sender ID এবং Investor Login OTP মেসেজ ফরম্যাট কনফিগার করুন।
            </p>
          </div>

          {configStatus && (
            <div className={`p-4 rounded-xl text-xs font-semibold flex items-start space-x-2.5 ${
              configStatus.type === 'success'
                ? 'bg-green-50 text-green-700 border border-green-100'
                : 'bg-red-50 text-red-700 border border-red-100'
            }`}>
              {configStatus.type === 'success' ? (
                <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              )}
              <span>{configStatus.text}</span>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                Alpha Net API Key *
              </label>
              <div className="relative">
                <input
                  type={showApiKey ? 'text' : 'password'}
                  required
                  value={config.apiKey}
                  onChange={(e) => setConfig({ ...config, apiKey: e.target.value })}
                  className="w-full pl-4 pr-12 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-mono focus:outline-none focus:border-green-500"
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-gray-400 hover:text-gray-700 cursor-pointer"
                >
                  {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                  Default Sender ID (Optional)
                </label>
                <input
                  type="text"
                  value={config.senderId || ''}
                  onChange={(e) => setConfig({ ...config, senderId: e.target.value })}
                  placeholder="খালি রাখলে ডিফল্ট নন-মাস্কিং যাবে"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-green-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                  Default Bulk Content ID (Optional)
                </label>
                <input
                  type="text"
                  value={config.defaultContentId || ''}
                  onChange={(e) => setConfig({ ...config, defaultContentId: e.target.value })}
                  placeholder="Bulk campaign content_id"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-green-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                Investor Login OTP Message Template *
              </label>
              <textarea
                rows={3}
                required
                value={config.otpTemplate}
                onChange={(e) => setConfig({ ...config, otpTemplate: e.target.value })}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-green-500"
              />
              <p className="text-[11px] text-gray-500 mt-1">
                মেসেজের মধ্যে অবশ্যই <code className="bg-gray-100 px-1.5 py-0.5 rounded font-bold text-green-700">{'{otp}'}</code> রাখুন — সিস্টেম সেখানে ৬ সংখ্যার কোড বসিয়ে দেবে।
              </p>
            </div>
          </div>

          <button
            type="submit"
            disabled={savingConfig}
            className="inline-flex items-center space-x-2 bg-green-600 hover:bg-green-700 text-white font-bold px-6 py-3 rounded-xl text-sm shadow-md shadow-green-100 transition-all cursor-pointer disabled:opacity-50"
          >
            {savingConfig ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
            ) : (
              <CheckCircle2 className="h-4 w-4" />
            )}
            <span>Save Configuration & Test Balance</span>
          </button>
        </form>
      )}

      {/* Template Create/Edit Modal */}
      {isTemplateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <h3 className="text-lg font-bold text-gray-900">
                {editingTemplate ? 'Edit SMS Template' : 'Create SMS Template'}
              </h3>
              <button
                type="button"
                onClick={() => setIsTemplateModalOpen(false)}
                className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveTemplate} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Template Name *</label>
                <input
                  type="text"
                  required
                  value={templateForm.name}
                  onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })}
                  placeholder="e.g. Monthly Profit Alert"
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:border-green-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Category</label>
                  <select
                    value={templateForm.category}
                    onChange={(e) => setTemplateForm({ ...templateForm, category: e.target.value as any })}
                    className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold outline-none focus:border-green-500"
                  >
                    {TEMPLATE_CATEGORIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Content ID (Optional)</label>
                  <input
                    type="text"
                    value={templateForm.contentId}
                    onChange={(e) => setTemplateForm({ ...templateForm, contentId: e.target.value })}
                    placeholder="Approved Bulk ID"
                    className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs outline-none focus:border-green-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Message Body *</label>
                <textarea
                  rows={4}
                  required
                  value={templateForm.content}
                  onChange={(e) => setTemplateForm({ ...templateForm, content: e.target.value })}
                  placeholder="এখানে আপনার টেমপ্লেট মেসেজ লিখুন..."
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:border-green-500"
                />
              </div>

              <div className="flex items-center space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsTemplateModalOpen(false)}
                  className="flex-1 py-2.5 border border-gray-200 text-gray-600 rounded-xl text-xs font-bold hover:bg-gray-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingTemplate}
                  className="flex-1 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl text-xs font-bold shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {savingTemplate ? 'Saving...' : 'Save Template'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delivery Report Modal */}
      {selectedLogReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div>
                <h3 className="text-lg font-bold text-gray-900">SMS Delivery Report</h3>
                <p className="text-xs text-gray-500 font-mono">Request ID: {selectedLogReport.requestId}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedLogReport(null)}
                className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 bg-gray-50 p-4 rounded-2xl text-xs">
              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase block">Request Status</span>
                <span className="font-bold text-gray-900">{selectedLogReport.status}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase block">Total Charge</span>
                <span className="font-bold font-mono text-green-700">৳{selectedLogReport.charge || '0.0000'}</span>
              </div>
            </div>

            <div className="max-h-56 overflow-y-auto space-y-2">
              {(selectedLogReport.reportRecipients || []).length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-4">No per-recipient breakdown available.</p>
              ) : (
                selectedLogReport.reportRecipients!.map((r, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl text-xs">
                    <span className="font-mono font-bold text-gray-800">{r.number}</span>
                    <div className="flex items-center space-x-3">
                      <span className="font-mono text-gray-500">৳{r.charge}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        r.status === 'Sent' || r.status === 'Delivered'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-amber-100 text-amber-700'
                      }`}>
                        {r.status}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>

            <button
              type="button"
              onClick={() => setSelectedLogReport(null)}
              className="w-full py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
