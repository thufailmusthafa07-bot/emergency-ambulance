package com.nalamnagar.service;

import com.nalamnagar.model.Location;
import com.nalamnagar.model.Road;
import com.nalamnagar.structures.RoadNetwork;
import com.nalamnagar.structures.RouteResult;

import java.util.Collection;

/**
 * Service managing road network calculations, travel times, and road status changes.
 */
public class RouteService implements RoutePlanner {
    private final RoadNetwork roadNetwork;

    public RouteService(RoadNetwork roadNetwork) {
        this.roadNetwork = roadNetwork;
    }

    @Override
    public RouteResult calculateRoute(String originLocationId, String destinationLocationId) {
        return roadNetwork.findShortestRoute(originLocationId, destinationLocationId);
    }

    public RoadNetwork getRoadNetwork() {
        return roadNetwork;
    }

    public Location getLocation(String id) {
        return roadNetwork.getLocation(id);
    }

    public Collection<Location> getAllLocations() {
        return roadNetwork.getAllLocations();
    }

    public Collection<Road> getAllRoads() {
        return roadNetwork.getAllRoads();
    }

    public Road getRoad(String id) {
        return roadNetwork.getRoad(id);
    }
}
