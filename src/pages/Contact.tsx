import { Mail, Phone, MapPin, Send, MessageSquare, MessageCircle } from 'lucide-react';
import { motion } from 'motion/react';
import React, { useState, useEffect } from 'react';
import { FARM_NAME, FARM_LOCATION, FARM_WHATSAPP, FARM_EMAIL } from '../constants';
import { db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';
import { SiteSettings } from '../types';

export default function Contact() {
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    message: ''
  });
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    async function fetchSettings() {
      const docRef = doc(db, 'settings', 'site');
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setSettings(docSnap.data() as SiteSettings);
      }
    }
    fetchSettings();
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
          {settings?.contactSection?.tagline || "GET IN TOUCH"}
        </span>
        <h1 className="text-4xl md:text-5xl font-bold text-[#1A2E26] mb-4">
          {settings?.contactSection?.headline || `Contact ${FARM_NAME}`}
        </h1>
        <p className="text-gray-600 max-w-2xl mx-auto">
          {settings?.contactSection?.description || "Reach out via WhatsApp or fill the form below — we'd love to hear from you."}
        </p>
      </div>

      <div className="max-w-2xl mx-auto bg-white rounded-[40px] shadow-xl border border-gray-100 p-8 md:p-12">
        {submitted ? (
          <div className="h-full flex flex-col items-center justify-center text-center space-y-6 py-12">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
              <MessageCircle className="h-10 w-10 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">Redirecting to WhatsApp...</h2>
            <p className="text-gray-500">Thank you for reaching out to us.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700">Your Name</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                className="w-full bg-gray-50 border border-transparent rounded-2xl py-4 px-6 focus:bg-white focus:border-green-500 outline-none transition-all"
                placeholder="Your Name"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700">Phone Number</label>
              <input
                type="tel"
                required
                value={formData.phone}
                onChange={(e) => setFormData({...formData, phone: e.target.value})}
                className="w-full bg-gray-50 border border-transparent rounded-2xl py-4 px-6 focus:bg-white focus:border-green-500 outline-none transition-all"
                placeholder="Phone Number"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700">Your Message</label>
              <textarea
                required
                rows={4}
                value={formData.message}
                onChange={(e) => setFormData({...formData, message: e.target.value})}
                className="w-full bg-gray-50 border border-transparent rounded-2xl py-4 px-6 focus:bg-white focus:border-green-500 outline-none transition-all resize-none"
                placeholder="Your Message"
              ></textarea>
            </div>
            <button
              type="submit"
              className="w-full bg-[#1A2E26] hover:bg-[#2A3E36] text-white font-bold py-5 rounded-2xl transition-all shadow-lg shadow-green-200 flex items-center justify-center space-x-2"
            >
              <MessageCircle className="h-5 w-5" />
              <span>Send via WhatsApp</span>
            </button>
          </form>
        )}
      </div>

      {/* Contact Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-20">
        <div className="bg-white p-8 rounded-[32px] border border-gray-100 text-center">
          <div className="w-12 h-12 bg-green-50 rounded-2xl flex items-center justify-center mb-6 mx-auto">
            <MapPin className="h-6 w-6 text-green-700" />
          </div>
          <h3 className="font-bold text-[#1A2E26] mb-2">
            {settings?.contactSection?.info?.location?.title || "Location"}
          </h3>
          <p className="text-sm text-gray-500">
            {settings?.contactSection?.info?.location?.text || FARM_LOCATION}
          </p>
        </div>
        <div className="bg-white p-8 rounded-[32px] border border-gray-100 text-center">
          <div className="w-12 h-12 bg-green-50 rounded-2xl flex items-center justify-center mb-6 mx-auto">
            <MessageCircle className="h-6 w-6 text-green-700" />
          </div>
          <h3 className="font-bold text-[#1A2E26] mb-2">
            {settings?.contactSection?.info?.whatsapp?.title || "WhatsApp"}
          </h3>
          <p className="text-sm text-gray-500">
            {settings?.contactSection?.info?.whatsapp?.text || FARM_WHATSAPP}
          </p>
        </div>
        <div className="bg-white p-8 rounded-[32px] border border-gray-100 text-center">
          <div className="w-12 h-12 bg-green-50 rounded-2xl flex items-center justify-center mb-6 mx-auto">
            <Mail className="h-6 w-6 text-green-700" />
          </div>
          <h3 className="font-bold text-[#1A2E26] mb-2">
            {settings?.contactSection?.info?.email?.title || "Email"}
          </h3>
          <p className="text-sm text-gray-500">
            {settings?.contactSection?.info?.email?.text || FARM_EMAIL}
          </p>
        </div>
      </div>
    </div>
  );
}
