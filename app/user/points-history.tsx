import React, { useCallback, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, SafeAreaView,
  ActivityIndicator, RefreshControl, Platform, Pressable, TouchableOpacity,
} from 'react-native';
import { useFocusEffect, router } from 'expo-router';
import { IconSymbol } from '@/components/base/icon-symbol';
import { useAuth } from '@/context/AuthContext';
import { meService, PointsHistoryRow } from '@/services/meService';

/* ── Theme ───────────────────────────────────────────────────────── */
const C = {
  bg:      '#0f102a',
  card:    '#141632',
  card2:   '#1b1e45',
  border:  'rgba(255,255,255,0.07)',
  purple:  '#7b1fa2',
  pink:    '#e91e8c',
  yellow:  '#d4e219',
  text:    '#FFFFFF',
  muted:   'rgba(255,255,255,0.45)',
  dim:     'rgba(255,255,255,0.2)',
  divider: 'rgba(255,255,255,0.06)',
  green:   '#81c784',
  red:     '#e57373',
} as const;

const cardShadow = Platform.select({
  ios:     { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 12 },
  android: { elevation: 7 },
}) ?? {};

function fmtNumber(n: number) {
  return Math.abs(n).toLocaleString('vi-VN');
}

/* ── Main Screen ─────────────────────────────────────────────────── */
export default function PointsHistoryScreen() {
  const { session } = useAuth();
  const currentPoints = session?.user?.points ?? 0;

  const [rows,       setRows]       = useState<PointsHistoryRow[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchPoints = useCallback(async () => {
    try {
      const data = await meService.getPointsHistory();
      setRows(data);
    } catch {
      // giữ danh sách cũ nếu lỗi mạng
    }
  }, []);

  useFocusEffect(useCallback(() => {
    let cancelled = false;
    setLoading(true);
    fetchPoints().finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [fetchPoints]));

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchPoints();
    setRefreshing(false);
  }, [fetchPoints]);

  const totalEarned = useMemo(
    () => rows.filter(r => r.points > 0).reduce((s, r) => s + r.points, 0), [rows]
  );
  const totalSpent = useMemo(
    () => rows.filter(r => r.points < 0).reduce((s, r) => s + r.points, 0), [rows]
  );

  const renderItem = ({ item, index }: { item: PointsHistoryRow; index: number }) => {
    const positive = item.points >= 0;
    return (
      <View style={[s.row, index === 0 && { borderTopWidth: 0 }]}>
        {/* Color bar */}
        <View style={[s.bar, { backgroundColor: positive ? C.green : C.red }]} />

        <View style={s.rowContent}>
          <View style={{ flex: 1 }}>
            <Text style={s.rowDesc} numberOfLines={2}>{item.description}</Text>
            <Text style={s.rowDate}>{item.date}</Text>
          </View>

          <View style={{ alignItems: 'flex-end' }}>
            <Text style={[s.rowPoints, { color: positive ? C.green : C.red }]}>
              {positive ? '+' : ''}{fmtNumber(item.points)}
            </Text>
            <Text style={s.rowPointsLabel}>điểm</Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={s.safe}>
      {/* Header */}
      <View style={s.header}>
        <Pressable onPress={() => router.back()} style={s.backBtn} hitSlop={10}>
          <IconSymbol name="chevron.left" size={20} color={C.text} />
        </Pressable>
        <Text style={s.headerTitle}>
          LỊCH SỬ <Text style={{ color: C.yellow }}>ĐIỂM</Text>
        </Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={s.center}>
          <ActivityIndicator size="large" color={C.purple} />
        </View>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={item => String(item.pointHistoryId)}
          contentContainerStyle={s.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing} onRefresh={onRefresh}
              tintColor={C.purple} colors={[C.purple]} progressBackgroundColor={C.card}
            />
          }
          ListHeaderComponent={
            <>
              {/* ── Summary card ── */}
              <View style={s.summaryCard}>
                <View style={s.summaryTop}>
                  <View style={s.summaryIconWrap}>
                    <IconSymbol name="star.fill" size={26} color={C.yellow} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.summaryLabel}>ĐIỂM HIỆN CÓ</Text>
                    <Text style={s.summaryPoints}>{currentPoints.toLocaleString('vi-VN')}</Text>
                  </View>
                </View>

                <View style={s.summaryDivider} />

                <View style={s.statsRow}>
                  <View style={s.statCell}>
                    <Text style={[s.statVal, { color: C.green }]}>+{fmtNumber(totalEarned)}</Text>
                    <Text style={s.statLabel}>Đã nhận</Text>
                  </View>
                  <View style={s.statDivider} />
                  <View style={s.statCell}>
                    <Text style={[s.statVal, { color: C.red }]}>{fmtNumber(totalSpent)}</Text>
                    <Text style={s.statLabel}>Đã dùng</Text>
                  </View>
                  <View style={s.statDivider} />
                  <View style={s.statCell}>
                    <Text style={[s.statVal, { color: C.text }]}>{rows.length}</Text>
                    <Text style={s.statLabel}>Giao dịch</Text>
                  </View>
                </View>
              </View>

              {/* ── Tip card ── */}
              <View style={s.tipCard}>
                <IconSymbol name="lightbulb.fill" size={16} color={C.yellow} />
                <View style={{ flex: 1 }}>
                  <Text style={s.tipTitle}>Mẹo tích điểm</Text>
                  <Text style={s.tipText}>
                    Mua vé và bắp nước trực tuyến để được tích điểm lên đến 5% giá trị giao dịch. Điểm có thể đổi lấy voucher giảm giá.
                  </Text>
                </View>
              </View>

              {/* ── History header ── */}
              {rows.length > 0 && (
                <View style={s.historyHeader}>
                  <Text style={s.historyTitle}>
                    LỊCH SỬ <Text style={{ color: C.yellow }}>GIAO DỊCH</Text>
                  </Text>
                  <Text style={s.historyCount}>{rows.length} giao dịch</Text>
                </View>
              )}
            </>
          }
          ListEmptyComponent={
            <View style={s.emptyWrap}>
              <View style={s.emptyIcon}>
                <IconSymbol name="star.slash.fill" size={36} color={C.yellow + '50'} />
              </View>
              <Text style={s.emptyTitle}>Chưa có lịch sử điểm thưởng</Text>
              <Text style={s.emptySubt}>Đặt vé và mua đồ ăn để tích điểm.</Text>
            </View>
          }
          renderItem={renderItem}
        />
      )}
    </SafeAreaView>
  );
}

