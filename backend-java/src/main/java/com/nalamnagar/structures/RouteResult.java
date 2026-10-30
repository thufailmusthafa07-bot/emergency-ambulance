package com.nalamnagar.structures;

import java.util.Collections;
import java.util.List;

/**
 * Result object returned by the shortest path algorithm.
 * Contains both the ordered list of location IDs and the total minimum travel time.
 */
public class RouteResult {
    private final List<String> path;
    private final double totalTimeMinutes;
    private final boolean reachable;

    public RouteResult(List<String> path, double totalTimeMinutes, boolean reachable) {
        this.path = path != null ? path : Collections.emptyList();
        this.totalTimeMinutes = totalTimeMinutes;
        this.reachable = reachable;
    }

    public static RouteResult unreachable() {
        return new RouteResult(Collections.emptyList(), Double.POSITIVE_INFINITY, false);
    }

    public List<String> getPath() {
        return Collections.unmodifiableList(path);
    }

    public double getTotalTimeMinutes() {
        return totalTimeMinutes;
    }

    public boolean isReachable() {
        return reachable;
    }

    @Override
    public String toString() {
        if (!reachable) {
            return "Unreachable";
        }
        return String.join(" -> ", path) + String.format(" (%.1f mins)", totalTimeMinutes);
    }
}
