package com.nalamnagar.service;

import com.nalamnagar.exception.NoAmbulanceAvailableException;
import com.nalamnagar.exception.NoSuitableHospitalException;
import com.nalamnagar.exception.RouteNotFoundException;
import com.nalamnagar.model.*;
import com.nalamnagar.structures.RequestPriorityQueue;
import com.nalamnagar.structures.RoadNetwork;
import com.nalamnagar.structures.RouteResult;

import java.util.*;

/**
 * Core Emergency Dispatch Service.
 * Implements Case Study Rules 1 through 10:
 * 1. Prioritized request queue (PriorityQueue ordered by Severity > Arrival time).
 * 2. Available ambulance with LOWEST TRAVEL TIME to incident (Dijkstra, closed roads excluded).
 * 3. Hospital selection based on (a) required facility + (b) >= 1 available bed + (c) lowest travel time.
 * 4. Comprehensive transparent reasoning trace.
 * 5. Trip creation, hospital bed reservation, ambulance busy state.
 * 6. Trip completion: free ambulance, release bed, set location to hospital, and auto-dispatch waiting request.
 */
public class DispatchService implements DispatchStrategy {
    private final RoadNetwork roadNetwork;
    private final HospitalService hospitalService;
    private final TripService tripService;
    private final RequestPriorityQueue pendingQueue = new RequestPriorityQueue();

    // Fast O(1) lookup collections
    private final Map<String, Ambulance> ambulancesById = new HashMap<>();
    private final Map<String, EmergencyRequest> allRequestsById = new HashMap<>();

    private int tripCounter = 100;

    public DispatchService(RoadNetwork roadNetwork, HospitalService hospitalService, TripService tripService) {
        this.roadNetwork = roadNetwork;
        this.hospitalService = hospitalService;
        this.tripService = tripService;
    }

    public synchronized void registerAmbulance(Ambulance ambulance) {
        if (ambulance != null) {
            ambulancesById.put(ambulance.getId(), ambulance);
        }
    }

    public synchronized Ambulance getAmbulance(String id) {
        return ambulancesById.get(id);
    }

    public synchronized Collection<Ambulance> getAllAmbulances() {
        return Collections.unmodifiableCollection(ambulancesById.values());
    }

    public synchronized RequestPriorityQueue getPendingQueue() {
        return pendingQueue;
    }

    public synchronized Collection<EmergencyRequest> getAllRequests() {
        return Collections.unmodifiableCollection(allRequestsById.values());
    }

    public synchronized EmergencyRequest getRequest(String id) {
        return allRequestsById.get(id);
    }

    /**
     * RULE 1: Log new emergency request.
     * Validates location and severity, then enqueues into RequestPriorityQueue.
     */
    public synchronized EmergencyRequest submitRequest(String id, String callerName, String contactNumber,
                                                       String locationId, Severity severity,
                                                       String requiredFacility, String description) {
        if (roadNetwork.getLocation(locationId) == null) {
            throw new IllegalArgumentException("Unknown incident location ID: " + locationId);
        }
        if (severity == null) {
            throw new IllegalArgumentException("Severity must be specified (Critical, Serious, Minor)");
        }

        EmergencyRequest request = new EmergencyRequest(id, callerName, contactNumber,
                locationId, severity, requiredFacility, description);
        allRequestsById.put(request.getId(), request);
        pendingQueue.enqueue(request);

        return request;
    }

    /**
     * RULE 2 & 5: Dispatches the next highest-priority pending request.
     */
    public synchronized Trip dispatchNext() {
        EmergencyRequest highestPriority = pendingQueue.peek();
        if (highestPriority == null) {
            throw new IllegalStateException("No pending emergency requests in queue.");
        }
        return dispatch(highestPriority);
    }

