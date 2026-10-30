import { Router } from 'express';
import {
  AmbulanceStatusEnum,
  EmergencySeverityEnum,
  EmergencyStatusEnum,
  HospitalStatusEnum,
  Prisma,
  RoadStatusEnum,
  TrafficConditionEnum,
  TripStatusEnum,
} from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { prisma } from '../config/db';
import { requireRole } from '../middleware/authMiddleware';
import { facilityKey, hospitalSupportsFacility } from '../utils/facilityMatching';
import { checkTableExists } from '../utils/tableCheck';

const router = Router();

class ApiError extends Error {
  constructor(message: string, readonly statusCode = 400) {
    super(message);
  }
}

type RouteResult = { reachable: boolean; totalMinutes: number; path: string[] };

const asIdMap = (locations: Array<{ id: string; name: string }>) => ({
  byId: new Map(locations.map((location) => [location.id, location.name])),
  byName: new Map(locations.map((location) => [location.name, location.id])),
});

const CANONICAL_NETWORK_LOCATIONS = [
  { id: 'LOC-01', name: 'Central Junction', category: 'Junction', xCoordinatesPercent: 45, yCoordinatesPercent: 50 },
  { id: 'LOC-02', name: 'Anna Nagar', category: 'Landmark', xCoordinatesPercent: 30, yCoordinatesPercent: 35 },
  { id: 'LOC-03', name: 'Gandhi Nagar', category: 'Landmark', xCoordinatesPercent: 65, yCoordinatesPercent: 35 },
  { id: 'LOC-04', name: 'College', category: 'Landmark', xCoordinatesPercent: 15, yCoordinatesPercent: 20 },
  { id: 'LOC-05', name: 'Government School', category: 'Landmark', xCoordinatesPercent: 80, yCoordinatesPercent: 20 },
  { id: 'LOC-06', name: 'Industrial Area', category: 'Landmark', xCoordinatesPercent: 85, yCoordinatesPercent: 55 },
  { id: 'LOC-07', name: 'Railway Station', category: 'Transit', xCoordinatesPercent: 30, yCoordinatesPercent: 10 },
  { id: 'LOC-08', name: 'Bus Stand', category: 'Transit', xCoordinatesPercent: 70, yCoordinatesPercent: 10 },
  { id: 'LOC-09', name: 'Market', category: 'Landmark', xCoordinatesPercent: 25, yCoordinatesPercent: 65 },
  { id: 'LOC-10', name: 'City Hospital', category: 'Hospital', xCoordinatesPercent: 35, yCoordinatesPercent: 85 },
  { id: 'LOC-11', name: 'Trauma Hospital', category: 'Hospital', xCoordinatesPercent: 80, yCoordinatesPercent: 80 },
  { id: 'LOC-12', name: 'Emergency Hospital', category: 'Hospital', xCoordinatesPercent: 10, yCoordinatesPercent: 45 },
];

async function ensureNetworkLocations() {
  const [roads, hospitals, ambulances, emergencies, existing] = await Promise.all([
    prisma.road.findMany({ select: { startLocation: true, endLocation: true } }),
    prisma.hospital.findMany({ select: { location: true } }),
    prisma.ambulance.findMany({ select: { currentLocation: true } }),
    prisma.emergency.findMany({ select: { pickupLocation: true } }),
    prisma.networkLocation.findMany(),
  ]);

  if (existing.length === 0) {
    await prisma.networkLocation.createMany({
      data: CANONICAL_NETWORK_LOCATIONS,
      skipDuplicates: true,
    });
  }

  const currentLocations = existing.length > 0 ? existing : await prisma.networkLocation.findMany();
  const hospitalNames = new Set(hospitals.map((hospital) => hospital.location));
  const names = new Set<string>();
  roads.forEach((road) => {
    names.add(road.startLocation);
    names.add(road.endLocation);
  });
  hospitals.forEach((hospital) => names.add(hospital.location));
  ambulances.forEach((ambulance) => names.add(ambulance.currentLocation));
  emergencies.forEach((emergency) => names.add(emergency.pickupLocation));

  const existingNames = new Set(currentLocations.map((location) => location.name));
  const nextIndex = currentLocations.reduce((largest, location) => {
    const index = Number(location.id.replace(/^LOC-/, ''));
    return Number.isFinite(index) ? Math.max(largest, index) : largest;
  }, 0);
  const newNames = [...names].filter((name) => !existingNames.has(name)).sort((left, right) => left.localeCompare(right));
  if (newNames.length > 0) {
    const total = currentLocations.length + newNames.length;
    await prisma.networkLocation.createMany({
      data: newNames.map((name, index) => {
        const position = currentLocations.length + index;
        const angle = (2 * Math.PI * position) / total - Math.PI / 2;
        return {
          id: `LOC-${String(nextIndex + index + 1).padStart(2, '0')}`,
          name,
          category: hospitalNames.has(name) ? 'Hospital' : 'Landmark',
          xCoordinatesPercent: Math.round(50 + Math.cos(angle) * 40),
          yCoordinatesPercent: Math.round(50 + Math.sin(angle) * 40),
        };
      }),
      skipDuplicates: true,
    });
  }
  return prisma.networkLocation.findMany({ orderBy: { id: 'asc' } });
}

const trafficMultiplier = (traffic: TrafficConditionEnum) => {
  if (traffic === TrafficConditionEnum.HEAVY) return 2;
  if (traffic === TrafficConditionEnum.MODERATE) return 1.4;
  return 1;
};

const roadMinutes = (road: {
  baseTravelTimeMinutes: number;
  currentTravelTimeMinutes: number | null;
  currentTraffic: TrafficConditionEnum;
}) => Math.round((road.currentTravelTimeMinutes ?? road.baseTravelTimeMinutes * trafficMultiplier(road.currentTraffic)) * 10) / 10;

function findShortestRoute(start: string, destination: string, roads: Array<{
  startLocation: string;
  endLocation: string;
  currentTravelTimeMinutes: number | null;
  baseTravelTimeMinutes: number;
  currentTraffic: TrafficConditionEnum;
  status: RoadStatusEnum;
  isOneWay: boolean;
}>): RouteResult {
  if (!start || !destination) return { reachable: false, totalMinutes: 0, path: [] };
  if (start === destination) return { reachable: true, totalMinutes: 0, path: [start] };

  const graph = new Map<string, Array<{ name: string; minutes: number }>>();
  for (const road of roads) {
    if (road.status !== RoadStatusEnum.OPEN) continue;
    const minutes = roadMinutes(road);
    const startEdges = graph.get(road.startLocation) ?? [];
    startEdges.push({ name: road.endLocation, minutes });
    graph.set(road.startLocation, startEdges);
    if (!road.isOneWay) {
      const endEdges = graph.get(road.endLocation) ?? [];
      endEdges.push({ name: road.startLocation, minutes });
      graph.set(road.endLocation, endEdges);
    }
  }

  const distances = new Map<string, number>([[start, 0]]);
  const previous = new Map<string, string>();
  const visited = new Set<string>();
  while (true) {
    let current: string | null = null;
    let currentDistance = Infinity;
    for (const [name, distance] of distances) {
      if (!visited.has(name) && distance < currentDistance) {
        current = name;
        currentDistance = distance;
      }
    }
    if (!current) break;
    if (current === destination) break;
    visited.add(current);
    for (const edge of graph.get(current) ?? []) {
      const candidate = currentDistance + edge.minutes;
      if (candidate < (distances.get(edge.name) ?? Infinity)) {
        distances.set(edge.name, candidate);
        previous.set(edge.name, current);
      }
    }
  }

  const totalMinutes = distances.get(destination);
  if (totalMinutes === undefined) return { reachable: false, totalMinutes: 0, path: [] };
  const path = [destination];
  while (path[0] !== start) {
    const parent = previous.get(path[0]);
    if (!parent) return { reachable: false, totalMinutes: 0, path: [] };
    path.unshift(parent);
  }
  return { reachable: true, totalMinutes, path };
}

async function recalculateActiveTrips(
  db: Prisma.TransactionClient,
  changedRoad: {
    id: string;
    startLocation: string;
    endLocation: string;
    status: RoadStatusEnum;
    isOneWay: boolean;
  },
  roads: Array<{
    startLocation: string;
    endLocation: string;
    currentTravelTimeMinutes: number | null;
    baseTravelTimeMinutes: number;
    currentTraffic: TrafficConditionEnum;
    status: RoadStatusEnum;
    isOneWay: boolean;
  }>,
  locations: Array<{ id: string; name: string }>
): Promise<string[]> {
  const ids = asIdMap(locations);
  const activeTrips = await db.trip.findMany({
    where: {
      status: { notIn: [TripStatusEnum.COMPLETED, TripStatusEnum.CANCELLED] },
    },
    include: {
      ambulance: true,
      hospital: true,
      emergency: true,
    },
  });

  if (activeTrips.length === 0) {
    return ['No active trips currently in transit. Network topological weights updated.'];
  }

  const startName = ids.byId.get(changedRoad.startLocation) ?? changedRoad.startLocation;
  const endName = ids.byId.get(changedRoad.endLocation) ?? changedRoad.endLocation;
  const startId = ids.byName.get(startName) ?? startName;
  const endId = ids.byName.get(endName) ?? endName;

  const logs: string[] = [];

  for (const trip of activeTrips) {
    const checkEdgeInPath = (path: string[]) => {
      for (let i = 0; i < path.length - 1; i++) {
        const u = path[i];
        const v = path[i + 1];
        if (
          (u === startId && v === endId) ||
          (u === startName && v === endName) ||
          (!changedRoad.isOneWay && (
            (u === endId && v === startId) ||
            (u === endName && v === startName)
          ))
        ) {
          return true;
        }
      }
      return false;
    };

    const usesRoad = checkEdgeInPath(trip.pathToIncident) || checkEdgeInPath(trip.pathToHospital) || checkEdgeInPath(trip.routePath);
    const wasBlocked = trip.blocked;

    if (!usesRoad && !wasBlocked) continue;

    const ambLocation = ids.byId.get(trip.ambulance.currentLocation) ?? trip.ambulance.currentLocation;
    const pickupLoc = ids.byId.get(trip.pickupLocation) ?? trip.pickupLocation;
    const hospLoc = ids.byId.get(trip.hospital.location) ?? trip.hospital.location;

    const isEnRoute = trip.status === TripStatusEnum.DISPATCHED || trip.status === TripStatusEnum.EN_ROUTE_PICKUP;
    const incidentRoute = isEnRoute
      ? findShortestRoute(ambLocation, pickupLoc, roads)
      : { reachable: true, totalMinutes: trip.timeToIncidentMinutes, path: trip.pathToIncident };

    const hospitalRoute = findShortestRoute(pickupLoc, hospLoc, roads);

    if (!incidentRoute.reachable || !hospitalRoute.reachable) {
      await db.trip.update({
        where: { id: trip.id },
        data: {
          blocked: true,
          reasoning: `BLOCKED: Road closure on ${startName} - ${endName} severed route. No alternate route exists.`,
        },
      });

      if (await checkTableExists('Notification')) await db.notification.create({
        data: {
          title: `Trip ${trip.id} Path Severed`,
          message: `Mission ${trip.id} (Ambulance ${trip.ambulanceId}) is blocked by road closure on ${startName} - ${endName}.`,
          type: 'CRITICAL',
        },
      });

      logs.push(
        `[BLOCKED] Trip ${trip.id} (Ambulance ${trip.ambulanceId}): Destination unreachable due to road closure (${startName} - ${endName}). No alternative path available.`
      );
    } else {
      const newPathToIncident = incidentRoute.path.map((name) => ids.byName.get(name) ?? name);
      const newPathToHospital = hospitalRoute.path.map((name) => ids.byName.get(name) ?? name);
      const combinedRoutePath = [...newPathToIncident, ...newPathToHospital.slice(1)];
      const newTotalMinutes = incidentRoute.totalMinutes + hospitalRoute.totalMinutes;
      const prevTotal = trip.timeToIncidentMinutes + trip.timeToHospitalMinutes || trip.estimatedDurationMinutes;
      const diff = Math.round((newTotalMinutes - prevTotal) * 10) / 10;

      await db.trip.update({
        where: { id: trip.id },
        data: {
          blocked: false,
          pathToIncident: newPathToIncident,
          timeToIncidentMinutes: incidentRoute.totalMinutes,
          pathToHospital: newPathToHospital,
          timeToHospitalMinutes: hospitalRoute.totalMinutes,
          routePath: combinedRoutePath,
          estimatedDurationMinutes: Math.round(newTotalMinutes),
          reasoning: wasBlocked
            ? `UNBLOCKED: Restored route via [${combinedRoutePath.join(' -> ')}]. Total ETA: ${newTotalMinutes.toFixed(1)} mins.`
            : `REROUTED: Updated path [${combinedRoutePath.join(' -> ')}] with ETA ${newTotalMinutes.toFixed(1)} mins (${diff >= 0 ? `+${diff}` : diff}m diff).`,
        },
      });

      if (wasBlocked) {
        if (await checkTableExists('Notification')) await db.notification.create({
          data: {
            title: `Trip ${trip.id} Restored`,
            message: `Mission ${trip.id} route unblocked via ${combinedRoutePath.join(' -> ')}. New ETA: ${newTotalMinutes.toFixed(1)} mins.`,
            type: 'SUCCESS',
          },
        });
        logs.push(
          `[UNBLOCKED] Trip ${trip.id} (Ambulance ${trip.ambulanceId}): Route restored via [${combinedRoutePath.join(' -> ')}]. New ETA: ${newTotalMinutes.toFixed(1)} mins.`
        );
      } else {
        logs.push(
          `[REROUTED] Trip ${trip.id} (Ambulance ${trip.ambulanceId}): Rerouted via [${combinedRoutePath.join(' -> ')}]. New ETA: ${newTotalMinutes.toFixed(1)} mins (${diff >= 0 ? `+${diff}` : diff}m diff).`
        );
      }
    }
  }

  if (logs.length === 0) {
    logs.push(`No active trips traverse segment ${startName} - ${endName}. Active mission routes unaffected.`);
  }

  return logs;
}


