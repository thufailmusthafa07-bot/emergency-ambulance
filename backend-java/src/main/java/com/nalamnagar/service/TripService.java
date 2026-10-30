package com.nalamnagar.service;

import com.nalamnagar.model.Trip;

import java.util.*;

/**
 * Service managing trip history log and active trip lifecycle.
 * Uses a LinkedList / ArrayDeque for FIFO audit logging.
 */
public class TripService {
    // HashMap for O(1) trip lookup by ID
    private final Map<String, Trip> tripsById = new HashMap<>();

    // LinkedList for preserving chronological trip history log
    private final List<Trip> tripHistory = new LinkedList<>();

    public synchronized void recordTrip(Trip trip) {
        if (trip != null) {
            tripsById.put(trip.getId(), trip);
            tripHistory.add(trip);
        }
    }

    public synchronized Trip getTrip(String id) {
        return tripsById.get(id);
    }

    public synchronized List<Trip> getActiveTrips() {
        List<Trip> active = new ArrayList<>();
        for (Trip trip : tripHistory) {
            if (!trip.isCompleted()) {
                active.add(trip);
            }
        }
        return Collections.unmodifiableList(active);
    }

    public synchronized List<Trip> getAllTrips() {
        return Collections.unmodifiableList(new ArrayList<>(tripHistory));
    }

    public synchronized void clear() {
        tripsById.clear();
        tripHistory.clear();
    }
}
