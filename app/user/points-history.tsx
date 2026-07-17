import React, { useCallback, useState } from 'react';
import { View, StyleSheet, FlatList, SafeAreaView, ActivityIndicator } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { ThemedText } from '@/components/base/themed-text';
import { AppHeader } from '@/components/layout/app-header';
import { IconSymbol } from '@/components/base/icon-symbol';
import { meService, PointsHistoryRow } from '@/services/meService';

export default function PointsHistoryScreen() {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const isDark = colorScheme === 'dark';
  const [rows, setRows] = useState<PointsHistoryRow[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        try {
          const data = await meService.getPointsHistory();
          if (!cancelled) setRows(data);
        } catch {
          // giữ danh sách cũ nếu lỗi mạng
        } finally {
          if (!cancelled) setLoading(false);
        }
      })();
      return () => {
        cancelled = true;
      };
    }, [])
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <AppHeader title="Lịch sử điểm" showNotification={false} />
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.tint} />
        </View>
      ) : rows.length === 0 ? (
        <View style={styles.center}>
          <IconSymbol name="star.fill" size={64} color={theme.tabIconDefault + '40'} />
          <ThemedText style={styles.emptyText}>Chưa có lịch sử điểm thưởng</ThemedText>
        </View>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(item) => String(item.pointHistoryId)}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <View style={[styles.row, isDark && styles.rowDark]}>
              <View style={{ flex: 1 }}>
                <ThemedText type="defaultSemiBold">{item.description}</ThemedText>
                <ThemedText style={styles.date}>{item.date}</ThemedText>
              </View>
              <ThemedText style={[styles.points, { color: item.points >= 0 ? '#34C759' : '#FF3B30' }]}>
                {item.points >= 0 ? `+${item.points}` : item.points}
              </ThemedText>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  emptyText: { marginTop: 16, fontSize: 16, opacity: 0.6, textAlign: 'center' },
  list: { padding: 20 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    marginBottom: 12,
  },
  rowDark: { backgroundColor: '#1C1C1E' },
  date: { fontSize: 12, opacity: 0.5, marginTop: 4 },
  points: { fontSize: 16, fontWeight: 'bold', marginLeft: 12 },
});
