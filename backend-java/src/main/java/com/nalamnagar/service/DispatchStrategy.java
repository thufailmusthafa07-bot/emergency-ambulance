package com.nalamnagar.service;

import com.nalamnagar.model.Ambulance;
import com.nalamnagar.model.EmergencyRequest;
import com.nalamnagar.model.Hospital;
import com.nalamnagar.model.Trip;

/**
 * Abstraction interface for emergency dispatch algorithms.
 */
public interface DispatchStrategy {
    Trip dispatch(EmergencyRequest request);
}
