import { BASE_URL } from './config';

/**
 * API Client dùng Fetch API để thực hiện các yêu cầu mạng.
 * Hỗ trợ các phương thức GET, POST, PUT, DELETE.
 */
export const apiClient = {
  async get(endpoint: string, headers = {}) {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    });
    return this.handleResponse(response);
  },

  async post(endpoint: string, data: any, headers = {}) {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: JSON.stringify(data),
    });
    return this.handleResponse(response);
  },

  async put(endpoint: string, data: any, headers = {}) {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: JSON.stringify(data),
    });
    return this.handleResponse(response);
  },

  async delete(endpoint: string, headers = {}) {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    });
    return this.handleResponse(response);
  },

  async handleResponse(response: Response) {
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'Có lỗi xảy ra khi gọi API');
    }
    return data;
  },
};
