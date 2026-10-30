package com.nalamnagar.api;

import com.nalamnagar.auth.AuthService;
import com.nalamnagar.data.DataLoader;
import com.nalamnagar.exception.AuthException;
import com.nalamnagar.exception.NalamNagarException;
import com.nalamnagar.model.*;
import com.nalamnagar.service.*;
import com.nalamnagar.structures.RoadNetwork;
import com.nalamnagar.structures.RouteResult;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpHandler;
import com.sun.net.httpserver.HttpServer;

import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.*;

/**
 * REST API Server using Sun/JDK Built-in HttpServer.
 * - Framework-free thin layer over services: NO business logic here.
 * - Full CORS support enabled for http://localhost:5173.
 * - Runs on port 5000 (replacing the old Node express backend).
 *
 * Endpoints:
 * GET/POST /api/requests
 * POST     /api/dispatch/next
 * POST     /api/dispatch/{requestId}
 * GET      /api/ambulances
 * GET      /api/hospitals
 * PATCH    /api/hospitals/{id}/capacity
 * GET      /api/network
 * PATCH    /api/roads/{id}/traffic
 * POST     /api/roads/{id}/close
 * POST     /api/roads/{id}/open
 * GET      /api/route?from=&to=
 * GET      /api/trips
 * POST     /api/trips/{id}/complete
 * GET      /api/stats
 * POST     /api/reset
 * GET      /health
 */
public class RestApiServer {
    private final RoadNetwork roadNetwork;
    private final HospitalService hospitalService;
    private final TripService tripService;
    private final RouteService routeService;
    private final TrafficService trafficService;
    private final DispatchService dispatchService;
    private final AuthService authService;
    private HttpServer server;
    private long lastRecalculationEpochMs = System.currentTimeMillis();

    public RestApiServer() {
        this.roadNetwork = new RoadNetwork();
        this.hospitalService = new HospitalService();
        this.tripService = new TripService();
        this.routeService = new RouteService(roadNetwork);
        this.trafficService = new TrafficService(roadNetwork, tripService);
        this.dispatchService = new DispatchService(roadNetwork, hospitalService, tripService);
        this.authService = new AuthService();

        // Load initial data
        DataLoader.loadSampleData(roadNetwork, hospitalService, dispatchService);
    }

    public static void main(String[] args) throws IOException {
        int port = 5000;
        if (args.length > 0) {
            try { port = Integer.parseInt(args[0]); } catch (Exception ignored) {}
        }
        RestApiServer apiServer = new RestApiServer();
        apiServer.start(port);
    }

    public void start(int port) throws IOException {
        server = HttpServer.create(new InetSocketAddress(port), 0);

        server.createContext("/health", new HealthHandler());
        server.createContext("/api/auth", new AuthHandler());
        server.createContext("/api/stats", new StatsHandler());
        server.createContext("/api/requests", new RequestsHandler());
        server.createContext("/api/dispatch", new DispatchHandler());
        server.createContext("/api/ambulances", new AmbulancesHandler());
        server.createContext("/api/hospitals", new HospitalsHandler());
        server.createContext("/api/network", new NetworkHandler());
        server.createContext("/api/roads", new RoadsHandler());
        server.createContext("/api/route", new RouteHandler());
        server.createContext("/api/trips", new TripsHandler());
        server.createContext("/api/reset", new ResetHandler());

        server.setExecutor(java.util.concurrent.Executors.newCachedThreadPool());
        server.start();
        System.out.println("===============================================================");
        System.out.printf("  NALAM NAGAR JAVA REST API STARTED ON http://localhost:%d\n", port);
        System.out.println("  Thin REST layer over OOP Core Services | CORS enabled");
        System.out.println("===============================================================");
    }

    public void stop() {
        if (server != null) {
            server.stop(0);
        }
    }

    // CORS & Response Helpers
    private static void sendResponse(HttpExchange exchange, int statusCode, String responseJson) throws IOException {
        byte[] bytes = responseJson.getBytes(StandardCharsets.UTF_8);
        exchange.getResponseHeaders().set("Content-Type", "application/json; charset=UTF-8");
        exchange.getResponseHeaders().set("Access-Control-Allow-Origin", "*");
        exchange.getResponseHeaders().set("Access-Control-Allow-Methods", "GET, POST, PATCH, PUT, DELETE, OPTIONS");
        exchange.getResponseHeaders().set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With");
        exchange.sendResponseHeaders(statusCode, bytes.length);
        try (OutputStream os = exchange.getResponseBody()) {
            os.write(bytes);
        }
    }

