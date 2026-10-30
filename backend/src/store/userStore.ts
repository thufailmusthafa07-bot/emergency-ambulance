import bcrypt from 'bcryptjs';
import { Prisma, RoleEnum, User } from '@prisma/client';
import { prisma } from '../config/db';
import { generateToken, verifyToken } from '../utils/jwt';

const SESSION_TTL_MS = 2 * 60 * 60 * 1000;
const LOCK_DURATION_MS = 2 * 60 * 1000;
const MAX_FAILED_ATTEMPTS = 5;

export interface SessionRecord {
  token: string;
  userId: string;
  expiresAt: number;
}

const sessions = new Map<string, SessionRecord>();
const loginAttempts = new Map<string, { failedAttempts: number; lockUntilMs: number }>();
const revokedTokens = new Set<string>();

/**
 * Returns true if the given token was explicitly logged-out.
 * Used by authMiddleware to reject revoked tokens.
 */
export const isSessionRevoked = (token: string): boolean => revokedTokens.has(token);

const normalizeEmail = (value: string) => value.trim().toLowerCase();

const isValidPassword = (password: string) =>
  password.length >= 8 && /[A-Za-z]/.test(password) && /\d/.test(password);

const sanitizeUser = (user: User) => ({
  id: user.id,
  fullName: user.name,
  email: user.email,
  role: user.role,
  createdAt: user.createdAt.toISOString(),
});

export const getAllUsers = async () => {
  const users = await prisma.user.findMany({ orderBy: { createdAt: 'desc' } });
  return users.map(sanitizeUser);
};

export const getUserByEmail = async (email: string) => {
  if (typeof email !== 'string' || !email.trim()) return null;
  return prisma.user.findUnique({ where: { email: normalizeEmail(email) } });
};

export const registerUser = async ({
  fullName,
  email,
  password,
  confirmPassword,
}: {
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
}) => {
  const cleanedName = typeof fullName === 'string' ? fullName.trim() : '';
  const normalizedEmail = typeof email === 'string' ? normalizeEmail(email) : '';

  if (!cleanedName) throw new Error('Full name is required');
  if (!normalizedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    throw new Error('Invalid email format');
  }
  if (typeof password !== 'string' || !isValidPassword(password)) {
    throw new Error('Password must be at least 8 characters and contain both letters and numbers');
  }
  if (password !== confirmPassword) throw new Error('Passwords do not match');

  try {
    const user = await prisma.user.create({
      data: {
        email: normalizedEmail,
        username: normalizedEmail,
        passwordHash: await bcrypt.hash(password, 12),
        name: cleanedName,
        role: RoleEnum.DISPATCHER,
      },
    });

    return sanitizeUser(user);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new Error('An account with this email already exists');
    }
    throw error;
  }
};

export const createSession = (user: User) => {
  const token = generateToken({
    userId: user.id,
    username: user.email,
    role: user.role,
  });
  const expiresAt = Date.now() + SESSION_TTL_MS;

  sessions.set(token, { token, userId: user.id, expiresAt });
  return { token, user: sanitizeUser(user), expiresAt };
};

export const loginUser = async (emailOrUsername: string, password: string) => {
  if (typeof emailOrUsername !== 'string' || typeof password !== 'string') {
    throw new Error('Email or password is incorrect');
  }

  const normalizedLogin = normalizeEmail(emailOrUsername);
  const user = await prisma.user.findFirst({
    where: { OR: [{ email: normalizedLogin }, { username: normalizedLogin }] },
  });
  if (!user) throw new Error('Email or password is incorrect');

  const attempts = loginAttempts.get(user.id) ?? { failedAttempts: 0, lockUntilMs: 0 };
  const lockRemainingMs = attempts.lockUntilMs - Date.now();
  if (lockRemainingMs > 0) {
    throw new Error(`Account is locked. Please try again in ${Math.ceil(lockRemainingMs / 1000)} seconds`);
  }

  const isValid = await bcrypt.compare(password, user.passwordHash);
  if (!isValid) {
    attempts.failedAttempts += 1;
    if (attempts.failedAttempts >= MAX_FAILED_ATTEMPTS) {
      attempts.failedAttempts = 0;
      attempts.lockUntilMs = Date.now() + LOCK_DURATION_MS;
      loginAttempts.set(user.id, attempts);
      throw new Error('Account locked for 2 minutes due to repeated failed attempts');
    }
    loginAttempts.set(user.id, attempts);
    throw new Error('Email or password is incorrect');
  }

  loginAttempts.delete(user.id);
  return createSession(user);
};

export const logoutSession = (token: string) => {
  if (token) {
    sessions.delete(token);
    revokedTokens.add(token);
  }
};

export const validateSession = async (token: string) => {
  if (!token) throw new Error('Invalid or expired session');

  const session = sessions.get(token);
  if (!session) throw new Error('Invalid or expired session');
  if (session.expiresAt <= Date.now()) {
    sessions.delete(token);
    throw new Error('Session expired. Please log in again');
  }

  try {
    const payload = verifyToken(token);
    if (payload.userId !== session.userId) throw new Error('Invalid session');
  } catch {
    sessions.delete(token);
    throw new Error('Invalid or expired session');
  }

  const user = await prisma.user.findUnique({ where: { id: session.userId } });
  if (!user) {
    sessions.delete(token);
    throw new Error('User account not found');
  }

  return { token, user: sanitizeUser(user), expiresAt: session.expiresAt };
};

export const changePassword = async (email: string, currentPassword: string, newPassword: string) => {
  const user = await getUserByEmail(email);
  if (!user) throw new Error('User not found');
  if (typeof currentPassword !== 'string' || !(await bcrypt.compare(currentPassword, user.passwordHash))) {
    throw new Error('Current password is incorrect');
  }
  if (typeof newPassword !== 'string' || !isValidPassword(newPassword)) {
    throw new Error('New password must be at least 8 characters and contain both letters and numbers');
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: await bcrypt.hash(newPassword, 12) },
  });
  return sanitizeUser(updated);
};

export const updateUserName = async (userId: string, fullName: string) => {
  const cleanedName = typeof fullName === 'string' ? fullName.trim() : '';
  if (cleanedName.length < 2 || cleanedName.length > 100) {
    throw new Error('Name must be between 2 and 100 characters');
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: { name: cleanedName },
  });
  return sanitizeUser(updated);
};

export const getActiveSessionCount = () => {
  for (const [token, session] of sessions) {
    if (session.expiresAt <= Date.now()) sessions.delete(token);
  }
  return sessions.size;
};

export default {
  getAllUsers,
  getUserByEmail,
  registerUser,
  createSession,
  loginUser,
  validateSession,
  logoutSession,
  changePassword,
  updateUserName,
  getActiveSessionCount,
};