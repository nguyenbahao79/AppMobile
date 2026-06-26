import { BASE_URL, API_ENDPOINTS } from '@/api/config';
import { apiClient } from '@/api/client';

export type Showtime = {
  id: number;
  date: string;
  time: string;
  endTime?: string | null;
  movieId: number;
  movieTitle: string;
  roomId: number;
  roomName: string;
  cinemaId?: number;
  cinemaName?: string;
  basePrice: number;
  price: number;
  status: string;
  bookedSeatIds: number[];
};

export type Seat = {
  seatId: number;
  x: number;
  y: number;
  row: string;
  number: string;
  seatTypeName?: string;
  coupleSeat?: boolean;
  seatTypeColor?: string;
  seatTypeSurcharge: number;
  status: string;
};

export type Product = {
  productId: number;
  name: string;
  description?: string;
  price: number;
  image?: string;
};

export type TicketQuote = {
  ticketTotal?: number;
  snackTotal?: number;
  voucherDiscount?: number;
  finalAmount?: number;
  rankName?: string;
  membershipDiscountPercent?: number;
};

export type CheckoutResponse = {
  orderOnlineId?: number;
  payosOrderCode?: number;
  amountVnd?: number;
  payos?: {
    checkoutUrl?: string;
  };
};

type RawRecord = Record<string, unknown>;

const toNumber = (value: unknown, fallback = 0) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

function mapShowtime(raw: RawRecord): Showtime {
  return {
    id: toNumber(raw.id),
    date: String(raw.date ?? ''),
    time: String(raw.time ?? ''),
    endTime: raw.endTime == null ? null : String(raw.endTime),
    movieId: toNumber(raw.movie_id ?? raw.movieId),
    movieTitle: String(raw.movie_title ?? raw.movieTitle ?? ''),
    roomId: toNumber(raw.room_id ?? raw.roomId),
    roomName: String(raw.room_name ?? raw.roomName ?? ''),
    cinemaId: raw.cinema_id != null || raw.cinemaId != null ? toNumber(raw.cinema_id ?? raw.cinemaId) : undefined,
    cinemaName: raw.cinema_name != null || raw.cinemaName != null ? String(raw.cinema_name ?? raw.cinemaName) : undefined,
    basePrice: toNumber(raw.base_price ?? raw.basePrice),
    price: toNumber(raw.price),
    status: String(raw.status ?? ''),
    bookedSeatIds: Array.isArray(raw.bookedSeatIds) ? raw.bookedSeatIds.map((id) => toNumber(id)).filter(Boolean) : [],
  };
}

function mapSeat(raw: RawRecord): Seat {
  return {
    seatId: toNumber(raw.seatId),
    x: toNumber(raw.x),
    y: toNumber(raw.y),
    row: String(raw.row ?? ''),
    number: String(raw.number ?? ''),
    seatTypeName: raw.seatTypeName == null ? undefined : String(raw.seatTypeName),
    coupleSeat: Boolean(raw.coupleSeat),
    seatTypeColor: raw.seatTypeColor == null ? undefined : String(raw.seatTypeColor),
    seatTypeSurcharge: toNumber(raw.seatTypeSurcharge),
    status: String(raw.status ?? 'available'),
  };
}

function mapProduct(raw: RawRecord): Product {
  return {
    productId: toNumber(raw.productId ?? raw.id),
    name: String(raw.name ?? 'Sản phẩm'),
    description: raw.description == null ? undefined : String(raw.description),
    price: toNumber(raw.price),
    image: raw.image == null ? undefined : String(raw.image),
  };
}

function webReturnUrl(path: string) {
  const webBase = BASE_URL.replace(/\/api\/v1\/?$/i, '');
  return `${webBase}${path}`;
}

export const bookingService = {
  async getShowtimesByMovie(movieId: string | number) {
    const data = await apiClient.get(API_ENDPOINTS.SHOWTIMES(movieId));
    return Array.isArray(data) ? data.map((item) => mapShowtime(item as RawRecord)).filter((item) => item.id > 0) : [];
  },

  async getSeatsByRoom(roomId: string | number) {
    const data = await apiClient.get(API_ENDPOINTS.SEATS_BY_ROOM(roomId));
    return Array.isArray(data) ? data.map((item) => mapSeat(item as RawRecord)).filter((item) => item.seatId > 0) : [];
  },

  async getProducts(cinemaId?: string | number) {
    if (cinemaId) {
      try {
        const menu = await apiClient.get(API_ENDPOINTS.CINEMA_PRODUCT_MENU(cinemaId));
        const onSale = (menu as { onSale?: unknown[] } | null)?.onSale;
        if (Array.isArray(onSale)) {
          return onSale.map((item) => mapProduct(item as RawRecord)).filter((item) => item.productId > 0);
        }
      } catch {
        // Nếu rạp chưa cấu hình menu, fallback sang danh mục sản phẩm toàn hệ thống.
      }
    }

    const data = await apiClient.get(API_ENDPOINTS.PRODUCTS);
    return Array.isArray(data)
      ? data
          .filter((item) => toNumber((item as RawRecord).status, 1) === 1)
          .map((item) => mapProduct(item as RawRecord))
          .filter((item) => item.productId > 0)
      : [];
  },

  async holdSeats(showtimeId: number, holderId: string, seatIds: number[]) {
    await apiClient.post(API_ENDPOINTS.HOLD_SEATS, { showtimeId, holderId, seatIds });
  },

  async quote(payload: { showtimeId: number; seatIds: number[]; snacks?: { productId: number; quantity: number }[] }) {
    return apiClient.post(API_ENDPOINTS.QUOTE_TICKETS, payload) as Promise<TicketQuote>;
  },

  async checkout(payload: {
    showtimeId: number;
    seatIds: number[];
    clientHoldId?: string;
    snacks?: { productId: number; quantity: number }[];
  }) {
    return apiClient.post(API_ENDPOINTS.CHECKOUT_TICKETS, {
      ...payload,
      returnUrl: webReturnUrl('/payment/success'),
      cancelUrl: webReturnUrl('/payment/cancel'),
    }) as Promise<CheckoutResponse>;
  },
};
