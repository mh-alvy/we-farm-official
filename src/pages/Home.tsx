import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Leaf, TrendingUp, ShieldCheck, ShoppingBag, ArrowRight, Heart, Zap, CheckCircle } from 'lucide-react';
import { FARM_NAME, FARM_TAGLINE } from '../constants';
import { cn } from '../lib/utils';
import { db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';
import { SiteSettings } from '../types';

const IconMap: { [key: string]: any } = {
  Leaf,
  Heart,
  Zap,
  CheckCircle
};

export default function Home() {
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    async function fetchSettings() {
      const docRef = doc(db, 'settings', 'site');
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setSettings(docSnap.data() as SiteSettings);
      }
    }
    fetchSettings();
  }, []);

  // Automatic sliding logic
  useEffect(() => {
    if (!settings?.hero?.images || settings.hero.images.length <= 1) return;
    
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % settings.hero.images.length);
    }, 5000);

    return () => clearInterval(timer);
  }, [settings?.hero?.images]);

  const features = [
    {
      title: "Natural Farming",
      description: "Regenerative practices that work with nature, not against it.",
      icon: Leaf,
      color: "bg-green-50 text-green-600"
    },
    {
      title: "Healthy Animals",
      description: "Free-range livestock raised on natural diets without hormones.",
      icon: Heart,
      color: "bg-red-50 text-red-600"
    },
    {
      title: "Fresh Products",
      description: "Farm-to-table freshness delivered with care and speed.",
      icon: Zap,
      color: "bg-blue-50 text-blue-600"
    },
    {
      title: "Trusted Farm",
      description: "Transparent practices you can trust, from soil to soul.",
      icon: CheckCircle,
      color: "bg-amber-50 text-amber-600"
    }
  ];

  const displayFeatures = settings?.featuresSection?.features.map((f, i) => ({
    ...f,
    icon: IconMap[f.iconName] || features[i]?.icon || CheckCircle,
    color: features[i]?.color || "bg-green-50 text-green-600"
  })) || features;

  return (
    <div className="space-y-24">
      {/* Hero Section */}
      <section className="relative min-h-[80vh] flex items-center overflow-hidden bg-[#FDFCF7]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
              className="z-10"
            >
              <span className="text-sm font-bold tracking-[0.2em] text-[#8B735B] uppercase mb-4 block">
                {settings?.hero.tagline || FARM_TAGLINE}
              </span>
              <h1 className="text-5xl md:text-7xl font-bold text-[#1A2E26] leading-tight mb-6 whitespace-pre-line">
                {settings?.hero.title || (
                  <>
                    Fresh Farm <br />
                    Products From <br />
                    Our Farm
                  </>
                )}
              </h1>
              <p className="text-lg text-gray-600 mb-10 max-w-lg leading-relaxed">
                {settings?.hero.description || "Rooted in the philosophy of Soil to Soul. We practice regenerative farming to bring you meat and dairy that nourishes the body and respects the earth."}
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <a
                  href="#contact"
                  onClick={(e) => {
                    e.preventDefault();
                    document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="bg-[#1A2E26] hover:bg-[#2A3E36] text-white px-8 py-4 rounded-full font-semibold text-lg transition-all text-center"
                >
                  Contact Us
                </a>
                <a
                  href="#invest"
                  onClick={(e) => {
                    e.preventDefault();
                    document.getElementById('invest')?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="bg-white border border-[#E5E2D9] hover:bg-gray-50 text-[#1A2E26] px-8 py-4 rounded-full font-semibold text-lg transition-all text-center"
                >
                  Invest in {FARM_NAME}
                </a>
              </div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1 }}
              className="relative"
            >
              <div className="rounded-[40px] overflow-hidden shadow-2xl relative aspect-[4/3]">
                <AnimatePresence mode="wait">
                  <motion.img
                    key={currentSlide}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 1 }}
                    src={settings?.hero.images[currentSlide] || "https://images.unsplash.com/photo-1500595046743-cd271d694d30?auto=format&fit=crop&q=80&w=1200"}
                    alt="Fresh farm produce"
                    className="w-full h-full object-cover absolute inset-0"
                    referrerPolicy="no-referrer"
                  />
                </AnimatePresence>
                
                {/* Slider Indicators */}
                {settings?.hero.images && settings.hero.images.length > 1 && (
                  <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex space-x-2 z-20">
                    {settings.hero.images.map((_, idx) => (
                      <button
                        key={idx}
                        onClick={() => setCurrentSlide(idx)}
                        className={cn(
                          "w-2 h-2 rounded-full transition-all",
                          idx === currentSlide ? "bg-white w-6" : "bg-white/40"
                        )}
                      />
                    ))}
                  </div>
                )}
              </div>
              {/* Floating Badge */}
              <div className="absolute -bottom-6 -left-6 bg-white p-6 rounded-3xl shadow-xl flex items-center space-x-4">
                <div className="bg-green-100 p-3 rounded-full">
                  <Leaf className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <div className="text-sm font-bold text-gray-900">100% Natural</div>
                  <div className="text-xs text-gray-500">From our honest soil</div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-xs font-bold tracking-[0.2em] text-[#8B735B] uppercase mb-4 block">
            {settings?.featuresSection?.tagline || "WHY CHOOSE US"}
          </span>
          <h2 className="text-4xl font-bold text-[#1A2E26] mb-4">
            {settings?.featuresSection?.headline || `Why Choose ${FARM_NAME}`}
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {displayFeatures.map((feature, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.1 }}
              className="bg-[#F7F8F2] p-8 rounded-[32px] border border-transparent hover:border-green-100 transition-all text-center"
            >
              <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center mb-6 mx-auto", feature.color)}>
                <feature.icon className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold text-[#1A2E26] mb-3">{feature.title}</h3>
              <p className="text-gray-600 text-sm leading-relaxed">{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* About Preview */}
      <section className="bg-[#1A2E26] py-24 text-white overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div className="order-2 lg:order-1">
              <img
                src={settings?.aboutSection?.imageUrl || "https://images.unsplash.com/photo-1595113316349-9fa4eb24f884?auto=format&fit=crop&q=80&w=1000"}
                alt="Regenerative farming"
                className="rounded-[40px] shadow-2xl"
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="order-1 lg:order-2">
              <span className="text-xs font-bold tracking-[0.2em] text-green-400 uppercase mb-4 block">
                {settings?.aboutSection?.tagline || "GROW WITH US"}
              </span>
              <h2 className="text-4xl md:text-5xl font-bold mb-8 leading-tight">
                {settings?.aboutSection?.headline || "Be Part of the Soil to Soul Movement"}
              </h2>
              <p className="text-lg text-gray-300 mb-10 leading-relaxed">
                {settings?.aboutSection?.description || "We're expanding our pastures and invite you to grow with us. Whether you invest or support, you're helping build a future of honest, regenerative farming for everyone."}
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <a
                  href="#invest"
                  onClick={(e) => {
                    e.preventDefault();
                    document.getElementById('invest')?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="bg-white text-[#1A2E26] hover:bg-gray-100 px-8 py-4 rounded-full font-semibold text-lg transition-all text-center"
                >
                  {settings?.aboutSection?.primaryButtonText || "Become an Investor"}
                </a>
                <a
                  href="#products"
                  onClick={(e) => {
                    e.preventDefault();
                    document.getElementById('products')?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="bg-transparent border border-white/30 hover:bg-white/10 text-white px-8 py-4 rounded-full font-semibold text-lg transition-all text-center"
                >
                  {settings?.aboutSection?.secondaryButtonText || "Support the Farm"}
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center bg-white p-12 rounded-[40px] shadow-sm border border-gray-100">
          {(settings?.statsSection?.stats || [
            { value: '500+', label: 'Happy Animals' },
            { value: '100%', label: 'Natural Soil' },
            { value: '24/7', label: 'Care & Love' },
            { value: '10+', label: 'Active Projects' }
          ]).map((stat, idx) => (
            <div key={idx}>
              <div className="text-4xl font-bold text-[#1A2E26] mb-2">{stat.value}</div>
              <div className="text-gray-500 text-xs uppercase tracking-widest">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
