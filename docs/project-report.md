# Project Architecture & Technical Report
## Nalam Nagar Emergency Ambulance Dispatch & Route Optimization System

---

### 1. System Overview
**Nalam Nagar Dispatch System** is a high-reliability emergency coordination platform designed for a fictional municipality. It features:
- **Core Engine**: Pure Java 17, framework-free object-oriented design and classical data structures.
- **REST API Layer**: Embedded Sun/JDK `HttpServer` communicating via JSON on `http://localhost:5000`.
- **Frontend Console**: React (Vite) interface styled under the **Calm Municipal Operations Desk** design language on `http://localhost:5173`.
- **Console Mode**: Standalone menu-driven CLI running directly in the terminal via `ConsoleApp.java`.

---

### 2. UML Architecture & Class Diagram

```mermaid
classDiagram
    direction TB

    class Vehicle {
        <<abstract>>
        -String id
        -String registrationNumber
        -String currentLocationId
        +getId() String
        +getCurrentLocationId() String
        +setCurrentLocationId(String locId) void
        +getVehicleType()* String
    }

    class Ambulance {
        -AmbulanceStatus status
        -String baseHospitalId
        -int totalTripsCompleted
        +isAvailable() boolean
        +setStatus(AmbulanceStatus status) void
        +incrementTrips() void
    }

    class Facility {
        <<abstract>>
        -String id
        -String name
        -String locationId
        +getId() String
        +getName() String
        +getLocationId() String
        +getFacilityCategory()* String
    }

    class Hospital {
        -int totalBeds
        -int availableBeds
        -Set~String~ capabilities
        +reserveBed() boolean
        +releaseBed() boolean
        +hasFacility(String facility) boolean
        +setAvailableBeds(int beds) void
    }

    class Location {
        -String id
        -String name
        -String zoneType
        -double x
        -double y
        +getId() String
        +getName() String
    }

    class Road {
        -String id
        -String sourceId
        -String destinationId
        -double baseMinutes
        -double currentMinutes
        -boolean closed
        -String closureReason
        +isClosed() boolean
        +setClosed(boolean closed, String reason) void
        +setCurrentMinutes(double minutes) void
    }

    class EmergencyRequest {
        -String id
        -String callerName
        -String incidentLocationId
        -Severity severity
        -String requiredFacility
        -long createdAtEpochMs
        -RequestStatus status
        +compareTo(EmergencyRequest o) int
    }

    class Trip {
        -String id
        -String requestId
        -String ambulanceId
        -String hospitalId
        -List~String~ pathToIncident
        -double timeToIncidentMinutes
        -List~String~ pathToHospital
        -double timeToHospitalMinutes
        -boolean completed
        -boolean blocked
        -String dispatchReasoning
        +completeTrip() void
        +updateIncidentRoute(List~String~ path, double mins) void
        +updateHospitalRoute(List~String~ path, double mins) void
    }

    class RoadNetwork {
        -Map~String, Location~ locations
        -Map~String, List~Road~~ adjacencyList
        -Set~String~ closedRoadIds
        +findShortestRoute(String src, String dest) RouteResult
        +updateRoadTraffic(String roadId, double mins) void
        +closeRoad(String roadId, String reason) void
        +reopenRoad(String roadId) void
    }

    class RequestPriorityQueue {
        -PriorityQueue~EmergencyRequest~ queue
        +enqueue(EmergencyRequest req) void
        +poll() EmergencyRequest
        +peek() EmergencyRequest
    }

    class RoutePlanner {
        <<interface>>
        +calculateRoute(String from, String to) RouteResult
    }

    class DispatchStrategy {
        <<interface>>
        +dispatch(EmergencyRequest req) Trip
    }

    class RouteService {
        -RoadNetwork roadNetwork
        +calculateRoute(String from, String to) RouteResult
    }

    class DispatchService {
        -RoadNetwork roadNetwork
        -HospitalService hospitalService
        -TripService tripService
        -RequestPriorityQueue pendingQueue
        +submitRequest(...) EmergencyRequest
        +dispatchNext() Trip
        +completeTrip(String tripId) String
    }

    Vehicle <|-- Ambulance : Inheritance
    Facility <|-- Hospital : Inheritance
    RoutePlanner <|.. RouteService : Implements
    DispatchStrategy <|.. DispatchService : Implements
    RoadNetwork o-- Road : Contains Edges
    RoadNetwork o-- Location : Contains Vertices
    DispatchService o-- RoadNetwork : Dijkstra Queries
    DispatchService o-- RequestPriorityQueue : Priority Enqueue/Dequeue
    DispatchService o-- Trip : Creates
```

---

### 3. Verification & Limitations

#### Runtime Limitations
1. **In-Memory Volatility**: The system operates entirely in heap memory per case study instructions. Reloading the application or invoking `/api/reset` re-seeds the simulation from `DataLoader.java`.
2. **Fixed Graph Dimensions**: 14 named municipal locations with 25 primary bi-directional segments (50 directed edges).
3. **Discrete Node Movement**: Fleet vehicles move instantly between graph nodes upon trip confirmation and completion, reflecting operational abstractions rather than real-time continuous GPS telemetry.
