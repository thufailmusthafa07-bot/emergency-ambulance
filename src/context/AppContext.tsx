import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';

export interface SystemStats {
  pendingTotal: number;
  pendingCritical: number;
  pendingSerious: number;
  pendingMinor: number;
  availableAmbulances: number;
  totalAmbulances: number;
  availableBeds: number;
  totalBeds: number;
  activeTrips: number;
  closedRoads: number;
  locationsCount: number;
  roadsCount: number;
  lastRecalculationEpoch: number;
}

export interface EmergencyCall {
  id: string;
  callerName: string;
  contactNumber: string;
  incidentLocationId: string;
  severity: 'CRITICAL' | 'SERIOUS' | 'MINOR';
  requiredFacility: string;
  description: string;
  createdAt: number;
  status: 'PENDING' | 'ASSIGNED' | 'DISPATCHED' | 'AT_SCENE' | 'TRANSPORTING' | 'COMPLETED' | 'CANCELLED';
  assignedAmbulanceId?: string | null;
  assignedHospitalId?: string | null;
}

export interface AmbulanceUnit {
  id: string;
  registrationNumber: string;
  driverName?: string;
  driverContact?: string;
  equipmentType?: string;
  isAvailable?: boolean;
  currentLocation?: string;
  currentLocationId: string;
  assignedHospitalId?: string | null;
  status: 'AVAILABLE' | 'DISPATCHED' | 'EN_ROUTE' | 'AT_SCENE' | 'TRANSPORTING' | 'MAINTENANCE' | 'OFF_DUTY';
  totalTripsCompleted: number;
}

export interface HospitalFacility {
  id: string;
  name: string;
  locationId: string;
  location?: string;
  address?: string;
  contactNumber?: string;
  type?: string;
  status?: string;
  totalBeds: number;
  availableBeds: number;
  capabilities: string[];
  facilities?: string[];
}

export interface TownLocation {
  id: string;
  name: string;
  zoneType: string;
  x: number;
  y: number;
}

export interface TownRoad {
  id: string;
  sourceId: string;
  destinationId: string;
  baseMinutes: number;
  currentMinutes: number;
  currentTraffic: 'LOW' | 'MODERATE' | 'HEAVY';
  closed: boolean;
  closureReason: string;
}

export interface MissionTrip {
  id: string;
  requestId: string;
  ambulanceId: string;
  hospitalId: string;
  incidentLocationId: string;
  pathToIncident: string[];
  timeToIncidentMinutes: number;
  pathToHospital: string[];
  timeToHospitalMinutes: number;
  totalMinutes: number;
  status: 'DISPATCHED' | 'EN_ROUTE_PICKUP' | 'AT_SCENE' | 'TRANSPORTING' | 'ARRIVED_HOSPITAL' | 'COMPLETED' | 'CANCELLED';
  completed: boolean;
  blocked: boolean;
  startTime: number;
  endTime?: number | null;
  reasoning: string;
}

interface AppContextType {
  stats: SystemStats | null;
  emergencies: EmergencyCall[];
  ambulances: AmbulanceUnit[];
  hospitals: HospitalFacility[];
  locations: TownLocation[];
  roads: TownRoad[];
  trips: MissionTrip[];
  isRefreshing: boolean;
  lastError: string | null;

