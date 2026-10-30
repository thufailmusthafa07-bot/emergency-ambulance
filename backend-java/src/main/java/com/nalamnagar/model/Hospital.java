package com.nalamnagar.model;

import java.util.Collections;
import java.util.HashSet;
import java.util.Objects;
import java.util.Set;

/**
 * Hospital entity extending Facility.
 * Tracks specialized facilities (Trauma, Cardiac, Neuro, Pediatrics, General)
 * and available emergency care bed capacity.
 */
public class Hospital extends Facility {
    private int totalBeds;
    private int availableBeds;
    private final Set<String> capabilities; // Set for O(1) facility check

    public Hospital(String id, String name, String locationId, int totalBeds, int availableBeds, Set<String> capabilities) {
        super(id, name, locationId);
        if (totalBeds < 0) {
            throw new IllegalArgumentException("Total beds cannot be negative");
        }
        if (availableBeds < 0 || availableBeds > totalBeds) {
            throw new IllegalArgumentException("Available beds must be between 0 and total beds (" + totalBeds + ")");
        }
        this.totalBeds = totalBeds;
        this.availableBeds = availableBeds;
        this.capabilities = new HashSet<>();
        if (capabilities != null) {
            for (String cap : capabilities) {
                if (cap != null && !cap.trim().isEmpty()) {
                    this.capabilities.add(cap.trim().toUpperCase());
                }
            }
        }
    }

    @Override
    public String getFacilityCategory() {
        return "Specialized Acute Care Hospital";
    }

    public int getTotalBeds() {
        return totalBeds;
    }

    public void setTotalBeds(int totalBeds) {
        if (totalBeds < availableBeds) {
            throw new IllegalArgumentException("Total beds cannot be less than current available beds");
        }
        this.totalBeds = totalBeds;
    }

    public int getAvailableBeds() {
        return availableBeds;
    }

    public void setAvailableBeds(int beds) {
        if (beds < 0 || beds > totalBeds) {
            throw new IllegalArgumentException("Available beds must be between 0 and " + totalBeds);
        }
        this.availableBeds = beds;
    }

    public boolean reserveBed() {
        if (availableBeds > 0) {
            availableBeds--;
            return true;
        }
        return false;
    }

    public boolean releaseBed() {
        if (availableBeds < totalBeds) {
            availableBeds++;
            return true;
        }
        return false;
    }

    public boolean hasFacility(String requiredFacility) {
        if (requiredFacility == null || requiredFacility.trim().isEmpty()) {
            return true;
        }
        String clean = requiredFacility.trim().toUpperCase();
        if (clean.equals("GENERAL") || clean.equals("ANY")) {
            return true;
        }
        return capabilities.contains(clean);
    }

    public Set<String> getCapabilities() {
        return Collections.unmodifiableSet(capabilities);
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof Hospital hospital)) return false;
        return Objects.equals(getId(), hospital.getId());
    }

    @Override
    public int hashCode() {
        return Objects.hash(getId());
    }

    @Override
    public String toString() {
        return String.format("[%s] %s (Beds: %d/%d, Facilities: %s)",
                getId(), getName(), availableBeds, totalBeds, capabilities);
    }
}
