import type { EmergencyRequest, EmergencyStatus, SeverityLevel } from '../types/emergency';
import { loadEmergencyRequests, saveEmergencyRequests } from '../utils/storage';
import { sortEmergencyRequestsByPriority } from '../utils/priority';

export const emergencyService = {
  getRequests: (): EmergencyRequest[] => {
    return loadEmergencyRequests();
  },

  getRequestById: (id: string): EmergencyRequest | undefined => {
    const requests = loadEmergencyRequests();
    return requests.find((r) => r.id === id);
  },

  createRequest: (data: Omit<EmergencyRequest, 'id' | 'createdAt' | 'status' | 'timeline'>): EmergencyRequest => {
    const requests = loadEmergencyRequests();
    const newId = `REQ-2026-${String(requests.length + 1).padStart(3, '0')}`;
    const nowIso = new Date().toISOString();

    const newRequest: EmergencyRequest = {
      ...data,
      id: newId,
      createdAt: nowIso,
      status: 'Pending',
      timeline: [
        {
          id: `tl-${Date.now()}`,
          timestamp: 'Just now',
          status: 'Pending',
          description: `Emergency request registered. Emergency type: ${data.emergencyType}, Pickup: ${data.pickupLocation}`,
        },
      ],
    };

    const updated = [newRequest, ...requests];
    saveEmergencyRequests(updated);
    return newRequest;
  },

  updateRequestStatus: (
    id: string,
    status: EmergencyStatus,
    description?: string,
    assignedAmbulanceId?: string,
    assignedHospitalId?: string
  ): EmergencyRequest | null => {
    const requests = loadEmergencyRequests();
    const index = requests.findIndex((r) => r.id === id);
    if (index === -1) return null;

    const current = requests[index];
    const updatedRequest: EmergencyRequest = {
      ...current,
      status,
      assignedAmbulanceId: assignedAmbulanceId || current.assignedAmbulanceId,
      assignedHospitalId: assignedHospitalId || current.assignedHospitalId,
      timeline: [
        {
          id: `tl-${Date.now()}`,
          timestamp: 'Just now',
          status,
          description: description || `Status updated to ${status}`,
        },
        ...current.timeline,
      ],
    };

    requests[index] = updatedRequest;
    saveEmergencyRequests(requests);
    return updatedRequest;
  },

  updateSeverity: (id: string, severity: SeverityLevel): EmergencyRequest | null => {
    const requests = loadEmergencyRequests();
    const index = requests.findIndex((r) => r.id === id);
    if (index === -1) return null;

    requests[index] = {
      ...requests[index],
      severity,
      timeline: [
        {
          id: `tl-${Date.now()}`,
          timestamp: 'Just now',
          status: requests[index].status,
          description: `Severity adjusted to ${severity}`,
        },
        ...requests[index].timeline,
      ],
    };
    saveEmergencyRequests(requests);
    return requests[index];
  },

  getSortedPriorityRequests: (): EmergencyRequest[] => {
    const requests = loadEmergencyRequests();
    const pendingOnly = requests.filter((r) => r.status === 'Pending');
    return sortEmergencyRequestsByPriority(pendingOnly);
  },
};
