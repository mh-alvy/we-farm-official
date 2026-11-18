import React, { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../../firebase';
import { Project, ProjectBatch, ProjectRoiOption } from '../../types';
import {
  Plus,
  Edit2,
  Trash2,
  X,
  Image as ImageIcon,
  Target,
  DollarSign,
  FileText,
  Layers,
  CalendarClock,
  Lock,
  Unlock,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Calculator
} from 'lucide-react';
import { formatCurrency } from '../../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import ImageUploader from '../../components/ImageUploader';
import {
  getLocalizedProjectTitle,
  getLocalizedProjectDesc,
} from '../../lib/productTranslations';
import { toBengaliDigits } from '../../lib/siteSettingsDefaults';

const DEFAULT_ROI_OPTIONS: ProjectRoiOption[] = [
  { rate: 10, label: '১০% সাধারণ (Standard)' },
  { rate: 12, label: '১২% প্রবৃদ্ধি (Growth)' },
  { rate: 15, label: '১৫% প্রিমিয়ার (Premier)' },
  { rate: 18, label: '১৮% উচ্চ লাভ (High Yield)' },
];

const createDefaultBatch = (index: number): ProjectBatch => ({
  id: `batch_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
  name: `Batch ${index}`,
  status: 'Open',
  targetAmount: 0,
  createdAt: new Date().toISOString()
});

export default function AdminProjects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [quickBatchName, setQuickBatchName] = useState<Record<string, string>>({});
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [translatingField, setTranslatingField] = useState<string | null>(null);

  const [newBatchNameInput, setNewBatchNameInput] = useState('');
  const [newBatchTargetInput, setNewBatchTargetInput] = useState('');
  const [newRoiRateInput, setNewRoiRateInput] = useState('');
  const [newRoiLabelInput, setNewRoiLabelInput] = useState('');

  const [formData, setFormData] = useState<Project>({
    title: '',
    titleBn: '',
    description: '',
    descriptionBn: '',
    targetAmount: 0,
    currentAmount: 0,
    minInvestment: 1000,
    roiRate: 15,
    roiOptions: [...DEFAULT_ROI_OPTIONS],
    status: 'Active',
    imageUrl: '',
    policyContent: '',
    policyUrl: '',
    profitType: 'monthly',
    dryPeriodMonthsPerYear: 2,
    batches: [createDefaultBatch(1)]
  });

  useEffect(() => {
    fetchProjects();
  }, []);

  const showNotice = (type: 'success' | 'error', text: string) => {
    setStatusMessage({ type, text });
    setTimeout(() => setStatusMessage(null), 4000);
  };

  const fetchProjects = async () => {
    setLoading(true);
    try {
      const [querySnapshot, invSnapshot] = await Promise.all([
        getDocs(collection(db, 'projects')),
        getDocs(collection(db, 'investments'))
      ]);

      const raisedByProject: Record<string, number> = {};
      invSnapshot.docs.forEach((d) => {
        const invData = d.data();
        const pid = invData.projectId;
        if (pid) {
          raisedByProject[pid] = (raisedByProject[pid] || 0) + (Number(invData.amount) || 0);
        }
      });

      const data = querySnapshot.docs.map((d) => {
        const raw = d.data() as Project;
        const actualRaised = raisedByProject[d.id] || 0;
        if (Number(raw.currentAmount || 0) !== actualRaised) {
          updateDoc(doc(db, 'projects', d.id), { currentAmount: actualRaised }).catch((err) =>
            console.warn('Could not sync project currentAmount:', err)
          );
        }
        return {
          ...raw,
          id: d.id,
          currentAmount: actualRaised
        } as Project;
      });
      setProjects(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAiTranslateField = async (
    sourceText: string,
    targetLang: 'bn' | 'en',
    targetKey: 'title' | 'titleBn' | 'description' | 'descriptionBn',
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
          fieldContext: targetKey.startsWith('title') ? 'agricultural investment project title' : 'agricultural investment project description',
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
      const sanitizedBatches = (formData.batches || []).map((b, idx) => ({
        id: b.id || `batch_${Date.now()}_${idx}`,
        name: b.name.trim() || `Batch ${idx + 1}`,
        status: b.status || 'Open',
        targetAmount: Number(b.targetAmount) || 0,
        createdAt: b.createdAt || new Date().toISOString()
      }));

      const defaultRoi = Number(formData.roiRate) > 0 ? Number(formData.roiRate) : 15;
      let sanitizedRoiOptions: ProjectRoiOption[] = (formData.roiOptions || [])
        .map((opt) => {
          const r = Number(opt.rate);
          if (isNaN(r) || r <= 0) return null;
          return {
            rate: r,
            label: (opt.label || '').trim() || `${toBengaliDigits(String(r))}% বার্ষিক লাভ`,
          };
        })
        .filter(Boolean) as ProjectRoiOption[];

      if (sanitizedRoiOptions.length === 0) {
        sanitizedRoiOptions = [
          {
            rate: defaultRoi,
            label: `${toBengaliDigits(String(defaultRoi))}% প্রত্যাশিত লাভ`,
          },
        ];
      } else if (!sanitizedRoiOptions.some((o) => o.rate === defaultRoi)) {
        sanitizedRoiOptions = [
          ...sanitizedRoiOptions,
          {
            rate: defaultRoi,
            label: `${toBengaliDigits(String(defaultRoi))}% প্রত্যাশিত লাভ`,
          },
        ].sort((a, b) => a.rate - b.rate);
      }

      const payload: Omit<Project, 'id'> = {
        title: formData.title.trim(),
        titleBn: formData.titleBn?.trim() || getLocalizedProjectTitle(formData, true),
        description: formData.description.trim(),
        descriptionBn: formData.descriptionBn?.trim() || getLocalizedProjectDesc(formData, true),
        targetAmount: Number(formData.targetAmount) || 0,
        currentAmount: Number(formData.currentAmount) || 0,
        minInvestment: Number(formData.minInvestment) || 1000,
        roiRate: defaultRoi,
        roiOptions: sanitizedRoiOptions,
        status: formData.status || 'Active',
        imageUrl: formData.imageUrl.trim(),
        policyContent: formData.policyContent || '',
        policyUrl: formData.policyUrl || '',
        profitType: formData.profitType || 'monthly',
        dryPeriodMonthsPerYear:
          formData.profitType === 'monthly'
            ? Math.max(0, Math.min(12, Number(formData.dryPeriodMonthsPerYear ?? 2)))
            : 0,
        batches: sanitizedBatches
      };

      if (editingProject && editingProject.id) {
        await updateDoc(doc(db, 'projects', editingProject.id), { ...payload });
        showNotice('success', 'প্রোজেক্টের তথ্য, সিমুলেটেড ROI, প্রফিট টাইপ ও ব্যাচ আপডেট করা হয়েছে!');
      } else {
        await addDoc(collection(db, 'projects'), payload);
        showNotice('success', 'নতুন প্রোজেক্ট এবং ব্যাচ সফলভাবে তৈরি হয়েছে!');
      }
      setIsModalOpen(false);
      setEditingProject(null);
      fetchProjects();
    } catch (err) {
      console.error(err);
      showNotice('error', 'প্রোজেক্ট সংরক্ষণ করতে সমস্যা হয়েছে।');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'projects', id));
      showNotice('success', 'প্রোজেক্টটি মুছে ফেলা হয়েছে।');
      fetchProjects();
    } catch (err) {
      console.error(err);
      showNotice('error', 'প্রোজেক্ট মুছে ফেলতে সমস্যা হয়েছে।');
    }
  };

  const handleEdit = (project: Project) => {
    setEditingProject(project);
    setFormData({
      ...project,
      titleBn: project.titleBn || getLocalizedProjectTitle(project, true),
      descriptionBn: project.descriptionBn || getLocalizedProjectDesc(project, true),
      roiRate: project.roiRate ?? 15,
      roiOptions:
        project.roiOptions && project.roiOptions.length > 0
          ? [...project.roiOptions]
          : [...DEFAULT_ROI_OPTIONS],
      policyContent: project.policyContent || '',
      policyUrl: project.policyUrl || '',
      profitType: project.profitType || 'monthly',
      dryPeriodMonthsPerYear: project.dryPeriodMonthsPerYear ?? 2,
      batches: project.batches && project.batches.length > 0 ? [...project.batches] : [createDefaultBatch(1)]
    });
    setNewBatchNameInput('');
    setNewBatchTargetInput('');
    setNewRoiRateInput('');
    setNewRoiLabelInput('');
    setIsModalOpen(true);
  };

  // Toggle batch status directly on a project card
  const handleToggleProjectBatchStatus = async (project: Project, batchId: string) => {
    if (!project.id || !project.batches) return;
    const updatedBatches: ProjectBatch[] = project.batches.map(b =>
      b.id === batchId ? { ...b, status: b.status === 'Open' ? 'Closed' : 'Open' } : b
    );
    try {
      await updateDoc(doc(db, 'projects', project.id), { batches: updatedBatches });
      setProjects(prev =>
        prev.map(p => (p.id === project.id ? { ...p, batches: updatedBatches } : p))
      );
      const changed = updatedBatches.find(b => b.id === batchId);
      showNotice(
        'success',
        `${project.title} — "${changed?.name}" এখন ${changed?.status === 'Open' ? 'Open (বিনিয়োগ চালু)' : 'Closed (বিনিয়োগ বন্ধ)'} করা হয়েছে।`
      );
    } catch (err) {
      console.error(err);
      showNotice('error', 'ব্যাচের স্ট্যাটাস পরিবর্তন করতে সমস্যা হয়েছে।');
    }
  };

  // Quick add a batch directly on a project card
  const handleQuickAddBatchOnCard = async (project: Project) => {
    if (!project.id) return;
    const existingBatches = project.batches || [];
    const customName = (quickBatchName[project.id] || '').trim();
    const newBatch: ProjectBatch = {
      id: `batch_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name: customName || `Batch ${existingBatches.length + 1}`,
      status: 'Open',
      targetAmount: 0,
      createdAt: new Date().toISOString()
    };
    const updatedBatches = [...existingBatches, newBatch];
    try {
      await updateDoc(doc(db, 'projects', project.id), { batches: updatedBatches });
      setProjects(prev =>
        prev.map(p => (p.id === project.id ? { ...p, batches: updatedBatches } : p))
      );
      setQuickBatchName(prev => ({ ...prev, [project.id!]: '' }));
      showNotice('success', `${project.title}-এ নতুন ব্যাচ "${newBatch.name}" যুক্ত করা হয়েছে!`);
    } catch (err) {
      console.error(err);
      showNotice('error', 'নতুন ব্যাচ যুক্ত করতে সমস্যা হয়েছে।');
    }
  };

  // Modal batch helpers
  const handleAddBatchInModal = () => {
    const currentBatches = formData.batches || [];
    const nextIndex = currentBatches.length + 1;
    const newBatch: ProjectBatch = {
      id: `batch_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name: newBatchNameInput.trim() || `Batch ${nextIndex}`,
      status: 'Open',
      targetAmount: parseFloat(newBatchTargetInput) || 0,
      createdAt: new Date().toISOString()
    };
    setFormData({
      ...formData,
      batches: [...currentBatches, newBatch]
    });
    setNewBatchNameInput('');
    setNewBatchTargetInput('');
  };

  const handleUpdateModalBatch = (batchId: string, patch: Partial<ProjectBatch>) => {
    setFormData({
      ...formData,
      batches: (formData.batches || []).map(b => (b.id === batchId ? { ...b, ...patch } : b))
    });
  };

  const handleRemoveModalBatch = (batchId: string) => {
    setFormData({
      ...formData,
      batches: (formData.batches || []).filter(b => b.id !== batchId)
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Investment Projects & Batches</h1>
          <p className="text-gray-500 text-xs sm:text-sm">
            প্রোজেক্টের লভ্যাংশের ধরন (মাসিক / এককালীন), Dry Period সেটিংস এবং ব্যাচ ভিত্তিক ইনভেস্টমেন্ট (Open/Close) পরিচালনা করুন।
          </p>
        </div>
        <button
          onClick={() => {
            setEditingProject(null);
            setFormData({
              title: '',
              titleBn: '',
              description: '',
              descriptionBn: '',
              targetAmount: 0,
              currentAmount: 0,
              minInvestment: 1000,
              roiRate: 15,
              roiOptions: [...DEFAULT_ROI_OPTIONS],
              status: 'Active',
              imageUrl: '',
              policyContent: '',
              policyUrl: '',
              profitType: 'monthly',
              dryPeriodMonthsPerYear: 2,
              batches: [createDefaultBatch(1)]
            });
            setNewBatchNameInput('');
            setNewBatchTargetInput('');
            setNewRoiRateInput('');
            setNewRoiLabelInput('');
            setIsModalOpen(true);
          }}
          className="flex items-center justify-center space-x-2 px-6 py-2.5 bg-green-600 rounded-xl text-sm font-bold text-white hover:bg-green-700 transition-all shadow-md shadow-green-100 cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          <span>Add New Project</span>
        </button>
      </div>

      {statusMessage && (
        <div
          className={`p-4 rounded-2xl border flex items-center space-x-3 text-sm font-bold ${
            statusMessage.type === 'success'
              ? 'bg-green-50 border-green-200 text-green-800'
              : 'bg-red-50 border-red-200 text-red-700'
          }`}
        >
          {statusMessage.type === 'success' ? (
            <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
          ) : (
            <AlertCircle className="h-5 w-5 text-red-600 shrink-0" />
          )}
          <span>{statusMessage.text}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full py-12 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto"></div>
          </div>
        ) : projects.length === 0 ? (
          <div className="col-span-full py-12 text-center text-gray-500">
            No projects found.
          </div>
        ) : (
          projects.map((project) => {
            const pType = project.profitType || 'monthly';
            const dryLimit = project.dryPeriodMonthsPerYear ?? 2;
            const batches = project.batches || [];

            return (
              <div
                key={project.id}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col"
              >
                <div className="h-40 overflow-hidden relative">
                  <img
                    src={project.imageUrl}
                    alt={project.title}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute top-2 left-2 flex flex-wrap gap-1.5">
                    <span
                      className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${
                        project.status === 'Active'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {project.status === 'Active' ? 'Active' : 'Inactive'}
                    </span>
                    <span
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold tracking-wide shadow-sm ${
                        pType === 'monthly'
                          ? 'bg-emerald-700 text-white'
                          : 'bg-amber-600 text-white'
                      }`}
                    >
                      {pType === 'monthly' ? 'মাসিক লভ্যাংশভিত্তিক' : 'এককালীন (One-Time)'}
                    </span>
                  </div>
                  <div className="absolute top-2 right-2 flex space-x-1">
                    <button
                      onClick={() => handleEdit(project)}
                      className="p-2 bg-white/90 backdrop-blur-sm rounded-lg text-blue-600 hover:bg-white shadow-sm transition-all cursor-pointer"
                      title="Edit Project & Batches"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(project.id!)}
                      className="p-2 bg-white/90 backdrop-blur-sm rounded-lg text-red-600 hover:bg-white shadow-sm transition-all cursor-pointer"
                      title="Delete Project"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="p-5 flex-grow flex flex-col">
                  <h3 className="font-bold text-gray-900 mb-1.5">{project.title}</h3>
                  <p className="text-gray-500 text-xs mb-3 line-clamp-2">{project.description}</p>

                  {/* Profit Type & Dry Period Info Strip */}
                  <div className="flex flex-wrap items-center gap-2 mb-4">
                    <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-gray-50 border border-gray-100 text-[11px] font-bold text-gray-700">
                      <CalendarClock className="h-3.5 w-3.5 text-green-600" />
                      <span>
                        {pType === 'monthly' ? 'মাসিক প্রফিট সিস্টেম' : 'এককালীন প্রফিট সিস্টেম'}
                      </span>
                    </span>
                    {pType === 'monthly' && (
                      <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-200 text-[11px] font-bold text-amber-800">
                        <span>Dry Period: {dryLimit} মাস / ১২ মাস</span>
                      </span>
                    )}
                  </div>

                  {/* Batches Section on Card */}
                  <div className="bg-gray-50/80 border border-gray-100 rounded-xl p-3 mb-4 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-gray-600 uppercase flex items-center space-x-1">
                        <Layers className="h-3.5 w-3.5 text-green-600" />
                        <span>প্রোজেক্ট ব্যাচসমূহ ({batches.length})</span>
                      </span>
                      <span className="text-[10px] text-gray-400 font-semibold">
                        ক্লিক করে Open/Close করুন
                      </span>
                    </div>

                    {batches.length === 0 ? (
                      <p className="text-xs text-gray-400 italic">কোনো ব্যাচ যুক্ত করা হয়নি।</p>
                    ) : (
                      <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                        {batches.map((batch) => (
                          <div
                            key={batch.id}
                            className="flex items-center justify-between bg-white px-3 py-1.5 rounded-lg border border-gray-100 text-xs"
                          >
                            <div className="font-bold text-gray-800 truncate pr-2">
                              {batch.name}
                            </div>
                            <button
                              type="button"
                              onClick={() => handleToggleProjectBatchStatus(project, batch.id)}
                              className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-md text-[10px] font-bold transition-all cursor-pointer shrink-0 ${
                                batch.status === 'Open'
                                  ? 'bg-green-100 text-green-800 hover:bg-green-200'
                                  : 'bg-red-100 text-red-700 hover:bg-red-200'
                              }`}
                              title="Click to toggle Open / Closed"
                            >
                              {batch.status === 'Open' ? (
                                <>
                                  <Unlock className="h-3 w-3" />
                                  <span>Open</span>
                                </>
                              ) : (
                                <>
                                  <Lock className="h-3 w-3" />
                                  <span>Closed</span>
                                </>
                              )}
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Quick Add Batch Input */}
                    <div className="flex items-center gap-1.5 pt-1">
                      <input
                        type="text"
                        value={quickBatchName[project.id!] || ''}
                        onChange={(e) =>
                          setQuickBatchName(prev => ({ ...prev, [project.id!]: e.target.value }))
                        }
                        placeholder={`Batch ${batches.length + 1} নাম...`}
                        className="flex-1 bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs outline-none focus:border-green-500"
                      />
                      <button
                        type="button"
                        onClick={() => handleQuickAddBatchOnCard(project)}
                        className="px-2.5 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-bold flex items-center space-x-1 shrink-0 cursor-pointer"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        <span>ব্যাচ যুক্ত</span>
                      </button>
                    </div>
                  </div>

                  <div className="mt-auto space-y-2.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-400">Target</span>
                      <span className="font-bold text-gray-900">{formatCurrency(project.targetAmount)}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-400">Collected (সংগৃহীত)</span>
                      <span className="font-bold text-emerald-700">
                        {formatCurrency(project.currentAmount || 0)} (
                        {project.targetAmount > 0
                          ? Math.min(100, Math.round(((project.currentAmount || 0) / project.targetAmount) * 100))
                          : 0}
                        %)
                      </span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-400">Min Investment</span>
                      <span className="font-bold text-green-600">{formatCurrency(project.minInvestment)}</span>
                    </div>
                    <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-green-600 h-full transition-all"
                        style={{
                          width: `${Math.min(
                            100,
                            project.targetAmount > 0
                              ? ((project.currentAmount || 0) / project.targetAmount) * 100
                              : 0
                          )}%`
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

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
              className="relative bg-white rounded-3xl shadow-2xl w-full max-w-2xl p-6 sm:p-8 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">
                    {editingProject ? 'Edit Project & Batches' : 'Create New Project'}
                  </h2>
                  <p className="text-xs text-gray-500 mt-0.5">
                    প্রোজেক্টের ধরন, Dry Period এবং ব্যাচসমূহ কনফিগার করুন।
                  </p>
                </div>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors cursor-pointer"
                >
                  <X className="h-6 w-6 text-gray-400" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-blue-700 uppercase">Project Title (EN) *</label>
                      <button
                        type="button"
                        onClick={() => handleAiTranslateField(formData.title, 'bn', 'titleBn', 'title_en_bn')}
                        disabled={translatingField === 'title_en_bn'}
                        className="inline-flex items-center space-x-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 hover:bg-emerald-100 cursor-pointer"
                      >
                        <Sparkles className="h-3 w-3" />
                        <span>{translatingField === 'title_en_bn' ? '...' : 'AI বাংলায় →'}</span>
                      </button>
                    </div>
                    <input
                      type="text"
                      required
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl py-2.5 px-4 outline-none focus:ring-2 focus:ring-green-500 transition-all text-sm"
                      placeholder="e.g. Solar Powered Dairy Unit"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-emerald-700 uppercase">প্রোজেক্টের নাম (বাংলা)</label>
                      <button
                        type="button"
                        onClick={() => handleAiTranslateField(formData.titleBn || '', 'en', 'title', 'title_bn_en')}
                        disabled={translatingField === 'title_bn_en'}
                        className="inline-flex items-center space-x-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 hover:bg-blue-100 cursor-pointer"
                      >
                        <Sparkles className="h-3 w-3" />
                        <span>{translatingField === 'title_bn_en' ? '...' : '← AI English'}</span>
                      </button>
                    </div>
                    <input
                      type="text"
                      value={formData.titleBn || ''}
                      onChange={(e) => setFormData({ ...formData, titleBn: e.target.value })}
                      className="w-full bg-emerald-50/40 border border-emerald-200 rounded-xl py-2.5 px-4 outline-none focus:ring-2 focus:ring-green-500 transition-all text-sm"
                      placeholder="যেমন: ডেইরি প্রোজেক্ট (গাভী পালন)"
                    />
                  </div>

                  {/* Profit Type Selection */}
                  <div className="space-y-2 md:col-span-2 bg-emerald-50/60 border border-emerald-200 rounded-2xl p-4">
                    <label className="text-xs font-bold text-emerald-950 uppercase block mb-2">
                      লভ্যাংশের ধরন (Profit Distribution System) *
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, profitType: 'monthly' })}
                        className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex items-start space-x-3 ${
                          (formData.profitType || 'monthly') === 'monthly'
                            ? 'bg-white border-green-600 ring-2 ring-green-500/20 shadow-sm'
                            : 'bg-white/60 border-gray-200 hover:bg-white'
                        }`}
                      >
                        <div className="mt-0.5 w-4 h-4 rounded-full border-2 border-green-600 flex items-center justify-center shrink-0">
                          {(formData.profitType || 'monthly') === 'monthly' && (
                            <div className="w-2 h-2 rounded-full bg-green-600" />
                          )}
                        </div>
                        <div>
                          <div className="text-sm font-bold text-gray-900">
                            মাসিক লভ্যাংশভিত্তিক (Monthly Profit)
                          </div>
                          <div className="text-[11px] text-gray-500 mt-0.5">
                            প্রতি মাসে ব্যাচ অনুযায়ী প্রফিটের শতাংশ নির্ধারণ ও Dry Period সুবিধা।
                          </div>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, profitType: 'one_time' })}
                        className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex items-start space-x-3 ${
                          formData.profitType === 'one_time'
                            ? 'bg-white border-green-600 ring-2 ring-green-500/20 shadow-sm'
                            : 'bg-white/60 border-gray-200 hover:bg-white'
                        }`}
                      >
                        <div className="mt-0.5 w-4 h-4 rounded-full border-2 border-green-600 flex items-center justify-center shrink-0">
                          {formData.profitType === 'one_time' && (
                            <div className="w-2 h-2 rounded-full bg-green-600" />
                          )}
                        </div>
                        <div>
                          <div className="text-sm font-bold text-gray-900">
                            এককালীন লভ্যাংশ (One-Time Return)
                          </div>
                          <div className="text-[11px] text-gray-500 mt-0.5">
                            মেয়াদ শেষে বা নির্দিষ্ট সময়ে এককালীন মুনাফা প্রদান।
                          </div>
                        </div>
                      </button>
                    </div>

                    {(formData.profitType || 'monthly') === 'monthly' && (
                      <div className="mt-4 pt-4 border-t border-emerald-200/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                          <label className="text-xs font-bold text-emerald-950 block">
                            প্রতি ১২ মাসে সর্বোচ্চ কত মাস Dry Period থাকবে? *
                          </label>
                          <p className="text-[11px] text-emerald-800">
                            উদাহরণ: ২ দিলে কোনো ইনভেস্টরকে ১২ মাসের সাইকেলে সর্বোচ্চ ২ মাস Dry Period দেওয়া যাবে।
                          </p>
                        </div>
                        <div className="flex items-center space-x-2 shrink-0">
                          <input
                            type="number"
                            min={0}
                            max={12}
                            required
                            value={formData.dryPeriodMonthsPerYear ?? 2}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                dryPeriodMonthsPerYear: Math.max(
                                  0,
                                  Math.min(12, parseInt(e.target.value || '0', 10))
                                )
                              })
                            }
                            className="w-24 bg-white border border-emerald-300 rounded-xl py-2 px-3 text-center font-extrabold text-emerald-900 outline-none focus:ring-2 focus:ring-green-500"
                          />
                          <span className="text-xs font-bold text-emerald-900">মাস / ১২ মাস</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Project Batches Management inside Modal */}
                  <div className="space-y-3 md:col-span-2 bg-gray-50 border border-gray-200 rounded-2xl p-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <label className="text-xs font-bold text-gray-800 uppercase flex items-center space-x-1.5">
                          <Layers className="h-4 w-4 text-green-600" />
                          <span>প্রোজেক্টের ব্যাচসমূহ (Project Batches)</span>
                        </label>
                        <p className="text-[11px] text-gray-500">
                          ব্যাচ ওয়াইজ ইনভেস্টমেন্ট নেওয়া হবে এবং যেকোনো ব্যাচ Open বা Closed রাখা যাবে।
                        </p>
                      </div>
                    </div>

                    {/* Existing Batches List */}
                    <div className="space-y-2">
                      {(formData.batches || []).map((batch, index) => (
                        <div
                          key={batch.id}
                          className="flex flex-wrap sm:flex-nowrap items-center gap-2 bg-white p-2.5 rounded-xl border border-gray-200"
                        >
                          <span className="text-xs font-extrabold text-gray-400 w-6 text-center">
                            #{index + 1}
                          </span>
                          <input
                            type="text"
                            value={batch.name}
                            onChange={(e) =>
                              handleUpdateModalBatch(batch.id, { name: e.target.value })
                            }
                            placeholder="Batch Name (e.g. Batch 1)"
                            className="flex-1 min-w-[140px] bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 text-xs font-bold text-gray-900 outline-none focus:border-green-500"
                          />
                          <select
                            value={batch.status}
                            onChange={(e) =>
                              handleUpdateModalBatch(batch.id, {
                                status: e.target.value as 'Open' | 'Closed'
                              })
                            }
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold border outline-none cursor-pointer ${
                              batch.status === 'Open'
                                ? 'bg-green-50 text-green-700 border-green-200'
                                : 'bg-red-50 text-red-700 border-red-200'
                            }`}
                          >
                            <option value="Open">Open (বিনিয়োগ চালু)</option>
                            <option value="Closed">Closed (বিনিয়োগ বন্ধ)</option>
                          </select>
                          {(formData.batches || []).length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveModalBatch(batch.id)}
                              className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                              title="Remove Batch"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Add New Batch Row */}
                    <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 pt-2 border-t border-gray-200/70">
                      <input
                        type="text"
                        value={newBatchNameInput}
                        onChange={(e) => setNewBatchNameInput(e.target.value)}
                        placeholder={`নতুন ব্যাচের নাম (যেমন: Batch ${(formData.batches || []).length + 1})`}
                        className="flex-1 bg-white border border-gray-200 rounded-xl px-3.5 py-2 text-xs font-medium outline-none focus:border-green-500"
                      />
                      <button
                        type="button"
                        onClick={handleAddBatchInModal}
                        className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 cursor-pointer shrink-0"
                      >
                        <Plus className="h-4 w-4" />
                        <span>নতুন ব্যাচ যুক্ত করুন</span>
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-blue-700 uppercase">Description (EN)</label>
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
                      required
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="w-full bg-gray-50 border border-gray-100 rounded-xl py-3 px-4 outline-none focus:ring-2 focus:ring-green-500 transition-all h-24 resize-none text-xs"
                      placeholder="Describe the project goals and impact..."
                    />
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-emerald-700 uppercase">প্রোজেক্টের বিবরণ (বাংলা)</label>
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
                      onChange={(e) => setFormData({ ...formData, descriptionBn: e.target.value })}
                      className="w-full bg-emerald-50/40 border border-emerald-100 rounded-xl py-3 px-4 outline-none focus:ring-2 focus:ring-green-500 transition-all h-24 resize-none text-xs"
                      placeholder="প্রোজেক্টের লক্ষ্য ও লভ্যাংশের বিবরণ বাংলায়..."
                    />
                  </div>
                  {/* Simulated ROI (সিমুলেটেড লাভ) Settings inside Modal */}
                  <div className="space-y-3 md:col-span-2 bg-green-50/50 border border-green-200 rounded-2xl p-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <label className="text-xs font-bold text-green-950 uppercase flex items-center space-x-1.5">
                          <Calculator className="h-4 w-4 text-green-700" />
                          <span>বিনিয়োগ সিমুলেটর — সিমুলেটেড লাভ (ROI %) নির্ধারণ</span>
                        </label>
                        <p className="text-[11px] text-green-800 mt-0.5">
                          প্রোজেক্টের ডিফল্ট ROI পার্সেন্টেজ এবং সিমুলেটর ড্রপডাউনের অপশনসমূহ এখান থেকে নির্ধারণ করুন।
                        </p>
                      </div>
                      <div className="flex items-center space-x-2 shrink-0 bg-white px-3 py-2 rounded-xl border border-green-200">
                        <span className="text-xs font-bold text-gray-700">ডিফল্ট ROI (%):</span>
                        <input
                          type="number"
                          step="0.5"
                          min="1"
                          max="100"
                          required
                          value={formData.roiRate ?? 15}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 0;
                            setFormData({ ...formData, roiRate: val });
                          }}
                          className="w-20 bg-green-50 border border-green-300 rounded-lg py-1 px-2 text-center font-extrabold text-green-900 outline-none focus:ring-2 focus:ring-green-500 text-sm"
                        />
                        <span className="text-xs font-bold text-green-800">%</span>
                      </div>
                    </div>

                    <div className="space-y-2 pt-2 border-t border-green-200/60">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-green-900 uppercase">
                          সিমুলেটর ড্রপডাউন পার্সেন্টেজ অপশনসমূহ ({(formData.roiOptions || []).length})
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            const r = Number(formData.roiRate) || 15;
                            setFormData({
                              ...formData,
                              roiOptions: [
                                {
                                  rate: r,
                                  label: `${toBengaliDigits(String(r))}% প্রত্যাশিত লাভ (Fixed ROI)`,
                                },
                              ],
                            });
                          }}
                          className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-white border border-green-300 text-green-800 hover:bg-green-100 transition-colors cursor-pointer"
                        >
                          শুধু ডিফল্ট ROI ({formData.roiRate ?? 15}%) রাখুন
                        </button>
                      </div>

                      <div className="space-y-2">
                        {(formData.roiOptions || []).map((opt, idx) => (
                          <div
                            key={idx}
                            className="flex flex-wrap sm:flex-nowrap items-center gap-2 bg-white p-2 rounded-xl border border-green-100"
                          >
                            <div className="flex items-center space-x-1 shrink-0">
                              <input
                                type="number"
                                step="0.5"
                                min="1"
                                max="100"
                                value={opt.rate}
                                onChange={(e) => {
                                  const newRate = parseFloat(e.target.value) || 0;
                                  const next = [...(formData.roiOptions || [])];
                                  next[idx] = {
                                    ...next[idx],
                                    rate: newRate,
                                    label: next[idx].label
                                      ? next[idx].label!.replace(/^[0-9০-৯.]+%/, `${toBengaliDigits(String(newRate))}%`)
                                      : `${toBengaliDigits(String(newRate))}% বার্ষিক লাভ`,
                                  };
                                  setFormData({ ...formData, roiOptions: next });
                                }}
                                className="w-20 bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs font-extrabold text-green-800 text-center outline-none focus:border-green-500"
                              />
                              <span className="text-xs font-bold text-gray-500">%</span>
                            </div>
                            <input
                              type="text"
                              value={opt.label || ''}
                              onChange={(e) => {
                                const next = [...(formData.roiOptions || [])];
                                next[idx] = { ...next[idx], label: e.target.value };
                                setFormData({ ...formData, roiOptions: next });
                              }}
                              placeholder="যেমন: ১৫% প্রিমিয়ার (Premier)"
                              className="flex-1 min-w-[160px] bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 text-xs font-semibold text-gray-800 outline-none focus:border-green-500"
                            />
                            {(formData.roiOptions || []).length > 1 && (
                              <button
                                type="button"
                                onClick={() => {
                                  const next = (formData.roiOptions || []).filter((_, i) => i !== idx);
                                  setFormData({ ...formData, roiOptions: next });
                                }}
                                className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                                title="Remove ROI Option"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>

                      {/* Add New ROI Option Row */}
                      <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 pt-2">
                        <input
                          type="number"
                          step="0.5"
                          min="1"
                          max="100"
                          value={newRoiRateInput}
                          onChange={(e) => setNewRoiRateInput(e.target.value)}
                          placeholder="নতুন % (যেমন: 20)"
                          className="w-36 bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-green-500"
                        />
                        <input
                          type="text"
                          value={newRoiLabelInput}
                          onChange={(e) => setNewRoiLabelInput(e.target.value)}
                          placeholder="লেবেল (যেমন: ২০% বিশেষ প্রফিট)"
                          className="flex-1 bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs font-medium outline-none focus:border-green-500"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const r = parseFloat(newRoiRateInput);
                            if (isNaN(r) || r <= 0) return;
                            const label =
                              newRoiLabelInput.trim() || `${toBengaliDigits(String(r))}% বার্ষিক লাভ`;
                            setFormData({
                              ...formData,
                              roiOptions: [...(formData.roiOptions || []), { rate: r, label }],
                            });
                            setNewRoiRateInput('');
                            setNewRoiLabelInput('');
                          }}
                          className="px-3.5 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl text-xs font-bold flex items-center space-x-1 cursor-pointer shrink-0"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          <span>ROI % যুক্ত করুন</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase">Target Amount (৳)</label>
                    <div className="relative">
                      <Target className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <input
                        type="number"
                        required
                        value={formData.targetAmount}
                        onChange={(e) =>
                          setFormData({ ...formData, targetAmount: parseFloat(e.target.value) || 0 })
                        }
                        className="w-full bg-gray-50 border border-gray-100 rounded-xl py-3 pl-12 pr-4 outline-none focus:ring-2 focus:ring-green-500 transition-all"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase">Min Investment (৳)</label>
                    <div className="relative">
                      <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <input
                        type="number"
                        required
                        value={formData.minInvestment}
                        onChange={(e) =>
                          setFormData({ ...formData, minInvestment: parseFloat(e.target.value) || 0 })
                        }
                        className="w-full bg-gray-50 border border-gray-100 rounded-xl py-3 pl-12 pr-4 outline-none focus:ring-2 focus:ring-green-500 transition-all"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase">Status</label>
                    <select
                      value={formData.status}
                      onChange={(e) =>
                        setFormData({ ...formData, status: e.target.value as 'Active' | 'Inactive' })
                      }
                      className="w-full bg-gray-50 border border-gray-100 rounded-xl py-3 px-4 outline-none focus:ring-2 focus:ring-green-500 transition-all"
                    >
                      <option value="Active">Active/Running</option>
                      <option value="Inactive">Inactive/Not Running</option>
                    </select>
                  </div>
                  <div className="space-y-4 md:col-span-2">
                    <ImageUploader
                      label="Upload Project Cover Image"
                      currentImageUrl={formData.imageUrl}
                      onUploadSuccess={(url) => setFormData({ ...formData, imageUrl: url })}
                      onClear={() => setFormData({ ...formData, imageUrl: '' })}
                      folder="projects"
                    />

                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                        Or Paste Direct Image URL
                      </label>
                      <div className="relative">
                        <ImageIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <input
                          type="url"
                          required
                          value={formData.imageUrl}
                          onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                          className="w-full bg-gray-50 border border-gray-100 rounded-xl py-3 pl-12 pr-4 outline-none focus:ring-2 focus:ring-green-500 transition-all text-sm"
                          placeholder="https://images.unsplash.com/..."
                        />
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-xs font-bold text-gray-400 uppercase">
                      Investment Policy Details (Terms, returns, cycles etc)
                    </label>
                    <textarea
                      value={formData.policyContent}
                      onChange={(e) => setFormData({ ...formData, policyContent: e.target.value })}
                      className="w-full bg-gray-50 border border-gray-100 rounded-xl py-3 px-4 outline-none focus:ring-2 focus:ring-green-500 transition-all h-24 resize-none"
                      placeholder="e.g. 1. Expected annual return is 15-18%. 2. Capital is locked for 12 months..."
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-xs font-bold text-gray-400 uppercase">
                      Attach/Add Policy Document Link (URL)
                    </label>
                    <div className="relative">
                      <FileText className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <input
                        type="url"
                        value={formData.policyUrl}
                        onChange={(e) => setFormData({ ...formData, policyUrl: e.target.value })}
                        className="w-full bg-gray-50 border border-gray-100 rounded-xl py-3 pl-12 pr-4 outline-none focus:ring-2 focus:ring-green-500 transition-all"
                        placeholder="https://example.com/investment_policy.pdf"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-4">
                  <button
                    type="submit"
                    className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-green-100 cursor-pointer"
                  >
                    {editingProject ? 'Update Project & Batches' : 'Create Project'}
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
