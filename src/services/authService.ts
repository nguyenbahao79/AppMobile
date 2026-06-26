import { apiClient } from '../api/client';
import { API_ENDPOINTS } from '../api/config';

export type AuthResponse = {
  token: string;
  refreshToken: string;
  user?: { userId: number; username: string; fullname?: string; email?: string; phone?: string; avatar?: string; points?: number };
  staff?: { staffId: number; username: string; fullname?: string; email?: string; role?: string };
};

type Credentials = { username: string; password: string };

export const authService = {
  login: (credentials: Credentials) => apiClient.post(API_ENDPOINTS.LOGIN, credentials) as Promise<AuthResponse>,
  staffLogin: (credentials: Credentials) => apiClient.post(API_ENDPOINTS.STAFF_LOGIN, credentials) as Promise<AuthResponse>,
  register: (userData: unknown) => apiClient.post(API_ENDPOINTS.REGISTER, userData) as Promise<AuthResponse>,
};
