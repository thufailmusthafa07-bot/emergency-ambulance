const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();

async function deepAnalyze() {
  console.log("=== 1. USERS ANALYSIS ===");
  const users = await p.user.findMany();
  for (const u of users) {
    console.log(`User: ${u.id} | ${u.username} | ${u.email} | ${u.role} | ${u.name} | Created: ${u.createdAt}`);
  }

  console.log("\n=== 2. EMERGENCIES ANALYSIS ===");
  const emergencies = await p.emergency.findMany({
    include: {
      trips: {
        include: { statusHistory: true }
      },
      statusHistory: true
    }
  });

  for (const e of emergencies) {
    console.log(`\nEmergency: ${e.id}`);
    console.log(`  Caller: "${e.callerName}" | Phone: "${e.contactNumber}"`);
    console.log(`  Type: "${e.emergencyType}" | Location: "${e.pickupLocation}" | Severity: ${e.severity} | Status: ${e.status}`);
    console.log(`  Notes: "${e.dispatchNotes}" | Created: ${e.createdAt}`);
    console.log(`  Trips (${e.trips.length}):`);
    for (const t of e.trips) {
      console.log(`    - Trip ${t.id} | Amb: ${t.ambulanceId} | Hosp: ${t.hospitalId} | Status: ${t.status} | Duration: ${t.estimatedDurationMinutes}m | History: ${t.statusHistory.length}`);
    }
    console.log(`  Emergency Status History (${e.statusHistory.length}):`);
    for (const sh of e.statusHistory) {
      console.log(`    - StatusHistory ${sh.id} | Status: ${sh.status} | By: ${sh.changedBy} | At: ${sh.changedAt}`);
    }
  }

  console.log("\n=== 3. NOTIFICATIONS ANALYSIS ===");
  const notifs = await p.notification.findMany({ orderBy: { createdAt: 'asc' } });
  for (const n of notifs) {
    console.log(`Notification: ${n.id} | Type: ${n.type} | Title: "${n.title}" | Message: "${n.message}" | Read: ${n.isRead} | At: ${n.createdAt}`);
  }
}

deepAnalyze().finally(() => p.$disconnect());
