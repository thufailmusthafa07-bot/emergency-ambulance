import { Router } from 'express';

const router = Router();

type Severity = 'CRITICAL' | 'SERIOUS' | 'MINOR';

type LocationRecord = {
  id: string;
  name: string;
  category: string;
  xCoordinatesPercent: number;
  yCoordinatesPercent: number;
};

type RoadRecord = {
  id: string;
  name: string;
  sourceId: string;
  destinationId: string;
  startLocation: string;
  endLocation: string;
  distanceKm: number;
  baseTravelTimeMinutes: number;
  currentMinutes: number;
  currentTraffic: string;
  status: 'Open' | 'Closed';
  closed: boolean;
  closureReason: string;
  lastUpdated: string;
};

type HospitalRecord = {
  id: string;
  name: string;
  location: string;
  locationId: string;
  totalBeds: number;
  availableBeds: number;
  occupiedBeds?: number;
  facilities?: Record<string, boolean>;
  capabilities?: string[];
  status: string;
};

type RequestRecord = {
  id: string;
  callerName: string;
  contactNumber: string;
  incidentLocationId: string;
  pickupLocation: string;
  severity: Severity;
  requiredFacility: string;
  status: string;
  description: string;
  createdAt: number;
  assignedAmbulanceId?: string;
  assignedHospitalId?: string;
  timeline?: Array<{ time: number; message: string }>;
};

type TripRecord = {
  id: string;
  requestId: string;
  ambulanceId: string;
  hospitalId: string;
  incidentLocationId: string;
  hospitalLocationId?: string;
  status: 'ACTIVE' | 'COMPLETED';
  route: string[];
  totalMinutes: number;
  createdAt: number;
  completed: boolean;
  pathToIncident?: string[];
  timeToIncidentMinutes?: number;
  pathToHospital?: string[];
  timeToHospitalMinutes?: number;
  blocked?: boolean;
  startTime?: number;
  endTime?: number | null;
  reasoning?: string;
};

