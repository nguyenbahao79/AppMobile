import React, { useState } from 'react';
import {
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
  View,
  Text,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Link, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/context/AuthContext';

const NAVY = '#0d0d2b';
const CARD_BG = '#14143a';
const PURPLE = '#8b00ff';
const PINK = '#ff2d78';
const YELLOW = '#d4ff00';
const OFF_WHITE = '#f0f0ff';
const MUTED = 'rgba(240,240,255,0.5)';
const BORDER = 'rgba(255,255,255,0.12)';
const INPUT_BG = 'rgba(255,255,255,0.06)';

export default function LoginScreen() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isStaffLogin, setIsStaffLogin] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const { login, loginStaff } = useAuth();

  const handleLogin = async () => {
    const rawLoginName = username.trim();
    const loginName =
      !isStaffLogin && !rawLoginName.includes('@')
        ? rawLoginName.replace(/\s/g, '')
        : rawLoginName;

    if (!loginName || !password) {
      setError('Vui lòng nhập đầy đủ email/số điện thoại và mật khẩu.');
      return;
    }

    if (
      !isStaffLogin &&
      !loginName.includes('@') &&
      !/^[0-9]{10}$/.test(loginName)
    ) {
      setError('Vui lòng nhập email hoặc số điện thoại hợp lệ (10 chữ số).');
      return;
    }

    setError('');
    setIsLoading(true);
    try {
      const response = await (isStaffLogin
        ? loginStaff(loginName, password)
        : login(loginName, password));

      if (isStaffLogin) {
        if (!response.staff) {
          setError('Không nhận được thông tin nhân viên.');
          return;
        }
        router.replace('/staff');
        return;
      }

      if (response.staff) {
        setError('Tài khoản nhân viên vui lòng đăng nhập ở khu vực staff.');
        return;
      }

      router.replace('/user/(tabs)');
    } catch (err: any) {
      setError(err.message || 'Tài khoản hoặc mật khẩu không chính xác.');
    } finally {
      setIsLoading(false);
    }
  };

  const switchMode = (toStaff: boolean) => {
    setIsStaffLogin(toStaff);
    setError('');
    setUsername('');
    setPassword('');
  };

  const isSubmitDisabled = isLoading || !username.trim() || !password;

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

            {/* Tiêu đề */}
            <Text style={styles.title}>
              {isStaffLogin ? 'Đăng Nhập Staff' : 'Đăng Nhập'}
            </Text>
            <Text style={styles.subtitle}>
              {isStaffLogin ? 'Khu vực nhân viên' : 'Chào mừng trở lại'}
            </Text>

            {/* Trường email/SĐT */}
            <View style={styles.field}>
              <Text style={styles.label}>
                {isStaffLogin ? 'Email / SĐT nhân viên' : 'Email / Số điện thoại'}
              </Text>
              <View style={styles.inputGroup}>
                <View style={styles.inputIcon}>
                  <Ionicons name="person-outline" size={16} color={MUTED} />
                </View>
                <TextInput
                  style={styles.input}
                  placeholder={
                    isStaffLogin
                      ? 'Nhập email hoặc SĐT staff'
                      : 'Nhập email hoặc số điện thoại'
                  }
                  placeholderTextColor="rgba(240,240,255,0.3)"
                  value={username}
                  onChangeText={setUsername}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  allowFontScaling={false}
                />
              </View>
            </View>

            {/* Trường mật khẩu */}
            <View style={styles.field}>
              <Text style={styles.label}>Mật khẩu</Text>
              <View style={styles.inputGroup}>
                <View style={styles.inputIcon}>
                  <Ionicons name="lock-closed-outline" size={16} color={MUTED} />
                </View>
                <TextInput
                  style={styles.input}
                  placeholder="••••••"
                  placeholderTextColor="rgba(240,240,255,0.3)"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  keyboardType="ascii-capable"
                  autoCorrect={false}
                  spellCheck={false}
                  allowFontScaling={false}
                />
                <TouchableOpacity
                  style={styles.eyeBtn}
                  onPress={() => setShowPassword((s) => !s)}
                  accessibilityLabel={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                >
                  <Ionicons
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={18}
                    color={MUTED}
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Quên mật khẩu */}
            <TouchableOpacity
              style={styles.forgotPassword}
              onPress={() => router.push('/(auth)/forgot-password')}
            >
              <Text style={styles.forgotText}>Quên mật khẩu?</Text>
            </TouchableOpacity>

            {/* Lỗi inline */}
            {!!error && (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            {/* Nút đăng nhập */}
            <TouchableOpacity
              style={[styles.loginBtn, isSubmitDisabled && styles.loginBtnDisabled]}
              onPress={handleLogin}
              disabled={isSubmitDisabled}
              activeOpacity={0.85}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.loginBtnText}>Đăng Nhập</Text>
              )}
            </TouchableOpacity>

            {/* Footer */}
            <View style={styles.footer}>
              {isStaffLogin ? (
                <>
                  <Text style={styles.footerText}>Khách hàng? </Text>
                  <TouchableOpacity onPress={() => switchMode(false)}>
                    <Text style={styles.footerLink}>Đăng nhập khách hàng</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <Text style={styles.footerText}>Chưa có tài khoản? </Text>
                  <Link href="/(auth)/register" asChild>
                    <TouchableOpacity>
                      <Text style={styles.footerLink}>Đăng ký ngay</Text>
                    </TouchableOpacity>
                  </Link>
                </>
              )}
            </View>

            {!isStaffLogin && (
              <TouchableOpacity
                style={styles.staffLinkContainer}
                onPress={() => switchMode(true)}
              >
                <Text style={styles.footerLink}>
                  Nhân viên? Đăng nhập khu vực staff
                </Text>
              </TouchableOpacity>
            )}
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
    marginBottom: 18,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: OFF_WHITE,
    textAlign: 'center',
    marginBottom: 6,
    lineHeight: 34,
  },
  subtitle: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(212,255,0,0.7)',
    textAlign: 'center',
    marginBottom: 26,
    lineHeight: 18,
  },
  field: {
    marginBottom: 16,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: MUTED,
    marginBottom: 8,
    lineHeight: 16,
  },
  inputGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: BORDER,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: INPUT_BG,
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
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: 18,
    marginTop: 4,
  },
  forgotText: {
    fontSize: 13,
    fontWeight: '700',
    color: PINK,
  },
  errorBox: {
    backgroundColor: '#2a0a14',
    borderWidth: 1,
    borderColor: 'rgba(255,45,120,0.4)',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 14,
  },
  errorText: {
    fontSize: 13,
    fontWeight: '600',
    color: PINK,
    textAlign: 'center',
    lineHeight: 18,
  },
  loginBtn: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: PURPLE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loginBtnDisabled: {
    opacity: 0.4,
  },
  loginBtnText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: 'bold',
    lineHeight: 22,
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
  staffLinkContainer: {
    alignSelf: 'center',
    marginTop: 12,
  },
});
