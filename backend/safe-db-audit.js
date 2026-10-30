const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function auditDb() {
  console.log("=== SAFE READ-ONLY DATABASE AUDIT ===");

  // Safe read-only metadata query
  const [meta] = await prisma.$queryRaw`
    SELECT 
      current_database() AS db_name,
      inet_server_port() AS server_port,
      inet_server_addr() AS server_addr,
      current_user AS db_user,
      version() AS pg_version
  `;
  
  console.log("Database Metadata:", {
    database: meta.db_name,
    port: meta.server_port,
    address: meta.server_addr ? String(meta.server_addr) : 'local/loopback',
    user: meta.db_user,
    version: meta.pg_version ? meta.pg_version.split(',')[0] : 'unknown'
  });

  // Safe table verification
  const counts = {
    users: await prisma.user.count(),
    networkLocations: await prisma.networkLocation.count(),
    roads: await prisma.road.count(),
    ambulances: await prisma.ambulance.count(),
    hospitals: await prisma.hospital.count(),
    emergencies: await prisma.emergency.count(),
    trips: await prisma.trip.count(),
    notifications: await prisma.notification.count()
  };
  console.log("Record Counts in Active Database:", counts);

  // Sample check of canonical Nalam Nagar records
  const sampleLocations = await prisma.networkLocation.findMany({
    take: 3,
    orderBy: { id: 'asc' },
    select: { id: true, name: true, category: true }
  });
  console.log("Sample Network Locations:", sampleLocations);

  const sampleHospitals = await prisma.hospital.findMany({
    take: 2,
    select: { id: true, name: true, location: true, availableBeds: true, totalBeds: true }
  });
  console.log("Sample Hospitals:", sampleHospitals);

  const sampleAmbulances = await prisma.ambulance.findMany({
    take: 2,
    select: { id: true, registrationNumber: true, driverName: true, status: true, currentLocation: true }
  });
  console.log("Sample Ambulances:", sampleAmbulances);
}

auditDb()
  .catch((err) => {
    console.error("Database audit error:", err.message);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
