import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Clock, CheckCircle2, AlertTriangle, Truck, Building2, MapPin, XCircle, ChevronRight, Ban } from 'lucide-react';

export const TripsPage: React.FC = () => {
  const { trips, completeTrip, cancelTrip, updateTripStatus } = useApp();
  const [filter, setFilter] = useState<'ALL' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED'>('ALL');
  const [actionNotice, setActionNotice] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [cancellingTripId, setCancellingTripId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const safeTrips = Array.isArray(trips) ? trips : [];
  const formatMinutes = (value: number | null | undefined, fallback = 'N/A') => {
    if (typeof value !== 'number' || Number.isNaN(value)) return fallback;
    return `${value.toFixed(1)}m`;
  };

  const filteredTrips = safeTrips.filter((t) => {
    if (filter === 'ACTIVE') return !t.completed && t.status !== 'CANCELLED';
    if (filter === 'COMPLETED') return t.status === 'COMPLETED';
    if (filter === 'CANCELLED') return t.status === 'CANCELLED';
    return true;
  });

  const getNextStatus = (currentStatus: string): { status: string; label: string } | null => {
    switch (currentStatus) {
      case 'DISPATCHED':
        return { status: 'EN_ROUTE_PICKUP', label: 'Depart to Scene' };
      case 'EN_ROUTE_PICKUP':
        return { status: 'AT_SCENE', label: 'Arrive at Scene' };
      case 'AT_SCENE':
        return { status: 'TRANSPORTING', label: 'Begin Transport' };
      case 'TRANSPORTING':
        return { status: 'ARRIVED_HOSPITAL', label: 'Arrive Hospital' };
      case 'ARRIVED_HOSPITAL':
        return { status: 'COMPLETED', label: 'Complete Mission' };
      default:
        return null;
    }
  };

  const handleAdvanceStatus = async (tripId: string, nextStatus: string) => {
    try {
      setIsSubmitting(true);
      if (nextStatus === 'COMPLETED') {
        const res = await completeTrip(tripId);
        setActionNotice({ message: res.message, type: 'success' });
      } else {
        const res = await updateTripStatus(tripId, nextStatus);
        setActionNotice({ message: res.message || `Status updated to ${nextStatus}`, type: 'success' });
      }
      setTimeout(() => setActionNotice(null), 5000);
    } catch (err: any) {
      setActionNotice({ message: `Status update failed: ${err.message}`, type: 'error' });
      setTimeout(() => setActionNotice(null), 6000);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleComplete = async (tripId: string) => {
    try {
      setIsSubmitting(true);
      const res = await completeTrip(tripId);
      setActionNotice({ message: res.message, type: 'success' });
      setTimeout(() => setActionNotice(null), 5000);
    } catch (err: any) {
      setActionNotice({ message: `Failed to complete trip: ${err.message}`, type: 'error' });
      setTimeout(() => setActionNotice(null), 6000);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cancellingTripId) return;
    try {
      setIsSubmitting(true);
      const res = await cancelTrip(cancellingTripId, cancelReason.trim() || 'Mission cancelled by operator');
      setActionNotice({ message: res.message, type: 'success' });
      setCancellingTripId(null);
      setCancelReason('');
      setTimeout(() => setActionNotice(null), 5000);
    } catch (err: any) {
      setActionNotice({ message: `Cancellation failed: ${err.message}`, type: 'error' });
      setTimeout(() => setActionNotice(null), 6000);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadgeClass = (status: string, blocked?: boolean) => {
    if (blocked) return 'bg-[#FDEDEC] text-[#C62828] border border-[#F5C6CB]';
    switch (status) {
      case 'COMPLETED':
        return 'bg-[#EDF7EE] text-[#2F7D4F] border border-[#C8E6C9]';
      case 'CANCELLED':
        return 'bg-[#F2F4F7] text-[#475467] border border-[#D0D5DD] dark:bg-[#1E2530] dark:text-[#9BA3AF]';
      case 'DISPATCHED':
        return 'bg-[#FEF6EC] text-[#D9822B] border border-[#FCE2C4]';
      case 'EN_ROUTE_PICKUP':
        return 'bg-[#EBF5FB] text-[#2980B9] border border-[#D4E6F1]';
      case 'AT_SCENE':
        return 'bg-[#F4ECF7] text-[#8E44AD] border border-[#E8DAEF]';
      case 'TRANSPORTING':
        return 'bg-[#E8F8F5] text-[#16A085] border border-[#D1F2EB]';
      case 'ARRIVED_HOSPITAL':
        return 'bg-[#FEF9E7] text-[#B7950B] border border-[#FCF3CF]';
      default:
        return 'bg-[#F5F2EC] text-[#667085] border border-[#DDD8CE]';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#DDD8CE] dark:border-[#323C4D] pb-4">
        <div>
          <h1 className="text-2xl font-serif font-bold text-[#1D2433] dark:text-[#F0F4F8]">
            Emergency Missions & Trip Registry
          </h1>
          <p className="text-xs text-[#667085] dark:text-[#9BA3AF] mt-0.5">
            Active, completed, and cancelled missions backed by PostgreSQL. Advance status step-by-step or release resources via idempotent completion or cancellation.
          </p>
        </div>

        {/* Filter Buttons */}
        <div className="flex items-center gap-1.5 p-1 rounded bg-[#EFECE6] dark:bg-[#252D3A] text-xs">
          {(['ALL', 'ACTIVE', 'COMPLETED', 'CANCELLED'] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setFilter(tab)}
              className={`px-3 py-1 rounded font-semibold text-xs transition-colors ${
                filter === tab
                  ? 'bg-white dark:bg-[#1E2530] text-[#1D2433] dark:text-[#F0F4F8] shadow-xs'
                  : 'text-[#667085] hover:text-[#1D2433] dark:text-[#9BA3AF]'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {actionNotice && (
        <div className={`p-3.5 rounded text-xs flex items-center justify-between ${
          actionNotice.type === 'success'
            ? 'bg-[#EDF7EE] dark:bg-[#152E20] border border-[#C8E6C9] text-[#2F7D4F] dark:text-[#4ADE80]'
            : 'bg-[#FDEDEC] dark:bg-[#341818] border border-[#F5C6CB] text-[#C62828] dark:text-[#F87171]'
        }`}>
          <span>{actionNotice.message}</span>
          <button onClick={() => setActionNotice(null)} className="font-bold underline text-xs ml-4">Dismiss</button>
        </div>
      )}

      {/* Trips Table */}
      <div className="municipal-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F5F2EC] dark:bg-[#151A22] border-b border-[#DDD8CE] dark:border-[#323C4D] text-[#667085] dark:text-[#9BA3AF] font-semibold">
              <tr>
                <th className="py-2.5 px-4">Trip ID</th>
                <th className="py-2.5 px-4">Incident Request</th>
                <th className="py-2.5 px-4">Assigned Unit</th>
                <th className="py-2.5 px-4">Destination Hospital</th>
                <th className="py-2.5 px-4">Estimated Travel Time</th>
                <th className="py-2.5 px-4">Status</th>
                <th className="py-2.5 px-4 text-right">Lifecycle Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#DDD8CE] dark:divide-[#323C4D]">
              {filteredTrips.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-[#667085] dark:text-[#9BA3AF]">
                    No trips recorded in this filter view.
                  </td>
                </tr>
              ) : (
                filteredTrips.map((t) => {
                  const isClosed = t.completed || t.status === 'COMPLETED' || t.status === 'CANCELLED';
                  const nextAction = !isClosed ? getNextStatus(t.status) : null;

                  return (
                    <tr key={t.id} className="hover:bg-[#F5F2EC] dark:hover:bg-[#252D3A] transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-[#1D2433] dark:text-[#F0F4F8]">
                        {t.id}
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-mono font-semibold">{t.requestId}</span>
                        <span className="block text-[11px] text-[#667085] dark:text-[#9BA3AF]">
                          Location: {t.incidentLocationId}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono font-semibold text-[#1D2433] dark:text-[#F0F4F8]">
                        {t.ambulanceId}
                      </td>
                      <td className="py-3 px-4 font-mono text-[#1D2433] dark:text-[#F0F4F8]">
                        {t.hospitalId}
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-mono font-bold text-[#0E6B66] dark:text-[#1DB8AF]">
                          {typeof t.totalMinutes === 'number' && Number.isFinite(t.totalMinutes)
                            ? `${t.totalMinutes.toFixed(1)} mins`
                            : 'N/A'}
                        </span>
                        <span className="block text-[10px] text-[#667085] dark:text-[#9BA3AF]">
                          Leg1: {formatMinutes(t.timeToIncidentMinutes)} | Leg2: {formatMinutes(t.timeToHospitalMinutes)}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold ${getStatusBadgeClass(t.status, t.blocked)}`}>
                          {t.status}{t.blocked ? ' · BLOCKED' : ''}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        {!isClosed ? (
                          <div className="flex items-center justify-end gap-1.5">
                            {nextAction && (
                              <button
                                type="button"
                                disabled={isSubmitting}
                                onClick={() => handleAdvanceStatus(t.id, nextAction.status)}
                                className="px-2 py-1 text-[11px] font-semibold rounded bg-[#0E6B66] hover:bg-[#0B5450] text-white flex items-center gap-1 transition-colors disabled:opacity-50"
                              >
                                <span>{nextAction.label}</span>
                                <ChevronRight className="w-3 h-3" />
                              </button>
                            )}
                            <button
                              type="button"
                              disabled={isSubmitting}
                              onClick={() => handleComplete(t.id)}
                              className="px-2 py-1 text-[11px] font-semibold rounded border border-[#0E6B66] text-[#0E6B66] dark:text-[#1DB8AF] hover:bg-[#0E6B66]/10 transition-colors disabled:opacity-50"
                            >
                              Complete
                            </button>
                            <button
                              type="button"
                              disabled={isSubmitting}
                              onClick={() => {
                                setCancellingTripId(t.id);
                                setCancelReason('');
                              }}
                              className="px-2 py-1 text-[11px] font-semibold rounded text-[#C62828] hover:bg-[#FDEDEC] dark:hover:bg-[#341818] transition-colors disabled:opacity-50"
                              title="Cancel Mission"
                            >
                              <Ban className="w-3.5 h-3.5 inline mr-0.5" />
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <span className="text-[11px] text-[#667085] dark:text-[#9BA3AF] font-mono">
                            {t.status === 'COMPLETED' ? 'Finished' : 'Cancelled'}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Cancel Modal */}
      {cancellingTripId && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#1E2530] rounded-lg shadow-xl max-w-md w-full p-5 border border-[#DDD8CE] dark:border-[#323C4D] space-y-4">
            <div className="flex items-center justify-between border-b border-[#DDD8CE] dark:border-[#323C4D] pb-3">
              <h2 className="text-base font-bold text-[#C62828] flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                Cancel Emergency Mission
              </h2>
              <button
                onClick={() => setCancellingTripId(null)}
                className="text-[#667085] hover:text-[#1D2433] dark:hover:text-[#F0F4F8]"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-[#667085] dark:text-[#9BA3AF]">
              Cancelling trip <strong className="font-mono text-[#1D2433] dark:text-[#F0F4F8]">{cancellingTripId}</strong> will immediately return the assigned ambulance to available status and release the reserved hospital bed capacity.
            </p>

            <form onSubmit={handleCancel} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-[#1D2433] dark:text-[#F0F4F8] mb-1">
                  Reason for Cancellation
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g., False alarm, patient transported by private vehicle..."
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-[#DDD8CE] dark:border-[#323C4D] rounded bg-white dark:bg-[#151A22] text-[#1D2433] dark:text-[#F0F4F8] focus:outline-hidden focus:ring-1 focus:ring-[#C62828]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setCancellingTripId(null)}
                  className="px-3 py-1.5 text-xs font-medium rounded text-[#667085] hover:text-[#1D2433]"
                >
                  Keep Mission
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-1.5 text-xs font-semibold rounded bg-[#C62828] hover:bg-[#B71C1C] text-white disabled:opacity-50"
                >
                  Confirm Cancellation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TripsPage;

