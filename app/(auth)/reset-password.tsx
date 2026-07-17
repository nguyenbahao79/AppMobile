import React, { useState } from 'react';
import { StyleSheet, KeyboardAvoidingView, Platform, ScrollView, View, Alert } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { ThemedView } from '@/components/base/themed-view';
import { ThemedText } from '@/components/base/themed-text';
import { AuthInput } from '@/features/auth/AuthInput';
import { AuthButton } from '@/features/auth/AuthButton';
import { authService } from '@/services/authService';

export default function ResetPasswordScreen() {
  const params = useLocalSearchParams<{ resetSessionToken: string }>();
  const resetSessionToken = params.resetSessionToken;

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (password.length < 8) {
      Alert.alert('Thông báo', 'Mật khẩu phải có ít nhất 8 ký tự.');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Thông báo', 'Hai lần nhập mật khẩu không giống nhau.');
      return;
    }
    if (!resetSessionToken) {
      Alert.alert('Lỗi', 'Phiên đặt lại mật khẩu không hợp lệ. Vui lòng thử lại từ đầu.');
      router.replace('/(auth)/forgot-password');
      return;
    }
    setLoading(true);
    try {
      await authService.resetPassword(resetSessionToken, password);
      Alert.alert('Thành công', 'Mật khẩu đã được cập nhật. Vui lòng đăng nhập lại.', [
        { text: 'Đăng nhập ngay', onPress: () => router.replace('/(auth)/login') },
      ]);
    } catch (error: any) {
      Alert.alert('Không đặt lại được mật khẩu', error.message || 'Vui lòng thử lại sau.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.keyboardView}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <ThemedText type="title" style={styles.title}>Đặt mật khẩu mới</ThemedText>
            <ThemedText style={styles.subtitle}>Chọn mật khẩu mới tương đối mạnh cho tài khoản của bạn.</ThemedText>
          </View>

          <View style={styles.form}>
            <AuthInput
              label="Mật khẩu mới"
              placeholder="Nhập mật khẩu mới"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
            <AuthInput
              label="Nhập lại mật khẩu"
              placeholder="Nhập lại mật khẩu mới"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
            />
            <AuthButton title="Hoàn thành" onPress={handleSubmit} loading={loading} />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  keyboardView: { flex: 1 },
  scrollContent: { paddingHorizontal: 24, paddingTop: 80, paddingBottom: 40, alignItems: 'center' },
  header: { alignItems: 'center', marginBottom: 40 },
  title: { marginBottom: 8, textAlign: 'center' },
  subtitle: { textAlign: 'center', opacity: 0.6 },
  form: { width: '100%' },
});
