import { Request, Response } from 'express';
import { prisma } from '../config/db';
import { sendSuccess, sendError } from '../utils/response';
import { HospitalStatusEnum } from '@prisma/client';

export const getAllHospitals = async (req: Request, res: Response) => {
  try {
    const hospitals = await prisma.hospital.findMany({
      orderBy: { availableBeds: 'desc' },
    });
    return sendSuccess(res, hospitals);
  } catch (err: any) {
    return sendError(res, err.message || 'Failed to fetch hospitals', 500);
  }
};

export const getHospitalById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const hospital = await prisma.hospital.findUnique({
      where: { id },
    });
    if (!hospital) return sendError(res, 'Hospital not found', 404);
    return sendSuccess(res, hospital);
  } catch (err: any) {
    return sendError(res, err.message || 'Failed to fetch hospital', 500);
  }
};

export const createHospital = async (req: Request, res: Response) => {
  try {
    const { name, address, location, contactNumber, type, totalBeds, availableBeds, facilities, id } = req.body ?? {};

    const hospName = typeof name === 'string' ? name.trim() : '';
    if (!hospName || hospName.length < 3 || hospName.length > 100) {
      return sendError(res, 'Hospital name is required (3-100 chars)', 400);
    }
    const existingName = await prisma.hospital.findFirst({
      where: { name: { equals: hospName, mode: 'insensitive' } },
    });
    if (existingName) {
      return sendError(res, `A hospital named "${hospName}" already exists (ID: ${existingName.id})`, 409);
    }

    const addr = typeof address === 'string' ? address.trim() : '';
    if (!addr || addr.length < 3 || addr.length > 200) {
      return sendError(res, 'Hospital address is required (3-200 chars)', 400);
    }

    const phone = typeof contactNumber === 'string' ? contactNumber.trim() : '';
    if (!phone || phone.length < 5 || phone.length > 30) {
      return sendError(res, 'Contact number is required (5-30 chars)', 400);
    }

    const rawLoc = typeof location === 'string' ? location.trim() : '';
    if (!rawLoc) return sendError(res, 'Hospital location is required', 400);
    const loc = await prisma.networkLocation.findFirst({
      where: {
        OR: [
          { id: { equals: rawLoc, mode: 'insensitive' } },
          { name: { equals: rawLoc, mode: 'insensitive' } },
        ],
      },
    });
    if (!loc) return sendError(res, `Unknown network location: "${rawLoc}"`, 400);

    const total = Number(totalBeds);
    if (!Number.isInteger(total) || total < 1) {
      return sendError(res, 'Total beds must be an integer of at least 1', 400);
    }
    const avail = availableBeds !== undefined ? Number(availableBeds) : Math.min(total, 20);
    if (!Number.isInteger(avail) || avail < 0) {
      return sendError(res, 'Available beds must be a non-negative integer', 400);
    }
    if (avail > total) {
      return sendError(res, `Available beds (${avail}) cannot exceed total beds (${total})`, 400);
    }

    let hospId = id && typeof id === 'string' ? id.trim().toUpperCase() : null;
    if (hospId) {
      const existingId = await prisma.hospital.findUnique({ where: { id: hospId } });
      if (existingId) return sendError(res, `Hospital ID "${hospId}" already exists`, 409);
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

    const hospital = await prisma.$transaction(async (db) => {
      await db.networkLocation.updateMany({
        where: { name: loc.name, category: { not: 'Hospital' } },
        data: { category: 'Hospital' },
      });

      const created = await db.hospital.create({
        data: {
          id: hospId!,
          name: hospName,
          address: addr,
          location: loc.name,
          contactNumber: phone,
          type: type || 'General Emergency',
          totalBeds: total,
          availableBeds: avail,
          status: HospitalStatusEnum.NORMAL,
          facilities: facilityList,
        },
      });

      await db.notification.create({
        data: {
          recipientId: null,
          title: 'Hospital Added to Network',
          message: `Hospital ${created.name} (${created.id}) registered at ${created.location} with ${created.availableBeds}/${created.totalBeds} beds.`,
          type: 'INFO',
        },
      });

      return created;
    });

    return sendSuccess(res, hospital, 'Hospital added successfully', 201);
  } catch (err: any) {
    return sendError(res, err.message || 'Failed to create hospital', 500);
  }
};

export const updateHospitalCapacity = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { availableBeds, totalBeds, status } = req.body ?? {};
    const current = await prisma.hospital.findUnique({ where: { id } });
    if (!current) return sendError(res, 'Hospital not found', 404);

    const nextTotal = totalBeds === undefined ? current.totalBeds : Number(totalBeds);
    const nextAvailable = availableBeds === undefined ? current.availableBeds : Number(availableBeds);
    if (!Number.isInteger(nextTotal) || nextTotal < 1
      || !Number.isInteger(nextAvailable) || nextAvailable < 0
      || nextAvailable > nextTotal) {
      return sendError(res, 'Total beds must be >= 1, available beds >= 0, and available beds cannot exceed total beds', 400);
    }

    let mappedStatus: HospitalStatusEnum | undefined;
    if (status) {
      const s = String(status).toUpperCase();
      if (s.includes('CRITICAL')) mappedStatus = HospitalStatusEnum.CRITICAL;
      else if (s.includes('HIGH') || s.includes('LOAD')) mappedStatus = HospitalStatusEnum.HIGH_LOAD;
      else mappedStatus = HospitalStatusEnum.NORMAL;
    } else {
      if (nextAvailable === 0) mappedStatus = HospitalStatusEnum.CRITICAL;
      else if (nextAvailable <= Math.max(1, Math.floor(nextTotal * 0.1))) mappedStatus = HospitalStatusEnum.HIGH_LOAD;
      else mappedStatus = HospitalStatusEnum.NORMAL;
    }

    const updated = await prisma.$transaction(async (db) => {
      const resHospital = await db.hospital.update({
        where: { id },
        data: {
          availableBeds: nextAvailable,
          totalBeds: nextTotal,
          ...(mappedStatus ? { status: mappedStatus } : {}),
        },
      });

      if (nextAvailable === 0 || mappedStatus === HospitalStatusEnum.CRITICAL) {
        await db.notification.create({
          data: {
            recipientId: null,
            title: `Hospital Capacity Critical: ${resHospital.name}`,
            message: `Hospital ${resHospital.name} has critical bed availability (${resHospital.availableBeds}/${resHospital.totalBeds} beds).`,
            type: 'CRITICAL',
          },
        });
      }

      return resHospital;
    });

    return sendSuccess(res, updated, 'Hospital capacity updated');
  } catch (err: any) {
    return sendError(res, err.message || 'Failed to update hospital capacity', 500);
  }
};