  refreshAllData: () => Promise<void>;
  createEmergency: (data: {
    callerName: string;
    contactNumber: string;
    incidentLocationId: string;
    severity: string;
    requiredFacility: string;
    description: string;
  }) => Promise<EmergencyCall>;
  dispatchNext: () => Promise<MissionTrip>;
  dispatchSpecific: (requestId: string) => Promise<MissionTrip>;
  completeTrip: (tripId: string) => Promise<{ success: boolean; message: string }>;
  cancelTrip: (tripId: string, reason?: string) => Promise<{ success: boolean; message: string }>;
  updateTripStatus: (tripId: string, status: string, notes?: string) => Promise<{ success: boolean; message: string; trip?: any }>;
  updateAmbulanceStatus: (ambulanceId: string, status: string, currentLocation?: string) => Promise<AmbulanceUnit>;
  createAmbulance: (data: { registrationNumber: string; driverName: string; driverContact: string; currentLocation: string; equipmentType?: string; id?: string }) => Promise<AmbulanceUnit>;
  updateHospitalCapacity: (hospitalId: string, availableBeds: number, totalBeds?: number, status?: string) => Promise<HospitalFacility>;
  createHospital: (data: { name: string; address: string; location: string; contactNumber: string; type?: string; totalBeds: number; availableBeds?: number; facilities?: string[]; id?: string }) => Promise<HospitalFacility>;
  updateRoadTraffic: (roadId: string, travelTimeMinutes: number) => Promise<{ recalculations: string[] }>;
  updateRoadCondition: (roadId: string, currentTraffic: TownRoad['currentTraffic']) => Promise<void>;
  closeRoad: (roadId: string, reason: string) => Promise<{ recalculations: string[] }>;
  reopenRoad: (roadId: string) => Promise<{ recalculations: string[] }>;
  calculateRoute: (from: string, to: string) => Promise<{ reachable: boolean; totalMinutes: number; path: string[] }>;
  addLocation: (data: { id?: string; name: string; category?: string; xCoordinatesPercent?: number; yCoordinatesPercent?: number }) => Promise<TownLocation>;
  updateLocation: (id: string, updates: { name?: string; category?: string; xCoordinatesPercent?: number; yCoordinatesPercent?: number }) => Promise<TownLocation>;
  addRoadSegment: (data: { startLocation: string; endLocation: string; distanceKm: number; baseTravelTimeMinutes: number; speedLimitKmh?: number }) => Promise<TownRoad>;
  resetData: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const API_BASE = (import.meta.env.VITE_API_URL || '/api').replace(/\/api\/?$/, '');
const apiFetch = (path: string, options: RequestInit = {}) => {
  const headers = new Headers(options.headers);
  const rawToken = localStorage.getItem('nalam_nagar_token');
  const token = rawToken && rawToken !== 'undefined' && rawToken !== 'null' ? rawToken : null;
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  const url = API_BASE ? `${API_BASE}${cleanPath}` : cleanPath;
  return fetch(url, { ...options, headers });
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [emergencies, setEmergencies] = useState<EmergencyCall[]>([]);
  const [ambulances, setAmbulances] = useState<AmbulanceUnit[]>([]);
  const [hospitals, setHospitals] = useState<HospitalFacility[]>([]);
  const [locations, setLocations] = useState<TownLocation[]>([]);
  const [roads, setRoads] = useState<TownRoad[]>([]);
  const [trips, setTrips] = useState<MissionTrip[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const refreshInFlight = useRef(false);

  const refreshAllData = useCallback(async () => {
    if (refreshInFlight.current) return;
    refreshInFlight.current = true;
    setIsRefreshing(true);
    setLastError(null);
    try {
      const fetchJson = async (path: string) => {
        const response = await apiFetch(path);
        if (!response.ok) {
          if (response.status === 401) {
            localStorage.removeItem('nalam_nagar_token');
            localStorage.removeItem('nalam_nagar_user');
            window.dispatchEvent(new CustomEvent('nalam:unauthorized'));
          }
          throw new Error(`${response.status} ${response.statusText} while loading ${path}`);
        }
        return response.json();
      };
      const [statsRes, reqsRes, ambsRes, hospsRes, netRes, tripsRes] = await Promise.all([
        fetchJson('/api/stats'),
        fetchJson('/api/requests'),
        fetchJson('/api/ambulances'),
        fetchJson('/api/hospitals'),
        fetchJson('/api/network'),
        fetchJson('/api/trips'),
      ]);

      if (![reqsRes, ambsRes, hospsRes, tripsRes].every(Array.isArray)) {
        throw new Error('Backend returned an invalid operations data response');
      }

      setStats(statsRes);
      setEmergencies(reqsRes);
      setAmbulances(ambsRes);
      setHospitals(hospsRes);
      if (Array.isArray(netRes.locations)) {
        setLocations(netRes.locations.map((location: any, index: number, allLocations: any[]) => {
          const xPercent = Number(location.xCoordinatesPercent);
          const yPercent = Number(location.yCoordinatesPercent);
          const angle = (2 * Math.PI * index) / Math.max(allLocations.length, 1) - Math.PI / 2;

          return {
            ...location,
            zoneType: location.zoneType ?? location.category ?? location.type ?? 'Landmark',
            x: Number.isFinite(Number(location.x))
              ? Number(location.x)
              : Number.isFinite(xPercent)
                ? (xPercent / 100) * 720
                : 360 + Math.cos(angle) * 260,
            y: Number.isFinite(Number(location.y))
              ? Number(location.y)
              : Number.isFinite(yPercent)
                ? (yPercent / 100) * 540
                : 270 + Math.sin(angle) * 190,
          };
        }));
      }
      if (netRes.roads) setRoads(netRes.roads);
      setTrips(tripsRes);
    } catch (err: any) {
      console.warn('Backend sync warning:', err.message);
      if (err.message?.includes('401')) {
        setLastError('Authentication required: Session expired or invalid');
      } else {
        setLastError(`Backend sync failed: ${err.message || 'Unexpected response'}`);
      }
    } finally {
      refreshInFlight.current = false;
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    refreshAllData();
    // Keep multiple open pages below the backend request limit.
    const interval = setInterval(() => {
      refreshAllData();
    }, 30000);
    return () => clearInterval(interval);
  }, [refreshAllData]);

  const createEmergency = async (data: {
    callerName: string;
    contactNumber: string;
    incidentLocationId: string;
    severity: string;
    requiredFacility: string;
    description: string;
  }): Promise<EmergencyCall> => {
    const res = await apiFetch('/api/requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to create emergency request');
    }
    const created: EmergencyCall = await res.json();
    await refreshAllData();
    return created;
  };

  const dispatchNext = async (): Promise<MissionTrip> => {
    const res = await apiFetch('/api/dispatch/next', {
      method: 'POST',
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Dispatch operation failed');
    }
    await refreshAllData();
    return data;
  };

  const dispatchSpecific = async (requestId: string): Promise<MissionTrip> => {
    const res = await apiFetch(`/api/dispatch/${requestId}`, {
      method: 'POST',
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Dispatch operation failed');
    }
    await refreshAllData();
    return data;
  };

  const completeTrip = async (tripId: string): Promise<{ success: boolean; message: string }> => {
    const res = await apiFetch(`/api/trips/${tripId}/complete`, {
      method: 'POST',
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to complete trip');
    }
    await refreshAllData();
    return data;
  };

  const cancelTrip = async (tripId: string, reason?: string): Promise<{ success: boolean; message: string }> => {
    const res = await apiFetch(`/api/trips/${tripId}/cancel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to cancel trip');
    }
    await refreshAllData();
    return data;
  };

  const updateTripStatus = async (tripId: string, status: string, notes?: string): Promise<{ success: boolean; message: string; trip?: any }> => {
    const res = await apiFetch(`/api/trips/${tripId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, notes }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to update trip status');
    }
    await refreshAllData();
    return data;
  };

  const updateAmbulanceStatus = async (ambulanceId: string, status: string, currentLocation?: string): Promise<AmbulanceUnit> => {
    const res = await apiFetch(`/api/ambulances/${ambulanceId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, currentLocation }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to update ambulance status');
    }
    await refreshAllData();
    return data;
  };

  const createAmbulance = async (data: {
    registrationNumber: string;
    driverName: string;
    driverContact: string;
    currentLocation: string;
    equipmentType?: string;
    id?: string;
  }): Promise<AmbulanceUnit> => {
    const res = await apiFetch('/api/ambulances', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const result = await res.json();
    if (!res.ok) {
      throw new Error(result.error || 'Failed to create ambulance');
    }
    await refreshAllData();
    return result;
  };

  const updateHospitalCapacity = async (
    hospitalId: string,
    availableBeds: number,
    totalBeds?: number,
    status?: string
  ): Promise<HospitalFacility> => {
    const res = await apiFetch(`/api/hospitals/${hospitalId}/capacity`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ availableBeds, totalBeds, status }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to update hospital capacity');
    }
    await refreshAllData();
    return data;
  };

  const createHospital = async (data: {
    name: string;
    address: string;
    location: string;
    contactNumber: string;
    type?: string;
    totalBeds: number;
    availableBeds?: number;
    facilities?: string[];
    id?: string;
  }): Promise<HospitalFacility> => {
    const res = await apiFetch('/api/hospitals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const result = await res.json();
    if (!res.ok) {
      throw new Error(result.error || 'Failed to create hospital');
    }
    await refreshAllData();
    return result;
  };

  const updateRoadTraffic = async (roadId: string, travelTimeMinutes: number): Promise<{ recalculations: string[] }> => {
    const res = await apiFetch(`/api/roads/${roadId}/traffic`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentMinutes: travelTimeMinutes }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to update road traffic');
    }
    await refreshAllData();
    return data;
  };

  const updateRoadCondition = async (roadId: string, currentTraffic: TownRoad['currentTraffic']): Promise<void> => {
    const res = await apiFetch(`/api/roads/${roadId}/traffic`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ traffic: currentTraffic }),
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Failed to update road traffic condition');
    }
    await refreshAllData();
  };

  const closeRoad = async (roadId: string, reason: string): Promise<{ recalculations: string[] }> => {
    const res = await apiFetch(`/api/roads/${roadId}/close`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to close road');
    }
    await refreshAllData();
    return data;
  };

  const reopenRoad = async (roadId: string): Promise<{ recalculations: string[] }> => {
    const res = await apiFetch(`/api/roads/${roadId}/open`, {
      method: 'POST',
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to reopen road');
    }
    await refreshAllData();
    return data;
  };

  const calculateRoute = async (from: string, to: string): Promise<{ reachable: boolean; totalMinutes: number; path: string[] }> => {
    const res = await apiFetch(`/api/route?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`);
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Route calculation failed');
    }
    return data;
  };

  const addLocation = async (data: { id?: string; name: string; category?: string; xCoordinatesPercent?: number; yCoordinatesPercent?: number }): Promise<TownLocation> => {
    const res = await apiFetch('/api/network/locations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const result = await res.json();
    if (!res.ok) {
      throw new Error(result.error || 'Failed to add location');
    }
    await refreshAllData();
    return result;
  };

  const updateLocation = async (id: string, updates: { name?: string; category?: string; xCoordinatesPercent?: number; yCoordinatesPercent?: number }): Promise<TownLocation> => {
    const res = await apiFetch(`/api/network/locations/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    const result = await res.json();
    if (!res.ok) {
      throw new Error(result.error || 'Failed to update location');
    }
    await refreshAllData();
    return result;
  };

  const addRoadSegment = async (data: { startLocation: string; endLocation: string; distanceKm: number; baseTravelTimeMinutes: number; speedLimitKmh?: number }): Promise<TownRoad> => {
    const res = await apiFetch('/api/network/roads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const result = await res.json();
    if (!res.ok) {
      throw new Error(result.error || 'Failed to add road segment');
    }
    await refreshAllData();
    return result;
  };

  const resetData = async (): Promise<void> => {
    const res = await apiFetch('/api/reset', { method: 'POST' });
    if (!res.ok) {
      throw new Error('Failed to reset dataset');
    }
    await refreshAllData();
  };

  return (
    <AppContext.Provider
      value={{
        stats,
        emergencies,
        ambulances,
        hospitals,
        locations,
        roads,
        trips,
        isRefreshing,
        lastError,
        refreshAllData,
        createEmergency,
        dispatchNext,
        dispatchSpecific,
        completeTrip,
        cancelTrip,
        updateTripStatus,
        updateAmbulanceStatus,
        createAmbulance,
        updateHospitalCapacity,
        createHospital,
        updateRoadTraffic,
        updateRoadCondition,
        closeRoad,
        reopenRoad,
        calculateRoute,
        addLocation,
        updateLocation,
        addRoadSegment,
        resetData,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
