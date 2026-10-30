import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import type { MissionTrip } from '../context/AppContext';
import { 
  Radio, 
  Truck, 
  Building2, 
  AlertTriangle, 
  CheckCircle2, 
  MapPin, 
  ArrowRight,
  Clock,
  Check,
  ChevronRight,
  ShieldCheck,
  Info
} from 'lucide-react';

export const DispatchCenterPage: React.FC = () => {
  const { emergencies, ambulances, hospitals, trips, dispatchNext, completeTrip } = useApp();
  const [dispatchError, setDispatchError] = useState<string | null>(null);
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);
  const safeEmergencies = Array.isArray(emergencies) ? emergencies : [];
  const safeAmbulances = Array.isArray(ambulances) ? ambulances : [];
  const safeTrips = Array.isArray(trips) ? trips : [];
  const latestTrip: MissionTrip | null = safeTrips.find((trip) => trip.id === selectedTripId) ?? safeTrips[safeTrips.length - 1] ?? null;
  const selectedAmbulance = latestTrip ? safeAmbulances.find((ambulance) => ambulance.id === latestTrip.ambulanceId) : null;
  const selectedHospital = latestTrip ? hospitals.find((hospital) => hospital.id === latestTrip.hospitalId) : null;
  const [isProcessing, setIsProcessing] = useState(false);
  const [completionNotice, setCompletionNotice] = useState<string | null>(null);

  const formatMinutes = (value: number | null | undefined) => {
    if (typeof value !== 'number' || Number.isNaN(value)) return 'N/A';
    return `${value.toFixed(1)} mins`;
  };

  // Column 1: Priority Queue
  const pendingRequests = safeEmergencies.filter((e) => e.status === 'PENDING');
  // Column 2: Available Ambulances
  const availableAmbulances = safeAmbulances.filter((a) => a.status === 'AVAILABLE');
  // Column 3: Active Missions
  const activeTrips = safeTrips.filter((t) => !t.completed);

  const handleDispatchNext = async () => {
    setDispatchError(null);
    setCompletionNotice(null);
    setIsProcessing(true);
    try {
      const trip = await dispatchNext();
      setSelectedTripId(trip.id);
    } catch (err: any) {
      setDispatchError(err.message || 'Dispatch failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCompleteMission = async (tripId: string) => {
    setIsProcessing(true);
    setDispatchError(null);
    try {
      const res = await completeTrip(tripId);
      setCompletionNotice(res.message);
      setTimeout(() => setCompletionNotice(null), 5000);
    } catch (err: any) {
      setDispatchError(err.message || 'Failed to complete mission');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#DDD8CE] dark:border-[#323C4D] pb-4">
        <div>
          <h1 className="text-2xl font-serif font-bold text-[#1D2433] dark:text-[#F0F4F8]">
            Emergency Dispatch Center
          </h1>
          <p className="text-xs text-[#667085] dark:text-[#9BA3AF] mt-0.5">
            Three-column coordination workspace with database-backed assignments and configured route-time estimates.
          </p>
        </div>

        <button
          type="button"
          onClick={handleDispatchNext}
          disabled={isProcessing || pendingRequests.length === 0}
          className="flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded bg-[#0E6B66] hover:bg-[#0B5450] text-white disabled:opacity-50 transition-colors shadow-sm self-start sm:self-auto"
        >
          <Radio className="w-4 h-4" />
          <span>{isProcessing ? 'Processing...' : 'Dispatch Next Highest Priority'}</span>
        </button>
      </div>

      {/* Alert Notices */}
      {dispatchError && (
        <div className="p-3.5 rounded bg-[#FDEDEC] dark:bg-[#381A1C] border border-[#F5C6CB] text-xs text-[#C62828] dark:text-[#F87171] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span><strong>Dispatch Exception Handled:</strong> {dispatchError}</span>
          </div>
          <button onClick={() => setDispatchError(null)} className="font-bold underline text-xs">Dismiss</button>
        </div>
      )}

      {completionNotice && (
        <div className="p-3.5 rounded bg-[#EDF7EE] dark:bg-[#152E20] border border-[#C8E6C9] text-xs text-[#2F7D4F] dark:text-[#4ADE80] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{completionNotice}</span>
          </div>
          <button onClick={() => setCompletionNotice(null)} className="font-bold underline text-xs">Dismiss</button>
        </div>
      )}

      {/* CASE STUDY REQUIREMENT: THREE COLUMNS
          Col 1: Pending Queue | Col 2: Available Ambulances | Col 3: Active Trips */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-start">
        
        {/* COLUMN 1: Pending Queue */}
        <div className="municipal-card p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-[#DDD8CE] dark:border-[#323C4D] pb-2">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#D9822B]" />
              <h2 className="font-serif font-bold text-sm text-[#1D2433] dark:text-[#F0F4F8]">
                1. Pending Queue
              </h2>
            </div>
            <span className="text-[11px] font-mono text-[#667085] dark:text-[#9BA3AF]">
              {pendingRequests.length} calls
            </span>
          </div>

          <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
            {pendingRequests.length === 0 ? (
              <div className="py-8 text-center text-xs text-[#667085] dark:text-[#9BA3AF]">
                Queue empty. All emergency calls handled.
              </div>
            ) : (
              pendingRequests.map((req, idx) => (
                <div
                  key={req.id}
                  className="p-3 rounded border border-[#DDD8CE] dark:border-[#323C4D] bg-[#F5F2EC] dark:bg-[#151A22] text-xs space-y-1.5 relative overflow-hidden"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-[#1D2433] dark:text-[#F0F4F8]">
                      #{idx + 1} {req.id}
                    </span>
                    <span
                      className={
                        req.severity === 'CRITICAL'
                          ? 'badge-critical'
                          : req.severity === 'SERIOUS'
                          ? 'badge-serious'
                          : 'badge-minor'
                      }
                    >
                      {req.severity}
                    </span>
                  </div>

                  <p className="font-medium text-[#1D2433] dark:text-[#F0F4F8] text-[11px]">
                    {req.description}
                  </p>

                  <div className="text-[11px] text-[#667085] dark:text-[#9BA3AF] flex items-center justify-between pt-1">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-[#0E6B66]" />
                      {req.incidentLocationId}
                    </span>
                    <span className="font-mono">Req: {req.requiredFacility}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* COLUMN 2: Available Ambulances */}
        <div className="municipal-card p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-[#DDD8CE] dark:border-[#323C4D] pb-2">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#0E6B66]" />
              <h2 className="font-serif font-bold text-sm text-[#1D2433] dark:text-[#F0F4F8]">
                2. Available Fleet
              </h2>
            </div>
            <span className="text-[11px] font-mono text-[#667085] dark:text-[#9BA3AF]">
              {availableAmbulances.length} of {ambulances.length} ready
            </span>
          </div>

          <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
            {availableAmbulances.length === 0 ? (
              <div className="py-8 text-center text-xs text-[#C62828] dark:text-[#F87171] font-medium">
                No units available. All fleet units are deployed or unavailable.
              </div>
            ) : (
              availableAmbulances.map((amb) => (
                <div
                  key={amb.id}
                  className="p-3 rounded border border-[#C8E6C9] dark:border-[#1E462E] bg-[#EDF7EE] dark:bg-[#152E20] text-xs space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Truck className="w-4 h-4 text-[#2F7D4F] dark:text-[#4ADE80]" />
                      <span className="font-mono font-bold text-[#1D2433] dark:text-[#F0F4F8]">
                        {amb.id}
                      </span>
                    </div>
                    <span className="text-[10px] font-semibold text-[#2F7D4F] dark:text-[#4ADE80]">
                      READY
                    </span>
                  </div>

                  <div className="text-[11px] text-[#1D2433] dark:text-[#F0F4F8]">
                    Configured location node (not GPS): <strong>{amb.currentLocationId}</strong>
                  </div>

                  <div className="text-[10px] text-[#667085] dark:text-[#9BA3AF] flex items-center justify-between">
                    <span>Hospital: {amb.assignedHospitalId || 'Not assigned'}</span>
                    <span>{amb.totalTripsCompleted} trips completed</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* COLUMN 3: Active Trips */}
        <div className="municipal-card p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-[#DDD8CE] dark:border-[#323C4D] pb-2">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#0E6B66]" />
              <h2 className="font-serif font-bold text-sm text-[#1D2433] dark:text-[#F0F4F8]">
                3. Active Missions
              </h2>
            </div>
            <span className="text-[11px] font-mono text-[#667085] dark:text-[#9BA3AF]">
              {activeTrips.length} en-route
            </span>
          </div>

          <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
            {activeTrips.length === 0 ? (
              <div className="py-8 text-center text-xs text-[#667085] dark:text-[#9BA3AF]">
                No active missions underway.
              </div>
            ) : (
              activeTrips.map((trip) => (
                <div
                  key={trip.id}
                  onClick={() => setSelectedTripId(trip.id)}
                  className={`p-3 rounded border text-xs space-y-2 cursor-pointer transition-colors ${
                    latestTrip?.id === trip.id
                      ? 'border-[#0E6B66] bg-[#E6F3F2] dark:bg-[#16363B]'
                      : 'border-[#DDD8CE] dark:border-[#323C4D] bg-[#F5F2EC] dark:bg-[#151A22]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-[#1D2433] dark:text-[#F0F4F8]">
                      {trip.id}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                        trip.blocked
                          ? 'bg-[#FDEDEC] text-[#C62828] border border-[#F5C6CB]'
                          : 'bg-[#EDF7EE] text-[#2F7D4F] border border-[#C8E6C9]'
                      }`}
                    >
                      {trip.blocked ? 'ROUTE BLOCKED' : trip.status}
                    </span>
                  </div>

                  <div className="text-[11px] space-y-1">
                    <div>Unit: <strong>{trip.ambulanceId}</strong> &bull; Incident: <strong>{trip.incidentLocationId}</strong></div>
                    <div>Hospital: <strong>{hospitals.find((hospital) => hospital.id === trip.hospitalId)?.name ?? trip.hospitalId}</strong> &bull; ETA: <strong>{formatMinutes(trip.totalMinutes)}</strong></div>
                  </div>

                  <div className="pt-2 border-t border-[#DDD8CE] dark:border-[#323C4D] flex items-center justify-between">
                    <span className="text-[10px] text-[#667085] dark:text-[#9BA3AF]">Click to see audit</span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCompleteMission(trip.id);
                      }}
                      className="px-2 py-1 rounded bg-[#0E6B66] hover:bg-[#0B5450] text-white text-[10px] font-semibold flex items-center gap-1"
                    >
                      <Check className="w-3 h-3" />
                      <span>Complete Mission</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      {/* CASE STUDY REQUIREMENT: TRANSPARENT REASONING PANEL */}
      {latestTrip && (
        <div className="municipal-card p-5 space-y-3 bg-[#FFFFFF] dark:bg-[#1E2530] border-t-2 border-t-[#0E6B66]">
          <div className="flex items-center justify-between pb-2 border-b border-[#DDD8CE] dark:border-[#323C4D]">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-[#0E6B66]" />
              <div>
                <h3 className="font-serif font-bold text-sm text-[#1D2433] dark:text-[#F0F4F8]">
                  Automated Dispatch Reasoning Audit &mdash; {latestTrip.id}
                </h3>
                <span className="text-[11px] text-[#667085] dark:text-[#9BA3AF]">
                  Shortest configured road-weight route and hospital capability selection. Estimates are not live GPS or traffic measurements.
                </span>
              </div>
            </div>

            <div className="text-right">
              <span className="text-xs font-mono font-bold text-[#0E6B66] dark:text-[#1DB8AF]">
                Status: {latestTrip.status} &bull; Total estimated travel time: {formatMinutes(latestTrip.totalMinutes)}
              </span>
            </div>
          </div>

          {/* Route Segments Diagram */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs p-3 rounded bg-[#F5F2EC] dark:bg-[#151A22] border border-[#DDD8CE] dark:border-[#323C4D]">
            <div>
              <span className="text-[11px] font-bold text-[#667085] dark:text-[#9BA3AF] block uppercase">
                Leg 1: Ambulance to Incident Scene ({formatMinutes(latestTrip.timeToIncidentMinutes)})
              </span>
              <span className="mt-1 block text-[11px] text-[#667085]">Selected unit: {selectedAmbulance?.registrationNumber ?? latestTrip.ambulanceId}</span>
              <div className="font-mono text-xs font-semibold text-[#1D2433] dark:text-[#F0F4F8] mt-1">
                {latestTrip.pathToIncident.join(' \u2192 ')}
              </div>
            </div>

            <div>
              <span className="text-[11px] font-bold text-[#667085] dark:text-[#9BA3AF] block uppercase">
                Leg 2: Incident to Hospital ({formatMinutes(latestTrip.timeToHospitalMinutes)})
              </span>
              <span className="mt-1 block text-[11px] text-[#667085]">Selected hospital: {selectedHospital?.name ?? latestTrip.hospitalId}</span>
              <div className="font-mono text-xs font-semibold text-[#1D2433] dark:text-[#F0F4F8] mt-1">
                {latestTrip.pathToHospital.join(' \u2192 ')}
              </div>
            </div>
          </div>

          {/* Reasoning Log Console */}
          <div>
            <span className="text-[11px] font-bold text-[#667085] dark:text-[#9BA3AF] block mb-1">
              Dijkstra Candidate Evaluation Trace (Logged by Core DispatchService):
            </span>
            <pre className="p-3 rounded bg-[#1D2433] text-[#F0F4F8] text-[11px] font-mono leading-relaxed overflow-x-auto whitespace-pre-wrap max-h-56">
              {latestTrip.reasoning || 'Reasoning trace recorded.'}
            </pre>
          </div>
        </div>
      )}

    </div>
  );
};

export default DispatchCenterPage;
