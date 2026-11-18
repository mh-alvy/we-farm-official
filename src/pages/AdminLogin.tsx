import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { auth, db } from '../firebase';
import { signInWithPopup, GoogleAuthProvider, signInWithEmailAndPassword, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { ShieldCheck, LogIn, Mail, Lock, Eye, EyeOff, ArrowLeft, AlertCircle } from 'lucide-react';
import { setPhoneSession, subscribeToAuthSession } from '../lib/authSession';
import { FARM_NAME } from '../constants';

export default function AdminLogin() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });

  const navigate = useNavigate();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    const unsubscribe = subscribeToAuthSession((state) => {
      if (state.uid && (state.role === 'admin' || state.role === 'super_admin')) {
        navigate('/admin', { replace: true });
      }
    });
    return () => unsubscribe();
  }, [navigate]);

  const ensurePersistence = async () => {
    try {
      await setPersistence(auth, browserLocalPersistence);
    } catch {
      // Fallback handled by initializeAuth persistence list
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      setPhoneSession(null);
      await ensurePersistence();
      const result = await signInWithEmailAndPassword(auth, formData.email.trim(), formData.password);
      await result.user.getIdToken().catch(() => {});
      const userDoc = await getDoc(doc(db, 'users', result.user.uid));
      const isPrimarySuperAdmin = result.user.email === 'alvymahamudulhasan@gmail.com';
      const role = isPrimarySuperAdmin ? 'super_admin' : (userDoc.data()?.role || 'investor');

      if (role !== 'admin' && role !== 'super_admin') {
        await auth.signOut();
        throw new Error('এই অ্যাকাউন্টটির এডমিন পোর্টালে প্রবেশাধিকার নেই (Access Denied)।');
      }

      navigate('/admin', { replace: true });
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'এডমিন লগইন ব্যর্থ হয়েছে। ইমেইল ও পাসওয়ার্ড যাচাই করুন।');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);
    const provider = new GoogleAuthProvider();
    try {
      setPhoneSession(null);
      await ensurePersistence();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      await user.getIdToken().catch(() => {});
      const isPrimarySuperAdmin = user.email === 'alvymahamudulhasan@gmail.com';

      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (!userDoc.exists()) {
        if (isPrimarySuperAdmin) {
          await setDoc(doc(db, 'users', user.uid), {
            uid: user.uid,
            name: user.displayName || 'Super Admin',
            email: user.email || '',
            role: 'super_admin',
            createdAt: new Date().toISOString()
          });
          navigate('/admin', { replace: true });
          return;
        }
        await auth.signOut();
        throw new Error('এই গুগল অ্যাকাউন্টটি কোনো নিবন্ধিত এডমিন হিসেবে তালিকাভুক্ত নয়।');
      }

      const role = isPrimarySuperAdmin ? 'super_admin' : userDoc.data().role;
      if (role !== 'admin' && role !== 'super_admin') {
        await auth.signOut();
        throw new Error('এই অ্যাকাউন্টটির এডমিন প্যানেলে প্রবেশাধিকার নেই।');
      }

      navigate('/admin', { replace: true });
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'গুগল লগইন সম্পন্ন করা যায়নি।');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[88vh] flex items-center justify-center px-4 py-12 bg-gradient-to-b from-gray-50 to-white">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl border border-gray-100 p-8 md:p-10 relative">
        <div className="mb-6 flex items-center justify-between">
          <Link
            to="/"
            className="inline-flex items-center space-x-1.5 text-xs font-bold text-gray-500 hover:text-green-600 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>হোমপেজে ফিরে যান</span>
          </Link>
          <span className="text-[11px] font-semibold text-gray-400 tracking-wide">
            {FARM_NAME} Portal
          </span>
        </div>

        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-green-950 text-green-400 rounded-2xl mb-4 shadow-lg">
            <ShieldCheck className="h-8 w-8" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">
            এডমিন কন্ট্রোল পোর্টাল
          </h1>
          <p className="text-sm text-gray-500">
            শুধুমাত্র অনুমোদিত {FARM_NAME} এডমিনদের প্রবেশাধিকারের জন্য সংরক্ষিত
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-100 text-red-600 p-4 rounded-xl text-xs font-medium mb-6 flex items-start space-x-2.5">
            <AlertCircle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleEmailAuth} className="space-y-4 mb-6">
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">
              এডমিন ইমেইল (Admin Email)
            </label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="email"
                placeholder="admin@wefarm.com"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-600 focus:bg-white outline-none transition-all text-gray-900 font-medium"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">
              পাসওয়ার্ড (Password)
            </label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                required
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full pl-12 pr-12 py-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-600 focus:bg-white outline-none transition-all text-gray-900 font-medium"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center space-x-2 bg-green-900 hover:bg-green-950 text-white font-bold py-4 px-6 rounded-xl transition-all shadow-md active:scale-[0.98] cursor-pointer disabled:opacity-60 mt-2"
          >
            {loading ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
            ) : (
              <>
                <LogIn className="h-5 w-5" />
                <span>এডমিন পোর্টালে প্রবেশ করুন</span>
              </>
            )}
          </button>
        </form>

        <div className="relative mb-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-100"></div>
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-white px-4 text-gray-400">অথবা অনুমোদিত গুগল একাউন্ট</span>
          </div>
        </div>

        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full flex items-center justify-center space-x-3 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-semibold py-3.5 px-6 rounded-xl transition-all shadow-sm cursor-pointer disabled:opacity-60"
        >
          <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5" referrerPolicy="no-referrer" />
          <span>Admin Google Sign In</span>
        </button>
      </div>
    </div>
  );
}
