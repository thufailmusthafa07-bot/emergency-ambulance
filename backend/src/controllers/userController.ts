import { Request, Response } from 'express';
import { Prisma, RoleEnum } from '@prisma/client';
import { prisma } from '../config/db';
import { sendSuccess, sendError } from '../utils/response';
import { mapEnumToRole } from '../utils/roleMapper';
import { AuthenticatedRequest } from '../middleware/authMiddleware';

export const getAllUsers = async (req: Request, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        username: true,
        email: true,
        name: true,
        role: true,
        badgeId: true,
        department: true,
        createdAt: true,
      },
    });
    const safeUsers = users.map((u) => ({
      id: u.id,
      username: u.username,
      email: u.email,
      name: u.name,
      role: mapEnumToRole(u.role),
      badgeId: u.badgeId,
      department: u.department,
      createdAt: u.createdAt,
    }));
    return sendSuccess(res, safeUsers);
  } catch (err: any) {
    return sendError(res, err.message || 'Failed to fetch users', 500);
  }
};

export const getUserById = async (req: Request, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      select: {
        id: true,
        username: true,
        email: true,
        name: true,
        role: true,
        badgeId: true,
        department: true,
        createdAt: true,
      },
    });
    if (!user) {
      return sendError(res, 'User not found', 404);
    }
    return sendSuccess(res, {
      ...user,
      role: mapEnumToRole(user.role),
    });
  } catch (err: any) {
    return sendError(res, err.message || 'Failed to fetch user', 500);
  }
};

export const updateUserRole = async (req: AuthenticatedRequest, res: Response) => {
  const role = req.body?.role as RoleEnum;
  const validRoles = Object.values(RoleEnum);
  if (!validRoles.includes(role)) {
    return sendError(res, `Role must be one of: ${validRoles.join(', ')}`, 400);
  }

  try {
    const updated = await prisma.$transaction(async (db) => {
      const target = await db.user.findUnique({ where: { id: req.params.id } });
      if (!target) return null;

      if (target.role === RoleEnum.ADMIN && role !== RoleEnum.ADMIN) {
        const administrators = await db.user.count({ where: { role: RoleEnum.ADMIN } });
        if (administrators <= 1) {
          throw new Error('The last administrator cannot be demoted');
        }
      }

      const resUser = await db.user.update({
        where: { id: target.id },
        data: { role },
        select: {
          id: true,
          username: true,
          email: true,
          name: true,
          role: true,
          badgeId: true,
          department: true,
          createdAt: true,
        },
      });

      return resUser;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

    if (!updated) return sendError(res, 'User not found', 404);
    return sendSuccess(res, {
      ...updated,
      role: mapEnumToRole(updated.role),
    }, 'User role updated successfully');
  } catch (err: any) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2034') {
      return sendError(res, 'Concurrent role change detected; please retry', 409);
    }
    return sendError(res, err.message || 'Failed to update user role', 400);
  }
};

export const deleteUser = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const targetId = req.params.id;
    if (req.user?.userId === targetId) {
      return sendError(res, 'Administrators cannot delete their own account', 400);
    }

    const result = await prisma.$transaction(async (db) => {
      const target = await db.user.findUnique({ where: { id: targetId } });
      if (!target) return null;

      if (target.role === RoleEnum.ADMIN) {
        const adminCount = await db.user.count({ where: { role: RoleEnum.ADMIN } });
        if (adminCount <= 1) {
          throw new Error('The last administrator cannot be deleted');
        }
      }

      await db.user.delete({ where: { id: target.id } });

      return target;
    });

    if (!result) return sendError(res, 'User not found', 404);
    return sendSuccess(res, null, 'User deleted successfully');
  } catch (err: any) {
    return sendError(res, err.message || 'Failed to delete user', 400);
  }
};
