import { apiClient } from '../api/client';
import { API_ENDPOINTS } from '../api/config';
import { Movie } from '../mocks/movies';

type BackendMovie = Record<string, unknown>;

function mapMovie(raw: BackendMovie): Movie {
  const id = raw.id ?? raw.movieId ?? '';
  const poster = String(raw.poster ?? raw.posterUrl ?? 'https://placehold.co/400x600?text=Movie');
  const banner = String(raw.banner ?? raw.backdrop ?? poster);
  const status = Number(raw.status ?? 0);
  return {
    id: String(id),
    title: String(raw.title ?? 'Chưa có tên'),
    genre: String(raw.genreName ?? raw.genre ?? ''),
    duration: String(raw.duration ?? ''),
    rating: Number(raw.rating ?? 5),
    poster,
    posterUrl: poster,
    backdrop: banner,
    banner,
    description: String(raw.description ?? raw.content ?? ''),
    releaseDate: String(raw.releaseDate ?? ''),
    isNowPlaying: status === 1,
    isHot: Boolean(raw.isHot),
    status,
  };
}

export const movieService = {
  /**
   * Lấy danh sách tất cả phim từ Backend
   */
  async getAllMovies() {
    const data = await apiClient.get(API_ENDPOINTS.MOVIES);
    return Array.isArray(data) ? data.map((item) => mapMovie(item as BackendMovie)) : [];
  },

  /**
   * Alias cho getAllMovies để tương thích
   */
  async getMovies() {
    return await this.getAllMovies();
  },

  /**
   * Lấy danh sách phim Hot (Featured)
   */
  async getHotMovies() {
    return (await this.getAllMovies()).filter((movie) => movie.isHot);
  },

  /**
   * Lấy danh sách phim đang chiếu
   */
  async getNowPlaying() {
    return (await this.getAllMovies()).filter((movie) => movie.isNowPlaying);
  },

  /**
   * Lấy chi tiết một bộ phim theo ID
   */
  async getMovieDetail(id: string) {
    const data = await apiClient.get(API_ENDPOINTS.MOVIE_DETAIL(id));
    return mapMovie((data ?? {}) as BackendMovie);
  }
};
