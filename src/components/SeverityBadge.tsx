import React from 'react';
import type { SeverityLevel } from '../types/emergency';
import { getSeverityBadgeColor } from '../utils/formatters';
import { AlertTriangle, AlertCircle, Info } from 'lucide-react';

interface SeverityBadgeProps {
  severity: SeverityLevel;
  showIcon?: boolean;
}

export const SeverityBadge: React.FC<SeverityBadgeProps> = ({ severity, showIcon = true }) => {
  const colorClasses = getSeverityBadgeColor(severity);

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-black font-mono tracking-wider border uppercase ${colorClasses} ${
        severity === 'CRITICAL' ? 'animate-critical-pulse' : ''
      }`}
    >
      {showIcon && severity === 'CRITICAL' && <AlertTriangle className="w-3.5 h-3.5 text-rose-400 animate-pulse" />}
      {showIcon && severity === 'SERIOUS' && <AlertCircle className="w-3.5 h-3.5 text-amber-400" />}
      {showIcon && severity === 'MINOR' && <Info className="w-3.5 h-3.5 text-cyan-400" />}
      {severity}
    </span>
  );
};

export default SeverityBadge;
