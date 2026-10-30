import React from 'react';
import type { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: string;
  trendType?: 'positive' | 'negative' | 'neutral' | 'critical' | 'warning';
  iconBgColor?: string;
  iconColor?: string;
  subtext?: string;
  onClick?: () => void;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  icon: Icon,
  trend,
  trendType = 'neutral',
  iconBgColor,
  iconColor,
  subtext,
  onClick,
}) => {
  const getTrendBadge = () => {
    if (!trend) return null;
    let badgeStyle = 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800/80 dark:text-slate-300 dark:border-slate-700';
    if (trendType === 'positive') badgeStyle = 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/70 dark:text-emerald-300 dark:border-emerald-500/40';
    if (trendType === 'critical') badgeStyle = 'bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/80 dark:text-rose-300 dark:border-rose-500/50 font-bold';
    if (trendType === 'warning') badgeStyle = 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/70 dark:text-amber-300 dark:border-amber-500/40';

    return <span className={`text-[11px] font-mono px-2 py-0.5 rounded-full border ${badgeStyle}`}>{trend}</span>;
  };

  return (
    <div
      onClick={onClick}
      className={`bg-white/90 dark:bg-[#0f1d2a] backdrop-blur-md rounded-2xl border border-[#d8e4ec] dark:border-[#2d4358] p-4 sm:p-5 shadow-[0_10px_25px_rgba(32,54,74,0.1)] dark:shadow-[0_10px_25px_rgba(2,6,23,0.45)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_14px_30px_rgba(6,182,212,0.12)] hover:border-[#0f766e]/50 dark:hover:border-[#67e8f9]/60 relative overflow-hidden group ${
        onClick ? 'cursor-pointer hover:border-[#67e8f9]/80' : ''
      }`}
    >
      {/* Top subtle highlight line */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#0f766e]/70 dark:via-[#67e8f9]/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

      <div className="flex items-center justify-between">
        <span className="text-[11px] font-bold uppercase tracking-wider text-[#42586f] dark:text-[#c5d7e8] font-mono">{title}</span>
        <div className={`p-2.5 rounded-xl border border-[#d8e4ec] dark:border-white/10 transition-transform group-hover:scale-105 shadow-md ${iconBgColor || 'bg-[#e8f4f7] dark:bg-[#183548]'}`}>
          <Icon className={`w-4 h-4 ${iconColor || 'text-[#0f766e] dark:text-[#7dd3fc]'}`} />
        </div>
      </div>
      <div className="mt-3 flex items-baseline justify-between gap-2">
        <span className="text-2xl sm:text-3xl font-black tracking-tight text-[#172b40] dark:text-[#f8fbff] font-mono">{value}</span>
        {getTrendBadge()}
      </div>
      {subtext && <p className="mt-1.5 text-[11px] text-[#5d7185] dark:text-[#bbcad8] font-medium">{subtext}</p>}
    </div>
  );
};

export default StatCard;
