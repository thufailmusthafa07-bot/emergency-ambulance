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

async function runStage4Tests() {
  console.log("=================================================================");
  console.log("STAGE 4 TEST SUITE: AMBULANCE AND HOSPITAL MANAGEMENT");
  console.log("=================================================================\n");

  const results = {
    passed: [],
    failed: [],
    skipped: []
  };

  let testAmbulanceId = null;
  let testHospitalId = null;

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

    // 2. Read Ambulances
    console.log("[2] Reading ambulance fleet...");
    const ambListRes = await request({
      hostname: "localhost",
      port: 5001,
      path: "/api/ambulances",
      method: "GET",
      headers: opAuth
    });
    if (ambListRes.status === 200 && Array.isArray(ambListRes.body) && ambListRes.body.length >= 5) {
      const a1 = ambListRes.body.find((a) => a.id === "A001");
      if (a1 && a1.registrationNumber && a1.currentLocationId && a1.status) {
        results.passed.push("Ambulance Read: GET /api/ambulances returns valid fleet array (200 OK)");
        console.log(`  PASS: GET /api/ambulances returned ${ambListRes.body.length} ambulances with expected fields.`);
      } else {
        results.failed.push("Ambulance Read: Missing fields in A001 record");
      }
    } else {
      results.failed.push(`Ambulance Read: Unexpected status ${ambListRes.status}`);
    }

    const singleAmbRes = await request({
      hostname: "localhost",
      port: 5001,
      path: "/api/ambulances/A001",
      method: "GET",
      headers: opAuth
    });
    if (singleAmbRes.status === 200 && singleAmbRes.body?.id === "A001") {
      results.passed.push("Ambulance Read: GET /api/ambulances/A001 returns unit details with history (200 OK)");
      console.log("  PASS: Single ambulance detail endpoint works.");
    } else {
      results.failed.push(`Ambulance Read: Single unit failed (${singleAmbRes.status})`);
    }

    const notFoundAmb = await request({
      hostname: "localhost",
      port: 5001,
      path: "/api/ambulances/NONEXISTENT_999",
      method: "GET",
      headers: opAuth
    });
    if (notFoundAmb.status === 404) {
      results.passed.push("Ambulance Read: GET unknown ambulance returns 404 Not Found");
      console.log("  PASS: 404 returned for unknown ambulance ID.\n");
    } else {
      results.failed.push(`Ambulance Read: Expected 404, got ${notFoundAmb.status}`);
    }

    // 3. Ambulance Validation & Creation
    console.log("[3] Testing ambulance creation & validation...");
    const emptyAmb = await request(
      { hostname: "localhost", port: 5001, path: "/api/ambulances", method: "POST", headers: opAuth },
      {}
    );
    if (emptyAmb.status === 400) {
      results.passed.push("Ambulance Validation: Empty payload rejected (400 Bad Request)");
      console.log("  PASS: Empty ambulance payload rejected.");
    } else {
      results.failed.push(`Ambulance Validation: Expected 400 for empty payload, got ${emptyAmb.status}`);
    }

    const dupRegAmb = await request(
      { hostname: "localhost", port: 5001, path: "/api/ambulances", method: "POST", headers: opAuth },
      {
        registrationNumber: "TN-09-AX-1001",
        driverName: "Test Driver",
        driverContact: "+91 99999 11111",
        currentLocation: "Market"
      }
    );
    if (dupRegAmb.status === 409) {
      results.passed.push("Ambulance Validation: Duplicate registration rejected (409 Conflict)");
      console.log("  PASS: Duplicate registration number rejected with 409.");
    } else {
      results.failed.push(`Ambulance Validation: Expected 409 for duplicate registration, got ${dupRegAmb.status}`);
    }

    const invLocAmb = await request(
      { hostname: "localhost", port: 5001, path: "/api/ambulances", method: "POST", headers: opAuth },
      {
        registrationNumber: "TN-09-AX-TEST",
        driverName: "Test Driver",
        driverContact: "+91 99999 11111",
        currentLocation: "Atlantis Junction"
      }
    );
    if (invLocAmb.status === 400) {
      results.passed.push("Ambulance Validation: Unknown network location rejected (400 Bad Request)");
      console.log("  PASS: Unknown network location rejected.");
    } else {
      results.failed.push(`Ambulance Validation: Expected 400 for unknown location, got ${invLocAmb.status}`);
    }

    // Create valid isolated test ambulance
    const createAmbRes = await request(
      { hostname: "localhost", port: 5001, path: "/api/ambulances", method: "POST", headers: opAuth },
      {
        registrationNumber: "TN-09-AX-9999",
        driverName: "K. Murugan",
        driverContact: "+91 94444 88888",
        currentLocation: "Central Junction",
        equipmentType: "CCU"
      }
    );
    if (createAmbRes.status === 201 && createAmbRes.body?.id) {
      testAmbulanceId = createAmbRes.body.id;
      results.passed.push("Ambulance Create: POST /api/ambulances registers new unit (201 Created)");
      console.log(`  PASS: Ambulance created with ID ${testAmbulanceId} (${createAmbRes.body.registrationNumber}).`);

      // Verify PostgreSQL persistence
      const dbAmb = await prisma.ambulance.findUnique({
        where: { id: testAmbulanceId },
        include: { locationHistory: true }
      });
      if (dbAmb && dbAmb.registrationNumber === "TN-09-AX-9999" && dbAmb.equipmentType === "CCU" && dbAmb.isAvailable) {
        results.passed.push("Ambulance DB Verification: Record persisted directly in PostgreSQL with correct fields");
        console.log("  PASS: Direct PostgreSQL query confirmed persistence of ambulance.");
      } else {
        results.failed.push("Ambulance DB Verification: Record not found or incorrect in PostgreSQL");
      }

      if (dbAmb && dbAmb.locationHistory.length >= 1 && dbAmb.locationHistory[0].location === "Central Junction") {
        results.passed.push("Ambulance DB Verification: Initial AmbulanceLocationHistory entry recorded in PostgreSQL");
        console.log("  PASS: Location history recorded initial staging at Central Junction.");
      } else {
        results.failed.push("Ambulance DB Verification: Missing locationHistory record in PostgreSQL");
      }

      const auditAmb = await prisma.auditLog.findFirst({
        where: { action: "CREATE_AMBULANCE", entityId: testAmbulanceId }
      });
      if (auditAmb) {
        results.passed.push("Ambulance DB Verification: AuditLog entry written in PostgreSQL");
        console.log("  PASS: AuditLog entry confirmed in database.");
      } else {
        results.failed.push("Ambulance DB Verification: AuditLog missing in PostgreSQL");
      }
    } else {
      results.failed.push(`Ambulance Create: Expected 201, got ${createAmbRes.status}: ${JSON.stringify(createAmbRes.body)}`);
    }

    // 4. Ambulance Status Updates & Relocation
    console.log("\n[4] Testing ambulance status updates & relocation...");
    if (testAmbulanceId) {
      const invStatusRes = await request(
        { hostname: "localhost", port: 5001, path: `/api/ambulances/${testAmbulanceId}/status`, method: "PATCH", headers: opAuth },
        { status: "FLYING_IN_SPACE" }
      );
      if (invStatusRes.status === 400) {
        results.passed.push("Ambulance Status Validation: Invalid status rejected (400 Bad Request)");
        console.log("  PASS: Invalid status rejected.");
      } else {
        results.failed.push(`Ambulance Status Validation: Expected 400, got ${invStatusRes.status}`);
      }

      // Mark MAINTENANCE
      const maintRes = await request(
        { hostname: "localhost", port: 5001, path: `/api/ambulances/${testAmbulanceId}/status`, method: "PATCH", headers: opAuth },
        { status: "MAINTENANCE" }
      );
      if (maintRes.status === 200 && maintRes.body?.status === "MAINTENANCE") {
        const dbMaint = await prisma.ambulance.findUnique({ where: { id: testAmbulanceId } });
        if (dbMaint && dbMaint.status === "MAINTENANCE" && !dbMaint.isAvailable) {
          results.passed.push("Ambulance Status: Maintenance transition persisted in PostgreSQL (200 OK)");
          console.log("  PASS: Ambulance marked MAINTENANCE and isAvailable = false in PostgreSQL.");
        } else {
          results.failed.push("Ambulance Status: DB state mismatch after maintenance update");
        }
      } else {
        results.failed.push(`Ambulance Status: Expected 200, got ${maintRes.status}`);
      }

      // Relocate to Anna Nagar (LOC-02) and set AVAILABLE
      const relocateRes = await request(
        { hostname: "localhost", port: 5001, path: `/api/ambulances/${testAmbulanceId}/status`, method: "PATCH", headers: opAuth },
        { status: "AVAILABLE", currentLocation: "LOC-02" }
      );
      if (relocateRes.status === 200 && relocateRes.body?.status === "AVAILABLE") {
        const dbReloc = await prisma.ambulance.findUnique({
          where: { id: testAmbulanceId },
          include: { locationHistory: true }
        });
        if (dbReloc && dbReloc.currentLocation === "Anna Nagar" && dbReloc.isAvailable && dbReloc.locationHistory.length >= 2) {
          results.passed.push("Ambulance Relocation: Stationed location update and AmbulanceLocationHistory persisted in PostgreSQL");
          console.log("  PASS: Ambulance relocated to Anna Nagar and location history entry added in PostgreSQL.");
        } else {
          results.failed.push("Ambulance Relocation: DB state or locationHistory count mismatch");
        }
      } else {
        results.failed.push(`Ambulance Relocation: Expected 200, got ${relocateRes.status}`);
      }

      // 5. Active Trip Conflict Guard
      console.log("\n[5] Testing Active Trip Conflict Guard...");
      // Create isolated test emergency & trip
      const testReq = await prisma.emergency.create({
        data: {
          id: "REQ-TEST-STAGE4",
          callerName: "Simulated Patient",
          contactNumber: "+91 99999 00000",
          emergencyType: "Simulation test",
          pickupLocation: "Anna Nagar",
          severity: "SERIOUS",
          status: "DISPATCHED"
        }
      });
      const testTrip = await prisma.trip.create({
        data: {
          id: "TRIP-TEST-STAGE4",
          requestId: testReq.id,
          ambulanceId: testAmbulanceId,
          hospitalId: "H001",
          pickupLocation: "Anna Nagar",
          destinationHospital: "City Hospital",
          status: "DISPATCHED"
        }
      });

      // Try setting ambulance status to AVAILABLE, MAINTENANCE, or OFF_DUTY while on active trip
      const conflictRes1 = await request(
        { hostname: "localhost", port: 5001, path: `/api/ambulances/${testAmbulanceId}/status`, method: "PATCH", headers: opAuth },
        { status: "AVAILABLE" }
      );
      if (conflictRes1.status === 409) {
        results.passed.push("Active Trip Guard: Transition to AVAILABLE rejected while on active trip (409 Conflict)");
        console.log("  PASS: Setting AVAILABLE while on active trip rejected with 409.");
      } else {
        results.failed.push(`Active Trip Guard: Expected 409 for AVAILABLE during active trip, got ${conflictRes1.status}`);
      }

      const conflictRes2 = await request(
        { hostname: "localhost", port: 5001, path: `/api/ambulances/${testAmbulanceId}/status`, method: "PATCH", headers: opAuth },
        { status: "MAINTENANCE" }
      );
      if (conflictRes2.status === 409) {
        results.passed.push("Active Trip Guard: Transition to MAINTENANCE rejected while on active trip (409 Conflict)");
        console.log("  PASS: Setting MAINTENANCE while on active trip rejected with 409.");
      } else {
        results.failed.push(`Active Trip Guard: Expected 409 for MAINTENANCE during active trip, got ${conflictRes2.status}`);
      }

      // Clean up isolated test trip & emergency
      await prisma.trip.delete({ where: { id: testTrip.id } });
      await prisma.emergency.delete({ where: { id: testReq.id } });
      console.log("  PASS: Cleaned up isolated test trip & emergency safely.");
    }

    // 6. Ambulance Role Restrictions
    console.log("\n[6] Testing ambulance role restrictions...");
    const citAddAmb = await request(
      { hostname: "localhost", port: 5001, path: "/api/ambulances", method: "POST", headers: citAuth },
      { registrationNumber: "TN-09-AX-CIT", driverName: "Unauthorized", driverContact: "12345", currentLocation: "Market" }
    );
    if (citAddAmb.status === 403) {
      results.passed.push("Authorization: CITIZEN cannot add ambulance (403 Forbidden)");
      console.log("  PASS: Citizen blocked from adding ambulance.");
    } else {
      results.failed.push(`Authorization: Expected 403 for Citizen add ambulance, got ${citAddAmb.status}`);
    }

    const citStatusAmb = await request(
      { hostname: "localhost", port: 5001, path: `/api/ambulances/A001/status`, method: "PATCH", headers: citAuth },
      { status: "MAINTENANCE" }
    );
    if (citStatusAmb.status === 403) {
      results.passed.push("Authorization: CITIZEN cannot change ambulance status (403 Forbidden)");
      console.log("  PASS: Citizen blocked from changing ambulance status.");
    } else {
      results.failed.push(`Authorization: Expected 403 for Citizen status change, got ${citStatusAmb.status}`);
    }

    // 7. Hospital Read Operations
    console.log("\n[7] Reading hospital registry...");
    const hospListRes = await request({
      hostname: "localhost",
      port: 5001,
      path: "/api/hospitals",
      method: "GET",
      headers: opAuth
    });
    if (hospListRes.status === 200 && Array.isArray(hospListRes.body) && hospListRes.body.length >= 4) {
      const h1 = hospListRes.body.find((h) => h.id === "H001");
      if (h1 && h1.name && h1.locationId && Number.isInteger(h1.totalBeds) && Number.isInteger(h1.availableBeds) && Array.isArray(h1.capabilities)) {
        results.passed.push("Hospital Read: GET /api/hospitals returns valid hospitals array with bed counts & capabilities (200 OK)");
        console.log(`  PASS: GET /api/hospitals returned ${hospListRes.body.length} hospitals with required attributes.`);
      } else {
        results.failed.push("Hospital Read: Missing required fields in H001 record");
      }
    } else {
      results.failed.push(`Hospital Read: Expected 200, got ${hospListRes.status}`);
    }

    const singleHospRes = await request({
      hostname: "localhost",
      port: 5001,
      path: "/api/hospitals/H001",
      method: "GET",
      headers: opAuth
    });
    if (singleHospRes.status === 200 && singleHospRes.body?.id === "H001") {
      results.passed.push("Hospital Read: GET /api/hospitals/H001 returns facility details (200 OK)");
      console.log("  PASS: Single hospital detail endpoint works.");
    } else {
      results.failed.push(`Hospital Read: Expected 200 for H001, got ${singleHospRes.status}`);
    }

    // 8. Hospital Validation & Creation
    console.log("\n[8] Testing hospital creation & validation...");
    const invBedsHosp = await request(
      { hostname: "localhost", port: 5001, path: "/api/hospitals", method: "POST", headers: opAuth },
      {
        name: "Test Bad Beds Hospital",
        address: "123 Road",
        location: "Central Junction",
        contactNumber: "+91 44 11223344",
        totalBeds: 50,
        availableBeds: 100 // exceeds total!
      }
    );
    if (invBedsHosp.status === 400) {
      results.passed.push("Hospital Bed Validation: availableBeds > totalBeds rejected (400 Bad Request)");
      console.log("  PASS: Inconsistent bed counts rejected with 400.");
    } else {
      results.failed.push(`Hospital Bed Validation: Expected 400 for available > total, got ${invBedsHosp.status}`);
    }

    const negBedsHosp = await request(
      { hostname: "localhost", port: 5001, path: "/api/hospitals", method: "POST", headers: opAuth },
      {
        name: "Test Negative Beds Hospital",
        address: "123 Road",
        location: "Central Junction",
        contactNumber: "+91 44 11223344",
        totalBeds: -10,
        availableBeds: -5
      }
    );
    if (negBedsHosp.status === 400) {
      results.passed.push("Hospital Bed Validation: Negative total/available beds rejected (400 Bad Request)");
      console.log("  PASS: Negative bed counts rejected with 400.");
    } else {
      results.failed.push(`Hospital Bed Validation: Expected 400 for negative beds, got ${negBedsHosp.status}`);
    }

    const dupHospName = await request(
      { hostname: "localhost", port: 5001, path: "/api/hospitals", method: "POST", headers: opAuth },
      {
        name: "City General Hospital", // existing
        address: "123 Road",
        location: "Market",
        contactNumber: "+91 44 11223344",
        totalBeds: 100,
        availableBeds: 20
      }
    );
    if (dupHospName.status === 409) {
      results.passed.push("Hospital Validation: Duplicate hospital name rejected (409 Conflict)");
      console.log("  PASS: Duplicate hospital name rejected with 409.");
    } else {
      results.failed.push(`Hospital Validation: Expected 409 for duplicate name, got ${dupHospName.status}`);
    }

    // Create valid isolated test hospital
    const createHospRes = await request(
      { hostname: "localhost", port: 5001, path: "/api/hospitals", method: "POST", headers: opAuth },
      {
        name: "St. Jude Test Medical Center",
        address: "100 South Boulevard, Nalam Nagar",
        location: "College",
        contactNumber: "+91 44 9876 5432",
        type: "Speciality Center",
        totalBeds: 60,
        availableBeds: 15,
        facilities: ["TRAUMA", "CARDIAC", "GENERAL"]
      }
    );
    if (createHospRes.status === 201 && createHospRes.body?.id) {
      testHospitalId = createHospRes.body.id;
      results.passed.push("Hospital Create: POST /api/hospitals registers new facility (201 Created)");
      console.log(`  PASS: Created hospital ${testHospitalId} ("${createHospRes.body.name}").`);

      // Verify PostgreSQL persistence
      const dbHosp = await prisma.hospital.findUnique({ where: { id: testHospitalId } });
      if (dbHosp && dbHosp.name === "St. Jude Test Medical Center" && dbHosp.totalBeds === 60 && dbHosp.availableBeds === 15) {
        results.passed.push("Hospital DB Verification: Record persisted directly in PostgreSQL with correct capacity");
        console.log("  PASS: Direct PostgreSQL query confirmed persistence of hospital.");
      } else {
        results.failed.push("Hospital DB Verification: Record not found or incorrect in PostgreSQL");
      }

      // Verify NetworkLocation category updated to 'Hospital'
      const dbLoc = await prisma.networkLocation.findFirst({ where: { name: "College" } });
      if (dbLoc && dbLoc.category === "Hospital") {
        results.passed.push("Hospital DB Verification: NetworkLocation category updated to 'Hospital'");
        console.log("  PASS: Station node category synchronized to 'Hospital'.");
      } else {
        results.failed.push("Hospital DB Verification: NetworkLocation category was not updated");
      }

      const auditHosp = await prisma.auditLog.findFirst({
        where: { action: "CREATE_HOSPITAL", entityId: testHospitalId }
      });
      if (auditHosp) {
        results.passed.push("Hospital DB Verification: AuditLog entry written in PostgreSQL");
        console.log("  PASS: AuditLog entry confirmed in database.");
      } else {
        results.failed.push("Hospital DB Verification: AuditLog missing in PostgreSQL");
      }
    } else {
      results.failed.push(`Hospital Create: Expected 201, got ${createHospRes.status}: ${JSON.stringify(createHospRes.body)}`);
    }

    // 9. Hospital Capacity Updates
    console.log("\n[9] Testing hospital capacity updates...");
    if (testHospitalId) {
      const invCapRes = await request(
        { hostname: "localhost", port: 5001, path: `/api/hospitals/${testHospitalId}/capacity`, method: "PATCH", headers: opAuth },
        { availableBeds: 100, totalBeds: 60 }
      );
      if (invCapRes.status === 400) {
        results.passed.push("Hospital Capacity Validation: availableBeds > totalBeds rejected (400 Bad Request)");
        console.log("  PASS: Capacity update exceeding total beds rejected.");
      } else {
        results.failed.push(`Hospital Capacity Validation: Expected 400, got ${invCapRes.status}`);
      }

      const validCapRes = await request(
        { hostname: "localhost", port: 5001, path: `/api/hospitals/${testHospitalId}/capacity`, method: "PATCH", headers: opAuth },
        { availableBeds: 25, totalBeds: 70 }
      );
      if (validCapRes.status === 200 && validCapRes.body?.availableBeds === 25 && validCapRes.body?.totalBeds === 70) {
        const dbCap = await prisma.hospital.findUnique({ where: { id: testHospitalId } });
        if (dbCap && dbCap.availableBeds === 25 && dbCap.totalBeds === 70) {
          results.passed.push("Hospital Capacity Update: Beds persisted in PostgreSQL (200 OK)");
          console.log("  PASS: Hospital capacity updated: available 25, total 70.");
        } else {
          results.failed.push("Hospital Capacity Update: DB record does not match updated values");
        }

        const auditCap = await prisma.auditLog.findFirst({
          where: { action: "UPDATE_HOSPITAL_CAPACITY", entityId: testHospitalId }
        });
        if (auditCap) {
          results.passed.push("Hospital DB Verification: Capacity update logged to AuditLog in PostgreSQL");
          console.log("  PASS: Capacity change logged in AuditLog.");
        } else {
          results.failed.push("Hospital DB Verification: AuditLog missing for capacity change");
        }
      } else {
        results.failed.push(`Hospital Capacity Update: Expected 200, got ${validCapRes.status}`);
      }
    }

    // 10. Hospital Role Restrictions
    console.log("\n[10] Testing hospital role restrictions...");
    const citAddHosp = await request(
      { hostname: "localhost", port: 5001, path: "/api/hospitals", method: "POST", headers: citAuth },
      { name: "Unauthorized Clinic", address: "123 Street", location: "Market", contactNumber: "12345", totalBeds: 10 }
    );
    if (citAddHosp.status === 403) {
      results.passed.push("Authorization: CITIZEN cannot add hospital (403 Forbidden)");
      console.log("  PASS: Citizen blocked from adding hospital.");
    } else {
      results.failed.push(`Authorization: Expected 403 for Citizen add hospital, got ${citAddHosp.status}`);
    }

    const citCapHosp = await request(
      { hostname: "localhost", port: 5001, path: `/api/hospitals/H001/capacity`, method: "PATCH", headers: citAuth },
      { availableBeds: 200 }
    );
    if (citCapHosp.status === 403) {
      results.passed.push("Authorization: CITIZEN cannot update hospital capacity (403 Forbidden)");
      console.log("  PASS: Citizen blocked from updating hospital capacity.");
    } else {
      results.failed.push(`Authorization: Expected 403 for Citizen capacity update, got ${citCapHosp.status}`);
    }

  } catch (err) {
    console.error("Test execution error:", err);
    results.failed.push(`Unexpected error: ${err.message}`);
  } finally {
    // 11. Safe Cleanup of isolated test data only
    console.log("\n[11] Cleaning up isolated test data...");
    if (testAmbulanceId) {
      await prisma.ambulanceLocationHistory.deleteMany({ where: { ambulanceId: testAmbulanceId } });
            await prisma.ambulance.delete({ where: { id: testAmbulanceId } }).catch(() => {});
      console.log(`  CLEANUP: Removed test ambulance ${testAmbulanceId} and its location history.`);
    }

    if (testHospitalId) {
            await prisma.hospital.delete({ where: { id: testHospitalId } }).catch(() => {});
      // Restore College location category back to Landmark
      await prisma.networkLocation.updateMany({
        where: { name: "College" },
        data: { category: "Landmark" }
      }).catch(() => {});
      console.log(`  CLEANUP: Removed test hospital ${testHospitalId} and restored College node category.`);
    }

    await prisma.$disconnect();
  }

  // Summary
  console.log("\n=================================================================");
  console.log(`STAGE 4 TEST RESULTS: ${results.passed.length} PASSED, ${results.failed.length} FAILED, ${results.skipped.length} SKIPPED`);
  console.log("=================================================================");
  results.passed.forEach((p, i) => console.log(`  [PASS ${i + 1}] ${p}`));
  results.failed.forEach((f, i) => console.log(`  [FAIL ${i + 1}] ${f}`));

  if (results.failed.length > 0) {
    process.exit(1);
  }
}

runStage4Tests();
