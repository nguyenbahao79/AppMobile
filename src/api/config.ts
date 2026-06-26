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
  USER_DETAIL: (id: string | number) => `/users/${id}`,
  USER_PASSWORD: (id: string | number) => `/users/${id}/password`,
  
  // MOVIES
  MOVIES: '/movies',
  MOVIE_DETAIL: (id: string | number) => `/movies/${id}`,
  SHOWTIMES: (movieId: string | number) => `/showtimes?movieId=${movieId}`,
  SHOWTIME_DETAIL: (id: string | number) => `/showtimes/${id}`,
  SEATS_BY_ROOM: (roomId: string | number) => `/seats?roomId=${roomId}`,
  PRODUCTS: '/products',
  CINEMA_PRODUCT_MENU: (cinemaId: string | number) => `/cinemas/${cinemaId}/product-menu`,
  HOLD_SEATS: '/showtime-seat-holds/refresh',
  
  // BOOKING & TICKETS
  QUOTE_TICKETS: '/ticket-orders/quote',
  CHECKOUT_TICKETS: '/ticket-orders/checkout',
  TICKET_QR: (qrToken: string) => `/ticket-orders/qr/${encodeURIComponent(qrToken)}`,
  MY_TRANSACTIONS: '/me/transactions',
  MY_FAVORITES: '/me/favorites',
  TICKET_DETAIL: (id: string) => `/staff/dashboard-stats/orders/${encodeURIComponent(id)}`,
  VERIFY_TICKET: '/staff/verify-ticket',
};
