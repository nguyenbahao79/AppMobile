import { apiClient } from '@/api/client';
import { API_ENDPOINTS } from '@/api/config';
import { webReturnUrl, CheckoutResponse } from '@/services/bookingService';

export const foodOrderService = {
  async checkout(payload: {
    cinemaId: number;
    items: { productId: number; quantity: number }[];
    returnUrl?: string;
    cancelUrl?: string;
  }) {
    return apiClient.post(API_ENDPOINTS.CHECKOUT_FOOD_ORDERS, {
      ...payload,
      returnUrl: payload.returnUrl ?? webReturnUrl('/payment/success'),
      cancelUrl: payload.cancelUrl ?? webReturnUrl('/payment/cancel'),
    }) as Promise<CheckoutResponse>;
  },

  async confirmPayos(payosOrderCode: number) {
    return apiClient.post(API_ENDPOINTS.CONFIRM_PAYOS_FOOD_ORDERS, { payosOrderCode });
  },

  async cancelPendingOrder(payosOrderCode: number) {
    return apiClient.post(API_ENDPOINTS.CANCEL_PENDING_FOOD_ORDERS, { payosOrderCode });
  },
};
