# NALAM NAGAR – Emergency Ambulance Dispatch and Route Optimization System

A professional, high-performance emergency operations control-center frontend application designed for control-room operators to manage emergency requests, assign ambulances, allocate hospital bed capacity, optimize routes using Dijkstra's algorithm, monitor traffic conditions, and track emergency trips in real-time.

---

## 🚀 Key Features

1. **Emergency Control-Room Dashboard**: Live emergency request queue, ambulance fleet telemetry, hospital bed capacity meters, Recharts operational analytics, and quick-dispatch controls.
2. **Emergency Requests Management**: Full CRUD operations for emergency calls with priority queue sorting (`CRITICAL` > `SERIOUS` > `MINOR`), search, multi-criteria filtering, phone validation, and CSV export.
3. **Emergency Request Details & Timeline**: Comprehensive incident profile with an 8-step lifecycle timeline (Created ➔ Verified ➔ Assigned ➔ Dispatched ➔ At Scene ➔ Transporting ➔ At Hospital ➔ Completed).
4. **Dispatch Management Center**: Automatic selection of nearest available ambulance (minimum Dijkstra travel time) and suitable hospital facility (capacity + required medical unit check), interactive route preview, and dispatch validation checks.
5. **Ambulance Fleet Management**: Real-time fleet tracking, equipment level categorization (ALS, BLS, CCU), driver contacts, and interactive unit status progression.
6. **Hospital Network & Bed Management**: Multi-hospital bed capacity tracking, ICU readiness indicators, occupancy progress bars, and dynamic bed capacity controls.
7. **Interactive Road Network Graph**: Visual node-edge network representation connecting 12 location nodes across 22 road segments.
8. **Dijkstra Route Optimization Engine**: Graph shortest-path calculation considering real-time traffic multipliers (Low x1.0, Moderate x1.4, Heavy x2.0) and automatically bypassing closed road segments. Includes alternative route comparison.
9. **Traffic & Road Control Center**: Live traffic adjustment and dynamic road closures that instantly update route calculations across the application.
10. **Trip Progress Lifecycle**: Step-by-step trip tracking (Dispatched ➔ En Route ➔ At Scene ➔ Transporting ➔ At Hospital ➔ Completed) with automatic cascading updates to ambulance availability and hospital bed capacity upon trip completion.
11. **System Status Monitoring**: Subsystem health telemetry, SLA uptime metrics (99.98%), and live event audit logs.
12. **Academic Documentation & Settings**: Comprehensive project overview, OOP concepts, data structure breakdown, algorithm explanations, multi-language readiness (English, Tamil, Hindi), and full demo data reset capability.

---

## 🛠️ Technology Stack

- **Framework**: React 18 + Vite + TypeScript
- **Styling**: Tailwind CSS (Custom Medical Control-Center Design System)
- **Routing**: React Router DOM v6
- **Icons**: Lucide React
- **Analytics Charts**: Recharts
- **State & Persistence**: React Context API + LocalStorage Service Layer
- **Graph Algorithm**: Custom Dijkstra Shortest Path Engine (`src/utils/dijkstra.ts`)

---

## 🔑 Demo Login Credentials

- **Username**: `operator01`
- **Password**: `123456`
- **Role**: Operator / Control Center Dispatcher

---

## 📁 Folder Structure

```
src/
├── assets/             # Static brand assets
├── components/         # Reusable UI components (StatCard, Badges, Modals, Toasts)
├── context/            # Global AppContext & Reactive State Management
├── data/               # Initial realistic mock dataset (Emergencies, Fleet, Hospitals, Roads)
├── layouts/            # AppLayout, TopHeader, Sidebar & Breadcrumbs
├── pages/              # 14 Full Application Page Views
├── services/           # Service abstractions for future API integration
├── types/              # TypeScript definitions for entities & state
├── utils/              # Dijkstra engine, Priority sorter, Formatters, Validation & Storage
├── App.tsx             # Route definitions and Layout binding
├── main.tsx            # React DOM mounting
└── index.css           # Tailwind CSS directives & emergency animations
```

---

## ⚡ How to Install & Run

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Start Development Server**:
   ```bash
   npm run dev
   ```

3. **Build for Production**:
   ```bash
   npm run build
   ```

---

## 🧠 Core Algorithms & Data Structures

### 1. Dijkstra Shortest Path Algorithm
The system constructs a bi-directional weighted graph where:
- **Graph Nodes**: 12 City Locations (Central Junction, Anna Nagar, City Hospital, etc.)
- **Graph Edges**: 22 Road Segments with baseline travel times.
- **Edge Weighting**: \(\text{Travel Time} = \text{Base Time} \times \text{Traffic Multiplier}\).
- **Road Closures**: Closed roads are dynamically assigned an infinite edge weight (\(\infty\)) or skipped entirely, guaranteeing zero routing through closed segments.

### 2. Priority Dispatch Sorting
Incoming emergency calls are sorted using a 2-tier priority rule:
1. **Severity Rank**: `CRITICAL` (Rank 1) > `SERIOUS` (Rank 2) > `MINOR` (Rank 3).
2. **Creation Timestamp**: Oldest unassigned call first (FCFS within the same severity level).

---

## ⚠️ Academic Disclaimer

> **IMPORTANT**: This project is an academic prototype built to demonstrate frontend software architecture, Dijkstra route optimization algorithms, priority queue dispatching, and control-center UI design. It does not diagnose patients, determine clinical urgency, replace emergency professionals, or provide real-time medical advice.
