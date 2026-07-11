import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import Footer from './Footer';
import IslamicAnnouncementBar from './IslamicAnnouncementBar';

export default function Layout() {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <IslamicAnnouncementBar />
      <Navbar />
      <main className="flex-grow">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