const normalizeStatus = (status: EmergencyStatusEnum) => status === EmergencyStatusEnum.PENDING
  ? 'PENDING'
  : status === EmergencyStatusEnum.COMPLETED
    ? 'COMPLETED'
    : status === EmergencyStatusEnum.CANCELLED
      ? 'CANCELLED'
      : status;

function mapTrip(trip: any, locations: Array<{ id: string; name: string }>) {
  const ids = asIdMap(locations);
  const completed = trip.status === TripStatusEnum.COMPLETED || trip.status === TripStatusEnum.CANCELLED;
  const pathToIncident = trip.pathToIncident.length > 0
    ? trip.pathToIncident
    : trip.routePath.slice(0, Math.max(1, trip.routePath.length - 1));
  const pathToHospital = trip.pathToHospital.length > 0
    ? trip.pathToHospital
    : trip.routePath.slice(-2);
  return {
    id: trip.id,
    requestId: trip.requestId,
    ambulanceId: trip.ambulanceId,
    hospitalId: trip.hospitalId,
    incidentLocationId: ids.byName.get(trip.pickupLocation) ?? trip.pickupLocation,
    hospitalLocationId: ids.byName.get(trip.destinationHospital) ?? trip.destinationHospital,
    pathToIncident,
    timeToIncidentMinutes: trip.timeToIncidentMinutes,
    pathToHospital,
    timeToHospitalMinutes: trip.timeToHospitalMinutes,
    totalMinutes: trip.timeToIncidentMinutes + trip.timeToHospitalMinutes || trip.estimatedDurationMinutes,
    completed,
    blocked: trip.blocked,
    startTime: trip.startTime.getTime(),
    endTime: trip.endTime?.getTime() ?? null,
    status: trip.status,
    reasoning: trip.reasoning ?? 'Route legs calculated using the current road network and shortest travel time.',
  };
}

async function selectDispatch(db: Prisma.TransactionClient, requestId?: string, userId?: string | null) {
  const requests = await db.emergency.findMany({
    where: requestId ? { id: requestId } : { status: EmergencyStatusEnum.PENDING },
    orderBy: { createdAt: 'asc' },
  });
  if (requestId && !requests[0]) throw new ApiError('Request not found', 404);
  if (requestId && requests[0].status !== EmergencyStatusEnum.PENDING) throw new ApiError('Request is no longer pending', 409);
  if (!requests.length) throw new ApiError('No pending requests to dispatch', 404);
  const priority: Record<string, number> = { CRITICAL: 3, SERIOUS: 2, MINOR: 1 };
  const candidates = requestId
    ? requests
    : requests.sort((left, right) =>
      priority[right.severity] - priority[left.severity] || left.createdAt.getTime() - right.createdAt.getTime()
    );

  const [roads, ambulances, hospitals] = await Promise.all([
    db.road.findMany(),
    db.ambulance.findMany({
      where: {
        isAvailable: true,
        status: AmbulanceStatusEnum.AVAILABLE,
        trips: {
          none: {
            status: { notIn: [TripStatusEnum.COMPLETED, TripStatusEnum.CANCELLED] },
          },
        },
      },
    }),
    db.hospital.findMany({ where: { availableBeds: { gt: 0 } } }),
  ]);
  const locations = await db.networkLocation.findMany();
  const ids = asIdMap(locations);

  if (requestId) {
    if (ambulances.length === 0) throw new ApiError('No available ambulances in network', 409);
    if (hospitals.length === 0) throw new ApiError('No hospitals with available bed capacity', 409);
    const supportingHospitals = hospitals.filter((h) => hospitalSupportsFacility(requests[0].requiredFacility, h.facilities));
    if (supportingHospitals.length === 0) {
      throw new ApiError(`No hospital with available bed capacity supports required department: ${requests[0].requiredFacility}`, 409);
    }
  }

  for (const request of candidates) {
    const ambulanceOptions = ambulances.map((ambulance) => ({
      ambulance,
      route: findShortestRoute(ambulance.currentLocation, request.pickupLocation, roads),
    })).filter((option) => option.route.reachable)
      .sort((left, right) => left.route.totalMinutes - right.route.totalMinutes);

    const hospitalOptions = hospitals.map((hospital) => ({
      hospital,
      route: findShortestRoute(request.pickupLocation, hospital.location, roads),
    })).filter((option) => {
      return hospitalSupportsFacility(request.requiredFacility, option.hospital.facilities) && option.route.reachable;
    }).sort((left, right) => left.route.totalMinutes - right.route.totalMinutes);

    if (!ambulanceOptions[0] || !hospitalOptions[0]) {
      if (requestId) {
        if (!ambulanceOptions[0]) throw new ApiError('No available ambulance has a reachable route to pickup location', 409);
        if (!hospitalOptions[0]) throw new ApiError('No suitable hospital with available beds has a reachable route from pickup location', 409);
      }
      continue;
    }

    const { ambulance, route: ambulanceRoute } = ambulanceOptions[0];
    const { hospital, route: hospitalRoute } = hospitalOptions[0];
    const pathToIncident = ambulanceRoute.path.map((name) => ids.byName.get(name) ?? name);
    const pathToHospital = hospitalRoute.path.map((name) => ids.byName.get(name) ?? name);

    const allTrips = await db.trip.findMany({ select: { id: true } });
    const maxNum = allTrips.reduce((max, t) => {
      const match = t.id.match(/^TRIP-(\d+)$/);
      return match ? Math.max(max, parseInt(match[1], 10)) : max;
    }, 1000);
    const tripId = `TRIP-${maxNum + 1}`;
    const totalMinutes = ambulanceRoute.totalMinutes + hospitalRoute.totalMinutes;

    const emergencyClaim = await db.emergency.updateMany({
      where: { id: request.id, status: EmergencyStatusEnum.PENDING },
      data: { status: EmergencyStatusEnum.DISPATCHED },
    });
    if (emergencyClaim.count !== 1) throw new ApiError('Request was dispatched by another operator; refresh and retry', 409);
    await db.emergencyStatusHistory.create({
      data: { emergencyId: request.id, status: EmergencyStatusEnum.DISPATCHED, changedBy: 'Dispatch desk' },
    });

    const ambulanceClaim = await db.ambulance.updateMany({
      where: { id: ambulance.id, status: AmbulanceStatusEnum.AVAILABLE, isAvailable: true },
      data: { status: AmbulanceStatusEnum.DISPATCHED, isAvailable: false },
    });
    if (ambulanceClaim.count !== 1) throw new ApiError('Ambulance was assigned by another operator; refresh and retry', 409);

    const hospitalClaim = await db.hospital.updateMany({
      where: { id: hospital.id, availableBeds: { gt: 0 } },
      data: { availableBeds: { decrement: 1 } },
    });
    if (hospitalClaim.count !== 1) throw new ApiError('Hospital bed is no longer available; refresh and retry', 409);

    const trip = await db.trip.create({
      data: {
        id: tripId,
        requestId: request.id,
        ambulanceId: ambulance.id,
        hospitalId: hospital.id,
        pickupLocation: request.pickupLocation,
        destinationHospital: hospital.location,
        status: TripStatusEnum.DISPATCHED,
        routePath: [...pathToIncident, ...pathToHospital.slice(1)],
        pathToIncident,
        timeToIncidentMinutes: ambulanceRoute.totalMinutes,
        pathToHospital,
        timeToHospitalMinutes: hospitalRoute.totalMinutes,
        blocked: false,
        reasoning: `Ambulance ${ambulance.id} selected at ${ambulanceRoute.totalMinutes.toFixed(1)} minutes; hospital ${hospital.id} selected at ${hospitalRoute.totalMinutes.toFixed(1)} minutes.`,
        estimatedDurationMinutes: Math.round(totalMinutes),
        distanceKm: [...pathToIncident, ...pathToHospital.slice(1)].reduce((distance, location, index, path) => {
          if (index === 0) return distance;
          const previous = ids.byId.get(path[index - 1]) ?? path[index - 1];
          const current = ids.byId.get(location) ?? location;
          const road = roads.find((candidate) =>
            candidate.startLocation === previous && candidate.endLocation === current
            || !candidate.isOneWay && candidate.startLocation === current && candidate.endLocation === previous
          );
          return distance + (road?.distanceKm ?? 0);
        }, 0),
      },
    });

    if (await checkTableExists('Notification')) await db.notification.create({
      data: {
        title: request.severity === EmergencySeverityEnum.CRITICAL ? 'Critical emergency dispatched' : 'Emergency dispatched',
        message: `Request ${request.id} assigned to ambulance ${ambulance.id} for hospital ${hospital.name}.`,
        type: request.severity === EmergencySeverityEnum.CRITICAL ? 'CRITICAL' : 'INFO',
      },
    });
    return trip;
  }

  throw new ApiError(
    requestId
      ? 'No available ambulance or suitable hospital with a reachable route for this request'
      : 'No pending request has an available ambulance, suitable hospital, and reachable route',
    409,
  );
}

const sendError = (res: any, error: unknown) => {
  if (error instanceof ApiError) return res.status(error.statusCode).json({ error: error.message });
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034') {
    return res.status(409).json({ error: 'Concurrent dispatch or trip update detected; refresh and retry' });
  }
  console.error('Persistent compatibility API error:', error);
  return res.status(500).json({ error: 'Database operation failed' });
};

