import { apiClient } from '@/api/client';
import { API_ENDPOINTS } from '@/api/config';

export type NewsItem = {
  id: number;
  title: string;
  content: string;
  image?: string;
  status?: number;
  createdAt?: string;
};

export const newsService = {
  async getNewsList() {
    const data = await apiClient.get(API_ENDPOINTS.NEWS_LIST);
    return Array.isArray(data) ? (data as NewsItem[]).filter((n) => n.status === 1) : [];
  },

  async getNewsDetail(id: string | number) {
    return apiClient.get(API_ENDPOINTS.NEWS_DETAIL(id)) as Promise<NewsItem>;
  },
};
