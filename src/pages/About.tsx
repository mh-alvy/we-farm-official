import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Leaf, Heart, ShieldCheck } from 'lucide-react';
import { FARM_NAME } from '../constants';
import { db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';
import { SiteSettings } from '../types';

export default function About() {
  const [settings, setSettings] = useState<SiteSettings | null>(null);

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

  const values = [
    {
      title: "Regenerative Soil",
      description: "We nurture the earth that nurtures us, building soil health through composting and crop rotation.",
      icon: Leaf
    },
    {
      title: "Ethical Husbandry",
      description: "Our animals roam freely, eat naturally, and live stress-free — the way nature intended.",
      icon: Heart
    },
    {
      title: "Zero Chemicals",
      description: "No antibiotics, no hormones, no pesticides. Just pure, honest food from our farm to your table.",
      icon: ShieldCheck
    }
  ];

  return (
    <div className="py-20 space-y-24">
      {/* Promise Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            <span className="text-xs font-bold tracking-[0.2em] text-[#8B735B] uppercase mb-4 block">
              {settings?.aboutUsSection?.promise?.tagline || `ABOUT ${FARM_NAME}`}
            </span>
            <h1 className="text-4xl md:text-5xl font-bold text-[#1A2E26] mb-6 leading-tight whitespace-pre-line">
              {settings?.aboutUsSection?.promise?.headline || (
                <>From Soil to Soul — <br />Our Promise</>
              )}
            </h1>
            <p className="text-lg text-gray-600 mb-10 leading-relaxed">
              {settings?.aboutUsSection?.promise?.description || `${FARM_NAME} was born from a belief that food should be grown with integrity. We're a family-run regenerative farm committed to nourishing communities while healing the land.`}
            </p>
            <div className="space-y-8">
              {values.map((value, idx) => (
                <div key={idx} className="flex items-start space-x-4">
                  <div className="bg-[#F7F8F2] p-3 rounded-2xl">
                    <value.icon className="h-6 w-6 text-green-700" />
                  </div>
                  <div>
                    <h3 className="font-bold text-[#1A2E26] mb-1">{value.title}</h3>
                    <p className="text-sm text-gray-500 max-w-md">{value.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
          <div className="relative">
            <img
              src={settings?.aboutUsSection?.promise?.imageUrl || "https://images.unsplash.com/photo-1500651230702-0e2d8a49d4ad?auto=format&fit=crop&q=80&w=1000"}
              alt="Farm soil"
              className="rounded-[40px] shadow-2xl"
              referrerPolicy="no-referrer"
            />
          </div>
        </div>
      </section>

      {/* Vision Section */}
      <section className="bg-[#FDFCF7] py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl font-bold text-[#1A2E26] mb-6">
              {settings?.aboutUsSection?.vision?.headline || "Our Vision"}
            </h2>
            <p className="text-lg text-gray-600 leading-relaxed italic">
              {settings?.aboutUsSection?.vision?.description || `"To create a world where every meal is a connection to the earth, where farming heals instead of harms, and where communities thrive on the bounty of honest soil."`}
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
