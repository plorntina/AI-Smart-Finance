import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Plus, Pencil, Trash2, ChevronLeft, ChevronRight,
  AlertTriangle, RefreshCw, Target, X, Bell,
} from 'lucide-react';
import axiosClient    from '../api/axiosClient';
import { useToast }   from '../hooks/useToast';
import { formatCurrency } from '../utils/formatCurrency';

// ── Constants ────────────────────────────────────────────────────────────────
const REMINDER_KEY = 'sf_bill_reminders';

const CATEGORIES = [
  'Housing', 'Utilities', 'Internet', 'Phone', 'Insurance',
  'Subscription', 'Transport', 'Education', 'Health', 'Other',
];

const FREQUENCIES = ['monthly', 'yearly'];

const EMPTY_FORM = {
  name: '', amount: '', dueDay: '', frequency: 'monthly',
  category: 'Utilities', isPaid: false,
};

// ── Helpers ──────────────────────────────────────────────────────────────────
function daysUntil(nextDueDate) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const due   = new Date(nextDueDate);
  return Math.round((due - today) / 86400000);
}

function StatusBadge({ bill }) {
  if (bill.isPaid) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium
                       bg-income/10 text-income">
        Paid
      </span>
    );
  }
  const d = daysUntil(bill.nextDueDate);
  if (d < 0)  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium
                     bg-expense/10 text-expense">
      {Math.abs(d)}d overdue
    </span>
  );
  if (d === 0) return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium
                     bg-warning/10 text-warning">
      Due today
    </span>
  );
  if (d <= 3)  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium
                     bg-warning/10 text-warning">
      {d}d left
    </span>
  );
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium
                     bg-slate-100 dark:bg-slate-800 text-slate-500">
      {d}d left
    </span>
  );
}

function StatCard({ label, value, sub, valueColor = 'text-slate-900 dark:text-white' }) {
  return (
    <div className="card p-4 flex flex-col gap-1">
      <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
      <p className={`text-xl font-bold ${valueColor}`}>{value}</p>
      {sub && <p className="text-xs text-slate-400">{sub}</p>}
    </div>
  );
}

