import { Router } from 'express';
import { getAllUsers, getUserById, updateUserRole, deleteUser } from '../controllers/userController';
import { requireAuth, requireRole } from '../middleware/authMiddleware';

const router = Router();

router.get('/', requireAuth as any, requireRole(['ADMIN']) as any, getAllUsers as any);
router.get('/:id', requireAuth as any, requireRole(['ADMIN']) as any, getUserById as any);
router.patch('/:id/role', requireAuth as any, requireRole(['ADMIN']) as any, updateUserRole as any);
router.delete('/:id', requireAuth as any, requireRole(['ADMIN']) as any, deleteUser as any);

export default router;
