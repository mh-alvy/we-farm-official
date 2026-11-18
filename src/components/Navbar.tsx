import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { User, Menu, X, LogOut, Leaf } from 'lucide-react';
import { db } from '../firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { cn } from '../lib/utils';
import { FARM_NAME } from '../constants';
import { subscribeToAuthSession, logoutAllSessions } from '../lib/authSession';
import { useLanguage } from '../lib/LanguageContext';

interface NavbarProps {
  isBarActive?: boolean;
}

export default function Navbar({ isBarActive }: NavbarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState<string | null>(null);
  const [logoSettings, setLogoSettings] = useState<{ navLogoUrl?: string; navLogoHeight?: number }>({});
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const unsubLogo = onSnapshot(doc(db, 'settings', 'site'), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        if (data.logo) {
          setLogoSettings({
            navLogoUrl: data.logo.navLogoUrl,
            navLogoHeight: data.logo.navLogoHeight
          });
        }
      }
    });
    return unsubLogo;
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeToAuthSession((state) => {
      if (state.uid) {
        setUser(state.profile || { uid: state.uid, name: state.name, phone: state.phone, email: state.email });
        setRole(state.role);
      } else {
        setUser(null);
        setRole(null);
      }
    });
    return unsubscribe;
  }, []);

  const handleLogout = async () => {
    setUser(null);
    setRole(null);
    setIsOpen(false);
    try {
      await logoutAllSessions();
    } catch (err) {
      console.error('Error during logout:', err);
    }
    navigate('/');
  };

  const { language, setLanguage, t } = useLanguage();

  const navLinks = [
    { name: t('nav.home'), path: '/#home' },
    { name: t('nav.products'), path: '/#products' },
    { name: t('nav.about'), path: '/#about' },
    { name: t('nav.invest'), path: '/#invest' },
    { name: t('nav.contact'), path: '/#contact' },
  ];

  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, path: string) => {
    const sectionId = path.split('#')[1];
    if (location.pathname === '/') {
      e.preventDefault();
      const element = document.getElementById(sectionId);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
      setIsOpen(false);
    }
  };

  return (
    <nav className={cn(
      "bg-white border-b border-gray-100 sticky z-50 transition-all duration-300",
      isBarActive ? "top-[42px] sm:top-[46px]" : "top-0"
    )}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link 
              to="/#home" 
              onClick={(e) => {
                if (location.pathname === '/') {
                  e.preventDefault();
                  document.getElementById('home')?.scrollIntoView({ behavior: 'smooth' });
                }
              }}
              className="flex items-center space-x-2"
            >
              {logoSettings.navLogoUrl ? (
                <img 
                  src={logoSettings.navLogoUrl} 
                  alt={FARM_NAME} 
                  style={{ height: `${logoSettings.navLogoHeight || 24}px`, width: 'auto' }}
                  className="object-contain"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <>
                  <div className="w-10 h-10 bg-green-50 rounded-full flex items-center justify-center">
                    <Leaf className="h-6 w-6 text-green-700" />
                  </div>
                  <span className="text-xl font-bold text-gray-900 tracking-tight">{FARM_NAME}</span>
                </>
              )}
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            {navLinks.map((link) => (
              <a
                key={link.path}
                href={link.path}
                onClick={(e) => handleNavClick(e, link.path)}
                className={cn(
                  "text-sm font-medium transition-colors hover:text-green-600",
                  location.hash === link.path ? "text-green-600" : "text-gray-600"
                )}
              >
                {link.name}
              </a>
            ))}
            
            {/* Language Switcher */}
            <button
              onClick={() => setLanguage(language === 'bn' ? 'en' : 'bn')}
              className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl bg-green-50 hover:bg-green-100 text-green-800 text-xs font-bold transition-all cursor-pointer border border-green-200"
              title="Switch Language / ভাষা পরিবর্তন করুন"
            >
              <span>{language === 'bn' ? 'English (EN)' : 'বাংলা (BN)'}</span>
            </button>

            {user ? (
              <div className="flex items-center space-x-4">
                <Link
                  to="/profile"
                  className="flex items-center text-sm font-medium text-gray-600 hover:text-green-600 transition-colors"
                >
                  <User className="h-4 w-4 mr-1" />
                  {t('nav.profile')}
                </Link>
                {(role === 'admin' || role === 'super_admin') && (
                  <Link
                    to="/admin"
                    className="text-sm font-medium text-white bg-green-600 px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
                  >
                    {t('nav.dashboard')}
                  </Link>
                )}
                <button
                  onClick={handleLogout}
                  className="flex items-center text-sm font-medium text-gray-600 hover:text-red-600 transition-colors cursor-pointer"
                >
                  <LogOut className="h-4 w-4 mr-1" />
                  {t('nav.logout')}
                </button>
              </div>
            ) : (
              <Link
                to="/login"
                className="flex items-center text-sm font-medium text-white bg-green-600 px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
              >
                <User className="h-4 w-4 mr-1" />
                {t('nav.login')}
              </Link>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="text-gray-600 hover:text-gray-900 focus:outline-none"
            >
              {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      {isOpen && (
        <div className="md:hidden bg-white border-t border-gray-100 px-4 pt-2 pb-6 space-y-1">
          <div className="pb-2 pt-1">
            <button
              onClick={() => {
                setLanguage(language === 'bn' ? 'en' : 'bn');
                setIsOpen(false);
              }}
              className="w-full flex items-center justify-center space-x-2 py-3 rounded-xl bg-green-50 text-green-800 text-sm font-bold border border-green-200 cursor-pointer"
            >
              <span>{language === 'bn' ? 'Switch to English' : 'বাংলায় দেখুন (Bengali)'}</span>
            </button>
          </div>
          {navLinks.map((link) => (
            <a
              key={link.path}
              href={link.path}
              onClick={(e) => handleNavClick(e, link.path)}
              className={cn(
                "block px-3 py-2 rounded-md text-base font-medium",
                location.hash === link.path ? "text-green-600 bg-green-50" : "text-gray-600 hover:text-green-600 hover:bg-green-50"
              )}
            >
              {link.name}
            </a>
          ))}
          <div className="pt-4 border-t border-gray-100">
            {user ? (
              <>
                <Link
                  to="/profile"
                  onClick={() => setIsOpen(false)}
                  className="block px-3 py-2 rounded-md text-base font-medium text-gray-600"
                >
                  {t('nav.profile')}
                </Link>
                {(role === 'admin' || role === 'super_admin') && (
                  <Link
                    to="/admin"
                    onClick={() => setIsOpen(false)}
                    className="block px-3 py-2 rounded-md text-base font-medium text-green-600"
                  >
                    {t('nav.dashboard')}
                  </Link>
                )}
                <button
                  onClick={handleLogout}
                  className="block w-full text-left px-3 py-2 rounded-md text-base font-medium text-red-600"
                >
                  {t('nav.logout')}
                </button>
              </>
            ) : (
              <Link
                to="/login"
                onClick={() => setIsOpen(false)}
                className="block px-3 py-2 rounded-md text-base font-medium text-green-600"
              >
                {t('nav.login')}
              </Link>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
