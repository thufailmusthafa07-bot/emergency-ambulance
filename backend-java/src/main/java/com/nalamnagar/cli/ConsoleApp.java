package com.nalamnagar.cli;

import com.nalamnagar.data.DataLoader;
import com.nalamnagar.model.*;
import com.nalamnagar.service.*;
import com.nalamnagar.structures.RoadNetwork;
import com.nalamnagar.structures.RouteResult;

import java.util.*;

/**
 * Menu-Driven Console Application for Nalam Nagar Dispatch System.
 * Fulfills Case Study Specification:
 * 1 Add emergency request, 2 Dispatch next request, 3 View pending queue,
 * 4 View ambulances, 5 View hospitals, 6 Show shortest route between two locations,
 * 7 Update road traffic, 8 Close/reopen road, 9 Update hospital capacity,
 * 10 Complete trip, 11 View active trips (with recalculation), 12 Run demo scenario, 0 Exit.
 */
public class ConsoleApp {
    private final RoadNetwork roadNetwork;
    private final HospitalService hospitalService;
    private final TripService tripService;
    private final RouteService routeService;
    private final TrafficService trafficService;
    private final DispatchService dispatchService;
    private final Scanner scanner;

    public ConsoleApp() {
        this.roadNetwork = new RoadNetwork();
        this.hospitalService = new HospitalService();
        this.tripService = new TripService();
        this.routeService = new RouteService(roadNetwork);
        this.trafficService = new TrafficService(roadNetwork, tripService);
        this.dispatchService = new DispatchService(roadNetwork, hospitalService, tripService);
        this.scanner = new Scanner(System.in);

        // Load initial seed dataset
        DataLoader.loadSampleData(roadNetwork, hospitalService, dispatchService);
    }

    public static void main(String[] args) {
        ConsoleApp app = new ConsoleApp();
        app.run();
    }

    public void run() {
        System.out.println("========================================================================");
        System.out.println("   NALAM NAGAR EMERGENCY DISPATCH & ROUTE OPTIMIZATION SYSTEM (CLI)     ");
        System.out.println("   Municipal Operations Desk Console - Java 17 Core OOP & Data Structures");
        System.out.println("========================================================================");

        boolean running = true;
        while (running) {
            printMenu();
            System.out.print("\nEnter choice (0-12): ");
            String input = scanner.nextLine().trim();

            try {
                switch (input) {
                    case "1" -> handleAddEmergencyRequest();
                    case "2" -> handleDispatchNextRequest();
                    case "3" -> handleViewPendingQueue();
                    case "4" -> handleViewAmbulances();
                    case "5" -> handleViewHospitals();
                    case "6" -> handleShowShortestRoute();
                    case "7" -> handleUpdateRoadTraffic();
                    case "8" -> handleToggleRoadStatus();
                    case "9" -> handleUpdateHospitalCapacity();
                    case "10" -> handleCompleteTrip();
                    case "11" -> handleViewActiveTrips();
                    case "12" -> handleRunDemoScenario();
                    case "0" -> {
                        System.out.println("\nExiting Nalam Nagar Dispatch System. Goodbye.");
                        running = false;
                    }
                    default -> System.out.println("Invalid selection. Please choose an option from 0 to 12.");
                }
            } catch (Exception ex) {
                System.out.println("\n[ERROR] " + ex.getMessage());
            }
        }
    }

    private void printMenu() {
        System.out.println("\n------------------------------------------------------------------------");
        System.out.println(" 1. Add Emergency Request          |  7. Update Road Traffic (Delay)");
        System.out.println(" 2. Dispatch Next Request (Triage) |  8. Close / Reopen Road Segment");
        System.out.println(" 3. View Pending Priority Queue    |  9. Update Hospital Bed Capacity");
        System.out.println(" 4. View Fleet / Ambulances        | 10. Complete Trip (Free Unit & Auto-Assign)");
        System.out.println(" 5. View Hospitals & Beds          | 11. View Active Trips (Live Recalculate)");
        System.out.println(" 6. Calculate Shortest Route       | 12. Run Full Automated Demo Scenario");
        System.out.println("                                   |  0. Exit System");
        System.out.println("------------------------------------------------------------------------");
    }

