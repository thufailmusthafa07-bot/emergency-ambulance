package com.nalamnagar.model;

import java.util.Objects;

/**
 * Represents a directed or bi-directional road segment between two locations.
 * Optimization criterion is TRAVEL TIME (in minutes), NOT plain distance.
 * Closed roads or delay adjustments dynamically change route weights.
 */
public class Road {
    private final String id;
    private final String sourceId;
    private final String destinationId;
    private final double baseMinutes;   // Nominal travel time without congestion
    private double currentMinutes;      // Dynamic travel time with traffic delay
    private boolean closed;             // Road closure status
    private String closureReason;

    public Road(String id, String sourceId, String destinationId, double baseMinutes) {
        if (id == null || id.trim().isEmpty()) {
            throw new IllegalArgumentException("Road ID cannot be null or empty");
        }
        if (sourceId == null || destinationId == null) {
            throw new IllegalArgumentException("Road source and destination cannot be null");
        }
        if (baseMinutes <= 0) {
            throw new IllegalArgumentException("Road travel time must be positive (> 0 minutes)");
        }
        this.id = id.trim();
        this.sourceId = sourceId.trim();
        this.destinationId = destinationId.trim();
        this.baseMinutes = baseMinutes;
        this.currentMinutes = baseMinutes;
        this.closed = false;
        this.closureReason = "";
    }

    public String getId() {
        return id;
    }

    public String getSourceId() {
        return sourceId;
    }

    public String getDestinationId() {
        return destinationId;
    }

    public double getBaseMinutes() {
        return baseMinutes;
    }

    public double getCurrentMinutes() {
        return currentMinutes;
    }

    public void setCurrentMinutes(double minutes) {
        if (minutes <= 0) {
            throw new IllegalArgumentException("Road travel time must be positive (> 0 minutes)");
        }
        this.currentMinutes = minutes;
    }

    public boolean isClosed() {
        return closed;
    }

    public void setClosed(boolean closed, String reason) {
        this.closed = closed;
        this.closureReason = reason != null ? reason : "";
    }

    public String getClosureReason() {
        return closureReason;
    }

    public void resetTraffic() {
        this.currentMinutes = this.baseMinutes;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof Road road)) return false;
        return Objects.equals(id, road.id);
    }

    @Override
    public int hashCode() {
        return Objects.hash(id);
    }

    @Override
    public String toString() {
        return String.format("%s: %s -> %s (%.1f mins%s)",
                id, sourceId, destinationId, currentMinutes, closed ? " [CLOSED]" : "");
    }
}
