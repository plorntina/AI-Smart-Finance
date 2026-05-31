import { useState, useEffect, useCallback } from 'react';
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  LineChart, Line, Area, AreaChart,
} from 'recharts';
import {
  TrendingUp, TrendingDown, PieChart as PieIcon,
  BarChart2, Activity, RefreshCw, AlertTriangle,
  ChevronLeft, ChevronRight,
} from 'lucide-react';
import axiosClient from '../api/axiosClient';
import { formatCurrency } from '../utils/formatCurrency';

// ── Helpers ───────────────────────────────────────────────────────────────────

function Skeleton({ className = '' }) {
  return <div className={`animate-pulse rounded-lg bg-slate-200 dark:bg-slate-700 ${className}`} />;
}

// Month navigation
function currentYM() {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1 };
}
function ymToString({ year, month }) {
  return `${year}-${String(month).padStart(2, '0')}`;
}
function ymLabel({ year, month }) {
  return new Date(year, month - 1, 1).toLocaleDateString('en-US', {
    month: 'long', year: 'numeric',
  });
}
function addMonth({ year, month }, delta) {
  const d = new Date(year, month - 1 + delta, 1);
  return { year: d.getFullYear(), month: d.getMonth() + 1 };
}

// Recharts tooltip wrapper consistent with the app theme
function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700
                    rounded-xl shadow-lg px-3 py-2 text-xs space-y-1">
      {label && <p className="font-semibold text-slate-700 dark:text-slate-300 mb-1">{label}</p>}
      {payload.map((entry, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: entry.color }} />
          <span className="text-slate-500 dark:text-slate-400">{entry.name}:</span>
          <span className="font-semibold amount text-slate-800 dark:text-slate-200">
            {formatCurrency(entry.value)}
          </span>
        </div>
      ))}
    </div>
  );
}

// Pie chart custom label — category + percentage
function PieLabel({ cx, cy, midAngle, innerRadius, outerRadius, percent, name }) {
  if (percent < 0.04) return null; // hide tiny slices
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central"
          fontSize={10} fontWeight={600}>
      {(percent * 100).toFixed(0)}%
    </text>
  );
}

// Colour palette for categories — deterministic
const PALETTE = [
  '#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6',
  '#06b6d4', '#f97316', '#ec4899', '#10b981', '#6366f1',
  '#84cc16', '#14b8a6',
];
function colourForIndex(i) {
  return PALETTE[i % PALETTE.length];
}

// ── Section header ─────────────────────────────────────────────────────────────
function SectionHeader({ icon: Icon, title, subtitle }) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-8 h-8 rounded-lg bg-ai/10 flex items-center justify-center flex-shrink-0">
        <Icon className="w-4 h-4 text-ai" />
      </div>
      <div>
        <h2 className="text-sm font-semibold text-slate-900 dark:text-white">{title}</h2>
        {subtitle && <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{subtitle}</p>}
      </div>
    </div>
  );
}

// ── KPI mini-card ─────────────────────────────────────────────────────────────
function MiniKpi({ label, value, color = 'text-slate-900 dark:text-white', loading }) {
  return (
    <div className="card p-4">
      <p className="text-[10px] font-medium uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1.5">
        {label}
      </p>
      {loading
        ? <Skeleton className="h-6 w-28" />
        : <p className={`text-lg font-semibold amount ${color}`}>{value}</p>
      }
    </div>
  );
}

