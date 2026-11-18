import React, { useState, useEffect, useRef } from 'react';
import { collection, addDoc, doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { Product, Order, SiteSettings } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { ShoppingCart, X, CheckCircle2, Plus, Minus } from 'lucide-react';
import { useLanguage } from '../lib/LanguageContext';
import { DEFAULT_SITE_SETTINGS, mergeSiteSettings } from '../lib/siteSettingsDefaults';
import {
  getLocalizedProductName,
  getLocalizedProductDesc,
  getLocalizedUnit,
  formatLocalizedPrice,
  formatLocalizedNumber,
  getFallbackProductImage,
  hasEnglishLetters,
} from '../lib/productTranslations';

export default function Shop() {
  const { language, t } = useLanguage();
  const isBn = language === 'bn';
  const pick = (enVal?: string, bnVal?: string, fallback?: string) =>
    isBn
      ? (bnVal && bnVal.trim() ? bnVal : fallback || enVal || '')
      : (enVal && enVal.trim() ? enVal : fallback || bnVal || '');
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [settings, setSettings] = useState<SiteSettings>(DEFAULT_SITE_SETTINGS);
  const translatedIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const unsubProducts = onSnapshot(collection(db, 'products'), async (querySnapshot) => {
      const rawProducts = querySnapshot.docs.map(d => ({ id: d.id, ...d.data() } as Product));

      // Apply instant local translations for common farm products
      const enrichedProducts = rawProducts.map(p => {
        const computedNameBn = p.nameBn?.trim() || getLocalizedProductName(p, true);
        const computedDescBn = p.descriptionBn?.trim() || getLocalizedProductDesc(p, true);
        return {
          ...p,
          nameBn: computedNameBn,
          descriptionBn: computedDescBn,
        };
      });

      setProducts(enrichedProducts);
      setLoading(false);

      // Check if any custom product still has untranslated English text in nameBn or descriptionBn
      const toTranslate: { index: number; field: 'nameBn' | 'descriptionBn'; text: string }[] = [];
      enrichedProducts.forEach((p, idx) => {
        const key = `${p.id || idx}`;
        if (translatedIdsRef.current.has(key)) return;
        const needsName = hasEnglishLetters(p.nameBn) && p.name?.trim();
        const needsDesc = hasEnglishLetters(p.descriptionBn) && p.description?.trim();
        if (needsName) {
          toTranslate.push({ index: idx, field: 'nameBn', text: p.name.trim() });
        }
        if (needsDesc) {
          toTranslate.push({ index: idx, field: 'descriptionBn', text: p.description.trim() });
        }
        if (needsName || needsDesc) {
          translatedIdsRef.current.add(key);
        }
      });

      if (toTranslate.length > 0) {
        try {
          const res = await fetch('/api/ai/translate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              items: toTranslate.map(item => item.text),
              targetLang: 'bn',
              fieldContext: 'farm product name and description',
            }),
          });
          const data = await res.json();
          if (data.success && Array.isArray(data.translatedItems)) {
            const updated = [...enrichedProducts];
            const patchesByProductId: Record<string, Partial<Product>> = {};

            toTranslate.forEach((item, i) => {
              const translated = data.translatedItems[i];
              if (translated && typeof translated === 'string') {
                updated[item.index] = {
                  ...updated[item.index],
                  [item.field]: translated,
                };
                const pid = updated[item.index].id;
                if (pid) {
                  patchesByProductId[pid] = {
                    ...(patchesByProductId[pid] || {}),
                    [item.field]: translated,
                  };
                }
              }
            });

            setProducts(updated);

            // Persist backfilled translations if current user has permission
            Object.entries(patchesByProductId).forEach(([pid, patch]) => {
              updateDoc(doc(db, 'products', pid), patch).catch(() => {});
            });
          }
        } catch {
          // Instant dictionary fallback is already applied
        }
      }
    });

    const unsubSettings = onSnapshot(doc(db, 'settings', 'site'), (docSnap) => {
      if (docSnap.exists()) {
        setSettings(mergeSiteSettings(docSnap.data() as SiteSettings));
      } else {
        setSettings(DEFAULT_SITE_SETTINGS);
      }
    });

    return () => {
      unsubProducts();
      unsubSettings();
    };
  }, []);

  const handleOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;

    setSubmitting(true);
    try {
      const order: Order = {
        customerName: auth.currentUser?.displayName || 'Guest Customer',
        customerEmail: auth.currentUser?.email || 'guest@example.com',
        productId: selectedProduct.id!,
        productName: selectedProduct.name,
        quantity: quantity,
        totalPrice: selectedProduct.price * quantity,
        status: 'pending',
        date: new Date().toISOString()
      };

      await addDoc(collection(db, 'orders'), order);
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        setSelectedProduct(null);
        setQuantity(1);
      }, 2000);
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
      <div className="text-center mb-16">
        <span className="text-xs font-bold tracking-[0.2em] text-[#8B735B] uppercase mb-4 block">
          {pick(settings?.productsSection?.tagline, settings?.productsSection?.taglineBn, t('shop.tagline'))}
        </span>
        <h1 className="text-4xl md:text-5xl font-bold text-[#1A2E26] mb-4">
          {pick(settings?.productsSection?.headline, settings?.productsSection?.headlineBn, t('shop.headline'))}
        </h1>
        <p className="text-gray-600">
          {pick(settings?.productsSection?.description, settings?.productsSection?.descriptionBn, t('shop.desc'))}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
        {products.map((product) => {
          const displayName = getLocalizedProductName(product, isBn);
          const displayDesc = getLocalizedProductDesc(product, isBn);
          const displayUnit = getLocalizedUnit(product.unit, product.name, isBn);

          return (
            <motion.div
              key={product.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-[32px] overflow-hidden border border-gray-100 shadow-sm hover:shadow-xl transition-all group flex flex-col"
            >
              <div className="h-48 overflow-hidden relative bg-gray-50">
                <img
                  src={product.imageUrl || getFallbackProductImage(product.name)}
                  alt={displayName}
                  onError={(e) => {
                    const target = e.currentTarget;
                    const fallback = getFallbackProductImage(product.name);
                    if (target.src !== fallback) {
                      target.src = fallback;
                    }
                  }}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-[10px] font-bold text-green-700 uppercase tracking-wider shadow-sm">
                  {t('shop.natural')}
                </div>
              </div>
              <div className="p-6 flex-grow flex flex-col">
                <h3 className="text-lg font-bold text-[#1A2E26] mb-1">{displayName}</h3>
                <p className="text-xs text-gray-500 mb-4 line-clamp-2">{displayDesc}</p>
                <div className="text-green-700 font-bold mb-6">
                  {formatLocalizedPrice(product.price, isBn)}
                  <span className="text-xs text-gray-400 font-normal ml-1">
                    / {displayUnit}
                  </span>
                </div>
                
                <div className="mt-auto flex items-center justify-between gap-2">
                  <button
                    onClick={() => setSelectedProduct(product)}
                    className="flex-1 bg-[#1A2E26] hover:bg-[#2A3E36] text-white text-sm font-bold py-3 rounded-2xl transition-all shadow-lg shadow-green-100 cursor-pointer"
                  >
                    {t('shop.order')}
                  </button>
                  <button
                    onClick={() => setSelectedProduct(product)}
                    className="p-3 bg-gray-50 hover:bg-gray-100 rounded-2xl text-gray-600 transition-colors cursor-pointer"
                  >
                    <ShoppingCart className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Order Modal */}
      <AnimatePresence>
        {selectedProduct && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedProduct(null)}
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
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">{t('shop.orderPlaced')}</h2>
                  <p className="text-gray-500">{t('shop.orderReadyNotice')}</p>
                </div>
              ) : (
                <>
                  <div className="flex justify-between items-start mb-6">
                    <div className="flex items-center space-x-4">
                      <img 
                        src={selectedProduct.imageUrl || getFallbackProductImage(selectedProduct.name)} 
                        alt={getLocalizedProductName(selectedProduct, isBn)} 
                        onError={(e) => {
                          const target = e.currentTarget;
                          const fallback = getFallbackProductImage(selectedProduct.name);
                          if (target.src !== fallback) {
                            target.src = fallback;
                          }
                        }}
                        className="w-16 h-16 rounded-2xl object-cover bg-gray-50"
                        referrerPolicy="no-referrer"
                      />
                      <div>
                        <h2 className="text-xl font-bold text-gray-900">
                          {getLocalizedProductName(selectedProduct, isBn)}
                        </h2>
                        <p className="text-sm text-green-700 font-bold">
                          {formatLocalizedPrice(selectedProduct.price, isBn)} / {getLocalizedUnit(selectedProduct.unit, selectedProduct.name, isBn)}
                        </p>
                      </div>
                    </div>
                    <button 
                      onClick={() => setSelectedProduct(null)}
                      className="p-2 hover:bg-gray-100 rounded-full transition-colors cursor-pointer"
                    >
                      <X className="h-6 w-6 text-gray-400" />
                    </button>
                  </div>

                  <form onSubmit={handleOrder} className="space-y-6">
                    <div className="space-y-4">
                      <label className="text-sm font-bold text-gray-700">{t('shop.quantity')}</label>
                      <div className="flex items-center justify-center space-x-6 bg-gray-50 rounded-[24px] p-4">
                        <button
                          type="button"
                          onClick={() => setQuantity(Math.max(1, quantity - 1))}
                          className="p-2 bg-white rounded-xl shadow-sm hover:bg-gray-100 transition-colors cursor-pointer"
                        >
                          <Minus className="h-5 w-5 text-gray-600" />
                        </button>
                        <span className="text-2xl font-bold text-gray-900 w-10 text-center">
                          {formatLocalizedNumber(quantity, isBn)}
                        </span>
                        <button
                          type="button"
                          onClick={() => setQuantity(Math.min(selectedProduct.stock || 99, quantity + 1))}
                          className="p-2 bg-white rounded-xl shadow-sm hover:bg-gray-100 transition-colors cursor-pointer"
                        >
                          <Plus className="h-5 w-5 text-gray-600" />
                        </button>
                      </div>
                    </div>

                    <div className="border-t border-gray-100 pt-6">
                      <div className="flex justify-between items-center mb-6">
                        <span className="text-gray-500 font-medium">{t('shop.totalPrice')}</span>
                        <span className="text-2xl font-bold text-gray-900">
                          {formatLocalizedPrice(selectedProduct.price * quantity, isBn)}
                        </span>
                      </div>

                      <button
                        type="submit"
                        disabled={submitting}
                        className="w-full bg-[#1A2E26] hover:bg-[#2A3E36] text-white font-bold py-4 rounded-2xl transition-all shadow-lg shadow-green-100 disabled:opacity-50 flex items-center justify-center space-x-2 cursor-pointer"
                      >
                        <ShoppingCart className="h-5 w-5" />
                        <span>{submitting ? t('shop.processing') : t('shop.placeOrder')}</span>
                      </button>
                    </div>
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
