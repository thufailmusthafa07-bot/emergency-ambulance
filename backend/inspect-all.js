const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function inspect() {
  console.log("=== USERS ===");
  const users = await prisma.user.findMany();
  console.log(users.map(u => ({ id: u.id, email: u.email, username: u.username, role: u.role, name: u.name, createdAt: u.createdAt })));

  console.log("\n=== EMERGENCIES ===");
  const emergencies = await prisma.emergency.findMany({
    include: {
      trips: { select: { id: true, status: true, ambulanceId: true, hospitalId: true } },
      statusHistory: { select: { id: true, status: true, changedAt: true, changedBy: true } }
    }
  });
  console.log(JSON.stringify(emergencies, null, 2));

  console.log("\n=== TRIPS ===");
  const trips = await prisma.trip.findMany({
    include: {
      statusHistory: true
    }
  });
  console.log(JSON.stringify(trips.map(t => ({
    id: t.id,
    requestId: t.requestId,
    ambulanceId: t.ambulanceId,
    hospitalId: t.hospitalId,
    pickupLocation: t.pickupLocation,
    destinationHospital: t.destinationHospital,
    status: t.status,
    startTime: t.startTime,
    endTime: t.endTime
  })), null, 2));

  console.log("\n=== NOTIFICATIONS ===");
  const notifications = await prisma.notification.findMany();
  console.log(JSON.stringify(notifications, null, 2));

  console.log("\n=== AUDIT LOGS ===");
  const auditLogs = await prisma.auditLog.findMany();
  console.log(JSON.stringify(auditLogs, null, 2));
}

inspect()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
