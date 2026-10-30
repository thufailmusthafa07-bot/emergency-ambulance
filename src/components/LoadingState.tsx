import React from 'react';
import { Loader2 } from 'lucide-react';

interface LoadingStateProps {
  message?: string;
}

export const LoadingState: React.FC<LoadingStateProps> = ({ message = 'Loading control center telemetry data...' }) => {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center">
      <Loader2 className="w-8 h-8 text-cyan-400 animate-spin mb-3" />
      <p className="text-xs font-semibold text-slate-400 font-mono tracking-wide">{message}</p>
    </div>
  );
};

export default LoadingState;