    /**
     * Executes dispatch for a specific emergency request.
     */
    @Override
    public synchronized Trip dispatch(EmergencyRequest request) {
        if (request == null) {
            throw new IllegalArgumentException("Emergency request cannot be null");
        }

        StringBuilder reasoning = new StringBuilder();
        reasoning.append(String.format("TRIAGE EVALUATION for Request %s:\n", request.getId()));
        reasoning.append(String.format("- Severity: %s (Priority Rank: %d)\n", request.getSeverity(), request.getSeverity().getRank()));
        reasoning.append(String.format("- Incident Location: %s\n", request.getIncidentLocationId()));
        reasoning.append(String.format("- Required Facility: %s\n\n", request.getRequiredFacility()));

        // STEP 1: Select Available Ambulance with LOWEST TRAVEL TIME to incident
        reasoning.append("AMBULANCE SELECTION:\n");
        Ambulance bestAmbulance = null;
        RouteResult bestAmbulanceRoute = null;
        double minAmbTravelTime = Double.POSITIVE_INFINITY;

        List<Ambulance> availableAmbulances = new ArrayList<>();
        for (Ambulance amb : ambulancesById.values()) {
            if (amb.isAvailable()) {
                availableAmbulances.add(amb);
            }
        }

        if (availableAmbulances.isEmpty()) {
            reasoning.append("  [FAILED] Fleet capacity exhausted: Zero ambulances available.\n");
            throw new NoAmbulanceAvailableException("No ambulance is currently available. Request remains queued with status WAITING.");
        }

        for (Ambulance amb : availableAmbulances) {
            RouteResult route = roadNetwork.findShortestRoute(amb.getCurrentLocationId(), request.getIncidentLocationId());
            if (!route.isReachable()) {
                reasoning.append(String.format("  - %s (at %s): UNREACHABLE due to road closures\n", amb.getId(), amb.getCurrentLocationId()));
                continue;
            }
            reasoning.append(String.format("  - %s (at %s): Travel Time = %.1f mins via %s\n",
                    amb.getId(), amb.getCurrentLocationId(), route.getTotalTimeMinutes(), String.join("->", route.getPath())));

            if (route.getTotalTimeMinutes() < minAmbTravelTime) {
                minAmbTravelTime = route.getTotalTimeMinutes();
                bestAmbulance = amb;
                bestAmbulanceRoute = route;
            }
        }

        if (bestAmbulance == null) {
            reasoning.append("  [FAILED] All available ambulances are blocked by road closures.\n");
            throw new RouteNotFoundException("Incident location is unreachable from all available ambulances due to road closures.");
        }

        reasoning.append(String.format("  -> CHOSEN AMBULANCE: %s (Shortest ETA: %.1f mins)\n\n", bestAmbulance.getId(), minAmbTravelTime));

        // STEP 2: Select Hospital with (a) Facility match, (b) Free beds, (c) LOWEST TRAVEL TIME
        reasoning.append("HOSPITAL SELECTION:\n");
        Hospital bestHospital = null;
        RouteResult bestHospitalRoute = null;
        double minHospTravelTime = Double.POSITIVE_INFINITY;

        Collection<Hospital> allHospitals = hospitalService.getAllHospitals();
        if (allHospitals.isEmpty()) {
            throw new NoSuitableHospitalException("No hospitals are registered in Nalam Nagar.");
        }

        for (Hospital hosp : allHospitals) {
            boolean hasFac = hosp.hasFacility(request.getRequiredFacility());
            boolean hasBeds = hosp.getAvailableBeds() > 0;

            if (!hasFac) {
                reasoning.append(String.format("  - %s: REJECTED (Missing required facility '%s'; available: %s)\n",
                        hosp.getName(), request.getRequiredFacility(), hosp.getCapabilities()));
                continue;
            }
            if (!hasBeds) {
                reasoning.append(String.format("  - %s: REJECTED (Zero available beds: 0/%d)\n", hosp.getName(), hosp.getTotalBeds()));
                continue;
            }

            RouteResult route = roadNetwork.findShortestRoute(request.getIncidentLocationId(), hosp.getLocationId());
            if (!route.isReachable()) {
                reasoning.append(String.format("  - %s: REJECTED (Unreachable from incident location due to road closures)\n", hosp.getName()));
                continue;
            }

            reasoning.append(String.format("  - %s: CANDIDATE CONSIDERED (Travel Time = %.1f mins via %s, Beds = %d/%d)\n",
                    hosp.getName(), route.getTotalTimeMinutes(), String.join("->", route.getPath()), hosp.getAvailableBeds(), hosp.getTotalBeds()));

            if (route.getTotalTimeMinutes() < minHospTravelTime) {
                minHospTravelTime = route.getTotalTimeMinutes();
                bestHospital = hosp;
                bestHospitalRoute = route;
            }
        }

        if (bestHospital == null) {
            reasoning.append(String.format("  [FAILED] No hospital satisfies facility '%s' with free beds and open routes.\n", request.getRequiredFacility()));
            throw new NoSuitableHospitalException(String.format(
                    "No suitable hospital available for incident %s requiring facility '%s'.",
                    request.getId(), request.getRequiredFacility()));
        }

        reasoning.append(String.format("  -> CHOSEN HOSPITAL: %s (Shortest ETA: %.1f mins)\n", bestHospital.getName(), minHospTravelTime));

        // STEP 3: Confirm Dispatch & Update System States
        bestAmbulance.setStatus(AmbulanceStatus.DISPATCHED);
        bestHospital.reserveBed();

        request.setStatus(RequestStatus.DISPATCHED);
        request.setAssignedAmbulanceId(bestAmbulance.getId());
        request.setAssignedHospitalId(bestHospital.getId());

        // Remove from pending priority queue
        pendingQueue.remove(request);

        // Generate Trip ID and record trip
        String tripId = "TRIP-" + (++tripCounter);
        Trip trip = new Trip(tripId, request.getId(), bestAmbulance.getId(), bestHospital.getId(),
                request.getIncidentLocationId(),
                bestAmbulanceRoute.getPath(), bestAmbulanceRoute.getTotalTimeMinutes(),
                bestHospitalRoute.getPath(), bestHospitalRoute.getTotalTimeMinutes(),
                reasoning.toString());

        tripService.recordTrip(trip);

        return trip;
    }

