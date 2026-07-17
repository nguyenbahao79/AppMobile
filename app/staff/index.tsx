import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, Pressable, SafeAreaView, RefreshControl, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Colors } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { IconSymbol } from '@/components/base/icon-symbol';
import { staffService, StaffDashboardStats } from '@/services/staffService';

function formatCurrency(value?: number) {
  return `${(value ?? 0).toLocaleString('vi-VN')}đ`;
}

export default function StaffDashboard() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const { session, logout } = useAuth();

  const [stats, setStats] = useState<StaffDashboardStats>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadStats = useCallback(async () => {
    try {
      const data = await staffService.getDashboardStats();
      setStats(data || {});
    } catch (error) {
      console.warn('Không tải được thống kê ca làm:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadStats();
    }, [loadStats])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadStats();
  };

  const statCards = [
    { label: 'Doanh thu hôm nay', value: loading ? '—' : formatCurrency(stats.totalRevenue) },
    { label: 'Vé bán hôm nay', value: loading ? '—' : String(stats.totalTicketsSold ?? 0) },
    { label: 'Sản phẩm bán hôm nay', value: loading ? '—' : String(stats.totalProductsSold ?? 0) },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.tint} />}
      >
        <Pressable style={styles.header} onPress={() => router.push('/staff/profile')}>
          <Text style={[styles.title, { color: theme.text }]}>Operations Hub</Text>
          <Text style={[styles.subtitle, { color: theme.tabIconDefault }]}>
            {session?.staff?.fullname || session?.staff?.username || 'Ticket Staff'}
            {stats.cinemaName ? ` · ${stats.cinemaName}` : ''}
          </Text>
        </Pressable>

        <View style={styles.statsContainer}>
          {statCards.map((stat, index) => (
            <View key={index} style={[styles.statBox, { backgroundColor: colorScheme === 'dark' ? '#1c1c1e' : '#f2f2f7' }]}>
              <Text style={[styles.statValue, { color: theme.tint }]} numberOfLines={1} adjustsFontSizeToFit>{stat.value}</Text>
              <Text style={[styles.statLabel, { color: theme.tabIconDefault }]}>{stat.label}</Text>
            </View>
          ))}
        </View>

        <View style={styles.mainActions}>
          <Pressable
            style={[styles.scanButton, { backgroundColor: theme.tint }]}
            onPress={() => router.push('/staff/scanner')}
          >
            <IconSymbol name="qrcode.viewfinder" size={40} color="#FFF" />
            <Text style={styles.scanButtonText}>Scan QR Ticket</Text>
            <Text style={styles.scanButtonSubtext}>Check in tickets & food combos</Text>
          </Pressable>
        </View>

        <Pressable
          style={styles.exitButton}
          onPress={() => {
            logout();
            router.replace('/(auth)/login');
          }}
        >
          <Text style={[styles.exitText, { color: theme.tabIconDefault }]}>Đăng xuất</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 20,
    flexGrow: 1,
  },
  header: {
    marginBottom: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: 16,
    marginTop: 5,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 40,
  },
  statBox: {
    flex: 1,
    padding: 15,
    borderRadius: 16,
    marginHorizontal: 5,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center',
  },
  mainActions: {
    justifyContent: 'center',
    marginBottom: 20,
  },
  scanButton: {
    height: 180,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 10,
  },
  scanButtonText: {
    color: '#FFF',
    fontSize: 22,
    fontWeight: 'bold',
    marginTop: 15,
  },
  scanButtonSubtext: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    marginTop: 5,
  },
  exitButton: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  exitText: {
    fontSize: 14,
    textDecorationLine: 'underline',
  },
});
