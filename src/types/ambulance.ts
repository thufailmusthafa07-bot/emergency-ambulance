export type AmbulanceStatus =
  | 'Available'
  | 'Busy'
  | 'Dispatched'
  | 'En Route'
  | 'At Scene'
  | 'Transporting'
  | 'At Hospital'
  | 'Maintenance';

export type EquipmentType = 'Advanced Life Support (ALS)' | 'Basic Life Support (BLS)' | 'Critical Care Unit (CCU)';

export interface Ambulance {
  id: string; // e.g. A001
  registrationNumber: string;
  driverName: string;
  driverContact: string;
  currentLocation: string; // matches one of 12 location names
  status: AmbulanceStatus;
  equipmentType: EquipmentType;
  assignedRequestId?: string;
  assignedHospitalId?: string;
  estimatedArrivalMinutes?: number;
  lastUpdated: string;
}
