import React, { useState } from 'react';
import { AlertCircle, CheckCircle2, Moon, Sun, RotateCcw } from 'lucide-react';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { authService } from '../services/authService';
import { api } from '../services/api';
import type { UserProfile } from '../types/user';

const readProfile = (): UserProfile | null => {
  try {
    return JSON.parse(localStorage.getItem('nalam_nagar_user') || 'null') as UserProfile | null;
  } catch {
    return null;
  }
};

export const SettingsPage: React.FC = () => {
  const [isDarkMode, setIsDarkMode] = useState(() => localStorage.getItem('nalam_theme') === 'dark');
  const [profile, setProfile] = useState<UserProfile | null>(readProfile);
  const [fullName, setFullName] = useState(profile?.fullName || profile?.name || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [feedback, setFeedback] = useState<{ error: boolean; message: string } | null>(null);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);

  const toggleTheme = () => {
    const next = !isDarkMode;
    setIsDarkMode(next);
    if (next) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('nalam_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('nalam_theme', 'light');
    }
  };

  const saveProfile = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSavingProfile(true);
    setFeedback(null);
    try {
      const result = await authService.updateProfile(fullName);
      if (!result.success || !result.user) throw new Error(result.message || 'Profile update failed');
      const nextProfile = { ...profile, ...result.user };
      setProfile(nextProfile);
      localStorage.setItem('nalam_nagar_user', JSON.stringify(nextProfile));
      setFeedback({ error: false, message: 'Your name was updated.' });
    } catch (error) {
      setFeedback({ error: true, message: error instanceof Error ? error.message : 'Profile update failed' });
    } finally {
      setIsSavingProfile(false);
    }
  };

  const submitPassword = async (event: React.FormEvent) => {
    event.preventDefault();
    if (newPassword !== confirmPassword) {
      setFeedback({ error: true, message: 'New password and confirmation do not match.' });
      return;
    }
    setIsChangingPassword(true);
    setFeedback(null);
    try {
      const result = await authService.changePassword(currentPassword, newPassword);
      if (!result.success) throw new Error(result.message || 'Password change failed');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setFeedback({ error: false, message: 'Password changed successfully.' });
    } catch (error) {
      setFeedback({ error: true, message: error instanceof Error ? error.message : 'Password change failed' });
    } finally {
      setIsChangingPassword(false);
    }
  };

  const requestDemoReset = async () => {
    const result = await api.post('/reset', {});
    setFeedback({
      error: true,
      message: typeof result.error === 'string'
        ? result.error
        : result.message || 'Demo reset was refused to protect database records.',
    });
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="border-b border-[#DDD8CE] dark:border-[#323C4D] pb-4">
        <h1 className="text-2xl font-serif font-bold text-[#1D2433] dark:text-[#F0F4F8]">
          Operations Desk Settings
        </h1>
        <p className="text-xs text-[#667085] dark:text-[#9BA3AF] mt-0.5">
          Update your account credentials and configure the operations display.
        </p>
      </div>

      {feedback && (
        <div role="status" className={`flex items-center gap-2 rounded border p-3 text-xs ${feedback.error ? 'border-red-300 bg-red-50 text-red-800' : 'border-green-300 bg-green-50 text-green-800'}`}>
          {feedback.error ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />}
          {feedback.message}
        </div>
      )}

      <form onSubmit={saveProfile} className="municipal-card p-5 space-y-3">
        <h2 className="border-b border-[#DDD8CE] pb-2 font-serif text-base font-bold dark:border-[#323C4D]">Profile</h2>
        <label className="block text-xs font-semibold" htmlFor="profile-name">Your name</label>
        <input id="profile-name" required minLength={2} maxLength={100} value={fullName} onChange={(event) => setFullName(event.target.value)} className="municipal-input w-full max-w-md" />
        <button type="submit" disabled={isSavingProfile} className="rounded bg-[#0E6B66] px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">
          {isSavingProfile ? 'Saving…' : 'Save name'}
        </button>
      </form>

      <form onSubmit={submitPassword} className="municipal-card p-5 space-y-3">
        <h2 className="border-b border-[#DDD8CE] pb-2 font-serif text-base font-bold dark:border-[#323C4D]">Change password</h2>
        <label className="block text-xs font-semibold" htmlFor="current-password">Current password</label>
        <input id="current-password" type="password" required autoComplete="current-password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} className="municipal-input w-full max-w-md" />
        <label className="block text-xs font-semibold" htmlFor="new-password">New password</label>
        <input id="new-password" type="password" required minLength={8} autoComplete="new-password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} className="municipal-input w-full max-w-md" />
        <label className="block text-xs font-semibold" htmlFor="confirm-new-password">Confirm new password</label>
        <input id="confirm-new-password" type="password" required minLength={8} autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} className="municipal-input w-full max-w-md" />
        <button type="submit" disabled={isChangingPassword} className="rounded bg-[#0E6B66] px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">
          {isChangingPassword ? 'Updating…' : 'Change password'}
        </button>
      </form>

      {/* Theme Settings Card */}
      <div className="municipal-card p-5 space-y-3">
        <h2 className="font-serif font-bold text-base text-[#1D2433] dark:text-[#F0F4F8] border-b border-[#DDD8CE] dark:border-[#323C4D] pb-2">
          Interface Theme
        </h2>
        <div className="flex items-center justify-between text-xs">
          <div>
            <span className="font-semibold block text-[#1D2433] dark:text-[#F0F4F8]">Desk Display Mode</span>
            <span className="text-[#667085] dark:text-[#9BA3AF]">
              Current: <strong>{isDarkMode ? 'Municipal Dark' : 'Calm Municipal Light (Default)'}</strong>
            </span>
          </div>

          {(profile?.role === 'ADMIN' || profile?.role === 'Administrator') && (
            <div className="municipal-card space-y-3 border border-amber-300 p-5">
              <h2 className="flex items-center gap-2 border-b border-[#DDD8CE] pb-2 font-serif text-base font-bold dark:border-[#323C4D]">
                <RotateCcw size={16} /> Reset demo data
              </h2>
              <p className="text-xs text-[#667085] dark:text-[#9BA3AF]">
                Reset is intentionally unavailable: current records have no reliable demo-versus-operational marker. The API refuses this request and leaves all records untouched.
              </p>
              <button type="button" onClick={() => setIsResetDialogOpen(true)} className="rounded border border-amber-500 px-3 py-2 text-xs font-semibold text-amber-800">
                Review reset safety
              </button>
              <ConfirmDialog
                isOpen={isResetDialogOpen}
                onClose={() => setIsResetDialogOpen(false)}
                onConfirm={() => { void requestDemoReset(); }}
                title="Demo reset is blocked"
                message="Existing records cannot be distinguished safely from demonstration records. The protected backend endpoint will refuse this request; no rows will be deleted or overwritten. Continue only to verify that the endpoint blocks the reset."
                confirmLabel="Verify blocked reset"
                confirmVariant="warning"
              />
            </div>
          )}

          <button
            type="button"
            onClick={toggleTheme}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-[#DDD8CE] dark:border-[#323C4D] text-xs font-semibold hover:bg-[#EFECE6] dark:hover:bg-[#252D3A]"
          >
            {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
            <span>Switch to {isDarkMode ? 'Light Mode' : 'Dark Mode'}</span>
          </button>
        </div>
      </div>

      {/* Persistent Data Notice */}
      <div className="municipal-card p-5 space-y-3">
        <h2 className="font-serif font-bold text-base text-[#1D2433] dark:text-[#F0F4F8] border-b border-[#DDD8CE] dark:border-[#323C4D] pb-2">
          Saved Operations Data
        </h2>
        <p className="text-xs text-[#667085] dark:text-[#9BA3AF]">
          Requests, fleet status, hospital capacity, road conditions, and missions are stored in PostgreSQL. A destructive reset is disabled to protect saved records.
        </p>
      </div>

    </div>
  );
};

export default SettingsPage;
