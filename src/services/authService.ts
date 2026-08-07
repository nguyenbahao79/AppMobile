import { apiClient } from '../api/client';
import { API_ENDPOINTS } from '../api/config';

export type AuthResponse = {
  token: string;
  refreshToken: string;
  user?: {
    userId: number;
    fullname?: string;
    email?: string;
    phone?: string;
    avatar?: string;
    birthday?: string;
    points?: number;
    rankName?: string;
    membershipRankName?: string;
    totalSpending?: number;
    status?: number;
  };
  staff?: {
    staffId: number;
    fullname?: string;
    email?: string;
    role?: string;
    phone?: string;
    avatar?: string;
    cinemaName?: string;
  };
};

type Credentials = { account: string; password: string };

export type ForgotPasswordResponse = {
  resetSessionToken: string;
  maskedEmail: string | null;
};

export const authService = {
  login: (credentials: Credentials) => apiClient.post(API_ENDPOINTS.LOGIN, credentials) as Promise<AuthResponse>,
  staffLogin: (credentials: Credentials) => apiClient.post(API_ENDPOINTS.STAFF_LOGIN, credentials) as Promise<AuthResponse>,
  register: (userData: unknown) => apiClient.post(API_ENDPOINTS.REGISTER, userData) as Promise<AuthResponse>,

  forgotPassword: (account: string) =>
    apiClient.post(API_ENDPOINTS.FORGOT_PASSWORD, { account }) as Promise<ForgotPasswordResponse>,
  verifyForgotOtp: (resetSessionToken: string, otp: string) =>
    apiClient.post(API_ENDPOINTS.FORGOT_PASSWORD_VERIFY_OTP, { resetSessionToken, otp }),
  resendForgotOtp: (resetSessionToken: string) =>
    apiClient.post(API_ENDPOINTS.FORGOT_PASSWORD_RESEND_OTP, { resetSessionToken }),
  resetPassword: (token: string, newPassword: string) =>
    apiClient.post(API_ENDPOINTS.RESET_PASSWORD, { token, newPassword }),
};
