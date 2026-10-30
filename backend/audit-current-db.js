const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function audit() {
  console.log("=== FULL DATABASE AUDIT ===");
  
  // 1. Users
  const users = await prisma.user.findMany({
    select: { id: true, email: true, username: true, name: true, role: true, department: true }
  });
  console.log("\n--- USERS (" + users.length + ") ---");
  console.log(JSON.stringify(users, null, 2));

  // 2. NetworkLocations
  const locations = await prisma.networkLocation.findMany({
    orderBy: { id: 'asc' }
  });
  console.log("\n--- NETWORK LOCATIONS (" + locations.length + ") ---");
  console.log(JSON.stringify(locations, null, 2));

  // 3. Hospitals
  const hospitals = await prisma.hospital.findMany();
  console.log("\n--- HOSPITALS (" + hospitals.length + ") ---");
  console.log(JSON.stringify(hospitals, null, 2));

  // 4. Ambulances
  const ambulances = await prisma.ambulance.findMany();
  console.log("\n--- AMBULANCES (" + ambulances.length + ") ---");
  console.log(JSON.stringify(ambulances, null, 2));

  // 5. Roads
  const roads = await prisma.road.findMany({
    orderBy: { id: 'asc' }
  });
  console.log("\n--- ROADS (" + roads.length + ") ---");
  console.log("Count:", roads.length);
  roads.slice(0, 5).forEach(r => console.log(`  ${r.id}: ${r.startLocation} -> ${r.endLocation} (${r.distanceKm}km, ${r.status}, ${r.currentTraffic})`));
  if (roads.length > 5) console.log(`  ... and ${roads.length - 5} more roads`);

  // 6. Emergencies
  const emergencies = await prisma.emergency.findMany({
    include: {
      statusHistory: true,
      trips: true
    }
  });
  console.log("\n--- EMERGENCIES (" + emergencies.length + ") ---");
  console.log(JSON.stringify(emergencies, null, 2));

  // 7. Trips
  const trips = await prisma.trip.findMany({
    include: {
      statusHistory: true
    }
  });
  console.log("\n--- TRIPS (" + trips.length + ") ---");
  console.log(JSON.stringify(trips, null, 2));

  // 8. Notifications
  const notifications = await prisma.notification.findMany();
  console.log("\n--- NOTIFICATIONS (" + notifications.length + ") ---");
  console.log(JSON.stringify(notifications, null, 2));

  // 9. Consistency Checks
  console.log("\n=== INTEGRITY & CONSISTENCY CHECK ===");
  const locIds = new Set(locations.map(l => l.id));
  const locNames = new Set(locations.map(l => l.name));
  
  // Roads validation
  let roadErrors = 0;
  for (const road of roads) {
    if (!locIds.has(road.startLocation) && !locNames.has(road.startLocation)) {
      console.warn(`[Road Warning] Road ${road.id} startLocation ${road.startLocation} is not a known networkLocation ID or Name!`);
      roadErrors++;
    }
    if (!locIds.has(road.endLocation) && !locNames.has(road.endLocation)) {
      console.warn(`[Road Warning] Road ${road.id} endLocation ${road.endLocation} is not a known networkLocation ID or Name!`);
      roadErrors++;
    }
  }
  console.log(`Road endpoints consistency check: ${roadErrors === 0 ? "PASSED (all endpoints valid)" : `${roadErrors} issues found`}`);

  // Hospitals location validation
  let hospErrors = 0;
  for (const h of hospitals) {
    if (!locIds.has(h.location) && !locNames.has(h.location)) {
      console.warn(`[Hospital Warning] Hospital ${h.id} (${h.name}) location ${h.location} is not a known networkLocation!`);
      hospErrors++;
    }
  }
  console.log(`Hospital locations consistency check: ${hospErrors === 0 ? "PASSED" : `${hospErrors} issues found`}`);

  // Ambulance location validation
  let ambErrors = 0;
  for (const a of ambulances) {
    if (!locIds.has(a.currentLocation) && !locNames.has(a.currentLocation)) {
      console.warn(`[Ambulance Warning] Ambulance ${a.id} (${a.registrationNumber}) currentLocation ${a.currentLocation} is not a known networkLocation!`);
      ambErrors++;
    }
  }
  console.log(`Ambulance locations consistency check: ${ambErrors === 0 ? "PASSED" : `${ambErrors} issues found`}`);

  // Emergency location validation
  let emergErrors = 0;
  for (const e of emergencies) {
    if (!locIds.has(e.pickupLocation) && !locNames.has(e.pickupLocation)) {
      console.warn(`[Emergency Warning] Emergency ${e.id} pickupLocation ${e.pickupLocation} is not a known networkLocation!`);
      emergErrors++;
    }
  }
  console.log(`Emergency pickupLocations consistency check: ${emergErrors === 0 ? "PASSED" : `${emergErrors} issues found`}`);
}

audit()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