// ── Bill form modal ──────────────────────────────────────────────────────────
function BillModal({ bill, onClose, onSuccess }) {
  const [form,    setForm]    = useState(bill
    ? { name: bill.name, amount: String(bill.amount), dueDay: String(bill.dueDay),
        frequency: bill.frequency, category: bill.category, isPaid: bill.isPaid }
    : EMPTY_FORM);
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState('');

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async () => {
    if (!form.name.trim())         return setError('Name is required.');
    if (!form.amount || isNaN(form.amount) || Number(form.amount) <= 0)
                                   return setError('Enter a valid positive amount.');
    const dd = Number(form.dueDay);
    if (!dd || dd < 1 || dd > 31) return setError('Due day must be 1–31.');

    setSaving(true); setError('');
    const payload = { ...form, amount: Number(form.amount), dueDay: dd };
    try {
      if (bill) await axiosClient.put(`/bills/${bill._id}`, payload);
      else      await axiosClient.post('/bills', payload);
      onSuccess();
    } catch (e) {
      setError(e.response?.data?.message || 'Save failed.');
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="card w-full max-w-md p-6 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            {bill ? 'Edit Bill' : 'Add Bill'}
          </h2>
          <button onClick={onClose} className="btn-ghost p-1"><X className="w-5 h-5" /></button>
        </div>

        {error && (
          <div className="text-sm text-expense bg-expense/10 border border-expense/20 rounded-lg px-3 py-2">
            {error}
          </div>
        )}

        <div className="flex flex-col gap-3">
          <input className="input" placeholder="Bill name" value={form.name}
                 onChange={e => set('name', e.target.value)} />

          <div className="grid grid-cols-2 gap-3">
            <input className="input" type="number" placeholder="Amount" min="0" value={form.amount}
                   onChange={e => set('amount', e.target.value)} />
            <input className="input" type="number" placeholder="Due day (1–31)" min="1" max="31"
                   value={form.dueDay} onChange={e => set('dueDay', e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <select className="input" value={form.category} onChange={e => set('category', e.target.value)}>
              {CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>
            <select className="input" value={form.frequency} onChange={e => set('frequency', e.target.value)}>
              {FREQUENCIES.map(f => <option key={f}>{f}</option>)}
            </select>
          </div>

          <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300 cursor-pointer">
            <input type="checkbox" className="rounded" checked={form.isPaid}
                   onChange={e => set('isPaid', e.target.checked)} />
            Mark as paid
          </label>
        </div>

        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="btn-ghost">Cancel</button>
          <button onClick={handleSubmit} disabled={saving} className="btn-primary">
            {saving ? 'Saving…' : bill ? 'Update' : 'Add Bill'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Delete confirm ───────────────────────────────────────────────────────────
function DeleteConfirm({ bill, onClose, onDeleted }) {
  const [deleting, setDeleting] = useState(false);
  const handleDelete = async () => {
    setDeleting(true);
    try {
      await axiosClient.delete(`/bills/${bill._id}`);
      onDeleted();
    } catch { /* toast handled upstream */ }
    finally { setDeleting(false); }
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="card w-full max-w-sm p-6 flex flex-col gap-4">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Delete Bill</h2>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Delete <strong>{bill.name}</strong>? This cannot be undone.
        </p>
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="btn-ghost">Cancel</button>
          <button onClick={handleDelete} disabled={deleting} className="btn-danger">
            {deleting ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Group bills by status ─────────────────────────────────────────────────────
function groupBills(bills) {
  const overdue  = [];
  const upcoming = [];
  const paid     = [];

  for (const b of bills) {
    if (b.isPaid) { paid.push(b); continue; }
    const d = daysUntil(b.nextDueDate);
    if (d < 0) overdue.push(b);
    else       upcoming.push(b);
  }

  overdue.sort((a, b) => new Date(a.nextDueDate) - new Date(b.nextDueDate));
  upcoming.sort((a, b) => new Date(a.nextDueDate) - new Date(b.nextDueDate));

  return { overdue, upcoming, paid };
}

// ── Bills Page ────────────────────────────────────────────────────────────────
export default function BillsPage() {
  const [bills,       setBills]       = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState('');
  const [modalOpen,   setModalOpen]   = useState(false);
  const [editingBill, setEditingBill] = useState(null);
  const [deleteBill,  setDeleteBill]  = useState(null);
  const { addToast }                  = useToast();

  // ── Email reminder toggle (Phase 17) ──────────────────────────────────────
  const [remindersOn, setRemindersOn] = useState(
    () => localStorage.getItem(REMINDER_KEY) === 'true'
  );
  const toggleReminders = useCallback((val) => {
    setRemindersOn(val);
    localStorage.setItem(REMINDER_KEY, String(val));
  }, []);

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const fetchBills = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const { data } = await axiosClient.get('/bills');
      setBills(data.bills ?? data.data ?? data ?? []);
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to load bills.');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchBills(); }, [fetchBills]);

  // ── Toggle paid ───────────────────────────────────────────────────────────
  const togglePaid = async (bill) => {
    try {
      await axiosClient.put(`/bills/${bill._id}`, { ...bill, isPaid: !bill.isPaid });
      fetchBills();
      addToast({ message: `"${bill.name}" marked as ${bill.isPaid ? 'unpaid' : 'paid'}.`, type: 'success' });
    } catch (e) {
      addToast({ message: e.response?.data?.message || 'Update failed.', type: 'error' });
    }
  };

  // ── Modal helpers ─────────────────────────────────────────────────────────
  const openAdd   = () => { setEditingBill(null); setModalOpen(true);  };
  const openEdit  = (b) => { setEditingBill(b);   setModalOpen(true);  };
  const closeModal = () => { setModalOpen(false); setEditingBill(null); };

  const handleSuccess = () => {
    closeModal();
    fetchBills();
    addToast({ message: editingBill ? 'Bill updated.' : 'Bill added.', type: 'success' });
  };

  const handleDeleted = () => {
    const name = deleteBill?.name;
    setDeleteBill(null);
    fetchBills();
    addToast({ message: `"${name}" deleted.`, type: 'success' });
  };

  // ── Derived stats ─────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const totalMonthly = bills
      .filter(b => b.frequency === 'monthly')
      .reduce((s, b) => s + b.amount, 0);
    const paidCount  = bills.filter(b => b.isPaid).length;
    const upcomingAmt = bills
      .filter(b => !b.isPaid)
      .reduce((s, b) => s + b.amount, 0);
    return { totalMonthly, paidCount, upcomingAmt };
  }, [bills]);

  const grouped = useMemo(() => groupBills(bills), [bills]);

  const BillRow = ({ bill }) => (
    <div className="flex items-center gap-3 py-3 px-1 border-b border-slate-100 dark:border-slate-800 last:border-0">
      <button
        onClick={() => togglePaid(bill)}
        title={bill.isPaid ? 'Mark unpaid' : 'Mark paid'}
        className={`w-5 h-5 rounded-full border-2 flex-shrink-0 transition-colors
                    ${bill.isPaid
                      ? 'bg-income border-income'
                      : 'border-slate-300 dark:border-slate-600 hover:border-income'}`}
      >
        {bill.isPaid && <svg viewBox="0 0 10 10" fill="white"><path d="M2 5l2.5 2.5L8 3" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>}
      </button>

      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium truncate ${bill.isPaid ? 'line-through text-slate-400' : 'text-slate-900 dark:text-white'}`}>
          {bill.name}
        </p>
        <p className="text-xs text-slate-400">{bill.category} · {bill.frequency} · day {bill.dueDay}</p>
      </div>

      <div className="flex items-center gap-3 flex-shrink-0">
        <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
          {formatCurrency(bill.amount)}
        </span>
        <StatusBadge bill={bill} />
        <div className="flex items-center gap-1">
          <button onClick={() => openEdit(bill)}    className="btn-ghost p-1.5"><Pencil  className="w-3.5 h-3.5" /></button>
          <button onClick={() => setDeleteBill(bill)} className="btn-ghost p-1.5 text-expense hover:bg-expense/10">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );

  const BillGroup = ({ title, bills: groupedBills, titleColor = '' }) => {
    if (!groupedBills.length) return null;
    return (
      <div className="card p-4 flex flex-col gap-1">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
          <Target className={`w-4 h-4 ${titleColor}`} />
          <h3 className={`text-sm font-semibold ${titleColor || 'text-slate-700 dark:text-slate-300'}`}>
            {title}
          </h3>
          <span className="ml-auto text-xs text-slate-400">{groupedBills.length}</span>
        </div>
        {groupedBills.map(b => <BillRow key={b._id} bill={b} />)}
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-6">
      {/* ── Page header ── */}
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-slate-900 dark:text-white">Bills</h1>

        <div className="flex items-center gap-3">
          {/* ── Email reminders toggle (Phase 17) ── */}
          <button
            type="button"
            onClick={() => toggleReminders(!remindersOn)}
            aria-pressed={remindersOn}
            title={remindersOn ? 'Disable email reminders' : 'Enable email reminders'}
            className={[
              'flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium',
              'transition-colors duration-150 select-none',
              remindersOn
                ? 'bg-ai/10 border-ai/30 text-ai'
                : 'bg-transparent border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-ai/40 hover:text-ai',
            ].join(' ')}
          >
            <Bell className={`w-3.5 h-3.5 ${remindersOn ? 'fill-current' : ''}`} />
            <span className="hidden sm:inline">Email reminders</span>
            {/* Toggle pill */}
            <span className={[
              'relative inline-flex h-4 w-7 items-center rounded-full transition-colors duration-200',
              remindersOn ? 'bg-ai' : 'bg-slate-300 dark:bg-slate-600',
            ].join(' ')}>
              <span className={[
                'inline-block h-3 w-3 rounded-full bg-white shadow transition-transform duration-200',
                remindersOn ? 'translate-x-3.5' : 'translate-x-0.5',
              ].join(' ')} />
            </span>
          </button>

          <button onClick={openAdd} className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Add Bill</span>
            <span className="sm:hidden">Add</span>
          </button>
        </div>
      </div>

      {/* ── Email reminder info note (Phase 17) ── */}
      {remindersOn && (
        <div className="flex items-start gap-2.5 bg-ai/8 border border-ai/20 rounded-lg px-4 py-2.5 text-sm text-ai">
          <Bell className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>You'll receive an email at 8 AM for any overdue bills.</span>
        </div>
      )}

      {/* ── Stats row ── */}
      {!loading && bills.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          <StatCard label="Total Monthly"  value={formatCurrency(stats.totalMonthly)} sub="across all bills" />
          <StatCard label="Paid This Month" value={stats.paidCount} valueColor="text-income"
                    sub={`of ${bills.length} bill${bills.length !== 1 ? 's' : ''}`} />
          <StatCard label="Unpaid Amount"  value={formatCurrency(stats.upcomingAmt)}
                    valueColor={stats.upcomingAmt > 0 ? 'text-warning' : 'text-income'} sub="remaining due" />
        </div>
      )}

      {/* ── Error banner ── */}
      {error && (
        <div className="flex items-center gap-3 bg-expense/10 border border-expense/20
                        text-expense px-4 py-3 rounded-lg text-sm">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span className="flex-1">{error}</span>
          <button onClick={fetchBills} className="btn-ghost py-1 px-2 gap-1 flex items-center text-xs">
            <RefreshCw className="w-3 h-3" /> Retry
          </button>
        </div>
      )}

      {/* ── Loading skeleton ── */}
      {loading && (
        <div className="flex flex-col gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="card p-4 h-28 animate-pulse bg-slate-100 dark:bg-slate-800" />
          ))}
        </div>
      )}

      {/* ── Bills list ── */}
      {!loading && bills.length === 0 && (
        <div className="card p-12 flex flex-col items-center gap-3 text-center">
          <Target className="w-10 h-10 text-slate-300 dark:text-slate-600" />
          <p className="text-slate-500 dark:text-slate-400">No bills yet.</p>
          <button onClick={openAdd} className="btn-primary mt-1">Add your first bill</button>
        </div>
      )}

      {!loading && bills.length > 0 && (
        <div className="flex flex-col gap-4">
          <BillGroup title="Overdue"  bills={grouped.overdue}  titleColor="text-expense" />
          <BillGroup title="Upcoming" bills={grouped.upcoming} titleColor="text-warning"  />
          <BillGroup title="Paid"     bills={grouped.paid}     titleColor="text-income"  />
        </div>
      )}

      {/* ── Modals ── */}
      {modalOpen && (
        <BillModal bill={editingBill} onClose={closeModal} onSuccess={handleSuccess} />
      )}
      {deleteBill && (
        <DeleteConfirm bill={deleteBill} onClose={() => setDeleteBill(null)} onDeleted={handleDeleted} />
      )}
    </div>
  );
}