const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();

async function check() {
  const counts = {
    users: await p.user.count(),
    ambulances: await p.ambulance.count(),
    ambulanceLocationHistory: await p.ambulanceLocationHistory.count(),
    hospitals: await p.hospital.count(),
    emergencies: await p.emergency.count(),
    emergencyStatusHistory: await p.emergencyStatusHistory.count(),
    trips: await p.trip.count(),
    tripStatusHistory: await p.tripStatusHistory.count(),
    roads: await p.road.count(),
    networkLocations: await p.networkLocation.count(),
    notifications: await p.notification.count(),
    auditLogs: await p.auditLog.count()
  };
  console.log("ALL TABLE COUNTS:", JSON.stringify(counts, null, 2));
}

check().finally(() => p.$disconnect());
