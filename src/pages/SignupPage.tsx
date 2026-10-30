import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Eye, 
  EyeOff, 
  AlertCircle, 
  Loader2, 
  ShieldCheck, 
  Info, 
  UserPlus,
  Radio
} from 'lucide-react';
import { authService } from '../services/authService';

interface FieldErrors {
  fullName?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
}

export const SignupPage: React.FC = () => {
  const navigate = useNavigate();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [generalError, setGeneralError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const validateForm = (): boolean => {
    const errors: FieldErrors = {};

    if (!fullName.trim() || fullName.trim().length < 2) {
      errors.fullName = 'Full name must be at least 2 characters';
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim()) {
      errors.email = 'Email address is required';
    } else if (!emailRegex.test(email.trim())) {
      errors.email = 'Please enter a valid email address';
    }

    const hasLetter = /[A-Za-z]/.test(password);
    const hasDigit = /\d/.test(password);
    if (!password) {
      errors.password = 'Password is required';
    } else if (password.length < 8 || !hasLetter || !hasDigit) {
      errors.password = 'Password must be at least 8 characters and contain both letters and numbers';
    }

    if (!confirmPassword) {
      errors.confirmPassword = 'Confirmation password is required';
    } else if (password !== confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeneralError('');

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    try {
      const result = await authService.register({
        name: fullName.trim(),
        username: email.trim(),
        email: email.trim(),
        password,
        confirmPassword,
      });

      if (!result.success) {
        throw new Error(result.message || 'Failed to register dispatcher account');
      }

      navigate('/login', {
        state: { message: 'Dispatcher account registered successfully. Please sign in.' },
      });
    } catch (err: any) {
      setGeneralError(err.message || 'Registration failed. Please check your details and try again.');
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
                  DISPATCH OPERATIONS
                </span>
              </div>
            </div>

            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono font-medium bg-[#e6f4f2] text-[#0f766e] border border-[#a5dcd6] dark:bg-[#12363a] dark:text-[#5eead4] dark:border-[#1b6870] mb-4">
              <ShieldCheck size={13} className="shrink-0" />
              <span>DISPATCHER REGISTRATION</span>
            </div>

            <h2 className="font-serif font-bold text-lg text-[var(--ink-primary)] leading-snug mb-3">
              Emergency Response Dispatch Network
            </h2>

            <p className="text-xs text-[var(--ink-muted)] leading-relaxed mb-6">
              Register an authorized emergency dispatcher account to manage emergency intake, calculate optimal ambulance routes, and monitor live hospital bed availability.
            </p>

            {/* Policy Callout */}
            <div className="p-3.5 rounded-lg border border-[#a5dcd6] dark:border-[#1b6870] bg-[#e6f4f2]/70 dark:bg-[#12363a]/50 text-xs text-[#0f766e] dark:text-[#5eead4] space-y-1.5">
              <div className="flex items-center gap-2 font-semibold">
                <Info size={14} className="shrink-0" />
                <span>Dispatcher Provisioning</span>
              </div>
              <p className="text-[11px] leading-relaxed text-[#115e59] dark:text-[#99f6e4]">
                Accounts registered through this portal are provisioned with <strong>DISPATCHER</strong> credentials for direct access to the emergency dispatch console.
              </p>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-[var(--border-color)] text-[11px] text-[var(--ink-subtle)] flex items-center justify-between font-mono">
            <span>GOVERNMENT OF TAMIL NADU</span>
            <span>DISPATCHER PORTAL</span>
          </div>
        </div>

        {/* Right Column: Registration Form */}
        <div className="md:w-7/12 p-8 sm:p-10 flex flex-col justify-center">
          <div className="mb-6">
            <h1 className="font-serif font-bold text-2xl text-[var(--ink-primary)]">
              Create Dispatcher Account
            </h1>
            <p className="text-xs text-[var(--ink-muted)] mt-1">
              Enter your details to register as an emergency dispatcher.
            </p>
          </div>

          {/* General Error Banner */}
          {generalError && (
            <div className="mb-5 p-3 rounded-lg bg-[var(--sev-critical-bg)] border border-[var(--sev-critical-border)] text-[var(--sev-critical-text)] text-xs flex items-start gap-2">
              <AlertCircle size={18} strokeWidth={2} className="shrink-0 text-red-600 dark:text-red-400 mt-0.5" />
              <div className="leading-snug">{generalError}</div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Full Name */}
            <div>
              <label 
                htmlFor="signup-name" 
                className="block text-xs font-medium text-[var(--ink-primary)] mb-1"
              >
                Full Name
              </label>
              <input
                id="signup-name"
                type="text"
                required
                autoComplete="name"
                value={fullName}
                onChange={(e) => {
                  setFullName(e.target.value);
                  if (fieldErrors.fullName) setFieldErrors({ ...fieldErrors, fullName: undefined });
                }}
                placeholder="e.g. Arun Kumar"
                className={`w-full bg-[var(--bg-surface)] border rounded-lg px-3 py-2 text-xs text-[var(--ink-primary)] placeholder:text-[var(--ink-subtle)] focus:outline-none transition-all ${
                  fieldErrors.fullName 
                    ? 'border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-500/20' 
                    : 'border-[var(--border-color)] focus:border-[var(--accent-teal)] focus:ring-2 focus:ring-[var(--accent-teal)]/20'
                }`}
              />
              {fieldErrors.fullName && (
                <p className="text-[11px] text-red-600 dark:text-red-400 mt-1">{fieldErrors.fullName}</p>
              )}
            </div>

            {/* Email Address */}
            <div>
              <label 
                htmlFor="signup-email" 
                className="block text-xs font-medium text-[var(--ink-primary)] mb-1"
              >
                Dispatcher Email Address (also your Login ID)
              </label>
              <input
                id="signup-email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (fieldErrors.email) setFieldErrors({ ...fieldErrors, email: undefined });
                }}
                placeholder="e.g. dispatcher@nalamnagar.gov.in"
                className={`w-full bg-[var(--bg-surface)] border rounded-lg px-3 py-2 text-xs text-[var(--ink-primary)] placeholder:text-[var(--ink-subtle)] focus:outline-none transition-all ${
                  fieldErrors.email 
                    ? 'border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-500/20' 
                    : 'border-[var(--border-color)] focus:border-[var(--accent-teal)] focus:ring-2 focus:ring-[var(--accent-teal)]/20'
                }`}
              />
              {fieldErrors.email && (
                <p className="text-[11px] text-red-600 dark:text-red-400 mt-1">{fieldErrors.email}</p>
              )}
            </div>

            {/* Password */}
            <div>
              <label 
                htmlFor="signup-password" 
                className="block text-xs font-medium text-[var(--ink-primary)] mb-1"
              >
                Password
              </label>
              <div className="relative">
                <input
                  id="signup-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (fieldErrors.password) setFieldErrors({ ...fieldErrors, password: undefined });
                  }}
                  placeholder="Minimum 8 characters (letters and numbers)"
                  className={`w-full bg-[var(--bg-surface)] border rounded-lg px-3 py-2 pr-10 text-xs text-[var(--ink-primary)] placeholder:text-[var(--ink-subtle)] focus:outline-none transition-all font-mono ${
                    fieldErrors.password 
                      ? 'border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-500/20' 
                      : 'border-[var(--border-color)] focus:border-[var(--accent-teal)] focus:ring-2 focus:ring-[var(--accent-teal)]/20'
                  }`}
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
              {fieldErrors.password && (
                <p className="text-[11px] text-red-600 dark:text-red-400 mt-1">{fieldErrors.password}</p>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label 
                htmlFor="signup-confirm-password" 
                className="block text-xs font-medium text-[var(--ink-primary)] mb-1"
              >
                Confirm Password
              </label>
              <div className="relative">
                <input
                  id="signup-confirm-password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    if (fieldErrors.confirmPassword) setFieldErrors({ ...fieldErrors, confirmPassword: undefined });
                  }}
                  placeholder="Re-enter your password"
                  className={`w-full bg-[var(--bg-surface)] border rounded-lg px-3 py-2 pr-10 text-xs text-[var(--ink-primary)] placeholder:text-[var(--ink-subtle)] focus:outline-none transition-all font-mono ${
                    fieldErrors.confirmPassword 
                      ? 'border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-500/20' 
                      : 'border-[var(--border-color)] focus:border-[var(--accent-teal)] focus:ring-2 focus:ring-[var(--accent-teal)]/20'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-[var(--ink-muted)] hover:text-[var(--ink-primary)] transition-colors cursor-pointer"
                >
                  {showConfirmPassword ? (
                    <EyeOff size={16} strokeWidth={1.75} />
                  ) : (
                    <Eye size={16} strokeWidth={1.75} />
                  )}
                </button>
              </div>
              {fieldErrors.confirmPassword && (
                <p className="text-[11px] text-red-600 dark:text-red-400 mt-1">{fieldErrors.confirmPassword}</p>
              )}
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
                  <span>Registering dispatcher account...</span>
                </>
              ) : (
                <>
                  <UserPlus size={15} />
                  <span>Create Dispatcher Account</span>
                </>
              )}
            </button>
          </form>

          {/* Link back to Login */}
          <div className="mt-6 pt-5 border-t border-[var(--border-subtle)] text-center text-xs text-[var(--ink-muted)]">
            <span>Already have a dispatcher account? </span>
            <Link 
              to="/login" 
              className="text-[var(--accent-teal)] hover:underline font-semibold ml-1"
            >
              Sign In as Dispatcher
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
};

export default SignupPage;
