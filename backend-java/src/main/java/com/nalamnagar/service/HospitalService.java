package com.nalamnagar.service;

import com.nalamnagar.model.Hospital;

import java.util.Collection;
import java.util.Collections;
import java.util.HashMap;
import java.util.Map;

/**
 * Service managing hospital records, facility capabilities, and manual bed capacity updates.
 */
public class HospitalService {
    // HashMap for O(1) hospital lookup by ID
    private final Map<String, Hospital> hospitals = new HashMap<>();

    public void addHospital(Hospital hospital) {
        if (hospital != null) {
            hospitals.put(hospital.getId(), hospital);
        }
    }

    public Hospital getHospital(String id) {
        return hospitals.get(id);
    }

    public Collection<Hospital> getAllHospitals() {
        return Collections.unmodifiableCollection(hospitals.values());
    }

    /**
     * Manual update for hospital capacity with strict bounds checking (0..total).
     */
    public boolean updateAvailableBeds(String hospitalId, int newAvailableBeds) {
        Hospital hospital = hospitals.get(hospitalId);
        if (hospital == null) {
            return false;
        }
        hospital.setAvailableBeds(newAvailableBeds);
        return true;
    }

    public void clear() {
        hospitals.clear();
    }
}
