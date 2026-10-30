import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../config/db';
import { sendSuccess, sendError } from '../utils/response';
import { TripStatusEnum, AmbulanceStatusEnum, EmergencyStatusEnum } from '@prisma/client';

export const getAllTrips = async (req: Request, res: Response) => {
  try {
    const trips = await prisma.trip.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        ambulance: true,
        hospital: true,
        emergency: true,
      },
    });
    return sendSuccess(res, trips);
  } catch (err: any) {
    return sendError(res, err.message || 'Failed to fetch trips', 500);
  }
};

export const getTripById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const trip = await prisma.trip.findUnique({
      where: { id },
      include: {
        ambulance: true,
        hospital: true,
        emergency: true,
      },
    });
    if (!trip) return sendError(res, 'Trip record not found', 404);
    return sendSuccess(res, trip);
  } catch (err: any) {
    return sendError(res, err.message || 'Failed to fetch trip', 500);
  }
};

const VALID_TRIP_TRANSITIONS: Record<TripStatusEnum, TripStatusEnum[]> = {
  [TripStatusEnum.DISPATCHED]: [TripStatusEnum.EN_ROUTE_PICKUP, TripStatusEnum.AT_SCENE, TripStatusEnum.CANCELLED],
  [TripStatusEnum.EN_ROUTE_PICKUP]: [TripStatusEnum.AT_SCENE, TripStatusEnum.CANCELLED],
  [TripStatusEnum.AT_SCENE]: [TripStatusEnum.TRANSPORTING, TripStatusEnum.CANCELLED],
  [TripStatusEnum.TRANSPORTING]: [TripStatusEnum.ARRIVED_HOSPITAL, TripStatusEnum.COMPLETED, TripStatusEnum.CANCELLED],
  [TripStatusEnum.ARRIVED_HOSPITAL]: [TripStatusEnum.COMPLETED, TripStatusEnum.CANCELLED],
  [TripStatusEnum.COMPLETED]: [],
  [TripStatusEnum.CANCELLED]: [],
};

