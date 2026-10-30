import type { RoadEdge } from './road';

export interface RouteStep {
  fromLocation: string;
  toLocation: string;
  roadName: string;
  roadId: string;
  distanceKm: number;
  travelTimeMinutes: number;
  traffic: 'Low' | 'Moderate' | 'Heavy';
}

export interface CalculatedRoute {
  startLocation: string;
  destination: string;
  path: string[]; // sequence of location names
  roadsUsed: RoadEdge[];
  steps: RouteStep[];
  totalDistanceKm: number;
  totalTravelTimeMinutes: number;
  closedRoadsAvoidedCount: number;
  trafficConditionSummary: string;
  reasonForSelection: string;
  isAlternative?: boolean;
}
