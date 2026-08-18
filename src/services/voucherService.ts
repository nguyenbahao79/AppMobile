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
  description?: string;
  /** Voucher chỉ dùng được ở đúng rạp này — khớp web Vouchers.jsx (bắt buộc chọn rạp trước khi xem kho voucher). */
  cinemaId?: number;
  cinemaName?: string;
};

export const voucherService = {
  /** @param cinemaId — bắt buộc để lấy đúng kho voucher của 1 rạp (mỗi voucher chỉ áp dụng 1 rạp). */
  async getPublicVouchers(cinemaId?: number | string) {
    const endpoint = cinemaId
      ? `${API_ENDPOINTS.VOUCHERS_LIST}?cinemaId=${encodeURIComponent(String(cinemaId))}`
      : API_ENDPOINTS.VOUCHERS_LIST;
    const data = await apiClient.get(endpoint);
    return Array.isArray(data) ? (data as PublicVoucher[]) : [];
  },
};
