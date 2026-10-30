import type { Trip, TripStatus } from '../types/trip';
import { loadTrips, saveTrips } from '../utils/storage';
import { ambulanceService } from './ambulanceService';
import { emergencyService } from './emergencyService';
import { hospitalService } from './hospitalService';

export const tripService = {
  getTrips: (): Trip[] => {
    return loadTrips();
  },

  getTripById: (id: string): Trip | undefined => {
    return loadTrips().find((t) => t.id === id);
  },

  createTrip: (data: Omit<Trip, 'id' | 'startTime' | 'timeline'>): Trip => {
    const trips = loadTrips();
    const newId = `TRP-2026-${String(trips.length + 1).padStart(3, '0')}`;
    const nowIso = new Date().toISOString();

    const newTrip: Trip = {
      ...data,
      id: newId,
      startTime: nowIso,
      timeline: [
        {
          status: 'Dispatched',
          timestamp: 'Just now',
          description: `Dispatch confirmed for Request ${data.requestId}. Unit ${data.ambulanceId} assigned.`,
        },
      ],
    };

    const updated = [newTrip, ...trips];
    saveTrips(updated);
    return newTrip;
  },

  updateTripStatus: (tripId: string, newStatus: TripStatus, description?: string): Trip | null => {
    const trips = loadTrips();
    const index = trips.findIndex((t) => t.id === tripId);
    if (index === -1) return null;

    const currentTrip = trips[index];
    const updatedTrip: Trip = {
      ...currentTrip,
      status: newStatus,
      actualCompletionTime: newStatus === 'Completed' ? new Date().toISOString() : currentTrip.actualCompletionTime,
      timeline: [
        {
          status: newStatus,
          timestamp: 'Just now',
          description: description || `Trip status updated to ${newStatus}`,
        },
        ...currentTrip.timeline,
      ],
    };

    trips[index] = updatedTrip;
    saveTrips(trips);

    // Cascading state sync according to project logic rules!
    if (newStatus === 'En Route') {
      ambulanceService.updateAmbulanceStatus(currentTrip.ambulanceId, 'En Route');
      emergencyService.updateRequestStatus(currentTrip.requestId, 'Ambulance Dispatched', 'Ambulance en route to pickup');
    } else if (newStatus === 'At Scene') {
      ambulanceService.updateAmbulanceStatus(currentTrip.ambulanceId, 'At Scene');
      emergencyService.updateRequestStatus(currentTrip.requestId, 'At Scene', 'Ambulance arrived at pickup location');
    } else if (newStatus === 'Transporting') {
      ambulanceService.updateAmbulanceStatus(currentTrip.ambulanceId, 'Transporting');
      emergencyService.updateRequestStatus(currentTrip.requestId, 'Transporting', 'Patient undergoing transport to hospital');
    } else if (newStatus === 'At Hospital') {
      ambulanceService.updateAmbulanceStatus(currentTrip.ambulanceId, 'At Hospital');
      emergencyService.updateRequestStatus(currentTrip.requestId, 'Transporting', 'Patient arrived at hospital emergency bay');
    } else if (newStatus === 'Completed') {
      // 1. Ambulance status becomes Available at hospital location!
      ambulanceService.updateAmbulanceStatus(currentTrip.ambulanceId, 'Available', currentTrip.destinationHospital);
      // 2. Emergency request status becomes Completed!
      emergencyService.updateRequestStatus(currentTrip.requestId, 'Completed', 'Patient admitted. Emergency trip completed.');
      // 3. Hospital bed count is decremented by 1!
      hospitalService.updateHospitalBeds(currentTrip.hospitalId, -1);
    } else if (newStatus === 'Cancelled') {
      ambulanceService.updateAmbulanceStatus(currentTrip.ambulanceId, 'Available');
      emergencyService.updateRequestStatus(currentTrip.requestId, 'Cancelled', 'Emergency trip cancelled');
    }

    return updatedTrip;
  },
};
