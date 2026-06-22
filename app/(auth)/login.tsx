import React, { useState } from 'react';
import { StyleSheet, KeyboardAvoidingView, Platform, ScrollView, TouchableOpacity, View, Image } from 'react-native';
import { Link, router } from 'expo-router';
import { ThemedView } from '@/components/base/themed-view';
import { ThemedText } from '@/components/base/themed-text';
import { AuthInput } from '@/features/auth/AuthInput';
import { AuthButton } from '@/features/auth/AuthButton';
import { useThemeColor } from '@/hooks/use-theme-color';

import { authService } from '@/services/authService';
import { Alert } from 'react-native';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const tintColor = useThemeColor({}, 'tint');

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Thông báo', 'Vui lòng nhập đầy đủ email và mật khẩu.');
      return;
    }

    setIsLoading(true);
    try {
      // Dựa trên code Java: "Staff đăng nhập bằng email gửi vào trường username"
      // Tôi sẽ chỉ gửi 'username' và 'password' là cấu chuẩn của Spring Security
      const response = await authService.login({ 
        username: email, // Đây chính là Gmail bạn nhập
        password: password 
      });
      
      console.log('--- LOGIN SUCCESS ---');
      console.log('Response Data:', JSON.stringify(response, null, 2));
      
      // Theo code Java: Trả về 'user' (khách) hoặc 'staff' (nhân viên)
      if (response.staff) {
        // Nếu có object staff -> Đây là nhân viên
        Alert.alert('Thành công', `Chào mừng nhân viên: ${response.staff.fullName || 'Staff'}`);
        router.replace('/staff');
      } else if (response.user) {
        // Nếu có object user -> Đây là khách hàng
        router.replace('/user/(tabs)');
      } else {
        // Trường hợp dự phòng nếu không thấy cả hai
        router.replace('/user/(tabs)');
      }
      
    } catch (error: any) {
      console.error('Login Error:', error);
      Alert.alert('Đăng nhập thất bại', error.message || 'Tài khoản hoặc mật khẩu không chính xác.');
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
            <ThemedText type="title" style={styles.title}>Chào mừng trở lại!</ThemedText>
            <ThemedText style={styles.subtitle}>Đăng nhập để tiếp tục đặt vé xem phim</ThemedText>
          </View>

          <View style={styles.form}>
            <AuthInput
              label="Email hoặc Số điện thoại"
              placeholder="Nhập email của bạn"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <AuthInput
              label="Mật khẩu"
              placeholder="Nhập mật khẩu"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
            
            <TouchableOpacity style={styles.forgotPassword}>
              <ThemedText style={[styles.forgotText, { color: tintColor }]}>Quên mật khẩu?</ThemedText>
            </TouchableOpacity>

            <AuthButton
              title="Đăng Nhập"
              onPress={handleLogin}
              loading={isLoading}
            />

            <View style={styles.footer}>
              <ThemedText>Bạn chưa có tài khoản? </ThemedText>
              <Link href="/(auth)/register" asChild>
                <TouchableOpacity>
                  <ThemedText style={[styles.link, { color: tintColor }]} type="defaultSemiBold">Đăng ký ngay</ThemedText>
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
    paddingTop: 80,
    paddingBottom: 40,
    alignItems: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logo: {
    width: 100,
    height: 100,
    marginBottom: 24,
    borderRadius: 20,
  },
  title: {
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    textAlign: 'center',
    opacity: 0.6,
  },
  form: {
    width: '100%',
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: 24,
  },
  forgotText: {
    fontSize: 14,
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
