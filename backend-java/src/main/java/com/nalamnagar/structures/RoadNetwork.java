package com.nalamnagar.structures;

import com.nalamnagar.model.Location;
import com.nalamnagar.model.Road;

import java.util.*;

/**
 * DATA STRUCTURE 1: Graph as an Adjacency List (Map<String, List<Road>>).
 * JUSTIFICATION:
 * - The road network of Nalam Nagar is sparse (|E| << |V|^2), connecting 10-15 locations.
 * - Storing edges as an adjacency list guarantees O(V + E) space efficiency compared
 *   to an adjacency matrix which wastes O(V^2) memory.
 * - Finding all incident roads for a location takes O(deg(V)) time, optimal for Dijkstra.
 *
 * DATA STRUCTURE 2: Dijkstra's Algorithm with a Min-Heap (PriorityQueue).
 * JUSTIFICATION:
 * - Optimization criterion everywhere is TRAVEL TIME (in minutes), all weights are positive.
 * - Dijkstra's algorithm is mathematically proven to find the global minimum travel time.
 * - Using a binary min-heap PriorityQueue achieves O((V + E) log V) time complexity.
 * - Automatically excludes roads marked closed (road.isClosed() == true).
 * - Reconstructs the complete path using a predecessor map.
 */
public class RoadNetwork {
    // Map for O(1) vertex existence and location lookup
    private final Map<String, Location> locations = new HashMap<>();

    // Map for O(1) road lookup by ID
    private final Map<String, Road> roadsById = new HashMap<>();

    // Adjacency list: Source Location ID -> List of outgoing Road segments
    private final Map<String, List<Road>> adjacencyList = new HashMap<>();

    // Set of closed road IDs for fast lookup
    private final Set<String> closedRoadIds = new HashSet<>();

    public RoadNetwork() {}

    /**
     * Adds a location node to the road network graph.
     */
    public void addLocation(Location location) {
        if (location == null) return;
        locations.put(location.getId(), location);
        adjacencyList.putIfAbsent(location.getId(), new ArrayList<>());
    }

    /**
     * Adds a road edge to the graph (supports bi-directional addition).
     */
    public void addRoad(Road road, boolean bidirectional) {
        if (road == null) return;
        roadsById.put(road.getId(), road);
        if (road.isClosed()) {
            closedRoadIds.add(road.getId());
        }

        adjacencyList.putIfAbsent(road.getSourceId(), new ArrayList<>());
        adjacencyList.get(road.getSourceId()).add(road);

        if (bidirectional) {
            // Create return road with same travel time
            String reverseId = road.getId() + "-R";
            Road reverseRoad = new Road(reverseId, road.getDestinationId(), road.getSourceId(), road.getBaseMinutes());
            roadsById.put(reverseId, reverseRoad);
            adjacencyList.putIfAbsent(road.getDestinationId(), new ArrayList<>());
            adjacencyList.get(road.getDestinationId()).add(reverseRoad);
        }
    }

    public Location getLocation(String id) {
        return locations.get(id);
    }

    public Collection<Location> getAllLocations() {
        return Collections.unmodifiableCollection(locations.values());
    }

    public Road getRoad(String id) {
        return roadsById.get(id);
    }

    public Collection<Road> getAllRoads() {
        return Collections.unmodifiableCollection(roadsById.values());
    }

    public List<Road> getOutgoingRoads(String locationId) {
        return adjacencyList.getOrDefault(locationId, Collections.emptyList());
    }

    /**
     * Sets dynamic travel time for a road segment (e.g. traffic congestion).
     */
    public void updateRoadTraffic(String roadId, double travelTimeMinutes) {
        Road road = roadsById.get(roadId);
        if (road == null) {
            throw new IllegalArgumentException("Road not found: " + roadId);
        }
        road.setCurrentMinutes(travelTimeMinutes);

        // Also update paired reverse road if it exists
        Road rev = roadsById.get(roadId + "-R");
        if (rev != null) {
            rev.setCurrentMinutes(travelTimeMinutes);
        }
    }

