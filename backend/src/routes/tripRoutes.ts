import { Router } from 'express';
import { getAllTrips, getTripById, updateTripStatus, completeTrip, cancelTrip } from '../controllers/tripController';
import { requireRole } from '../middleware/authMiddleware';

const router = Router();

router.get('/', getAllTrips);
router.get('/:id', getTripById);
router.patch('/:id/status', requireRole(['ADMIN', 'DISPATCHER', 'AMBULANCE_STAFF']) as any, updateTripStatus);
router.post('/:id/complete', requireRole(['ADMIN', 'DISPATCHER', 'AMBULANCE_STAFF']) as any, completeTrip);
router.post('/:id/cancel', requireRole(['ADMIN', 'DISPATCHER']) as any, cancelTrip);

export default router;

