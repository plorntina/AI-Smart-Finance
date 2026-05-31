// frontend/src/pages/TransactionsPage.jsx  —  Phase 15 (full replacement)
// Adds: Export dropdown (CSV / XLSX) with blob download, loading state, toasts
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Plus, Search, ArrowDownLeft, ArrowUpRight, ArrowLeftRight,
  Pencil, Trash2, ChevronLeft, ChevronRight, X, AlertTriangle,
  RefreshCw, SlidersHorizontal, CalendarDays,
  Download, FileText, FileSpreadsheet, Loader2,  // ← Phase 15
} from 'lucide-react';
import axiosClient from '../api/axiosClient';
import { formatCurrency, formatDate } from '../utils/formatCurrency';
import { ToastContainer, useToast } from '../components/ui/Toast';

// ── Categories ────────────────────────────────────────────────────────────────
const CATEGORIES = {
  income:  ['salary', 'freelance', 'investment', 'gift', 'refund', 'other'],
  expense: [
    'food', 'transport', 'housing', 'utilities', 'healthcare',
    'entertainment', 'education', 'shopping', 'subscriptions',
    'travel', 'personal', 'other',
  ],
};
const ALL_CATEGORIES = [...new Set([...CATEGORIES.income, ...CATEGORIES.expense])].sort();

const SORT_OPTIONS = [
  { value: 'date_desc',   label: 'Newest first' },
  { value: 'date_asc',    label: 'Oldest first' },
  { value: 'amount_asc',  label: 'Amount ↑' },
  { value: 'amount_desc', label: 'Amount ↓' },
];

const EMPTY_FILTERS = {
  search:    '',
  type:      '',
  category:  '',
  startDate: '',
  endDate:   '',
  sort:      'date_desc',
};

const EMPTY_FORM = {
  type:        'expense',
  amount:      '',
  category:    'food',
  description: '',
  date:        new Date().toISOString().split('T')[0],
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function Skeleton({ className = '' }) {
  return <div className={`animate-pulse rounded-lg bg-slate-200 dark:bg-slate-700 ${className}`} />;
}

function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 py-3.5 border-b border-slate-100 dark:border-slate-700/50">
      <Skeleton className="w-9 h-9 rounded-xl flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-3.5 w-40" />
        <Skeleton className="h-2.5 w-24" />
      </div>
      <div className="flex items-center gap-2">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-7 w-7 rounded-lg" />
        <Skeleton className="h-7 w-7 rounded-lg" />
      </div>
    </div>
  );
}

// Group transactions by "Month Year"
function groupByMonth(transactions) {
  const groups = {};
  transactions.forEach((txn) => {
    const d = new Date(txn.date);
    const key = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    if (!groups[key]) groups[key] = [];
    groups[key].push(txn);
  });
  return groups;
}

