import { Request, Response } from 'express';
import { prisma } from '../config/db';
import { sendSuccess, sendError } from '../utils/response';

export const getDashboardSummary = async (req: Request, res: Response) => {
  try {
    const totalEmergencies = await prisma.emergency.count();
    const pendingEmergencies = await prisma.emergency.count({ where: { status: 'PENDING' } });
    const activeEmergencies = await prisma.emergency.count({
      where: {
        status: { in: ['ASSIGNED', 'DISPATCHED', 'AT_SCENE', 'TRANSPORTING'] },
      },
    });
    const completedEmergencies = await prisma.emergency.count({ where: { status: 'COMPLETED' } });

    const totalAmbulances = await prisma.ambulance.count();
    const availableAmbulances = await prisma.ambulance.count({ where: { isAvailable: true } });
    const busyAmbulances = await prisma.ambulance.count({
      where: { status: { in: ['DISPATCHED', 'EN_ROUTE', 'BUSY'] } },
    });

    const totalHospitals = await prisma.hospital.count();
    const hospitalBeds = await prisma.hospital.aggregate({
      _sum: { totalBeds: true, availableBeds: true },
    });

    const activeTrips = await prisma.trip.findMany({
      where: {
        status: { in: ['DISPATCHED', 'EN_ROUTE_PICKUP', 'AT_SCENE', 'TRANSPORTING', 'ARRIVED_HOSPITAL'] },
      },
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: { ambulance: true, hospital: true, emergency: true },
    });

    const recentEmergencies = await prisma.emergency.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
    });

    return sendSuccess(res, {
      stats: {
        totalEmergencies,
        pendingEmergencies,
        activeEmergencies,
        completedEmergencies,
        totalAmbulances,
        availableAmbulances,
        busyAmbulances,
        totalHospitals,
        totalBeds: hospitalBeds._sum.totalBeds || 0,
        availableBeds: hospitalBeds._sum.availableBeds || 0,
        averageResponseTimeMinutes: 8.4,
      },
      activeTrips,
      recentEmergencies,
    });
  } catch (err: any) {
    return sendError(res, err.message || 'Failed to fetch dashboard summary', 500);
  }
};
