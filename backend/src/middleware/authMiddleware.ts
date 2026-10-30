import { Request, Response, NextFunction } from 'express';
import { JwtPayload, verifyToken } from '../utils/jwt';
import { sendError } from '../utils/response';
import { isSessionRevoked } from '../store/userStore';
import { prisma } from '../config/db';

export interface AuthenticatedRequest extends Request {
  user?: JwtPayload;
}

/**
 * Verifies the JWT directly (survives server restarts) and confirms the
 * user still exists in PostgreSQL.  Tokens that were explicitly logged-out
 * are rejected via the in-memory revocation set kept in userStore.
 */
export const requireAuth = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  let token: string | undefined;
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1]?.trim();
  } else if (req.headers.cookie) {
    const match = req.headers.cookie.match(/(?:^|;\s*)(?:nalam_nagar_token|token)=([^;]+)/);
    if (match) token = decodeURIComponent(match[1].trim());
  }

  if (!token || token === 'null' || token === 'undefined') {
    return sendError(res, 'Authentication token missing or invalid', 401);
  }
  try {
    // 1. Check if the token was explicitly revoked (logout)
    if (isSessionRevoked(token)) {
      return sendError(res, 'Session has been logged out', 401);
    }

    // 2. Verify JWT signature and expiration
    const payload = verifyToken(token);

    // 3. Confirm the user still exists in the database
    const user = await prisma.user.findUnique({ where: { id: payload.userId } });
    if (!user) {
      return sendError(res, 'User account not found', 401);
    }

    req.user = {
      userId: user.id,
      username: user.email,
      role: user.role,
    };
    return next();
  } catch (err: any) {
    // jsonwebtoken throws TokenExpiredError, JsonWebTokenError, etc.
    if (err.name === 'TokenExpiredError') {
      return sendError(res, 'Token expired. Please log in again', 401);
    }
    return sendError(res, err.message || 'Invalid or expired token', 401);
  }
};

export const requireRole = (allowedRoles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return sendError(res, 'Unauthorized', 401);
    }

    const userRole = (req.user.role ? String(req.user.role) : '').toUpperCase();
    const normalizedAllowed = allowedRoles.map((r) => r.toUpperCase());

    if (!userRole || !normalizedAllowed.includes(userRole)) {
      return sendError(res, 'Access denied: insufficient permissions', 403);
    }

    next();
  };
};
