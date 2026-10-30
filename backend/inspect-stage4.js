const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const ambulances = await prisma.ambulance.findMany({
    include: { trips: true, locationHistory: true },
    orderBy: { id: 'asc' }
  });
  console.log('--- AMBULANCES (' + ambulances.length + ') ---');
  for (const a of ambulances) {
    const activeTrips = a.trips.filter(t => !['COMPLETED', 'CANCELLED'].includes(t.status));
    console.log(`${a.id} | ${a.registrationNumber} | loc: ${a.currentLocation} | status: ${a.status} | isAvail: ${a.isAvailable} | activeTrips: ${activeTrips.length} | historyEntries: ${a.locationHistory.length}`);
  }

  const hospitals = await prisma.hospital.findMany({
    orderBy: { id: 'asc' }
  });
  console.log('\n--- HOSPITALS (' + hospitals.length + ') ---');
  for (const h of hospitals) {
    console.log(`${h.id} | ${h.name} | loc: ${h.location} | beds: ${h.availableBeds}/${h.totalBeds} | status: ${h.status} | facilities: ${h.facilities.join(', ')}`);
  }

  const networkLocations = await prisma.networkLocation.findMany({
    orderBy: { id: 'asc' }
  });
  console.log('\n--- NETWORK LOCATIONS (' + networkLocations.length + ') ---');
  for (const l of networkLocations) {
    console.log(`${l.id} | ${l.name} | cat: ${l.category}`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