router.get('/stats', async (_req, res) => {
  try {
    const [emergencies, ambulances, hospitals, trips, roads, locations] = await Promise.all([
      prisma.emergency.findMany(),
      prisma.ambulance.findMany(),
      prisma.hospital.findMany(),
      prisma.trip.findMany(),
      prisma.road.findMany(),
      ensureNetworkLocations(),
    ]);
    const pending = emergencies.filter((emergency) => emergency.status === EmergencyStatusEnum.PENDING);
    return res.json({
      pendingTotal: pending.length,
      pendingCritical: pending.filter((emergency) => emergency.severity === EmergencySeverityEnum.CRITICAL).length,
      pendingSerious: pending.filter((emergency) => emergency.severity === EmergencySeverityEnum.SERIOUS).length,
      pendingMinor: pending.filter((emergency) => emergency.severity === EmergencySeverityEnum.MINOR).length,
      availableAmbulances: ambulances.filter((ambulance) => ambulance.isAvailable).length,
      totalAmbulances: ambulances.length,
      availableBeds: hospitals.reduce((total, hospital) => total + hospital.availableBeds, 0),
      totalBeds: hospitals.reduce((total, hospital) => total + hospital.totalBeds, 0),
      activeTrips: trips.filter((trip) => trip.status !== TripStatusEnum.COMPLETED && trip.status !== TripStatusEnum.CANCELLED).length,
      closedRoads: roads.filter((road) => road.status !== RoadStatusEnum.OPEN).length,
      locationsCount: locations.length,
      roadsCount: roads.length,
      lastRecalculationEpoch: Date.now(),
    });
  } catch (error) {
    return sendError(res, error);
  }
});

router.get('/requests', async (_req, res) => {
  try {
    const locations = await ensureNetworkLocations();
    const ids = asIdMap(locations);
    const emergencies = await prisma.emergency.findMany({ include: { trips: true }, orderBy: { createdAt: 'desc' } });
    const priority: Record<string, number> = { CRITICAL: 3, SERIOUS: 2, MINOR: 1 };
    const requests = emergencies.map((emergency) => ({
      id: emergency.id,
      callerName: emergency.callerName,
      contactNumber: emergency.contactNumber,
      incidentLocationId: ids.byName.get(emergency.pickupLocation) ?? emergency.pickupLocation,
      severity: emergency.severity,
      requiredFacility: emergency.requiredFacility,
      description: emergency.emergencyType,
      createdAt: emergency.createdAt.getTime(),
      status: normalizeStatus(emergency.status),
      assignedAmbulanceId: emergency.trips.find((trip) => trip.status !== TripStatusEnum.COMPLETED && trip.status !== TripStatusEnum.CANCELLED)?.ambulanceId ?? null,
      assignedHospitalId: emergency.trips.find((trip) => trip.status !== TripStatusEnum.COMPLETED && trip.status !== TripStatusEnum.CANCELLED)?.hospitalId ?? null,
    })).sort((left, right) => priority[right.severity] - priority[left.severity] || left.createdAt - right.createdAt);
    return res.json(requests);
  } catch (error) {
    return sendError(res, error);
  }
});

router.post('/requests', async (req, res) => {
  try {
    const { callerName, contactNumber, incidentLocationId, severity, requiredFacility, description } = req.body ?? {};
    const caller = typeof callerName === 'string' ? callerName.trim() : '';
    const phone = typeof contactNumber === 'string' ? contactNumber.trim() : '';
    const facility = typeof requiredFacility === 'string' ? requiredFacility.trim().toUpperCase() : '';
    const emergencyDescription = typeof description === 'string' ? description.trim() : '';
    if (caller.length < 2 || caller.length > 100 || phone.length < 5 || phone.length > 40
      || typeof incidentLocationId !== 'string' || !incidentLocationId
      || !Object.values(EmergencySeverityEnum).includes(severity)
      || !['GENERAL', 'TRAUMA', 'CARDIAC', 'NEURO', 'PEDIATRICS'].includes(facility)
      || emergencyDescription.length > 500) {
      throw new ApiError('Missing required request fields');
    }
    const locations = await ensureNetworkLocations();
    const location = locations.find((entry) => entry.id === incidentLocationId);
    if (!location) throw new ApiError('Unknown incident location', 400);
    const created = await prisma.$transaction(async (db) => {
      const allReqs = await db.emergency.findMany({ select: { id: true } });
      const maxNum = allReqs.reduce((max, r) => {
        const match = r.id.match(/^REQ-\d+-(\d+)$/);
        return match ? Math.max(max, parseInt(match[1], 10)) : max;
      }, 0);
      const year = new Date().getFullYear();
      const reqId = `REQ-${year}-${String(maxNum + 1).padStart(3, '0')}`;
      const emergency = await db.emergency.create({
        data: {
          id: reqId,
          callerName: caller,
          contactNumber: phone,
          pickupLocation: location.name,
          emergencyType: emergencyDescription || 'Emergency medical call',
          requiredFacility: facility,
          severity,
          statusHistory: { create: { status: EmergencyStatusEnum.PENDING, changedBy: 'Dispatch desk' } },
        },
      });
      if (await checkTableExists('Notification')) await db.notification.create({
        data: {
          title: severity === EmergencySeverityEnum.CRITICAL ? 'Critical emergency request' : 'New emergency request',
          message: `Request ${emergency.id} logged at ${location.name}; required department: ${facility}.`,
          type: severity === EmergencySeverityEnum.CRITICAL ? 'CRITICAL' : severity === EmergencySeverityEnum.SERIOUS ? 'WARNING' : 'INFO',
        },
      });
      return emergency;
    });
    return res.status(201).json({
      id: created.id,
      callerName: created.callerName,
      contactNumber: created.contactNumber,
      incidentLocationId: location.id,
      severity: created.severity,
      requiredFacility: created.requiredFacility,
      description: created.emergencyType,
      createdAt: created.createdAt.getTime(),
      status: 'PENDING',
    });
  } catch (error) {
    return sendError(res, error);
  }
});

router.get('/ambulances', async (_req, res) => {
  try {
    const locations = await ensureNetworkLocations();
    const ids = asIdMap(locations);
    const ambulances = await prisma.ambulance.findMany({ include: { trips: true }, orderBy: { registrationNumber: 'asc' } });
    return res.json(ambulances.map((ambulance) => {
      const activeTrip = ambulance.trips.find((trip) => trip.status !== TripStatusEnum.COMPLETED && trip.status !== TripStatusEnum.CANCELLED);
      return {
        id: ambulance.id,
        registrationNumber: ambulance.registrationNumber,
        driverName: ambulance.driverName,
        driverContact: ambulance.driverContact,
        equipmentType: ambulance.equipmentType,
        isAvailable: ambulance.isAvailable,
        currentLocation: ambulance.currentLocation,
        currentLocationId: ids.byName.get(ambulance.currentLocation) ?? ambulance.currentLocation,
        assignedHospitalId: activeTrip?.hospitalId ?? null,
        status: ambulance.status === AmbulanceStatusEnum.BUSY ? 'TRANSPORTING' : ambulance.status,
        totalTripsCompleted: ambulance.trips.filter((trip) => trip.status === TripStatusEnum.COMPLETED).length,
      };
    }));
  } catch (error) {
    return sendError(res, error);
  }
});

router.get('/ambulances/:id', async (req, res) => {
  try {
    const locations = await ensureNetworkLocations();
    const ids = asIdMap(locations);
    const ambulance = await prisma.ambulance.findUnique({
      where: { id: req.params.id },
      include: {
        locationHistory: { orderBy: { timestamp: 'desc' }, take: 20 },
        trips: { orderBy: { createdAt: 'desc' }, take: 10 },
      },
    });
    if (!ambulance) throw new ApiError('Ambulance not found', 404);
    const activeTrip = ambulance.trips.find((t) => t.status !== TripStatusEnum.COMPLETED && t.status !== TripStatusEnum.CANCELLED);
    return res.json({
      id: ambulance.id,
      registrationNumber: ambulance.registrationNumber,
      driverName: ambulance.driverName,
      driverContact: ambulance.driverContact,
      equipmentType: ambulance.equipmentType,
      isAvailable: ambulance.isAvailable,
      currentLocation: ambulance.currentLocation,
      currentLocationId: ids.byName.get(ambulance.currentLocation) ?? ambulance.currentLocation,
      assignedHospitalId: activeTrip?.hospitalId ?? null,
      status: ambulance.status === AmbulanceStatusEnum.BUSY ? 'TRANSPORTING' : ambulance.status,
      totalTripsCompleted: ambulance.trips.filter((t) => t.status === TripStatusEnum.COMPLETED).length,
      locationHistory: ambulance.locationHistory,
      trips: ambulance.trips.map((t) => mapTrip(t, locations)),
    });
  } catch (error) {
    return sendError(res, error);
  }
});

router.post('/ambulances', requireRole(['ADMIN', 'DISPATCHER']) as any, async (req, res) => {
  try {
    const { registrationNumber, driverName, driverContact, currentLocation, equipmentType, id } = req.body ?? {};

    const reg = typeof registrationNumber === 'string' ? registrationNumber.trim().toUpperCase() : '';
    if (!reg || reg.length < 3 || reg.length > 50) {
      throw new ApiError('Registration number is required (3-50 chars)', 400);
    }
    const existingReg = await prisma.ambulance.findUnique({ where: { registrationNumber: reg } });
    if (existingReg) {
      throw new ApiError(`Ambulance registration "${reg}" already exists (ID: ${existingReg.id})`, 409);
    }

    const driver = typeof driverName === 'string' ? driverName.trim() : '';
    if (!driver || driver.length < 2 || driver.length > 100) {
      throw new ApiError('Driver name is required (2-100 chars)', 400);
    }

    const contact = typeof driverContact === 'string' ? driverContact.trim() : '';
    if (!contact || contact.length < 5 || contact.length > 30) {
      throw new ApiError('Driver contact number is required (5-30 chars)', 400);
    }

    const rawLoc = typeof currentLocation === 'string' ? currentLocation.trim() : '';
    if (!rawLoc) {
      throw new ApiError('Current location is required', 400);
    }
    const locations = await ensureNetworkLocations();
    const ids = asIdMap(locations);
    const resolvedLocationName = ids.byId.get(rawLoc) ?? (ids.byName.has(rawLoc) ? rawLoc : null);
    if (!resolvedLocationName) {
      throw new ApiError(`Unknown network location: "${rawLoc}"`, 400);
    }

    let ambId = id && typeof id === 'string' ? id.trim().toUpperCase() : null;
    if (ambId) {
      const existingId = await prisma.ambulance.findUnique({ where: { id: ambId } });
      if (existingId) throw new ApiError(`Ambulance ID "${ambId}" already exists`, 409);
    } else {
      const allAmbs = await prisma.ambulance.findMany({ select: { id: true } });
      const maxNum = allAmbs.reduce((max, a) => {
        const match = a.id.match(/^A(\d+)$/i);
        return match ? Math.max(max, parseInt(match[1], 10)) : max;
      }, 0);
      ambId = `A${String(maxNum + 1).padStart(3, '0')}`;
    }

    const eqType = typeof equipmentType === 'string' && equipmentType.trim() ? equipmentType.trim() : 'ALS';

    const created = await prisma.$transaction(async (db) => {
      const amb = await db.ambulance.create({
        data: {
          id: ambId!,
          registrationNumber: reg,
          driverName: driver,
          driverContact: contact,
          currentLocation: resolvedLocationName,
          equipmentType: eqType,
          status: AmbulanceStatusEnum.AVAILABLE,
          isAvailable: true,
        },
      });

      await db.ambulanceLocationHistory.create({
        data: {
          ambulanceId: amb.id,
          location: resolvedLocationName,
        },
      });

      if (await checkTableExists('Notification')) await db.notification.create({
        data: {
          title: 'Ambulance Added to Fleet',
          message: `Unit ${amb.id} (${amb.registrationNumber}) is in service at ${amb.currentLocation}.`,
          type: 'SUCCESS',
        },
      });

      return amb;
    });

    return res.status(201).json({
      id: created.id,
      registrationNumber: created.registrationNumber,
      driverName: created.driverName,
      driverContact: created.driverContact,
      equipmentType: created.equipmentType,
      isAvailable: created.isAvailable,
      currentLocation: created.currentLocation,
      currentLocationId: ids.byName.get(created.currentLocation) ?? created.currentLocation,
      assignedHospitalId: null,
      status: created.status,
      totalTripsCompleted: 0,
    });
  } catch (error) {
    return sendError(res, error);
  }
});

