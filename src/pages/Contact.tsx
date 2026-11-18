import { Mail, MapPin, MessageCircle } from 'lucide-react';
import React, { useState, useEffect } from 'react';
import { FARM_LOCATION, FARM_WHATSAPP, FARM_EMAIL } from '../constants';
import { db } from '../firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { SiteSettings } from '../types';
import { useLanguage } from '../lib/LanguageContext';
import { DEFAULT_SITE_SETTINGS, mergeSiteSettings } from '../lib/siteSettingsDefaults';

export default function Contact() {
  const { language, t } = useLanguage();
  const isBn = language === 'bn';
  const pick = (enVal?: string, bnVal?: string, fallback?: string) =>
    isBn
      ? (bnVal && bnVal.trim() ? bnVal : fallback || enVal || '')
      : (enVal && enVal.trim() ? enVal : fallback || bnVal || '');
  const [settings, setSettings] = useState<SiteSettings>(DEFAULT_SITE_SETTINGS);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    message: ''
  });
  const [submitted, setSubmitted] = useState(false);

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // WhatsApp URL generation
    const text = `Name: ${formData.name}\nPhone: ${formData.phone}\nMessage: ${formData.message}`;
    const encodedText = encodeURIComponent(text);
    const whatsappNumber = (settings?.contactSection?.info?.whatsapp?.text || FARM_WHATSAPP).replace('+', '');
    const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodedText}`;
    
    window.open(whatsappUrl, '_blank');
    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 3000);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
      <div className="text-center mb-16">
        <span className="text-xs font-bold tracking-[0.2em] text-[#8B735B] uppercase mb-4 block">
          {pick(settings?.contactSection?.tagline, settings?.contactSection?.taglineBn, t('contact.tagline'))}
        </span>
        <h1 className="text-4xl md:text-5xl font-bold text-[#1A2E26] mb-4">
          {pick(settings?.contactSection?.headline, settings?.contactSection?.headlineBn, t('contact.headline'))}
        </h1>
        <p className="text-gray-600 max-w-2xl mx-auto">
          {pick(settings?.contactSection?.description, settings?.contactSection?.descriptionBn, t('contact.desc'))}
        </p>
      </div>

      <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-stretch">
        {/* Left Side: Contact Form Box */}
        <div className="lg:col-span-7 bg-white rounded-[40px] shadow-xl border border-gray-100 p-8 md:p-12 flex flex-col justify-center">
          {submitted ? (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-6 py-12">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
                <MessageCircle className="h-10 w-10 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">{t('contact.redirecting')}</h2>
              <p className="text-gray-500">{t('contact.thanks')}</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700">{t('contact.name')}</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-gray-50 border border-transparent rounded-2xl py-4 px-6 focus:bg-white focus:border-green-500 outline-none transition-all"
                  placeholder={t('contact.name')}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700">{t('contact.phone')}</label>
                <input
                  type="tel"
                  required
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full bg-gray-50 border border-transparent rounded-2xl py-4 px-6 focus:bg-white focus:border-green-500 outline-none transition-all"
                  placeholder={t('contact.phone')}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700">{t('contact.message')}</label>
                <textarea
                  required
                  rows={4}
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  className="w-full bg-gray-50 border border-transparent rounded-2xl py-4 px-6 focus:bg-white focus:border-green-500 outline-none transition-all resize-none"
                  placeholder={t('contact.message')}
                ></textarea>
              </div>
              <button
                type="submit"
                className="w-full bg-[#1A2E26] hover:bg-[#2A3E36] text-white font-bold py-5 rounded-2xl transition-all shadow-lg shadow-green-200 flex items-center justify-center space-x-2 cursor-pointer"
              >
                <MessageCircle className="h-5 w-5" />
                <span>{t('contact.sendBtn')}</span>
              </button>
            </form>
          )}
        </div>

        {/* Right Side: Location, WhatsApp & Email Boxes */}
        <div className="lg:col-span-5 flex flex-col justify-between gap-6">
          <div className="flex-1 bg-white p-6 md:p-8 rounded-[32px] border border-gray-100 shadow-sm hover:shadow-md transition-all text-center flex flex-col items-center justify-center">
            <div className="w-12 h-12 bg-green-50 rounded-2xl flex items-center justify-center mb-4 mx-auto">
              <MapPin className="h-6 w-6 text-green-700" />
            </div>
            <h3 className="font-bold text-[#1A2E26] mb-1.5">
              {pick(settings?.contactSection?.info?.location?.title, settings?.contactSection?.info?.location?.titleBn, t('contact.location'))}
            </h3>
            <p className="text-sm text-gray-500">
              {pick(settings?.contactSection?.info?.location?.text, settings?.contactSection?.info?.location?.textBn, FARM_LOCATION)}
            </p>
          </div>

          <div className="flex-1 bg-white p-6 md:p-8 rounded-[32px] border border-gray-100 shadow-sm hover:shadow-md transition-all text-center flex flex-col items-center justify-center">
            <div className="w-12 h-12 bg-green-50 rounded-2xl flex items-center justify-center mb-4 mx-auto">
              <MessageCircle className="h-6 w-6 text-green-700" />
            </div>
            <h3 className="font-bold text-[#1A2E26] mb-1.5">
              {pick(settings?.contactSection?.info?.whatsapp?.title, settings?.contactSection?.info?.whatsapp?.titleBn, t('contact.whatsapp'))}
            </h3>
            <p className="text-sm text-gray-500">
              {pick(settings?.contactSection?.info?.whatsapp?.text, settings?.contactSection?.info?.whatsapp?.textBn, FARM_WHATSAPP)}
            </p>
          </div>

          <div className="flex-1 bg-white p-6 md:p-8 rounded-[32px] border border-gray-100 shadow-sm hover:shadow-md transition-all text-center flex flex-col items-center justify-center">
            <div className="w-12 h-12 bg-green-50 rounded-2xl flex items-center justify-center mb-4 mx-auto">
              <Mail className="h-6 w-6 text-green-700" />
            </div>
            <h3 className="font-bold text-[#1A2E26] mb-1.5">
              {pick(settings?.contactSection?.info?.email?.title, settings?.contactSection?.info?.email?.titleBn, t('contact.email'))}
            </h3>
            <p className="text-sm text-gray-500">
              {pick(settings?.contactSection?.info?.email?.text, settings?.contactSection?.info?.email?.textBn, FARM_EMAIL)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
