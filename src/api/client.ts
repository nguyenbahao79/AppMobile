import { isJwtExpired } from '@/utils/jwt';
import { BASE_URL, API_ENDPOINTS } from './config';
import { clearTokens, getTokens, setTokens } from './secureStorage';

let accessToken: string | null = null;
let refreshToken: string | null = null;
let isRefreshing = false;
let refreshSubscribers: Array<(token: string | null) => void> = [];

/** @deprecated use setSessionTokens instead */
export function setAccessToken(token: string | null) {
  accessToken = token;
}

export function setSessionTokens(token: string | null, newRefreshToken: string | null) {
  accessToken = token;
  refreshToken = newRefreshToken;
}

export async function restoreTokensFromStorage() {
  const stored = await getTokens();
  accessToken = stored.token;
  refreshToken = stored.refreshToken;
  return stored;
}

export async function clearSession() {
  accessToken = null;
  refreshToken = null;
  await clearTokens();
}

/** Gọi khi BE từ chối cả access lẫn refresh token (hết hạn/thu hồi — ví dụ đăng nhập nơi khác làm
 * đổi session_version). AuthContext đăng ký callback này lúc mount để tự đăng xuất + điều hướng về
 * login ngay, thay vì chỉ âm thầm xóa token trong storage mà giao diện vẫn tưởng còn đăng nhập. */
let onForceLogout: (() => void) | null = null;
export function setOnForceLogout(cb: (() => void) | null) {
  onForceLogout = cb;
}

function notifyRefreshSubscribers(token: string | null) {
  const subscribers = refreshSubscribers;
  refreshSubscribers = [];
  subscribers.forEach((cb) => cb(token));
}

async function refreshAccessToken(): Promise<string | null> {
  if (!refreshToken) return null;

  if (isRefreshing) {
    return new Promise((resolve) => refreshSubscribers.push(resolve));
  }

  isRefreshing = true;
  try {
    let res: Response;
    try {
      res = await fetch(`${BASE_URL}${API_ENDPOINTS.REFRESH_TOKEN}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ refreshToken, accessToken }),
      });
    } catch {
      // Mất mạng / không tới được BE — refresh token có thể vẫn còn hạn, đừng đăng xuất, thử lại lần sau.
      notifyRefreshSubscribers(null);
      return null;
    }

    // Chỉ 401/403 mới thật sự nghĩa là refresh token bị BE từ chối (hết hạn/thu hồi).
    // Các lỗi khác (500, mất mạng, BE vừa khởi động lại...) là tạm thời — không được xóa token.
    if (res.status === 401 || res.status === 403) {
      accessToken = null;
      refreshToken = null;
      await clearTokens();
      notifyRefreshSubscribers(null);
      onForceLogout?.();
      return null;
    }

    const text = await res.text();
    let payload: unknown = null;
    try {
      payload = text ? JSON.parse(text) : null;
    } catch {
      notifyRefreshSubscribers(null);
      return null;
    }
    if (!res.ok) {
      notifyRefreshSubscribers(null);
      return null;
    }

    const data = (payload as { data?: { token?: string; refreshToken?: string } })?.data
      ?? (payload as { token?: string; refreshToken?: string } | null);
    const newToken = data?.token ?? null;
    const newRefreshToken = data?.refreshToken ?? refreshToken;
    if (!newToken) {
      notifyRefreshSubscribers(null);
      return null;
    }

    accessToken = newToken;
    refreshToken = newRefreshToken;
    await setTokens({ token: newToken, refreshToken: newRefreshToken });
    notifyRefreshSubscribers(newToken);
    return newToken;
  } finally {
    isRefreshing = false;
  }
}

/** Header Authorization hiện tại — dùng cho các request không đi qua apiClient.request, VD ảnh QR
 * thanh toán PayOS render qua <Image source={{ uri, headers }}> (expo-image hỗ trợ headers tuỳ chỉnh). */
export async function getAuthHeader(): Promise<Record<string, string>> {
  const token = await getFreshAccessToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function getFreshAccessToken(): Promise<string | null> {
  if (accessToken && !isJwtExpired(accessToken, 30_000)) {
    return accessToken;
  }
  if (refreshToken) {
    return refreshAccessToken();
  }
  return accessToken;
}

async function doFetch(endpoint: string, init: RequestInit, token: string | null) {
  const url = `${BASE_URL}${endpoint}`;
  const response = await fetch(url, {
    ...init,
    headers: {
      Accept: 'application/json',
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init.headers,
    },
  });

  const text = await response.text();
  let payload: unknown = null;
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      if (!response.ok) {
        throw new Error(
          `Không kết nối được BE qua ${BASE_URL}. Kiểm tra Docker BE/FE đã chạy và API proxy /api có hoạt động.`
        );
      }
      throw new Error(`Máy chủ trả về dữ liệu không hợp lệ từ ${url}.`);
    }
  }

  return { response, payload };
}

async function request(endpoint: string, init: RequestInit = {}) {
  const isAuthEndpoint = endpoint.startsWith('/auth/');
  const token = isAuthEndpoint ? null : await getFreshAccessToken();

  let { response, payload } = await doFetch(endpoint, init, token);

  if (response.status === 401 && !isAuthEndpoint && refreshToken) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      ({ response, payload } = await doFetch(endpoint, init, newToken));
    }
  }

  if (!response.ok) {
    const message = (payload as { message?: string } | null)?.message;
    throw new Error(message || `Yêu cầu thất bại (${response.status}).`);
  }

  const data = payload as { data?: unknown } | null;
  return data && 'data' in data ? data.data : payload;
}

export const apiClient = {
  get: (endpoint: string, headers: HeadersInit = {}) => request(endpoint, { method: 'GET', headers }),
  post: (endpoint: string, data?: unknown, headers: HeadersInit = {}) =>
    request(endpoint, { method: 'POST', headers, body: JSON.stringify(data ?? {}) }),
  put: (endpoint: string, data?: unknown, headers: HeadersInit = {}) =>
    request(endpoint, { method: 'PUT', headers, body: JSON.stringify(data ?? {}) }),
  delete: (endpoint: string, headers: HeadersInit = {}) => request(endpoint, { method: 'DELETE', headers }),
};
