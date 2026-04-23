import React, { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, deleteDoc, doc, query, orderBy } from 'firebase/firestore';
import { db } from '../../firebase';
import { Expense, Income } from '../../types';
import { Plus, Download, Trash2, Wallet, TrendingUp, TrendingDown, Calendar, DollarSign, Tag } from 'lucide-react';
import { formatCurrency, formatDate, exportToCSV } from '../../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

export default function AdminFinances() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [type, setType] = useState<'income' | 'expense'>('expense');

  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    category: '',
    amount: 0,
    description: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const [expSnap, incSnap] = await Promise.all([
      getDocs(query(collection(db, 'expenses'), orderBy('date', 'desc'))),
      getDocs(query(collection(db, 'incomes'), orderBy('date', 'desc')))
    ]);
    setExpenses(expSnap.docs.map(doc => ({ ...doc.data(), id: doc.id } as Expense)));
    setIncomes(incSnap.docs.map(doc => ({ ...doc.data(), id: doc.id } as Income)));
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const collectionName = type === 'income' ? 'incomes' : 'expenses';
      await addDoc(collection(db, collectionName), formData);
      setIsModalOpen(false);
      setFormData({
        date: new Date().toISOString().split('T')[0],
        category: '',
        amount: 0,
        description: ''
      });
      fetchData();
    } catch (err) {
      console.error(err);
      alert('Error saving financial data');
    }
  };

  const handleDelete = async (id: string, dataType: 'income' | 'expense') => {
    if (confirm('Are you sure?')) {
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
          <p className="text-gray-500 text-sm">Track daily income and expenses.</p>
        </div>
        <div className="flex items-center space-x-3">
          <button 
            onClick={() => exportToCSV([...incomes, ...expenses], 'financial_report.csv')}
            className="flex items-center space-x-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors shadow-sm"
          >
            <Download className="h-4 w-4" />
            <span>Export Report</span>
          </button>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-green-600 rounded-xl text-sm font-medium text-white hover:bg-green-700 transition-colors shadow-sm"
          >
            <Plus className="h-4 w-4" />
            <span>Add Transaction</span>
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex items-center space-x-3 text-green-600 mb-2">
            <TrendingUp className="h-5 w-5" />
            <span className="text-xs font-bold uppercase tracking-wider">Total Income</span>
          </div>
          <div className="text-2xl font-bold text-gray-900">{formatCurrency(totalIncome)}</div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex items-center space-x-3 text-red-600 mb-2">
            <TrendingDown className="h-5 w-5" />
            <span className="text-xs font-bold uppercase tracking-wider">Total Expenses</span>
          </div>
          <div className="text-2xl font-bold text-gray-900">{formatCurrency(totalExpense)}</div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex items-center space-x-3 text-blue-600 mb-2">
            <Wallet className="h-5 w-5" />
            <span className="text-xs font-bold uppercase tracking-wider">Net Profit</span>
          </div>
          <div className="text-2xl font-bold text-gray-900">{formatCurrency(netProfit)}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Income Table */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-50 flex justify-between items-center">
            <h3 className="font-bold text-gray-900 flex items-center space-x-2">
              <TrendingUp className="h-5 w-5 text-green-600" />
              <span>Recent Income</span>
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50 text-xs font-bold text-gray-400 uppercase">
                <tr>
                  <th className="px-6 py-3">Date</th>
                  <th className="px-6 py-3">Category</th>
                  <th className="px-6 py-3">Amount</th>
                  <th className="px-6 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {incomes.map(item => (
                  <tr key={item.id} className="text-sm">
                    <td className="px-6 py-4 text-gray-500">{formatDate(item.date)}</td>
                    <td className="px-6 py-4 font-medium text-gray-900">{item.category}</td>
                    <td className="px-6 py-4 font-bold text-green-600">{formatCurrency(item.amount)}</td>
                    <td className="px-6 py-4 text-right">
                      <button onClick={() => handleDelete(item.id!, 'income')} className="text-gray-300 hover:text-red-600">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Expense Table */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-50 flex justify-between items-center">
            <h3 className="font-bold text-gray-900 flex items-center space-x-2">
              <TrendingDown className="h-5 w-5 text-red-600" />
              <span>Recent Expenses</span>
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50 text-xs font-bold text-gray-400 uppercase">
                <tr>
                  <th className="px-6 py-3">Date</th>
                  <th className="px-6 py-3">Category</th>
                  <th className="px-6 py-3">Amount</th>
                  <th className="px-6 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {expenses.map(item => (
                  <tr key={item.id} className="text-sm">
                    <td className="px-6 py-4 text-gray-500">{formatDate(item.date)}</td>
                    <td className="px-6 py-4 font-medium text-gray-900">{item.category}</td>
                    <td className="px-6 py-4 font-bold text-red-600">{formatCurrency(item.amount)}</td>
                    <td className="px-6 py-4 text-right">
                      <button onClick={() => handleDelete(item.id!, 'expense')} className="text-gray-300 hover:text-red-600">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsModalOpen(false)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Add Transaction</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="flex bg-gray-100 p-1 rounded-xl mb-6">
                  <button type="button" onClick={() => setType('expense')} className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${type === 'expense' ? 'bg-white text-red-600 shadow-sm' : 'text-gray-500'}`}>Expense</button>
                  <button type="button" onClick={() => setType('income')} className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${type === 'income' ? 'bg-white text-green-600 shadow-sm' : 'text-gray-500'}`}>Income</button>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase">Date</label>
                  <input type="date" required value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className="w-full bg-gray-50 border border-gray-100 rounded-xl py-3 px-4 outline-none focus:ring-2 focus:ring-green-500" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase">Category</label>
                  <input type="text" required value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="w-full bg-gray-50 border border-gray-100 rounded-xl py-3 px-4 outline-none focus:ring-2 focus:ring-green-500" placeholder="e.g. Feed, Sales, Labor" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase">Amount (৳)</label>
                  <input 
                    type="number" 
                    required 
                    value={isNaN(formData.amount) ? '' : formData.amount} 
                    onChange={e => {
                      const val = e.target.value === '' ? NaN : parseFloat(e.target.value);
                      setFormData({...formData, amount: val});
                    }} 
                    className="w-full bg-gray-50 border border-gray-100 rounded-xl py-3 px-4 outline-none focus:ring-2 focus:ring-green-500" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase">Description</label>
                  <textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full bg-gray-50 border border-gray-100 rounded-xl py-3 px-4 outline-none focus:ring-2 focus:ring-green-500 resize-none" rows={2} />
                </div>
                <button type="submit" className={`w-full py-4 rounded-xl font-bold text-white transition-all shadow-lg ${type === 'income' ? 'bg-green-600 hover:bg-green-700 shadow-green-100' : 'bg-red-600 hover:bg-red-700 shadow-red-100'}`}>Save Transaction</button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
