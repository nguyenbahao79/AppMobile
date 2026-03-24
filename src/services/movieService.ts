import { apiClient } from '../api/client';
import { API_ENDPOINTS } from '../api/config';

export const movieService = {
  /**
   * Lấy danh sách tất cả phim từ Backend
   */
  async getAllMovies() {
    return await apiClient.get(API_ENDPOINTS.MOVIES);
  },

  /**
   * Lấy danh sách phim Hot (Featured)
   */
  async getHotMovies() {
    return await apiClient.get(API_ENDPOINTS.HOT_MOVIES);
  },

  /**
   * Lấy danh sách phim đang chiếu
   */
  async getNowPlaying() {
    return await apiClient.get(API_ENDPOINTS.NOW_PLAYING);
  },

  /**
   * Lấy chi tiết một bộ phim theo ID
   */
  async getMovieDetail(id: string) {
    return await apiClient.get(API_ENDPOINTS.MOVIE_DETAIL(id));
  }
};
