
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  const result = await prisma.$queryRaw`SELECT current_database(), current_user, inet_server_port()`;
  console.log("DATABASE INFO:", result);
  const userCount = await prisma.user.count();
  const ambulanceCount = await prisma.ambulance.count();
  const hospitalCount = await prisma.hospital.count();
  const emergencyCount = await prisma.emergency.count();
  const roadCount = await prisma.road.count();
  const networkLocationCount = await prisma.networkLocation.count();
  console.log("TABLE COUNTS:", {
    users: userCount,
    ambulances: ambulanceCount,
    hospitals: hospitalCount,
    emergencies: emergencyCount,
    roads: roadCount,
    networkLocations: networkLocationCount
  });
}

main()
  .catch((error) => {
    console.error("DATABASE FAILED:", error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
