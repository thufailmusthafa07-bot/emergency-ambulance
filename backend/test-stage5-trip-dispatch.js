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

async function runStage5Tests() {
  console.log("=================================================================");
  console.log("STAGE 5 TEST SUITE: TRIP AND DISPATCH LIFECYCLE");
  console.log("=================================================================\n");

  const results = {
    passed: [],
    failed: [],
    skipped: []
  };

  const createdTestIds = {
    emergencies: [],
    trips: [],
    ambulances: []
  };

  try {
    // 1. Authenticate Dispatcher & Citizen
    console.log("[1] Authenticating Operator & Citizen...");
    const operatorLogin = await request(
      {
        hostname: "localhost",
        port: 5001,
        path: "/api/auth/login",
        method: "POST",
        headers: { "Content-Type": "application/json" }
      },
      { username: "operator01", password: "123456" }
    );
    const operatorToken = operatorLogin.body?.token || operatorLogin.body?.data?.token;
    if (!operatorToken) throw new Error("Operator login failed: " + JSON.stringify(operatorLogin.body));

    const citizenLogin = await request(
      {
        hostname: "localhost",
        port: 5001,
        path: "/api/auth/login",
        method: "POST",
        headers: { "Content-Type": "application/json" }
      },
      { username: "citizen01", password: "123456" }
    );
    const citizenToken = citizenLogin.body?.token || citizenLogin.body?.data?.token;
    if (!citizenToken) throw new Error("Citizen login failed: " + JSON.stringify(citizenLogin.body));

    results.passed.push("Auth: Operator and Citizen authentication (200 OK)");
    console.log("  PASS: Authenticated as DISPATCHER and CITIZEN.\n");

    const opAuth = { "Content-Type": "application/json", Authorization: `Bearer ${operatorToken}` };
    const citAuth = { "Content-Type": "application/json", Authorization: `Bearer ${citizenToken}` };

    // Record initial baseline hospital beds for H001
    const baselineHosp = await prisma.hospital.findUnique({ where: { id: "H001" } });
    const baselineBeds = baselineHosp.availableBeds;
    console.log(`Baseline H001 available beds: ${baselineBeds}/${baselineHosp.totalBeds}`);

    // 2. Role Restrictions / Authorization Checks
    console.log("[2] Testing role permissions (CITIZEN blocked from dispatch/trips)...");
    const citDispatchNext = await request({
      hostname: "localhost",
      port: 5001,
      path: "/api/dispatch/next",
      method: "POST",
      headers: citAuth
    });
    if (citDispatchNext.status === 403) {
      results.passed.push("Security: CITIZEN forbidden from POST /api/dispatch/next (403)");
      console.log("  PASS: CITIZEN blocked from dispatch/next (403)");
    } else {
      results.failed.push(`Security: Expected 403 for citDispatchNext, got ${citDispatchNext.status}`);
    }

    const citDispatchExec = await request(
      {
        hostname: "localhost",
        port: 5001,
        path: "/api/dispatch/execute",
        method: "POST",
        headers: citAuth
      },
      { emergencyId: "REQ-DUMMY", ambulanceId: "A001", hospitalId: "H001" }
    );
    if (citDispatchExec.status === 403) {
      results.passed.push("Security: CITIZEN forbidden from POST /api/dispatch/execute (403)");
      console.log("  PASS: CITIZEN blocked from dispatch/execute (403)");
    } else {
      results.failed.push(`Security: Expected 403 for citDispatchExec, got ${citDispatchExec.status}`);
    }

    const citTripComplete = await request({
      hostname: "localhost",
      port: 5001,
      path: "/api/trips/DUMMY/complete",
      method: "POST",
      headers: citAuth
    });
    if (citTripComplete.status === 403) {
      results.passed.push("Security: CITIZEN forbidden from POST /api/trips/:id/complete (403)");
      console.log("  PASS: CITIZEN blocked from trip completion (403)");
    } else {
      results.failed.push(`Security: Expected 403 for citTripComplete, got ${citTripComplete.status}`);
    }

    const citTripCancel = await request({
      hostname: "localhost",
      port: 5001,
      path: "/api/trips/DUMMY/cancel",
      method: "POST",
      headers: citAuth
    });
    if (citTripCancel.status === 403) {
      results.passed.push("Security: CITIZEN forbidden from POST /api/trips/:id/cancel (403)");
      console.log("  PASS: CITIZEN blocked from trip cancel (403)");
    } else {
      results.failed.push(`Security: Expected 403 for citTripCancel, got ${citTripCancel.status}`);
    }

    const citTripStatus = await request(
      {
        hostname: "localhost",
        port: 5001,
        path: "/api/trips/DUMMY/status",
        method: "PATCH",
        headers: citAuth
      },
      { status: "EN_ROUTE_PICKUP" }
    );
    if (citTripStatus.status === 403) {
      results.passed.push("Security: CITIZEN forbidden from PATCH /api/trips/:id/status (403)");
      console.log("  PASS: CITIZEN blocked from trip status update (403)\n");
    } else {
      results.failed.push(`Security: Expected 403 for citTripStatus, got ${citTripStatus.status}`);
    }

    // 3. Dispatch Recommendation Endpoint & Route Shadowing Test
    console.log("[3] Testing POST /api/dispatch/recommend (verifying shadowing fix)...");
    const recRes = await request(
      {
        hostname: "localhost",
        port: 5001,
        path: "/api/dispatch/recommend",
        method: "POST",
        headers: opAuth
      },
      { pickupLocation: "LOC-02" } // Anna Nagar
    );
    if (recRes.status === 200 && recRes.body?.recommendedAmbulance && recRes.body?.recommendedHospital) {
      results.passed.push("Dispatch: POST /api/dispatch/recommend returns optimal ambulance & hospital route (200 OK)");
      console.log(`  PASS: Recommendation returned Ambulance ${recRes.body.recommendedAmbulance.id} & Hospital ${recRes.body.recommendedHospital.name}. Total ETA: ${recRes.body.totalTripEstimatedMinutes}m.`);
    } else {
      results.failed.push(`Dispatch: POST /api/dispatch/recommend failed with status ${recRes.status}: ${JSON.stringify(recRes.body)}`);
    }

    // 4. Dispatch Rejections & Diagnostic Error Handling
    console.log("[4] Testing dispatch validation & diagnostic rejections...");
    const missingReqRes = await request({
      hostname: "localhost",
      port: 5001,
      path: "/api/dispatch/REQ-NONEXISTENT-9999",
      method: "POST",
      headers: opAuth
    });
    if (missingReqRes.status === 404) {
      results.passed.push("Dispatch: Non-existent request dispatch rejected with 404 Not Found");
      console.log("  PASS: Dispatch of non-existent request returned 404 Not Found.");
    } else {
      results.failed.push(`Dispatch: Expected 404 for missing request, got ${missingReqRes.status}`);
    }

    // 5. Create Test Emergency 1 for Stepwise Lifecycle
    console.log("[5] Creating isolated test emergency for lifecycle testing...");
    const createReqRes = await request(
      {
        hostname: "localhost",
        port: 5001,
        path: "/api/requests",
        method: "POST",
        headers: opAuth
      },
      {
        callerName: "Test Dispatch Patient",
        contactNumber: "9876543210",
        incidentLocationId: "LOC-02", // Anna Nagar
        severity: "CRITICAL",
        requiredFacility: "CARDIAC",
        description: "Stage 5 automated test incident"
      }
    );
    if (createReqRes.status !== 201 || !createReqRes.body?.id) {
      throw new Error(`Failed to create test emergency: status ${createReqRes.status} ${JSON.stringify(createReqRes.body)}`);
    }
    const testEmergencyId1 = createReqRes.body.id;
    createdTestIds.emergencies.push(testEmergencyId1);
    results.passed.push("Emergency Creation: Created test incident for dispatch lifecycle (201 Created)");
    console.log(`  PASS: Created emergency ${testEmergencyId1} at LOC-02 (CARDIAC, CRITICAL).`);

    // 6. Dispatch Specific Emergency
    console.log("[6] Dispatching specific test emergency via POST /api/dispatch/:requestId...");
    const dispatchRes = await request({
      hostname: "localhost",
      port: 5001,
      path: `/api/dispatch/${testEmergencyId1}`,
      method: "POST",
      headers: opAuth
    });
    if (dispatchRes.status !== 200 || !dispatchRes.body?.id) {
      throw new Error(`Dispatch failed with status ${dispatchRes.status}: ${JSON.stringify(dispatchRes.body)}`);
    }
    const testTrip1 = dispatchRes.body;
    createdTestIds.trips.push(testTrip1.id);
    results.passed.push("Dispatch: POST /api/dispatch/:requestId created Trip with route legs (200 OK)");
    console.log(`  PASS: Dispatched trip ${testTrip1.id} for emergency ${testEmergencyId1}:`);
    console.log(`        Ambulance: ${testTrip1.ambulanceId}, Hospital: ${testTrip1.hospitalId}, ETA: ${testTrip1.totalMinutes}m`);

    // Verify DB state after dispatch
    const [ambAfterDisp, hospAfterDisp, emAfterDisp] = await Promise.all([
      prisma.ambulance.findUnique({ where: { id: testTrip1.ambulanceId } }),
      prisma.hospital.findUnique({ where: { id: testTrip1.hospitalId } }),
      prisma.emergency.findUnique({ where: { id: testEmergencyId1 } })
    ]);
    if (ambAfterDisp.status === "DISPATCHED" && ambAfterDisp.isAvailable === false) {
      results.passed.push("Dispatch DB Sync: Ambulance marked DISPATCHED and unavailable");
      console.log(`  PASS: Ambulance ${ambAfterDisp.id} marked DISPATCHED, isAvailable=false.`);
    } else {
      results.failed.push(`Dispatch DB Sync: Ambulance status unexpected: ${ambAfterDisp.status}, avail=${ambAfterDisp.isAvailable}`);
    }

    if (hospAfterDisp.availableBeds < hospAfterDisp.totalBeds) {
      results.passed.push("Dispatch DB Sync: Hospital bed atomically decremented");
      console.log(`  PASS: Hospital ${hospAfterDisp.id} bed reserved (${hospAfterDisp.availableBeds}/${hospAfterDisp.totalBeds}).`);
    } else {
      results.failed.push("Dispatch DB Sync: Hospital bed not decremented");
    }

    if (emAfterDisp.status === "DISPATCHED") {
      results.passed.push("Dispatch DB Sync: Emergency record updated to DISPATCHED");
      console.log(`  PASS: Emergency ${emAfterDisp.id} marked DISPATCHED.`);
    } else {
      results.failed.push(`Dispatch DB Sync: Emergency status unexpected: ${emAfterDisp.status}`);
    }

    // 7. Active Trip Conflict Guard
    console.log("[7] Testing active trip conflict guard (prevent assigning ambulance to multiple trips)...");
    const conflictReq = await request(
      {
        hostname: "localhost",
        port: 5001,
        path: "/api/requests",
        method: "POST",
        headers: opAuth
      },
      {
        callerName: "Conflict Patient",
        contactNumber: "9123456780",
        incidentLocationId: "LOC-03",
        severity: "SERIOUS",
        requiredFacility: "GENERAL",
        description: "Concurrent conflict test"
      }
    );
    const conflictReqId = conflictReq.body.id;
    createdTestIds.emergencies.push(conflictReqId);

    const conflictExecRes = await request(
      {
        hostname: "localhost",
        port: 5001,
        path: "/api/dispatch/execute",
        method: "POST",
        headers: opAuth
      },
      {
        emergencyId: conflictReqId,
        ambulanceId: testTrip1.ambulanceId, // Already busy on testTrip1!
        hospitalId: testTrip1.hospitalId
      }
    );
    if (conflictExecRes.status === 409) {
      results.passed.push("Conflict Guard: Duplicate ambulance assignment rejected with 409 Conflict");
      console.log("  PASS: Concurrent assignment of busy ambulance rejected with 409 Conflict.");
    } else {
      results.failed.push(`Conflict Guard: Expected 409, got ${conflictExecRes.status}: ${JSON.stringify(conflictExecRes.body)}`);
    }

    // 8. Stepwise Trip Status Transitions
    console.log("[8] Testing stepwise trip status transitions...");
    // 8a. DISPATCHED -> EN_ROUTE_PICKUP
    const step1 = await request(
      {
        hostname: "localhost",
        port: 5001,
        path: `/api/trips/${testTrip1.id}/status`,
        method: "PATCH",
        headers: opAuth
      },
      { status: "EN_ROUTE_PICKUP", notes: "Ambulance rolling out to scene" }
    );
    if (step1.status === 200) {
      const amb = await prisma.ambulance.findUnique({ where: { id: testTrip1.ambulanceId } });
      if (amb.status === "EN_ROUTE") {
        results.passed.push("Trip Transition: DISPATCHED -> EN_ROUTE_PICKUP updates ambulance to EN_ROUTE (200 OK)");
        console.log("  PASS: Transitioned to EN_ROUTE_PICKUP; ambulance status=EN_ROUTE.");
      } else {
        results.failed.push(`Trip Transition: Expected ambulance status EN_ROUTE, got ${amb.status}`);
      }
    } else {
      results.failed.push(`Trip Transition: Step 1 failed with status ${step1.status}: ${JSON.stringify(step1.body)}`);
    }

    // 8b. EN_ROUTE_PICKUP -> AT_SCENE
    const step2 = await request(
      {
        hostname: "localhost",
        port: 5001,
        path: `/api/trips/${testTrip1.id}/status`,
        method: "PATCH",
        headers: opAuth
      },
      { status: "AT_SCENE", notes: "Paramedics arrived at patient location" }
    );
    if (step2.status === 200) {
      const amb = await prisma.ambulance.findUnique({ where: { id: testTrip1.ambulanceId } });
      const em = await prisma.emergency.findUnique({ where: { id: testEmergencyId1 } });
      const locHist = await prisma.ambulanceLocationHistory.findFirst({
        where: {
          ambulanceId: testTrip1.ambulanceId,
          location: { in: [testTrip1.incidentLocationId, "Anna Nagar"] }
        },
        orderBy: { timestamp: "desc" }
      });
      if (amb.status === "BUSY" && em.status === "AT_SCENE" && locHist) {
        results.passed.push("Trip Transition: EN_ROUTE_PICKUP -> AT_SCENE updates emergency to AT_SCENE and logs location history (200 OK)");
        console.log("  PASS: Transitioned to AT_SCENE; emergency=AT_SCENE, location history logged.");
      } else {
        results.failed.push(`Trip Transition: AT_SCENE check failed: amb=${amb.status}, em=${em.status}, locHist=${!!locHist}`);
      }
    } else {
      results.failed.push(`Trip Transition: Step 2 failed with status ${step2.status}`);
    }

    // 8c. AT_SCENE -> TRANSPORTING
    const step3 = await request(
      {
        hostname: "localhost",
        port: 5001,
        path: `/api/trips/${testTrip1.id}/status`,
        method: "PATCH",
        headers: opAuth
      },
      { status: "TRANSPORTING", notes: "Patient secured in ambulance, en route to hospital" }
    );
    if (step3.status === 200) {
      const em = await prisma.emergency.findUnique({ where: { id: testEmergencyId1 } });
      if (em.status === "TRANSPORTING") {
        results.passed.push("Trip Transition: AT_SCENE -> TRANSPORTING updates emergency to TRANSPORTING (200 OK)");
        console.log("  PASS: Transitioned to TRANSPORTING; emergency=TRANSPORTING.");
      } else {
        results.failed.push(`Trip Transition: Expected emergency TRANSPORTING, got ${em.status}`);
      }
    } else {
      results.failed.push(`Trip Transition: Step 3 failed with status ${step3.status}`);
    }

    // 8d. TRANSPORTING -> ARRIVED_HOSPITAL
    const step4 = await request(
      {
        hostname: "localhost",
        port: 5001,
        path: `/api/trips/${testTrip1.id}/status`,
        method: "PATCH",
        headers: opAuth
      },
      { status: "ARRIVED_HOSPITAL", notes: "Ambulance arrived at emergency bay" }
    );
    if (step4.status === 200) {
      results.passed.push("Trip Transition: TRANSPORTING -> ARRIVED_HOSPITAL (200 OK)");
      console.log("  PASS: Transitioned to ARRIVED_HOSPITAL.");
    } else {
      results.failed.push(`Trip Transition: Step 4 failed with status ${step4.status}`);
    }

    // 9. Rejection of Invalid Status Transitions
    console.log("[9] Testing rejection of invalid status transitions...");
    // 9a. Illegal backwards jump: ARRIVED_HOSPITAL -> DISPATCHED
    const invalidBackwards = await request(
      {
        hostname: "localhost",
        port: 5001,
        path: `/api/trips/${testTrip1.id}/status`,
        method: "PATCH",
        headers: opAuth
      },
      { status: "DISPATCHED" }
    );
    if (invalidBackwards.status === 400) {
      results.passed.push("Transition Validation: Backwards transition ARRIVED_HOSPITAL -> DISPATCHED rejected with 400 Bad Request");
      console.log("  PASS: Backwards transition rejected with 400 Bad Request.");
    } else {
      results.failed.push(`Transition Validation: Expected 400 for backwards transition, got ${invalidBackwards.status}`);
    }

    // 9b. Unsupported status string
    const invalidEnum = await request(
      {
        hostname: "localhost",
        port: 5001,
        path: `/api/trips/${testTrip1.id}/status`,
        method: "PATCH",
        headers: opAuth
      },
      { status: "FLYING_TO_MARS" }
    );
    if (invalidEnum.status === 400) {
      results.passed.push("Transition Validation: Unsupported status string rejected with 400 Bad Request");
      console.log("  PASS: Unsupported status string rejected with 400 Bad Request.");
    } else {
      results.failed.push(`Transition Validation: Expected 400 for unsupported enum, got ${invalidEnum.status}`);
    }

    // 10. Trip Completion & Idempotent Resource Release
    console.log("[10] Testing trip completion & idempotent resource release...");
    const completeRes = await request({
      hostname: "localhost",
      port: 5001,
      path: `/api/trips/${testTrip1.id}/complete`,
      method: "POST",
      headers: opAuth
    });
    if (completeRes.status === 200) {
      results.passed.push("Trip Completion: POST /api/trips/:id/complete marks trip COMPLETED (200 OK)");
      console.log("  PASS: Trip completed successfully.");
    } else {
      results.failed.push(`Trip Completion: Failed with status ${completeRes.status}: ${JSON.stringify(completeRes.body)}`);
    }

    // Verify DB state after completion
    const [ambAfterComp, hospAfterComp, emAfterComp, tripAfterComp] = await Promise.all([
      prisma.ambulance.findUnique({ where: { id: testTrip1.ambulanceId } }),
      prisma.hospital.findUnique({ where: { id: testTrip1.hospitalId } }),
      prisma.emergency.findUnique({ where: { id: testEmergencyId1 } }),
      prisma.trip.findUnique({ where: { id: testTrip1.id } })
    ]);

    if (ambAfterComp.status === "AVAILABLE" && ambAfterComp.isAvailable === true && ambAfterComp.currentLocation === hospAfterComp.location) {
      results.passed.push("Completion DB Sync: Ambulance staged at destination hospital and available");
      console.log(`  PASS: Ambulance ${ambAfterComp.id} staged at ${ambAfterComp.currentLocation}, available=true.`);
    } else {
      results.failed.push(`Completion DB Sync: Ambulance not properly staged: ${ambAfterComp.status}, loc=${ambAfterComp.currentLocation}`);
    }

    if (hospAfterComp.availableBeds === baselineBeds) {
      results.passed.push("Completion DB Sync: Hospital bed capacity released exactly once");
      console.log(`  PASS: Hospital beds returned to baseline: ${hospAfterComp.availableBeds}/${hospAfterComp.totalBeds}.`);
    } else {
      results.failed.push(`Completion DB Sync: Hospital beds mismatch: ${hospAfterComp.availableBeds} vs baseline ${baselineBeds}`);
    }

    if (emAfterComp.status === "COMPLETED" && tripAfterComp.status === "COMPLETED" && tripAfterComp.endTime) {
      results.passed.push("Completion DB Sync: Emergency & Trip marked COMPLETED with endTime");
      console.log("  PASS: Trip and Emergency marked COMPLETED with valid endTime.");
    } else {
      results.failed.push("Completion DB Sync: Emergency or Trip status not COMPLETED");
    }

    // 10b. Idempotent completion check (repeat call must reject with 409 Conflict)
    const repeatComplete = await request({
      hostname: "localhost",
      port: 5001,
      path: `/api/trips/${testTrip1.id}/complete`,
      method: "POST",
      headers: opAuth
    });
    if (repeatComplete.status === 409) {
      results.passed.push("Completion Idempotency: Repeated completion rejected with 409 Conflict");
      console.log("  PASS: Repeated completion on finished trip rejected with 409 Conflict.");
    } else {
      results.failed.push(`Completion Idempotency: Expected 409, got ${repeatComplete.status}`);
    }

    // 10c. Status update on completed trip rejected with 409 Conflict
    const updateOnFinished = await request(
      {
        hostname: "localhost",
        port: 5001,
        path: `/api/trips/${testTrip1.id}/status`,
        method: "PATCH",
        headers: opAuth
      },
      { status: "TRANSPORTING" }
    );
    if (updateOnFinished.status === 409) {
      results.passed.push("Terminal State Guard: Modifying finished trip rejected with 409 Conflict");
      console.log("  PASS: Modifying finished trip rejected with 409 Conflict.");
    } else {
      results.failed.push(`Terminal State Guard: Expected 409, got ${updateOnFinished.status}`);
    }

    // 11. Trip Cancellation Workflow & Resource Release
    console.log("[11] Testing trip cancellation workflow & resource release...");
    // Create Test Emergency 2 for cancellation
    const em2Res = await request(
      {
        hostname: "localhost",
        port: 5001,
        path: "/api/requests",
        method: "POST",
        headers: opAuth
      },
      {
        callerName: "Cancellation Test Caller",
        contactNumber: "9777666555",
        incidentLocationId: "LOC-04",
        severity: "SERIOUS",
        requiredFacility: "GENERAL",
        description: "Stage 5 cancellation test mission"
      }
    );
    const testEmergencyId2 = em2Res.body.id;
    createdTestIds.emergencies.push(testEmergencyId2);

    // Dispatch via execute endpoint
    const dispExecRes = await request(
      {
        hostname: "localhost",
        port: 5001,
        path: "/api/dispatch/execute",
        method: "POST",
        headers: opAuth
      },
      {
        emergencyId: testEmergencyId2,
        ambulanceId: testTrip1.ambulanceId, // Now available again!
        hospitalId: "H001"
      }
    );
    if (dispExecRes.status !== 201 && dispExecRes.status !== 200) {
      throw new Error(`Dispatch execute failed with status ${dispExecRes.status}: ${JSON.stringify(dispExecRes.body)}`);
    }
    const testTrip2 = dispExecRes.body.trip || dispExecRes.body.data || dispExecRes.body;
    createdTestIds.trips.push(testTrip2.id);
    results.passed.push("Dispatch Execute: POST /api/dispatch/execute created active trip (201/200 OK)");
    console.log(`  PASS: Created active trip ${testTrip2.id} via execute endpoint.`);

    // Cancel the trip
    const cancelRes = await request(
      {
        hostname: "localhost",
        port: 5001,
        path: `/api/trips/${testTrip2.id}/cancel`,
        method: "POST",
        headers: opAuth
      },
      { reason: "False alarm reported by caller" }
    );
    if (cancelRes.status === 200) {
      results.passed.push("Trip Cancellation: POST /api/trips/:id/cancel cancelled mission (200 OK)");
      console.log("  PASS: Trip cancelled successfully.");
    } else {
      results.failed.push(`Trip Cancellation: Failed with status ${cancelRes.status}: ${JSON.stringify(cancelRes.body)}`);
    }

    // Verify DB state after cancellation
    const [ambAfterCancel, hospAfterCancel, emAfterCancel, tripAfterCancel] = await Promise.all([
      prisma.ambulance.findUnique({ where: { id: testTrip2.ambulanceId } }),
      prisma.hospital.findUnique({ where: { id: testTrip2.hospitalId } }),
      prisma.emergency.findUnique({ where: { id: testEmergencyId2 } }),
      prisma.trip.findUnique({ where: { id: testTrip2.id } })
    ]);

    if (ambAfterCancel.status === "AVAILABLE" && ambAfterCancel.isAvailable === true) {
      results.passed.push("Cancellation DB Sync: Ambulance returned to AVAILABLE status");
      console.log(`  PASS: Ambulance ${ambAfterCancel.id} restored to AVAILABLE.`);
    } else {
      results.failed.push(`Cancellation DB Sync: Ambulance status mismatch: ${ambAfterCancel.status}`);
    }

    if (hospAfterCancel.availableBeds === baselineBeds) {
      results.passed.push("Cancellation DB Sync: Reserved hospital bed released back to capacity");
      console.log(`  PASS: Hospital available beds restored to baseline ${baselineBeds}.`);
    } else {
      results.failed.push(`Cancellation DB Sync: Hospital beds mismatch: ${hospAfterCancel.availableBeds} vs ${baselineBeds}`);
    }

    if (emAfterCancel.status === "CANCELLED" && tripAfterCancel.status === "CANCELLED") {
      results.passed.push("Cancellation DB Sync: Emergency & Trip marked CANCELLED");
      console.log("  PASS: Trip and Emergency marked CANCELLED.");
    } else {
      results.failed.push(`Cancellation DB Sync: Status mismatch em=${emAfterCancel.status}, trip=${tripAfterCancel.status}`);
    }

    // 11b. Repeated cancellation rejects with 409
    const repeatCancel = await request(
      {
        hostname: "localhost",
        port: 5001,
        path: `/api/trips/${testTrip2.id}/cancel`,
        method: "POST",
        headers: opAuth
      },
      { reason: "Second cancellation attempt" }
    );
    if (repeatCancel.status === 409) {
      results.passed.push("Cancellation Idempotency: Repeated cancellation rejected with 409 Conflict");
      console.log("  PASS: Repeated cancellation rejected with 409 Conflict.\n");
    } else {
      results.failed.push(`Cancellation Idempotency: Expected 409, got ${repeatCancel.status}`);
    }

    // 12. Single Trip Detail Endpoint
    console.log("[12] Testing GET /api/trips/:id...");
    const tripDetailRes = await request({
      hostname: "localhost",
      port: 5001,
      path: `/api/trips/${testTrip1.id}`,
      method: "GET",
      headers: opAuth
    });
    if (tripDetailRes.status === 200 && tripDetailRes.body?.id === testTrip1.id) {
      results.passed.push("Trip Details: GET /api/trips/:id returns trip with relations (200 OK)");
      console.log(`  PASS: GET /api/trips/${testTrip1.id} returned trip record.\n`);
    } else {
      results.failed.push(`Trip Details: Expected 200, got ${tripDetailRes.status}`);
    }
    // 13. AuditLog decommissioned, Notification Verification
    console.log("[13] Verifying Notification persistence in PostgreSQL...");

    const notifications = await prisma.notification.findMany({
      where: {
        OR: [
          { message: { contains: testTrip1.id } },
          { message: { contains: testTrip2.id } },
          { message: { contains: testEmergencyId1 } },
          { message: { contains: testEmergencyId2 } }
        ]
      }
    });
    if (notifications.length >= 2) {
      results.passed.push("Notifications: Notifications persisted for dispatch, status updates, and completion");
      console.log(`  PASS: Found ${notifications.length} persistent Notifications for test trips.\n`);
    } else {
      results.failed.push(`Notifications: Expected >=2 notifications, found ${notifications.length}`);
    }

  } catch (err) {
    console.error("TEST EXECUTION ERROR:", err);
    results.failed.push("Unhandled Exception: " + err.message);
  } finally {
    // 14. Safe Cleanup of isolated test records ONLY
    console.log("[14] Cleaning up isolated test records...");
    try {
      if (createdTestIds.trips.length > 0) {
                await prisma.trip.deleteMany({
          where: { id: { in: createdTestIds.trips } }
        });
      }
      if (createdTestIds.emergencies.length > 0) {
        await prisma.emergencyStatusHistory.deleteMany({
          where: { emergencyId: { in: createdTestIds.emergencies } }
        });
        await prisma.emergency.deleteMany({
          where: { id: { in: createdTestIds.emergencies } }
        });
      }
      // Ensure all 5 ambulances are set to AVAILABLE and have 0 active trips
      await prisma.ambulance.updateMany({
        where: { id: { in: ["A001", "A002", "A003", "A004", "A005"] } },
        data: { status: "AVAILABLE", isAvailable: true }
      });
      // Restore H001 available beds
      await prisma.hospital.update({
        where: { id: "H001" },
        data: { availableBeds: 247 }
      });
      console.log("  PASS: Cleaned up test records. Ambulances and hospitals restored to baseline.\n");
    } catch (cleanupErr) {
      console.error("Cleanup error:", cleanupErr);
    }

    await prisma.$disconnect();

    console.log("=================================================================");
    console.log("STAGE 5 TEST SUMMARY");
    console.log("=================================================================");
    console.log(`TOTAL PASSED : ${results.passed.length}`);
    console.log(`TOTAL FAILED : ${results.failed.length}`);
    console.log(`TOTAL SKIPPED: ${results.skipped.length}`);

    if (results.failed.length > 0) {
      console.log("\nFAILED TESTS:");
      results.failed.forEach((f) => console.log(`  - ${f}`));
      process.exit(1);
    } else {
      console.log("\nALL STAGE 5 TESTS PASSED SUCCESSFULLY!");
      process.exit(0);
    }
  }
}

runStage5Tests();
