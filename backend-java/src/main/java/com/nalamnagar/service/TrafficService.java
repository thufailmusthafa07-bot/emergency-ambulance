package com.nalamnagar.service;

import com.nalamnagar.model.Trip;
import com.nalamnagar.structures.RoadNetwork;
import com.nalamnagar.structures.RouteResult;

import java.util.*;

/**
 * Service managing road traffic delays, road closures, reopenings,
 * and automatic route recalculation for all active trips.
 */
public class TrafficService {
    private final RoadNetwork roadNetwork;
    private final TripService tripService;

    public TrafficService(RoadNetwork roadNetwork, TripService tripService) {
        this.roadNetwork = roadNetwork;
        this.tripService = tripService;
    }

    /**
     * Updates road travel time (positive minutes only) and recalculates all active trips.
     */
    public List<String> updateTrafficDelay(String roadId, double travelTimeMinutes) {
        if (travelTimeMinutes <= 0) {
            throw new IllegalArgumentException("Travel time must be strictly positive (> 0 minutes)");
        }
        roadNetwork.updateRoadTraffic(roadId, travelTimeMinutes);
        return recalculateActiveTrips();
    }

    /**
     * Closes a road, excludes it from future Dijkstra routing, and recalculates active trips.
     */
    public List<String> closeRoad(String roadId, String reason) {
        roadNetwork.closeRoad(roadId, reason);
        return recalculateActiveTrips();
    }

    /**
     * Reopens a road and recalculates active trips.
     */
    public List<String> reopenRoad(String roadId) {
        roadNetwork.reopenRoad(roadId);
        return recalculateActiveTrips();
    }

    /**
     * CASE STUDY RULE 8:
     * After any closure or delay, recalculate the route of every ACTIVE trip.
     * Show old vs new route and time. If destination unreachable, flag trip "Route Blocked" instead of crashing.
     */
    public List<String> recalculateActiveTrips() {
        List<String> logMessages = new ArrayList<>();
        if (tripService == null) {
            return logMessages;
        }

        List<Trip> activeTrips = tripService.getActiveTrips();
        for (Trip trip : activeTrips) {
            double oldTotal = trip.getTotalEstimatedMinutes();
            List<String> oldIncPath = trip.getPathToIncident();
            List<String> oldHospPath = trip.getPathToHospital();

            String ambOrigin = oldIncPath.isEmpty() ? trip.getIncidentLocationId() : oldIncPath.get(0);

            // Recalculate Segment 1: Ambulance to Incident Location
            RouteResult newIncRoute = roadNetwork.findShortestRoute(ambOrigin, trip.getIncidentLocationId());
            // Recalculate Segment 2: Incident to Hospital Location
            RouteResult newHospRoute = roadNetwork.findShortestRoute(trip.getIncidentLocationId(), trip.getHospitalId());

            if (!newIncRoute.isReachable() || !newHospRoute.isReachable()) {
                trip.setBlocked(true);
                logMessages.add(String.format("Trip %s: Destination UNREACHABLE due to road closures! Flagged as [Route Blocked].", trip.getId()));
            } else {
                trip.setBlocked(false);
                trip.updateIncidentRoute(newIncRoute.getPath(), newIncRoute.getTotalTimeMinutes());
                trip.updateHospitalRoute(newHospRoute.getPath(), newHospRoute.getTotalTimeMinutes());
                double newTotal = trip.getTotalEstimatedMinutes();

                logMessages.add(String.format("Trip %s Recalculated: %.1f mins -> %.1f mins (Diff: %+.1f mins). New Path: %s -> %s",
                        trip.getId(), oldTotal, newTotal, (newTotal - oldTotal),
                        String.join("->", newIncRoute.getPath()), String.join("->", newHospRoute.getPath())));
            }
        }

        return logMessages;
    }
}
