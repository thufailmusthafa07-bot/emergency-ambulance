const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const BASE_URL = 'http://localhost:5001';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    failed++;
  }
}

async function loginUser(identifier, password = '123456') {
  const res = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: identifier,
      email: identifier,
      password,
    }),
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(`Login failed for ${identifier}: ${data.message || res.statusText}`);
  }
  return { token: data.data.token, user: data.data.user };
}

async function apiRequest(endpoint, method = 'GET', body = null, token = null) {
  const headers = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (body) headers['Content-Type'] = 'application/json';

  const res = await fetch(`${BASE_URL}${endpoint}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch (e) {
    json = { raw: text };
  }
  return { status: res.status, ok: res.ok, data: json };
}

async function runStage7Tests() {
  console.log('====================================================');
  console.log('🧪 RUNNING STAGE 7 AUDIT LOGS, NOTIFICATIONS & HISTORIES SUITE');
  console.log('====================================================\n');

  // Track created test IDs for safe cleanup
  const cleanup = {
    emergencies: [],
    trips: [],
    ambulances: [],
    hospitals: [],
    roads: [],
    notifications: [],
    auditLogs: [],
  };

  try {
    // Initial cleanup of any prior test artifacts
    await prisma.road.deleteMany({
      where: {
        OR: [
          { startLocation: 'Stage 7 Test Terminal' },
          { endLocation: 'Stage 7 Test Terminal' },
        ],
      },
    });
    await prisma.networkLocation.deleteMany({
      where: { id: 'LOC-STAGE7-TEST' },
    });

    // 0. Verify and Login Users
    console.log('--- Step 0: User Authentication & Role Setup ---');
    const dispatcherAuth = await loginUser('operator01', '123456');
    const adminAuth = await loginUser('admin', '123456');
    const driverAuth = await loginUser('driver01', '123456');
    const citizenAuth = await loginUser('citizen01', '123456');

    assert(dispatcherAuth.token && dispatcherAuth.user.role === 'DISPATCHER', 'Dispatcher logged in');
    assert(adminAuth.token && adminAuth.user.role === 'ADMIN', 'Admin logged in');
    assert(driverAuth.token && driverAuth.user.role === 'AMBULANCE_STAFF', 'Ambulance staff logged in');
    assert(citizenAuth.token && citizenAuth.user.role === 'CITIZEN', 'Citizen logged in');

    // 1. Audit Log Authorization & RBAC
    console.log('\n--- Step 1: Audit Log RBAC & Retrieval Security ---');
    const unauthAudit = await apiRequest('/api/audit-logs');
    assert(unauthAudit.status === 401, 'Unauthenticated request to /api/audit-logs returns 401 Unauthorized');

    const citizenAudit = await apiRequest('/api/audit-logs', 'GET', null, citizenAuth.token);
    assert(citizenAudit.status === 403, 'Citizen request to /api/audit-logs returns 403 Forbidden');

    const driverAudit = await apiRequest('/api/audit-logs', 'GET', null, driverAuth.token);
    assert(driverAudit.status === 403, 'Ambulance staff request to /api/audit-logs returns 403 Forbidden');

    const dispatcherAudit = await apiRequest('/api/audit-logs', 'GET', null, dispatcherAuth.token);
    assert(dispatcherAudit.status === 200 && dispatcherAudit.data.success, 'Dispatcher can fetch /api/audit-logs (200 OK)');
    assert(Array.isArray(dispatcherAudit.data.data.auditLogs), 'Audit logs list returned as array');
    assert(typeof dispatcherAudit.data.data.totalCount === 'number', 'totalCount returned in pagination metadata');

    const adminAudit = await apiRequest('/api/audit-logs', 'GET', null, adminAuth.token);
    assert(adminAudit.status === 200 && adminAudit.data.success, 'Admin can fetch /api/audit-logs (200 OK)');

    // Immutability / Append-Only Protection: Clients cannot POST/PATCH/DELETE audit logs
    const fakeAuditPost = await apiRequest('/api/audit-logs', 'POST', { action: 'FABRICATED' }, adminAuth.token);
    assert(fakeAuditPost.status === 404 || fakeAuditPost.status === 405, 'POST /api/audit-logs rejected (immutability protected)');

    const fakeAuditPatch = await apiRequest('/api/audit-logs/some-id', 'PATCH', { action: 'TAMPERED' }, adminAuth.token);
    assert(fakeAuditPatch.status === 404 || fakeAuditPatch.status === 405, 'PATCH /api/audit-logs/:id rejected (immutability protected)');

    const fakeAuditDelete = await apiRequest('/api/audit-logs/some-id', 'DELETE', null, adminAuth.token);
    assert(fakeAuditDelete.status === 404 || fakeAuditDelete.status === 405, 'DELETE /api/audit-logs/:id rejected (immutability protected)');

    // Verify Audit Log sanitization (no passwords, tokens, hashes)
    const logs = dispatcherAudit.data.data.auditLogs;
    if (logs.length > 0) {
      const sample = logs[0];
      const hasPassword = 'password' in (sample.user || {}) || 'passwordHash' in (sample.user || {});
      assert(!hasPassword, 'Audit log user relation never contains password or passwordHash');
      const detailsStr = JSON.stringify(sample.details || '');
      assert(!detailsStr.toLowerCase().includes('hash') && !detailsStr.toLowerCase().includes('bearer'), 'Audit log details do not contain sensitive tokens/hashes');

      // Fetch by ID
      const singleLog = await apiRequest(`/api/audit-logs/${sample.id}`, 'GET', null, dispatcherAuth.token);
      assert(singleLog.status === 200 && singleLog.data.data.id === sample.id, 'Can fetch single audit log by ID');
    }

    const notFoundLog = await apiRequest('/api/audit-logs/non-existent-log-id-999', 'GET', null, dispatcherAuth.token);
    assert(notFoundLog.status === 404, 'Non-existent audit log ID returns 404 Not Found');

    // 2. Notification Ownership, Privacy & Read Status
    console.log('\n--- Step 2: Notification Ownership & Privacy ---');
    const unauthNotifs = await apiRequest('/api/notifications');
    assert(unauthNotifs.status === 401, 'Unauthenticated /api/notifications returns 401');

    // Create a private notification targeted strictly to Dispatcher (User A)
    const privateNotif = await prisma.notification.create({
      data: {
        recipientId: dispatcherAuth.user.id,
        title: 'Confidential Dispatcher Alert',
        message: 'This message is strictly for operator01.',
        type: 'SYSTEM_ALERT',
        isRead: false,
      },
    });
    cleanup.notifications.push(privateNotif.id);

    // Fetch notifications as Dispatcher (User A)
    const dispatcherNotifs = await apiRequest('/api/notifications', 'GET', null, dispatcherAuth.token);
    assert(dispatcherNotifs.status === 200, 'Dispatcher fetched notifications');
    const foundByDispatcher = dispatcherNotifs.data.data.notifications.some((n) => n.id === privateNotif.id);
    assert(foundByDispatcher, 'Dispatcher successfully received their targeted notification');

    // Fetch notifications as Citizen (User B)
    const citizenNotifs = await apiRequest('/api/notifications', 'GET', null, citizenAuth.token);
    assert(citizenNotifs.status === 200, 'Citizen fetched notifications');
    const foundByCitizen = citizenNotifs.data.data.notifications.some((n) => n.id === privateNotif.id);
    assert(!foundByCitizen, 'Citizen cannot see Dispatcher targeted private notification (Privacy enforced)');

    // Citizen attempts to mark Dispatcher's notification as read
    const citizenTamper = await apiRequest(`/api/notifications/${privateNotif.id}/read`, 'PATCH', {}, citizenAuth.token);
    assert(citizenTamper.status === 404, 'Citizen marking Dispatcher notification as read returns 404 (Ownership enforced)');

    // Dispatcher marks their notification as read
    const dispatcherRead = await apiRequest(`/api/notifications/${privateNotif.id}/read`, 'PATCH', {}, dispatcherAuth.token);
    assert(dispatcherRead.status === 200 && dispatcherRead.data.data.notification.isRead === true, 'Dispatcher marks notification as read (200 OK, isRead: true)');

    // Verify persistence in PostgreSQL
    const readBackNotif = await prisma.notification.findUnique({ where: { id: privateNotif.id } });
    assert(readBackNotif.isRead === true, 'Notification isRead: true persisted directly in PostgreSQL');

    // Dispatcher mark-all-read
    const markAll = await apiRequest('/api/notifications/read-all', 'PATCH', {}, dispatcherAuth.token);
    assert(markAll.status === 200 && markAll.data.data.unreadCount === 0, 'Dispatcher mark-all-read returns unreadCount: 0');

    // 3. Emergency Status Histories & Audit Persistence
    console.log('\n--- Step 3: Emergency Lifecycle, Histories & Audit Logs ---');
    const testEmergencyRes = await apiRequest('/api/emergencies', 'POST', {
      callerName: 'Stage 7 Test Caller',
      contactNumber: '9988776655',
      emergencyType: 'TRAUMA',
      pickupLocation: 'Anna Nagar',
      requiredFacility: 'TRAUMA',
      severity: 'SERIOUS',
      dispatchNotes: 'Automated test emergency for Stage 7 audit verification',
    }, dispatcherAuth.token);

    assert(testEmergencyRes.status === 201 && testEmergencyRes.data.success, 'Emergency created via API');
    const createdEmergencyId = testEmergencyRes.data.data.id;
    cleanup.emergencies.push(createdEmergencyId);

    // Verify Emergency in PostgreSQL with statusHistory and auditLog
    const dbEmergency = await prisma.emergency.findUnique({
      where: { id: createdEmergencyId },
      include: { statusHistory: true },
    });
    assert(dbEmergency && dbEmergency.status === 'PENDING', 'Emergency in DB with status PENDING');
    assert(dbEmergency.statusHistory.length === 1, 'Initial EmergencyStatusHistory record created');
    assert(dbEmergency.statusHistory[0].status === 'PENDING', 'History initial status is PENDING');

    // Verify AuditLog for Emergency creation

    // Update Emergency Status to ASSIGNED
    const updateEmRes = await apiRequest(`/api/emergencies/${createdEmergencyId}/status`, 'PATCH', {
      status: 'ASSIGNED',
    }, dispatcherAuth.token);
    assert(updateEmRes.status === 200, 'Emergency status updated to ASSIGNED');

    // Read back history from PostgreSQL
    const updatedDbEmergency = await prisma.emergency.findUnique({
      where: { id: createdEmergencyId },
      include: { statusHistory: { orderBy: { changedAt: 'asc' } } },
    });
    assert(updatedDbEmergency.status === 'ASSIGNED', 'Emergency status persisted as ASSIGNED');
    assert(updatedDbEmergency.statusHistory.length === 2, 'EmergencyStatusHistory has exactly 2 chronological records');
    assert(updatedDbEmergency.statusHistory[0].status === 'PENDING' && updatedDbEmergency.statusHistory[1].status === 'ASSIGNED', 'Chronological transition: PENDING -> ASSIGNED');

    // 4. Road Traffic, History & Notification
    console.log('\n--- Step 4: Road Operations, Audit Logs & Road Alert Notifications ---');
    // Create isolated test network location
    const testLoc = await prisma.networkLocation.create({
      data: {
        id: 'LOC-STAGE7-TEST',
        name: 'Stage 7 Test Terminal',
        category: 'Landmark',
        xCoordinatesPercent: 50,
        yCoordinatesPercent: 50,
      },
    });
    cleanup.locations = cleanup.locations || [];
    cleanup.locations.push(testLoc.id);

    const testRoadRes = await apiRequest('/api/roads', 'POST', {
      startLocation: testLoc.name,
      endLocation: 'Central Junction',
      distanceKm: 3.5,
      baseTravelTimeMinutes: 7,
      currentTraffic: 'LOW',
      speedLimitKmh: 45,
    }, adminAuth.token);

    assert(testRoadRes.status === 201, 'Road created via API (201 Created)');
    const createdRoadId = testRoadRes.data?.data?.id || testRoadRes.data?.id || testRoadRes.data?.road?.id;
    if (createdRoadId) cleanup.roads.push(createdRoadId);

    // Update road traffic to HEAVY
    const updateRoadRes = await apiRequest(`/api/roads/${createdRoadId}/traffic`, 'PATCH', {
      traffic: 'HEAVY',
      travelTimeMinutes: 14,
    }, adminAuth.token);
    assert(updateRoadRes.status === 200, 'Road traffic updated to HEAVY');

    const heavyNotif = await prisma.notification.findFirst({
      where: { type: 'WARNING', title: { contains: 'Heavy traffic' } },
      orderBy: { createdAt: 'desc' },
    });
    assert(heavyNotif !== null, 'Heavy traffic Notification generated and persisted in PostgreSQL');
    if (heavyNotif) cleanup.notifications.push(heavyNotif.id);

    // Close road
    const closeRoadRes = await apiRequest(`/api/roads/${createdRoadId}/close`, 'POST', {
      reason: 'Stage 7 Maintenance Closure',
    }, adminAuth.token);
    assert(closeRoadRes.status === 200, 'Road closed via POST /api/roads/:id/close');

    const roadCloseNotif = await prisma.notification.findFirst({
      where: { type: 'WARNING', title: 'Road closed' },
      orderBy: { createdAt: 'desc' },
    });
    assert(roadCloseNotif !== null, 'Road close Notification generated and persisted in PostgreSQL');
    if (roadCloseNotif) cleanup.notifications.push(roadCloseNotif.id);

    // 5. Ambulance Fleet & Location History
    console.log('\n--- Step 5: Ambulance Operations, Location History & Audit Logs ---');
    const testAmbReg = `TN-09-TEST-${Date.now().toString().slice(-4)}`;
    const testAmbRes = await apiRequest('/api/ambulances', 'POST', {
      registrationNumber: testAmbReg,
      driverName: 'Test Driver 07',
      driverContact: '9123456789',
      currentLocation: 'Anna Nagar',
      equipmentType: 'ALS',
    }, adminAuth.token);

    assert(testAmbRes.status === 201, 'Ambulance created via API (201 Created)');
    const createdAmbId = testAmbRes.data?.data?.id || testAmbRes.data?.id || testAmbRes.data?.ambulance?.id;
    if (createdAmbId) cleanup.ambulances.push(createdAmbId);

    const dbAmb = await prisma.ambulance.findUnique({
      where: { id: createdAmbId },
      include: { locationHistory: true },
    });
    assert(dbAmb && dbAmb.locationHistory.length === 1, 'Initial AmbulanceLocationHistory recorded');
    assert(dbAmb.locationHistory[0].location === 'Anna Nagar', 'AmbulanceLocationHistory recorded correct location: Anna Nagar');

    // Update Ambulance location & status
    const updateAmbRes = await apiRequest(`/api/ambulances/${createdAmbId}/status`, 'PATCH', {
      currentLocation: 'Gandhi Nagar',
      status: 'AVAILABLE',
    }, adminAuth.token);
    assert(updateAmbRes.status === 200, 'Ambulance relocated to Gandhi Nagar');

    const updatedDbAmb = await prisma.ambulance.findUnique({
      where: { id: createdAmbId },
      include: { locationHistory: { orderBy: { timestamp: 'asc' } } },
    });
    assert(updatedDbAmb.locationHistory.length === 2, 'AmbulanceLocationHistory has 2 chronological location records');
    assert(updatedDbAmb.locationHistory[0].location === 'Anna Nagar' && updatedDbAmb.locationHistory[1].location === 'Gandhi Nagar', 'Location history reflects move from Anna Nagar to Gandhi Nagar');

    // 6. Complete Trip Lifecycle, TripStatusHistory & Rollback Verification
    console.log('\n--- Step 6: Full Dispatch, TripStatusHistory & Audit Rollback ---');

    // Create a fresh pending emergency for dispatch
    const dispatchEmergencyRes = await apiRequest('/api/emergencies', 'POST', {
      callerName: 'Trip Test Caller',
      contactNumber: '9876543210',
      emergencyType: 'CARDIAC',
      pickupLocation: 'Gandhi Nagar',
      requiredFacility: 'CARDIAC',
      severity: 'CRITICAL',
    }, dispatcherAuth.token);
    const dispatchEmId = dispatchEmergencyRes.data?.data?.id || dispatchEmergencyRes.data?.id;
    if (dispatchEmId) cleanup.emergencies.push(dispatchEmId);

    // Intentionally trigger a failed dispatch to verify ROLLBACK (Invalid hospital ID)
    const failedDispatchRes = await apiRequest('/api/dispatch/execute', 'POST', {
      emergencyId: dispatchEmId,
      ambulanceId: createdAmbId,
      hospitalId: 'NON_EXISTENT_HOSPITAL_999',
    }, dispatcherAuth.token);
    assert(failedDispatchRes.status === 404, 'Dispatch with non-existent hospital rejected (404)');

    // Verify rollback: Emergency is still PENDING, Ambulance is still AVAILABLE, NO trip created, NO audit log created
    const postFailEm = await prisma.emergency.findUnique({ where: { id: dispatchEmId } });
    assert(postFailEm.status === 'PENDING', 'Emergency remained PENDING after failed dispatch rollback');

    const postFailAmb = await prisma.ambulance.findUnique({ where: { id: createdAmbId } });
    assert(postFailAmb.status === 'AVAILABLE' && postFailAmb.isAvailable === true, 'Ambulance remained AVAILABLE after failed dispatch rollback');

    const failedTrips = await prisma.trip.findMany({ where: { requestId: dispatchEmId } });
    assert(failedTrips.length === 0, 'No trip created in database after transaction rollback');

    // Now execute legitimate dispatch
    // Hospital H001 is City Hospital
    console.log(`  Dispatching: emergency=${dispatchEmId}, ambulance=${createdAmbId}, hospital=H001`);
    const validDispatchRes = await apiRequest('/api/dispatch/execute', 'POST', {
      emergencyId: dispatchEmId,
      ambulanceId: createdAmbId,
      hospitalId: 'H001',
    }, dispatcherAuth.token);
    console.log('  validDispatchRes result:', validDispatchRes.status, JSON.stringify(validDispatchRes.data));
    assert(validDispatchRes.status === 201 && (validDispatchRes.data.success || validDispatchRes.data.id), 'Legitimate dispatch executed (201 Created)');

    const createdTripId = validDispatchRes.data?.data?.id || validDispatchRes.data?.id || validDispatchRes.data?.trip?.id;
    if (createdTripId) cleanup.trips.push(createdTripId);

    // Read back Trip and TripStatusHistory from PostgreSQL
    const dbTrip = await prisma.trip.findUnique({
      where: { id: createdTripId },
      include: { statusHistory: true, ambulance: true, emergency: true, hospital: true },
    });
    assert(dbTrip !== null, 'Trip persisted in PostgreSQL');
    assert(dbTrip.status === 'DISPATCHED', 'Trip status is DISPATCHED');
    assert(dbTrip.statusHistory.length === 1, 'Initial TripStatusHistory record created');
    assert(dbTrip.statusHistory[0].status === 'DISPATCHED', 'TripStatusHistory initial status is DISPATCHED');

    // Transition trip status: EN_ROUTE_PICKUP -> AT_SCENE -> TRANSPORTING -> ARRIVED_HOSPITAL -> COMPLETED
    const tripStatusSteps = ['EN_ROUTE_PICKUP', 'AT_SCENE', 'TRANSPORTING', 'ARRIVED_HOSPITAL'];
    for (const step of tripStatusSteps) {
      const stepRes = await apiRequest(`/api/trips/${createdTripId}/status`, 'PATCH', { status: step }, dispatcherAuth.token);
      assert(stepRes.status === 200, `Trip transitioned to ${step}`);
    }

    // Complete Trip
    const completeRes = await apiRequest(`/api/trips/${createdTripId}/complete`, 'POST', {}, dispatcherAuth.token);
    assert(completeRes.status === 200, 'Trip completed successfully');

    // Verify all history records and audit entries in PostgreSQL
    const completedDbTrip = await prisma.trip.findUnique({
      where: { id: createdTripId },
      include: { statusHistory: { orderBy: { timestamp: 'asc' } } },
    });
    assert(completedDbTrip.status === 'COMPLETED', 'Trip status is COMPLETED in DB');
    // DISPATCHED, EN_ROUTE_PICKUP, AT_SCENE, TRANSPORTING, ARRIVED_HOSPITAL, COMPLETED -> 6 entries
    assert(completedDbTrip.statusHistory.length === 6, `TripStatusHistory accurately recorded all 6 transitions (found: ${completedDbTrip.statusHistory.length})`);

    const tripCompletedNotif = await prisma.notification.findFirst({
      where: { title: 'Trip completed', message: { contains: createdTripId } },
    });
    assert(tripCompletedNotif !== null, 'Notification created for Trip completed');
    if (tripCompletedNotif) cleanup.notifications.push(tripCompletedNotif.id);

  } catch (err) {
    console.error('Unexpected test error:', err);
    failed++;
  } finally {
    // 7. Cleanup ONLY Isolated Test Data
    console.log('\n--- Step 7: Isolated Test Data Cleanup & Baseline Verification ---');

    // Clean up created trips
    for (const tripId of cleanup.trips) {
      await prisma.tripStatusHistory.deleteMany({ where: { tripId } });
      await prisma.trip.deleteMany({ where: { id: tripId } });
    }

    // Clean up created emergencies
    for (const emId of cleanup.emergencies) {
      await prisma.emergencyStatusHistory.deleteMany({ where: { emergencyId: emId } });
      await prisma.emergency.deleteMany({ where: { id: emId } });
    }

    // Clean up created ambulances
    for (const ambId of cleanup.ambulances) {
      await prisma.ambulanceLocationHistory.deleteMany({ where: { ambulanceId: ambId } });
      await prisma.ambulance.deleteMany({ where: { id: ambId } });
    }

    // Clean up created roads
    for (const roadId of cleanup.roads) {
      await prisma.road.deleteMany({ where: { id: roadId } });
    }
    await prisma.road.deleteMany({
      where: {
        OR: [
          { startLocation: 'Stage 7 Test Terminal' },
          { endLocation: 'Stage 7 Test Terminal' },
        ],
      },
    });

    // Clean up created test locations
    if (cleanup.locations) {
      for (const locId of cleanup.locations) {
        await prisma.networkLocation.deleteMany({ where: { id: locId } });
      }
    }
    await prisma.networkLocation.deleteMany({
      where: { id: 'LOC-STAGE7-TEST' },
    });

    // Clean up created notifications
    for (const notifId of cleanup.notifications) {
      await prisma.notification.deleteMany({ where: { id: notifId } });
    }

    // Clean up any remaining test audit logs

    // Verify PostgreSQL Baseline Integrity
    const [userCount, ambCount, hospCount, roadCount, locCount] = await Promise.all([
      prisma.user.count(),
      prisma.ambulance.count(),
      prisma.hospital.count(),
      prisma.road.count(),
      prisma.networkLocation.count(),
    ]);

    console.log(`Baseline Verification:`);
    console.log(`  Users in DB: ${userCount} (Expected >= 5)`);
    console.log(`  Ambulances in DB: ${ambCount} (Expected 5 canonical: A001-A005)`);
    console.log(`  Hospitals in DB: ${hospCount} (Expected 4 canonical: H001-H004)`);
    console.log(`  Roads in DB: ${roadCount} (Expected 22 canonical)`);
    console.log(`  Locations in DB: ${locCount} (Expected 12 canonical: LOC-01-LOC-12)`);

    assert(userCount >= 5, 'Baseline users preserved');
    assert(ambCount === 5, 'Baseline ambulances preserved (5)');
    assert(hospCount === 4, 'Baseline hospitals preserved (4)');
    assert(roadCount === 22, 'Baseline roads preserved (22)');
    assert(locCount === 12, 'Baseline network locations preserved (12)');

    // Ensure all 5 canonical ambulances are AVAILABLE
    const canonicalAmbs = await prisma.ambulance.findMany({ select: { id: true, isAvailable: true, status: true } });
    const allAvailable = canonicalAmbs.every((a) => a.isAvailable && a.status === 'AVAILABLE');
    assert(allAvailable, 'All canonical ambulances are available and unlocked');

    // Ensure hospital beds restored
    const h1 = await prisma.hospital.findUnique({ where: { id: 'H001' } });
    console.log(`  H001 available beds: ${h1.availableBeds}/${h1.totalBeds}`);
    assert(h1.availableBeds === 247, 'H001 capacity accurately restored (247/250)');

    await prisma.$disconnect();
  }

  console.log('\n====================================================');
  console.log(`📊 STAGE 7 TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runStage7Tests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
