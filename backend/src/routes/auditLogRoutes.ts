import { Router } from 'express';
import { getAuditLogs, getAuditLogById } from '../controllers/auditLogController';
import { requireAuth, requireRole } from '../middleware/authMiddleware';

const router = Router();

// Audit logs are sensitive operational records restricted to ADMIN and DISPATCHER
router.use(requireAuth as any, requireRole(['ADMIN', 'DISPATCHER']) as any);

router.get('/', getAuditLogs as any);
router.get('/:id', getAuditLogById as any);

export default router;
