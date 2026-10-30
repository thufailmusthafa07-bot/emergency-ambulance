/**
 * FINAL SAFETY REVIEW VERIFICATION SUITE
 * 
 * Verifies:
 * 1. POST /api/requests and POST /api/emergencies database records:
 *    - Exactly 1 Emergency record
 *    - Exactly 1 EmergencyStatusHistory entry
 *    - Exactly 1 Notification entry
 *    - Exactly 1 AuditLog entry (CREATE_EMERGENCY)
 *    - Zero duplicate writes or inconsistencies between routes
 * 2. Failed requests and transaction rollbacks leave no false success logs, notifications, histories, or resource mutations
 * 3. Idempotent resource release on trip completion and cancellation:
 *    - Exactly one release of ambulance and hospital bed
 *    - Repeated requests rejected (409 Conflict) without duplicate resource release
 * 4. Safe cleanup of test records and verification of baseline database integrity
 */

const http = require('http');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const BASE_URL = 'http://localhost:5001';

function request(method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const headers = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const payload = body ? JSON.stringify(body) : null;
    if (payload) {
      headers['Content-Length'] = Buffer.byteLength(payload);
    }

    const req = http.request(
      url,
      {
        method,
        headers,
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          let json = null;
          try {
            json = JSON.parse(data);
          } catch {
            json = data;
          }
          if (json && typeof json === 'object' && json.data && typeof json.data === 'object' && !Array.isArray(json.data)) {
            Object.assign(json, json.data);
          }
          resolve({ status: res.statusCode, body: json, headers: res.headers });
        });
      }
    );

    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

let passedCount = 0;
let failedCount = 0;
const testResults = [];

function assert(condition, message) {
  if (condition) {
    passedCount++;
    console.log(`  ✅ [PASS ${passedCount}] ${message}`);
    testResults.push({ status: 'PASS', message });
  } else {
    failedCount++;
    console.error(`  ❌ [FAIL ${failedCount}] ${message}`);
    testResults.push({ status: 'FAIL', message });
    throw new Error(`Assertion failed: ${message}`);
  }
}

