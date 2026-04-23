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
  Layout
} from 'lucide-react';
import { cn } from '../lib/utils';

export default function Sidebar() {
  const location = useLocation();

  const menuItems = [
    { name: 'Dashboard', path: '/admin', icon: LayoutDashboard },
    { name: 'Livestock (Cows)', path: '/admin/cows', icon: Beef },
    { name: 'Users', path: '/admin/users', icon: Users },
    { name: 'Finances', path: '/admin/finances', icon: Wallet },
    { name: 'Inventory', path: '/admin/inventory', icon: Package },
    { name: 'Orders', path: '/admin/orders', icon: ShoppingCart },
    { name: 'Projects', path: '/admin/projects', icon: LayoutDashboard },
    { name: 'Investments', path: '/admin/investments', icon: TrendingUp },
    { name: 'Site Content', path: '/admin/settings', icon: Layout },
  ];

  return (
    <div className="w-64 bg-white border-r border-gray-200 flex flex-col h-full">
      <div className="p-6">
        <Link to="/" className="flex items-center space-x-2 text-green-600 mb-8">
          <ArrowLeft className="h-4 w-4" />
          <span className="text-sm font-medium">Back to Site</span>
        </Link>
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">
          Admin Panel
        </h2>
        <nav className="space-y-1">
          {menuItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                location.pathname === item.path
                  ? "bg-green-50 text-green-600"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              )}
            >
              <item.icon className="h-5 w-5" />
              <span>{item.name}</span>
            </Link>
          ))}
        </nav>
      </div>
      <div className="mt-auto p-6 border-t border-gray-100">
        <button className="flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 w-full transition-colors">
          <Settings className="h-5 w-5" />
          <span>Settings</span>
        </button>
      </div>
    </div>
  );
}
