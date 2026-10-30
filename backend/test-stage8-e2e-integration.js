/**
 * STAGE 8 — END-TO-END INTEGRATION & FINAL SYSTEM VERIFICATION
 * Comprehensive test suite validating complete browser-to-database workflows,
 * Prisma operations, PostgreSQL read-back, RBAC, resource release, and data integrity.
 */

const http = require('http');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const BASE_URL = 'http://localhost:5001';

// Helper for making HTTP requests
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

// Test tracker
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

async function runStage8Verification() {
  console.log('=================================================================');
  console.log('STAGE 8: END-TO-END INTEGRATION & FINAL SYSTEM VERIFICATION');
  console.log('Database: PostgreSQL via Prisma (nalam_nagar_v18_fresh on port 5000)');
  console.log('Backend : Express API on port 5001');
  console.log('=================================================================\n');

  // Baseline records tracking
  let testCitizenUser = null;
  let testEmergencyId1 = null;
  let testEmergencyId2 = null;
  let testTripId1 = null;
  let testTripId2 = null;
  let testRoadId = null;
  let testLocationId = null;

  try {
    // -------------------------------------------------------------
    // WORKFLOW 1: Authentication & Role-Based Access Control (RBAC)
    // -------------------------------------------------------------
    console.log('--- WORKFLOW 1: Authentication & RBAC Verification ---');

    // 1.1 Canonical logins
    const adminLogin = await request('POST', '/api/auth/login', { username: 'admin', password: '123456' });
    const adminToken = adminLogin.body?.token || adminLogin.body?.data?.token;
    assert(adminLogin.status === 200 && Boolean(adminToken), 'Admin authentication successful with JWT');

    const opLogin = await request('POST', '/api/auth/login', { username: 'operator01', password: '123456' });
    const opToken = opLogin.body?.token || opLogin.body?.data?.token;
    assert(opLogin.status === 200 && Boolean(opToken), 'Dispatcher (operator01) authentication successful');

    const driverLogin = await request('POST', '/api/auth/login', { username: 'driver01', password: '123456' });
    const driverToken = driverLogin.body?.token || driverLogin.body?.data?.token;
    assert(driverLogin.status === 200 && Boolean(driverToken), 'Ambulance Staff (driver01) authentication successful');

    const citizenLogin = await request('POST', '/api/auth/login', { username: 'citizen01', password: '123456' });
    const citizenToken = citizenLogin.body?.token || citizenLogin.body?.data?.token;
    assert(citizenLogin.status === 200 && Boolean(citizenToken), 'Citizen (citizen01) authentication successful');

    // 1.2 PasswordHash stripped from responses
    const adminUser = adminLogin.body?.user || adminLogin.body?.data?.user;
    const opUser = opLogin.body?.user || opLogin.body?.data?.user;
    assert(!adminUser?.passwordHash && !opUser?.passwordHash, 'User password hashes are never exposed in login responses');

    // 1.3 Public signup defaults to CITIZEN, ignores role escalation
    const uniqueEmail = `stage8_test_${Date.now()}@nalamnagar.gov.in`;
    const signupRes = await request('POST', '/api/auth/signup', {
      name: 'Stage 8 Citizen Tester',
      email: uniqueEmail,
      password: 'TestPassword@123',
      role: 'ADMIN', // Deliberate privilege escalation attempt
    });
    const signedUser = signupRes.body?.user || signupRes.body?.data?.user;
    assert(signupRes.status === 201 && Boolean(signedUser), 'Public signup endpoint accepts valid registration');
    assert(signedUser?.role === 'CITIZEN', 'Public signup correctly ignored requested ADMIN role and assigned CITIZEN');
    testCitizenUser = signedUser;

    // Verify directly in PostgreSQL
    const dbUser = await prisma.user.findUnique({ where: { id: testCitizenUser.id } });
    assert(dbUser && dbUser.role === 'CITIZEN', 'PostgreSQL read-back confirms user role is CITIZEN in database');

    // 1.4 Login with newly registered citizen account
    const newCitizenLogin = await request('POST', '/api/auth/login', { username: uniqueEmail, password: 'TestPassword@123' });
    const newCitizenToken = newCitizenLogin.body?.token || newCitizenLogin.body?.data?.token;
    assert(newCitizenLogin.status === 200 && Boolean(newCitizenToken), 'Newly registered public user can log in successfully');

    // 1.5 Role-based access control enforcement
    const citizenDispatchAttempt = await request('POST', '/api/dispatch/recommend', { pickupLocation: 'LOC-02' }, newCitizenToken);
    assert(citizenDispatchAttempt.status === 403, 'CITIZEN role strictly forbidden from dispatch operations (403)');

    const citizenFleetAttempt = await request('POST', '/api/ambulances', { id: 'A999' }, newCitizenToken);
    assert(citizenFleetAttempt.status === 403, 'CITIZEN role strictly forbidden from ambulance management (403)');

    const citizenHospitalAttempt = await request('PATCH', '/api/hospitals/H001/capacity', { availableBeds: 200 }, newCitizenToken);
    assert(citizenHospitalAttempt.status === 403, 'CITIZEN role strictly forbidden from hospital capacity modification (403)');

    const staffUserAdminAttempt = await request('GET', '/api/users', null, driverToken);
    assert(staffUserAdminAttempt.status === 403, 'AMBULANCE_STAFF strictly forbidden from user administration (403)');

    const dispatcherUserAdminAttempt = await request('GET', '/api/users', null, opToken);
    assert(dispatcherUserAdminAttempt.status === 403, 'DISPATCHER strictly forbidden from user administration (403)');

    const adminUserAdminAttempt = await request('GET', '/api/users', null, adminToken);
    const usersList = Array.isArray(adminUserAdminAttempt.body?.data)
      ? adminUserAdminAttempt.body.data
      : (Array.isArray(adminUserAdminAttempt.body?.users) ? adminUserAdminAttempt.body.users : (Array.isArray(adminUserAdminAttempt.body) ? adminUserAdminAttempt.body : []));
    assert(adminUserAdminAttempt.status === 200 && usersList.length > 0, 'ADMIN successfully permitted to access user administration (200 OK)');

    // 1.6 Session logout and token invalidation
    const logoutRes = await request('POST', '/api/auth/logout', null, newCitizenToken);
    assert(logoutRes.status === 200, 'Logout request successfully accepted (200 OK)');

    const postLogoutCall = await request('GET', '/api/users/profile', null, newCitizenToken);
    assert(postLogoutCall.status === 401, 'Logged out session token is successfully blocked with 401 Unauthorized');

    // -------------------------------------------------------------
    // WORKFLOW 2: Emergency Creation, Validation & Status Updates
    // -------------------------------------------------------------
    console.log('\n--- WORKFLOW 2: Emergency Creation, Validation & Visibility ---');

    // 2.1 Validation: Invalid payload rejected
    const invalidEmergRes = await request('POST', '/api/requests', {
      callerName: '', // empty name
      incidentLocationId: 'UNKNOWN-NODE',
      severity: 'SUPER_HIGH',
    }, opToken);
    assert(invalidEmergRes.status === 400, 'Invalid emergency payload rejected with 400 Bad Request');

    // 2.2 Valid emergency creation
    const emergPayload = {
      callerName: 'Stage 8 Patient Alpha',
      contactNumber: '9876543210',
      incidentLocationId: 'LOC-03', // Gandhi Nagar
      description: 'Severe chest pain requiring immediate cardiac care',
      severity: 'CRITICAL',
      requiredFacility: 'CARDIAC',
    };
    const createEmergRes = await request('POST', '/api/requests', emergPayload, opToken);
    testEmergencyId1 = createEmergRes.body?.id || createEmergRes.body?.request?.id || createEmergRes.body?.data?.id;
    assert(createEmergRes.status === 201 && Boolean(testEmergencyId1), 'Emergency created via API (201 Created)');

    // 2.3 PostgreSQL read-back verification
    const dbEmerg = await prisma.emergency.findUnique({
      where: { id: testEmergencyId1 },
      include: { statusHistory: { orderBy: { changedAt: 'asc' } } },
    });
    assert(dbEmerg && dbEmerg.status === 'PENDING', 'PostgreSQL confirms emergency persisted with status PENDING');
    assert(dbEmerg.statusHistory.length === 1 && dbEmerg.statusHistory[0].status === 'PENDING', 'EmergencyStatusHistory record persisted in DB with status PENDING');
    // 2.4 AuditLog was decommissioned

    // 2.5 Request visibility in list
    const listRequestsRes = await request('GET', '/api/requests', null, opToken);
    assert(listRequestsRes.status === 200, 'GET /api/requests returns 200 OK');
    const allRequests = Array.isArray(listRequestsRes.body?.data)
      ? listRequestsRes.body.data
      : (Array.isArray(listRequestsRes.body?.requests) ? listRequestsRes.body.requests : (Array.isArray(listRequestsRes.body) ? listRequestsRes.body : []));
    const foundInList = allRequests.find((r) => r.id === testEmergencyId1);
    assert(Boolean(foundInList), 'Created emergency is visible in requests list');

    // -------------------------------------------------------------
    // WORKFLOW 3: Fleet and Hospital Management
    // -------------------------------------------------------------
    console.log('\n--- WORKFLOW 3: Fleet and Hospital Management ---');

    // 3.1 Hospital verification
    const hospitalsRes = await request('GET', '/api/hospitals', null, opToken);
    const hospitalsList = Array.isArray(hospitalsRes.body?.data)
      ? hospitalsRes.body.data
      : (Array.isArray(hospitalsRes.body?.hospitals) ? hospitalsRes.body.hospitals : (Array.isArray(hospitalsRes.body) ? hospitalsRes.body : []));
    assert(hospitalsRes.status === 200 && hospitalsList.length >= 4, 'GET /api/hospitals returns canonical hospital facilities');
    const h001 = hospitalsList.find((h) => h.id === 'H001');
    assert(h001 && h001.availableBeds === 247 && h001.totalBeds === 250, 'Hospital H001 bed baseline confirmed: 247/250');

    // 3.2 Hospital capacity validation
    const badCapacityRes = await request('PATCH', '/api/hospitals/H001/capacity', { availableBeds: 300, totalBeds: 250 }, opToken);
    assert(badCapacityRes.status === 400, 'Updating availableBeds greater than totalBeds rejected with 400 Bad Request');

    // 3.3 Ambulance fleet verification
    const ambulancesRes = await request('GET', '/api/ambulances', null, opToken);
    const ambulancesList = Array.isArray(ambulancesRes.body?.data)
      ? ambulancesRes.body.data
      : (Array.isArray(ambulancesRes.body?.ambulances) ? ambulancesRes.body.ambulances : (Array.isArray(ambulancesRes.body) ? ambulancesRes.body : []));
    assert(ambulancesRes.status === 200 && ambulancesList.length >= 5, 'GET /api/ambulances returns canonical fleet');
    const a001 = ambulancesList.find((a) => a.id === 'A001');
    assert(a001 && a001.status === 'AVAILABLE' && a001.isAvailable, 'Ambulance A001 baseline confirmed AVAILABLE');

    // -------------------------------------------------------------
    // WORKFLOW 4: Road Network, Closures & Dijkstra Routing
    // -------------------------------------------------------------
    console.log('\n--- WORKFLOW 4: Road Network, Traffic & Route Calculation ---');

    // 4.1 Route calculation via Dijkstra
    const routeBefore = await request('GET', '/api/route?from=LOC-01&to=LOC-10', null, opToken);
    const hasPath = routeBefore.body?.path || routeBefore.body?.data?.path;
    assert(routeBefore.status === 200 && Boolean(hasPath), 'Dijkstra route calculation returns optimal path and travel time');

    // 4.2 Create isolated test location and connecting road
    testLocationId = 'LOC-TEST-88';
    await request('POST', '/api/network/locations', {
      id: testLocationId,
      name: 'Stage 8 Testing Depot',
      category: 'Junction',
      xCoordinatesPercent: 40,
      yCoordinatesPercent: 40,
    }, opToken);

    const newRoadRes = await request('POST', '/api/network/roads', {
      startLocation: testLocationId,
      endLocation: 'LOC-01',
      distanceKm: 2.0,
      baseTravelTimeMinutes: 3.5,
    }, opToken);
    testRoadId = newRoadRes.body?.id || newRoadRes.body?.road?.id || newRoadRes.body?.data?.id;
    assert(newRoadRes.status === 201 && Boolean(testRoadId), 'Created isolated test road segment in PostgreSQL');

    // 4.3 Update traffic to HEAVY
    const trafficRes = await request('PATCH', `/api/roads/${testRoadId}/traffic`, { travelTimeMinutes: 7.0, traffic: 'HEAVY' }, opToken);
    assert(trafficRes.status === 200, 'Road traffic travel time updated');

    // Verify Notification generated for traffic
    const trafficNotif = await prisma.notification.findFirst({
      where: {
        OR: [
          { title: { contains: 'traffic', mode: 'insensitive' } },
          { message: { contains: 'traffic', mode: 'insensitive' } },
        ],
      },
      orderBy: { createdAt: 'desc' },
    });
    assert(Boolean(trafficNotif), 'Notification for road traffic update verified in PostgreSQL');

    // 4.4 Close road
    const closeRoadRes = await request('POST', `/api/roads/${testRoadId}/close`, { reason: 'Road maintenance' }, opToken);
    assert(closeRoadRes.status === 200, 'Road segment closed successfully');

    // Verify closed road in PostgreSQL
    const dbClosedRoad = await prisma.road.findUnique({ where: { id: testRoadId } });
    assert(dbClosedRoad && dbClosedRoad.status === 'CLOSED', 'PostgreSQL read-back confirms road status: CLOSED');

    // 4.5 Reopen road
    const reopenRoadRes = await request('POST', `/api/roads/${testRoadId}/open`, {}, opToken);
    assert(reopenRoadRes.status === 200, 'Road segment reopened successfully');

    // Clean up test road & location
    await prisma.notification.deleteMany({ where: { message: { contains: testRoadId } } });
        await prisma.road.deleteMany({ where: { id: testRoadId } });
    testRoadId = null;
        await prisma.networkLocation.deleteMany({ where: { id: testLocationId } });
    testLocationId = null;

    // -------------------------------------------------------------
    // WORKFLOW 5: Dispatch Recommendation & Trip Assignment
    // -------------------------------------------------------------
    console.log('\n--- WORKFLOW 5: Dispatch Recommendation & Trip Assignment ---');

    // 5.1 Recommend optimal ambulance and hospital
    const recommendRes = await request('POST', '/api/dispatch/recommend', { pickupLocation: 'LOC-03' }, opToken);
    const recAmb = recommendRes.body?.recommendedAmbulance || recommendRes.body?.data?.recommendedAmbulance;
    const recHosp = recommendRes.body?.recommendedHospital || recommendRes.body?.data?.recommendedHospital;
    assert(recommendRes.status === 200 && Boolean(recAmb) && Boolean(recHosp), 'Dispatch recommendation returns optimal ambulance and hospital');
    const recAmbulanceId = recAmb.id;
    const recHospitalId = recHosp.id;
    console.log(`  ℹ️ Recommendation: Ambulance ${recAmbulanceId}, Hospital ${recHospitalId}`);

    // 5.2 Execute dispatch transaction via POST /api/dispatch/:requestId
    const preHosp = await prisma.hospital.findUnique({ where: { id: recHospitalId } });
    const dispatchRes = await request('POST', `/api/dispatch/${testEmergencyId1}`, {}, opToken);
    const tripData = dispatchRes.body?.trip || dispatchRes.body?.data || dispatchRes.body;
    testTripId1 = tripData?.id;
    assert(dispatchRes.status === 200 && Boolean(testTripId1), 'Dispatch executed successfully via POST /api/dispatch/:requestId');

    // 5.3 PostgreSQL read-back: Atomic updates
    const dbDispatchedAmbulance = await prisma.ambulance.findUnique({ where: { id: tripData.ambulanceId } });
    assert(dbDispatchedAmbulance.status === 'DISPATCHED' && !dbDispatchedAmbulance.isAvailable, 'PostgreSQL confirms ambulance marked DISPATCHED and isAvailable: false');

    const dbDispatchedHospital = await prisma.hospital.findUnique({ where: { id: tripData.hospitalId } });
    assert(dbDispatchedHospital.availableBeds === preHosp.availableBeds - 1, `PostgreSQL confirms hospital bed reserved atomically (${preHosp.availableBeds} -> ${dbDispatchedHospital.availableBeds})`);

    const dbDispatchedTrip = await prisma.trip.findUnique({
      where: { id: testTripId1 },
      
    });
    assert(dbDispatchedTrip && dbDispatchedTrip.status === 'DISPATCHED', 'PostgreSQL confirms trip created with status DISPATCHED');

    // 5.4 Active trip conflict guard: Busy ambulance cannot be assigned to another trip
    const busyConflictRes = await request('POST', '/api/dispatch/execute', {
      emergencyId: testEmergencyId1,
      ambulanceId: tripData.ambulanceId,
      hospitalId: tripData.hospitalId,
    }, opToken);
    assert(busyConflictRes.status === 409, 'Conflict guard prevents assigning busy ambulance to another trip (409 Conflict)');

    // -------------------------------------------------------------
    // WORKFLOW 6: Stepwise Trip Lifecycle & Resource Release
    // -------------------------------------------------------------
    console.log('\n--- WORKFLOW 6: Stepwise Trip Lifecycle & Resource Release ---');

    // 6.1 EN_ROUTE_PICKUP
    const s1 = await request('PATCH', `/api/trips/${testTripId1}/status`, { status: 'EN_ROUTE_PICKUP' }, opToken);
    const t1 = s1.body?.trip || s1.body?.data || s1.body;
    assert(s1.status === 200 && t1?.status === 'EN_ROUTE_PICKUP', 'Trip transitioned to EN_ROUTE_PICKUP');

    // 6.2 AT_SCENE
    const s2 = await request('PATCH', `/api/trips/${testTripId1}/status`, { status: 'AT_SCENE' }, opToken);
    const t2 = s2.body?.trip || s2.body?.data || s2.body;
    assert(s2.status === 200 && t2?.status === 'AT_SCENE', 'Trip transitioned to AT_SCENE');

    // 6.3 TRANSPORTING
    const s3 = await request('PATCH', `/api/trips/${testTripId1}/status`, { status: 'TRANSPORTING' }, opToken);
    const t3 = s3.body?.trip || s3.body?.data || s3.body;
    assert(s3.status === 200 && t3?.status === 'TRANSPORTING', 'Trip transitioned to TRANSPORTING');

    // 6.4 ARRIVED_HOSPITAL
    const s4 = await request('PATCH', `/api/trips/${testTripId1}/status`, { status: 'ARRIVED_HOSPITAL' }, opToken);
    const t4 = s4.body?.trip || s4.body?.data || s4.body;
    assert(s4.status === 200 && t4?.status === 'ARRIVED_HOSPITAL', 'Trip transitioned to ARRIVED_HOSPITAL');

    // 6.5 Invalid transition rejection (e.g. backward transition)
    const invalidBackwards = await request('PATCH', `/api/trips/${testTripId1}/status`, { status: 'EN_ROUTE_PICKUP' }, opToken);
    assert(invalidBackwards.status === 400, 'Backwards status transition correctly rejected with 400 Bad Request');

    // 6.6 Trip completion & full resource release
    const completeRes = await request('POST', `/api/trips/${testTripId1}/complete`, {}, opToken);
    const cTrip = completeRes.body?.trip || completeRes.body?.data || completeRes.body;
    assert(completeRes.status === 200 && (cTrip?.completed || cTrip?.status === 'COMPLETED'), 'Trip completed successfully via POST /api/trips/:id/complete');

    // 6.7 PostgreSQL read-back: Complete verification
    const dbCompletedTrip = await prisma.trip.findUnique({
      where: { id: testTripId1 },
      
    });
    assert(dbCompletedTrip.status === 'COMPLETED' && Boolean(dbCompletedTrip.endTime), 'PostgreSQL confirms trip status COMPLETED with valid endTime');

    const dbReleasedAmbulance = await prisma.ambulance.findUnique({ where: { id: tripData.ambulanceId } });
    assert(dbReleasedAmbulance.status === 'AVAILABLE' && dbReleasedAmbulance.isAvailable, 'PostgreSQL confirms ambulance restored to AVAILABLE');

    const dbRestoredHospital = await prisma.hospital.findUnique({ where: { id: tripData.hospitalId } });
    assert(dbRestoredHospital.availableBeds === preHosp.availableBeds, `PostgreSQL confirms hospital available beds released back to ${preHosp.availableBeds}`);
    // AuditLog entry check removed (table decommissioned)

    // -------------------------------------------------------------
    // WORKFLOW 7: Trip Cancellation Workflow & Resource Restoration
    // -------------------------------------------------------------
    console.log('\n--- WORKFLOW 7: Trip Cancellation Workflow ---');

    // 7.1 Create second emergency
    const emerg2Res = await request('POST', '/api/requests', {
      callerName: 'Stage 8 Cancellation Test Patient',
      contactNumber: '9988776655',
      incidentLocationId: 'LOC-04',
      description: 'Minor trauma requiring ambulance transfer',
      severity: 'SERIOUS',
      requiredFacility: 'GENERAL',
    }, opToken);
    testEmergencyId2 = emerg2Res.body?.id || emerg2Res.body?.request?.id || emerg2Res.body?.data?.id;
    assert(emerg2Res.status === 201 && Boolean(testEmergencyId2), 'Created second test emergency');

    // 7.2 Dispatch second trip
    const dispatch2Res = await request('POST', `/api/dispatch/${testEmergencyId2}`, {}, opToken);
    const trip2Data = dispatch2Res.body?.trip || dispatch2Res.body?.data || dispatch2Res.body;
    testTripId2 = trip2Data?.id;
    assert(dispatch2Res.status === 200 && Boolean(testTripId2), 'Dispatched second test trip');

    // Verify bed decremented
    const dbHospitalBedReserved = await prisma.hospital.findUnique({ where: { id: trip2Data.hospitalId } });
    const reservedBeds = dbHospitalBedReserved.availableBeds;

    // 7.3 Cancel trip
    const cancelRes = await request('POST', `/api/trips/${testTripId2}/cancel`, {
      cancellationReason: 'Call cancelled by patient family; situation resolved.',
      reason: 'Call cancelled by patient family; situation resolved.',
    }, opToken);
    const canTrip = cancelRes.body?.trip || cancelRes.body?.data || cancelRes.body;
    assert(cancelRes.status === 200 && canTrip?.status === 'CANCELLED', 'Trip cancelled successfully (200 OK)');

    // 7.4 PostgreSQL read-back: Restoration
    const dbCancelledTrip = await prisma.trip.findUnique({ where: { id: testTripId2 } });
    assert(dbCancelledTrip.status === 'CANCELLED', 'PostgreSQL confirms trip status CANCELLED');

    const dbAmbulanceRestored = await prisma.ambulance.findUnique({ where: { id: trip2Data.ambulanceId } });
    assert(dbAmbulanceRestored.status === 'AVAILABLE' && dbAmbulanceRestored.isAvailable, 'PostgreSQL confirms ambulance restored to AVAILABLE after cancellation');

    const dbHospitalBedRestored = await prisma.hospital.findUnique({ where: { id: trip2Data.hospitalId } });
    assert(dbHospitalBedRestored.availableBeds === reservedBeds + 1, `PostgreSQL confirms hospital beds restored to ${reservedBeds + 1} after cancellation`);
    // AuditLog cancel check removed (table decommissioned)

    // -------------------------------------------------------------
    // WORKFLOW 8: Notifications, Audit Logs & Dashboard Sync
    // -------------------------------------------------------------
    console.log('\n--- WORKFLOW 8: Notifications, Audit Logs & Dashboard Sync ---');

    // 8.1 Notifications listing
    const notifsRes = await request('GET', '/api/notifications', null, opToken);
    const notifsList = Array.isArray(notifsRes.body?.data)
      ? notifsRes.body.data
      : (Array.isArray(notifsRes.body?.notifications) ? notifsRes.body.notifications : (Array.isArray(notifsRes.body) ? notifsRes.body : []));
    assert(notifsRes.status === 200 && notifsList.length > 0, 'GET /api/notifications returns notification stream');

    // 8.2 Mark single notification as read
    const targetNotif = notifsList[0];
    const readRes = await request('PATCH', `/api/notifications/${targetNotif.id}/read`, {}, opToken);
    const updatedNotif = readRes.body?.notification || readRes.body?.data || readRes.body;
    assert(readRes.status === 200 && Boolean(updatedNotif?.isRead), 'Notification marked as read (200 OK, isRead: true)');

    // Verify in PostgreSQL
    const dbNotif = await prisma.notification.findUnique({ where: { id: targetNotif.id } });
    assert(dbNotif && dbNotif.isRead, 'PostgreSQL confirms notification isRead: true persisted');

    // 8.3 Mark all read
    const markAllRes = await request('PATCH', '/api/notifications/read-all', {}, opToken);
    assert(markAllRes.status === 200, 'PATCH /api/notifications/read-all marks all notifications read');
    // 8.4 Audit Log retrieval: verified decommissioned (404)
    const auditRes = await request('GET', '/api/audit-logs', null, adminToken);
    assert(auditRes.status === 404, 'GET /api/audit-logs returns 404 Decommissioned');

    // 8.5 Dashboard Statistics live synchronization
    const statsRes = await request('GET', '/api/stats', null, opToken);
    const statsData = statsRes.body?.data || statsRes.body;
    assert(statsRes.status === 200 && statsData.totalAmbulances >= 5, 'GET /api/stats reflects live PostgreSQL data');
    console.log(`  ℹ️ Live Dashboard Stats: Ambulances ${statsData.availableAmbulances}/${statsData.totalAmbulances}, Beds ${statsData.availableBeds}/${statsData.totalBeds}, Active Trips ${statsData.activeTrips}`);

  } finally {
    // -------------------------------------------------------------
    // SAFE CLEANUP OF TEST-CREATED RECORDS ONLY
    // -------------------------------------------------------------
    console.log('\n--- CLEANUP: Removing Isolated Test Records Only ---');

    if (testTripId1) {
      await prisma.tripStatusHistory.deleteMany({ where: { tripId: testTripId1 } });
      await prisma.trip.deleteMany({ where: { id: testTripId1 } });
    }
    if (testTripId2) {
      await prisma.tripStatusHistory.deleteMany({ where: { tripId: testTripId2 } });
      await prisma.trip.deleteMany({ where: { id: testTripId2 } });
    }
    if (testEmergencyId1) {
      await prisma.emergencyStatusHistory.deleteMany({ where: { emergencyId: testEmergencyId1 } });
      await prisma.emergency.deleteMany({ where: { id: testEmergencyId1 } });
    }
    if (testEmergencyId2) {
      await prisma.emergencyStatusHistory.deleteMany({ where: { emergencyId: testEmergencyId2 } });
      await prisma.emergency.deleteMany({ where: { id: testEmergencyId2 } });
    }
    if (testRoadId) {
      await prisma.road.deleteMany({ where: { id: testRoadId } });
    }
    if (testLocationId) {
      await prisma.networkLocation.deleteMany({ where: { id: testLocationId } });
    }
    if (testCitizenUser) {
            await prisma.notification.deleteMany({ where: { recipientId: testCitizenUser.id } });
      await prisma.user.deleteMany({ where: { id: testCitizenUser.id } });
    }
    // Also clean any previously created stage 8 test users if interrupted
    await prisma.user.deleteMany({ where: { email: { startsWith: 'stage8_test_' } } });

    // Clean up notifications and audit entries created specifically for test emergencies/trips
    if (testEmergencyId1 || testEmergencyId2 || testTripId1 || testTripId2) {
            await prisma.notification.deleteMany({
        where: {
          message: {
            contains: 'Stage 8',
          },
        },
      });
    }

    // Verify baseline database preservation
    const finalUsers = await prisma.user.count();
    const finalAmbulances = await prisma.ambulance.count();
    const finalHospitals = await prisma.hospital.count();
    const finalRoads = await prisma.road.count();
    const finalLocations = await prisma.networkLocation.count();
    const h001Final = await prisma.hospital.findUnique({ where: { id: 'H001' } });

    console.log('Baseline Integrity Check:');
    console.log(`  Users in DB        : ${finalUsers} (Baseline: 5)`);
    console.log(`  Ambulances in DB   : ${finalAmbulances} (Baseline: 5)`);
    console.log(`  Hospitals in DB    : ${finalHospitals} (Baseline: 4)`);
    console.log(`  Roads in DB        : ${finalRoads} (Baseline: 22)`);
    console.log(`  Locations in DB    : ${finalLocations} (Baseline: 12)`);
    console.log(`  H001 Available Beds: ${h001Final ? `${h001Final.availableBeds}/${h001Final.totalBeds}` : 'N/A'} (Baseline: 247/250)`);

    assert(finalUsers === 5, 'Baseline users perfectly preserved (5)');
    assert(finalAmbulances === 5, 'Baseline ambulances perfectly preserved (5)');
    assert(finalHospitals === 4, 'Baseline hospitals perfectly preserved (4)');
    assert(finalRoads === 22, 'Baseline roads perfectly preserved (22)');
    assert(finalLocations === 12, 'Baseline network locations perfectly preserved (12)');
    assert(h001Final && h001Final.availableBeds === 247, 'Hospital H001 bed count perfectly restored to baseline (247)');

    await prisma.$disconnect();
  }

  console.log('\n=================================================================');
  console.log('STAGE 8 END-TO-END VERIFICATION SUMMARY');
  console.log(`Total Passed : ${passedCount}`);
  console.log(`Total Failed : ${failedCount}`);
  console.log('=================================================================');
}

runStage8Verification().catch((err) => {
  console.error('Fatal Stage 8 Verification Error:', err);
  process.exit(1);
});