router.patch('/ambulances/:id/status', requireRole(['ADMIN', 'DISPATCHER', 'AMBULANCE_STAFF']) as any, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, currentLocation } = req.body ?? {};

    const ambulance = await prisma.ambulance.findUnique({
      where: { id },
      include: {
        trips: {
          where: { status: { notIn: [TripStatusEnum.COMPLETED, TripStatusEnum.CANCELLED] } },
        },
      },
    });
    if (!ambulance) throw new ApiError('Ambulance not found', 404);

    let mappedStatus: AmbulanceStatusEnum = ambulance.status;
    if (status) {
      const s = String(status).toUpperCase().replace(/[\s-]+/g, '_');
      if (s === 'AVAILABLE') mappedStatus = AmbulanceStatusEnum.AVAILABLE;
      else if (s === 'DISPATCHED') mappedStatus = AmbulanceStatusEnum.DISPATCHED;
      else if (s === 'EN_ROUTE' || s === 'ENROUTE') mappedStatus = AmbulanceStatusEnum.EN_ROUTE;
      else if (s === 'BUSY' || s === 'TRANSPORTING') mappedStatus = AmbulanceStatusEnum.BUSY;
      else if (s === 'MAINTENANCE') mappedStatus = AmbulanceStatusEnum.MAINTENANCE;
      else if (s === 'OFF_DUTY' || s === 'OFFDUTY') mappedStatus = AmbulanceStatusEnum.OFF_DUTY;
      else {
        throw new ApiError(`Invalid ambulance status: "${status}". Allowed: AVAILABLE, DISPATCHED, EN_ROUTE, BUSY, MAINTENANCE, OFF_DUTY`, 400);
      }
    }

    const activeTrip = ambulance.trips[0];
    if (activeTrip && ([AmbulanceStatusEnum.AVAILABLE, AmbulanceStatusEnum.MAINTENANCE, AmbulanceStatusEnum.OFF_DUTY] as AmbulanceStatusEnum[]).includes(mappedStatus)) {
      throw new ApiError(
        `Cannot set ambulance ${id} to ${mappedStatus}: unit is actively assigned to trip ${activeTrip.id}. Complete or cancel the trip first.`,
        409
      );
    }

    let newLocationName = ambulance.currentLocation;
    const locations = await ensureNetworkLocations();
    const ids = asIdMap(locations);
    if (currentLocation && typeof currentLocation === 'string' && currentLocation.trim()) {
      const rawLoc = currentLocation.trim();
      const resolved = ids.byId.get(rawLoc) ?? (ids.byName.has(rawLoc) ? rawLoc : null);
      if (!resolved) {
        throw new ApiError(`Unknown network location: "${rawLoc}"`, 400);
      }
      newLocationName = resolved;
    }

    const isNowAvailable = mappedStatus === AmbulanceStatusEnum.AVAILABLE;

    const updated = await prisma.$transaction(async (db) => {
      const amb = await db.ambulance.update({
        where: { id },
        data: {
          status: mappedStatus,
          isAvailable: isNowAvailable,
          currentLocation: newLocationName,
        },
      });

      if (newLocationName !== ambulance.currentLocation || currentLocation) {
        await db.ambulanceLocationHistory.create({
          data: {
            ambulanceId: id,
            location: newLocationName,
          },
        });
      }

      if (mappedStatus === AmbulanceStatusEnum.MAINTENANCE) {
        if (await checkTableExists('Notification')) await db.notification.create({
          data: {
            title: 'Ambulance Out for Maintenance',
            message: `Unit ${amb.id} (${amb.registrationNumber}) placed in maintenance at ${amb.currentLocation}.`,
            type: 'WARNING',
          },
        });
      } else if (mappedStatus === AmbulanceStatusEnum.AVAILABLE && ambulance.status !== AmbulanceStatusEnum.AVAILABLE) {
        if (await checkTableExists('Notification')) await db.notification.create({
          data: {
            title: 'Ambulance Back in Service',
            message: `Unit ${amb.id} (${amb.registrationNumber}) is now available at ${amb.currentLocation}.`,
            type: 'SUCCESS',
          },
        });
      }

      return amb;
    });

    const activeTripAfter = await prisma.trip.findFirst({
      where: { ambulanceId: id, status: { notIn: [TripStatusEnum.COMPLETED, TripStatusEnum.CANCELLED] } },
    });
    const completedCount = await prisma.trip.count({
      where: { ambulanceId: id, status: TripStatusEnum.COMPLETED },
    });

    return res.json({
      id: updated.id,
      registrationNumber: updated.registrationNumber,
      driverName: updated.driverName,
      driverContact: updated.driverContact,
      equipmentType: updated.equipmentType,
      isAvailable: updated.isAvailable,
      currentLocation: updated.currentLocation,
      currentLocationId: ids.byName.get(updated.currentLocation) ?? updated.currentLocation,
      assignedHospitalId: activeTripAfter?.hospitalId ?? null,
      status: updated.status === AmbulanceStatusEnum.BUSY ? 'TRANSPORTING' : updated.status,
      totalTripsCompleted: completedCount,
    });
  } catch (error) {
    return sendError(res, error);
  }
});

router.patch('/ambulances/:id', requireRole(['ADMIN', 'DISPATCHER']) as any, async (req, res) => {
  try {
    const { id } = req.params;
    const { driverName, driverContact, equipmentType, currentLocation } = req.body ?? {};

    const ambulance = await prisma.ambulance.findUnique({ where: { id } });
    if (!ambulance) throw new ApiError('Ambulance not found', 404);

    const locations = await ensureNetworkLocations();
    const ids = asIdMap(locations);

    const dataToUpdate: Prisma.AmbulanceUpdateInput = {};
    if (driverName !== undefined) {
      const name = String(driverName).trim();
      if (name.length < 2 || name.length > 100) throw new ApiError('Driver name must be 2-100 characters', 400);
      dataToUpdate.driverName = name;
    }
    if (driverContact !== undefined) {
      const contact = String(driverContact).trim();
      if (contact.length < 5 || contact.length > 30) throw new ApiError('Driver contact must be 5-30 characters', 400);
      dataToUpdate.driverContact = contact;
    }
    if (equipmentType !== undefined) {
      dataToUpdate.equipmentType = String(equipmentType).trim();
    }
    let locationChanged = false;
    let resolvedLoc = ambulance.currentLocation;
    if (currentLocation !== undefined) {
      const rawLoc = String(currentLocation).trim();
      const resolved = ids.byId.get(rawLoc) ?? (ids.byName.has(rawLoc) ? rawLoc : null);
      if (!resolved) throw new ApiError(`Unknown network location: "${rawLoc}"`, 400);
      dataToUpdate.currentLocation = resolved;
      resolvedLoc = resolved;
      locationChanged = (resolved !== ambulance.currentLocation);
    }

    const updated = await prisma.$transaction(async (db) => {
      const amb = await db.ambulance.update({
        where: { id },
        data: dataToUpdate,
      });

      if (locationChanged) {
        await db.ambulanceLocationHistory.create({
          data: {
            ambulanceId: id,
            location: resolvedLoc,
          },
        });
      }

      return amb;
    });

    return res.json({
      id: updated.id,
      registrationNumber: updated.registrationNumber,
      driverName: updated.driverName,
      driverContact: updated.driverContact,
      equipmentType: updated.equipmentType,
      isAvailable: updated.isAvailable,
      currentLocation: updated.currentLocation,
      currentLocationId: ids.byName.get(updated.currentLocation) ?? updated.currentLocation,
      status: updated.status,
    });
  } catch (error) {
    return sendError(res, error);
  }
});

router.get('/hospitals', async (_req, res) => {
  try {
    const locations = await ensureNetworkLocations();
    const ids = asIdMap(locations);
    const hospitals = await prisma.hospital.findMany({ orderBy: { name: 'asc' } });
    return res.json(hospitals.map((hospital) => ({
      id: hospital.id,
      name: hospital.name,
      locationId: ids.byName.get(hospital.location) ?? hospital.location,
      location: hospital.location,
      address: hospital.address,
      contactNumber: hospital.contactNumber,
      type: hospital.type,
      status: hospital.status,
      totalBeds: hospital.totalBeds,
      availableBeds: hospital.availableBeds,
      capabilities: hospital.facilities.map(facilityKey),
      facilities: hospital.facilities,
    })));
  } catch (error) {
    return sendError(res, error);
  }
});

router.get('/hospitals/:id', async (req, res) => {
  try {
    const locations = await ensureNetworkLocations();
    const ids = asIdMap(locations);
    const hospital = await prisma.hospital.findUnique({
      where: { id: req.params.id },
      include: {
        trips: { orderBy: { createdAt: 'desc' }, take: 10 },
      },
    });
    if (!hospital) throw new ApiError('Hospital not found', 404);
    return res.json({
      id: hospital.id,
      name: hospital.name,
      locationId: ids.byName.get(hospital.location) ?? hospital.location,
      location: hospital.location,
      address: hospital.address,
      contactNumber: hospital.contactNumber,
      type: hospital.type,
      status: hospital.status,
      totalBeds: hospital.totalBeds,
      availableBeds: hospital.availableBeds,
      capabilities: hospital.facilities.map(facilityKey),
      facilities: hospital.facilities,
      trips: hospital.trips.map((t) => mapTrip(t, locations)),
    });
  } catch (error) {
    return sendError(res, error);
  }
});

