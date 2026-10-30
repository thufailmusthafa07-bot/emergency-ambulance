import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { 
  Eye, 
  EyeOff, 
  AlertCircle, 
  CheckCircle2, 
  Loader2, 
  ShieldCheck, 
  Radio
} from 'lucide-react';
import { authService } from '../services/authService';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const successStateMsg = (location.state as { message?: string } | null)?.message;

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const trimmedUser = username.trim();
    if (!trimmedUser || !password) {
      setError('Please provide your dispatcher username or email and password.');
      return;
    }

    setIsLoading(true);
    try {
      const result = await authService.login({ username: trimmedUser, password });
      
      if (!result.success || !result.token || !result.user) {
        throw new Error(result.message || 'Invalid dispatcher credentials.');
      }

      const role = String(result.user.role || '').toUpperCase();

      // Dispatcher terminal strictly allows DISPATCHER accounts only
      const isDispatcher = role === 'DISPATCHER' || role === 'DISPATCH OPERATOR' || role === 'OPERATOR';
      if (!isDispatcher) {
        throw new Error('Access denied: This portal is strictly reserved for Emergency Dispatchers.');
      }

      // Persist authenticated dispatcher session
      localStorage.setItem('nalam_nagar_token', result.token);
      localStorage.setItem('nalam_nagar_user', JSON.stringify(result.user));
      navigate('/dashboard', { replace: true });
    } catch (err: any) {
      const rawMsg = err.message || '';
      if (rawMsg.toLowerCase().includes('email or password is incorrect')) {
        setError('Invalid username/email or password. Please verify your dispatcher credentials.');
      } else {
        setError(rawMsg || 'Failed to authenticate. Please verify your credentials.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg-app)] flex items-center justify-center p-4 sm:p-6 text-[var(--ink-primary)]">
      <div className="w-full max-w-4xl bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-xl shadow-[0_12px_36px_rgba(15,23,42,0.08)] overflow-hidden flex flex-col md:flex-row backdrop-blur-md">
        
        {/* Left Column: Official Dispatch Operations Branding */}
        <div className="md:w-5/12 bg-[var(--bg-subtle)] border-b md:border-b-0 md:border-r border-[var(--border-color)] p-8 sm:p-10 flex flex-col justify-between">
          <div>
            {/* Government Crest / System Badge */}
            <div className="flex items-center gap-3.5 mb-6">
              <div className="w-11 h-11 rounded-lg bg-gradient-to-br from-[#0f766e] to-[#0b5f59] flex items-center justify-center text-white shadow-[0_8px_16px_rgba(15,118,110,0.25)] shrink-0">
                <Radio className="w-6 h-6" />
              </div>
              <div>
                <span className="font-serif font-bold text-xl text-[var(--ink-primary)] leading-tight block">
                  Nalam Nagar
                </span>
                <span className="font-mono text-[10px] text-[var(--ink-muted)] tracking-widest uppercase block font-semibold">
                  EMERGENCY DISPATCH OPERATIONS
                </span>
              </div>
            </div>

            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono font-medium bg-[#e6f4f2] text-[#0f766e] border border-[#a5dcd6] dark:bg-[#12363a] dark:text-[#5eead4] dark:border-[#1b6870] mb-4">
              <ShieldCheck size={13} className="shrink-0" />
              <span>DISPATCHER CONSOLE</span>
            </div>

            <h2 className="font-serif font-bold text-lg text-[var(--ink-primary)] leading-snug mb-3">
              Ambulance Dispatch & Route Optimization Console
            </h2>

            <p className="text-xs text-[var(--ink-muted)] leading-relaxed mb-6">
              Dedicated terminal for emergency call intake, Dijkstra shortest travel-time ambulance routing, live hospital bed capacity allocation, and mission lifecycle telemetry.
            </p>

            <div className="space-y-2.5 pt-4 border-t border-[var(--border-color)] text-xs text-[var(--ink-muted)]">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-[#0f766e]" />
                <span>Real-time road network routing & traffic telemetry</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-[#0f766e]" />
                <span>Automated nearest-unit ambulance dispatch</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-[#0f766e]" />
                <span>Hospital emergency bed capacity monitoring</span>
              </div>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-[var(--border-color)] text-[11px] text-[var(--ink-subtle)] flex items-center justify-between font-mono">
            <span>GOVERNMENT OF TAMIL NADU</span>
            <span>DISPATCHER v3.0</span>
          </div>
        </div>

        {/* Right Column: Dispatcher Login Form */}
        <div className="md:w-7/12 p-8 sm:p-10 flex flex-col justify-center">
          <div>
            <div className="mb-6">
              <h1 className="font-serif font-bold text-2xl text-[var(--ink-primary)]">
                Dispatcher Sign In
              </h1>
              <p className="text-xs text-[var(--ink-muted)] mt-1">
                Enter your dispatcher credentials to access the emergency dispatch terminal.
              </p>
            </div>

            {/* Success Banner from Signup Redirect */}
            {successStateMsg && !error && (
              <div className="mb-5 p-3 rounded-lg bg-[var(--sev-minor-bg)] border border-[var(--sev-minor-border)] text-[var(--sev-minor-text)] text-xs flex items-center gap-2">
                <CheckCircle2 size={18} strokeWidth={2} className="shrink-0 text-emerald-600 dark:text-emerald-400" />
                <span>{successStateMsg}</span>
              </div>
            )}

            {/* Error Banner */}
            {error && (
              <div className="mb-5 p-3 rounded-lg bg-[var(--sev-critical-bg)] border border-[var(--sev-critical-border)] text-[var(--sev-critical-text)] text-xs flex items-start gap-2">
                <AlertCircle size={18} strokeWidth={2} className="shrink-0 text-red-600 dark:text-red-400 mt-0.5" />
                <div className="leading-snug">{error}</div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Username or Email */}
              <div>
                <label 
                  htmlFor="login-username" 
                  className="block text-xs font-medium text-[var(--ink-primary)] mb-1.5"
                >
                  Dispatcher Username or Email
                </label>
                <div className="relative">
                  <input
                    id="login-username"
                    type="text"
                    required
                    autoComplete="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="e.g. operator01 or dispatcher@nalamnagar.gov.in"
                    className="w-full bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-lg px-3 py-2 text-xs text-[var(--ink-primary)] placeholder:text-[var(--ink-subtle)] focus:outline-none focus:border-[var(--accent-teal)] focus:ring-2 focus:ring-[var(--accent-teal)]/20 transition-all"
                  />
                </div>
              </div>

              {/* Password with Visibility Toggle */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label 
                    htmlFor="login-password" 
                    className="block text-xs font-medium text-[var(--ink-primary)]"
                  >
                    Password
                  </label>
                </div>
                <div className="relative">
                  <input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="w-full bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-lg px-3 py-2 pr-10 text-xs text-[var(--ink-primary)] placeholder:text-[var(--ink-subtle)] focus:outline-none focus:border-[var(--accent-teal)] focus:ring-2 focus:ring-[var(--accent-teal)]/20 transition-all font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-[var(--ink-muted)] hover:text-[var(--ink-primary)] transition-colors cursor-pointer"
                  >
                    {showPassword ? (
                      <EyeOff size={16} strokeWidth={1.75} />
                    ) : (
                      <Eye size={16} strokeWidth={1.75} />
                    )}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full mt-2 bg-[var(--accent-teal)] hover:bg-[var(--accent-teal-hover)] text-white text-xs font-semibold py-2.5 px-4 rounded-lg transition-all flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer disabled:cursor-not-allowed shadow-[0_2px_8px_rgba(15,118,110,0.2)]"
              >
                {isLoading ? (
                  <>
                    <Loader2 size={16} strokeWidth={2} className="animate-spin" />
                    <span>Authenticating credentials...</span>
                  </>
                ) : (
                  <span>Sign In as Dispatcher</span>
                )}
              </button>
            </form>

            {/* Link to Signup */}
            <div className="mt-6 pt-5 border-t border-[var(--border-subtle)] text-center text-xs text-[var(--ink-muted)]">
              <span>Need a dispatcher account? </span>
              <Link 
                to="/signup" 
                className="text-[var(--accent-teal)] hover:underline font-semibold ml-1"
              >
                Create Dispatcher Account
              </Link>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default LoginPage;
