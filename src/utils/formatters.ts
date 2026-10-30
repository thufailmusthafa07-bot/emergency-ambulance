import type { SeverityLevel } from '../types/emergency';

export function formatDate(dateString: string): string {
  try {
    const d = new Date(dateString);
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return dateString;
  }
}

export function formatTime(dateString: string): string {
  try {
    const d = new Date(dateString);
    return d.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return dateString;
  }
}

export function formatDateTime(dateString: string): string {
  if (dateString.includes('ago') || dateString.includes('Just now')) return dateString;
  return `${formatDate(dateString)} at ${formatTime(dateString)}`;
}

export function getSeverityBadgeColor(severity: SeverityLevel): string {
  switch (severity) {
    case 'CRITICAL':
      return 'bg-rose-950/80 text-rose-300 border-rose-500/60 shadow-[0_0_12px_rgba(244,63,94,0.35)]';
    case 'SERIOUS':
      return 'bg-amber-950/80 text-amber-300 border-amber-500/50 shadow-[0_0_10px_rgba(245,158,11,0.25)]';
    case 'MINOR':
      return 'bg-cyan-950/80 text-cyan-300 border-cyan-500/50 shadow-[0_0_10px_rgba(6,182,212,0.25)]';
    default:
      return 'bg-slate-900/80 text-slate-300 border-slate-700';
  }
}

export function getStatusBadgeColor(status: string): string {
  switch (status) {
    case 'Available':
    case 'Open':
    case 'Operational':
    case 'Completed':
      return 'bg-emerald-950/80 text-emerald-300 border-emerald-500/50 shadow-[0_0_10px_rgba(16,185,129,0.25)]';
    case 'Pending':
    case 'Moderate':
    case 'Busy':
    case 'Assigned':
      return 'bg-amber-950/80 text-amber-300 border-amber-500/50 shadow-[0_0_10px_rgba(245,158,11,0.25)]';
    case 'CRITICAL':
    case 'Critical':
    case 'Closed':
    case 'Full':
    case 'Cancelled':
    case 'Offline':
    case 'Heavy':
      return 'bg-rose-950/80 text-rose-300 border-rose-500/60 shadow-[0_0_12px_rgba(244,63,94,0.35)]';
    case 'Ambulance Dispatched':
    case 'En Route':
    case 'At Scene':
    case 'Transporting':
    case 'Dispatched':
      return 'bg-cyan-950/80 text-cyan-300 border-cyan-500/50 shadow-[0_0_10px_rgba(6,182,212,0.25)]';
    default:
      return 'bg-slate-900/80 text-slate-300 border-slate-700';
  }
}
