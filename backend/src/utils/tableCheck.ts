import { prisma } from '../config/db';

const cachedTableExists: Record<string, boolean> = {};

export async function checkTableExists(tableName: string): Promise<boolean> {
  if (typeof cachedTableExists[tableName] === 'boolean') {
    return cachedTableExists[tableName];
  }
  try {
    const res = await prisma.$queryRawUnsafe<Array<{ exists: boolean }>>(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = '${tableName}'
      ) as exists;
    `);
    const exists = Boolean(res[0]?.exists);
    cachedTableExists[tableName] = exists;
    return exists;
  } catch {
    return false;
  }
}

