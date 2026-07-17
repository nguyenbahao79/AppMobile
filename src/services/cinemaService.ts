import { apiClient } from '@/api/client';
import { API_ENDPOINTS } from '@/api/config';

export type Cinema = {
  cinemaId: number;
  name: string;
  address: string;
  status?: number;
};

export const cinemaService = {
  async getCinemas() {
    const data = await apiClient.get(API_ENDPOINTS.CINEMAS_LIST);
    return Array.isArray(data) ? (data as Cinema[]).filter((c) => c.status !== 0) : [];
  },

  async getCinemaDetail(id: string | number) {
    return apiClient.get(API_ENDPOINTS.CINEMA_DETAIL(id)) as Promise<Cinema>;
  },
};
