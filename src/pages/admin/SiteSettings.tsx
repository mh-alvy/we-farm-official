import React, { useState, useEffect, useRef } from 'react';
import { db } from '../../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { Save, Image as ImageIcon, Plus, X, Layout, Type, Info, CheckCircle2, ShieldAlert } from 'lucide-react';
import { SiteSettings } from '../../types';
import { motion } from 'motion/react';
import ImageUploader from '../../components/ImageUploader';
import { cn } from '../../lib/utils';

const DEFAULT_SETTINGS: SiteSettings = {
  hero: {
    tagline: 'SOIL TO SOUL',
    title: 'Fresh Farm Products From Our Farm',
    description: 'Rooted in the philosophy of Soil to Soul. We practice regenerative farming to bring you meat and dairy that nourishes the body and respects the earth.',
    images: ['https://images.unsplash.com/photo-1500595046743-cd271d694d30?auto=format&fit=crop&q=80&w=1200'],
    useScrollEffect: true
  },
  featuresSection: {
    tagline: 'WHY CHOOSE US',
    headline: 'Experience the Difference of Real Farming',
    features: [
      {
        title: "Natural Farming",
        description: "Regenerative practices that work with nature, not against it.",
        iconName: "Leaf"
      },
      {
        title: "Healthy Animals",
        description: "Free-range livestock raised on natural diets without hormones.",
        iconName: "Heart"
      },
      {
        title: "Fresh Products",
        description: "Farm-to-table freshness delivered with care and speed.",
        iconName: "Zap"
      },
      {
        title: "Trusted Farm",
        description: "Transparent practices you can trust, from soil to soul.",
        iconName: "CheckCircle"
      }
    ]
  },
  aboutSection: {
    tagline: 'GROW WITH US',
    headline: 'Be Part of the Soil to Soul Movement',
    description: "We're expanding our pastures and invite you to grow with us. Whether you invest or support, you're helping build a future of honest, regenerative farming for everyone.",
    imageUrl: 'https://images.unsplash.com/photo-1595113316349-9fa4eb24f884?auto=format&fit=crop&q=80&w=1000',
    primaryButtonText: 'Become an Investor',
    secondaryButtonText: 'Support the Farm'
  },
  statsSection: {
    stats: [
      { value: '500+', label: 'Happy Animals' },
      { value: '100%', label: 'Natural Soil' },
      { value: '1000+', label: 'Fresh Deliveries' },
      { value: '50+', label: 'Local Staff' }
    ]
  },
  aboutUsSection: {
    promise: {
      tagline: 'ABOUT AGROVEST',
      headline: 'From Soil to Soul — Our Promise',
      description: "AgroVest was born from a belief that food should be grown with integrity. We're a family-run regenerative farm committed to nourishing communities while healing the land.",
      imageUrl: 'https://images.unsplash.com/photo-1500651230702-0e2d8a49d4ad?auto=format&fit=crop&q=80&w=1000'
    },
    vision: {
      headline: 'Our Vision',
      description: '"To create a world where every meal is a connection to the earth, where farming heals instead of harms, and where communities thrive on the bounty of honest soil."'
    }
  },
  productsSection: {
    tagline: 'OUR PRODUCTS',
    headline: 'Honest Food from Honest Soil',
    description: 'Fresh products directly from AgroVest to your table.'
  },
  investSection: {
    tagline: 'OUR PROJECTS',
    headline: 'Invest in Sustainable Future',
    description: 'Join the Soil to Soul movement. Support our regenerative farming projects and earn returns while healing the earth.'
  },
  contactSection: {
    tagline: 'GET IN TOUCH',
    headline: 'Contact AgroVest',
    description: "Reach out via WhatsApp or fill the form below — we'd love to hear from you.",
    info: {
      location: { title: 'Location', text: '123 Farm Road, Dhaka, Bangladesh' },
      whatsapp: { title: 'WhatsApp', text: '+880 1234 567890' },
      email: { title: 'Email', text: 'hello@agrovest.example.com' }
    }
  },
  faqSection: {
    headline: 'Frequently Asked Questions',
    description: 'Everything you need to know about AgroVest and our farming ecosystem.',
    faqs: [
      {
        question: "How do I invest in a farm project?",
        answer: "To invest, simply browse our active projects, select one that interests you, and click 'Invest'. You'll need to be logged in with your Google account. You can track your investment progress directly from your dashboard."
      },
      {
        question: "What are the expected returns on investments?",
        answer: "Returns vary by project and are detailed in each project's description. Typically, our projects aim for a 10-15% annual return, though this depends on farm productivity and market conditions."
      },
      {
        question: "Is my investment secure?",
        answer: "AgroVest uses smart management and real-time tracking to minimize risks. While all investments carry some risk, we provide full transparency into farm operations and financial reporting."
      },
      {
        question: "Can I visit the farm?",
        answer: "Yes! We encourage our investors to visit the farms they support. Please contact us to schedule a guided tour of our facilities."
      },
      {
        question: "How do I order products?",
        answer: "Visit our Shop section, add products to your cart, and place an order. You'll receive a notification when your fresh farm products are ready for pickup or delivery."
      }
    ]
  }
};

