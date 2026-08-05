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

const STRONG_PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[^A-Za-z0-9]).{8,}$/;
const EMAIL_REGEX = /^[a-z0-9._%+-]+@gmail\.com$/i;
const PHONE_REGEX = /^[0-9]{10}$/;

export default function RegisterScreen() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState('');

  const clearFieldError = (field: string) => {
    if (fieldErrors[field]) setFieldErrors((prev) => ({ ...prev, [field]: '' }));
    if (generalError) setGeneralError('');
  };

  const validate = () => {
    const errors: Record<string, string> = {};

    if (!fullName.trim()) {
      errors.fullName = 'Họ và tên không được để trống';
    }

    if (!email.trim()) {
      errors.email = 'Email không được để trống';
    } else if (!EMAIL_REGEX.test(email.trim())) {
      errors.email = 'Email phải đúng định dạng Gmail (vd: abc@gmail.com)';
    }

    const cleanPhone = phone.replace(/\s/g, '');
    if (!cleanPhone) {
      errors.phone = 'Số điện thoại không được để trống';
    } else if (!PHONE_REGEX.test(cleanPhone)) {
      errors.phone = 'Số điện thoại phải có 10 chữ số';
    }

    if (!password) {
      errors.password = 'Mật khẩu không được để trống';
    } else if (!STRONG_PASSWORD_REGEX.test(password)) {
      errors.password = 'Mật khẩu phải có ít nhất 8 ký tự, gồm chữ hoa, chữ thường và ký tự đặc biệt';
    }

    return errors;
  };

  const handleRegister = async () => {
    setGeneralError('');
    const errors = validate();
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setIsLoading(true);
    try {
      await authService.register({
        password: password.trim(),
        fullname: fullName.trim(),
        email: email.trim(),
        phone: phone.replace(/\s/g, ''),
        birthday: null,
        avatar: null,
      });
      router.replace('/(auth)/login');
    } catch (err: any) {
      const msg: string = err.message || 'Có lỗi xảy ra, vui lòng thử lại sau.';
      if (msg.includes('Email đã tồn tại')) {
        setFieldErrors({ email: 'Email đã tồn tại' });
      } else if (msg.includes('Số điện thoại đã tồn tại')) {
        setFieldErrors({ phone: 'Số điện thoại đã tồn tại' });
      } else if (msg.includes('Email không đúng định dạng')) {
        setFieldErrors({ email: 'Email không đúng định dạng' });
      } else if (msg.includes('Số điện thoại không hợp lệ')) {
        setFieldErrors({ phone: 'Số điện thoại không hợp lệ' });
      } else {
        setGeneralError(msg);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const isDisabled = isLoading || !fullName.trim() || !email.trim() || !phone.trim() || !password;

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

            {/* Title */}
            <Text style={styles.title}>Tạo Tài Khoản</Text>
            <Text style={styles.subtitle}>Đăng ký để nhận nhiều ưu đãi hấp dẫn</Text>

            {/* Họ và tên */}
            <View style={styles.field}>
              <Text style={styles.label}>
                Họ và tên <Text style={styles.req}>*</Text>
              </Text>
              <View style={[styles.inputGroup, !!fieldErrors.fullName && styles.inputError]}>
                <View style={styles.inputIcon}>
                  <Ionicons name="person-outline" size={16} color={MUTED} />
                </View>
                <TextInput
                  style={styles.input}
                  placeholder="Nhập họ và tên"
                  placeholderTextColor="rgba(240,240,255,0.3)"
                  value={fullName}
                  onChangeText={(t) => { setFullName(t); clearFieldError('fullName'); }}
                  autoCorrect={false}
                  editable={!isLoading}
                  allowFontScaling={false}
                />
              </View>
              {!!fieldErrors.fullName && <Text style={styles.fieldError}>{fieldErrors.fullName}</Text>}
            </View>

            {/* Email */}
            <View style={styles.field}>
              <Text style={styles.label}>
                Email <Text style={styles.req}>*</Text>
              </Text>
              <View style={[styles.inputGroup, !!fieldErrors.email && styles.inputError]}>
                <View style={styles.inputIcon}>
                  <Ionicons name="mail-outline" size={16} color={MUTED} />
                </View>
                <TextInput
                  style={styles.input}
                  placeholder="example@gmail.com"
                  placeholderTextColor="rgba(240,240,255,0.3)"
                  value={email}
                  onChangeText={(t) => { setEmail(t); clearFieldError('email'); }}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!isLoading}
                  allowFontScaling={false}
                />
              </View>
              {!!fieldErrors.email && <Text style={styles.fieldError}>{fieldErrors.email}</Text>}
            </View>

            {/* Số điện thoại */}
            <View style={styles.field}>
              <Text style={styles.label}>
                Số điện thoại <Text style={styles.req}>*</Text>
              </Text>
              <View style={[styles.inputGroup, !!fieldErrors.phone && styles.inputError]}>
                <View style={styles.inputIcon}>
                  <Ionicons name="call-outline" size={16} color={MUTED} />
                </View>
                <TextInput
                  style={styles.input}
                  placeholder="09xxxxxxxx"
                  placeholderTextColor="rgba(240,240,255,0.3)"
                  value={phone}
                  onChangeText={(t) => { setPhone(t); clearFieldError('phone'); }}
                  keyboardType="phone-pad"
                  editable={!isLoading}
                  allowFontScaling={false}
                />
              </View>
              {!!fieldErrors.phone && <Text style={styles.fieldError}>{fieldErrors.phone}</Text>}
            </View>

            {/* Mật khẩu */}
            <View style={styles.field}>
              <Text style={styles.label}>
                Mật khẩu <Text style={styles.req}>*</Text>
              </Text>
              <View style={[styles.inputGroup, !!fieldErrors.password && styles.inputError]}>
                <View style={styles.inputIcon}>
                  <Ionicons name="lock-closed-outline" size={16} color={MUTED} />
                </View>
                <TextInput
                  style={styles.input}
                  placeholder="••••••"
                  placeholderTextColor="rgba(240,240,255,0.3)"
                  value={password}
                  onChangeText={(t) => { setPassword(t); clearFieldError('password'); }}
                  secureTextEntry={!showPassword}
                  autoCorrect={false}
                  spellCheck={false}
                  editable={!isLoading}
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
              {!!fieldErrors.password && <Text style={styles.fieldError}>{fieldErrors.password}</Text>}
            </View>

            {/* General error */}
            {!!generalError && (
              <View style={styles.errorBox}>
                <Text style={styles.errorBoxText}>{generalError}</Text>
              </View>
            )}

            {/* Submit */}
            <TouchableOpacity
              style={[styles.btn, isDisabled && styles.btnDisabled]}
              onPress={handleRegister}
              disabled={isDisabled}
              activeOpacity={0.85}
            >
              {isLoading
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.btnText}>ĐĂNG KÝ NGAY</Text>
              }
            </TouchableOpacity>

            {/* Footer */}
            <View style={styles.footer}>
              <Text style={styles.footerText}>Đã có tài khoản? </Text>
              <TouchableOpacity onPress={() => router.replace('/(auth)/login')}>
                <Text style={styles.footerLink}>Đăng nhập ngay</Text>
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
    marginBottom: 18,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: OFF_WHITE,
    textAlign: 'center',
    marginBottom: 6,
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(212,255,0,0.7)',
    textAlign: 'center',
    marginBottom: 28,
    lineHeight: 18,
  },
  field: {
    marginBottom: 18,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: MUTED,
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  req: {
    color: PINK,
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
  fieldError: {
    fontSize: 12,
    fontWeight: '700',
    color: PINK,
    marginTop: 6,
    letterSpacing: 0.3,
  },
  errorBox: {
    backgroundColor: '#2a0a14',
    borderWidth: 1,
    borderColor: 'rgba(255,45,120,0.4)',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 16,
  },
  errorBoxText: {
    fontSize: 13,
    fontWeight: '600',
    color: PINK,
    textAlign: 'center',
    lineHeight: 18,
  },
  btn: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: PURPLE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnDisabled: {
    opacity: 0.4,
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