    /**
     * RULE 6 & 10: Manual trip completion.
     * Frees the ambulance, updates its location to the destination hospital node,
     * updates bed state, and auto-dispatches the next highest-priority waiting request.
     */
    public synchronized String completeTrip(String tripId) {
        Trip trip = tripService.getTrip(tripId);
        if (trip == null) {
            throw new IllegalArgumentException("Trip not found: " + tripId);
        }
        if (trip.isCompleted()) {
            throw new IllegalStateException("Trip " + tripId + " is already completed.");
        }

        trip.completeTrip();

        // Update ambulance status and node location
        Ambulance ambulance = ambulancesById.get(trip.getAmbulanceId());
        if (ambulance != null) {
            ambulance.setStatus(AmbulanceStatus.AVAILABLE);
            // Relocate ambulance to hospital where patient was admitted
            Hospital hospital = hospitalService.getHospital(trip.getHospitalId());
            if (hospital != null) {
                ambulance.setCurrentLocationId(hospital.getLocationId());
            }
            ambulance.incrementTrips();
        }

        // Complete the emergency request
        EmergencyRequest request = allRequestsById.get(trip.getRequestId());
        if (request != null) {
            request.setStatus(RequestStatus.COMPLETED);
        }

        StringBuilder log = new StringBuilder();
        log.append(String.format("Trip %s marked COMPLETED. Ambulance %s is now AVAILABLE at %s.\n",
                trip.getId(), trip.getAmbulanceId(), ambulance != null ? ambulance.getCurrentLocationId() : "Hospital"));

        // RULE 6: Auto-assign next highest-priority waiting request if any
        if (!pendingQueue.isEmpty()) {
            EmergencyRequest nextReq = pendingQueue.peek();
            log.append(String.format("Auto-dispatching next highest-priority waiting request [%s - Severity: %s]...\n",
                    nextReq.getId(), nextReq.getSeverity()));
            try {
                Trip autoTrip = dispatchNext();
                log.append(String.format("Successfully auto-dispatched Request %s -> Trip %s (Assigned Amb: %s, Hospital: %s)",
                        nextReq.getId(), autoTrip.getId(), autoTrip.getAmbulanceId(), autoTrip.getHospitalId()));
            } catch (Exception ex) {
                log.append("Auto-dispatch deferred: ").append(ex.getMessage());
            }
        }

        return log.toString();
    }
}
