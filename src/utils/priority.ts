import type { EmergencyRequest, SeverityLevel } from '../types/emergency';
import type { Ambulance } from '../types/ambulance';
import type { Hospital } from '../types/hospital';
import type { RoadEdge } from '../types/road';
import { findShortestRoute } from './dijkstra';

export function getSeverityRank(severity: SeverityLevel): number {
  switch (severity) {
    case 'CRITICAL':
      return 1;
    case 'SERIOUS':
      return 2;
    case 'MINOR':
      return 3;
    default:
      return 99;
  }
}

export function sortEmergencyRequestsByPriority(requests: EmergencyRequest[]): EmergencyRequest[] {
  return [...requests].sort((a, b) => {
    const rankA = getSeverityRank(a.severity);
    const rankB = getSeverityRank(b.severity);

    if (rankA !== rankB) {
      return rankA - rankB; // Lower rank = higher priority (1 before 2 before 3)
    }

    // Tie-breaker: oldest timestamp first (smaller timestamp ms)
    const timeA = new Date(a.createdAt).getTime();
    const timeB = new Date(b.createdAt).getTime();
    return timeA - timeB;
  });
}

export function findBestAmbulance(
  pickupLocation: string,
  ambulances: Ambulance[],
  roads: RoadEdge[]
): { ambulance: Ambulance; travelTimeMinutes: number; routePath: string[] } | null {
  const availableAmbulances = ambulances.filter((a) => a.status === 'Available');

  if (availableAmbulances.length === 0) return null;

  let bestAmbulance: Ambulance | null = null;
  let minTravelTime = Infinity;
  let bestPath: string[] = [];

  for (const ambulance of availableAmbulances) {
    const route = findShortestRoute(ambulance.currentLocation, pickupLocation, roads);
    if (route) {
      if (route.totalTravelTimeMinutes < minTravelTime) {
        minTravelTime = route.totalTravelTimeMinutes;
        bestAmbulance = ambulance;
        bestPath = route.path;
      }
    }
  }

  if (!bestAmbulance) return null;

  return {
    ambulance: bestAmbulance,
    travelTimeMinutes: minTravelTime,
    routePath: bestPath,
  };
}

export function findBestHospital(
  pickupLocation: string,
  hospitals: Hospital[],
  roads: RoadEdge[],
  emergencyType?: string
): { hospital: Hospital; travelTimeMinutes: number; routePath: string[] } | null {
  // Filter available hospitals with at least 1 bed
  const suitableHospitals = hospitals.filter(
    (h) => (h.status === 'Available' || h.status === 'Busy') && h.availableBeds > 0
  );

  if (suitableHospitals.length === 0) return null;

  let bestHospital: Hospital | null = null;
  let minTravelTime = Infinity;
  let bestPath: string[] = [];

  for (const hospital of suitableHospitals) {
    const route = findShortestRoute(pickupLocation, hospital.location, roads);
    if (route) {
      // Prioritize facilities if emergency type dictates special needs (e.g. burn, cardiac, trauma)
      let facilityBonus = 0;
      if (emergencyType === 'Fire injury' && hospital.facilities.burnUnit) facilityBonus = -2;
      if (emergencyType === 'Chest pain' && hospital.facilities.cardiacUnit) facilityBonus = -2;
      if (emergencyType === 'Road accident' && hospital.facilities.traumaCare) facilityBonus = -2;

      const adjustedTime = route.totalTravelTimeMinutes + facilityBonus;

      if (adjustedTime < minTravelTime) {
        minTravelTime = route.totalTravelTimeMinutes;
        bestHospital = hospital;
        bestPath = route.path;
      }
    }
  }

  if (!bestHospital) return null;

  return {
    hospital: bestHospital,
    travelTimeMinutes: minTravelTime,
    routePath: bestPath,
  };
}