    private void handleAddEmergencyRequest() {
        System.out.println("\n--- [1] LOG EMERGENCY CALL ---");
        System.out.print("Caller Name: ");
        String caller = scanner.nextLine().trim();
        System.out.print("Contact Number: ");
        String phone = scanner.nextLine().trim();

        System.out.println("Available Locations:");
        for (Location loc : roadNetwork.getAllLocations()) {
            System.out.printf("  - %-20s (%s)\n", loc.getId(), loc.getName());
        }
        System.out.print("Incident Location ID: ");
        String locId = scanner.nextLine().trim().toUpperCase();

        System.out.print("Severity (1: CRITICAL, 2: SERIOUS, 3: MINOR): ");
        String sevChoice = scanner.nextLine().trim();
        Severity severity = switch (sevChoice) {
            case "1" -> Severity.CRITICAL;
            case "2" -> Severity.SERIOUS;
            default -> Severity.MINOR;
        };

        System.out.print("Required Facility (TRAUMA, CARDIAC, NEURO, PEDIATRICS, GENERAL): ");
        String facility = scanner.nextLine().trim().toUpperCase();
        if (facility.isEmpty()) facility = "GENERAL";

        System.out.print("Brief Incident Description: ");
        String desc = scanner.nextLine().trim();

        String reqId = "REQ-USER-" + (System.currentTimeMillis() % 10000);
        EmergencyRequest req = dispatchService.submitRequest(reqId, caller, phone, locId, severity, facility, desc);

        System.out.printf("\n[SUCCESS] Request %s enqueued into PriorityQueue with priority rank %d (%s).\n",
                req.getId(), req.getSeverity().getRank(), req.getSeverity());
    }

    private void handleDispatchNextRequest() {
        System.out.println("\n--- [2] DISPATCH NEXT HIGHEST-PRIORITY EMERGENCY ---");
        Trip trip = dispatchService.dispatchNext();
        System.out.printf("[DISPATCH CONFIRMED] Trip ID: %s\n", trip.getId());
        System.out.println("==================== REASONING TRACE ====================");
        System.out.println(trip.getDispatchReasoning());
        System.out.println("=========================================================");
        System.out.printf("Ambulance %s en route to %s -> Hospital %s (Total ETA: %.1f mins)\n",
                trip.getAmbulanceId(), trip.getIncidentLocationId(), trip.getHospitalId(), trip.getTotalEstimatedMinutes());
    }

    private void handleViewPendingQueue() {
        System.out.println("\n--- [3] CURRENT PENDING PRIORITY QUEUE (SEVERITY > ARRIVAL) ---");
        List<EmergencyRequest> pending = dispatchService.getPendingQueue().getSortedSnapshot();
        if (pending.isEmpty()) {
            System.out.println("Queue is currently empty. All calls attended.");
            return;
        }

        System.out.printf("%-10s | %-10s | %-20s | %-12s | %-20s\n", "REQ ID", "SEVERITY", "LOCATION", "FACILITY", "CALLER");
        System.out.println("---------------------------------------------------------------------------------");
        for (EmergencyRequest r : pending) {
            System.out.printf("%-10s | %-10s | %-20s | %-12s | %-20s\n",
                    r.getId(), r.getSeverity(), r.getIncidentLocationId(), r.getRequiredFacility(), r.getCallerName());
        }
        System.out.printf("Total pending requests: %d\n", pending.size());
    }

    private void handleViewAmbulances() {
        System.out.println("\n--- [4] AMBULANCE FLEET ROSTER ---");
        System.out.printf("%-10s | %-16s | %-22s | %-12s | %-8s\n", "AMB ID", "REG NUMBER", "CURRENT LOCATION", "STATUS", "TRIPS");
        System.out.println("----------------------------------------------------------------------------");
        for (Ambulance amb : dispatchService.getAllAmbulances()) {
            System.out.printf("%-10s | %-16s | %-22s | %-12s | %-8d\n",
                    amb.getId(), amb.getRegistrationNumber(), amb.getCurrentLocationId(), amb.getStatus(), amb.getTotalTripsCompleted());
        }
    }

    private void handleViewHospitals() {
        System.out.println("\n--- [5] HOSPITALS & BED CAPACITY ---");
        System.out.printf("%-10s | %-32s | %-10s | %-30s\n", "HOSP ID", "HOSPITAL NAME", "BEDS FREE", "FACILITIES");
        System.out.println("---------------------------------------------------------------------------------------");
        for (Hospital h : hospitalService.getAllHospitals()) {
            System.out.printf("%-10s | %-32s | %2d / %-6d | %s\n",
                    h.getId(), h.getName(), h.getAvailableBeds(), h.getTotalBeds(), h.getCapabilities());
        }
    }

