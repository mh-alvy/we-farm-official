import React, { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, doc, getDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { Project, Investment, SiteSettings } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { TrendingUp, Calendar, X, CheckCircle2, Leaf, Target } from 'lucide-react';
import { formatCurrency, formatDate, cn } from '../lib/utils';
import { FARM_NAME } from '../constants';

export default function Projects() {
  const [projects, setProducts] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
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
              <h3 className="text-xl font-bold text-[#1A2E26] mb-3">{project.title}</h3>
              <p className="text-gray-500 text-sm mb-6 leading-relaxed line-clamp-3">
                {project.description}
              </p>
              
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
    </div>
  );
}
