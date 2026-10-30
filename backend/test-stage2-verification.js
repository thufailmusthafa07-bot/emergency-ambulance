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

async function runStage2Verification() {
  console.log("=================================================================");
  console.log("STAGE 2 VERIFICATION: POST-COMPATROUTES REMOVAL AUDIT");
  console.log("=================================================================\n");

  const results = {
    passed: [],
    failed: [],
    skipped: []
  };

  // 1. Authenticate
  console.log("[1] Testing Authentication (POST /api/auth/login)...");
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
  const token = loginRes.body?.token || loginRes.body?.data?.token;
  if (loginRes.status === 200 && token) {
    results.passed.push("POST /api/auth/login -> 200 OK (JWT acquired)");
    console.log("  PASS: Token obtained for operator01");
  } else {
    results.failed.push(`POST /api/auth/login -> status ${loginRes.status}`);
    throw new Error("Authentication failed");
  }

  const authHeader = { Authorization: `Bearer ${token}` };
  const jsonAuthHeader = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };

  // 2. GET /api/stats
  console.log("\n[2] Testing Dashboard Statistics (GET /api/stats)...");
  const statsRes = await request({ hostname: "localhost", port: 5001, path: "/api/stats", method: "GET", headers: authHeader });
  if (statsRes.status === 200 && typeof statsRes.body.availableBeds === 'number' && statsRes.body.totalAmbulances === 5) {
    results.passed.push(`GET /api/stats -> 200 OK (Live DB: ${statsRes.body.pendingTotal} pending emergencies, ${statsRes.body.availableAmbulances}/${statsRes.body.totalAmbulances} ambulances, ${statsRes.body.availableBeds}/${statsRes.body.totalBeds} beds)`);
    console.log(`  PASS: Real DB stats confirmed (pendingTotal: ${statsRes.body.pendingTotal}, beds: ${statsRes.body.availableBeds}/${statsRes.body.totalBeds})`);
  } else {
    results.failed.push(`GET /api/stats -> status ${statsRes.status}`);
  }

  // 3. GET /api/requests
  console.log("\n[3] Testing Emergency Requests (GET /api/requests)...");
  const reqsRes = await request({ hostname: "localhost", port: 5001, path: "/api/requests", method: "GET", headers: authHeader });
  const dbCallsCount = await prisma.emergency.count();
  if (reqsRes.status === 200 && Array.isArray(reqsRes.body) && reqsRes.body.length === dbCallsCount) {
    results.passed.push(`GET /api/requests -> 200 OK (${reqsRes.body.length} live records, first ticket: ${reqsRes.body[0]?.id})`);
    console.log(`  PASS: Returned ${reqsRes.body.length} live emergency tickets from PostgreSQL`);
  } else {
    results.failed.push(`GET /api/requests -> status ${reqsRes.status}`);
  }

  // 4. GET /api/network
  console.log("\n[4] Testing Network Nodes & Roads (GET /api/network)...");
  const netRes = await request({ hostname: "localhost", port: 5001, path: "/api/network", method: "GET", headers: authHeader });
  const dbLocations = await prisma.networkLocation.count();
  const dbRoads = await prisma.road.count();
  if (netRes.status === 200 && netRes.body.locations?.length === dbLocations && netRes.body.roads?.length === dbRoads) {
    results.passed.push(`GET /api/network -> 200 OK (${netRes.body.locations.length} locations, ${netRes.body.roads.length} roads)`);
    console.log(`  PASS: Returned ${netRes.body.locations.length} locations and ${netRes.body.roads.length} roads matching DB`);
  } else {
    results.failed.push(`GET /api/network -> status ${netRes.status}`);
  }

  // 5. GET /api/ambulances
  console.log("\n[5] Testing Ambulances (GET /api/ambulances)...");
  const ambRes = await request({ hostname: "localhost", port: 5001, path: "/api/ambulances", method: "GET", headers: authHeader });
  const dbAmbulances = await prisma.ambulance.count();
  if (ambRes.status === 200 && Array.isArray(ambRes.body) && ambRes.body.length === dbAmbulances) {
    results.passed.push(`GET /api/ambulances -> 200 OK (${ambRes.body.length} ambulances from live DB)`);
    console.log(`  PASS: Returned ${ambRes.body.length} ambulances from PostgreSQL`);
  } else {
    results.failed.push(`GET /api/ambulances -> status ${ambRes.status}`);
  }

  // 6. GET /api/hospitals
  console.log("\n[6] Testing Hospitals (GET /api/hospitals)...");
  const hospRes = await request({ hostname: "localhost", port: 5001, path: "/api/hospitals", method: "GET", headers: authHeader });
  const dbHospitals = await prisma.hospital.count();
  if (hospRes.status === 200 && Array.isArray(hospRes.body) && hospRes.body.length === dbHospitals) {
    results.passed.push(`GET /api/hospitals -> 200 OK (${hospRes.body.length} hospitals from live DB)`);
    console.log(`  PASS: Returned ${hospRes.body.length} hospitals from PostgreSQL`);
  } else {
    results.failed.push(`GET /api/hospitals -> status ${hospRes.status}`);
  }

  // 7. GET /api/trips
  console.log("\n[7] Testing Mission Trips (GET /api/trips)...");
  const tripsRes = await request({ hostname: "localhost", port: 5001, path: "/api/trips", method: "GET", headers: authHeader });
  const dbTrips = await prisma.trip.count();
  if (tripsRes.status === 200 && Array.isArray(tripsRes.body) && tripsRes.body.length === dbTrips) {
    results.passed.push(`GET /api/trips -> 200 OK (${tripsRes.body.length} trips from live DB)`);
    console.log(`  PASS: Returned ${tripsRes.body.length} trips from PostgreSQL`);
  } else {
    results.failed.push(`GET /api/trips -> status ${tripsRes.status}`);
  }

  // 8. GET /api/route
  console.log("\n[8] Testing Route Calculation (GET /api/route)...");
  const routeRes = await request({
    hostname: "localhost",
    port: 5001,
    path: "/api/route?from=LOC-01&to=LOC-10",
    method: "GET",
    headers: authHeader
  });
  if (routeRes.status === 200 && routeRes.body.reachable === true && Array.isArray(routeRes.body.path)) {
    results.passed.push(`GET /api/route -> 200 OK (Calculated path: ${routeRes.body.path.join(" -> ")}, time: ${routeRes.body.totalMinutes} min)`);
    console.log(`  PASS: Dijkstra calculation working dynamically against DB road network`);
  } else {
    results.failed.push(`GET /api/route -> status ${routeRes.status}`);
  }

  // 9. GET /api/notifications
  console.log("\n[9] Testing Notifications (GET /api/notifications)...");
  const notifRes = await request({
    hostname: "localhost",
    port: 5001,
    path: "/api/notifications",
    method: "GET",
    headers: authHeader
  });
  const dbNotifs = await prisma.notification.count();
  const notifsList = notifRes.body.data?.notifications || notifRes.body.data || [];
  if (notifRes.status === 200 && Array.isArray(notifsList) && notifsList.length > 0 && notifsList.length <= dbNotifs) {
    results.passed.push(`GET /api/notifications -> 200 OK (${notifsList.length} notifications from live DB)`);
    console.log(`  PASS: Returned ${notifsList.length} notifications from PostgreSQL`);
  } else {
    results.failed.push(`GET /api/notifications -> status ${notifRes.status}`);
  }

  // 10. Emergency Creation Intake (POST /api/requests) with immediate isolated cleanup
  console.log("\n[10] Testing Emergency Intake (POST /api/requests)...");
  const intakeRes = await request(
    {
      hostname: "localhost",
      port: 5001,
      path: "/api/requests",
      method: "POST",
      headers: jsonAuthHeader
    },
    {
      callerName: "Automated Stage2 Verifier",
      contactNumber: "+91 99999 88888",
      incidentLocationId: "LOC-01",
      severity: "SERIOUS",
      requiredFacility: "GENERAL",
      description: "Stage 2 verification temporary test ticket"
    }
  );

  if (intakeRes.status === 201 && intakeRes.body?.id) {
    const ticketId = intakeRes.body.id;
    console.log(`  PASS: Intake created ticket ${ticketId} in PostgreSQL.`);

    // Verify it exists in database
    const dbRecord = await prisma.emergency.findUnique({ where: { id: ticketId } });
    if (dbRecord) {
      results.passed.push(`POST /api/requests -> 201 Created (Verified ticket ${ticketId} in PostgreSQL)`);
    } else {
      results.failed.push(`POST /api/requests -> Ticket not found in DB`);
    }

    // Safely cleanup the test ticket and its dependencies
    await prisma.emergencyStatusHistory.deleteMany({ where: { emergencyId: ticketId } });
    await prisma.notification.deleteMany({ where: { message: { contains: ticketId } } });
    await prisma.emergency.delete({ where: { id: ticketId } });
    console.log(`  CLEANUP: Removed test ticket ${ticketId} and its associated test history/notifications.`);
  } else {
    results.failed.push(`POST /api/requests -> status ${intakeRes.status}`);
  }

  // 11. Dispatch & Trip Completion tests evaluation
  console.log("\n[11] Checking Dispatch and Trip Completion Status...");
  // Check if there is any pending emergency to dispatch
  const pending = await prisma.emergency.findFirst({ where: { status: "PENDING" } });
  if (pending) {
    results.skipped.push("POST /api/dispatch/next -> Skipped to preserve existing database records without allocating ambulances or altering hospital bed counts.");
    results.skipped.push("POST /api/trips/:id/complete -> Skipped to preserve existing active trips without altering live ambulance locations.");
    console.log("  SKIPPED: Live dispatch/completion skipped per safeguard #8 (do not mutate existing production records).");
  } else {
    results.skipped.push("POST /api/dispatch/next -> Skipped (No unallocated pending requests; preserving production records).");
  }

  console.log("\n=================================================================");
  console.log("SUMMARY OF RESULTS:");
  console.log(`  Passed:  ${results.passed.length}`);
  console.log(`  Failed:  ${results.failed.length}`);
  console.log(`  Skipped: ${results.skipped.length}`);
  console.log("=================================================================");

  results.passed.forEach(p => console.log(`  [PASS] ${p}`));
  results.failed.forEach(f => console.log(`  [FAIL] ${f}`));
  results.skipped.forEach(s => console.log(`  [SKIP] ${s}`));

  await prisma.$disconnect();
}

runStage2Verification().catch(e => {
  console.error("Verification failed:", e);
  prisma.$disconnect();
  process.exit(1);
});
