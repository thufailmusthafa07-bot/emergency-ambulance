import type { CalculatedRoute } from '../types/route';
import { findShortestRoute } from '../utils/dijkstra';
import { loadRoads } from '../utils/storage';

export const routeService = {
  calculateRoute: (
    startLocation: string,
    destination: string,
    options: { avoidClosed?: boolean; considerTraffic?: boolean } = { avoidClosed: true, considerTraffic: true }
  ): CalculatedRoute | null => {
    const roads = loadRoads();
    return findShortestRoute(startLocation, destination, roads, options);
  },

  getAlternativeRoute: (
    startLocation: string,
    destination: string,
    primaryPathRoadIds: string[]
  ): CalculatedRoute | null => {
    const roads = loadRoads();
    // Filter out the primary path's busiest road segment to force alternative graph search
    const filteredRoads = roads.filter((r) => !primaryPathRoadIds.includes(r.id));
    const altRoute = findShortestRoute(startLocation, destination, filteredRoads, {
      avoidClosed: true,
      considerTraffic: true,
    });

    if (altRoute) {
      return {
        ...altRoute,
        isAlternative: true,
        reasonForSelection: `Alternative route bypassing main corridor segment (${altRoute.totalTravelTimeMinutes} mins).`,
      };
    }
    return null;
  },
};
