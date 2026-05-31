import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { useAuth } from './context/AuthContext';

// Pages
import LoginPage       from './pages/Auth/LoginPage';
import RegisterPage    from './pages/Auth/RegisterPage';
import DashboardPage   from './pages/DashboardPage';
import TransactionsPage from './pages/TransactionsPage';
import BudgetsPage     from './pages/BudgetsPage';
import BillsPage       from './pages/BillsPage';
import AIReportsPage   from './pages/AIReportsPage';
import ChartsPage      from './pages/ChartsPage';       // ← Phase 10

// Layout wrapper
import Layout from './components/layout/Layout';

// ── Route guards ──────────────────────────────────────────────────────────────

function ProtectedRoute() {
  const { user, loading } = useAuth();
  if (loading) return <FullPageSpinner />;
  return user ? <Outlet /> : <Navigate to="/login" replace />;
}

function PublicRoute() {
  const { user, loading } = useAuth();
  if (loading) return <FullPageSpinner />;
  return user ? <Navigate to="/" replace /> : <Outlet />;
}

function FullPageSpinner() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
      <div className="w-8 h-8 border-4 border-ai border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

// ── Router ────────────────────────────────────────────────────────────────────

export default function App() {
  return (
    <Routes>
      {/* Public routes */}
      <Route element={<PublicRoute />}>
        <Route path="/login"    element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
      </Route>

      {/* Protected routes — inside shared Layout */}
      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route path="/"             element={<DashboardPage />} />
          <Route path="/transactions" element={<TransactionsPage />} />
          <Route path="/budgets"      element={<BudgetsPage />} />
          <Route path="/bills"        element={<BillsPage />} />
          <Route path="/ai"           element={<AIReportsPage />} />
          <Route path="/charts"       element={<ChartsPage />} />
        </Route>
      </Route>

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