    private static boolean handleOptions(HttpExchange exchange) throws IOException {
        if ("OPTIONS".equalsIgnoreCase(exchange.getRequestMethod())) {
            exchange.getResponseHeaders().set("Access-Control-Allow-Origin", "*");
            exchange.getResponseHeaders().set("Access-Control-Allow-Methods", "GET, POST, PATCH, PUT, DELETE, OPTIONS");
            exchange.getResponseHeaders().set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With");
            exchange.sendResponseHeaders(204, -1);
            return true;
        }
        return false;
    }

    private static String readBody(HttpExchange exchange) throws IOException {
        try (InputStream is = exchange.getRequestBody()) {
            return new String(is.readAllBytes(), StandardCharsets.UTF_8);
        }
    }

    private static Map<String, String> parseQueryParams(String query) {
        Map<String, String> params = new HashMap<>();
        if (query == null || query.isEmpty()) return params;
        for (String pair : query.split("&")) {
            String[] kv = pair.split("=");
            if (kv.length == 2) params.put(kv[0], kv[1]);
            else if (kv.length == 1) params.put(kv[0], "");
        }
        return params;
    }

    // Simple JSON Value Extractor for body parsing without heavy libraries
    private static String extractJsonString(String json, String key) {
        String search = "\"" + key + "\":";
        int idx = json.indexOf(search);
        if (idx == -1) return null;
        int start = json.indexOf("\"", idx + search.length());
        if (start == -1) return null;
        int end = json.indexOf("\"", start + 1);
        if (end == -1) return null;
        return json.substring(start + 1, end);
    }

    private static Double extractJsonDouble(String json, String key) {
        String search = "\"" + key + "\":";
        int idx = json.indexOf(search);
        if (idx == -1) return null;
        int start = idx + search.length();
        while (start < json.length() && Character.isWhitespace(json.charAt(start))) start++;
        int end = start;
        while (end < json.length() && (Character.isDigit(json.charAt(end)) || json.charAt(end) == '.' || json.charAt(end) == '-')) end++;
        if (start == end) return null;
        try {
            return Double.parseDouble(json.substring(start, end));
        } catch (Exception e) { return null; }
    }

    private static Integer extractJsonInt(String json, String key) {
        Double d = extractJsonDouble(json, key);
        return d != null ? d.intValue() : null;
    }

    // ----------------- AUTH HELPERS -----------------

    /** Validates session from Authorization header; returns null if invalid */
    private User requireAuth(HttpExchange exchange) {
        String authHeader = exchange.getRequestHeaders().getFirst("Authorization");
        try {
            String token = authService.getSessionFromHeader(authHeader);
            return authService.validateSession(token);
        } catch (AuthException e) {
            return null;
        }
    }

    /** Validates session and checks ADMIN role; returns null if not admin */
    private User requireAdmin(HttpExchange exchange) {
        User user = requireAuth(exchange);
        if (user != null && user.getRole() == Role.ADMIN) {
            return user;
        }
        return null;
    }

    // ----------------- HANDLERS -----------------

