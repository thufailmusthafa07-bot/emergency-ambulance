package com.nalamnagar.model;

/**
 * Operational state of an emergency response vehicle in the fleet.
 */
public enum AmbulanceStatus {
    AVAILABLE,
    DISPATCHED,
    EN_ROUTE,
    AT_SCENE,
    TRANSPORTING,
    MAINTENANCE
}
