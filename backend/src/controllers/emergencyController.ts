import { Request, Response } from 'express';
import { randomUUID } from 'node:crypto';
import { prisma } from '../config/db';
import { checkTableExists } from '../utils/tableCheck';
import { sendSuccess, sendError } from '../utils/response';
import { createEmergencySchema, updateEmergencyStatusSchema } from '../validators/schemas';
import { EmergencySeverityEnum, EmergencyStatusEnum } from '@prisma/client';

export const getAllEmergencies = async (req: Request, res: Response) => {
  try {
    const emergencies = await prisma.emergency.findMany({
      orderBy: { createdAt: 'desc' },
      include: { trips: true, statusHistory: true },
    });
    return sendSuccess(res, emergencies);
  } catch (err: any) {
    return sendError(res, err.message || 'Failed to fetch emergencies', 500);
  }
};

export const getEmergencyById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const emergency = await prisma.emergency.findUnique({
      where: { id },
      include: { trips: true, statusHistory: true },
    });
    if (!emergency) return sendError(res, 'Emergency request not found', 404);
    return sendSuccess(res, emergency);
  } catch (err: any) {
    return sendError(res, err.message || 'Failed to fetch emergency', 500);
  }
};

export const createEmergency = async (req: Request, res: Response) => {
  try {
    const validated = createEmergencySchema.parse(req.body);
    const userId = (req as any).user?.userId ?? null;
    const actorName = (req as any).user?.name || (req as any).user?.username || validated.callerName || 'Operator';

    const severityEnum = (validated.severity.toUpperCase()) as EmergencySeverityEnum;

    const emergency = await prisma.$transaction(async (tx) => {
      const created = await tx.emergency.create({
        data: {
          id: `REQ-${randomUUID()}`,
          callerName: validated.callerName,
          contactNumber: validated.contactNumber,
          emergencyType: validated.emergencyType,
          pickupLocation: validated.pickupLocation,
          requiredFacility: validated.requiredFacility,
          severity: severityEnum,
          status: EmergencyStatusEnum.PENDING,
          dispatchNotes: validated.dispatchNotes || null,
          statusHistory: {
            create: {
              status: EmergencyStatusEnum.PENDING,
              changedBy: actorName,
            },
          },
        },
      });

      if (await checkTableExists('Notification')) await tx.notification.create({
        data: {
          recipientId: null,
          title: 'Emergency Request Logged',
          message: `Emergency ${created.id} reported at ${validated.pickupLocation} (${severityEnum} severity).`,
          type: severityEnum === 'CRITICAL' ? 'CRITICAL' : 'EMERGENCY_DISPATCH',
        },
      });

      return created;
    });

    return sendSuccess(res, emergency, 'Emergency request created successfully', 201);
  } catch (err: any) {
    if (err.name === 'ZodError') return sendError(res, 'Invalid emergency payload', 400, err.errors);
    return sendError(res, err.message || 'Failed to create emergency', 500);
  }
};

export const updateEmergencyStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const validated = updateEmergencyStatusSchema.parse(req.body);
    const userId = (req as any).user?.userId ?? null;
    const actorName = (req as any).user?.name || (req as any).user?.username || 'Dispatcher';

    const existing = await prisma.emergency.findUnique({ where: { id } });
    if (!existing) return sendError(res, 'Emergency request not found', 404);

    let mappedStatus: EmergencyStatusEnum = EmergencyStatusEnum.PENDING;
    const s = validated.status.toUpperCase().replace(/\s+/g, '_');
    if (s.includes('ASSIGNED')) mappedStatus = EmergencyStatusEnum.ASSIGNED;
    else if (s.includes('DISPATCH')) mappedStatus = EmergencyStatusEnum.DISPATCHED;
    else if (s.includes('AT_SCENE')) mappedStatus = EmergencyStatusEnum.AT_SCENE;
    else if (s.includes('TRANSPORT')) mappedStatus = EmergencyStatusEnum.TRANSPORTING;
    else if (s.includes('COMPLET')) mappedStatus = EmergencyStatusEnum.COMPLETED;
    else if (s.includes('CANCEL')) mappedStatus = EmergencyStatusEnum.CANCELLED;

    const updated = await prisma.$transaction(async (tx) => {
      const result = await tx.emergency.update({
        where: { id },
        data: {
          status: mappedStatus,
          statusHistory: {
            create: {
              status: mappedStatus,
              changedBy: actorName,
            },
          },
        },
      });

      if (await checkTableExists('Notification')) await tx.notification.create({
        data: {
          recipientId: null,
          title: 'Emergency Status Updated',
          message: `Emergency ${id} transitioned from ${existing.status} to ${mappedStatus}.`,
          type: 'EMERGENCY_DISPATCH',
        },
      });

      return result;
    });

    return sendSuccess(res, updated, 'Emergency status updated');
  } catch (err: any) {
    if (err.name === 'ZodError') return sendError(res, 'Invalid emergency status payload', 400, err.errors);
    return sendError(res, err.message || 'Failed to update emergency status', 500);
  }
};
