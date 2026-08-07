import React, { useCallback, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, Pressable, SafeAreaView,
  ActivityIndicator, Alert, RefreshControl, Platform, TouchableOpacity,
  Modal, ScrollView,
} from 'react-native';
import { useFocusEffect, router } from 'expo-router';
import { IconSymbol } from '@/components/base/icon-symbol';
import { useAuth } from '@/context/AuthContext';
import { voucherService, PublicVoucher } from '@/services/voucherService';
import { meService, MyVoucher } from '@/services/meService';

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
  android: { elevation: 6 },
}) ?? {};

/* ── Helpers ─────────────────────────────────────────────────────── */
function fmtVnd(v: number) {
  return v > 0 ? `${v.toLocaleString('vi-VN')}đ` : '—';
}
function fmtDate(d?: string) {
  if (!d) return '—';
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return d;
  return dt.toLocaleDateString('vi-VN');
}
function fmtDiscount(v: PublicVoucher) {
  const isFixed = v.discountType?.toLowerCase().includes('fixed') || v.discountType?.toLowerCase().includes('amount');
  return isFixed ? `${v.value.toLocaleString('vi-VN')}đ` : `${v.value}%`;
}
function isExpired(v?: PublicVoucher | null) {
  if (!v) return true;
  if (Number(v.status) === 0) return true;
  const end = v.endDate ? new Date(`${String(v.endDate).slice(0, 10)}T23:59:59`) : null;
  return Boolean(end && end < new Date());
}
function isScheduled(v?: PublicVoucher | null) {
  if (!v) return false;
  const start = v.startDate ? new Date(`${String(v.startDate).slice(0, 10)}T00:00:00`) : null;
  return Boolean(start && start > new Date());
}
function voucherState(uv: MyVoucher): { label: string; color: string } {
  const used = uv.status === 0;
  const exp  = isExpired(uv.voucher);
  const sch  = isScheduled(uv.voucher);
  if (used)   return { label: 'Đã dùng',        color: C.muted };
  if (exp)    return { label: 'Hết hạn',         color: C.red };
  if (sch)    return { label: 'Chờ hiệu lực',   color: C.yellow };
  return       { label: 'Còn hạn',              color: C.green };
}

