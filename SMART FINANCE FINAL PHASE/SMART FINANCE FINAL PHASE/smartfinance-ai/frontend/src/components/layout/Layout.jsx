import { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, ArrowLeftRight, Target, Receipt,
  Sparkles, TrendingUp, Sun, Moon, Menu, X, LogOut,
  ChevronRight, BarChart2,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

// ── Nav items config ──────────────────────────────────────────────────────────
const NAV_ITEMS = [
  { to: '/',             icon: LayoutDashboard, label: 'Dashboard',    end: true },
  { to: '/transactions', icon: ArrowLeftRight,  label: 'Transactions' },
  { to: '/budgets',      icon: Target,          label: 'Budgets' },
  { to: '/bills',        icon: Receipt,         label: 'Bills' },
  { to: '/charts',       icon: BarChart2,       label: 'Charts' },        // ← Phase 10
  { to: '/ai',           icon: Sparkles,        label: 'AI Reports' },
];

// ── Page titles map ───────────────────────────────────────────────────────────
const PAGE_TITLES = {
  '/':             'Dashboard',
  '/transactions': 'Transactions',
  '/budgets':      'Budgets',
  '/bills':        'Bills',
  '/charts':       'Charts & Analytics',
  '/ai':           'AI Reports',
};

// ── Sidebar ───────────────────────────────────────────────────────────────────
function Sidebar({ open, onClose }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const initials = user?.name
    ? user.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
    : '??';

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 z-20 bg-black/50 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar panel */}
      <aside
        className={`
          fixed top-0 left-0 z-30 h-screen w-64 flex flex-col
          bg-white dark:bg-slate-900
          border-r border-slate-200 dark:border-slate-800
          transition-transform duration-300 ease-in-out
          ${open ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0 lg:static lg:z-auto
        `}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-6 py-5 border-b border-slate-100 dark:border-slate-800">
          <div className="w-8 h-8 bg-ai rounded-lg flex items-center justify-center shadow-sm shadow-blue-500/20 flex-shrink-0">
            <TrendingUp className="w-4 h-4 text-white" strokeWidth={2.5} />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-semibold text-slate-900 dark:text-white truncate">SmartFinance</div>
            <div className="text-[10px] text-ai font-medium uppercase tracking-widest">AI</div>
          </div>
          {/* Close button — mobile only */}
          <button
            onClick={onClose}
            className="ml-auto lg:hidden text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          <p className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-600">
            Menu
          </p>
          {NAV_ITEMS.map(({ to, icon: Icon, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={onClose}
              className={({ isActive }) =>
                `group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 relative
                 ${isActive
                   ? 'bg-ai/10 text-ai dark:text-ai before:absolute before:left-0 before:top-2 before:bottom-2 before:w-0.5 before:bg-ai before:rounded-full'
                   : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                 }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon className={`w-4 h-4 flex-shrink-0 transition-colors ${isActive ? 'text-ai' : 'text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300'}`} />
                  <span className="truncate">{label}</span>
                  {isActive && <ChevronRight className="w-3 h-3 ml-auto text-ai/60" />}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* User + Logout */}
        <div className="px-3 py-4 border-t border-slate-100 dark:border-slate-800 space-y-1">
          {/* User info */}
          <div className="flex items-center gap-3 px-3 py-2 rounded-lg">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-ai to-blue-600 flex items-center justify-center flex-shrink-0">
              <span className="text-white text-xs font-semibold">{initials}</span>
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-medium text-slate-800 dark:text-slate-200 truncate">{user?.name}</div>
              <div className="text-[10px] text-slate-400 dark:text-slate-500 truncate">{user?.email}</div>
            </div>
          </div>

          {/* Logout */}
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-500 dark:text-slate-400
                       hover:bg-expense/10 hover:text-expense transition-colors duration-150"
          >
            <LogOut className="w-4 h-4 flex-shrink-0" />
            <span>Sign out</span>
          </button>
        </div>
      </aside>
    </>
  );
}

// ── Navbar ────────────────────────────────────────────────────────────────────
function Navbar({ onMenuClick }) {
  const { isDark, toggleTheme } = useTheme();
  const location = useLocation();
  const title = PAGE_TITLES[location.pathname] || 'SmartFinance AI';

  return (
    <header className="h-14 flex-shrink-0 flex items-center gap-4 px-4 lg:px-6
                       bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
      {/* Hamburger — mobile only */}
      <button
        onClick={onMenuClick}
        className="lg:hidden p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white
                   hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Page title */}
      <h1 className="text-base font-semibold text-slate-900 dark:text-white flex-1 truncate">
        {title}
      </h1>

      {/* Dark mode toggle */}
      <button
        onClick={toggleTheme}
        className="p-2 rounded-lg text-slate-500 dark:text-slate-400
                   hover:bg-slate-100 dark:hover:bg-slate-800
                   hover:text-slate-900 dark:hover:text-white
                   transition-colors duration-150"
        aria-label="Toggle dark mode"
      >
        {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
      </button>
    </header>
  );
}

// ── Layout root ───────────────────────────────────────────────────────────────
export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  // Close sidebar on route change (mobile)
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex bg-slate-50 dark:bg-slate-950">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main column */}
      <div className="flex-1 flex flex-col min-w-0">
        <Navbar onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 p-4 lg:p-6 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
