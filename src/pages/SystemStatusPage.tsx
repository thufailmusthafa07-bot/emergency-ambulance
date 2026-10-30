import React from 'react';
import { useApp } from '../context/AppContext';

export const SystemStatusPage: React.FC = () => {
  const { stats, locations, roads, ambulances, hospitals, trips } = useApp();
  const safeLocations = Array.isArray(locations) ? locations : [];
  const safeRoads = Array.isArray(roads) ? roads : [];
  const safeAmbulances = Array.isArray(ambulances) ? ambulances : [];
  const safeHospitals = Array.isArray(hospitals) ? hospitals : [];
  const safeTrips = Array.isArray(trips) ? trips : [];

  return (
    <div className="space-y-6">
      <div className="border-b border-[#DDD8CE] dark:border-[#323C4D] pb-4">
        <h1 className="text-2xl font-serif font-bold text-[#1D2433] dark:text-[#F0F4F8]">
          Persisted System Status
        </h1>
        <p className="text-xs text-[#667085] dark:text-[#9BA3AF] mt-0.5">
          Database-backed record counts and configured road-network data. Traffic conditions are operator-reported, not live feed measurements.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="municipal-card p-4">
          <div className="text-xs text-[#667085] dark:text-[#9BA3AF] font-medium">Core Architecture</div>
          <div className="text-base font-serif font-bold text-[#1D2433] dark:text-[#F0F4F8] mt-1">
            Node.js + TypeScript
          </div>
          <span className="text-[11px] text-[#2F7D4F] font-semibold mt-1 block">Express · Prisma · PostgreSQL</span>
        </div>

        <div className="municipal-card p-4">
          <div className="text-xs text-[#667085] dark:text-[#9BA3AF] font-medium">Graph Network Size</div>
          <div className="text-base font-serif font-bold text-[#1D2433] dark:text-[#F0F4F8] mt-1 font-mono">
            {safeLocations.length} Nodes &bull; {safeRoads.length} Roads
          </div>
          <span className="text-[11px] text-[#667085] dark:text-[#9BA3AF] mt-1 block">Loaded from persisted network records</span>
        </div>

        <div className="municipal-card p-4">
          <div className="text-xs text-[#667085] dark:text-[#9BA3AF] font-medium">Pending Emergency Requests</div>
          <div className="text-base font-serif font-bold text-[#1D2433] dark:text-[#F0F4F8] mt-1 font-mono">
            {stats?.pendingTotal ?? '—'}
          </div>
          <span className="text-[11px] text-[#667085] dark:text-[#9BA3AF] mt-1 block">Severity and FIFO dispatch order</span>
        </div>

        <div className="municipal-card p-4">
          <div className="text-xs text-[#667085] dark:text-[#9BA3AF] font-medium">Operations Data Snapshot</div>
          <div className="text-base font-serif font-bold text-[#1D2433] dark:text-[#F0F4F8] mt-1 font-mono">
            {stats?.lastRecalculationEpoch ? new Date(stats.lastRecalculationEpoch).toLocaleTimeString() : 'N/A'}
          </div>
          <span className="text-[11px] text-[#0E6B66] dark:text-[#1DB8AF] mt-1 block">Timestamp returned with database summary</span>
        </div>
      </div>

      {/*       Persisted Record Counts */}
      <div className="municipal-card p-5 space-y-3">
        <h3 className="font-serif font-bold text-sm text-[#1D2433] dark:text-[#F0F4F8] border-b border-[#DDD8CE] dark:border-[#323C4D] pb-2">
          Runtime Verification & Object Counts
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 text-xs">
          <div className="p-3 rounded bg-[#F5F2EC] dark:bg-[#151A22] border border-[#DDD8CE] dark:border-[#323C4D] text-center">
            <span className="text-[11px] text-[#667085] dark:text-[#9BA3AF] block">Locations</span>
            <span className="text-xl font-bold font-mono text-[#1D2433] dark:text-[#F0F4F8]">{safeLocations.length}</span>
          </div>
          <div className="p-3 rounded bg-[#F5F2EC] dark:bg-[#151A22] border border-[#DDD8CE] dark:border-[#323C4D] text-center">
            <span className="text-[11px] text-[#667085] dark:text-[#9BA3AF] block">Road Edges</span>
            <span className="text-xl font-bold font-mono text-[#1D2433] dark:text-[#F0F4F8]">{safeRoads.length}</span>
          </div>
          <div className="p-3 rounded bg-[#F5F2EC] dark:bg-[#151A22] border border-[#DDD8CE] dark:border-[#323C4D] text-center">
            <span className="text-[11px] text-[#667085] dark:text-[#9BA3AF] block">Ambulances</span>
            <span className="text-xl font-bold font-mono text-[#1D2433] dark:text-[#F0F4F8]">{safeAmbulances.length}</span>
          </div>
          <div className="p-3 rounded bg-[#F5F2EC] dark:bg-[#151A22] border border-[#DDD8CE] dark:border-[#323C4D] text-center">
            <span className="text-[11px] text-[#667085] dark:text-[#9BA3AF] block">Hospitals</span>
            <span className="text-xl font-bold font-mono text-[#1D2433] dark:text-[#F0F4F8]">{safeHospitals.length}</span>
          </div>
          <div className="p-3 rounded bg-[#F5F2EC] dark:bg-[#151A22] border border-[#DDD8CE] dark:border-[#323C4D] text-center">
            <span className="text-[11px] text-[#667085] dark:text-[#9BA3AF] block">Active Trips</span>
            <span className="text-xl font-bold font-mono text-[#1D2433] dark:text-[#F0F4F8]">{safeTrips.filter(t => !t.completed).length}</span>
          </div>
          <div className="p-3 rounded bg-[#F5F2EC] dark:bg-[#151A22] border border-[#DDD8CE] dark:border-[#323C4D] text-center">
            <span className="text-[11px] text-[#667085] dark:text-[#9BA3AF] block">Total Trips</span>
            <span className="text-xl font-bold font-mono text-[#1D2433] dark:text-[#F0F4F8]">{safeTrips.length}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SystemStatusPage;
