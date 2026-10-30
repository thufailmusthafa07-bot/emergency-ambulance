import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import type { EmergencyCall } from '../context/AppContext';
import { 
  PhoneCall, 
  MapPin, 
  AlertTriangle, 
  Filter, 
  Plus, 
  Clock, 
  Building2, 
  CheckCircle2, 
  X, 
  ArrowRight
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const EmergencyRequestsPage: React.FC = () => {
  const { emergencies, locations, createEmergency, dispatchSpecific } = useApp();
  const navigate = useNavigate();
  const safeEmergencies = Array.isArray(emergencies) ? emergencies : [];
  const safeLocations = Array.isArray(locations) ? locations : [];

  // Split View state
  const [selectedRequest, setSelectedRequest] = useState<EmergencyCall | null>(() => {
    return safeEmergencies.length > 0 ? safeEmergencies[0] : null;
  });

  // Filter state
  const [severityFilter, setSeverityFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [facilityFilter, setFacilityFilter] = useState<string>('ALL');

  // Modal / Form state for "Log Emergency Call"
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [callerName, setCallerName] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [incidentLocationId, setIncidentLocationId] = useState('');
  const [severity, setSeverity] = useState('CRITICAL');
  const [requiredFacility, setRequiredFacility] = useState('TRAUMA');
  const [description, setDescription] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  // Filter emergencies
  const filteredEmergencies = safeEmergencies.filter((req) => {
    if (severityFilter !== 'ALL' && req.severity !== severityFilter) return false;
    if (statusFilter !== 'ALL' && req.status !== statusFilter) return false;
    if (facilityFilter !== 'ALL' && req.requiredFacility !== facilityFilter) return false;
    return true;
  });

  const effectiveLocationId = incidentLocationId || (safeLocations.length > 0 ? safeLocations[0].id : '');

  const handleLogCall = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setFormError(null);

    const locationIdToSubmit = effectiveLocationId;
    if (!locationIdToSubmit) {
      setFormError('Please select a valid incident location node in Nalam Nagar.');
      return;
    }
    if (callerName.trim().length < 2 || callerName.trim().length > 100) {
      setFormError('Caller name must be between 2 and 100 characters.');
      return;
    }
    if (contactNumber.trim().length < 5 || contactNumber.trim().length > 40) {
      setFormError('Caller phone must be between 5 and 40 characters.');
      return;
    }

    setIsSubmitting(true);
    try {
      const created = await createEmergency({
        callerName: callerName.trim(),
        contactNumber: contactNumber.trim(),
        incidentLocationId: locationIdToSubmit,
        severity,
        requiredFacility,
        description: description.trim() || 'Emergency assistance requested',
      });
      setIsModalOpen(false);
      setSelectedRequest(created);
      setActionMessage(`Emergency Call ${created.id} logged and prioritized into the queue.`);
      setTimeout(() => setActionMessage(null), 4000);

      // Reset form
      setCallerName('');
      setContactNumber('');
      setDescription('');
    } catch (err: any) {
      setFormError(err.message || 'Failed to submit emergency request');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDispatch = async (reqId: string) => {
    try {
      await dispatchSpecific(reqId);
      navigate('/dispatch');
    } catch (err: any) {
      setActionMessage(`Dispatch Failed: ${err.message}`);
      setTimeout(() => setActionMessage(null), 5000);
    }
  };

  return (
    <div className="space-y-5">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#DDD8CE] dark:border-[#323C4D] pb-4">
        <div>
          <h1 className="text-2xl font-serif font-bold text-[#1D2433] dark:text-[#F0F4F8]">
            Emergency Call Registry
          </h1>
          <p className="text-xs text-[#667085] dark:text-[#9BA3AF] mt-0.5">
            Log incoming citizen emergency reports, triage severity levels, and manage prioritized response tickets.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            if (safeLocations.length > 0 && !incidentLocationId) {
              setIncidentLocationId(safeLocations[0].id);
            }
            setIsModalOpen(true);
          }}
          className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded bg-[#0E6B66] hover:bg-[#0B5450] text-white transition-colors shadow-sm self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Log Emergency Call</span>
        </button>
      </div>

      {actionMessage && (
        <div className="p-3 rounded bg-[#E6F3F2] dark:bg-[#16363B] border border-[#0E6B66]/30 text-xs text-[#0E6B66] dark:text-[#1DB8AF] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{actionMessage}</span>
          </div>
          <button onClick={() => setActionMessage(null)} className="font-bold underline text-xs">Dismiss</button>
        </div>
      )}

      {/* Filter Toolbar */}
      <div className="municipal-card p-3 flex flex-wrap items-center gap-3 text-xs">
        <div className="flex items-center gap-1.5 text-[#667085] dark:text-[#9BA3AF] font-medium">
          <Filter className="w-3.5 h-3.5" />
          <span>Filter:</span>
        </div>

        {/* Severity Filter */}
        <select
          value={severityFilter}
          onChange={(e) => setSeverityFilter(e.target.value)}
          className="municipal-input py-1 px-2 text-xs"
        >
          <option value="ALL">All Severities</option>
          <option value="CRITICAL">Critical (Immediate Life Threat)</option>
          <option value="SERIOUS">Serious (Urgent Care)</option>
          <option value="MINOR">Minor (Non-Life Threatening)</option>
        </select>

        {/* Status Filter */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="municipal-input py-1 px-2 text-xs"
        >
          <option value="ALL">All Statuses</option>
          <option value="PENDING">Pending (Queued)</option>
          <option value="DISPATCHED">Dispatched</option>
          <option value="COMPLETED">Completed</option>
        </select>

        {/* Facility Filter */}
        <select
          value={facilityFilter}
          onChange={(e) => setFacilityFilter(e.target.value)}
          className="municipal-input py-1 px-2 text-xs"
        >
          <option value="ALL">All Medical Facilities</option>
          <option value="TRAUMA">Trauma Center</option>
          <option value="CARDIAC">Cardiac Unit</option>
          <option value="NEURO">Neuro ICU</option>
          <option value="PEDIATRICS">Pediatric Ward</option>
          <option value="GENERAL">General Care</option>
        </select>

        <span className="ml-auto text-[11px] text-[#667085] dark:text-[#9BA3AF] font-mono">
          Showing {filteredEmergencies.length} of {safeEmergencies.length} calls
        </span>
      </div>

      {/* Case Study Requirement: SPLIT VIEW (Table on Left + Incident Details on Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        
        {/* Left Column (7 cols): Emergency Incidents List Table */}
        <div className="lg:col-span-7 municipal-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F5F2EC] dark:bg-[#151A22] border-b border-[#DDD8CE] dark:border-[#323C4D] text-[#667085] dark:text-[#9BA3AF] font-semibold">
                <tr>
                  <th className="py-2.5 px-3">Call ID</th>
                  <th className="py-2.5 px-3">Severity</th>
                  <th className="py-2.5 px-3">Location</th>
                  <th className="py-2.5 px-3">Required Facility</th>
                  <th className="py-2.5 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#DDD8CE] dark:divide-[#323C4D]">
                {filteredEmergencies.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-[#667085] dark:text-[#9BA3AF]">
                      No emergency calls matching the selected filters.
                    </td>
                  </tr>
                ) : (
                  filteredEmergencies.map((req) => {
                    const isSelected = selectedRequest?.id === req.id;
                    return (
                      <tr
                        key={req.id}
                        onClick={() => setSelectedRequest(req)}
                        className={`cursor-pointer transition-colors ${
                          isSelected
                            ? 'bg-[#E6F3F2] dark:bg-[#16363B] font-medium'
                            : 'hover:bg-[#F5F2EC] dark:hover:bg-[#252D3A]'
                        }`}
                      >
                        <td className="py-2.5 px-3 font-mono font-bold text-[#1D2433] dark:text-[#F0F4F8]">
                          {req.id}
                        </td>
                        <td className="py-2.5 px-3">
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
                        </td>
                        <td className="py-2.5 px-3 text-[#1D2433] dark:text-[#F0F4F8]">
                          {req.incidentLocationId}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-[11px] text-[#667085] dark:text-[#9BA3AF]">
                          {req.requiredFacility}
                        </td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                              req.status === 'PENDING'
                                ? 'bg-[#FEF6EC] text-[#D9822B] border border-[#FCE2C4]'
                                : req.status === 'DISPATCHED'
                                ? 'bg-[#E6F3F2] text-[#0E6B66] border border-[#0E6B66]/30'
                                : 'bg-[#EDF7EE] text-[#2F7D4F] border border-[#C8E6C9]'
                            }`}
                          >
                            {req.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Column (5 cols): Incident Details Panel */}
        <div className="lg:col-span-5 municipal-card p-5">
          {selectedRequest ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[#DDD8CE] dark:border-[#323C4D]">
                <div>
                  <span className="text-[11px] font-mono text-[#667085] dark:text-[#9BA3AF]">
                    Incident Dossier
                  </span>
                  <h3 className="text-base font-serif font-bold text-[#1D2433] dark:text-[#F0F4F8]">
                    {selectedRequest.id}
                  </h3>
                </div>
                <span
                  className={
                    selectedRequest.severity === 'CRITICAL'
                      ? 'badge-critical'
                      : selectedRequest.severity === 'SERIOUS'
                      ? 'badge-serious'
                      : 'badge-minor'
                  }
                >
                  {selectedRequest.severity}
                </span>
              </div>

              {/* Incident Details Summary */}
              <div className="space-y-2.5 text-xs">
                <div>
                  <span className="text-[11px] text-[#667085] dark:text-[#9BA3AF] block">Incident Description</span>
                  <p className="font-medium text-[#1D2433] dark:text-[#F0F4F8] mt-0.5">
                    {selectedRequest.description || 'No detailed notes provided'}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div>
                    <span className="text-[11px] text-[#667085] dark:text-[#9BA3AF] block">Location Node</span>
                    <span className="font-semibold text-[#1D2433] dark:text-[#F0F4F8] flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3.5 h-3.5 text-[#0E6B66]" />
                      {selectedRequest.incidentLocationId}
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] text-[#667085] dark:text-[#9BA3AF] block">Required Medical Facility</span>
                    <span className="font-semibold text-[#1D2433] dark:text-[#F0F4F8] flex items-center gap-1 mt-0.5">
                      <Building2 className="w-3.5 h-3.5 text-[#0E6B66]" />
                      {selectedRequest.requiredFacility}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div>
                    <span className="text-[11px] text-[#667085] dark:text-[#9BA3AF] block">Caller Identity</span>
                    <span className="font-medium text-[#1D2433] dark:text-[#F0F4F8] mt-0.5 block">
                      {selectedRequest.callerName} ({selectedRequest.contactNumber})
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] text-[#667085] dark:text-[#9BA3AF] block">Current Status</span>
                    <span className="font-semibold text-[#1D2433] dark:text-[#F0F4F8] mt-0.5 block">
                      {selectedRequest.status}
                    </span>
                  </div>
                </div>

                {selectedRequest.assignedAmbulanceId && (
                  <div className="p-2.5 rounded bg-[#F5F2EC] dark:bg-[#151A22] border border-[#DDD8CE] dark:border-[#323C4D] text-[11px] space-y-1">
                    <div>Assigned Ambulance: <strong>{selectedRequest.assignedAmbulanceId}</strong></div>
                    <div>Destination Hospital: <strong>{selectedRequest.assignedHospitalId}</strong></div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-[#DDD8CE] dark:border-[#323C4D] flex items-center justify-between">
                <span className="text-[11px] text-[#667085] dark:text-[#9BA3AF] font-mono">
                  Logged at {new Date(selectedRequest.createdAt).toLocaleTimeString()}
                </span>

                {selectedRequest.status === 'PENDING' && (
                  <button
                    type="button"
                    onClick={() => handleDispatch(selectedRequest.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded bg-[#0E6B66] hover:bg-[#0B5450] text-white transition-colors"
                  >
                    <span>Dispatch This Unit</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="py-12 text-center text-xs text-[#667085] dark:text-[#9BA3AF]">
              Select an incident from the table to inspect details.
            </div>
          )}
        </div>

      </div>

      {/* Log Emergency Call Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-[#FFFFFF] dark:bg-[#1E2530] border border-[#DDD8CE] dark:border-[#323C4D] rounded-md shadow-lg overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#DDD8CE] dark:border-[#323C4D]">
              <div className="flex items-center gap-2">
                <PhoneCall className="w-4 h-4 text-[#0E6B66]" />
                <h3 className="font-serif font-bold text-sm text-[#1D2433] dark:text-[#F0F4F8]">
                  Log Emergency Call (Operator Intake)
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-[#667085] hover:text-[#1D2433] dark:hover:text-[#F0F4F8]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleLogCall} className="p-5 space-y-3.5 text-xs">
              {formError && (
                <div className="p-2.5 rounded bg-[#FDEDEC] dark:bg-[#381A1C] border border-[#F5C6CB] text-xs text-[#C62828] dark:text-[#F87171]">
                  {formError}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-[#667085] dark:text-[#9BA3AF] mb-1">
                    Caller Name
                  </label>
                  <input
                    id="caller-name"
                    type="text"
                    required
                    minLength={2}
                    maxLength={100}
                    value={callerName}
                    onChange={(e) => setCallerName(e.target.value)}
                    placeholder="Citizen name"
                    className="municipal-input w-full"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[#667085] dark:text-[#9BA3AF] mb-1">
                    Contact Phone
                  </label>
                  <input
                    id="caller-phone"
                    type="tel"
                    required
                    minLength={5}
                    maxLength={40}
                    autoComplete="tel"
                    value={contactNumber}
                    onChange={(e) => setContactNumber(e.target.value)}
                    placeholder="9842100000"
                    className="municipal-input w-full"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="incident-location-select" className="block text-[11px] font-semibold text-[#667085] dark:text-[#9BA3AF] mb-1">
                  Incident Location Node *
                </label>
                <select
                  id="incident-location-select"
                  value={effectiveLocationId}
                  onChange={(e) => setIncidentLocationId(e.target.value)}
                  className="municipal-input w-full font-mono"
                  required
                  disabled={safeLocations.length === 0}
                >
                  {safeLocations.length === 0 ? (
                    <option value="" disabled>Loading incident locations from network...</option>
                  ) : (
                    <>
                      <option value="" disabled>-- Select Incident Location Node --</option>
                      {safeLocations.map((loc) => (
                        <option key={loc.id} value={loc.id}>
                          {loc.name} ({loc.id} - {loc.zoneType})
                        </option>
                      ))}
                    </>
                  )}
                </select>
                {safeLocations.length === 0 && (
                  <p className="text-[11px] text-[#D9822B] mt-1 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 animate-spin" />
                    <span>Synchronizing location nodes from backend database...</span>
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-[#667085] dark:text-[#9BA3AF] mb-1">
                    Operator-Assigned Severity *
                  </label>
                  <select
                    value={severity}
                    onChange={(e) => setSeverity(e.target.value)}
                    className="municipal-input w-full"
                  >
                    <option value="CRITICAL">Critical (Immediate Threat)</option>
                    <option value="SERIOUS">Serious (Urgent Care)</option>
                    <option value="MINOR">Minor (Non-Urgent)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[#667085] dark:text-[#9BA3AF] mb-1">
                    Required Department *
                  </label>
                  <select
                    value={requiredFacility}
                    onChange={(e) => setRequiredFacility(e.target.value)}
                    className="municipal-input w-full"
                  >
                    <option value="TRAUMA">Trauma Center</option>
                    <option value="CARDIAC">Cardiac Center</option>
                    <option value="NEURO">Neuro ICU</option>
                    <option value="PEDIATRICS">Pediatrics Specialty</option>
                    <option value="GENERAL">General Care</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#667085] dark:text-[#9BA3AF] mb-1">
                  Incident Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe reported symptoms and hazards..."
                  maxLength={500}
                  rows={2}
                  className="municipal-input w-full"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-[#DDD8CE] dark:border-[#323C4D]">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3 py-1.5 rounded border border-[#DDD8CE] dark:border-[#323C4D] text-[#667085] hover:text-[#1D2433] text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || safeLocations.length === 0}
                  className="px-4 py-1.5 rounded bg-[#0E6B66] hover:bg-[#0B5450] text-white text-xs font-semibold disabled:opacity-50 flex items-center gap-1.5 transition-colors"
                >
                  {isSubmitting ? (
                    <>
                      <Clock className="w-3.5 h-3.5 animate-spin" />
                      <span>Submitting...</span>
                    </>
                  ) : (
                    <span>Confirm Call</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default EmergencyRequestsPage;
