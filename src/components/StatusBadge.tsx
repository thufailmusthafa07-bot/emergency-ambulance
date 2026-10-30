import React from 'react';
import { getStatusBadgeColor } from '../utils/formatters';

interface StatusBadgeProps {
  status: string;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  const colorClasses = getStatusBadgeColor(status);
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs font-bold';

  const isPositive = status === 'Available' || status === 'Open' || status === 'Operational' || status === 'Completed';
  const isWarning = status === 'Pending' || status === 'Busy' || status === 'Moderate' || status === 'Assigned';
  const isCritical = status === 'CRITICAL' || status === 'Critical' || status === 'Closed' || status === 'Full' || status === 'Cancelled' || status === 'Heavy';

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border font-mono tracking-wide ${sizeClasses} ${colorClasses}`}>
      <span
        className={`w-1.5 h-1.5 rounded-full ${
          isPositive
            ? 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]'
            : isWarning
            ? 'bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.8)]'
            : isCritical
            ? 'bg-rose-400 shadow-[0_0_6px_rgba(244,63,94,0.8)] animate-pulse'
            : 'bg-cyan-400 shadow-[0_0_6px_rgba(34,211,238,0.8)]'
        }`}
      />
      {status}
    </span>
  );
};

export default StatusBadge;
