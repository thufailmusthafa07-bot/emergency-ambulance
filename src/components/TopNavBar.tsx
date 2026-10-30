import React, { useState, useRef, useEffect, useCallback } from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import { 
  Building2, 
  ChevronDown, 
  Activity, 
  RefreshCw, 
  Moon, 
  Sun, 
  RotateCcw,
  AlertCircle,
  Bell,
  Check,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { authService } from '../services/authService';
import { notificationApiService, type SystemNotificationItem } from '../services/notificationApiService';

export const TopNavBar: React.FC = () => {
  const { stats, refreshAllData, isRefreshing } = useApp();
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<SystemNotificationItem[]>([]);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
  const [notificationError, setNotificationError] = useState<string | null>(null);
  const [isLoadingNotifications, setIsLoadingNotifications] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    return localStorage.getItem('nalam_theme') === 'dark';
  });
  const moreRef = useRef<HTMLDivElement>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const user = localStorage.getItem('nalam_nagar_user');
  const profile = user ? JSON.parse(user) : null;
  const dashboardPath = profile?.role === 'ADMIN' || profile?.role === 'Administrator'
    ? '/admin/dashboard'
    : '/dashboard';

  const refreshNotifications = useCallback(async () => {
    setIsLoadingNotifications(true);
    try {
      const result = await notificationApiService.getNotifications();
      setNotifications(result.notifications);
      setUnreadNotificationCount(result.unreadCount);
      setNotificationError(null);
    } catch (error) {
      setNotificationError(error instanceof Error ? error.message : 'Failed to load notifications');
    } finally {
      setIsLoadingNotifications(false);
    }
  }, []);

  const markNotificationAsRead = async (id: string) => {
    try {
      await notificationApiService.markAsRead(id);
      await refreshNotifications();
    } catch (error) {
      setNotificationError(error instanceof Error ? error.message : 'Failed to update notification');
    }
  };

  const markAllNotificationsAsRead = async () => {
    try {
      await notificationApiService.markAllAsRead();
      await refreshNotifications();
    } catch (error) {
      setNotificationError(error instanceof Error ? error.message : 'Failed to update notifications');
    }
  };

  const handleLogout = async () => {
    await authService.logout();
    localStorage.removeItem('nalam_nagar_token');
    localStorage.removeItem('nalam_nagar_user');
    navigate('/login');
  };

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('nalam_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('nalam_theme', 'light');
    }
  }, [isDarkMode]);

  useEffect(() => {
    void refreshNotifications();
  }, [refreshNotifications]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) {
        setIsMoreOpen(false);
      }
      if (notificationsRef.current && !notificationsRef.current.contains(e.target as Node)) {
        setIsNotificationsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `px-3 py-1.5 text-xs font-medium rounded-full transition-all duration-200 ${
      isActive
        ? 'bg-[#0f766e] text-white shadow-[0_8px_18px_rgba(15,118,110,0.22)]'
        : 'text-[#475d73] hover:text-[#122437] hover:bg-[#edf5f8] dark:text-[#abc0d3] dark:hover:text-[#edf5ff] dark:hover:bg-[#172b3d]'
    }`;

  const dropdownLinkClass = ({ isActive }: { isActive: boolean }) =>
    `block px-4 py-2 text-xs font-medium transition-colors ${
      isActive
        ? 'bg-[#e7f8f5] text-[#0f766e] font-semibold dark:bg-[#12373d] dark:text-[#5eead4]'
        : 'text-[#132437] hover:bg-[#f3f7fb] dark:text-[#edf5ff] dark:hover:bg-[#172b3d]'
    }`;

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--border-color)] bg-[rgba(255,255,255,0.8)] dark:bg-[rgba(8,25,38,0.82)] backdrop-blur-xl select-none shadow-[0_8px_30px_rgba(15,23,42,0.06)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-14">
          
          {/* Municipal Brand Identity */}
          <div className="flex items-center gap-6">
            <Link to={dashboardPath} className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#0f766e] to-[#0b5f59] flex items-center justify-center text-white font-serif font-bold text-base shadow-[0_10px_18px_rgba(15,118,110,0.25)]">
                N
              </div>
              <div>
                <span className="font-serif font-bold text-sm text-[#132437] dark:text-[#edf5ff] tracking-tight block leading-tight">
                  Nalam Nagar
                </span>
                <span className="text-[10px] text-[#596f86] dark:text-[#abc0d3] font-medium tracking-normal block leading-none">
                  Emergency Dispatch Service
                </span>
              </div>
            </Link>

            {/* Primary Navigation Links */}
            <nav className="hidden md:flex items-center gap-1 ml-2">
              <NavLink to={dashboardPath} className={navLinkClass}>
                Dashboard
              </NavLink>
              <NavLink to="/emergency-requests" className={navLinkClass}>
                Emergency Calls
                {stats && stats.pendingTotal > 0 && (
                  <span className="ml-1.5 px-1.5 py-0.2 text-[10px] font-mono font-bold rounded-full bg-[#fff7eb] text-[#b45309] border border-[#f7d7aa] dark:bg-[#2f230c] dark:text-[#fbbf24] dark:border-[#5b421c]">
                    {stats.pendingTotal}
                  </span>
                )}
              </NavLink>
              <NavLink to="/dispatch" className={navLinkClass}>
                Dispatch Center
              </NavLink>
              <NavLink to="/ambulances" className={navLinkClass}>
                Ambulance Fleet
              </NavLink>
              <NavLink to="/hospitals" className={navLinkClass}>
                Hospitals
              </NavLink>
              <NavLink to="/road-network" className={navLinkClass}>
                Road Network
              </NavLink>
              <NavLink to="/trips" className={navLinkClass}>
                Missions
                {stats && stats.activeTrips > 0 && (
                  <span className="ml-1.5 px-1.5 py-0.2 text-[10px] font-mono font-bold rounded-full bg-[#eafaf8] text-[#0f766e] border border-[#a5e4dc] dark:bg-[#12363a] dark:text-[#5eead4] dark:border-[#1b6870]">
                    {stats.activeTrips}
                  </span>
                )}
              </NavLink>

              {/* Secondary Pages Under "More" Dropdown */}
            <div className="relative" ref={moreRef}>
                <button
                  type="button"
                  onClick={() => setIsMoreOpen((prev) => !prev)}
                  className={`flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-full transition-all duration-200 ${
                    isMoreOpen 
                      ? 'bg-[#edf5f8] text-[#132437] dark:bg-[#172b3d] dark:text-[#edf5ff]' 
                      : 'text-[#475d73] hover:text-[#132437] hover:bg-[#edf5f8] dark:text-[#abc0d3] dark:hover:text-[#edf5ff] dark:hover:bg-[#172b3d]'
                  }`}
                >
                  <span>More Operations</span>
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isMoreOpen ? 'rotate-180' : ''}`} />
                </button>

                {isMoreOpen && (
                  <div className="absolute left-0 mt-1.5 w-52 bg-[rgba(255,255,255,0.96)] dark:bg-[rgba(9,27,42,0.96)] border border-[var(--border-color)] rounded-xl shadow-[0_18px_32px_rgba(15,23,42,0.12)] py-1.5 z-50 backdrop-blur-xl">
                    <NavLink 
                      to="/traffic-roads" 
                      onClick={() => setIsMoreOpen(false)}
                      className={dropdownLinkClass}
                    >
                      Traffic & Road Control
                    </NavLink>
                    <NavLink 
                      to="/route-optimization" 
                      onClick={() => setIsMoreOpen(false)}
                      className={dropdownLinkClass}
                    >
                      Route Optimization (Dijkstra)
                    </NavLink>
                    <NavLink 
                      to="/system-status" 
                      onClick={() => setIsMoreOpen(false)}
                      className={dropdownLinkClass}
                    >
                      System Telemetry
                    </NavLink>
                    <NavLink 
                      to="/settings" 
                      onClick={() => setIsMoreOpen(false)}
                      className={dropdownLinkClass}
                    >
                      Account & Settings
                    </NavLink>
                    {(profile?.role === 'ADMIN' || profile?.role === 'Administrator') && (
                      <NavLink
                        to="/admin/users"
                        onClick={() => setIsMoreOpen(false)}
                        className={dropdownLinkClass}
                      >
                        User Management
                      </NavLink>
                    )}
                  </div>
                )}
              </div>
            </nav>
          </div>
          {/* Right Header Operational Controls */}
          <div className="flex items-center gap-2">
            {/* Reload Data Button */}
            <button
              type="button"
              onClick={() => refreshAllData()}
              disabled={isRefreshing}
              title="Refresh telemetry from backend"
              className="p-1.5 rounded-lg border border-[#dfeaf2] bg-white/70 text-[#475d73] hover:text-[#132437] hover:bg-[#f3f7fb] dark:border-[#2a3d52] dark:bg-[#112334] dark:text-[#abc0d3] dark:hover:text-[#edf5ff] dark:hover:bg-[#172b3d] transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-[#0E6B66]' : ''}`} />
            </button>

            <div className="relative" ref={notificationsRef}>
              <button
                type="button"
                aria-label={`Notifications${unreadNotificationCount ? `, ${unreadNotificationCount} unread` : ''}`}
                aria-expanded={isNotificationsOpen}
                onClick={() => {
                  setIsNotificationsOpen((open) => !open);
                  void refreshNotifications();
                }}
                title="View notifications"
                className="relative p-1.5 rounded-lg border border-[#dfeaf2] bg-white/70 text-[#475d73] hover:text-[#132437] hover:bg-[#f3f7fb] dark:border-[#2a3d52] dark:bg-[#112334] dark:text-[#abc0d3] dark:hover:text-[#edf5ff] dark:hover:bg-[#172b3d] transition-colors"
              >
                <Bell className="w-4 h-4" />
                {unreadNotificationCount > 0 && (
                  <span className="absolute -right-1 -top-1 min-w-4 rounded-full bg-[#c62828] px-1 text-[9px] font-bold text-white">
                    {unreadNotificationCount > 99 ? '99+' : unreadNotificationCount}
                  </span>
                )}
              </button>
              {isNotificationsOpen && (
                <div className="absolute right-0 mt-2 w-80 max-w-[calc(100vw-2rem)] rounded-xl border border-[var(--border-color)] bg-[var(--bg-surface)] shadow-xl z-50">
                  <div className="flex items-center justify-between border-b border-[var(--border-color)] px-4 py-3">
                    <h2 className="text-sm font-semibold text-[var(--ink-primary)]">Notifications</h2>
                    <button
                      type="button"
                      onClick={() => void markAllNotificationsAsRead()}
                      disabled={unreadNotificationCount === 0 || isLoadingNotifications}
                      className="flex items-center gap-1 text-[11px] font-medium text-[#0E6B66] disabled:opacity-50"
                    >
                      <Check className="h-3 w-3" /> Mark all read
                    </button>
                  </div>
                  {notificationError && (
                    <p role="alert" className="flex items-center gap-2 px-4 py-3 text-xs text-red-700 dark:text-red-300">
                      <AlertCircle className="h-4 w-4 shrink-0" /> {notificationError}
                    </p>
                  )}
                  <div className="max-h-80 overflow-y-auto">
                    {isLoadingNotifications && notifications.length === 0 ? (
                      <p className="px-4 py-5 text-xs text-[var(--ink-muted)]">Loading notifications…</p>
                    ) : notifications.length === 0 ? (
                      <p className="px-4 py-5 text-xs text-[var(--ink-muted)]">No notifications have been recorded.</p>
                    ) : notifications.map((notification) => (
                      <button
                        key={notification.id}
                        type="button"
                        onClick={() => notification.isRead ? undefined : void markNotificationAsRead(notification.id)}
                        className={`block w-full border-b border-[var(--border-color)] px-4 py-3 text-left last:border-0 ${notification.isRead ? 'opacity-70' : 'hover:bg-[var(--bg-subtle)]'}`}
                      >
                        <span className="flex items-start justify-between gap-3">
                          <span className="text-xs font-semibold text-[var(--ink-primary)]">{notification.title}</span>
                          {!notification.isRead && <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-[#0E6B66]" />}
                        </span>
                        <span className="mt-1 block text-[11px] leading-relaxed text-[var(--ink-muted)]">{notification.message}</span>
                        <span className="mt-1 block text-[10px] text-[var(--ink-subtle)]">{new Date(notification.createdAt).toLocaleString()}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Quick Reset Sample Dataset */}
            <button
              type="button"
              disabled
              title="Reset is disabled for database-backed records"
              className="hidden lg:flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg border border-[#dfeaf2] bg-white/70 text-[#72859a] dark:border-[#2a3d52] dark:bg-[#112334] dark:text-[#8ea3bb] opacity-60 cursor-not-allowed"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Disabled</span>
            </button>

            {profile && (
              <div className="hidden md:flex items-center gap-3 rounded border border-[#DDD8CE] px-2.5 py-1.5 text-xs text-[#1D2433] dark:border-[#323C4D] dark:text-[#F0F4F8]">
                <div className="flex flex-col leading-tight">
                  <span className="font-semibold">{profile.fullName || profile.name || 'Operator'}</span>
                  <span className="text-[10px] text-[#667085] dark:text-[#9BA3AF]">{profile.role || 'OPERATOR'}</span>
                </div>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="text-[10px] font-medium text-[#0E6B66] hover:underline"
                >
                  Logout
                </button>
              </div>
            )}

            {/* Theme Toggle (Light / Dark) */}
            <button
              type="button"
              onClick={() => setIsDarkMode((prev) => !prev)}
              title="Toggle desk theme"
              className="p-1.5 rounded-lg border border-[#dfeaf2] bg-white/70 text-[#475d73] hover:text-[#132437] hover:bg-[#f3f7fb] dark:border-[#2a3d52] dark:bg-[#112334] dark:text-[#abc0d3] dark:hover:text-[#edf5ff] dark:hover:bg-[#172b3d] transition-colors"
            >
              {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>

        </div>
      </div>

    </header>
  );
};