router.post('/hospitals', requireRole(['ADMIN', 'DISPATCHER']) as any, async (req, res) => {
  try {
    const { name, address, location, contactNumber, type, totalBeds, availableBeds, facilities, id } = req.body ?? {};

    const hospName = typeof name === 'string' ? name.trim() : '';
    if (!hospName || hospName.length < 3 || hospName.length > 100) {
      throw new ApiError('Hospital name is required (3-100 chars)', 400);
    }
    const existingName = await prisma.hospital.findFirst({
      where: { name: { equals: hospName, mode: 'insensitive' } },
    });
    if (existingName) {
      throw new ApiError(`A hospital named "${hospName}" already exists (ID: ${existingName.id})`, 409);
    }

    const addr = typeof address === 'string' ? address.trim() : '';
    if (!addr || addr.length < 3 || addr.length > 200) {
      throw new ApiError('Hospital address is required (3-200 chars)', 400);
    }

    const phone = typeof contactNumber === 'string' ? contactNumber.trim() : '';
    if (!phone || phone.length < 5 || phone.length > 30) {
      throw new ApiError('Contact number is required (5-30 chars)', 400);
    }

    const rawLoc = typeof location === 'string' ? location.trim() : '';
    if (!rawLoc) throw new ApiError('Hospital location is required', 400);
    const locations = await ensureNetworkLocations();
    const ids = asIdMap(locations);
    const resolvedLocationName = ids.byId.get(rawLoc) ?? (ids.byName.has(rawLoc) ? rawLoc : null);
    if (!resolvedLocationName) {
      throw new ApiError(`Unknown network location: "${rawLoc}"`, 400);
    }

    const total = Number(totalBeds);
    if (!Number.isInteger(total) || total < 1) {
      throw new ApiError('Total beds must be an integer of at least 1', 400);
    }
    const avail = availableBeds !== undefined ? Number(availableBeds) : Math.min(total, 20);
    if (!Number.isInteger(avail) || avail < 0) {
      throw new ApiError('Available beds must be a non-negative integer', 400);
    }
    if (avail > total) {
      throw new ApiError(`Available beds (${avail}) cannot exceed total beds (${total})`, 400);
    }

    let hospId = id && typeof id === 'string' ? id.trim().toUpperCase() : null;
    if (hospId) {
      const existingId = await prisma.hospital.findUnique({ where: { id: hospId } });
      if (existingId) throw new ApiError(`Hospital ID "${hospId}" already exists`, 409);
    } else {
      const allHosps = await prisma.hospital.findMany({ select: { id: true } });
      const maxNum = allHosps.reduce((max, h) => {
        const match = h.id.match(/^H(\d+)$/i);
        return match ? Math.max(max, parseInt(match[1], 10)) : max;
      }, 0);
      hospId = `H${String(maxNum + 1).padStart(3, '0')}`;
    }

    const facilityList = Array.isArray(facilities) && facilities.length > 0
      ? facilities.map((f: any) => String(f).trim().toUpperCase())
      : ['GENERAL'];

    const created = await prisma.$transaction(async (db) => {
      await db.networkLocation.updateMany({
        where: { name: resolvedLocationName, category: { not: 'Hospital' } },
        data: { category: 'Hospital' },
      });

      const hosp = await db.hospital.create({
        data: {
          id: hospId!,
          name: hospName,
          address: addr,
          location: resolvedLocationName,
          contactNumber: phone,
          type: typeof type === 'string' && type.trim() ? type.trim() : 'General Emergency',
          totalBeds: total,
          availableBeds: avail,
          status: HospitalStatusEnum.NORMAL,
          facilities: facilityList,
        },
      });

      if (await checkTableExists('Notification')) await db.notification.create({
        data: {
          title: 'Hospital Added',
          message: `${hosp.name} registered at node ${ids.byName.get(resolvedLocationName) ?? resolvedLocationName} with ${hosp.availableBeds} beds available.`,
          type: 'SUCCESS',
        },
      });

      return hosp;
    });

    return res.status(201).json({
      id: created.id,
      name: created.name,
      locationId: ids.byName.get(created.location) ?? created.location,
      totalBeds: created.totalBeds,
      availableBeds: created.availableBeds,
      capabilities: created.facilities.map(facilityKey),
      address: created.address,
      contactNumber: created.contactNumber,
      type: created.type,
      status: created.status,
    });
  } catch (error) {
    return sendError(res, error);
  }
});

router.patch('/hospitals/:id/capacity', requireRole(['ADMIN', 'DISPATCHER']) as any, async (req, res) => {
  try {
    const { id } = req.params;
    const { availableBeds, totalBeds, status } = req.body ?? {};

    const current = await prisma.hospital.findUnique({ where: { id } });
    if (!current) throw new ApiError('Hospital not found', 404);

    const nextTotal = totalBeds !== undefined ? Number(totalBeds) : current.totalBeds;
    const nextAvailable = availableBeds !== undefined ? Number(availableBeds) : current.availableBeds;

    if (!Number.isInteger(nextTotal) || nextTotal < 1) {
      throw new ApiError('Total beds must be an integer of at least 1', 400);
    }
    if (!Number.isInteger(nextAvailable) || nextAvailable < 0) {
      throw new ApiError('Available beds must be a non-negative integer', 400);
    }
    if (nextAvailable > nextTotal) {
      throw new ApiError(`Available beds (${nextAvailable}) cannot exceed total beds (${nextTotal})`, 400);
    }

    let nextStatus: HospitalStatusEnum = current.status;
    if (status) {
      const s = String(status).toUpperCase();
      if (s.includes('CRITICAL')) nextStatus = HospitalStatusEnum.CRITICAL;
      else if (s.includes('HIGH') || s.includes('LOAD')) nextStatus = HospitalStatusEnum.HIGH_LOAD;
      else if (s.includes('NORMAL')) nextStatus = HospitalStatusEnum.NORMAL;
    } else {
      if (nextAvailable === 0) nextStatus = HospitalStatusEnum.CRITICAL;
      else if (nextAvailable <= Math.max(1, Math.floor(nextTotal * 0.1))) nextStatus = HospitalStatusEnum.HIGH_LOAD;
      else nextStatus = HospitalStatusEnum.NORMAL;
    }

    const hospital = await prisma.$transaction(async (db) => {
      const updated = await db.hospital.update({
        where: { id: current.id },
        data: {
          availableBeds: nextAvailable,
          totalBeds: nextTotal,
          status: nextStatus,
        },
      });

      if (await checkTableExists('Notification')) await db.notification.create({
        data: {
          title: 'Hospital Bed Capacity Updated',
          message: `${updated.name} now reports ${updated.availableBeds}/${updated.totalBeds} available beds (${updated.status}).`,
          type: updated.availableBeds === 0 ? 'WARNING' : 'INFO',
        },
      });

      return updated;
    });

    const locations = await ensureNetworkLocations();
    const ids = asIdMap(locations);

    return res.json({
      id: hospital.id,
      name: hospital.name,
      locationId: ids.byName.get(hospital.location) ?? hospital.location,
      totalBeds: hospital.totalBeds,
      availableBeds: hospital.availableBeds,
      capabilities: hospital.facilities.map(facilityKey),
      status: hospital.status,
    });
  } catch (error) {
    return sendError(res, error);
  }
});

router.patch('/hospitals/:id', requireRole(['ADMIN', 'DISPATCHER']) as any, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, address, contactNumber, type, facilities } = req.body ?? {};

    const hospital = await prisma.hospital.findUnique({ where: { id } });
    if (!hospital) throw new ApiError('Hospital not found', 404);

    const dataToUpdate: Prisma.HospitalUpdateInput = {};
    if (name !== undefined) {
      const trimmed = String(name).trim();
      if (trimmed.length < 3 || trimmed.length > 100) throw new ApiError('Hospital name must be 3-100 characters', 400);
      dataToUpdate.name = trimmed;
    }
    if (address !== undefined) {
      const trimmed = String(address).trim();
      if (trimmed.length < 3 || trimmed.length > 200) throw new ApiError('Hospital address must be 3-200 characters', 400);
      dataToUpdate.address = trimmed;
    }
    if (contactNumber !== undefined) {
      const trimmed = String(contactNumber).trim();
      if (trimmed.length < 5 || trimmed.length > 30) throw new ApiError('Contact number must be 5-30 characters', 400);
      dataToUpdate.contactNumber = trimmed;
    }
    if (type !== undefined) {
      dataToUpdate.type = String(type).trim();
    }
    if (facilities !== undefined && Array.isArray(facilities)) {
      dataToUpdate.facilities = facilities.map((f: any) => String(f).trim().toUpperCase());
    }

    const updated = await prisma.$transaction(async (db) => {
      const hosp = await db.hospital.update({
        where: { id },
        data: dataToUpdate,
      });

      return hosp;
    });

    const locations = await ensureNetworkLocations();
    const ids = asIdMap(locations);

    return res.json({
      id: updated.id,
      name: updated.name,
      locationId: ids.byName.get(updated.location) ?? updated.location,
      totalBeds: updated.totalBeds,
      availableBeds: updated.availableBeds,
      capabilities: updated.facilities.map(facilityKey),
      status: updated.status,
    });
  } catch (error) {
    return sendError(res, error);
  }
});

router.get('/network', async (_req, res) => {
  try {
    const [locations, roads] = await Promise.all([ensureNetworkLocations(), prisma.road.findMany({ orderBy: { id: 'asc' } })]);
    const ids = asIdMap(locations);
    return res.json({
      locations,
      roads: roads.map((road) => ({
        id: road.id,
        sourceId: ids.byName.get(road.startLocation) ?? road.startLocation,
        destinationId: ids.byName.get(road.endLocation) ?? road.endLocation,
        baseMinutes: road.baseTravelTimeMinutes,
        currentMinutes: roadMinutes(road),
        currentTraffic: road.currentTraffic,
        closed: road.status !== RoadStatusEnum.OPEN,
        closureReason: road.closureReason,
      })),
    });
  } catch (error) {
    return sendError(res, error);
  }
});

router.post('/network/locations', requireRole(['ADMIN', 'DISPATCHER']) as any, async (req, res) => {
  try {
    const { name, category, xCoordinatesPercent, yCoordinatesPercent } = req.body ?? {};
    if (!name || typeof name !== 'string' || !name.trim()) {
      throw new ApiError('Location name is required', 400);
    }
    const trimmedName = name.trim();

    const existingName = await prisma.networkLocation.findFirst({
      where: { name: { equals: trimmedName, mode: 'insensitive' } },
    });
    if (existingName) {
      throw new ApiError(`A location named "${trimmedName}" already exists (ID: ${existingName.id})`, 409);
    }

    let id = req.body?.id ? String(req.body.id).trim().toUpperCase() : null;
    if (id) {
      const existingId = await prisma.networkLocation.findUnique({ where: { id } });
      if (existingId) {
        throw new ApiError(`Location ID "${id}" is already in use`, 409);
      }
    } else {
      const allLocs = await prisma.networkLocation.findMany({ select: { id: true } });
      const maxNum = allLocs.reduce((max, l) => {
        const num = Number(l.id.replace(/^LOC-/, ''));
        return Number.isFinite(num) ? Math.max(max, num) : max;
      }, 0);
      id = `LOC-${String(maxNum + 1).padStart(2, '0')}`;
    }

    const x = Number(xCoordinatesPercent ?? 50);
    const y = Number(yCoordinatesPercent ?? 50);
    if (!Number.isFinite(x) || x < 0 || x > 100 || !Number.isFinite(y) || y < 0 || y > 100) {
      throw new ApiError('Coordinates must be percentages between 0 and 100', 400);
    }

    const validCategory = category && typeof category === 'string' && category.trim()
      ? category.trim()
      : 'Landmark';

    const location = await prisma.$transaction(async (db) => {
      const created = await db.networkLocation.create({
        data: {
          id: id!,
          name: trimmedName,
          category: validCategory,
          xCoordinatesPercent: x,
          yCoordinatesPercent: y,
        },
      });

      if (await checkTableExists('Notification')) await db.notification.create({
        data: {
          title: 'New Location Added',
          message: `Network location ${created.id} (${created.name}) added to town map.`,
          type: 'INFO',
        },
      });

      return created;
    });

    return res.status(201).json(location);
  } catch (error) {
    return sendError(res, error);
  }
});

