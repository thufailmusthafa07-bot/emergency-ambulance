import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import { prisma } from '../config/db';
import { sendSuccess, sendError } from '../utils/response';

const recipientFilter = (userId: string) => ({
  OR: [{ recipientId: null }, { recipientId: userId }],
});

export const getNotifications = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) return sendError(res, 'Unauthorized', 401);
    const where = recipientFilter(req.user.userId);
    const [notifications, unreadCount] = await Promise.all([
      prisma.notification.findMany({ where, orderBy: { createdAt: 'desc' }, take: 100 }),
      prisma.notification.count({ where: { ...where, isRead: false } }),
    ]);
    return sendSuccess(res, {
      notifications,
      unreadCount,
    });
  } catch (err: any) {
    return sendError(res, err.message || 'Failed to fetch notifications', 500);
  }
};

export const markNotificationAsRead = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) return sendError(res, 'Unauthorized', 401);
    const where = { id: req.params.id, ...recipientFilter(req.user.userId) };
    const result = await prisma.notification.updateMany({
      where,
      data: { isRead: true },
    });
    if (result.count === 0) {
      return sendError(res, 'Notification not found', 404);
    }
    const [notification, unreadCount] = await Promise.all([
      prisma.notification.findUnique({ where: { id: req.params.id } }),
      prisma.notification.count({ where: { ...recipientFilter(req.user.userId), isRead: false } }),
    ]);
    return sendSuccess(res, {
      notification,
      unreadCount,
    }, 'Notification marked as read');
  } catch (err: any) {
    return sendError(res, err.message || 'Failed to mark notification as read', 500);
  }
};

export const markAllNotificationsAsRead = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) return sendError(res, 'Unauthorized', 401);
    const where = recipientFilter(req.user.userId);
    await prisma.notification.updateMany({
      where: { ...where, isRead: false },
      data: { isRead: true },
    });
    const notifications = await prisma.notification.findMany({ where, orderBy: { createdAt: 'desc' }, take: 100 });
    return sendSuccess(res, {
      notifications,
      unreadCount: 0,
    }, 'All notifications marked as read');
  } catch (err: any) {
    return sendError(res, err.message || 'Failed to mark all notifications as read', 500);
  }
};
