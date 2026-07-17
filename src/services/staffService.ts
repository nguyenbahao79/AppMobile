import { apiClient } from '@/api/client';
import { API_ENDPOINTS } from '@/api/config';

export type StaffDashboardStats = {
  totalRevenue?: number;
  totalTicketsSold?: number;
  totalProductsSold?: number;
  cinemaName?: string;
};

function todayIso() {
  return new Date().toISOString().split('T')[0];
}

export type StaffProfile = {
  staffId: number;
  email: string;
  username: string;
  fullname: string;
  phone?: string;
  birthday?: string;
  avatar?: string;
  role?: string;
  cinemaName?: string;
};

export const staffService = {
  async getDashboardStats() {
    return apiClient.get(`${API_ENDPOINTS.STAFF_DASHBOARD_STATS}?date=${todayIso()}`) as Promise<StaffDashboardStats>;
  },

  async getMe() {
    return apiClient.get(API_ENDPOINTS.STAFF_ME) as Promise<StaffProfile>;
  },

  async updateMe(payload: { fullname: string; email: string; username: string; phone: string; birthday?: string; avatar?: string }) {
    return apiClient.put(API_ENDPOINTS.STAFF_ME, payload) as Promise<StaffProfile>;
  },

  async changeMyPassword(currentPassword: string, newPassword: string) {
    return apiClient.put(API_ENDPOINTS.STAFF_ME_PASSWORD, { currentPassword, newPassword });
  },
};
