import { api } from './api';

export interface ManagedUser {
  id: string;
  username: string;
  email: string;
  name: string;
  role: string;
  badgeId: string | null;
  department: string | null;
  createdAt: string;
}

export const userService = {
  async getUsers(): Promise<ManagedUser[]> {
    const response = await api.get<ManagedUser[]>('/users');
    if (!response.success || !response.data) {
      throw new Error(response.message || 'Unable to load users');
    }
    return response.data;
  },

  async updateRole(userId: string, role: 'ADMIN' | 'DISPATCHER'): Promise<ManagedUser> {
    const response = await api.patch<ManagedUser>(`/users/${encodeURIComponent(userId)}/role`, { role });
    if (!response.success || !response.data) {
      throw new Error(response.message || 'Unable to update user role');
    }
    return response.data;
  },
};