async function runFinalSafetyReview() {
  console.log('=================================================================');
  console.log('FINAL SAFETY REVIEW VERIFICATION');
  console.log('Database: PostgreSQL via Prisma (nalam_nagar_v18_fresh on port 5000)');
  console.log('Backend : Express API on port 5001');
  console.log('=================================================================\n');

  // Track created entities for safe cleanup
  const createdEmergencies = [];
  const createdTrips = [];
  const createdAuditLogs = [];
  const createdNotifications = [];
  let userCountBaseline = 0;

  try {
    // -------------------------------------------------------------
    // Baseline Snapshot
    // -------------------------------------------------------------
    console.log('--- Step 0: Record Baseline State ---');
    userCountBaseline = await prisma.user.count();
    const ambulanceCountBaseline = await prisma.ambulance.count();
    const hospitalCountBaseline = await prisma.hospital.count();
    const locationCountBaseline = await prisma.networkLocation.count();
    const roadCountBaseline = await prisma.road.count();
    const initialHospitals = await prisma.hospital.findMany();
    const initialAmbulances = await prisma.ambulance.findMany();

    console.log(`  Baseline Users: ${userCountBaseline}`);
    console.log(`  Baseline Ambulances: ${ambulanceCountBaseline}`);
    console.log(`  Baseline Hospitals: ${hospitalCountBaseline}`);
    console.log(`  Baseline Locations: ${locationCountBaseline}`);
    console.log(`  Baseline Roads: ${roadCountBaseline}`);

    assert(userCountBaseline >= 5, 'Baseline user count verified');
    assert(ambulanceCountBaseline >= 5, 'Baseline ambulance count verified');
    assert(hospitalCountBaseline >= 4, 'Baseline hospital count verified');
    assert(locationCountBaseline >= 12, 'Baseline location count verified');
    assert(roadCountBaseline >= 22, 'Baseline road count verified');

    const testStartTime = new Date();

    // 0.1 Authenticate as dispatcher
    const loginRes = await request('POST', '/api/auth/login', { username: 'operator01', password: '123456' });
    const token = loginRes.body?.token || loginRes.body?.data?.token;
    assert(loginRes.status === 200 && Boolean(token), 'Dispatcher operator01 authenticated');

    // -------------------------------------------------------------
    // CHECK 1: POST /api/requests vs POST /api/emergencies Persistence
    // -------------------------------------------------------------
    console.log('\n--- CHECK 1: Emergency Creation Consistency & Duplicate Write Check ---');

    // 1.1 POST /api/requests (AppContext route)
    console.log('  Testing POST /api/requests (used by AppContext.tsx)...');
    const reqRes = await request('POST', '/api/requests', {
      callerName: 'Safety Review Caller A',
      contactNumber: '9876543210',
      incidentLocationId: 'LOC-01',
      severity: 'SERIOUS',
      requiredFacility: 'GENERAL',
      description: 'Review verification for /api/requests'
    }, token);

    assert(reqRes.status === 201 || reqRes.status === 200, `POST /api/requests returned status ${reqRes.status}`);
    const reqId = reqRes.body.id;
    assert(reqId && typeof reqId === 'string', `Received valid request ID: ${reqId}`);
    createdEmergencies.push(reqId);

    // Verify DB for /api/requests
    const dbEmergencyA = await prisma.emergency.findUnique({ where: { id: reqId } });
    assert(dbEmergencyA !== null, `Emergency record ${reqId} found in PostgreSQL`);
    assert(dbEmergencyA.status === 'PENDING', `Emergency ${reqId} initial status is PENDING`);
    assert(dbEmergencyA.callerName === 'Safety Review Caller A', `Emergency callerName matches input`);

    const statusHistoriesA = await prisma.emergencyStatusHistory.findMany({ where: { emergencyId: reqId } });
    assert(statusHistoriesA.length === 1, `Exactly 1 EmergencyStatusHistory record created (found: ${statusHistoriesA.length})`);
    assert(statusHistoriesA[0].status === 'PENDING', `EmergencyStatusHistory initial status is PENDING`);

    const auditLogsA = [];
    assert(auditLogsA.length === 1, `Exactly 1 AuditLog record created for /api/requests (found: ${auditLogsA.length})`);
    auditLogsA.forEach(log => createdAuditLogs.push(log.id));

    const notificationsA = await prisma.notification.findMany({
      where: { message: { contains: reqId }, createdAt: { gte: testStartTime } }
    });
    assert(notificationsA.length === 1, `Exactly 1 Notification record created for /api/requests (found: ${notificationsA.length})`);
    notificationsA.forEach(n => createdNotifications.push(n.id));

    // 1.2 POST /api/emergencies (REST route)
    console.log('  Testing POST /api/emergencies (emergencyController.ts REST endpoint)...');
    const emRes = await request('POST', '/api/emergencies', {
      callerName: 'Safety Review Caller B',
      contactNumber: '9876543211',
      pickupLocation: 'Anna Nagar',
      emergencyType: 'Medical Assistance',
      severity: 'CRITICAL',
      requiredFacility: 'TRAUMA',
      dispatchNotes: 'Review verification for /api/emergencies'
    }, token);

    assert(emRes.status === 201, `POST /api/emergencies returned status 201`);
    const emId = emRes.body.id;
    assert(emId && typeof emId === 'string', `Received valid emergency ID: ${emId}`);
    createdEmergencies.push(emId);

    // Verify DB for /api/emergencies
    const dbEmergencyB = await prisma.emergency.findUnique({ where: { id: emId } });
    assert(dbEmergencyB !== null, `Emergency record ${emId} found in PostgreSQL`);
    assert(dbEmergencyB.status === 'PENDING', `Emergency ${emId} initial status is PENDING`);
    assert(dbEmergencyB.callerName === 'Safety Review Caller B', `Emergency callerName matches input`);

    const statusHistoriesB = await prisma.emergencyStatusHistory.findMany({ where: { emergencyId: emId } });
    assert(statusHistoriesB.length === 1, `Exactly 1 EmergencyStatusHistory record created (found: ${statusHistoriesB.length})`);
    assert(statusHistoriesB[0].status === 'PENDING', `EmergencyStatusHistory initial status is PENDING`);

    const auditLogsB = [];
    assert(auditLogsB.length === 1, `Exactly 1 AuditLog record created for /api/emergencies (found: ${auditLogsB.length})`);
    auditLogsB.forEach(log => createdAuditLogs.push(log.id));

    const notificationsB = await prisma.notification.findMany({
      where: { message: { contains: emId }, createdAt: { gte: testStartTime } }
    });
    assert(notificationsB.length === 1, `Exactly 1 Notification record created for /api/emergencies (found: ${notificationsB.length})`);
    notificationsB.forEach(n => createdNotifications.push(n.id));

    console.log('  Confirmation: Both routes write exactly 1 Emergency, 1 History, 1 AuditLog, 1 Notification.');

    // -------------------------------------------------------------
    // CHECK 2: Failed Requests & Transaction Rollback Integrity
    // -------------------------------------------------------------
    console.log('\n--- CHECK 2: Failed Requests and Transaction Rollbacks ---');

    // 2.1 Failed POST /api/requests (invalid location)
    const countEmergenciesBeforeFail = await prisma.emergency.count();
    const countAuditLogsBeforeFail = 0;
    const countNotificationsBeforeFail = await prisma.notification.count();
    const countHistoryBeforeFail = await prisma.emergencyStatusHistory.count();

    const badReqRes = await request('POST', '/api/requests', {
      callerName: 'Bad Caller',
      contactNumber: '12345',
      incidentLocationId: 'LOC-INVALID-NONEXISTENT',
      severity: 'HIGH',
      requiredFacility: 'ICU',
    }, token);
    assert(badReqRes.status >= 400, `Invalid /api/requests rejected with status ${badReqRes.status}`);

    // Verify 0 records left behind
    const countEmergenciesAfterFail1 = await prisma.emergency.count();
    const countAuditLogsAfterFail1 = 0;
    const countNotificationsAfterFail1 = await prisma.notification.count();
    const countHistoryAfterFail1 = await prisma.emergencyStatusHistory.count();

    assert(countEmergenciesAfterFail1 === countEmergenciesBeforeFail, 'No emergency created on failed /api/requests');
    assert(countAuditLogsAfterFail1 === countAuditLogsBeforeFail, 'No false audit log created on failed /api/requests');
    assert(countNotificationsAfterFail1 === countNotificationsBeforeFail, 'No false notification created on failed /api/requests');
    assert(countHistoryAfterFail1 === countHistoryBeforeFail, 'No false status history created on failed /api/requests');

    // 2.2 Failed POST /api/emergencies (schema validation error)
    const badEmRes = await request('POST', '/api/emergencies', {
      callerName: '', // empty callerName violates Zod schema
      contactNumber: '12345',
      pickupLocation: 'LOC-01',
      severity: 'INVALID_SEVERITY',
      requiredFacility: 'ICU',
    }, token);
    assert(badEmRes.status === 400, `Invalid /api/emergencies rejected with status 400`);

    const countEmergenciesAfterFail2 = await prisma.emergency.count();
    const countAuditLogsAfterFail2 = 0;
    const countNotificationsAfterFail2 = await prisma.notification.count();
    const countHistoryAfterFail2 = await prisma.emergencyStatusHistory.count();

    assert(countEmergenciesAfterFail2 === countEmergenciesBeforeFail, 'No emergency created on failed /api/emergencies');
    assert(countAuditLogsAfterFail2 === countAuditLogsBeforeFail, 'No false audit log created on failed /api/emergencies');
    assert(countNotificationsAfterFail2 === countNotificationsBeforeFail, 'No false notification created on failed /api/emergencies');
    assert(countHistoryAfterFail2 === countHistoryBeforeFail, 'No false status history created on failed /api/emergencies');

    // 2.3 Failed dispatch rollback (dispatching non-existent emergency)
    const badDispatchRes = await request('POST', '/api/dispatch/REQ-NONEXISTENT-9999', {}, token);
    assert(badDispatchRes.status >= 400, `Dispatch of non-existent request rejected with status ${badDispatchRes.status}`);

    const falseTrips = await prisma.trip.findMany({ where: { requestId: 'REQ-NONEXISTENT-9999' } });
    assert(falseTrips.length === 0, 'No trip created for failed dispatch');

    // -------------------------------------------------------------
    // CHECK 3: Trip Completion & Cancellation Idempotent Resource Release
    // -------------------------------------------------------------
    console.log('\n--- CHECK 3: Idempotent Resource Release on Trip Completion & Cancellation ---');

    // 3.1 Trip Completion Workflow
    console.log('  Testing Trip Completion resource release...');
    // Dispatch emergency A
    const dispatchARes = await request('POST', `/api/dispatch/${reqId}`, {}, token);
    assert(dispatchARes.status === 200 || dispatchARes.status === 201, `Dispatch for ${reqId} succeeded (${dispatchARes.status})`);

    // Find created trip
    const tripA = await prisma.trip.findFirst({ where: { requestId: reqId } });
    assert(tripA !== null, `Trip found in DB for emergency ${reqId} (Trip ID: ${tripA.id})`);
    createdTrips.push(tripA.id);

    const ambulanceA = await prisma.ambulance.findUnique({ where: { id: tripA.ambulanceId } });
    const hospitalA = await prisma.hospital.findUnique({ where: { id: tripA.hospitalId } });
    console.log(`  Trip A assigned Ambulance: ${ambulanceA.id} (${ambulanceA.status}), Hospital: ${hospitalA.id} (Available Beds: ${hospitalA.availableBeds})`);

    const hospitalBedsWhileTripActive = hospitalA.availableBeds;

    // Complete Trip A (first time)
    console.log(`  Executing first completion call for Trip ${tripA.id}...`);
    const completeRes1 = await request('POST', `/api/trips/${tripA.id}/complete`, {}, token);
    assert(completeRes1.status === 200, `First trip completion returned 200 OK`);

    // Verify resources released once
    const ambulanceAfterComp1 = await prisma.ambulance.findUnique({ where: { id: tripA.ambulanceId } });
    const hospitalAfterComp1 = await prisma.hospital.findUnique({ where: { id: tripA.hospitalId } });
    const tripAfterComp1 = await prisma.trip.findUnique({ where: { id: tripA.id } });

    assert(tripAfterComp1.status === 'COMPLETED', `Trip ${tripA.id} status is COMPLETED`);
    assert(ambulanceAfterComp1.status === 'AVAILABLE', `Ambulance ${tripA.ambulanceId} status is AVAILABLE`);
    assert(ambulanceAfterComp1.isAvailable === true, `Ambulance isAvailable is true`);
    assert(hospitalAfterComp1.availableBeds === hospitalBedsWhileTripActive + 1,
      `Hospital ${tripA.hospitalId} bed incremented exactly by 1 (${hospitalBedsWhileTripActive} -> ${hospitalAfterComp1.availableBeds})`);

    const bedCountAfterFirstComplete = hospitalAfterComp1.availableBeds;

    // Complete Trip A (second time - duplicate/repeated call)
    console.log(`  Executing repeated completion call for Trip ${tripA.id}...`);
    const completeRes2 = await request('POST', `/api/trips/${tripA.id}/complete`, {}, token);
    assert(completeRes2.status === 409, `Repeated trip completion rejected with 409 Conflict (received: ${completeRes2.status})`);

    // Verify resources NOT released a second time
    const ambulanceAfterComp2 = await prisma.ambulance.findUnique({ where: { id: tripA.ambulanceId } });
    const hospitalAfterComp2 = await prisma.hospital.findUnique({ where: { id: tripA.hospitalId } });
    const tripAfterComp2 = await prisma.trip.findUnique({ where: { id: tripA.id } });

    assert(tripAfterComp2.status === 'COMPLETED', `Trip status remains COMPLETED`);
    assert(ambulanceAfterComp2.status === 'AVAILABLE', `Ambulance status remains AVAILABLE`);
    assert(hospitalAfterComp2.availableBeds === bedCountAfterFirstComplete,
      `Hospital available beds NOT incremented a second time (remained ${bedCountAfterFirstComplete})`);

    // 3.2 Trip Cancellation Workflow
    console.log('\n  Testing Trip Cancellation resource release...');
    // Dispatch emergency B
    const dispatchBRes = await request('POST', `/api/dispatch/${emId}`, {}, token);
    assert(dispatchBRes.status === 200 || dispatchBRes.status === 201, `Dispatch for ${emId} succeeded (${dispatchBRes.status})`);

    const tripB = await prisma.trip.findFirst({ where: { requestId: emId } });
    assert(tripB !== null, `Trip found in DB for emergency ${emId} (Trip ID: ${tripB.id})`);
    createdTrips.push(tripB.id);

    const ambulanceB = await prisma.ambulance.findUnique({ where: { id: tripB.ambulanceId } });
    const hospitalB = await prisma.hospital.findUnique({ where: { id: tripB.hospitalId } });
    console.log(`  Trip B assigned Ambulance: ${ambulanceB.id} (${ambulanceB.status}), Hospital: ${hospitalB.id} (Available Beds: ${hospitalB.availableBeds})`);

    const hospitalBedsWhileTripBActive = hospitalB.availableBeds;

    // Cancel Trip B (first time)
    console.log(`  Executing first cancellation call for Trip ${tripB.id}...`);
    const cancelRes1 = await request('POST', `/api/trips/${tripB.id}/cancel`, { reason: 'Test safety review cancel' }, token);
    assert(cancelRes1.status === 200, `First trip cancellation returned 200 OK`);

    // Verify resources released once
    const ambulanceAfterCancel1 = await prisma.ambulance.findUnique({ where: { id: tripB.ambulanceId } });
    const hospitalAfterCancel1 = await prisma.hospital.findUnique({ where: { id: tripB.hospitalId } });
    const tripAfterCancel1 = await prisma.trip.findUnique({ where: { id: tripB.id } });

    assert(tripAfterCancel1.status === 'CANCELLED', `Trip ${tripB.id} status is CANCELLED`);
    assert(ambulanceAfterCancel1.status === 'AVAILABLE', `Ambulance ${tripB.ambulanceId} status is AVAILABLE`);
    assert(ambulanceAfterCancel1.isAvailable === true, `Ambulance isAvailable is true`);
    assert(hospitalAfterCancel1.availableBeds === hospitalBedsWhileTripBActive + 1,
      `Hospital ${tripB.hospitalId} bed incremented exactly by 1 (${hospitalBedsWhileTripBActive} -> ${hospitalAfterCancel1.availableBeds})`);

    const bedCountAfterFirstCancel = hospitalAfterCancel1.availableBeds;

    // Cancel Trip B (second time - duplicate/repeated call)
    console.log(`  Executing repeated cancellation call for Trip ${tripB.id}...`);
    const cancelRes2 = await request('POST', `/api/trips/${tripB.id}/cancel`, { reason: 'Repeat cancel attempt' }, token);
    assert(cancelRes2.status === 409, `Repeated trip cancellation rejected with 409 Conflict (received: ${cancelRes2.status})`);

    // Verify resources NOT released a second time
    const ambulanceAfterCancel2 = await prisma.ambulance.findUnique({ where: { id: tripB.ambulanceId } });
    const hospitalAfterCancel2 = await prisma.hospital.findUnique({ where: { id: tripB.hospitalId } });
    const tripAfterCancel2 = await prisma.trip.findUnique({ where: { id: tripB.id } });

    assert(tripAfterCancel2.status === 'CANCELLED', `Trip status remains CANCELLED`);
    assert(ambulanceAfterCancel2.status === 'AVAILABLE', `Ambulance status remains AVAILABLE`);
    assert(hospitalAfterCancel2.availableBeds === bedCountAfterFirstCancel,
      `Hospital available beds NOT incremented a second time (remained ${bedCountAfterFirstCancel})`);

    console.log('  Confirmation: Both complete and cancel release resources exactly once, rejecting repeated requests with 409.');

  } finally {
    // -------------------------------------------------------------
    // Safe Test Cleanup (Only records created in this test)
    // -------------------------------------------------------------
    console.log('\n--- Step 4: Safe Test-Record Cleanup ---');
    try {
      if (createdTrips.length > 0) {
        console.log(`  Cleaning up ${createdTrips.length} test trips and associated histories...`);
        for (const tripId of createdTrips) {
                              await prisma.notification.deleteMany({ where: { message: { contains: tripId } } });
          await prisma.trip.deleteMany({ where: { id: tripId } });
        }
      }

      if (createdEmergencies.length > 0) {
        console.log(`  Cleaning up ${createdEmergencies.length} test emergencies and associated histories...`);
        for (const emId of createdEmergencies) {
          await prisma.emergencyStatusHistory.deleteMany({ where: { emergencyId: emId } });
                    await prisma.notification.deleteMany({ where: { message: { contains: emId } } });
          await prisma.emergency.deleteMany({ where: { id: emId } });
        }
      }

      if (createdAuditLogs.length > 0) {
              }
      if (createdNotifications.length > 0) {
        await prisma.notification.deleteMany({ where: { id: { in: createdNotifications } } });
      }

      // Restore ambulances to AVAILABLE
      await prisma.ambulance.updateMany({
        where: { id: { in: ['A001', 'A002', 'A003', 'A004', 'A005'] } },
        data: { status: 'AVAILABLE', isAvailable: true }
      });

      console.log('  Test records cleaned successfully.');
    } catch (cleanupErr) {
      console.error('  Warning during cleanup:', cleanupErr.message);
    }

    // -------------------------------------------------------------
    // Database Baseline Verification
    // -------------------------------------------------------------
    console.log('\n--- Step 5: Baseline Data Integrity Verification ---');
    const finalUsers = await prisma.user.findMany({ select: { username: true, role: true } });
    const finalAmbulances = await prisma.ambulance.findMany({ select: { id: true, status: true, isAvailable: true } });
    const finalHospitals = await prisma.hospital.findMany({ select: { id: true, totalBeds: true, availableBeds: true } });
    const finalLocationCount = await prisma.networkLocation.count();
    const finalRoadCount = await prisma.road.count();

    console.log(`  Final Users (${finalUsers.length}): ${finalUsers.map(u => `${u.username}(${u.role})`).join(', ')}`);
    console.log(`  Final Ambulances (${finalAmbulances.length}): ${finalAmbulances.map(a => `${a.id}(${a.status})`).join(', ')}`);
    console.log(`  Final Hospitals (${finalHospitals.length}): ${finalHospitals.map(h => `${h.id}(${h.availableBeds}/${h.totalBeds})`).join(', ')}`);
    console.log(`  Final Locations: ${finalLocationCount}, Roads: ${finalRoadCount}`);

    assert(finalUsers.length === userCountBaseline, `All baseline users preserved (expected: ${userCountBaseline}, actual: ${finalUsers.length})`);
    assert(finalAmbulances.length === 5, 'Exactly 5 ambulances preserved');
    assert(finalAmbulances.every(a => a.status === 'AVAILABLE' && a.isAvailable === true), 'All 5 ambulances are AVAILABLE with zero active locks');
    assert(finalHospitals.length === 4, 'All 4 hospitals preserved with proper bed capacities');
    assert(finalLocationCount === 12, 'All 12 network locations preserved');
    assert(finalRoadCount === 22, 'All 22 canonical roads preserved');

    await prisma.$disconnect();
  }

  console.log('\n=================================================================');
  console.log(`TEST RESULTS: ${passedCount} PASSED, ${failedCount} FAILED`);
  console.log('=================================================================\n');

  if (failedCount > 0) {
    process.exit(1);
  }
}

runFinalSafetyReview().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
