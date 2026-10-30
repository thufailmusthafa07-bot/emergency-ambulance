import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Navigation, Clock, ArrowRight, ShieldAlert, CheckCircle2 } from 'lucide-react';

export const RouteOptimizationPage: React.FC = () => {
  const { locations, calculateRoute } = useApp();
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [routeResult, setRouteResult] = useState<{ reachable: boolean; totalMinutes: number; path: string[] } | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const selectedOrigin = locations.some((location) => location.id === origin) ? origin : locations[0]?.id ?? '';
  const selectedDestination = locations.some((location) => location.id === destination)
    ? destination
    : locations.find((location) => location.id !== selectedOrigin)?.id ?? selectedOrigin;

  const handleCompute = async () => {
    if (!selectedOrigin || !selectedDestination) return;
    setIsCalculating(true);
    setErrorMsg(null);
    try {
      const res = await calculateRoute(selectedOrigin, selectedDestination);
      setRouteResult(res);
    } catch (err: any) {
      setErrorMsg(err.message || 'Route calculation failed');
    } finally {
      setIsCalculating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-[#DDD8CE] dark:border-[#323C4D] pb-4">
        <h1 className="text-2xl font-serif font-bold text-[#1D2433] dark:text-[#F0F4F8]">
          Route Optimization Engine (Dijkstra)
        </h1>
        <p className="text-xs text-[#667085] dark:text-[#9BA3AF] mt-0.5">
          Compute the global minimum travel time path between any two locations in Nalam Nagar. Closed roads are strictly excluded.
        </p>
      </div>

      {errorMsg && (
        <div className="p-3 rounded bg-[#FDEDEC] dark:bg-[#381A1C] border border-[#F5C6CB] text-xs text-[#C62828] dark:text-[#F87171]">
          {errorMsg}
        </div>
      )}

      {/* Query Form Card */}
      <div className="municipal-card p-5 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="block text-[11px] font-semibold text-[#667085] dark:text-[#9BA3AF] mb-1">
              Origin Node (From)
            </label>
            <select
              value={selectedOrigin}
              onChange={(e) => setOrigin(e.target.value)}
              className="municipal-input w-full font-mono"
            >
              {locations.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.name} ({loc.id} - {loc.zoneType})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-[#667085] dark:text-[#9BA3AF] mb-1">
              Destination Node (To)
            </label>
            <select
              value={selectedDestination}
              onChange={(e) => setDestination(e.target.value)}
              className="municipal-input w-full font-mono"
            >
              {locations.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.name} ({loc.id} - {loc.zoneType})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center justify-end">
          <button
            type="button"
            onClick={handleCompute}
            disabled={isCalculating}
            className="px-4 py-2 rounded bg-[#0E6B66] hover:bg-[#0B5450] text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm"
          >
            <Navigation className="w-3.5 h-3.5" />
            <span>{isCalculating ? 'Computing Dijkstra Path...' : 'Compute Optimal Route'}</span>
          </button>
        </div>
      </div>

      {/* Route Result Display */}
      {routeResult && (
        <div className="municipal-card p-5 space-y-4 border-l-4 border-l-[#0E6B66]">
          <div className="flex items-center justify-between pb-2 border-b border-[#DDD8CE] dark:border-[#323C4D]">
            <h3 className="font-serif font-bold text-sm text-[#1D2433] dark:text-[#F0F4F8]">
              Dijkstra Calculation Result
            </h3>
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                routeResult.reachable
                  ? 'bg-[#EDF7EE] text-[#2F7D4F] border border-[#C8E6C9]'
                  : 'bg-[#FDEDEC] text-[#C62828] border border-[#F5C6CB]'
              }`}
            >
              {routeResult.reachable ? 'REACHABLE' : 'UNREACHABLE (BLOCKED)'}
            </span>
          </div>

          {routeResult.reachable ? (
            <div className="space-y-3">
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-serif font-bold text-[#0E6B66] dark:text-[#1DB8AF]">
                  {routeResult.totalMinutes.toFixed(1)}
                </span>
                <span className="text-xs text-[#667085] dark:text-[#9BA3AF]">estimated travel minutes</span>
              </div>

              <div>
                <span className="text-[11px] font-semibold text-[#667085] dark:text-[#9BA3AF] block mb-1">
                  Optimal Shortest Path:
                </span>
                <div className="p-3 rounded bg-[#F5F2EC] dark:bg-[#151A22] border border-[#DDD8CE] dark:border-[#323C4D] font-mono text-xs font-semibold text-[#1D2433] dark:text-[#F0F4F8] leading-relaxed">
                  {routeResult.path.join(' \u2794 ')}
                </div>
              </div>

              <div className="text-[11px] text-[#667085] dark:text-[#9BA3AF]">
                Total Nodes in Path: <strong>{routeResult.path.length}</strong> &bull; Total Road Segments: <strong>{routeResult.path.length - 1}</strong>
              </div>
            </div>
          ) : (
            <div className="p-4 rounded bg-[#FDEDEC] dark:bg-[#381A1C] border border-[#F5C6CB] text-xs text-[#C62828] dark:text-[#F87171] space-y-1">
              <strong>Route Blocked:</strong> All candidate paths between {selectedOrigin} and {selectedDestination} are currently severed by road closures.
            </div>
          )}
        </div>
      )}

      {/* Case Study Criteria Box */}
      <div className="municipal-card p-4 text-xs text-[#667085] dark:text-[#9BA3AF] space-y-1">
        <h4 className="font-serif font-bold text-sm text-[#1D2433] dark:text-[#F0F4F8]">
          Optimization Rule Note:
        </h4>
        <p>
          The optimization criterion everywhere is <strong>TRAVEL TIME</strong> (never plain geographical distance). Traffic is modeled by changing edge travel times. Closed roads are strictly skipped during priority queue exploration.
        </p>
      </div>
    </div>
  );
};

export default RouteOptimizationPage;
