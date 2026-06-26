import React, { useState } from 'react';
import { View, StyleSheet, Image, Pressable, ScrollView, SafeAreaView, Platform, Alert, Switch } from 'react-native';
import { useRouter, Href } from 'expo-router';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { IconSymbol } from '@/components/base/icon-symbol';
import { AppHeader } from '@/components/layout/app-header';
import { ThemedText } from '@/components/base/themed-text';
import { ThemedView } from '@/components/base/themed-view';
import { useAuth } from '@/context/AuthContext';
import { useTickets } from '@/context/TicketContext';

type MenuItem = {
  icon: string;
  title: string;
  color: string;
  route?: string;
  action?: () => void;
  hasSwitch?: boolean;
  switchValue?: boolean;
  onSwitchChange?: (value: boolean) => void;
};

export default function ProfileScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const isDark = colorScheme === 'dark';
  const { session, logout } = useAuth();
  const { tickets } = useTickets();
  const user = session?.user;

  const [isNotificationsEnabled, setIsNotificationsEnabled] = useState(true);
  const [isAutoDisplayMode, setIsAutoDisplayMode] = useState(true);

  const menuSections: { title: string; items: MenuItem[] }[] = [
    {
      title: 'Tài khoản',
      items: [
        { icon: 'person.fill', title: 'Thông tin cá nhân', color: '#5856D6', route: '/user/edit-profile' },
        { icon: 'creditcard.fill', title: 'Phương thức thanh toán', color: '#FF9500', action: () => Alert.alert('Thông báo', 'Chức năng thanh toán sẽ sớm ra mắt.') },
        { icon: 'ticket.fill', title: 'Lịch sử đặt vé', color: '#FF2D55', route: '/user/tickets' },
      ]
    },
    {
      title: 'Cài đặt',
      items: [
        { 
          icon: 'bell.fill', 
          title: 'Thông báo', 
          color: '#34C759', 
          hasSwitch: true, 
          switchValue: isNotificationsEnabled,
          onSwitchChange: setIsNotificationsEnabled
        },
        { icon: 'lock.fill', title: 'Bảo mật & Mật khẩu', color: '#007AFF', route: '/user/security' },
        { 
          icon: 'eye.fill', 
          title: 'Chế độ hiển thị tự động', 
          color: '#AF52DE', 
          hasSwitch: true, 
          switchValue: isAutoDisplayMode,
          onSwitchChange: setIsAutoDisplayMode
        },
      ]
    },
    {
      title: 'Khác',
      items: [
        { icon: 'questionmark.circle.fill', title: 'Trợ giúp & Hỗ trợ', color: '#8E8E93', action: () => Alert.alert('Hỗ trợ', 'Email hỗ trợ: support@cinema.com\nHotline: 1900 1234') },
      ]
    }
  ];

  const stats = [
    { label: 'Vé đã đặt', value: String(tickets.length) },
    { label: 'Phim đã xem', value: String(tickets.filter((ticket) => ticket.status === 'used').length) },
    { label: 'Điểm thưởng', value: String(user?.points ?? 0) },
  ];

  const handlePress = (item: MenuItem) => {
    if (item.hasSwitch) return; // Không làm gì nếu có switch (xử lý qua onSwitchChange)
    
    if (item.route) {
      if (item.route === '/user/tickets') {
          router.push('/user/tickets' as Href); // Sẽ tự động tìm đến app/user/(tabs)/tickets.tsx
      } else {
          router.push(item.route as Href);
      }
    } else if (item.action) {
      item.action();
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Đăng xuất',
      'Bạn có chắc chắn muốn thoát khỏi ứng dụng không?',
      [
        { text: 'Hủy', style: 'cancel' },
        { 
          text: 'Đăng xuất', 
          style: 'destructive',
          onPress: () => {
            logout();
            router.replace('/(auth)/login' as Href);
          }
        },
      ]
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <AppHeader title="Hồ sơ" showNotification={false} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        
        {/* Profile Header Card */}
        <ThemedView style={[styles.profileCard, isDark && styles.profileCardDark]}>
          <View style={styles.profileInfoContainer}>
            <Image
              source={{ uri: 'https://images.unsplash.com/photo-1633332755192-727a05c4013d?w=400' }}
              style={styles.avatar}
            />
            <View style={styles.nameContainer}>
              <ThemedText type="title" style={styles.name}>{user?.fullname || user?.username || 'Khách hàng'}</ThemedText>
              <ThemedText style={styles.email}>{user?.email || user?.phone || 'Chưa cập nhật email'}</ThemedText>
              <Pressable style={[styles.editBadge, { backgroundColor: theme.tint + '20' }]}>
                <ThemedText style={[styles.editBadgeText, { color: theme.tint }]}>Thành viên Vàng</ThemedText>
              </Pressable>
            </View>
          </View>

          <View style={styles.statsContainer}>
            {stats.map((stat, index) => (
              <View key={index} style={styles.statItem}>
                <ThemedText type="subtitle" style={styles.statValue}>{stat.value}</ThemedText>
                <ThemedText style={styles.statLabel}>{stat.label}</ThemedText>
              </View>
            ))}
          </View>
        </ThemedView>

        {/* Menu Sections */}
        {menuSections.map((section, sIndex) => (
          <View key={sIndex} style={styles.sectionContainer}>
            <ThemedText style={styles.sectionTitle}>{section.title}</ThemedText>
            <ThemedView style={[styles.menuList, isDark && styles.menuListDark]}>
              {section.items.map((item, iIndex) => (
                <Pressable 
                  key={iIndex} 
                  style={({ pressed }) => [
                    styles.menuItem,
                    iIndex === section.items.length - 1 && { borderBottomWidth: 0 },
                    pressed && !item.hasSwitch && { backgroundColor: isDark ? '#2C2C2E' : '#F2F2F7' }
                  ]}
                  onPress={() => handlePress(item)}
                >
                  <View style={styles.menuItemLeft}>
                    <View style={[styles.iconContainer, { backgroundColor: item.color + '15' }]}>
                      <IconSymbol name={item.icon as any} size={20} color={item.color} />
                    </View>
                    <ThemedText style={styles.menuItemTitle}>{item.title}</ThemedText>
                  </View>
                  
                  {item.hasSwitch ? (
                    <Switch
                      value={item.switchValue}
                    onValueChange={item.onSwitchChange}
                      trackColor={{ false: '#767577', true: theme.tint }}
                      thumbColor={Platform.OS === 'ios' ? undefined : (item.switchValue ? '#f4f3f4' : '#f4f3f4')}
                    />
                  ) : (
                    <IconSymbol name="chevron.right" size={14} color={theme.tabIconDefault} />
                  )}
                </Pressable>
              ))}
            </ThemedView>
          </View>
        ))}

        <Pressable 
          style={({ pressed }) => [
            styles.logoutButton,
            pressed && { backgroundColor: '#FF3B3030' }
          ]}
          onPress={handleLogout}
        >
          <ThemedText style={styles.logoutText}>Đăng xuất</ThemedText>
        </Pressable>
        
        <ThemedText style={styles.version}>Phiên bản 1.0.0 • Made with ❤️</ThemedText>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  profileCard: {
    margin: 20,
    padding: 20,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  profileCardDark: {
    backgroundColor: '#1C1C1E',
  },
  profileInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginRight: 20,
    borderWidth: 3,
    borderColor: '#FFFFFF20',
  },
  nameContainer: {
    flex: 1,
  },
  name: {
    fontSize: 24,
    marginBottom: 4,
  },
  email: {
    fontSize: 14,
    opacity: 0.6,
    marginBottom: 8,
  },
  editBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  editBadgeText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#00000010',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: 12,
    opacity: 0.6,
    marginTop: 4,
  },
  sectionContainer: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    opacity: 0.5,
    marginBottom: 10,
    marginLeft: 4,
  },
  menuList: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    overflow: 'hidden',
  },
  menuListDark: {
    backgroundColor: '#1C1C1E',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#00000005',
    minHeight: 56,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  menuItemTitle: {
    fontSize: 16,
    fontWeight: '500',
  },
  logoutButton: {
    marginHorizontal: 20,
    marginTop: 10,
    paddingVertical: 16,
    borderRadius: 20,
    backgroundColor: '#FF3B3015',
    alignItems: 'center',
  },
  logoutText: {
    color: '#FF3B30',
    fontSize: 16,
    fontWeight: 'bold',
  },
  version: {
    textAlign: 'center',
    marginTop: 30,
    fontSize: 12,
    opacity: 0.4,
  },
});
