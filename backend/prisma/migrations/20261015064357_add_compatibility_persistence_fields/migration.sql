-- AlterTable
ALTER TABLE "Emergency" ADD COLUMN     "requiredFacility" TEXT NOT NULL DEFAULT 'GENERAL';

-- AlterTable
ALTER TABLE "Road" ADD COLUMN     "closureReason" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "currentTravelTimeMinutes" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "Trip" ADD COLUMN     "blocked" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "pathToHospital" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "pathToIncident" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "reasoning" TEXT,
ADD COLUMN     "timeToHospitalMinutes" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "timeToIncidentMinutes" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "NetworkLocation" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'Landmark',
    "xCoordinatesPercent" DOUBLE PRECISION NOT NULL DEFAULT 50,
    "yCoordinatesPercent" DOUBLE PRECISION NOT NULL DEFAULT 50,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NetworkLocation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "NetworkLocation_name_key" ON "NetworkLocation"("name");
