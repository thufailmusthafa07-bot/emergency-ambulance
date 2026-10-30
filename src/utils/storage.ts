import {
  INITIAL_AMBULANCES,
  INITIAL_EMERGENCY_REQUESTS,
  INITIAL_HOSPITALS,
  INITIAL_ROADS,
  INITIAL_TRIPS,
} from '../data/mockData';
import type { EmergencyRequest } from '../types/emergency';
import type { Ambulance } from '../types/ambulance';
import type { Hospital } from '../types/hospital';
import type { RoadEdge } from '../types/road';
import type { Trip } from '../types/trip';
import type { UserProfile } from '../types/user';

const STORAGE_KEYS = {
  USER: 'nalam_nagar_user',
  EMERGENCY_REQUESTS: 'nalam_nagar_emergencies',
  AMBULANCES: 'nalam_nagar_ambulances',
  HOSPITALS: 'nalam_nagar_hospitals',
  ROADS: 'nalam_nagar_roads',
  TRIPS: 'nalam_nagar_trips',
  SETTINGS: 'nalam_nagar_settings',
};

export function loadUser(): UserProfile | null {
  const data = localStorage.getItem(STORAGE_KEYS.USER);
  if (!data) return null;
  try {
    return JSON.parse(data);
  } catch {
    return null;
  }
}

export function saveUser(user: UserProfile | null) {
  if (!user) {
    localStorage.removeItem(STORAGE_KEYS.USER);
  } else {
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
  }
}

export function loadEmergencyRequests(): EmergencyRequest[] {
  const data = localStorage.getItem(STORAGE_KEYS.EMERGENCY_REQUESTS);
  if (!data) {
    saveEmergencyRequests(INITIAL_EMERGENCY_REQUESTS);
    return INITIAL_EMERGENCY_REQUESTS;
  }
  try {
    return JSON.parse(data);
  } catch {
    return INITIAL_EMERGENCY_REQUESTS;
  }
}

export function saveEmergencyRequests(requests: EmergencyRequest[]) {
  localStorage.setItem(STORAGE_KEYS.EMERGENCY_REQUESTS, JSON.stringify(requests));
}

export function loadAmbulances(): Ambulance[] {
  const data = localStorage.getItem(STORAGE_KEYS.AMBULANCES);
  if (!data) {
    saveAmbulances(INITIAL_AMBULANCES);
    return INITIAL_AMBULANCES;
  }
  try {
    return JSON.parse(data);
  } catch {
    return INITIAL_AMBULANCES;
  }
}

export function saveAmbulances(ambulances: Ambulance[]) {
  localStorage.setItem(STORAGE_KEYS.AMBULANCES, JSON.stringify(ambulances));
}

export function loadHospitals(): Hospital[] {
  const data = localStorage.getItem(STORAGE_KEYS.HOSPITALS);
  if (!data) {
    saveHospitals(INITIAL_HOSPITALS);
    return INITIAL_HOSPITALS;
  }
  try {
    return JSON.parse(data);
  } catch {
    return INITIAL_HOSPITALS;
  }
}

export function saveHospitals(hospitals: Hospital[]) {
  localStorage.setItem(STORAGE_KEYS.HOSPITALS, JSON.stringify(hospitals));
}

export function loadRoads(): RoadEdge[] {
  const data = localStorage.getItem(STORAGE_KEYS.ROADS);
  if (!data) {
    saveRoads(INITIAL_ROADS);
    return INITIAL_ROADS;
  }
  try {
    return JSON.parse(data);
  } catch {
    return INITIAL_ROADS;
  }
}

export function saveRoads(roads: RoadEdge[]) {
  localStorage.setItem(STORAGE_KEYS.ROADS, JSON.stringify(roads));
}

export function loadTrips(): Trip[] {
  const data = localStorage.getItem(STORAGE_KEYS.TRIPS);
  if (!data) {
    saveTrips(INITIAL_TRIPS);
    return INITIAL_TRIPS;
  }
  try {
    return JSON.parse(data);
  } catch {
    return INITIAL_TRIPS;
  }
}

export function saveTrips(trips: Trip[]) {
  localStorage.setItem(STORAGE_KEYS.TRIPS, JSON.stringify(trips));
}

export function resetDemoData() {
  saveEmergencyRequests(INITIAL_EMERGENCY_REQUESTS);
  saveAmbulances(INITIAL_AMBULANCES);
  saveHospitals(INITIAL_HOSPITALS);
  saveRoads(INITIAL_ROADS);
  saveTrips(INITIAL_TRIPS);
}
