import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../firebase';
import { signInWithPopup, GoogleAuthProvider, createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc, collection, query, where, getDocs, deleteDoc } from 'firebase/firestore';
import { Tractor, LogIn, UserPlus, Mail, Lock, Phone, User, Eye, EyeOff, ShieldCheck } from 'lucide-react';

export default function Login() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSignUp, setIsSignUp] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: ''
  });

  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        const role = userDoc.exists() ? userDoc.data().role : 'investor';
        navigate(role === 'admin' ? '/admin' : '/', { replace: true });
      }
    });
    return () => unsubscribe();
  }, [navigate]);

  const validatePassword = (password: string) => {
    const minLength = 8;
    const hasUpper = /[A-Z]/.test(password);
    const hasLower = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    
    return password.length >= minLength && hasUpper && hasLower && hasNumber && hasSpecial;
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isSignUp) {
        if (!validatePassword(formData.password)) {
          throw new Error('Password must be at least 8 characters long and include uppercase, lowercase, number, and special character.');
        }
        if (formData.password !== formData.confirmPassword) {
          throw new Error('Passwords do not match');
        }

        const result = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
        const user = result.user;
        
        await updateProfile(user, { displayName: formData.name });

        // Check if there is an existing pre-created profile under this email
        const usersRef = collection(db, 'users');
        const qEmail = query(usersRef, where('email', '==', formData.email));
        const emailSnapshot = await getDocs(qEmail);
        
        let existingData = {};
        let oldDocId = null;
        if (!emailSnapshot.empty) {
          const oldDoc = emailSnapshot.docs[0];
          existingData = oldDoc.data();
          oldDocId = oldDoc.id;
        }

        // Create new user profile in Firestore
        const role = user.email === 'alvymahamudulhasan@gmail.com' ? 'admin' : 'investor';
        await setDoc(doc(db, 'users', user.uid), {
          ...existingData,
          uid: user.uid,
          name: formData.name || (existingData as any).name || '',
          email: formData.email,
          phone: formData.phone || (existingData as any).phone || '',
          role: role,
          createdAt: (existingData as any).createdAt || new Date().toISOString()
        });

        if (oldDocId && oldDocId !== user.uid) {
          await deleteDoc(doc(db, 'users', oldDocId));
        }

        navigate(role === 'admin' ? '/admin' : '/');
      } else {
        const result = await signInWithEmailAndPassword(auth, formData.email, formData.password);
        const userDoc = await getDoc(doc(db, 'users', result.user.uid));
        const role = userDoc.data()?.role || 'investor';
        navigate(role === 'admin' ? '/admin' : '/');
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      // Check if user exists in Firestore
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      
      if (!userDoc.exists()) {
        const role = user.email === 'alvymahamudulhasan@gmail.com' ? 'admin' : 'investor';
        
        // Check if there is an existing pre-created profile under this email
        const usersRef = collection(db, 'users');
        const qEmail = query(usersRef, where('email', '==', user.email));
        const emailSnapshot = await getDocs(qEmail);
        
        let existingData = {};
        let oldDocId = null;
        if (!emailSnapshot.empty) {
          const oldDoc = emailSnapshot.docs[0];
          existingData = oldDoc.data();
          oldDocId = oldDoc.id;
        }

        await setDoc(doc(db, 'users', user.uid), {
          ...existingData,
          uid: user.uid,
          name: user.displayName || (existingData as any).name || '',
          email: user.email || '',
          role: role,
          createdAt: (existingData as any).createdAt || new Date().toISOString()
        });
        
        if (oldDocId && oldDocId !== user.uid) {
          await deleteDoc(doc(db, 'users', oldDocId));
        }

        navigate(role === 'admin' ? '/admin' : '/');
      } else {
        const role = userDoc.data().role;
        navigate(role === 'admin' ? '/admin' : '/');
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[90vh] flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl border border-gray-100 p-8 md:p-10">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-green-50 rounded-2xl mb-6">
            <Tractor className="h-8 w-8 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {isSignUp ? 'Create an Account' : 'Welcome Back'}
          </h1>
          <p className="text-gray-500">
            {isSignUp ? 'Join We Farm as an investor today' : 'Login to manage your farm or investments'}
          </p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm mb-6 flex items-center space-x-2">
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleEmailAuth} className="space-y-4 mb-8">
          {isSignUp && (
            <>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Full Name"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-transparent rounded-xl focus:ring-2 focus:ring-green-500 outline-none transition-all"
                />
              </div>
              <div className="relative">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="tel"
                  placeholder="Phone Number"
                  required
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-transparent rounded-xl focus:ring-2 focus:ring-green-500 outline-none transition-all"
                />
              </div>
            </>
          )}
          <div className="relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="email"
              placeholder="Email Address"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-transparent rounded-xl focus:ring-2 focus:ring-green-500 outline-none transition-all"
            />
          </div>
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              required
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="w-full pl-12 pr-12 py-4 bg-gray-50 border border-transparent rounded-xl focus:ring-2 focus:ring-green-500 outline-none transition-all"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>

          {isSignUp && (
            <>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Confirm Password"
                  required
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-transparent rounded-xl focus:ring-2 focus:ring-green-500 outline-none transition-all"
                />
              </div>
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 flex items-start space-x-3">
                <ShieldCheck className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
                <div className="text-[10px] text-gray-500 leading-relaxed">
                  Password must be at least 8 characters long and include an uppercase letter, a lowercase letter, a number, and a special character (!@#$%^&*).
                </div>
              </div>
            </>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center space-x-2 bg-green-600 hover:bg-green-700 text-white font-bold py-4 px-6 rounded-xl transition-all shadow-md active:scale-[0.98]"
          >
            {loading ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
            ) : (
              <>
                {isSignUp ? <UserPlus className="h-5 w-5" /> : <LogIn className="h-5 w-5" />}
                <span>{isSignUp ? 'Create Account' : 'Login Now'}</span>
              </>
            )}
          </button>
        </form>

        <div className="relative mb-8">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-100"></div>
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-white px-4 text-gray-400">Or continue with</span>
          </div>
        </div>

        <button
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full flex items-center justify-center space-x-3 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-semibold py-3.5 px-6 rounded-xl transition-all shadow-sm"
        >
          <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5" />
          <span>Google</span>
        </button>

        <div className="mt-8 text-center text-sm text-gray-500">
          <button 
            type="button"
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-green-600 font-bold hover:underline"
          >
            {isSignUp ? 'Already have an account? Login' : "Don't have an account? Sign Up"}
          </button>
        </div>
      </div>
    </div>
  );
}
