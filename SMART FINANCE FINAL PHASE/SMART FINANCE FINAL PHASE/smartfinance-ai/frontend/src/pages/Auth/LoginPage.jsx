import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, TrendingUp, Sparkles } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import axiosClient from '../../api/axiosClient';

// ── Branding Panel (left half) ────────────────────────────────────────────────
function BrandPanel() {
  return (
    <div className="hidden lg:flex lg:w-1/2 relative flex-col justify-between p-12 overflow-hidden
                    bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900">
      {/* Decorative grid lines */}
      <div className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }}
      />

      {/* Floating glows */}
      <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/3 right-1/4 w-48 h-48 bg-income/10 rounded-full blur-2xl pointer-events-none" />

      {/* Logo */}
      <div className="relative z-10 flex items-center gap-3">
        <div className="w-10 h-10 bg-ai rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30">
          <TrendingUp className="w-5 h-5 text-white" strokeWidth={2.5} />
        </div>
        <span className="text-white font-semibold text-lg tracking-tight">SmartFinance AI</span>
      </div>

      {/* Headline */}
      <div className="relative z-10 space-y-6">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-warning" />
            <span className="text-warning text-xs font-medium tracking-widest uppercase">AI-Powered Finance</span>
          </div>
          <h1 className="text-4xl font-bold text-white leading-tight">
            Your money,<br />
            <span className="text-ai">intelligently</span><br />
            managed.
          </h1>
          <p className="text-slate-400 text-sm leading-relaxed max-w-xs">
            Track income, expenses and budgets — then let AI turn your data into actionable financial insights.
          </p>
        </div>

        {/* Stats strip */}
        <div className="flex gap-6 pt-2">
          {[
            { label: 'Balance tracking', value: 'Real-time' },
            { label: 'AI reports', value: 'Instant' },
            { label: 'Categories', value: '12+' },
          ].map(({ label, value }) => (
            <div key={label} className="space-y-0.5">
              <div className="text-white font-semibold text-sm font-mono">{value}</div>
              <div className="text-slate-500 text-xs">{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom quote */}
      <p className="relative z-10 text-slate-600 text-xs">
        "Financial clarity starts with a single view."
      </p>
    </div>
  );
}

// ── Input field with icon ─────────────────────────────────────────────────────
function IconInput({ icon: Icon, type = 'text', placeholder, value, onChange, rightElement }) {
  return (
    <div className="relative">
      <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500 pointer-events-none" />
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        className="input pl-10 pr-10 py-2.5"
      />
      {rightElement && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2">{rightElement}</div>
      )}
    </div>
  );
}

// ── Login Page ────────────────────────────────────────────────────────────────
export default function LoginPage() {
  const { login } = useAuth();
  const navigate   = useNavigate();

  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [showPw,   setShowPw]   = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');

  const handleLogin = async () => {
    setError('');
    if (!email.trim() || !password) {
      setError('Please enter your email and password.');
      return;
    }

    setLoading(true);
    try {
      const { data } = await axiosClient.post('/auth/login', { email: email.trim(), password });
      login(data.data.accessToken, data.data.refreshToken, data.data.user);
      navigate('/', { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleLogin();
  };

  const TogglePw = (
    <button
      type="button"
      onClick={() => setShowPw((v) => !v)}
      className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
      tabIndex={-1}
    >
      {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
    </button>
  );

  return (
    <div className="min-h-screen flex bg-slate-50 dark:bg-slate-900">
      <BrandPanel />

      {/* ── Right: form panel ── */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 lg:px-16">
        {/* Mobile logo */}
        <div className="flex items-center gap-2 mb-10 lg:hidden">
          <div className="w-8 h-8 bg-ai rounded-lg flex items-center justify-center">
            <TrendingUp className="w-4 h-4 text-white" strokeWidth={2.5} />
          </div>
          <span className="font-semibold text-slate-900 dark:text-white">SmartFinance AI</span>
        </div>

        <div className="w-full max-w-sm space-y-8">
          {/* Heading */}
          <div className="space-y-1">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
              Welcome back
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Sign in to your account to continue
            </p>
          </div>

          {/* Fields */}
          <div className="space-y-4">
            {error && (
              <div className="px-4 py-3 rounded-lg bg-expense/10 border border-expense/20 text-expense text-sm">
                {error}
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                Email
              </label>
              <IconInput
                icon={Mail}
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                Password
              </label>
              <IconInput
                icon={Lock}
                type={showPw ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                rightElement={TogglePw}
              />
            </div>
          </div>

          {/* Submit */}
          <div className="space-y-4">
            <button
              className="btn-primary w-full py-2.5"
              onClick={handleLogin}
              onKeyDown={handleKeyDown}
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Signing in…
                </>
              ) : (
                'Sign in'
              )}
            </button>

            <p className="text-center text-sm text-slate-500 dark:text-slate-400">
              Don't have an account?{' '}
              <Link to="/register" className="text-ai font-medium hover:underline">
                Create one
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}