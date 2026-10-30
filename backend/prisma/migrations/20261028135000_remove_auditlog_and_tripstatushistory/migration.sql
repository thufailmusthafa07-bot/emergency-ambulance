-- DropForeignKey
ALTER TABLE "AuditLog" DROP CONSTRAINT IF EXISTS "AuditLog_userId_fkey";

-- DropForeignKey
ALTER TABLE "TripStatusHistory" DROP CONSTRAINT IF EXISTS "TripStatusHistory_tripId_fkey";

-- DropTable
DROP TABLE IF EXISTS "AuditLog";

-- DropTable
DROP TABLE IF EXISTS "TripStatusHistory";
