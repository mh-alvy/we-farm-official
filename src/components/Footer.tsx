import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { db } from '../firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { Leaf, Facebook, Twitter, Instagram, Mail, MapPin, MessageCircle, ExternalLink, Lock } from 'lucide-react';
import { FARM_NAME, FARM_LOCATION, FARM_WHATSAPP, FARM_EMAIL } from '../constants';
import { useLanguage } from '../lib/LanguageContext';
import { SiteSettings } from '../types';
import { DEFAULT_SITE_SETTINGS, mergeSiteSettings } from '../lib/siteSettingsDefaults';

export default function Footer() {
  const { language, t } = useLanguage();
  const isBn = language === 'bn';
  const pick = (enVal?: string, bnVal?: string, fallback?: string) =>
    isBn
      ? (bnVal && bnVal.trim() ? bnVal : fallback || enVal || '')
      : (enVal && enVal.trim() ? enVal : fallback || bnVal || '');
  const [settings, setSettings] = useState<SiteSettings>(DEFAULT_SITE_SETTINGS);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'site'), (snapshot) => {
      if (snapshot.exists()) {
        setSettings(mergeSiteSettings(snapshot.data() as SiteSettings));
      } else {
        setSettings(DEFAULT_SITE_SETTINGS);
      }
    });
    return unsub;
  }, []);

  const logoSettings = settings.logo || {};

  return (
    <footer className="bg-gray-900 text-gray-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
          {/* Brand */}
          <div className="space-y-4">
            <a 
              href="#home" 
              onClick={(e) => {
                e.preventDefault();
                document.getElementById('home')?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="flex items-center space-x-2 text-white"
            >
              {logoSettings.footerLogoUrl ? (
                <img 
                  src={logoSettings.footerLogoUrl} 
                  alt={FARM_NAME} 
                  style={{ height: `${logoSettings.footerLogoHeight || 32}px`, width: 'auto' }}
                  className="object-contain"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <>
                  <Leaf className="h-8 w-8 text-green-500" />
                  <span className="text-xl font-bold tracking-tight">{FARM_NAME}</span>
                </>
              )}
            </a>
            <p className="text-sm leading-relaxed">
              {t('footer.taglineDesc')}
            </p>
            <div className="flex space-x-4">
              <a href="#" className="hover:text-green-500 transition-colors"><Facebook className="h-5 w-5" /></a>
              <a href="#" className="hover:text-green-500 transition-colors"><Twitter className="h-5 w-5" /></a>
              <a href="#" className="hover:text-green-500 transition-colors"><Instagram className="h-5 w-5" /></a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-white font-semibold mb-4">{t('footer.quickLinks')}</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <a 
                  href="#about" 
                  onClick={(e) => {
                    e.preventDefault();
                    document.getElementById('about')?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="hover:text-green-500 transition-colors"
                >
                  {t('footer.aboutUs')}
                </a>
              </li>
              <li>
                <a 
                  href="#invest" 
                  onClick={(e) => {
                    e.preventDefault();
                    document.getElementById('invest')?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="hover:text-green-500 transition-colors"
                >
                  {t('footer.ourProjects')}
                </a>
              </li>
              <li>
                <a 
                  href="#products" 
                  onClick={(e) => {
                    e.preventDefault();
                    document.getElementById('products')?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="hover:text-green-500 transition-colors"
                >
                  {t('footer.shopProducts')}
                </a>
              </li>
              <li>
                <a 
                  href="#faq" 
                  onClick={(e) => {
                    e.preventDefault();
                    document.getElementById('faq')?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="hover:text-green-500 transition-colors"
                >
                  {t('footer.faq')}
                </a>
              </li>
            </ul>
          </div>

          {/* Contact Info */}
          <div className="space-y-4">
            <h3 className="text-white font-semibold mb-4">{t('footer.contactUs')}</h3>
            <ul className="space-y-3 text-sm">
              <li className="flex items-start space-x-3">
                <MapPin className="h-5 w-5 text-green-500 shrink-0" />
                <span>
                  {pick(
                    settings.contactSection?.info?.location?.text,
                    settings.contactSection?.info?.location?.textBn,
                    FARM_LOCATION
                  )}
                </span>
              </li>
              <li className="flex items-center space-x-3">
                <MessageCircle className="h-5 w-5 text-green-500 shrink-0" />
                <span>
                  {pick(
                    settings.contactSection?.info?.whatsapp?.text,
                    settings.contactSection?.info?.whatsapp?.textBn,
                    FARM_WHATSAPP
                  )}
                </span>
              </li>
              <li className="flex items-center space-x-3">
                <Mail className="h-5 w-5 text-green-500 shrink-0" />
                <span className="break-all">
                  {pick(
                    settings.contactSection?.info?.email?.text,
                    settings.contactSection?.info?.email?.textBn,
                    FARM_EMAIL
                  )}
                </span>
              </li>
            </ul>
          </div>

          {/* Location Map */}
          <div>
            <h3 className="text-white font-semibold mb-4">{t('footer.ourLocation')}</h3>
            <div className="rounded-xl overflow-hidden border border-gray-800 h-48 w-full transition-all duration-500 ring-1 ring-gray-800 hover:ring-green-500/50">
              <iframe 
                src={`https://maps.google.com/maps?q=G5QQ%2BQH%2C%20Ragurampur%2C%20Cumilla&t=&z=16&ie=UTF8&iwloc=&output=embed`}
                width="100%" 
                height="100%" 
                style={{ border: 0 }} 
                allowFullScreen={true} 
                loading="lazy" 
                referrerPolicy="no-referrer-when-downgrade"
                title="We Farm Location"
              />
            </div>
            <a 
              href="https://maps.app.goo.gl/AhtTqC9n4e2uAa9u8?g_st=ic" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-xs text-green-500 hover:text-green-400 transition-colors flex items-center mt-3 font-medium"
            >
              <ExternalLink className="h-3 w-3 mr-1.5" />
              {t('footer.openMap')}
            </a>
          </div>
        </div>
        <div className="border-t border-gray-800 mt-12 pt-8 flex flex-col sm:flex-row items-center justify-center gap-2 text-center text-xs relative">
          <p className="inline-flex flex-wrap items-center justify-center gap-1.5">
            <span>&copy; {new Date().getFullYear()} {FARM_NAME}. {t('common.rights')}.</span>
            <span>
              System Developed by <a href="https://mhalvy.netlify.app/" target="_blank" rel="noopener noreferrer" className="text-green-500 hover:underline">Alex_404</a>
            </span>
            <Link
              to="/admin-login"
              aria-label="Admin Portal"
              title="Portal"
              className="inline-flex items-center justify-center p-1.5 ml-1 rounded-md text-gray-600 hover:text-green-500 hover:bg-gray-800/60 transition-all"
            >
              <Lock className="h-3 w-3" />
            </Link>
          </p>
        </div>
      </div>
    </footer>
  );
}
