import { Router } from 'express';
import { signup, register, login, getMe, logout, password, changePasswordHandler, updateProfile } from '../controllers/authController';
import { requireAuth } from '../middleware/authMiddleware';

const router = Router();

router.post('/signup', signup as any);
router.post('/register', register as any);
router.post('/login', login as any);
router.get('/me', requireAuth as any, getMe as any);
router.post('/logout', requireAuth as any, logout as any);
router.patch('/profile', requireAuth as any, updateProfile as any);
router.patch('/password', requireAuth as any, changePasswordHandler as any);
router.post('/password', requireAuth as any, password as any);

export default router;
