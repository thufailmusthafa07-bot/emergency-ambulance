package com.nalamnagar.model;

import java.util.Collections;
import java.util.List;
import java.util.Objects;

/**
 * Represents an active or completed emergency mission.
 * Encapsulates the ambulance-to-patient route and patient-to-hospital route.
 * Dynamically updates travel time and paths upon road closures or traffic delays.
 */
public class Trip {
    private final String id;
    private final String requestId;
    private final String ambulanceId;
    private final String hospitalId;
    private final String incidentLocationId;

    // Segment 1: Ambulance -> Incident Scene
    private List<String> pathToIncident;
    private double timeToIncidentMinutes;

    // Segment 2: Incident Scene -> Hospital
    private List<String> pathToHospital;
    private double timeToHospitalMinutes;

    private boolean completed;
    private boolean blocked;          // Flagged if destination becomes unreachable due to road closure
    private final long startTimeEpochMs;
    private Long endTimeEpochMs;
    private String dispatchReasoning; // Audit log of why this unit and hospital were selected

    public Trip(String id, String requestId, String ambulanceId, String hospitalId,
                String incidentLocationId, List<String> pathToIncident, double timeToIncidentMinutes,
                List<String> pathToHospital, double timeToHospitalMinutes, String dispatchReasoning) {
        if (id == null || id.trim().isEmpty()) {
            throw new IllegalArgumentException("Trip ID cannot be null");
        }
        this.id = id.trim();
        this.requestId = requestId;
        this.ambulanceId = ambulanceId;
        this.hospitalId = hospitalId;
        this.incidentLocationId = incidentLocationId;
        this.pathToIncident = pathToIncident != null ? pathToIncident : Collections.emptyList();
        this.timeToIncidentMinutes = timeToIncidentMinutes;
        this.pathToHospital = pathToHospital != null ? pathToHospital : Collections.emptyList();
        this.timeToHospitalMinutes = timeToHospitalMinutes;
        this.completed = false;
        this.blocked = false;
        this.startTimeEpochMs = System.currentTimeMillis();
        this.dispatchReasoning = dispatchReasoning != null ? dispatchReasoning : "";
    }

    public String getId() {
        return id;
    }

    public String getRequestId() {
        return requestId;
    }

    public String getAmbulanceId() {
        return ambulanceId;
    }

    public String getHospitalId() {
        return hospitalId;
    }

    public String getIncidentLocationId() {
        return incidentLocationId;
    }

    public List<String> getPathToIncident() {
        return Collections.unmodifiableList(pathToIncident);
    }

    public double getTimeToIncidentMinutes() {
        return timeToIncidentMinutes;
    }

    public List<String> getPathToHospital() {
        return Collections.unmodifiableList(pathToHospital);
    }

    public double getTimeToHospitalMinutes() {
        return timeToHospitalMinutes;
    }

    public double getTotalEstimatedMinutes() {
        return timeToIncidentMinutes + timeToHospitalMinutes;
    }

    public boolean isCompleted() {
        return completed;
    }

    public boolean isBlocked() {
        return blocked;
    }

    public void setBlocked(boolean blocked) {
        this.blocked = blocked;
    }

    public long getStartTimeEpochMs() {
        return startTimeEpochMs;
    }

    public Long getEndTimeEpochMs() {
        return endTimeEpochMs;
    }

    public String getDispatchReasoning() {
        return dispatchReasoning;
    }

    public void completeTrip() {
        this.completed = true;
        this.endTimeEpochMs = System.currentTimeMillis();
    }

    /**
     * Recalculates route upon road delays or closures.
     */
    public void updateIncidentRoute(List<String> newPath, double newMinutes) {
        this.pathToIncident = newPath != null ? newPath : Collections.emptyList();
        this.timeToIncidentMinutes = newMinutes;
    }

    public void updateHospitalRoute(List<String> newPath, double newMinutes) {
        this.pathToHospital = newPath != null ? newPath : Collections.emptyList();
        this.timeToHospitalMinutes = newMinutes;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof Trip trip)) return false;
        return Objects.equals(id, trip.id);
    }

    @Override
    public int hashCode() {
        return Objects.hash(id);
    }

    @Override
    public String toString() {
        return String.format("Trip %s [Amb: %s -> Incident: %s -> Hosp: %s] ETA: %.1f mins (%s)",
                id, ambulanceId, incidentLocationId, hospitalId, getTotalEstimatedMinutes(),
                completed ? "COMPLETED" : (blocked ? "ROUTE BLOCKED" : "ACTIVE"));
    }
}
