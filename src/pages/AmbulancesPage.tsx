import React, { useState } from 'react';
import { useApp, type AmbulanceUnit } from '../context/AppContext';
import {
  Truck,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  Plus,
  X,
  Phone,
  User,
  Activity,
  Wrench,
  Navigation,
  Shield,
  Save,
} from 'lucide-react';

export const AmbulancesPage: React.FC = () => {
  const { ambulances, trips, stats, locations, updateAmbulanceStatus, createAmbulance } = useApp();
  const safeAmbulances = Array.isArray(ambulances) ? ambulances : [];
  const safeTrips = Array.isArray(trips) ? trips : [];
  const safeLocations = Array.isArray(locations) ? locations : [];

  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // New ambulance form state
  const [newReg, setNewReg] = useState('');
  const [newDriver, setNewDriver] = useState('');
  const [newContact, setNewContact] = useState('');
  const [newLocation, setNewLocation] = useState(safeLocations[0]?.name || 'Central Junction');
  const [newEquipment, setNewEquipment] = useState('ALS');

  // Relocation / status change inline state
  const [actionAmbulanceId, setActionAmbulanceId] = useState<string | null>(null);
  const [targetStatus, setTargetStatus] = useState<string>('AVAILABLE');
  const [targetLocation, setTargetLocation] = useState<string>('');

  const handleOpenAddModal = () => {
    setNewReg(`TN-09-AX-${1000 + safeAmbulances.length + 1}`);
    setNewDriver('');
    setNewContact('');
    setNewLocation(safeLocations[0]?.name || 'Central Junction');
    setNewEquipment('ALS');
    setIsModalOpen(true);
  };

  const handleCreateAmbulance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReg.trim() || !newDriver.trim() || !newContact.trim() || !newLocation.trim()) {
      setStatusMsg({ type: 'error', text: 'All fields are required to register an ambulance.' });
      return;
    }
    setIsSubmitting(true);
    setStatusMsg(null);
    try {
      const created = await createAmbulance({
        registrationNumber: newReg.trim(),
        driverName: newDriver.trim(),
        driverContact: newContact.trim(),
        currentLocation: newLocation.trim(),
        equipmentType: newEquipment,
      });
      setIsModalOpen(false);
      setStatusMsg({
        type: 'success',
        text: `Ambulance ${created.id} (${created.registrationNumber}) added successfully to fleet!`,
      });
      setTimeout(() => setStatusMsg(null), 5000);
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: `Failed to add ambulance: ${err.message}` });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateStatus = async (amb: AmbulanceUnit, newStatus: string) => {
    setStatusMsg(null);
    try {
      await updateAmbulanceStatus(amb.id, newStatus);
      setStatusMsg({
        type: 'success',
        text: `Ambulance ${amb.id} status updated to ${newStatus}.`,
      });
      setTimeout(() => setStatusMsg(null), 4000);
    } catch (err: any) {
      setStatusMsg({
        type: 'error',
        text: `Status change rejected: ${err.message}`,
      });
    }
  };

  const handleStartRelocate = (amb: AmbulanceUnit) => {
    setActionAmbulanceId(amb.id);
    setTargetStatus(amb.status);
    setTargetLocation(amb.currentLocation || amb.currentLocationId);
  };

  const handleSaveRelocate = async (ambId: string) => {
    setStatusMsg(null);
    try {
      await updateAmbulanceStatus(ambId, targetStatus, targetLocation);
      setActionAmbulanceId(null);
      setStatusMsg({
        type: 'success',
        text: `Ambulance ${ambId} updated (Status: ${targetStatus}, Node: ${targetLocation}).`,
      });
      setTimeout(() => setStatusMsg(null), 4000);
    } catch (err: any) {
      setStatusMsg({
        type: 'error',
        text: `Update failed: ${err.message}`,
      });
    }
  };

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div className="border-b border-[#DDD8CE] dark:border-[#323C4D] pb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-serif font-bold text-[#1D2433] dark:text-[#F0F4F8]">
            Ambulance Fleet Registry
          </h1>
          <p className="text-xs text-[#667085] dark:text-[#9BA3AF] mt-0.5">
            Fleet of {stats?.totalAmbulances ?? safeAmbulances.length} emergency vehicles ({stats?.availableAmbulances ?? safeAmbulances.filter((a) => a.status === 'AVAILABLE').length} available) stationed across Nalam Nagar nodes.
          </p>
        </div>

        <button
          onClick={handleOpenAddModal}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#0E6B66] hover:bg-[#0B5450] text-white text-xs font-semibold shadow-sm transition-colors self-start sm:self-auto"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Ambulance</span>
        </button>
      </div>

      {/* Notifications / Alerts */}
      {statusMsg && (
        <div
          className={`p-3 rounded text-xs flex items-center justify-between border ${
            statusMsg.type === 'success'
              ? 'bg-[#EDF7EE] text-[#2F7D4F] border-[#C8E6C9]'
              : 'bg-[#FDEDEC] text-[#C62828] border-[#F5C6CB]'
          }`}
        >
          <div className="flex items-center gap-2">
            {statusMsg.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            )}
            <span>{statusMsg.text}</span>
          </div>
          <button
            onClick={() => setStatusMsg(null)}
            className="font-bold underline text-xs ml-4"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Fleet Overview Table */}
      <div className="municipal-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F5F2EC] dark:bg-[#151A22] border-b border-[#DDD8CE] dark:border-[#323C4D] text-[#667085] dark:text-[#9BA3AF] font-semibold">
              <tr>
                <th className="py-2.5 px-4">Ambulance ID</th>
                <th className="py-2.5 px-4">Registration</th>
                <th className="py-2.5 px-4">Driver & Contact</th>
                <th className="py-2.5 px-4">Current Node Location</th>
                <th className="py-2.5 px-4">Status & Active Trip</th>
                <th className="py-2.5 px-4 text-center">Trips Done</th>
                <th className="py-2.5 px-4 text-right">Fleet Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#DDD8CE] dark:divide-[#323C4D]">
              {safeAmbulances.map((amb) => {
                const activeTrip = safeTrips.find((t) => t.ambulanceId === amb.id && !t.completed);
                const isActionOpen = actionAmbulanceId === amb.id;

                return (
                  <tr key={amb.id} className="hover:bg-[#F5F2EC] dark:hover:bg-[#252D3A] transition-colors">
                    {/* Ambulance ID & Equipment */}
                    <td className="py-3 px-4 font-mono font-bold text-[#1D2433] dark:text-[#F0F4F8]">
                      <div>{amb.id}</div>
                      <span className="text-[10px] font-normal text-[#667085] dark:text-[#9BA3AF]">
                        {amb.equipmentType || 'ALS'}
                      </span>
                    </td>

                    {/* Registration */}
                    <td className="py-3 px-4 font-mono text-[#1D2433] dark:text-[#F0F4F8]">
                      {amb.registrationNumber}
                    </td>

                    {/* Driver & Contact */}
                    <td className="py-3 px-4 text-[#1D2433] dark:text-[#F0F4F8]">
                      <div className="flex items-center gap-1 font-medium">
                        <User className="w-3 h-3 text-[#667085]" />
                        <span>{amb.driverName || 'Designated Driver'}</span>
                      </div>
                      <div className="flex items-center gap-1 text-[11px] text-[#667085] dark:text-[#9BA3AF] mt-0.5">
                        <Phone className="w-2.5 h-2.5" />
                        <span>{amb.driverContact || 'Direct Dispatch'}</span>
                      </div>
                    </td>

                    {/* Current Node Location */}
                    <td className="py-3 px-4">
                      {isActionOpen ? (
                        <select
                          value={targetLocation}
                          onChange={(e) => setTargetLocation(e.target.value)}
                          className="municipal-input py-1 px-2 text-xs"
                        >
                          {safeLocations.map((loc) => (
                            <option key={loc.id} value={loc.name}>
                              {loc.id} - {loc.name}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <div className="flex items-center gap-1.5 font-semibold text-[#1D2433] dark:text-[#F0F4F8]">
                          <MapPin className="w-3.5 h-3.5 text-[#0E6B66]" />
                          <span>{amb.currentLocation || amb.currentLocationId}</span>
                        </div>
                      )}
                    </td>

                    {/* Status & Active Trip */}
                    <td className="py-3 px-4">
                      {isActionOpen ? (
                        <select
                          value={targetStatus}
                          onChange={(e) => setTargetStatus(e.target.value)}
                          className="municipal-input py-1 px-2 text-xs"
                        >
                          <option value="AVAILABLE">AVAILABLE</option>
                          <option value="MAINTENANCE">MAINTENANCE</option>
                          <option value="OFF_DUTY">OFF_DUTY</option>
                        </select>
                      ) : (
                        <div>
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold ${
                              amb.status === 'AVAILABLE'
                                ? 'bg-[#EDF7EE] text-[#2F7D4F] border border-[#C8E6C9]'
                                : amb.status === 'MAINTENANCE'
                                ? 'bg-[#FDEDEC] text-[#C62828] border border-[#F5C6CB]'
                                : amb.status === 'OFF_DUTY'
                                ? 'bg-[#EFECE6] text-[#667085] border border-[#DDD8CE]'
                                : 'bg-[#FEF6EC] text-[#D9822B] border border-[#FCE2C4]'
                            }`}
                          >
                            {amb.status}
                          </span>
                          {activeTrip && (
                            <span className="block text-[10px] text-[#0E6B66] dark:text-[#1DB8AF] mt-0.5 font-mono">
                              On {activeTrip.id} (ETA:{' '}
                              {typeof activeTrip.totalMinutes === 'number' && Number.isFinite(activeTrip.totalMinutes)
                                ? `${activeTrip.totalMinutes.toFixed(1)}m`
                                : 'N/A'}
                              )
                            </span>
                          )}
                        </div>
                      )}
                    </td>

                    {/* Completed Trips */}
                    <td className="py-3 px-4 text-center font-mono font-semibold text-[#1D2433] dark:text-[#F0F4F8]">
                      {amb.totalTripsCompleted}
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right">
                      {isActionOpen ? (
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleSaveRelocate(amb.id)}
                            className="p-1 rounded bg-[#0E6B66] text-white hover:bg-[#0B5450]"
                            title="Save changes"
                          >
                            <Save className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setActionAmbulanceId(null)}
                            className="p-1 rounded border border-[#DDD8CE] text-[#667085] hover:text-[#1D2433]"
                            title="Cancel"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-end gap-1.5">
                          {activeTrip ? (
                            <span
                              className="text-[10px] text-[#D9822B] italic cursor-help"
                              title={`Unit is locked during active mission ${activeTrip.id}. Complete trip to release.`}
                            >
                              Locked on trip
                            </span>
                          ) : (
                            <>
                              {amb.status === 'AVAILABLE' ? (
                                <button
                                  onClick={() => handleUpdateStatus(amb, 'MAINTENANCE')}
                                  className="px-2 py-0.5 rounded border border-[#DDD8CE] dark:border-[#323C4D] text-[10px] text-[#667085] hover:bg-[#EFECE6] dark:hover:bg-[#1E2430]"
                                >
                                  Maint
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleUpdateStatus(amb, 'AVAILABLE')}
                                  className="px-2 py-0.5 rounded bg-[#EDF7EE] text-[#2F7D4F] border border-[#C8E6C9] text-[10px] font-semibold hover:bg-[#D4EDDA]"
                                >
                                  Set Ready
                                </button>
                              )}
                              <button
                                onClick={() => handleStartRelocate(amb)}
                                className="px-2 py-0.5 rounded border border-[#DDD8CE] dark:border-[#323C4D] text-[10px] text-[#0E6B66] dark:text-[#1DB8AF] hover:bg-[#EFECE6] dark:hover:bg-[#1E2430]"
                              >
                                Edit / Move
                              </button>
                            </>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Ambulance Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-[#1C222D] rounded-lg shadow-xl border border-[#DDD8CE] dark:border-[#323C4D] max-w-md w-full p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-[#DDD8CE] dark:border-[#323C4D] pb-3">
              <div className="flex items-center gap-2">
                <Truck className="w-5 h-5 text-[#0E6B66]" />
                <h3 className="font-serif font-bold text-base text-[#1D2433] dark:text-[#F0F4F8]">
                  Register New Ambulance Unit
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-[#667085] hover:text-[#1D2433] p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateAmbulance} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-medium text-[#1D2433] dark:text-[#F0F4F8] mb-1">
                  Registration Number
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. TN-09-AX-1006"
                  value={newReg}
                  onChange={(e) => setNewReg(e.target.value)}
                  className="municipal-input w-full p-2 font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-[#1D2433] dark:text-[#F0F4F8] mb-1">
                    Driver Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. R. Kumar"
                    value={newDriver}
                    onChange={(e) => setNewDriver(e.target.value)}
                    className="municipal-input w-full p-2"
                  />
                </div>
                <div>
                  <label className="block font-medium text-[#1D2433] dark:text-[#F0F4F8] mb-1">
                    Driver Contact
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. +91 98401 23456"
                    value={newContact}
                    onChange={(e) => setNewContact(e.target.value)}
                    className="municipal-input w-full p-2"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-[#1D2433] dark:text-[#F0F4F8] mb-1">
                    Stationed Node Location
                  </label>
                  <select
                    value={newLocation}
                    onChange={(e) => setNewLocation(e.target.value)}
                    className="municipal-input w-full p-2"
                  >
                    {safeLocations.map((loc) => (
                      <option key={loc.id} value={loc.name}>
                        {loc.id} - {loc.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-medium text-[#1D2433] dark:text-[#F0F4F8] mb-1">
                    Equipment Grade
                  </label>
                  <select
                    value={newEquipment}
                    onChange={(e) => setNewEquipment(e.target.value)}
                    className="municipal-input w-full p-2"
                  >
                    <option value="ALS">Advanced Life Support (ALS)</option>
                    <option value="BLS">Basic Life Support (BLS)</option>
                    <option value="CCU">Critical Care Unit (CCU)</option>
                  </select>
                </div>
              </div>

              <div className="p-2.5 rounded bg-[#F5F2EC] dark:bg-[#151A22] text-[11px] text-[#667085] dark:text-[#9BA3AF]">
                The unit will be registered in PostgreSQL with status <strong>AVAILABLE</strong> and initial location history logged at <strong>{newLocation}</strong>.
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#DDD8CE] dark:border-[#323C4D]">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3 py-1.5 rounded border border-[#DDD8CE] text-[#667085] hover:bg-[#EFECE6]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-1.5 rounded bg-[#0E6B66] text-white font-semibold hover:bg-[#0B5450] flex items-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{isSubmitting ? 'Registering...' : 'Register Ambulance'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Case Study Principles */}
      <div className="municipal-card p-4 text-xs text-[#667085] dark:text-[#9BA3AF] space-y-2">
        <h3 className="font-serif font-bold text-sm text-[#1D2433] dark:text-[#F0F4F8]">
          Fleet Management Specifications & Concurrency Safeguards
        </h3>
        <ul className="list-disc list-inside space-y-1 leading-relaxed">
          <li><strong>Discrete Graph Nodes:</strong> Ambulances exist at discrete town junctions or hospital facilities.</li>
          <li><strong>Active Trip Safeguard:</strong> An ambulance currently dispatched on an active emergency mission cannot be marked available, off-duty, or placed in maintenance until the trip finishes.</li>
          <li><strong>Post-Mission Staging:</strong> Upon trip completion, the vehicle is automatically staged at the destination hospital node and recorded in location history.</li>
        </ul>
      </div>
    </div>
  );
};

export default AmbulancesPage;
