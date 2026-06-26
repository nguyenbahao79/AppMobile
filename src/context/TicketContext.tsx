import React, { createContext, useContext, useState, ReactNode, useCallback, useEffect } from 'react';
import { apiClient } from '@/api/client';
import { API_ENDPOINTS, BASE_URL } from '@/api/config';
import { useAuth } from '@/context/AuthContext';

export interface Ticket {
  id: string;
  movieId: string;
  movieTitle: string;
  moviePoster: string;
  date: string;
  time: string;
  seats: string[];
  totalPrice: number;
  paymentMethod: string;
  bookingDate: string;
  status: 'active' | 'used' | 'cancelled';
  qrCode: string;
  qrToken?: string;
  ticketCode?: string;
  roomName?: string;
  cinemaName?: string;
}

type TransactionItem = {
  label?: string;
  sub?: string;
  price?: number;
  ticketId?: number;
  ticketCode?: string;
  qrToken?: string;
  moviePoster?: string;
  showDate?: string;
  showTime?: string;
  seatLabel?: string;
  roomName?: string;
  cinemaName?: string;
};

type Transaction = {
  id?: string | number;
  orderCode?: string | number;
  type?: string;
  status?: string;
  items?: TransactionItem[];
  finalAmount?: number;
  createdAt?: string;
};

function formatDate(value?: string) {
  if (!value) return '';
  const date = new Date(value);
  if (!Number.isNaN(date.getTime())) {
    return date.toLocaleDateString('vi-VN');
  }
  return value;
}

function qrImageUrl(qrToken?: string) {
  return qrToken ? `${BASE_URL}${API_ENDPOINTS.TICKET_QR(qrToken)}` : '';
}

interface TicketContextType {
  tickets: Ticket[];
  fetchTickets: () => Promise<void>;
  addTicket: (ticket: Ticket) => Promise<void>;
  cancelTicket: (id: string) => Promise<void>;
  loading: boolean;
}

const TicketContext = createContext<TicketContextType | undefined>(undefined);

export function TicketProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(false);

  // Tải danh sách vé từ Backend
  const fetchTickets = useCallback(async () => {
    setLoading(true);
    try {
      if (!session?.user) {
        setTickets([]);
        return;
      }
      const data = await apiClient.get(API_ENDPOINTS.MY_TRANSACTIONS);
      if (data && Array.isArray(data)) {
        const mappedTickets = (data as Transaction[])
          .filter((transaction) => transaction.type === 'ticket_online')
          .map((transaction) => {
            const createdAt = transaction.createdAt ? new Date(transaction.createdAt) : new Date();
            const bookingDate = createdAt.toLocaleDateString('vi-VN');
            const ticketItems = (transaction.items || []).filter((item) => item.ticketId || item.qrToken || item.ticketCode);

            if (ticketItems.length === 0) {
              const firstItem = transaction.items?.[0];
              return [{
                id: String(transaction.orderCode || transaction.id),
                movieId: '',
                movieTitle: firstItem?.label || 'Vé xem phim',
                moviePoster: firstItem?.moviePoster || 'https://placehold.co/160x240?text=Ticket',
                date: bookingDate,
                time: createdAt.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
                seats: transaction.items?.map((item) => item.seatLabel || item.sub).filter(Boolean) as string[] || [],
                totalPrice: Number(transaction.finalAmount || 0),
                paymentMethod: 'PayOS',
                bookingDate,
                status: transaction.status === 'cancelled' ? 'cancelled' : 'active',
                qrCode: '',
              } as Ticket];
            }

            const firstTicket = ticketItems[0];
            const seats = Array.from(new Set(ticketItems.map((item) => item.seatLabel || item.sub).filter(Boolean))) as string[];

            return {
              id: String(transaction.orderCode || transaction.id || firstTicket.ticketCode || firstTicket.ticketId),
              movieId: '',
              movieTitle: firstTicket.label || 'Vé xem phim',
              moviePoster: firstTicket.moviePoster || 'https://placehold.co/160x240?text=Ticket',
              date: formatDate(firstTicket.showDate) || bookingDate,
              time: firstTicket.showTime || '',
              seats: seats.length ? seats : ['—'],
              totalPrice: Number(transaction.finalAmount || ticketItems.reduce((sum, item) => sum + Number(item.price || 0), 0)),
              paymentMethod: 'PayOS',
              bookingDate,
              status: transaction.status === 'cancelled' ? 'cancelled' : 'active',
              qrCode: qrImageUrl(firstTicket.qrToken),
              qrToken: firstTicket.qrToken,
              ticketCode: String(transaction.orderCode || firstTicket.ticketCode || ''),
              roomName: firstTicket.roomName,
              cinemaName: firstTicket.cinemaName,
            } as Ticket;
          })
          .flat();
        setTickets(mappedTickets);
      }
    } catch (error) {
      console.warn('Backend tickets not available, using local state:', error);
    } finally {
      setLoading(false);
    }
  }, [session?.user]);

  // Tự động tải vé khi lần đầu vào app
  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  const addTicket = async (ticket: Ticket) => {
    try {
      setTickets((prev) => [ticket, ...prev]);
    } catch (error) {
      console.error('Failed to save ticket to backend:', error);
      // Vẫn lưu local để trải nghiệm không bị ngắt quãng
      setTickets((prev) => [ticket, ...prev]);
    }
  };

  const cancelTicket = async (id: string) => {
    try {
      // Gọi API hủy vé nếu backend hỗ trợ
      // await apiClient.put(`/bookings/cancel/${id}`, {});
      setTickets((prev) => prev.map(t => t.id === id ? { ...t, status: 'cancelled' } : t));
    } catch (error) {
      console.error('Failed to cancel ticket on backend:', error);
    }
  };

  return (
    <TicketContext.Provider value={{ tickets, fetchTickets, addTicket, cancelTicket, loading }}>
      {children}
    </TicketContext.Provider>
  );
}

export function useTickets() {
  const context = useContext(TicketContext);
  if (context === undefined) {
    throw new Error('useTickets must be used within a TicketProvider');
  }
  return context;
}
