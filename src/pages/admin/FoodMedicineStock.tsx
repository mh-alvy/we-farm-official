import React, { useState, useEffect } from 'react';
import { 
  collection, 
  getDocs, 
  addDoc, 
  deleteDoc, 
  doc, 
  updateDoc, 
  onSnapshot, 
  query, 
  orderBy, 
  limit, 
  Timestamp 
} from 'firebase/firestore';
import { db } from '../../firebase';
import { StockItem, StockLog } from '../../types';
import { 
  Plus, 
  Search, 
  Download, 
  Trash2, 
  Edit2, 
  X, 
  Layers, 
  Calendar, 
  Filter, 
  Clock, 
  AlertTriangle, 
  TrendingUp, 
  TrendingDown, 
  History, 
  CheckCircle2, 
  ArrowUpRight, 
  ArrowDownRight, 
  MessageSquare, 
  Apple, 
  ShieldAlert, 
  Pill, 
  Sparkles,
  RotateCcw
} from 'lucide-react';
import { formatDate, exportToCSV } from '../../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

const PRESET_SAMPLE_ITEMS: Omit<StockItem, 'id'>[] = [
  {
    name: 'Napier Grass (নেপিয়ার ঘাস)',
    type: 'Food',
    category: 'Green Fodder (কাঁচা ঘাস)',
    unit: 'Kg',
    quantity: 1200,
    minThreshold: 300,
    supplier: 'Farm Field Plot-A',
    notes: 'Freshly harvested daily green fodder',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    name: 'Wheat Bran (গমের ভূষি)',
    type: 'Food',
    category: 'Concentrate Feed (দানাদার)',
    unit: 'Bags (50Kg)',
    quantity: 45,
    minThreshold: 10,
    supplier: 'City Feed Mill',
    notes: 'Premium quality high-fiber bran',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    name: 'Calcium & Vitamin D3 Supplement',
    type: 'Medicine',
    category: 'Supplements (পুষ্টি উপাদান)',
    unit: 'Liters',
    quantity: 30,
    minThreshold: 5,
    supplier: 'Square Vet Pharma',
    expiryDate: '2027-06-30',
    notes: 'Essential for high-yield dairy cows',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    name: 'FMD Vaccine (ক্ষুরারোগের টিকা)',
    type: 'Medicine',
    category: 'Vaccine (টিকা)',
    unit: 'Vials (10 Doses)',
    quantity: 15,
    minThreshold: 5,
    supplier: 'Livestock Research Institute',
    expiryDate: '2027-12-31',
    notes: 'Kept in deep freeze refrigerator at 2-8°C',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    name: 'Albendazole Dewormer (কৃমিনাশক)',
    type: 'Medicine',
    category: 'Dewormer (কৃমিনাশক)',
    unit: 'Bottles (100ml)',
    quantity: 20,
    minThreshold: 5,
    supplier: 'Renata Vet Care',
    expiryDate: '2027-09-15',
    notes: 'Routine 3-month deworming cycle medicine',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

export default function FoodMedicineStock() {
  const [activeTab, setActiveTab] = useState<'items' | 'logs'>('items');
  const [items, setItems] = useState<StockItem[]>([]);
  const [logs, setLogs] = useState<StockLog[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'All' | 'Food' | 'Medicine'>('All');
  const [stockStatusFilter, setStockStatusFilter] = useState<'All' | 'Low' | 'Adequate'>('All');

  // Modals
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [isItemHistoryModalOpen, setIsItemHistoryModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<StockItem | null>(null);
  const [selectedItemForAdjust, setSelectedItemForAdjust] = useState<StockItem | null>(null);
  const [selectedItemForHistory, setSelectedItemForHistory] = useState<StockItem | null>(null);

  // New/Edit Item Form
  const [itemFormData, setItemFormData] = useState<Omit<StockItem, 'id'>>({
    name: '',
    type: 'Food',
    category: '',
    unit: 'Kg',
    quantity: 0,
    minThreshold: 10,
    supplier: '',
    expiryDate: '',
    notes: '',
    createdAt: '',
    updatedAt: ''
  });

  // Stock Adjustment Form
  const [adjustFormData, setAdjustFormData] = useState<{
    action: 'increase' | 'decrease';
    amount: string;
    comment: string;
    date: string;
  }>({
    action: 'increase',
    amount: '',
    comment: '',
    date: new Date().toISOString().split('T')[0]
  });

  // Real-time listener for stock items
  useEffect(() => {
    const unsubItems = onSnapshot(collection(db, 'stockItems'), (snapshot) => {
      const itemsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as StockItem));
      // Sort by type then name
      itemsData.sort((a, b) => a.name.localeCompare(b.name));
      setItems(itemsData);
      setLoading(false);
    });

    const logsQuery = query(collection(db, 'stockLogs'), orderBy('createdAt', 'desc'), limit(500));
    const unsubLogs = onSnapshot(logsQuery, (snapshot) => {
      const logsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as StockLog));
      setLogs(logsData);
    });

    return () => {
      unsubItems();
      unsubLogs();
    };
  }, []);

  // Initialize sample data if collection is completely empty
  const handleSeedSamples = async () => {
    if (!confirm('Would you like to seed initial recommended Food & Medicine items?')) return;
    try {
      for (const item of PRESET_SAMPLE_ITEMS) {
        const itemRef = await addDoc(collection(db, 'stockItems'), item);
        // Add initial stock creation log
        const log: Omit<StockLog, 'id'> = {
          itemId: itemRef.id,
          itemName: item.name,
          itemType: item.type,
          action: 'increase',
          amount: item.quantity,
          previousQuantity: 0,
          newQuantity: item.quantity,
          unit: item.unit,
          comment: 'Initial stock intake recorded on setup',
          date: new Date().toISOString().split('T')[0],
          createdAt: new Date().toISOString(),
          performedBy: 'System Setup'
        };
        await addDoc(collection(db, 'stockLogs'), log);
      }
      alert('Sample Food & Medicine stock items added successfully!');
    } catch (err: any) {
      console.error(err);
      alert('Failed to seed items: ' + err.message);
    }
  };

  // Open Add Item Modal
  const handleOpenAddModal = () => {
    setEditingItem(null);
    setItemFormData({
      name: '',
      type: 'Food',
      category: '',
      unit: 'Kg',
      quantity: 0,
      minThreshold: 10,
      supplier: '',
      expiryDate: '',
      notes: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    setIsItemModalOpen(true);
  };

  // Open Edit Item Modal
  const handleOpenEditModal = (item: StockItem) => {
    setEditingItem(item);
    setItemFormData({
      name: item.name,
      type: item.type,
      category: item.category || '',
      unit: item.unit,
      quantity: item.quantity,
      minThreshold: item.minThreshold || 10,
      supplier: item.supplier || '',
      expiryDate: item.expiryDate || '',
      notes: item.notes || '',
      createdAt: item.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    setIsItemModalOpen(true);
  };

  // Save Item (Create or Update)
  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemFormData.name.trim()) {
      alert('Please enter an item name');
      return;
    }

    try {
      const now = new Date().toISOString();
      if (editingItem) {
        // Edit existing
        await updateDoc(doc(db, 'stockItems', editingItem.id!), {
          ...itemFormData,
          updatedAt: now
        });
      } else {
        // Create new item
        const itemRef = await addDoc(collection(db, 'stockItems'), {
          ...itemFormData,
          createdAt: now,
          updatedAt: now
        });

        // Add initial stock intake log if quantity > 0
        if (itemFormData.quantity > 0) {
          const log: Omit<StockLog, 'id'> = {
            itemId: itemRef.id,
            itemName: itemFormData.name,
            itemType: itemFormData.type,
            action: 'increase',
            amount: Number(itemFormData.quantity),
            previousQuantity: 0,
            newQuantity: Number(itemFormData.quantity),
            unit: itemFormData.unit,
            comment: 'Initial inventory quantity logged on item creation',
            date: new Date().toISOString().split('T')[0],
            createdAt: now,
            performedBy: 'Admin'
          };
          await addDoc(collection(db, 'stockLogs'), log);
        }
      }

      setIsItemModalOpen(false);
      setEditingItem(null);
    } catch (err: any) {
      console.error(err);
      alert('Error saving item: ' + err.message);
    }
  };

  // Delete Item
  const handleDeleteItem = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}" from stock?`)) return;
    try {
      await deleteDoc(doc(db, 'stockItems', id));
    } catch (err: any) {
      console.error(err);
      alert('Failed to delete item: ' + err.message);
    }
  };

  // Open Stock Adjust Modal
  const handleOpenAdjust = (item: StockItem, defaultAction: 'increase' | 'decrease') => {
    setSelectedItemForAdjust(item);
    setAdjustFormData({
      action: defaultAction,
      amount: '',
      comment: '',
      date: new Date().toISOString().split('T')[0]
    });
    setIsAdjustModalOpen(true);
  };

  // Save Stock Adjustment
  const handleSaveAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItemForAdjust) return;

    const numAmount = parseFloat(adjustFormData.amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      alert('Please enter a valid positive adjustment amount');
      return;
    }

    const currentQty = Number(selectedItemForAdjust.quantity) || 0;
    let newQty = currentQty;

    if (adjustFormData.action === 'increase') {
      newQty = currentQty + numAmount;
    } else {
      if (numAmount > currentQty) {
        if (!confirm(`Warning: Deducting ${numAmount} ${selectedItemForAdjust.unit} exceeds the current stock of ${currentQty}. Would you like to proceed anyway?`)) {
          return;
        }
      }
      newQty = Math.max(0, currentQty - numAmount);
    }

    try {
      const now = new Date().toISOString();

      // 1. Update item stock
      await updateDoc(doc(db, 'stockItems', selectedItemForAdjust.id!), {
        quantity: newQty,
        updatedAt: now
      });

      // 2. Create detailed stock log entry
      const logEntry: Omit<StockLog, 'id'> = {
        itemId: selectedItemForAdjust.id!,
        itemName: selectedItemForAdjust.name,
        itemType: selectedItemForAdjust.type,
        action: adjustFormData.action,
        amount: numAmount,
        previousQuantity: currentQty,
        newQuantity: newQty,
        unit: selectedItemForAdjust.unit,
        comment: adjustFormData.comment.trim() || undefined,
        date: adjustFormData.date || now.split('T')[0],
        createdAt: now,
        performedBy: 'Admin'
      };

      await addDoc(collection(db, 'stockLogs'), logEntry);

      setIsAdjustModalOpen(false);
      setSelectedItemForAdjust(null);
    } catch (err: any) {
      console.error(err);
      alert('Error updating stock: ' + err.message);
    }
  };

  // Filtered Items
  const filteredItems = items.filter(item => {
    const term = searchTerm.toLowerCase().trim();
    const matchesSearch = !term || (
      item.name.toLowerCase().includes(term) ||
      (item.category && item.category.toLowerCase().includes(term)) ||
      (item.supplier && item.supplier.toLowerCase().includes(term)) ||
      (item.notes && item.notes.toLowerCase().includes(term))
    );

    const matchesType = typeFilter === 'All' || item.type === typeFilter;

    let matchesStatus = true;
    const isLowStock = item.quantity <= (item.minThreshold || 10);
    if (stockStatusFilter === 'Low') matchesStatus = isLowStock;
    if (stockStatusFilter === 'Adequate') matchesStatus = !isLowStock;

    return matchesSearch && matchesType && matchesStatus;
  });

  // Filtered Logs
  const filteredLogs = logs.filter(log => {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return true;
    return (
      log.itemName.toLowerCase().includes(term) ||
      (log.comment && log.comment.toLowerCase().includes(term)) ||
      log.action.toLowerCase().includes(term) ||
      log.date.includes(term)
    );
  });

  // Calculate Quick Stats
  const totalItemsCount = items.length;
  const foodItemsCount = items.filter(i => i.type === 'Food').length;
  const medicineItemsCount = items.filter(i => i.type === 'Medicine').length;
  const lowStockCount = items.filter(i => i.quantity <= (i.minThreshold || 10)).length;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-bold text-gray-900">Food & Medicine Stock</h1>
            <span className="px-2.5 py-0.5 text-xs font-bold bg-green-100 text-green-800 rounded-full">
              Livestock Feed & Care
            </span>
          </div>
          <p className="text-gray-500 text-sm mt-0.5">
            Manage animal fodder, concentrate feed, vaccines, and medical inventory with full adjustment history.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {items.length === 0 && !loading && (
            <button
              onClick={handleSeedSamples}
              className="flex items-center space-x-2 px-3 sm:px-4 py-2 bg-amber-50 border border-amber-200 text-amber-800 hover:bg-amber-100 rounded-xl text-xs sm:text-sm font-semibold transition-colors"
            >
              <Sparkles className="h-4 w-4 text-amber-600" />
              <span>Load Starter Stock Items</span>
            </button>
          )}

          <button
            onClick={() => exportToCSV(
              activeTab === 'items' ? items : logs,
              activeTab === 'items' ? 'food_medicine_stock.csv' : 'stock_adjustment_logs.csv'
            )}
            className="flex items-center space-x-2 px-3 sm:px-4 py-2 bg-white border border-gray-200 rounded-xl text-xs sm:text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors shadow-sm"
          >
            <Download className="h-4 w-4" />
            <span className="hidden xs:inline">Export CSV</span>
          </button>

          <button
            onClick={handleOpenAddModal}
            className="flex items-center space-x-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl text-xs sm:text-sm font-bold shadow-sm transition-all"
          >
            <Plus className="h-4 w-4" />
            <span>Add New Item</span>
          </button>
        </div>
      </div>

      {/* Overview Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center space-x-3">
          <div className="w-10 h-10 bg-green-50 text-green-600 rounded-xl flex items-center justify-center font-bold">
            <Layers className="h-5 w-5" />
          </div>
          <div>
            <div className="text-xl font-bold text-gray-900">{totalItemsCount}</div>
            <div className="text-xs font-semibold text-gray-400">Total Stock Items</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center space-x-3">
          <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center font-bold">
            <Apple className="h-5 w-5" />
          </div>
          <div>
            <div className="text-xl font-bold text-gray-900">{foodItemsCount}</div>
            <div className="text-xs font-semibold text-gray-400">Feed & Fodder Items</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center space-x-3">
          <div className="w-10 h-10 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center font-bold">
            <Pill className="h-5 w-5" />
          </div>
          <div>
            <div className="text-xl font-bold text-gray-900">{medicineItemsCount}</div>
            <div className="text-xs font-semibold text-gray-400">Medicines & Vaccines</div>
          </div>
        </div>

        <div className={`p-4 rounded-2xl border shadow-sm flex items-center space-x-3 ${
          lowStockCount > 0 ? 'bg-amber-50/60 border-amber-200' : 'bg-white border-gray-100'
        }`}>
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold ${
            lowStockCount > 0 ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-500'
          }`}>
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div>
            <div className={`text-xl font-bold ${lowStockCount > 0 ? 'text-amber-800' : 'text-gray-900'}`}>
              {lowStockCount}
            </div>
            <div className="text-xs font-semibold text-gray-400">Low Stock Warnings</div>
          </div>
        </div>
      </div>

      {/* Tabs and Search / Filter Header */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-100 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-3">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setActiveTab('items')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                activeTab === 'items'
                  ? 'bg-green-600 text-white shadow-sm'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Layers className="h-4 w-4" />
              <span>Stock Items ({filteredItems.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('logs')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                activeTab === 'logs'
                  ? 'bg-green-600 text-white shadow-sm'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <History className="h-4 w-4" />
              <span>Adjustment Stat History ({logs.length})</span>
            </button>
          </div>

          <div className="text-xs text-gray-400 font-medium">
            {activeTab === 'items' 
              ? 'Click (+ / -) to update inventory with optional comments'
              : 'Complete history of intake, feedings, and treatments'}
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder={activeTab === 'items' ? 'Search stock items by name, category, supplier...' : 'Search logs by item name, comment, date...'}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs sm:text-sm focus:bg-white focus:ring-2 focus:ring-green-500 outline-none transition-all"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-gray-600"
              >
                Clear
              </button>
            )}
          </div>

          {activeTab === 'items' && (
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center space-x-1">
                {(['All', 'Food', 'Medicine'] as const).map(type => (
                  <button
                    key={type}
                    onClick={() => setTypeFilter(type)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                      typeFilter === type
                        ? 'bg-gray-900 text-white shadow-xs'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {type === 'All' ? 'All Types' : type}
                  </button>
                ))}
              </div>

              <select
                value={stockStatusFilter}
                onChange={(e) => setStockStatusFilter(e.target.value as any)}
                className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-700 outline-none focus:ring-2 focus:ring-green-500 cursor-pointer"
              >
                <option value="All">All Levels</option>
                <option value="Low">Low Stock Alert (&le; Min)</option>
                <option value="Adequate">Adequate Stock</option>
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Main Content View */}
      {activeTab === 'items' ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Item Details</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Type & Category</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Available Stock</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Min Alert / Expiry</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider text-right">Quick Stock Update</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto"></div>
                    </td>
                  </tr>
                ) : filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                      {searchTerm || typeFilter !== 'All' || stockStatusFilter !== 'All' ? (
                        <div>
                          <p className="font-semibold text-gray-700">No items match your filter criteria.</p>
                          <button
                            onClick={() => { setSearchTerm(''); setTypeFilter('All'); setStockStatusFilter('All'); }}
                            className="mt-2 text-xs font-bold text-green-600 hover:underline"
                          >
                            Reset filters
                          </button>
                        </div>
                      ) : (
                        <div>
                          <p className="font-semibold text-gray-700">No stock items in inventory yet.</p>
                          <p className="text-xs text-gray-400 mt-1">Click "Add New Item" or "Load Starter Stock Items" above.</p>
                        </div>
                      )}
                    </td>
                  </tr>
                ) : (
                  filteredItems.map(item => {
                    const isLowStock = item.quantity <= (item.minThreshold || 10);
                    return (
                      <tr key={item.id} className="hover:bg-gray-50/70 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center space-x-3">
                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 font-bold ${
                              item.type === 'Food' ? 'bg-blue-50 text-blue-600' : 'bg-purple-50 text-purple-600'
                            }`}>
                              {item.type === 'Food' ? <Apple className="h-4 w-4" /> : <Pill className="h-4 w-4" />}
                            </div>
                            <div>
                              <div className="font-bold text-gray-900 text-sm">{item.name}</div>
                              {item.supplier && (
                                <div className="text-[11px] text-gray-400">Supplier: {item.supplier}</div>
                              )}
                            </div>
                          </div>
                        </td>

                        <td className="px-6 py-4">
                          <div className="space-y-1">
                            <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              item.type === 'Food' ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-purple-50 text-purple-700 border border-purple-200'
                            }`}>
                              {item.type}
                            </span>
                            {item.category && (
                              <div className="text-xs text-gray-500 font-medium">{item.category}</div>
                            )}
                          </div>
                        </td>

                        <td className="px-6 py-4">
                          <div className="flex items-center space-x-2">
                            <span className={`text-base font-extrabold ${isLowStock ? 'text-red-600' : 'text-gray-900'}`}>
                              {item.quantity}
                            </span>
                            <span className="text-xs font-semibold text-gray-500">{item.unit}</span>
                            {isLowStock && (
                              <span className="inline-flex items-center space-x-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-50 text-red-700 border border-red-200">
                                <AlertTriangle className="h-3 w-3 mr-0.5" />
                                <span>Low</span>
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="px-6 py-4 text-xs text-gray-500">
                          <div>Alert at: <span className="font-semibold text-gray-700">{item.minThreshold || 10} {item.unit}</span></div>
                          {item.expiryDate && (
                            <div className="text-[11px] text-amber-700 mt-0.5">
                              Exp: <span className="font-semibold">{item.expiryDate}</span>
                            </div>
                          )}
                        </td>

                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end space-x-1.5">
                            {/* Stock Increase (+) Button */}
                            <button
                              type="button"
                              onClick={() => handleOpenAdjust(item, 'increase')}
                              className="inline-flex items-center space-x-1 px-3 py-1.5 bg-green-50 hover:bg-green-100 text-green-700 border border-green-200 rounded-xl text-xs font-bold transition-all shadow-xs"
                              title="Add stock / ইনটেক বাড়ান"
                            >
                              <Plus className="h-3.5 w-3.5" />
                              <span>Add Stock</span>
                            </button>

                            {/* Stock Decrease (-) Button */}
                            <button
                              type="button"
                              onClick={() => handleOpenAdjust(item, 'decrease')}
                              className="inline-flex items-center space-x-1 px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-xl text-xs font-bold transition-all shadow-xs"
                              title="Consume or record usage / স্টক কমান"
                            >
                              <TrendingDown className="h-3.5 w-3.5" />
                              <span>Use / Consume</span>
                            </button>
                          </div>
                        </td>

                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end space-x-1">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedItemForHistory(item);
                                setIsItemHistoryModalOpen(true);
                              }}
                              className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                              title="View item adjustment stat history"
                            >
                              <History className="h-4 w-4" />
                            </button>

                            <button
                              type="button"
                              onClick={() => handleOpenEditModal(item)}
                              className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Edit item information"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDeleteItem(item.id!, item.name)}
                              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Delete item"
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
      ) : (
        /* Adjustment Stat Records Table */
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-4 bg-gray-50/50 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <History className="h-4 w-4 text-green-600" />
              <span className="text-xs font-bold uppercase tracking-wider text-gray-600">
                All Inventory Adjustments & Activity Logs
              </span>
            </div>
            <span className="text-xs text-gray-400">
              Total {filteredLogs.length} audit records
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Date & Time</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Item Name</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Action Type</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Quantity Change</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Balance Progression</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Comment / Note</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                      No stock adjustment records found.
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map(log => (
                    <tr key={log.id} className="hover:bg-gray-50/70 transition-colors">
                      <td className="px-6 py-4 text-xs text-gray-600">
                        <div className="font-semibold text-gray-900">{formatDate(log.date)}</div>
                        <div className="text-[10px] text-gray-400 mt-0.5">
                          {log.createdAt ? new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <div className="font-bold text-gray-900 text-sm">{log.itemName}</div>
                        <span className={`inline-block px-1.5 py-0.2 rounded text-[10px] font-semibold ${
                          log.itemType === 'Food' ? 'bg-blue-50 text-blue-600' : 'bg-purple-50 text-purple-600'
                        }`}>
                          {log.itemType}
                        </span>
                      </td>

                      <td className="px-6 py-4">
                        {log.action === 'increase' ? (
                          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-bold bg-green-50 text-green-700 border border-green-200">
                            <ArrowUpRight className="h-3.5 w-3.5 text-green-600" />
                            <span>Stock In (+ বাড়ান)</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
                            <ArrowDownRight className="h-3.5 w-3.5 text-amber-600" />
                            <span>Stock Out (- কমান)</span>
                          </span>
                        )}
                      </td>

                      <td className="px-6 py-4">
                        <span className={`text-sm font-extrabold ${
                          log.action === 'increase' ? 'text-green-600' : 'text-amber-700'
                        }`}>
                          {log.action === 'increase' ? '+' : '-'}{log.amount} {log.unit}
                        </span>
                      </td>

                      <td className="px-6 py-4 text-xs text-gray-600">
                        <div className="flex items-center space-x-1.5">
                          <span className="text-gray-400">{log.previousQuantity}</span>
                          <span>&rarr;</span>
                          <span className="font-bold text-gray-900">{log.newQuantity} {log.unit}</span>
                        </div>
                      </td>

                      <td className="px-6 py-4 text-xs">
                        {log.comment ? (
                          <div className="p-2 bg-gray-50 rounded-lg text-gray-700 border border-gray-100 italic flex items-start space-x-1.5">
                            <MessageSquare className="h-3.5 w-3.5 text-gray-400 shrink-0 mt-0.5" />
                            <span>{log.comment}</span>
                          </div>
                        ) : (
                          <span className="text-gray-300 italic">No comment provided</span>
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

      {/* Modal 1: Add / Edit Item */}
      <AnimatePresence>
        {isItemModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsItemModalOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative bg-white rounded-3xl shadow-2xl w-full max-w-xl p-6 sm:p-8 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center mb-6 border-b border-gray-100 pb-4">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">
                    {editingItem ? 'Edit Stock Item' : 'Add New Food or Medicine Item'}
                  </h2>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Configure inventory properties, alert levels, and initial quantities.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsItemModalOpen(false)}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400 hover:text-gray-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleSaveItem} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                    Item Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Napier Grass, Wheat Bran, FMD Vaccine..."
                    value={itemFormData.name}
                    onChange={(e) => setItemFormData({ ...itemFormData, name: e.target.value })}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-green-500 outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                      Type *
                    </label>
                    <select
                      value={itemFormData.type}
                      onChange={(e) => setItemFormData({ ...itemFormData, type: e.target.value as any })}
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-green-500 outline-none"
                    >
                      <option value="Food">Food (পশুখাদ্য / Fodder & Feed)</option>
                      <option value="Medicine">Medicine (ওষুধ ও টিকা / Care)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                      Category
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Green Fodder, Vaccine, Supplement..."
                      value={itemFormData.category}
                      onChange={(e) => setItemFormData({ ...itemFormData, category: e.target.value })}
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-green-500 outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                      Unit of Measure *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Kg, Bags, Liters, Vials"
                      value={itemFormData.unit}
                      onChange={(e) => setItemFormData({ ...itemFormData, unit: e.target.value })}
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-green-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                      {editingItem ? 'Current Stock' : 'Initial Stock'} *
                    </label>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      required
                      value={itemFormData.quantity}
                      onChange={(e) => setItemFormData({ ...itemFormData, quantity: parseFloat(e.target.value) || 0 })}
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-green-500 outline-none font-bold text-gray-900"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                      Low Stock Alert Level
                    </label>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      value={itemFormData.minThreshold}
                      onChange={(e) => setItemFormData({ ...itemFormData, minThreshold: parseFloat(e.target.value) || 0 })}
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-green-500 outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                      Supplier / Source
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Farm Field, Square Vet, Renata..."
                      value={itemFormData.supplier}
                      onChange={(e) => setItemFormData({ ...itemFormData, supplier: e.target.value })}
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-green-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                      Expiry Date (Optional)
                    </label>
                    <input
                      type="date"
                      value={itemFormData.expiryDate}
                      onChange={(e) => setItemFormData({ ...itemFormData, expiryDate: e.target.value })}
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-green-500 outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                    Notes / Storage Instructions
                  </label>
                  <textarea
                    rows={2}
                    placeholder="e.g. Store in refrigerated environment at 2-8°C, feed twice daily..."
                    value={itemFormData.notes}
                    onChange={(e) => setItemFormData({ ...itemFormData, notes: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-green-500 outline-none"
                  />
                </div>

                <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setIsItemModalOpen(false)}
                    className="px-5 py-2.5 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-xl transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2.5 text-xs font-bold text-white bg-green-600 hover:bg-green-700 rounded-xl shadow-md transition-all"
                  >
                    {editingItem ? 'Update Stock Item' : 'Save New Item'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal 2: Stock Adjustment (Increase (+) or Decrease (-)) */}
      <AnimatePresence>
        {isAdjustModalOpen && selectedItemForAdjust && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAdjustModalOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative bg-white rounded-3xl shadow-2xl w-full max-w-lg p-6 sm:p-8"
            >
              <div className="flex justify-between items-center mb-5 border-b border-gray-100 pb-3">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">
                    Stock Adjustment for {selectedItemForAdjust.name}
                  </h2>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Current Balance: <strong className="text-gray-900">{selectedItemForAdjust.quantity} {selectedItemForAdjust.unit}</strong>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAdjustModalOpen(false)}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400 hover:text-gray-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleSaveAdjustment} className="space-y-4">
                {/* Action Mode Toggle */}
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">
                    Adjustment Type *
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setAdjustFormData({ ...adjustFormData, action: 'increase' })}
                      className={`flex items-center justify-center space-x-2 py-3 rounded-xl font-bold text-xs transition-all border ${
                        adjustFormData.action === 'increase'
                          ? 'bg-green-50 border-green-400 text-green-700 shadow-xs'
                          : 'bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100'
                      }`}
                    >
                      <Plus className="h-4 w-4" />
                      <span>Stock In / বাড়ান (+)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setAdjustFormData({ ...adjustFormData, action: 'decrease' })}
                      className={`flex items-center justify-center space-x-2 py-3 rounded-xl font-bold text-xs transition-all border ${
                        adjustFormData.action === 'decrease'
                          ? 'bg-amber-50 border-amber-400 text-amber-800 shadow-xs'
                          : 'bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100'
                      }`}
                    >
                      <TrendingDown className="h-4 w-4" />
                      <span>Use / কমান (-)</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                      Quantity Amount ({selectedItemForAdjust.unit}) *
                    </label>
                    <input
                      type="number"
                      step="any"
                      min="0.01"
                      required
                      placeholder="e.g. 50"
                      value={adjustFormData.amount}
                      onChange={(e) => setAdjustFormData({ ...adjustFormData, amount: e.target.value })}
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-base font-bold focus:bg-white focus:ring-2 focus:ring-green-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                      Date *
                    </label>
                    <input
                      type="date"
                      required
                      value={adjustFormData.date}
                      onChange={(e) => setAdjustFormData({ ...adjustFormData, date: e.target.value })}
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-green-500 outline-none"
                    />
                  </div>
                </div>

                {/* Calculation Preview */}
                {parseFloat(adjustFormData.amount) > 0 && (
                  <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 flex items-center justify-between text-xs">
                    <span className="text-gray-500">Projected Balance:</span>
                    <span className="font-extrabold text-gray-900">
                      {selectedItemForAdjust.quantity} {adjustFormData.action === 'increase' ? '+' : '-'} {parseFloat(adjustFormData.amount)} = {' '}
                      <span className={adjustFormData.action === 'increase' ? 'text-green-600' : 'text-amber-700'}>
                        {adjustFormData.action === 'increase'
                          ? selectedItemForAdjust.quantity + parseFloat(adjustFormData.amount)
                          : Math.max(0, selectedItemForAdjust.quantity - parseFloat(adjustFormData.amount))} {selectedItemForAdjust.unit}
                      </span>
                    </span>
                  </div>
                )}

                {/* Optional Comment Field */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-gray-500 uppercase">
                      Comment / Reason
                    </label>
                    <span className="text-[11px] font-semibold text-gray-400 bg-gray-100 px-1.5 py-0.2 rounded">
                      Optional (ঐচ্ছিক)
                    </span>
                  </div>
                  <textarea
                    rows={2}
                    placeholder="e.g. Daily morning feeding for Dairy cows, Dr. prescribed treatment for Horini, Fresh truck delivery..."
                    value={adjustFormData.comment}
                    onChange={(e) => setAdjustFormData({ ...adjustFormData, comment: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-green-500 outline-none"
                  />
                </div>

                <div className="flex items-center justify-end space-x-3 pt-3 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setIsAdjustModalOpen(false)}
                    className="px-5 py-2.5 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-xl transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className={`px-6 py-2.5 text-xs font-bold text-white rounded-xl shadow-md transition-all ${
                      adjustFormData.action === 'increase'
                        ? 'bg-green-600 hover:bg-green-700'
                        : 'bg-amber-600 hover:bg-amber-700'
                    }`}
                  >
                    Confirm & Record Stat
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal 3: Item-Specific Stat History */}
      <AnimatePresence>
        {isItemHistoryModalOpen && selectedItemForHistory && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsItemHistoryModalOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative bg-white rounded-3xl shadow-2xl w-full max-w-2xl p-6 sm:p-8 max-h-[85vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center mb-6 border-b border-gray-100 pb-3">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">
                    Adjustment History: {selectedItemForHistory.name}
                  </h2>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Current Stock: <strong className="text-gray-900">{selectedItemForHistory.quantity} {selectedItemForHistory.unit}</strong>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsItemHistoryModalOpen(false)}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400 hover:text-gray-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-3">
                {logs.filter(l => l.itemId === selectedItemForHistory.id).length === 0 ? (
                  <p className="text-center py-8 text-sm text-gray-400">
                    No adjustment records logged for this item yet.
                  </p>
                ) : (
                  logs
                    .filter(l => l.itemId === selectedItemForHistory.id)
                    .map(log => (
                      <div key={log.id} className="p-3.5 bg-gray-50 rounded-2xl border border-gray-100 space-y-1.5 text-xs">
                        <div className="flex items-center justify-between">
                          <span className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-full font-bold ${
                            log.action === 'increase'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-amber-100 text-amber-800'
                          }`}>
                            {log.action === 'increase' ? (
                              <>
                                <ArrowUpRight className="h-3 w-3" />
                                <span>+{log.amount} {log.unit} Added</span>
                              </>
                            ) : (
                              <>
                                <ArrowDownRight className="h-3 w-3" />
                                <span>-{log.amount} {log.unit} Consumed</span>
                              </>
                            )}
                          </span>
                          <span className="text-gray-400 text-[11px]">{formatDate(log.date)}</span>
                        </div>

                        <div className="text-gray-600">
                          Balance: {log.previousQuantity} &rarr; <strong className="text-gray-900">{log.newQuantity} {log.unit}</strong>
                        </div>

                        {log.comment && (
                          <div className="mt-1 pt-1 border-t border-gray-200/60 text-gray-700 italic flex items-start space-x-1">
                            <MessageSquare className="h-3 w-3 text-gray-400 shrink-0 mt-0.5" />
                            <span>"{log.comment}"</span>
                          </div>
                        )}
                      </div>
                    ))
                )}
              </div>

              <div className="mt-6 pt-3 border-t border-gray-100 flex justify-end">
                <button
                  type="button"
                  onClick={() => setIsItemHistoryModalOpen(false)}
                  className="px-5 py-2 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-xl transition-all"
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
