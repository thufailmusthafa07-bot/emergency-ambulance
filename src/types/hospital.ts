export type HospitalType = 'General' | 'Trauma' | 'Emergency' | 'Community';
export type HospitalStatus = 'Available' | 'Busy' | 'Full' | 'Temporarily Closed';

export interface EmergencyFacility {
  icu: boolean;
  traumaCare: boolean;
  cardiacUnit: boolean;
  burnUnit: boolean;
  maternityCare: boolean;
  pediatricEmergency: boolean;
}

export interface Hospital {
  id: string; // e.g. H001
  name: string;
  address: string;
  location: string; // matches one of 12 location names
  contactNumber: string;
  type: HospitalType;
  totalBeds: number;
  availableBeds: number;
  icuBedsAvailable: number;
  status: HospitalStatus;
  facilities: EmergencyFacility;
  recentAdmissionsCount: number;
  lastUpdated: string;
}
