package com.nalamnagar.model;

/**
 * Demonstrates OOP Inheritance & Abstraction:
 * Base abstract class for municipal medical and relief facilities.
 */
public abstract class Facility {
    private final String id;
    private final String name;
    private final String locationId;

    public Facility(String id, String name, String locationId) {
        if (id == null || id.trim().isEmpty()) {
            throw new IllegalArgumentException("Facility ID cannot be null");
        }
        if (name == null || name.trim().isEmpty()) {
            throw new IllegalArgumentException("Facility name cannot be null");
        }
        this.id = id.trim();
        this.name = name.trim();
        this.locationId = locationId != null ? locationId.trim() : id;
    }

    public String getId() {
        return id;
    }

    public String getName() {
        return name;
    }

    public String getLocationId() {
        return locationId;
    }

    public abstract String getFacilityCategory();
}