// ── Category legend row ───────────────────────────────────────────────────────
function CategoryLegend({ data }) {
  const total = data.reduce((s, d) => s + d.spent, 0);
  return (
    <div className="space-y-2 mt-2">
      {data.map((item, i) => {
        const pct = total > 0 ? (item.spent / total) * 100 : 0;
        return (
          <div key={item.category} className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ background: colourForIndex(i) }} />
            <span className="text-xs text-slate-600 dark:text-slate-400 flex-1 capitalize truncate">
              {item.category}
            </span>
            <span className="text-xs font-medium amount text-slate-700 dark:text-slate-300">
              {formatCurrency(item.spent)}
            </span>
            <span className="text-[10px] text-slate-400 dark:text-slate-500 w-8 text-right">
              {pct.toFixed(0)}%
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ── Month navigator ───────────────────────────────────────────────────────────
function MonthNavigator({ ym, onChange }) {
  const now = currentYM();
  const isCurrentMonth = ym.year === now.year && ym.month === now.month;
  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => onChange(addMonth(ym, -1))}
        className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700
                   text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>
      <span className="text-sm font-medium text-slate-700 dark:text-slate-300 min-w-[130px] text-center">
        {ymLabel(ym)}
      </span>
      <button
        onClick={() => onChange(addMonth(ym, 1))}
        disabled={isCurrentMonth}
        className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700
                   text-slate-400 hover:text-slate-700 dark:hover:text-slate-300
                   transition-colors disabled:opacity-30 disabled:pointer-events-none"
      >
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
}

// ── Empty chart state ─────────────────────────────────────────────────────────
function EmptyChart({ message = 'No data for this period' }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-700
                      flex items-center justify-center mb-2">
        <BarChart2 className="w-5 h-5 text-slate-300 dark:text-slate-500" />
      </div>
      <p className="text-sm text-slate-400 dark:text-slate-500">{message}</p>
    </div>
  );
}

// ── Charts Page ───────────────────────────────────────────────────────────────
export default function ChartsPage() {
  const [ym, setYm]                           = useState(currentYM());
  const [categoryData,   setCategoryData]     = useState([]);
  const [monthlyTrend,   setMonthlyTrend]     = useState([]);
  const [monthSummary,   setMonthSummary]     = useState(null);
  const [loadingMonthly, setLoadingMonthly]   = useState(true);
  const [loadingTrend,   setLoadingTrend]     = useState(true);
  const [error,          setError]            = useState('');

  // ── Fetch current-month category breakdown ──────────────────────────────────
  const fetchMonthly = useCallback(async () => {
    setLoadingMonthly(true);
    setError('');
    try {
      const monthParam = ymToString(ym);

      // Use the dashboard endpoint — it already computes categoryBreakdown
      // We also fetch transactions summary for income vs expense KPIs
      const { data } = await axiosClient.get('/dashboard');

      // Filter category breakdown to the selected month via a dedicated transactions query
      const txRes = await axiosClient.get('/transactions', {
        params: {
          type:      'expense',
          startDate: `${monthParam}-01`,
          endDate:   `${monthParam}-31`,
          limit:     500,
        },
      });

      const txns = txRes.data.transactions ?? [];

      // Aggregate by category
      const catMap = {};
      let totalExpense = 0;
      txns.forEach(({ category, amount }) => {
        catMap[category] = (catMap[category] || 0) + amount;
        totalExpense += amount;
      });

      const catData = Object.entries(catMap)
        .sort(([, a], [, b]) => b - a)
        .map(([category, spent]) => ({ category, spent: parseFloat(spent.toFixed(2)) }));

      // Income for selected month
      const incRes = await axiosClient.get('/transactions', {
        params: {
          type:      'income',
          startDate: `${monthParam}-01`,
          endDate:   `${monthParam}-31`,
          limit:     500,
        },
      });
      const totalIncome = (incRes.data.transactions ?? []).reduce((s, t) => s + t.amount, 0);

      setCategoryData(catData);
      setMonthSummary({
        totalIncome:   parseFloat(totalIncome.toFixed(2)),
        totalExpenses: parseFloat(totalExpense.toFixed(2)),
        balance:       parseFloat((totalIncome - totalExpense).toFixed(2)),
        topCategory:   catData[0] ?? null,
      });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load chart data.');
    } finally {
      setLoadingMonthly(false);
    }
  }, [ym]);

  // ── Fetch 6-month trend ─────────────────────────────────────────────────────
  const fetchTrend = useCallback(async () => {
    setLoadingTrend(true);
    try {
      const { data } = await axiosClient.get('/dashboard');
      // monthlyTrend is returned by dashboard service as last 6 months
      const trend = (data.monthlyTrend ?? []).map((m) => ({
        ...m,
        // Shorten label: "2025-04" → "Apr"
        label: new Date(`${m.month}-01`).toLocaleDateString('en-US', { month: 'short' }),
      }));
      setMonthlyTrend(trend);
    } catch {
      // Non-fatal — trend is secondary
    } finally {
      setLoadingTrend(false);
    }
  }, []);

  useEffect(() => { fetchMonthly(); }, [fetchMonthly]);
  useEffect(() => { fetchTrend(); },  [fetchTrend]);

  const piePalette = categoryData.map((_, i) => colourForIndex(i));

  // ── Error full-page state ───────────────────────────────────────────────────
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
        <div className="w-12 h-12 rounded-full bg-expense/10 flex items-center justify-center">
          <AlertTriangle className="w-5 h-5 text-expense" />
        </div>
        <p className="text-slate-600 dark:text-slate-400 text-sm">{error}</p>
        <button
          onClick={() => { fetchMonthly(); fetchTrend(); }}
          className="btn-ghost gap-2"
        >
          <RefreshCw className="w-4 h-4" /> Try again
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">

      {/* ── Header row ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-base font-semibold text-slate-900 dark:text-white">Charts & Analytics</h1>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
            Visual breakdown of your financial activity
          </p>
        </div>
        <MonthNavigator ym={ym} onChange={setYm} />
      </div>

      {/* ── KPI strip ── */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        <MiniKpi
          label="Income"
          value={formatCurrency(monthSummary?.totalIncome)}
          color="text-income"
          loading={loadingMonthly}
        />
        <MiniKpi
          label="Expenses"
          value={formatCurrency(monthSummary?.totalExpenses)}
          color="text-expense"
          loading={loadingMonthly}
        />
        <MiniKpi
          label="Net Balance"
          value={formatCurrency(monthSummary?.balance)}
          color={monthSummary?.balance >= 0 ? 'text-income' : 'text-expense'}
          loading={loadingMonthly}
        />
        <MiniKpi
          label="Top Expense"
          value={monthSummary?.topCategory
            ? `${monthSummary.topCategory.category} (${formatCurrency(monthSummary.topCategory.spent)})`
            : '—'}
          loading={loadingMonthly}
        />
      </div>

      {/* ── Row 1: Pie + Legend ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Pie chart — expense distribution */}
        <div className="card p-5 space-y-4">
          <SectionHeader
            icon={PieIcon}
            title="Expense Distribution"
            subtitle={`By category · ${ymLabel(ym)}`}
          />

          {loadingMonthly ? (
            <div className="flex items-center justify-center h-48">
              <div className="w-8 h-8 border-4 border-ai border-t-transparent rounded-full animate-spin" />
            </div>
          ) : categoryData.length === 0 ? (
            <EmptyChart message="No expenses recorded this month" />
          ) : (
            <div className="flex flex-col gap-4">
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={categoryData}
                    dataKey="spent"
                    nameKey="category"
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    innerRadius={48}
                    labelLine={false}
                    label={PieLabel}
                    strokeWidth={2}
                    stroke="transparent"
                  >
                    {categoryData.map((_, i) => (
                      <Cell key={i} fill={piePalette[i]} />
                    ))}
                  </Pie>
                  <Tooltip content={<ChartTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <CategoryLegend data={categoryData} />
            </div>
          )}
        </div>

        {/* Bar chart — income vs expense by month */}
        <div className="card p-5 space-y-4">
          <SectionHeader
            icon={BarChart2}
            title="Income vs Expenses"
            subtitle="Last 6 months comparison"
          />

          {loadingTrend ? (
            <div className="flex items-center justify-center h-48">
              <div className="w-8 h-8 border-4 border-ai border-t-transparent rounded-full animate-spin" />
            </div>
          ) : monthlyTrend.length === 0 ? (
            <EmptyChart message="Not enough transaction history" />
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={monthlyTrend} barCategoryGap="30%" barGap={4}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="currentColor"
                  className="text-slate-100 dark:text-slate-700"
                  vertical={false}
                />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fill: 'currentColor' }}
                  className="text-slate-400 dark:text-slate-500"
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: 'currentColor' }}
                  className="text-slate-400 dark:text-slate-500"
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                  width={40}
                />
                <Tooltip content={<ChartTooltip />} />
                <Legend
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{ fontSize: 11 }}
                />
                <Bar dataKey="totalIncome"   name="Income"   fill="#22c55e" radius={[4, 4, 0, 0]} />
                <Bar dataKey="totalExpenses" name="Expenses" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* ── Row 2: Area trend ── */}
      <div className="card p-5 space-y-4">
        <SectionHeader
          icon={Activity}
          title="Financial Trend"
          subtitle="Net balance over the last 6 months"
        />

        {loadingTrend ? (
          <div className="flex items-center justify-center h-48">
            <div className="w-8 h-8 border-4 border-ai border-t-transparent rounded-full animate-spin" />
          </div>
        ) : monthlyTrend.length === 0 ? (
          <EmptyChart message="Not enough transaction history" />
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={monthlyTrend}>
              <defs>
                <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#22c55e" stopOpacity={0.18} />
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#ef4444" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="currentColor"
                className="text-slate-100 dark:text-slate-700"
                vertical={false}
              />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: 'currentColor' }}
                className="text-slate-400 dark:text-slate-500"
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 10, fill: 'currentColor' }}
                className="text-slate-400 dark:text-slate-500"
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                width={40}
              />
              <Tooltip content={<ChartTooltip />} />
              <Legend
                iconType="circle"
                iconSize={8}
                wrapperStyle={{ fontSize: 11 }}
              />
              <Area
                type="monotone"
                dataKey="totalIncome"
                name="Income"
                stroke="#22c55e"
                strokeWidth={2}
                fill="url(#incomeGrad)"
                dot={{ r: 3, fill: '#22c55e', strokeWidth: 0 }}
                activeDot={{ r: 5 }}
              />
              <Area
                type="monotone"
                dataKey="totalExpenses"
                name="Expenses"
                stroke="#ef4444"
                strokeWidth={2}
                fill="url(#expenseGrad)"
                dot={{ r: 3, fill: '#ef4444', strokeWidth: 0 }}
                activeDot={{ r: 5 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* ── Row 3: Category bar chart ── */}
      <div className="card p-5 space-y-4">
        <SectionHeader
          icon={TrendingDown}
          title="Spending by Category"
          subtitle={`Horizontal breakdown · ${ymLabel(ym)}`}
        />

        {loadingMonthly ? (
          <div className="space-y-2">
            {[100, 80, 65, 55, 40].map((w, i) => (
              <Skeleton key={i} className={`h-6`} style={{ width: `${w}%` }} />
            ))}
          </div>
        ) : categoryData.length === 0 ? (
          <EmptyChart message="No expenses recorded this month" />
        ) : (
          <ResponsiveContainer width="100%" height={Math.max(200, categoryData.length * 36)}>
            <BarChart
              data={categoryData}
              layout="vertical"
              margin={{ left: 8, right: 8 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="currentColor"
                className="text-slate-100 dark:text-slate-700"
                horizontal={false}
              />
              <XAxis
                type="number"
                tick={{ fontSize: 10, fill: 'currentColor' }}
                className="text-slate-400 dark:text-slate-500"
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `$${v.toLocaleString()}`}
              />
              <YAxis
                type="category"
                dataKey="category"
                tick={{ fontSize: 11, fill: 'currentColor' }}
                className="text-slate-600 dark:text-slate-400"
                axisLine={false}
                tickLine={false}
                width={80}
                tickFormatter={(v) => v.charAt(0).toUpperCase() + v.slice(1)}
              />
              <Tooltip content={<ChartTooltip />} />
              <Bar dataKey="spent" name="Spent" radius={[0, 4, 4, 0]}>
                {categoryData.map((_, i) => (
                  <Cell key={i} fill={colourForIndex(i)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

    </div>
  );
}
