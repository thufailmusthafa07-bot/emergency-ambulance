export interface RoadEdge {
  startLocation: string;
  endLocation: string;
  distanceKm: number;
  baseTravelTimeMinutes: number;
  currentTraffic: 'LOW' | 'MODERATE' | 'HEAVY' | 'Low' | 'Moderate' | 'Heavy';
  status: 'OPEN' | 'CLOSED' | 'UNDER_MAINTENANCE' | 'Open' | 'Closed' | 'Under Maintenance';
  currentTravelTimeMinutes?: number | null;
  isOneWay?: boolean;
}

export interface RouteResult {
  reachable: boolean;
  path: string[];
  totalDistanceKm: number;
  totalTimeMinutes: number;
  trafficDelayMinutes: number;
}

export function calculateDijkstraPath(edges: RoadEdge[], startNode: string, endNode: string): RouteResult {
  if (startNode === endNode) {
    return {
      path: [startNode],
      reachable: true,
      totalDistanceKm: 0,
      totalTimeMinutes: 0,
      trafficDelayMinutes: 0,
    };
  }

  // Build adjacency list
  const graph: Map<string, Array<{ node: string; distance: number; time: number; baseTime: number }>> = new Map();

  const addEdge = (u: string, v: string, dist: number, baseTime: number, currentTime: number | null | undefined, traffic: string, status: string) => {
    if (status.toUpperCase() === 'CLOSED') return; // skip closed roads

    let trafficMultiplier = 1.0;
    const t = traffic.toUpperCase();
    if (t === 'MODERATE') trafficMultiplier = 1.4;
    if (t === 'HEAVY') trafficMultiplier = 2;
    if (status.toUpperCase() === 'UNDER_MAINTENANCE') trafficMultiplier += 0.5;

    const actualTime = currentTime ?? baseTime * trafficMultiplier;

    if (!graph.has(u)) graph.set(u, []);
    graph.get(u)!.push({ node: v, distance: dist, time: actualTime, baseTime });
  };

  for (const edge of edges) {
    addEdge(edge.startLocation, edge.endLocation, edge.distanceKm, edge.baseTravelTimeMinutes, edge.currentTravelTimeMinutes, edge.currentTraffic, edge.status);
    if (!edge.isOneWay) {
      addEdge(edge.endLocation, edge.startLocation, edge.distanceKm, edge.baseTravelTimeMinutes, edge.currentTravelTimeMinutes, edge.currentTraffic, edge.status);
    }
  }

  const distances: Map<string, number> = new Map();
  const times: Map<string, number> = new Map();
  const baseTimes: Map<string, number> = new Map();
  const previous: Map<string, string | null> = new Map();
  const unvisited: Set<string> = new Set();

  for (const node of graph.keys()) {
    distances.set(node, Infinity);
    times.set(node, Infinity);
    baseTimes.set(node, Infinity);
    previous.set(node, null);
    unvisited.add(node);
  }

  // Include start and end nodes even if not in edge list
  if (!graph.has(startNode)) unvisited.add(startNode);
  if (!graph.has(endNode)) unvisited.add(endNode);

  distances.set(startNode, 0);
  times.set(startNode, 0);
  baseTimes.set(startNode, 0);

  while (unvisited.size > 0) {
    // Pick unvisited node with smallest time
    let current: string | null = null;
    let smallestTime = Infinity;

    for (const node of unvisited) {
      const time = times.get(node) ?? Infinity;
      if (time < smallestTime) {
        smallestTime = time;
        current = node;
      }
    }

    if (current === null || smallestTime === Infinity) break;
    if (current === endNode) break;

    unvisited.delete(current);

    const neighbors = graph.get(current) || [];
    for (const neighbor of neighbors) {
      if (!unvisited.has(neighbor.node)) continue;

      const altTime = (times.get(current) || 0) + neighbor.time;
      const altDist = (distances.get(current) || 0) + neighbor.distance;
      const altBaseTime = (baseTimes.get(current) || 0) + neighbor.baseTime;

      if (altTime < (times.get(neighbor.node) ?? Infinity)) {
        times.set(neighbor.node, altTime);
        distances.set(neighbor.node, altDist);
        baseTimes.set(neighbor.node, altBaseTime);
        previous.set(neighbor.node, current);
      }
    }
  }

  // Reconstruct path
  const path: string[] = [];
  let curr: string | null = endNode;

  while (curr !== null) {
    path.unshift(curr);
    curr = previous.get(curr) || null;
  }

  if (path.length === 1 && path[0] !== startNode) {
    return {
      reachable: false,
      path: [],
      totalDistanceKm: 0,
      totalTimeMinutes: 0,
      trafficDelayMinutes: 0,
    };
  }

  const totalTime = Math.round(times.get(endNode) || 0);
  const totalBase = Math.round(baseTimes.get(endNode) || 0);
  const totalDist = Math.round((distances.get(endNode) || 0) * 10) / 10;

  return {
    reachable: true,
    path,
    totalDistanceKm: totalDist,
    totalTimeMinutes: totalTime,
    trafficDelayMinutes: Math.max(0, totalTime - totalBase),
  };
}
