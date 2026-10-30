import { RoleEnum } from '@prisma/client';

/**
 * Maps incoming frontend role strings to Prisma RoleEnum.
 */
export const mapRoleToEnum = (roleStr?: string): RoleEnum => {
  if (!roleStr) return RoleEnum.DISPATCHER;
  const normalized = roleStr.trim().toLowerCase();
  if (normalized === 'admin' || normalized === 'administrator') {
    return RoleEnum.ADMIN;
  }
  if (normalized === 'ambulance staff' || normalized === 'ambulance_staff') {
    return RoleEnum.AMBULANCE_STAFF;
  }
  if (normalized === 'citizen') {
    return RoleEnum.CITIZEN;
  }
  return RoleEnum.DISPATCHER;
};

/**
 * Maps Prisma RoleEnum back to human-readable frontend role label.
 */
export const mapEnumToRole = (roleEnum: RoleEnum | string): string => {
  switch (roleEnum) {
    case RoleEnum.ADMIN:
    case 'ADMIN':
      return 'Administrator';
    case RoleEnum.AMBULANCE_STAFF:
    case 'AMBULANCE_STAFF':
      return 'Ambulance Staff';
    case RoleEnum.CITIZEN:
    case 'CITIZEN':
      return 'Citizen';
    case RoleEnum.DISPATCHER:
    case 'DISPATCHER':
    default:
      return 'Dispatch Operator';
  }
};