router.patch('/network/locations/:id', requireRole(['ADMIN', 'DISPATCHER']) as any, async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await prisma.networkLocation.findUnique({ where: { id } });
    if (!existing) throw new ApiError(`Unknown location ${id}`, 404);

    const { name, category, xCoordinatesPercent, yCoordinatesPercent } = req.body ?? {};
    const updates: Prisma.NetworkLocationUpdateInput = {};

    let nameChanged = false;
    const oldName = existing.name;
    let newName = oldName;

    if (name !== undefined) {
      if (typeof name !== 'string' || !name.trim()) throw new ApiError('Location name cannot be empty', 400);
      newName = name.trim();
      if (newName.toLowerCase() !== oldName.toLowerCase()) {
        const duplicate = await prisma.networkLocation.findFirst({
          where: { name: { equals: newName, mode: 'insensitive' }, id: { not: id } },
        });
        if (duplicate) throw new ApiError(`A location named "${newName}" already exists`, 409);
        updates.name = newName;
        nameChanged = true;
      }
    }

    if (category !== undefined) {
      if (typeof category !== 'string' || !category.trim()) throw new ApiError('Category cannot be empty', 400);
      updates.category = category.trim();
    }

    if (xCoordinatesPercent !== undefined) {
      const x = Number(xCoordinatesPercent);
      if (!Number.isFinite(x) || x < 0 || x > 100) throw new ApiError('X coordinate must be between 0 and 100', 400);
      updates.xCoordinatesPercent = x;
    }

    if (yCoordinatesPercent !== undefined) {
      const y = Number(yCoordinatesPercent);
      if (!Number.isFinite(y) || y < 0 || y > 100) throw new ApiError('Y coordinate must be between 0 and 100', 400);
      updates.yCoordinatesPercent = y;
    }

    const updated = await prisma.$transaction(async (db) => {
      if (nameChanged) {
        await db.road.updateMany({ where: { startLocation: oldName }, data: { startLocation: newName } });
        await db.road.updateMany({ where: { endLocation: oldName }, data: { endLocation: newName } });
        await db.hospital.updateMany({ where: { location: oldName }, data: { location: newName } });
        await db.ambulance.updateMany({ where: { currentLocation: oldName }, data: { currentLocation: newName } });
        await db.emergency.updateMany({ where: { pickupLocation: oldName }, data: { pickupLocation: newName } });
        await db.trip.updateMany({ where: { pickupLocation: oldName }, data: { pickupLocation: newName } });
        await db.trip.updateMany({ where: { destinationHospital: oldName }, data: { destinationHospital: newName } });
      }

      const loc = await db.networkLocation.update({
        where: { id },
        data: updates,
      });

      return loc;
    });

    return res.json(updated);
  } catch (error) {
    return sendError(res, error);
  }
});

router.post(['/roads', '/network/roads'], requireRole(['ADMIN', 'DISPATCHER']) as any, async (req, res) => {
  try {
    const { startLocation, endLocation, distanceKm, baseTravelTimeMinutes, speedLimitKmh, currentTraffic } = req.body ?? {};

    if (!startLocation || !endLocation) {
      throw new ApiError('Both startLocation and endLocation are required', 400);
    }

    const locations = await ensureNetworkLocations();
    const ids = asIdMap(locations);

    const resolvedStart = ids.byId.get(String(startLocation)) ?? (ids.byName.has(String(startLocation)) ? String(startLocation) : null);
    const resolvedEnd = ids.byId.get(String(endLocation)) ?? (ids.byName.has(String(endLocation)) ? String(endLocation) : null);

    if (!resolvedStart) throw new ApiError(`Unknown start location reference "${startLocation}"`, 400);
    if (!resolvedEnd) throw new ApiError(`Unknown end location reference "${endLocation}"`, 400);
    if (resolvedStart === resolvedEnd) throw new ApiError('Start and end locations must be different', 400);

    const dist = Number(distanceKm);
    if (!Number.isFinite(dist) || dist <= 0) throw new ApiError('Distance (km) must be a positive number', 400);

    const minutes = Number(baseTravelTimeMinutes);
    if (!Number.isFinite(minutes) || minutes <= 0) throw new ApiError('Base travel time (minutes) must be a positive number', 400);

    const speed = speedLimitKmh ? Number(speedLimitKmh) : 60;
    if (!Number.isFinite(speed) || speed <= 0) throw new ApiError('Speed limit must be a positive number', 400);

    const traffic = currentTraffic && Object.values(TrafficConditionEnum).includes(currentTraffic)
      ? (currentTraffic as TrafficConditionEnum)
      : TrafficConditionEnum.LOW;

    const existingRoad = await prisma.road.findFirst({
      where: {
        OR: [
          { startLocation: resolvedStart, endLocation: resolvedEnd },
          { startLocation: resolvedEnd, endLocation: resolvedStart },
        ],
      },
    });
    if (existingRoad) {
      throw new ApiError(`A road connecting "${resolvedStart}" and "${resolvedEnd}" already exists (ID: ${existingRoad.id})`, 409);
    }

    const road = await prisma.$transaction(async (db) => {
      const created = await db.road.create({
        data: {
          startLocation: resolvedStart,
          endLocation: resolvedEnd,
          distanceKm: dist,
          baseTravelTimeMinutes: minutes,
          speedLimitKmh: speed,
          currentTraffic: traffic,
          status: RoadStatusEnum.OPEN,
          isOneWay: false,
          closureReason: '',
        },
      });

      if (await checkTableExists('Notification')) await db.notification.create({
        data: {
          title: 'Road Segment Added',
          message: `New road added between ${resolvedStart} and ${resolvedEnd} (${dist} km, ${minutes} min base).`,
          type: 'INFO',
        },
      });

      return created;
    });

    const startId = ids.byName.get(resolvedStart) ?? resolvedStart;
    const endId = ids.byName.get(resolvedEnd) ?? resolvedEnd;

    return res.status(201).json({
      id: road.id,
      sourceId: startId,
      destinationId: endId,
      startLocation: road.startLocation,
      endLocation: road.endLocation,
      baseMinutes: road.baseTravelTimeMinutes,
      currentMinutes: roadMinutes(road),
      currentTraffic: road.currentTraffic,
      closed: road.status !== RoadStatusEnum.OPEN,
      closureReason: road.closureReason,
      distanceKm: road.distanceKm,
      speedLimitKmh: road.speedLimitKmh,
    });
  } catch (error) {
    return sendError(res, error);
  }
});

router.patch('/roads/:id/traffic', requireRole(['ADMIN', 'DISPATCHER']) as any, async (req, res) => {
  try {
    const traffic = req.body?.traffic;
    const trafficValues = Object.values(TrafficConditionEnum) as string[];
    if (traffic !== undefined && !trafficValues.includes(traffic)) throw new ApiError('Traffic must be LOW, MODERATE, or HEAVY');
    const road = await prisma.road.findUnique({ where: { id: req.params.id } });
    if (!road) throw new ApiError('Unknown road', 404);
    const rawMinutes = req.body?.currentMinutes ?? req.body?.travelTimeMinutes;
    let currentTravelTimeMinutes: number | null | undefined;
    if (rawMinutes !== undefined) {
      const currentMinutes = Number(rawMinutes);
      if (!Number.isFinite(currentMinutes) || currentMinutes <= 0) throw new ApiError('Travel time must be a positive number');
      currentTravelTimeMinutes = currentMinutes;
    } else if (traffic !== undefined) {
      currentTravelTimeMinutes = null;
    } else {
      throw new ApiError('Provide a traffic condition or a positive travel-time estimate');
    }
    const ratio = currentTravelTimeMinutes === null || currentTravelTimeMinutes === undefined
      ? undefined
      : currentTravelTimeMinutes / road.baseTravelTimeMinutes;
    const currentTraffic = traffic as TrafficConditionEnum | undefined
      ?? (ratio === undefined
        ? road.currentTraffic
        : ratio >= 1.7 ? TrafficConditionEnum.HEAVY : ratio >= 1.25 ? TrafficConditionEnum.MODERATE : TrafficConditionEnum.LOW);

    const { updated, recalculations } = await prisma.$transaction(async (db) => {
      const changedRoad = await db.road.update({
        where: { id: road.id },
        data: {
          currentTravelTimeMinutes,
          currentTraffic,
        },
      });
      if (currentTraffic === TrafficConditionEnum.HEAVY) {
        if (await checkTableExists('Notification')) await db.notification.create({
          data: {
            title: 'Heavy traffic condition reported',
            message: `Heavy traffic reported on ${changedRoad.startLocation} to ${changedRoad.endLocation}.`,
            type: 'WARNING',
          },
        });
      }

      const allRoads = await db.road.findMany();
      const locations = await db.networkLocation.findMany();
      const recalcLogs = await recalculateActiveTrips(db, changedRoad, allRoads, locations);

      return { updated: changedRoad, recalculations: recalcLogs };
    });

    return res.json({ recalculations, road: updated });
  } catch (error) {
    return sendError(res, error);
  }
});

router.post('/roads/:id/close', requireRole(['ADMIN', 'DISPATCHER']) as any, async (req, res) => {
  try {
    const reason = String(req.body?.reason ?? 'Road closure reported by operator');
    const { updated, recalculations } = await prisma.$transaction(async (db) => {
      const changedRoad = await db.road.update({
        where: { id: req.params.id },
        data: { status: RoadStatusEnum.CLOSED, closureReason: reason },
      });
      if (await checkTableExists('Notification')) await db.notification.create({
        data: {
          title: 'Road closed',
          message: `Road from ${changedRoad.startLocation} to ${changedRoad.endLocation} is closed. ${changedRoad.closureReason}`.trim(),
          type: 'WARNING',
        },
      });

      const allRoads = await db.road.findMany();
      const locations = await db.networkLocation.findMany();
      const recalcLogs = await recalculateActiveTrips(db, changedRoad, allRoads, locations);

      return { updated: changedRoad, recalculations: recalcLogs };
    });

    return res.json({ recalculations, road: updated });
  } catch (error) {
    return sendError(res, error);
  }
});

router.post('/roads/:id/open', requireRole(['ADMIN', 'DISPATCHER']) as any, async (req, res) => {
  try {
    const { updated, recalculations } = await prisma.$transaction(async (db) => {
      const changedRoad = await db.road.update({ where: { id: req.params.id }, data: { status: RoadStatusEnum.OPEN, closureReason: '' } });
      if (await checkTableExists('Notification')) await db.notification.create({
        data: {
          title: 'Road reopened',
          message: `Road from ${changedRoad.startLocation} to ${changedRoad.endLocation} is open again.`,
          type: 'SUCCESS',
        },
      });

      const allRoads = await db.road.findMany();
      const locations = await db.networkLocation.findMany();
      const recalcLogs = await recalculateActiveTrips(db, changedRoad, allRoads, locations);

      return { updated: changedRoad, recalculations: recalcLogs };
    });

    return res.json({ recalculations, road: updated });
  } catch (error) {
    return sendError(res, error);
  }
});


const VALID_TRIP_TRANSITIONS: Record<TripStatusEnum, TripStatusEnum[]> = {
  [TripStatusEnum.DISPATCHED]: [TripStatusEnum.EN_ROUTE_PICKUP, TripStatusEnum.AT_SCENE, TripStatusEnum.CANCELLED],
  [TripStatusEnum.EN_ROUTE_PICKUP]: [TripStatusEnum.AT_SCENE, TripStatusEnum.CANCELLED],
  [TripStatusEnum.AT_SCENE]: [TripStatusEnum.TRANSPORTING, TripStatusEnum.CANCELLED],
  [TripStatusEnum.TRANSPORTING]: [TripStatusEnum.ARRIVED_HOSPITAL, TripStatusEnum.COMPLETED, TripStatusEnum.CANCELLED],
  [TripStatusEnum.ARRIVED_HOSPITAL]: [TripStatusEnum.COMPLETED, TripStatusEnum.CANCELLED],
  [TripStatusEnum.COMPLETED]: [],
  [TripStatusEnum.CANCELLED]: [],
};

router.get('/trips', async (_req, res) => {
  try {
    const locations = await ensureNetworkLocations();
    const trips = await prisma.trip.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        ambulance: true,
        hospital: true,
        emergency: true,
      },
    });
    return res.json(trips.map((trip) => mapTrip(trip, locations)));
  } catch (error) {
    return sendError(res, error);
  }
});

