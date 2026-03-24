import { apiClient } from '../api/client';
import { API_ENDPOINTS } from '../api/config';

export const authService = {
  /**
   * Đăng nhập người dùng
   */
  async login(credentials: any) {
    return await apiClient.post(API_ENDPOINTS.LOGIN, credentials);
  },

  /**
   * Đăng ký người dùng mới
   */
  async register(userData: any) {
    return await apiClient.post(API_ENDPOINTS.REGISTER, userData);
  },

  /**
   * Lấy thông tin cá nhân (Cần Token)
   */
  async getProfile(token: string) {
    return await apiClient.get(API_ENDPOINTS.PROFILE, {
      'Authorization': `Bearer ${token}`
    });
  }
};
