import { Stack } from 'expo-router';

export default function UserLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="movie/[id]" options={{ headerShown: true, title: 'Movie Details' }} />
      <Stack.Screen name="booking/[id]" options={{ headerShown: true, title: 'Select Seats' }} />
      <Stack.Screen name="edit-profile" options={{ headerShown: true, title: 'Thông tin cá nhân' }} />
      <Stack.Screen name="security" options={{ headerShown: true, title: 'Bảo mật & Mật khẩu' }} />
    </Stack>
  );
}