    /**
     * Closes a road segment and excludes it from shortest path routing.
     */
    public void closeRoad(String roadId, String reason) {
        Road road = roadsById.get(roadId);
        if (road == null) {
            throw new IllegalArgumentException("Road not found: " + roadId);
        }
        road.setClosed(true, reason);
        closedRoadIds.add(roadId);

        Road rev = roadsById.get(roadId + "-R");
        if (rev != null) {
            rev.setClosed(true, reason);
            closedRoadIds.add(rev.getId());
        }
    }

    /**
     * Reopens a previously closed road segment.
     */
    public void reopenRoad(String roadId) {
        Road road = roadsById.get(roadId);
        if (road == null) {
            throw new IllegalArgumentException("Road not found: " + roadId);
        }
        road.setClosed(false, "");
        closedRoadIds.remove(roadId);

        Road rev = roadsById.get(roadId + "-R");
        if (rev != null) {
            rev.setClosed(false, "");
            closedRoadIds.remove(rev.getId());
        }
    }

    public Set<String> getClosedRoadIds() {
        return Collections.unmodifiableSet(closedRoadIds);
    }

    /**
     * DIJKSTRA'S SHORTEST PATH ALGORITHM
     * Computes the path with lowest total TRAVEL TIME between source and destination.
     * Closed roads are strictly skipped.
     *
     * @param sourceId Location ID to start from.
     * @param targetId Location ID to reach.
     * @return RouteResult with ordered nodes and travel time in minutes.
     */
    public RouteResult findShortestRoute(String sourceId, String targetId) {
        if (sourceId == null || targetId == null) {
            return RouteResult.unreachable();
        }
        if (!locations.containsKey(sourceId) || !locations.containsKey(targetId)) {
            return RouteResult.unreachable();
        }
        if (sourceId.equals(targetId)) {
            return new RouteResult(Collections.singletonList(sourceId), 0.0, true);
        }

        // Distance map: Location ID -> Minimum travel time from source
        Map<String, Double> minTimeTo = new HashMap<>();
        for (String locId : locations.keySet()) {
            minTimeTo.put(locId, Double.POSITIVE_INFINITY);
        }
        minTimeTo.put(sourceId, 0.0);

        // Predecessor map for path reconstruction
        Map<String, String> predecessor = new HashMap<>();

        // PriorityQueue (Min-Heap) ordered by cumulative travel time
        PriorityQueue<NodeEntry> pq = new PriorityQueue<>(Comparator.comparingDouble(NodeEntry::getTime));
        pq.add(new NodeEntry(sourceId, 0.0));

        Set<String> visited = new HashSet<>();

        while (!pq.isEmpty()) {
            NodeEntry current = pq.poll();
            String u = current.getLocationId();

            if (visited.contains(u)) {
                continue;
            }
            visited.add(u);

            // Reached target node
            if (u.equals(targetId)) {
                break;
            }

            // Iterate over outgoing edges
            List<Road> edges = adjacencyList.getOrDefault(u, Collections.emptyList());
            for (Road road : edges) {
                // RULE: Exclude closed roads from routing
                if (road.isClosed()) {
                    continue;
                }

                String v = road.getDestinationId();
                if (visited.contains(v)) {
                    continue;
                }

                double weight = road.getCurrentMinutes();
                double newTime = minTimeTo.get(u) + weight;

                if (newTime < minTimeTo.get(v)) {
                    minTimeTo.put(v, newTime);
                    predecessor.put(v, u);
                    pq.add(new NodeEntry(v, newTime));
                }
            }
        }

        // Target unreachable
        if (!predecessor.containsKey(targetId) && !sourceId.equals(targetId)) {
            return RouteResult.unreachable();
        }

        // Reconstruct path
        LinkedList<String> path = new LinkedList<>();
        String curr = targetId;
        while (curr != null) {
            path.addFirst(curr);
            curr = predecessor.get(curr);
        }

        return new RouteResult(path, minTimeTo.get(targetId), true);
    }

    /**
     * Helper entry class for Dijkstra's PriorityQueue.
     */
    private static class NodeEntry {
        private final String locationId;
        private final double time;

        public NodeEntry(String locationId, double time) {
            this.locationId = locationId;
            this.time = time;
        }

        public String getLocationId() {
            return locationId;
        }

        public double getTime() {
            return time;
        }
    }
}