export default function AdminSiteSettings() {
  const [settings, setSettings] = useState<SiteSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newImageUrl, setNewImageUrl] = useState('');
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function fetchSettings() {
      try {
        const docRef = doc(db, 'settings', 'site');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data() as SiteSettings;
          setSettings({
            ...DEFAULT_SETTINGS,
            ...data,
            hero: { ...DEFAULT_SETTINGS.hero, ...(data.hero || {}) },
            featuresSection: { ...DEFAULT_SETTINGS.featuresSection, ...(data.featuresSection || {}) },
            aboutSection: { ...DEFAULT_SETTINGS.aboutSection, ...(data.aboutSection || {}) },
            statsSection: { ...DEFAULT_SETTINGS.statsSection, ...(data.statsSection || {}) },
            aboutUsSection: { ...DEFAULT_SETTINGS.aboutUsSection, ...(data.aboutUsSection || {}) },
            productsSection: { ...DEFAULT_SETTINGS.productsSection, ...(data.productsSection || {}) },
            investSection: { ...DEFAULT_SETTINGS.investSection, ...(data.investSection || {}) },
            contactSection: { ...DEFAULT_SETTINGS.contactSection, ...(data.contactSection || {}) },
            faqSection: { ...DEFAULT_SETTINGS.faqSection, ...(data.faqSection || {}) }
          });
        } else {
          // Initialize with defaults if doesn't exist
          await setDoc(docRef, DEFAULT_SETTINGS);
          setSettings(DEFAULT_SETTINGS);
        }
      } catch (error) {
        console.error("Error fetching settings:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchSettings();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setActionMessage(null);
    try {
      await setDoc(doc(db, 'settings', 'site'), settings);
      setActionMessage({ type: 'success', text: 'Site settings updated successfully!' });
    } catch (error) {
      console.error("Error saving settings:", error);
      setActionMessage({ type: 'error', text: 'Failed to update site settings.' });
    } finally {
      setSaving(false);
      setTimeout(() => setActionMessage(null), 3000);
    }
  };

  const addImage = () => {
    if (!newImageUrl.trim()) return;
    setSettings({
      ...settings,
      hero: {
        ...settings.hero,
        images: [...settings.hero.images, newImageUrl.trim()]
      }
    });
    setNewImageUrl('');
  };

  const removeImage = (index: number) => {
    setSettings({
      ...settings,
      hero: {
        ...settings.hero,
        images: settings.hero.images.filter((_, i) => i !== index)
      }
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Site Content Management</h1>
          <p className="text-gray-500 text-sm">Customize the text and media of your homepage.</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center justify-center space-x-2 bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-8 rounded-xl transition-all shadow-lg active:scale-[0.98] disabled:opacity-50"
        >
          {saving ? (
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
          ) : (
            <>
              <Save className="h-5 w-5" />
              <span>Save Changes</span>
            </>
          )}
        </button>
      </div>

      {actionMessage && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-4 rounded-xl flex items-center space-x-3 ${
            actionMessage.type === 'success' ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-red-50 text-red-700 border border-red-100'
          }`}
        >
          {actionMessage.type === 'success' ? <CheckCircle2 className="h-5 w-5" /> : <ShieldAlert className="h-5 w-5" />}
          <span className="font-bold">{actionMessage.text}</span>
        </motion.div>
      )}

      {/* Hero Section Editor */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="bg-gray-50 px-8 py-4 border-b border-gray-100 flex items-center space-x-3">
          <div className="bg-green-100 p-2 rounded-lg">
            <Layout className="h-5 w-5 text-green-600" />
          </div>
          <h2 className="font-bold text-gray-900 uppercase tracking-widest text-xs">Hero Section</h2>
        </div>

        <div className="p-8 space-y-8">
          {/* Hero Style Selection */}
          <div className="bg-green-50/40 p-6 rounded-2xl border border-green-100/50 space-y-4">
            <label className="block text-[10px] font-bold text-green-800 uppercase tracking-widest flex items-center space-x-2">
              <Layout className="h-4 w-4" />
              <span>Hero Section Display Style</span>
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setSettings({
                  ...settings,
                  hero: { ...settings.hero, useScrollEffect: true }
                })}
                className={cn(
                  "p-5 rounded-xl border text-left transition-all flex flex-col space-y-2 cursor-pointer",
                  settings.hero.useScrollEffect !== false
                    ? "bg-white border-green-600 ring-2 ring-green-100 shadow-sm"
                    : "bg-white border-gray-100 hover:border-gray-200"
                )}
              >
                <span className="font-bold text-sm text-gray-900">Scroll-scraped Animation</span>
                <span className="text-xs text-gray-500 leading-relaxed">
                  Displays interactive frames that animate beautifully as the user scrolls down the page.
                </span>
              </button>

              <button
                type="button"
                onClick={() => setSettings({
                  ...settings,
                  hero: { ...settings.hero, useScrollEffect: false }
                })}
                className={cn(
                  "p-5 rounded-xl border text-left transition-all flex flex-col space-y-2 cursor-pointer",
                  settings.hero.useScrollEffect === false
                    ? "bg-white border-green-600 ring-2 ring-green-100 shadow-sm"
                    : "bg-white border-gray-100 hover:border-gray-200"
                )}
              >
                <span className="font-bold text-sm text-gray-900">Normal Hero Slider</span>
                <span className="text-xs text-gray-500 leading-relaxed">
                  Displays a clean, classic hero section with a sliding gallery of the uploaded images.
                </span>
              </button>
            </div>
          </div>

          <hr className="border-gray-100" />

          {/* Text Content */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 flex items-center space-x-2">
                  <Type className="h-3 w-3" />
                  <span>Small Tagline</span>
                </label>
                <input
                  type="text"
                  value={settings.hero.tagline}
                  onChange={(e) => setSettings({
                    ...settings,
                    hero: { ...settings.hero, tagline: e.target.value }
                  })}
                  className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-green-500 outline-none transition-all font-medium"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 flex items-center space-x-2">
                  <Type className="h-3 w-3" />
                  <span>Main Heading</span>
                </label>
                <textarea
                  value={settings.hero.title}
                  rows={2}
                  onChange={(e) => setSettings({
                    ...settings,
                    hero: { ...settings.hero, title: e.target.value }
                  })}
                  className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-green-500 outline-none transition-all font-bold text-lg"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 flex items-center space-x-2">
                <Info className="h-3 w-3" />
                <span>Description Text</span>
              </label>
              <textarea
                value={settings.hero.description}
                rows={5}
                onChange={(e) => setSettings({
                  ...settings,
                  hero: { ...settings.hero, description: e.target.value }
                })}
                className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-green-500 outline-none transition-all text-sm leading-relaxed"
              />
            </div>
          </div>

          <hr className="border-gray-100" />

          {/* Image Gallery */}
          <div className="space-y-6">
            <div>
              <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center space-x-2">
                <ImageIcon className="h-3 w-3" />
                <span>Image Gallery (Slider)</span>
              </h3>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                {settings.hero.images.map((url, idx) => (
                  <div key={idx} className="relative group aspect-video rounded-2xl overflow-hidden border border-gray-100">
                    <img src={url} alt={`Slide ${idx + 1}`} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <button 
                        onClick={() => removeImage(idx)}
                        className="bg-white/20 hover:bg-red-500 text-white p-2 rounded-full transition-colors"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="absolute top-2 left-2 bg-white/90 backdrop-blur px-2 py-0.5 rounded-lg text-[8px] font-bold text-gray-900">
                      #{idx + 1}
                    </div>
                  </div>
                ))}
                <button 
                  onClick={() => imageInputRef.current?.focus()}
                  className="aspect-video rounded-2xl border-2 border-dashed border-gray-100 flex items-center justify-center bg-gray-50/50 hover:bg-gray-100 hover:border-green-200 transition-all group"
                >
                  <p className="text-[10px] text-gray-400 font-bold uppercase group-hover:text-green-600 transition-colors">Add Image Below</p>
                </button>
              </div>

              <div className="space-y-4">
                <div className="max-w-md">
                  <ImageUploader 
                    label="Upload Image to Gallery" 
                    onUploadSuccess={(url) => {
                      setSettings({
                        ...settings,
                        hero: {
                          ...settings.hero,
                          images: [...settings.hero.images, url]
                        }
                      });
                    }}
                    folder="gallery"
                  />
                </div>
                
                <div className="flex gap-2">
                  <input
                    ref={imageInputRef}
                    type="text"
                    placeholder="Or paste direct image URL here..."
                    value={newImageUrl}
                    onChange={(e) => setNewImageUrl(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addImage()}
                    className="flex-1 px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-green-500 outline-none transition-all text-xs"
                  />
                  <button
                    onClick={addImage}
                    className="bg-green-100 hover:bg-green-200 text-green-700 px-6 rounded-xl transition-all flex items-center space-x-2 font-bold text-xs"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Add Image URL</span>
                  </button>
                </div>
              </div>
              <p className="mt-2 text-[10px] text-gray-400">
                Tip: Add multiple images to enable an automatic sliding gallery on the home page.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section Editor */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="bg-gray-50 px-8 py-4 border-b border-gray-100 flex items-center space-x-3">
          <div className="bg-amber-100 p-2 rounded-lg">
            <Layout className="h-5 w-5 text-amber-600" />
          </div>
          <h2 className="font-bold text-gray-900 uppercase tracking-widest text-xs">Features (Why Choose Us)</h2>
        </div>

        <div className="p-8 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 flex items-center space-x-2">
                <Type className="h-3 w-3" />
                <span>Section Tagline</span>
              </label>
              <input
                type="text"
                value={settings.featuresSection?.tagline || ''}
                onChange={(e) => setSettings({
                  ...settings,
                  featuresSection: { ...(settings.featuresSection || DEFAULT_SETTINGS.featuresSection), tagline: e.target.value }
                })}
                className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-amber-500 outline-none transition-all font-medium"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 flex items-center space-x-2">
                <Type className="h-3 w-3" />
                <span>Section Headline</span>
              </label>
              <input
                type="text"
                value={settings.featuresSection?.headline || ''}
                onChange={(e) => setSettings({
                  ...settings,
                  featuresSection: { ...(settings.featuresSection || DEFAULT_SETTINGS.featuresSection), headline: e.target.value }
                })}
                className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-amber-500 outline-none transition-all font-bold"
              />
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4">Edit Feature Cards</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(settings.featuresSection?.features || DEFAULT_SETTINGS.featuresSection.features).map((feature, idx) => (
                <div key={idx} className="p-6 bg-gray-50 rounded-2xl border border-gray-100 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-amber-600 uppercase">Feature #{idx + 1}</span>
                  </div>
                  <div>
                    <label className="block text-[8px] font-bold text-gray-400 uppercase mb-1">Title</label>
                    <input
                      type="text"
                      value={feature.title}
                      onChange={(e) => {
                        const currentFeatures = settings.featuresSection?.features || DEFAULT_SETTINGS.featuresSection.features;
                        const newFeatures = [...currentFeatures];
                        newFeatures[idx] = { ...feature, title: e.target.value };
                        setSettings({
                          ...settings,
                          featuresSection: { ...(settings.featuresSection || DEFAULT_SETTINGS.featuresSection), features: newFeatures }
                        });
                      }}
                      className="w-full px-3 py-2 bg-white border border-gray-100 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none transition-all text-sm font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[8px] font-bold text-gray-400 uppercase mb-1">Description</label>
                    <textarea
                      rows={2}
                      value={feature.description}
                      onChange={(e) => {
                        const currentFeatures = settings.featuresSection?.features || DEFAULT_SETTINGS.featuresSection.features;
                        const newFeatures = [...currentFeatures];
                        newFeatures[idx] = { ...feature, description: e.target.value };
                        setSettings({
                          ...settings,
                          featuresSection: { ...(settings.featuresSection || DEFAULT_SETTINGS.featuresSection), features: newFeatures }
                        });
                      }}
                      className="w-full px-3 py-2 bg-white border border-gray-100 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none transition-all text-xs"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* About Section Editor */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="bg-gray-50 px-8 py-4 border-b border-gray-100 flex items-center space-x-3">
          <div className="bg-blue-100 p-2 rounded-lg">
            <Layout className="h-5 w-5 text-blue-600" />
          </div>
          <h2 className="font-bold text-gray-900 uppercase tracking-widest text-xs">About Section (Grow With Us)</h2>
        </div>

        <div className="p-8 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Section Tagline</label>
                <input
                  type="text"
                  value={settings.aboutSection?.tagline || ''}
                  onChange={(e) => setSettings({
                    ...settings,
                    aboutSection: { ...(settings.aboutSection || DEFAULT_SETTINGS.aboutSection), tagline: e.target.value }
                  })}
                  className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Headline</label>
                <textarea
                  rows={2}
                  value={settings.aboutSection?.headline || ''}
                  onChange={(e) => setSettings({
                    ...settings,
                    aboutSection: { ...(settings.aboutSection || DEFAULT_SETTINGS.aboutSection), headline: e.target.value }
                  })}
                  className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-bold"
                />
              </div>
              <div className="space-y-3">
                <ImageUploader 
                  label="Upload About Section Image" 
                  currentImageUrl={settings.aboutSection?.imageUrl || ''} 
                  onUploadSuccess={(url) => setSettings({
                    ...settings,
                    aboutSection: { ...(settings.aboutSection || DEFAULT_SETTINGS.aboutSection), imageUrl: url }
                  })} 
                  onClear={() => setSettings({
                    ...settings,
                    aboutSection: { ...(settings.aboutSection || DEFAULT_SETTINGS.aboutSection), imageUrl: '' }
                  })}
                  folder="about"
                />
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest">Or Paste Direct Image URL</label>
                  <input
                    type="text"
                    value={settings.aboutSection?.imageUrl || ''}
                    onChange={(e) => setSettings({
                      ...settings,
                      aboutSection: { ...(settings.aboutSection || DEFAULT_SETTINGS.aboutSection), imageUrl: e.target.value }
                    })}
                    className="w-full px-4 py-2.5 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-xs"
                    placeholder="https://..."
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Description</label>
                <textarea
                  rows={5}
                  value={settings.aboutSection?.description || ''}
                  onChange={(e) => setSettings({
                    ...settings,
                    aboutSection: { ...(settings.aboutSection || DEFAULT_SETTINGS.aboutSection), description: e.target.value }
                  })}
                  className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm leading-relaxed"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Primary Button</label>
                  <input
                    type="text"
                    value={settings.aboutSection?.primaryButtonText || ''}
                    onChange={(e) => setSettings({
                      ...settings,
                      aboutSection: { ...(settings.aboutSection || DEFAULT_SETTINGS.aboutSection), primaryButtonText: e.target.value }
                    })}
                    className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Secondary Button</label>
                  <input
                    type="text"
                    value={settings.aboutSection?.secondaryButtonText || ''}
                    onChange={(e) => setSettings({
                      ...settings,
                      aboutSection: { ...(settings.aboutSection || DEFAULT_SETTINGS.aboutSection), secondaryButtonText: e.target.value }
                    })}
                    className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-xs"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Section Editor */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="bg-gray-50 px-8 py-4 border-b border-gray-100 flex items-center space-x-3">
          <div className="bg-purple-100 p-2 rounded-lg">
            <Layout className="h-5 w-5 text-purple-600" />
          </div>
          <h2 className="font-bold text-gray-900 uppercase tracking-widest text-xs">Stats Section</h2>
        </div>

        <div className="p-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {(settings.statsSection?.stats || DEFAULT_SETTINGS.statsSection.stats).map((stat, idx) => (
              <div key={idx} className="p-4 bg-gray-50 rounded-2xl border border-gray-100 space-y-3">
                <span className="text-[8px] font-bold text-purple-600 uppercase">Stat #{idx + 1}</span>
                <div>
                  <label className="block text-[8px] font-bold text-gray-400 uppercase mb-1">Value (e.g. 500+)</label>
                  <input
                    type="text"
                    value={stat.value}
                    onChange={(e) => {
                      const currentStats = settings.statsSection?.stats || DEFAULT_SETTINGS.statsSection.stats;
                      const newStats = [...currentStats];
                      newStats[idx] = { ...stat, value: e.target.value };
                      setSettings({
                        ...settings,
                        statsSection: { ...(settings.statsSection || DEFAULT_SETTINGS.statsSection), stats: newStats }
                      });
                    }}
                    className="w-full px-3 py-2 bg-white border border-gray-100 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none transition-all font-bold text-sm"
                  />
                </div>
                <div>
                  <label className="block text-[8px] font-bold text-gray-400 uppercase mb-1">Label</label>
                  <input
                    type="text"
                    value={stat.label}
                    onChange={(e) => {
                      const currentStats = settings.statsSection?.stats || DEFAULT_SETTINGS.statsSection.stats;
                      const newStats = [...currentStats];
                      newStats[idx] = { ...stat, label: e.target.value };
                      setSettings({
                        ...settings,
                        statsSection: { ...(settings.statsSection || DEFAULT_SETTINGS.statsSection), stats: newStats }
                      });
                    }}
                    className="w-full px-3 py-2 bg-white border border-gray-100 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none transition-all text-[10px]"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* AboutUs Section (About Page) */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="bg-gray-50 px-8 py-4 border-b border-gray-100 flex items-center space-x-3">
          <div className="bg-green-100 p-2 rounded-lg">
            <Layout className="h-5 w-5 text-green-600" />
          </div>
          <h2 className="font-bold text-gray-900 uppercase tracking-widest text-xs">About Page Content</h2>
        </div>

        <div className="p-8 space-y-8">
          <div className="space-y-6">
            <h3 className="text-sm font-bold text-gray-900">Promise Sub-section</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase mb-2">Tagline</label>
                  <input
                    type="text"
                    value={settings.aboutUsSection?.promise?.tagline || ''}
                    onChange={(e) => setSettings({
                      ...settings,
                      aboutUsSection: { ...settings.aboutUsSection, promise: { ...settings.aboutUsSection.promise, tagline: e.target.value } }
                    })}
                    className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-green-500 outline-none transition-all text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase mb-2">Headline</label>
                  <textarea
                    rows={2}
                    value={settings.aboutUsSection?.promise?.headline || ''}
                    onChange={(e) => setSettings({
                      ...settings,
                      aboutUsSection: { ...settings.aboutUsSection, promise: { ...settings.aboutUsSection.promise, headline: e.target.value } }
                    })}
                    className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-green-500 outline-none transition-all text-sm font-bold"
                  />
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase mb-2">Description</label>
                  <textarea
                    rows={4}
                    value={settings.aboutUsSection?.promise?.description || ''}
                    onChange={(e) => setSettings({
                      ...settings,
                      aboutUsSection: { ...settings.aboutUsSection, promise: { ...settings.aboutUsSection.promise, description: e.target.value } }
                    })}
                    className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-green-500 outline-none transition-all text-xs leading-relaxed"
                  />
                </div>
                <div className="space-y-3">
                  <ImageUploader 
                    label="Upload Promise Section Image" 
                    currentImageUrl={settings.aboutUsSection?.promise?.imageUrl || ''} 
                    onUploadSuccess={(url) => setSettings({
                      ...settings,
                      aboutUsSection: { ...settings.aboutUsSection, promise: { ...settings.aboutUsSection.promise, imageUrl: url } }
                    })} 
                    onClear={() => setSettings({
                      ...settings,
                      aboutUsSection: { ...settings.aboutUsSection, promise: { ...settings.aboutUsSection.promise, imageUrl: '' } }
                    })}
                    folder="promise"
                  />
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest">Or Paste Direct Image URL</label>
                    <input
                      type="text"
                      value={settings.aboutUsSection?.promise?.imageUrl || ''}
                      onChange={(e) => setSettings({
                        ...settings,
                        aboutUsSection: { ...settings.aboutUsSection, promise: { ...settings.aboutUsSection.promise, imageUrl: e.target.value } }
                      })}
                      className="w-full px-4 py-2.5 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-green-500 outline-none transition-all text-xs"
                      placeholder="https://..."
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <hr className="border-gray-100" />

          <div className="space-y-6">
            <h3 className="text-sm font-bold text-gray-900">Vision Sub-section</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-2">Headline</label>
                <input
                  type="text"
                  value={settings.aboutUsSection?.vision?.headline || ''}
                  onChange={(e) => setSettings({
                    ...settings,
                    aboutUsSection: { ...settings.aboutUsSection, vision: { ...settings.aboutUsSection.vision, headline: e.target.value } }
                  })}
                  className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-green-500 outline-none transition-all text-sm font-bold"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-2">Description (Quote)</label>
                <textarea
                  rows={3}
                  value={settings.aboutUsSection?.vision?.description || ''}
                  onChange={(e) => setSettings({
                    ...settings,
                    aboutUsSection: { ...settings.aboutUsSection, vision: { ...settings.aboutUsSection.vision, description: e.target.value } }
                  })}
                  className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-green-500 outline-none transition-all text-xs italic"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Products Section Header Editor */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="bg-gray-50 px-8 py-4 border-b border-gray-100 flex items-center space-x-3">
          <div className="bg-blue-100 p-2 rounded-lg">
            <Layout className="h-5 w-5 text-blue-600" />
          </div>
          <h2 className="font-bold text-gray-900 uppercase tracking-widest text-xs">Products Page Header</h2>
        </div>

        <div className="p-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase mb-2">Tagline</label>
              <input
                type="text"
                value={settings.productsSection?.tagline || ''}
                onChange={(e) => setSettings({
                  ...settings,
                  productsSection: { ...settings.productsSection, tagline: e.target.value }
                })}
                className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-xs"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase mb-2">Headline</label>
              <input
                type="text"
                value={settings.productsSection?.headline || ''}
                onChange={(e) => setSettings({
                  ...settings,
                  productsSection: { ...settings.productsSection, headline: e.target.value }
                })}
                className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm font-bold"
              />
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase mb-2">Description</label>
            <textarea
              rows={2}
              value={settings.productsSection?.description || ''}
              onChange={(e) => setSettings({
                ...settings,
                productsSection: { ...settings.productsSection, description: e.target.value }
              })}
              className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-xs"
            />
          </div>
        </div>
      </div>

      {/* Invest Section Header Editor */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="bg-gray-50 px-8 py-4 border-b border-gray-100 flex items-center space-x-3">
          <div className="bg-indigo-100 p-2 rounded-lg">
            <Layout className="h-5 w-5 text-indigo-600" />
          </div>
          <h2 className="font-bold text-gray-900 uppercase tracking-widest text-xs">Invest Page Header</h2>
        </div>

        <div className="p-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase mb-2">Tagline</label>
              <input
                type="text"
                value={settings.investSection?.tagline || ''}
                onChange={(e) => setSettings({
                  ...settings,
                  investSection: { ...settings.investSection, tagline: e.target.value }
                })}
                className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-xs"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase mb-2">Headline</label>
              <input
                type="text"
                value={settings.investSection?.headline || ''}
                onChange={(e) => setSettings({
                  ...settings,
                  investSection: { ...settings.investSection, headline: e.target.value }
                })}
                className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm font-bold"
              />
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase mb-2">Description</label>
            <textarea
              rows={2}
              value={settings.investSection?.description || ''}
              onChange={(e) => setSettings({
                ...settings,
                investSection: { ...settings.investSection, description: e.target.value }
              })}
              className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-xs"
            />
          </div>
        </div>
      </div>

      {/* Contact Section Editor */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="bg-gray-50 px-8 py-4 border-b border-gray-100 flex items-center space-x-3">
          <div className="bg-orange-100 p-2 rounded-lg">
            <Layout className="h-5 w-5 text-orange-600" />
          </div>
          <h2 className="font-bold text-gray-900 uppercase tracking-widest text-xs">Contact Page Content</h2>
        </div>

        <div className="p-8 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-2">Tagline</label>
                <input
                  type="text"
                  value={settings.contactSection?.tagline || ''}
                  onChange={(e) => setSettings({
                    ...settings,
                    contactSection: { ...settings.contactSection, tagline: e.target.value }
                  })}
                  className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-orange-500 outline-none transition-all text-xs"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-2">Headline</label>
                <input
                  type="text"
                  value={settings.contactSection?.headline || ''}
                  onChange={(e) => setSettings({
                    ...settings,
                    contactSection: { ...settings.contactSection, headline: e.target.value }
                  })}
                  className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-orange-500 outline-none transition-all text-sm font-bold"
                />
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase mb-2">Description</label>
              <textarea
                rows={4}
                value={settings.contactSection?.description || ''}
                onChange={(e) => setSettings({
                  ...settings,
                  contactSection: { ...settings.contactSection, description: e.target.value }
                })}
                className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-orange-500 outline-none transition-all text-xs"
              />
            </div>
          </div>

          <hr className="border-gray-100" />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Location */}
            <div className="p-6 bg-gray-50 rounded-2xl space-y-4">
              <span className="text-[10px] font-bold text-orange-600 uppercase">Location Info</span>
              <div>
                <label className="block text-[8px] font-bold text-gray-400 uppercase mb-1">Title</label>
                <input
                  type="text"
                  value={settings.contactSection?.info?.location?.title || ''}
                  onChange={(e) => setSettings({
                    ...settings,
                    contactSection: { ...settings.contactSection, info: { ...settings.contactSection.info, location: { ...settings.contactSection.info.location, title: e.target.value } } }
                  })}
                  className="w-full px-3 py-2 bg-white border border-gray-100 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none transition-all text-xs font-bold"
                />
              </div>
              <div>
                <label className="block text-[8px] font-bold text-gray-400 uppercase mb-1">Text</label>
                <textarea
                  rows={2}
                  value={settings.contactSection?.info?.location?.text || ''}
                  onChange={(e) => setSettings({
                    ...settings,
                    contactSection: { ...settings.contactSection, info: { ...settings.contactSection.info, location: { ...settings.contactSection.info.location, text: e.target.value } } }
                  })}
                  className="w-full px-3 py-2 bg-white border border-gray-100 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none transition-all text-[10px]"
                />
              </div>
            </div>

            {/* WhatsApp */}
            <div className="p-6 bg-gray-50 rounded-2xl space-y-4">
              <span className="text-[10px] font-bold text-orange-600 uppercase">WhatsApp Info</span>
              <div>
                <label className="block text-[8px] font-bold text-gray-400 uppercase mb-1">Title</label>
                <input
                  type="text"
                  value={settings.contactSection?.info?.whatsapp?.title || ''}
                  onChange={(e) => setSettings({
                    ...settings,
                    contactSection: { ...settings.contactSection, info: { ...settings.contactSection.info, whatsapp: { ...settings.contactSection.info.whatsapp, title: e.target.value } } }
                  })}
                  className="w-full px-3 py-2 bg-white border border-gray-100 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none transition-all text-xs font-bold"
                />
              </div>
              <div>
                <label className="block text-[8px] font-bold text-gray-400 uppercase mb-1">Value (Phone Number)</label>
                <input
                  type="text"
                  value={settings.contactSection?.info?.whatsapp?.text || ''}
                  onChange={(e) => setSettings({
                    ...settings,
                    contactSection: { ...settings.contactSection, info: { ...settings.contactSection.info, whatsapp: { ...settings.contactSection.info.whatsapp, text: e.target.value } } }
                  })}
                  className="w-full px-3 py-2 bg-white border border-gray-100 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none transition-all text-[10px]"
                />
              </div>
            </div>

            {/* Email */}
            <div className="p-6 bg-gray-50 rounded-2xl space-y-4">
              <span className="text-[10px] font-bold text-orange-600 uppercase">Email Info</span>
              <div>
                <label className="block text-[8px] font-bold text-gray-400 uppercase mb-1">Title</label>
                <input
                  type="text"
                  value={settings.contactSection?.info?.email?.title || ''}
                  onChange={(e) => setSettings({
                    ...settings,
                    contactSection: { ...settings.contactSection, info: { ...settings.contactSection.info, email: { ...settings.contactSection.info.email, title: e.target.value } } }
                  })}
                  className="w-full px-3 py-2 bg-white border border-gray-100 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none transition-all text-xs font-bold"
                />
              </div>
              <div>
                <label className="block text-[8px] font-bold text-gray-400 uppercase mb-1">Value (Email Address)</label>
                <input
                  type="email"
                  value={settings.contactSection?.info?.email?.text || ''}
                  onChange={(e) => setSettings({
                    ...settings,
                    contactSection: { ...settings.contactSection, info: { ...settings.contactSection.info, email: { ...settings.contactSection.info.email, text: e.target.value } } }
                  })}
                  className="w-full px-3 py-2 bg-white border border-gray-100 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none transition-all text-[10px]"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* FAQ Section Editor */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="bg-gray-50 px-8 py-4 border-b border-gray-100 flex items-center space-x-3">
          <div className="bg-gray-200 p-2 rounded-lg">
            <Layout className="h-5 w-5 text-gray-600" />
          </div>
          <h2 className="font-bold text-gray-900 uppercase tracking-widest text-xs">FAQ Page Content</h2>
        </div>

        <div className="p-8 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase mb-2">Headline</label>
              <input
                type="text"
                value={settings.faqSection?.headline || ''}
                onChange={(e) => setSettings({
                  ...settings,
                  faqSection: { ...settings.faqSection, headline: e.target.value }
                })}
                className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-gray-500 outline-none transition-all text-sm font-bold"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase mb-2">Description</label>
              <textarea
                rows={2}
                value={settings.faqSection?.description || ''}
                onChange={(e) => setSettings({
                  ...settings,
                  faqSection: { ...settings.faqSection, description: e.target.value }
                })}
                className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-gray-500 outline-none transition-all text-xs"
              />
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-bold text-gray-900">Manage FAQs</h3>
            <div className="space-y-4">
              {(settings.faqSection?.faqs || []).map((faq, idx) => (
                <div key={idx} className="p-4 bg-gray-50 rounded-2xl border border-gray-100 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-gray-500 uppercase">Question #{idx + 1}</span>
                    <button 
                      onClick={() => {
                        const newFaqs = settings.faqSection.faqs.filter((_, i) => i !== idx);
                        setSettings({ ...settings, faqSection: { ...settings.faqSection, faqs: newFaqs } });
                      }}
                      className="text-red-500 hover:text-red-700 p-1"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <input
                    type="text"
                    value={faq.question}
                    placeholder="Question"
                    onChange={(e) => {
                      const newFaqs = [...settings.faqSection.faqs];
                      newFaqs[idx] = { ...faq, question: e.target.value };
                      setSettings({ ...settings, faqSection: { ...settings.faqSection, faqs: newFaqs } });
                    }}
                    className="w-full px-3 py-2 bg-white border border-gray-100 rounded-lg outline-none text-xs font-bold"
                  />
                  <textarea
                    rows={2}
                    value={faq.answer}
                    placeholder="Answer"
                    onChange={(e) => {
                      const newFaqs = [...settings.faqSection.faqs];
                      newFaqs[idx] = { ...faq, answer: e.target.value };
                      setSettings({ ...settings, faqSection: { ...settings.faqSection, faqs: newFaqs } });
                    }}
                    className="w-full px-3 py-2 bg-white border border-gray-100 rounded-lg outline-none text-[10px]"
                  />
                </div>
              ))}
              <button
                onClick={() => {
                  const newFaqs = [...(settings.faqSection?.faqs || []), { question: '', answer: '' }];
                  setSettings({ ...settings, faqSection: { ...(settings.faqSection || DEFAULT_SETTINGS.faqSection), faqs: newFaqs } });
                }}
                className="w-full py-3 border-2 border-dashed border-gray-200 rounded-2xl text-gray-400 hover:border-gray-300 hover:text-gray-500 transition-all text-xs font-bold"
              >
                + Add New FAQ
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
