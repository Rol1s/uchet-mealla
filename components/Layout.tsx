import React, { useState } from 'react';
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
  Menu,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { user, isAdmin, signOut } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

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

  const closeSidebar = () => setSidebarOpen(false);

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 px-4 py-3 rounded-lg text-base font-medium transition-colors min-h-[48px] ${
      isActive ? 'bg-blue-600 text-white shadow-md' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
    }`;

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden safe-area-inset">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={closeSidebar}
          aria-hidden="true"
        />
      )}

      {/* Sidebar: drawer on mobile, fixed on desktop */}
      <aside
        className={`
          fixed lg:static inset-y-0 left-0 z-50
          w-72 max-w-[85vw] lg:w-64
          bg-slate-900 text-white flex flex-col flex-shrink-0 shadow-xl
          transform transition-transform duration-200 ease-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        <div className="p-4 lg:p-6 border-b border-slate-700 flex items-center justify-between">
          <h1 className="text-lg lg:text-xl font-bold tracking-wider flex items-center gap-2">
            <div className="w-9 h-9 lg:w-8 lg:h-8 bg-blue-600 rounded flex items-center justify-center font-bold text-sm lg:text-base">M</div>
            METALL PRO
          </h1>
          <button
            type="button"
            onClick={closeSidebar}
            className="lg:hidden p-2 -m-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 touch-manipulation"
            aria-label="Закрыть меню"
          >
            <X size={24} />
          </button>
        </div>
        <p className="text-xs text-slate-400 px-4 lg:px-6 pb-2 hidden lg:block">Система учета</p>

        <nav className="flex-1 p-3 lg:p-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={closeSidebar}
              className={({ isActive }) => linkClass({ isActive })}
            >
              <item.icon size={20} className="flex-shrink-0" />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="p-3 lg:p-4 border-t border-slate-700">
          {user && (
            <div className="flex items-center gap-3 mb-3 px-1">
              <div className="w-11 h-11 rounded-full bg-slate-700 flex items-center justify-center flex-shrink-0">
                <User size={22} className="text-slate-300" />
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
            type="button"
            onClick={handleSignOut}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-base font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition-colors min-h-[48px] touch-manipulation"
          >
            <LogOut size={20} />
            Выйти
          </button>
        </div>

        <div className="p-3 lg:p-4 border-t border-slate-700 text-center">
          <span className="text-xs text-slate-500">v2.0.0 Supabase</span>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 flex flex-col overflow-hidden relative min-w-0">
        <header className="bg-white h-14 lg:h-16 border-b border-slate-200 flex items-center justify-between px-4 lg:px-8 shadow-sm z-10 flex-shrink-0">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-2 -ml-2 rounded-lg text-slate-600 hover:bg-slate-100 touch-manipulation"
            aria-label="Открыть меню"
          >
            <Menu size={28} />
          </button>
          <h2 className="text-base lg:text-lg font-semibold text-slate-700 truncate flex-1 text-center lg:text-left lg:ml-0 ml-4">
            Панель управления
          </h2>
          <div className="flex items-center gap-2 lg:gap-4 flex-shrink-0">
            <span className={`badge text-xs lg:text-sm px-2.5 py-1 ${isAdmin ? 'badge-orange' : 'badge-blue'}`}>
              {isAdmin ? 'Админ' : 'Оператор'}
            </span>
          </div>
        </header>
        <div className="flex-1 overflow-y-auto p-4 lg:p-8 bg-slate-50">
          <div className="max-w-7xl mx-auto pb-6 lg:pb-10">{children}</div>
        </div>
      </main>
    </div>
  );
};

export default Layout;
