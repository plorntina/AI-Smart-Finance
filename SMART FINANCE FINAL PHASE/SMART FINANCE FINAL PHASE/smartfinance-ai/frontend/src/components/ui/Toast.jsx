import { useEffect, useRef } from 'react';
import { X, AlertTriangle, AlertCircle } from 'lucide-react';

// ── Single Toast ──────────────────────────────────────────────────────────────

/**
 * Toast props:
 *   id          — unique string key
 *   variant     — "warning" | "danger"
 *   title       — bold heading line
 *   message     — supporting text
 *   onDismiss   — () => void
 *   duration    — ms before auto-dismiss (default 5000; 0 = never)
 */
export function Toast({ id, variant = 'warning', title, message, onDismiss, duration = 5000 }) {
  const timerRef = useRef(null);

  useEffect(() => {
    if (duration > 0) {
      timerRef.current = setTimeout(() => onDismiss(id), duration);
    }
    return () => clearTimeout(timerRef.current);
  }, [id, duration, onDismiss]);

  // Pause auto-dismiss while user hovers
  const pauseTimer = () => clearTimeout(timerRef.current);
  const resumeTimer = () => {
    if (duration > 0) {
      timerRef.current = setTimeout(() => onDismiss(id), duration);
    }
  };

  const isWarning = variant === 'warning';

  const colours = isWarning
    ? {
        bg:     'bg-amber-50  dark:bg-amber-900/20',
        border: 'border-amber-200 dark:border-amber-700/50',
        icon:   'text-warning',
        title:  'text-amber-800 dark:text-amber-300',
        msg:    'text-amber-700 dark:text-amber-400',
        close:  'text-amber-500 hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-200',
        bar:    'bg-warning',
      }
    : {
        bg:     'bg-red-50    dark:bg-red-900/20',
        border: 'border-red-200  dark:border-red-700/50',
        icon:   'text-expense',
        title:  'text-red-800    dark:text-red-300',
        msg:    'text-red-700    dark:text-red-400',
        close:  'text-red-500  hover:text-red-700   dark:text-red-400 dark:hover:text-red-200',
        bar:    'bg-expense',
      };

  const Icon = isWarning ? AlertTriangle : AlertCircle;

  return (
    <div
      role="alert"
      aria-live="assertive"
      onMouseEnter={pauseTimer}
      onMouseLeave={resumeTimer}
      className={`
        relative w-80 rounded-xl border shadow-lg overflow-hidden
        ${colours.bg} ${colours.border}
        animate-[slideInRight_0.25s_ease-out]
      `}
    >
      {/* Accent bar on left edge */}
      <div className={`absolute left-0 top-0 bottom-0 w-1 ${colours.bar}`} />

      <div className="flex items-start gap-3 px-4 py-3 pl-5">
        {/* Icon */}
        <Icon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${colours.icon}`} />

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-semibold leading-tight ${colours.title}`}>{title}</p>
          {message && (
            <p className={`text-xs mt-0.5 leading-relaxed ${colours.msg}`}>{message}</p>
          )}
        </div>

        {/* Close button */}
        <button
          onClick={() => onDismiss(id)}
          className={`flex-shrink-0 p-0.5 rounded transition-colors ${colours.close}`}
          aria-label="Dismiss notification"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Progress bar (only when auto-dismiss is on) */}
      {duration > 0 && (
        <div
          className={`h-0.5 ${colours.bar} opacity-40`}
          style={{
            animation:          `shrink ${duration}ms linear forwards`,
            transformOrigin:    'left',
          }}
        />
      )}

      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); opacity: 0; }
          to   { transform: translateX(0);    opacity: 1; }
        }
        @keyframes shrink {
          from { transform: scaleX(1); }
          to   { transform: scaleX(0); }
        }
      `}</style>
    </div>
  );
}

// ── Toast Container (portal-like fixed stack) ─────────────────────────────────

/**
 * ToastContainer renders all active toasts in the bottom-right corner.
 *
 * Usage in parent:
 *   const [toasts, setToasts] = useState([]);
 *   const addToast = (toast) => setToasts(prev => [...prev, { id: Date.now(), ...toast }]);
 *   const removeToast = (id) => setToasts(prev => prev.filter(t => t.id !== id));
 *
 *   <ToastContainer toasts={toasts} onDismiss={removeToast} />
 */
export function ToastContainer({ toasts = [], onDismiss }) {
  if (!toasts.length) return null;

  return (
    <div
      aria-label="Notifications"
      className="fixed bottom-5 right-5 z-[9999] flex flex-col gap-2 items-end"
    >
      {toasts.map((t) => (
        <Toast key={t.id} {...t} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

// ── Hook ──────────────────────────────────────────────────────────────────────

/**
 * useToast — convenience hook that manages the toasts array.
 *
 * Returns { toasts, addToast, removeToast }
 *
 * addToast({ variant, title, message, duration? })
 */
import { useState, useCallback } from 'react';

export function useToast() {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((toast) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setToasts((prev) => [...prev, { id, ...toast }]);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return { toasts, addToast, removeToast };
}
