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
  cinemaAddress?: string;
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

const normalizeText = (value: unknown) =>
  String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

const isCoupleSeatName = (value: unknown) => {
  const name = normalizeText(value);
  return name.includes('doi') || name.includes('couple') || name.includes('double') || name.includes('love');
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
    cinemaAddress:
      raw.cinema_address != null || raw.cinemaAddress != null || (raw.cinema as RawRecord | undefined)?.address != null
        ? String(raw.cinema_address ?? raw.cinemaAddress ?? (raw.cinema as RawRecord | undefined)?.address)
        : undefined,
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
    coupleSeat: Boolean(raw.coupleSeat ?? raw.couple_seat) || isCoupleSeatName(raw.seatTypeName ?? raw.seat_type_name),
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

export function webReturnUrl(path: string) {
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

  /** @returns `warning` = true nếu tài khoản đang giữ/huỷ ghế bất thường nhiều lần — hiện cảnh báo nguy cơ khoá tài khoản. */
  async holdSeats(showtimeId: number, holderId: string, seatIds: number[]) {
    const data = await apiClient.post(API_ENDPOINTS.HOLD_SEATS, { showtimeId, holderId, seatIds });
    return (data as { warning?: boolean } | null)?.warning === true;
  },

  /** Ghế đang được người khác (khác holderId) giữ tạm — dùng để hiện trạng thái "đang được giữ". */
  async getPeerHolds(showtimeId: number, holderId: string) {
    const data = await apiClient.get(API_ENDPOINTS.SEAT_HOLDS_PEER(showtimeId, holderId));
    return Array.isArray(data) ? data.map((id) => Number(id)).filter((id) => Number.isFinite(id)) : [];
  },

  async quote(payload: {
    showtimeId: number;
    seatIds: number[];
    snacks?: { productId: number; quantity: number }[];
    userVoucherId?: number;
  }) {
    return apiClient.post(API_ENDPOINTS.QUOTE_TICKETS, payload) as Promise<TicketQuote>;
  },

  async checkout(payload: {
    showtimeId: number;
    seatIds: number[];
    clientHoldId?: string;
    snacks?: { productId: number; quantity: number }[];
    userVoucherId?: number;
    returnUrl?: string;
    cancelUrl?: string;
  }) {
    return apiClient.post(API_ENDPOINTS.CHECKOUT_TICKETS, {
      ...payload,
      returnUrl: payload.returnUrl ?? webReturnUrl('/payment/success'),
      cancelUrl: payload.cancelUrl ?? webReturnUrl('/payment/cancel'),
    }) as Promise<CheckoutResponse>;
  },

  async confirmPayos(payosOrderCode: number) {
    return apiClient.post(API_ENDPOINTS.CONFIRM_PAYOS_TICKETS, { payosOrderCode });
  },

  /** Chỉ hủy được đơn vé đang ở trạng thái "pending" (chưa thanh toán) — khớp hành vi web. */
  async cancelPendingOrder(payosOrderCode: number) {
    return apiClient.post(API_ENDPOINTS.CANCEL_PENDING_TICKETS, { payosOrderCode });
  },
};
