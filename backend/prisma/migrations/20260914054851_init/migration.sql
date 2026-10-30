-- CreateEnum
CREATE TYPE "RoleEnum" AS ENUM ('ADMIN', 'DISPATCHER', 'AMBULANCE_STAFF', 'CITIZEN');

-- CreateEnum
CREATE TYPE "AmbulanceStatusEnum" AS ENUM ('AVAILABLE', 'DISPATCHED', 'EN_ROUTE', 'BUSY', 'MAINTENANCE', 'OFF_DUTY');

-- CreateEnum
CREATE TYPE "HospitalStatusEnum" AS ENUM ('NORMAL', 'HIGH_LOAD', 'CRITICAL');

-- CreateEnum
CREATE TYPE "EmergencySeverityEnum" AS ENUM ('CRITICAL', 'SERIOUS', 'MINOR');

-- CreateEnum
CREATE TYPE "EmergencyStatusEnum" AS ENUM ('PENDING', 'ASSIGNED', 'DISPATCHED', 'AT_SCENE', 'TRANSPORTING', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "TripStatusEnum" AS ENUM ('DISPATCHED', 'EN_ROUTE_PICKUP', 'AT_SCENE', 'TRANSPORTING', 'ARRIVED_HOSPITAL', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "TrafficConditionEnum" AS ENUM ('LOW', 'MODERATE', 'HEAVY');

-- CreateEnum
CREATE TYPE "RoadStatusEnum" AS ENUM ('OPEN', 'CLOSED', 'UNDER_MAINTENANCE');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "RoleEnum" NOT NULL DEFAULT 'DISPATCHER',
    "badgeId" TEXT,
    "department" TEXT,
    "avatarUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Ambulance" (
    "id" TEXT NOT NULL,
    "registrationNumber" TEXT NOT NULL,
    "driverName" TEXT NOT NULL,
    "driverContact" TEXT NOT NULL,
    "currentLocation" TEXT NOT NULL,
    "status" "AmbulanceStatusEnum" NOT NULL DEFAULT 'AVAILABLE',
    "equipmentType" TEXT NOT NULL DEFAULT 'ALS',
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Ambulance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AmbulanceLocationHistory" (
    "id" TEXT NOT NULL,
    "ambulanceId" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AmbulanceLocationHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Hospital" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "contactNumber" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'General Emergency',
    "totalBeds" INTEGER NOT NULL DEFAULT 100,
    "availableBeds" INTEGER NOT NULL DEFAULT 20,
    "status" "HospitalStatusEnum" NOT NULL DEFAULT 'NORMAL',
    "facilities" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Hospital_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Emergency" (
    "id" TEXT NOT NULL,
    "callerName" TEXT NOT NULL,
    "contactNumber" TEXT NOT NULL,
    "emergencyType" TEXT NOT NULL,
    "pickupLocation" TEXT NOT NULL,
    "severity" "EmergencySeverityEnum" NOT NULL DEFAULT 'SERIOUS',
    "status" "EmergencyStatusEnum" NOT NULL DEFAULT 'PENDING',
    "dispatchNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Emergency_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmergencyStatusHistory" (
    "id" TEXT NOT NULL,
    "emergencyId" TEXT NOT NULL,
    "status" "EmergencyStatusEnum" NOT NULL,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "changedBy" TEXT,

    CONSTRAINT "EmergencyStatusHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Trip" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "ambulanceId" TEXT NOT NULL,
    "hospitalId" TEXT NOT NULL,
    "pickupLocation" TEXT NOT NULL,
    "destinationHospital" TEXT NOT NULL,
    "status" "TripStatusEnum" NOT NULL DEFAULT 'DISPATCHED',
    "routePath" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "estimatedDurationMinutes" INTEGER NOT NULL DEFAULT 15,
    "actualDurationMinutes" INTEGER,
    "distanceKm" DOUBLE PRECISION NOT NULL DEFAULT 5.0,
    "startTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endTime" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Trip_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TripStatusHistory" (
    "id" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "status" "TripStatusEnum" NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,

    CONSTRAINT "TripStatusHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Road" (
    "id" TEXT NOT NULL,
    "startLocation" TEXT NOT NULL,
    "endLocation" TEXT NOT NULL,
    "distanceKm" DOUBLE PRECISION NOT NULL,
    "baseTravelTimeMinutes" DOUBLE PRECISION NOT NULL,
    "currentTraffic" "TrafficConditionEnum" NOT NULL DEFAULT 'LOW',
    "speedLimitKmh" INTEGER NOT NULL DEFAULT 60,
    "status" "RoadStatusEnum" NOT NULL DEFAULT 'OPEN',
    "isOneWay" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Road_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'INFO',
    "recipientId" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT,
    "details" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "Ambulance_registrationNumber_key" ON "Ambulance"("registrationNumber");

-- AddForeignKey
ALTER TABLE "AmbulanceLocationHistory" ADD CONSTRAINT "AmbulanceLocationHistory_ambulanceId_fkey" FOREIGN KEY ("ambulanceId") REFERENCES "Ambulance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmergencyStatusHistory" ADD CONSTRAINT "EmergencyStatusHistory_emergencyId_fkey" FOREIGN KEY ("emergencyId") REFERENCES "Emergency"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Trip" ADD CONSTRAINT "Trip_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "Emergency"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Trip" ADD CONSTRAINT "Trip_ambulanceId_fkey" FOREIGN KEY ("ambulanceId") REFERENCES "Ambulance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Trip" ADD CONSTRAINT "Trip_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "Hospital"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TripStatusHistory" ADD CONSTRAINT "TripStatusHistory_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
