import { api } from './api';
import type { EmergencyRequest, EmergencyStatus, SeverityLevel } from '../types/emergency';
import type { Ambulance, AmbulanceStatus, EquipmentType } from '../types/ambulance';
import type { Hospital, HospitalStatus, HospitalType } from '../types/hospital';
import type { RoadEdge, RoadStatus, TrafficLevel } from '../types/road';
import type { Trip, TripStatus } from '../types/trip';
import {
  loadEmergencyRequests,
  saveEmergencyRequests,
  loadAmbulances,
  saveAmbulances,
  loadHospitals,
  saveHospitals,
  loadRoads,
  saveRoads,
  loadTrips,
  saveTrips,
} from '../utils/storage';

// Status Normalizers
function normalizeEmergencyStatus(status: string): EmergencyStatus {
  const s = (status || '').toUpperCase();
  if (s.includes('ASSIGN')) return 'Assigned';
  if (s.includes('DISPATCH')) return 'Ambulance Dispatched';
  if (s.includes('AT_SCENE') || s.includes('SCENE')) return 'At Scene';
  if (s.includes('TRANSPORT')) return 'Transporting';
  if (s.includes('COMPLET')) return 'Completed';
  if (s.includes('CANCEL')) return 'Cancelled';
  return 'Pending';
}

function normalizeAmbulanceStatus(status: string): AmbulanceStatus {
  const s = (status || '').toUpperCase();
  if (s.includes('DISPATCH')) return 'Dispatched';
  if (s.includes('EN_ROUTE') || s.includes('ROUTE')) return 'En Route';
  if (s.includes('SCENE')) return 'At Scene';
  if (s.includes('TRANSPORT')) return 'Transporting';
  if (s.includes('HOSPITAL')) return 'At Hospital';
  if (s.includes('MAINT') || s.includes('OFF')) return 'Maintenance';
  if (s.includes('BUSY')) return 'Busy';
  return 'Available';
}

function normalizeHospitalStatus(status: string): HospitalStatus {
  const s = (status || '').toUpperCase();
  if (s.includes('HIGH')) return 'Busy';
  if (s.includes('CRITICAL') || s.includes('FULL')) return 'Full';
  if (s.includes('CLOSED')) return 'Temporarily Closed';
  return 'Available';
}

function normalizeTraffic(traffic: string): TrafficLevel {
  const t = (traffic || '').toUpperCase();
  if (t.includes('HEAVY') || t.includes('HIGH')) return 'Heavy';
  if (t.includes('MODERATE') || t.includes('MED')) return 'Moderate';
  return 'Low';
}

function normalizeRoadStatus(status: string): RoadStatus {
  const s = (status || '').toUpperCase();
  if (s.includes('CLOSE')) return 'Closed';
  if (s.includes('MAINT')) return 'Under Maintenance';
  return 'Open';
}

function normalizeTripStatus(status: string): TripStatus {
  const s = (status || '').toUpperCase();
  if (s.includes('EN_ROUTE') || s.includes('ROUTE')) return 'En Route';
  if (s.includes('SCENE')) return 'At Scene';
  if (s.includes('TRANSPORT')) return 'Transporting';
  if (s.includes('ARRIV') || s.includes('HOSPITAL')) return 'At Hospital';
  if (s.includes('COMPLET')) return 'Completed';
  if (s.includes('CANCEL')) return 'Cancelled';
  return 'Dispatched';
}

