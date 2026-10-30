import {
  PrismaClient,
  RoleEnum,
  AmbulanceStatusEnum,
  HospitalStatusEnum,
  EmergencySeverityEnum,
  EmergencyStatusEnum,
  TrafficConditionEnum,
  RoadStatusEnum,
} from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting safe database seeding for Nalam Nagar System...');

  const defaultPasswordHash = await bcrypt.hash('123456', 10);

  // 1. Seed Network Locations (12 Canonical Town Nodes)
  const networkLocationsData = [
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

  for (const loc of networkLocationsData) {
    await prisma.networkLocation.upsert({
      where: { id: loc.id },
      update: loc,
      create: loc,
    });
  }
  console.log(`✅ ${networkLocationsData.length} Network locations seeded successfully`);

  // 2. Seed Users (Safe upsert, preserving any existing users)
  const usersData = [
    {
      username: 'operator01',
      email: 'operator01@nalamnagar.gov.in',
      passwordHash: defaultPasswordHash,
      name: 'Karthik Subramanian',
      role: RoleEnum.DISPATCHER,
      badgeId: 'DISP-4091',
      department: 'Central Command & Control Room',
    },
    {
      username: 'admin',
      email: 'admin@nalamnagar.gov.in',
      passwordHash: defaultPasswordHash,
      name: 'Dr. Ananya Ramesh',
      role: RoleEnum.ADMIN,
      badgeId: 'ADM-1001',
      department: 'Emergency Services Directorate',
    },
    {
      username: 'driver01',
      email: 'driver01@nalamnagar.gov.in',
      passwordHash: defaultPasswordHash,
      name: 'Rajesh Kumar',
      role: RoleEnum.AMBULANCE_STAFF,
      badgeId: 'AMB-8802',
      department: 'Rapid Response Fleet',
    },
    {
      username: 'citizen01',
      email: 'citizen@example.com',
      passwordHash: defaultPasswordHash,
      name: 'Priya Sundaram',
      role: RoleEnum.CITIZEN,
      badgeId: 'CIT-5021',
      department: 'Public Sector',
    },
  ];

  for (const user of usersData) {
    await prisma.user.upsert({
      where: { username: user.username },
      update: {
        role: user.role,
        name: user.name,
      },
      create: user,
    });
  }
  console.log('✅ Default users seeded successfully');

  // 3. Seed Hospitals (4 Specialized Facilities)
  const hospitalsData = [
    {
      id: 'H001',
      name: 'City General Hospital',
      address: 'City Hospital Zone, Ward 1',
      location: 'City Hospital',
      contactNumber: '+91 422 2300 001',
      type: 'Level 1 Trauma & Cardiac Center',
      totalBeds: 250,
      availableBeds: 38,
      status: HospitalStatusEnum.NORMAL,
      facilities: ['TRAUMA', 'CARDIAC', 'PEDIATRICS', 'GENERAL', 'ICU'],
    },
    {
      id: 'H002',
      name: 'Trauma Care Speciality Hospital',
      address: 'East Highway Sector, Ward 2',
      location: 'Trauma Hospital',
      contactNumber: '+91 422 2400 002',
      type: 'Specialized Trauma Care Facility',
      totalBeds: 180,
      availableBeds: 22,
      status: HospitalStatusEnum.NORMAL,
      facilities: ['TRAUMA', 'CARDIAC', 'GENERAL', 'ICU'],
    },
    {
      id: 'H003',
      name: 'Emergency Medical Center',
      address: 'West Ring Road, Ward 3',
      location: 'Emergency Hospital',
      contactNumber: '+91 422 2500 003',
      type: 'Trauma & Critical Care Emergency Center',
      totalBeds: 120,
      availableBeds: 15,
      status: HospitalStatusEnum.NORMAL,
      facilities: ['TRAUMA', 'PEDIATRICS', 'GENERAL'],
    },
    {
      id: 'H004',
      name: 'Community Health Hospital',
      address: 'Central Market Junction, Ward 4',
      location: 'Market',
      contactNumber: '+91 422 2600 004',
      type: 'Community Municipal Hospital',
      totalBeds: 60,
      availableBeds: 12,
      status: HospitalStatusEnum.NORMAL,
      facilities: ['PEDIATRICS', 'GENERAL', 'ICU'],
    },
  ];

  for (const hosp of hospitalsData) {
    await prisma.hospital.upsert({
      where: { id: hosp.id },
      update: hosp,
      create: hosp,
    });
  }
  console.log(`✅ ${hospitalsData.length} Hospitals seeded successfully`);

  // 4. Seed Ambulances (5 Active Response Units)
  const ambulancesData = [
    { id: 'A001', registrationNumber: 'TN-09-AX-1001', driverName: 'K. Loganathan', driverContact: '+91 98401 12233', currentLocation: 'Central Junction', status: AmbulanceStatusEnum.AVAILABLE, equipmentType: 'ALS Advanced Cardiac', isAvailable: true, lat: 10.998, lng: 76.962 },
    { id: 'A002', registrationNumber: 'TN-09-AX-1002', driverName: 'M. Selvam', driverContact: '+91 98401 12234', currentLocation: 'Anna Nagar', status: AmbulanceStatusEnum.AVAILABLE, equipmentType: 'BLS Standard', isAvailable: true, lat: 11.015, lng: 76.975 },
    { id: 'A003', registrationNumber: 'TN-09-AX-1003', driverName: 'S. Anthony', driverContact: '+91 98401 12235', currentLocation: 'Gandhi Nagar', status: AmbulanceStatusEnum.AVAILABLE, equipmentType: 'ALS Trauma Unit', isAvailable: true, lat: 10.992, lng: 76.995 },
    { id: 'A004', registrationNumber: 'TN-09-AX-1004', driverName: 'V. Prakash', driverContact: '+91 98401 12236', currentLocation: 'Market', status: AmbulanceStatusEnum.AVAILABLE, equipmentType: 'BLS Neonatal Transport', isAvailable: true, lat: 11.025, lng: 76.935 },
    { id: 'A005', registrationNumber: 'TN-09-AX-1005', driverName: 'R. Ganesan', driverContact: '+91 98401 12237', currentLocation: 'City Hospital', status: AmbulanceStatusEnum.AVAILABLE, equipmentType: 'ALS Ventilator Supported', isAvailable: true, lat: 10.975, lng: 76.955 },
  ];

  for (const amb of ambulancesData) {
    await prisma.ambulance.upsert({
      where: { id: amb.id },
      update: amb,
      create: amb,
    });
  }
  console.log(`✅ ${ambulancesData.length} Ambulances seeded successfully`);

  // 5. Seed Roads Network (22 Bi-directional Edges)
  const roadsData = [
    { id: 'R001', startLocation: 'Central Junction', endLocation: 'Anna Nagar', distanceKm: 3.2, baseTravelTimeMinutes: 5, currentTraffic: TrafficConditionEnum.LOW, speedLimitKmh: 60, status: RoadStatusEnum.OPEN },
    { id: 'R002', startLocation: 'Central Junction', endLocation: 'Gandhi Nagar', distanceKm: 2.5, baseTravelTimeMinutes: 4, currentTraffic: TrafficConditionEnum.LOW, speedLimitKmh: 50, status: RoadStatusEnum.OPEN },
    { id: 'R003', startLocation: 'Central Junction', endLocation: 'Market', distanceKm: 3.8, baseTravelTimeMinutes: 6, currentTraffic: TrafficConditionEnum.MODERATE, speedLimitKmh: 60, status: RoadStatusEnum.OPEN },
    { id: 'R004', startLocation: 'Anna Nagar', endLocation: 'College', distanceKm: 4.0, baseTravelTimeMinutes: 6, currentTraffic: TrafficConditionEnum.MODERATE, speedLimitKmh: 50, status: RoadStatusEnum.OPEN },
    { id: 'R005', startLocation: 'Anna Nagar', endLocation: 'Market', distanceKm: 1.8, baseTravelTimeMinutes: 3, currentTraffic: TrafficConditionEnum.LOW, speedLimitKmh: 40, status: RoadStatusEnum.OPEN },
    { id: 'R006', startLocation: 'Anna Nagar', endLocation: 'City Hospital', distanceKm: 4.5, baseTravelTimeMinutes: 7, currentTraffic: TrafficConditionEnum.LOW, speedLimitKmh: 60, status: RoadStatusEnum.OPEN },
    { id: 'R007', startLocation: 'Gandhi Nagar', endLocation: 'Government School', distanceKm: 3.0, baseTravelTimeMinutes: 5, currentTraffic: TrafficConditionEnum.LOW, speedLimitKmh: 50, status: RoadStatusEnum.OPEN },
    { id: 'R008', startLocation: 'Gandhi Nagar', endLocation: 'Industrial Area', distanceKm: 4.8, baseTravelTimeMinutes: 7, currentTraffic: TrafficConditionEnum.HEAVY, speedLimitKmh: 60, status: RoadStatusEnum.OPEN },
    { id: 'R009', startLocation: 'Gandhi Nagar', endLocation: 'Trauma Hospital', distanceKm: 3.9, baseTravelTimeMinutes: 6, currentTraffic: TrafficConditionEnum.LOW, speedLimitKmh: 60, status: RoadStatusEnum.OPEN },
    { id: 'R010', startLocation: 'College', endLocation: 'Railway Station', distanceKm: 2.2, baseTravelTimeMinutes: 4, currentTraffic: TrafficConditionEnum.LOW, speedLimitKmh: 50, status: RoadStatusEnum.OPEN },
    { id: 'R011', startLocation: 'College', endLocation: 'Emergency Hospital', distanceKm: 5.0, baseTravelTimeMinutes: 8, currentTraffic: TrafficConditionEnum.MODERATE, speedLimitKmh: 60, status: RoadStatusEnum.OPEN },
    { id: 'R012', startLocation: 'Government School', endLocation: 'Bus Stand', distanceKm: 3.5, baseTravelTimeMinutes: 6, currentTraffic: TrafficConditionEnum.MODERATE, speedLimitKmh: 50, status: RoadStatusEnum.OPEN },
    { id: 'R013', startLocation: 'Government School', endLocation: 'Railway Station', distanceKm: 3.1, baseTravelTimeMinutes: 5, currentTraffic: TrafficConditionEnum.LOW, speedLimitKmh: 50, status: RoadStatusEnum.OPEN },
    { id: 'R014', startLocation: 'Market', endLocation: 'City Hospital', distanceKm: 3.0, baseTravelTimeMinutes: 5, currentTraffic: TrafficConditionEnum.LOW, speedLimitKmh: 50, status: RoadStatusEnum.OPEN },
    { id: 'R015', startLocation: 'Market', endLocation: 'Emergency Hospital', distanceKm: 5.5, baseTravelTimeMinutes: 9, currentTraffic: TrafficConditionEnum.HEAVY, speedLimitKmh: 60, status: RoadStatusEnum.OPEN },
    { id: 'R016', startLocation: 'Industrial Area', endLocation: 'Trauma Hospital', distanceKm: 5.2, baseTravelTimeMinutes: 8, currentTraffic: TrafficConditionEnum.MODERATE, speedLimitKmh: 60, status: RoadStatusEnum.OPEN },
    { id: 'R017', startLocation: 'Industrial Area', endLocation: 'Bus Stand', distanceKm: 4.2, baseTravelTimeMinutes: 7, currentTraffic: TrafficConditionEnum.LOW, speedLimitKmh: 50, status: RoadStatusEnum.OPEN },
    { id: 'R018', startLocation: 'Railway Station', endLocation: 'Emergency Hospital', distanceKm: 4.1, baseTravelTimeMinutes: 7, currentTraffic: TrafficConditionEnum.LOW, speedLimitKmh: 60, status: RoadStatusEnum.OPEN },
    { id: 'R019', startLocation: 'Bus Stand', endLocation: 'City Hospital', distanceKm: 2.4, baseTravelTimeMinutes: 4, currentTraffic: TrafficConditionEnum.LOW, speedLimitKmh: 50, status: RoadStatusEnum.OPEN },
    { id: 'R020', startLocation: 'Bus Stand', endLocation: 'Railway Station', distanceKm: 1.9, baseTravelTimeMinutes: 3, currentTraffic: TrafficConditionEnum.LOW, speedLimitKmh: 50, status: RoadStatusEnum.OPEN },
    { id: 'R021', startLocation: 'City Hospital', endLocation: 'Trauma Hospital', distanceKm: 5.0, baseTravelTimeMinutes: 8, currentTraffic: TrafficConditionEnum.LOW, speedLimitKmh: 60, status: RoadStatusEnum.OPEN },
    { id: 'R022', startLocation: 'Trauma Hospital', endLocation: 'Emergency Hospital', distanceKm: 3.6, baseTravelTimeMinutes: 6, currentTraffic: TrafficConditionEnum.LOW, speedLimitKmh: 50, status: RoadStatusEnum.OPEN },
  ];

  for (const rd of roadsData) {
    await prisma.road.upsert({
      where: { id: rd.id },
      update: rd,
      create: rd,
    });
  }
  console.log(`✅ ${roadsData.length} Roads network seeded successfully`);

  // 6. Seed Emergencies (Initial Priority Triage Queue)
  const emergenciesData = [
    { id: 'REQ-2026-001', callerName: 'Sundararajan', contactNumber: '+91 94432 10987', emergencyType: 'Acute Cardiac Distress', pickupLocation: 'Anna Nagar', severity: EmergencySeverityEnum.CRITICAL, requiredFacility: 'CARDIAC', status: EmergencyStatusEnum.PENDING, dispatchNotes: 'Patient experiencing severe chest pain and breathlessness.' },
    { id: 'REQ-2026-002', callerName: 'Malathi Murugan', contactNumber: '+91 98421 87654', emergencyType: 'Road Traffic Accident', pickupLocation: 'Market', severity: EmergencySeverityEnum.CRITICAL, requiredFacility: 'TRAUMA', status: EmergencyStatusEnum.PENDING, dispatchNotes: 'Two wheeler collision with trauma injury reported.' },
    { id: 'REQ-2026-003', callerName: 'Kavitha Natarajan', contactNumber: '+91 97890 12345', emergencyType: 'High Grade Fever & Seizure', pickupLocation: 'Gandhi Nagar', severity: EmergencySeverityEnum.SERIOUS, requiredFacility: 'PEDIATRICS', status: EmergencyStatusEnum.PENDING, dispatchNotes: 'Pediatric emergency, age 4 years.' },
    { id: 'REQ-2026-004', callerName: 'Ramasamy K.', contactNumber: '+91 96554 32109', emergencyType: 'Home Fall Fracture', pickupLocation: 'Central Junction', severity: EmergencySeverityEnum.MINOR, requiredFacility: 'GENERAL', status: EmergencyStatusEnum.PENDING, dispatchNotes: 'Senior citizen fell from staircase, suspected hip fracture.' },
  ];

  for (const em of emergenciesData) {
    await prisma.emergency.upsert({
      where: { id: em.id },
      update: em,
      create: em,
    });
  }
  console.log(`✅ ${emergenciesData.length} Initial emergencies seeded successfully`);

  console.log('🎉 Database safe seeding finished successfully!');
}

main()
  .catch((e) => {
    console.error('Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
