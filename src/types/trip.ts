export type TripStatus =
  | 'Dispatched'
  | 'En Route'
  | 'At Scene'
  | 'Transporting'
  | 'At Hospital'
  | 'Completed'
  | 'Cancelled';

export interface TripTimelineStep {
  status: TripStatus;
  timestamp: string;
  description: string;
}

export interface Trip {
  id: string; // e.g. TRP-2026-001
  requestId: string;
  ambulanceId: string;
  hospitalId: string;
  pickupLocation: string;
  destinationHospital: string;
  driverName: string;
  startTime: string;
  estimatedArrivalHospital: string;
  actualCompletionTime?: string;
  status: TripStatus;
  totalDistanceKm: number;
  totalEstimatedMinutes: number;
  routePath: string[];
  timeline: TripTimelineStep[];
  notes?: string;
}
