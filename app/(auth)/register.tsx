import React, { useState } from 'react';
import { StyleSheet, KeyboardAvoidingView, Platform, ScrollView, TouchableOpacity, View, Image , Alert } from 'react-native';
import { Link, router } from 'expo-router';
import { ThemedView } from '@/components/base/themed-view';
import { ThemedText } from '@/components/base/themed-text';
import { AuthInput } from '@/features/auth/AuthInput';
import { AuthButton } from '@/features/auth/AuthButton';
import { useThemeColor } from '@/hooks/use-theme-color';

import { authService } from '@/services/authService';


export default function RegisterScreen() {
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [birthday, setBirthday] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const tintColor = useThemeColor({}, 'tint');

  const handleRegister = async () => {
    const cleanUsername = username.trim();
    const cleanFullName = fullName.trim();
    const cleanEmail = email.trim();
    const cleanPhone = phone.replace(/\s/g, '');
    const cleanBirthday = birthday.trim();

    if (!cleanUsername || !cleanFullName || !cleanEmail || !cleanPhone || !cleanBirthday || !password.trim()) {
      Alert.alert('Thông báo', 'Vui lòng điền đầy đủ thông tin.');
      return;
    }

    if (cleanUsername.length < 6 || cleanUsername.length > 50) {
      Alert.alert('Lỗi', 'Tên đăng nhập phải từ 6 đến 50 ký tự.');
      return;
    }

    if (!/^[a-z0-9._%+-]+@gmail\.com$/i.test(cleanEmail)) {
      Alert.alert('Lỗi', 'Email phải đúng định dạng Gmail (vd: abc@gmail.com).');
      return;
    }

    if (!/^[0-9]{10}$/.test(cleanPhone)) {
      Alert.alert('Lỗi', 'Số điện thoại phải có 10 chữ số.');
      return;
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(cleanBirthday)) {
      Alert.alert('Lỗi', 'Ngày sinh phải theo định dạng YYYY-MM-DD, ví dụ 2004-04-22.');
      return;
    }

    setIsLoading(true);
    try {
      // DTO khớp với UserRequest trong Spring Boot của bạn
      const userData = {
        username: cleanUsername,
        password: password.trim(),
        fullname: cleanFullName,
        email: cleanEmail,
        phone: cleanPhone,
        birthday: cleanBirthday,
        avatar: null,
      };

      await authService.register(userData);
      
      Alert.alert('Thành công', 'Đăng ký tài khoản thành công! Vui lòng đăng nhập.', [
        { text: 'Đăng nhập', onPress: () => router.replace('/(auth)/login') }
      ]);
    } catch (error: any) {
      Alert.alert('Đăng ký thất bại', error.message || 'Có lỗi xảy ra, vui lòng thử lại sau.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <Image
              source={require('../../assets/images/icon.png')}
              style={styles.logo}
              resizeMode="contain"
            />
            <ThemedText type="title" style={styles.title}>Tạo tài khoản</ThemedText>
            <ThemedText style={styles.subtitle}>Đăng ký ngay để nhận nhiều ưu đãi</ThemedText>
          </View>

          <View style={styles.form}>
          <AuthInput
            label="Tên đăng nhập *"
            placeholder="Nhập tên đăng nhập"
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
          />
          <AuthInput
            label="Mật khẩu *"
            placeholder="••••••"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
          <AuthInput
            label="Họ và tên *"
              placeholder="Nhập họ và tên"
              value={fullName}
              onChangeText={setFullName}
            />
            <AuthInput
              label="Email *"
              placeholder="example@gmail.com"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <AuthInput
              label="Số điện thoại *"
              placeholder="09xxxxxxxx"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
            />
            <AuthInput
              label="Ngày sinh *"
              placeholder="YYYY-MM-DD"
              value={birthday}
              onChangeText={setBirthday}
              keyboardType="numbers-and-punctuation"
            />

            <AuthButton
              title="Đăng Ký"
              onPress={handleRegister}
              loading={isLoading}
              style={styles.registerButton}
            />

            <View style={styles.footer}>
              <ThemedText>Bạn đã có tài khoản? </ThemedText>
              <Link href="/(auth)/login" asChild>
                <TouchableOpacity>
                  <ThemedText style={[styles.link, { color: tintColor }]} type="defaultSemiBold">Đăng nhập</ThemedText>
                </TouchableOpacity>
              </Link>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 40,
    alignItems: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logo: {
    width: 80,
    height: 80,
    marginBottom: 16,
    borderRadius: 16,
  },
  title: {
    marginBottom: 4,
    textAlign: 'center',
  },
  subtitle: {
    textAlign: 'center',
    opacity: 0.6,
  },
  form: {
    width: '100%',
  },
  registerButton: {
    marginTop: 16,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
  },
  link: {
    fontSize: 16,
  },
});
