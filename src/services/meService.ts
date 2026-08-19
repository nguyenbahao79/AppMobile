import { apiClient } from '@/api/client';
import { API_ENDPOINTS } from '@/api/config';
import type { PublicVoucher } from '@/services/voucherService';

export type MovieReview = {
  reviewId?: number;
  movieId?: number;
  ticketId?: number;
  rating: number;
  comment?: string;
  userName?: string;
  userAvatar?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type MovieReviewStatus = {
  movieId: number;
  canReview: boolean;
  review: MovieReview | null;
};

export type FavoriteMovie = {
  favoriteId: number;
  movieId: number;
  title: string;
  poster: string;
  duration?: number;
  status?: number;
  canReview?: boolean;
  review?: MovieReview | null;
};

export type MyVoucher = {
  userVoucherId: number;
  /** 1 = chưa dùng, 0 = đã dùng */
  status: number;
  voucher: PublicVoucher;
};

export type PointsHistoryRow = {
  pointHistoryId: number;
  date: string;
  description: string;
  points: number;
};

export type MembershipRank = {
  id: number;
  rankName: string;
  minSpending: number;
  discountPercent: number;
  bonusPoint?: number;
  description?: string;
};

export type PagedResult<T> = {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
};

function emptyPage<T>(page: number, size: number): PagedResult<T> {
  return { content: [], page, size, totalElements: 0, totalPages: 0 };
}

export const meService = {
  /** Toàn bộ yêu thích (không phân trang) — dùng cho các nơi chỉ cần kiểm tra/tra cứu, VD trang chi tiết phim. */
  async getFavorites() {
    const data = await this.getFavoritesPage(0, 100);
    return data.content;
  },

  /** Phân trang thật — dùng cho màn hình "Phim yêu thích" (danh sách dài, cuộn tải thêm). */
  async getFavoritesPage(page = 0, size = 10) {
    const data = await apiClient.get(`${API_ENDPOINTS.MY_FAVORITES}?page=${page}&size=${size}`);
    return (data as PagedResult<FavoriteMovie>) ?? emptyPage<FavoriteMovie>(page, size);
  },

  async addFavorite(movieId: number) {
    await apiClient.post(API_ENDPOINTS.MY_FAVORITES, { movieId });
  },

  async removeFavorite(movieId: number) {
    await apiClient.delete(API_ENDPOINTS.FAVORITE_BY_MOVIE(movieId));
  },

  async getMovieReviewStatus(movieId: number) {
    return apiClient.get(API_ENDPOINTS.MOVIE_REVIEW_BY_MOVIE(movieId)) as Promise<MovieReviewStatus>;
  },

  async submitReview(movieId: number, rating: number, comment?: string) {
    return apiClient.put(API_ENDPOINTS.MOVIE_REVIEW_BY_MOVIE(movieId), { rating, comment }) as Promise<MovieReview>;
  },

  /** Toàn bộ voucher trong ví (không phân trang) — dùng khi cần lọc nhanh lúc thanh toán. */
  async getMyVouchers() {
    const data = await this.getMyVouchersPage(0, 100);
    return data.content;
  },

  /** Phân trang thật — dùng cho màn hình "Ví voucher". */
  async getMyVouchersPage(page = 0, size = 10) {
    const data = await apiClient.get(`${API_ENDPOINTS.MY_VOUCHERS}?page=${page}&size=${size}`);
    return (data as PagedResult<MyVoucher>) ?? emptyPage<MyVoucher>(page, size);
  },

  async redeemVoucher(voucherId: number) {
    await apiClient.post(API_ENDPOINTS.REDEEM_VOUCHER, { voucherId });
  },

  /** Toàn bộ lịch sử điểm (không phân trang). */
  async getPointsHistory() {
    const data = await this.getPointsHistoryPage(0, 100);
    return data.content;
  },

  /** Phân trang thật — dùng cho màn hình "Lịch sử điểm". */
  async getPointsHistoryPage(page = 0, size = 10) {
    const data = await apiClient.get(`${API_ENDPOINTS.POINTS_HISTORY}?page=${page}&size=${size}`);
    return (data as PagedResult<PointsHistoryRow>) ?? emptyPage<PointsHistoryRow>(page, size);
  },

  /** Danh sách hạng thành viên thật từ BE (không hardcode) — sắp theo minSpending tăng dần. */
  async getMembershipRanks() {
    const data = await apiClient.get(API_ENDPOINTS.MEMBERSHIP_RANKS);
    const ranks = Array.isArray(data) ? (data as MembershipRank[]) : [];
    return [...ranks].sort((a, b) => Number(a.minSpending ?? 0) - Number(b.minSpending ?? 0));
  },
};
