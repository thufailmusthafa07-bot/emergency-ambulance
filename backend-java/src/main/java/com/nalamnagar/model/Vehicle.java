package com.nalamnagar.model;

/**
 * Demonstrates OOP Inheritance & Polymorphism:
 * Base abstract class for motorized transport entities in Nalam Nagar.
 */
public abstract class Vehicle {
    private final String id;
    private final String registrationNumber;
    private String currentLocationId;

    public Vehicle(String id, String registrationNumber, String currentLocationId) {
        if (id == null || id.trim().isEmpty()) {
            throw new IllegalArgumentException("Vehicle ID cannot be null");
        }
        this.id = id.trim();
        this.registrationNumber = registrationNumber != null ? registrationNumber.trim() : id;
        this.currentLocationId = currentLocationId;
    }

    public String getId() {
        return id;
    }

    public String getRegistrationNumber() {
        return registrationNumber;
    }

    public String getCurrentLocationId() {
        return currentLocationId;
    }

    public void setCurrentLocationId(String locationId) {
        this.currentLocationId = locationId;
    }

    public abstract String getVehicleType();
}
