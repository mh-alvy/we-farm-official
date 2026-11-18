import React, { useState, useEffect, useMemo } from 'react';
import { 
  collection, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  orderBy, 
  onSnapshot 
} from 'firebase/firestore';
import { db, auth } from '../../firebase';
import { 
  LedgerAccount, 
  LedgerPayment, 
  AccountCategory, 
  TransactionType, 
  AccountStatus 
} from '../../types';
import { 
  Plus, 
  Search, 
  Filter, 
  Download, 
  Trash2, 
  Archive, 
  RotateCcw, 
  User as UserIcon, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  ChevronRight, 
  FileText, 
  Send, 
  MessageSquare, 
  Mail, 
  Calendar, 
  Phone, 
  MapPin, 
  Shield, 
  SlidersHorizontal,
  X,
  CreditCard,
  Printer,
  ChevronDown
} from 'lucide-react';
import { formatCurrency, formatDate } from '../../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Legend 
} from 'recharts';
import { CURRENCY_SYMBOL, FARM_NAME } from '../../constants';

export default function AccountsManagement() {
  const [accounts, setAccounts] = useState<LedgerAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'active' | 'archived' | 'all'>('active');
  const isSuperAdmin = auth.currentUser?.email === 'alvymahamudulhasan@gmail.com';

  // Interactive UI Modal States
  const [isTxModalOpen, setIsTxModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<LedgerAccount | null>(null);
  const [profileAccount, setProfileAccount] = useState<LedgerAccount | null>(null);
  const [editingAccount, setEditingAccount] = useState<LedgerAccount | null>(null);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterDueDate, setFilterDueDate] = useState<string>('all'); // 'all' | 'overdue' | 'today' | 'upcoming'
  const [sortBy, setSortBy] = useState<string>('dueDate');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Form states for transaction creation/editing
  const [txFormData, setTxFormData] = useState({
    personName: '',
    category: 'Customer' as AccountCategory,
    contactNumber: '',
    email: '',
    address: '',
    transactionType: 'Receivable' as TransactionType,
    amount: '',
    dueDate: new Date().toISOString().split('T')[0],
    description: '',
    referenceNumber: '',
    attachmentUrl: ''
  });

  // Form state for payment
  const [paymentFormData, setPaymentFormData] = useState({
    amount: '',
    date: new Date().toISOString().split('T')[0],
    paymentMethod: 'Bkash',
    referenceNumber: '',
    notes: '',
    processedBy: ''
  });

  // Deletion Confirmation state
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleteConfirmChecked, setDeleteConfirmChecked] = useState(false);

  // Simulated Reminder Templates Preview state
  const [reminderType, setReminderType] = useState<'whatsapp' | 'email' | 'sms'>('whatsapp');
  const [reminderCopied, setReminderCopied] = useState(false);

  // Real-time Firestore Sync
  useEffect(() => {
    setLoading(true);
    const q = query(collection(db, 'accounts'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docsData: LedgerAccount[] = [];
      snapshot.forEach((doc) => {
        docsData.push({ ...doc.data(), id: doc.id } as LedgerAccount);
      });
      setAccounts(docsData);
      setLoading(false);
    }, (error) => {
      console.error("Firestore sync error:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Helper values for current user
  const currentUserEmail = auth.currentUser?.email || 'admin@wefarm.com';

  // Categories & payment methods constants
  const categories: AccountCategory[] = [
    'Client', 'Customer', 'Investor', 'Owner / Partner', 
    'Vendor / Supplier', 'Employee', 'Contractor', 'Other'
  ];

  const paymentMethods = [
    'Bkash', 'Nagad', 'Rocket', 'Bank Transfer', 'Cash', 'Card', 'Other'
  ];

  // Helper functions for math
  const getRemainingDue = (account: LedgerAccount) => {
    const totalPaid = account.payments ? account.payments.reduce((sum, p) => sum + p.amount, 0) : 0;
    return Math.max(0, account.amount - totalPaid);
  };

  const getPaidAmount = (account: LedgerAccount) => {
    return account.payments ? account.payments.reduce((sum, p) => sum + p.amount, 0) : 0;
  };

  const isOverdue = (account: LedgerAccount) => {
    if (account.currentStatus === 'Fully Settled' || account.currentStatus === 'Cancelled') return false;
    const today = new Date();
    today.setHours(0,0,0,0);
    const due = new Date(account.dueDate);
    return due < today;
  };

  // Main Dashboard Metrics Calculation
  const metrics = useMemo(() => {
    let totalReceivable = 0;
    let totalPayable = 0;
    let settledCount = 0;
    let pendingCount = 0;
    let overdueAmount = 0;

    accounts.forEach((acc) => {
      if (acc.isArchived) return; // exclude archived from active dashboard counts
      const remaining = getRemainingDue(acc);

      if (acc.currentStatus === 'Fully Settled') {
        settledCount++;
      } else if (acc.currentStatus !== 'Cancelled') {
        pendingCount++;
      }

      if (acc.transactionType === 'Receivable') {
        if (acc.currentStatus !== 'Cancelled') {
          totalReceivable += remaining;
        }
      } else {
        if (acc.currentStatus !== 'Cancelled') {
          totalPayable += remaining;
        }
      }

      if (isOverdue(acc)) {
        overdueAmount += remaining;
      }
    });

    return {
      totalReceivable,
      totalPayable,
      totalOutstanding: totalReceivable - totalPayable,
      settledCount,
      pendingCount,
      overdueAmount
    };
  }, [accounts]);

  // Recharts Chart Data Calculations
  const chartData = useMemo(() => {
    // 1. Receivable vs Payable Pie
    const pie = [
      { name: 'Receivables', value: metrics.totalReceivable, color: '#16a34a' },
      { name: 'Payables', value: metrics.totalPayable, color: '#dc2626' }
    ];

    // 2. Category totals Bar Chart
    const catMap: Record<AccountCategory, { receivable: number; payable: number }> = {} as any;
    categories.forEach(c => {
      catMap[c] = { receivable: 0, payable: 0 };
    });

    accounts.forEach(acc => {
      if (acc.isArchived || acc.currentStatus === 'Cancelled') return;
      const remaining = getRemainingDue(acc);
      if (acc.transactionType === 'Receivable') {
        catMap[acc.category].receivable += remaining;
      } else {
        catMap[acc.category].payable += remaining;
      }
    });

    const bars = Object.entries(catMap).map(([key, value]) => ({
      name: key,
      Receivable: value.receivable,
      Payable: value.payable
    })).filter(item => item.Receivable > 0 || item.Payable > 0);

    return { pie, bars };
  }, [accounts, metrics]);

  // Filtered & Sorted list for table
  const filteredAccounts = useMemo(() => {
    return accounts.filter((acc) => {
      // 1. Tab filter (active vs archived)
      if (activeTab === 'active' && acc.isArchived) return false;
      if (activeTab === 'archived' && !acc.isArchived) return false;

      // 2. Search search text
      const matchesSearch = 
        acc.personName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        acc.transactionId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (acc.referenceNumber && acc.referenceNumber.toLowerCase().includes(searchQuery.toLowerCase())) ||
        acc.category.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;

      // 3. Type filter
      if (filterType !== 'all' && acc.transactionType !== filterType) return false;

      // 4. Category filter
      if (filterCategory !== 'all' && acc.category !== filterCategory) return false;

      // 5. Status filter
      if (filterStatus !== 'all' && acc.currentStatus !== filterStatus) return false;

      // 6. Due date filter
      if (filterDueDate !== 'all') {
        const today = new Date();
        today.setHours(0,0,0,0);
        const due = new Date(acc.dueDate);
        due.setHours(0,0,0,0);

        if (filterDueDate === 'overdue' && !isOverdue(acc)) return false;
        if (filterDueDate === 'today' && due.getTime() !== today.getTime()) return false;
        if (filterDueDate === 'upcoming' && due < today) return false;
      }

      return true;
    }).sort((a, b) => {
      let fieldA: any = a[sortBy as keyof LedgerAccount];
      let fieldB: any = b[sortBy as keyof LedgerAccount];

      if (sortBy === 'remaining') {
        fieldA = getRemainingDue(a);
        fieldB = getRemainingDue(b);
      }

      if (fieldA === undefined) return 1;
      if (fieldB === undefined) return -1;

      if (typeof fieldA === 'string') {
        return sortOrder === 'asc' 
          ? fieldA.localeCompare(fieldB)
          : fieldB.localeCompare(fieldA);
      } else {
        return sortOrder === 'asc'
          ? fieldA - fieldB
          : fieldB - fieldA;
      }
    });
  }, [accounts, activeTab, searchQuery, filterType, filterCategory, filterStatus, filterDueDate, sortBy, sortOrder]);

  // Paginated elements
  const paginatedAccounts = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredAccounts.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredAccounts, currentPage]);

  const totalPages = Math.ceil(filteredAccounts.length / itemsPerPage) || 1;

  // Actions execution
  const handleAddOrEditTx = async (e: React.FormEvent) => {
    e.preventDefault();

    const amountNum = parseFloat(txFormData.amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      alert("Amount must be a positive number.");
      return;
    }

    try {
      if (editingAccount) {
        // Edit flow
        const updatedFields = {
          personName: txFormData.personName,
          category: txFormData.category,
          contactNumber: txFormData.contactNumber,
          email: txFormData.email,
          address: txFormData.address,
          transactionType: txFormData.transactionType,
          amount: amountNum,
          dueDate: txFormData.dueDate,
          description: txFormData.description,
          referenceNumber: txFormData.referenceNumber,
          updatedAt: new Date().toISOString()
        };

        // Recalculate status based on new amount vs paid payments
        const paid = getPaidAmount(editingAccount);
        let newStatus: AccountStatus = 'Pending';
        if (paid >= amountNum) {
          newStatus = 'Fully Settled';
        } else if (paid > 0) {
          newStatus = 'Partially Paid';
        }

        await updateDoc(doc(db, 'accounts', editingAccount.id!), {
          ...updatedFields,
          currentStatus: newStatus
        });
        setIsTxModalOpen(false);
        setEditingAccount(null);
      } else {
        // Create flow
        const shortId = `TXN-${Math.floor(100000 + Math.random() * 900000)}`;
        const payload: Omit<LedgerAccount, 'id'> = {
          transactionId: shortId,
          personName: txFormData.personName,
          category: txFormData.category,
          contactNumber: txFormData.contactNumber,
          email: txFormData.email,
          address: txFormData.address,
          transactionType: txFormData.transactionType,
          amount: amountNum,
          currency: CURRENCY_SYMBOL,
          dueDate: txFormData.dueDate,
          description: txFormData.description,
          referenceNumber: txFormData.referenceNumber,
          attachmentUrl: txFormData.attachmentUrl,
          createdBy: currentUserEmail,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          currentStatus: 'Pending',
          isArchived: false,
          payments: []
        };

        await addDoc(collection(db, 'accounts'), payload);
        setIsTxModalOpen(false);
      }

      // Reset Form
      setTxFormData({
        personName: '',
        category: 'Customer',
        contactNumber: '',
        email: '',
        address: '',
        transactionType: 'Receivable',
        amount: '',
        dueDate: new Date().toISOString().split('T')[0],
        description: '',
        referenceNumber: '',
        attachmentUrl: ''
      });
    } catch (err) {
      console.error("Error saving ledger transaction:", err);
      alert("Failed to save transaction.");
    }
  };

  const handleAddPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAccount) return;

    const paymentAmount = parseFloat(paymentFormData.amount);
    const remainingDue = getRemainingDue(selectedAccount);

    if (isNaN(paymentAmount) || paymentAmount <= 0) {
      alert("Payment amount must be a positive number.");
      return;
    }

    if (paymentAmount > remainingDue) {
      alert(`Invalid Amount: Payment (৳${paymentAmount.toLocaleString()}) cannot be greater than the remaining due balance of ৳${remainingDue.toLocaleString()}`);
      return;
    }

    try {
      const newPayment: LedgerPayment = {
        id: `PAY-${Math.floor(100000 + Math.random() * 900000)}`,
        amount: paymentAmount,
        date: paymentFormData.date,
        paymentMethod: paymentFormData.paymentMethod,
        referenceNumber: paymentFormData.referenceNumber,
        notes: paymentFormData.notes,
        processedBy: paymentFormData.processedBy || currentUserEmail
      };

      const updatedPayments = [...(selectedAccount.payments || []), newPayment];
      const totalPaid = updatedPayments.reduce((sum, p) => sum + p.amount, 0);

      let newStatus: AccountStatus = 'Partially Paid';
      if (totalPaid >= selectedAccount.amount) {
        newStatus = 'Fully Settled';
      }

      await updateDoc(doc(db, 'accounts', selectedAccount.id!), {
        payments: updatedPayments,
        currentStatus: newStatus,
        updatedAt: new Date().toISOString()
      });

      // Update local drill-down view state if open
      if (profileAccount?.id === selectedAccount.id) {
        setProfileAccount({
          ...selectedAccount,
          payments: updatedPayments,
          currentStatus: newStatus
        });
      }

      setIsPaymentModalOpen(false);
      setSelectedAccount(null);
      setPaymentFormData({
        amount: '',
        date: new Date().toISOString().split('T')[0],
        paymentMethod: 'Bkash',
        referenceNumber: '',
        notes: '',
        processedBy: ''
      });
    } catch (err) {
      console.error("Error registering payment:", err);
      alert("Failed to submit payment update.");
    }
  };

  const handleArchive = async (account: LedgerAccount) => {
    try {
      await updateDoc(doc(db, 'accounts', account.id!), {
        isArchived: !account.isArchived,
        updatedAt: new Date().toISOString()
      });
    } catch (err) {
      console.error("Error archiving ledger item:", err);
    }
  };

  const handleMarkFullySettled = async (account: LedgerAccount) => {
    const remaining = getRemainingDue(account);
    if (remaining === 0) {
      try {
        await updateDoc(doc(db, 'accounts', account.id!), {
          currentStatus: 'Fully Settled',
          updatedAt: new Date().toISOString()
        });
      } catch (err) {
        console.error(err);
      }
      return;
    }

    if (confirm(`Outstanding balance is ${formatCurrency(remaining)}. Automatically create a settlement payment for the full remaining balance?`)) {
      try {
        const autoPayment: LedgerPayment = {
          id: `PAY-${Math.floor(100000 + Math.random() * 900000)}`,
          amount: remaining,
          date: new Date().toISOString().split('T')[0],
          paymentMethod: 'Cash',
          referenceNumber: 'AUTO-SETTLEMENT',
          notes: 'Auto-settled via Ledger Actions Panel',
          processedBy: currentUserEmail
        };

        const updatedPayments = [...(account.payments || []), autoPayment];

        await updateDoc(doc(db, 'accounts', account.id!), {
          payments: updatedPayments,
          currentStatus: 'Fully Settled',
          updatedAt: new Date().toISOString()
        });

        if (profileAccount?.id === account.id) {
          setProfileAccount({
            ...account,
            payments: updatedPayments,
            currentStatus: 'Fully Settled'
          });
        }
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handlePermanentDelete = async (accountId: string) => {
    if (!isSuperAdmin) {
      alert("Permission Denied: Only Super Admin / Developer (alvymahamudulhasan@gmail.com) can permanently delete ledger records.");
      return;
    }

    if (!deleteConfirmChecked || deleteConfirmText.toLowerCase() !== 'delete') {
      alert("Validation failed. Please check the confirmation checkbox and type 'delete' correctly.");
      return;
    }

    try {
      await deleteDoc(doc(db, 'accounts', accountId));
      setProfileAccount(null);
      setSelectedAccount(null);
      setDeleteConfirmText('');
      setDeleteConfirmChecked(false);
    } catch (err) {
      console.error("Error deleting document:", err);
      alert("Failed to delete record.");
    }
  };

  // Reminder message templates generator
  const reminderText = useMemo(() => {
    if (!profileAccount) return '';
    const remaining = getRemainingDue(profileAccount);
    const amountStr = formatCurrency(remaining);
    const dateStr = formatDate(profileAccount.dueDate);

    if (profileAccount.transactionType === 'Receivable') {
      return `Dear ${profileAccount.personName},\n\nThis is a friendly reminder from ${FARM_NAME} regarding outstanding dues of ${amountStr} which is due on ${dateStr}. Please kindly settle this payment at your earliest convenience.\n\nThank you for your support!\nBest regards,\n${FARM_NAME} Accounts`;
    } else {
      return `Dear team,\n\nThis is an internal check regarding our upcoming payable of ${amountStr} to ${profileAccount.personName} which is scheduled for payment on ${dateStr}. Please verify reference: ${profileAccount.referenceNumber || 'N/A'}.\n\nBest regards,\nWeFarm Accounts`;
    }
  }, [profileAccount]);

  const copyReminderToClipboard = () => {
    navigator.clipboard.writeText(reminderText);
    setReminderCopied(true);
    setTimeout(() => setReminderCopied(false), 2000);
  };

  // Generate and download custom reports
  const downloadCustomReport = (type: string) => {
    let list = accounts;
    let filename = 'Ledger_Report.csv';

    if (type === 'receivable') {
      list = accounts.filter(a => a.transactionType === 'Receivable');
      filename = 'Receivable_Report.csv';
    } else if (type === 'payable') {
      list = accounts.filter(a => a.transactionType === 'Payable');
      filename = 'Payable_Report.csv';
    } else if (type === 'overdue') {
      list = accounts.filter(a => isOverdue(a));
      filename = 'Overdue_Report.csv';
    }

    const exportData = list.map(a => ({
      'ID': a.transactionId,
      'Name': a.personName,
      'Category': a.category,
      'Type': a.transactionType,
      'Total Amount': a.amount,
      'Paid Amount': getPaidAmount(a),
      'Remaining Due': getRemainingDue(a),
      'Due Date': a.dueDate,
      'Status': a.currentStatus,
      'Reference': a.referenceNumber || '',
      'Created Date': formatDate(a.createdAt),
      'Created By': a.createdBy
    }));

    // CSV generator helper
    if (exportData.length === 0) {
      alert("No matching ledger records found for this report.");
      return;
    }
    
    const headers = Object.keys(exportData[0]);
    const csvContent = [
      headers.join(','),
      ...exportData.map(row => headers.map(header => JSON.stringify(row[header as keyof typeof row] ?? '')).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setIsReportModalOpen(false);
  };

  // Print Report styling trigger
  const triggerPrint = () => {
    window.print();
  };

  return (
    <div className="space-y-8 pb-12 print:bg-white print:p-0">

      {/* Header and Core Operations */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 print:hidden">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Accounts & Ledger</h1>
          <p className="text-gray-500 text-sm mt-1">Real-time receivables, payables, and settlement flow audit trail.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button 
            onClick={() => setIsReportModalOpen(true)}
            className="flex items-center space-x-2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-all shadow-sm"
          >
            <Download className="h-4.5 w-4.5" />
            <span>Generate Reports</span>
          </button>
          <button 
            onClick={() => {
              setEditingAccount(null);
              setTxFormData({
                personName: '',
                category: 'Customer',
                contactNumber: '',
                email: '',
                address: '',
                transactionType: 'Receivable',
                amount: '',
                dueDate: new Date().toISOString().split('T')[0],
                description: '',
                referenceNumber: '',
                attachmentUrl: ''
              });
              setIsTxModalOpen(true);
            }}
            className="flex items-center space-x-2 px-4 py-2.5 bg-green-600 hover:bg-green-700 rounded-xl text-sm font-semibold text-white transition-all shadow-md shadow-green-100"
          >
            <Plus className="h-4.5 w-4.5" />
            <span>Create Transaction</span>
          </button>
        </div>
      </div>

      {/* Interactive Summary Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-5">
        
        {/* Total Receivable */}
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-green-500" />
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400">Total Receivable</span>
            <span className="p-1.5 bg-green-50 rounded-xl text-green-600"><TrendingUp className="h-4 w-4" /></span>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-black text-gray-900 leading-none">{formatCurrency(metrics.totalReceivable)}</h3>
            <p className="text-[10px] text-gray-500 mt-1">Pending inputs & invoices</p>
          </div>
        </div>

        {/* Total Payable */}
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-rose-500" />
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400">Total Payable</span>
            <span className="p-1.5 bg-rose-50 rounded-xl text-rose-600"><TrendingDown className="h-4 w-4" /></span>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-black text-gray-900 leading-none">{formatCurrency(metrics.totalPayable)}</h3>
            <p className="text-[10px] text-gray-500 mt-1">Vendors & commitments</p>
          </div>
        </div>

        {/* Total Outstanding Balance */}
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-blue-500" />
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400">Net Outstanding</span>
            <span className="p-1.5 bg-blue-50 rounded-xl text-blue-600"><DollarSign className="h-4 w-4" /></span>
          </div>
          <div className="mt-4">
            <h3 className={`text-2xl font-black leading-none ${metrics.totalOutstanding >= 0 ? 'text-green-700' : 'text-rose-700'}`}>
              {metrics.totalOutstanding >= 0 ? '+' : ''}{formatCurrency(metrics.totalOutstanding)}
            </h3>
            <p className="text-[10px] text-gray-500 mt-1">Total asset-liability spread</p>
          </div>
        </div>

        {/* Overdue Amount */}
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-amber-500" />
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-600">Overdue Amount</span>
            <span className="p-1.5 bg-amber-50 rounded-xl text-amber-600"><AlertCircle className="h-4 w-4" /></span>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-black text-amber-600 leading-none">{formatCurrency(metrics.overdueAmount)}</h3>
            <p className="text-[10px] text-gray-500 mt-1">Settle reminders instantly</p>
          </div>
        </div>

        {/* Settled Accounts Count */}
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-emerald-500" />
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400">Settled Transactions</span>
            <span className="p-1.5 bg-emerald-50 rounded-xl text-emerald-600"><CheckCircle className="h-4 w-4" /></span>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-black text-gray-900 leading-none">{metrics.settledCount}</h3>
            <p className="text-[10px] text-gray-500 mt-1">Fully closed accounts</p>
          </div>
        </div>

        {/* Pending Dues Count */}
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-indigo-500" />
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400">Active Pending</span>
            <span className="p-1.5 bg-indigo-50 rounded-xl text-indigo-600"><Clock className="h-4 w-4" /></span>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-black text-indigo-900 leading-none">{metrics.pendingCount}</h3>
            <p className="text-[10px] text-gray-500 mt-1">Accounts with open due</p>
          </div>
        </div>
      </div>

      {/* Charts & Graphical Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 print:hidden">
        
        {/* distribution comparison */}
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col">
          <h3 className="font-bold text-gray-900 text-sm mb-4">Receivables vs Payables Breakdown</h3>
          <div className="h-64 flex-1">
            {metrics.totalReceivable === 0 && metrics.totalPayable === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-gray-400 text-xs">
                No financial transactions entered yet.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData.pie}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={85}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {chartData.pie.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                  <Legend verticalAlign="bottom" height={36} iconSize={10} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Bar chart - categories */}
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm col-span-1 lg:col-span-2 flex flex-col">
          <h3 className="font-bold text-gray-900 text-sm mb-4">Outstanding Balances by Stakeholder Category</h3>
          <div className="h-64 flex-1">
            {chartData.bars.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-gray-400 text-xs">
                No active receivables/payables recorded by category.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData.bars} margin={{ top: 10, right: 10, left: 0, bottom: 5 }}>
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
                  <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                  <Legend iconSize={10} />
                  <Bar dataKey="Receivable" fill="#16a34a" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Payable" fill="#dc2626" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Main Table Filters & Data List */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden print:border-none print:shadow-none">
        
        {/* Tabs and filters wrapper */}
        <div className="p-6 border-b border-gray-50 space-y-4 print:hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            
            {/* View status tab */}
            <div className="flex bg-gray-50 p-1 rounded-xl w-fit">
              <button
                onClick={() => { setActiveTab('active'); setCurrentPage(1); }}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all duration-200 ${
                  activeTab === 'active' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400 hover:text-gray-900'
                }`}
              >
                Active Accounts
              </button>
              <button
                onClick={() => { setActiveTab('archived'); setCurrentPage(1); }}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all duration-200 ${
                  activeTab === 'archived' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400 hover:text-gray-900'
                }`}
              >
                Archived Accounts
              </button>
              <button
                onClick={() => { setActiveTab('all'); setCurrentPage(1); }}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all duration-200 ${
                  activeTab === 'all' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400 hover:text-gray-900'
                }`}
              >
                All Transactions
              </button>
            </div>

            {/* Quick print and CSV active exports */}
            <button 
              onClick={triggerPrint}
              className="flex items-center space-x-2 px-3 py-2 bg-white hover:bg-gray-50 border border-gray-200 rounded-lg text-xs font-semibold text-gray-600 transition-all shadow-sm"
            >
              <Printer className="h-4 w-4" />
              <span>Print This Page</span>
            </button>
          </div>

          {/* Search, filters, sorters row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 pt-2">
            
            {/* Search Input */}
            <div className="relative col-span-1 sm:col-span-2">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search name, txn ID, reference..."
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                className="w-full bg-gray-50 border border-gray-100 rounded-xl py-2.5 pl-10 pr-4 outline-none focus:ring-2 focus:ring-green-500 text-sm text-gray-900"
              />
            </div>

            {/* Filter Direction */}
            <div className="relative">
              <select
                value={filterType}
                onChange={(e) => { setFilterType(e.target.value); setCurrentPage(1); }}
                className="w-full bg-gray-50 border border-gray-100 rounded-xl py-2.5 px-3 text-sm text-gray-600 outline-none focus:ring-2 focus:ring-green-500 appearance-none font-medium"
              >
                <option value="all">Direction: All</option>
                <option value="Receivable">Receivable</option>
                <option value="Payable">Payable</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            </div>

            {/* Filter Category */}
            <div className="relative">
              <select
                value={filterCategory}
                onChange={(e) => { setFilterCategory(e.target.value); setCurrentPage(1); }}
                className="w-full bg-gray-50 border border-gray-100 rounded-xl py-2.5 px-3 text-sm text-gray-600 outline-none focus:ring-2 focus:ring-green-500 appearance-none font-medium"
              >
                <option value="all">Category: All</option>
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            </div>

            {/* Filter Status */}
            <div className="relative">
              <select
                value={filterStatus}
                onChange={(e) => { setFilterStatus(e.target.value); setCurrentPage(1); }}
                className="w-full bg-gray-50 border border-gray-100 rounded-xl py-2.5 px-3 text-sm text-gray-600 outline-none focus:ring-2 focus:ring-green-500 appearance-none font-medium"
              >
                <option value="all">Status: All</option>
                <option value="Pending">Pending</option>
                <option value="Partially Paid">Partially Paid</option>
                <option value="Fully Settled">Fully Settled</option>
                <option value="Cancelled">Cancelled</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            </div>

            {/* Sort Sorters */}
            <div className="relative">
              <select
                value={`${sortBy}-${sortOrder}`}
                onChange={(e) => {
                  const [field, order] = e.target.value.split('-');
                  setSortBy(field);
                  setSortOrder(order as any);
                  setCurrentPage(1);
                }}
                className="w-full bg-gray-50 border border-gray-100 rounded-xl py-2.5 px-3 text-sm text-gray-600 outline-none focus:ring-2 focus:ring-green-500 appearance-none font-medium"
              >
                <option value="dueDate-asc">Due Date: Closest First</option>
                <option value="dueDate-desc">Due Date: Furthest First</option>
                <option value="amount-desc">Amount: High to Low</option>
                <option value="amount-asc">Amount: Low to High</option>
                <option value="remaining-desc">Due Amount: High to Low</option>
                <option value="personName-asc">Name: A to Z</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Printable View Header metadata */}
        <div className="hidden print:block p-8 border-b-2 border-gray-300 text-center">
          <h2 className="text-3xl font-black text-gray-900">{FARM_NAME} General Ledger Statement</h2>
          <p className="text-gray-500 text-sm mt-1">Audit Print Date: {formatDate(new Date().toISOString())}</p>
          <div className="grid grid-cols-3 gap-4 mt-6 text-left border border-gray-200 p-4 rounded-xl">
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase">Total Receivables</p>
              <p className="text-lg font-black text-green-700">{formatCurrency(metrics.totalReceivable)}</p>
            </div>
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase">Total Payables</p>
              <p className="text-lg font-black text-rose-700">{formatCurrency(metrics.totalPayable)}</p>
            </div>
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase">Balance Outstanding</p>
              <p className="text-lg font-black text-blue-700">{formatCurrency(metrics.totalOutstanding)}</p>
            </div>
          </div>
        </div>

        {/* Table Body */}
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-16 flex justify-center items-center">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-green-600"></div>
            </div>
          ) : filteredAccounts.length === 0 ? (
            <div className="p-16 flex flex-col items-center justify-center text-center space-y-3">
              <AlertCircle className="h-10 w-10 text-gray-300" />
              <p className="text-sm text-gray-400 font-medium">No accounts found matching current query or filters.</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead className="bg-gray-50/70 border-b border-gray-100 text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4">Transaction ID</th>
                  <th className="px-6 py-4">Stakeholder / Name</th>
                  <th className="px-6 py-4">Category</th>
                  <th className="px-6 py-4">Type</th>
                  <th className="px-6 py-4">Total Amount</th>
                  <th className="px-6 py-4">Paid Amount</th>
                  <th className="px-6 py-4">Remaining Due</th>
                  <th className="px-6 py-4">Due Date</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right print:hidden">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50/50">
                {paginatedAccounts.map((account) => {
                  const remaining = getRemainingDue(account);
                  const paid = getPaidAmount(account);
                  const overdue = isOverdue(account);

                  return (
                    <tr 
                      key={account.id} 
                      className="text-xs hover:bg-gray-50/50 transition-colors group cursor-pointer"
                      onClick={() => setProfileAccount(account)}
                    >
                      {/* ID */}
                      <td className="px-6 py-4.5 font-mono font-semibold text-gray-600">
                        {account.transactionId}
                      </td>

                      {/* Name */}
                      <td className="px-6 py-4.5">
                        <div className="font-bold text-gray-950 group-hover:text-green-700 transition-colors">
                          {account.personName}
                        </div>
                        {account.contactNumber && (
                          <div className="text-[10px] text-gray-400 font-medium mt-0.5">{account.contactNumber}</div>
                        )}
                      </td>

                      {/* Category */}
                      <td className="px-6 py-4.5 font-medium text-gray-500">
                        {account.category}
                      </td>

                      {/* Type Badge */}
                      <td className="px-6 py-4.5">
                        <span className={`inline-flex items-center px-2 py-1 rounded-md text-[10px] font-extrabold tracking-wide uppercase ${
                          account.transactionType === 'Receivable' 
                            ? 'bg-green-50 text-green-700 border border-green-100' 
                            : 'bg-rose-50 text-rose-700 border border-rose-100'
                        }`}>
                          {account.transactionType}
                        </span>
                      </td>

                      {/* Total Amount */}
                      <td className="px-6 py-4.5 font-bold text-gray-900">
                        {formatCurrency(account.amount)}
                      </td>

                      {/* Paid Amount */}
                      <td className="px-6 py-4.5 font-semibold text-gray-500">
                        {formatCurrency(paid)}
                      </td>

                      {/* Remaining Due */}
                      <td className={`px-6 py-4.5 font-black ${remaining > 0 ? 'text-gray-900' : 'text-gray-400'}`}>
                        {formatCurrency(remaining)}
                      </td>

                      {/* Due Date */}
                      <td className="px-6 py-4.5">
                        <span className={`font-semibold ${overdue ? 'text-rose-600 flex items-center space-x-1' : 'text-gray-500'}`}>
                          {overdue && <AlertCircle className="h-3.5 w-3.5" />}
                          <span>{formatDate(account.dueDate)}</span>
                        </span>
                      </td>

                      {/* Status */}
                      <td className="px-6 py-4.5">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black ${
                          account.currentStatus === 'Fully Settled' 
                            ? 'bg-emerald-100 text-emerald-800' 
                            : account.currentStatus === 'Partially Paid'
                            ? 'bg-amber-100 text-amber-800'
                            : account.currentStatus === 'Cancelled'
                            ? 'bg-gray-100 text-gray-500'
                            : 'bg-indigo-100 text-indigo-800'
                        }`}>
                          {account.currentStatus}
                        </span>
                      </td>

                      {/* Action buttons */}
                      <td className="px-6 py-4.5 text-right print:hidden" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => { setSelectedAccount(account); setIsPaymentModalOpen(true); }}
                            disabled={account.currentStatus === 'Fully Settled' || account.currentStatus === 'Cancelled'}
                            className="px-2 py-1 bg-green-50 text-green-700 hover:bg-green-100 disabled:opacity-30 disabled:hover:bg-green-50 rounded text-[10px] font-bold transition-all"
                            title="Record Payment"
                          >
                            Add Pay
                          </button>
                          
                          {account.currentStatus !== 'Fully Settled' && account.currentStatus !== 'Cancelled' && remaining > 0 && (
                            <button
                              onClick={() => handleMarkFullySettled(account)}
                              className="px-2 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded text-[10px] font-bold transition-all"
                              title="Settle Dues"
                            >
                              Settle
                            </button>
                          )}

                          <button
                            onClick={() => handleArchive(account)}
                            className="p-1 text-gray-400 hover:text-gray-700"
                            title={account.isArchived ? "Restore Account" : "Archive Account"}
                          >
                            {account.isArchived ? <RotateCcw className="h-4 w-4" /> : <Archive className="h-4 w-4" />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination Row */}
        <div className="p-5 border-t border-gray-50 flex items-center justify-between print:hidden">
          <p className="text-xs text-gray-400 font-medium">
            Showing <span className="text-gray-900 font-bold">{filteredAccounts.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0}</span> to <span className="text-gray-900 font-bold">{Math.min(currentPage * itemsPerPage, filteredAccounts.length)}</span> of <span className="text-gray-900 font-bold">{filteredAccounts.length}</span> entries
          </p>
          <div className="flex items-center space-x-1">
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1.5 rounded-lg border border-gray-100 hover:bg-gray-50 text-xs font-semibold text-gray-500 disabled:opacity-50 transition-all"
            >
              Previous
            </button>
            {Array.from({ length: totalPages }).map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentPage(idx + 1)}
                className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${
                  currentPage === idx + 1 
                    ? 'bg-green-600 text-white' 
                    : 'border border-gray-100 text-gray-500 hover:bg-gray-50'
                }`}
              >
                {idx + 1}
              </button>
            ))}
            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1.5 rounded-lg border border-gray-100 hover:bg-gray-50 text-xs font-semibold text-gray-500 disabled:opacity-50 transition-all"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Drill-down Person Profile View Slide-Over */}
      <AnimatePresence>
        {profileAccount && (
          <div className="fixed inset-0 z-[60] flex justify-end">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              onClick={() => setProfileAccount(null)} 
              className="absolute inset-0 bg-black/50 backdrop-blur-sm" 
            />
            <motion.div 
              initial={{ x: '100%' }} 
              animate={{ x: 0 }} 
              exit={{ x: '100%' }} 
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="relative w-full max-w-xl bg-white h-full shadow-2xl flex flex-col z-10 overflow-y-auto"
            >
              
              {/* Profile Header */}
              <div className="p-6 border-b border-gray-100 sticky top-0 bg-white flex justify-between items-center z-10">
                <div className="flex items-center space-x-3">
                  <div className="w-11 h-11 bg-green-50 rounded-full flex items-center justify-center text-green-700">
                    <UserIcon className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-gray-900">{profileAccount.personName}</h3>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-green-700">{profileAccount.category} Account Profile</p>
                  </div>
                </div>
                <button 
                  onClick={() => setProfileAccount(null)} 
                  className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-all"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Profile Body */}
              <div className="p-6 space-y-6 flex-1">
                
                {/* Financial Summary card for this person */}
                <div className="bg-gray-50 rounded-3xl p-5 border border-gray-100 grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase">Total Commitment</p>
                    <p className="text-xl font-extrabold text-gray-900 mt-0.5">{formatCurrency(profileAccount.amount)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase">Remaining Balance Due</p>
                    <p className="text-xl font-black text-red-600 mt-0.5">{formatCurrency(getRemainingDue(profileAccount))}</p>
                  </div>
                  <div className="col-span-2 pt-3 border-t border-gray-200/60 flex justify-between items-center text-xs">
                    <span className="text-gray-500 font-medium">Payment Progress</span>
                    <span className="font-bold text-gray-900">
                      {Math.round((getPaidAmount(profileAccount) / profileAccount.amount) * 100)}% Settled
                    </span>
                  </div>
                  <div className="col-span-2 bg-gray-200 h-1.5 rounded-full overflow-hidden">
                    <div 
                      className="bg-green-600 h-full rounded-full transition-all duration-300" 
                      style={{ width: `${(getPaidAmount(profileAccount) / profileAccount.amount) * 100}%` }}
                    />
                  </div>
                </div>

                {/* Contact information details */}
                <div className="space-y-3.5">
                  <h4 className="text-xs font-bold uppercase text-gray-400 tracking-wider">Stakeholder Details</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex items-center space-x-2 text-xs text-gray-600">
                      <Phone className="h-4 w-4 text-gray-400 flex-shrink-0" />
                      <span>{profileAccount.contactNumber || 'No phone supplied'}</span>
                    </div>
                    {profileAccount.email && (
                      <div className="flex items-center space-x-2 text-xs text-gray-600">
                        <Mail className="h-4 w-4 text-gray-400 flex-shrink-0" />
                        <span>{profileAccount.email}</span>
                      </div>
                    )}
                    {profileAccount.address && (
                      <div className="flex items-start space-x-2 text-xs text-gray-600 sm:col-span-2">
                        <MapPin className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                        <span>{profileAccount.address}</span>
                      </div>
                    )}
                    <div className="flex items-center space-x-2 text-xs text-gray-600">
                      <Calendar className="h-4 w-4 text-gray-400 flex-shrink-0" />
                      <span>Due On: {formatDate(profileAccount.dueDate)}</span>
                    </div>
                    {profileAccount.referenceNumber && (
                      <div className="flex items-center space-x-2 text-xs text-gray-600">
                        <FileText className="h-4 w-4 text-gray-400 flex-shrink-0" />
                        <span>Ref / Ref Doc: {profileAccount.referenceNumber}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Simulated Reminders Section */}
                {getRemainingDue(profileAccount) > 0 && profileAccount.currentStatus !== 'Cancelled' && (
                  <div className="border border-indigo-100 bg-indigo-50/40 rounded-3xl p-5 space-y-4">
                    <div className="flex justify-between items-center">
                      <h4 className="text-xs font-bold text-indigo-950 uppercase tracking-wider">Reminder Dispatch Center</h4>
                      <div className="flex space-x-1.5 bg-white p-1 rounded-lg border border-indigo-100">
                        <button 
                          onClick={() => setReminderType('whatsapp')}
                          className={`p-1 rounded text-xs ${reminderType === 'whatsapp' ? 'bg-green-100 text-green-800' : 'text-gray-400 hover:text-gray-700'}`}
                        >
                          WhatsApp
                        </button>
                        <button 
                          onClick={() => setReminderType('email')}
                          className={`p-1 rounded text-xs ${reminderType === 'email' ? 'bg-blue-100 text-blue-800' : 'text-gray-400 hover:text-gray-700'}`}
                        >
                          Email
                        </button>
                        <button 
                          onClick={() => setReminderType('sms')}
                          className={`p-1 rounded text-xs ${reminderType === 'sms' ? 'bg-purple-100 text-purple-800' : 'text-gray-400 hover:text-gray-700'}`}
                        >
                          SMS
                        </button>
                      </div>
                    </div>

                    <div className="bg-white p-3.5 border border-indigo-100/60 rounded-2xl text-xs text-gray-700 whitespace-pre-line leading-relaxed font-medium relative">
                      {reminderText}
                    </div>

                    <div className="flex space-x-3">
                      <button
                        onClick={copyReminderToClipboard}
                        className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all text-center flex items-center justify-center space-x-2"
                      >
                        {reminderCopied ? (
                          <span>Copied to Clipboard!</span>
                        ) : (
                          <>
                            <Send className="h-4 w-4" />
                            <span>Copy Reminder Template</span>
                          </>
                        )}
                      </button>
                      
                      <a
                        href={`https://wa.me/${profileAccount.contactNumber?.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(reminderText)}`}
                        target="_blank"
                        rel="noreferrer"
                        className="p-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center justify-center space-x-1 px-4"
                      >
                        <MessageSquare className="h-4.5 w-4.5" />
                        <span>Send WhatsApp</span>
                      </a>
                    </div>
                  </div>
                )}

                {/* Audit & Payment timeline */}
                <div className="space-y-3.5">
                  <h4 className="text-xs font-bold uppercase text-gray-400 tracking-wider">Payment History & Audit Logs</h4>
                  {!profileAccount.payments || profileAccount.payments.length === 0 ? (
                    <p className="text-xs text-gray-400 font-medium italic">No payments have been recorded for this ledger entry yet.</p>
                  ) : (
                    <div className="relative border-l border-gray-100 pl-4 space-y-4 ml-2">
                      {profileAccount.payments.map((p, idx) => (
                        <div key={p.id} className="relative">
                          {/* Dot marker */}
                          <div className="absolute -left-[21px] top-1.5 w-2.5 h-2.5 rounded-full bg-green-500 border-2 border-white ring-4 ring-green-50" />
                          <div className="text-xs bg-gray-50/70 hover:bg-gray-50 border border-gray-100/60 rounded-2xl p-3.5 space-y-1.5 transition-all">
                            <div className="flex justify-between items-center">
                              <span className="font-extrabold text-green-700">{formatCurrency(p.amount)}</span>
                              <span className="text-[10px] text-gray-400 font-medium">{formatDate(p.date)}</span>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-[10px] text-gray-500 font-medium">
                              <div>Method: <span className="font-bold text-gray-700">{p.paymentMethod}</span></div>
                              {p.referenceNumber && <div>Ref: <span className="font-bold text-gray-700">{p.referenceNumber}</span></div>}
                              <div className="col-span-2">Logged By: <span className="font-bold text-gray-700">{p.processedBy}</span></div>
                            </div>
                            {p.notes && (
                              <p className="text-[10px] text-gray-400 border-t border-gray-100 pt-1 mt-1 italic">
                                Notes: {p.notes}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Description and metadata */}
                <div className="space-y-2 border-t border-gray-100 pt-4">
                  <h4 className="text-xs font-bold uppercase text-gray-400 tracking-wider">Audit Trail</h4>
                  <div className="bg-gray-50 p-4 rounded-2xl text-[10px] space-y-1.5 text-gray-500">
                    <div>Created on: <span className="font-bold text-gray-700">{formatDate(profileAccount.createdAt)}</span></div>
                    <div>Created by: <span className="font-bold text-gray-700">{profileAccount.createdBy}</span></div>
                    <div>Last Updated: <span className="font-bold text-gray-700">{formatDate(profileAccount.updatedAt)}</span></div>
                  </div>
                </div>

                {/* Super Admin Deletion Panel */}
                <div className="border border-red-100 bg-red-50/40 rounded-3xl p-5 space-y-4">
                  <h4 className="text-xs font-bold text-red-950 uppercase tracking-wider flex items-center space-x-1.5">
                    <Trash2 className="h-4 w-4 text-red-600" />
                    <span>Danger Zone: Permanent Deletion</span>
                  </h4>
                  <p className="text-[11px] text-red-700">Permanent deletion is restricted to the Super Admin. This will erase all payments, history, and audit trails irreversibly.</p>
                  
                  {isSuperAdmin ? (
                    <div className="space-y-3">
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={deleteConfirmChecked} 
                          onChange={(e) => setDeleteConfirmChecked(e.target.checked)} 
                          className="rounded border-red-200 text-red-600 focus:ring-red-500 h-4 w-4"
                        />
                        <span className="text-xs font-semibold text-red-900 select-none">I understand this action cannot be undone.</span>
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Type 'delete' to confirm"
                          value={deleteConfirmText}
                          onChange={(e) => setDeleteConfirmText(e.target.value)}
                          className="bg-white border border-red-200 rounded-xl px-3 py-1.5 text-xs outline-none focus:ring-2 focus:ring-red-500 text-gray-900 flex-1"
                        />
                        <button
                          onClick={() => handlePermanentDelete(profileAccount.id!)}
                          disabled={!deleteConfirmChecked || deleteConfirmText.toLowerCase() !== 'delete'}
                          className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-30 disabled:cursor-not-allowed text-white rounded-xl text-xs font-bold shadow-sm transition-all"
                        >
                          Permanently Erase
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-[10px] text-red-500 font-bold italic">You must be logged in as Super Admin/Developer (alvymahamudulhasan@gmail.com) to permanently delete records.</p>
                  )}
                </div>

              </div>

              {/* Profile Bottom Actions */}
              <div className="p-6 border-t border-gray-100 bg-white sticky bottom-0 flex gap-3 z-10">
                <button
                  onClick={() => {
                    setEditingAccount(profileAccount);
                    setTxFormData({
                      personName: profileAccount.personName,
                      category: profileAccount.category,
                      contactNumber: profileAccount.contactNumber,
                      email: profileAccount.email || '',
                      address: profileAccount.address || '',
                      transactionType: profileAccount.transactionType,
                      amount: profileAccount.amount.toString(),
                      dueDate: profileAccount.dueDate,
                      description: profileAccount.description || '',
                      referenceNumber: profileAccount.referenceNumber || '',
                      attachmentUrl: profileAccount.attachmentUrl || ''
                    });
                    setProfileAccount(null);
                    setIsTxModalOpen(true);
                  }}
                  className="flex-1 py-3 border border-gray-200 hover:bg-gray-50 rounded-xl text-xs font-bold text-gray-700 transition-all text-center"
                >
                  Edit Transaction details
                </button>
                <button
                  onClick={() => {
                    setSelectedAccount(profileAccount);
                    setIsPaymentModalOpen(true);
                  }}
                  disabled={profileAccount.currentStatus === 'Fully Settled' || profileAccount.currentStatus === 'Cancelled'}
                  className="flex-1 py-3 bg-green-600 hover:bg-green-700 disabled:opacity-30 rounded-xl text-xs font-bold text-white transition-all text-center shadow-md shadow-green-100"
                >
                  Add Payment Update
                </button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* CREATE OR EDIT TRANSACTION MODAL */}
      <AnimatePresence>
        {isTxModalOpen && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 overflow-y-auto">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              onClick={() => setIsTxModalOpen(false)} 
              className="absolute inset-0 bg-black/60 backdrop-blur-sm" 
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }} 
              animate={{ opacity: 1, scale: 1 }} 
              exit={{ opacity: 0, scale: 0.95 }} 
              className="relative bg-white rounded-3xl shadow-2xl w-full max-w-lg p-6 sm:p-8 overflow-y-auto max-h-[90vh] z-10"
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-black text-gray-950">
                  {editingAccount ? 'Edit Ledger Item' : 'New Ledger Entry'}
                </h2>
                <button onClick={() => setIsTxModalOpen(false)} className="p-1 text-gray-400 hover:text-gray-600 rounded-lg">
                  <X className="h-6 w-6" />
                </button>
              </div>

              <form onSubmit={handleAddOrEditTx} className="space-y-4">
                
                {/* Transaction Direction receivable or payable */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">Transaction Direction</label>
                  <div className="flex bg-gray-100 p-1 rounded-xl">
                    <button 
                      type="button" 
                      onClick={() => setTxFormData({...txFormData, transactionType: 'Receivable'})} 
                      className={`flex-1 py-2.5 rounded-lg text-xs font-extrabold transition-all duration-200 ${
                        txFormData.transactionType === 'Receivable' ? 'bg-white text-green-700 shadow-sm' : 'text-gray-500 hover:text-gray-900'
                      }`}
                    >
                      Money Receivable (We Receive)
                    </button>
                    <button 
                      type="button" 
                      onClick={() => setTxFormData({...txFormData, transactionType: 'Payable'})} 
                      className={`flex-1 py-2.5 rounded-lg text-xs font-extrabold transition-all duration-200 ${
                        txFormData.transactionType === 'Payable' ? 'bg-white text-rose-700 shadow-sm' : 'text-gray-500 hover:text-gray-900'
                      }`}
                    >
                      Money Payable (We Pay)
                    </button>
                  </div>
                </div>

                {/* Grid Inputs */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  
                  {/* Stakeholder Name */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">Person / Stakeholder Name</label>
                    <input 
                      type="text" 
                      required 
                      value={txFormData.personName} 
                      onChange={e => setTxFormData({...txFormData, personName: e.target.value})} 
                      placeholder="e.g. Acme Supplier Ltd"
                      className="w-full bg-gray-50 border border-gray-100 rounded-xl py-2.5 px-4 outline-none focus:ring-2 focus:ring-green-500 text-sm text-gray-900" 
                    />
                  </div>

                  {/* Stakeholder Category */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">Stakeholder Category</label>
                    <div className="relative">
                      <select 
                        value={txFormData.category} 
                        onChange={e => setTxFormData({...txFormData, category: e.target.value as AccountCategory})} 
                        className="w-full bg-gray-50 border border-gray-100 rounded-xl py-2.5 px-4 outline-none focus:ring-2 focus:ring-green-500 text-sm text-gray-900 appearance-none font-medium"
                      >
                        {categories.map(cat => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                    </div>
                  </div>

                  {/* Contact Phone */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">Contact Phone Number</label>
                    <input 
                      type="tel" 
                      required 
                      value={txFormData.contactNumber} 
                      onChange={e => setTxFormData({...txFormData, contactNumber: e.target.value})} 
                      placeholder="e.g. +88017XXXXXXXX"
                      className="w-full bg-gray-50 border border-gray-100 rounded-xl py-2.5 px-4 outline-none focus:ring-2 focus:ring-green-500 text-sm text-gray-900" 
                    />
                  </div>

                  {/* Contact Email */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">Email (Optional)</label>
                    <input 
                      type="email" 
                      value={txFormData.email} 
                      onChange={e => setTxFormData({...txFormData, email: e.target.value})} 
                      placeholder="e.g. account@domain.com"
                      className="w-full bg-gray-50 border border-gray-100 rounded-xl py-2.5 px-4 outline-none focus:ring-2 focus:ring-green-500 text-sm text-gray-900" 
                    />
                  </div>

                  {/* Amount */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">Ledger Amount (৳)</label>
                    <input 
                      type="number" 
                      required 
                      value={txFormData.amount} 
                      onChange={e => setTxFormData({...txFormData, amount: e.target.value})} 
                      placeholder="e.g. 15000"
                      className="w-full bg-gray-50 border border-gray-100 rounded-xl py-2.5 px-4 outline-none focus:ring-2 focus:ring-green-500 text-sm text-gray-900" 
                    />
                  </div>

                  {/* Due Date */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">Due / Settlement Date</label>
                    <input 
                      type="date" 
                      required 
                      value={txFormData.dueDate} 
                      onChange={e => setTxFormData({...txFormData, dueDate: e.target.value})} 
                      className="w-full bg-gray-50 border border-gray-100 rounded-xl py-2.5 px-4 outline-none focus:ring-2 focus:ring-green-500 text-sm text-gray-900" 
                    />
                  </div>

                  {/* Invoice Reference Number */}
                  <div className="space-y-1 sm:col-span-2">
                    <label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">Invoice / Bill Reference Number</label>
                    <input 
                      type="text" 
                      value={txFormData.referenceNumber} 
                      onChange={e => setTxFormData({...txFormData, referenceNumber: e.target.value})} 
                      placeholder="e.g. INV-2026-0421"
                      className="w-full bg-gray-50 border border-gray-100 rounded-xl py-2.5 px-4 outline-none focus:ring-2 focus:ring-green-500 text-sm text-gray-900" 
                    />
                  </div>

                  {/* Address */}
                  <div className="space-y-1 sm:col-span-2">
                    <label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">Billing/Postal Address (Optional)</label>
                    <input 
                      type="text" 
                      value={txFormData.address} 
                      onChange={e => setTxFormData({...txFormData, address: e.target.value})} 
                      placeholder="Street, City, Post Code"
                      className="w-full bg-gray-50 border border-gray-100 rounded-xl py-2.5 px-4 outline-none focus:ring-2 focus:ring-green-500 text-sm text-gray-900" 
                    />
                  </div>

                  {/* Description notes */}
                  <div className="space-y-1 sm:col-span-2">
                    <label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">Description & Ledger Notes</label>
                    <textarea 
                      value={txFormData.description} 
                      onChange={e => setTxFormData({...txFormData, description: e.target.value})} 
                      placeholder="Brief context regarding this ledger commitment..."
                      rows={3}
                      className="w-full bg-gray-50 border border-gray-100 rounded-xl py-2.5 px-4 outline-none focus:ring-2 focus:ring-green-500 text-sm text-gray-900 resize-none" 
                    />
                  </div>
                </div>

                <button 
                  type="submit" 
                  className="w-full py-3.5 bg-green-600 hover:bg-green-700 text-white rounded-xl text-sm font-bold shadow-lg shadow-green-100 transition-all mt-4"
                >
                  {editingAccount ? 'Save Ledger Updates' : 'Add New Ledger Transaction'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* RECORD PAYMENT UPDATE MODAL */}
      <AnimatePresence>
        {isPaymentModalOpen && selectedAccount && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              onClick={() => { setIsPaymentModalOpen(false); setSelectedAccount(null); }} 
              className="absolute inset-0 bg-black/60 backdrop-blur-sm" 
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }} 
              animate={{ opacity: 1, scale: 1 }} 
              exit={{ opacity: 0, scale: 0.95 }} 
              className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 sm:p-8 z-10"
            >
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-xl font-black text-gray-950">Add Payment</h2>
                  <p className="text-xs text-gray-400 font-medium mt-1">
                    Balance Outstanding: <span className="font-bold text-gray-900">{formatCurrency(getRemainingDue(selectedAccount))}</span>
                  </p>
                </div>
                <button onClick={() => { setIsPaymentModalOpen(false); setSelectedAccount(null); }} className="p-1 text-gray-400 hover:text-gray-600 rounded-lg">
                  <X className="h-6 w-6" />
                </button>
              </div>

              <form onSubmit={handleAddPayment} className="space-y-4">
                
                {/* Amount */}
                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">Payment Amount (৳)</label>
                  <input 
                    type="number" 
                    required 
                    value={paymentFormData.amount} 
                    onChange={e => setPaymentFormData({...paymentFormData, amount: e.target.value})} 
                    placeholder="e.g. 5000"
                    max={getRemainingDue(selectedAccount)}
                    className="w-full bg-gray-50 border border-gray-100 rounded-xl py-2.5 px-4 outline-none focus:ring-2 focus:ring-green-500 text-sm text-gray-900" 
                  />
                </div>

                {/* Date */}
                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">Payment Date</label>
                  <input 
                    type="date" 
                    required 
                    value={paymentFormData.date} 
                    onChange={e => setPaymentFormData({...paymentFormData, date: e.target.value})} 
                    className="w-full bg-gray-50 border border-gray-100 rounded-xl py-2.5 px-4 outline-none focus:ring-2 focus:ring-green-500 text-sm text-gray-900" 
                  />
                </div>

                {/* Method selector */}
                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">Payment Method</label>
                  <div className="relative">
                    <select 
                      value={paymentFormData.paymentMethod} 
                      onChange={e => setPaymentFormData({...paymentFormData, paymentMethod: e.target.value})} 
                      className="w-full bg-gray-50 border border-gray-100 rounded-xl py-2.5 px-4 outline-none focus:ring-2 focus:ring-green-500 text-sm text-gray-900 appearance-none font-medium"
                    >
                      {paymentMethods.map(m => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                  </div>
                </div>

                {/* Payment Reference Doc ID */}
                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">MFS / bank Reference Number (Optional)</label>
                  <input 
                    type="text" 
                    value={paymentFormData.referenceNumber} 
                    onChange={e => setPaymentFormData({...paymentFormData, referenceNumber: e.target.value})} 
                    placeholder="e.g. TRX1928373"
                    className="w-full bg-gray-50 border border-gray-100 rounded-xl py-2.5 px-4 outline-none focus:ring-2 focus:ring-green-500 text-sm text-gray-900" 
                  />
                </div>

                {/* Collector / Payer processor */}
                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">Handled / Processed By</label>
                  <input 
                    type="text" 
                    value={paymentFormData.processedBy} 
                    onChange={e => setPaymentFormData({...paymentFormData, processedBy: e.target.value})} 
                    placeholder={currentUserEmail}
                    className="w-full bg-gray-50 border border-gray-100 rounded-xl py-2.5 px-4 outline-none focus:ring-2 focus:ring-green-500 text-sm text-gray-900" 
                  />
                </div>

                {/* Notes */}
                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">Internal Notes</label>
                  <textarea 
                    value={paymentFormData.notes} 
                    onChange={e => setPaymentFormData({...paymentFormData, notes: e.target.value})} 
                    placeholder="e.g. bkash customer direct wallet send"
                    rows={2}
                    className="w-full bg-gray-50 border border-gray-100 rounded-xl py-2.5 px-4 outline-none focus:ring-2 focus:ring-green-500 text-sm text-gray-900 resize-none" 
                  />
                </div>

                <button 
                  type="submit" 
                  className="w-full py-3.5 bg-green-600 hover:bg-green-700 text-white rounded-xl text-sm font-bold shadow-lg shadow-green-100 transition-all mt-4"
                >
                  Record Payment
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* GENERATE CUSTOM REPORTS MODAL */}
      <AnimatePresence>
        {isReportModalOpen && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              onClick={() => setIsReportModalOpen(false)} 
              className="absolute inset-0 bg-black/60 backdrop-blur-sm" 
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }} 
              animate={{ opacity: 1, scale: 1 }} 
              exit={{ opacity: 0, scale: 0.95 }} 
              className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 sm:p-8 z-10"
            >
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-xl font-black text-gray-950">Ledger Report Center</h2>
                  <p className="text-xs text-gray-400 font-medium mt-1">Select structured financial report to export as clean CSV</p>
                </div>
                <button onClick={() => setIsReportModalOpen(false)} className="p-1 text-gray-400 hover:text-gray-600 rounded-lg">
                  <X className="h-6 w-6" />
                </button>
              </div>

              <div className="space-y-3">
                <button
                  onClick={() => downloadCustomReport('receivable')}
                  className="w-full p-4 hover:bg-green-50/50 border border-gray-100 rounded-2xl text-left flex justify-between items-center transition-all group"
                >
                  <div>
                    <h4 className="text-sm font-bold text-gray-900 group-hover:text-green-700">Accounts Receivable Report</h4>
                    <p className="text-[11px] text-gray-400 mt-1">Export full list of stakeholders with active outstanding assets.</p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-green-600" />
                </button>

                <button
                  onClick={() => downloadCustomReport('payable')}
                  className="w-full p-4 hover:bg-rose-50/50 border border-gray-100 rounded-2xl text-left flex justify-between items-center transition-all group"
                >
                  <div>
                    <h4 className="text-sm font-bold text-gray-900 group-hover:text-rose-700">Accounts Payable Report</h4>
                    <p className="text-[11px] text-gray-400 mt-1">Export all commitments, suppliers, and contractor liabilities.</p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-rose-600" />
                </button>

                <button
                  onClick={() => downloadCustomReport('overdue')}
                  className="w-full p-4 hover:bg-amber-50/50 border border-gray-100 rounded-2xl text-left flex justify-between items-center transition-all group"
                >
                  <div>
                    <h4 className="text-sm font-bold text-gray-900 group-hover:text-amber-700">Overdue Reminders List</h4>
                    <p className="text-[11px] text-gray-400 mt-1">Export list of overdue accounts to trigger bulk billing operations.</p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-amber-600" />
                </button>

                <button
                  onClick={() => downloadCustomReport('all')}
                  className="w-full p-4 hover:bg-gray-50 border border-gray-100 rounded-2xl text-left flex justify-between items-center transition-all group"
                >
                  <div>
                    <h4 className="text-sm font-bold text-gray-900">Complete Master Ledger Account Report</h4>
                    <p className="text-[11px] text-gray-400 mt-1">Full raw exports including audit logs for direct Excel/SQL integration.</p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-gray-400" />
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
