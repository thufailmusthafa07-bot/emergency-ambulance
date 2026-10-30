export type UserRole = 'DISPATCHER' | 'ADMIN' | 'AMBULANCE_STAFF' | 'CITIZEN' | 'Operator' | 'Dispatch Operator' | 'Ambulance Staff' | 'Administrator';

export interface UserProfile {
  id?: string;
  username?: string;
  name?: string;
  fullName?: string;
  role: UserRole;
  badgeId?: string;
  department?: string;
  email?: string;
  avatarUrl?: string;
  createdAt?: string;
}
