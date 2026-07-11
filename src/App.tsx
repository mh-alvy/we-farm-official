import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import AdminLayout from './components/AdminLayout';

import MainPage from './pages/MainPage';
import Login from './pages/Login';

// Admin Pages
import AdminDashboard from './pages/admin/Dashboard';
import AdminCows from './pages/admin/Cows';
import AdminFinances from './pages/admin/Finances';
import AdminInventory from './pages/admin/Inventory';
import AdminOrders from './pages/admin/Orders';
import AdminInvestments from './pages/admin/Investments';
import AdminProjects from './pages/admin/Projects';

import UserProfile from './pages/Profile';
import AdminUsers from './pages/admin/Users';
import AdminSiteSettings from './pages/admin/SiteSettings';
import AdminIslamicAnnouncementSettings from './pages/admin/IslamicAnnouncementSettings';

export default function App() {
  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<Layout />}>
          <Route index element={<MainPage />} />
          <Route path="login" element={<Login />} />
          <Route path="profile" element={<UserProfile />} />
        </Route>

        {/* Admin Routes */}
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<AdminDashboard />} />
          <Route path="cows" element={<AdminCows />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="settings" element={<AdminSiteSettings />} />
          <Route path="islamic-bar" element={<AdminIslamicAnnouncementSettings />} />
          <Route path="finances" element={<AdminFinances />} />
          <Route path="inventory" element={<AdminInventory />} />
          <Route path="orders" element={<AdminOrders />} />
          <Route path="investments" element={<AdminInvestments />} />
          <Route path="projects" element={<AdminProjects />} />
        </Route>
      </Routes>
    </Router>
  );
}
