import React, { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, doc, getDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { Product, Order, SiteSettings } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { ShoppingCart, ShoppingBag, X, CheckCircle2, Plus, Minus, Leaf } from 'lucide-react';
import { formatCurrency } from '../lib/utils';
import { FARM_NAME } from '../constants';

export default function Shop() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [settings, setSettings] = useState<SiteSettings | null>(null);

  useEffect(() => {
    const fetchProducts = async () => {
      const querySnapshot = await getDocs(collection(db, 'products'));
      const productsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
      setProducts(productsData);
      setLoading(false);
    };
    
    async function fetchSettings() {
      const docRef = doc(db, 'settings', 'site');
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setSettings(docSnap.data() as SiteSettings);
      }
    }

    fetchProducts();
    fetchSettings();
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
      alert('Failed to place order');
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
          {settings?.productsSection?.tagline || "OUR PRODUCTS"}
        </span>
        <h1 className="text-4xl md:text-5xl font-bold text-[#1A2E26] mb-4">
          {settings?.productsSection?.headline || "Honest Food from Honest Soil"}
        </h1>
        <p className="text-gray-600">
          {settings?.productsSection?.description || `Fresh products directly from ${FARM_NAME} to your table.`}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
        {products.map((product) => (
          <motion.div
            key={product.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-[32px] overflow-hidden border border-gray-100 shadow-sm hover:shadow-xl transition-all group flex flex-col"
          >
            <div className="h-48 overflow-hidden relative">
              <img
                src={product.imageUrl}
                alt={product.name}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                referrerPolicy="no-referrer"
              />
              <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-[10px] font-bold text-green-700 uppercase tracking-wider shadow-sm">
                Natural
              </div>
            </div>
            <div className="p-6 flex-grow flex flex-col">
              <h3 className="text-lg font-bold text-[#1A2E26] mb-1">{product.name}</h3>
              <p className="text-xs text-gray-500 mb-4 line-clamp-2">{product.description}</p>
              <div className="text-green-700 font-bold mb-6">
                {formatCurrency(product.price)}
                <span className="text-xs text-gray-400 font-normal ml-1">
                  / {product.unit || (product.name.toLowerCase().includes('egg') ? 'pc' : product.name.toLowerCase().includes('milk') ? 'L' : 'kg')}
                </span>
              </div>
              
              <div className="mt-auto flex items-center justify-between gap-2">
                <button
                  onClick={() => setSelectedProduct(product)}
                  className="flex-1 bg-[#1A2E26] hover:bg-[#2A3E36] text-white text-sm font-bold py-3 rounded-2xl transition-all shadow-lg shadow-green-100"
                >
                  Order
                </button>
                <button
                  onClick={() => setSelectedProduct(product)}
                  className="p-3 bg-gray-50 hover:bg-gray-100 rounded-2xl text-gray-600 transition-colors"
                >
                  <ShoppingCart className="h-5 w-5" />
                </button>
              </div>
            </div>
          </motion.div>
        ))}
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
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">Order Placed!</h2>
                  <p className="text-gray-500">We'll notify you when your order is ready.</p>
                </div>
              ) : (
                <>
                  <div className="flex justify-between items-start mb-6">
                    <div className="flex items-center space-x-4">
                      <img 
                        src={selectedProduct.imageUrl} 
                        alt={selectedProduct.name} 
                        className="w-16 h-16 rounded-2xl object-cover"
                        referrerPolicy="no-referrer"
                      />
                      <div>
                        <h2 className="text-xl font-bold text-gray-900">{selectedProduct.name}</h2>
                        <p className="text-sm text-green-700 font-bold">{formatCurrency(selectedProduct.price)}</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => setSelectedProduct(null)}
                      className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                    >
                      <X className="h-6 w-6 text-gray-400" />
                    </button>
                  </div>

                  <form onSubmit={handleOrder} className="space-y-6">
                    <div className="space-y-4">
                      <label className="text-sm font-bold text-gray-700">Quantity</label>
                      <div className="flex items-center justify-center space-x-6 bg-gray-50 rounded-[24px] p-4">
                        <button
                          type="button"
                          onClick={() => setQuantity(Math.max(1, quantity - 1))}
                          className="p-2 bg-white rounded-xl shadow-sm hover:bg-gray-100 transition-colors"
                        >
                          <Minus className="h-5 w-5 text-gray-600" />
                        </button>
                        <span className="text-2xl font-bold text-gray-900 w-8 text-center">{quantity}</span>
                        <button
                          type="button"
                          onClick={() => setQuantity(Math.min(selectedProduct.stock, quantity + 1))}
                          className="p-2 bg-white rounded-xl shadow-sm hover:bg-gray-100 transition-colors"
                        >
                          <Plus className="h-5 w-5 text-gray-600" />
                        </button>
                      </div>
                    </div>

                    <div className="border-t border-gray-100 pt-6">
                      <div className="flex justify-between items-center mb-6">
                        <span className="text-gray-500 font-medium">Total Price</span>
                        <span className="text-2xl font-bold text-gray-900">
                          {formatCurrency(selectedProduct.price * quantity)}
                        </span>
                      </div>

                      <button
                        type="submit"
                        disabled={submitting}
                        className="w-full bg-[#1A2E26] hover:bg-[#2A3E36] text-white font-bold py-4 rounded-2xl transition-all shadow-lg shadow-green-100 disabled:opacity-50 flex items-center justify-center space-x-2"
                      >
                        <ShoppingCart className="h-5 w-5" />
                        <span>{submitting ? 'Processing...' : 'Place Order'}</span>
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
