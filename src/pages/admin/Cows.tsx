import React, { useState, useEffect } from 'react';
import { collection, addDoc, deleteDoc, doc, updateDoc, query, where, orderBy, setDoc, onSnapshot, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '../../firebase';
import { Cow, MilkLog, WeightLog, VaccinationLog } from '../../types';
import { Plus, Search, Download, Trash2, Edit2, X, Beef, Calendar, DollarSign, Activity, Droplets, Weight, TrendingUp as TrendingUpIcon, ChevronRight, RotateCcw, AlertTriangle, ShieldCheck, Thermometer, Info } from 'lucide-react';
import { formatCurrency, formatDate, exportToCSV } from '../../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { startOfWeek, startOfMonth, subDays, isAfter, format, isBefore, isSameDay } from 'date-fns';

const PRESET_BREEDS = ['Cross', 'HF', 'Native breed', 'HWL', 'RCC'];

export default function AdminCows() {
  const [cows, setCows] = useState<Cow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [isVacModalOpen, setIsVacModalOpen] = useState(false);
  const [selectedCow, setSelectedCow] = useState<Cow | null>(null);
  const [editingCow, setEditingCow] = useState<Cow | null>(null);
  const [deletedCows, setDeletedCows] = useState<Cow[]>([]);
  const [isBinOpen, setIsBinOpen] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [cowToDelete, setCowToDelete] = useState<string | null>(null);
  const [cowToPermanentDelete, setCowToPermanentDelete] = useState<string | null>(null);
  const [showPermanentConfirmModal, setShowPermanentConfirmModal] = useState(false);
  const [milkLogs, setMilkLogs] = useState<MilkLog[]>([]);
  const [weightLogs, setWeightLogs] = useState<WeightLog[]>([]);
  const [vaccinationLogs, setVaccinationLogs] = useState<VaccinationLog[]>([]);
  const [logFilter, setLogFilter] = useState<'weekly' | 'monthly'>('weekly');
  const [isCustomBreed, setIsCustomBreed] = useState(false);
  const [customBreedValue, setCustomBreedValue] = useState('');
  
  const [deleteReason, setDeleteReason] = useState<{reason: 'Sold' | 'Died' | 'Other', description: string}>({
    reason: 'Sold',
    description: ''
  });

  const [formData, setFormData] = useState<Cow>({
    name: '',
    category: 'Dairy',
    father: '',
    mother: '',
    age: '',
    teethCount: 0,
    color: '',
    purchaseStatus: 'Purchased',
    date: new Date().toISOString().split('T')[0],
    purchasePrice: 0,
    initialWeight: 0,
    healthStatus: 'Fit',
    healthDescription: '',
    dailyFoodConsumption: 0,
    milkingStatus: 'Milking Period',
    dailyMilkSupply: 0,
    pregnancy: 'Without Baby',
    lactationCount: 0,
    breed: 'Cross',
    gender: 'Female'
  });

  const resetForm = () => {
    setIsCustomBreed(false);
    setCustomBreedValue('');
    setFormData({
      name: '',
      father: '',
      mother: '',
      age: '',
      teethCount: 0,
      color: '',
      category: 'Dairy',
      breed: 'Cross',
      gender: 'Female',
      purchaseStatus: 'Purchased',
      date: new Date().toISOString().split('T')[0],
      purchasePrice: 0,
      initialWeight: 0,
      healthStatus: 'Fit',
      healthDescription: '',
      healthFileUrl: '',
      dailyFoodConsumption: 0,
      milkingStatus: 'Milking Period',
      dailyMilkSupply: 0,
      pregnancy: 'Without Baby',
      lactationCount: 0,
      vaccination: 'Up to date'
    });
  };

  const [logData, setLogData] = useState({
    amount: 0,
    weight: 0,
    unit: 'L' as 'L' | 'Kg',
    date: new Date().toISOString().split('T')[0]
  });

  const [vacData, setVacData] = useState({
    vaccineName: '',
    description: '',
    date: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    // Real-time listener for active cows
    const unsubscribeCows = onSnapshot(collection(db, 'cows'), (snapshot) => {
      const cowsData = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Cow));
      // Deduplicate locally just in case
      setCows(Array.from(new Map(cowsData.map(cow => [cow.id, cow])).values()));
      setLoading(false);
    }, (error) => {
      console.error("Cows listener error:", error);
      setLoading(false);
    });

    // Real-time listener for recycle bin
    const unsubscribeBin = onSnapshot(collection(db, 'deletedCows'), (snapshot) => {
      const binData = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Cow));
      setDeletedCows(binData);
    }, (error) => {
      console.error("Bin listener error:", error);
    });

    return () => {
      unsubscribeCows();
      unsubscribeBin();
    };
  }, []);

  // Removed manual fetchCows as onSnapshot handles everything real-time

  const fetchLogs = async (cowId: string) => {
    const milkQuery = query(collection(db, 'milkLogs'), where('cowId', '==', cowId), orderBy('date', 'asc'));
    const weightQuery = query(collection(db, 'weightLogs'), where('cowId', '==', cowId), orderBy('date', 'asc'));
    const vacQuery = query(collection(db, 'vaccinationLogs'), where('cowId', '==', cowId), orderBy('date', 'asc'));
    
    const [milkSnap, weightSnap, vacSnap] = await Promise.all([getDocs(milkQuery), getDocs(weightQuery), getDocs(vacQuery)]);
    
    setMilkLogs(milkSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as MilkLog)));
    setWeightLogs(weightSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as WeightLog)));
    setVaccinationLogs(vacSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as VaccinationLog)));
  };

  const generateTagId = (data: Cow, sequence: number) => {
    const farmCode = "WF"; // Keyword for the farm (We Farm)
    // Section-wise digits:
    // Category: 1 (Dairy), 2 (Fattening), 3 (Heifer)
    const catDigit = data.category === 'Dairy' ? '1' : data.category === 'Fattening' ? '2' : '3';
    // Gender: 1 (Male), 2 (Female)
    const genderDigit = (data.category === 'Dairy' || data.gender === 'Female') ? '2' : '1';
    // Acquisition: 1 (Purchased), 2 (Self Breed)
    const acqDigit = data.purchaseStatus === 'Purchased' ? '1' : '2';
    
    const seqString = sequence.toString().padStart(3, '0');
    return `${farmCode}-${catDigit}${genderDigit}${acqDigit}-${seqString}`;
  };

  const handleBulkMigrateIds = async () => {
    if (!window.confirm("Are you sure you want to update all existing Unique IDs to the new WF format? This will also update the sequence numbers based on the current list order.")) return;
    
    try {
      setLoading(true);
      // Combine active and deleted cows to determine total population
      // Sort by date to maintain chronological sequence if possible
      const allActiveSorted = [...cows].sort((a, b) => (a.date || '').localeCompare(b.date || ''));
      const allBinSorted = [...deletedCows].sort((a, b) => (a.date || '').localeCompare(b.date || ''));
      
      let counter = 1;

      // Update active cows
      for (const cow of allActiveSorted) {
        const newTagId = generateTagId(cow, counter);
        // Only update if it's different or doesn't exist
        if (cow.tagId !== newTagId) {
          await updateDoc(doc(db, 'cows', cow.id!), { tagId: newTagId });
        }
        counter++;
      }

      // Update deleted cows
      for (const cow of allBinSorted) {
        const newTagId = generateTagId(cow, counter);
        if (cow.tagId !== newTagId) {
          await updateDoc(doc(db, 'deletedCows', cow.id!), { tagId: newTagId });
        }
        counter++;
      }

      alert("Successfully updated all Unique IDs to WF format.");
    } catch (err) {
      console.error(err);
      alert("Error during ID migration.");
    } finally {
      setLoading(false);
    }
  };

  const getNextSequence = () => {
    const allCows = [...cows, ...deletedCows];
    if (allCows.length === 0) return 1;
    
    const sequences = allCows.map(c => {
      if (!c.tagId) return 0;
      const parts = c.tagId.split('-');
      if (parts.length < 3) return 0;
      const seq = parseInt(parts[2]);
      return isNaN(seq) ? 0 : seq;
    });
    return Math.max(0, ...sequences) + 1;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (new Date(formData.date) > new Date()) {
      alert('Date cannot be in the future');
      return;
    }
    try {
      const dataToSave: any = { ...formData };

      if (isCustomBreed) {
        dataToSave.breed = customBreedValue;
      }
      
      // Clean up fields based on category
      if (dataToSave.category !== 'Dairy') {
        delete dataToSave.milkingStatus;
        delete dataToSave.dailyMilkSupply;
        delete dataToSave.pregnancy;
        delete dataToSave.lactationCount;
      }
      
      if (dataToSave.category === 'Dairy') {
        delete dataToSave.breed;
        delete dataToSave.gender;
      } else if (dataToSave.category === 'Fattening') {
        delete dataToSave.gender;
      }

      if (dataToSave.purchaseStatus === 'Self Breed') {
        delete dataToSave.purchasePrice;
      }

      if (dataToSave.healthStatus === 'Fit') {
        delete dataToSave.healthDescription;
        delete dataToSave.healthFileUrl;
      }

      if (editingCow) {
        // If category changed, regenerate Tag ID with existing sequence
        if (editingCow.category !== dataToSave.category) {
          let sequence = 0;
          if (editingCow.tagId) {
            const parts = editingCow.tagId.split('-');
            if (parts.length >= 3) {
              sequence = parseInt(parts[2]);
            }
          }
          if (!sequence || isNaN(sequence)) {
            sequence = getNextSequence();
          }
          dataToSave.tagId = generateTagId(dataToSave, sequence);
        }
        await updateDoc(doc(db, 'cows', editingCow.id!), dataToSave);
      } else {
        // Generate structured Tag ID for new cows
        const sequence = getNextSequence();
        dataToSave.tagId = generateTagId(dataToSave, sequence);
        await addDoc(collection(db, 'cows'), dataToSave);
      }
      setIsModalOpen(false);
      setEditingCow(null);
      resetForm();
    } catch (err) {
      console.error(err);
      alert('Error saving cow data');
    }
  };

  const handleToggleMilkingStatus = async (cow: Cow) => {
    if (!cow.id) return;
    const newStatus = cow.milkingStatus === 'Milking Period' ? 'Dry Period' : 'Milking Period';
    try {
      await updateDoc(doc(db, 'cows', cow.id), { milkingStatus: newStatus });
    } catch (err) {
      console.error(err);
      alert('Error updating milking status');
    }
  };

  const handleLogSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCow) return;
    if (new Date(logData.date) > new Date()) {
      alert('Date cannot be in the future');
      return;
    }

    try {
      if (selectedCow.category === 'Dairy' || selectedCow.category === 'Heifer') {
        const log: MilkLog = {
          cowId: selectedCow.id!,
          cowName: selectedCow.name,
          date: logData.date,
          amount: logData.amount,
          unit: logData.unit,
          type: selectedCow.category === 'Dairy' ? 'Milking' : 'Consumption'
        };
        await addDoc(collection(db, 'milkLogs'), log);
        
        if (selectedCow.category === 'Dairy') {
          // Update current daily production in cow record
          await updateDoc(doc(db, 'cows', selectedCow.id!), { dailyMilkSupply: logData.amount });
        }
      } else if (selectedCow.category === 'Fattening') {
        const log: WeightLog = {
          cowId: selectedCow.id!,
          cowName: selectedCow.name,
          date: logData.date,
          weight: logData.weight
        };
        await addDoc(collection(db, 'weightLogs'), log);
        // Update current weight in cow record
        await updateDoc(doc(db, 'cows', selectedCow.id!), { initialWeight: logData.weight });
      }
      
      setLogData({ ...logData, amount: 0, weight: 0 });
      fetchLogs(selectedCow.id!);
      alert('Daily record saved successfully');
      setIsLogModalOpen(false);
      setSelectedCow(null);
    } catch (err) {
      console.error(err);
      alert('Error saving log');
    }
  };

  const handleVacSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCow) return;
    if (new Date(vacData.date) > new Date()) {
      alert('Date cannot be in the future');
      return;
    }

    try {
      const log: VaccinationLog = {
        cowId: selectedCow.id!,
        cowName: selectedCow.name,
        date: vacData.date,
        vaccineName: vacData.vaccineName,
        description: vacData.description
      };
      await addDoc(collection(db, 'vaccinationLogs'), log);
      
      // Update vaccination status string in cow record for quick view
      await updateDoc(doc(db, 'cows', selectedCow.id!), { vaccination: vacData.vaccineName });

      setVacData({ vaccineName: '', description: '', date: new Date().toISOString().split('T')[0] });
      fetchLogs(selectedCow.id!);
      alert('Vaccination record saved successfully');
      setIsVacModalOpen(false);
      setSelectedCow(null);
    } catch (err) {
      console.error(err);
      alert('Error saving vaccination');
    }
  };

  const handleDelete = async (id: string) => {
    setCowToDelete(id);
    setShowConfirmModal(true);
  };

  const confirmDelete = async () => {
    if (!cowToDelete) return;
    if (deleteReason.reason === 'Died' && !deleteReason.description) {
      alert('Please provide a description for the cause of death.');
      return;
    }
    
    try {
      const cowData = cows.find(c => c.id === cowToDelete);
      
      if (cowData) {
        const { id, ...dataToBin } = cowData;
        // Move to deletedCows using the SAME ID for consistency
        await setDoc(doc(db, 'deletedCows', id!), {
          ...dataToBin,
          deleteReason: deleteReason.reason,
          deleteDescription: deleteReason.description,
          deletedAt: new Date().toISOString()
        });
        // Remove from cows
        await deleteDoc(doc(db, 'cows', id!));
      }
      setShowConfirmModal(false);
      setCowToDelete(null);
      setDeleteReason({ reason: 'Sold', description: '' });
    } catch (err) {
      console.error(err);
      alert('Error moving record to bin');
    }
  };

  const handleRestore = async (cow: Cow) => {
    try {
      const { id, deletedAt, ...rest } = cow as any;
      // Add back to cows - use the original ID or same ID
      await setDoc(doc(db, 'cows', id), rest);
      // Remove from bin
      await deleteDoc(doc(db, 'deletedCows', id));
    } catch (err) {
      console.error(err);
      alert('Error restoring record');
    }
  };

  const handlePermanentDelete = (id: string) => {
    setCowToPermanentDelete(id);
    setShowPermanentConfirmModal(true);
  };

  const confirmPermanentDelete = async () => {
    if (!cowToPermanentDelete) {
      console.warn('No cow ID selected for permanent deletion');
      return;
    }

    const deletedId = cowToPermanentDelete;
    console.log(`Starting permanent delete for ID: ${deletedId}`);
    
    try {
      setLoading(true);
      const docRef = doc(db, 'deletedCows', deletedId);
      await deleteDoc(docRef);
      console.log(`Successfully called deleteDoc for: ${deletedId}`);
      
      setShowPermanentConfirmModal(false);
      setCowToPermanentDelete(null);
    } catch (err: any) {
      console.error('CRITICAL: Permanent Delete Error:', err);
      alert(`Critical Error during permanent delete: ${err.message || 'Check console for details'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (cow: Cow) => {
    setEditingCow(cow);
    const isCustom = cow.breed ? !PRESET_BREEDS.includes(cow.breed) : false;
    setIsCustomBreed(isCustom);
    setCustomBreedValue(isCustom ? cow.breed! : '');
    
    setFormData({
      ...formData, // Start with defaults
      ...cow // Overwrite with existing values
    });
    setIsModalOpen(true);
  };

  const handleViewLogs = (cow: Cow) => {
    setSelectedCow(cow);
    fetchLogs(cow.id!);
  };

  const filterLogs = (logs: any[]) => {
    const now = new Date();
    const today = new Date();
    today.setHours(23, 59, 59, 999); // Include all of today
    
    const startDate = logFilter === 'weekly' ? subDays(now, 7) : subDays(now, 30);
    return logs.filter(log => {
      const logDate = new Date(log.date);
      return isAfter(logDate, startDate) && logDate <= today;
    });
  };

  const filteredCows = cows.filter(cow => 
    cow.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cow.vaccination.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Livestock Management</h1>
          <p className="text-gray-500 text-sm">Manage and track your cattle database.</p>
        </div>
        <div className="flex items-center space-x-3">
          <button 
            onClick={() => setIsBinOpen(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors shadow-sm"
          >
            <RotateCcw className="h-4 w-4" />
            <span>Recycle Bin ({deletedCows.length})</span>
          </button>
          <button 
            onClick={() => exportToCSV(cows, 'livestock_data.csv')}
            className="flex items-center space-x-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors shadow-sm"
          >
            <Download className="h-4 w-4" />
            <span>Export CSV</span>
          </button>
          <button 
            onClick={handleBulkMigrateIds}
            title="Update all existing IDs to the new WF format"
            className="flex items-center space-x-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium text-orange-600 hover:bg-orange-50 transition-colors shadow-sm"
          >
            <RotateCcw className="h-4 w-4" />
            <span>Migrate IDs</span>
          </button>
          <button 
            onClick={() => {
              setEditingCow(null);
              resetForm();
              setIsModalOpen(true);
            }}
            className="flex items-center space-x-2 px-4 py-2 bg-green-600 rounded-xl text-sm font-medium text-white hover:bg-green-700 transition-colors shadow-sm"
          >
            <Plus className="h-4 w-4" />
            <span>Add New Cow</span>
          </button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name or vaccination status..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-green-500 outline-none transition-all"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">ID</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Name</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Category</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Status/Breed</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto"></div>
                  </td>
                </tr>
              ) : filteredCows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                    No records found.
                  </td>
                </tr>
              ) : (
                filteredCows.map((cow) => (
                  <tr key={cow.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 font-mono text-[10px] text-gray-400">
                      {cow.tagId || `${cow.id?.substring(0, 8)}...`}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-green-50 rounded-lg flex items-center justify-center">
                          <Beef className="h-4 w-4 text-green-600" />
                        </div>
                        <span className="font-bold text-gray-900">{cow.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${
                        cow.category === 'Dairy' ? 'bg-blue-50 text-blue-600' : 
                        cow.category === 'Fattening' ? 'bg-amber-50 text-amber-600' :
                        'bg-purple-50 text-purple-600'
                      }`}>
                        {cow.category}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {cow.category === 'Dairy' ? (
                        <div className="flex items-center space-x-3">
                          <div className="flex flex-col">
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                              cow.milkingStatus === 'Milking Period' ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-500'
                            }`}>
                              {cow.milkingStatus}
                            </span>
                            <span className="text-[10px] text-gray-400 mt-1">{cow.dailyMilkSupply} L Supply</span>
                          </div>
                          <button 
                            onClick={() => handleToggleMilkingStatus(cow)}
                            className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 transition-colors"
                            title="Toggle Status"
                          >
                            <RotateCcw className="h-3 w-3" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-gray-900">{cow.breed || 'N/A'}</span>
                          <span className="text-[10px] text-gray-400">{cow.initialWeight} Kg Initial</span>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <button 
                          onClick={() => {
                            setSelectedCow(cow);
                            setLogData(prev => ({ ...prev, unit: cow.category === 'Heifer' ? 'Kg' : 'L' }));
                            setIsLogModalOpen(true);
                          }}
                          disabled={cow.category === 'Dairy' && cow.milkingStatus === 'Dry Period'}
                          className={`p-2 rounded-lg transition-all ${
                            cow.category === 'Dairy' && cow.milkingStatus === 'Dry Period'
                              ? 'text-gray-200 cursor-not-allowed'
                              : 'text-blue-500 hover:bg-blue-50'
                          }`}
                          title="Daily Stat Input"
                        >
                          <TrendingUpIcon className="h-4 w-4" />
                        </button>
                        <button 
                          onClick={() => {
                            setSelectedCow(cow);
                            setIsVacModalOpen(true);
                          }}
                          className="p-2 text-indigo-500 hover:bg-indigo-50 rounded-lg transition-all"
                          title="Vaccination Record"
                        >
                          <ShieldCheck className="h-4 w-4" />
                        </button>
                        <button 
                          onClick={() => handleViewLogs(cow)}
                          className="p-2 text-green-500 hover:bg-green-50 rounded-lg transition-all"
                          title="View Reports & History"
                        >
                          <Activity className="h-4 w-4" />
                        </button>
                        <button 
                          onClick={() => handleEdit(cow)}
                          className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button 
                          onClick={() => handleDelete(cow.id!)}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
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

      {/* Add/Edit Modal */}
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
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white rounded-3xl shadow-2xl w-full max-w-4xl p-8 overflow-hidden max-h-[90vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center mb-8 sticky top-0 bg-white z-10 pb-4 border-b border-gray-100">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">
                    {editingCow ? 'Edit Cow Record' : 'Add New Cow'}
                  </h2>
                  {editingCow && (
                    <p className="text-xs font-mono text-gray-400 mt-1">ID: {editingCow.tagId || editingCow.id}</p>
                  )}
                </div>
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X className="h-6 w-6 text-gray-400" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-8">
                {/* Section 1: Basic Info */}
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-green-600 uppercase tracking-widest border-l-4 border-green-500 pl-3">Basic Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Cow Name</label>
                      <input
                        type="text"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                        className="w-full bg-gray-50 border border-gray-100 rounded-xl py-3 px-4 outline-none focus:ring-2 focus:ring-green-500 transition-all font-bold"
                        placeholder="e.g. Bessie"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Category</label>
                      <select
                        value={formData.category}
                        onChange={(e) => setFormData({...formData, category: e.target.value as any})}
                        className="w-full bg-gray-50 border border-gray-100 rounded-xl py-3 px-4 outline-none focus:ring-2 focus:ring-green-500 transition-all transition-all"
                      >
                        <option value="Dairy">Dairy</option>
                        <option value="Fattening">Fattening</option>
                        <option value="Heifer">Heifer</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Color</label>
                      <input
                        type="text"
                        value={formData.color}
                        onChange={(e) => setFormData({...formData, color: e.target.value})}
                        className="w-full bg-gray-50 border border-gray-100 rounded-xl py-3 px-4 outline-none focus:ring-2 focus:ring-green-500 transition-all font-bold"
                        placeholder="e.g. Black & White"
                      />
                    </div>
                  </div>
                </div>

                {/* Section 2: Lineage & Age */}
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-blue-600 uppercase tracking-widest border-l-4 border-blue-500 pl-3">Lineage & Age</h3>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Father</label>
                      <input
                        type="text"
                        value={formData.father}
                        onChange={(e) => setFormData({...formData, father: e.target.value})}
                        className="w-full bg-gray-50 border border-gray-100 rounded-xl py-3 px-4 outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Mother</label>
                      <input
                        type="text"
                        value={formData.mother}
                        onChange={(e) => setFormData({...formData, mother: e.target.value})}
                        className="w-full bg-gray-50 border border-gray-100 rounded-xl py-3 px-4 outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Age</label>
                      <input
                        type="text"
                        value={formData.age}
                        onChange={(e) => setFormData({...formData, age: e.target.value})}
                        className="w-full bg-gray-50 border border-gray-100 rounded-xl py-3 px-4 outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                        placeholder="e.g. 2 Years"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Teeth Count</label>
                      <input
                        type="number"
                        value={formData.teethCount}
                        onChange={(e) => setFormData({...formData, teethCount: parseInt(e.target.value) || 0})}
                        className="w-full bg-gray-50 border border-gray-100 rounded-xl py-3 px-4 outline-none focus:ring-2 focus:ring-blue-500 transition-all text-center"
                      />
                    </div>
                  </div>
                </div>

                {/* Section 3: Purchase/Birth Info */}
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-purple-600 uppercase tracking-widest border-l-4 border-purple-500 pl-3">Acquisition Details</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Status</label>
                      <select
                        value={formData.purchaseStatus}
                        onChange={(e) => setFormData({...formData, purchaseStatus: e.target.value as any})}
                        className="w-full bg-gray-50 border border-gray-100 rounded-xl py-3 px-4 outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                      >
                        <option value="Purchased">Purchased</option>
                        <option value="Self Breed">Self Breed</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                        {formData.purchaseStatus === 'Purchased' ? 'Purchase Date' : 'Birth Date'}
                      </label>
                      <input
                        type="date"
                        required
                        max={new Date().toISOString().split('T')[0]}
                        value={formData.date}
                        onChange={(e) => setFormData({...formData, date: e.target.value})}
                        className="w-full bg-gray-50 border border-gray-100 rounded-xl py-3 px-4 outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                      />
                    </div>
                    {formData.purchaseStatus === 'Purchased' && (
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Purchase Price (৳)</label>
                        <input
                          type="number"
                          value={formData.purchasePrice}
                          onChange={(e) => setFormData({...formData, purchasePrice: parseFloat(e.target.value) || 0})}
                          className="w-full bg-gray-50 border border-gray-100 rounded-xl py-3 px-4 outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                        />
                      </div>
                    )}
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                        {formData.purchaseStatus === 'Purchased' ? 'Purchase Weight (kg)' : 'Birth Weight (kg)'}
                      </label>
                      <input
                        type="number"
                        value={formData.initialWeight}
                        onChange={(e) => setFormData({...formData, initialWeight: parseFloat(e.target.value) || 0})}
                        className="w-full bg-gray-50 border border-gray-100 rounded-xl py-3 px-4 outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                      />
                    </div>
                  </div>
                </div>

                {/* Section 4: Health & Maintenance */}
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-red-600 uppercase tracking-widest border-l-4 border-red-500 pl-3">Health & Maintenance</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Health Status</label>
                      <div className="flex space-x-4">
                        {['Fit', 'Unfit'].map((status) => (
                          <button
                            key={status}
                            type="button"
                            onClick={() => setFormData({...formData, healthStatus: status as any})}
                            className={`flex-1 py-3 px-4 rounded-xl font-bold transition-all border ${
                              formData.healthStatus === status 
                                ? status === 'Fit' ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'
                                : 'bg-gray-50 border-gray-100 text-gray-400 hover:bg-gray-100'
                            }`}
                          >
                            {status}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Daily Food (kg)</label>
                      <input
                        type="number"
                        required
                        value={formData.dailyFoodConsumption}
                        onChange={(e) => setFormData({...formData, dailyFoodConsumption: parseFloat(e.target.value) || 0})}
                        className="w-full bg-gray-50 border border-gray-100 rounded-xl py-3 px-4 outline-none focus:ring-2 focus:ring-red-500 transition-all"
                      />
                    </div>
                    {formData.healthStatus === 'Unfit' && (
                      <div className="col-span-full space-y-4">
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Condition Description</label>
                          <textarea
                            value={formData.healthDescription}
                            onChange={(e) => setFormData({...formData, healthDescription: e.target.value})}
                            className="w-full bg-gray-50 border border-gray-100 rounded-xl py-3 px-4 outline-none focus:ring-2 focus:ring-red-500 transition-all h-24 resize-none"
                            placeholder="Describe the health issue..."
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Report / Attachment URL</label>
                          <div className="relative">
                            <input
                              type="text"
                              value={formData.healthFileUrl || ''}
                              onChange={(e) => setFormData({...formData, healthFileUrl: e.target.value})}
                              className="w-full bg-gray-50 border border-gray-100 rounded-xl py-3 px-4 outline-none focus:ring-2 focus:ring-red-500 transition-all font-mono text-xs"
                              placeholder="Link to medical record or file..."
                            />
                            <Download className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-300" />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Section 5: Category Specifics */}
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-orange-600 uppercase tracking-widest border-l-4 border-orange-500 pl-3">
                    {formData.category} Specific Details
                  </h3>
                  
                  {formData.category === 'Dairy' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Milking Status</label>
                        <select
                          value={formData.milkingStatus}
                          onChange={(e) => setFormData({...formData, milkingStatus: e.target.value as any})}
                          className="w-full bg-gray-50 border border-gray-100 rounded-xl py-3 px-4 outline-none focus:ring-2 focus:ring-orange-500 transition-all font-bold"
                        >
                          <option value="Milking Period">Milking Period</option>
                          <option value="Dry Period">Dry Period</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Daily Milk Supply (L)</label>
                        <input
                          type="number"
                          value={formData.dailyMilkSupply}
                          onChange={(e) => setFormData({...formData, dailyMilkSupply: parseFloat(e.target.value) || 0})}
                          className="w-full bg-gray-50 border border-gray-100 rounded-xl py-3 px-4 outline-none focus:ring-2 focus:ring-orange-500 transition-all"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Pregnancy Status</label>
                        <select
                          value={formData.pregnancy}
                          onChange={(e) => setFormData({...formData, pregnancy: e.target.value as any})}
                          className="w-full bg-gray-50 border border-gray-100 rounded-xl py-3 px-4 outline-none focus:ring-2 focus:ring-orange-500 transition-all"
                        >
                          <option value="Pregnant">Pregnant</option>
                          <option value="With Baby">With Baby</option>
                          <option value="Without Baby">Without Baby</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Lactation Count</label>
                        <input
                          type="number"
                          value={formData.lactationCount}
                          onChange={(e) => setFormData({...formData, lactationCount: parseInt(e.target.value) || 0})}
                          className="w-full bg-gray-50 border border-gray-100 rounded-xl py-3 px-4 outline-none focus:ring-2 focus:ring-orange-500 transition-all text-center"
                        />
                      </div>
                    </div>
                  )}

                  {formData.category === 'Fattening' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Breed</label>
                        <select
                          value={isCustomBreed ? 'Custom' : formData.breed}
                          onChange={(e) => {
                            if (e.target.value === 'Custom') {
                              setIsCustomBreed(true);
                            } else {
                              setIsCustomBreed(false);
                              setFormData({...formData, breed: e.target.value as any});
                            }
                          }}
                          className="w-full bg-gray-50 border border-gray-100 rounded-xl py-3 px-4 outline-none focus:ring-2 focus:ring-orange-500 transition-all font-bold"
                        >
                          {PRESET_BREEDS.map(b => (
                            <option key={b} value={b}>{b}</option>
                          ))}
                          <option value="Custom">Custom</option>
                        </select>
                      </div>
                      {isCustomBreed && (
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Custom Breed Name</label>
                          <input
                            type="text"
                            required
                            value={customBreedValue}
                            onChange={(e) => setCustomBreedValue(e.target.value)}
                            className="w-full bg-gray-50 border border-gray-100 rounded-xl py-3 px-4 outline-none focus:ring-2 focus:ring-orange-500 transition-all font-bold"
                            placeholder="Type breed name..."
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {formData.category === 'Heifer' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Gender</label>
                        <select
                          value={formData.gender}
                          onChange={(e) => setFormData({...formData, gender: e.target.value as any})}
                          className="w-full bg-gray-50 border border-gray-100 rounded-xl py-3 px-4 outline-none focus:ring-2 focus:ring-orange-500 transition-all font-bold"
                        >
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Breed</label>
                        <select
                          value={isCustomBreed ? 'Custom' : formData.breed}
                          onChange={(e) => {
                            if (e.target.value === 'Custom') {
                              setIsCustomBreed(true);
                            } else {
                              setIsCustomBreed(false);
                              setFormData({...formData, breed: e.target.value as any});
                            }
                          }}
                          className="w-full bg-gray-50 border border-gray-100 rounded-xl py-3 px-4 outline-none focus:ring-2 focus:ring-orange-500 transition-all font-bold"
                        >
                          {PRESET_BREEDS.map(b => (
                            <option key={b} value={b}>{b}</option>
                          ))}
                          <option value="Custom">Custom</option>
                        </select>
                      </div>
                      {isCustomBreed && (
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Custom Breed Name</label>
                          <input
                            type="text"
                            required
                            value={customBreedValue}
                            onChange={(e) => setCustomBreedValue(e.target.value)}
                            className="w-full bg-gray-50 border border-gray-100 rounded-xl py-3 px-4 outline-none focus:ring-2 focus:ring-orange-500 transition-all font-bold"
                            placeholder="Type breed name..."
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex space-x-4 pt-4 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 py-4 px-6 border border-gray-100 text-gray-400 font-bold rounded-2xl hover:bg-gray-50 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-4 px-6 bg-green-600 hover:bg-green-700 text-white font-bold rounded-2xl transition-all shadow-lg shadow-green-200"
                  >
                    {editingCow ? 'Update Record' : 'Save Cow Record'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Log Details/Entry Modal (Daily Stat) */}
      <AnimatePresence>
        {isLogModalOpen && selectedCow && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsLogModalOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white rounded-3xl shadow-2xl w-full max-w-lg p-8 transform-gpu"
            >
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">
                    {selectedCow.category === 'Dairy' ? 'Daily Milking Stat' : 
                     selectedCow.category === 'Fattening' ? 'Daily Weight Stat' : 
                     'Daily Milk Consumption'}
                  </h2>
                  <p className="text-sm text-gray-500">{selectedCow.name} - {selectedCow.category}</p>
                </div>
                <button 
                  onClick={() => {
                    setIsLogModalOpen(false);
                    setSelectedCow(null);
                  }}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X className="h-5 w-5 text-gray-400" />
                </button>
              </div>

              <form onSubmit={handleLogSubmit} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase">Date</label>
                  <input
                    type="date"
                    required
                    max={new Date().toISOString().split('T')[0]}
                    value={logData.date}
                    onChange={(e) => setLogData({ ...logData, date: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-100 rounded-xl py-3 px-4 outline-none"
                  />
                </div>

                {selectedCow.category === 'Fattening' ? (
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase">Current Live Weight (Kg)</label>
                    <input
                      type="number"
                      required
                      min="0"
                      step="0.1"
                      value={logData.weight}
                      onChange={(e) => setLogData({ ...logData, weight: parseFloat(e.target.value) || 0 })}
                      className="w-full bg-gray-50 border border-gray-100 rounded-xl py-4 px-4 outline-none text-2xl font-bold text-green-600"
                    />
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-400 uppercase">Amount</label>
                      <input
                        type="number"
                        required
                        min="0"
                        step="0.1"
                        value={logData.amount}
                        onChange={(e) => setLogData({ ...logData, amount: parseFloat(e.target.value) || 0 })}
                        className="w-full bg-gray-50 border border-gray-100 rounded-xl py-4 px-4 outline-none text-2xl font-bold text-blue-600"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-400 uppercase">Unit</label>
                      <div className="flex space-x-2">
                        {['L', 'Kg'].map((u) => (
                          <button
                            key={u}
                            type="button"
                            onClick={() => setLogData({ ...logData, unit: u as any })}
                            className={`flex-1 py-3 px-4 rounded-xl font-bold transition-all border ${
                              logData.unit === u 
                                ? 'bg-blue-50 border-blue-200 text-blue-600'
                                : 'bg-gray-50 border-gray-100 text-gray-400'
                            }`}
                          >
                            {u === 'L' ? 'Litres' : 'Kilograms'}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setIsLogModalOpen(false);
                      setSelectedCow(null);
                    }}
                    className="flex-1 py-4 text-gray-400 font-bold hover:bg-gray-50 rounded-2xl transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-4 bg-green-600 text-white font-bold rounded-2xl shadow-lg shadow-green-100 hover:bg-green-700 transition-all"
                  >
                    Save Record
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Vaccination Modal */}
      <AnimatePresence>
        {isVacModalOpen && selectedCow && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsVacModalOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white rounded-3xl shadow-2xl w-full max-w-lg p-8 transform-gpu"
            >
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Vaccination Record</h2>
                  <p className="text-sm text-gray-500">Update health logs for {selectedCow.name}</p>
                </div>
                <button 
                  onClick={() => {
                    setIsVacModalOpen(false);
                    setSelectedCow(null);
                  }}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X className="h-5 w-5 text-gray-400" />
                </button>
              </div>

              <form onSubmit={handleVacSubmit} className="space-y-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase">Vaccination Date</label>
                    <input
                      type="date"
                      required
                      max={new Date().toISOString().split('T')[0]}
                      value={vacData.date}
                      onChange={(e) => setVacData({ ...vacData, date: e.target.value })}
                      className="w-full bg-gray-50 border border-gray-100 rounded-xl py-3 px-4 outline-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase">Vaccine Name</label>
                    <input
                      type="text"
                      required
                      value={vacData.vaccineName}
                      onChange={(e) => setVacData({ ...vacData, vaccineName: e.target.value })}
                      placeholder="e.g. FMD, Anthrax"
                      className="w-full bg-gray-50 border border-gray-100 rounded-xl py-3 px-4 outline-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase">Description / Notes</label>
                    <textarea
                      value={vacData.description}
                      onChange={(e) => setVacData({ ...vacData, description: e.target.value })}
                      placeholder="Dosage, next due date, etc."
                      className="w-full bg-gray-50 border border-gray-100 rounded-xl py-3 px-4 outline-none h-24 resize-none"
                    />
                  </div>
                </div>

                <div className="flex space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setIsVacModalOpen(false);
                      setSelectedCow(null);
                    }}
                    className="flex-1 py-4 text-gray-400 font-bold hover:bg-gray-50 rounded-2xl transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-4 bg-indigo-600 text-white font-bold rounded-2xl shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all"
                  >
                    Save Vaccination
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* History & Analytics Modal */}
      <AnimatePresence>
        {isLogModalOpen === false && selectedCow && isVacModalOpen === false && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedCow(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white rounded-3xl shadow-2xl w-full max-w-5xl p-8 overflow-y-auto max-h-[90vh] transform-gpu"
            >
              <div className="flex justify-between items-center mb-8 sticky top-0 bg-white z-10 pb-4 border-b">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">{selectedCow.name}'s Performance Report</h2>
                  <p className="text-sm text-gray-500">Comprehensive analytics and historical records.</p>
                </div>
                <div className="flex items-center space-x-4">
                  <select 
                    value={logFilter}
                    onChange={(e) => setLogFilter(e.target.value as any)}
                    className="bg-gray-50 border border-gray-100 rounded-xl py-2 px-4 outline-none text-sm font-bold"
                  >
                    <option value="weekly">Weekly View</option>
                    <option value="monthly">Monthly View</option>
                  </select>
                  <button 
                    onClick={() => setSelectedCow(null)}
                    className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                  >
                    <X className="h-6 w-6 text-gray-400" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Stats Sidebar */}
                <div className="space-y-6">
                  <div className="bg-green-600 rounded-2xl p-6 text-white shadow-xl shadow-green-100">
                    <TrendingUpIcon className="h-6 w-6 mb-4 opacity-70" />
                    <h4 className="text-xs font-bold uppercase opacity-80 mb-1">Total {selectedCow.category === 'Dairy' ? 'Milking' : selectedCow.category === 'Heifer' ? 'Consumption' : 'Current Weight'}</h4>
                    <div className="text-3xl font-bold flex items-baseline">
                      {selectedCow.category === 'Fattening' 
                        ? (weightLogs.length > 0 ? weightLogs[weightLogs.length - 1].weight : selectedCow.initialWeight)
                        : (milkLogs.length > 0 ? milkLogs.reduce((acc, log) => acc + log.amount, 0).toFixed(1) : '0.0')
                      }
                      <span className="text-sm font-normal ml-1 opacity-80">
                        {selectedCow.category === 'Fattening' ? 'Kg' : 'Total Units'}
                      </span>
                    </div>
                  </div>

                  <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">Latest Vaccinations</h3>
                    <div className="space-y-4">
                      {vaccinationLogs.length === 0 ? (
                        <p className="text-xs text-gray-400 italic">No vaccination history</p>
                      ) : (
                        vaccinationLogs.slice(-3).reverse().map((vac, i) => (
                          <div key={i} className="flex items-start space-x-3">
                            <div className="mt-1.5 w-2 h-2 rounded-full bg-indigo-500 shrink-0" />
                            <div>
                              <p className="text-sm font-bold text-gray-900">{vac.vaccineName}</p>
                              <p className="text-[10px] text-gray-400">{formatDate(vac.date)}</p>
                              {vac.description && <p className="text-[10px] text-gray-500 mt-1">{vac.description}</p>}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>

                {/* Main Content (Chart & List) */}
                <div className="lg:col-span-2 space-y-8">
                  <div className="bg-gray-50 rounded-2xl p-6 h-64 border border-gray-100">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={filterLogs(selectedCow.category === 'Fattening' ? weightLogs : milkLogs)}>
                        <defs>
                          <linearGradient id="colorLogTrend" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={selectedCow.category === 'Fattening' ? '#10b981' : '#3b82f6'} stopOpacity={0.1}/>
                            <stop offset="95%" stopColor={selectedCow.category === 'Fattening' ? '#10b981' : '#3b82f6'} stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                        <XAxis 
                          dataKey="date" 
                          tickFormatter={(date) => format(new Date(date), 'MMM dd')} 
                          fontSize={10} 
                          tick={{ fill: '#9ca3af' }}
                          axisLine={false}
                        />
                        <YAxis fontSize={10} tick={{ fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                        <Tooltip />
                        <Area 
                          type="monotone" 
                          dataKey={selectedCow.category === 'Fattening' ? 'weight' : 'amount'} 
                          stroke={selectedCow.category === 'Fattening' ? '#10b981' : '#3b82f6'} 
                          strokeWidth={3}
                          fillOpacity={1} 
                          fill="url(#colorLogTrend)" 
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-sm font-bold text-gray-900 border-b pb-2">History Records</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-64 overflow-y-auto pr-2">
                       {filterLogs(selectedCow.category === 'Fattening' ? weightLogs : milkLogs).slice().reverse().map((log, i) => (
                        <div key={i} className="bg-white border rounded-xl p-4 flex justify-between items-center hover:border-gray-300 transition-colors">
                          <div>
                            <p className="text-[10px] text-gray-400 uppercase font-bold">{formatDate(log.date)}</p>
                            <p className="text-sm font-bold text-gray-900 lowercase first-letter:uppercase">
                              {selectedCow.category === 'Fattening' ? 'Weight Log' : (log as MilkLog).type}
                            </p>
                          </div>
                          <span className="text-lg font-bold text-gray-900">
                            {selectedCow.category === 'Fattening' ? (log as WeightLog).weight : (log as MilkLog).amount} 
                            <span className="text-xs font-normal text-gray-400 ml-1 italic">
                              {selectedCow.category === 'Fattening' ? 'kg' : (log as MilkLog).unit}
                            </span>
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Confirmation Modal */}
      <AnimatePresence>
        {showConfirmModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowConfirmModal(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative bg-white rounded-3xl shadow-2xl w-full max-w-sm p-8"
            >
              <div className="text-center space-y-4">
                <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-2">
                  <AlertTriangle className="h-8 w-8 text-red-600" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Remove Cow?</h3>
                  <p className="text-gray-500 text-sm">Select the reason for removal.</p>
                </div>

                <div className="space-y-4 pt-4 text-left">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase">Reason</label>
                    <select
                      value={deleteReason.reason}
                      onChange={(e) => setDeleteReason({...deleteReason, reason: e.target.value as any})}
                      className="w-full bg-gray-50 border rounded-xl p-3 outline-none font-bold"
                    >
                      <option value="Sold">Sold</option>
                      <option value="Died">Died</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase">
                      {deleteReason.reason === 'Died' ? 'Description (Cause of Death)' : 'Description / Notes'}
                    </label>
                    <textarea
                      required={deleteReason.reason === 'Died'}
                      value={deleteReason.description}
                      onChange={(e) => setDeleteReason({...deleteReason, description: e.target.value})}
                      className="w-full bg-gray-50 border rounded-xl p-3 outline-none h-24 resize-none text-sm"
                      placeholder={deleteReason.reason === 'Died' ? "Please provide details..." : "Optional details..."}
                    />
                  </div>
                </div>

                <div className="flex space-x-3 pt-6">
                  <button
                    onClick={() => setShowConfirmModal(false)}
                    className="flex-1 py-4 px-4 bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold rounded-2xl transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmDelete}
                    className="flex-1 py-4 px-4 bg-red-600 hover:bg-red-700 text-white font-bold rounded-2xl shadow-lg shadow-red-100 transition-all"
                  >
                    Confirm
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Permanent Confirmation Modal */}
      <AnimatePresence>
        {showPermanentConfirmModal && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowPermanentConfirmModal(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative bg-white rounded-3xl shadow-2xl w-full max-w-sm p-8 text-center"
            >
              <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Trash2 className="h-8 w-8 text-red-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Delete Permanently?</h3>
              <p className="text-gray-500 mb-8 text-sm">
                This action is irreversible. The cow data will be deleted forever.
              </p>
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowPermanentConfirmModal(false)}
                  className="flex-1 py-3 px-4 bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmPermanentDelete}
                  disabled={loading}
                  className="flex-1 py-3 px-4 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white font-bold rounded-xl transition-all shadow-lg"
                >
                  {loading ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Recycle Bin Modal */}
      <AnimatePresence>
        {isBinOpen && (
          <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsBinOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white rounded-3xl shadow-2xl w-full max-w-3xl p-8 overflow-hidden transform-gpu"
            >
              <div className="flex justify-between items-center mb-8">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center">
                    <RotateCcw className="h-5 w-5 text-gray-600" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">Recycle Bin</h2>
                    <p className="text-xs text-gray-500">Deleted cows can be restored or removed permanently.</p>
                  </div>
                  <button 
                    onClick={() => {
                      setLoading(true);
                      getDocs(collection(db, 'deletedCows')).then(snap => {
                        const binData = snap.docs.map(doc => ({ ...doc.data(), id: doc.id } as Cow));
                        setDeletedCows(binData);
                        setLoading(false);
                      });
                    }}
                    className="ml-4 p-2 text-xs font-bold text-green-600 hover:bg-green-50 rounded-lg flex items-center space-x-1 transition-all"
                  >
                    <RotateCcw className="h-3 w-3" />
                    <span>Refresh</span>
                  </button>
                </div>
                <button 
                  onClick={() => setIsBinOpen(false)}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X className="h-6 w-6 text-gray-400" />
                </button>
              </div>

              <div className="overflow-x-auto border border-gray-100 rounded-2xl">
                <table className="w-full text-left">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">ID</th>
                      <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Name</th>
                      <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Category</th>
                      <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Reason</th>
                      <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {deletedCows.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                          Recycle bin is empty.
                        </td>
                      </tr>
                    ) : (
                      deletedCows.map((cow) => (
                        <tr key={`bin-${cow.id}`} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4 font-mono text-[10px] text-gray-400">
                            {cow.tagId || `${cow.id?.substring(0, 8)}...`}
                          </td>
                          <td className="px-6 py-4 font-bold text-gray-900">{cow.name}</td>
                          <td className="px-6 py-4 text-sm text-gray-500">{cow.category || 'N/A'}</td>
                          <td className="px-6 py-4">
                            <div className="flex flex-col">
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full w-fit ${
                                (cow as any).deleteReason === 'Sold' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'
                              }`}>
                                {(cow as any).deleteReason || 'N/A'}
                              </span>
                              {(cow as any).deleteDescription && (
                                <span className="text-[10px] text-gray-400 mt-1 truncate max-w-[150px]">
                                  {(cow as any).deleteDescription}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end space-x-2">
                              <button 
                                onClick={() => handleRestore(cow)}
                                className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-all"
                                title="Restore"
                              >
                                <RotateCcw className="h-4 w-4" />
                              </button>
                              <button 
                                onClick={() => handlePermanentDelete(cow.id!)}
                                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                title="Delete Permanently"
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
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