    private class HealthHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            if (handleOptions(exchange)) return;
            String json = String.format("{\"status\":\"UP\",\"system\":\"NALAM NAGAR Java 17 Dispatch Core\",\"timestamp\":%d}", System.currentTimeMillis());
            sendResponse(exchange, 200, json);
        }
    }

    private class AuthHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            if (handleOptions(exchange)) return;
            String path = exchange.getRequestURI().getPath();
            String method = exchange.getRequestMethod().toUpperCase();

            try {
                if (path.endsWith("/signup") && "POST".equals(method)) {
                    String body = readBody(exchange);
                    String name = extractJsonString(body, "fullName");
                    String email = extractJsonString(body, "email");
                    String password = extractJsonString(body, "password");
                    String confirmPassword = extractJsonString(body, "confirmPassword");
                    User user = authService.signup(name, email, password, confirmPassword);
                    sendResponse(exchange, 201, serializeUser(user));

                } else if (path.endsWith("/login") && "POST".equals(method)) {
                    String body = readBody(exchange);
                    String email = extractJsonString(body, "email");
                    String password = extractJsonString(body, "password");
                    Session session = authService.login(email, password);
                    User user = authService.getUserByEmail(email);
                    String json = String.format("{\"token\":\"%s\",\"user\":%s}",
                            session.getToken(), serializeUser(user));
                    sendResponse(exchange, 200, json);

                } else if (path.endsWith("/logout") && "POST".equals(method)) {
                    String authHeader = exchange.getRequestHeaders().getFirst("Authorization");
                    try {
                        String token = authService.getSessionFromHeader(authHeader);
                        authService.logout(token);
                    } catch (AuthException ignored) {}
                    sendResponse(exchange, 200, "{\"success\":true,\"message\":\"Logged out\"}");

                } else if (path.endsWith("/me") && "GET".equals(method)) {
                    String authHeader = exchange.getRequestHeaders().getFirst("Authorization");
                    String token = authService.getSessionFromHeader(authHeader);
                    User user = authService.validateSession(token);
                    sendResponse(exchange, 200, serializeUser(user));

                } else if (path.endsWith("/password") && "PATCH".equals(method)) {
                    String authHeader = exchange.getRequestHeaders().getFirst("Authorization");
                    String token = authService.getSessionFromHeader(authHeader);
                    User user = authService.validateSession(token);
                    String body = readBody(exchange);
                    String currentPassword = extractJsonString(body, "currentPassword");
                    String newPassword = extractJsonString(body, "newPassword");
                    authService.changePassword(user.getEmail(), currentPassword, newPassword);
                    sendResponse(exchange, 200, "{\"success\":true,\"message\":\"Password changed\"}");

                } else {
                    sendResponse(exchange, 404, "{\"error\":\"Not found\"}");
                }
            } catch (AuthException ae) {
                sendResponse(exchange, 401, String.format("{\"error\":\"%s\"}", escape(ae.getMessage())));
            } catch (Exception ex) {
                sendResponse(exchange, 400, String.format("{\"error\":\"%s\"}", escape(ex.getMessage())));
            }
        }

        private String serializeUser(User u) {
            return String.format("{\"id\":\"%s\",\"fullName\":\"%s\",\"email\":\"%s\",\"role\":\"%s\"}",
                    u.getId(), escape(u.getFullName()), u.getEmail(), u.getRole().name());
        }
    }

    private class StatsHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            if (handleOptions(exchange)) return;
            if (requireAuth(exchange) == null) { sendResponse(exchange, 401, "{\"error\":\"Authentication required\"}"); return; }

            long criticalPending = 0;
            long seriousPending = 0;
            long minorPending = 0;
            for (EmergencyRequest r : dispatchService.getPendingQueue().getSortedSnapshot()) {
                if (r.getSeverity() == Severity.CRITICAL) criticalPending++;
                else if (r.getSeverity() == Severity.SERIOUS) seriousPending++;
                else minorPending++;
            }

            long availAmbs = 0;
            for (Ambulance a : dispatchService.getAllAmbulances()) {
                if (a.isAvailable()) availAmbs++;
            }

            int totalFreeBeds = 0;
            int totalBeds = 0;
            for (Hospital h : hospitalService.getAllHospitals()) {
                totalFreeBeds += h.getAvailableBeds();
                totalBeds += h.getTotalBeds();
            }

            int activeTrips = tripService.getActiveTrips().size();
            int closedRoads = roadNetwork.getClosedRoadIds().size();

            String json = String.format(
                    "{\"pendingTotal\":%d,\"pendingCritical\":%d,\"pendingSerious\":%d,\"pendingMinor\":%d," +
                    "\"availableAmbulances\":%d,\"totalAmbulances\":%d,\"availableBeds\":%d,\"totalBeds\":%d," +
                    "\"activeTrips\":%d,\"closedRoads\":%d,\"locationsCount\":%d,\"roadsCount\":%d," +
                    "\"lastRecalculationEpoch\":%d}",
                    (criticalPending + seriousPending + minorPending), criticalPending, seriousPending, minorPending,
                    availAmbs, dispatchService.getAllAmbulances().size(), totalFreeBeds, totalBeds,
                    activeTrips, closedRoads, roadNetwork.getAllLocations().size(), roadNetwork.getAllRoads().size(),
                    lastRecalculationEpochMs
            );
            sendResponse(exchange, 200, json);
        }
    }

    private class RequestsHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            if (handleOptions(exchange)) return;
            if (requireAuth(exchange) == null) { sendResponse(exchange, 401, "{\"error\":\"Authentication required\"}"); return; }

            String method = exchange.getRequestMethod().toUpperCase();
            if ("GET".equals(method)) {
                StringBuilder sb = new StringBuilder("[");
                boolean first = true;
                for (EmergencyRequest r : dispatchService.getAllRequests()) {
                    if (!first) sb.append(",");
                    first = false;
                    sb.append(serializeRequest(r));
                }
                sb.append("]");
                sendResponse(exchange, 200, sb.toString());
            } else if ("POST".equals(method)) {
                String body = readBody(exchange);
                String caller = extractJsonString(body, "callerName");
                String phone = extractJsonString(body, "contactNumber");
                String loc = extractJsonString(body, "incidentLocationId");
                String sevStr = extractJsonString(body, "severity");
                String facility = extractJsonString(body, "requiredFacility");
                String desc = extractJsonString(body, "description");

                if (loc == null || loc.trim().isEmpty()) {
                    sendResponse(exchange, 400, "{\"error\":\"incidentLocationId is required\"}");
                    return;
                }
                Severity sev = Severity.fromString(sevStr);
                String id = "REQ-" + (System.currentTimeMillis() % 100000);

                try {
                    EmergencyRequest req = dispatchService.submitRequest(id, caller, phone, loc, sev, facility, desc);
                    sendResponse(exchange, 201, serializeRequest(req));
                } catch (Exception e) {
                    sendResponse(exchange, 400, "{\"error\":\"" + e.getMessage() + "\"}");
                }
            } else {
                sendResponse(exchange, 405, "{\"error\":\"Method Not Allowed\"}");
            }
        }
    }

    private class DispatchHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            if (handleOptions(exchange)) return;
            String path = exchange.getRequestURI().getPath();

            if ("POST".equalsIgnoreCase(exchange.getRequestMethod())) {
                try {
                    Trip trip;
                    if (path.endsWith("/next")) {
                        trip = dispatchService.dispatchNext();
                    } else {
                        // Extract request ID from path: /api/dispatch/{requestId}
                        String[] parts = path.split("/");
                        String reqId = parts[parts.length - 1];
                        EmergencyRequest req = dispatchService.getRequest(reqId);
                        if (req == null) {
                            sendResponse(exchange, 404, "{\"error\":\"Request not found: " + reqId + "\"}");
                            return;
                        }
                        trip = dispatchService.dispatch(req);
                    }
                    sendResponse(exchange, 200, serializeTrip(trip));
                } catch (NalamNagarException nne) {
                    sendResponse(exchange, 409, String.format("{\"error\":\"%s\",\"type\":\"%s\"}",
                            nne.getMessage(), nne.getClass().getSimpleName()));
                } catch (Exception ex) {
                    sendResponse(exchange, 400, "{\"error\":\"" + ex.getMessage() + "\"}");
                }
            } else {
                sendResponse(exchange, 405, "{\"error\":\"Method Not Allowed\"}");
            }
        }
    }

    private class AmbulancesHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            if (handleOptions(exchange)) return;
            if ("GET".equalsIgnoreCase(exchange.getRequestMethod())) {
                StringBuilder sb = new StringBuilder("[");
                boolean first = true;
                for (Ambulance a : dispatchService.getAllAmbulances()) {
                    if (!first) sb.append(",");
                    first = false;
                    sb.append(String.format("{\"id\":\"%s\",\"registrationNumber\":\"%s\",\"currentLocationId\":\"%s\"," +
                                    "\"baseHospitalId\":\"%s\",\"status\":\"%s\",\"totalTripsCompleted\":%d}",
                            a.getId(), a.getRegistrationNumber(), a.getCurrentLocationId(),
                            a.getBaseHospitalId(), a.getStatus(), a.getTotalTripsCompleted()));
                }
                sb.append("]");
                sendResponse(exchange, 200, sb.toString());
            } else {
                sendResponse(exchange, 405, "{\"error\":\"Method Not Allowed\"}");
            }
        }
    }

    private class HospitalsHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            if (handleOptions(exchange)) return;
            String path = exchange.getRequestURI().getPath();
            String method = exchange.getRequestMethod().toUpperCase();

            if ("GET".equals(method)) {
                StringBuilder sb = new StringBuilder("[");
                boolean first = true;
                for (Hospital h : hospitalService.getAllHospitals()) {
                    if (!first) sb.append(",");
                    first = false;
                    sb.append(serializeHospital(h));
                }
                sb.append("]");
                sendResponse(exchange, 200, sb.toString());
            } else if ("PATCH".equals(method) && path.contains("/capacity")) {
                // PATCH /api/hospitals/{id}/capacity
                String[] parts = path.split("/");
                String hospId = parts[parts.length - 2];
                String body = readBody(exchange);
                Integer beds = extractJsonInt(body, "availableBeds");
                if (beds == null) {
                    sendResponse(exchange, 400, "{\"error\":\"availableBeds is required\"}");
                    return;
                }
                try {
                    boolean ok = hospitalService.updateAvailableBeds(hospId, beds);
                    if (!ok) {
                        sendResponse(exchange, 404, "{\"error\":\"Hospital not found\"}");
                        return;
                    }
                    sendResponse(exchange, 200, serializeHospital(hospitalService.getHospital(hospId)));
                } catch (Exception ex) {
                    sendResponse(exchange, 400, "{\"error\":\"" + ex.getMessage() + "\"}");
                }
            } else {
                sendResponse(exchange, 405, "{\"error\":\"Method Not Allowed\"}");
            }
        }
    }

    private class NetworkHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            if (handleOptions(exchange)) return;
            if ("GET".equalsIgnoreCase(exchange.getRequestMethod())) {
                StringBuilder sb = new StringBuilder("{\"locations\":[");
                boolean first = true;
                for (Location loc : roadNetwork.getAllLocations()) {
                    if (!first) sb.append(",");
                    first = false;
                    sb.append(String.format("{\"id\":\"%s\",\"name\":\"%s\",\"zoneType\":\"%s\",\"x\":%.1f,\"y\":%.1f}",
                            loc.getId(), loc.getName(), loc.getZoneType(), loc.getX(), loc.getY()));
                }
                sb.append("],\"roads\":[");
                first = true;
                for (Road r : roadNetwork.getAllRoads()) {
                    if (r.getId().endsWith("-R")) continue; // Only return primary directed road edges for clean display
                    if (!first) sb.append(",");
                    first = false;
                    sb.append(String.format("{\"id\":\"%s\",\"sourceId\":\"%s\",\"destinationId\":\"%s\"," +
                                    "\"baseMinutes\":%.1f,\"currentMinutes\":%.1f,\"closed\":%b,\"closureReason\":\"%s\"}",
                            r.getId(), r.getSourceId(), r.getDestinationId(),
                            r.getBaseMinutes(), r.getCurrentMinutes(), r.isClosed(), r.getClosureReason()));
                }
                sb.append("]}");
                sendResponse(exchange, 200, sb.toString());
            } else {
                sendResponse(exchange, 405, "{\"error\":\"Method Not Allowed\"}");
            }
        }
    }

    private class RoadsHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            if (handleOptions(exchange)) return;
            String path = exchange.getRequestURI().getPath();
            String method = exchange.getRequestMethod().toUpperCase();
            String[] parts = path.split("/");

            if (parts.length >= 4) {
                String roadId = parts[3];
                String action = parts.length > 4 ? parts[4] : "";

                try {
                    List<String> recalcLogs = Collections.emptyList();
                    if ("PATCH".equals(method) && "traffic".equals(action)) {
                        String body = readBody(exchange);
                        Double travelTime = extractJsonDouble(body, "currentMinutes");
                        if (travelTime == null || travelTime <= 0) {
                            sendResponse(exchange, 400, "{\"error\":\"Valid currentMinutes (> 0) required\"}");
                            return;
                        }
                        recalcLogs = trafficService.updateTrafficDelay(roadId, travelTime);
                        lastRecalculationEpochMs = System.currentTimeMillis();
                    } else if ("POST".equals(method) && "close".equals(action)) {
                        String body = readBody(exchange);
                        String reason = extractJsonString(body, "reason");
                        recalcLogs = trafficService.closeRoad(roadId, reason != null ? reason : "Road Closure");
                        lastRecalculationEpochMs = System.currentTimeMillis();
                    } else if ("POST".equals(method) && "open".equals(action)) {
                        recalcLogs = trafficService.reopenRoad(roadId);
                        lastRecalculationEpochMs = System.currentTimeMillis();
                    } else {
                        sendResponse(exchange, 404, "{\"error\":\"Unknown road action\"}");
                        return;
                    }

                    Road r = roadNetwork.getRoad(roadId);
                    StringBuilder logsJson = new StringBuilder("[");
                    for (int i = 0; i < recalcLogs.size(); i++) {
                        if (i > 0) logsJson.append(",");
                        logsJson.append("\"").append(recalcLogs.get(i).replace("\"", "\\\"")).append("\"");
                    }
                    logsJson.append("]");

                    String res = String.format("{\"success\":true,\"roadId\":\"%s\",\"currentMinutes\":%.1f," +
                                    "\"closed\":%b,\"recalculations\":%s}",
                            roadId, r != null ? r.getCurrentMinutes() : 0.0, r != null && r.isClosed(), logsJson);
                    sendResponse(exchange, 200, res);
                } catch (Exception ex) {
                    sendResponse(exchange, 400, "{\"error\":\"" + ex.getMessage() + "\"}");
                }
            } else {
                sendResponse(exchange, 404, "{\"error\":\"Not Found\"}");
            }
        }
    }

    private class RouteHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            if (handleOptions(exchange)) return;
            if ("GET".equalsIgnoreCase(exchange.getRequestMethod())) {
                Map<String, String> q = parseQueryParams(exchange.getRequestURI().getQuery());
                String from = q.get("from");
                String to = q.get("to");
                if (from == null || to == null) {
                    sendResponse(exchange, 400, "{\"error\":\"Parameters 'from' and 'to' are required\"}");
                    return;
                }
                RouteResult res = routeService.calculateRoute(from, to);
                StringBuilder pathJson = new StringBuilder("[");
                for (int i = 0; i < res.getPath().size(); i++) {
                    if (i > 0) pathJson.append(",");
                    pathJson.append("\"").append(res.getPath().get(i)).append("\"");
                }
                pathJson.append("]");

                String json = String.format("{\"from\":\"%s\",\"to\":\"%s\",\"reachable\":%b," +
                        "\"totalMinutes\":%.2f,\"path\":%s}",
                        from, to, res.isReachable(), res.isReachable() ? res.getTotalTimeMinutes() : 0.0, pathJson);
                sendResponse(exchange, 200, json);
            } else {
                sendResponse(exchange, 405, "{\"error\":\"Method Not Allowed\"}");
            }
        }
    }

    private class TripsHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            if (handleOptions(exchange)) return;
            String path = exchange.getRequestURI().getPath();
            String method = exchange.getRequestMethod().toUpperCase();

            if ("GET".equals(method)) {
                StringBuilder sb = new StringBuilder("[");
                boolean first = true;
                for (Trip t : tripService.getAllTrips()) {
                    if (!first) sb.append(",");
                    first = false;
                    sb.append(serializeTrip(t));
                }
                sb.append("]");
                sendResponse(exchange, 200, sb.toString());
            } else if ("POST".equals(method) && path.endsWith("/complete")) {
                // POST /api/trips/{id}/complete
                String[] parts = path.split("/");
                String tripId = parts[parts.length - 2];
                try {
                    String completionReport = dispatchService.completeTrip(tripId);
                    Trip trip = tripService.getTrip(tripId);
                    String json = String.format("{\"success\":true,\"tripId\":\"%s\",\"message\":\"%s\",\"trip\":%s}",
                            tripId, completionReport.replace("\"", "\\\"").replace("\n", " "), serializeTrip(trip));
                    sendResponse(exchange, 200, json);
                } catch (Exception ex) {
                    sendResponse(exchange, 400, "{\"error\":\"" + ex.getMessage() + "\"}");
                }
            } else {
                sendResponse(exchange, 405, "{\"error\":\"Method Not Allowed\"}");
            }
        }
    }

    private class ResetHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            if (handleOptions(exchange)) return;
            if ("POST".equalsIgnoreCase(exchange.getRequestMethod())) {
                // Clear and reload initial sample data
                hospitalService.clear();
                tripService.clear();
                dispatchService.getPendingQueue().clear();
                DataLoader.loadSampleData(roadNetwork, hospitalService, dispatchService);
                lastRecalculationEpochMs = System.currentTimeMillis();
                sendResponse(exchange, 200, "{\"success\":true,\"message\":\"Sample dataset reloaded cleanly\"}");
            } else {
                sendResponse(exchange, 405, "{\"error\":\"Method Not Allowed\"}");
            }
        }
    }

    // ----------------- SERIALIZERS -----------------

    private static String serializeRequest(EmergencyRequest r) {
        return String.format("{\"id\":\"%s\",\"callerName\":\"%s\",\"contactNumber\":\"%s\"," +
                        "\"incidentLocationId\":\"%s\",\"severity\":\"%s\",\"requiredFacility\":\"%s\"," +
                        "\"description\":\"%s\",\"createdAt\":%d,\"status\":\"%s\"," +
                        "\"assignedAmbulanceId\":%s,\"assignedHospitalId\":%s}",
                r.getId(), escape(r.getCallerName()), escape(r.getContactNumber()),
                r.getIncidentLocationId(), r.getSeverity().name(), r.getRequiredFacility(),
                escape(r.getDescription()), r.getCreatedAtEpochMs(), r.getStatus().name(),
                r.getAssignedAmbulanceId() != null ? "\"" + r.getAssignedAmbulanceId() + "\"" : "null",
                r.getAssignedHospitalId() != null ? "\"" + r.getAssignedHospitalId() + "\"" : "null");
    }

    private static String serializeHospital(Hospital h) {
        StringBuilder caps = new StringBuilder("[");
        boolean first = true;
        for (String c : h.getCapabilities()) {
            if (!first) caps.append(",");
            first = false;
            caps.append("\"").append(c).append("\"");
        }
        caps.append("]");

        return String.format("{\"id\":\"%s\",\"name\":\"%s\",\"locationId\":\"%s\"," +
                        "\"totalBeds\":%d,\"availableBeds\":%d,\"capabilities\":%s}",
                h.getId(), escape(h.getName()), h.getLocationId(),
                h.getTotalBeds(), h.getAvailableBeds(), caps);
    }

    private static String serializeTrip(Trip t) {
        StringBuilder incPath = new StringBuilder("[");
        for (int i = 0; i < t.getPathToIncident().size(); i++) {
            if (i > 0) incPath.append(",");
            incPath.append("\"").append(t.getPathToIncident().get(i)).append("\"");
        }
        incPath.append("]");

        StringBuilder hospPath = new StringBuilder("[");
        for (int i = 0; i < t.getPathToHospital().size(); i++) {
            if (i > 0) hospPath.append(",");
            hospPath.append("\"").append(t.getPathToHospital().get(i)).append("\"");
        }
        hospPath.append("]");

        return String.format("{\"id\":\"%s\",\"requestId\":\"%s\",\"ambulanceId\":\"%s\"," +
                        "\"hospitalId\":\"%s\",\"incidentLocationId\":\"%s\"," +
                        "\"pathToIncident\":%s,\"timeToIncidentMinutes\":%.2f," +
                        "\"pathToHospital\":%s,\"timeToHospitalMinutes\":%.2f," +
                        "\"totalMinutes\":%.2f,\"completed\":%b,\"blocked\":%b," +
                        "\"startTime\":%d,\"endTime\":%s,\"reasoning\":\"%s\"}",
                t.getId(), t.getRequestId(), t.getAmbulanceId(),
                t.getHospitalId(), t.getIncidentLocationId(),
                incPath, t.getTimeToIncidentMinutes(),
                hospPath, t.getTimeToHospitalMinutes(),
                t.getTotalEstimatedMinutes(), t.isCompleted(), t.isBlocked(),
                t.getStartTimeEpochMs(),
                t.getEndTimeEpochMs() != null ? t.getEndTimeEpochMs().toString() : "null",
                escape(t.getDispatchReasoning()));
    }

    private static String escape(String s) {
        if (s == null) return "";
        return s.replace("\\", "\\\\").replace("\"", "\\\"").replace("\n", "\\n").replace("\r", "");
    }
}
