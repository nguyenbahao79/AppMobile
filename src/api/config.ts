import Constants from 'expo-constants';
import { Platform } from 'react-native';

const configuredBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();
const DOCKER_FRONTEND_PORT = process.env.EXPO_PUBLIC_DOCKER_FRONTEND_PORT?.trim() || '3000';

function isUsableLanHost(host: string) {
  if (host === 'localhost' || host === '127.0.0.1') {
    return false;
  }

  return /^\d{1,3}(\.\d{1,3}){3}$/.test(host) || host.endsWith('.local');
}

function getExpoDevHost() {
  const constants = Constants as typeof Constants & {
    manifest?: {
      debuggerHost?: string;
      hostUri?: string;
    };
    manifest2?: {
      extra?: {
        expoClient?: {
          hostUri?: string;
        };
      };
    };
  };

  const candidates = [
    Constants.expoConfig?.hostUri,
    constants.manifest?.debuggerHost,
    constants.manifest?.hostUri,
    constants.manifest2?.extra?.expoClient?.hostUri,
  ];

  for (const candidate of candidates) {
    if (!candidate) continue;

    const withoutProtocol = candidate.replace(/^[a-z]+:\/\//i, '');
    const host = withoutProtocol.split('/')[0]?.split(':')[0]?.trim();

    if (host && isUsableLanHost(host)) {
      return host;
    }
  }

  return null;
}

function getDefaultBaseUrl() {
  const expoHost = getExpoDevHost();

  if (expoHost) {
    return `http://${expoHost}:${DOCKER_FRONTEND_PORT}/api/v1`;
  }

  if (Platform.OS === 'android') {
    return `http://10.0.2.2:${DOCKER_FRONTEND_PORT}/api/v1`;
  }

  return `http://localhost:${DOCKER_FRONTEND_PORT}/api/v1`;
}

// Mặc định App gọi qua Docker FE (Nginx) ở http://<IP-máy>:3000/api/v1.
// Docker FE sẽ proxy /api sang BE, nên không cần Cloudflare hoặc sửa IP thủ công khi chạy Expo LAN.
export const BASE_URL = (configuredBaseUrl || getDefaultBaseUrl()).replace(/\/$/, '');

export const API_ENDPOINTS = {
  // AUTHENTICATION
  LOGIN: '/auth/login',
  STAFF_LOGIN: '/auth/staff-login',
  REGISTER: '/auth/register',
  REFRESH_TOKEN: '/auth/refresh',
  FORGOT_PASSWORD: '/auth/forgot-password',
  FORGOT_PASSWORD_VERIFY_OTP: '/auth/forgot-password/verify-otp',
  FORGOT_PASSWORD_RESEND_OTP: '/auth/forgot-password/resend-otp',
  RESET_PASSWORD: '/auth/reset-password',
  USER_DETAIL: (id: string | number) => `/users/${id}`,
  USER_PASSWORD: (id: string | number) => `/users/${id}/password`,
  
  // MOVIES
  MOVIES: '/movies',
  MOVIE_DETAIL: (id: string | number) => `/movies/${id}`,
  SHOWTIMES: (movieId: string | number) => `/showtimes?movieId=${movieId}`,
  SHOWTIME_DETAIL: (id: string | number) => `/showtimes/${id}`,
  SEATS_BY_ROOM: (roomId: string | number) => `/seats?roomId=${roomId}`,
  SEAT_HOLDS_PEER: (showtimeId: string | number, excludeHolder: string) =>
    `/showtime-seat-holds/peer?showtimeId=${showtimeId}&excludeHolder=${encodeURIComponent(excludeHolder)}`,
  PRODUCTS: '/products',
  CINEMAS_LIST: '/cinemas',
  CINEMA_DETAIL: (id: string | number) => `/cinemas/${id}`,
  CINEMA_PRODUCT_MENU: (cinemaId: string | number) => `/cinemas/${cinemaId}/product-menu`,
  HOLD_SEATS: '/showtime-seat-holds/refresh',
  NEWS_LIST: '/news',
  NEWS_DETAIL: (id: string | number) => `/news/${id}`,
  MOVIE_REVIEWS: (movieId: string | number) => `/movies/${movieId}/reviews`,
  MEMBERSHIP_RANKS: '/membership-ranks',
  
  // BOOKING & TICKETS
  QUOTE_TICKETS: '/ticket-orders/quote',
  CHECKOUT_TICKETS: '/ticket-orders/checkout',
  CONFIRM_PAYOS_TICKETS: '/ticket-orders/confirm-payos',
  CANCEL_PENDING_TICKETS: '/ticket-orders/cancel-pending',
  CHECKOUT_FOOD_ORDERS: '/food-orders/checkout',
  CONFIRM_PAYOS_FOOD_ORDERS: '/food-orders/confirm-payos',
  CANCEL_PENDING_FOOD_ORDERS: '/food-orders/cancel-pending',
  TICKET_QR: (qrToken: string) => `/ticket-orders/qr/${encodeURIComponent(qrToken)}`,
  /** Ảnh QR thanh toán PayOS render trong app (không mở trình duyệt ngoài) — data = payos.qrCode. */
  PAYMENT_QR_TICKETS: (qrCode: string) => `/ticket-orders/payment-qr?data=${encodeURIComponent(qrCode)}`,
  PAYMENT_QR_FOOD_ORDERS: (qrCode: string) => `/food-orders/payment-qr?data=${encodeURIComponent(qrCode)}`,
  PAYOS_STATUS_TICKETS: (payosOrderCode: number) => `/ticket-orders/payos/${payosOrderCode}/status`,
  PAYOS_STATUS_FOOD_ORDERS: (payosOrderCode: number) => `/food-orders/payos/${payosOrderCode}/status`,
  MY_TRANSACTIONS: '/me/transactions',
  MY_FAVORITES: '/me/favorites',
  DELETE_ACCOUNT: '/me/account',
  FAVORITE_BY_MOVIE: (movieId: string | number) => `/me/favorites/${movieId}`,
  MOVIE_REVIEW_BY_MOVIE: (movieId: string | number) => `/me/movie-reviews/${movieId}`,
  MY_VOUCHERS: '/me/vouchers',
  REDEEM_VOUCHER: '/me/vouchers/redeem',
  POINTS_HISTORY: '/me/points-history',
  VOUCHERS_LIST: '/vouchers',
  TICKET_DETAIL: (id: string) => `/staff/dashboard-stats/orders/${encodeURIComponent(id)}`,
  VERIFY_TICKET: '/staff/verify-ticket',
  VERIFY_FOOD_ORDER: '/staff/verify-food-order',

  // STAFF SHIFTS
  STAFF_SHIFTS_ACTIVE: '/shifts/active',
  STAFF_SHIFTS_ME: '/shifts/me',

  // STAFF DASHBOARD
  STAFF_DASHBOARD_STATS: '/staff/dashboard-stats',

  // STAFF SELF-SERVICE
  STAFF_ME: '/staff/me',
  STAFF_ME_PASSWORD: '/staff/me/password',
};