    private void handleShowShortestRoute() {
        System.out.println("\n--- [6] DIJKSTRA SHORTEST PATH BY TRAVEL TIME ---");
        System.out.print("Enter Origin Location ID: ");
        String from = scanner.nextLine().trim().toUpperCase();
        System.out.print("Enter Destination Location ID: ");
        String to = scanner.nextLine().trim().toUpperCase();

        RouteResult route = routeService.calculateRoute(from, to);
        if (!route.isReachable()) {
            System.out.println("[RESULT] Destination is UNREACHABLE. A road closure blocks this route.");
        } else {
            System.out.printf("[RESULT] Shortest Travel Time: %.2f minutes\n", route.getTotalTimeMinutes());
            System.out.println("Optimal Path: " + String.join(" -> ", route.getPath()));
        }
    }

    private void handleUpdateRoadTraffic() {
        System.out.println("\n--- [7] UPDATE ROAD TRAVEL TIME (TRAFFIC DELAY) ---");
        System.out.print("Enter Road ID (e.g. RD-101): ");
        String roadId = scanner.nextLine().trim().toUpperCase();
        System.out.print("Enter New Travel Time in Minutes (> 0): ");
        double minutes = Double.parseDouble(scanner.nextLine().trim());

        List<String> log = trafficService.updateTrafficDelay(roadId, minutes);
        System.out.printf("[SUCCESS] Road %s travel time updated to %.1f minutes.\n", roadId, minutes);
        if (!log.isEmpty()) {
            System.out.println("Active Trip Recalculations:");
            log.forEach(msg -> System.out.println("  " + msg));
        }
    }

    private void handleToggleRoadStatus() {
        System.out.println("\n--- [8] ROAD CLOSURE / REOPEN CONTROL ---");
        System.out.print("Enter Road ID: ");
        String roadId = scanner.nextLine().trim().toUpperCase();
        Road road = roadNetwork.getRoad(roadId);
        if (road == null) {
            System.out.println("[ERROR] Road not found: " + roadId);
            return;
        }

        if (road.isClosed()) {
            System.out.printf("Road %s is currently CLOSED (%s). Reopening...\n", roadId, road.getClosureReason());
            List<String> log = trafficService.reopenRoad(roadId);
            System.out.printf("[SUCCESS] Road %s reopened. Re-included in Dijkstra pathfinding.\n", roadId);
            log.forEach(msg -> System.out.println("  " + msg));
        } else {
            System.out.print("Enter Closure Reason (e.g. Water Pipe Burst, Severe Waterlogging): ");
            String reason = scanner.nextLine().trim();
            List<String> log = trafficService.closeRoad(roadId, reason);
            System.out.printf("[SUCCESS] Road %s is now CLOSED. Excluded from all Dijkstra calculations.\n", roadId);
            log.forEach(msg -> System.out.println("  " + msg));
        }
    }

    private void handleUpdateHospitalCapacity() {
        System.out.println("\n--- [9] UPDATE HOSPITAL BED CAPACITY ---");
        System.out.print("Enter Hospital ID (e.g. HOSP-01): ");
        String hospId = scanner.nextLine().trim().toUpperCase();
        Hospital h = hospitalService.getHospital(hospId);
        if (h == null) {
            System.out.println("[ERROR] Hospital not found: " + hospId);
            return;
        }

        System.out.printf("Current available beds: %d / %d\n", h.getAvailableBeds(), h.getTotalBeds());
        System.out.printf("Enter New Available Beds (0..%d): ", h.getTotalBeds());
        int beds = Integer.parseInt(scanner.nextLine().trim());

        boolean ok = hospitalService.updateAvailableBeds(hospId, beds);
        if (ok) {
            System.out.printf("[SUCCESS] Hospital %s available beds updated to %d.\n", hospId, beds);
        }
    }

