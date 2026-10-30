import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import { sendError } from '../utils/response';

export const getAuditLogs = async (req: AuthenticatedRequest, res: Response) => {
  return sendError(res, 'Audit log functionality has been decommissioned', 404);
};

export const getAuditLogById = async (req: AuthenticatedRequest, res: Response) => {
  return sendError(res, 'Audit log functionality has been decommissioned', 404);
};
