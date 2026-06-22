// Cấu hình địa chỉ IP Backend của bạn
// Đảm bảo điện thoại/Simulator và Máy tính chạy BE cùng kết nối một mạng Wi-Fi
export const BASE_IP = '192.168.1.247'; 
export const PORT = '8080'; // Cổng chạy Backend (Node.js/Express: 3000, Spring Boot: 8080, PHP: 8000)

// URL gốc để gọi API (Khớp với Spring Boot @RequestMapping)
export const BASE_URL = `http://${BASE_IP}:${PORT}/api/v1`; 

export const API_ENDPOINTS = {
  // AUTHENTICATION
  LOGIN: '/auth/login', // Tổng cộng: /api/v1/auth/login
  REGISTER: '/auth/register', // Tổng cộng: /api/v1/auth/register
  REFRESH_TOKEN: '/auth/refresh',
  PROFILE: '/auth/profile',
  CHANGE_PASSWORD: '/auth/change-password',
  
  // MOVIES
  MOVIES: '/movies', 
  MOVIE_DETAIL: (id: string) => `/movies/${id}`,
  HOT_MOVIES: '/movies/hot',
  NOW_PLAYING: '/movies/now-playing',
  UPCOMING: '/movies/upcoming',
  
  // BOOKING & TICKETS
  BOOKING: '/bookings/create',
  MY_TICKETS: '/bookings/my-tickets',
  TICKET_DETAIL: (id: string) => `/bookings/ticket/${id}`,
  
  // STAFF
  VERIFY_TICKET: '/staff/verify-ticket',
};
