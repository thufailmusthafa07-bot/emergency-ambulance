# Nalam Nagar Emergency Ambulance Dispatch & Route Optimization System
## Problem Analysis & Case Study Specifications

---

### 1. Context & Background
In the fictional town of **Nalam Nagar**, residential neighborhoods, educational institutions, industrial zones, and specialized hospitals are interconnected by a municipal road network. Previously, the town's emergency coordination center suffered from four critical operational bottlenecks:
1. **Uncontrolled Call Arrival**: Multiple calls arrive before an ambulance is freed.
2. **Naive FIFO Handling**: Emergency requests were addressed solely by arrival order, ignoring medical triage urgency.
3. **Distance vs. Time Pitfall**: The nearest ambulance by straight-line or nominal distance was frequently trapped in traffic delays.
4. **Bed & Facility Mismatch**: Patients were dispatched to hospitals lacking free beds or missing essential clinical capabilities (e.g. Trauma, Cardiac, Neuro).
5. **Route Disruption**: Road closures (monsoon waterlogging, accidents) rendered pre-planned routes impassable.

---

### 2. Core Business Rules

#### Rule 1: Operator-Driven Intake (No Automated Diagnosis)
- The human operator logs each call with caller name, contact number, incident location node, triage severity (**Critical**, **Serious**, **Minor**), and required clinical facility (**Trauma**, **Cardiac**, **Neuro**, **Pediatrics**, **General**).
- The system enforces zero automated diagnosis logic.

#### Rule 2: Triage Priority Ordering
- Pending requests are enqueued into a **PriorityQueue** sorted by severity rank:
  $$\text{Critical (1)} > \text{Serious (2)} > \text{Minor (3)}$$
- Within the same severity rank, requests break ties using **FIFO** arrival time.

#### Rule 3: Optimization Criterion = Travel Time in Minutes
- All edge weights represent **travel time in minutes** ($w > 0$).
- Distance is never used as the optimization metric.
- Dynamic traffic increases road minutes. Closed roads are strictly excluded from calculations.

#### Rule 4: Ambulance Selection
- The system evaluates all available fleet units using **Dijkstra's Shortest Path Algorithm**.
- The chosen ambulance is the one with the **lowest cumulative travel time** to the incident scene.

#### Rule 5: Hospital Selection
- Candidate hospitals must simultaneously satisfy two mandatory criteria:
  1. Possess the required clinical facility ($F \in \text{Capabilities}$).
  2. Have at least one free bed ($\text{AvailableBeds} \ge 1$).
- Among qualified candidates, the hospital with the **lowest travel time from the incident location** is selected.
- A transparent audit trail logs candidate evaluations and explicit reasons for any rejections.

#### Rule 6: Dispatch Execution
- Upon confirmation:
  - Ambulance state transitions from `AVAILABLE` to `DISPATCHED`.
  - Hospital bed is reserved ($\text{AvailableBeds} \leftarrow \text{AvailableBeds} - 1$).
  - A `Trip` record is created storing Leg 1 (Ambulance to Scene) and Leg 2 (Scene to Hospital).

#### Rule 7: Dynamic Rerouting on Network Modification
- When road travel times change or a road is closed/reopened, every **active trip** is automatically recomputed via Dijkstra.
- If a closure severs access to the destination, the trip is flagged as `Route Blocked` without crashing.

#### Rule 8: Manual Trip Completion & Auto-Assignment
- When a mission completes manually:
  - The ambulance becomes `AVAILABLE` and relocates to the destination hospital node.
  - The next highest-priority waiting call in the queue is automatically dispatched.
