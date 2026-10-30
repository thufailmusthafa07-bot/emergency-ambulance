import { Request, Response } from 'express';
import { prisma } from '../config/db';
import { sendSuccess, sendError } from '../utils/response';
import { TrafficConditionEnum, RoadStatusEnum } from '@prisma/client';

export const getAllRoads = async (req: Request, res: Response) => {
  try {
    const roads = await prisma.road.findMany({
      orderBy: { startLocation: 'asc' },
    });
    return sendSuccess(res, roads);
  } catch (err: any) {
    return sendError(res, err.message || 'Failed to fetch roads', 500);
  }
};

export const updateRoadTraffic = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { traffic, status } = req.body;
    const userId = (req as any).user?.userId ?? null;

    const existing = await prisma.road.findUnique({ where: { id } });
    if (!existing) return sendError(res, 'Road segment not found', 404);

    let mappedTraffic: TrafficConditionEnum | undefined;
    if (traffic) {
      const t = traffic.toUpperCase();
      if (t.includes('MODERATE')) mappedTraffic = TrafficConditionEnum.MODERATE;
      else if (t.includes('HEAVY')) mappedTraffic = TrafficConditionEnum.HEAVY;
      else mappedTraffic = TrafficConditionEnum.LOW;
    }

    let mappedStatus: RoadStatusEnum | undefined;
    if (status) {
      const s = status.toUpperCase();
      if (s.includes('CLOSED')) mappedStatus = RoadStatusEnum.CLOSED;
      else if (s.includes('MAINT')) mappedStatus = RoadStatusEnum.UNDER_MAINTENANCE;
      else mappedStatus = RoadStatusEnum.OPEN;
    }

    const updated = await prisma.$transaction(async (tx) => {
      const resRoad = await tx.road.update({
        where: { id },
        data: {
          ...(mappedTraffic ? { currentTraffic: mappedTraffic } : {}),
          ...(mappedStatus ? { status: mappedStatus } : {}),
        },
      });

      if (mappedStatus && mappedStatus !== existing.status) {
        await tx.notification.create({
          data: {
            recipientId: null,
            title: `Road Alert: ${existing.startLocation} <-> ${existing.endLocation}`,
            message: `Road status changed to ${mappedStatus}. Dynamic rerouting applied.`,
            type: 'ROAD_UPDATE',
          },
        });
      }

      return resRoad;
    });

    return sendSuccess(res, updated, 'Road traffic condition updated');
  } catch (err: any) {
    return sendError(res, err.message || 'Failed to update road', 500);
  }
};

export const addRoad = async (req: Request, res: Response) => {
  try {
    const { startLocation, endLocation, distanceKm, baseTravelTimeMinutes, currentTraffic, speedLimitKmh } = req.body;
    const userId = (req as any).user?.userId ?? null;

    if (!startLocation || !endLocation) {
      return sendError(res, 'Both startLocation and endLocation are required', 400);
    }

    const [startExists, endExists] = await Promise.all([
      prisma.networkLocation.findFirst({
        where: { OR: [{ id: startLocation }, { name: startLocation }] },
      }),
      prisma.networkLocation.findFirst({
        where: { OR: [{ id: endLocation }, { name: endLocation }] },
      }),
    ]);

    if (!startExists) return sendError(res, `Unknown start location reference: ${startLocation}`, 400);
    if (!endExists) return sendError(res, `Unknown end location reference: ${endLocation}`, 400);
    if (startExists.name === endExists.name) {
      return sendError(res, 'Start and end locations must be different', 400);
    }

    const dist = Number(distanceKm);
    if (!Number.isFinite(dist) || dist <= 0) return sendError(res, 'Distance must be a positive number', 400);

    const minutes = Number(baseTravelTimeMinutes);
    if (!Number.isFinite(minutes) || minutes <= 0) return sendError(res, 'Travel time must be a positive number', 400);

    const existingRoad = await prisma.road.findFirst({
      where: {
        OR: [
          { startLocation: startExists.name, endLocation: endExists.name },
          { startLocation: endExists.name, endLocation: startExists.name },
        ],
      },
    });
    if (existingRoad) {
      return sendError(res, `Road between ${startExists.name} and ${endExists.name} already exists`, 409);
    }

    let traffic: TrafficConditionEnum = TrafficConditionEnum.LOW;
    if (currentTraffic) {
      const t = String(currentTraffic).toUpperCase();
      if (t.includes('HEAVY')) traffic = TrafficConditionEnum.HEAVY;
      else if (t.includes('MODERATE')) traffic = TrafficConditionEnum.MODERATE;
    }

    const road = await prisma.$transaction(async (tx) => {
      const created = await tx.road.create({
        data: {
          startLocation: startExists.name,
          endLocation: endExists.name,
          distanceKm: dist,
          baseTravelTimeMinutes: minutes,
          currentTraffic: traffic,
          speedLimitKmh: speedLimitKmh ? Number(speedLimitKmh) : 60,
          status: RoadStatusEnum.OPEN,
        },
      });

      await tx.notification.create({
        data: {
          recipientId: null,
          title: 'New Road Segment Added',
          message: `Road between ${created.startLocation} and ${created.endLocation} added to the dispatch network.`,
          type: 'ROAD_UPDATE',
        },
      });

      return created;
    });

    return sendSuccess(res, road, 'Road segment added', 201);
  } catch (err: any) {
    return sendError(res, err.message || 'Failed to add road', 500);
  }
};

