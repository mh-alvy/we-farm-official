import { Outlet, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { auth, db } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import Sidebar from './Sidebar';
import AdminAICopywriter from './AdminAICopywriter';
import { Menu } from 'lucide-react';

import { FARM_NAME } from '../constants';

export default function AdminLayout() {
  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        let currentRole = null;
        const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
        if (userDoc.exists()) {
          currentRole = userDoc.data().role;
        }

        // Auto promote alvymahamudulhasan@gmail.com to super_admin
        if (currentUser.email === 'alvymahamudulhasan@gmail.com') {
          currentRole = 'super_admin';
          if (userDoc.exists() && userDoc.data().role !== 'super_admin') {
            try {
              await updateDoc(doc(db, 'users', currentUser.uid), { role: 'super_admin' });
            } catch (err) {
              console.error("Auto promote error: ", err);
            }
          }
        }

        setRole(currentRole);
        setUser(currentUser);
      } else {
        setUser(null);
        setRole(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  if (!user || (role !== 'admin' && role !== 'super_admin')) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden relative">
      {/* Mobile Sidebar Overlay */}
      <Sidebar isMobileOpen={isSidebarOpen} setIsMobileOpen={setIsSidebarOpen} />
      
      <main className="flex-1 overflow-y-auto w-full">
        <div className="p-4 sm:p-8 max-w-6xl mx-auto">
          <header className="mb-8 flex justify-between items-center bg-white sm:bg-transparent -mx-4 sm:mx-0 p-4 sm:p-0 border-b sm:border-0 border-gray-100 flex-shrink-0 sticky top-0 sm:relative z-10">
            <div className="flex items-center space-x-3">
              <button 
                onClick={() => setIsSidebarOpen(true)}
                className="p-2 -ml-2 text-gray-500 lg:hidden hover:text-green-600 transition-colors"
              >
                <Menu className="h-6 w-6" />
              </button>
              <div>
                <h2 className="text-sm font-bold text-green-600 uppercase tracking-widest mb-1">{FARM_NAME} Admin</h2>
                <p className="text-gray-500 text-[10px] sm:text-xs">Welcome back, {user?.displayName}</p>
              </div>
            </div>
            <div className="flex items-center space-x-2 sm:space-x-4">
              <AdminAICopywriter />
              <div className="text-right hidden md:block">
                <div className="text-sm font-bold text-gray-900">{user?.displayName}</div>
                <div className="text-xs text-gray-500">{user?.email}</div>
              </div>
              <img 
                src={user?.photoURL || `https://ui-avatars.com/api/?name=${user?.displayName}`} 
                alt="Profile" 
                className="w-10 h-10 rounded-full border-2 border-white shadow-sm"
              />
            </div>
          </header>
          <Outlet />
        </div>
      </main>
    </div>
  );
}
