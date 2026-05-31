import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, User, TrendingUp, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import axiosClient from '../../api/axiosClient';

// ── Branding panel (shared aesthetic with LoginPage) ──────────────────────────
function BrandPanel() {
  const features = [
    { icon: '📊', title: 'Real-time balance', desc: 'Income and expenses tracked automatically' },
    { icon: '🎯', title: 'Budget management', desc: 'Set limits by category, track progress' },
    { icon: '🤖', title: 'AI financial insights', desc: 'Personalised tips powered by GPT-4o-mini' },
  ];

  return (
    <div className="hidden lg:flex lg:w-1/2 relative flex-col justify-between p-12 overflow-hidden
                    bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900">
      {/* Decorative grid */}
      <div className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }}
      />
      <div className="absolute top-1/3 right-1/4 w-56 h-56 bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/4 w-40 h-40 bg-income/10 rounded-full blur-2xl pointer-events-none" />

      {/* Logo */}
      <div className="relative z-10 flex items-center gap-3">
        <div className="w-10 h-10 bg-ai rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30">
          <TrendingUp className="w-5 h-5 text-white" strokeWidth={2.5} />
        </div>
        <span className="text-white font-semibold text-lg tracking-tight">SmartFinance AI</span>
      </div>

      {/* Features */}
      <div className="relative z-10 space-y-8">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-white leading-tight">
            Take control of<br />
            your <span className="text-income">finances</span> today.
          </h1>
          <p className="text-slate-400 text-sm max-w-xs leading-relaxed">
            Join SmartFinance AI and get a complete picture of your financial health — in minutes.
          </p>
        </div>

        <div className="space-y-4">
          {features.map(({ icon, title, desc }) => (
            <div key={title} className="flex items-start gap-4">
              <div className="w-9 h-9 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-base flex-shrink-0">
                {icon}
              </div>
              <div>
                <div className="text-white text-sm font-medium">{title}</div>
                <div className="text-slate-500 text-xs mt-0.5">{desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <p className="relative z-10 text-slate-600 text-xs">
        Free to use. No credit card required.
      </p>
    </div>
  );
}

// ── Input with leading icon ───────────────────────────────────────────────────
function IconInput({ icon: Icon, type = 'text', placeholder, value, onChange, rightElement, onKeyDown }) {
  return (
    <div className="relative">
      <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500 pointer-events-none" />
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        onKeyDown={onKeyDown}
        className="input pl-10 pr-10 py-2.5"
      />
      {rightElement && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2">{rightElement}</div>
      )}
    </div>
  );
}

// ── Password strength indicator ───────────────────────────────────────────────
function PasswordStrength({ password }) {
  if (!password) return null;
  const strength = password.length >= 10 ? 3 : password.length >= 6 ? 2 : 1;
  const labels   = ['', 'Weak', 'Good', 'Strong'];
  const colors   = ['', 'bg-expense', 'bg-warning', 'bg-income'];
  const textClrs = ['', 'text-expense', 'text-warning', 'text-income'];

  return (
    <div className="flex items-center gap-2 mt-1.5">
      <div className="flex gap-1 flex-1">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-all duration-300 ${
              i <= strength ? colors[strength] : 'bg-slate-200 dark:bg-slate-700'
            }`}
          />
        ))}
      </div>
      <span className={`text-xs font-medium ${textClrs[strength]}`}>{labels[strength]}</span>
    </div>
  );
}

// ── Register Page ─────────────────────────────────────────────────────────────
export default function RegisterPage() {
  const { login } = useAuth();
  const navigate   = useNavigate();

  const [name,      setName]      = useState('');
  const [email,     setEmail]     = useState('');
  const [password,  setPassword]  = useState('');
  const [confirm,   setConfirm]   = useState('');
  const [showPw,    setShowPw]    = useState(false);
  const [showConf,  setShowConf]  = useState(false);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState('');

  const validate = () => {
    if (!name.trim())           return 'Full name is required.';
    if (!email.trim())          return 'Email address is required.';
    if (password.length < 6)    return 'Password must be at least 6 characters.';
    if (password !== confirm)   return 'Passwords do not match.';
    return null;
  };

  const handleRegister = async () => {
    setError('');
    const validationError = validate();
    if (validationError) { setError(validationError); return; }

    setLoading(true);
    try {
      const { data } = await axiosClient.post('/auth/register', {
        name: name.trim(),
        email: email.trim(),
        password,
      });
      login(data.data.accessToken, data.data.refreshToken, data.data.user);
      navigate('/', { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => { if (e.key === 'Enter') handleRegister(); };

  const pwMatch = confirm && password === confirm;

  const EyeTogglePw = (
    <button type="button" onClick={() => setShowPw((v) => !v)}
      className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors" tabIndex={-1}>
      {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
    </button>
  );

  const EyeToggleConf = (
    <button type="button" onClick={() => setShowConf((v) => !v)}
      className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors" tabIndex={-1}>
      {showConf ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
    </button>
  );

  const ConfirmRight = confirm ? (
    <CheckCircle2 className={`w-4 h-4 transition-colors ${pwMatch ? 'text-income' : 'text-expense'}`} />
  ) : EyeToggleConf;

  return (
    <div className="min-h-screen flex bg-slate-50 dark:bg-slate-900">
      <BrandPanel />

      {/* ── Right: form panel ── */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 lg:px-16">
        {/* Mobile logo */}
        <div className="flex items-center gap-2 mb-8 lg:hidden">
          <div className="w-8 h-8 bg-ai rounded-lg flex items-center justify-center">
            <TrendingUp className="w-4 h-4 text-white" strokeWidth={2.5} />
          </div>
          <span className="font-semibold text-slate-900 dark:text-white">SmartFinance AI</span>
        </div>

        <div className="w-full max-w-sm space-y-7">
          {/* Heading */}
          <div className="space-y-1">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
              Create your account
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Start managing your finances smarter
            </p>
          </div>

          {/* Fields */}
          <div className="space-y-4">
            {error && (
              <div className="px-4 py-3 rounded-lg bg-expense/10 border border-expense/20 text-expense text-sm">
                {error}
              </div>
            )}

            {/* Name */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                Full Name
              </label>
              <IconInput
                icon={User}
                placeholder="Alex Johnson"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={handleKeyDown}
              />
            </div>

            {/* Email */}
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
                onKeyDown={handleKeyDown}
              />
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                Password
              </label>
              <IconInput
                icon={Lock}
                type={showPw ? 'text' : 'password'}
                placeholder="Min. 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                rightElement={EyeTogglePw}
                onKeyDown={handleKeyDown}
              />
              <PasswordStrength password={password} />
            </div>

            {/* Confirm password */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                Confirm Password
              </label>
              <IconInput
                icon={Lock}
                type={showConf ? 'text' : 'password'}
                placeholder="Repeat your password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                rightElement={ConfirmRight}
                onKeyDown={handleKeyDown}
              />
              {confirm && !pwMatch && (
                <p className="text-xs text-expense mt-1">Passwords don't match</p>
              )}
            </div>
          </div>

          {/* Submit */}
          <div className="space-y-4">
            <button
              className="btn-primary w-full py-2.5"
              onClick={handleRegister}
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Creating account…
                </>
              ) : (
                'Create account'
              )}
            </button>

            <p className="text-center text-sm text-slate-500 dark:text-slate-400">
              Already have an account?{' '}
              <Link to="/login" className="text-ai font-medium hover:underline">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}