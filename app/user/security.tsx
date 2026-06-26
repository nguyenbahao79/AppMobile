import React, { useState } from 'react';
import { StyleSheet, ScrollView, View, Alert } from 'react-native';
import { router } from 'expo-router';
import { apiClient } from '@/api/client';
import { API_ENDPOINTS } from '@/api/config';
import { ThemedView } from '@/components/base/themed-view';
import { ThemedText } from '@/components/base/themed-text';
import { AuthInput } from '@/features/auth/AuthInput';
import { AuthButton } from '@/features/auth/AuthButton';
import { useAuth } from '@/context/AuthContext';

export default function SecurityScreen() {
  const { session } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleUpdatePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert('Lỗi', 'Vui lòng điền đầy đủ thông tin.');
      return;
    }

    if (!session?.user?.userId) {
      Alert.alert('Lỗi', 'Bạn cần đăng nhập tài khoản khách hàng.');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Lỗi', 'Mật khẩu mới không khớp.');
      return;
    }

    setIsLoading(true);
    try {
      await apiClient.put(API_ENDPOINTS.USER_PASSWORD(session.user.userId), {
        currentPassword,
        newPassword,
      });

      Alert.alert('Thành công', 'Mật khẩu đã được thay đổi.');
      router.back();
    } catch (error: any) {
      Alert.alert('Không đổi được mật khẩu', error.message || 'Vui lòng kiểm tra mật khẩu hiện tại.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <ThemedText style={styles.description}>
            Bạn nên sử dụng mật khẩu mạnh mà bạn chưa sử dụng ở đâu khác.
          </ThemedText>
        </View>

        <View style={styles.form}>
          <AuthInput
            label="Mật khẩu hiện tại"
            value={currentPassword}
            onChangeText={setCurrentPassword}
            placeholder="Nhập mật khẩu hiện tại"
            secureTextEntry
          />
          <AuthInput
            label="Mật khẩu mới"
            value={newPassword}
            onChangeText={setNewPassword}
            placeholder="Nhập mật khẩu mới"
            secureTextEntry
          />
          <AuthInput
            label="Xác nhận mật khẩu mới"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            placeholder="Nhập lại mật khẩu mới"
            secureTextEntry
          />

          <AuthButton
            title="Cập Nhật Mật Khẩu"
            onPress={handleUpdatePassword}
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
  },
  header: {
    marginBottom: 32,
  },
  description: {
    fontSize: 16,
    opacity: 0.7,
    lineHeight: 24,
  },
  form: {
    width: '100%',
  },
  saveButton: {
    marginTop: 20,
  },
});
