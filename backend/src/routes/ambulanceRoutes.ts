import { Router } from 'express';
import {
  getAllAmbulances,
  getAmbulanceById,
  createAmbulance,
  updateAmbulanceStatus,
} from '../controllers/ambulanceController';
import { requireRole } from '../middleware/authMiddleware';

const router = Router();

router.get('/', getAllAmbulances);
router.get('/:id', getAmbulanceById);
router.post('/', requireRole(['ADMIN', 'DISPATCHER']) as any, createAmbulance);
router.patch('/:id/status', requireRole(['ADMIN', 'DISPATCHER', 'AMBULANCE_STAFF']) as any, updateAmbulanceStatus);

export default router;
