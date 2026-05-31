import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  TrendingUp, TrendingDown, Target, Wallet,
  ArrowUpRight, ArrowDownLeft, AlertTriangle, RefreshCw,
} from 'lucide-react';
import axiosClient from '../api/axiosClient';
import { formatCurrency, formatShortDate } from '../utils/formatCurrency';

// ── Skeleton pulse block ──────────────────────────────────────────────────────
function Skeleton({ className = '' }) {
  return <div className={`animate-pulse rounded-lg bg-slate-200 dark:bg-slate-700 ${className}`} />;
}

// ── KPI card ─────────────────────────────────────────────────────────────────
function KpiCard({ label, value, icon: Icon, iconBg, iconColor, loading, prefix = '$', note }) {
  return (
    <div className="card p-5 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wider text-slate-400 dark:text-slate-500">
          {label}
        </span>
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${iconBg}`}>
          <Icon className={`w-4 h-4 ${iconColor}`} />
        </div>
      </div>
      {loading ? (
        <Skeleton className="h-8 w-32" />
      ) : (
        <div className={`text-2xl font-semibold amount ${iconColor === 'text-income' ? 'text-income' : iconColor === 'text-expense' ? 'text-expense' : iconColor === 'text-warning' ? 'text-warning' : 'text-slate-900 dark:text-white'}`}>
          {formatCurrency(value)}
        </div>
      )}
      {note && !loading && (
        <p className="text-xs text-slate-400 dark:text-slate-500 -mt-2">{note}</p>
      )}
    </div>
  );
}

// ── Recent transaction row ────────────────────────────────────────────────────
function TxnRow({ txn }) {
  const isIncome = txn.type === 'income';
  return (
    <div className="flex items-center gap-3 py-3 border-b border-slate-100 dark:border-slate-700/50 last:border-0">
      {/* Icon bubble */}
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0
                       ${isIncome ? 'bg-income/10' : 'bg-expense/10'}`}>
        {isIncome
          ? <ArrowDownLeft className="w-4 h-4 text-income" />
          : <ArrowUpRight   className="w-4 h-4 text-expense" />
        }
      </div>

      {/* Description + category */}
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">
          {txn.description || txn.category}
        </div>
        <div className="flex items-center gap-1.5 mt-0.5">
          <span className="text-[10px] px-1.5 py-0.5 rounded-md font-medium
                           bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400">
            {txn.category}
          </span>
          <span className="text-[10px] text-slate-400 dark:text-slate-500">
            {formatShortDate(txn.date)}
          </span>
        </div>
      </div>

      {/* Amount */}
      <div className={`text-sm font-semibold amount flex-shrink-0 ${isIncome ? 'text-income' : 'text-expense'}`}>
        {isIncome ? '+' : '-'}{formatCurrency(txn.amount)}
      </div>
    </div>
  );
}

// ── Budget progress bar row ───────────────────────────────────────────────────
function BudgetRow({ budget }) {
  const { category, limit, spent, percentUsed, isOverBudget } = budget;
  const pct = Math.min(100, percentUsed);

  const barColor = isOverBudget
    ? 'bg-expense'
    : pct >= 80
    ? 'bg-warning'
    : 'bg-income';

  const pctColor = isOverBudget
    ? 'text-expense'
    : pct >= 80
    ? 'text-warning'
    : 'text-income';

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-1.5">
          {isOverBudget && <AlertTriangle className="w-3 h-3 text-expense flex-shrink-0" />}
          <span className="font-medium text-slate-700 dark:text-slate-300 capitalize">{category}</span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="amount text-slate-500 dark:text-slate-400">
            {formatCurrency(spent)} / {formatCurrency(limit)}
          </span>
          <span className={`font-semibold ${pctColor}`}>{pct.toFixed(0)}%</span>
        </div>
      </div>
      {/* Track */}
      <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${barColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// ── Loading skeletons for sections ────────────────────────────────────────────
function SectionSkeleton({ rows = 3 }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className={`h-10 ${i % 2 === 0 ? 'w-full' : 'w-4/5'}`} />
      ))}
    </div>
  );
}

// ── Dashboard Page ────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data: res } = await axiosClient.get('/dashboard');
      setData(res);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load dashboard data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchDashboard(); }, [fetchDashboard]);

  // ── Derived values ──────────────────────────────────────────────────────────
  const remainingBudget = data?.budgetSummary?.reduce((acc, b) => acc + b.remaining, 0) ?? 0;

  // ── Error state ─────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
        <div className="w-12 h-12 rounded-full bg-expense/10 flex items-center justify-center">
          <AlertTriangle className="w-5 h-5 text-expense" />
        </div>
        <p className="text-slate-600 dark:text-slate-400 text-sm">{error}</p>
        <button onClick={fetchDashboard} className="btn-ghost gap-2">
          <RefreshCw className="w-4 h-4" />
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">

      {/* ── KPI row ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard
          label="Total Balance"
          value={data?.totalBalance}
          icon={Wallet}
          iconBg="bg-slate-100 dark:bg-slate-700"
          iconColor="text-slate-600 dark:text-slate-300"
          loading={loading}
          note="All time"
        />
        <KpiCard
          label="Total Income"
          value={data?.totalIncome}
          icon={TrendingUp}
          iconBg="bg-income/10"
          iconColor="text-income"
          loading={loading}
          note="All time"
        />
        <KpiCard
          label="Total Expenses"
          value={data?.totalExpenses}
          icon={TrendingDown}
          iconBg="bg-expense/10"
          iconColor="text-expense"
          loading={loading}
          note="All time"
        />
        <KpiCard
          label="Remaining Budget"
          value={remainingBudget}
          icon={Target}
          iconBg="bg-warning/10"
          iconColor="text-warning"
          loading={loading}
          note={`${data?.budgetSummary?.length ?? 0} active budgets`}
        />
      </div>

      {/* ── Two-column bottom section ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Recent Transactions */}
        <div className="card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Recent Transactions</h2>
            <Link
              to="/transactions"
              className="text-xs text-ai hover:underline font-medium flex items-center gap-0.5"
            >
              View all <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>

          {loading ? (
            <SectionSkeleton rows={5} />
          ) : data?.recentTransactions?.length ? (
            <div>
              {data.recentTransactions.map((txn) => (
                <TxnRow key={txn._id} txn={txn} />
              ))}
            </div>
          ) : (
            <div className="py-8 text-center">
              <p className="text-sm text-slate-400 dark:text-slate-500">No transactions yet.</p>
              <Link to="/transactions" className="text-xs text-ai hover:underline mt-1 inline-block">
                Add your first transaction →
              </Link>
            </div>
          )}
        </div>

        {/* Budget Summary */}
        <div className="card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Budget Summary</h2>
            <Link
              to="/budgets"
              className="text-xs text-ai hover:underline font-medium flex items-center gap-0.5"
            >
              Manage <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>

          {/* Current month label */}
          {!loading && data?.currentMonth?.label && (
            <p className="text-xs text-slate-400 dark:text-slate-500 -mt-2">
              {data.currentMonth.label}
            </p>
          )}

          {loading ? (
            <SectionSkeleton rows={4} />
          ) : data?.budgetSummary?.length ? (
            <div className="space-y-4">
              {data.budgetSummary.map((b) => (
                <BudgetRow key={b.category} budget={b} />
              ))}
            </div>
          ) : (
            <div className="py-8 text-center">
              <p className="text-sm text-slate-400 dark:text-slate-500">No budgets set yet.</p>
              <Link to="/budgets" className="text-xs text-ai hover:underline mt-1 inline-block">
                Create a budget →
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
