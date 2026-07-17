import { apiClient } from '@/api/client';
import { API_ENDPOINTS } from '@/api/config';

export type PublicVoucher = {
  id: number;
  code: string;
  discountType: string;
  value: number;
  minOrderValue: number;
  maxDiscountAmount: number;
  startDate?: string;
  endDate?: string;
  pointVoucher: number;
  /** 1 = Active, 0 = Inactive */
  status: number;
};

export const voucherService = {
  async getPublicVouchers() {
    const data = await apiClient.get(API_ENDPOINTS.VOUCHERS_LIST);
    return Array.isArray(data) ? (data as PublicVoucher[]) : [];
  },
};
