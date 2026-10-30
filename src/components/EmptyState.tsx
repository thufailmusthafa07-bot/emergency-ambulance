import React from 'react';
import { Inbox } from 'lucide-react';

interface EmptyStateProps {
  title?: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title = 'No Records Found',
  description = 'There are no telemetry items matching the selected filters or criteria.',
  actionLabel,
  onAction,
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-12 bg-[#0E1726]/60 backdrop-blur-md rounded-2xl border border-dashed border-slate-800 text-center">
      <div className="p-4 bg-slate-900 rounded-2xl text-cyan-400 border border-slate-800 mb-3 shadow-inner">
        <Inbox className="w-8 h-8" />
      </div>
      <h4 className="text-base font-bold text-white font-mono">{title}</h4>
      <p className="text-xs text-slate-400 max-w-sm mt-1 mb-4">{description}</p>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="px-4 py-2 text-xs font-bold text-white bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 rounded-xl transition-all shadow-md active:scale-95"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
};

export default EmptyState;
