import { Router } from 'express';
import { calculateRoute, recommendDispatch, executeDispatch } from '../controllers/dispatchController';
import { requireRole } from '../middleware/authMiddleware';

const router = Router();

router.post('/route', calculateRoute);
router.post('/recommend', requireRole(['ADMIN', 'DISPATCHER']) as any, recommendDispatch);
router.post('/execute', requireRole(['ADMIN', 'DISPATCHER']) as any, executeDispatch);

export default router;

