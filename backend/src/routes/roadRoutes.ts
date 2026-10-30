import { Router } from 'express';
import { getAllRoads, updateRoadTraffic, addRoad } from '../controllers/roadController';
import { requireRole } from '../middleware/authMiddleware';

const router = Router();

router.get('/', getAllRoads);
router.post('/', requireRole(['ADMIN', 'DISPATCHER']) as any, addRoad);
router.patch('/:id/traffic', requireRole(['ADMIN', 'DISPATCHER']) as any, updateRoadTraffic);

export default router;
