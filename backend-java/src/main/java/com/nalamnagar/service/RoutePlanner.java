package com.nalamnagar.service;

import com.nalamnagar.structures.RouteResult;

/**
 * Abstraction interface for path finding and travel time optimization.
 */
public interface RoutePlanner {
    RouteResult calculateRoute(String originLocationId, String destinationLocationId);
}
