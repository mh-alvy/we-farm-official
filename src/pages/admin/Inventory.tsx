import React, { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { Product, DailyMilkEntry } from '../../types';
import { Plus, Trash2, Edit2, Package, DollarSign, Layers, Image as ImageIcon, X, Calendar, Filter, Droplet, Clock, Sparkles } from 'lucide-react';
import { formatCurrency, cn } from '../../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import ImageUploader from '../../components/ImageUploader';
import {
  getLocalizedProductName,
  getLocalizedProductDesc,
  getFallbackProductImage,
} from '../../lib/productTranslations';

export default function AdminInventory() {
  const [activeTab, setActiveTab] = useState<'products' | 'milk'>('products');
  
  // Products states
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [translatingField, setTranslatingField] = useState<string | null>(null);

  const [formData, setFormData] = useState<Product>({
    name: '',
    nameBn: '',
    price: 0,
    unit: 'Kg',
    stock: 0,
    description: '',
    descriptionBn: '',
    imageUrl: ''
  });

  // Daily Milk Inventory states
  const [milkEntries, setMilkEntries] = useState<DailyMilkEntry[]>([]);
  const [milkLoading, setMilkLoading] = useState(false);
  const [milkForm, setMilkForm] = useState<DailyMilkEntry>({
    date: new Date().toISOString().split('T')[0],
    morningAmount: 0,
    eveningAmount: 0,
    totalAmount: 0,
    notes: ''
  });

  // Filter states for milk
  const [filterType, setFilterType] = useState<'all' | 'date' | 'month' | 'year'>('all');
  const [filterDate, setFilterDate] = useState(new Date().toISOString().split('T')[0]);
  const [filterMonth, setFilterMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
  const [filterYear, setFilterYear] = useState(new Date().getFullYear().toString());

  useEffect(() => {
    fetchProducts();
    fetchMilkEntries();
  }, []);

  const fetchProducts = async () => {
    setLoading(true);
    const querySnapshot = await getDocs(collection(db, 'products'));
    setProducts(querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Product)));
    setLoading(false);
  };

  const fetchMilkEntries = async () => {
    setMilkLoading(true);
    const querySnapshot = await getDocs(collection(db, 'dailyMilkEntries'));
    const entries = querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as DailyMilkEntry));
    // Sort descending by date
    entries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    setMilkEntries(entries);
    setMilkLoading(false);
  };

  const handleAiTranslateField = async (
    sourceText: string,
    targetLang: 'bn' | 'en',
    targetKey: 'name' | 'nameBn' | 'description' | 'descriptionBn',
    loadingKey: string
  ) => {
    if (!sourceText || !sourceText.trim()) return;
    setTranslatingField(loadingKey);
    try {
      const res = await fetch('/api/ai/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: sourceText.trim(),
          targetLang,
          fieldContext: targetKey.startsWith('name') ? 'farm product name' : 'farm product description',
        }),
      });
      const data = await res.json();
      if (data.success && data.translatedText) {
        setFormData(prev => ({ ...prev, [targetKey]: data.translatedText }));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setTranslatingField(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload: Product = {
        ...formData,
        name: formData.name.trim() || formData.nameBn?.trim() || '',
        nameBn: formData.nameBn?.trim() || getLocalizedProductName(formData, true),
        description: formData.description.trim(),
        descriptionBn: formData.descriptionBn?.trim() || getLocalizedProductDesc(formData, true),
      };
      if (editingProduct) {
        await updateDoc(doc(db, 'products', editingProduct.id!), { ...payload });
      } else {
        await addDoc(collection(db, 'products'), payload);
      }
      setIsModalOpen(false);
      setEditingProduct(null);
      setFormData({ name: '', nameBn: '', price: 0, unit: 'Kg', stock: 0, description: '', descriptionBn: '', imageUrl: '' });
      fetchProducts();
    } catch (err) {
      console.error(err);
      alert('Error saving product');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'products', id));
      fetchProducts();
    } catch (err) {
      console.error(err);
      alert('Error deleting product');
    }
  };

  const handleMilkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const morning = Number(milkForm.morningAmount) || 0;
    const evening = Number(milkForm.eveningAmount) || 0;
    const total = morning + evening;

    try {
      await addDoc(collection(db, 'dailyMilkEntries'), {
        date: milkForm.date,
        morningAmount: morning,
        eveningAmount: evening,
        totalAmount: total,
        notes: milkForm.notes || ''
      });
      setMilkForm({
        date: new Date().toISOString().split('T')[0],
        morningAmount: 0,
        eveningAmount: 0,
        totalAmount: 0,
        notes: ''
      });
      fetchMilkEntries();
      alert('দৈনিক দুধের এন্ট্রি সফলভাবে সংরক্ষণ করা হয়েছে!');
    } catch (err) {
      console.error(err);
      alert('দুধের এন্ট্রি সংরক্ষণ করতে সমস্যা হয়েছে।');
    }
  };

  const handleDeleteMilkEntry = async (id: string) => {
    if (!confirm('আপনি কি এই দুধের এন্ট্রিটি মুছে ফেলতে চান?')) return;
    try {
      await deleteDoc(doc(db, 'dailyMilkEntries', id));
      fetchMilkEntries();
    } catch (err) {
      console.error(err);
      alert('মুছে ফেলতে সমস্যা হয়েছে।');
    }
  };

  // Filter milk entries
  const filteredMilkEntries = milkEntries.filter(entry => {
    if (filterType === 'date') {
      return entry.date === filterDate;
    }
    if (filterType === 'month') {
      return entry.date.startsWith(filterMonth);
    }
    if (filterType === 'year') {
      return entry.date.startsWith(filterYear);
    }
    return true;
  });

  const totalMorningFiltered = filteredMilkEntries.reduce((sum, e) => sum + (e.morningAmount || 0), 0);
  const totalEveningFiltered = filteredMilkEntries.reduce((sum, e) => sum + (e.eveningAmount || 0), 0);
  const grandTotalFiltered = filteredMilkEntries.reduce((sum, e) => sum + (e.totalAmount || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">ইনভেন্টরি ম্যানেজমেন্ট (Inventory Management)</h1>
          <p className="text-gray-500 text-xs sm:text-sm">পণ্য স্টক এবং দৈনিক দুধ উৎপাদন ও সেশন ম্যানেজমেন্ট।</p>
        </div>
        
        {/* Tabs */}
        <div className="flex bg-gray-100 p-1 rounded-2xl">
          <button
            onClick={() => setActiveTab('products')}
            className={cn(
              "px-5 py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center space-x-2",
              activeTab === 'products' ? "bg-white text-green-700 shadow-sm" : "text-gray-500 hover:text-gray-800"
            )}
          >
            <Package className="h-4 w-4" />
            <span>পণ্য স্টক (Products)</span>
          </button>
          <button
            onClick={() => setActiveTab('milk')}
            className={cn(
              "px-5 py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center space-x-2",
              activeTab === 'milk' ? "bg-white text-green-700 shadow-sm" : "text-gray-500 hover:text-gray-800"
            )}
          >
            <Droplet className="h-4 w-4" />
            <span>দৈনিক দুধ উৎপাদন ইনভেন্টরি</span>
          </button>
        </div>
      </div>

      {activeTab === 'products' ? (
        <>
          <div className="flex justify-end">
            <button 
              onClick={() => {
                setEditingProduct(null);
                setFormData({ name: '', nameBn: '', price: 0, unit: 'Kg', stock: 0, description: '', descriptionBn: '', imageUrl: '' });
                setIsModalOpen(true);
              }}
              className="flex items-center justify-center space-x-2 px-6 py-2.5 bg-green-600 rounded-xl text-sm font-bold text-white hover:bg-green-700 transition-all shadow-md shadow-green-100 cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>Add Product</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {loading ? (
              <div className="col-span-full py-20 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto"></div>
              </div>
            ) : products.map(product => (
              <div key={product.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden group">
                <div className="h-40 overflow-hidden relative bg-gray-50">
                  <img
                    src={product.imageUrl || getFallbackProductImage(product.name)}
                    alt={product.name}
                    onError={(e) => {
                      const target = e.currentTarget;
                      const fallback = getFallbackProductImage(product.name);
                      if (target.src !== fallback) {
                        target.src = fallback;
                      }
                    }}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute top-3 right-3 flex space-x-2">
                    <button
                      onClick={() => {
                        setEditingProduct(product);
                        setFormData({
                          ...product,
                          nameBn: product.nameBn || getLocalizedProductName(product, true),
                          descriptionBn: product.descriptionBn || getLocalizedProductDesc(product, true),
                        });
                        setIsModalOpen(true);
                      }}
                      className="p-2 bg-white/90 backdrop-blur-sm rounded-lg text-gray-600 hover:text-blue-600 shadow-sm transition-all cursor-pointer"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button onClick={() => handleDelete(product.id!)} className="p-2 bg-white/90 backdrop-blur-sm rounded-lg text-gray-600 hover:text-red-600 shadow-sm transition-all cursor-pointer"><Trash2 className="h-4 w-4" /></button>
                  </div>
                </div>
                <div className="p-6">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="font-bold text-gray-900">{product.name}</h3>
                      <p className="text-xs font-semibold text-green-700">
                        {product.nameBn || getLocalizedProductName(product, true)}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-green-600 font-bold block">{formatCurrency(product.price)}</span>
                      <span className="text-[10px] text-gray-400 font-medium uppercase">Per {product.unit || 'Kg'}</span>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mb-1 line-clamp-2">{product.description}</p>
                  <p className="text-xs text-gray-600 mb-4 line-clamp-2">
                    {product.descriptionBn || getLocalizedProductDesc(product, true)}
                  </p>
                  <div className="flex items-center justify-between text-xs font-bold">
                    <div className="flex items-center space-x-2 text-gray-400">
                      <Layers className="h-4 w-4" />
                      <span>Stock: {product.stock} units</span>
                    </div>
                    <span className={product.stock < 10 ? 'text-red-500' : 'text-green-500'}>
                      {product.stock < 10 ? 'Low Stock' : 'In Stock'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        /* Daily Milk Production & Inventory Section */
        <div className="space-y-8">
          {/* Add Milk Entry Form */}
          <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
            <h3 className="text-lg font-bold text-[#1A2E26] mb-2 flex items-center space-x-2">
              <Droplet className="h-5 w-5 text-green-600" />
              <span>দৈনিক দুধ উৎপাদন এন্ট্রি (সকাল ও বিকাল/রাত)</span>
            </h3>
            <p className="text-xs text-gray-400 mb-6">প্রতিদিনের দুইবেলার দুধের পরিমাণ এখানে এন্ট্রি দিন।</p>

            <form onSubmit={handleMilkSubmit} className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase">তারিখ (Date)</label>
                <input
                  type="date"
                  required
                  value={milkForm.date}
                  onChange={e => setMilkForm({...milkForm, date: e.target.value})}
                  className="w-full bg-gray-50 border border-gray-100 rounded-xl py-3 px-4 text-sm font-bold outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase">সকালের দুধ (লিটার)</label>
                <input
                  type="number"
                  step="0.1"
                  required
                  min="0"
                  value={milkForm.morningAmount || ''}
                  onChange={e => setMilkForm({...milkForm, morningAmount: parseFloat(e.target.value) || 0})}
                  placeholder="0.0"
                  className="w-full bg-gray-50 border border-gray-100 rounded-xl py-3 px-4 text-sm font-bold outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase">বিকাল/রাতের দুধ (লিটার)</label>
                <input
                  type="number"
                  step="0.1"
                  required
                  min="0"
                  value={milkForm.eveningAmount || ''}
                  onChange={e => setMilkForm({...milkForm, eveningAmount: parseFloat(e.target.value) || 0})}
                  placeholder="0.0"
                  className="w-full bg-gray-50 border border-gray-100 rounded-xl py-3 px-4 text-sm font-bold outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase">মন্তব্য (Notes)</label>
                <input
                  type="text"
                  value={milkForm.notes || ''}
                  onChange={e => setMilkForm({...milkForm, notes: e.target.value})}
                  placeholder="বিশেষ নোট..."
                  className="w-full bg-gray-50 border border-gray-100 rounded-xl py-3 px-4 text-sm font-bold outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>

              <div>
                <button
                  type="submit"
                  className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-xl transition-all shadow-md shadow-green-100 cursor-pointer flex items-center justify-center space-x-2"
                >
                  <Plus className="h-4 w-4" />
                  <span>এন্ট্রি সংরক্ষণ</span>
                </button>
              </div>
            </form>
          </div>

          {/* Filter & Summary Section */}
          <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 pb-4">
              <div className="flex items-center space-x-3">
                <Filter className="h-5 w-5 text-green-700" />
                <h4 className="font-bold text-gray-900">দুধ উৎপাদনের হিসাব ফিল্টার করুন</h4>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="flex bg-gray-50 p-1 rounded-xl">
                  {(['all', 'date', 'month', 'year'] as const).map(type => (
                    <button
                      key={type}
                      onClick={() => setFilterType(type)}
                      className={cn(
                        "px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer",
                        filterType === type ? "bg-[#1A2E26] text-white" : "text-gray-600 hover:text-gray-900"
                      )}
                    >
                      {type === 'all' && 'সব রেকর্ড'}
                      {type === 'date' && 'নির্দিষ্ট তারিখ'}
                      {type === 'month' && 'নির্দিষ্ট মাস'}
                      {type === 'year' && 'নির্দিষ্ট বছর'}
                    </button>
                  ))}
                </div>

                {filterType === 'date' && (
                  <input
                    type="date"
                    value={filterDate}
                    onChange={e => setFilterDate(e.target.value)}
                    className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-1.5 text-xs font-bold outline-none"
                  />
                )}
                {filterType === 'month' && (
                  <input
                    type="month"
                    value={filterMonth}
                    onChange={e => setFilterMonth(e.target.value)}
                    className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-1.5 text-xs font-bold outline-none"
                  />
                )}
                {filterType === 'year' && (
                  <select
                    value={filterYear}
                    onChange={e => setFilterYear(e.target.value)}
                    className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-1.5 text-xs font-bold outline-none"
                  >
                    <option value="2026">2026</option>
                    <option value="2025">2025</option>
                    <option value="2024">2024</option>
                  </select>
                )}
              </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-green-50 p-5 rounded-2xl border border-green-100 flex flex-col justify-between">
                <span className="text-[10px] font-bold text-green-800 uppercase tracking-wider mb-1">মোট সকালের দুধ</span>
                <span className="text-2xl font-black text-green-900">{totalMorningFiltered.toFixed(1)} <span className="text-xs font-normal">লিটার</span></span>
              </div>
              <div className="bg-emerald-50 p-5 rounded-2xl border border-emerald-100 flex flex-col justify-between">
                <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider mb-1">মোট বিকাল/রাতের দুধ</span>
                <span className="text-2xl font-black text-emerald-900">{totalEveningFiltered.toFixed(1)} <span className="text-xs font-normal">লিটার</span></span>
              </div>
              <div className="bg-[#1A2E26] text-white p-5 rounded-2xl shadow-md flex flex-col justify-between">
                <span className="text-[10px] font-bold text-green-300 uppercase tracking-wider mb-1">সর্বমোট দুধের পরিমাণ</span>
                <span className="text-2xl font-black text-white">{grandTotalFiltered.toFixed(1)} <span className="text-xs font-normal">লিটার</span></span>
              </div>
              <div className="bg-gray-50 p-5 rounded-2xl border border-gray-100 flex flex-col justify-between">
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">এন্ট্রির সংখ্যা</span>
                <span className="text-2xl font-black text-gray-800">{filteredMilkEntries.length} <span className="text-xs font-normal">টি</span></span>
              </div>
            </div>

            {/* Milk Entries Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-100 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                    <th className="py-3 px-4">তারিখ (Date)</th>
                    <th className="py-3 px-4">সকালের দুধ</th>
                    <th className="py-3 px-4">বিকাল/রাতের দুধ</th>
                    <th className="py-3 px-4">মোট দুধ</th>
                    <th className="py-3 px-4">মন্তব্য</th>
                    <th className="py-3 px-4 text-right">কার্যক্রম</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 text-sm">
                  {milkLoading ? (
                    <tr>
                      <td colSpan={6} className="py-10 text-center text-gray-400">লোড হচ্ছে...</td>
                    </tr>
                  ) : filteredMilkEntries.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-10 text-center text-gray-400">কোনো দুধের এন্ট্রি পাওয়া যায়নি।</td>
                    </tr>
                  ) : filteredMilkEntries.map(entry => (
                    <tr key={entry.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="py-3 px-4 font-bold text-gray-900">{entry.date}</td>
                      <td className="py-3 px-4 font-semibold text-green-700">{entry.morningAmount} L</td>
                      <td className="py-3 px-4 font-semibold text-emerald-700">{entry.eveningAmount} L</td>
                      <td className="py-3 px-4 font-bold text-[#1A2E26]">{entry.totalAmount} L</td>
                      <td className="py-3 px-4 text-gray-500 text-xs">{entry.notes || '-'}</td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => handleDeleteMilkEntry(entry.id!)}
                          className="p-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-xl transition-all cursor-pointer"
                          title="এন্ট্রি মুছুন"
                        >
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
      )}

      {/* Product Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsModalOpen(false)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative bg-white rounded-3xl shadow-2xl w-full max-w-xl p-6 sm:p-8 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">{editingProduct ? 'Edit Product (EN + বাংলা)' : 'Add Product (EN + বাংলা)'}</h2>
                <button type="button" onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-full">
                  <X className="h-5 w-5 text-gray-400" />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-bold text-blue-700 uppercase">Product Name (EN) *</label>
                      <button
                        type="button"
                        onClick={() => handleAiTranslateField(formData.name, 'bn', 'nameBn', 'name_en_bn')}
                        disabled={translatingField === 'name_en_bn'}
                        className="inline-flex items-center space-x-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 hover:bg-emerald-100 cursor-pointer"
                      >
                        <Sparkles className="h-3 w-3" />
                        <span>{translatingField === 'name_en_bn' ? '...' : 'AI বাংলায় →'}</span>
                      </button>
                    </div>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={e => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g. Cow Meat"
                      className="w-full bg-gray-50 border border-gray-100 rounded-xl py-2.5 px-4 outline-none focus:ring-2 focus:ring-green-500 text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-bold text-emerald-700 uppercase">পণ্যের নাম (বাংলা)</label>
                      <button
                        type="button"
                        onClick={() => handleAiTranslateField(formData.nameBn || '', 'en', 'name', 'name_bn_en')}
                        disabled={translatingField === 'name_bn_en'}
                        className="inline-flex items-center space-x-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 hover:bg-blue-100 cursor-pointer"
                      >
                        <Sparkles className="h-3 w-3" />
                        <span>{translatingField === 'name_bn_en' ? '...' : '← AI English'}</span>
                      </button>
                    </div>
                    <input
                      type="text"
                      value={formData.nameBn || ''}
                      onChange={e => setFormData({ ...formData, nameBn: e.target.value })}
                      placeholder="যেমন: গরুর মাংস"
                      className="w-full bg-emerald-50/40 border border-emerald-100 rounded-xl py-2.5 px-4 outline-none focus:ring-2 focus:ring-green-500 text-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase">Price (৳)</label>
                    <input 
                      type="number" 
                      required 
                      value={isNaN(formData.price) ? '' : formData.price} 
                      onChange={e => {
                        const val = e.target.value === '' ? NaN : parseFloat(e.target.value);
                        setFormData({...formData, price: val});
                      }} 
                      className="w-full bg-gray-50 border border-gray-100 rounded-xl py-3 px-4 outline-none focus:ring-2 focus:ring-green-500" 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase">Unit</label>
                    <select 
                      value={formData.unit} 
                      onChange={e => setFormData({...formData, unit: e.target.value as any})}
                      className="w-full bg-gray-50 border border-gray-100 rounded-xl py-3 px-4 outline-none focus:ring-2 focus:ring-green-500"
                    >
                      <option value="Kg">Kg (কেজি)</option>
                      <option value="L">L (লিটার)</option>
                      <option value="pc">pc (পিস)</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase">Stock</label>
                    <input 
                      type="number" 
                      required 
                      value={isNaN(formData.stock) ? '' : formData.stock} 
                      onChange={e => {
                        const val = e.target.value === '' ? NaN : parseInt(e.target.value);
                        setFormData({...formData, stock: val});
                      }} 
                      className="w-full bg-gray-50 border border-gray-100 rounded-xl py-3 px-4 outline-none focus:ring-2 focus:ring-green-500" 
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <ImageUploader 
                    label="Upload Product Image" 
                    currentImageUrl={formData.imageUrl} 
                    onUploadSuccess={(url) => setFormData({...formData, imageUrl: url})} 
                    onClear={() => setFormData({...formData, imageUrl: ''})}
                    folder="inventory"
                  />
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Or Paste Direct Image URL</label>
                    <input 
                      type="text" 
                      required 
                      value={formData.imageUrl} 
                      onChange={e => setFormData({...formData, imageUrl: e.target.value})} 
                      className="w-full bg-gray-50 border border-gray-100 rounded-xl py-2 px-4 outline-none focus:ring-2 focus:ring-green-500 text-xs" 
                      placeholder="https://..." 
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-bold text-blue-700 uppercase">Description (EN)</label>
                      <button
                        type="button"
                        onClick={() => handleAiTranslateField(formData.description, 'bn', 'descriptionBn', 'desc_en_bn')}
                        disabled={translatingField === 'desc_en_bn'}
                        className="inline-flex items-center space-x-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 hover:bg-emerald-100 cursor-pointer"
                      >
                        <Sparkles className="h-3 w-3" />
                        <span>{translatingField === 'desc_en_bn' ? '...' : 'AI বাংলায় →'}</span>
                      </button>
                    </div>
                    <textarea
                      value={formData.description}
                      onChange={e => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Fresh Cow Meat with high protein..."
                      className="w-full bg-gray-50 border border-gray-100 rounded-xl py-2.5 px-4 outline-none focus:ring-2 focus:ring-green-500 resize-none text-xs"
                      rows={3}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-bold text-emerald-700 uppercase">বিবরণ (বাংলা)</label>
                      <button
                        type="button"
                        onClick={() => handleAiTranslateField(formData.descriptionBn || '', 'en', 'description', 'desc_bn_en')}
                        disabled={translatingField === 'desc_bn_en'}
                        className="inline-flex items-center space-x-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 hover:bg-blue-100 cursor-pointer"
                      >
                        <Sparkles className="h-3 w-3" />
                        <span>{translatingField === 'desc_bn_en' ? '...' : '← AI English'}</span>
                      </button>
                    </div>
                    <textarea
                      value={formData.descriptionBn || ''}
                      onChange={e => setFormData({ ...formData, descriptionBn: e.target.value })}
                      placeholder="উচ্চ প্রোটিন ও পুষ্টিসমৃদ্ধ খামারের তাজা গরুর মাংস..."
                      className="w-full bg-emerald-50/40 border border-emerald-100 rounded-xl py-2.5 px-4 outline-none focus:ring-2 focus:ring-green-500 resize-none text-xs"
                      rows={3}
                    />
                  </div>
                </div>

                <button type="submit" className="w-full bg-green-600 hover:bg-green-700 py-4 rounded-xl font-bold text-white transition-all shadow-lg shadow-green-100 cursor-pointer">Save Product</button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
