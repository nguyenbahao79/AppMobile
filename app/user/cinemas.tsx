import React, { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, SafeAreaView,
  ActivityIndicator, RefreshControl, Platform, Pressable,
} from 'react-native';
import { useFocusEffect, router } from 'expo-router';
import { IconSymbol } from '@/components/base/icon-symbol';
import { cinemaService, Cinema } from '@/services/cinemaService';

/* ── Theme ───────────────────────────────────────────────────────── */
const C = {
  bg:      '#0f102a',
  card:    '#141632',
  border:  'rgba(255,255,255,0.07)',
  purple:  '#7b1fa2',
  yellow:  '#d4e219',
  text:    '#FFFFFF',
  muted:   'rgba(255,255,255,0.45)',
  divider: 'rgba(255,255,255,0.06)',
} as const;

const cardShadow = Platform.select({
  ios:     { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 12 },
  android: { elevation: 7 },
}) ?? {};

export default function CinemasScreen() {
  const [cinemas, setCinemas] = useState<Cinema[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchCinemas = useCallback(async () => {
    try {
      const data = await cinemaService.getCinemas();
      setCinemas(data);
    } catch {
      // giữ danh sách cũ nếu lỗi mạng
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      setLoading(true);
      fetchCinemas().finally(() => { if (!cancelled) setLoading(false); });
      return () => { cancelled = true; };
    }, [fetchCinemas])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchCinemas();
    setRefreshing(false);
  }, [fetchCinemas]);

  return (
    <SafeAreaView style={s.safe}>
      {/* Header */}
      <View style={s.header}>
        <Pressable onPress={() => router.back()} style={s.backBtn} hitSlop={10}>
          <IconSymbol name="chevron.left" size={20} color={C.text} />
        </Pressable>
        <Text style={s.headerTitle}>
          HỆ THỐNG <Text style={{ color: C.yellow }}>RẠP</Text>
        </Text>
        {cinemas.length > 0 ? (
          <View style={s.countBadge}>
            <Text style={s.countText}>{cinemas.length}</Text>
          </View>
        ) : <View style={{ width: 40 }} />}
      </View>

      {loading ? (
        <View style={s.center}>
          <ActivityIndicator size="large" color={C.purple} />
        </View>
      ) : cinemas.length === 0 ? (
        <View style={s.center}>
          <View style={s.emptyIcon}>
            <IconSymbol name="mappin.and.ellipse" size={40} color={C.purple + '80'} />
          </View>
          <Text style={s.emptyTitle}>Chưa có rạp nào</Text>
          <Text style={s.emptySub}>Vui lòng quay lại sau.</Text>
        </View>
      ) : (
        <FlatList
          data={cinemas}
          keyExtractor={item => String(item.cinemaId)}
          contentContainerStyle={s.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={C.purple}
              colors={[C.purple]}
              progressBackgroundColor={C.card}
            />
          }
          ListHeaderComponent={
            <View style={s.sectionHeader}>
              <Text style={s.sectionTitle}>
                DANH SÁCH <Text style={{ color: C.yellow }}>RẠP</Text>
              </Text>
              <Text style={s.sectionSub}>{cinemas.length} rạp chiếu phim</Text>
            </View>
          }
          renderItem={({ item, index }) => (
            <View style={s.card}>
              <Text style={s.cardIndex}>{String(index + 1).padStart(2, '0')}</Text>
              <View style={s.cardIconWrap}>
                <IconSymbol name="mappin.and.ellipse" size={22} color={C.purple} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.cinemaName}>{item.name}</Text>
                <Text style={s.cinemaAddress} numberOfLines={2}>{item.address}</Text>
              </View>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

/* ── Styles ──────────────────────────────────────────────────────── */
const s = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: C.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },

  /* Header */
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.divider,
  },
  backBtn:     { width: 40, height: 40, justifyContent: 'center' },
  headerTitle: { fontSize: 16, fontWeight: '800', color: C.text, letterSpacing: 1 },
  countBadge: {
    width: 40, height: 28, borderRadius: 10,
    backgroundColor: C.purple + '33',
    justifyContent: 'center', alignItems: 'center',
  },
  countText: { fontSize: 13, fontWeight: '700', color: C.purple },

  /* Empty */
  emptyIcon: {
    width: 90, height: 90, borderRadius: 45,
    backgroundColor: C.purple + '15',
    justifyContent: 'center', alignItems: 'center', marginBottom: 16,
  },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: C.text },
  emptySub:   { fontSize: 13, color: C.muted, marginTop: 6 },

  /* List */
  list: { padding: 16, paddingBottom: 32 },
  sectionHeader: { paddingHorizontal: 4, paddingTop: 4, paddingBottom: 12 },
  sectionTitle:  { fontSize: 13, fontWeight: '800', color: C.text, letterSpacing: 1, textTransform: 'uppercase' },
  sectionSub:    { fontSize: 12, color: C.muted, marginTop: 3 },

  /* Cinema card */
  card: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: C.card, borderRadius: 16, padding: 14, marginBottom: 10,
    borderWidth: 1, borderColor: C.border,
    ...cardShadow,
  },
  cardIndex: { fontSize: 11, fontWeight: '800', color: C.muted, width: 22, textAlign: 'center' },
  cardIconWrap: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: C.purple + '18',
    justifyContent: 'center', alignItems: 'center',
  },
  cinemaName:    { fontSize: 14, fontWeight: '700', color: C.text, marginBottom: 4 },
  cinemaAddress: { fontSize: 12, color: C.muted, lineHeight: 17 },
});
