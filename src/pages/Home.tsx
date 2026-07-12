import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence, useScroll, useMotionValueEvent } from 'motion/react';
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

function drawImageProp(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number
) {
  const imgWidth = img.naturalWidth || img.width;
  const imgHeight = img.naturalHeight || img.height;
  if (!imgWidth || !imgHeight) return;

  const imgRatio = imgWidth / imgHeight;
  const containerRatio = w / h;

  let sx = 0;
  let sy = 0;
  let sWidth = imgWidth;
  let sHeight = imgHeight;

  if (containerRatio > imgRatio) {
    sHeight = imgWidth / containerRatio;
    sy = (imgHeight - sHeight) / 2;
  } else {
    sWidth = imgHeight * containerRatio;
    sx = (imgWidth - sWidth) / 2;
  }

  ctx.drawImage(img, sx, sy, sWidth, sHeight, x, y, w, h);
}

export default function Home() {
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const [frameIndex, setFrameIndex] = useState(1);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const imagesRef = useRef<{ [key: number]: HTMLImageElement }>({});
  const totalFrames = 217;

  // Global window scroll state tracker to force re-renders for live mode readouts
  const [scrollYValue, setScrollYValue] = useState(0);

  // Use framer-motion scroll progress of the container section
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"]
  });

  useMotionValueEvent(scrollYProgress, "change", (latest) => {
    setScrollYValue(latest);
    if (latest > 0.005) {
      const targetFrame = Math.floor(latest * (totalFrames - 1)) + 1;
      setFrameIndex(Math.min(Math.max(targetFrame, 1), totalFrames));
    }
  });

  // Background loading & initialization
  useEffect(() => {
    if (settings && settings.hero?.useScrollEffect === false) {
      setIsLoaded(true);
      return;
    }

    // 1. Load the first frame immediately for instant first paint
    const img1 = new Image();
    img1.src = `/hero-frames/ezgif-frame-001.jpg`;
    img1.onload = () => {
      imagesRef.current[1] = img1;
      
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        const container = canvas.parentElement;
        if (ctx && container) {
          const width = container.clientWidth;
          const height = container.clientHeight;
          const dpr = window.devicePixelRatio || 1;
          canvas.width = width * dpr;
          canvas.height = height * dpr;
          ctx.scale(dpr, dpr);
          drawImageProp(ctx, img1, 0, 0, width, height);
        }
      }

      // 2. Load other frames sequentially to preserve network resources and build cache
      let loadedCount = 1;
      const loadNext = (index: number) => {
        if (settings && settings.hero?.useScrollEffect === false) {
          setIsLoaded(true);
          return;
        }
        if (index > totalFrames) {
          setIsLoaded(true);
          return;
        }
        const img = new Image();
        img.src = `/hero-frames/ezgif-frame-${String(index).padStart(3, '0')}.jpg`;
        img.onload = () => {
          imagesRef.current[index] = img;
          loadedCount++;
          setLoadingProgress(Math.floor((loadedCount / totalFrames) * 100));
          loadNext(index + 1);
        };
        img.onerror = () => {
          // Fallback if a frame is missing
          loadedCount++;
          setLoadingProgress(Math.floor((loadedCount / totalFrames) * 100));
          loadNext(index + 1);
        };
      };
      
      loadNext(2);
    };
  }, [settings?.hero?.useScrollEffect, settings]);

  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  // Handle canvas sizing with a single ResizeObserver
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const container = canvas.parentElement;
    if (!container) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (let entry of entries) {
        const { width, height } = entry.contentRect;
        setDimensions({ width, height });
      }
    });

    resizeObserver.observe(container);

    // Initial size
    setDimensions({
      width: container.clientWidth,
      height: container.clientHeight
    });

    return () => resizeObserver.disconnect();
  }, []);

  // Handle drawing when dimensions or frameIndex changes
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || dimensions.width === 0 || dimensions.height === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = dimensions.width * dpr;
    canvas.height = dimensions.height * dpr;
    ctx.scale(dpr, dpr);

    const img = imagesRef.current[frameIndex];
    if (img) {
      drawImageProp(ctx, img, 0, 0, dimensions.width, dimensions.height);
    } else {
      const tempImg = new Image();
      tempImg.src = `/hero-frames/ezgif-frame-${String(frameIndex).padStart(3, '0')}.jpg`;
      tempImg.onload = () => {
        imagesRef.current[frameIndex] = tempImg;
        // Verify frame index hasn't changed while loading
        const currentCtx = canvas.getContext('2d');
        if (currentCtx) {
          drawImageProp(ctx, tempImg, 0, 0, dimensions.width, dimensions.height);
        }
      };
    }
  }, [frameIndex, dimensions]);

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

  const heroImages = settings?.hero?.images || ['https://images.unsplash.com/photo-1500595046743-cd271d694d30?auto=format&fit=crop&q=80&w=1200'];

  useEffect(() => {
    if (heroImages.length <= 1) return;
    const interval = setInterval(() => {
      setActiveImageIndex((prev) => (prev + 1) % heroImages.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [heroImages.length]);

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
    <div className="flex flex-col">
      {settings?.hero?.useScrollEffect !== false ? (
        /* Scroll-scraped Frame Animation Hero Section */
        <div 
          ref={containerRef} 
          className="relative w-full h-[180vh] bg-[#FDFCF7]"
        >
          <div className="sticky top-0 h-screen w-full overflow-hidden bg-[#FDFCF7]">
            {/* Dynamic Canvas */}
            <canvas
              ref={canvasRef}
              className="absolute inset-0 w-full h-full object-cover animate-fade-in"
            />
          </div>
        </div>
      ) : (
        /* Normal Hero Section (Classic Slider like before) */
        <div className="relative min-h-[90vh] flex items-center bg-[#FDFCF7] overflow-hidden pt-20">
          <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[radial-gradient(#1A2E26_1px,transparent_1px)] [background-size:16px_16px]" />
          
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24 w-full relative z-10">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
              {/* Left Column: Text Content */}
              <div className="lg:col-span-7 space-y-8 text-left">
                <motion.span 
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-xs font-bold tracking-[0.2em] text-[#8B735B] uppercase block"
                >
                  {settings?.hero?.tagline || "SOIL TO SOUL"}
                </motion.span>
                
                <motion.h1 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-[#1A2E26] leading-[1.1] tracking-tight"
                >
                  {settings?.hero?.title || "Fresh Farm Products From Our Farm"}
                </motion.h1>
                
                <motion.p 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="text-lg text-gray-600 max-w-2xl leading-relaxed"
                >
                  {settings?.hero?.description || "Rooted in the philosophy of Soil to Soul. We practice regenerative farming to bring you meat and dairy that nourishes the body and respects the earth."}
                </motion.p>
                
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="flex flex-col sm:flex-row gap-4 pt-4"
                >
                  <a
                    href="#invest"
                    onClick={(e) => {
                      e.preventDefault();
                      document.getElementById('invest')?.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className="bg-[#1A2E26] hover:bg-[#254236] text-white px-8 py-4 rounded-full font-bold text-lg transition-all text-center shadow-md active:scale-95"
                  >
                    Become an Investor
                  </a>
                  <a
                    href="#products"
                    onClick={(e) => {
                      e.preventDefault();
                      document.getElementById('products')?.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className="bg-transparent border-2 border-[#1A2E26]/20 hover:border-[#1A2E26] hover:bg-[#1A2E26]/5 text-[#1A2E26] px-8 py-4 rounded-full font-bold text-lg transition-all text-center active:scale-95"
                  >
                    Explore Shop
                  </a>
                </motion.div>
              </div>
              
              {/* Right Column: Sliding/Rotating Image Gallery */}
              <div className="lg:col-span-5 relative">
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.2, duration: 0.5 }}
                  className="relative aspect-[4/3] rounded-[48px] overflow-hidden shadow-2xl bg-gray-100 border-4 border-white"
                >
                  <AnimatePresence mode="wait">
                    <motion.img
                      key={activeImageIndex}
                      src={heroImages[activeImageIndex]}
                      initial={{ opacity: 0, scale: 1.05 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.6 }}
                      className="absolute inset-0 w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                      alt="AgroVest Farm Slide"
                    />
                  </AnimatePresence>
                  
                  {/* Image Navigation Dots */}
                  {heroImages.length > 1 && (
                    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex space-x-2.5 z-20 bg-black/20 backdrop-blur-md px-4 py-2 rounded-full">
                      {heroImages.map((_, idx) => (
                        <button
                          key={idx}
                          onClick={() => setActiveImageIndex(idx)}
                          className={cn(
                            "w-2 h-2 rounded-full transition-all duration-300 cursor-pointer",
                            idx === activeImageIndex ? "bg-white w-5" : "bg-white/50"
                          )}
                          aria-label={`Go to slide ${idx + 1}`}
                        />
                      ))}
                    </div>
                  )}
                </motion.div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Why Choose Us */}
      <section className="w-full bg-[#FDFCF7] py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
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
      </div>
    </section>

      {/* About Preview */}
      <section className="bg-[#1A2E26] py-24 text-white overflow-hidden w-full">
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
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 w-full">
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
