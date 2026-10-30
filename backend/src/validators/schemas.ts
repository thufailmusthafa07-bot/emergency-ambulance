import { z } from 'zod';

export const registerSchema = z.object({
  username: z.string().min(3).max(30),
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(2),
  badgeId: z.string().optional(),
  department: z.string().optional(),
});

export const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
  role: z.string().optional(),
});

export const createEmergencySchema = z.object({
  callerName: z.string().min(2),
  contactNumber: z.string().min(5),
  emergencyType: z.string().min(2),
  pickupLocation: z.string().min(2),
  severity: z.enum(['CRITICAL', 'SERIOUS', 'MINOR', 'Critical', 'Serious', 'Minor']).default('SERIOUS'),
  requiredFacility: z.enum(['GENERAL', 'TRAUMA', 'CARDIAC', 'NEURO', 'PEDIATRICS']).default('GENERAL'),
  dispatchNotes: z.string().optional(),
});

export const updateEmergencyStatusSchema = z.object({
  status: z.enum([
    'PENDING', 'ASSIGNED', 'DISPATCHED', 'AT_SCENE', 'TRANSPORTING', 'COMPLETED', 'CANCELLED',
    'Pending', 'Assigned', 'Ambulance Dispatched', 'At Scene', 'Transporting', 'Completed', 'Cancelled'
  ]),
  notes: z.string().optional(),
});
