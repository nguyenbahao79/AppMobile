import { useEffect } from 'react';
import { router } from 'expo-router';

/**
 * Đích deep link (moviezone://payment-return) dùng làm returnUrl/cancelUrl khi mở trang thanh
 * toán PayOS trong app — WebBrowser.openAuthSessionAsync bắt được điều hướng này và tự đóng
 * trang thanh toán, trả kết quả về màn hình đã gọi checkout (xử lý ở đó). Route này chỉ cần tồn
 * tại để Expo Router không hiện màn hình lỗi "không tìm thấy route" khi hệ điều hành vẫn mở app
 * qua đường dẫn này — không cần hiển thị gì, thoát ngay lập tức.
 */
export default function PaymentReturn() {
  useEffect(() => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/');
    }
  }, []);

  return null;
}
