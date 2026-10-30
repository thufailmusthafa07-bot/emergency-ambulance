import { Request, Response } from 'express';
import { randomUUID } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { prisma } from '../config/db';
import { sendSuccess, sendError } from '../utils/response';
import { calculateDijkstraPath } from '../utils/dijkstra';
import { AmbulanceStatusEnum, EmergencyStatusEnum, TripStatusEnum } from '@prisma/client';
import { hospitalSupportsFacility } from '../utils/facilityMatching';

class DispatchApiError extends Error {
  constructor(message: string, readonly statusCode = 409) {
    super(message);
  }
}

export const calculateRoute = async (req: Request, res: Response) => {
  try {
    const { startLocation, endLocation } = req.body;
    if (!startLocation || !endLocation) {
      return sendError(res, 'startLocation and endLocation are required', 400);
    }

    const roads = await prisma.road.findMany();
    const formattedRoads = roads.map((r: any) => ({
      startLocation: r.startLocation,
      endLocation: r.endLocation,
      distanceKm: r.distanceKm,
      baseTravelTimeMinutes: r.baseTravelTimeMinutes,
      currentTraffic: r.currentTraffic,
      status: r.status,
      currentTravelTimeMinutes: r.currentTravelTimeMinutes,
      isOneWay: r.isOneWay,
    }));

    const result = calculateDijkstraPath(formattedRoads, startLocation, endLocation);
    return sendSuccess(res, result);
  } catch (err: any) {
    return sendError(res, err.message || 'Route calculation failed', 500);
  }
};

export const recommendDispatch = async (req: Request, res: Response) => {
  try {
    const { emergencyId, pickupLocation } = req.body;

    let targetPickup = pickupLocation;
    let emergency = null;

    if (emergencyId) {
      emergency = await prisma.emergency.findUnique({ where: { id: emergencyId } });
      if (emergency) targetPickup = emergency.pickupLocation;
    }

    if (!targetPickup) {
      return sendError(res, 'Pickup location required', 400);
    }

    const roads = await prisma.road.findMany();
    const formattedRoads = roads.map((r: any) => ({
      startLocation: r.startLocation,
      endLocation: r.endLocation,
      distanceKm: r.distanceKm,
      baseTravelTimeMinutes: r.baseTravelTimeMinutes,
      currentTraffic: r.currentTraffic,
      status: r.status,
    }));

    // Find available ambulances without active trips
    const availableAmbulances = await prisma.ambulance.findMany({
      where: {
        isAvailable: true,
        status: AmbulanceStatusEnum.AVAILABLE,
        trips: {
          none: {
            status: { notIn: [TripStatusEnum.COMPLETED, TripStatusEnum.CANCELLED] },
          },
        },
      },
    });

    // Find hospitals with available beds
    const availableHospitals = await prisma.hospital.findMany({
      where: { availableBeds: { gt: 0 } },
    });

    if (availableAmbulances.length === 0) {
      return sendError(res, 'No available ambulances found in network', 404);
    }

    if (availableHospitals.length === 0) {
      return sendError(res, 'No hospitals with available bed capacity found', 404);
    }

    // Rank ambulances by distance to pickup
    const ambulanceScored = availableAmbulances.map((amb: any) => {
      const route = calculateDijkstraPath(formattedRoads, amb.currentLocation, targetPickup);
      return {
        ambulance: amb,
        routeToPickup: route,
        score: route.totalTimeMinutes,
      };
    }).filter((candidate: any) => candidate.routeToPickup.reachable)
      .sort((a: any, b: any) => a.score - b.score);

    const bestAmbulance = ambulanceScored[0];
    if (!bestAmbulance) {
      return sendError(res, 'No available ambulance has a reachable route', 409);
    }

    // Rank hospitals by distance from pickup
    const hospitalScored = availableHospitals.map((hosp: any) => {
      const route = calculateDijkstraPath(formattedRoads, targetPickup, hosp.location);
      return {
        hospital: hosp,
        routeToHospital: route,
        score: route.totalTimeMinutes,
      };
    }).filter((candidate: any) =>
      candidate.routeToHospital.reachable
      && hospitalSupportsFacility(emergency?.requiredFacility ?? 'GENERAL', candidate.hospital.facilities)
    ).sort((a: any, b: any) => a.score - b.score);

    const bestHospital = hospitalScored[0];

    if (!bestHospital) {
      return sendError(res, 'No available ambulance or suitable hospital has a reachable route', 409);
    }

    const combinedRoutePath = [
      ...bestAmbulance.routeToPickup.path,
      ...bestHospital.routeToHospital.path.slice(1),
    ];
    const totalEstTime = bestAmbulance.routeToPickup.totalTimeMinutes + bestHospital.routeToHospital.totalTimeMinutes;
    const totalDist = bestAmbulance.routeToPickup.totalDistanceKm + bestHospital.routeToHospital.totalDistanceKm;

    return sendSuccess(res, {
      emergencyId: emergencyId || null,
      pickupLocation: targetPickup,
      recommendedAmbulance: bestAmbulance.ambulance,
      recommendedHospital: bestHospital.hospital,
      etaMinutesToPickup: bestAmbulance.routeToPickup.totalTimeMinutes,
      etaMinutesToHospital: bestHospital.routeToHospital.totalTimeMinutes,
      totalTripEstimatedMinutes: totalEstTime,
      totalDistanceKm: totalDist,
      routePath: combinedRoutePath,
    });
  } catch (err: any) {
    return sendError(res, err.message || 'Recommendation failed', 500);
  }
};

