import React, { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, doc, getDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { Project, Investment, SiteSettings } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { TrendingUp, Calendar, X, CheckCircle2, Leaf, Target, FileText, Download, ShieldCheck, Info, ExternalLink } from 'lucide-react';
import { formatCurrency, formatDate, cn } from '../lib/utils';
import { FARM_NAME } from '../constants';

export default function Projects() {
  const [projects, setProducts] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [viewingProject, setViewingProject] = useState<Project | null>(null);
  const [investmentAmount, setInvestmentAmount] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [settings, setSettings] = useState<SiteSettings | null>(null);

  useEffect(() => {
    const fetchProjects = async () => {
      const querySnapshot = await getDocs(collection(db, 'projects'));
      const projectsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Project));
      setProducts(projectsData);
      setLoading(false);
    };

    async function fetchSettings() {
      const docRef = doc(db, 'settings', 'site');
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setSettings(docSnap.data() as SiteSettings);
      }
    }

    fetchProjects();
    fetchSettings();
  }, []);

  const handleInvest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) {
      alert('Please login to invest');
      return;
    }
    if (!selectedProject) return;

    setSubmitting(true);
    try {
      const investment: Investment = {
        investorName: auth.currentUser.displayName || 'Anonymous',
        investorEmail: auth.currentUser.email || '',
        projectId: selectedProject.id!,
        projectTitle: selectedProject.title,
        amount: parseFloat(investmentAmount),
        date: new Date().toISOString()
      };

      await addDoc(collection(db, 'investments'), investment);
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        setSelectedProject(null);
        setInvestmentAmount('');
      }, 2000);
    } catch (err) {
      console.error(err);
      alert('Failed to process investment');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="py-20 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
      <div className="text-center mb-16">
        <span className="text-xs font-bold tracking-[0.2em] text-[#8B735B] uppercase mb-4 block">
          {settings?.investSection?.tagline || "OUR PROJECTS"}
        </span>
        <h1 className="text-4xl md:text-5xl font-bold text-[#1A2E26] mb-4">
          {settings?.investSection?.headline || "Invest in Sustainable Future"}
        </h1>
        <p className="text-gray-600 max-w-2xl mx-auto">
          {settings?.investSection?.description || "Join the Soil to Soul movement. Support our regenerative farming projects and earn returns while healing the earth."}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {projects.map((project) => (
          <motion.div
            key={project.id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-[40px] overflow-hidden border border-gray-100 shadow-sm hover:shadow-xl transition-all flex flex-col group"
          >
              <div className="h-56 overflow-hidden relative">
                <img
                  src={project.imageUrl}
                  alt={project.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  referrerPolicy="no-referrer"
                />
                <div className={cn(
                  "absolute top-4 right-4 backdrop-blur-sm px-4 py-2 rounded-2xl text-xs font-bold shadow-sm flex items-center space-x-2",
                  project.status === 'Active' ? "bg-green-50/90 text-green-700" : "bg-red-50/90 text-red-700"
                )}>
                  <div className={cn("h-2 w-2 rounded-full animate-pulse", project.status === 'Active' ? "bg-green-500" : "bg-red-500")} />
                  <span>{project.status === 'Active' ? 'Active/Running' : 'Inactive/Not Running'}</span>
                </div>
              </div>
            <div className="p-8 flex-grow flex flex-col">
              <h3 className="text-xl font-bold text-[#1A2E26] mb-2">{project.title}</h3>
              <p className="text-gray-500 text-sm mb-3 leading-relaxed line-clamp-3">
                {project.description}
              </p>
              <button
                onClick={() => setViewingProject(project)}
                className="text-green-700 hover:text-green-800 text-xs font-bold uppercase tracking-wider mb-5 flex items-center transition-colors cursor-pointer text-left"
              >
                <Info className="h-4 w-4 mr-1.5" />
                <span>Read More / View Details</span>
              </button>
              
              <div className="mb-6 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Min Investment</span>
                  <span className="text-lg font-bold text-green-700">{formatCurrency(project.minInvestment || 1000)}</span>
                </div>
              </div>
              
              <div className="mt-auto space-y-6">
                <div className="flex justify-between text-xs font-bold p-4 bg-gray-50 rounded-2xl border border-gray-100">
                  <span className="text-gray-400 uppercase tracking-wider">Target Amount</span>
                  <span className="text-[#1A2E26]">{formatCurrency(project.targetAmount)}</span>
                </div>

                <button
                  onClick={() => setSelectedProject(project)}
                  disabled={project.status !== 'Active'}
                  className={cn(
                    "w-full font-bold py-4 rounded-2xl transition-all shadow-lg",
                    project.status === 'Active' 
                      ? "bg-[#1A2E26] hover:bg-[#2A3E36] text-white shadow-green-100" 
                      : "bg-gray-200 text-gray-500 cursor-not-allowed shadow-none"
                  )}
                >
                  {project.status === 'Active' ? 'Invest Now' : 'Currently Closed'}
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Investment Modal */}
      <AnimatePresence>
        {selectedProject && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedProject(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative bg-white rounded-[40px] shadow-2xl w-full max-w-md p-8 overflow-hidden"
            >
              {success ? (
                <div className="text-center py-12">
                  <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <CheckCircle2 className="h-10 w-10 text-green-600" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">Investment Received!</h2>
                  <p className="text-gray-500">Thank you for growing with {FARM_NAME}.</p>
                </div>
              ) : (
                <>
                  <div className="flex justify-between items-start mb-8">
                    <div>
                      <h2 className="text-2xl font-bold text-[#1A2E26]">Invest in Project</h2>
                      <p className="text-sm text-gray-500 mt-1">{selectedProject.title}</p>
                    </div>
                    <button 
                      onClick={() => setSelectedProject(null)}
                      className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                    >
                      <X className="h-6 w-6 text-gray-400" />
                    </button>
                  </div>

                  <form onSubmit={handleInvest} className="space-y-6">
                    <div className="space-y-3">
                      <label className="text-sm font-bold text-gray-700">Investment Amount (৳)</label>
                      <div className="relative">
                        <span className="absolute left-6 top-1/2 -translate-y-1/2 text-xl font-bold text-gray-400">৳</span>
                        <input
                          type="number"
                          required
                          min={selectedProject.minInvestment || 1000}
                          value={investmentAmount}
                          onChange={(e) => setInvestmentAmount(e.target.value)}
                          className="w-full bg-gray-50 border border-transparent rounded-2xl py-5 pl-12 pr-6 focus:bg-white focus:border-green-500 outline-none transition-all text-xl font-bold"
                          placeholder="0"
                        />
                      </div>
                      <p className="text-xs text-gray-400 font-medium">Minimum investment: {formatCurrency(selectedProject.minInvestment || 1000)}</p>
                    </div>

                    <div className="bg-green-50 p-6 rounded-3xl flex items-start space-x-4 border border-green-100">
                      <div className="bg-green-100 p-2 rounded-xl">
                        <Leaf className="h-5 w-5 text-green-700" />
                      </div>
                      <p className="text-xs text-green-800 leading-relaxed font-medium">
                        Your investment directly supports regenerative farming. We'll send you regular updates on project milestones and impact.
                      </p>
                    </div>

                    <button
                      type="submit"
                      disabled={submitting}
                      className="w-full bg-[#1A2E26] hover:bg-[#2A3E36] text-white font-bold py-5 rounded-2xl transition-all shadow-lg shadow-green-200 disabled:opacity-50"
                    >
                      {submitting ? 'Processing...' : 'Confirm Investment'}
                    </button>
                  </form>
                </>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* View Details / Policy Modal */}
      <AnimatePresence>
        {viewingProject && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setViewingProject(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative bg-white rounded-[40px] shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
            >
              {/* Image banner */}
              <div className="h-64 overflow-hidden relative flex-shrink-0">
                <img
                  src={viewingProject.imageUrl}
                  alt={viewingProject.title}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                
                <button 
                  onClick={() => setViewingProject(null)}
                  className="absolute top-6 right-6 p-2 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-full transition-colors text-white"
                >
                  <X className="h-6 w-6" />
                </button>
                
                <div className="absolute bottom-6 left-8 right-8">
                  <div className={cn(
                    "inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase mb-3 backdrop-blur-md shadow-sm",
                    viewingProject.status === 'Active' ? "bg-green-500/90 text-white" : "bg-red-500/90 text-white"
                  )}>
                    <div className={cn("h-1.5 w-1.5 rounded-full", viewingProject.status === 'Active' ? "bg-white animate-pulse" : "bg-gray-300")} />
                    <span>{viewingProject.status === 'Active' ? 'Active/Running' : 'Inactive/Not Running'}</span>
                  </div>
                  <h2 className="text-2xl md:text-3xl font-bold text-white drop-shadow-sm">{viewingProject.title}</h2>
                </div>
              </div>

              {/* Scrollable Content */}
              <div className="p-8 overflow-y-auto space-y-8 flex-grow">
                {/* Statistics panel */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 flex flex-col">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Minimum Investment</span>
                    <span className="text-lg sm:text-xl font-bold text-green-700">{formatCurrency(viewingProject.minInvestment || 1000)}</span>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 flex flex-col">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Target Funding Amount</span>
                    <span className="text-lg sm:text-xl font-bold text-[#1A2E26]">{formatCurrency(viewingProject.targetAmount)}</span>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-3 flex items-center">
                    <Info className="h-4 w-4 mr-2 text-green-700" />
                    Project Description
                  </h3>
                  <p className="text-gray-600 text-sm leading-relaxed whitespace-pre-line bg-[#F9FBFA] p-6 rounded-2xl border border-green-50/50">
                    {viewingProject.description}
                  </p>
                </div>

                {/* Investment Policy section */}
                <div className="border-t border-gray-100 pt-8">
                  <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-3 flex items-center">
                    <ShieldCheck className="h-4 w-4 mr-2 text-green-700" />
                    Investment Policy & Terms
                  </h3>
                  
                  {viewingProject.policyContent ? (
                    <div className="bg-[#F4F9F6] border border-green-100 rounded-2xl p-6 text-sm text-green-950 space-y-4">
                      <p className="whitespace-pre-line leading-relaxed">
                        {viewingProject.policyContent}
                      </p>
                    </div>
                  ) : (
                    <div className="bg-gray-50 border border-gray-200 rounded-2xl p-6 text-sm text-gray-500 italic">
                      Standard {FARM_NAME} investment guidelines apply to this project. Please contact our support team or refer to the attached document for full terms.
                    </div>
                  )}

                  {viewingProject.policyUrl && (
                    <div className="mt-4 flex justify-end">
                      <a
                        href={viewingProject.policyUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center space-x-2 px-5 py-3 bg-white hover:bg-green-50 border border-green-200 rounded-xl text-xs font-bold text-green-700 transition-all shadow-sm"
                      >
                        <FileText className="h-4 w-4" />
                        <span>View/Download Full Policy Document</span>
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Footer */}
              <div className="p-6 border-t border-gray-100 bg-gray-50 flex-shrink-0 flex items-center justify-between gap-4">
                <button
                  onClick={() => setViewingProject(null)}
                  className="px-6 py-4 border border-gray-200 hover:bg-gray-100 rounded-2xl text-sm font-bold text-gray-500 transition-all cursor-pointer"
                >
                  Close Window
                </button>
                <button
                  onClick={() => {
                    setSelectedProject(viewingProject);
                    setViewingProject(null);
                  }}
                  disabled={viewingProject.status !== 'Active'}
                  className={cn(
                    "flex-1 font-bold py-4 rounded-2xl transition-all shadow-lg text-center cursor-pointer",
                    viewingProject.status === 'Active' 
                      ? "bg-[#1A2E26] hover:bg-[#2A3E36] text-white shadow-green-100" 
                      : "bg-gray-200 text-gray-500 cursor-not-allowed shadow-none"
                  )}
                >
                  {viewingProject.status === 'Active' ? 'Invest in this Project' : 'Currently Closed'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