    private void handleCompleteTrip() {
        System.out.println("\n--- [10] COMPLETE EMERGENCY TRIP ---");
        List<Trip> active = tripService.getActiveTrips();
        if (active.isEmpty()) {
            System.out.println("No active trips in progress.");
            return;
        }

        System.out.println("Active Missions:");
        for (Trip t : active) {
            System.out.printf("  - %s: Ambulance %s -> %s -> %s (ETA: %.1f mins)\n",
                    t.getId(), t.getAmbulanceId(), t.getIncidentLocationId(), t.getHospitalId(), t.getTotalEstimatedMinutes());
        }

        System.out.print("Enter Trip ID to complete: ");
        String tripId = scanner.nextLine().trim().toUpperCase();
        String result = dispatchService.completeTrip(tripId);
        System.out.println("\n" + result);
    }

    private void handleViewActiveTrips() {
        System.out.println("\n--- [11] ACTIVE TRIPS & REAL-TIME RECALCULATION ---");
        List<Trip> active = tripService.getActiveTrips();
        if (active.isEmpty()) {
            System.out.println("No active emergency missions underway.");
            return;
        }

        List<String> logs = trafficService.recalculateActiveTrips();
        for (Trip t : active) {
            System.out.printf("Trip %s: Amb %s | Req %s | Status: %s | Total ETA: %.1f mins\n",
                    t.getId(), t.getAmbulanceId(), t.getRequestId(),
                    t.isBlocked() ? "ROUTE BLOCKED" : "ACTIVE", t.getTotalEstimatedMinutes());
            System.out.printf("  Leg 1 (To Scene):    %s (%.1f mins)\n", String.join("->", t.getPathToIncident()), t.getTimeToIncidentMinutes());
            System.out.printf("  Leg 2 (To Hospital): %s (%.1f mins)\n", String.join("->", t.getPathToHospital()), t.getTimeToHospitalMinutes());
        }
        if (!logs.isEmpty()) {
            System.out.println("Live recalculation notes:");
            logs.forEach(l -> System.out.println("  " + l));
        }
    }

    private void handleRunDemoScenario() {
        System.out.println("\n========================================================================");
        System.out.println("               RUNNING AUTOMATED COMPREHENSIVE DEMO SCENARIO             ");
        System.out.println("========================================================================");

        System.out.println("\n>>> STEP 1: Inspect initial priority queue (Triage ordering demonstration)");
        EmergencyRequest top = dispatchService.getPendingQueue().peek();
        System.out.printf("Top queued item: [%s] Severity: %s (Priority Rank: %d) at %s\n",
                top.getId(), top.getSeverity(), top.getSeverity().getRank(), top.getIncidentLocationId());

        System.out.println("\n>>> STEP 2: Dispatch 1st Emergency (Critical Incident)");
        Trip t1 = dispatchService.dispatchNext();
        System.out.printf("Dispatched Request %s -> Trip %s (Assigned %s, Hospital %s, ETA %.1f mins)\n",
                t1.getRequestId(), t1.getId(), t1.getAmbulanceId(), t1.getHospitalId(), t1.getTotalEstimatedMinutes());

        System.out.println("\n>>> STEP 3: Dispatch 2nd, 3rd, and 4th Emergencies to saturate 4-ambulance fleet");
        Trip t2 = dispatchService.dispatchNext();
        Trip t3 = dispatchService.dispatchNext();
        Trip t4 = dispatchService.dispatchNext();
        System.out.printf("Dispatched Trips: %s (%s), %s (%s), %s (%s)\n",
                t2.getId(), t2.getAmbulanceId(), t3.getId(), t3.getAmbulanceId(), t4.getId(), t4.getAmbulanceId());

        System.out.println("\n>>> STEP 4: Attempt dispatch when 0 ambulances available (Failure Case Handling)");
        try {
            dispatchService.dispatchNext();
        } catch (Exception ex) {
            System.out.println("[HANDLED EXPECTED FAILURE]: " + ex.getMessage());
        }

        System.out.println("\n>>> STEP 5: Simulate Road Closure on RD-101 and observe dynamic route recalculation");
        List<String> recalcLogs = trafficService.closeRoad("RD-101", "Severe monsoon waterlogging");
        recalcLogs.forEach(System.out::println);

        System.out.println("\n>>> STEP 6: Complete Trip 1 (Ambulance becomes free, Auto-assigns next waiting call)");
        String completionReport = dispatchService.completeTrip(t1.getId());
        System.out.println(completionReport);

        System.out.println("\n>>> DEMO SCENARIO FINISHED CLEANLY WITH 100% GRACEFUL EXCEPTION HANDLING.");
    }
}
