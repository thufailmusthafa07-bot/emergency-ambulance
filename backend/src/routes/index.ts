import { Router } from 'express';
import authRoutes from './authRoutes';
import emergencyRoutes from './emergencyRoutes';
import ambulanceRoutes from './ambulanceRoutes';
import hospitalRoutes from './hospitalRoutes';
import dispatchRoutes from './dispatchRoutes';
import tripRoutes from './tripRoutes';
import roadRoutes from './roadRoutes';
import dashboardRoutes from './dashboardRoutes';
import userRoutes from './userRoutes';
import notificationRoutes from './notificationRoutes';
import auditLogRoutes from './auditLogRoutes';
import persistentCompatRoutes from './persistentCompatRoutes';
import { requireAuth, requireRole } from '../middleware/authMiddleware';

const router = Router();

router.use('/auth', authRoutes);
router.use(requireAuth as any, requireRole(['ADMIN', 'DISPATCHER', 'AMBULANCE_STAFF', 'CITIZEN']) as any);
router.use('/', persistentCompatRoutes);
router.use('/emergencies', emergencyRoutes);
router.use('/ambulances', ambulanceRoutes);
router.use('/hospitals', hospitalRoutes);
router.use('/dispatch', dispatchRoutes);
router.use('/trips', tripRoutes);
router.use('/roads', roadRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/users', userRoutes);
router.use('/notifications', notificationRoutes);
router.use('/audit-logs', auditLogRoutes);

export default router;