export const updateTripStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;
    if (typeof status !== 'string') return sendError(res, 'A valid trip status is required', 400);
    const normalized = status.toUpperCase().replace(/\s+/g, '_');
    const statuses = Object.values(TripStatusEnum) as string[];
    if (!statuses.includes(normalized)) return sendError(res, `Unsupported trip status "${status}"`, 400);
    const mappedStatus = normalized as TripStatusEnum;
    if (notes !== undefined && (typeof notes !== 'string' || notes.length > 500)) {
      return sendError(res, 'Notes must be 500 characters or fewer', 400);
    }

    const userId = (req as any).user?.userId ?? null;
    const username = (req as any).user?.username ?? 'Dispatch desk';

    const updatedTrip = await prisma.$transaction(async (db) => {
      const currentTrip = await db.trip.findUnique({ where: { id } });
      if (!currentTrip) return null;
      if (currentTrip.status === TripStatusEnum.COMPLETED || currentTrip.status === TripStatusEnum.CANCELLED) {
        throw new Error('Trip is already finished');
      }

      if (mappedStatus === currentTrip.status) {
        return currentTrip;
      }

      const allowedTransitions = VALID_TRIP_TRANSITIONS[currentTrip.status] || [];
      if (!allowedTransitions.includes(mappedStatus)) {
        const err: any = new Error(`Invalid status transition from ${currentTrip.status} to ${mappedStatus}`);
        err.statusCode = 400;
        throw err;
      }

      const isFinished = mappedStatus === TripStatusEnum.COMPLETED || mappedStatus === TripStatusEnum.CANCELLED;
      const claim = await db.trip.updateMany({
        where: { id, status: { notIn: [TripStatusEnum.COMPLETED, TripStatusEnum.CANCELLED] } },
        data: {
          status: mappedStatus,
          ...(isFinished ? { endTime: new Date() } : {}),
        },
      });
      if (claim.count !== 1) throw new Error('Trip changed concurrently; refresh and retry');

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
        await db.notification.create({
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
        await db.notification.create({
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

    if (!updatedTrip) return sendError(res, 'Trip not found', 404);
    return sendSuccess(res, updatedTrip, 'Trip status updated successfully');
  } catch (err: any) {
    if (err.statusCode === 400) {
      return sendError(res, err.message, 400);
    }
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2034') {
      return sendError(res, 'Concurrent trip update detected; refresh and retry', 409);
    }
    if (err.message === 'Trip is already finished' || err.message === 'Trip changed concurrently; refresh and retry') {
      return sendError(res, err.message, 409);
    }
    return sendError(res, err.message || 'Failed to update trip status', 500);
  }
};

export const completeTrip = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user?.userId ?? null;
    const username = (req as any).user?.username ?? 'Dispatch desk';

    const completed = await prisma.$transaction(async (db) => {
      const currentTrip = await db.trip.findUnique({ where: { id } });
      if (!currentTrip) return null;
      if (currentTrip.status === TripStatusEnum.COMPLETED || currentTrip.status === TripStatusEnum.CANCELLED) {
        throw new Error('Trip is already finished');
      }

      const claim = await db.trip.updateMany({
        where: { id, status: { notIn: [TripStatusEnum.COMPLETED, TripStatusEnum.CANCELLED] } },
        data: { status: TripStatusEnum.COMPLETED, endTime: new Date() },
      });
      if (claim.count !== 1) throw new Error('Trip changed concurrently; refresh and retry');

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

      await db.notification.create({
        data: {
          title: 'Trip completed',
          message: `Trip ${currentTrip.id} completed; ambulance ${currentTrip.ambulanceId} and hospital capacity released.`,
          type: 'SUCCESS',
        },
      });

      return db.trip.findUnique({
        where: { id },
        include: { ambulance: true, hospital: true, emergency: true },
      });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

    if (!completed) return sendError(res, 'Trip not found', 404);
    return sendSuccess(res, completed, 'Trip completed successfully');
  } catch (err: any) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2034') {
      return sendError(res, 'Concurrent trip update detected; refresh and retry', 409);
    }
    if (err.message === 'Trip is already finished' || err.message === 'Trip changed concurrently; refresh and retry') {
      return sendError(res, err.message, 409);
    }
    return sendError(res, err.message || 'Failed to complete trip', 500);
  }
};

export const cancelTrip = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { reason } = req.body ?? {};
    const userId = (req as any).user?.userId ?? null;
    const username = (req as any).user?.username ?? 'Dispatch desk';

    const cancelled = await prisma.$transaction(async (db) => {
      const currentTrip = await db.trip.findUnique({ where: { id } });
      if (!currentTrip) return null;
      if (currentTrip.status === TripStatusEnum.COMPLETED || currentTrip.status === TripStatusEnum.CANCELLED) {
        throw new Error('Trip is already finished');
      }

      const claim = await db.trip.updateMany({
        where: { id, status: { notIn: [TripStatusEnum.COMPLETED, TripStatusEnum.CANCELLED] } },
        data: { status: TripStatusEnum.CANCELLED, endTime: new Date() },
      });
      if (claim.count !== 1) throw new Error('Trip changed concurrently; refresh and retry');

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

      await db.notification.create({
        data: {
          title: 'Trip cancelled',
          message: `Trip ${currentTrip.id} cancelled; ambulance ${currentTrip.ambulanceId} and hospital bed released.`,
          type: 'WARNING',
        },
      });

      return db.trip.findUnique({
        where: { id },
        include: { ambulance: true, hospital: true, emergency: true },
      });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

    if (!cancelled) return sendError(res, 'Trip not found', 404);
    return sendSuccess(res, cancelled, 'Trip cancelled successfully');
  } catch (err: any) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2034') {
      return sendError(res, 'Concurrent trip update detected; refresh and retry', 409);
    }
    if (err.message === 'Trip is already finished' || err.message === 'Trip changed concurrently; refresh and retry') {
      return sendError(res, err.message, 409);
    }
    return sendError(res, err.message || 'Failed to cancel trip', 500);
  }
};
