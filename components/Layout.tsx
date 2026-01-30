import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  ArrowLeftRight,
  Package,
  Hammer,
  Book,
  Building2,
  Boxes,
  History,
  LogOut,
  User,
  HelpCircle,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { user, isAdmin, signOut } = useAuth();

  const navItems = [
    { to: '/', label: 'Главная', icon: LayoutDashboard },
    { to: '/movements', label: 'Движение', icon: ArrowLeftRight },
    { to: '/inventory', label: 'Остатки', icon: Package },
    { to: '/works', label: 'Работы', icon: Hammer },
    { to: '/companies', label: 'Компании', icon: Building2 },
    { to: '/materials', label: 'Материалы', icon: Boxes },
    { to: '/rates', label: 'Тарифы', icon: Book },
    { to: '/help', label: 'База знаний', icon: HelpCircle },
    ...(isAdmin ? [{ to: '/history', label: 'История', icon: History }] : []),
  ];

  const handleSignOut = async () => {
    if (window.confirm('Выйти из системы?')) {
      try {
        await signOut();
      } catch (error) {
        console.error('Sign out failed:', error);
      }
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 text-white flex flex-col flex-shrink-0 shadow-xl z-20">
        <div className="p-6 border-b border-slate-700">
          <h1 className="text-xl font-bold tracking-wider flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center font-bold">M</div>
            METALL PRO
          </h1>
          <p className="text-xs text-slate-400 mt-1">Система учета</p>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`
              }
            >
              <item.icon size={18} />
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* User Info & Logout */}
        <div className="p-4 border-t border-slate-700">
          {user && (
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center">
                <User size={20} className="text-slate-300" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{user.name || user.email}</p>
                <p className="text-xs text-slate-400">
                  {user.role === 'admin' ? 'Администратор' : 'Оператор'}
                </p>
              </div>
            </div>
          )}
          <button
            onClick={handleSignOut}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
          >
            <LogOut size={18} />
            Выйти
          </button>
        </div>

        <div className="p-4 border-t border-slate-700 text-center">
          <span className="text-xs text-slate-500">v2.0.0 Supabase</span>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        <header className="bg-white h-16 border-b border-slate-200 flex items-center justify-between px-8 shadow-sm z-10">
          <h2 className="text-lg font-semibold text-slate-700">Панель управления</h2>
          <div className="flex items-center gap-4">
            <span
              className={`badge ${isAdmin ? 'badge-orange' : 'badge-blue'}`}
            >
              {isAdmin ? 'Админ' : 'Оператор'}
            </span>
          </div>
        </header>
        <div className="flex-1 overflow-y-auto p-8 bg-slate-50">
          <div className="max-w-7xl mx-auto pb-10">{children}</div>
        </div>
      </main>
    </div>
  );
};

export default Layout;
