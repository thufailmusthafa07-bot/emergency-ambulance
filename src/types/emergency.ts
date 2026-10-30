export type SeverityLevel = 'CRITICAL' | 'SERIOUS' | 'MINOR';

export type EmergencyType =
  | 'Road accident'
  | 'Chest pain'
  | 'Breathing difficulty'
  | 'Unconscious person'
  | 'Severe bleeding'
  | 'Pregnancy emergency'
  | 'Fire injury'
  | 'Stroke symptoms'
  | 'Fall injury'
  | 'Other emergency';

export type EmergencyStatus =
  | 'Pending'
  | 'Assigned'
  | 'Ambulance Dispatched'
  | 'At Scene'
  | 'Transporting'
  | 'Completed'
  | 'Cancelled';

export interface TimelineEvent {
  id: string;
  timestamp: string;
  status: EmergencyStatus;
  description: string;
  operator?: string;
}

export interface EmergencyRequest {
  id: string;
  callerName: string;
  contactNumber: string;
  emergencyType: EmergencyType;
  pickupLocation: string;
  severity: SeverityLevel;
  status: EmergencyStatus;
  createdAt: string;
  description: string;
  preferredHospitalId?: string;
  assignedAmbulanceId?: string;
  assignedHospitalId?: string;
  estimatedResponseTimeMinutes?: number;
  estimatedHospitalArrivalMinutes?: number;
  timeline: TimelineEvent[];
  notes?: string;
}
