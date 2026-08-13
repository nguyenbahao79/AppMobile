import { apiClient } from '@/api/client';
import { API_ENDPOINTS } from '@/api/config';

export type StaffShift = {
  id: number;
  staffId?: number;
  staffName?: string;
  role?: string;
  phone?: string;
  date?: string;
  shiftType?: string;
  startTime?: string;
  endTime?: string;
  rawStartTime?: string;
  rawEndTime?: string;
  /** "Đang làm" | "Sắp tới" | "Đã xong" */
  status?: string;
  cinemaName?: string;
};

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

  async updateMe(payload: { fullname: string; email: string; phone: string; birthday?: string; avatar?: string }) {
    return apiClient.put(API_ENDPOINTS.STAFF_ME, payload) as Promise<StaffProfile>;
  },

  async changeMyPassword(currentPassword: string, newPassword: string) {
    return apiClient.put(API_ENDPOINTS.STAFF_ME_PASSWORD, { currentPassword, newPassword });
  },

  async getActiveShift() {
    return apiClient.get(API_ENDPOINTS.STAFF_SHIFTS_ACTIVE) as Promise<StaffShift | null>;
  },

  async getMyShifts() {
    return apiClient.get(API_ENDPOINTS.STAFF_SHIFTS_ME) as Promise<StaffShift[]>;
  },
};
