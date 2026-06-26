import React, { useEffect, useState } from 'react';
import { StyleSheet, ScrollView, View, Image, TouchableOpacity, Alert } from 'react-native';
import { router } from 'expo-router';
import { apiClient } from '@/api/client';
import { API_ENDPOINTS } from '@/api/config';
import { ThemedView } from '@/components/base/themed-view';
import { ThemedText } from '@/components/base/themed-text';
import { AuthInput } from '@/features/auth/AuthInput';
import { AuthButton } from '@/features/auth/AuthButton';
import { IconSymbol } from '@/components/base/icon-symbol';
import { useAuth } from '@/context/AuthContext';
import { useThemeColor } from '@/hooks/use-theme-color';

export default function EditProfileScreen() {
  const { session, updateSessionUser } = useAuth();
  const user = session?.user;
  const [fullName, setFullName] = useState(user?.fullname || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [isLoading, setIsLoading] = useState(false);
  const tintColor = useThemeColor({}, 'tint');

  useEffect(() => {
    setFullName(user?.fullname || '');
    setEmail(user?.email || '');
    setPhone(user?.phone || '');
  }, [user]);

  const handleUpdate = async () => {
    if (!user?.userId) {
      Alert.alert('Lỗi', 'Bạn cần đăng nhập tài khoản khách hàng.');
      return;
    }

    if (!fullName.trim() || !email.trim() || !phone.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập đầy đủ họ tên, email và số điện thoại.');
      return;
    }

    setIsLoading(true);
    try {
      const updated = await apiClient.put(API_ENDPOINTS.USER_DETAIL(user.userId), {
        fullname: fullName.trim(),
        email: email.trim(),
        phone: phone.trim(),
      });

      updateSessionUser({
        ...user,
        ...(updated as typeof user),
      });

      Alert.alert('Thành công', 'Thông tin cá nhân đã được cập nhật.');
      router.back();
    } catch (error: any) {
      Alert.alert('Không cập nhật được', error.message || 'Vui lòng thử lại.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.avatarSection}>
          <View style={styles.avatarContainer}>
            <Image
              source={{ uri: 'https://images.unsplash.com/photo-1633332755192-727a05c4013d?w=400' }}
              style={styles.avatar}
            />
            <TouchableOpacity style={[styles.cameraButton, { backgroundColor: tintColor }]}>
              <IconSymbol name="camera.fill" size={16} color="white" />
            </TouchableOpacity>
          </View>
          <ThemedText style={styles.avatarHint}>Nhấn để thay đổi ảnh đại diện</ThemedText>
        </View>

        <View style={styles.form}>
          <AuthInput
            label="Họ và tên"
            value={fullName}
            onChangeText={setFullName}
            placeholder="Nhập họ và tên"
          />
          <AuthInput
            label="Email"
            value={email}
            onChangeText={setEmail}
            placeholder="Nhập email"
            keyboardType="email-address"
            editable={false} // Thường email không cho đổi dễ dàng
          />
          <AuthInput
            label="Số điện thoại"
            value={phone}
            onChangeText={setPhone}
            placeholder="Nhập số điện thoại"
            keyboardType="phone-pad"
          />

          <AuthButton
            title="Lưu Thay Đổi"
            onPress={handleUpdate}
            loading={isLoading}
            style={styles.saveButton}
          />
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
    alignItems: 'center',
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 12,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  cameraButton: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'white',
  },
  avatarHint: {
    fontSize: 14,
    opacity: 0.6,
  },
  form: {
    width: '100%',
  },
  saveButton: {
    marginTop: 20,
  },
});
