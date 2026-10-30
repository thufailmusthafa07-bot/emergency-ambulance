import { Router } from 'express';
import {
  getAllEmergencies,
  getEmergencyById,
  createEmergency,
  updateEmergencyStatus,
} from '../controllers/emergencyController';
import { requireRole } from '../middleware/authMiddleware';

const router = Router();

router.get('/', getAllEmergencies);
router.get('/:id', getEmergencyById);
router.post('/', createEmergency);
router.patch('/:id/status', requireRole(['ADMIN', 'DISPATCHER']) as any, updateEmergencyStatus);

export default router;
