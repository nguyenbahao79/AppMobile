import React, { useState } from 'react';
import { StyleSheet, KeyboardAvoidingView, Platform, ScrollView, View, Alert } from 'react-native';
import { router } from 'expo-router';
import { ThemedView } from '@/components/base/themed-view';
import { ThemedText } from '@/components/base/themed-text';
import { AuthInput } from '@/features/auth/AuthInput';
import { AuthButton } from '@/features/auth/AuthButton';
import { authService } from '@/services/authService';

export default function ForgotPasswordScreen() {
  const [identifier, setIdentifier] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!identifier.trim()) {
      Alert.alert('Thông báo', 'Vui lòng nhập email hoặc số điện thoại.');
      return;
    }
    setLoading(true);
    try {
      const res = await authService.forgotPassword(identifier.trim());
      router.push({
        pathname: '/(auth)/verify-otp',
        params: {
          resetSessionToken: res.resetSessionToken,
          maskedEmail: res.maskedEmail || '',
          identifier: identifier.trim(),
        },
      });
    } catch (error: any) {
      Alert.alert('Không gửi được mã', error.message || 'Vui lòng thử lại sau.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.keyboardView}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <ThemedText type="title" style={styles.title}>Quên mật khẩu</ThemedText>
            <ThemedText style={styles.subtitle}>
              Dùng được cho cả tài khoản khách hàng và nhân viên. Nhập email hoặc số điện thoại để nhận mã xác nhận.
            </ThemedText>
          </View>

          <View style={styles.form}>
            <AuthInput
              label="Email / Số điện thoại"
              placeholder="Nhập email hoặc số điện thoại"
              value={identifier}
              onChangeText={setIdentifier}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <AuthButton title="Tiếp tục" onPress={handleSubmit} loading={loading} />
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
