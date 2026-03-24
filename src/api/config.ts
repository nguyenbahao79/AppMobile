// Cấu hình địa chỉ IP Backend của bạn
// Đảm bảo điện thoại/Simulator và Máy tính chạy BE cùng kết nối một mạng Wi-Fi
export const BASE_IP = '172.16.45.56'; 
export const PORT = '3000'; // Cổng chạy Backend (Node.js/Express: 3000, Spring Boot: 8080, PHP: 8000)

// URL gốc để gọi API
export const BASE_URL = `http://${BASE_IP}:${PORT}/api`;

export const API_ENDPOINTS = {
  // AUTHENTICATION
  LOGIN: '/auth/login',
  REGISTER: '/auth/register',
  PROFILE: '/auth/profile',
  CHANGE_PASSWORD: '/auth/change-password',
  
  // MOVIES
  MOVIES: '/movies', // Lấy tất cả phim
  MOVIE_DETAIL: (id: string) => `/movies/${id}`, // Chi tiết 1 phim
  HOT_MOVIES: '/movies/hot', // Phim hot/featured
  NOW_PLAYING: '/movies/now-playing', // Phim đang chiếu
  UPCOMING: '/movies/upcoming', // Phim sắp chiếu
  
  // BOOKING & TICKETS
  BOOKING: '/bookings/create', // Đặt vé mới
  MY_TICKETS: '/bookings/my-tickets', // Danh sách vé của tôi
  TICKET_DETAIL: (id: string) => `/bookings/ticket/${id}`,
  
  // STAFF
  VERIFY_TICKET: '/staff/verify-ticket', // Soát vé bằng QR
};
