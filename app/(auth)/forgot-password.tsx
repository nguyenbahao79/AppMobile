import React, { useState } from 'react';
import {
  StyleSheet, KeyboardAvoidingView, Platform, ScrollView, View, Text, TextInput,
  TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { authService } from '@/services/authService';

const NAVY = '#0d0d2b';
const CARD_BG = '#14143a';
const PURPLE = '#8b00ff';
const PINK = '#ff2d78';
const YELLOW = '#d4ff00';
const OFF_WHITE = '#f0f0ff';
const MUTED = 'rgba(240,240,255,0.5)';
const BORDER = 'rgba(255,255,255,0.12)';
const INPUT_BG = 'rgba(255,255,255,0.06)';

export default function ForgotPasswordScreen() {
  const [identifier, setIdentifier] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!identifier.trim()) {
      setError('Tài khoản không được để trống');
      return;
    }
    setError('');
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
    } catch (err: any) {
      setError(err.message || 'Vui lòng thử lại sau.');
    } finally {
      setLoading(false);
    }
  };

  const isDisabled = loading || !identifier.trim();

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.card}>
            {/* Strip */}
            <View style={styles.strip} />

            {/* Step badge */}
            <Text style={styles.stepBadge}>BƯỚC 1 / 3 — NHẬP TÀI KHOẢN</Text>

            {/* Title */}
            <Text style={styles.title}>
              QUÊN <Text style={styles.titleAccent}>MẬT KHẨU</Text>
            </Text>

            {/* Icon */}
            <View style={styles.iconWrap}>
              <View style={styles.iconCircle}>
                <Ionicons name="mail-outline" size={30} color={PINK} />
              </View>
            </View>

            <Text style={styles.desc}>
              Vui lòng nhập email hoặc số điện thoại đã đăng ký để nhận mã xác nhận
            </Text>

            {/* Input */}
            <View style={styles.field}>
              <Text style={styles.label}>Email / Số điện thoại</Text>
              <View style={[styles.inputGroup, !!error && styles.inputError]}>
                <View style={styles.inputIcon}>
                  <Ionicons name="person-outline" size={16} color={MUTED} />
                </View>
                <TextInput
                  style={styles.input}
                  placeholder="Nhập email hoặc số điện thoại"
                  placeholderTextColor="rgba(240,240,255,0.3)"
                  value={identifier}
                  onChangeText={(t) => { setIdentifier(t); setError(''); }}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!loading}
                  allowFontScaling={false}
                />
              </View>
              {!!error && <Text style={styles.errorText}>{error}</Text>}
            </View>

            {/* Submit */}
            <TouchableOpacity
              style={[styles.btn, isDisabled && styles.btnDisabled]}
              onPress={handleSubmit}
              disabled={isDisabled}
              activeOpacity={0.85}
            >
              {loading
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.btnText}>TIẾP TỤC</Text>
              }
            </TouchableOpacity>

            {/* Footer */}
            <View style={styles.footer}>
              <Text style={styles.footerText}>Nhớ mật khẩu rồi? </Text>
              <TouchableOpacity onPress={() => router.back()}>
                <Text style={styles.footerLink}>Đăng nhập</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: NAVY,
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 32,
  },
  card: {
    width: '100%',
    maxWidth: 440,
    backgroundColor: CARD_BG,
    borderWidth: 1,
    borderColor: 'rgba(212,255,0,0.18)',
    borderRadius: 20,
    paddingHorizontal: 28,
    paddingTop: 32,
    paddingBottom: 28,
  },
  strip: {
    height: 3,
    width: 56,
    backgroundColor: PURPLE,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 14,
  },
  stepBadge: {
    fontSize: 10,
    fontWeight: '700',
    color: PINK,
    textAlign: 'center',
    letterSpacing: 1,
    marginBottom: 6,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: OFF_WHITE,
    textAlign: 'center',
    marginBottom: 20,
    letterSpacing: 2,
  },
  titleAccent: {
    color: YELLOW,
  },
  iconWrap: {
    alignItems: 'center',
    marginBottom: 14,
  },
  iconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: 'rgba(139,0,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,45,120,0.28)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  desc: {
    fontSize: 13,
    fontWeight: '600',
    color: MUTED,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 22,
  },
  field: {
    marginBottom: 16,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: MUTED,
    marginBottom: 8,
  },
  inputGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: BORDER,
    borderRadius: 10,
    backgroundColor: INPUT_BG,
    overflow: 'hidden',
  },
  inputError: {
    borderColor: 'rgba(255,45,120,0.55)',
  },
  inputIcon: {
    paddingHorizontal: 13,
    paddingVertical: 12,
    borderRightWidth: 1,
    borderRightColor: BORDER,
  },
  input: {
    flex: 1,
    color: OFF_WHITE,
    fontSize: 14,
    paddingHorizontal: 13,
    paddingVertical: 11,
    backgroundColor: 'transparent',
  },
  errorText: {
    fontSize: 12,
    fontWeight: '700',
    color: PINK,
    marginTop: 6,
    letterSpacing: 0.3,
  },
  btn: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: PURPLE,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  btnDisabled: {
    opacity: 0.35,
  },
  btnText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: 'bold',
    letterSpacing: 1.5,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 22,
    flexWrap: 'wrap',
    gap: 4,
  },
  footerText: {
    fontSize: 13,
    fontWeight: '600',
    color: MUTED,
  },
  footerLink: {
    fontSize: 13,
    fontWeight: 'bold',
    color: YELLOW,
  },
});
