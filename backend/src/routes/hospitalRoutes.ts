import { Router } from 'express';
import {
  getAllHospitals,
  getHospitalById,
  createHospital,
  updateHospitalCapacity,
} from '../controllers/hospitalController';
import { requireRole } from '../middleware/authMiddleware';

const router = Router();

router.get('/', getAllHospitals);
router.get('/:id', getHospitalById);
router.post('/', requireRole(['ADMIN', 'DISPATCHER']) as any, createHospital);
router.patch('/:id/capacity', requireRole(['ADMIN', 'DISPATCHER']) as any, updateHospitalCapacity);

export default router;
