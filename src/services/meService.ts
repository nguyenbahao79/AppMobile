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

export const meService = {
  async getFavorites() {
    const data = await apiClient.get(API_ENDPOINTS.MY_FAVORITES);
    return Array.isArray(data) ? (data as FavoriteMovie[]) : [];
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

  async getMyVouchers() {
    const data = await apiClient.get(API_ENDPOINTS.MY_VOUCHERS);
    return Array.isArray(data) ? (data as MyVoucher[]) : [];
  },

  async redeemVoucher(voucherId: number) {
    await apiClient.post(API_ENDPOINTS.REDEEM_VOUCHER, { voucherId });
  },

  async getPointsHistory() {
    const data = await apiClient.get(API_ENDPOINTS.POINTS_HISTORY);
    return Array.isArray(data) ? (data as PointsHistoryRow[]) : [];
  },

  /** Danh sách hạng thành viên thật từ BE (không hardcode) — sắp theo minSpending tăng dần. */
  async getMembershipRanks() {
    const data = await apiClient.get(API_ENDPOINTS.MEMBERSHIP_RANKS);
    const ranks = Array.isArray(data) ? (data as MembershipRank[]) : [];
    return [...ranks].sort((a, b) => Number(a.minSpending ?? 0) - Number(b.minSpending ?? 0));
  },
};
