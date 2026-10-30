import type { Ambulance, AmbulanceStatus } from '../types/ambulance';
import { loadAmbulances, saveAmbulances } from '../utils/storage';

export const ambulanceService = {
  getAmbulances: (): Ambulance[] => {
    return loadAmbulances();
  },

  getAmbulanceById: (id: string): Ambulance | undefined => {
    return loadAmbulances().find((a) => a.id === id);
  },

  updateAmbulanceStatus: (
    id: string,
    status: AmbulanceStatus,
    location?: string,
    assignedRequestId?: string,
    assignedHospitalId?: string
  ): Ambulance | null => {
    const list = loadAmbulances();
    const index = list.findIndex((a) => a.id === id);
    if (index === -1) return null;

    const current = list[index];
    const updated: Ambulance = {
      ...current,
      status,
      currentLocation: location || current.currentLocation,
      assignedRequestId: status === 'Available' ? undefined : assignedRequestId || current.assignedRequestId,
      assignedHospitalId: status === 'Available' ? undefined : assignedHospitalId || current.assignedHospitalId,
      lastUpdated: 'Just now',
    };

    list[index] = updated;
    saveAmbulances(list);
    return updated;
  },

  createAmbulance: (data: Omit<Ambulance, 'lastUpdated'>): Ambulance => {
    const list = loadAmbulances();
    const newAmbulance: Ambulance = {
      ...data,
      lastUpdated: 'Just now',
    };
    const updated = [newAmbulance, ...list];
    saveAmbulances(updated);
    return newAmbulance;
  },
};
