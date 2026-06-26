import { BASE_URL } from './config';

let accessToken: string | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
}

async function request(endpoint: string, init: RequestInit = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const response = await fetch(url, {
    ...init,
    headers: {
      Accept: 'application/json',
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
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
