import { useState, useCallback } from 'react';
import {
  Sparkles, BarChart2, PieChart, Lightbulb,
  AlertTriangle, RefreshCw, Copy, CheckCheck,
} from 'lucide-react';
import axiosClient from '../api/axiosClient';
import { formatDate } from '../utils/formatCurrency';

// ── Report type config ─────────────────────────────────────────────────────
const REPORT_TYPES = [
  {
    id:          'monthly',
    icon:        BarChart2,
    title:       'Monthly Summary',
    description: 'Full breakdown of income, expenses & trends',
  },
  {
    id:          'spending_analysis',
    icon:        PieChart,
    title:       'Spending Analysis',
    description: 'Category-by-category spending deep-dive',
  },
  {
    id:          'savings_tips',
    icon:        Lightbulb,
    title:       'Savings Tips',
    description: 'Personalized advice to improve your finances',
  },
];

// ── Markdown parser ────────────────────────────────────────────────────────
// Converts a markdown string into typed tokens for JSX rendering.
// Supported: ## h2, ### h3, **bold** inline, - bullet lines, plain paragraphs.
// Consecutive bullets are collected into a single 'bullets' token.

function parseMarkdown(text) {
  if (!text) return [];

  const lines   = text.split('\n');
  const tokens  = [];
  let   bullets = null; // accumulator for consecutive bullet lines

  const flushBullets = () => {
    if (bullets) {
      tokens.push({ type: 'bullets', items: bullets });
      bullets = null;
    }
  };

  lines.forEach((raw) => {
    const line = raw.trimEnd();

    if (line.startsWith('## ')) {
      flushBullets();
      tokens.push({ type: 'h2', content: line.slice(3).trim() });
    } else if (line.startsWith('### ')) {
      flushBullets();
      tokens.push({ type: 'h3', content: line.slice(4).trim() });
    } else if (/^[-*]\s/.test(line)) {
      // Bullet: collect consecutive
      const item = line.replace(/^[-*]\s+/, '').trim();
      if (!bullets) bullets = [];
      bullets.push(item);
    } else if (line.trim() === '') {
      // Blank line ends a bullet group
      flushBullets();
    } else {
      flushBullets();
      tokens.push({ type: 'p', content: line.trim() });
    }
  });

  flushBullets();

  // Remove leading/trailing empty slots
  return tokens.filter((t) => t.content !== '' || t.type === 'bullets');
}

// Render inline bold (**text**) within a string → React elements
function renderInline(text, key) {
  const parts  = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <span key={key}>
      {parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return (
            <strong key={i} className="font-semibold text-slate-800 dark:text-slate-200">
              {part.slice(2, -2)}
            </strong>
          );
        }
        return part;
      })}
    </span>
  );
}

// Render a token array as JSX
function MarkdownRenderer({ tokens }) {
  if (!tokens.length) return null;

  return (
    <div className="space-y-1">
      {tokens.map((token, i) => {
        switch (token.type) {
          case 'h2':
            return (
              <h2
                key={i}
                className="text-base font-semibold text-slate-800 dark:text-slate-200
                           mt-5 mb-2 first:mt-0 flex items-center gap-2"
              >
                <span className="w-1 h-4 rounded-full bg-ai flex-shrink-0 inline-block" />
                {renderInline(token.content, `h2c-${i}`)}
              </h2>
            );

          case 'h3':
            return (
              <h3
                key={i}
                className="text-sm font-semibold text-slate-700 dark:text-slate-300
                           mt-4 mb-1.5"
              >
                {renderInline(token.content, `h3c-${i}`)}
              </h3>
            );

          case 'bullets':
            return (
              <ul key={i} className="space-y-1.5 my-2 ml-1">
                {token.items.map((item, j) => (
                  <li key={j} className="flex items-start gap-2.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-ai flex-shrink-0 mt-[7px]" />
                    <span className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                      {renderInline(item, `bic-${i}-${j}`)}
                    </span>
                  </li>
                ))}
              </ul>
            );

          case 'p':
            return (
              <p key={i} className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                {renderInline(token.content, `pc-${i}`)}
              </p>
            );

          default:
            return null;
        }
      })}
    </div>
  );
}