router.get('/trips/:id', async (req, res) => {
  try {
    const locations = await ensureNetworkLocations();
    const trip = await prisma.trip.findUnique({
      where: { id: req.params.id },
      include: {
        ambulance: true,
        hospital: true,
        emergency: true,
      },
    });
    if (!trip) throw new ApiError('Trip not found', 404);
    return res.json({
      ...mapTrip(trip, locations),
      ambulance: trip.ambulance,
      hospital: trip.hospital,
      emergency: trip.emergency,

    });
  } catch (error) {
    return sendError(res, error);
  }
});

router.patch('/trips/:id/status', requireRole(['ADMIN', 'DISPATCHER', 'AMBULANCE_STAFF']) as any, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body ?? {};
    if (typeof status !== 'string') throw new ApiError('A valid trip status is required', 400);
    const normalized = status.toUpperCase().replace(/\s+/g, '_');
    const statuses = Object.values(TripStatusEnum) as string[];
    if (!statuses.includes(normalized)) throw new ApiError(`Unsupported trip status "${status}"`, 400);
    const mappedStatus = normalized as TripStatusEnum;

    if (notes !== undefined && (typeof notes !== 'string' || notes.length > 500)) {
      throw new ApiError('Notes must be 500 characters or fewer', 400);
    }

    const locations = await ensureNetworkLocations();
    const userId = (req as any).user?.userId ?? null;
    const username = (req as any).user?.username ?? 'Dispatch desk';

    const updatedTrip = await prisma.$transaction(async (db) => {
      const currentTrip = await db.trip.findUnique({ where: { id } });
      if (!currentTrip) throw new ApiError('Trip not found', 404);

      if (currentTrip.status === TripStatusEnum.COMPLETED || currentTrip.status === TripStatusEnum.CANCELLED) {
        throw new ApiError('Trip is already finished', 409);
      }

      if (mappedStatus === currentTrip.status) {
        return currentTrip;
      }

      const allowedTransitions = VALID_TRIP_TRANSITIONS[currentTrip.status] || [];
      if (!allowedTransitions.includes(mappedStatus)) {
        throw new ApiError(`Invalid status transition from ${currentTrip.status} to ${mappedStatus}`, 400);
      }

      const isFinished = mappedStatus === TripStatusEnum.COMPLETED || mappedStatus === TripStatusEnum.CANCELLED;

      const claim = await db.trip.updateMany({
        where: { id, status: { notIn: [TripStatusEnum.COMPLETED, TripStatusEnum.CANCELLED] } },
        data: {
          status: mappedStatus,
          ...(isFinished ? { endTime: new Date() } : {}),
        },
      });
      if (claim.count !== 1) throw new ApiError('Trip changed concurrently; refresh and retry', 409);

      if (mappedStatus === TripStatusEnum.COMPLETED) {
        await db.ambulance.updateMany({
          where: { id: currentTrip.ambulanceId },
          data: {
            currentLocation: currentTrip.destinationHospital,
            status: AmbulanceStatusEnum.AVAILABLE,
            isAvailable: true,
          },
        });
        await db.ambulanceLocationHistory.create({
          data: {
            ambulanceId: currentTrip.ambulanceId,
            location: currentTrip.destinationHospital,
          },
        });
        const hospital = await db.hospital.findUnique({ where: { id: currentTrip.hospitalId } });
        if (hospital) {
          await db.hospital.updateMany({
            where: { id: hospital.id, availableBeds: { lt: hospital.totalBeds } },
            data: { availableBeds: { increment: 1 } },
          });
        }
        await db.emergency.update({
          where: { id: currentTrip.requestId },
          data: {
            status: EmergencyStatusEnum.COMPLETED,
            statusHistory: {
              create: { status: EmergencyStatusEnum.COMPLETED, changedBy: username },
            },
          },
        });
        if (await checkTableExists('Notification')) await db.notification.create({
          data: {
            title: 'Trip completed',
            message: `Trip ${currentTrip.id} completed; ambulance ${currentTrip.ambulanceId} and a hospital bed were released.`,
            type: 'SUCCESS',
          },
        });
      } else if (mappedStatus === TripStatusEnum.CANCELLED) {
        await db.ambulance.updateMany({
          where: { id: currentTrip.ambulanceId },
          data: {
            status: AmbulanceStatusEnum.AVAILABLE,
            isAvailable: true,
          },
        });
        const hospital = await db.hospital.findUnique({ where: { id: currentTrip.hospitalId } });
        if (hospital) {
          await db.hospital.updateMany({
            where: { id: hospital.id, availableBeds: { lt: hospital.totalBeds } },
            data: { availableBeds: { increment: 1 } },
          });
        }
        await db.emergency.update({
          where: { id: currentTrip.requestId },
          data: {
            status: EmergencyStatusEnum.CANCELLED,
            statusHistory: {
              create: { status: EmergencyStatusEnum.CANCELLED, changedBy: username },
            },
          },
        });
        if (await checkTableExists('Notification')) await db.notification.create({
          data: {
            title: 'Trip cancelled',
            message: `Trip ${currentTrip.id} cancelled; ambulance ${currentTrip.ambulanceId} and hospital bed released.`,
            type: 'WARNING',
          },
        });
      } else {
        const emergencyStatus = mappedStatus === TripStatusEnum.AT_SCENE
          ? EmergencyStatusEnum.AT_SCENE
          : mappedStatus === TripStatusEnum.TRANSPORTING || mappedStatus === TripStatusEnum.ARRIVED_HOSPITAL
            ? EmergencyStatusEnum.TRANSPORTING
            : EmergencyStatusEnum.DISPATCHED;

        await db.emergency.update({
          where: { id: currentTrip.requestId },
          data: {
            status: emergencyStatus,
            statusHistory: {
              create: { status: emergencyStatus, changedBy: username },
            },
          },
        });

        if (mappedStatus === TripStatusEnum.EN_ROUTE_PICKUP) {
          await db.ambulance.updateMany({
            where: { id: currentTrip.ambulanceId },
            data: { status: AmbulanceStatusEnum.EN_ROUTE, isAvailable: false },
          });
        } else if (mappedStatus === TripStatusEnum.AT_SCENE) {
          await db.ambulance.updateMany({
            where: { id: currentTrip.ambulanceId },
            data: { status: AmbulanceStatusEnum.BUSY, isAvailable: false, currentLocation: currentTrip.pickupLocation },
          });
          await db.ambulanceLocationHistory.create({
            data: { ambulanceId: currentTrip.ambulanceId, location: currentTrip.pickupLocation },
          });
        } else if (mappedStatus === TripStatusEnum.ARRIVED_HOSPITAL) {
          await db.ambulance.updateMany({
            where: { id: currentTrip.ambulanceId },
            data: { status: AmbulanceStatusEnum.BUSY, isAvailable: false, currentLocation: currentTrip.destinationHospital },
          });
          await db.ambulanceLocationHistory.create({
            data: { ambulanceId: currentTrip.ambulanceId, location: currentTrip.destinationHospital },
          });
        } else {
          await db.ambulance.updateMany({
            where: { id: currentTrip.ambulanceId },
            data: { status: AmbulanceStatusEnum.BUSY, isAvailable: false },
          });
        }
      }

      return db.trip.findUnique({
        where: { id },
        include: { ambulance: true, hospital: true, emergency: true },
      });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

    if (!updatedTrip) throw new ApiError('Trip could not be reloaded', 500);
    return res.json({ success: true, message: `Trip status updated to ${mappedStatus}`, trip: mapTrip(updatedTrip, locations) });
  } catch (error) {
    return sendError(res, error);
  }
});

