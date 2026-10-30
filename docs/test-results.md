# Test Results & Validation Matrix
## Nalam Nagar Emergency Dispatch System

---

### 1. Test Verification Suite (15 Test Cases)

| Test ID | Scenario / Test Input | Expected Behavior | Actual Behavior | Pass / Fail |
| :---: | :--- | :--- | :--- | :---: |
| **TC-01** | Initial seed data load (14 locations, 25 bi-directional roads, 4 ambulances, 4 hospitals, 16 requests) | System initializes graph, registers fleet, sets up hospital beds, and loads triage queue. | All 14 nodes, 50 edges, 4 fleet units, 78 total beds, and 16 requests loaded into memory. | **PASS** |
| **TC-02** | Priority queue triage sorting order | Critical calls (Rank 1) appear before Serious (Rank 2) and Minor (Rank 3). | Peek returns `REQ-01` (Critical at Steel Works), followed by `REQ-02` (Critical). | **PASS** |
| **TC-03** | Dijkstra shortest path on open network (`LOC-STEEL-WORKS` &rarr; `LOC-CITY-HOSP`) | Finds lowest travel time path in minutes. | Path: `LOC-STEEL-WORKS` &rarr; `LOC-RIVERSIDE` &rarr; `LOC-TECH-CAMPUS` &rarr; `LOC-CITY-HOSP` (13.0m). | **PASS** |
| **TC-04** | Dispatch next request under available fleet | Dispatches available ambulance with lowest travel time to incident scene. | `REQ-01` dispatched to `AMB-03` (4.5 mins away at `LOC-METRO-HEART`). | **PASS** |
| **TC-05** | Hospital bed reservation upon dispatch | Destination hospital available beds decrements by 1. | City General Hospital beds decremented from 8 to 7. | **PASS** |
| **TC-06** | Fleet saturation failure handling (Dispatch when 0 ambulances free) | Throws `NoAmbulanceAvailableException` without crashing; request remains in queue. | Gracefully caught: &quot;No ambulance is currently available. Request remains queued with status WAITING.&quot; | **PASS** |
| **TC-07** | Facility capability mismatch rejection | Hospital without required facility is rejected even if closest. | Hospitals lacking &quot;CARDIAC&quot; rejected; routed to Metro Heart & Neuro Center. | **PASS** |
| **TC-08** | Zero bed capacity hospital rejection | Hospital with matching facility but 0 free beds is rejected. | Hospital with 0 beds logged as &quot;REJECTED (Zero available beds)&quot; in reasoning trace. | **PASS** |
| **TC-09** | Dynamic traffic delay adjustment | Road travel time updated; active trips recalculated. | `RD-101` travel time increased from 5.0m to 12.0m; active trip routes recalculated. | **PASS** |
| **TC-10** | Road closure exclusion | Closed road segment is omitted from all Dijkstra path searches. | Road marked closed; Dijkstra automatically takes alternate detour path. | **PASS** |
| **TC-11** | Unreachable destination handling | If all paths to destination are closed, flags trip as `Route Blocked`. | Trip flagged `Route Blocked`; system does not throw null pointer or crash. | **PASS** |
| **TC-12** | Road reopening restoration | Reopened road is re-included in pathfinding. | Reopened road restored in Dijkstra routing; active trip ETA decreases accordingly. | **PASS** |
| **TC-13** | Manual trip completion & fleet relocation | Frees ambulance, relocates to hospital node, and updates trip status to completed. | Ambulance status set to `AVAILABLE`; location updated to hospital node. | **PASS** |
| **TC-14** | Auto-dispatch upon trip completion | Completing a trip automatically assigns the next highest-priority waiting call. | Next queued Critical request auto-assigned to freed ambulance with new Trip ID. | **PASS** |
| **TC-15** | Manual hospital bed capacity update | Bed capacity adjusted with validation ($0 \le \text{beds} \le \text{total}$). | Bed count updated via API; changes reflect immediately in dispatch solver. | **PASS** |

---

### 2. Failure Case Handling Summary
- **No ambulance available**: Handled via `NoAmbulanceAvailableException` with user-friendly desk notification.
- **No hospital with required facility**: Handled via `NoSuitableHospitalException` with detailed candidate rejection audit.
- **Hospital has facility but 0 beds**: Excluded during candidate scan with explicit trace entry.
- **Destination unreachable due to closures**: Handled via `RouteResult.unreachable()` and `Route Blocked` trip status.
- **Negative or zero road travel time**: Strictly prevented by constructor input validation in `Road.java`.
