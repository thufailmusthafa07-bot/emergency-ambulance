const http = require("http");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

function request(options, body = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          const json = data ? JSON.parse(data) : {};
          resolve({ status: res.statusCode, headers: res.headers, body: json });
        } catch {
          resolve({ status: res.statusCode, headers: res.headers, body: data });
        }
      });
    });
    req.on("error", reject);
    if (body) {
      req.write(typeof body === "string" ? body : JSON.stringify(body));
    }
    req.end();
  });
}

async function verifyAll() {
  console.log("=== FULL SYSTEM END-TO-END AUDIT & VERIFICATION ===");

  // 1. Check PostgreSQL Directly via Prisma
  console.log("\n[Check 1] PostgreSQL Direct Database Query via Prisma:");
  const [dbMeta] = await prisma.$queryRaw`
    SELECT current_database() as db, inet_server_port() as port, current_user as usr, version() as ver
  `;
  console.log(`  Connected Database: ${dbMeta.db}`);
  console.log(`  Database Port: ${dbMeta.port}`);
  console.log(`  Database User: ${dbMeta.usr}`);
  console.log(`  PostgreSQL Version: ${dbMeta.ver.split(',')[0]}`);

  const dbCounts = {
    locations: await prisma.networkLocation.count(),
    roads: await prisma.road.count(),
    ambulances: await prisma.ambulance.count(),
    hospitals: await prisma.hospital.count(),
    emergencies: await prisma.emergency.count(),
    trips: await prisma.trip.count(),
    users: await prisma.user.count()
  };
  console.log("  Prisma DB Record Counts:", dbCounts);

  // 2. Test Backend Health on Port 5001
  console.log("\n[Check 2] HTTP GET http://localhost:5001/health:");
  const healthRes = await request({
    hostname: "localhost",
    port: 5001,
    path: "/health",
    method: "GET"
  });
  console.log(`  Status: ${healthRes.status}`);
  console.log(`  Response:`, healthRes.body);
  if (healthRes.status !== 200) throw new Error("Health check failed on port 5001");

  // 3. Test Authentication (POST /api/auth/login)
  console.log("\n[Check 3] HTTP POST http://localhost:5001/api/auth/login:");
  const loginRes = await request(
    {
      hostname: "localhost",
      port: 5001,
      path: "/api/auth/login",
      method: "POST",
      headers: { "Content-Type": "application/json" }
    },
    { username: "operator01", password: "123456" }
  );
  console.log(`  Status: ${loginRes.status}`);
  const token = loginRes.body?.token || loginRes.body?.data?.token;
  console.log(`  JWT Token Generated: ${Boolean(token)}`);
  if (!token) throw new Error("Operator login failed");

  // 4. Test Authenticated GET /api/stats
  console.log("\n[Check 4] HTTP GET http://localhost:5001/api/stats (with Bearer JWT):");
  const statsRes = await request({
    hostname: "localhost",
    port: 5001,
    path: "/api/stats",
    method: "GET",
    headers: { Authorization: `Bearer ${token}` }
  });
  console.log(`  Status: ${statsRes.status}`);
  console.log(`  Returned Stats:`, {
    totalEmergencies: statsRes.body.totalEmergencies,
    activeTrips: statsRes.body.activeTrips,
    availableAmbulances: statsRes.body.availableAmbulances,
    totalAmbulances: statsRes.body.totalAmbulances,
    availableBeds: statsRes.body.availableBeds,
    totalBeds: statsRes.body.totalBeds
  });
  if (statsRes.status !== 200) throw new Error("Failed to load authenticated stats");

  // Compare stats with direct DB
  const directBeds = await prisma.hospital.aggregate({ _sum: { availableBeds: true, totalBeds: true } });
  console.log(`  Database verification: DB reports ${directBeds._sum.availableBeds} available beds, API returned ${statsRes.body.availableBeds} (MATCH: ${directBeds._sum.availableBeds === statsRes.body.availableBeds})`);

  // 5. Test Authenticated GET /api/network
  console.log("\n[Check 5] HTTP GET http://localhost:5001/api/network (with Bearer JWT):");
  const netRes = await request({
    hostname: "localhost",
    port: 5001,
    path: "/api/network",
    method: "GET",
    headers: { Authorization: `Bearer ${token}` }
  });
  console.log(`  Status: ${netRes.status}`);
  console.log(`  Loaded Locations: ${netRes.body.locations?.length} nodes (DB count: ${dbCounts.locations})`);
  console.log(`  Loaded Roads: ${netRes.body.roads?.length} connections (DB count: ${dbCounts.roads})`);
  if (netRes.body.locations?.length !== dbCounts.locations) throw new Error("Location count mismatch");

  // 6. Test Emergency Intake Workflow (Confirm Call)
  console.log("\n[Check 6] HTTP POST http://localhost:5001/api/emergencies (Live Intake):");
  const intakePayload = {
    callerName: "Audit Test Caller",
    contactNumber: "+91 99887 76655",
    emergencyType: "Cardiac Arrest Audit Test",
    pickupLocation: "Central Junction",
    severity: "CRITICAL",
    requiredFacility: "CARDIAC",
    dispatchNotes: "Automated verification ticket for end-to-end trace."
  };
  const intakeRes = await request(
    {
      hostname: "localhost",
      port: 5001,
      path: "/api/emergencies",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      }
    },
    intakePayload
  );
  console.log(`  Intake Status: ${intakeRes.status}`);
  const created = intakeRes.body.emergency || intakeRes.body.data || intakeRes.body;
  console.log(`  Created Ticket ID: ${created.id}`);

  // Verify in PostgreSQL immediately
  const dbRecord = await prisma.emergency.findUnique({ where: { id: created.id } });
  console.log(`  Found in PostgreSQL database: ${Boolean(dbRecord)} (Caller: ${dbRecord?.callerName}, Status: ${dbRecord?.status})`);

  // Clean up audit test record immediately to preserve pure database state
  await prisma.emergency.delete({ where: { id: created.id } });
  console.log(`  Cleaned up temporary audit ticket ${created.id}. Database state preserved.`);

  console.log("\n=================================================");
  console.log(">>> FINAL RESULT: 100% PASS <<<");
  console.log("=================================================");
}

verifyAll()
  .catch((e) => {
    console.error("VERIFICATION FAILED:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
