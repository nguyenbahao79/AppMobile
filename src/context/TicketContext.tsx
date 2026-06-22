import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { apiClient } from '@/api/client';
import { API_ENDPOINTS } from '@/api/config';

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
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(false);

  // Tải danh sách vé từ Backend
  const fetchTickets = async () => {
    setLoading(true);
    try {
      const data = await apiClient.get(API_ENDPOINTS.MY_TICKETS);
      if (data && Array.isArray(data)) {
        setTickets(data);
      }
    } catch (error) {
      console.warn('Backend tickets not available, using local state:', error);
    } finally {
      setLoading(false);
    }
  };

  // Tự động tải vé khi lần đầu vào app
  useEffect(() => {
    fetchTickets();
  }, []);

  const addTicket = async (ticket: Ticket) => {
    try {
      // Gửi lên Backend
      await apiClient.post(API_ENDPOINTS.BOOKING, ticket);
      // Cập nhật lại danh sách local
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