export const backendSyncService = {
  /**
   * Fetch all emergencies from backend API
   */
  async fetchEmergencies(): Promise<EmergencyRequest[]> {
    try {
      const res = await api.get<any[]>('/emergencies');
      if (res.success && Array.isArray(res.data) && res.data.length > 0) {
        const mapped: EmergencyRequest[] = res.data.map((item: any) => ({
          id: item.id,
          callerName: item.callerName || 'Unknown Caller',
          contactNumber: item.contactNumber || 'N/A',
          emergencyType: item.emergencyType || 'General Emergency',
          pickupLocation: item.pickupLocation || 'Central Junction',
          severity: (item.severity?.toUpperCase() || 'SERIOUS') as SeverityLevel,
          status: normalizeEmergencyStatus(item.status),
          createdAt: item.createdAt || new Date().toISOString(),
          description: item.dispatchNotes || 'Reported emergency request.',
          timeline: Array.isArray(item.statusHistory) && item.statusHistory.length > 0
            ? item.statusHistory.map((h: any) => ({
                id: h.id || `th-${Math.random()}`,
                timestamp: h.changedAt ? new Date(h.changedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recent',
                status: normalizeEmergencyStatus(h.status),
                description: `Status changed by ${h.changedBy || 'System Operator'}`,
              }))
            : [
                {
                  id: `th-${Date.now()}`,
                  timestamp: 'Recent',
                  status: normalizeEmergencyStatus(item.status),
                  description: 'Emergency logged in system.',
                },
              ],
        }));
        saveEmergencyRequests(mapped);
        return mapped;
      }
    } catch (err) {
      console.warn('API error fetching emergencies, fallback to cache', err);
    }
    return loadEmergencyRequests();
  },

  /**
   * Fetch all ambulances from backend API
   */
  async fetchAmbulances(): Promise<Ambulance[]> {
    try {
      const res = await api.get<any[]>('/ambulances');
      if (res.success && Array.isArray(res.data) && res.data.length > 0) {
        const mapped: Ambulance[] = res.data.map((item: any) => ({
          id: item.id,
          registrationNumber: item.registrationNumber,
          driverName: item.driverName,
          driverContact: item.driverContact,
          currentLocation: item.currentLocation || 'Central Junction',
          status: normalizeAmbulanceStatus(item.status),
          equipmentType: (item.equipmentType?.includes('ALS')
            ? 'Advanced Life Support (ALS)'
            : item.equipmentType?.includes('CCU')
            ? 'Critical Care Unit (CCU)'
            : 'Basic Life Support (BLS)') as EquipmentType,
          lastUpdated: 'Live Telemetry',
        }));
        saveAmbulances(mapped);
        return mapped;
      }
    } catch (err) {
      console.warn('API error fetching ambulances, fallback to cache', err);
    }
    return loadAmbulances();
  },

  /**
   * Fetch all hospitals from backend API
   */
  async fetchHospitals(): Promise<Hospital[]> {
    try {
      const res = await api.get<any[]>('/hospitals');
      if (res.success && Array.isArray(res.data) && res.data.length > 0) {
        const mapped: Hospital[] = res.data.map((item: any) => {
          const avail = item.availableBeds ?? 20;
          return {
            id: item.id,
            name: item.name,
            address: item.address,
            location: item.location || 'Hospital Area',
            contactNumber: item.contactNumber,
            type: (item.type?.includes('Trauma') ? 'Trauma' : 'General') as HospitalType,
            totalBeds: item.totalBeds || 100,
            availableBeds: avail,
            icuBedsAvailable: Math.max(1, Math.floor(avail * 0.25)),
            status: normalizeHospitalStatus(item.status),
            facilities: {
              icu: true,
              traumaCare: true,
              cardiacUnit: true,
              burnUnit: (item.facilities || []).includes('Burn Unit'),
              maternityCare: true,
              pediatricEmergency: true,
            },
            recentAdmissionsCount: Math.max(1, Math.floor((item.totalBeds - avail) * 0.1)),
            lastUpdated: 'Live Telemetry',
          };
        });
        saveHospitals(mapped);
        return mapped;
      }
    } catch (err) {
      console.warn('API error fetching hospitals, fallback to cache', err);
    }
    return loadHospitals();
  },

  /**
   * Fetch roads from backend API
   */
  async fetchRoads(): Promise<RoadEdge[]> {
    try {
      const res = await api.get<any[]>('/roads');
      if (res.success && Array.isArray(res.data) && res.data.length > 0) {
        const mapped: RoadEdge[] = res.data.map((item: any) => ({
          id: item.id,
          name: `${item.startLocation} ↔ ${item.endLocation}`,
          startLocation: item.startLocation,
          endLocation: item.endLocation,
          distanceKm: item.distanceKm,
          baseTravelTimeMinutes: item.baseTravelTimeMinutes,
          currentTraffic: normalizeTraffic(item.currentTraffic),
          status: normalizeRoadStatus(item.status),
          lastUpdated: 'Live Network',
        }));
        saveRoads(mapped);
        return mapped;
      }
    } catch (err) {
      console.warn('API error fetching roads, fallback to cache', err);
    }
    return loadRoads();
  },

  /**
   * Fetch trips from backend API
   */
  async fetchTrips(): Promise<Trip[]> {
    try {
      const res = await api.get<any[]>('/trips');
      if (res.success && Array.isArray(res.data) && res.data.length > 0) {
        const mapped: Trip[] = res.data.map((item: any) => ({
          id: item.id,
          requestId: item.requestId,
          ambulanceId: item.ambulanceId,
          hospitalId: item.hospitalId,
          pickupLocation: item.pickupLocation,
          destinationHospital: item.destinationHospital,
          driverName: item.ambulance?.driverName || 'Unit Driver',
          startTime: item.startTime ? new Date(item.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recent',
          estimatedArrivalHospital: item.estimatedDurationMinutes ? `${item.estimatedDurationMinutes} mins` : '15 mins',
          status: normalizeTripStatus(item.status),
          totalDistanceKm: item.distanceKm || 5.0,
          totalEstimatedMinutes: item.estimatedDurationMinutes || 15,
          routePath: item.routePath || [],
          timeline: (item.statusHistory || []).map((sh: any) => ({
            status: normalizeTripStatus(sh.status),
            timestamp: sh.timestamp ? new Date(sh.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recent',
            description: sh.notes || `Trip status: ${sh.status}`,
          })),
        }));
        saveTrips(mapped);
        return mapped;
      }
    } catch (err) {
      console.warn('API error fetching trips, fallback to cache', err);
    }
    return loadTrips();
  },

  /**
   * Create emergency on backend
   */
  async createEmergency(data: any): Promise<any> {
    try {
      const res = await api.post('/emergencies', data);
      return res;
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  },

  /**
   * Update emergency status on backend
   */
  async updateEmergencyStatus(id: string, status: string, notes?: string): Promise<any> {
    try {
      const res = await api.patch(`/emergencies/${id}/status`, { status, notes });
      return res;
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  },

  /**
   * Execute dispatch on backend
   */
  async executeDispatch(payload: {
    emergencyId: string;
    ambulanceId: string;
    hospitalId: string;
    routePath?: string[];
    estimatedDurationMinutes?: number;
  }): Promise<any> {
    try {
      const res = await api.post('/dispatch/execute', payload);
      return res;
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  },

  /**
   * Update ambulance status on backend
   */
  async updateAmbulanceStatus(id: string, status: string, currentLocation?: string): Promise<any> {
    try {
      const res = await api.patch(`/ambulances/${id}/status`, { status, currentLocation });
      return res;
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  },

  /**
   * Update hospital beds capacity on backend
   */
  async updateHospitalCapacity(id: string, availableBeds: number): Promise<any> {
    try {
      const res = await api.patch(`/hospitals/${id}/capacity`, { availableBeds });
      return res;
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  },

  /**
   * Update road traffic condition on backend
   */
  async updateRoadTraffic(id: string, traffic: string): Promise<any> {
    try {
      const res = await api.patch(`/roads/${id}/traffic`, { traffic });
      return res;
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  },

  /**
   * Update road status on backend
   */
  async updateRoadStatus(id: string, status: string): Promise<any> {
    try {
      const res = await api.patch(`/roads/${id}/status`, { status });
      return res;
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  },

  /**
   * Update trip status on backend
   */
  async updateTripStatus(id: string, status: string, notes?: string): Promise<any> {
    try {
      const res = await api.patch(`/trips/${id}/status`, { status, notes });
      return res;
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  },
};

export default backendSyncService;
