export interface ScannedTicket {
  id: string;
  movieTitle: string;
  theater: string;
  seats: string[];
  dateTime: string;
  customerName: string;
  extras: string[]; // e.g. ["Large Popcorn", "Coke"]
  status: 'valid' | 'used' | 'invalid';
}

export const TICKETS_MOCK: Record<string, ScannedTicket> = {
  'TICKET_123': {
    id: 'TICKET_123',
    movieTitle: 'Avatar: The Way of Water',
    theater: 'CGV Vincom Center',
    seats: ['A1', 'A2'],
    dateTime: '20 Oct, 2023 - 19:30',
    customerName: 'Nguyen Van A',
    extras: ['2x Caramel Popcorn', '2x Pepsi Large'],
    status: 'valid',
  },
  'TICKET_456': {
    id: 'TICKET_456',
    movieTitle: 'Oppenheimer',
    theater: 'Lotte Cinema Landmark',
    seats: ['C4'],
    dateTime: '22 Oct, 2023 - 20:15',
    customerName: 'Le Thi B',
    extras: ['1x Small Popcorn'],
    status: 'used',
  }
};
