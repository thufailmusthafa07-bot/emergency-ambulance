import type { RoadEdge, TrafficLevel } from '../types/road';
import type { CalculatedRoute, RouteStep } from '../types/route';

interface GraphEdge {
  toLocation: string;
  road: RoadEdge;
  effectiveTimeMinutes: number;
}

export function getTrafficMultiplier(traffic: TrafficLevel): number {
  switch (traffic) {
    case 'Low':
      return 1.0;
    case 'Moderate':
      return 1.4;
    case 'Heavy':
      return 2.0;
    default:
      return 1.0;
  }
}

export function calculateEffectiveTravelTime(road: RoadEdge, considerTraffic = true): number {
  if (road.status === 'Closed' || road.status === 'Under Maintenance') {
    return Infinity;
  }
  const multiplier = considerTraffic ? getTrafficMultiplier(road.currentTraffic) : 1.0;
  return Math.round(road.baseTravelTimeMinutes * multiplier * 10) / 10;
}

export function findShortestRoute(
  startLocation: string,
  destination: string,
  roads: RoadEdge[],
  options: { avoidClosed?: boolean; considerTraffic?: boolean } = { avoidClosed: true, considerTraffic: true }
): CalculatedRoute | null {
  const { avoidClosed = true, considerTraffic = true } = options;

  if (!startLocation || !destination) return null;
  if (startLocation === destination) {
    return {
      startLocation,
      destination,
      path: [startLocation],
      roadsUsed: [],
      steps: [],
      totalDistanceKm: 0,
      totalTravelTimeMinutes: 0,
      closedRoadsAvoidedCount: 0,
      trafficConditionSummary: 'Start and destination are identical.',
      reasonForSelection: 'Zero distance trip.',
    };
  }

  // Build Adjacency List (Bi-directional edges)
  const graph: Map<string, GraphEdge[]> = new Map();
  let closedRoadsCount = 0;

  roads.forEach((road) => {
    if (avoidClosed && (road.status === 'Closed' || road.status === 'Under Maintenance')) {
      closedRoadsCount++;
      return; // Skip closed roads
    }

    const effTime = calculateEffectiveTravelTime(road, considerTraffic);
    if (effTime === Infinity) return;

    if (!graph.has(road.startLocation)) graph.set(road.startLocation, []);
    if (!graph.has(road.endLocation)) graph.set(road.endLocation, []);

    graph.get(road.startLocation)!.push({
      toLocation: road.endLocation,
      road,
      effectiveTimeMinutes: effTime,
    });
    graph.get(road.endLocation)!.push({
      toLocation: startLocation,
      road,
      effectiveTimeMinutes: effTime,
    });
  });

  // Dijkstra data structures
  const distances: Map<string, number> = new Map();
  const previousNodes: Map<string, { fromNode: string; edge: RoadEdge; time: number }> = new Map();
  const visited: Set<string> = new Set();

  // Initialize
  distances.set(startLocation, 0);

  const getUnvisitedLowestDistanceNode = (): string | null => {
    let lowestDistance = Infinity;
    let lowestNode: string | null = null;

    distances.forEach((dist, node) => {
      if (!visited.has(node) && dist < lowestDistance) {
        lowestDistance = dist;
        lowestNode = node;
      }
    });

    return lowestNode;
  };

  let currentNode = getUnvisitedLowestDistanceNode();

  while (currentNode) {
    const currentDistance = distances.get(currentNode)!;
    visited.add(currentNode);

    if (currentNode === destination) break;

    const neighbors = graph.get(currentNode) || [];

    for (const neighbor of neighbors) {
      if (visited.has(neighbor.toLocation)) continue;

      const newDistance = currentDistance + neighbor.effectiveTimeMinutes;
      const existingDistance = distances.get(neighbor.toLocation) ?? Infinity;

      if (newDistance < existingDistance) {
        distances.set(neighbor.toLocation, newDistance);
        previousNodes.set(neighbor.toLocation, {
          fromNode: currentNode,
          edge: neighbor.road,
          time: neighbor.effectiveTimeMinutes,
        });
      }
    }

    currentNode = getUnvisitedLowestDistanceNode();
  }

  if (!distances.has(destination) || distances.get(destination) === Infinity) {
    return null; // Route not reachable
  }

  // Reconstruct path
  const path: string[] = [];
  const steps: RouteStep[] = [];
  const roadsUsed: RoadEdge[] = [];
  let curr = destination;

  while (curr !== startLocation) {
    path.unshift(curr);
    const prevInfo = previousNodes.get(curr);
    if (!prevInfo) break;

    roadsUsed.unshift(prevInfo.edge);
    steps.unshift({
      fromLocation: prevInfo.fromNode,
      toLocation: curr,
      roadName: prevInfo.edge.name,
      roadId: prevInfo.edge.id,
      distanceKm: prevInfo.edge.distanceKm,
      travelTimeMinutes: prevInfo.time,
      traffic: prevInfo.edge.currentTraffic,
    });

    curr = prevInfo.fromNode;
  }
  path.unshift(startLocation);

  const totalDistanceKm = roadsUsed.reduce((sum, r) => sum + r.distanceKm, 0);
  const totalTravelTimeMinutes = Math.round(distances.get(destination)!);

  const heavyTrafficCount = roadsUsed.filter((r) => r.currentTraffic === 'Heavy').length;
  const modTrafficCount = roadsUsed.filter((r) => r.currentTraffic === 'Moderate').length;

  let trafficConditionSummary = 'Optimal clear traffic routes selected.';
  if (heavyTrafficCount > 0) {
    trafficConditionSummary = `Passes through ${heavyTrafficCount} heavy traffic segment(s).`;
  } else if (modTrafficCount > 0) {
    trafficConditionSummary = `Includes ${modTrafficCount} moderate traffic segment(s).`;
  }

  const reasonForSelection = `Selected by Dijkstra Algorithm as the fastest route (${totalTravelTimeMinutes} mins, ${Math.round(totalDistanceKm * 10) / 10} km) avoiding ${closedRoadsCount} closed road segment(s).`;

  return {
    startLocation,
    destination,
    path,
    roadsUsed,
    steps,
    totalDistanceKm: Math.round(totalDistanceKm * 10) / 10,
    totalTravelTimeMinutes,
    closedRoadsAvoidedCount: closedRoadsCount,
    trafficConditionSummary,
    reasonForSelection,
  };
}