const locations: LocationRecord[] = [
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

const roads: RoadRecord[] = [
  { id: 'R001', name: 'Central Ave', sourceId: 'LOC-01', destinationId: 'LOC-02', startLocation: 'Central Junction', endLocation: 'Anna Nagar', distanceKm: 3.2, baseTravelTimeMinutes: 5, currentMinutes: 5, currentTraffic: 'Low', status: 'Open', closed: false, closureReason: '', lastUpdated: 'Just now' },
  { id: 'R002', name: 'Gandhi Express', sourceId: 'LOC-01', destinationId: 'LOC-03', startLocation: 'Central Junction', endLocation: 'Gandhi Nagar', distanceKm: 2.5, baseTravelTimeMinutes: 4, currentMinutes: 4, currentTraffic: 'Low', status: 'Open', closed: false, closureReason: '', lastUpdated: 'Just now' },
  { id: 'R003', name: 'Market Link Road', sourceId: 'LOC-01', destinationId: 'LOC-09', startLocation: 'Central Junction', endLocation: 'Market', distanceKm: 3.8, baseTravelTimeMinutes: 6, currentMinutes: 6, currentTraffic: 'Moderate', status: 'Open', closed: false, closureReason: '', lastUpdated: '10 mins ago' },
  { id: 'R004', name: 'College Road', sourceId: 'LOC-02', destinationId: 'LOC-04', startLocation: 'Anna Nagar', endLocation: 'College', distanceKm: 4.0, baseTravelTimeMinutes: 6, currentMinutes: 6, currentTraffic: 'Moderate', status: 'Open', closed: false, closureReason: '', lastUpdated: '15 mins ago' },
  { id: 'R005', name: 'Bazaar Street', sourceId: 'LOC-02', destinationId: 'LOC-09', startLocation: 'Anna Nagar', endLocation: 'Market', distanceKm: 1.8, baseTravelTimeMinutes: 3, currentMinutes: 3, currentTraffic: 'Low', status: 'Open', closed: false, closureReason: '', lastUpdated: '5 mins ago' },
  { id: 'R006', name: 'City Hospital Way', sourceId: 'LOC-02', destinationId: 'LOC-10', startLocation: 'Anna Nagar', endLocation: 'City Hospital', distanceKm: 4.5, baseTravelTimeMinutes: 7, currentMinutes: 7, currentTraffic: 'Low', status: 'Open', closed: false, closureReason: '', lastUpdated: '2 mins ago' },
  { id: 'R007', name: 'School Lane', sourceId: 'LOC-03', destinationId: 'LOC-05', startLocation: 'Gandhi Nagar', endLocation: 'Government School', distanceKm: 3.0, baseTravelTimeMinutes: 5, currentMinutes: 5, currentTraffic: 'Low', status: 'Open', closed: false, closureReason: '', lastUpdated: '1 hour ago' },
  { id: 'R008', name: 'Industrial Corridor', sourceId: 'LOC-03', destinationId: 'LOC-06', startLocation: 'Gandhi Nagar', endLocation: 'Industrial Area', distanceKm: 4.8, baseTravelTimeMinutes: 7, currentMinutes: 7, currentTraffic: 'Heavy', status: 'Open', closed: false, closureReason: '', lastUpdated: '3 mins ago' },
  { id: 'R009', name: 'Trauma Link', sourceId: 'LOC-03', destinationId: 'LOC-11', startLocation: 'Gandhi Nagar', endLocation: 'Trauma Hospital', distanceKm: 3.9, baseTravelTimeMinutes: 6, currentMinutes: 6, currentTraffic: 'Low', status: 'Open', closed: false, closureReason: '', lastUpdated: '12 mins ago' },
  { id: 'R010', name: 'Station Road', sourceId: 'LOC-04', destinationId: 'LOC-07', startLocation: 'College', endLocation: 'Railway Station', distanceKm: 2.2, baseTravelTimeMinutes: 4, currentMinutes: 4, currentTraffic: 'Low', status: 'Open', closed: false, closureReason: '', lastUpdated: '5 mins ago' },
  { id: 'R011', name: 'North Emergency Flyover', sourceId: 'LOC-04', destinationId: 'LOC-12', startLocation: 'College', endLocation: 'Emergency Hospital', distanceKm: 5.0, baseTravelTimeMinutes: 8, currentMinutes: 8, currentTraffic: 'Moderate', status: 'Open', closed: false, closureReason: '', lastUpdated: '8 mins ago' },
  { id: 'R012', name: 'Bus Stand Connector', sourceId: 'LOC-05', destinationId: 'LOC-08', startLocation: 'Government School', endLocation: 'Bus Stand', distanceKm: 3.5, baseTravelTimeMinutes: 6, currentMinutes: 6, currentTraffic: 'Moderate', status: 'Open', closed: false, closureReason: '', lastUpdated: '20 mins ago' },
  { id: 'R013', name: 'East Rail Line', sourceId: 'LOC-05', destinationId: 'LOC-07', startLocation: 'Government School', endLocation: 'Railway Station', distanceKm: 3.1, baseTravelTimeMinutes: 5, currentMinutes: 5, currentTraffic: 'Low', status: 'Open', closed: false, closureReason: '', lastUpdated: '30 mins ago' },
  { id: 'R014', name: 'City Hospital South', sourceId: 'LOC-09', destinationId: 'LOC-10', startLocation: 'Market', endLocation: 'City Hospital', distanceKm: 3.0, baseTravelTimeMinutes: 5, currentMinutes: 5, currentTraffic: 'Low', status: 'Open', closed: false, closureReason: '', lastUpdated: 'Just now' },
  { id: 'R015', name: 'Market West Boulevard', sourceId: 'LOC-09', destinationId: 'LOC-12', startLocation: 'Market', endLocation: 'Emergency Hospital', distanceKm: 5.5, baseTravelTimeMinutes: 9, currentMinutes: 9, currentTraffic: 'Heavy', status: 'Open', closed: false, closureReason: '', lastUpdated: '14 mins ago' },
  { id: 'R016', name: 'Industrial Bypass', sourceId: 'LOC-06', destinationId: 'LOC-11', startLocation: 'Industrial Area', endLocation: 'Trauma Hospital', distanceKm: 5.2, baseTravelTimeMinutes: 8, currentMinutes: 8, currentTraffic: 'Moderate', status: 'Open', closed: false, closureReason: '', lastUpdated: 'Just now' },
  { id: 'R017', name: 'East Bus Route', sourceId: 'LOC-06', destinationId: 'LOC-08', startLocation: 'Industrial Area', endLocation: 'Bus Stand', distanceKm: 4.2, baseTravelTimeMinutes: 7, currentMinutes: 7, currentTraffic: 'Low', status: 'Open', closed: false, closureReason: '', lastUpdated: '45 mins ago' },
  { id: 'R018', name: 'Station-Emergency Link', sourceId: 'LOC-07', destinationId: 'LOC-12', startLocation: 'Railway Station', endLocation: 'Emergency Hospital', distanceKm: 4.1, baseTravelTimeMinutes: 7, currentMinutes: 7, currentTraffic: 'Low', status: 'Open', closed: false, closureReason: '', lastUpdated: '10 mins ago' },
  { id: 'R019', name: 'Hospital Transit Arterial', sourceId: 'LOC-08', destinationId: 'LOC-10', startLocation: 'Bus Stand', endLocation: 'City Hospital', distanceKm: 2.4, baseTravelTimeMinutes: 4, currentMinutes: 4, currentTraffic: 'Low', status: 'Open', closed: false, closureReason: '', lastUpdated: '5 mins ago' },
  { id: 'R020', name: 'Transit Ring Road', sourceId: 'LOC-08', destinationId: 'LOC-07', startLocation: 'Bus Stand', endLocation: 'Railway Station', distanceKm: 1.9, baseTravelTimeMinutes: 3, currentMinutes: 3, currentTraffic: 'Low', status: 'Open', closed: false, closureReason: '', lastUpdated: '1 min ago' },
  { id: 'R021', name: 'Metro Hospital Ring', sourceId: 'LOC-10', destinationId: 'LOC-11', startLocation: 'City Hospital', endLocation: 'Trauma Hospital', distanceKm: 5.0, baseTravelTimeMinutes: 8, currentMinutes: 8, currentTraffic: 'Low', status: 'Open', closed: false, closureReason: '', lastUpdated: '25 mins ago' },
  { id: 'R022', name: 'Emergency Crossway', sourceId: 'LOC-11', destinationId: 'LOC-12', startLocation: 'Trauma Hospital', endLocation: 'Emergency Hospital', distanceKm: 3.6, baseTravelTimeMinutes: 6, currentMinutes: 6, currentTraffic: 'Low', status: 'Open', closed: false, closureReason: '', lastUpdated: '18 mins ago' },
];

const hospitals: HospitalRecord[] = [
  { id: 'H001', name: 'City General Hospital', location: 'City Hospital', locationId: 'LOC-10', totalBeds: 250, availableBeds: 38, occupiedBeds: 212, facilities: { icu: true, traumaCare: true, cardiacUnit: true, burnUnit: false, maternityCare: true, pediatricEmergency: true }, capabilities: ['TRAUMA', 'CARDIAC', 'PEDIATRICS'], status: 'Available' },
  { id: 'H002', name: 'Trauma Care Speciality Hospital', location: 'Trauma Hospital', locationId: 'LOC-11', totalBeds: 180, availableBeds: 22, occupiedBeds: 158, facilities: { icu: true, traumaCare: true, cardiacUnit: true, burnUnit: true, maternityCare: false, pediatricEmergency: false }, capabilities: ['TRAUMA', 'CARDIAC'], status: 'Available' },
  { id: 'H003', name: 'Emergency Medical Center', location: 'Emergency Hospital', locationId: 'LOC-12', totalBeds: 120, availableBeds: 15, occupiedBeds: 105, facilities: { icu: true, traumaCare: true, cardiacUnit: false, burnUnit: false, maternityCare: false, pediatricEmergency: true }, capabilities: ['TRAUMA', 'PEDIATRICS'], status: 'Available' },
  { id: 'H004', name: 'Community Health Hospital', location: 'Market', locationId: 'LOC-09', totalBeds: 60, availableBeds: 12, occupiedBeds: 48, facilities: { icu: true, traumaCare: false, cardiacUnit: false, burnUnit: false, maternityCare: true, pediatricEmergency: true }, capabilities: ['PEDIATRICS'], status: 'Available' },
];

const ambulances = [
  { id: 'A001', registrationNumber: 'TN-09-AX-1001', currentLocation: 'Central Junction', currentLocationId: 'LOC-01', status: 'DISPATCHED', equipmentType: 'ALS', assignedRequestId: 'REQ-2026-001', assignedHospitalId: 'H001', estimatedArrivalMinutes: 5, lastUpdated: '2 mins ago' },
  { id: 'A002', registrationNumber: 'TN-09-AX-1002', currentLocation: 'Anna Nagar', currentLocationId: 'LOC-02', status: 'AVAILABLE', equipmentType: 'ALS', assignedRequestId: null, assignedHospitalId: null, estimatedArrivalMinutes: 0, lastUpdated: '10 mins ago' },
  { id: 'A003', registrationNumber: 'TN-09-AX-1003', currentLocation: 'College', currentLocationId: 'LOC-04', status: 'AVAILABLE', equipmentType: 'BLS', assignedRequestId: null, assignedHospitalId: null, estimatedArrivalMinutes: 0, lastUpdated: 'Just now' },
  { id: 'A004', registrationNumber: 'TN-09-AX-1004', currentLocation: 'Industrial Area', currentLocationId: 'LOC-06', status: 'TRANSPORTING', equipmentType: 'CCU', assignedRequestId: 'REQ-2026-006', assignedHospitalId: 'H001', estimatedArrivalMinutes: 12, lastUpdated: '4 mins ago' },
  { id: 'A005', registrationNumber: 'TN-09-AX-1005', currentLocation: 'Railway Station', currentLocationId: 'LOC-07', status: 'AVAILABLE', equipmentType: 'ALS', assignedRequestId: null, assignedHospitalId: null, estimatedArrivalMinutes: 0, lastUpdated: '1 min ago' },
];

const requests: RequestRecord[] = [
  { id: 'REQ-2026-001', callerName: 'John Doe', contactNumber: '+91 9876543210', incidentLocationId: 'LOC-09', pickupLocation: 'Market', severity: 'CRITICAL', requiredFacility: 'TRAUMA', status: 'DISPATCHED', description: 'Road accident at market', createdAt: Date.now() - 900000, assignedAmbulanceId: 'A001', assignedHospitalId: 'H001', timeline: [] },
  { id: 'REQ-2026-002', callerName: 'Mary Smith', contactNumber: '+91 9876543211', incidentLocationId: 'LOC-01', pickupLocation: 'Central Junction', severity: 'CRITICAL', requiredFacility: 'CARDIAC', status: 'PENDING', description: 'Chest pain', createdAt: Date.now() - 480000, timeline: [] },
  { id: 'REQ-2026-003', callerName: 'Ramesh Kumar', contactNumber: '+91 9876543212', incidentLocationId: 'LOC-02', pickupLocation: 'Anna Nagar', severity: 'SERIOUS', requiredFacility: 'TRAUMA', status: 'PENDING', description: 'Breathing difficulty', createdAt: Date.now() - 720000, timeline: [] },
  { id: 'REQ-2026-004', callerName: 'Priya Sharma', contactNumber: '+91 9876543213', incidentLocationId: 'LOC-06', pickupLocation: 'Industrial Area', severity: 'CRITICAL', requiredFacility: 'TRAUMA', status: 'PENDING', description: 'Worker collapsed', createdAt: Date.now() - 240000, timeline: [] },
  { id: 'REQ-2026-005', callerName: 'Ahmed Khan', contactNumber: '+91 9876543214', incidentLocationId: 'LOC-07', pickupLocation: 'Railway Station', severity: 'CRITICAL', requiredFacility: 'PEDIATRICS', status: 'ASSIGNED', description: 'Severe bleeding', createdAt: Date.now() - 600000, assignedAmbulanceId: 'A003', assignedHospitalId: 'H003', timeline: [] },
  { id: 'REQ-2026-009', callerName: 'David Wilson', contactNumber: '+91 9876543218', incidentLocationId: 'LOC-05', pickupLocation: 'Government School', severity: 'MINOR', requiredFacility: 'GENERAL', status: 'PENDING', description: 'Ankle sprain', createdAt: Date.now() - 1080000, timeline: [] },
];

const trips: TripRecord[] = [
  { id: 'TRIP-1001', requestId: 'REQ-2026-001', ambulanceId: 'A001', hospitalId: 'H001', incidentLocationId: 'LOC-09', hospitalLocationId: 'LOC-10', status: 'ACTIVE', route: ['LOC-09', 'LOC-10'], totalMinutes: 14, createdAt: Date.now() - 600000, completed: false },
];

const sortByPriority = (a: RequestRecord, b: RequestRecord) => {
  const weight: Record<Severity, number> = { CRITICAL: 3, SERIOUS: 2, MINOR: 1 };
  if (weight[a.severity] !== weight[b.severity]) return weight[b.severity] - weight[a.severity];
  return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
};

const getRoadGraph = () => {
  const adjacency = new Map<string, Array<{ to: string; time: number; roadId: string }>>();
  for (const road of roads) {
    if (road.closed) continue;
    if (!adjacency.has(road.sourceId)) adjacency.set(road.sourceId, []);
    if (!adjacency.has(road.destinationId)) adjacency.set(road.destinationId, []);
    adjacency.get(road.sourceId)?.push({ to: road.destinationId, time: road.currentMinutes, roadId: road.id });
    adjacency.get(road.destinationId)?.push({ to: road.sourceId, time: road.currentMinutes, roadId: road.id });
  }
  return adjacency;
};

const dijkstra = (from: string, to: string) => {
  const adjacency = getRoadGraph();
  const distances = new Map<string, number>();
  const previous = new Map<string, string | null>();
  const queue = new Map<string, number>();

  for (const location of locations) {
    distances.set(location.id, Infinity);
    previous.set(location.id, null);
  }

  distances.set(from, 0);
  queue.set(from, 0);

  while (queue.size > 0) {
    const current = [...queue.entries()].sort((a, b) => a[1] - b[1])[0];
    queue.delete(current[0]);
    const currentNode = current[0];
	  const neighbors = adjacency.get(currentNode) ?? [];
    for (const neighbor of neighbors) {
      const candidate = (distances.get(currentNode) ?? Infinity) + neighbor.time;
      if (candidate < (distances.get(neighbor.to) ?? Infinity)) {
        distances.set(neighbor.to, candidate);
        previous.set(neighbor.to, currentNode);
        queue.set(neighbor.to, candidate);
      }
    }
  }

  if (distances.get(to) === Infinity) {
    return { reachable: false, totalMinutes: Infinity, path: [] };
  }

  const path: string[] = [];
  let cursor: string | null = to;
  while (cursor) {
    path.unshift(cursor);
    cursor = previous.get(cursor) ?? null;
  }

  return { reachable: true, totalMinutes: distances.get(to) ?? 0, path };
};

const getStats = () => {
  const pending = requests.filter((request) => request.status === 'PENDING');
  return {
    pendingTotal: pending.length,
    pendingCritical: pending.filter((request) => request.severity === 'CRITICAL').length,
    pendingSerious: pending.filter((request) => request.severity === 'SERIOUS').length,
    pendingMinor: pending.filter((request) => request.severity === 'MINOR').length,
    availableAmbulances: ambulances.filter((ambulance) => ambulance.status === 'AVAILABLE').length,
    totalAmbulances: ambulances.length,
    availableBeds: hospitals.reduce((total, hospital) => total + hospital.availableBeds, 0),
    totalBeds: hospitals.reduce((total, hospital) => total + hospital.totalBeds, 0),
    activeTrips: trips.filter((trip) => trip.status === 'ACTIVE').length,
    closedRoads: roads.filter((road) => road.closed).length,
    locationsCount: locations.length,
    roadsCount: roads.length,
    lastRecalculationEpoch: Date.now(),
  };
};

const findBestHospital = (incidentLocationId: string, requiredFacility: string) => {
  const candidates = hospitals
    .map((hospital) => {
      const capabilities = hospital.capabilities ?? [];
      const supports = capabilities.some((capability) => capability.toUpperCase() === requiredFacility.toUpperCase()) || (hospital.facilities && Object.keys(hospital.facilities).some((key) => key.toLowerCase().includes(requiredFacility.toLowerCase())));
      const route = dijkstra(incidentLocationId, hospital.locationId);
      return { hospital, supports, route, travelMinutes: route.reachable ? route.totalMinutes : Infinity };
    })
    .filter((candidate) => candidate.supports && candidate.hospital.availableBeds > 0 && candidate.route.reachable)
    .sort((a, b) => a.travelMinutes - b.travelMinutes);

  return candidates[0] ?? null;
};

const findBestAmbulance = (incidentLocationId: string) => {
  const candidates = ambulances
    .filter((ambulance) => ambulance.status === 'AVAILABLE')
    .map((ambulance) => ({ ambulance, route: dijkstra(ambulance.currentLocationId, incidentLocationId) }))
    .filter((candidate) => candidate.route.reachable)
    .sort((a, b) => a.route.totalMinutes - b.route.totalMinutes);

  return candidates[0] ?? null;
};

const createTrip = (
  request: RequestRecord,
  ambulanceResult: NonNullable<ReturnType<typeof findBestAmbulance>>,
  hospitalResult: NonNullable<ReturnType<typeof findBestHospital>>
): TripRecord => {
  const createdAt = Date.now();
  const pathToIncident = ambulanceResult.route.path;
  const pathToHospital = hospitalResult.route.path;

  return {
    id: `TRIP-${createdAt}`,
    requestId: request.id,
    ambulanceId: ambulanceResult.ambulance.id,
    hospitalId: hospitalResult.hospital.id,
    incidentLocationId: request.incidentLocationId,
    hospitalLocationId: hospitalResult.hospital.locationId,
    status: 'ACTIVE',
    route: [...pathToIncident, ...pathToHospital.slice(1)],
    pathToIncident,
    timeToIncidentMinutes: ambulanceResult.route.totalMinutes,
    pathToHospital,
    timeToHospitalMinutes: hospitalResult.route.totalMinutes,
    totalMinutes: ambulanceResult.route.totalMinutes + hospitalResult.route.totalMinutes,
    completed: false,
    blocked: false,
    createdAt,
    startTime: createdAt,
    endTime: null,
    reasoning: `Ambulance ${ambulanceResult.ambulance.id} selected at ${ambulanceResult.route.totalMinutes} minutes; hospital ${hospitalResult.hospital.id} selected at ${hospitalResult.route.totalMinutes} minutes.`
  };
};

const serializeTrip = (trip: TripRecord) => {
  const ambulance = ambulances.find((entry) => entry.id === trip.ambulanceId);
  const hospital = hospitals.find((entry) => entry.id === trip.hospitalId);
  const incidentToHospital = trip.pathToHospital && trip.timeToHospitalMinutes !== undefined
    ? { reachable: true, path: trip.pathToHospital, totalMinutes: trip.timeToHospitalMinutes }
    : dijkstra(trip.incidentLocationId, trip.hospitalLocationId ?? hospital?.locationId ?? '');
  const ambulanceToIncident = trip.pathToIncident && trip.timeToIncidentMinutes !== undefined
    ? { reachable: true, path: trip.pathToIncident, totalMinutes: trip.timeToIncidentMinutes }
    : dijkstra(ambulance?.currentLocationId ?? trip.incidentLocationId, trip.incidentLocationId);
  const pathToIncident = ambulanceToIncident.reachable ? ambulanceToIncident.path : [];
  const pathToHospital = incidentToHospital.reachable ? incidentToHospital.path : [];
  const timeToIncidentMinutes = ambulanceToIncident.reachable ? ambulanceToIncident.totalMinutes : 0;
  const timeToHospitalMinutes = incidentToHospital.reachable ? incidentToHospital.totalMinutes : 0;

  return {
    ...trip,
    pathToIncident,
    timeToIncidentMinutes,
    pathToHospital,
    timeToHospitalMinutes,
    totalMinutes: timeToIncidentMinutes + timeToHospitalMinutes,
    blocked: trip.blocked ?? (!ambulanceToIncident.reachable || !incidentToHospital.reachable),
    startTime: trip.startTime ?? trip.createdAt,
    endTime: trip.endTime ?? null,
    reasoning: trip.reasoning ?? 'Route legs calculated from the current road network using shortest travel time.'
  };
};

const serializeAmbulance = (ambulance: (typeof ambulances)[number]) => {
  const activeTrip = trips.find((trip) => trip.ambulanceId === ambulance.id && !trip.completed);
  return {
    ...ambulance,
    assignedRequestId: ambulance.assignedRequestId ?? activeTrip?.requestId ?? null,
    assignedHospitalId: ambulance.assignedHospitalId ?? activeTrip?.hospitalId ?? null,
    totalTripsCompleted: trips.filter((trip) => trip.ambulanceId === ambulance.id && trip.completed).length,
  };
};

router.get('/stats', (_req, res) => {
  res.json(getStats());
});

router.get('/requests', (_req, res) => {
  res.json(requests.slice().sort(sortByPriority));
});

router.post('/requests', (req, res) => {
  const { callerName, contactNumber, incidentLocationId, severity, requiredFacility, description } = req.body ?? {};
  if (!callerName || !contactNumber || !incidentLocationId || !severity || !requiredFacility) {
    return res.status(400).json({ error: 'Missing required request fields' });
  }

  const normalizedSeverity = String(severity).toUpperCase();
  const safeSeverity: Severity = normalizedSeverity === 'CRITICAL' || normalizedSeverity === 'SERIOUS' || normalizedSeverity === 'MINOR'
    ? normalizedSeverity
    : 'MINOR';

  const request: RequestRecord = {
    id: `REQ-${Date.now()}`,
    callerName,
    contactNumber,
    incidentLocationId,
    pickupLocation: incidentLocationId,
    severity: safeSeverity,
    requiredFacility: String(requiredFacility).toUpperCase(),
    status: 'PENDING',
    description: description || 'Emergency call logged by dispatcher',
    createdAt: Date.now(),
    timeline: [],
  };
  requests.unshift(request);
  res.status(201).json(request);
});

router.get('/ambulances', (_req, res) => { res.json(ambulances.map(serializeAmbulance)); });

router.get('/hospitals', (_req, res) => { res.json(hospitals); });

router.patch('/hospitals/:id/capacity', (req, res) => {
  const hospital = hospitals.find((entry) => entry.id === req.params.id);
  if (!hospital) return res.status(404).json({ error: 'Hospital not found' });
  const nextAvailable = Number(req.body?.availableBeds ?? hospital.availableBeds);
  if (Number.isNaN(nextAvailable) || nextAvailable < 0) {
    return res.status(400).json({ error: 'Invalid hospital bed count' });
  }
  hospital.availableBeds = nextAvailable;
  res.json(hospital);
});

router.get('/network', (_req, res) => {
  res.json({ locations, roads: roads.map((road) => ({ ...road, sourceId: road.sourceId, destinationId: road.destinationId, currentMinutes: road.currentMinutes, closed: road.closed })) });
});

router.patch('/roads/:id/traffic', (req, res) => {
  const road = roads.find((entry) => entry.id === req.params.id);
  if (!road) return res.status(404).json({ error: 'Unknown road' });
  const nextMinutes = Number(req.body?.currentMinutes ?? req.body?.travelTimeMinutes ?? road.currentMinutes);
  if (!Number.isFinite(nextMinutes) || nextMinutes <= 0) {
    return res.status(400).json({ error: 'Travel time must be a positive number' });
  }
  road.currentMinutes = nextMinutes;
  road.currentTraffic = nextMinutes >= 8 ? 'Heavy' : nextMinutes >= 6 ? 'Moderate' : 'Low';
  road.lastUpdated = 'Updated now';
  res.json({ recalculations: trips.map((trip) => trip.id) });
});

router.post('/roads/:id/close', (req, res) => {
  const road = roads.find((entry) => entry.id === req.params.id);
  if (!road) return res.status(404).json({ error: 'Unknown road' });
  road.closed = true;
  road.status = 'Closed';
  road.closureReason = req.body?.reason || 'Road closure';
  res.json({ recalculations: trips.map((trip) => trip.id) });
});

router.post('/roads/:id/open', (req, res) => {
  const road = roads.find((entry) => entry.id === req.params.id);
  if (!road) return res.status(404).json({ error: 'Unknown road' });
  road.closed = false;
  road.status = 'Open';
  road.closureReason = '';
  res.json({ recalculations: trips.map((trip) => trip.id) });
});

router.get('/route', (req, res) => {
  const start = String(req.query.from ?? '');
  const end = String(req.query.to ?? '');
  if (!start || !end) return res.status(400).json({ error: 'Missing from and to route parameters' });
  const result = dijkstra(start, end);
  res.json({
    reachable: result.reachable,
    totalMinutes: result.reachable ? result.totalMinutes : null,
    path: result.path,
    nodes: result.path,
  });
});

router.get('/trips', (_req, res) => { res.json(trips.map(serializeTrip)); });

router.post('/trips/:id/complete', (req, res) => {
  const trip = trips.find((entry) => entry.id === req.params.id);
  if (!trip) return res.status(404).json({ error: 'Unknown trip' });
  Object.assign(trip, serializeTrip(trip));
  const ambulance = ambulances.find((entry) => entry.id === trip.ambulanceId);
  if (ambulance) {
    ambulance.status = 'AVAILABLE';
    ambulance.assignedRequestId = null;
    ambulance.assignedHospitalId = null;
    const destinationId = trip.hospitalLocationId ?? hospitals.find((entry) => entry.id === trip.hospitalId)?.locationId ?? 'LOC-10';
    ambulance.currentLocationId = destinationId;
    ambulance.currentLocation = locations.find((entry) => entry.id === destinationId)?.name ?? destinationId;
  }
  trip.status = 'COMPLETED';
  trip.completed = true;
  trip.endTime = Date.now();

  const hospital = hospitals.find((entry) => entry.id === trip.hospitalId);
  if (hospital) {
    hospital.availableBeds = Math.max(0, hospital.availableBeds + 1);
  }

  const nextPendingRequest = requests.filter((request) => request.status === 'PENDING').sort(sortByPriority)[0];
  if (nextPendingRequest) {
    const bestAmbulance = findBestAmbulance(nextPendingRequest.incidentLocationId);
    const bestHospital = findBestHospital(nextPendingRequest.incidentLocationId, nextPendingRequest.requiredFacility ?? 'GENERAL');
    if (bestAmbulance && bestHospital) {
      nextPendingRequest.status = 'DISPATCHED';
      nextPendingRequest.assignedAmbulanceId = bestAmbulance.ambulance.id;
      nextPendingRequest.assignedHospitalId = bestHospital.hospital.id;
      bestAmbulance.ambulance.status = 'DISPATCHED';
      bestAmbulance.ambulance.assignedRequestId = nextPendingRequest.id;
      bestAmbulance.ambulance.assignedHospitalId = bestHospital.hospital.id;
      bestHospital.hospital.availableBeds = Math.max(0, bestHospital.hospital.availableBeds - 1);
      trips.push(createTrip(nextPendingRequest, bestAmbulance, bestHospital));
    }
  }

  res.json({ success: true, message: 'Trip completed and next eligible request was dispatched.', trip: serializeTrip(trip) });
});

router.post('/dispatch/next', (_req, res) => {
  const pendingRequests = requests.filter((request) => request.status === 'PENDING').sort(sortByPriority);
  const nextRequest = pendingRequests[0];
  if (!nextRequest) return res.status(404).json({ error: 'No pending requests to dispatch' });
  const bestAmbulance = findBestAmbulance(nextRequest.incidentLocationId);
  if (!bestAmbulance) return res.status(409).json({ error: 'No ambulance available for this request' });
  const bestHospital = findBestHospital(nextRequest.incidentLocationId, nextRequest.requiredFacility || 'GENERAL');
  if (!bestHospital) return res.status(409).json({ error: 'No suitable hospital for the required facility' });

  nextRequest.status = 'DISPATCHED';
  nextRequest.assignedAmbulanceId = bestAmbulance.ambulance.id;
  nextRequest.assignedHospitalId = bestHospital.hospital.id;
  bestAmbulance.ambulance.status = 'DISPATCHED';
  bestAmbulance.ambulance.assignedRequestId = nextRequest.id;
  bestAmbulance.ambulance.assignedHospitalId = bestHospital.hospital.id;
  bestHospital.hospital.availableBeds = Math.max(0, bestHospital.hospital.availableBeds - 1);

  const trip = createTrip(nextRequest, bestAmbulance, bestHospital);

  trips.push(trip);
  res.json({ ...serializeTrip(trip), selectedAmbulance: serializeAmbulance(bestAmbulance.ambulance), selectedHospital: bestHospital.hospital });
});

router.post('/dispatch/:requestId', (req, res) => {
  const request = requests.find((entry) => entry.id === req.params.requestId);
  if (!request) return res.status(404).json({ error: 'Request not found' });
  const bestAmbulance = findBestAmbulance(request.incidentLocationId);
  if (!bestAmbulance) return res.status(409).json({ error: 'No ambulance available for this request' });
  const bestHospital = findBestHospital(request.incidentLocationId, request.requiredFacility || 'GENERAL');
  if (!bestHospital) return res.status(409).json({ error: 'No suitable hospital for the required facility' });

  request.status = 'DISPATCHED';
  request.assignedAmbulanceId = bestAmbulance.ambulance.id;
  request.assignedHospitalId = bestHospital.hospital.id;
  bestAmbulance.ambulance.status = 'DISPATCHED';
  bestAmbulance.ambulance.assignedRequestId = request.id;
  bestAmbulance.ambulance.assignedHospitalId = bestHospital.hospital.id;
  bestHospital.hospital.availableBeds = Math.max(0, bestHospital.hospital.availableBeds - 1);

  const trip = createTrip(request, bestAmbulance, bestHospital);

  trips.push(trip);
  res.json({ ...serializeTrip(trip), selectedAmbulance: serializeAmbulance(bestAmbulance.ambulance), selectedHospital: bestHospital.hospital });
});

router.post('/reset', (_req, res) => {
  const resetRequests: RequestRecord[] = [
    { id: 'REQ-2026-001', callerName: 'John Doe', contactNumber: '+91 9876543210', incidentLocationId: 'LOC-09', pickupLocation: 'Market', severity: 'CRITICAL', requiredFacility: 'TRAUMA', status: 'DISPATCHED', description: 'Road accident at market', createdAt: Date.now() - 900000, assignedAmbulanceId: 'A001', assignedHospitalId: 'H001', timeline: [] },
    { id: 'REQ-2026-002', callerName: 'Mary Smith', contactNumber: '+91 9876543211', incidentLocationId: 'LOC-01', pickupLocation: 'Central Junction', severity: 'CRITICAL', requiredFacility: 'CARDIAC', status: 'PENDING', description: 'Chest pain', createdAt: Date.now() - 480000, timeline: [] },
    { id: 'REQ-2026-003', callerName: 'Ramesh Kumar', contactNumber: '+91 9876543212', incidentLocationId: 'LOC-02', pickupLocation: 'Anna Nagar', severity: 'SERIOUS', requiredFacility: 'TRAUMA', status: 'PENDING', description: 'Breathing difficulty', createdAt: Date.now() - 720000, timeline: [] },
    { id: 'REQ-2026-004', callerName: 'Priya Sharma', contactNumber: '+91 9876543213', incidentLocationId: 'LOC-06', pickupLocation: 'Industrial Area', severity: 'CRITICAL', requiredFacility: 'TRAUMA', status: 'PENDING', description: 'Worker collapsed', createdAt: Date.now() - 240000, timeline: [] },
    { id: 'REQ-2026-005', callerName: 'Ahmed Khan', contactNumber: '+91 9876543214', incidentLocationId: 'LOC-07', pickupLocation: 'Railway Station', severity: 'CRITICAL', requiredFacility: 'PEDIATRICS', status: 'ASSIGNED', description: 'Severe bleeding', createdAt: Date.now() - 600000, assignedAmbulanceId: 'A003', assignedHospitalId: 'H003', timeline: [] },
    { id: 'REQ-2026-009', callerName: 'David Wilson', contactNumber: '+91 9876543218', incidentLocationId: 'LOC-05', pickupLocation: 'Government School', severity: 'MINOR', requiredFacility: 'GENERAL', status: 'PENDING', description: 'Ankle sprain', createdAt: Date.now() - 1080000, timeline: [] },
  ];
  requests.splice(0, requests.length, ...resetRequests);
  trips.splice(0, trips.length, { id: 'TRIP-1001', requestId: 'REQ-2026-001', ambulanceId: 'A001', hospitalId: 'H001', incidentLocationId: 'LOC-09', hospitalLocationId: 'LOC-10', status: 'ACTIVE', route: ['LOC-09', 'LOC-10'], totalMinutes: 14, createdAt: Date.now() - 600000, completed: false });
  hospitals.forEach((hospital) => {
    if (hospital.id === 'H001') hospital.availableBeds = 38;
    if (hospital.id === 'H002') hospital.availableBeds = 22;
    if (hospital.id === 'H003') hospital.availableBeds = 15;
    if (hospital.id === 'H004') hospital.availableBeds = 12;
  });
  ambulances.forEach((ambulance) => {
    if (ambulance.id === 'A001') {
      ambulance.status = 'DISPATCHED';
      ambulance.assignedRequestId = 'REQ-2026-001';
      ambulance.assignedHospitalId = 'H001';
    } else if (ambulance.id === 'A004') {
      ambulance.status = 'TRANSPORTING';
      ambulance.assignedRequestId = null;
      ambulance.assignedHospitalId = 'H001';
    } else {
      ambulance.status = 'AVAILABLE';
      ambulance.assignedRequestId = null;
      ambulance.assignedHospitalId = null;
    }
  });
  res.json({ success: true, message: 'Sample data reset to initial state.' });
});

export default router;
