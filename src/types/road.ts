export type TrafficLevel = 'Low' | 'Moderate' | 'Heavy';
export type RoadStatus = 'Open' | 'Closed' | 'Under Maintenance';

export interface LocationNode {
  id: string;
  name: string;
  category: 'Junction' | 'Hospital' | 'Landmark' | 'Transit';
  xCoordinatesPercent?: number; // for SVG canvas rendering
  yCoordinatesPercent?: number;
}

export interface RoadEdge {
  id: string; // e.g. R001
  name: string;
  startLocation: string;
  endLocation: string;
  distanceKm: number;
  baseTravelTimeMinutes: number;
  currentTraffic: TrafficLevel;
  status: RoadStatus;
  closureReason?: string;
  expectedReopenTime?: string;
  lastUpdated: string;
}
