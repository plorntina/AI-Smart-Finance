import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Plus, Pencil, Trash2, ChevronLeft, ChevronRight,
  AlertTriangle, RefreshCw, Target, X,
} from 'lucide-react';
import axiosClient from '../api/axiosClient';
import { formatCurrency } from '../utils/formatCurrency';

// ── Expense categories (for budget assignment) ─────────────────────────────
const EXPENSE_CATEGORIES = [
  'food', 'transport', 'housing', 'utilities', 'healthcare',
  'entertainment', 'education', 'shopping', 'subscriptions',
  'travel', 'personal', 'other',
];

// ── Helpers ────────────────────────────────────────────────────────────────
function Skeleton({ className = '' }) {
  return <div className={`animate-pulse rounded-lg bg-slate-200 dark:bg-slate-700 ${className}`} />;
}

function SkeletonCard() {
  return (
    <div className="card p-5 space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-24" />
        <div className="flex gap-1.5">
          <Skeleton className="h-7 w-7 rounded-lg" />
          <Skeleton className="h-7 w-7 rounded-lg" />
        </div>
      </div>
      <div className="space-y-2">
        <div className="flex justify-between">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-3 w-16" />
        </div>
        <Skeleton className="h-2 w-full rounded-full" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Skeleton className="h-10 rounded-lg" />
        <Skeleton className="h-10 rounded-lg" />
      </div>
    </div>
  );
}

// Bar color logic — matches DashboardPage exactly
function getBarColor(pct, isOverBudget) {
  if (isOverBudget) return 'bg-expense';
  if (pct >= 80)    return 'bg-warning';
  return 'bg-income';
}
function getPctColor(pct, isOverBudget) {
  if (isOverBudget) return 'text-expense';
  if (pct >= 80)    return 'text-warning';
  return 'text-income';
}

// Month navigation helpers
function monthLabel(year, month) {
  return new Date(year, month - 1, 1).toLocaleDateString('en-US', {
    month: 'long',
    year:  'numeric',
  });
}
function addMonth(year, month, delta) {
  const d = new Date(year, month - 1 + delta, 1);
  return { year: d.getFullYear(), month: d.getMonth() + 1 };
}
function toYYYYMM(year, month) {
  return `${year}-${String(month).padStart(2, '0')}`;
}

