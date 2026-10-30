package com.nalamnagar.model;

import java.util.Objects;

/**
 * Represents a geographical node/junction in Nalam Nagar.
 * Demonstrates OOP Encapsulation with immutable coordinates/metadata.
 */
public class Location {
    private final String id;
    private final String name;
    private final String zoneType; // Residential, Educational, Industrial, Hospital, Commercial
    private final double x;        // Coordinate for visual diagram representation
    private final double y;

    public Location(String id, String name, String zoneType, double x, double y) {
        if (id == null || id.trim().isEmpty()) {
            throw new IllegalArgumentException("Location ID cannot be null or empty");
        }
        if (name == null || name.trim().isEmpty()) {
            throw new IllegalArgumentException("Location name cannot be null or empty");
        }
        this.id = id.trim();
        this.name = name.trim();
        this.zoneType = zoneType != null ? zoneType.trim() : "General";
        this.x = x;
        this.y = y;
    }

    public String getId() {
        return id;
    }

    public String getName() {
        return name;
    }

    public String getZoneType() {
        return zoneType;
    }

    public double getX() {
        return x;
    }

    public double getY() {
        return y;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof Location that)) return false;
        return Objects.equals(id, that.id);
    }

    @Override
    public int hashCode() {
        return Objects.hash(id);
    }

    @Override
    public String toString() {
        return name + " (" + id + " - " + zoneType + ")";
    }
}
