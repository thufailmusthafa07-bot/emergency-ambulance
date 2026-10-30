package com.nalamnagar.model;

import java.util.Objects;

/**
 * Concrete Ambulance entity extending Vehicle.
 * Demonstrates OOP Inheritance, encapsulation and polymorphic behavior.
 */
public class Ambulance extends Vehicle {
    private AmbulanceStatus status;
    private final String baseHospitalId;
    private int totalTripsCompleted;

    public Ambulance(String id, String registrationNumber, String currentLocationId, String baseHospitalId) {
        super(id, registrationNumber, currentLocationId);
        this.baseHospitalId = baseHospitalId;
        this.status = AmbulanceStatus.AVAILABLE;
        this.totalTripsCompleted = 0;
    }

    @Override
    public String getVehicleType() {
        return "Emergency Medical Ambulance";
    }

    public AmbulanceStatus getStatus() {
        return status;
    }

    public void setStatus(AmbulanceStatus status) {
        this.status = status;
    }

    public boolean isAvailable() {
        return this.status == AmbulanceStatus.AVAILABLE;
    }

    public String getBaseHospitalId() {
        return baseHospitalId;
    }

    public int getTotalTripsCompleted() {
        return totalTripsCompleted;
    }

    public void incrementTrips() {
        this.totalTripsCompleted++;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof Ambulance that)) return false;
        return Objects.equals(getId(), that.getId());
    }

    @Override
    public int hashCode() {
        return Objects.hash(getId());
    }

    @Override
    public String toString() {
        return String.format("[%s] %s @ %s (%s)", getId(), getRegistrationNumber(), getCurrentLocationId(), status);
    }
}