router.post('/trips/:id/complete', requireRole(['ADMIN', 'DISPATCHER', 'AMBULANCE_STAFF']) as any, async (req, res) => {
  try {
    const locations = await ensureNetworkLocations();
    const userId = (req as any).user?.userId ?? null;
    const username = (req as any).user?.username ?? 'Dispatch desk';

    const completedTrip = await prisma.$transaction(async (db) => {
      const trip = await db.trip.findUnique({ where: { id: req.params.id } });
      if (!trip) throw new ApiError('Unknown trip', 404);
      if (trip.status === TripStatusEnum.COMPLETED || trip.status === TripStatusEnum.CANCELLED) {
        throw new ApiError('Trip is already finished', 409);
      }

      const tripClaim = await db.trip.updateMany({
        where: { id: trip.id, status: { notIn: [TripStatusEnum.COMPLETED, TripStatusEnum.CANCELLED] } },
        data: { status: TripStatusEnum.COMPLETED, endTime: new Date() },
      });
      if (tripClaim.count !== 1) throw new ApiError('Trip was completed by another operator; refresh and retry', 409);

      await db.ambulance.updateMany({
        where: { id: trip.ambulanceId },
        data: {
          currentLocation: trip.destinationHospital,
          status: AmbulanceStatusEnum.AVAILABLE,
          isAvailable: true,
        },
      });
      await db.ambulanceLocationHistory.create({
        data: {
          ambulanceId: trip.ambulanceId,
          location: trip.destinationHospital,
        },
      });
      await db.emergency.update({
        where: { id: trip.requestId },
        data: {
          status: EmergencyStatusEnum.COMPLETED,
          statusHistory: { create: { status: EmergencyStatusEnum.COMPLETED, changedBy: username } },
        },
      });
      const hospital = await db.hospital.findUnique({ where: { id: trip.hospitalId } });
      if (!hospital) throw new ApiError('Trip hospital no longer exists', 409);
      await db.hospital.updateMany({
        where: { id: hospital.id, availableBeds: { lt: hospital.totalBeds } },
        data: { availableBeds: { increment: 1 } },
      });
      if (await checkTableExists('Notification')) await db.notification.create({
        data: {
          title: 'Trip completed',
          message: `Trip ${trip.id} completed; ambulance ${trip.ambulanceId} and a hospital bed were released.`,
          type: 'SUCCESS',
        },
      });
      return db.trip.findUnique({ where: { id: trip.id } });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

    if (!completedTrip) throw new ApiError('Completed trip could not be reloaded', 500);
    return res.json({ success: true, message: 'Trip completed. Ambulance and hospital capacity were released.', trip: mapTrip(completedTrip, locations) });
  } catch (error) {
    return sendError(res, error);
  }
});

router.post('/trips/:id/cancel', requireRole(['ADMIN', 'DISPATCHER']) as any, async (req, res) => {
  try {
    const locations = await ensureNetworkLocations();
    const { reason } = req.body ?? {};
    const userId = (req as any).user?.userId ?? null;
    const username = (req as any).user?.username ?? 'Dispatch desk';

    const cancelledTrip = await prisma.$transaction(async (db) => {
      const trip = await db.trip.findUnique({ where: { id: req.params.id } });
      if (!trip) throw new ApiError('Unknown trip', 404);
      if (trip.status === TripStatusEnum.COMPLETED || trip.status === TripStatusEnum.CANCELLED) {
        throw new ApiError('Trip is already finished', 409);
      }

      const tripClaim = await db.trip.updateMany({
        where: { id: trip.id, status: { notIn: [TripStatusEnum.COMPLETED, TripStatusEnum.CANCELLED] } },
        data: { status: TripStatusEnum.CANCELLED, endTime: new Date() },
      });
      if (tripClaim.count !== 1) throw new ApiError('Trip was cancelled or modified by another operator; refresh and retry', 409);

      await db.ambulance.updateMany({
        where: { id: trip.ambulanceId },
        data: {
          status: AmbulanceStatusEnum.AVAILABLE,
          isAvailable: true,
        },
      });

      const hospital = await db.hospital.findUnique({ where: { id: trip.hospitalId } });
      if (hospital) {
        await db.hospital.updateMany({
          where: { id: hospital.id, availableBeds: { lt: hospital.totalBeds } },
          data: { availableBeds: { increment: 1 } },
        });
      }

      await db.emergency.update({
        where: { id: trip.requestId },
        data: {
          status: EmergencyStatusEnum.CANCELLED,
          statusHistory: { create: { status: EmergencyStatusEnum.CANCELLED, changedBy: username } },
        },
      });

      if (await checkTableExists('Notification')) await db.notification.create({
        data: {
          title: 'Trip cancelled',
          message: `Trip ${trip.id} was cancelled. Ambulance ${trip.ambulanceId} and hospital bed were released.`,
          type: 'WARNING',
        },
      });

      return db.trip.findUnique({ where: { id: trip.id } });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

    if (!cancelledTrip) throw new ApiError('Cancelled trip could not be reloaded', 500);
    return res.json({ success: true, message: 'Trip cancelled. Resources were released.', trip: mapTrip(cancelledTrip, locations) });
  } catch (error) {
    return sendError(res, error);
  }
});

router.post('/dispatch/recommend', requireRole(['ADMIN', 'DISPATCHER']) as any, async (req, res) => {
  try {
    const { emergencyId, pickupLocation } = req.body ?? {};
    let targetPickup = pickupLocation;
    let emergency = null;

    if (emergencyId) {
      emergency = await prisma.emergency.findUnique({ where: { id: emergencyId } });
      if (emergency) targetPickup = emergency.pickupLocation;
    }

    if (!targetPickup) {
      throw new ApiError('Pickup location required', 400);
    }

    const locations = await ensureNetworkLocations();
    const ids = asIdMap(locations);
    const resolvedPickup = ids.byId.get(targetPickup) ?? (ids.byName.has(targetPickup) ? targetPickup : targetPickup);

    const [roads, availableAmbulances, availableHospitals] = await Promise.all([
      prisma.road.findMany(),
      prisma.ambulance.findMany({
        where: {
          isAvailable: true,
          status: AmbulanceStatusEnum.AVAILABLE,
          trips: {
            none: {
              status: { notIn: [TripStatusEnum.COMPLETED, TripStatusEnum.CANCELLED] },
            },
          },
        },
      }),
      prisma.hospital.findMany({
        where: { availableBeds: { gt: 0 } },
      }),
    ]);

    if (availableAmbulances.length === 0) {
      throw new ApiError('No available ambulances found in network', 404);
    }
    if (availableHospitals.length === 0) {
      throw new ApiError('No hospitals with available bed capacity found', 404);
    }

    const ambulanceScored = availableAmbulances.map((amb) => ({
      ambulance: amb,
      route: findShortestRoute(amb.currentLocation, resolvedPickup, roads),
    })).filter((c) => c.route.reachable)
      .sort((a, b) => a.route.totalMinutes - b.route.totalMinutes);

    const bestAmbulance = ambulanceScored[0];
    if (!bestAmbulance) {
      throw new ApiError('No available ambulance has a reachable route', 409);
    }

    const requiredFacility = emergency?.requiredFacility ?? 'GENERAL';
    const hospitalScored = availableHospitals.map((hosp) => ({
      hospital: hosp,
      route: findShortestRoute(resolvedPickup, hosp.location, roads),
    })).filter((c) => c.route.reachable && hospitalSupportsFacility(requiredFacility, c.hospital.facilities))
      .sort((a, b) => a.route.totalMinutes - b.route.totalMinutes);

    const bestHospital = hospitalScored[0];
    if (!bestHospital) {
      throw new ApiError('No available ambulance or suitable hospital has a reachable route', 409);
    }

    const pathToIncident = bestAmbulance.route.path.map((n) => ids.byName.get(n) ?? n);
    const pathToHospital = bestHospital.route.path.map((n) => ids.byName.get(n) ?? n);
    const combinedRoutePath = [...pathToIncident, ...pathToHospital.slice(1)];
    const totalEstTime = bestAmbulance.route.totalMinutes + bestHospital.route.totalMinutes;

    return res.json({
      emergencyId: emergencyId || null,
      pickupLocation: targetPickup,
      recommendedAmbulance: bestAmbulance.ambulance,
      recommendedHospital: bestHospital.hospital,
      etaMinutesToPickup: bestAmbulance.route.totalMinutes,
      etaMinutesToHospital: bestHospital.route.totalMinutes,
      totalTripEstimatedMinutes: totalEstTime,
      routePath: combinedRoutePath,
    });
  } catch (error) {
    return sendError(res, error);
  }
});

router.post('/dispatch/execute', requireRole(['ADMIN', 'DISPATCHER']) as any, async (req, res) => {
  try {
    const { emergencyId, ambulanceId, hospitalId } = req.body ?? {};
    if (!emergencyId || !ambulanceId || !hospitalId) {
      throw new ApiError('Emergency, ambulance, and hospital IDs are required', 400);
    }
    const locations = await ensureNetworkLocations();
    const ids = asIdMap(locations);
    const userId = (req as any).user?.userId ?? null;

    const trip = await prisma.$transaction(async (db) => {
      const [emergency, ambulance, hospital, roads] = await Promise.all([
        db.emergency.findUnique({ where: { id: emergencyId } }),
        db.ambulance.findUnique({ where: { id: ambulanceId } }),
        db.hospital.findUnique({ where: { id: hospitalId } }),
        db.road.findMany(),
      ]);
      if (!emergency) throw new ApiError('Emergency not found', 404);
      if (!ambulance) throw new ApiError('Ambulance not found', 404);
      if (!hospital) throw new ApiError('Hospital not found', 404);
      if (emergency.status !== EmergencyStatusEnum.PENDING) throw new ApiError('Emergency is no longer pending', 409);
      if (ambulance.status !== AmbulanceStatusEnum.AVAILABLE || !ambulance.isAvailable) {
        throw new ApiError('Ambulance is no longer available', 409);
      }
      const activeTrip = await db.trip.findFirst({
        where: {
          ambulanceId: ambulance.id,
          status: { notIn: [TripStatusEnum.COMPLETED, TripStatusEnum.CANCELLED] },
        },
      });
      if (activeTrip) {
        throw new ApiError(`Ambulance ${ambulance.id} is already assigned to active trip ${activeTrip.id}`, 409);
      }
      if (hospital.availableBeds < 1) throw new ApiError('Hospital has no available beds', 409);
      if (!hospitalSupportsFacility(emergency.requiredFacility, hospital.facilities)) {
        throw new ApiError(`Hospital does not support required department: ${emergency.requiredFacility}`, 400);
      }

      const ambulanceRoute = findShortestRoute(ambulance.currentLocation, emergency.pickupLocation, roads);
      const hospitalRoute = findShortestRoute(emergency.pickupLocation, hospital.location, roads);
      if (!ambulanceRoute.reachable || !hospitalRoute.reachable) {
        throw new ApiError('No reachable route exists for the selected dispatch', 400);
      }

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
        throw new ApiError('Dispatch resources changed concurrently; refresh and retry', 409);
      }

      await db.emergencyStatusHistory.create({
        data: { emergencyId: emergency.id, status: EmergencyStatusEnum.DISPATCHED, changedBy: (req as any).user?.username || 'Dispatch desk' },
      });

      const pathToIncident = ambulanceRoute.path.map((name) => ids.byName.get(name) ?? name);
      const pathToHospital = hospitalRoute.path.map((name) => ids.byName.get(name) ?? name);
      const allTrips = await db.trip.findMany({ select: { id: true } });
      const maxNum = allTrips.reduce((max, t) => {
        const match = t.id.match(/^TRIP-(\d+)$/);
        return match ? Math.max(max, parseInt(match[1], 10)) : max;
      }, 1000);
      const tripId = `TRIP-${maxNum + 1}`;
      const totalMinutes = ambulanceRoute.totalMinutes + hospitalRoute.totalMinutes;

      const createdTrip = await db.trip.create({
        data: {
          id: tripId,
          requestId: emergency.id,
          ambulanceId: ambulance.id,
          hospitalId: hospital.id,
          pickupLocation: emergency.pickupLocation,
          destinationHospital: hospital.location,
          status: TripStatusEnum.DISPATCHED,
          routePath: [...pathToIncident, ...pathToHospital.slice(1)],
          pathToIncident,
          timeToIncidentMinutes: ambulanceRoute.totalMinutes,
          pathToHospital,
          timeToHospitalMinutes: hospitalRoute.totalMinutes,
          blocked: false,
          reasoning: `Ambulance ${ambulance.id} selected at ${ambulanceRoute.totalMinutes.toFixed(1)} minutes; hospital ${hospital.id} selected at ${hospitalRoute.totalMinutes.toFixed(1)} minutes.`,
          estimatedDurationMinutes: Math.max(1, Math.round(totalMinutes)),
          distanceKm: [...pathToIncident, ...pathToHospital.slice(1)].reduce((distance, location, index, path) => {
            if (index === 0) return distance;
            const previous = ids.byId.get(path[index - 1]) ?? path[index - 1];
            const current = ids.byId.get(location) ?? location;
            const road = roads.find((candidate) =>
              candidate.startLocation === previous && candidate.endLocation === current
              || !candidate.isOneWay && candidate.startLocation === current && candidate.endLocation === previous
            );
            return distance + (road?.distanceKm ?? 0);
          }, 0),
        },
      });

      if (await checkTableExists('Notification')) await db.notification.create({
        data: {
          title: emergency.severity === EmergencySeverityEnum.CRITICAL ? 'Critical emergency dispatched' : 'Emergency dispatched',
          message: `Request ${emergency.id} assigned to ambulance ${ambulance.id} for hospital ${hospital.name}.`,
          type: emergency.severity === EmergencySeverityEnum.CRITICAL ? 'CRITICAL' : 'INFO',
        },
      });

      return createdTrip;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

    return res.status(201).json(mapTrip(trip, locations));
  } catch (error) {
    return sendError(res, error);
  }
});

router.post('/dispatch/next', requireRole(['ADMIN', 'DISPATCHER']) as any, async (req, res) => {
  try {
    const locations = await ensureNetworkLocations();
    const userId = (req as any).user?.userId ?? null;
    const trip = await prisma.$transaction((db) => selectDispatch(db, undefined, userId), {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    });
    return res.json(mapTrip(trip, locations));
  } catch (error) {
    return sendError(res, error);
  }
});

router.post('/dispatch/:requestId', requireRole(['ADMIN', 'DISPATCHER']) as any, async (req, res) => {
  try {
    const locations = await ensureNetworkLocations();
    const userId = (req as any).user?.userId ?? null;
    const trip = await prisma.$transaction((db) => selectDispatch(db, req.params.requestId, userId), {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    });
    return res.json(mapTrip(trip, locations));
  } catch (error) {
    return sendError(res, error);
  }
});

router.get('/route', async (req, res) => {
  try {
    const locations = await ensureNetworkLocations();
    const ids = asIdMap(locations);
    const rawFrom = String(req.query.from ?? '').trim();
    const rawTo = String(req.query.to ?? '').trim();
    const from = ids.byId.get(rawFrom) ?? (ids.byName.has(rawFrom) ? rawFrom : undefined);
    const to = ids.byId.get(rawTo) ?? (ids.byName.has(rawTo) ? rawTo : undefined);
    if (!from || !to) throw new ApiError('Unknown route location reference', 400);
    const roads = await prisma.road.findMany();
    const result = findShortestRoute(from, to, roads);
    return res.json({ ...result, path: result.path.map((name) => ids.byName.get(name) ?? name) });
  } catch (error) {
    return sendError(res, error);
  }
});

router.post('/reset', requireRole(['ADMIN']) as any, (_req, res) => res.status(409).json({
  error: 'Reset is disabled for database-backed records. Restore the configured sample backup instead.',
}));

export default router;
