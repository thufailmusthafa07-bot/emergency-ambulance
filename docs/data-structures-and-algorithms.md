# Data Structures & Algorithms Justification
## Nalam Nagar Emergency Dispatch System (Java 17)

---

### 1. Data Structures Justification Table

| Data Structure | Implementation in Code | Where Used | Architectural Justification | Time Complexity | Space Complexity |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Graph as Adjacency List** | `Map<String, List<Road>>` | `RoadNetwork.java` | Town network is sparse ($|E| \ll |V|^2$). Avoids $O(V^2)$ matrix memory overhead while enabling fast $O(\text{deg}(V))$ neighbor iteration during Dijkstra exploration. | Vertex Lookup: $O(1)$<br>Edge Iteration: $O(\text{deg}(V))$ | $O(V + E)$ |
| **PriorityQueue (Min-Heap)** | `PriorityQueue<NodeEntry>` | `RoadNetwork.java` | All road weights represent strictly positive minutes ($w > 0$). Min-heap guarantees Dijkstra selects the globally optimal sub-path in logarithmic extraction time. | Insert: $O(\log V)$<br>Extract-Min: $O(\log V)$<br>Total Dijkstra: $O((V + E) \log V)$ | $O(V)$ |
| **PriorityQueue (Max-Heap equivalent)** | `PriorityQueue<EmergencyRequest>` | `RequestPriorityQueue.java` | Solves triage inversion. Orders emergency tickets by triage rank (Critical 1 > Serious 2 > Minor 3), resolving ties via arrival timestamp (FIFO). | Enqueue: $O(\log n)$<br>Peek: $O(1)$<br>Poll: $O(\log n)$ | $O(n)$ |
| **Hash Map** | `HashMap<String, T>` | `DispatchService`, `HospitalService`, `RoadNetwork` | Instant direct key-based lookup for town locations, ambulances, hospitals, and requests by their unique alphanumeric ID. | Average Get/Put: $O(1)$<br>Worst: $O(n)$ | $O(n)$ |
| **Hash Set** | `HashSet<String>` | `Hospital.java`, `RoadNetwork.java` | Constant-time lookup to verify closed road exclusions and hospital clinical facility accreditation. | Contains: $O(1)$ | $O(k)$ |
| **Linked List / Deque** | `LinkedList<Trip>` | `TripService.java` | Maintains an audit history log of all emergency trips in chronological order. | Append: $O(1)$<br>Iteration: $O(n)$ | $O(n)$ |

---

### 2. Algorithmic Big-O Analysis

#### A. Dijkstra's Algorithm
```java
// Predecessor map stores shortest path tree
Map<String, Double> minTimeTo = new HashMap<>();
PriorityQueue<NodeEntry> pq = new PriorityQueue<>(Comparator.comparingDouble(NodeEntry::getTime));
```
- **Time Complexity**: $\mathcal{O}((V + E) \log V)$ where $V = 14$ locations and $E = 50$ directed road edges.
- **Space Complexity**: $\mathcal{O}(V)$ for the distance map, visited set, and predecessor tree.

#### B. Multi-Factor Hospital Selection
- Evaluates $H$ registered hospitals ($H = 4$).
- For each hospital:
  1. Facility match check via `Set.contains`: $\mathcal{O}(1)$.
  2. Free beds check: $\mathcal{O}(1)$.
  3. Shortest path computation via Dijkstra: $\mathcal{O}((V + E) \log V)$.
- **Total Time Complexity**: $\mathcal{O}(H \times (V + E) \log V)$. Since $H \le 4$, execution takes under $2$ milliseconds in Java memory.

#### C. Active Mission Route Recalculation
- Triggered whenever a road travel time changes or a road is closed/reopened.
- Iterates over $T$ active missions ($T \le 4$).
- For each mission, recalculates Leg 1 and Leg 2: $2 \times \mathcal{O}((V + E) \log V)$.
- If either leg is unreachable, flags trip as `Route Blocked` in $\mathcal{O}(1)$ time without throwing uncaught exceptions.
