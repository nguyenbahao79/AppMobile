import React, { useEffect, useState } from 'react';
import { StyleSheet, ScrollView, View, Alert, ActivityIndicator } from 'react-native';
import { Stack } from 'expo-router';
import { ThemedView } from '@/components/base/themed-view';
import { ThemedText } from '@/components/base/themed-text';
import { AuthInput } from '@/features/auth/AuthInput';
import { AuthButton } from '@/features/auth/AuthButton';
import { useAuth } from '@/context/AuthContext';
import { useThemeColor } from '@/hooks/use-theme-color';
import { staffService, StaffProfile } from '@/services/staffService';

export default function StaffProfileScreen() {
  const { updateSessionStaff } = useAuth();
  const tintColor = useThemeColor({}, 'tint');

  const [profile, setProfile] = useState<StaffProfile | null>(null);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const data = await staffService.getMe();
        setProfile(data);
        setFullName(data.fullname || '');
        setPhone(data.phone || '');
      } catch (error: any) {
        Alert.alert('Không tải được hồ sơ', error.message || 'Vui lòng thử lại.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleSaveProfile = async () => {
    if (!profile) return;
    if (!fullName.trim() || !phone.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập đầy đủ họ tên và số điện thoại.');
      return;
    }
    setSavingProfile(true);
    try {
      const updated = await staffService.updateMe({
        fullname: fullName.trim(),
        email: profile.email,
        username: profile.username,
        phone: phone.trim(),
        birthday: profile.birthday,
        avatar: profile.avatar,
      });
      setProfile(updated);
      updateSessionStaff({
        staffId: updated.staffId,
        username: updated.username,
        fullname: updated.fullname,
        email: updated.email,
        role: updated.role,
        phone: updated.phone,
        avatar: updated.avatar,
        cinemaName: updated.cinemaName,
      });
      Alert.alert('Thành công', 'Hồ sơ đã được cập nhật.');
    } catch (error: any) {
      Alert.alert('Không cập nhật được', error.message || 'Vui lòng thử lại.');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert('Lỗi', 'Vui lòng điền đầy đủ thông tin.');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Lỗi', 'Mật khẩu mới không khớp.');
      return;
    }
    setSavingPassword(true);
    try {
      await staffService.changeMyPassword(currentPassword, newPassword);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      Alert.alert('Thành công', 'Mật khẩu đã được thay đổi.');
    } catch (error: any) {
      Alert.alert('Không đổi được mật khẩu', error.message || 'Vui lòng kiểm tra mật khẩu hiện tại.');
    } finally {
      setSavingPassword(false);
    }
  };

  if (loading) {
    return (
      <ThemedView style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={tintColor} />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ title: 'Hồ sơ nhân viên', headerShown: true, headerBackTitle: 'Quay lại' }} />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <ThemedText type="subtitle" style={styles.sectionTitle}>Thông tin cá nhân</ThemedText>
        <View style={styles.form}>
          <AuthInput label="Tên đăng nhập" value={profile?.username || ''} editable={false} />
          <AuthInput label="Email" value={profile?.email || ''} editable={false} keyboardType="email-address" />
          <AuthInput label="Họ và tên" value={fullName} onChangeText={setFullName} placeholder="Nhập họ và tên" />
          <AuthInput label="Số điện thoại" value={phone} onChangeText={setPhone} placeholder="Nhập số điện thoại" keyboardType="phone-pad" />
          {!!profile?.cinemaName && <AuthInput label="Rạp phụ trách" value={profile.cinemaName} editable={false} />}
          <AuthButton title="Lưu thay đổi" onPress={handleSaveProfile} loading={savingProfile} style={styles.saveButton} />
        </View>

        <ThemedText type="subtitle" style={styles.sectionTitle}>Đổi mật khẩu</ThemedText>
        <View style={styles.form}>
          <AuthInput label="Mật khẩu hiện tại" value={currentPassword} onChangeText={setCurrentPassword} placeholder="Nhập mật khẩu hiện tại" secureTextEntry />
          <AuthInput label="Mật khẩu mới" value={newPassword} onChangeText={setNewPassword} placeholder="Nhập mật khẩu mới" secureTextEntry />
          <AuthInput label="Xác nhận mật khẩu mới" value={confirmPassword} onChangeText={setConfirmPassword} placeholder="Nhập lại mật khẩu mới" secureTextEntry />
          <AuthButton title="Cập nhật mật khẩu" onPress={handleChangePassword} loading={savingPassword} style={styles.saveButton} />
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center' },
  scrollContent: { padding: 24, paddingBottom: 40 },
  sectionTitle: { marginBottom: 16, marginTop: 8 },
  form: { width: '100%', marginBottom: 24 },
  saveButton: { marginTop: 8 },
});
