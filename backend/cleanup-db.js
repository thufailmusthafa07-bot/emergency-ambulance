const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function runCleanup() {
  console.log("=== STARTING COORDINATED DATABASE CLEANUP TRANSACTION ===");

  const OBSOLETE_USER_IDS = [
    "561c3869-fb3f-4a1e-adcb-98cd7b140af5", // nish106@gmail.com
    "6ca9adf4-d93f-4405-9eb0-1260f8ee4748", // huuj106@gmail.com
  ];

  const OBSOLETE_EMERGENCY_ID = "REQ-2026-006"; // Caller: huy, 5tghuk
  const OBSOLETE_TRIP_ID = "TRIP-1001"; // Associated with REQ-2026-006

  const OBSOLETE_NOTIFICATION_IDS = [
    "b1a2e48c-8a8c-4114-9295-304dc05d9b42", // Logged REQ-2026-006
    "20631247-bdbc-485e-895e-236fcb4bd22a", // Dispatched REQ-2026-006
    "e36ff9dd-79a7-4d67-8d1c-5d4c2c3f66e1", // Completed TRIP-1001
  ];

  const result = await prisma.$transaction(async (tx) => {
    // 1. Delete notifications related to obsolete emergency/trip
    const delNotifs = await tx.notification.deleteMany({
      where: { id: { in: OBSOLETE_NOTIFICATION_IDS } },
    });
    console.log(`Deleted ${delNotifs.count} obsolete notifications.`);

    // 2. Delete TripStatusHistory for TRIP-1001
    const delTripHist = await tx.tripStatusHistory.deleteMany({
      where: { tripId: OBSOLETE_TRIP_ID },
    });
    console.log(`Deleted ${delTripHist.count} TripStatusHistory records for ${OBSOLETE_TRIP_ID}.`);

    // 3. Delete Trip TRIP-1001
    const delTrip = await tx.trip.deleteMany({
      where: { id: OBSOLETE_TRIP_ID },
    });
    console.log(`Deleted ${delTrip.count} Trip record (${OBSOLETE_TRIP_ID}).`);

    // 4. Delete EmergencyStatusHistory for REQ-2026-006
    const delEmergHist = await tx.emergencyStatusHistory.deleteMany({
      where: { emergencyId: OBSOLETE_EMERGENCY_ID },
    });
    console.log(`Deleted ${delEmergHist.count} EmergencyStatusHistory records for ${OBSOLETE_EMERGENCY_ID}.`);

    // 5. Delete Emergency REQ-2026-006
    const delEmerg = await tx.emergency.deleteMany({
      where: { id: OBSOLETE_EMERGENCY_ID },
    });
    console.log(`Deleted ${delEmerg.count} Emergency record (${OBSOLETE_EMERGENCY_ID}).`);

    // 6. Delete obsolete test users
    const delUsers = await tx.user.deleteMany({
      where: { id: { in: OBSOLETE_USER_IDS } },
    });
    console.log(`Deleted ${delUsers.count} obsolete test users.`);

    return {
      deletedNotifications: delNotifs.count,
      deletedTripStatusHistory: delTripHist.count,
      deletedTrips: delTrip.count,
      deletedEmergencyStatusHistory: delEmergHist.count,
      deletedEmergencies: delEmerg.count,
      deletedUsers: delUsers.count,
    };
  });

  console.log("=== CLEANUP TRANSACTION COMMITTED SUCCESSFULLY ===");
  console.log("Results summary:", result);
}

if (process.argv.includes("--execute")) {
  runCleanup()
    .catch((err) => {
      console.error("Cleanup failed, transaction rolled back:", err);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
} else {
  console.log("Dry run: Use '--execute' to perform the cleanup.");
  process.exit(0);
}
