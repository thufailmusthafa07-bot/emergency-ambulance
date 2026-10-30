import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { ShieldAlert, Clock, RefreshCw, CheckCircle2, AlertTriangle, ArrowRight } from 'lucide-react';

export const TrafficRoadsPage: React.FC = () => {
  const { roads, updateRoadTraffic, updateRoadCondition, closeRoad, reopenRoad } = useApp();
  const [selectedRoadId, setSelectedRoadId] = useState<string>('');
  const [trafficMinutes, setTrafficMinutes] = useState<number>(8.0);
  const [trafficCondition, setTrafficCondition] = useState<'LOW' | 'MODERATE' | 'HEAVY'>('LOW');
  const [closureReason, setClosureReason] = useState<string>('Heavy waterlogging after monsoon rain');
  const [recalcLogs, setRecalcLogs] = useState<string[]>([]);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  React.useEffect(() => {
    if (roads.length > 0 && !selectedRoadId) {
      setSelectedRoadId(roads[0].id);
      setTrafficMinutes(roads[0].currentMinutes);
      setTrafficCondition(roads[0].currentTraffic);
    }
  }, [roads, selectedRoadId]);

  const handleUpdateTraffic = async () => {
    if (!selectedRoadId || trafficMinutes <= 0) return;
    setIsBusy(true);
    setStatusMsg(null);
    try {
      const res = await updateRoadTraffic(selectedRoadId, trafficMinutes);
      setRecalcLogs(res.recalculations || []);
      setStatusMsg(`Road ${selectedRoadId} travel time adjusted to ${trafficMinutes} minutes.`);
    } catch (err: any) {
      setStatusMsg(`Update failed: ${err.message}`);
    } finally {
      setIsBusy(false);
    }
  };

  const handleUpdateCondition = async () => {
    if (!selectedRoadId) return;
    setIsBusy(true);
    setStatusMsg(null);
    try {
      await updateRoadCondition(selectedRoadId, trafficCondition);
      setStatusMsg(`Road ${selectedRoadId} traffic condition set to ${trafficCondition}. Route weights use configured estimates, not live traffic feeds.`);
    } catch (err: any) {
      setStatusMsg(`Update failed: ${err.message}`);
    } finally {
      setIsBusy(false);
    }
  };

  const handleCloseRoad = async () => {
    if (!selectedRoadId) return;
    setIsBusy(true);
    setStatusMsg(null);
    try {
      const res = await closeRoad(selectedRoadId, closureReason);
      setRecalcLogs(res.recalculations || []);
      setStatusMsg(`Road ${selectedRoadId} is now CLOSED and excluded from Dijkstra paths.`);
    } catch (err: any) {
      setStatusMsg(`Closure failed: ${err.message}`);
    } finally {
      setIsBusy(false);
    }
  };

  const handleReopenRoad = async () => {
    if (!selectedRoadId) return;
    setIsBusy(true);
    setStatusMsg(null);
    try {
      const res = await reopenRoad(selectedRoadId);
      setRecalcLogs(res.recalculations || []);
      setStatusMsg(`Road ${selectedRoadId} has been REOPENED.`);
    } catch (err: any) {
      setStatusMsg(`Reopen failed: ${err.message}`);
    } finally {
      setIsBusy(false);
    }
  };

  const currentRoad = roads.find((r) => r.id === selectedRoadId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-[#DDD8CE] dark:border-[#323C4D] pb-4">
        <h1 className="text-2xl font-serif font-bold text-[#1D2433] dark:text-[#F0F4F8]">
          Traffic & Road Control Desk
        </h1>
        <p className="text-xs text-[#667085] dark:text-[#9BA3AF] mt-0.5">
          Dynamically simulate traffic delays or road closures. System immediately triggers dynamic recalculation of every active mission route.
        </p>
      </div>

      {statusMsg && (
        <div className="p-3.5 rounded bg-[#E6F3F2] dark:bg-[#16363B] border border-[#0E6B66]/30 text-xs text-[#0E6B66] dark:text-[#1DB8AF] flex items-center justify-between">
          <span>{statusMsg}</span>
          <button onClick={() => setStatusMsg(null)} className="font-bold underline text-xs">Dismiss</button>
        </div>
      )}

      {/* Control Panel Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left 6 Cols: Manual Road Status Controller */}
        <div className="lg:col-span-6 municipal-card p-5 space-y-4">
          <h2 className="font-serif font-bold text-base text-[#1D2433] dark:text-[#F0F4F8] border-b border-[#DDD8CE] dark:border-[#323C4D] pb-2">
            Manual Road Segment Modifier
          </h2>

          <div className="space-y-3 text-xs">
            <div>
              <label className="block text-[11px] font-semibold text-[#667085] dark:text-[#9BA3AF] mb-1">
                Select Road Segment *
              </label>
              <select
                value={selectedRoadId}
                onChange={(e) => {
                  setSelectedRoadId(e.target.value);
                  const found = roads.find((r) => r.id === e.target.value);
                  if (found) {
                    setTrafficMinutes(found.currentMinutes);
                    setTrafficCondition(found.currentTraffic);
                  }
                }}
                className="municipal-input w-full font-mono text-xs"
              >
                {roads.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.id}: {r.sourceId} &rarr; {r.destinationId} ({r.currentMinutes}m {r.closed ? '[CLOSED]' : ''})
                  </option>
                ))}
              </select>
            </div>

            {currentRoad && (
              <div className="p-3 rounded bg-[#F5F2EC] dark:bg-[#151A22] border border-[#DDD8CE] dark:border-[#323C4D] space-y-1 text-xs">
                <div>Nominal Base Time: <strong>{currentRoad.baseMinutes} mins</strong></div>
                <div>Current Travel Time: <strong>{currentRoad.currentMinutes} mins</strong></div>
                <div>Status: <strong>{currentRoad.closed ? `CLOSED (${currentRoad.closureReason})` : 'OPEN'}</strong></div>
                <div>Configured traffic weight: <strong>{currentRoad.currentTraffic}</strong></div>
              </div>
            )}

            {/* Delay Adjuster */}
            <div className="pt-2 border-t border-[#DDD8CE] dark:border-[#323C4D] space-y-2">
              <label className="block text-[11px] font-semibold text-[#667085] dark:text-[#9BA3AF]">
                Traffic Condition (Configured Estimate)
              </label>
              <div className="flex items-center gap-2">
                <select value={trafficCondition} onChange={(event) => setTrafficCondition(event.target.value as 'LOW' | 'MODERATE' | 'HEAVY')} className="municipal-input py-1.5 px-3">
                  <option value="LOW">Low</option>
                  <option value="MODERATE">Moderate</option>
                  <option value="HEAVY">Heavy</option>
                </select>
                <button type="button" onClick={handleUpdateCondition} disabled={isBusy} className="px-3.5 py-1.5 rounded border border-[#0E6B66] text-[#0E6B66] font-semibold text-xs disabled:opacity-50">
                  Apply Condition
                </button>
              </div>
              <label className="block text-[11px] font-semibold text-[#667085] dark:text-[#9BA3AF]">
                Override Configured Travel-Time Estimate (Minutes; Not Live Traffic)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  step="0.5"
                  min="0.5"
                  value={trafficMinutes}
                  onChange={(e) => setTrafficMinutes(Math.max(0.5, parseFloat(e.target.value) || 1))}
                  className="municipal-input py-1.5 px-3 w-32 font-mono font-bold"
                />
                <span className="text-xs text-[#667085]">minutes</span>
                <button
                  type="button"
                  onClick={handleUpdateTraffic}
                  disabled={isBusy}
                  className="px-3.5 py-1.5 rounded bg-[#0E6B66] hover:bg-[#0B5450] text-white font-semibold text-xs transition-colors"
                >
                  Apply Traffic Delay
                </button>
              </div>
            </div>

            {/* Closure / Reopen Toggle */}
            <div className="pt-3 border-t border-[#DDD8CE] dark:border-[#323C4D] space-y-2">
              <label className="block text-[11px] font-semibold text-[#667085] dark:text-[#9BA3AF]">
                Road Closure Simulation
              </label>
              <input
                type="text"
                value={closureReason}
                onChange={(e) => setClosureReason(e.target.value)}
                placeholder="Reason for closure (e.g. Major accident, tree fallen)"
                className="municipal-input w-full"
              />

              <div className="flex items-center gap-2 pt-1">
                {currentRoad?.closed ? (
                  <button
                    type="button"
                    onClick={handleReopenRoad}
                    disabled={isBusy}
                    className="px-4 py-2 rounded bg-[#0E6B66] hover:bg-[#0B5450] text-white font-semibold text-xs"
                  >
                    Reopen Road Segment
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleCloseRoad}
                    disabled={isBusy}
                    className="px-4 py-2 rounded bg-[#C62828] hover:bg-[#9E2020] text-white font-semibold text-xs"
                  >
                    Simulate Road Closure
                  </button>
                )}
              </div>
            </div>

          </div>
        </div>

        {/* Right 6 Cols: Active Trip Route Recalculation Audit */}
        <div className="lg:col-span-6 municipal-card p-5 space-y-3">
          <div className="flex items-center justify-between border-b border-[#DDD8CE] dark:border-[#323C4D] pb-2">
            <div>
              <h2 className="font-serif font-bold text-base text-[#1D2433] dark:text-[#F0F4F8]">
                Real-Time Recalculation Audit Log
              </h2>
              <span className="text-xs text-[#667085] dark:text-[#9BA3AF]">
                Case Study Rule 8: Recalculates every active trip after any traffic or closure update.
              </span>
            </div>
            <RefreshCw className={`w-4 h-4 text-[#0E6B66] ${isBusy ? 'animate-spin' : ''}`} />
          </div>

          <div className="space-y-2 min-h-60 max-h-96 overflow-y-auto pr-1">
            {recalcLogs.length === 0 ? (
              <div className="py-12 text-center text-xs text-[#667085] dark:text-[#9BA3AF]">
                Modify any road segment to view the before/after Dijkstra route comparison here.
              </div>
            ) : (
              recalcLogs.map((log, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded border border-[#DDD8CE] dark:border-[#323C4D] bg-[#F5F2EC] dark:bg-[#151A22] text-xs font-mono leading-relaxed"
                >
                  {log}
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default TrafficRoadsPage;
