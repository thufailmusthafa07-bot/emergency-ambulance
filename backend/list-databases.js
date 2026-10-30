require('dotenv').config({ path: require('path').resolve(__dirname, '.env') });
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function listDbs() {
  const dbs = await prisma.$queryRaw`SELECT datname FROM pg_database WHERE datistemplate = false;`;
  console.log('Databases on port 5000:');
  console.log(dbs.map(d => d.datname));
  await prisma.$disconnect();
}
listDbs();

