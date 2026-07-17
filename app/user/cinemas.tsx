import React, { useCallback, useState } from 'react';
import { View, StyleSheet, FlatList, SafeAreaView, ActivityIndicator } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { ThemedText } from '@/components/base/themed-text';
import { AppHeader } from '@/components/layout/app-header';
import { IconSymbol } from '@/components/base/icon-symbol';
import { cinemaService, Cinema } from '@/services/cinemaService';

export default function CinemasScreen() {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const isDark = colorScheme === 'dark';
  const [cinemas, setCinemas] = useState<Cinema[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        try {
          const data = await cinemaService.getCinemas();
          if (!cancelled) setCinemas(data);
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
      <AppHeader title="Hệ thống rạp" showNotification={false} />
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.tint} />
        </View>
      ) : cinemas.length === 0 ? (
        <View style={styles.center}>
          <IconSymbol name="mappin.and.ellipse" size={64} color={theme.tabIconDefault + '40'} />
          <ThemedText style={styles.emptyText}>Chưa có rạp nào</ThemedText>
        </View>
      ) : (
        <FlatList
          data={cinemas}
          keyExtractor={(item) => String(item.cinemaId)}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <View style={[styles.card, isDark && styles.cardDark]}>
              <IconSymbol name="mappin.and.ellipse" size={22} color={theme.tint} />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <ThemedText type="defaultSemiBold">{item.name}</ThemedText>
                <ThemedText style={styles.address}>{item.address}</ThemedText>
              </View>
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
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  cardDark: { backgroundColor: '#1C1C1E' },
  address: { fontSize: 13, opacity: 0.6, marginTop: 4, lineHeight: 18 },
});
