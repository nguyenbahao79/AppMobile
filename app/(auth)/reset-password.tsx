import React, { useState } from 'react';
import {
  StyleSheet, KeyboardAvoidingView, Platform, ScrollView, View, Text, TextInput,
  TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
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

function RuleRow({ pass, text }: { pass: boolean; text: string }) {
  return (
    <View style={styles.ruleRow}>
      <Ionicons
        name={pass ? 'checkmark-circle' : 'ellipse-outline'}
        size={14}
        color={pass ? YELLOW : 'rgba(240,240,255,0.25)'}
      />
      <Text style={[styles.ruleText, pass && styles.ruleTextPass]}>{text}</Text>
    </View>
  );
}

export default function ResetPasswordScreen() {
  const params = useLocalSearchParams<{ resetSessionToken: string }>();
  const { resetSessionToken } = params;

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [showPw2, setShowPw2] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const rule1 = password.length >= 8;
  const rule2 = /[a-z]/.test(password) && /[A-Z]/.test(password) && /[^A-Za-z0-9]/.test(password);
  const rule3 = password.length > 0 && password === confirmPassword;

  const canSubmit = rule1 && rule2 && rule3;

  const handleSubmit = async () => {
    if (!canSubmit) {
      if (!rule1 || !rule2) {
        setError('Mật khẩu chưa đáp ứng yêu cầu bảo mật.');
      } else if (!rule3) {
        setError('Hai lần nhập mật khẩu không giống nhau.');
      }
      return;
    }
    if (!resetSessionToken) {
      setError('Phiên đặt lại mật khẩu không hợp lệ. Vui lòng thử lại từ đầu.');
      router.replace('/(auth)/forgot-password');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await authService.resetPassword(resetSessionToken, password);
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Không đặt lại được mật khẩu. Vui lòng thử lại sau.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.card}>
            <View style={styles.strip} />
            <View style={styles.successIconWrap}>
              <View style={styles.successIconCircle}>
                <Ionicons name="checkmark" size={36} color={YELLOW} />
              </View>
            </View>
            <Text style={styles.successTitle}>ĐỔI MẬT KHẨU THÀNH CÔNG!</Text>
            <Text style={styles.successDesc}>Mật khẩu của bạn đã được cập nhật. Vui lòng đăng nhập lại.</Text>
            <TouchableOpacity
              style={styles.btn}
              onPress={() => router.replace('/(auth)/login')}
              activeOpacity={0.85}
            >
              <Text style={styles.btnText}>ĐĂNG NHẬP NGAY</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

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
            <Text style={styles.stepBadge}>BƯỚC 3 / 3 — THIẾT LẬP MẬT KHẨU</Text>

            {/* Title */}
            <Text style={styles.title}>
              MẬT KHẨU <Text style={styles.titleAccent}>MỚI</Text>
            </Text>

            {/* Icon */}
            <View style={styles.iconWrap}>
              <View style={styles.iconCircle}>
                <Ionicons name="lock-closed-outline" size={30} color={PINK} />
              </View>
            </View>

            <Text style={styles.desc}>Vui lòng thiết lập mật khẩu tương đối mạnh</Text>

            {/* Password field */}
            <View style={styles.field}>
              <Text style={styles.label}>Mật khẩu mới</Text>
              <View style={[styles.inputGroup, !!error && !rule1 && styles.inputError]}>
                <View style={styles.inputIcon}>
                  <Ionicons name="lock-closed-outline" size={16} color={MUTED} />
                </View>
                <TextInput
                  style={styles.input}
                  placeholder="Nhập mật khẩu mới"
                  placeholderTextColor="rgba(240,240,255,0.3)"
                  value={password}
                  onChangeText={(t) => { setPassword(t); setError(''); }}
                  secureTextEntry={!showPw}
                  autoCorrect={false}
                  spellCheck={false}
                  editable={!loading}
                  allowFontScaling={false}
                />
                <TouchableOpacity
                  style={styles.eyeBtn}
                  onPress={() => setShowPw((s) => !s)}
                  accessibilityLabel={showPw ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                >
                  <Ionicons
                    name={showPw ? 'eye-off-outline' : 'eye-outline'}
                    size={18}
                    color={MUTED}
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Confirm password field */}
            <View style={styles.field}>
              <Text style={styles.label}>Nhập lại mật khẩu</Text>
              <View style={[styles.inputGroup, !!error && !rule3 && styles.inputError]}>
                <View style={styles.inputIcon}>
                  <Ionicons name="lock-closed-outline" size={16} color={MUTED} />
                </View>
                <TextInput
                  style={styles.input}
                  placeholder="Nhập lại mật khẩu mới"
                  placeholderTextColor="rgba(240,240,255,0.3)"
                  value={confirmPassword}
                  onChangeText={(t) => { setConfirmPassword(t); setError(''); }}
                  secureTextEntry={!showPw2}
                  autoCorrect={false}
                  spellCheck={false}
                  editable={!loading}
                  allowFontScaling={false}
                />
                <TouchableOpacity
                  style={styles.eyeBtn}
                  onPress={() => setShowPw2((s) => !s)}
                  accessibilityLabel={showPw2 ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                >
                  <Ionicons
                    name={showPw2 ? 'eye-off-outline' : 'eye-outline'}
                    size={18}
                    color={MUTED}
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Password rules */}
            <View style={styles.rules}>
              <RuleRow pass={rule1} text="Ít nhất 8 ký tự" />
              <RuleRow pass={rule2} text="Có chữ thường, chữ hoa và ký tự đặc biệt" />
              <RuleRow pass={rule3} text="Hai lần nhập mật khẩu giống nhau" />
            </View>

            {!!error && <Text style={styles.errorText}>{error}</Text>}

            {/* Submit */}
            <TouchableOpacity
              style={[styles.btn, (!canSubmit || loading) && styles.btnDisabled]}
              onPress={handleSubmit}
              disabled={!canSubmit || loading}
              activeOpacity={0.85}
            >
              {loading
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.btnText}>HOÀN THÀNH</Text>
              }
            </TouchableOpacity>

            {/* Footer */}
            <View style={styles.footer}>
              <Text style={styles.footerText}>Nhớ mật khẩu rồi? </Text>
              <TouchableOpacity onPress={() => router.replace('/(auth)/login')}>
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
    fontSize: 24,
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
    marginBottom: 12,
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
    marginBottom: 14,
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
  eyeBtn: {
    paddingHorizontal: 13,
    paddingVertical: 12,
    borderLeftWidth: 1,
    borderLeftColor: BORDER,
  },
  rules: {
    marginTop: 4,
    marginBottom: 18,
    gap: 8,
  },
  ruleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ruleText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(240,240,255,0.25)',
  },
  ruleTextPass: {
    color: YELLOW,
  },
  errorText: {
    fontSize: 12,
    fontWeight: '700',
    color: PINK,
    marginBottom: 12,
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
  // Success state
  successIconWrap: {
    alignItems: 'center',
    marginBottom: 16,
    marginTop: 8,
  },
  successIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(212,255,0,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(212,255,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  successTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: YELLOW,
    textAlign: 'center',
    letterSpacing: 2,
    marginBottom: 10,
  },
  successDesc: {
    fontSize: 13,
    fontWeight: '600',
    color: MUTED,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 28,
  },
});
