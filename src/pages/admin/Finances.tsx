import React, { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, deleteDoc, doc, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../../firebase';
import { Expense, Income } from '../../types';
import { 
  Plus, 
  Download, 
  Trash2, 
  Wallet, 
  TrendingUp, 
  TrendingDown, 
  Calendar, 
  DollarSign, 
  Tag,
  Receipt,
  Eye,
  CheckCircle2,
  AlertCircle,
  X,
  ExternalLink,
  FileText
} from 'lucide-react';
import { formatCurrency, formatDate, exportToCSV } from '../../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import ImageUploader from '../../components/ImageUploader';

const EXPENSE_CATEGORIES = [
  'Feed (পশুখাদ্য)',
  'Medicine & Vaccine',
  'Labor & Wages',
  'Electricity & Utilities',
  'Transport & Logistics',
  'Equipment & Maintenance',
  'Other Expense'
];

const INCOME_CATEGORIES = [
  'Milk Sales (দুধ বিক্রি)',
  'Cattle Sales (গরু বিক্রি)',
  'Organic Fertilizer (সার বিক্রি)',
  'Farm Tour & Visit',
  'Other Income'
];

export default function AdminFinances() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [formError, setFormError] = useState<string | null>(null);

  const [formData, setFormData] = useState<{
    date: string;
    category: string;
    amount: number;
    description: string;
    voucherUrl: string;
  }>({
    date: new Date().toISOString().split('T')[0],
    category: '',
    amount: 0,
    description: '',
    voucherUrl: ''
  });

  const [previewVoucher, setPreviewVoucher] = useState<{
    url: string;
    title: string;
    category: string;
    amount: number;
    date: string;
    type: 'income' | 'expense';
  } | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const [expSnap, incSnap] = await Promise.all([
      getDocs(query(collection(db, 'expenses'), orderBy('date', 'desc'), limit(100))),
      getDocs(query(collection(db, 'incomes'), orderBy('date', 'desc'), limit(100)))
    ]);
    setExpenses(expSnap.docs.map(doc => ({ ...doc.data(), id: doc.id } as Expense)));
    setIncomes(incSnap.docs.map(doc => ({ ...doc.data(), id: doc.id } as Income)));
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    // Enforce required Cash Voucher / Invoice image for expenses
    if (type === 'expense' && !formData.voucherUrl.trim()) {
      setFormError('Cash Voucher or Invoice image is required for adding an expense.');
      return;
    }

    if (!formData.category.trim()) {
      setFormError('Please select or enter a category.');
      return;
    }

    if (isNaN(formData.amount) || formData.amount <= 0) {
      setFormError('Please enter a valid amount greater than 0.');
      return;
    }

    try {
      const collectionName = type === 'income' ? 'incomes' : 'expenses';
      await addDoc(collection(db, collectionName), {
        date: formData.date,
        category: formData.category.trim(),
        amount: Number(formData.amount),
        description: formData.description.trim(),
        voucherUrl: formData.voucherUrl || ''
      });

      setIsModalOpen(false);
      setFormData({
        date: new Date().toISOString().split('T')[0],
        category: '',
        amount: 0,
        description: '',
        voucherUrl: ''
      });
      setFormError(null);
      fetchData();
    } catch (err: any) {
      console.error(err);
      alert('Error saving financial data: ' + (err.message || ''));
    }
  };

  const handleDelete = async (id: string, dataType: 'income' | 'expense') => {
    if (confirm('Are you sure you want to delete this record?')) {
      const collectionName = dataType === 'income' ? 'incomes' : 'expenses';
      await deleteDoc(doc(db, collectionName, id));
      fetchData();
    }
  };

  const totalIncome = incomes.reduce((sum, item) => sum + item.amount, 0);
  const totalExpense = expenses.reduce((sum, item) => sum + item.amount, 0);
  const netProfit = totalIncome - totalExpense;

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Financial Management</h1>
          <p className="text-gray-500 text-sm">Track daily income and expenses with voucher verification.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button 
            onClick={() => exportToCSV([...incomes, ...expenses], 'financial_report.csv')}
            className="flex items-center space-x-2 px-3 sm:px-4 py-2 bg-white border border-gray-200 rounded-xl text-xs sm:text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors shadow-xs whitespace-nowrap"
          >
            <Download className="h-4 w-4" />
            <span>Export Report</span>
          </button>
          <button 
            onClick={() => {
              setType('expense');
              setFormError(null);
              setFormData({
                date: new Date().toISOString().split('T')[0],
                category: '',
                amount: 0,
                description: '',
                voucherUrl: ''
              });
              setIsModalOpen(true);
            }}
            className="flex items-center space-x-2 px-3 sm:px-4 py-2 bg-green-600 rounded-xl text-xs sm:text-sm font-medium text-white hover:bg-green-700 transition-colors shadow-xs whitespace-nowrap"
          >
            <Plus className="h-4 w-4" />
            <span>Add Transaction</span>
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-xs">
          <div className="flex items-center space-x-3 text-green-600 mb-2">
            <TrendingUp className="h-5 w-5" />
            <span className="text-xs font-bold uppercase tracking-wider">Total Income</span>
          </div>
          <div className="text-2xl font-bold text-gray-900">{formatCurrency(totalIncome)}</div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-xs">
          <div className="flex items-center space-x-3 text-red-600 mb-2">
            <TrendingDown className="h-5 w-5" />
            <span className="text-xs font-bold uppercase tracking-wider">Total Expenses</span>
          </div>
          <div className="text-2xl font-bold text-gray-900">{formatCurrency(totalExpense)}</div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-xs">
          <div className="flex items-center space-x-3 text-blue-600 mb-2">
            <Wallet className="h-5 w-5" />
            <span className="text-xs font-bold uppercase tracking-wider">Net Profit</span>
          </div>
          <div className="text-2xl font-bold text-gray-900">{formatCurrency(netProfit)}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Income Table */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
          <div className="p-6 border-b border-gray-50 flex justify-between items-center">
            <h3 className="font-bold text-gray-900 flex items-center space-x-2">
              <TrendingUp className="h-5 w-5 text-green-600" />
              <span>Recent Income ({incomes.length})</span>
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50 text-xs font-bold text-gray-400 uppercase">
                <tr>
                  <th className="px-6 py-3">Date</th>
                  <th className="px-6 py-3">Category</th>
                  <th className="px-6 py-3">Amount</th>
                  <th className="px-6 py-3">Voucher / Receipt</th>
                  <th className="px-6 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {incomes.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-gray-400 text-xs italic">
                      No income records logged yet.
                    </td>
                  </tr>
                ) : (
                  incomes.map(item => (
                    <tr key={item.id} className="text-sm hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4 text-gray-500 whitespace-nowrap">{formatDate(item.date)}</td>
                      <td className="px-6 py-4 font-medium text-gray-900">
                        <div>{item.category}</div>
                        {item.description && (
                          <div className="text-xs text-gray-400 truncate max-w-xs">{item.description}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 font-bold text-green-600 whitespace-nowrap">{formatCurrency(item.amount)}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {item.voucherUrl ? (
                          <button
                            type="button"
                            onClick={() => setPreviewVoucher({
                              url: item.voucherUrl!,
                              title: item.description || item.category,
                              category: item.category,
                              amount: item.amount,
                              date: item.date,
                              type: 'income'
                            })}
                            className="group inline-flex items-center space-x-2 px-2.5 py-1.5 rounded-xl border border-green-200 bg-green-50/60 hover:bg-green-100/70 text-green-700 text-xs font-bold transition-all"
                            title="Click to view receipt/voucher"
                          >
                            <img
                              src={item.voucherUrl}
                              alt="Receipt"
                              className="w-6 h-6 rounded-md object-cover border border-green-300 shrink-0"
                            />
                            <span>View Receipt</span>
                            <Eye className="h-3 w-3 text-green-600 group-hover:scale-110 transition-transform" />
                          </button>
                        ) : (
                          <span className="text-[11px] text-gray-400 italic">Optional</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button 
                          onClick={() => handleDelete(item.id!, 'income')} 
                          className="text-gray-300 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50 transition-colors"
                          title="Delete income record"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Expense Table */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
          <div className="p-6 border-b border-gray-50 flex justify-between items-center">
            <h3 className="font-bold text-gray-900 flex items-center space-x-2">
              <TrendingDown className="h-5 w-5 text-red-600" />
              <span>Recent Expenses ({expenses.length})</span>
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50 text-xs font-bold text-gray-400 uppercase">
                <tr>
                  <th className="px-6 py-3">Date</th>
                  <th className="px-6 py-3">Category</th>
                  <th className="px-6 py-3">Amount</th>
                  <th className="px-6 py-3">Cash Voucher / Invoice</th>
                  <th className="px-6 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {expenses.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-gray-400 text-xs italic">
                      No expenses logged yet.
                    </td>
                  </tr>
                ) : (
                  expenses.map(item => (
                    <tr key={item.id} className="text-sm hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4 text-gray-500 whitespace-nowrap">{formatDate(item.date)}</td>
                      <td className="px-6 py-4 font-medium text-gray-900">
                        <div>{item.category}</div>
                        {item.description && (
                          <div className="text-xs text-gray-400 truncate max-w-xs">{item.description}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 font-bold text-red-600 whitespace-nowrap">{formatCurrency(item.amount)}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {item.voucherUrl ? (
                          <button
                            type="button"
                            onClick={() => setPreviewVoucher({
                              url: item.voucherUrl!,
                              title: item.description || item.category,
                              category: item.category,
                              amount: item.amount,
                              date: item.date,
                              type: 'expense'
                            })}
                            className="group inline-flex items-center space-x-2 px-2.5 py-1.5 rounded-xl border border-red-200 bg-red-50/70 hover:bg-red-100 text-red-700 text-xs font-bold transition-all shadow-2xs"
                            title="Click to view full Cash Voucher / Invoice"
                          >
                            <img
                              src={item.voucherUrl}
                              alt="Voucher"
                              className="w-6 h-6 rounded-md object-cover border border-red-300 shrink-0"
                            />
                            <span>View Voucher</span>
                            <Eye className="h-3 w-3 text-red-500 group-hover:scale-110 transition-transform" />
                          </button>
                        ) : (
                          <span className="inline-flex items-center space-x-1 text-[11px] font-semibold text-gray-400 bg-gray-50 px-2 py-1 rounded-lg border border-gray-100">
                            <span>No voucher</span>
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button 
                          onClick={() => handleDelete(item.id!, 'expense')} 
                          className="text-gray-300 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50 transition-colors"
                          title="Delete expense"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Add Transaction Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              onClick={() => setIsModalOpen(false)} 
              className="absolute inset-0 bg-black/60 backdrop-blur-sm" 
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }} 
              animate={{ opacity: 1, scale: 1 }} 
              exit={{ opacity: 0, scale: 0.95 }} 
              className="relative bg-white rounded-3xl shadow-2xl w-full max-w-xl p-6 sm:p-8 max-h-[92vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Add Transaction</h2>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {type === 'expense' ? 'Record farm expenditure with cash voucher verification.' : 'Record income received by the farm.'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Switcher */}
                <div className="flex bg-gray-100 p-1 rounded-xl mb-4">
                  <button 
                    type="button" 
                    onClick={() => {
                      setType('expense');
                      setFormError(null);
                    }} 
                    className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center justify-center space-x-1.5 ${
                      type === 'expense' ? 'bg-white text-red-600 shadow-xs' : 'text-gray-500 hover:text-gray-900'
                    }`}
                  >
                    <TrendingDown className="h-4 w-4" />
                    <span>Expense (খরচ)</span>
                  </button>
                  <button 
                    type="button" 
                    onClick={() => {
                      setType('income');
                      setFormError(null);
                    }} 
                    className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center justify-center space-x-1.5 ${
                      type === 'income' ? 'bg-white text-green-600 shadow-xs' : 'text-gray-500 hover:text-gray-900'
                    }`}
                  >
                    <TrendingUp className="h-4 w-4" />
                    <span>Income (আয়)</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Date *</label>
                    <input 
                      type="date" 
                      required 
                      value={formData.date} 
                      onChange={e => setFormData({...formData, date: e.target.value})} 
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl py-2.5 px-4 outline-none focus:ring-2 focus:ring-green-500 text-sm font-medium" 
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Amount (৳) *</label>
                    <input 
                      type="number" 
                      required 
                      min="1"
                      step="any"
                      placeholder="0.00"
                      value={isNaN(formData.amount) || formData.amount === 0 ? '' : formData.amount} 
                      onChange={e => {
                        const val = e.target.value === '' ? 0 : parseFloat(e.target.value);
                        setFormData({...formData, amount: val});
                      }} 
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl py-2.5 px-4 outline-none focus:ring-2 focus:ring-green-500 text-sm font-bold" 
                    />
                  </div>
                </div>

                {/* Category with Quick Presets */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Category *</label>
                  <input 
                    type="text" 
                    required 
                    value={formData.category} 
                    onChange={e => setFormData({...formData, category: e.target.value})} 
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl py-2.5 px-4 outline-none focus:ring-2 focus:ring-green-500 text-sm font-medium" 
                    placeholder={type === 'expense' ? 'e.g. Feed, Medicine, Labor, Utilities' : 'e.g. Milk Sales, Cattle Sales'} 
                  />
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {(type === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES).map(cat => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setFormData({ ...formData, category: cat })}
                        className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border transition-all ${
                          formData.category === cat 
                            ? 'bg-gray-900 text-white border-gray-900 shadow-2xs' 
                            : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Description */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Description & Notes</label>
                  <textarea 
                    value={formData.description} 
                    onChange={e => setFormData({...formData, description: e.target.value})} 
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl py-2 px-4 outline-none focus:ring-2 focus:ring-green-500 resize-none text-sm font-medium" 
                    rows={2} 
                    placeholder="Provide details about supplier, vendor, items purchased, etc."
                  />
                </div>

                {/* Cash Voucher / Invoice Attachment (Required for Expense) */}
                <div className="space-y-2 p-4 bg-gray-50/80 rounded-2xl border border-gray-200/80">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center space-x-1.5">
                      <Receipt className={`h-4 w-4 ${type === 'expense' ? 'text-red-500' : 'text-green-600'}`} />
                      <span>
                        Cash Voucher / Invoice Image{' '}
                        {type === 'expense' ? (
                          <span className="text-red-500 font-extrabold">* (Required)</span>
                        ) : (
                          <span className="text-gray-400 font-normal">(Optional)</span>
                        )}
                      </span>
                    </label>
                    {formData.voucherUrl ? (
                      <span className="text-xs font-bold text-emerald-600 flex items-center space-x-1">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        <span>Attached</span>
                      </span>
                    ) : type === 'expense' ? (
                      <span className="text-[11px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded border border-red-200">
                        Must attach image
                      </span>
                    ) : null}
                  </div>

                  <ImageUploader
                    folder="vouchers"
                    label={type === 'expense' ? 'Attach Cash Voucher / Invoice Image *' : 'Attach Receipt Image (Optional)'}
                    currentImageUrl={formData.voucherUrl}
                    onUploadSuccess={(url) => {
                      setFormData(prev => ({ ...prev, voucherUrl: url }));
                      setFormError(null);
                    }}
                    onClear={() => setFormData(prev => ({ ...prev, voucherUrl: '' }))}
                  />

                  <p className="text-[11px] text-gray-500">
                    Snap a photo or upload clear scan of the cash memo, voucher, or vendor bill. Document will be permanently attached to this expense entry.
                  </p>
                </div>

                {/* Validation Error Banner */}
                {formError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center space-x-2 text-xs text-red-700 font-bold">
                    <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
                    <span>{formError}</span>
                  </div>
                )}

                <div className="pt-2">
                  <button 
                    type="submit" 
                    className={`w-full py-3.5 rounded-xl font-bold text-white transition-all shadow-md ${
                      type === 'income' 
                        ? 'bg-green-600 hover:bg-green-700 shadow-green-100' 
                        : 'bg-red-600 hover:bg-red-700 shadow-red-100'
                    }`}
                  >
                    {type === 'expense' ? 'Save Expense with Voucher' : 'Save Income Record'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Cash Voucher / Invoice Lightbox Modal */}
      <AnimatePresence>
        {previewVoucher && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setPreviewVoucher(null)}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden z-10 flex flex-col max-h-[90vh]"
            >
              {/* Header */}
              <div className="p-4 sm:p-5 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className={`text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-md ${
                      previewVoucher.type === 'expense' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                    }`}>
                      {previewVoucher.type === 'expense' ? 'Cash Voucher / Invoice' : 'Money Receipt'}
                    </span>
                    <span className="text-xs text-gray-400 font-bold">{formatDate(previewVoucher.date)}</span>
                  </div>
                  <h3 className="text-base sm:text-lg font-bold text-gray-900 mt-1">{previewVoucher.category}</h3>
                  <p className={`text-sm font-extrabold ${previewVoucher.type === 'expense' ? 'text-red-600' : 'text-green-600'}`}>
                    {formatCurrency(previewVoucher.amount)}
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <a
                    href={previewVoucher.url}
                    download={`voucher-${previewVoucher.category}-${previewVoucher.date}.jpg`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-200 rounded-xl transition-colors"
                    title="Open Full Resolution"
                  >
                    <ExternalLink className="h-5 w-5" />
                  </a>
                  <button
                    onClick={() => setPreviewVoucher(null)}
                    className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-200 rounded-xl transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {/* Image Preview Body */}
              <div className="p-4 sm:p-6 overflow-y-auto flex-1 bg-gray-900/5 flex items-center justify-center">
                <img
                  src={previewVoucher.url}
                  alt="Cash Voucher"
                  className="max-h-[65vh] w-auto max-w-full rounded-xl object-contain shadow-md border border-gray-200 bg-white"
                />
              </div>

              {previewVoucher.title && previewVoucher.title !== previewVoucher.category && (
                <div className="p-3 bg-white border-t border-gray-100 text-xs text-gray-600 text-center font-medium">
                  {previewVoucher.title}
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