// ── Transaction Row ───────────────────────────────────────────────────────────
function TransactionRow({ txn, onEdit, onDelete }) {
  const isIncome = txn.type === 'income';
  return (
    <div className="flex items-center gap-3 py-3.5 border-b border-slate-100 dark:border-slate-700/50 last:border-0 group">
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0
        ${isIncome
          ? 'bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400'
          : 'bg-red-50 dark:bg-red-900/30 text-red-500 dark:text-red-400'}`}>
        {isIncome
          ? <ArrowDownLeft className="w-4 h-4" />
          : <ArrowUpRight  className="w-4 h-4" />}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate capitalize">
          {txn.description || txn.category}
        </p>
        <p className="text-xs text-slate-400 dark:text-slate-500 capitalize mt-0.5">
          {txn.category} · {formatDate(txn.date)}
        </p>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        <span className={`text-sm font-semibold tabular-nums
          ${isIncome ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'}`}>
          {isIncome ? '+' : '-'}{formatCurrency(txn.amount)}
        </span>
        <button
          onClick={() => onEdit(txn)}
          className="btn-ghost p-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
          aria-label="Edit"
        >
          <Pencil className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => onDelete(txn)}
          className="btn-ghost p-1.5 text-red-400 hover:text-red-600 dark:hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
          aria-label="Delete"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

// ── Transaction Modal ─────────────────────────────────────────────────────────
// onSuccess is now called with the budgetAlerts array so the parent can toast.
function TransactionModal({ open, onClose, editingTxn, onSuccess }) {
  const [form, setForm]       = useState(EMPTY_FORM);
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState('');

  useEffect(() => {
    if (editingTxn) {
      setForm({
        type:        editingTxn.type,
        amount:      String(editingTxn.amount),
        category:    editingTxn.category,
        description: editingTxn.description || '',
        date:        new Date(editingTxn.date).toISOString().split('T')[0],
      });
    } else {
      setForm(EMPTY_FORM);
    }
    setError('');
  }, [editingTxn, open]);

  if (!open) return null;

  const handleChange = (e) =>
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async () => {
    if (!form.amount || isNaN(form.amount) || +form.amount <= 0) {
      setError('Please enter a valid amount.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      let budgetAlerts = [];
      if (editingTxn) {
        await axiosClient.put(`/transactions/${editingTxn._id}`, {
          ...form,
          amount: parseFloat(form.amount),
        });
      } else {
        const { data } = await axiosClient.post('/transactions', {
          ...form,
          amount: parseFloat(form.amount),
        });
        budgetAlerts = data.budgetAlerts || [];
      }
      onSuccess(budgetAlerts);
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong.');
    } finally {
      setSaving(false);
    }
  };

  const categories = form.type ? CATEGORIES[form.type] : ALL_CATEGORIES;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="card w-full max-w-md p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-800 dark:text-white">
            {editingTxn ? 'Edit Transaction' : 'New Transaction'}
          </h2>
          <button onClick={onClose} className="btn-ghost p-1.5">
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <p className="text-xs text-red-500 flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" /> {error}
          </p>
        )}

        {/* Type */}
        <div className="grid grid-cols-2 gap-2">
          {['expense', 'income'].map((t) => (
            <button
              key={t}
              onClick={() =>
                setForm((prev) => ({
                  ...prev,
                  type: t,
                  category: CATEGORIES[t][0],
                }))
              }
              className={`py-2 rounded-lg text-sm font-medium border transition-colors capitalize
                ${form.type === t
                  ? t === 'income'
                    ? 'bg-green-500 text-white border-green-500'
                    : 'bg-red-500 text-white border-red-500'
                  : 'bg-transparent text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600 hover:border-slate-300 dark:hover:border-slate-500'
                }`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Amount */}
        <div>
          <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Amount</label>
          <input
            type="number"
            name="amount"
            min="0.01"
            step="0.01"
            value={form.amount}
            onChange={handleChange}
            placeholder="0.00"
            className="input mt-1 w-full"
          />
        </div>

        {/* Category */}
        <div>
          <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Category</label>
          <select
            name="category"
            value={form.category}
            onChange={handleChange}
            className="input mt-1 w-full capitalize"
          >
            {categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        {/* Description */}
        <div>
          <label className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Description <span className="font-normal text-slate-400">(optional)</span>
          </label>
          <input
            type="text"
            name="description"
            value={form.description}
            onChange={handleChange}
            placeholder="e.g. Lunch at café"
            className="input mt-1 w-full"
          />
        </div>

        {/* Date */}
        <div>
          <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Date</label>
          <input
            type="date"
            name="date"
            value={form.date}
            onChange={handleChange}
            className="input mt-1 w-full"
          />
        </div>

        <div className="flex gap-2 pt-2">
          <button onClick={onClose} className="btn-ghost flex-1">Cancel</button>
          <button onClick={handleSubmit} disabled={saving} className="btn-primary flex-1 flex items-center justify-center gap-2">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {saving ? 'Saving…' : editingTxn ? 'Save changes' : 'Add transaction'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Delete Confirm Modal ──────────────────────────────────────────────────────
function DeleteModal({ txn, onClose, onConfirm, deleting }) {
  if (!txn) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="card w-full max-w-sm p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-5 h-5 text-red-500" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-slate-800 dark:text-white">Delete transaction?</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">This action cannot be undone.</p>
          </div>
        </div>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          <span className="font-medium capitalize">{txn.description || txn.category}</span>
          {' · '}
          <span className={txn.type === 'income' ? 'text-green-600 dark:text-green-400' : 'text-red-500'}>
            {txn.type === 'income' ? '+' : '-'}{formatCurrency(txn.amount)}
          </span>
        </p>
        <div className="flex gap-2">
          <button onClick={onClose} className="btn-ghost flex-1">Cancel</button>
          <button onClick={onConfirm} disabled={deleting} className="btn-danger flex-1 flex items-center justify-center gap-2">
            {deleting && <Loader2 className="w-4 h-4 animate-spin" />}
            {deleting ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Export Dropdown ───────────────────────────────────────────────────────────
// Phase 15: download CSV or XLSX applying the current active filters.
function ExportDropdown({ filters, addToast }) {
  const [open, setOpen]         = useState(false);
  const [exporting, setExporting] = useState(null); // 'csv' | 'xlsx' | null
  const dropRef = useRef(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (dropRef.current && !dropRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const handleExport = async (format) => {
    setOpen(false);
    setExporting(format);
    try {
      const params = { format };
      if (filters.type)      params.type      = filters.type;
      if (filters.category)  params.category  = filters.category;
      if (filters.startDate) params.startDate = filters.startDate;
      if (filters.endDate)   params.endDate   = filters.endDate;

      const response = await axiosClient.get('/transactions/export', {
        params,
        responseType: 'blob',
      });

      // Derive filename from Content-Disposition header or build a fallback
      const disposition = response.headers['content-disposition'] || '';
      const match = disposition.match(/filename="?([^"]+)"?/);
      const filename = match ? match[1] : `transactions.${format}`;

      // Trigger browser download
      const url = URL.createObjectURL(new Blob([response.data]));
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);

      addToast({
        type:    'success',
        message: `${format.toUpperCase()} exported successfully.`,
      });
    } catch {
      addToast({
        type:    'error',
        message: 'Export failed. Please try again.',
      });
    } finally {
      setExporting(null);
    }
  };

  const isLoading = exporting !== null;

  return (
    <div className="relative" ref={dropRef}>
      <button
        onClick={() => setOpen((v) => !v)}
        disabled={isLoading}
        className="btn-ghost flex items-center gap-2 text-sm py-2 px-3 border border-slate-200 dark:border-slate-700"
        aria-label="Export transactions"
      >
        {isLoading
          ? <Loader2 className="w-4 h-4 animate-spin" />
          : <Download className="w-4 h-4" />}
        <span className="hidden sm:inline">Export</span>
      </button>

      {open && !isLoading && (
        <div className="absolute right-0 mt-1.5 w-44 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-lg z-20 overflow-hidden">
          <button
            onClick={() => handleExport('csv')}
            className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/60 transition-colors"
          >
            <FileText className="w-4 h-4 text-slate-400" />
            Export CSV
          </button>
          <button
            onClick={() => handleExport('xlsx')}
            className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/60 transition-colors"
          >
            <FileSpreadsheet className="w-4 h-4 text-green-500" />
            Export XLSX
          </button>
        </div>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function TransactionsPage() {
  const [transactions, setTransactions] = useState([]);
  const [pagination,   setPagination]   = useState({ total: 0, page: 1, totalPages: 1 });
  const [loading,      setLoading]      = useState(true);
  const [page,         setPage]         = useState(1);

  const [modalOpen,    setModalOpen]    = useState(false);
  const [editingTxn,   setEditingTxn]   = useState(null);
  const [deleteTxn,    setDeleteTxn]    = useState(null);
  const [deleting,     setDeleting]     = useState(false);

  const [filters, setFilters]   = useState(EMPTY_FILTERS);

  const { toasts, addToast, removeToast } = useToast();

  // ── Derived: any active filter? ───────────────────────────────────────────
  const hasActiveFilter = useMemo(() =>
    filters.search || filters.type || filters.category ||
    filters.startDate || filters.endDate || filters.sort !== 'date_desc',
  [filters]);

  // ── Fetch ─────────────────────────────────────────────────────────────────
  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    try {
      const [sortField, sortOrder] = filters.sort.split('_');
      const { data } = await axiosClient.get('/transactions', {
        params: {
          page,
          limit: 20,
          sort: sortField,
          order: sortOrder,
          ...(filters.search    && { search:    filters.search }),
          ...(filters.type      && { type:      filters.type }),
          ...(filters.category  && { category:  filters.category }),
          ...(filters.startDate && { startDate: filters.startDate }),
          ...(filters.endDate   && { endDate:   filters.endDate }),
        },
      });
      setTransactions(data.transactions);
      setPagination(data.pagination);
    } catch {
      addToast({ type: 'error', message: 'Failed to load transactions.' });
    } finally {
      setLoading(false);
    }
  }, [filters, page]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  // Reset to page 1 when filters change
  useEffect(() => { setPage(1); }, [filters]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const setFilter = (key) => (e) =>
    setFilters((prev) => ({ ...prev, [key]: e.target.value }));

  const clearFilters = () => setFilters(EMPTY_FILTERS);

  const openAdd  = () => { setEditingTxn(null); setModalOpen(true); };
  const openEdit = (txn) => { setEditingTxn(txn); setModalOpen(true); };

  const handleModalSuccess = useCallback((budgetAlerts = []) => {
    fetchTransactions();
    // Fire a toast for each budget alert
    budgetAlerts.forEach((alert) => {
      addToast({
        type: alert.isOverBudget ? 'error' : 'warning',
        message: alert.isOverBudget
          ? `Over budget! You've spent ${formatCurrency(alert.spent)} of your ${formatCurrency(alert.limit)} ${alert.category} budget.`
          : `Heads up: ${alert.percentUsed}% of your ${alert.category} budget used this month.`,
      });
    });
  }, [fetchTransactions, addToast]);

  const handleDelete = async () => {
    if (!deleteTxn) return;
    setDeleting(true);
    try {
      await axiosClient.delete(`/transactions/${deleteTxn._id}`);
      setDeleteTxn(null);
      fetchTransactions();
      addToast({ type: 'success', message: 'Transaction deleted.' });
    } catch {
      addToast({ type: 'error', message: 'Failed to delete transaction.' });
    } finally {
      setDeleting(false);
    }
  };

  // ── Group by month ────────────────────────────────────────────────────────
  const grouped = useMemo(() => groupByMonth(transactions), [transactions]);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">
      {/* ── Page header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-white">Transactions</h1>
          {!loading && (
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
              {pagination.total} total record{pagination.total !== 1 ? 's' : ''}
            </p>
          )}
        </div>
        {/* Header actions: Export + Add ── Phase 15 adds ExportDropdown */}
        <div className="flex items-center gap-2">
          <ExportDropdown filters={filters} addToast={addToast} />
          <button onClick={openAdd} className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Add Transaction</span>
            <span className="sm:hidden">Add</span>
          </button>
        </div>
      </div>

      {/* ── Filter / search bar ── */}
      <div className="card p-4 space-y-3">
        <div className="flex items-center gap-2 flex-wrap">
          <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
          <span className="text-xs font-medium uppercase tracking-wider text-slate-400">Filters</span>
          {hasActiveFilter && (
            <button
              onClick={clearFilters}
              className="btn-ghost ml-auto text-xs py-1 px-2.5 gap-1.5 flex items-center"
            >
              <X className="w-3 h-3" /> Clear
            </button>
          )}
        </div>

        {/* Row 1: Search + Type + Category */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Search */}
          <div className="relative sm:col-span-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search description…"
              value={filters.search}
              onChange={setFilter('search')}
              className="input pl-9 w-full text-sm"
            />
          </div>

          {/* Type */}
          <select value={filters.type} onChange={setFilter('type')} className="input text-sm">
            <option value="">All types</option>
            <option value="income">Income</option>
            <option value="expense">Expense</option>
          </select>

          {/* Category */}
          <select value={filters.category} onChange={setFilter('category')} className="input text-sm capitalize">
            <option value="">All categories</option>
            {ALL_CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        {/* Row 2: Date range + Sort */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="relative">
            <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
            <input
              type="date"
              value={filters.startDate}
              onChange={setFilter('startDate')}
              className="input pl-9 w-full text-sm"
            />
          </div>
          <div className="relative">
            <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
            <input
              type="date"
              value={filters.endDate}
              onChange={setFilter('endDate')}
              className="input pl-9 w-full text-sm"
            />
          </div>
          <select value={filters.sort} onChange={setFilter('sort')} className="input text-sm">
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* ── Transaction list ── */}
      <div className="card p-0 overflow-hidden">
        {loading ? (
          <div className="p-4 space-y-0">
            {Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} />)}
          </div>
        ) : transactions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center px-4">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center mb-3">
              <ArrowLeftRight className="w-5 h-5 text-slate-400" />
            </div>
            <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
              {hasActiveFilter ? 'No transactions match your filters' : 'No transactions yet'}
            </p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
              {hasActiveFilter
                ? 'Try adjusting or clearing the filters above'
                : 'Add your first transaction to get started'}
            </p>
            {hasActiveFilter && (
              <button onClick={clearFilters} className="btn-ghost mt-3 text-xs flex items-center gap-1.5">
                <X className="w-3.5 h-3.5" /> Clear filters
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-transparent">
            {Object.entries(grouped).map(([month, txns]) => (
              <div key={month}>
                {/* Month header */}
                <div className="px-4 pt-4 pb-1 flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    {month}
                  </span>
                  <span className="text-xs text-slate-400 dark:text-slate-500">
                    {txns.length} item{txns.length !== 1 ? 's' : ''}
                  </span>
                </div>
                <div className="px-4">
                  {txns.map((txn) => (
                    <TransactionRow
                      key={txn._id}
                      txn={txn}
                      onEdit={openEdit}
                      onDelete={setDeleteTxn}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Pagination ── */}
        {!loading && pagination.totalPages > 1 && (
          <div className="px-4 py-3 border-t border-slate-100 dark:border-slate-700/50 flex items-center justify-between">
            <span className="text-xs text-slate-400 dark:text-slate-500">
              Page {pagination.page} of {pagination.totalPages}
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={!pagination.hasPrevPage}
                className="btn-ghost p-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                disabled={!pagination.hasNextPage}
                className="btn-ghost p-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Refresh hint ── */}
      {!loading && transactions.length > 0 && (
        <button
          onClick={fetchTransactions}
          className="btn-ghost text-xs flex items-center gap-1.5 mx-auto"
        >
          <RefreshCw className="w-3 h-3" /> Refresh
        </button>
      )}

      {/* ── Modals ── */}
      <TransactionModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        editingTxn={editingTxn}
        onSuccess={handleModalSuccess}
      />
      <DeleteModal
        txn={deleteTxn}
        onClose={() => setDeleteTxn(null)}
        onConfirm={handleDelete}
        deleting={deleting}
      />

      <ToastContainer toasts={toasts} onDismiss={removeToast} />
    </div>
  );
}