export const executeDispatch = async (req: Request, res: Response) => {
  try {
    const { emergencyId, ambulanceId, hospitalId } = req.body ?? {};
    if (![emergencyId, ambulanceId, hospitalId].every((value) => typeof value === 'string' && value.length > 0)) {
      return sendError(res, 'Emergency, ambulance, and hospital IDs are required', 400);
    }
    const userId = (req as any).user?.userId ?? null;

    const trip = await prisma.$transaction(async (db) => {
      const [emergency, ambulance, hospital, roads] = await Promise.all([
        db.emergency.findUnique({ where: { id: emergencyId } }),
        db.ambulance.findUnique({ where: { id: ambulanceId } }),
        db.hospital.findUnique({ where: { id: hospitalId } }),
        db.road.findMany(),
      ]);
      if (!emergency) throw new DispatchApiError('Emergency not found', 404);
      if (!ambulance) throw new DispatchApiError('Ambulance not found', 404);
      if (!hospital) throw new DispatchApiError('Hospital not found', 404);
      if (emergency.status !== EmergencyStatusEnum.PENDING) throw new DispatchApiError('Emergency is no longer pending', 409);
      if (ambulance.status !== AmbulanceStatusEnum.AVAILABLE || !ambulance.isAvailable) throw new DispatchApiError('Ambulance is no longer available', 409);

      const activeTrip = await db.trip.findFirst({
        where: {
          ambulanceId: ambulance.id,
          status: { notIn: [TripStatusEnum.COMPLETED, TripStatusEnum.CANCELLED] },
        },
      });
      if (activeTrip) {
        throw new DispatchApiError(`Ambulance ${ambulance.id} is already assigned to active trip ${activeTrip.id}`, 409);
      }

      if (hospital.availableBeds < 1) throw new DispatchApiError('Hospital has no available beds', 409);
      if (!hospitalSupportsFacility(emergency.requiredFacility, hospital.facilities)) throw new DispatchApiError('Hospital does not support the required department', 400);

      const formattedRoads = roads.map((road) => ({
        startLocation: road.startLocation,
        endLocation: road.endLocation,
        distanceKm: road.distanceKm,
        baseTravelTimeMinutes: road.baseTravelTimeMinutes,
        currentTraffic: road.currentTraffic,
        status: road.status,
        currentTravelTimeMinutes: road.currentTravelTimeMinutes,
        isOneWay: road.isOneWay,
      }));
      const pickupRoute = calculateDijkstraPath(formattedRoads, ambulance.currentLocation, emergency.pickupLocation);
      const hospitalRoute = calculateDijkstraPath(formattedRoads, emergency.pickupLocation, hospital.location);
      if (!pickupRoute.reachable || !hospitalRoute.reachable) throw new DispatchApiError('No reachable route exists for the selected dispatch', 400);

      const emergencyClaim = await db.emergency.updateMany({
        where: { id: emergency.id, status: EmergencyStatusEnum.PENDING },
        data: { status: EmergencyStatusEnum.DISPATCHED },
      });
      const ambulanceClaim = await db.ambulance.updateMany({
        where: { id: ambulance.id, status: AmbulanceStatusEnum.AVAILABLE, isAvailable: true },
        data: { status: AmbulanceStatusEnum.DISPATCHED, isAvailable: false },
      });
      const hospitalClaim = await db.hospital.updateMany({
        where: { id: hospital.id, availableBeds: { gt: 0 } },
        data: { availableBeds: { decrement: 1 } },
      });
      if (emergencyClaim.count !== 1 || ambulanceClaim.count !== 1 || hospitalClaim.count !== 1) {
        throw new DispatchApiError('Dispatch resources changed concurrently; refresh and retry', 409);
      }

      await db.emergencyStatusHistory.create({
        data: { emergencyId: emergency.id, status: EmergencyStatusEnum.DISPATCHED, changedBy: (req as any).user?.username || 'Dispatch Center' },
      });

      const allTrips = await db.trip.findMany({ select: { id: true } });
      const maxNum = allTrips.reduce((max, t) => {
        const match = t.id.match(/^TRIP-(\d+)$/);
        return match ? Math.max(max, parseInt(match[1], 10)) : max;
      }, 1000);
      const tripId = `TRIP-${maxNum + 1}`;

      const totalMinutes = pickupRoute.totalTimeMinutes + hospitalRoute.totalTimeMinutes;
      const paths = [...pickupRoute.path, ...hospitalRoute.path.slice(1)];
      const createdTrip = await db.trip.create({
        data: {
          id: tripId,
          requestId: emergency.id,
          ambulanceId: ambulance.id,
          hospitalId: hospital.id,
          pickupLocation: emergency.pickupLocation,
          destinationHospital: hospital.location,
          status: TripStatusEnum.DISPATCHED,
          routePath: paths,
          pathToIncident: pickupRoute.path,
          timeToIncidentMinutes: pickupRoute.totalTimeMinutes,
          pathToHospital: hospitalRoute.path,
          timeToHospitalMinutes: hospitalRoute.totalTimeMinutes,
          estimatedDurationMinutes: Math.max(1, Math.round(totalMinutes)),
          distanceKm: pickupRoute.totalDistanceKm + hospitalRoute.totalDistanceKm,
        },
        include: { ambulance: true, hospital: true, emergency: true },
      });

      await db.notification.create({
        data: {
          title: emergency.severity === 'CRITICAL' ? 'Critical emergency dispatched' : 'Emergency dispatched',
          message: `Request ${emergency.id} assigned to ambulance ${ambulance.id} for hospital ${hospital.name}.`,
          type: emergency.severity === 'CRITICAL' ? 'CRITICAL' : 'INFO',
        },
      });

      return createdTrip;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    return sendSuccess(res, trip, 'Emergency trip dispatched successfully', 201);
  } catch (err: any) {
    if (err instanceof DispatchApiError) return sendError(res, err.message, err.statusCode);
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2034') {
      return sendError(res, 'Concurrent dispatch detected; refresh and retry', 409);
    }
    return sendError(res, err.message || 'Dispatch execution failed', 500);
  }
};
