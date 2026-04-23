import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../../firebase';
import { Cow, Expense, Income, Order, Investment } from '../../types';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  LineChart, Line, AreaChart, Area, PieChart, Pie, Cell 
} from 'recharts';
import { 
  TrendingUp, TrendingDown, Beef, ShoppingCart, 
  DollarSign, Users, ArrowUpRight, ArrowDownRight, Droplets
} from 'lucide-react';
import { formatCurrency } from '../../lib/utils';
import { startOfMonth, isAfter } from 'date-fns';

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    totalCows: 0,
    totalRevenue: 0,
    totalExpenses: 0,
    totalOrders: 0,
    totalInvestments: 0,
    monthlyMilk: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      const [cows, expenses, incomes, orders, investments, milkLogs] = await Promise.all([
        getDocs(collection(db, 'cows')),
        getDocs(collection(db, 'expenses')),
        getDocs(collection(db, 'incomes')),
        getDocs(collection(db, 'orders')),
        getDocs(collection(db, 'investments')),
        getDocs(collection(db, 'milkLogs'))
      ]);

      const totalRev = incomes.docs.reduce((sum, doc) => sum + (Number(doc.data().amount) || 0), 0);
      const totalExp = expenses.docs.reduce((sum, doc) => sum + (Number(doc.data().amount) || 0), 0);
      const totalInv = investments.docs.reduce((sum, doc) => sum + (Number(doc.data().amount) || 0), 0);
      
      const startOfCurrentMonth = startOfMonth(new Date());
      const monthlyMilk = milkLogs.docs.reduce((sum, doc) => {
        const logDate = new Date(doc.data().date);
        return isAfter(logDate, startOfCurrentMonth) ? sum + (Number(doc.data().amount) || 0) : sum;
      }, 0);

      setStats({
        totalCows: cows.size,
        totalRevenue: totalRev,
        totalExpenses: totalExp,
        totalOrders: orders.size,
        totalInvestments: totalInv,
        monthlyMilk
      });
      setLoading(false);
    };
    fetchStats();
  }, []);

  const financialData = [
    { name: 'Jan', income: 4000, expense: 2400 },
    { name: 'Feb', income: 3000, expense: 1398 },
    { name: 'Mar', income: 2000, expense: 9800 },
    { name: 'Apr', income: 2780, expense: 3908 },
    { name: 'May', income: 1890, expense: 4800 },
    { name: 'Jun', income: 2390, expense: 3800 },
  ];

  const COLORS = ['#16a34a', '#ef4444', '#3b82f6', '#f59e0b'];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard Overview</h1>
        <div className="text-sm text-gray-500">Last updated: {new Date().toLocaleDateString()}</div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Total Revenue" 
          value={formatCurrency(stats.totalRevenue)} 
          trend="+12.5%" 
          icon={DollarSign} 
          color="text-green-600"
          bg="bg-green-50"
        />
        <StatCard 
          title="Total Expenses" 
          value={formatCurrency(stats.totalExpenses)} 
          trend="-2.4%" 
          icon={TrendingDown} 
          color="text-red-600"
          bg="bg-red-50"
        />
        <StatCard 
          title="Active Livestock" 
          value={stats.totalCows.toString()} 
          trend="+4" 
          icon={Beef} 
          color="text-blue-600"
          bg="bg-blue-50"
        />
        <StatCard 
          title="Total Investments" 
          value={formatCurrency(stats.totalInvestments)} 
          trend="+18%" 
          icon={TrendingUp} 
          color="text-amber-600"
          bg="bg-amber-50"
        />
        <StatCard 
          title="Monthly Milk Production" 
          value={`${stats.monthlyMilk.toFixed(2)} L/Kg`} 
          trend="+5.2%" 
          icon={Droplets} 
          color="text-blue-600"
          bg="bg-blue-50"
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <h3 className="text-lg font-bold text-gray-900 mb-6">Financial Performance</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={financialData}>
                <defs>
                  <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#16a34a" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#16a34a" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 12}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 12}} />
                <Tooltip 
                  contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}}
                />
                <Area type="monotone" dataKey="income" stroke="#16a34a" fillOpacity={1} fill="url(#colorIncome)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <h3 className="text-lg font-bold text-gray-900 mb-6">Expense Distribution</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={[
                    { name: 'Feed', value: 400 },
                    { name: 'Vaccines', value: 300 },
                    { name: 'Labor', value: 300 },
                    { name: 'Maintenance', value: 200 },
                  ]}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {financialData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-4 mt-4">
            {['Feed', 'Vaccines', 'Labor', 'Maintenance'].map((cat, i) => (
              <div key={cat} className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full" style={{backgroundColor: COLORS[i]}}></div>
                <span className="text-xs text-gray-500">{cat}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, trend, icon: Icon, color, bg }: any) {
  const isPositive = trend.startsWith('+');
  return (
    <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
      <div className="flex justify-between items-start mb-4">
        <div className={cn("p-3 rounded-xl", bg)}>
          <Icon className={cn("h-6 w-6", color)} />
        </div>
        <div className={cn(
          "flex items-center text-xs font-bold px-2 py-1 rounded-full",
          isPositive ? "text-green-600 bg-green-50" : "text-red-600 bg-red-50"
        )}>
          {isPositive ? <ArrowUpRight className="h-3 w-3 mr-1" /> : <ArrowDownRight className="h-3 w-3 mr-1" />}
          {trend}
        </div>
      </div>
      <div className="text-sm font-medium text-gray-500 mb-1">{title}</div>
      <div className="text-2xl font-bold text-gray-900">{value}</div>
    </div>
  );
}

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}
