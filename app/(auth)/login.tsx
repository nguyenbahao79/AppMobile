import React, { useState } from 'react';
import { StyleSheet, KeyboardAvoidingView, Platform, ScrollView, TouchableOpacity, View, Image , Alert } from 'react-native';
import { Link, router } from 'expo-router';
import { ThemedView } from '@/components/base/themed-view';
import { ThemedText } from '@/components/base/themed-text';
import { AuthInput } from '@/features/auth/AuthInput';
import { AuthButton } from '@/features/auth/AuthButton';
import { useThemeColor } from '@/hooks/use-theme-color';

import { useAuth } from '@/context/AuthContext';

export default function LoginScreen() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isStaffLogin, setIsStaffLogin] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const tintColor = useThemeColor({}, 'tint');
  const { login, loginStaff } = useAuth();

  const handleLogin = async () => {
    if (!username.trim() || !password) {
      Alert.alert('Thông báo', 'Vui lòng nhập đầy đủ tên đăng nhập/email và mật khẩu.');
      return;
    }

    setIsLoading(true);
    try {
      const response = await (isStaffLogin
        ? loginStaff(username.trim(), password)
        : login(username.trim(), password));

      // Theo code Java: Trả về 'user' (khách) hoặc 'staff' (nhân viên)
      if (response.staff) {
        // Nếu có object staff -> Đây là nhân viên
        Alert.alert('Thành công', `Chào mừng nhân viên: ${response.staff.fullname || 'Staff'}`);
        router.replace('/staff');
      } else if (response.user) {
        // Nếu có object user -> Đây là khách hàng
        router.replace('/user/(tabs)');
      } else {
        // Trường hợp dự phòng nếu không thấy cả hai
        router.replace('/user/(tabs)');
      }
      
    } catch (error: any) {
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
            <ThemedText style={styles.subtitle}>
              {isStaffLogin ? 'Khu vực dành cho nhân viên rạp' : 'Đăng nhập để tiếp tục đặt vé xem phim'}
            </ThemedText>
          </View>

          <View style={styles.form}>
            <AuthInput
              label={isStaffLogin ? 'Tên đăng nhập / Email nhân viên' : 'Tên đăng nhập / Email'}
              placeholder={isStaffLogin ? 'Nhập username hoặc email staff' : 'Nhập username hoặc email'}
              value={username}
              onChangeText={setUsername}
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
              title={isStaffLogin ? 'Đăng Nhập Nhân Viên' : 'Đăng Nhập'}
              onPress={handleLogin}
              loading={isLoading}
            />

            <View style={styles.footer}>
              <ThemedText>{isStaffLogin ? 'Bạn là khách hàng? ' : 'Bạn chưa có tài khoản? '}</ThemedText>
              {isStaffLogin ? (
                <TouchableOpacity>
                  <ThemedText
                    style={[styles.link, { color: tintColor }]}
                    type="defaultSemiBold"
                    onPress={() => setIsStaffLogin(false)}>
                    Đăng nhập khách hàng
                  </ThemedText>
                </TouchableOpacity>
              ) : (
                <Link href="/(auth)/register" asChild>
                  <TouchableOpacity>
                    <ThemedText style={[styles.link, { color: tintColor }]} type="defaultSemiBold">Đăng ký ngay</ThemedText>
                  </TouchableOpacity>
                </Link>
              )}
            </View>
            {!isStaffLogin && (
              <TouchableOpacity style={styles.staffLink} onPress={() => setIsStaffLogin(true)}>
                <ThemedText style={[styles.link, { color: tintColor }]} type="defaultSemiBold">
                  Nhân viên? Đăng nhập khu vực staff
                </ThemedText>
              </TouchableOpacity>
            )}
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
  staffLink: {
    alignSelf: 'center',
    marginTop: 16,
  },
});
