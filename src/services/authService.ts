import { api } from './api';
import type { UserProfile } from '../types/user';

export interface LoginPayload {
  username: string;
  password: string;
  role?: string;
}

export interface RegisterPayload {
  name: string;
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export interface AuthResponseData {
  token?: string;
  user?: UserProfile;
}

export interface AuthResponse {
  success: boolean;
  message?: string;
  data?: AuthResponseData;
  error?: any;
}

export const authService = {
  /**
   * Send login credentials to backend API (POST /api/auth/login)
   */
  async login(credentials: LoginPayload): Promise<{ success: boolean; message?: string; token?: string; user?: UserProfile }> {
    try {
      const res = await api.post<AuthResponseData>('/auth/login', credentials);
      if (res.success && res.data) {
        return {
          success: true,
          message: res.message || 'Login successful',
          token: res.data.token,
          user: res.data.user,
        };
      }
      return {
        success: false,
        message: res.message || 'Invalid username or password',
      };
    } catch (err: any) {
      return {
        success: false,
        message: err.message || 'Unable to connect to authentication server.',
      };
    }
  },

  /**
   * Send registration details to backend API (POST /api/auth/register)
   */
  async register(data: RegisterPayload): Promise<{ success: boolean; message?: string; token?: string; user?: UserProfile }> {
    try {
      const res = await api.post<AuthResponseData>('/auth/register', data);
      if (res.success && res.data) {
        return {
          success: true,
          message: res.message || 'Registration successful',
          token: res.data.token,
          user: res.data.user,
        };
      }
      return {
        success: false,
        message: res.message || 'Registration failed',
      };
    } catch (err: any) {
      return {
        success: false,
        message: err.message || 'Unable to connect to authentication server.',
      };
    }
  },

  /**
   * Fetch logged in user profile (GET /api/auth/me)
   */
  async getMe(): Promise<{ success: boolean; user?: UserProfile }> {
    try {
      const res = await api.get<UserProfile>('/auth/me');
      if (res.success && res.data) {
        return {
          success: true,
          user: res.data,
        };
      }
      return { success: false };
    } catch {
      return { success: false };
    }
  },

  async updateProfile(fullName: string): Promise<{ success: boolean; message?: string; user?: UserProfile }> {
    const res = await api.patch<{ user: UserProfile }>('/auth/profile', { fullName });
    if (res.success && res.data?.user) {
      return { success: true, message: res.message, user: res.data.user };
    }
    return { success: false, message: res.message || 'Profile update failed' };
  },

  async changePassword(currentPassword: string, newPassword: string): Promise<{ success: boolean; message?: string }> {
    const res = await api.patch('/auth/password', { currentPassword, newPassword });
    return {
      success: Boolean(res.success),
      message: res.message || res.error?.message || res.error,
    };
  },

  /**
   * Notify server of logout (POST /api/auth/logout)
   */
  async logout(): Promise<void> {
    try {
      await api.post('/auth/logout', {});
    } catch {
      // Ignore network errors during logout
    }
  },
};

export default authService;
