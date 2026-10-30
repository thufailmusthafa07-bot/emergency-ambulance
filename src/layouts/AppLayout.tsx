import React from 'react';
import { Outlet } from 'react-router-dom';
import { TopNavBar } from '../components/TopNavBar';
import { useApp } from '../context/AppContext';
import { AlertCircle } from 'lucide-react';

export const AppLayout: React.FC = () => {
  const { lastError } = useApp();

  return (
    <div className="min-h-screen bg-[var(--bg-app)] text-[var(--ink-primary)] flex flex-col font-sans transition-colors duration-200">
      {/* Calm Municipal Top Navigation Bar */}
      <TopNavBar />

      {/* Backend Disconnection / Auth Banner (if any) */}
      {lastError && (
        <div className="bg-[#fef4f4] dark:bg-[#2d1518] border-b border-[#f7d6da] dark:border-[#52262d] px-4 py-2 text-xs text-[#b42318] dark:text-[#fca5a5] flex items-center justify-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {lastError.toLowerCase().includes('auth') || lastError.includes('401') ? (
            <span>
              {lastError}.{' '}
              <a href="/login" className="font-semibold underline ml-1 hover:text-[#7a1410] dark:hover:text-[#fecaca]">
                Sign in again
              </a>
            </span>
          ) : (
            <span>{lastError}. Please ensure the Node.js backend API is running.</span>
          )}
        </div>
      )}

      {/* Main Operations Canvas */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        <Outlet />
      </main>

      {/* Municipal Footer */}
      <footer className="border-t border-[var(--border-color)] bg-[rgba(255,255,255,0.7)] dark:bg-[rgba(8,25,38,0.7)] py-3 text-center text-[11px] text-[var(--ink-muted)] backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>Nalam Nagar Emergency Medical Operations Desk &bull; Shortest Travel Time Dispatch Engine</span>
          <span className="font-mono text-[10px]">v3.0.0-PROD</span>
        </div>
      </footer>
    </div>
  );
};

export default AppLayout;
