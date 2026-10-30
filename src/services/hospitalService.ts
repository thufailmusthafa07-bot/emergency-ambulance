import type { Hospital, HospitalStatus } from '../types/hospital';
import { loadHospitals, saveHospitals } from '../utils/storage';

export const hospitalService = {
  getHospitals: (): Hospital[] => {
    return loadHospitals();
  },

  getHospitalById: (id: string): Hospital | undefined => {
    return loadHospitals().find((h) => h.id === id);
  },

  updateHospitalBeds: (id: string, deltaAvailableBeds: number): Hospital | null => {
    const list = loadHospitals();
    const index = list.findIndex((h) => h.id === id);
    if (index === -1) return null;

    const current = list[index];
    const newAvail = Math.max(0, Math.min(current.totalBeds, current.availableBeds + deltaAvailableBeds));
    let status: HospitalStatus = current.status;

    if (newAvail === 0) status = 'Full';
    else if (newAvail < 5) status = 'Busy';
    else if (status === 'Full' || status === 'Busy') status = 'Available';

    const updated: Hospital = {
      ...current,
      availableBeds: newAvail,
      status,
      recentAdmissionsCount: deltaAvailableBeds < 0 ? current.recentAdmissionsCount + 1 : current.recentAdmissionsCount,
      lastUpdated: 'Just now',
    };

    list[index] = updated;
    saveHospitals(list);
    return updated;
  },

  createHospital: (data: Omit<Hospital, 'id' | 'lastUpdated' | 'recentAdmissionsCount'>): Hospital => {
    const list = loadHospitals();
    const newId = `H${String(list.length + 1).padStart(3, '0')}`;
    const newHospital: Hospital = {
      ...data,
      id: newId,
      recentAdmissionsCount: 0,
      lastUpdated: 'Just now',
    };
    const updated = [newHospital, ...list];
    saveHospitals(updated);
    return newHospital;
  },
};
