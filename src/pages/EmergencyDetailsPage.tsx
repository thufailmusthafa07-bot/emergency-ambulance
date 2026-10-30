import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { 
  ArrowLeft, 
  MapPin, 
  Clock, 
  Building2, 
  Truck, 
  Radio, 
  CheckCircle2, 
  AlertTriangle 
} from 'lucide-react';

export const EmergencyDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { emergencies, ambulances, hospitals, trips, dispatchSpecific } = useApp();

  const safeEmergencies = Array.isArray(emergencies) ? emergencies : [];
  const safeTrips = Array.isArray(trips) ? trips : [];

  const emergency = safeEmergencies.find((e) => e.id === id);
  const activeTrip = safeTrips.find((t) => t.requestId === id);
  const assignedAmb = Array.isArray(ambulances) ? ambulances.find((a) => a.id === emergency?.assignedAmbulanceId) : undefined;
  const assignedHosp = Array.isArray(hospitals) ? hospitals.find((h) => h.id === emergency?.assignedHospitalId) : undefined;

  if (!emergency) {
    return (
      <div className="municipal-card p-8 text-center space-y-3">
        <AlertTriangle className="w-8 h-8 text-[#D9822B] mx-auto" />
        <h2 className="text-base font-serif font-bold text-[#1D2433] dark:text-[#F0F4F8]">
          Incident Call Not Found
        </h2>
        <p className="text-xs text-[#667085] dark:text-[#9BA3AF]">
          No emergency call with ID &quot;{id}&quot; exists in the active registry.
        </p>
        <button
          onClick={() => navigate('/emergency-requests')}
          className="px-3.5 py-1.5 rounded bg-[#0E6B66] text-white text-xs font-semibold"
        >
          Return to Call Registry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Back button and title */}
      <div className="flex items-center gap-3 border-b border-[#DDD8CE] dark:border-[#323C4D] pb-4">
        <button
          onClick={() => navigate('/emergency-requests')}
          className="p-1.5 rounded border border-[#DDD8CE] dark:border-[#323C4D] text-[#667085] hover:text-[#1D2433]"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <span className="text-[11px] font-mono text-[#667085] dark:text-[#9BA3AF]">
            Incident Call Dossier
          </span>
          <h1 className="text-xl font-serif font-bold text-[#1D2433] dark:text-[#F0F4F8]">
            {emergency.id} &bull; {emergency.callerName}
          </h1>
        </div>
        <span
          className={`ml-auto ${
            emergency.severity === 'CRITICAL'
              ? 'badge-critical'
              : emergency.severity === 'SERIOUS'
              ? 'badge-serious'
              : 'badge-minor'
          }`}
        >
          {emergency.severity}
        </span>
      </div>

      {/* Main Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
        <div className="municipal-card p-5 space-y-3">
          <h3 className="font-serif font-bold text-sm text-[#1D2433] dark:text-[#F0F4F8] border-b border-[#DDD8CE] dark:border-[#323C4D] pb-2">
            Citizen & Triage Report
          </h3>
          <div className="space-y-2">
            <div>
              <span className="text-[#667085] dark:text-[#9BA3AF] block">Incident Description</span>
              <p className="font-semibold text-[#1D2433] dark:text-[#F0F4F8] mt-0.5">
                {emergency.description || 'Emergency medical call'}
              </p>
            </div>
            <div>
              <span className="text-[#667085] dark:text-[#9BA3AF] block">Incident Location Node</span>
              <span className="font-semibold text-[#1D2433] dark:text-[#F0F4F8] flex items-center gap-1 mt-0.5">
                <MapPin className="w-3.5 h-3.5 text-[#0E6B66]" />
                {emergency.incidentLocationId}
              </span>
            </div>
            <div>
              <span className="text-[#667085] dark:text-[#9BA3AF] block">Required Medical Facility</span>
              <span className="font-mono font-semibold text-[#1D2433] dark:text-[#F0F4F8] mt-0.5 block">
                {emergency.requiredFacility}
              </span>
            </div>
            <div>
              <span className="text-[#667085] dark:text-[#9BA3AF] block">Contact Number</span>
              <span className="font-mono text-[#1D2433] dark:text-[#F0F4F8] mt-0.5 block">
                {emergency.contactNumber}
              </span>
            </div>
          </div>
        </div>

        <div className="municipal-card p-5 space-y-3">
          <h3 className="font-serif font-bold text-sm text-[#1D2433] dark:text-[#F0F4F8] border-b border-[#DDD8CE] dark:border-[#323C4D] pb-2">
            Dispatch Mission Allocation
          </h3>
          <div className="space-y-2">
            <div>
              <span className="text-[#667085] dark:text-[#9BA3AF] block">Status</span>
              <span className="font-semibold mt-0.5 block">{emergency.status}</span>
            </div>
            {emergency.assignedAmbulanceId && (
              <div>
                <span className="text-[#667085] dark:text-[#9BA3AF] block">Assigned Fleet Unit</span>
                <span className="font-mono font-semibold text-[#0E6B66] dark:text-[#1DB8AF] flex items-center gap-1 mt-0.5">
                  <Truck className="w-3.5 h-3.5" />
                  {emergency.assignedAmbulanceId} ({assignedAmb?.registrationNumber})
                </span>
              </div>
            )}
            {emergency.assignedHospitalId && (
              <div>
                <span className="text-[#667085] dark:text-[#9BA3AF] block">Admitting Hospital</span>
                <span className="font-semibold text-[#1D2433] dark:text-[#F0F4F8] flex items-center gap-1 mt-0.5">
                  <Building2 className="w-3.5 h-3.5 text-[#0E6B66]" />
                  {assignedHosp?.name} ({emergency.assignedHospitalId})
                </span>
              </div>
            )}
            {activeTrip && (
              <div className="p-2.5 rounded bg-[#F5F2EC] dark:bg-[#151A22] border border-[#DDD8CE] dark:border-[#323C4D] space-y-1">
                <div>Trip ID: <strong>{activeTrip.id}</strong></div>
                <div>Total ETA: <strong>{typeof activeTrip.totalMinutes === 'number' && Number.isFinite(activeTrip.totalMinutes) ? `${activeTrip.totalMinutes.toFixed(1)} mins` : 'N/A'}</strong></div>
                <div className="font-mono text-[10px]">
                  Path: {(Array.isArray(activeTrip.pathToIncident) ? activeTrip.pathToIncident : []).join(' \u2192 ')} &rarr; {(Array.isArray(activeTrip.pathToHospital) ? activeTrip.pathToHospital : []).join(' \u2192 ')}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmergencyDetailsPage;
