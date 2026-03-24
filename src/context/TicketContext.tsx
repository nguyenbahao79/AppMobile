import React, { createContext, useContext, useState, ReactNode } from 'react';

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
  addTicket: (ticket: Ticket) => void;
  cancelTicket: (id: string) => void;
}

const TicketContext = createContext<TicketContextType | undefined>(undefined);

export function TicketProvider({ children }: { children: ReactNode }) {
  const [tickets, setTickets] = useState<Ticket[]>([]);

  const addTicket = (ticket: Ticket) => {
    setTickets((prev) => [ticket, ...prev]);
  };

  const cancelTicket = (id: string) => {
    setTickets((prev) => prev.map(t => t.id === id ? { ...t, status: 'cancelled' } : t));
  };

  return (
    <TicketContext.Provider value={{ tickets, addTicket, cancelTicket }}>
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
