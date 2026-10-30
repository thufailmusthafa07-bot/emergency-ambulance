import { Request, Response } from 'express';
import { sendSuccess, sendError } from '../utils/response';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import { prisma } from '../config/db';
import {
  registerUser,
  loginUser,
  validateSession,
  logoutSession,
  changePassword,
  getUserByEmail,
  updateUserName,
} from '../store/userStore';

export const signup = async (req: Request, res: Response) => {
  try {
    const { password } = req.body ?? {};
    const fullName = req.body?.fullName ?? req.body?.name;
    const email = req.body?.email ?? req.body?.username;
    const confirmPassword = req.body?.confirmPassword ?? password;
    const user = await registerUser({
      fullName,
      email,
      password,
      confirmPassword,
    });

    return sendSuccess(
      res,
      { user },
      'Registration successful',
      201
    );
  } catch (err: any) {
    const msg = err.message || 'Registration failed';
    const isConflict = msg.toLowerCase().includes('already exists');
    return sendError(res, msg, isConflict ? 409 : 400);
  }
};

export const register = signup;

export const login = async (req: Request, res: Response) => {
  try {
    const rawEmail = req.body?.email ?? req.body?.username;
    const rawPassword = req.body?.password;

    if (!rawEmail || !rawPassword) {
      return sendError(res, 'Email or password is incorrect', 401);
    }

    const session = await loginUser(rawEmail, rawPassword);

    return sendSuccess(res, {
      token: session.token,
      user: session.user,
    }, 'Login successful');
  } catch (err: any) {
    return sendError(res, err.message || 'Login failed', 401);
  }
};

export const getMe = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return sendError(res, 'Unauthorized', 401);
    }

    const storedUser = await getUserByEmail(req.user.username);
    if (!storedUser) {
      return sendError(res, 'User not found', 404);
    }

    return sendSuccess(res, {
      id: storedUser.id,
      fullName: storedUser.name,
      email: storedUser.email,
      role: storedUser.role,
      createdAt: storedUser.createdAt,
    });
  } catch (err: any) {
    return sendError(res, err.message || 'Failed to fetch user profile', 500);
  }
};

export const updateProfile = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) return sendError(res, 'Unauthorized', 401);
    const user = await updateUserName(req.user.userId, req.body?.fullName);

    return sendSuccess(res, { user }, 'Profile updated successfully');
  } catch (err: any) {
    return sendError(res, err.message || 'Failed to update profile', 400);
  }
};

export const logout = async (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : req.body?.token;
  if (token) {
    logoutSession(token);
  }
  return sendSuccess(res, null, 'Logged out successfully');
};

export const changePasswordHandler = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return sendError(res, 'Unauthorized', 401);
    }

    const { currentPassword, newPassword } = req.body ?? {};
    const user = await getUserByEmail(req.user.username);
    if (!user) {
      return sendError(res, 'User not found', 404);
    }

    const updated = await changePassword(user.email, currentPassword, newPassword);

    return sendSuccess(res, {
      user: updated,
    }, 'Password updated successfully');
  } catch (err: any) {
    return sendError(res, err.message || 'Password change failed', 400);
  }
};

export const password = changePasswordHandler;

export const validateUserSession = async (token: string) => validateSession(token);
