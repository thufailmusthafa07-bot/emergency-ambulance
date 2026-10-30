import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { 
  AlertTriangle, 
  Truck, 
  Building2, 
  Clock, 
  MapPin, 
  ArrowRight,
  ShieldAlert,
  Radio,
  CheckCircle2,
  Navigation
} from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const { stats, emergencies, ambulances, hospitals, trips, dispatchNext } = useApp();
  const navigate = useNavigate();
  const [dispatchError, setDispatchError] = React.useState<string | null>(null);
  const [isDispatching, setIsDispatching] = React.useState(false);
  const safeEmergencies = Array.isArray(emergencies) ? emergencies : [];
  const safeAmbulances = Array.isArray(ambulances) ? ambulances : [];
  const safeHospitals = Array.isArray(hospitals) ? hospitals : [];
  const safeTrips = Array.isArray(trips) ? trips : [];

  const handleQuickDispatch = async () => {
    setDispatchError(null);
    setIsDispatching(true);
    try {
      const trip = await dispatchNext();
      navigate('/dispatch');
    } catch (err: any) {
      setDispatchError(err.message || 'Failed to dispatch');
    } finally {
      setIsDispatching(false);
    }
  };

  const pendingList = safeEmergencies
    .filter((e) => e.status === 'PENDING')
    .slice(0, 5);

  return (
    <div className="space-y-6">
      
      {/* Operations Desk Briefing Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#DDD8CE] dark:border-[#323C4D] pb-4">
        <div>
          <h1 className="text-2xl font-serif font-bold text-[#1D2433] dark:text-[#F0F4F8]">
            Operations Desk Summary
          </h1>
          <p className="text-xs text-[#667085] dark:text-[#9BA3AF] mt-0.5">
            PostgreSQL-backed dispatch queues, fleet records, hospital capacity, and configured road-network estimates.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleQuickDispatch}
            disabled={isDispatching || (stats?.pendingTotal === 0)}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded bg-[#0E6B66] hover:bg-[#0B5450] text-white disabled:opacity-50 transition-colors shadow-sm"
          >
            <Radio className="w-3.5 h-3.5" />
            <span>{isDispatching ? 'Dispatching...' : 'Dispatch Next Incident'}</span>
          </button>
        </div>
      </div>

      {dispatchError && (
        <div className="p-3 rounded bg-[#FDEDEC] dark:bg-[#381A1C] border border-[#F5C6CB] dark:border-[#5C2629] text-xs text-[#C62828] dark:text-[#F87171] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{dispatchError}</span>
          </div>
          <button onClick={() => setDispatchError(null)} className="text-xs font-bold underline ml-2">Dismiss</button>
        </div>
      )}

      {/* KPI Stat Cards Grid (6px radius, calm municipal cards) */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5">
        
        {/* Pending Requests */}
        <div className="municipal-card p-4 bg-white/90 border-[#d8e4ec] shadow-[0_12px_28px_rgba(32,54,74,0.08)] dark:bg-[#0f1725] dark:border-[#2c3d52] dark:shadow-[0_12px_28px_rgba(2,6,23,0.38)]">
          <div className="flex items-center justify-between text-xs text-[#42586f] dark:text-[#bfd0df] font-medium">
            <span>Pending Incidents</span>
            <AlertTriangle className="w-4 h-4 text-[#f7b267]" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-serif font-bold text-[#172b40] dark:text-[#f8fbff]">
              {stats ? stats.pendingTotal : '—'}
            </span>
            <span className="text-[11px] text-[#5d7185] dark:text-[#c9d7e4]">queued</span>
          </div>
          <div className="mt-2 text-[11px] flex items-center gap-1.5">
            <span className="text-[#ff8a8a] font-bold">{stats?.pendingCritical ?? '—'} Critical</span>
            <span className="text-[#8a9aac] dark:text-[#dfe7f0]">&bull;</span>
            <span className="text-[#f7b267]">{stats?.pendingSerious ?? '—'} Serious</span>
          </div>
        </div>

        {/* Available Ambulances */}
        <div className="municipal-card p-4 bg-white/90 border-[#d8e4ec] shadow-[0_12px_28px_rgba(32,54,74,0.08)] dark:bg-[#0f1725] dark:border-[#2c3d52] dark:shadow-[0_12px_28px_rgba(2,6,23,0.38)]">
          <div className="flex items-center justify-between text-xs text-[#42586f] dark:text-[#bfd0df] font-medium">
            <span>Ambulance Fleet</span>
            <Truck className="w-4 h-4 text-[#67e8f9]" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-serif font-bold text-[#172b40] dark:text-[#f8fbff]">
              {stats ? `${stats.availableAmbulances}/${stats.totalAmbulances}` : '—'}
            </span>
            <span className="text-[11px] text-[#8ae6b6] font-semibold">available</span>
          </div>
          <p className="mt-2 text-[11px] text-[#5d7185] dark:text-[#c9d7e4]">
            {stats ? `${stats.totalAmbulances - stats.availableAmbulances} unavailable` : 'Awaiting backend data'}
          </p>
        </div>

        {/* Available Hospital Beds */}
        <div className="municipal-card p-4 bg-white/90 border-[#d8e4ec] shadow-[0_12px_28px_rgba(32,54,74,0.08)] dark:bg-[#0f1725] dark:border-[#2c3d52] dark:shadow-[0_12px_28px_rgba(2,6,23,0.38)]">
          <div className="flex items-center justify-between text-xs text-[#42586f] dark:text-[#bfd0df] font-medium">
            <span>Hospital Beds</span>
            <Building2 className="w-4 h-4 text-[#67e8f9]" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-serif font-bold text-[#172b40] dark:text-[#f8fbff]">
              {stats ? stats.availableBeds : '—'}
            </span>
            <span className="text-[11px] text-[#5d7185] dark:text-[#c9d7e4]">free of {stats?.totalBeds ?? '—'}</span>
          </div>
          <p className="mt-2 text-[11px] text-[#5d7185] dark:text-[#c9d7e4]">
            {stats ? `Across ${safeHospitals.length} hospitals` : 'Awaiting backend data'}
          </p>
        </div>

        {/* Active Emergency Trips */}
        <div className="municipal-card p-4 bg-white/90 border-[#d8e4ec] shadow-[0_12px_28px_rgba(32,54,74,0.08)] dark:bg-[#0f1725] dark:border-[#2c3d52] dark:shadow-[0_12px_28px_rgba(2,6,23,0.38)]">
          <div className="flex items-center justify-between text-xs text-[#42586f] dark:text-[#bfd0df] font-medium">
            <span>Active Missions</span>
            <Clock className="w-4 h-4 text-[#67e8f9]" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-serif font-bold text-[#172b40] dark:text-[#f8fbff]">
              {stats ? stats.activeTrips : '—'}
            </span>
            <span className="text-[11px] text-[#5d7185] dark:text-[#c9d7e4]">trips</span>
          </div>
          <p className="mt-2 text-[11px] text-[#5d7185] dark:text-[#c9d7e4]">
            Dynamic Dijkstra routing
          </p>
        </div>

        {/* Road Closures */}
        <div className="municipal-card p-4 bg-white/90 border-[#d8e4ec] shadow-[0_12px_28px_rgba(32,54,74,0.08)] dark:bg-[#0f1725] dark:border-[#2c3d52] dark:shadow-[0_12px_28px_rgba(2,6,23,0.38)]">
          <div className="flex items-center justify-between text-xs text-[#42586f] dark:text-[#bfd0df] font-medium">
            <span>Road Closures</span>
            <ShieldAlert className="w-4 h-4 text-[#ff8a8a]" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-serif font-bold text-[#172b40] dark:text-[#f8fbff]">
              {stats ? stats.closedRoads : '—'}
            </span>
            <span className="text-[11px] text-[#5d7185] dark:text-[#c9d7e4]">segments</span>
          </div>
          <p className="mt-2 text-[11px] text-[#5d7185] dark:text-[#c9d7e4]">
            Excluded from shortest paths
          </p>
        </div>

      </div>

      {/* Main Split Grid: High Priority Queue & Fleet Locations */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left 7 Cols: Triage Priority Incident Queue */}
        <div className="lg:col-span-7 municipal-card p-5">
          <div className="flex items-center justify-between pb-3 border-b border-[#DDD8CE] dark:border-[#323C4D]">
            <div>
              <h2 className="font-serif font-bold text-base text-[#1D2433] dark:text-[#F0F4F8]">
                Priority Queue (Triage Hierarchy)
              </h2>
              <p className="text-xs text-[#667085] dark:text-[#9BA3AF]">
                Ordered by Severity (Critical &gt; Serious &gt; Minor), then FIFO arrival time.
              </p>
            </div>
            <button
              onClick={() => navigate('/emergency-requests')}
              className="text-xs font-semibold text-[#0E6B66] dark:text-[#1DB8AF] hover:underline flex items-center gap-1"
            >
              <span>View all ({safeEmergencies.length})</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="divide-y divide-[#DDD8CE] dark:divide-[#323C4D] mt-3">
            {pendingList.length === 0 ? (
              <div className="py-8 text-center text-xs text-[#667085] dark:text-[#9BA3AF]">
                No pending calls. Operations queue is clear.
              </div>
            ) : (
              pendingList.map((item) => (
                <div key={item.id} className="py-3 flex items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="id-pill text-xs font-semibold text-[#1D2433] dark:text-[#F0F4F8]">
                        {item.id}
                      </span>
                      <span
                        className={
                          item.severity === 'CRITICAL'
                            ? 'badge-critical'
                            : item.severity === 'SERIOUS'
                            ? 'badge-serious'
                            : 'badge-minor'
                        }
                      >
                        {item.severity}
                      </span>
                      <span className="text-[11px] text-[#667085] dark:text-[#9BA3AF] font-mono">
                        Requires: {item.requiredFacility}
                      </span>
                    </div>
                    <p className="text-xs font-medium text-[#1D2433] dark:text-[#F0F4F8]">
                      {item.description || 'Emergency medical call'}
                    </p>
                    <div className="text-[11px] text-[#667085] dark:text-[#9BA3AF] flex items-center gap-2">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        <span>{item.incidentLocationId}</span>
                      </span>
                      <span>&bull;</span>
                      <span>Caller: {item.callerName}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => navigate('/dispatch')}
                    className="px-2.5 py-1 text-xs font-semibold rounded border border-[#DDD8CE] dark:border-[#323C4D] text-[#1D2433] dark:text-[#F0F4F8] hover:bg-[#EFECE6] dark:hover:bg-[#252D3A] transition-colors"
                  >
                    Triage Dispatch
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right 5 Cols: Strategic Ambulance Fleet Roster */}
        <div className="lg:col-span-5 municipal-card p-5">
          <div className="flex items-center justify-between pb-3 border-b border-[#DDD8CE] dark:border-[#323C4D]">
            <div>
              <h2 className="font-serif font-bold text-base text-[#1D2433] dark:text-[#F0F4F8]">
                Ambulance Fleet Status
              </h2>
              <p className="text-xs text-[#667085] dark:text-[#9BA3AF]">
                Assigned based on shortest travel time (minutes).
              </p>
            </div>
            <button
              onClick={() => navigate('/ambulances')}
              className="text-xs font-semibold text-[#0E6B66] dark:text-[#1DB8AF] hover:underline flex items-center gap-1"
            >
              <span>Fleet details</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3 mt-3">
            {ambulances.map((amb) => (
              <div
                key={amb.id}
                className="p-3 rounded border border-[#DDD8CE] dark:border-[#323C4D] bg-[#F5F2EC] dark:bg-[#151A22] flex items-center justify-between text-xs"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-[#1D2433] dark:text-[#F0F4F8]">
                      {amb.id}
                    </span>
                    <span className="text-[11px] text-[#667085] dark:text-[#9BA3AF]">
                      {amb.registrationNumber}
                    </span>
                  </div>
                  <div className="text-[11px] text-[#667085] dark:text-[#9BA3AF] mt-1 flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-[#0E6B66]" />
                    <span>Stationed at: <strong className="text-[#1D2433] dark:text-[#F0F4F8]">{amb.currentLocationId}</strong></span>
                  </div>
                </div>

                <div className="text-right">
                  <span
                    className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold ${
                      amb.status === 'AVAILABLE'
                        ? 'bg-[#EDF7EE] text-[#2F7D4F] border border-[#C8E6C9]'
                        : 'bg-[#FEF6EC] text-[#D9822B] border border-[#FCE2C4]'
                    }`}
                  >
                    {amb.status}
                  </span>
                  <div className="text-[10px] text-[#667085] dark:text-[#9BA3AF] mt-1 font-mono">
                    {amb.totalTripsCompleted} trips done
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Core Case Study Principle Banner */}
          <div className="mt-4 p-3 rounded bg-[#E6F3F2] dark:bg-[#16363B] border border-[#0E6B66]/30 text-xs text-[#0E6B66] dark:text-[#1DB8AF]">
            <span className="font-bold">Core Optimization Rule:</span> Ambulances are matched by configured <strong>road travel-time estimates</strong> using Dijkstra&apos;s algorithm and operator-reported road conditions. No live traffic feed or GPS data is used.
          </div>
        </div>

      </div>

    </div>
  );
};

export default DashboardPage;
