const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function executeApprovedCleanup() {
  console.log("=== EXECUTING APPROVED CLEANUP TRANSACTION (CATEGORIES 1 & 2) ===");

  const APPROVED_EMERGENCY_IDS = [
    "REQ-2026-006",
    "REQ-85698806-cb2a-4ba6-934f-29823c8c6e8f"
  ];

  const APPROVED_TRIP_IDS = [
    "TRIP-1008",
    "TRIP-1009"
  ];

  const APPROVED_NOTIFICATION_IDS = [
    "91705674-bd00-48e1-9bcf-30e8d954833c", // Logged REQ-2026-006
    "11269cec-9c65-4abd-aab6-2da1f4eb53ca", // Dispatched REQ-2026-006
    "91302d1b-91ba-4499-8e24-295809f9cb01", // Completed TRIP-1008
    "7f531276-7098-45cf-a571-909eac3809c0", // Dispatched REQ-85698806...
    "9cebb210-5610-4fd1-83c1-2b8d40de180a"  // Completed TRIP-1009
  ];

  const result = await prisma.$transaction(async (tx) => {
    // 1. Delete approved notifications
    const delNotifs = await tx.notification.deleteMany({
      where: { id: { in: APPROVED_NOTIFICATION_IDS } }
    });
    console.log(`[Step 1] Deleted ${delNotifs.count} notification records.`);

    // 2. Delete approved trip status histories
    const delTripHist = await tx.tripStatusHistory.deleteMany({
      where: { tripId: { in: APPROVED_TRIP_IDS } }
    });
    console.log(`[Step 2] Deleted ${delTripHist.count} TripStatusHistory records.`);

    // 3. Delete approved trips
    const delTrips = await tx.trip.deleteMany({
      where: { id: { in: APPROVED_TRIP_IDS } }
    });
    console.log(`[Step 3] Deleted ${delTrips.count} Trip records (${APPROVED_TRIP_IDS.join(', ')}).`);

    // 4. Delete approved emergency status histories
    const delEmergHist = await tx.emergencyStatusHistory.deleteMany({
      where: { emergencyId: { in: APPROVED_EMERGENCY_IDS } }
    });
    console.log(`[Step 4] Deleted ${delEmergHist.count} EmergencyStatusHistory records.`);

    // 5. Delete approved emergencies
    const delEmerg = await tx.emergency.deleteMany({
      where: { id: { in: APPROVED_EMERGENCY_IDS } }
    });
    console.log(`[Step 5] Deleted ${delEmerg.count} Emergency records (${APPROVED_EMERGENCY_IDS.join(', ')}).`);

    return {
      deletedNotifications: delNotifs.count,
      deletedTripStatusHistory: delTripHist.count,
      deletedTrips: delTrips.count,
      deletedEmergencyStatusHistory: delEmergHist.count,
      deletedEmergencies: delEmerg.count
    };
  });

  console.log("\n=== TRANSACTION COMMITTED SUCCESSFULLY ===");
  console.log("Summary of deleted records:", result);

  // Verification of remaining database state
  console.log("\n=== POST-CLEANUP VERIFICATION ===");
  const remainingEmergencies = await prisma.emergency.findMany({ select: { id: true, callerName: true, emergencyType: true } });
  console.log(`Remaining Emergencies (${remainingEmergencies.length}):`, remainingEmergencies);

  const remainingTrips = await prisma.trip.findMany({ select: { id: true, requestId: true, ambulanceId: true, hospitalId: true } });
  console.log(`Remaining Trips (${remainingTrips.length}):`, remainingTrips);

  const remainingUsers = await prisma.user.findMany({ select: { id: true, email: true, username: true, role: true } });
  console.log(`Remaining Users (${remainingUsers.length}):`, remainingUsers);

  const remainingNotifs = await prisma.notification.count();
  console.log(`Remaining Notifications count: ${remainingNotifs}`);

  const remainingRoads = await prisma.road.count();
  console.log(`Remaining Roads count: ${remainingRoads}`);

  const remainingLocations = await prisma.networkLocation.count();
  console.log(`Remaining Network Locations count: ${remainingLocations}`);

  const remainingAmbulances = await prisma.ambulance.count();
  console.log(`Remaining Ambulances count: ${remainingAmbulances}`);

  const remainingHospitals = await prisma.hospital.count();
  console.log(`Remaining Hospitals count: ${remainingHospitals}`);
}

executeApprovedCleanup()
  .catch((err) => {
    console.error("Cleanup transaction failed and was rolled back:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
