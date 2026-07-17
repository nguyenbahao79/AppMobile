import React, { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, KeyboardAvoidingView, Platform, ScrollView, View, Alert, TouchableOpacity } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { ThemedView } from '@/components/base/themed-view';
import { ThemedText } from '@/components/base/themed-text';
import { AuthInput } from '@/features/auth/AuthInput';
import { AuthButton } from '@/features/auth/AuthButton';
import { useThemeColor } from '@/hooks/use-theme-color';
import { authService } from '@/services/authService';

export default function VerifyOtpScreen() {
  const params = useLocalSearchParams<{ resetSessionToken: string; maskedEmail?: string; identifier?: string }>();
  const resetSessionToken = params.resetSessionToken;
  const tintColor = useThemeColor({}, 'tint');

  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startCountdown = useCallback(() => {
    setCountdown(60);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          return 0;
        }
        return c - 1;
      });
    }, 1000);
  }, []);

  useEffect(() => {
    startCountdown();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [startCountdown]);

  const handleResend = async () => {
    if (countdown > 0 || !resetSessionToken) return;
    try {
      await authService.resendForgotOtp(resetSessionToken);
      startCountdown();
      Alert.alert('Đã gửi lại', 'Mã xác nhận mới đã được gửi tới email của bạn.');
    } catch (error: any) {
      Alert.alert('Không gửi lại được', error.message || 'Vui lòng thử lại sau.');
    }
  };

  const handleSubmit = async () => {
    if (otp.trim().length !== 6) {
      Alert.alert('Thông báo', 'Mã xác nhận gồm 6 chữ số.');
      return;
    }
    if (!resetSessionToken) {
      Alert.alert('Lỗi', 'Phiên đặt lại mật khẩu không hợp lệ. Vui lòng thử lại từ đầu.');
      router.replace('/(auth)/forgot-password');
      return;
    }
    setLoading(true);
    try {
      await authService.verifyForgotOtp(resetSessionToken, otp.trim());
      router.push({ pathname: '/(auth)/reset-password', params: { resetSessionToken } });
    } catch (error: any) {
      Alert.alert('Mã không đúng', error.message || 'Vui lòng kiểm tra lại mã xác nhận.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.keyboardView}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <ThemedText type="title" style={styles.title}>Xác minh mã</ThemedText>
            <ThemedText style={styles.subtitle}>
              Nhập mã xác nhận đã gửi tới {params.maskedEmail || 'email của bạn'}
            </ThemedText>
          </View>

          <View style={styles.form}>
            <AuthInput
              label="Mã xác nhận"
              placeholder="Nhập 6 chữ số"
              value={otp}
              onChangeText={(t) => setOtp(t.replace(/\D/g, '').slice(0, 6))}
              keyboardType="number-pad"
              maxLength={6}
            />
            <TouchableOpacity style={styles.resend} onPress={handleResend} disabled={countdown > 0}>
              <ThemedText style={[styles.resendText, { color: countdown > 0 ? undefined : tintColor, opacity: countdown > 0 ? 0.5 : 1 }]}>
                {countdown > 0 ? `Gửi lại mã (${countdown}s)` : 'Gửi lại mã'}
              </ThemedText>
            </TouchableOpacity>
            <AuthButton title="Xác nhận" onPress={handleSubmit} loading={loading} />
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
  resend: { alignSelf: 'flex-end', marginBottom: 24 },
  resendText: { fontSize: 14 },
});
