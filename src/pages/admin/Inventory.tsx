import React, { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { Product } from '../../types';
import { Plus, Trash2, Edit2, Package, DollarSign, Layers, Image as ImageIcon, X } from 'lucide-react';
import { formatCurrency } from '../../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import ImageUploader from '../../components/ImageUploader';

export default function AdminInventory() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const [formData, setFormData] = useState<Product>({
    name: '',
    price: 0,
    unit: 'Kg',
    stock: 0,
    description: '',
    imageUrl: ''
  });

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    setLoading(true);
    const querySnapshot = await getDocs(collection(db, 'products'));
    setProducts(querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Product)));
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingProduct) {
        await updateDoc(doc(db, 'products', editingProduct.id!), { ...formData });
      } else {
        await addDoc(collection(db, 'products'), formData);
      }
      setIsModalOpen(false);
      setEditingProduct(null);
      setFormData({ name: '', price: 0, unit: 'Kg', stock: 0, description: '', imageUrl: '' });
      fetchProducts();
    } catch (err) {
      console.error(err);
      alert('Error saving product');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'products', id));
      fetchProducts();
    } catch (err) {
      console.error(err);
      alert('Error deleting product');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Inventory Management</h1>
          <p className="text-gray-500 text-xs sm:text-sm">Manage products and stock levels.</p>
        </div>
        <button 
          onClick={() => {
            setEditingProduct(null);
            setFormData({ name: '', price: 0, unit: 'Kg', stock: 0, description: '', imageUrl: '' });
            setIsModalOpen(true);
          }}
          className="flex items-center justify-center space-x-2 px-6 py-2.5 bg-green-600 rounded-xl text-sm font-bold text-white hover:bg-green-700 transition-all shadow-md shadow-green-100"
        >
          <Plus className="h-4 w-4" />
          <span>Add Product</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full py-20 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto"></div>
          </div>
        ) : products.map(product => (
          <div key={product.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden group">
            <div className="h-40 overflow-hidden relative">
              <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              <div className="absolute top-3 right-3 flex space-x-2">
                <button onClick={() => { setEditingProduct(product); setFormData(product); setIsModalOpen(true); }} className="p-2 bg-white/90 backdrop-blur-sm rounded-lg text-gray-600 hover:text-blue-600 shadow-sm transition-all"><Edit2 className="h-4 w-4" /></button>
                <button onClick={() => handleDelete(product.id!)} className="p-2 bg-white/90 backdrop-blur-sm rounded-lg text-gray-600 hover:text-red-600 shadow-sm transition-all"><Trash2 className="h-4 w-4" /></button>
              </div>
            </div>
            <div className="p-6">
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-bold text-gray-900">{product.name}</h3>
                <div className="text-right">
                  <span className="text-green-600 font-bold block">{formatCurrency(product.price)}</span>
                  <span className="text-[10px] text-gray-400 font-medium uppercase">Per {product.unit || 'Kg'}</span>
                </div>
              </div>
              <p className="text-xs text-gray-500 mb-4 line-clamp-2">{product.description}</p>
              <div className="flex items-center justify-between text-xs font-bold">
                <div className="flex items-center space-x-2 text-gray-400">
                  <Layers className="h-4 w-4" />
                  <span>Stock: {product.stock} units</span>
                </div>
                <span className={product.stock < 10 ? 'text-red-500' : 'text-green-500'}>
                  {product.stock < 10 ? 'Low Stock' : 'In Stock'}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsModalOpen(false)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">{editingProduct ? 'Edit Product' : 'Add Product'}</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase">Product Name</label>
                  <input type="text" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full bg-gray-50 border border-gray-100 rounded-xl py-3 px-4 outline-none focus:ring-2 focus:ring-green-500" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase">Price (৳)</label>
                    <input 
                      type="number" 
                      required 
                      value={isNaN(formData.price) ? '' : formData.price} 
                      onChange={e => {
                        const val = e.target.value === '' ? NaN : parseFloat(e.target.value);
                        setFormData({...formData, price: val});
                      }} 
                      className="w-full bg-gray-50 border border-gray-100 rounded-xl py-3 px-4 outline-none focus:ring-2 focus:ring-green-500" 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase">Unit</label>
                    <select 
                      value={formData.unit} 
                      onChange={e => setFormData({...formData, unit: e.target.value as any})}
                      className="w-full bg-gray-50 border border-gray-100 rounded-xl py-3 px-4 outline-none focus:ring-2 focus:ring-green-500"
                    >
                      <option value="Kg">Kg (Kilogram)</option>
                      <option value="L">L (Liter)</option>
                      <option value="pc">pc (Piece)</option>
                    </select>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase">Stock</label>
                  <input 
                    type="number" 
                    required 
                    value={isNaN(formData.stock) ? '' : formData.stock} 
                    onChange={e => {
                      const val = e.target.value === '' ? NaN : parseInt(e.target.value);
                      setFormData({...formData, stock: val});
                    }} 
                    className="w-full bg-gray-50 border border-gray-100 rounded-xl py-3 px-4 outline-none focus:ring-2 focus:ring-green-500" 
                  />
                </div>
                <div className="space-y-3">
                  <ImageUploader 
                    label="Upload Product Image" 
                    currentImageUrl={formData.imageUrl} 
                    onUploadSuccess={(url) => setFormData({...formData, imageUrl: url})} 
                    onClear={() => setFormData({...formData, imageUrl: ''})}
                    folder="inventory"
                  />
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Or Paste Direct Image URL</label>
                    <input 
                      type="text" 
                      required 
                      value={formData.imageUrl} 
                      onChange={e => setFormData({...formData, imageUrl: e.target.value})} 
                      className="w-full bg-gray-50 border border-gray-100 rounded-xl py-2 px-4 outline-none focus:ring-2 focus:ring-green-500 text-xs" 
                      placeholder="https://..." 
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase">Description</label>
                  <textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full bg-gray-50 border border-gray-100 rounded-xl py-3 px-4 outline-none focus:ring-2 focus:ring-green-500 resize-none" rows={3} />
                </div>
                <button type="submit" className="w-full bg-green-600 hover:bg-green-700 py-4 rounded-xl font-bold text-white transition-all shadow-lg shadow-green-100">Save Product</button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
