import { Request, Response } from 'express';
import { prisma } from '../config/db';
import { sendSuccess, sendError } from '../utils/response';
import { AmbulanceStatusEnum } from '@prisma/client';

export const getAllAmbulances = async (req: Request, res: Response) => {
  try {
    const ambulances = await prisma.ambulance.findMany({
      orderBy: { registrationNumber: 'asc' },
    });
    return sendSuccess(res, ambulances);
  } catch (err: any) {
    return sendError(res, err.message || 'Failed to fetch ambulances', 500);
  }
};

export const getAmbulanceById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const ambulance = await prisma.ambulance.findUnique({
      where: { id },
      include: { locationHistory: true, trips: true },
    });
    if (!ambulance) return sendError(res, 'Ambulance not found', 404);
    return sendSuccess(res, ambulance);
  } catch (err: any) {
    return sendError(res, err.message || 'Failed to fetch ambulance', 500);
  }
};

export const createAmbulance = async (req: Request, res: Response) => {
  try {
    const { registrationNumber, driverName, driverContact, currentLocation, equipmentType, id } = req.body ?? {};

    const reg = typeof registrationNumber === 'string' ? registrationNumber.trim().toUpperCase() : '';
    if (!reg || reg.length < 3 || reg.length > 50) {
      return sendError(res, 'Registration number is required (3-50 chars)', 400);
    }
    const existingReg = await prisma.ambulance.findUnique({ where: { registrationNumber: reg } });
    if (existingReg) {
      return sendError(res, `Ambulance registration "${reg}" already exists (ID: ${existingReg.id})`, 409);
    }

    const driver = typeof driverName === 'string' ? driverName.trim() : '';
    if (!driver || driver.length < 2 || driver.length > 100) {
      return sendError(res, 'Driver name is required (2-100 chars)', 400);
    }

    const contact = typeof driverContact === 'string' ? driverContact.trim() : '';
    if (!contact || contact.length < 5 || contact.length > 30) {
      return sendError(res, 'Driver contact number is required (5-30 chars)', 400);
    }

    const rawLoc = typeof currentLocation === 'string' ? currentLocation.trim() : '';
    if (!rawLoc) {
      return sendError(res, 'Current location is required', 400);
    }
    const loc = await prisma.networkLocation.findFirst({
      where: {
        OR: [
          { id: { equals: rawLoc, mode: 'insensitive' } },
          { name: { equals: rawLoc, mode: 'insensitive' } },
        ],
      },
    });
    if (!loc) {
      return sendError(res, `Unknown network location: "${rawLoc}"`, 400);
    }

    let ambId = id && typeof id === 'string' ? id.trim().toUpperCase() : null;
    if (ambId) {
      const existingId = await prisma.ambulance.findUnique({ where: { id: ambId } });
      if (existingId) return sendError(res, `Ambulance ID "${ambId}" already exists`, 409);
    } else {
      const allAmbs = await prisma.ambulance.findMany({ select: { id: true } });
      const maxNum = allAmbs.reduce((max, a) => {
        const match = a.id.match(/^A(\d+)$/i);
        return match ? Math.max(max, parseInt(match[1], 10)) : max;
      }, 0);
      ambId = `A${String(maxNum + 1).padStart(3, '0')}`;
    }

    const amb = await prisma.$transaction(async (db) => {
      const created = await db.ambulance.create({
        data: {
          id: ambId!,
          registrationNumber: reg,
          driverName: driver,
          driverContact: contact,
          currentLocation: loc.name,
          equipmentType: equipmentType || 'ALS',
          status: AmbulanceStatusEnum.AVAILABLE,
          isAvailable: true,
        },
      });

      await db.ambulanceLocationHistory.create({
        data: {
          ambulanceId: created.id,
          location: loc.name,
        },
      });

      await db.notification.create({
        data: {
          recipientId: null,
          title: 'Ambulance Added to Fleet',
          message: `Ambulance ${created.id} (${created.registrationNumber}) stationed at ${created.currentLocation}.`,
          type: 'INFO',
        },
      });

      return created;
    });

    return sendSuccess(res, amb, 'Ambulance added successfully', 201);
  } catch (err: any) {
    return sendError(res, err.message || 'Failed to create ambulance', 500);
  }
};

export const updateAmbulanceStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, currentLocation } = req.body ?? {};

    const ambulance = await prisma.ambulance.findUnique({
      where: { id },
      include: {
        trips: {
          where: { status: { notIn: ['COMPLETED', 'CANCELLED'] } },
        },
      },
    });
    if (!ambulance) return sendError(res, 'Ambulance not found', 404);

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
        return sendError(res, `Invalid ambulance status: "${status}"`, 400);
      }
    }

    const activeTrip = ambulance.trips[0];
    if (activeTrip && ([AmbulanceStatusEnum.AVAILABLE, AmbulanceStatusEnum.MAINTENANCE, AmbulanceStatusEnum.OFF_DUTY] as AmbulanceStatusEnum[]).includes(mappedStatus)) {
      return sendError(
        res,
        `Cannot set ambulance ${id} to ${mappedStatus}: unit is actively assigned to trip ${activeTrip.id}. Complete or cancel the trip first.`,
        409
      );
    }

    let newLocationName = ambulance.currentLocation;
    if (currentLocation && typeof currentLocation === 'string' && currentLocation.trim()) {
      const rawLoc = currentLocation.trim();
      const loc = await prisma.networkLocation.findFirst({
        where: {
          OR: [
            { id: { equals: rawLoc, mode: 'insensitive' } },
            { name: { equals: rawLoc, mode: 'insensitive' } },
          ],
        },
      });
      if (!loc) return sendError(res, `Unknown network location: "${rawLoc}"`, 400);
      newLocationName = loc.name;
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

      if (mappedStatus !== ambulance.status || newLocationName !== ambulance.currentLocation) {
        await db.notification.create({
          data: {
            recipientId: null,
            title: `Ambulance ${amb.id} Updated`,
            message: `Ambulance ${amb.id} status is now ${amb.status} at ${amb.currentLocation}.`,
            type: amb.status === AmbulanceStatusEnum.MAINTENANCE ? 'WARNING' : 'INFO',
          },
        });
      }

      return amb;
    });

    return sendSuccess(res, updated, 'Ambulance status updated');
  } catch (err: any) {
    return sendError(res, err.message || 'Failed to update ambulance', 500);
  }
};
