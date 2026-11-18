import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence, useScroll, useMotionValueEvent, useInView } from 'motion/react';
import { Leaf, TrendingUp, ShieldCheck, ShoppingBag, ArrowRight, Heart, Zap, CheckCircle } from 'lucide-react';
import { FARM_NAME, FARM_TAGLINE } from '../constants';
import { cn } from '../lib/utils';
import { db } from '../firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { SiteSettings } from '../types';
import TypingText from '../components/TypingText';
import { useLanguage } from '../lib/LanguageContext';
import { DEFAULT_SITE_SETTINGS, mergeSiteSettings, toBengaliDigits, toEnglishDigits } from '../lib/siteSettingsDefaults';

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

function StatCounter({ value, label, index, isBn }: { value: string; label: string; index: number; isBn?: boolean; key?: any }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });

  const normalizedEnValue = toEnglishDigits(value || '');
  const match = normalizedEnValue.match(/^(\d+)(.*)$/);
  const hasLeadingNumber = Boolean(match);
  const num = match ? parseInt(match[1], 10) : NaN;
  const rawSuffix = match ? match[2] : value;
  const suffix = isBn ? toBengaliDigits(rawSuffix) : toEnglishDigits(rawSuffix);

  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!isInView || !hasLeadingNumber || isNaN(num)) return;
    let startTime: number;
    let animationFrameId: number;
    const duration = 1600;

    const updateCount = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const easeProgress = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      setCount(Math.floor(easeProgress * num));

      if (progress < 1) {
        animationFrameId = requestAnimationFrame(updateCount);
      } else {
        setCount(num);
      }
    };

    animationFrameId = requestAnimationFrame(updateCount);
    return () => cancelAnimationFrame(animationFrameId);
  }, [isInView, hasLeadingNumber, num]);

  const formattedCount = isBn ? toBengaliDigits(String(count)) : String(count);
  const fallbackDisplay = isBn ? toBengaliDigits(value) : toEnglishDigits(value);

  return (
    <motion.div 
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.1, duration: 0.5 }}
      className="relative group p-[2px] rounded-[24px] sm:rounded-[32px] overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300"
    >
      {/* Dynamic Animated Gradient Stroke Effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-green-500 via-emerald-400 to-amber-500 rounded-[24px] sm:rounded-[32px] opacity-40 group-hover:opacity-100 transition-all duration-700 blur-[2px] animate-pulse"></div>
      
      <div className="relative bg-[#FFFFFF] px-3 sm:px-3 md:px-5 lg:px-6 py-5 sm:py-6 md:py-8 rounded-[22px] sm:rounded-[26px] md:rounded-[30px] text-center h-full flex flex-col justify-center border border-green-100/60">
        <div className="text-2xl sm:text-2xl md:text-3xl lg:text-4xl xl:text-5xl font-black text-[#1A2E26] mb-1.5 sm:mb-2 tracking-tight bg-gradient-to-r from-[#1A2E26] via-green-800 to-[#1A2E26] bg-clip-text text-transparent">
          {!hasLeadingNumber || isNaN(num) ? fallbackDisplay : `${formattedCount}${suffix}`}
        </div>
        <div className="text-gray-500 text-[10px] sm:text-[10px] md:text-xs font-bold uppercase tracking-[0.1em] md:tracking-[0.16em]">{label}</div>
      </div>
    </motion.div>
  );
}

export default function Home() {
  const { t, language } = useLanguage();
  const isBn = language === 'bn';
  const pick = (enVal?: string, bnVal?: string, fallback?: string) =>
    isBn
      ? (bnVal && bnVal.trim() ? bnVal : fallback || enVal || '')
      : (enVal && enVal.trim() ? enVal : fallback || bnVal || '');
  const [settings, setSettings] = useState<SiteSettings>(DEFAULT_SITE_SETTINGS);
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

  // Update canvas internal resolution when dimensions change
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || dimensions.width === 0 || dimensions.height === 0) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = dimensions.width * dpr;
    canvas.height = dimensions.height * dpr;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.scale(dpr, dpr);
      // Immediately draw the current frame to avoid a flash of white during initial layout
      const img = imagesRef.current[frameIndex];
      if (img) {
        drawImageProp(ctx, img, 0, 0, dimensions.width, dimensions.height);
      }
    }
  }, [dimensions]);

  // Handle drawing when frameIndex changes
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || dimensions.width === 0 || dimensions.height === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = imagesRef.current[frameIndex];
    if (img) {
      drawImageProp(ctx, img, 0, 0, dimensions.width, dimensions.height);
    } else {
      // If the target frame is not loaded yet, we DO NOT clear the canvas or modify width/height.
      // This leaves the previous frame completely visible, preventing any blank white/flicker.
      const tempImg = new Image();
      tempImg.src = `/hero-frames/ezgif-frame-${String(frameIndex).padStart(3, '0')}.jpg`;
      tempImg.onload = () => {
        imagesRef.current[frameIndex] = tempImg;
        const currentCanvas = canvasRef.current;
        if (currentCanvas) {
          const currentCtx = currentCanvas.getContext('2d');
          if (currentCtx) {
            drawImageProp(currentCtx, tempImg, 0, 0, dimensions.width, dimensions.height);
          }
        }
      };
    }
  }, [frameIndex, dimensions.width, dimensions.height]);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'site'), (docSnap) => {
      if (docSnap.exists()) {
        setSettings(mergeSiteSettings(docSnap.data() as SiteSettings));
      } else {
        setSettings(DEFAULT_SITE_SETTINGS);
      }
    });
    return unsub;
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
      title: t('features.natural'),
      description: t('features.naturalDesc'),
      icon: Leaf,
      color: "bg-green-50 text-green-600"
    },
    {
      title: t('features.animals'),
      description: t('features.animalsDesc'),
      icon: Heart,
      color: "bg-red-50 text-red-600"
    },
    {
      title: t('features.fresh'),
      description: t('features.freshDesc'),
      icon: Zap,
      color: "bg-blue-50 text-blue-600"
    },
    {
      title: t('features.trusted'),
      description: t('features.trustedDesc'),
      icon: CheckCircle,
      color: "bg-amber-50 text-amber-600"
    }
  ];

  const displayFeatures = settings?.featuresSection?.features.map((f, i) => ({
    ...f,
    title: pick(f.title, f.titleBn, features[i]?.title),
    description: pick(f.description, f.descriptionBn, features[i]?.description),
    icon: IconMap[f.iconName] || features[i]?.icon || CheckCircle,
    color: features[i]?.color || "bg-green-50 text-green-600"
  })) || features;

  const activeRotatingTitles = isBn
    ? (settings?.hero?.titlesBn && settings.hero.titlesBn.some(s => s?.trim())
        ? settings.hero.titlesBn.filter(Boolean)
        : DEFAULT_SITE_SETTINGS.hero.titlesBn)
    : (settings?.hero?.titles && settings.hero.titles.some(s => s?.trim())
        ? settings.hero.titles.filter(Boolean)
        : DEFAULT_SITE_SETTINGS.hero.titles);

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
        <div className={cn(
          "relative min-h-[75vh] md:min-h-[85vh] flex items-center overflow-hidden pt-4 md:pt-6 transition-colors duration-300",
          settings?.hero?.useScrollEffect === false && settings.hero.bgImageUrl ? "bg-[#11221A]" : "bg-[#FDFCF7]"
        )}>
          {/* Background image option when scroll effect is off and bgImageUrl is present */}
          {settings?.hero?.useScrollEffect === false && settings.hero.bgImageUrl && (
            <div className="absolute inset-0 z-0">
              <img 
                src={settings.hero.bgImageUrl} 
                alt="Hero Background" 
                className="w-full h-full object-cover"
                style={{ opacity: (settings.hero.bgImageOpacity ?? 40) / 100 }}
                referrerPolicy="no-referrer"
              />
              {/* Dark overlay for a darker tone and high readability */}
              <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/65 to-black/45 mix-blend-multiply" />
              <div className="absolute inset-0 bg-[#11221A]/30" />
            </div>
          )}

          <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[radial-gradient(#1A2E26_1px,transparent_1px)] [background-size:16px_16px] z-0" />
          
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12 w-full relative z-10">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
              {/* Left Column: Text Content */}
              <div className="lg:col-span-7 space-y-8 text-left relative z-10">
                <motion.span 
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={cn(
                    "text-xs font-bold tracking-[0.2em] uppercase block",
                    settings?.hero?.useScrollEffect === false && settings.hero.bgImageUrl ? "text-amber-300" : "text-[#8B735B]"
                  )}
                >
                  {pick(settings?.hero?.tagline, settings?.hero?.taglineBn, t('hero.tagline'))}
                </motion.span>
                
                <motion.h1 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className={cn(
                    "text-4xl sm:text-5xl md:text-6xl font-extrabold leading-[1.1] tracking-tight min-h-[2.2em]",
                    settings?.hero?.useScrollEffect === false && settings.hero.bgImageUrl ? "text-white" : "text-[#1A2E26]"
                  )}
                >
                  <TypingText 
                    text={pick(settings?.hero?.title, settings?.hero?.titleBn, t('hero.title'))} 
                    texts={activeRotatingTitles}
                    interval={settings?.hero?.titleInterval || 4000}
                    speed={30} 
                    delay={400} 
                  />
                </motion.h1>
                
                <motion.p 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className={cn(
                    "text-lg max-w-2xl leading-relaxed",
                    settings?.hero?.useScrollEffect === false && settings.hero.bgImageUrl ? "text-gray-200" : "text-gray-600"
                  )}
                >
                  {pick(settings?.hero?.description, settings?.hero?.descriptionBn, t('hero.desc'))}
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
                    className={cn(
                      "px-8 py-4 rounded-full font-bold text-lg transition-all text-center shadow-md active:scale-95",
                      settings?.hero?.useScrollEffect === false && settings.hero.bgImageUrl
                        ? "bg-green-600 hover:bg-green-500 text-white shadow-green-950/40" 
                        : "bg-[#1A2E26] hover:bg-[#254236] text-white"
                    )}
                  >
                    {t('hero.investBtn')}
                  </a>
                  <a
                    href="#products"
                    onClick={(e) => {
                      e.preventDefault();
                      document.getElementById('products')?.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className={cn(
                      "px-8 py-4 rounded-full font-bold text-lg transition-all text-center active:scale-95",
                      settings?.hero?.useScrollEffect === false && settings.hero.bgImageUrl
                        ? "bg-transparent border-2 border-white/20 hover:border-white hover:bg-white/5 text-white"
                        : "bg-transparent border-2 border-[#1A2E26]/20 hover:border-[#1A2E26] hover:bg-[#1A2E26]/5 text-[#1A2E26]"
                    )}
                  >
                    {t('hero.shopBtn')}
                  </a>
                </motion.div>
              </div>
              
              {/* Right Column: Sliding/Rotating Image Gallery */}
              <div className="lg:col-span-5 relative z-10">
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

      {/* Stats Section with Counting Animations & Dynamic Stroke Effects (2 boxes in one row on mobile, single row on tablet/desktop) */}
      <section className="relative z-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-16 w-full bg-[#FDFCF7]">
        <div className="grid grid-cols-2 sm:grid-flow-col sm:auto-cols-fr gap-3 sm:gap-4 lg:gap-6">
          {(settings?.statsSection?.stats || DEFAULT_SITE_SETTINGS.statsSection.stats).map((stat, idx) => (
            <StatCounter
              key={idx}
              value={pick(stat.value, stat.valueBn, stat.value)}
              label={pick(stat.label, stat.labelBn, idx === 0 ? t('stats.animals') : idx === 1 ? t('stats.soil') : idx === 2 ? t('stats.care') : t('stats.projects'))}
              index={idx}
              isBn={isBn}
            />
          ))}
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="w-full bg-[#FDFCF7] py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-xs font-bold tracking-[0.2em] text-[#8B735B] uppercase mb-4 block">
            {pick(settings?.featuresSection?.tagline, settings?.featuresSection?.taglineBn, t('features.tagline'))}
          </span>
          <h2 className="text-4xl font-bold text-[#1A2E26] mb-4">
            {pick(settings?.featuresSection?.headline, settings?.featuresSection?.headlineBn, t('features.headline'))}
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

    </div>
  );
}