// ── Budget Card ────────────────────────────────────────────────────────────
function BudgetCard({ budget, onEdit, onDelete }) {
  const { category, limit, spent, remaining, percentUsed, isOverBudget } = budget;
  const pct      = Math.min(100, percentUsed ?? 0);
  const barColor = getBarColor(pct, isOverBudget);
  const pctColor = getPctColor(pct, isOverBudget);

  return (
    <div className="card p-5 space-y-4 group">
      {/* Header row */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          {isOverBudget && (
            <AlertTriangle className="w-4 h-4 text-expense flex-shrink-0" />
          )}
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 capitalize truncate">
            {category}
          </h3>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => onEdit(budget)}
            className="w-7 h-7 rounded-lg flex items-center justify-center
                       text-slate-400 hover:text-ai hover:bg-ai/10
                       dark:text-slate-500 dark:hover:text-ai dark:hover:bg-ai/10 transition-colors"
            title="Edit budget"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onDelete(budget)}
            className="w-7 h-7 rounded-lg flex items-center justify-center
                       text-slate-400 hover:text-expense hover:bg-expense/10
                       dark:text-slate-500 dark:hover:text-expense dark:hover:bg-expense/10 transition-colors"
            title="Delete budget"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Progress */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-500 dark:text-slate-400">
            {formatCurrency(spent)} <span className="text-slate-300 dark:text-slate-600">/</span> {formatCurrency(limit)}
          </span>
          <span className={`font-semibold ${pctColor}`}>
            {pct.toFixed(0)}%
          </span>
        </div>
        <div className="h-2 w-full bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-700 ${barColor}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-3">
          <p className="text-[10px] font-medium uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1">
            Spent
          </p>
          <p className="text-sm font-semibold text-expense amount">
            {formatCurrency(spent)}
          </p>
        </div>
        <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-3">
          <p className="text-[10px] font-medium uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1">
            Remaining
          </p>
          <p className={`text-sm font-semibold amount ${remaining < 0 ? 'text-expense' : 'text-income'}`}>
            {formatCurrency(Math.abs(remaining))}
            {remaining < 0 && <span className="text-[10px] font-medium ml-0.5">over</span>}
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Budget Modal ───────────────────────────────────────────────────────────
function BudgetModal({ open, onClose, editingBudget, existingCategories, currentMonth, onSuccess }) {
  const [category,   setCategory]   = useState('food');
  const [limit,      setLimit]      = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error,      setError]      = useState('');

  // Available categories: all expense cats minus those already budgeted (except when editing current)
  const availableCategories = useMemo(() => {
    return EXPENSE_CATEGORIES.filter(
      (c) => !existingCategories.includes(c) || c === editingBudget?.category
    );
  }, [existingCategories, editingBudget]);

  useEffect(() => {
    if (open) {
      if (editingBudget) {
        setCategory(editingBudget.category);
        setLimit(editingBudget.limit);
      } else {
        setCategory(availableCategories[0] ?? 'food');
        setLimit('');
      }
      setError('');
    }
  }, [open, editingBudget, availableCategories]);

  const handleSubmit = async () => {
    if (!limit || Number(limit) <= 0) {
      setError('Please enter a valid limit amount.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const payload = {
        category,
        limit:  Number(limit),
        month:  currentMonth,
      };
      if (editingBudget) {
        await axiosClient.put(`/budgets/${editingBudget._id}`, payload);
      } else {
        await axiosClient.post('/budgets', payload);
      }
      onSuccess();
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4
                 bg-black/50 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full sm:max-w-md bg-white dark:bg-slate-900
                      rounded-t-2xl sm:rounded-2xl shadow-2xl
                      border border-slate-200 dark:border-slate-700">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4
                        border-b border-slate-100 dark:border-slate-800">
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">
            {editingBudget ? 'Edit Budget' : 'Add Budget'}
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center
                       text-slate-400 hover:text-slate-600 hover:bg-slate-100
                       dark:hover:text-slate-200 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-5">
          {/* Month (read-only) */}
          <div>
            <label className="text-xs font-medium uppercase tracking-wider text-slate-400 dark:text-slate-500 block mb-2">
              Month
            </label>
            <div className="input w-full bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 cursor-default select-none">
              {currentMonth}
            </div>
          </div>

          {/* Category */}
          <div>
            <label className="text-xs font-medium uppercase tracking-wider text-slate-400 dark:text-slate-500 block mb-2">
              Category
            </label>
            {availableCategories.length === 0 ? (
              <p className="text-sm text-slate-400 dark:text-slate-500 italic">
                All categories already have budgets this month.
              </p>
            ) : (
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                disabled={!!editingBudget}
                className="input w-full capitalize disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {availableCategories.map((c) => (
                  <option key={c} value={c} className="capitalize">{c}</option>
                ))}
              </select>
            )}
          </div>

          {/* Limit */}
          <div>
            <label className="text-xs font-medium uppercase tracking-wider text-slate-400 dark:text-slate-500 block mb-2">
              Monthly Limit
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 text-sm font-medium">
                $
              </span>
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={limit}
                onChange={(e) => setLimit(e.target.value)}
                className="input pl-7 w-full"
              />
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-start gap-2 bg-expense/10 border border-expense/20
                            text-expense px-4 py-3 rounded-lg text-sm">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 flex items-center gap-3">
          <button onClick={onClose} className="btn-ghost flex-1" disabled={submitting}>
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting || availableCategories.length === 0}
            className="btn-primary flex-1 flex items-center justify-center gap-2"
          >
            {submitting && (
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            )}
            {submitting ? 'Saving…' : editingBudget ? 'Save changes' : 'Add budget'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Budgets Page ───────────────────────────────────────────────────────────
export default function BudgetsPage() {
  const today       = new Date();
  const [year,  setYear]  = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);

  const [budgets,      setBudgets]      = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState('');
  const [modalOpen,    setModalOpen]    = useState(false);
  const [editingBudget, setEditingBudget] = useState(null);

  const currentMonth = toYYYYMM(year, month);

  // ── Fetch ──────────────────────────────────────────────────────────────
  const fetchBudgets = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await axiosClient.get('/budgets', {
        params: { month: currentMonth },
      });
      setBudgets(data.budgets ?? data.data ?? data ?? []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load budgets.');
    } finally {
      setLoading(false);
    }
  }, [currentMonth]);

  useEffect(() => { fetchBudgets(); }, [fetchBudgets]);

  // ── Month navigation ───────────────────────────────────────────────────
  const navigateMonth = (delta) => {
    const next = addMonth(year, month, delta);
    setYear(next.year);
    setMonth(next.month);
  };

  // ── Modal ──────────────────────────────────────────────────────────────
  const openAdd  = () => { setEditingBudget(null); setModalOpen(true); };
  const openEdit = (b) => { setEditingBudget(b);   setModalOpen(true); };
  const closeModal = () => { setModalOpen(false); setEditingBudget(null); };
  const handleSuccess = () => { closeModal(); fetchBudgets(); };

  const handleDelete = async (budget) => {
    const confirmed = window.confirm(
      `Delete budget for "${budget.category}" (${formatCurrency(budget.limit)}/mo)?`
    );
    if (!confirmed) return;
    try {
      await axiosClient.delete(`/budgets/${budget._id}`);
      fetchBudgets();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete budget.');
    }
  };

  // ── Summary ────────────────────────────────────────────────────────────
  const summary = useMemo(() => {
    const totalBudgeted = budgets.reduce((a, b) => a + (b.limit  ?? 0), 0);
    const totalSpent    = budgets.reduce((a, b) => a + (b.spent  ?? 0), 0);
    const overallPct    = totalBudgeted > 0 ? (totalSpent / totalBudgeted) * 100 : 0;
    return { totalBudgeted, totalSpent, overallPct };
  }, [budgets]);

  const existingCategories = useMemo(() => budgets.map((b) => b.category), [budgets]);

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <div className="max-w-5xl mx-auto space-y-5">

      {/* ── Page header ── */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-900 dark:text-white">Budgets</h1>
        <button onClick={openAdd} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Add Budget</span>
          <span className="sm:hidden">Add</span>
        </button>
      </div>

      {/* ── Month selector ── */}
      <div className="card p-4 flex items-center justify-between">
        <button
          onClick={() => navigateMonth(-1)}
          className="btn-ghost p-2 w-9 h-9 flex items-center justify-center"
          title="Previous month"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="text-sm font-semibold text-slate-800 dark:text-slate-200 min-w-[160px] text-center">
          {monthLabel(year, month)}
        </span>
        <button
          onClick={() => navigateMonth(1)}
          className="btn-ghost p-2 w-9 h-9 flex items-center justify-center"
          title="Next month"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* ── Error banner ── */}
      {error && (
        <div className="flex items-center gap-3 bg-expense/10 border border-expense/20
                        text-expense px-4 py-3 rounded-lg text-sm">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span className="flex-1">{error}</span>
          <button onClick={fetchBudgets} className="btn-ghost py-1 px-2 gap-1 flex items-center text-xs">
            <RefreshCw className="w-3 h-3" /> Retry
          </button>
        </div>
      )}

      {/* ── Summary card (only shown when there's data) ── */}
      {!loading && budgets.length > 0 && (
        <div className="card p-5">
          <h2 className="text-xs font-medium uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-4">
            Monthly Summary
          </h2>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-[10px] font-medium uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1">
                Total Budgeted
              </p>
              <p className="text-lg font-semibold text-slate-800 dark:text-slate-200 amount">
                {formatCurrency(summary.totalBudgeted)}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-medium uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1">
                Total Spent
              </p>
              <p className="text-lg font-semibold text-expense amount">
                {formatCurrency(summary.totalSpent)}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-medium uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1">
                Overall Used
              </p>
              <p className={`text-lg font-semibold amount ${
                summary.overallPct >= 100 ? 'text-expense'
                  : summary.overallPct >= 80 ? 'text-warning'
                  : 'text-income'
              }`}>
                {summary.overallPct.toFixed(0)}%
              </p>
            </div>
          </div>
          {/* Overall progress bar */}
          <div className="mt-4 h-1.5 w-full bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ${
                summary.overallPct >= 100 ? 'bg-expense'
                  : summary.overallPct >= 80 ? 'bg-warning'
                  : 'bg-income'
              }`}
              style={{ width: `${Math.min(100, summary.overallPct)}%` }}
            />
          </div>
        </div>
      )}

      {/* ── Budget cards grid ── */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[0, 1, 2].map((i) => <SkeletonCard key={i} />)}
        </div>
      ) : budgets.length === 0 ? (
        <div className="card flex flex-col items-center justify-center py-16 px-6 text-center">
          <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800
                          flex items-center justify-center mb-3">
            <Target className="w-5 h-5 text-slate-400" />
          </div>
          <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
            No budgets set for {monthLabel(year, month)}
          </p>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
            Add a budget to start tracking your spending limits
          </p>
          <button onClick={openAdd} className="btn-primary mt-4 gap-2 flex items-center">
            <Plus className="w-4 h-4" /> Add budget
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {budgets.map((budget) => (
            <BudgetCard
              key={budget._id}
              budget={budget}
              onEdit={openEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {/* ── Modal ── */}
      <BudgetModal
        open={modalOpen}
        onClose={closeModal}
        editingBudget={editingBudget}
        existingCategories={existingCategories}
        currentMonth={currentMonth}
        onSuccess={handleSuccess}
      />
    </div>
  );
}
