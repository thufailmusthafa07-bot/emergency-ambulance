# NALAM NAGAR Emergency Ambulance Dispatch & Route Optimization Backend

Production-ready Express.js, TypeScript, and Prisma ORM Backend API microservice for the Nalam Nagar Emergency Control Center.

## 🚀 Technologies Used
- **Node.js & Express.js**
- **TypeScript**
- **Prisma ORM** (PostgreSQL)
- **JWT (JSON Web Tokens)** & **Bcryptjs** (Authentication & Security)
- **Zod** (Request payload validation)
- **Helmet, CORS & Express Rate Limit** (Production Security & Middleware)
- **Dijkstra Algorithm Engine** (Shortest path & traffic delay optimization)

---

## 🛠️ Project Architecture

```
backend/
├── prisma/
│   ├── schema.prisma       # Database models (User, Ambulance, Hospital, Emergency, Trip, Road, AuditLog)
│   └── seed.ts             # Initial data seeding script
├── src/
│   ├── config/             # DB client and Environment configuration
│   ├── controllers/        # REST API request handlers
│   ├── middleware/         # Auth JWT verification, RBAC role guard, Error handler
│   ├── routes/             # Express API routes
│   ├── utils/              # JWT, Password hashing, Dijkstra graph solver, Response helpers
│   ├── validators/         # Zod validation schemas
│   └── index.ts            # Main application entry point
├── .env.example            # Environment variable template
├── tsconfig.json           # TypeScript configuration
└── package.json            # Node.js dependencies and scripts
```

---

## 🔑 Database Setup & Environment Variables

Copy `.env.example` to `.env` and adjust your PostgreSQL credentials:

```bash
PORT=5000
NODE_ENV=development
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/nalam_nagar_db?schema=public"
JWT_SECRET="nalam_nagar_emergency_dispatch_super_secret_jwt_key_2026"
JWT_EXPIRES_IN="7d"
CORS_ORIGIN="http://localhost:5173"
```

---

## 📦 Installation & Setup

1. **Install Dependencies**:
   ```bash
   cd backend
   npm install
   ```

2. **Generate Prisma Client**:
   ```bash
   npm run prisma:generate
   ```

3. **Run Database Migrations**:
   ```bash
   npm run prisma:migrate
   ```

4. **Seed Default Data**:
   ```bash
   npm run seed
   ```

5. **Start Development Server**:
   ```bash
   npm run dev
   ```

The server will start listening at `http://localhost:5000`.

---

## 📡 Key API Endpoints

### 🔐 Authentication (`/api/auth`)
- `POST /api/auth/register` - Create user account (Operator / Staff / Admin / Citizen)
- `POST /api/auth/login` - Authenticate user & receive JWT token
- `GET /api/auth/me` - Get logged-in user profile (Requires Auth header)
- `POST /api/auth/logout` - Invalidate session client side

### 🚑 Emergency Requests (`/api/emergencies`)
- `GET /api/emergencies` - Get list of emergency requests
- `POST /api/emergencies` - Submit new emergency request
- `GET /api/emergencies/:id` - Fetch single emergency details
- `PATCH /api/emergencies/:id/status` - Update emergency status

### 🚐 Ambulances (`/api/ambulances`)
- `GET /api/ambulances` - Get list of ambulances
- `POST /api/ambulances` - Add ambulance to fleet
- `PATCH /api/ambulances/:id/status` - Update location or operational status

### 🏥 Hospitals (`/api/hospitals`)
- `GET /api/hospitals` - List emergency hospitals
- `PATCH /api/hospitals/:id/capacity` - Update bed capacity & status

### 🧠 Dispatch & Dijkstra Optimization (`/api/dispatch`)
- `POST /api/dispatch/route` - Calculate shortest path using Dijkstra algorithm
- `POST /api/dispatch/recommend` - Find optimal ambulance & hospital match
- `POST /api/dispatch/execute` - Dispatch ambulance, allocate hospital bed, and initiate trip

### 🗺️ Road Network & Traffic (`/api/roads`)
- `GET /api/roads` - Fetch city road segments
- `PATCH /api/roads/:id/traffic` - Update traffic level (Low / Moderate / Heavy) or road status

### 📊 Dashboard Summary (`/api/dashboard`)
- `GET /api/dashboard/summary` - Aggregate metrics for emergency control center