/* ── Detail Modal ─────────────────────────────────────────────────── */
function VoucherDetailModal({ uv, onClose }: { uv: MyVoucher; onClose: () => void }) {
  const v     = uv.voucher;
  const state = voucherState(uv);
  const isActive = state.label === 'Còn hạn';

  return (
    <Modal visible animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={m.overlay} onPress={onClose}>
        <Pressable style={m.sheet} onPress={e => e.stopPropagation()}>
          {/* Handle */}
          <View style={m.handle} />

          {/* Title */}
          <Text style={m.title}>
            CHI TIẾT <Text style={{ color: C.yellow }}>VOUCHER</Text>
          </Text>

          {/* Discount hero */}
          <View style={m.hero}>
            <Text style={m.heroDiscount}>{fmtDiscount(v)}</Text>
            <Text style={m.heroLabel}>GIẢM GIÁ</Text>
            <View style={[m.codeBox, { borderColor: state.color + '50' }]}>
              <Text style={[m.codeText, { color: state.color }]}>{v?.code}</Text>
            </View>
          </View>

          {/* Status badge */}
          <View style={[m.statusBadge, { backgroundColor: state.color + '15', borderColor: state.color + '40' }]}>
            <View style={[m.statusDot, { backgroundColor: state.color }]} />
            <Text style={[m.statusText, { color: state.color }]}>{state.label}</Text>
          </View>

          {/* Description */}
          {v?.description ? (
            <View style={m.descBox}>
              <Text style={m.descText}>{v.description}</Text>
            </View>
          ) : null}

          {/* Meta grid */}
          <View style={m.metaGrid}>
            {[
              ['Đơn tối thiểu',  fmtVnd(v?.minOrderValue ?? 0)],
              ['Giảm tối đa',    fmtVnd(v?.maxDiscountAmount ?? 0)],
              ['Điểm đổi',       Number(v?.pointVoucher ?? 0) > 0 ? `${v.pointVoucher} điểm` : 'Miễn phí'],
              ['Bắt đầu',        fmtDate(v?.startDate)],
              ['Kết thúc',       fmtDate(v?.endDate)],
              ['Trạng thái',     state.label],
            ].map(([k, val]) => (
              <View key={k} style={m.metaCell}>
                <Text style={m.metaKey}>{k}</Text>
                <Text style={m.metaVal}>{val}</Text>
              </View>
            ))}
          </View>

          <TouchableOpacity style={m.closeBtn} onPress={onClose} activeOpacity={0.8}>
            <Text style={m.closeBtnText}>Đóng</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

/* ── Wallet card ──────────────────────────────────────────────────── */
function WalletCard({ uv, onPress }: { uv: MyVoucher; onPress: () => void }) {
  const v     = uv.voucher;
  const state = voucherState(uv);
  const isActive = state.label === 'Còn hạn';
  const stripeColor = isActive
    ? [C.purple, C.pink]
    : [state.color, state.color];

  return (
    <TouchableOpacity style={[s.vCard, !isActive && { opacity: 0.6 }]} onPress={onPress} activeOpacity={0.85}>
      {/* Left stripe */}
      <View style={[s.vStripe, { backgroundColor: stripeColor[0] }]} />

      <View style={s.vBody}>
        <View style={s.vTopRow}>
          <Text style={s.vCode}>{v?.code}</Text>
          <View style={[s.vStatusBadge, { backgroundColor: state.color + '18', borderColor: state.color + '40' }]}>
            <Text style={[s.vStatusText, { color: state.color }]}>{state.label}</Text>
          </View>
        </View>
        <Text style={s.vDiscount}>{fmtDiscount(v)}</Text>
        <View style={s.vDivider} />
        <View style={s.vMeta}>
          <Text style={s.vMetaText}>Min: {fmtVnd(v?.minOrderValue ?? 0)}</Text>
          <Text style={s.vMetaText}>HSD: {fmtDate(v?.endDate)}</Text>
        </View>
      </View>

      <View style={s.vChevron}>
        <IconSymbol name="chevron.right" size={13} color={C.dim} />
      </View>
    </TouchableOpacity>
  );
}

/* ── Catalog card ─────────────────────────────────────────────────── */
function CatalogCard({
  item, alreadyRedeemed, notEnoughPoints, redeeming, onRedeem,
}: {
  item: PublicVoucher; alreadyRedeemed: boolean;
  notEnoughPoints: boolean; redeeming: boolean;
  onRedeem: () => void;
}) {
  return (
    <View style={s.vCard}>
      <View style={[s.vStripe, { backgroundColor: C.pink }]} />
      <View style={s.vBody}>
        <View style={s.vTopRow}>
          <Text style={s.vCode}>{item.code}</Text>
          {item.pointVoucher > 0 ? (
            <View style={[s.vStatusBadge, { backgroundColor: C.yellow + '18', borderColor: C.yellow + '40' }]}>
              <IconSymbol name="star.fill" size={9} color={C.yellow} />
              <Text style={[s.vStatusText, { color: C.yellow, marginLeft: 3 }]}>{item.pointVoucher} điểm</Text>
            </View>
          ) : (
            <View style={[s.vStatusBadge, { backgroundColor: C.green + '18', borderColor: C.green + '40' }]}>
              <Text style={[s.vStatusText, { color: C.green }]}>Miễn phí</Text>
            </View>
          )}
        </View>
        <Text style={s.vDiscount}>{fmtDiscount(item)}</Text>
        <View style={s.vDivider} />
        <Text style={s.vMetaText}>Min: {fmtVnd(item.minOrderValue)}</Text>
      </View>

      {alreadyRedeemed ? (
        <View style={s.redeemDone}>
          <IconSymbol name="checkmark.circle.fill" size={18} color={C.green} />
          <Text style={[s.redeemText, { color: C.green }]}>Đã đổi</Text>
        </View>
      ) : (
        <TouchableOpacity
          style={[s.redeemBtn, notEnoughPoints && { backgroundColor: C.card2 }]}
          onPress={onRedeem}
          disabled={notEnoughPoints || redeeming}
          activeOpacity={0.8}
        >
          {redeeming
            ? <ActivityIndicator size="small" color="#fff" />
            : <Text style={[s.redeemText, notEnoughPoints && { color: C.muted }]}>
                {notEnoughPoints ? 'Thiếu điểm' : 'Đổi ngay'}
              </Text>
          }
        </TouchableOpacity>
      )}
    </View>
  );
}

/* ── Main Screen ─────────────────────────────────────────────────── */
type FilterKey = 'all' | 'active' | 'used';

export default function VouchersScreen() {
  const { session }  = useAuth();
  const myPoints     = session?.user?.points ?? 0;

  const [tab,        setTab]        = useState<'mine' | 'catalog'>('mine');
  const [filter,     setFilter]     = useState<FilterKey>('all');
  const [catalog,    setCatalog]    = useState<PublicVoucher[]>([]);
  const [wallet,     setWallet]     = useState<MyVoucher[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [redeemingId,setRedeemingId]= useState<number | null>(null);
  const [selected,   setSelected]   = useState<MyVoucher | null>(null);

  const load = useCallback(async () => {
    try {
      const [cat, wal] = await Promise.all([
        voucherService.getPublicVouchers(),
        meService.getMyVouchers().catch(() => [] as MyVoucher[]),
      ]);
      setCatalog(cat.filter(v => v.status === 1));
      setWallet(wal);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const redeemedIds = useMemo(() => new Set(wallet.map(w => w.voucher?.id).filter(Boolean)), [wallet]);

  const handleRedeem = async (voucher: PublicVoucher) => {
    setRedeemingId(voucher.id);
    try {
      await meService.redeemVoucher(voucher.id);
      Alert.alert('Thành công', 'Voucher đã được thêm vào ví của bạn.');
      await load();
    } catch (err: any) {
      Alert.alert('Không đổi được', err.message || 'Vui lòng thử lại sau.');
    } finally {
      setRedeemingId(null);
    }
  };

  /* Stats for wallet */
  const statsActive   = wallet.filter(uv => voucherState(uv).label === 'Còn hạn').length;
  const statsInactive = wallet.length - statsActive;

  /* Filtered wallet */
  const filteredWallet = useMemo(() => wallet.filter(uv => {
    const st = voucherState(uv).label;
    if (filter === 'active') return st === 'Còn hạn';
    if (filter === 'used')   return st !== 'Còn hạn';
    return true;
  }), [wallet, filter]);

  const rc = (
    <RefreshControl
      refreshing={refreshing} onRefresh={onRefresh}
      tintColor={C.purple} colors={[C.purple]} progressBackgroundColor={C.card}
    />
  );

  return (
    <SafeAreaView style={s.safe}>
      {/* Header */}
      <View style={s.header}>
        <Pressable onPress={() => router.back()} style={s.backBtn} hitSlop={10}>
          <IconSymbol name="chevron.left" size={20} color={C.text} />
        </Pressable>
        <Text style={s.headerTitle}>
          VOUCHER <Text style={{ color: C.yellow }}>CỦA TÔI</Text>
        </Text>
        <View style={[s.ptsBadge]}>
          <IconSymbol name="star.fill" size={10} color={C.yellow} />
          <Text style={s.ptsText}>{myPoints}</Text>
        </View>
      </View>

      {/* Tab bar */}
      <View style={s.tabBar}>
        {([
          { key: 'mine',    label: 'Ví của tôi' },
          { key: 'catalog', label: 'Kho voucher' },
        ] as const).map(t => (
          <Pressable
            key={t.key}
            style={[s.tabBtn, tab === t.key && s.tabBtnActive]}
            onPress={() => setTab(t.key)}
          >
            <Text style={[s.tabText, tab === t.key && s.tabTextActive]}>{t.label}</Text>
          </Pressable>
        ))}
      </View>

      {loading ? (
        <View style={s.center}>
          <ActivityIndicator size="large" color={C.purple} />
        </View>
      ) : tab === 'mine' ? (
        /* ── Wallet tab ── */
        <FlatList
          data={filteredWallet}
          keyExtractor={item => String(item.userVoucherId)}
          contentContainerStyle={s.list}
          showsVerticalScrollIndicator={false}
          refreshControl={rc}
          ListHeaderComponent={
            <>
              {/* Stats row */}
              <View style={s.statsRow}>
                {([
                  { label: 'Tổng',           val: wallet.length,    color: C.text   },
                  { label: 'Còn hạn',        val: statsActive,      color: C.green  },
                  { label: 'Đã dùng/hết hạn',val: statsInactive,   color: C.yellow },
                ] as const).map(st => (
                  <View key={st.label} style={s.statCell}>
                    <Text style={[s.statVal, { color: st.color }]}>{st.val}</Text>
                    <Text style={s.statLabel}>{st.label}</Text>
                  </View>
                ))}
              </View>

              {/* Filter chips */}
              <View style={s.filterRow}>
                {([
                  { key: 'all',    label: 'Tất cả' },
                  { key: 'active', label: 'Còn hạn' },
                  { key: 'used',   label: 'Đã dùng' },
                ] as const).map(f => (
                  <TouchableOpacity
                    key={f.key}
                    style={[s.filterChip, filter === f.key && s.filterChipActive]}
                    onPress={() => setFilter(f.key)}
                    activeOpacity={0.8}
                  >
                    <Text style={[s.filterText, filter === f.key && s.filterTextActive]}>{f.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          }
          ListEmptyComponent={
            <View style={s.emptyWrap}>
              <IconSymbol name="ticket.fill" size={40} color={C.purple + '50'} />
              <Text style={s.emptyTitle}>
                {filter === 'active' ? 'Không có voucher còn hạn'
                  : filter === 'used' ? 'Chưa sử dụng voucher nào'
                  : 'Bạn chưa có voucher nào'}
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <WalletCard uv={item} onPress={() => setSelected(item)} />
          )}
        />
      ) : (
        /* ── Catalog tab ── */
        <FlatList
          data={catalog}
          keyExtractor={item => String(item.id)}
          contentContainerStyle={s.list}
          showsVerticalScrollIndicator={false}
          refreshControl={rc}
          ListHeaderComponent={
            <View style={s.catalogHint}>
              <IconSymbol name="star.fill" size={13} color={C.yellow} />
              <Text style={s.catalogHintText}>
                Bạn có <Text style={{ color: C.yellow, fontWeight: '700' }}>{myPoints} điểm</Text> — đổi lấy voucher bên dưới
              </Text>
            </View>
          }
          ListEmptyComponent={
            <View style={s.emptyWrap}>
              <IconSymbol name="gift.fill" size={40} color={C.purple + '50'} />
              <Text style={s.emptyTitle}>Chưa có voucher nào trong kho</Text>
            </View>
          }
          renderItem={({ item }) => (
            <CatalogCard
              item={item}
              alreadyRedeemed={redeemedIds.has(item.id)}
              notEnoughPoints={item.pointVoucher > myPoints}
              redeeming={redeemingId === item.id}
              onRedeem={() => handleRedeem(item)}
            />
          )}
        />
      )}

      {/* Detail modal */}
      {selected && (
        <VoucherDetailModal uv={selected} onClose={() => setSelected(null)} />
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
  ptsBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10,
    backgroundColor: C.yellow + '18', borderWidth: 1, borderColor: C.yellow + '40',
  },
  ptsText: { fontSize: 12, fontWeight: '700', color: C.yellow },

  /* Tab bar */
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.divider,
  },
  tabBtn: {
    flex: 1, alignItems: 'center', paddingVertical: 12,
    borderBottomWidth: 2, borderBottomColor: 'transparent',
  },
  tabBtnActive:  { borderBottomColor: C.purple },
  tabText:       { fontSize: 14, fontWeight: '600', color: C.muted },
  tabTextActive: { color: C.text, fontWeight: '700' },

  /* Stats */
  statsRow: {
    flexDirection: 'row', gap: 8, marginBottom: 14,
  },
  statCell: {
    flex: 1, padding: 12, borderRadius: 14,
    backgroundColor: C.card, borderWidth: 1, borderColor: C.border,
    alignItems: 'center',
    ...cardShadow,
  },
  statVal:   { fontSize: 22, fontWeight: '800', marginBottom: 2 },
  statLabel: { fontSize: 10, color: C.muted, textAlign: 'center', fontWeight: '600' },

  /* Filter */
  filterRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  filterChip: {
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 10,
    backgroundColor: C.card, borderWidth: 1, borderColor: C.border,
  },
  filterChipActive:  { backgroundColor: C.purple + '30', borderColor: C.purple + '60' },
  filterText:        { fontSize: 12, fontWeight: '600', color: C.muted },
  filterTextActive:  { color: C.text, fontWeight: '700' },

  /* Voucher card */
  vCard: {
    flexDirection: 'row', alignItems: 'stretch',
    backgroundColor: C.card, borderRadius: 16,
    borderWidth: 1, borderColor: C.border,
    marginBottom: 12, overflow: 'hidden',
    ...cardShadow,
  },
  vStripe: { width: 5 },
  vBody:   { flex: 1, padding: 14 },
  vTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  vCode:   { fontSize: 14, fontWeight: '800', color: C.text, letterSpacing: 1.5, fontVariant: ['tabular-nums'] },
  vStatusBadge: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 8, borderWidth: 1,
  },
  vStatusText:  { fontSize: 10, fontWeight: '700' },
  vDiscount:    { fontSize: 22, fontWeight: '800', color: C.yellow, marginBottom: 8 },
  vDivider:     { height: StyleSheet.hairlineWidth, backgroundColor: C.divider, marginBottom: 8 },
  vMeta:        { flexDirection: 'row', justifyContent: 'space-between' },
  vMetaText:    { fontSize: 11, color: C.muted },
  vChevron:     { justifyContent: 'center', paddingHorizontal: 12 },

  /* Redeem button */
  redeemBtn: {
    justifyContent: 'center', alignItems: 'center',
    paddingHorizontal: 14, margin: 12,
    borderRadius: 12, backgroundColor: C.purple,
    minWidth: 76,
  },
  redeemDone: {
    justifyContent: 'center', alignItems: 'center',
    paddingHorizontal: 14, margin: 12, gap: 4,
  },
  redeemText: { fontSize: 12, fontWeight: '700', color: '#fff' },

  /* Catalog hint */
  catalogHint: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    padding: 12, marginBottom: 14, borderRadius: 12,
    backgroundColor: C.yellow + '10', borderWidth: 1, borderColor: C.yellow + '25',
  },
  catalogHintText: { fontSize: 13, color: C.muted, flex: 1 },

  /* Empty */
  emptyWrap:  { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyTitle: { fontSize: 15, color: C.muted, fontWeight: '600' },
});

/* ── Modal styles ─────────────────────────────────────────────────── */
const m = StyleSheet.create({
  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: C.card,
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    padding: 24, paddingTop: 12,
    borderTopWidth: 1, borderColor: C.border,
    ...Platform.select({
      ios:     { shadowColor: '#000', shadowOffset: { width: 0, height: -6 }, shadowOpacity: 0.4, shadowRadius: 20 },
      android: { elevation: 20 },
    }),
  },
  handle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: C.dim, alignSelf: 'center', marginBottom: 20,
  },
  title: {
    fontSize: 16, fontWeight: '800', color: C.text,
    letterSpacing: 1, textTransform: 'uppercase', marginBottom: 20,
  },
  hero: { alignItems: 'center', marginBottom: 14 },
  heroDiscount: { fontSize: 40, fontWeight: '800', color: C.yellow, letterSpacing: 2, lineHeight: 48 },
  heroLabel:    { fontSize: 11, fontWeight: '700', color: C.muted, letterSpacing: 1, textTransform: 'uppercase', marginTop: 2, marginBottom: 12 },
  codeBox: {
    paddingHorizontal: 16, paddingVertical: 8,
    borderRadius: 10, borderWidth: 1,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  codeText: { fontSize: 16, fontWeight: '800', letterSpacing: 2 },
  statusBadge: {
    flexDirection: 'row', alignItems: 'center', alignSelf: 'center',
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: 10, borderWidth: 1,
    marginBottom: 16, gap: 6,
  },
  statusDot:  { width: 7, height: 7, borderRadius: 4 },
  statusText: { fontSize: 12, fontWeight: '700' },
  descBox: {
    padding: 12, borderRadius: 10, marginBottom: 14,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1, borderColor: C.border,
  },
  descText: { fontSize: 13, color: C.muted, lineHeight: 19 },
  metaGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20,
  },
  metaCell: {
    width: '47%', padding: 10, borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1, borderColor: C.border,
  },
  metaKey: { fontSize: 10, color: C.muted, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 4 },
  metaVal: { fontSize: 13, color: C.text, fontWeight: '700' },
  closeBtn: {
    height: 46, borderRadius: 12,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: C.border,
    marginBottom: Platform.OS === 'ios' ? 12 : 0,
  },
  closeBtnText: { fontSize: 14, fontWeight: '700', color: C.muted },
});