/* ── Styles ──────────────────────────────────────────────────────── */
const s = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: C.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list:   { padding: 16, paddingBottom: 32 },

  /* Header */
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.divider,
  },
  backBtn:     { width: 40, height: 40, justifyContent: 'center' },
  headerTitle: { fontSize: 15, fontWeight: '800', color: C.text, letterSpacing: 1 },

  /* Summary card */
  summaryCard: {
    borderRadius: 20, padding: 18, marginBottom: 12,
    backgroundColor: C.card,
    borderWidth: 1, borderColor: C.border,
    ...cardShadow,
  },
  summaryTop: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 16 },
  summaryIconWrap: {
    width: 54, height: 54, borderRadius: 16,
    backgroundColor: C.yellow + '18',
    justifyContent: 'center', alignItems: 'center',
  },
  summaryLabel:  { fontSize: 10, fontWeight: '700', color: C.muted, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 },
  summaryPoints: { fontSize: 36, fontWeight: '800', color: C.yellow, letterSpacing: 1, lineHeight: 42 },
  summaryDivider:{ height: StyleSheet.hairlineWidth, backgroundColor: C.divider, marginBottom: 16 },

  /* Stats row */
  statsRow:   { flexDirection: 'row', alignItems: 'center' },
  statCell:   { flex: 1, alignItems: 'center' },
  statVal:    { fontSize: 18, fontWeight: '800', letterSpacing: 0.5, marginBottom: 2 },
  statLabel:  { fontSize: 10, color: C.muted, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  statDivider:{ width: StyleSheet.hairlineWidth, height: 32, backgroundColor: C.divider },

  /* Tip card */
  tipCard: {
    flexDirection: 'row', gap: 12, padding: 14, marginBottom: 14,
    borderRadius: 14, backgroundColor: C.yellow + '0D',
    borderWidth: 1, borderColor: C.yellow + '25',
  },
  tipTitle: { fontSize: 12, fontWeight: '700', color: C.yellow, marginBottom: 4 },
  tipText:  { fontSize: 12, color: C.muted, lineHeight: 18 },

  /* History header */
  historyHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 10,
  },
  historyTitle: { fontSize: 12, fontWeight: '800', color: C.text, letterSpacing: 1, textTransform: 'uppercase' },
  historyCount: { fontSize: 12, color: C.muted },

  /* Row */
  row: {
    flexDirection: 'row', alignItems: 'stretch',
    backgroundColor: C.card, borderRadius: 14,
    marginBottom: 8, overflow: 'hidden',
    borderWidth: 1, borderColor: C.border,
    ...cardShadow,
  },
  bar:        { width: 4 },
  rowContent: { flex: 1, flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  rowDesc:    { fontSize: 13, fontWeight: '700', color: C.text, lineHeight: 18, marginBottom: 4 },
  rowDate:    { fontSize: 11, color: C.muted },
  rowPoints:  { fontSize: 18, fontWeight: '800', letterSpacing: 0.5 },
  rowPointsLabel: { fontSize: 9, fontWeight: '700', color: C.dim, letterSpacing: 1, textTransform: 'uppercase', textAlign: 'right' },

  /* Empty */
  emptyWrap:  { alignItems: 'center', paddingTop: 48, gap: 12 },
  emptyIcon:  { width: 80, height: 80, borderRadius: 40, backgroundColor: C.yellow + '10', justifyContent: 'center', alignItems: 'center' },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: C.text },
  emptySubt:  { fontSize: 13, color: C.muted },
});
