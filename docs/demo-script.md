# Viva Presentation & Demonstration Script
## Nalam Nagar Emergency Ambulance Dispatch System

---

### 1. Step-by-Step Live Demonstration Walkthrough

#### Step 1: Open Website or CLI
- **Web App**: Open `http://localhost:5173`. Notice the calm municipal light theme, clean top navigation bar, and live operational stats from `/api/stats`.
- **CLI App**: Run `java -cp backend-java/bin com.nalamnagar.cli.ConsoleApp`.

#### Step 2: Demonstrate Triage Priority (Triage Queue)
- Navigate to **Emergency Calls** (`/emergency-requests`).
- Notice that calls are automatically ordered by **Severity** (Critical > Serious > Minor).
- Click **Log Emergency Call**:
  - Location: `LOC-STEEL-WORKS`
  - Severity: `CRITICAL`
  - Facility: `TRAUMA`
- Observe the call immediately positioned at the very top of the priority queue.

#### Step 3: Demonstrate Automated Dispatch & Transparent Reasoning
- Go to **Dispatch Center** (`/dispatch`).
- Click **Dispatch Next Highest Priority**.
- Inspect the **Reasoning Panel**:
  - Why this ambulance was chosen (evaluated all 4 units, selected the one with lowest Dijkstra travel time to incident).
  - Which hospitals were rejected (missing facility or 0 free beds).
  - Why the chosen hospital won (has Trauma facility, has free beds, lowest travel time from scene).
- Observe available ambulances decrement by 1 and hospital available beds decrement by 1.

#### Step 4: Demonstrate Fleet Saturation Failure Handling
- Dispatch remaining calls until all 4 ambulances are deployed.
- Attempt another dispatch.
- **Result**: Gracefully handled notification: *"No ambulance is currently available. Request remains queued with status WAITING."* Zero crashes, zero uncaught stack traces.

#### Step 5: Demonstrate Dynamic Road Closure & Route Recalculation
- Go to **Traffic & Road Control** (`/traffic-roads`).
- Select road `RD-101` and click **Simulate Road Closure**.
- Check the **Active Recalculation Audit**: Every active mission immediately re-routes around the closed road using Dijkstra, displaying the old ETA vs new ETA.

#### Step 6: Complete Mission & Auto-Dispatch
- Go to **Missions** (`/trips`).
- Click **Complete Mission** on an active trip.
- Observe:
  1. The ambulance is freed and relocated to the hospital node.
  2. The next waiting Critical request in the queue is **automatically dispatched**.

---

### 2. Viva Voce Q&A Cheat Sheet

**Q1: Why did you use Dijkstra's Algorithm instead of BFS or A*?**
> *Answer:* BFS only works for unweighted graphs. In Nalam Nagar, road travel times vary from 3 to 7 minutes with real-time congestion. A* requires Euclidean distance heuristics, but in our case study, straight-line distance is explicitly misleading due to traffic delays and closures. Since all road weights are strictly positive minutes ($w > 0$), Dijkstra is mathematically guaranteed to find the globally optimal route.

**Q2: What is the time complexity of your Dijkstra implementation?**
> *Answer:* $\mathcal{O}((V + E) \log V)$ using a binary min-heap `PriorityQueue`. For our town graph of $V = 14$ nodes and $E = 50$ edges, the algorithm executes in a few microseconds.

**Q3: Why use an Adjacency List instead of an Adjacency Matrix?**
> *Answer:* Our municipal road network is sparse ($|E| \ll |V|^2$). An adjacency matrix wastes $\mathcal{O}(V^2)$ space with mostly empty cells. An adjacency list uses $\mathcal{O}(V + E)$ memory and allows iterating over incident roads in $\mathcal{O}(\text{deg}(V))$ time instead of checking all $V$ entries.

**Q4: Why use a PriorityQueue for emergency call intake?**
> *Answer:* Under the old system, calls were processed in simple arrival order (FIFO), causing critical heart attacks or trauma injuries to wait behind minor ankle sprains. The `PriorityQueue` implements a binary heap where elements are sorted by triage rank (Critical 1 > Serious 2 > Minor 3), with ties broken by arrival timestamp. It allows $\mathcal{O}(\log n)$ insertion and $\mathcal{O}(1)$ peek of the most urgent call.

**Q5: How does the system prevent patient redirection to full or unqualified hospitals?**
> *Answer:* Before computing the shortest path to any hospital, `DispatchService` filters candidates using a constant-time set membership check for the required facility ($F \in \text{Capabilities}$) and verifies that $\text{AvailableBeds} \ge 1$. If a hospital fails either test, it is logged with an explicit rejection reason in the audit trace and discarded.
