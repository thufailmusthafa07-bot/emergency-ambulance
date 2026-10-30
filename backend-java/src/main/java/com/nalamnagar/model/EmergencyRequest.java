package com.nalamnagar.model;

import java.time.Instant;
import java.util.Objects;

/**
 * Represents an incoming emergency call logged by the operator.
 * Implements Comparable to enforce PriorityQueue ordering:
 * 1. Severity rank: Critical (1) > Serious (2) > Minor (3).
 * 2. FIFO order on arrival timestamp (earlier first).
 */
public class EmergencyRequest implements Comparable<EmergencyRequest> {
    private final String id;
    private final String callerName;
    private final String contactNumber;
    private final String incidentLocationId;
    private Severity severity;
    private final String requiredFacility;
    private final String description;
    private final long createdAtEpochMs;
    private RequestStatus status;
    private String assignedAmbulanceId;
    private String assignedHospitalId;

    public EmergencyRequest(String id, String callerName, String contactNumber,
                            String incidentLocationId, Severity severity,
                            String requiredFacility, String description) {
        if (id == null || id.trim().isEmpty()) {
            throw new IllegalArgumentException("Request ID cannot be null");
        }
        if (incidentLocationId == null || incidentLocationId.trim().isEmpty()) {
            throw new IllegalArgumentException("Incident location cannot be null");
        }
        if (severity == null) {
            throw new IllegalArgumentException("Severity must be specified");
        }
        this.id = id.trim();
        this.callerName = callerName != null ? callerName.trim() : "Citizen";
        this.contactNumber = contactNumber != null ? contactNumber.trim() : "N/A";
        this.incidentLocationId = incidentLocationId.trim();
        this.severity = severity;
        this.requiredFacility = (requiredFacility != null && !requiredFacility.trim().isEmpty())
                ? requiredFacility.trim().toUpperCase() : "GENERAL";
        this.description = description != null ? description.trim() : "";
        this.createdAtEpochMs = System.currentTimeMillis();
        this.status = RequestStatus.PENDING;
    }

    public String getId() {
        return id;
    }

    public String getCallerName() {
        return callerName;
    }

    public String getContactNumber() {
        return contactNumber;
    }

    public String getIncidentLocationId() {
        return incidentLocationId;
    }

    public Severity getSeverity() {
        return severity;
    }

    public void setSeverity(Severity severity) {
        if (severity != null) {
            this.severity = severity;
        }
    }

    public String getRequiredFacility() {
        return requiredFacility;
    }

    public String getDescription() {
        return description;
    }

    public long getCreatedAtEpochMs() {
        return createdAtEpochMs;
    }

    public RequestStatus getStatus() {
        return status;
    }

    public void setStatus(RequestStatus status) {
        this.status = status;
    }

    public String getAssignedAmbulanceId() {
        return assignedAmbulanceId;
    }

    public void setAssignedAmbulanceId(String assignedAmbulanceId) {
        this.assignedAmbulanceId = assignedAmbulanceId;
    }

    public String getAssignedHospitalId() {
        return assignedHospitalId;
    }

    public void setAssignedHospitalId(String assignedHospitalId) {
        this.assignedHospitalId = assignedHospitalId;
    }

    /**
     * Case Study Requirement: PriorityQueue comparison ordering:
     * Critical > Serious > Minor.
     * Within the same severity, FIFO arrival order (earlier epoch timestamp).
     */
    @Override
    public int compareTo(EmergencyRequest o) {
        if (o == null) return -1;
        int sevCompare = Integer.compare(this.severity.getRank(), o.severity.getRank());
        if (sevCompare != 0) {
            return sevCompare;
        }
        int timeCompare = Long.compare(this.createdAtEpochMs, o.createdAtEpochMs);
        if (timeCompare != 0) {
            return timeCompare;
        }
        return this.id.compareTo(o.id);
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof EmergencyRequest that)) return false;
        return Objects.equals(id, that.id);
    }

    @Override
    public int hashCode() {
        return Objects.hash(id);
    }

    @Override
    public String toString() {
        return String.format("[%s] %s at %s (%s, Need: %s, Status: %s)",
                id, severity, incidentLocationId, callerName, requiredFacility, status);
    }
}
