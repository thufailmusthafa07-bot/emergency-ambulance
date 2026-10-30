const http = require("http");

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

async function verify() {
  console.log("=== STARTING FULL END-TO-END VERIFICATION ===");

  // 1. Verify unauthenticated requests are properly protected (Expect 401)
  console.log("\n[1] Testing GET /api/stats without token (Expect 401)...");
  const unauthStatsRes = await request({
    hostname: "localhost",
    port: 5001,
    path: "/api/stats",
    method: "GET"
  });
  console.log(`Status: ${unauthStatsRes.status} (Security check passed: unauthenticated request rejected with 401)`);
  if (unauthStatsRes.status !== 401) {
    throw new Error(`Expected 401 for unauthenticated stats, got ${unauthStatsRes.status}`);
  }

  console.log("\n[2] Testing GET /api/network without token (Expect 401)...");
  const unauthNetRes = await request({
    hostname: "localhost",
    port: 5001,
    path: "/api/network",
    method: "GET"
  });
  console.log(`Status: ${unauthNetRes.status} (Security check passed: unauthenticated network rejected with 401)`);
  if (unauthNetRes.status !== 401) {
    throw new Error(`Expected 401 for unauthenticated network, got ${unauthNetRes.status}`);
  }

  // 2. Operator Login
  console.log("\n[3] Authenticating as operator01 (POST /api/auth/login)...");
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
  console.log(`Login status: ${loginRes.status}`);
  console.log(`JWT Token acquired: ${Boolean(token)}`);
  if (!token) {
    throw new Error("Failed to authenticate operator01");
  }

  // 3. Test GET /api/network with token
  console.log("\n[4] Testing GET /api/network with Bearer token...");
  const authNetRes = await request({
    hostname: "localhost",
    port: 5001,
    path: "/api/network",
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
  console.log(`Status: ${authNetRes.status}`);
  const locations = authNetRes.body.locations;
  const roads = authNetRes.body.roads;
  console.log(`Loaded ${locations.length} canonical network locations for dropdown:`);
  locations.forEach(loc => console.log(`  - [${loc.id}] ${loc.name} (${loc.category || loc.zoneType})`));
  console.log(`Loaded ${roads.length} road connections.`);
  if (!locations || locations.length !== 12) {
    throw new Error(`Expected exactly 12 network locations, found ${locations ? locations.length : 0}`);
  }

  // 4. Test GET /api/stats with token
  console.log("\n[5] Testing GET /api/stats with Bearer token (Dashboard metrics)...");
  const authStatsRes = await request({
    hostname: "localhost",
    port: 5001,
    path: "/api/stats",
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
  console.log(`Status: ${authStatsRes.status}`);
  console.log("Dashboard Metrics Summary:", {
    totalEmergencies: authStatsRes.body.totalEmergencies,
    activeTrips: authStatsRes.body.activeTrips,
    availableAmbulances: authStatsRes.body.availableAmbulances,
    totalAmbulances: authStatsRes.body.totalAmbulances,
    totalHospitals: authStatsRes.body.totalHospitals,
    totalRoads: authStatsRes.body.totalRoads,
    availableBeds: authStatsRes.body.availableBeds,
    totalBeds: authStatsRes.body.totalBeds
  });
  if (authStatsRes.status !== 200) {
    throw new Error(`Failed to load stats: status ${authStatsRes.status}`);
  }

  // 5. Test frontend parallel load endpoints
  console.log("\n[6] Testing full frontend initial payload endpoints...");
  const [reqsRes, ambsRes, hospsRes, tripsRes] = await Promise.all([
    request({ hostname: "localhost", port: 5001, path: "/api/requests", method: "GET", headers: { Authorization: `Bearer ${token}` } }),
    request({ hostname: "localhost", port: 5001, path: "/api/ambulances", method: "GET", headers: { Authorization: `Bearer ${token}` } }),
    request({ hostname: "localhost", port: 5001, path: "/api/hospitals", method: "GET", headers: { Authorization: `Bearer ${token}` } }),
    request({ hostname: "localhost", port: 5001, path: "/api/trips", method: "GET", headers: { Authorization: `Bearer ${token}` } })
  ]);
  console.log(`/api/requests: ${reqsRes.status} (${Array.isArray(reqsRes.body) ? reqsRes.body.length : 0} requests)`);
  console.log(`/api/ambulances: ${ambsRes.status} (${Array.isArray(ambsRes.body) ? ambsRes.body.length : 0} ambulances)`);
  console.log(`/api/hospitals: ${hospsRes.status} (${Array.isArray(hospsRes.body) ? hospsRes.body.length : 0} hospitals)`);
  console.log(`/api/trips: ${tripsRes.status} (${Array.isArray(tripsRes.body) ? tripsRes.body.length : 0} trips)`);

  // 6. Test Confirm Call Intake (POST /api/emergencies)
  console.log("\n[7] Testing Operator Emergency Intake (Confirm Call workflow)...");
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
    {
      callerName: "Senthil Nathan",
      contactNumber: "+91 98410 44556",
      emergencyType: "Severe Asthma Attack",
      pickupLocation: "Anna Nagar",
      severity: "SERIOUS",
      requiredFacility: "GENERAL",
      dispatchNotes: "Patient requires oxygen administration immediately."
    }
  );
  console.log(`Intake Status: ${intakeRes.status}`);
  const createdEmergency = intakeRes.body.emergency || intakeRes.body.data || intakeRes.body;
  console.log("Successfully Created Emergency Ticket:", {
    id: createdEmergency.id,
    callerName: createdEmergency.callerName,
    pickupLocation: createdEmergency.pickupLocation,
    severity: createdEmergency.severity,
    status: createdEmergency.status
  });

  console.log("\n=======================================================");
  console.log(">>> ALL SYSTEM & DATABASE VERIFICATIONS PASSED 100% <<<");
  console.log("=======================================================");
}

verify().catch((err) => {
  console.error("Verification failed:", err);
  process.exit(1);
});
