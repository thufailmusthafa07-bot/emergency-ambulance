import type { RoadEdge, RoadStatus, TrafficLevel } from '../types/road';
import { loadRoads, saveRoads } from '../utils/storage';
import { MOCK_LOCATIONS } from '../data/mockData';

export const roadService = {
  getLocations: () => MOCK_LOCATIONS,

  getRoads: (): RoadEdge[] => {
    return loadRoads();
  },

  updateTraffic: (roadId: string, traffic: TrafficLevel): RoadEdge | null => {
    const roads = loadRoads();
    const index = roads.findIndex((r) => r.id === roadId);
    if (index === -1) return null;

    roads[index] = {
      ...roads[index],
      currentTraffic: traffic,
      lastUpdated: 'Just now',
    };
    saveRoads(roads);
    return roads[index];
  },

  updateRoadStatus: (roadId: string, status: RoadStatus, reason?: string): RoadEdge | null => {
    const roads = loadRoads();
    const index = roads.findIndex((r) => r.id === roadId);
    if (index === -1) return null;

    roads[index] = {
      ...roads[index],
      status,
      closureReason: status === 'Closed' ? reason || 'Emergency maintenance' : undefined,
      lastUpdated: 'Just now',
    };
    saveRoads(roads);
    return roads[index];
  },

  resetRoadData: () => {
    const roads = loadRoads();
    const reset = roads.map((r) => ({
      ...r,
      currentTraffic: 'Low' as TrafficLevel,
      status: 'Open' as RoadStatus,
      lastUpdated: 'Just now',
    }));
    saveRoads(reset);
    return reset;
  },
};