// ── Typing indicator ───────────────────────────────────────────────────────
function TypingIndicator() {
  return (
    <div className="flex items-center gap-4 py-6">
      <div className="w-10 h-10 rounded-xl bg-ai/10 flex items-center justify-center flex-shrink-0">
        <Sparkles className="w-5 h-5 text-ai animate-pulse" />
      </div>
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-1.5">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="w-2 h-2 rounded-full bg-ai"
              style={{
                animation:      'smartfinance-bounce 1.2s ease-in-out infinite',
                animationDelay: `${i * 0.2}s`,
              }}
            />
          ))}
        </div>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Analyzing your finances…
        </p>
      </div>

      {/* Keyframes injected once */}
      <style>{`
        @keyframes smartfinance-bounce {
          0%, 80%, 100% { transform: translateY(0);    opacity: 0.4; }
          40%            { transform: translateY(-6px); opacity: 1;   }
        }
      `}</style>
    </div>
  );
}

// ── Report Type Card ───────────────────────────────────────────────────────
function ReportTypeCard({ type, selected, onSelect, disabled }) {
  const Icon = type.icon;
  const isActive = selected === type.id;

  return (
    <button
      onClick={() => !disabled && onSelect(type.id)}
      disabled={disabled}
      className={`
        w-full text-left p-4 rounded-xl border transition-all duration-150
        ${isActive
          ? 'ring-2 ring-ai bg-ai/5 border-ai/20 dark:bg-ai/10'
          : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-600'
        }
        ${disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}
      `}
    >
      <div className="flex items-start gap-3">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0
                         ${isActive ? 'bg-ai/15' : 'bg-slate-100 dark:bg-slate-800'}`}>
          <Icon className={`w-4 h-4 ${isActive ? 'text-ai' : 'text-slate-500 dark:text-slate-400'}`} />
        </div>
        <div className="min-w-0">
          <p className={`text-sm font-semibold leading-tight
                         ${isActive ? 'text-ai' : 'text-slate-800 dark:text-slate-200'}`}>
            {type.title}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
            {type.description}
          </p>
        </div>
        {/* Active indicator dot */}
        <div className={`w-2 h-2 rounded-full flex-shrink-0 mt-1 transition-all
                         ${isActive ? 'bg-ai scale-100' : 'bg-transparent scale-0'}`} />
      </div>
    </button>
  );
}

// ── AI Reports Page ────────────────────────────────────────────────────────
export default function AIReportsPage() {
  const [selectedType, setSelectedType] = useState('monthly');
  const [report,       setReport]       = useState(null);
  const [generatedAt,  setGeneratedAt]  = useState(null);
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState('');
  const [copied,       setCopied]       = useState(false);

  // ── Generate ─────────────────────────────────────────────────────────
  const handleGenerate = useCallback(async () => {
    setLoading(true);
    setError('');
    setReport(null);
    setGeneratedAt(null);
    setCopied(false);
    try {
      const { data } = await axiosClient.post('/ai/generate', {
        reportType: selectedType,
      });
      setReport(data.report?.summary ?? data.report ?? '');
      setGeneratedAt(data.report?.createdAt ?? new Date().toISOString());
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to generate report. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [selectedType]);

  // ── Copy ──────────────────────────────────────────────────────────────
  const handleCopy = async () => {
    if (!report) return;
    try {
      await navigator.clipboard.writeText(report);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API not available — silent fail
    }
  };

  const tokens = parseMarkdown(report ?? '');
  const selectedMeta = REPORT_TYPES.find((t) => t.id === selectedType);

  // ── Render ────────────────────────────────────────────────────────────
  return (
    <div className="max-w-3xl mx-auto space-y-5">

      {/* ── Page header ── */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-ai/10 flex items-center justify-center flex-shrink-0">
          <Sparkles className="w-4 h-4 text-ai" />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-white">AI Reports</h1>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
            Powered by GPT-4o — analyses your real transaction data
          </p>
        </div>
      </div>

      {/* ── Report type selector ── */}
      <div className="card p-4 space-y-3">
        <p className="text-xs font-medium uppercase tracking-wider text-slate-400 dark:text-slate-500">
          Select report type
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {REPORT_TYPES.map((type) => (
            <ReportTypeCard
              key={type.id}
              type={type}
              selected={selectedType}
              onSelect={setSelectedType}
              disabled={loading}
            />
          ))}
        </div>

        {/* Generate button */}
        <div className="pt-1">
          <button
            onClick={handleGenerate}
            disabled={loading}
            className="btn-primary w-full flex items-center justify-center gap-2
                       disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4" />
            )}
            {loading ? 'Generating…' : `Generate ${selectedMeta?.title ?? 'Report'}`}
          </button>
        </div>
      </div>

      {/* ── Error banner ── */}
      {error && (
        <div className="flex items-center gap-3 bg-expense/10 border border-expense/20
                        text-expense px-4 py-3 rounded-lg text-sm">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span className="flex-1">{error}</span>
          <button
            onClick={handleGenerate}
            className="btn-ghost py-1 px-2 gap-1 flex items-center text-xs text-expense hover:bg-expense/10"
          >
            <RefreshCw className="w-3 h-3" /> Retry
          </button>
        </div>
      )}

      {/* ── Report display ── */}
      {(loading || report !== null) && (
        <div className="card p-6">

          {/* Card header row */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              {selectedMeta && (
                <selectedMeta.icon className="w-4 h-4 text-ai" />
              )}
              <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                {selectedMeta?.title ?? 'Report'}
              </h2>
            </div>

            {/* Copy button — shown only when report is ready */}
            {!loading && report && (
              <button
                onClick={handleCopy}
                className="btn-ghost py-1.5 px-3 gap-1.5 flex items-center text-xs"
                title={copied ? 'Copied!' : 'Copy report text'}
              >
                {copied ? (
                  <>
                    <CheckCheck className="w-3.5 h-3.5 text-income" />
                    <span className="text-income">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    Copy
                  </>
                )}
              </button>
            )}
          </div>

          {/* Divider */}
          <div className="h-px bg-slate-100 dark:bg-slate-700/50 -mx-6 mb-5" />

          {/* Loading animation */}
          {loading && <TypingIndicator />}

          {/* Rendered report */}
          {!loading && report && (
            <>
              <MarkdownRenderer tokens={tokens} />

              {/* Footer */}
              {generatedAt && (
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-6 pt-4
                               border-t border-slate-100 dark:border-slate-700/50">
                  Generated at {formatDate(generatedAt)}
                </p>
              )}
            </>
          )}

          {/* Empty report edge case */}
          {!loading && report !== null && report.trim() === '' && (
            <p className="text-sm text-slate-400 dark:text-slate-500 italic">
              No report content was returned. Please try again.
            </p>
          )}
        </div>
      )}

      {/* ── Initial empty state ── */}
      {!loading && report === null && !error && (
        <div className="card flex flex-col items-center justify-center py-16 px-6 text-center">
          {/* Layered glow rings */}
          <div className="relative mb-5">
            <div className="absolute inset-0 rounded-full bg-ai/5 scale-150" />
            <div className="absolute inset-0 rounded-full bg-ai/5 scale-125" />
            <div className="relative w-16 h-16 rounded-full bg-ai/10
                            flex items-center justify-center">
              <Sparkles className="w-7 h-7 text-ai" />
            </div>
          </div>

          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
            Your personal finance analyst
          </h3>
          <p className="text-sm text-slate-400 dark:text-slate-500 max-w-xs leading-relaxed">
            Select a report type above and click <strong className="font-medium text-slate-600 dark:text-slate-400">Generate</strong> to get
            AI-powered insights from your real transaction data.
          </p>

          {/* Feature pills */}
          <div className="flex flex-wrap items-center justify-center gap-2 mt-5">
            {REPORT_TYPES.map(({ id, icon: Icon, title }) => (
              <button
                key={id}
                onClick={() => setSelectedType(id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium
                            border transition-colors
                            ${selectedType === id
                              ? 'bg-ai/10 border-ai/20 text-ai'
                              : 'bg-slate-100 dark:bg-slate-800 border-transparent text-slate-500 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-600'
                            }`}
              >
                <Icon className="w-3 h-3" />
                {title}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}