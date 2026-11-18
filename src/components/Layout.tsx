import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import Footer from './Footer';
import IslamicAnnouncementBar from './IslamicAnnouncementBar';
import SoilToSoulChatbot from './SoilToSoulChatbot';
import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { doc, onSnapshot } from 'firebase/firestore';

export default function Layout() {
  const [isBarActive, setIsBarActive] = useState(false);

  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, 'settings', 'islamic_bar'), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        setIsBarActive(!!data.enabled);
      } else {
        setIsBarActive(true); // Default enabled fallback
      }
    }, () => {
      setIsBarActive(true); // Fallback on error
    });
    return unsubscribe;
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <IslamicAnnouncementBar />
      <Navbar isBarActive={isBarActive} />
      <main className="flex-grow">
        <Outlet />
      </main>
      <Footer />
      <SoilToSoulChatbot />
    </div>
  );
}
