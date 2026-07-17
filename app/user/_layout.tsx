import { Stack } from 'expo-router';

export default function UserLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="movie/[id]" options={{ headerShown: true, title: 'Movie Details' }} />
      <Stack.Screen name="booking/[id]" options={{ headerShown: true, title: 'Select Seats' }} />
      <Stack.Screen name="edit-profile" options={{ headerShown: true, title: 'Thông tin cá nhân' }} />
      <Stack.Screen name="security" options={{ headerShown: true, title: 'Bảo mật & Mật khẩu' }} />
      <Stack.Screen name="favorites" options={{ headerShown: false }} />
      <Stack.Screen name="vouchers" options={{ headerShown: false }} />
      <Stack.Screen name="points-history" options={{ headerShown: false }} />
      <Stack.Screen name="news/index" options={{ headerShown: false }} />
      <Stack.Screen name="news/[id]" options={{ headerShown: true, title: 'Chi tiết tin' }} />
      <Stack.Screen name="cinemas" options={{ headerShown: false }} />
      <Stack.Screen name="food-order" options={{ headerShown: true, title: 'Đặt bắp nước' }} />
    </Stack>
  );
}
