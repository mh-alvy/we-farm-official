import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Beef, 
  Wallet, 
  Package, 
  ShoppingCart, 
  TrendingUp, 
  Settings,
  ArrowLeft,
  Users,
  Layout,
  X,
  Moon,
  BookOpen
} from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

interface SidebarProps {
  isMobileOpen?: boolean;
  setIsMobileOpen?: (open: boolean) => void;
}

export default function Sidebar({ isMobileOpen, setIsMobileOpen }: SidebarProps) {
  const location = useLocation();

  const menuItems = [
    { name: 'Dashboard', path: '/admin', icon: LayoutDashboard },
    { name: 'Livestock (Cows)', path: '/admin/cows', icon: Beef },
    { name: 'Users', path: '/admin/users', icon: Users },
    { name: 'Finances', path: '/admin/finances', icon: Wallet },
    { name: 'Accounts Ledger', path: '/admin/accounts', icon: BookOpen },
    { name: 'Inventory', path: '/admin/inventory', icon: Package },
    { name: 'Orders', path: '/admin/orders', icon: ShoppingCart },
    { name: 'Projects', path: '/admin/projects', icon: LayoutDashboard },
    { name: 'Investments', path: '/admin/investments', icon: TrendingUp },
    { name: 'Site Content', path: '/admin/settings', icon: Layout },
    { name: 'Islamic Bar', path: '/admin/islamic-bar', icon: Moon },
  ];

  const handleLinkClick = () => {
    if (setIsMobileOpen) setIsMobileOpen(false);
  };

  const sidebarContent = (
    <div className="w-64 bg-white border-r border-gray-200 flex flex-col h-full shadow-lg lg:shadow-none">
      <div className="p-6 flex flex-col h-full">
        <div className="flex items-center justify-between lg:block mb-8">
          <Link to="/" className="flex items-center space-x-2 text-green-600">
            <ArrowLeft className="h-4 w-4" />
            <span className="text-sm font-medium">Back to Site</span>
          </Link>
          <button 
            onClick={() => setIsMobileOpen?.(false)}
            className="lg:hidden p-2 text-gray-400 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <h2 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4">
          Admin Panel
        </h2>
        <nav className="space-y-1 flex-1 overflow-y-auto no-scrollbar">
          {menuItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              onClick={handleLinkClick}
              className={cn(
                "flex items-center space-x-3 px-4 py-3 lg:py-2.5 rounded-xl text-sm font-semibold transition-all duration-200",
                location.pathname === item.path
                  ? "bg-green-600 text-white shadow-md shadow-green-200"
                  : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
              )}
            >
              <item.icon className="h-5 w-5" />
              <span>{item.name}</span>
            </Link>
          ))}
        </nav>
        
        <div className="pt-6 mt-6 border-t border-gray-100">
          <button className="flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-semibold text-gray-500 hover:bg-gray-50 hover:text-gray-900 w-full transition-all">
            <Settings className="h-5 w-5" />
            <span>Settings</span>
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <div className="hidden lg:flex h-full">
        {sidebarContent}
      </div>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {isMobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileOpen?.(false)}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 lg:hidden"
            />
            <motion.div
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 left-0 z-50 lg:hidden"
            >
              {sidebarContent}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
