import React, { useState } from 'react';
import { useApp, type HospitalFacility } from '../context/AppContext';
import {
  Building2,
  CheckCircle2,
  AlertTriangle,
  Edit3,
  Save,
  X,
  Plus,
  Minus,
  Phone,
  MapPin,
  Bed,
} from 'lucide-react';

const STANDARD_FACILITIES = ['TRAUMA', 'CARDIAC', 'PEDIATRICS', 'GENERAL', 'ICU'];

export const HospitalsPage: React.FC = () => {
  const { hospitals, locations, stats, updateHospitalCapacity, createHospital } = useApp();
  const safeHospitals = Array.isArray(hospitals) ? hospitals : [];
  const safeLocations = Array.isArray(locations) ? locations : [];

  const [editingId, setEditingId] = useState<string | null>(null);
  const [bedsInput, setBedsInput] = useState<number>(0);
  const [totalBedsInput, setTotalBedsInput] = useState<number>(0);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  // Add hospital modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newName, setNewName] = useState('');
  const [newAddress, setNewAddress] = useState('');
  const [newLocation, setNewLocation] = useState(safeLocations[0]?.name || 'Central Junction');
  const [newPhone, setNewPhone] = useState('');
  const [newType, setNewType] = useState('General Emergency');
  const [newTotalBeds, setNewTotalBeds] = useState(100);
  const [newAvailBeds, setNewAvailBeds] = useState(20);
  const [newFacilities, setNewFacilities] = useState<string[]>(['GENERAL']);

  const startEdit = (hosp: HospitalFacility) => {
    setEditingId(hosp.id);
    setBedsInput(hosp.availableBeds);
    setTotalBedsInput(hosp.totalBeds);
  };

  const saveBeds = async (hospId: string) => {
    if (totalBedsInput < 1) {
      setStatusMsg({ type: 'error', text: 'Total beds must be at least 1.' });
      return;
    }
    if (bedsInput < 0 || bedsInput > totalBedsInput) {
      setStatusMsg({ type: 'error', text: `Available beds must be between 0 and total beds (${totalBedsInput}).` });
      return;
    }

    setIsUpdating(true);
    setStatusMsg(null);
    try {
      await updateHospitalCapacity(hospId, bedsInput, totalBedsInput);
      setEditingId(null);
      setStatusMsg({
        type: 'success',
        text: `Hospital ${hospId} capacity updated: ${bedsInput} available / ${totalBedsInput} total beds.`,
      });
      setTimeout(() => setStatusMsg(null), 4000);
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: `Update failed: ${err.message}` });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleOpenAddModal = () => {
    setNewName('');
    setNewAddress('');
    setNewLocation(safeLocations[0]?.name || 'Central Junction');
    setNewPhone('');
    setNewType('General Emergency');
    setNewTotalBeds(100);
    setNewAvailBeds(20);
    setNewFacilities(['GENERAL']);
    setIsModalOpen(true);
  };

  const toggleFacility = (facility: string) => {
    if (newFacilities.includes(facility)) {
      if (newFacilities.length > 1) {
        setNewFacilities(newFacilities.filter((f) => f !== facility));
      }
    } else {
      setNewFacilities([...newFacilities, facility]);
    }
  };

  const handleCreateHospital = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newAddress.trim() || !newLocation.trim() || !newPhone.trim()) {
      setStatusMsg({ type: 'error', text: 'All text fields are required.' });
      return;
    }
    if (newTotalBeds < 1) {
      setStatusMsg({ type: 'error', text: 'Total beds must be at least 1.' });
      return;
    }
    if (newAvailBeds < 0 || newAvailBeds > newTotalBeds) {
      setStatusMsg({ type: 'error', text: 'Available beds cannot exceed total beds.' });
      return;
    }

    setIsSubmitting(true);
    setStatusMsg(null);
    try {
      const created = await createHospital({
        name: newName.trim(),
        address: newAddress.trim(),
        location: newLocation.trim(),
        contactNumber: newPhone.trim(),
        type: newType,
        totalBeds: newTotalBeds,
        availableBeds: newAvailBeds,
        facilities: newFacilities,
      });
      setIsModalOpen(false);
      setStatusMsg({
        type: 'success',
        text: `Hospital "${created.name}" registered successfully with ${created.availableBeds} beds at node ${created.locationId}!`,
      });
      setTimeout(() => setStatusMsg(null), 5000);
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: `Failed to create hospital: ${err.message}` });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div className="border-b border-[#DDD8CE] dark:border-[#323C4D] pb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-serif font-bold text-[#1D2433] dark:text-[#F0F4F8]">
            Hospitals & Bed Capacity Directory
          </h1>
          <p className="text-xs text-[#667085] dark:text-[#9BA3AF] mt-0.5">
            {stats?.availableBeds ?? 0} available beds across {stats?.totalBeds ?? 0} total capacity in {safeHospitals.length} clinical facilities. Dispatch matches clinical capabilities and reserves a bed.
          </p>
        </div>

        <button
          onClick={handleOpenAddModal}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#0E6B66] hover:bg-[#0B5450] text-white text-xs font-semibold shadow-sm transition-colors self-start sm:self-auto"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Hospital</span>
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

      {/* Hospitals Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {safeHospitals.map((hosp) => {
          const isEditing = editingId === hosp.id;
          const bedOccupancy = hosp.totalBeds > 0 ? Math.round(((hosp.totalBeds - hosp.availableBeds) / hosp.totalBeds) * 100) : 100;

          return (
            <div key={hosp.id} className="municipal-card p-5 space-y-3.5">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[11px] font-mono text-[#0E6B66] dark:text-[#1DB8AF] font-bold">
                    {hosp.id} &bull; Node {hosp.locationId}
                  </span>
                  <h3 className="font-serif font-bold text-base text-[#1D2433] dark:text-[#F0F4F8] mt-0.5">
                    {hosp.name}
                  </h3>
                  {hosp.address && (
                    <div className="flex items-center gap-1 text-[11px] text-[#667085] dark:text-[#9BA3AF] mt-0.5">
                      <MapPin className="w-3 h-3 flex-shrink-0" />
                      <span>{hosp.address}</span>
                    </div>
                  )}
                </div>

                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                    hosp.availableBeds > 0
                      ? 'bg-[#EDF7EE] text-[#2F7D4F] border border-[#C8E6C9]'
                      : 'bg-[#FDEDEC] text-[#C62828] border border-[#F5C6CB]'
                  }`}
                >
                  {hosp.availableBeds > 0 ? `${hosp.availableBeds} BEDS FREE` : 'CAPACITY FULL'}
                </span>
              </div>

              {/* Occupancy Progress Bar */}
              <div className="space-y-1">
                <div className="flex justify-between text-[11px] text-[#667085] dark:text-[#9BA3AF]">
                  <span>Occupancy</span>
                  <span className="font-mono font-bold text-[#1D2433] dark:text-[#F0F4F8]">{bedOccupancy}%</span>
                </div>
                <div className="w-full bg-[#E5E1D8] dark:bg-[#252D3A] rounded-full h-2 overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${
                      bedOccupancy >= 95
                        ? 'bg-[#C62828]'
                        : bedOccupancy >= 80
                        ? 'bg-[#D9822B]'
                        : 'bg-[#0E6B66]'
                    }`}
                    style={{ width: `${Math.min(100, Math.max(0, bedOccupancy))}%` }}
                  />
                </div>
              </div>

              {/* Bed Count Editor */}
              <div className="p-3 rounded bg-[#F5F2EC] dark:bg-[#151A22] border border-[#DDD8CE] dark:border-[#323C4D] flex items-center justify-between text-xs">
                <div>
                  <span className="text-[11px] text-[#667085] dark:text-[#9BA3AF] block font-medium">Bed Capacity</span>
                  {isEditing ? (
                    <div className="space-y-2 mt-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-[#667085] w-12">Available:</span>
                        <button
                          type="button"
                          onClick={() => setBedsInput(Math.max(0, bedsInput - 1))}
                          className="p-1 rounded border border-[#DDD8CE] bg-white text-[#1D2433]"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <input
                          type="number"
                          min={0}
                          max={totalBedsInput}
                          value={bedsInput}
                          onChange={(e) => setBedsInput(Math.min(totalBedsInput, Math.max(0, parseInt(e.target.value) || 0)))}
                          className="municipal-input py-0.5 px-1.5 w-16 text-center font-mono font-bold"
                        />
                        <button
                          type="button"
                          onClick={() => setBedsInput(Math.min(totalBedsInput, bedsInput + 1))}
                          className="p-1 rounded border border-[#DDD8CE] bg-white text-[#1D2433]"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-[#667085] w-12">Total:</span>
                        <input
                          type="number"
                          min={1}
                          value={totalBedsInput}
                          onChange={(e) => {
                            const val = Math.max(1, parseInt(e.target.value) || 1);
                            setTotalBedsInput(val);
                            if (bedsInput > val) setBedsInput(val);
                          }}
                          className="municipal-input py-0.5 px-1.5 w-16 text-center font-mono font-bold"
                        />
                        <span className="text-[10px] text-[#667085]">beds</span>
                      </div>
                    </div>
                  ) : (
                    <div className="text-base font-serif font-bold text-[#1D2433] dark:text-[#F0F4F8] mt-0.5 flex items-center gap-1.5">
                      <Bed className="w-4 h-4 text-[#0E6B66]" />
                      <span>{hosp.availableBeds}</span>
                      <span className="text-xs font-normal text-[#667085]">/ {hosp.totalBeds} total</span>
                    </div>
                  )}
                </div>

                <div>
                  {isEditing ? (
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => saveBeds(hosp.id)}
                        disabled={isUpdating}
                        className="px-2.5 py-1 text-xs font-semibold rounded bg-[#0E6B66] hover:bg-[#0B5450] text-white flex items-center gap-1"
                      >
                        <Save className="w-3 h-3" />
                        <span>Save</span>
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="p-1 text-[#667085] hover:text-[#1D2433]"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => startEdit(hosp)}
                      className="px-2.5 py-1 text-xs font-semibold rounded border border-[#DDD8CE] dark:border-[#323C4D] text-[#1D2433] dark:text-[#F0F4F8] hover:bg-[#EFECE6] flex items-center gap-1"
                    >
                      <Edit3 className="w-3 h-3" />
                      <span>Adjust Beds</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Facility Capabilities Pills */}
              <div>
                <span className="text-[11px] text-[#667085] dark:text-[#9BA3AF] block mb-1">
                  Accredited Clinical Facilities:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {hosp.capabilities.map((cap) => (
                    <span
                      key={cap}
                      className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-[#E6F3F2] text-[#0E6B66] border border-[#0E6B66]/20 dark:bg-[#16363B] dark:text-[#1DB8AF]"
                    >
                      {cap}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Hospital Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-[#1C222D] rounded-lg shadow-xl border border-[#DDD8CE] dark:border-[#323C4D] max-w-lg w-full p-5 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#DDD8CE] dark:border-[#323C4D] pb-3">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-[#0E6B66]" />
                <h3 className="font-serif font-bold text-base text-[#1D2433] dark:text-[#F0F4F8]">
                  Register New Hospital Facility
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-[#667085] hover:text-[#1D2433] p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateHospital} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-medium text-[#1D2433] dark:text-[#F0F4F8] mb-1">
                  Hospital Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Apex Multispeciality Hospital"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="municipal-input w-full p-2"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-[#1D2433] dark:text-[#F0F4F8] mb-1">
                    Town Node Location
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
                    Facility Type
                  </label>
                  <select
                    value={newType}
                    onChange={(e) => setNewType(e.target.value)}
                    className="municipal-input w-full p-2"
                  >
                    <option value="General Emergency">General Emergency</option>
                    <option value="Trauma Care Center">Trauma Care Center</option>
                    <option value="Speciality Center">Speciality Center</option>
                    <option value="Community Hospital">Community Hospital</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-medium text-[#1D2433] dark:text-[#F0F4F8] mb-1">
                  Street Address
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 45 High Road, Ward 7"
                  value={newAddress}
                  onChange={(e) => setNewAddress(e.target.value)}
                  className="municipal-input w-full p-2"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-medium text-[#1D2433] dark:text-[#F0F4F8] mb-1">
                    Emergency Phone
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. +91 44 2800 1100"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    className="municipal-input w-full p-2"
                  />
                </div>

                <div>
                  <label className="block font-medium text-[#1D2433] dark:text-[#F0F4F8] mb-1">
                    Total Beds
                  </label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={newTotalBeds}
                    onChange={(e) => setNewTotalBeds(Math.max(1, parseInt(e.target.value) || 1))}
                    className="municipal-input w-full p-2 font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block font-medium text-[#1D2433] dark:text-[#F0F4F8] mb-1">
                    Available Beds
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={newTotalBeds}
                    required
                    value={newAvailBeds}
                    onChange={(e) => setNewAvailBeds(Math.min(newTotalBeds, Math.max(0, parseInt(e.target.value) || 0)))}
                    className="municipal-input w-full p-2 font-mono font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-[#1D2433] dark:text-[#F0F4F8] mb-1.5">
                  Accredited Clinical Departments (select at least 1)
                </label>
                <div className="flex flex-wrap gap-2">
                  {STANDARD_FACILITIES.map((facility) => {
                    const isSelected = newFacilities.includes(facility);
                    return (
                      <button
                        type="button"
                        key={facility}
                        onClick={() => toggleFacility(facility)}
                        className={`px-3 py-1 rounded text-xs font-semibold transition-colors border ${
                          isSelected
                            ? 'bg-[#0E6B66] text-white border-[#0E6B66]'
                            : 'bg-white dark:bg-[#151A22] text-[#667085] border-[#DDD8CE] dark:border-[#323C4D] hover:bg-[#F5F2EC]'
                        }`}
                      >
                        {facility}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="p-2.5 rounded bg-[#F5F2EC] dark:bg-[#151A22] text-[11px] text-[#667085] dark:text-[#9BA3AF]">
                The facility will be persisted in PostgreSQL. The town location category at <strong>{newLocation}</strong> will be updated to <strong>Hospital</strong>.
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
                  <span>{isSubmitting ? 'Registering...' : 'Register Hospital'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Case Study Constraint Box */}
      <div className="municipal-card p-4 text-xs text-[#667085] dark:text-[#9BA3AF] space-y-1.5">
        <h4 className="font-serif font-bold text-sm text-[#1D2433] dark:text-[#F0F4F8]">
          Case Study Hospital Selection Criteria & Concurrency Rules:
        </h4>
        <p>
          Among all hospitals in Nalam Nagar that <strong>(a) offer the required clinical facility</strong> and <strong>(b) have at least 1 free bed</strong>, the system selects the one with the <strong>lowest travel time (minutes)</strong> from the incident location.
        </p>
        <p>
          During dispatch, bed reservation is performed atomically with serializable isolation to prevent over-allocation. When a trip is completed, the reserved bed is safely returned to capacity.
        </p>
      </div>
    </div>
  );
};

export default HospitalsPage;
