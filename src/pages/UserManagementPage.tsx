import React, { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, RefreshCw, ShieldCheck } from 'lucide-react';
import { userService, type ManagedUser } from '../services/userService';

export const UserManagementPage: React.FC = () => {
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const refresh = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    setError(null);
    try {
      setUsers(await userService.getUsers());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
  }, []);

  const updateRole = async (user: ManagedUser, role: 'ADMIN' | 'DISPATCHER') => {
    setUpdatingId(user.id);
    setError(null);
    setSuccessMessage(null);
    try {
      const updated = await userService.updateRole(user.id, role);
      setUsers((current) => current.map((item) => (item.id === updated.id ? updated : item)));
      setSuccessMessage(`Role for ${user.name} (${user.email}) successfully updated to ${role}. The account is now authorized.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update user role');
    } finally {
      setUpdatingId(null);
    }
  };

  const getRoleBadge = (roleStr: string) => {
    const r = roleStr.toLowerCase();
    if (r.includes('admin')) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-purple-100 text-purple-800 border border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800">
          ADMIN
        </span>
      );
    }
    if (r.includes('dispatch') || r.includes('operator')) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800">
          DISPATCHER
        </span>
      );
    }
    if (r.includes('ambulance') || r.includes('staff')) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-100 text-blue-800 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800">
          AMBULANCE_STAFF
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-100 text-amber-800 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800">
        CITIZEN (PUBLIC)
      </span>
    );
  };

  return (
    <section className="space-y-5">
      <header className="flex items-center justify-between border-b border-[var(--border-color)] pb-4">
        <div>
          <h1 className="text-2xl font-serif font-bold text-[var(--ink-primary)]">User Administration & Role Management</h1>
          <p className="mt-1 text-xs text-[var(--ink-muted)]">
            Manage municipal emergency operators, dispatchers, ambulance staff, and authorize citizen accounts for console access.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void refresh()}
          disabled={loading}
          className="flex items-center gap-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-surface)] px-3 py-2 text-xs text-[var(--ink-primary)] hover:bg-[var(--bg-subtle)] disabled:opacity-50 transition-colors shadow-sm cursor-pointer"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin text-[#0f766e]' : ''} />
          Refresh Directory
        </button>
      </header>

      {successMessage && (
        <div role="status" className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/30 dark:border-emerald-800 p-3 text-xs text-emerald-800 dark:text-emerald-200">
          <CheckCircle2 size={16} className="shrink-0 text-emerald-600 dark:text-emerald-400" />
          <span>{successMessage}</span>
        </div>
      )}

      {error && (
        <div role="alert" className="flex items-center gap-2 rounded-lg border border-red-300 bg-red-50 dark:bg-red-950/30 dark:border-red-800 p-3 text-xs text-red-800 dark:text-red-200">
          <AlertCircle size={16} className="shrink-0 text-red-600 dark:text-red-400" />
          <span>{error}</span>
        </div>
      )}

      <div className="municipal-card overflow-x-auto shadow-sm">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-[var(--border-color)] bg-[var(--bg-subtle)] text-[var(--ink-muted)]">
            <tr>
              <th className="p-3.5 font-semibold">Name & Identity</th>
              <th className="p-3.5 font-semibold">Email / Login ID</th>
              <th className="p-3.5 font-semibold">Current Permission</th>
              <th className="p-3.5 font-semibold">Role Authorization Action</th>
              <th className="p-3.5 font-semibold">Registered</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border-color)]">
            {users.map((user) => {
              const normalizedRole = user.role.toLowerCase();
              const selectValue = normalizedRole.includes('admin')
                ? 'ADMIN'
                : normalizedRole.includes('dispatch') || normalizedRole.includes('operator')
                  ? 'DISPATCHER'
                  : normalizedRole.includes('ambulance') || normalizedRole.includes('staff')
                    ? 'AMBULANCE_STAFF'
                    : 'CITIZEN';

              return (
                <tr key={user.id} className="hover:bg-[var(--bg-subtle)]/50 transition-colors">
                  <td className="p-3.5 font-medium text-[var(--ink-primary)]">
                    <div>{user.name}</div>
                    <div className="font-mono text-[10px] text-[var(--ink-subtle)] mt-0.5">{user.id}</div>
                  </td>
                  <td className="p-3.5 font-mono text-[11px] text-[var(--ink-primary)]">{user.email}</td>
                  <td className="p-3.5">{getRoleBadge(user.role)}</td>
                  <td className="p-3.5">
                    <label className="sr-only" htmlFor={`role-${user.id}`}>Role action for {user.name}</label>
                    <div className="flex items-center gap-2">
                      <select
                        id={`role-${user.id}`}
                        value={selectValue}
                        disabled={updatingId === user.id}
                        onChange={(event) => {
                          const newRole = event.target.value;
                          if (newRole === 'ADMIN' || newRole === 'DISPATCHER') {
                            void updateRole(user, newRole);
                          }
                        }}
                        className="bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-lg px-2.5 py-1.5 text-xs text-[var(--ink-primary)] focus:outline-none focus:border-[var(--accent-teal)] focus:ring-1 focus:ring-[var(--accent-teal)] font-medium transition-all cursor-pointer disabled:opacity-50"
                      >
                        {selectValue === 'CITIZEN' && (
                          <option value="CITIZEN" disabled>Citizen (Public Account)</option>
                        )}
                        {selectValue === 'AMBULANCE_STAFF' && (
                          <option value="AMBULANCE_STAFF" disabled>Ambulance Staff</option>
                        )}
                        <option value="DISPATCHER">Authorize as Dispatch Operator</option>
                        <option value="ADMIN">Authorize as Administrator</option>
                      </select>
                      {updatingId === user.id && (
                        <RefreshCw size={13} className="animate-spin text-[#0f766e]" />
                      )}
                    </div>
                  </td>
                  <td className="p-3.5 text-[var(--ink-muted)] font-mono text-[11px]">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              );
            })}
            {!loading && users.length === 0 && (
              <tr>
                <td colSpan={5} className="p-6 text-center text-[var(--ink-muted)]">
                  No accounts found in the directory.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-[11px] text-[var(--ink-muted)] px-1">
        <p className="flex items-center gap-1.5">
          <ShieldCheck size={14} className="text-[#0f766e]" />
          <span>Role modifications are atomic and recorded to the municipal audit trail. Passwords and hashes are never exposed.</span>
        </p>
      </div>
    </section>
  );
};

export default UserManagementPage;
