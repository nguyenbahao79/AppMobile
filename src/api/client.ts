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
    console.log(`[API Request] POST ${BASE_URL}${endpoint}:`, JSON.stringify(data, null, 2));
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
    const text = await response.text(); // Lấy text thô để tránh lỗi nếu không phải JSON
    console.log(`[API Response] ${response.status} ${response.url}:`, text);
    
    let json;
    try {
      json = JSON.parse(text);
    } catch (e) {
      throw new Error(`Server không trả về JSON: ${text.substring(0, 100)}`);
    }

    if (!response.ok) {
      throw new Error(json.message || `Lỗi hệ thống (${response.status})`);
    }
    
    return json.data !== undefined ? json.data : json;
  },
};
