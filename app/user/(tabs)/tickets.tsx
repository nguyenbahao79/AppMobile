import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, Image, Pressable,
  Modal, SafeAreaView, Platform, ScrollView,
  RefreshControl, Alert, ActivityIndicator, Animated,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTickets, Ticket, Transaction } from '@/context/TicketContext';
import { apiClient } from '@/api/client';
import { API_ENDPOINTS } from '@/api/config';

/* ── Theme ── */
const NAVY   = '#0d0e28';
const CARD   = '#14163a';
const CARD2  = '#1b1e45';
const PURPLE = '#7b1fa2';
const PINK   = '#e91e8c';
const YELLOW = '#d4e219';
const GREEN  = '#4caf50';
const RED    = '#e57373';
const WHITE  = '#f0f0ff';
const MUTED  = 'rgba(240,240,255,0.5)';
const DIM    = 'rgba(240,240,255,0.25)';
const BORDER = 'rgba(255,255,255,0.08)';

/* ── Status helpers ── */
type StatusInfo = { label: string; color: string; bg: string; icon: React.ComponentProps<typeof Ionicons>['name'] };

function isShowtimePast(showDateRaw?: string, timeStr?: string): boolean {
  if (!showDateRaw) return false;
  const base = new Date(showDateRaw);
  if (isNaN(base.getTime())) return false;
  if (timeStr) {
    const [h, m] = timeStr.split(':').map(Number);
    if (!isNaN(h) && !isNaN(m)) base.setHours(h, m, 0, 0);
  }
  return base < new Date();
}

function getStatusInfo(ticket: Ticket): StatusInfo {
  if (ticket.rawStatus === 'pending') {
    return { label: 'Chờ thanh toán', color: YELLOW, bg: 'rgba(212,226,25,0.12)', icon: 'time-outline' };
  }
  if (ticket.status === 'cancelled') {
    return { label: 'Đã hủy', color: RED, bg: 'rgba(229,115,115,0.12)', icon: 'close-circle-outline' };
  }
  if (ticket.status === 'used') {
    return { label: 'Đã sử dụng', color: PURPLE, bg: 'rgba(123,31,162,0.15)', icon: 'checkmark-done-outline' };
  }
  if (isShowtimePast(ticket.showDateRaw, ticket.time)) {
    return { label: 'Đã chiếu', color: MUTED, bg: 'rgba(240,240,255,0.08)', icon: 'checkmark-circle-outline' };
  }
  return { label: 'Sắp chiếu', color: GREEN, bg: 'rgba(76,175,80,0.12)', icon: 'film-outline' };
}

/* ── Divider row ── */
function InfoRow({ label, value, full }: { label: string; value?: string; full?: boolean }) {
  return (
    <View style={[infoStyles.item, full && infoStyles.full]}>
      <Text style={infoStyles.label}>{label}</Text>
      <Text style={infoStyles.value} numberOfLines={full ? 2 : 1}>{value || '—'}</Text>
    </View>
  );
}
const infoStyles = StyleSheet.create({
  item: { width: '47%', marginBottom: 16 },
  full: { width: '100%' },
  label: { fontSize: 11, color: MUTED, marginBottom: 4, fontWeight: '600', letterSpacing: 0.5 },
  value: { fontSize: 14, color: WHITE, fontWeight: '700' },
});

/* ── Ticket Card ── */
function TicketCard({ ticket, onPress }: { ticket: Ticket; onPress: () => void }) {
  const st = getStatusInfo(ticket);
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => Animated.spring(scale, { toValue: 0.97, useNativeDriver: true, speed: 30 }).start();
  const handlePressOut = () => Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 30 }).start();

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable
        style={card.root}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
      >
        {/* Poster */}
        <Image source={{ uri: ticket.moviePoster }} style={card.poster} resizeMode="cover" />

        {/* Info */}
        <View style={card.info}>
          <Text style={card.title} numberOfLines={2}>{ticket.movieTitle}</Text>

          <View style={card.row}>
            <Ionicons name="calendar-outline" size={12} color={MUTED} />
            <Text style={card.meta}>{ticket.date}</Text>
            {!!ticket.time && (
              <>
                <Ionicons name="time-outline" size={12} color={MUTED} style={{ marginLeft: 8 }} />
                <Text style={card.meta}>{ticket.time}</Text>
              </>
            )}
          </View>

          {!!ticket.cinemaName && (
            <View style={card.row}>
              <Ionicons name="location-outline" size={12} color={MUTED} />
              <Text style={card.meta} numberOfLines={1}>{ticket.cinemaName}</Text>
            </View>
          )}

          <View style={card.row}>
            <Ionicons name="ticket-outline" size={12} color={YELLOW} />
            <Text style={[card.meta, { color: YELLOW, fontWeight: '700' }]} numberOfLines={1}>
              {ticket.seats.join(', ')}
            </Text>
          </View>

          {/* Footer row */}
          <View style={card.footer}>
            <View style={[card.badge, { backgroundColor: st.bg }]}>
              <Ionicons name={st.icon} size={10} color={st.color} />
              <Text style={[card.badgeText, { color: st.color }]}>{st.label}</Text>
            </View>
            <Text style={card.price}>{ticket.totalPrice.toLocaleString('vi-VN')}đ</Text>
          </View>
        </View>

        <Ionicons name="chevron-forward" size={16} color={DIM} style={{ alignSelf: 'center' }} />
      </Pressable>
    </Animated.View>
  );
}

const card = StyleSheet.create({
  root: {
    flexDirection: 'row',
    backgroundColor: CARD,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 12,
    marginBottom: 14,
    alignItems: 'flex-start',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 12 },
      android: { elevation: 6 },
    }),
  },
  poster: { width: 76, height: 108, borderRadius: 10, backgroundColor: CARD2 },
  info: { flex: 1, marginLeft: 12, marginRight: 4 },
  title: { fontSize: 15, fontWeight: '800', color: WHITE, marginBottom: 8, lineHeight: 20 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 5 },
  meta: { fontSize: 12, color: MUTED, flexShrink: 1 },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },
  badge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6,
  },
  badgeText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.3 },
  price: { fontSize: 13, fontWeight: '800', color: YELLOW },
});

/* ── Food order / Points log card (khớp web TransactionHistory.jsx) ── */
function formatTxDate(value?: string) {
  if (!value) return '';
  const d = new Date(value);
  if (isNaN(d.getTime())) return value;
  return `${d.toLocaleDateString('vi-VN')} · ${d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`;
}

const TX_STATUS_LABEL: Record<string, { label: string; color: string }> = {
  completed: { label: 'Hoàn thành', color: GREEN },
  cancelled: { label: 'Đã hủy', color: RED },
  pending:   { label: 'Chờ xử lý', color: YELLOW },
};

function FoodOrderCard({ tx }: { tx: Transaction }) {
  const st = TX_STATUS_LABEL[tx.status || ''] || TX_STATUS_LABEL.pending;
  const items = tx.items || [];
  return (
    <View style={txCard.root}>
      <View style={txCard.iconWrap}>
        <Ionicons name="fast-food-outline" size={20} color={PINK} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={txCard.title} numberOfLines={1}>
          {items.map((i) => i.label).filter(Boolean).join(', ') || 'Đơn bắp nước'}
        </Text>
        <Text style={txCard.sub}>{formatTxDate(tx.createdAt)}</Text>
        <View style={txCard.footer}>
          <View style={[txCard.badge, { backgroundColor: st.color + '22' }]}>
            <Text style={[txCard.badgeText, { color: st.color }]}>{st.label}</Text>
          </View>
          <Text style={txCard.price}>{Number(tx.finalAmount || 0).toLocaleString('vi-VN')}đ</Text>
        </View>
      </View>
    </View>
  );
}

function PointsLogCard({ tx }: { tx: Transaction }) {
  const item = tx.items?.[0];
  const points = Number(item?.price || 0);
  const positive = points > 0;
  return (
    <View style={txCard.root}>
      <View style={[txCard.iconWrap, { backgroundColor: 'rgba(212,226,25,0.12)' }]}>
        <Ionicons name="star-outline" size={20} color={YELLOW} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={txCard.title} numberOfLines={1}>{item?.label || 'Điểm thưởng'}</Text>
        <Text style={txCard.sub}>{formatTxDate(tx.createdAt)}</Text>
      </View>
      <Text style={[txCard.price, { color: positive ? GREEN : RED }]}>
        {positive ? '+' : ''}{points.toLocaleString('vi-VN')} pts
      </Text>
    </View>
  );
}

const txCard = StyleSheet.create({
  root: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: CARD, borderRadius: 16, borderWidth: 1, borderColor: BORDER,
    padding: 14, marginBottom: 12,
  },
  iconWrap: {
    width: 42, height: 42, borderRadius: 12,
    backgroundColor: 'rgba(233,30,140,0.12)',
    alignItems: 'center', justifyContent: 'center',
  },
  title: { fontSize: 14, fontWeight: '800', color: WHITE, marginBottom: 4 },
  sub: { fontSize: 11, color: MUTED, marginBottom: 6 },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  badgeText: { fontSize: 10, fontWeight: '800' },
  price: { fontSize: 13, fontWeight: '800', color: YELLOW },
});

/* ── Ticket Detail Modal ── */
function TicketDetailModal({
  ticket,
  visible,
  onClose,
  onCancel,
}: {
  ticket: Ticket | null;
  visible: boolean;
  onClose: () => void;
  onCancel: () => void;
}) {
  const st = ticket ? getStatusInfo(ticket) : null;

  return (
    <Modal animationType="slide" transparent visible={visible} onRequestClose={onClose}>
      <View style={modal.overlay}>
        <SafeAreaView style={modal.sheet}>
          {/* Handle bar */}
          <View style={modal.handle} />

          {/* Header */}
          <View style={modal.header}>
            <View style={modal.headerLeft}>
              <Ionicons name="ticket" size={16} color={YELLOW} />
              <Text style={modal.headerTitle}>CHI TIẾT VÉ</Text>
            </View>
            <Pressable onPress={onClose} hitSlop={12} style={modal.closeBtn}>
              <Ionicons name="close" size={22} color={MUTED} />
            </Pressable>
          </View>

          {ticket && (
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={modal.scroll}>

              {/* QR Section */}
              <View style={modal.qrWrap}>
                <View style={[modal.qrBox, !ticket.qrCode && modal.qrBoxEmpty]}>
                  {ticket.qrCode ? (
                    <Image source={{ uri: ticket.qrCode }} style={modal.qrImg} resizeMode="contain" />
                  ) : (
                    <>
                      <Ionicons name="qr-code-outline" size={60} color={DIM} />
                      <Text style={modal.qrMissingText}>QR chưa sẵn sàng</Text>
                    </>
                  )}
                </View>

                {/* Status badge */}
                {st && (
                  <View style={[modal.statusPill, { backgroundColor: st.bg, borderColor: st.color + '33' }]}>
                    <Ionicons name={st.icon} size={12} color={st.color} />
                    <Text style={[modal.statusPillText, { color: st.color }]}>{st.label}</Text>
                  </View>
                )}

                <Text style={modal.ticketCode}>#{ticket.ticketCode || ticket.id}</Text>
                {ticket.qrToken && (
                  <Text style={modal.qrNote}>QR bảo mật — được mã hóa bởi hệ thống</Text>
                )}
              </View>

              {/* Movie title */}
              <View style={modal.movieTitleWrap}>
                <Text style={modal.movieTitle}>{ticket.movieTitle}</Text>
              </View>

              {/* Info grid */}
              <View style={modal.section}>
                <View style={modal.infoGrid}>
                  <InfoRow label="Ngày chiếu" value={ticket.date} />
                  <InfoRow label="Giờ chiếu" value={ticket.time} />
                  <InfoRow label="Phòng chiếu" value={ticket.roomName} />
                  <InfoRow label="Chi nhánh" value={ticket.cinemaName} />
                  <InfoRow label="Địa chỉ rạp" value={ticket.cinemaAddress} full />
                  <InfoRow label="Ghế" value={ticket.seats.join(', ')} full />
                </View>

                <View style={modal.divider} />

                {/* Price rows */}
                <View style={modal.priceRow}>
                  <Text style={modal.priceLabel}>Tổng tiền</Text>
                  <Text style={modal.priceValue}>{ticket.totalPrice.toLocaleString('vi-VN')}đ</Text>
                </View>
                <View style={modal.priceRow}>
                  <Text style={modal.priceLabel}>Thanh toán qua</Text>
                  <Text style={modal.priceSecondary}>{ticket.paymentMethod}</Text>
                </View>
                <View style={modal.priceRow}>
                  <Text style={modal.priceLabel}>Ngày đặt</Text>
                  <Text style={modal.priceSecondary}>{ticket.bookingDate}</Text>
                </View>
              </View>

              {/* Note */}
              <Text style={modal.note}>
                Vui lòng xuất trình mã QR cho nhân viên tại quầy soát vé. QR được mã hóa — không đọc được bằng mắt thường.
              </Text>

              {/* Cancel button — only for pending */}
              {ticket.rawStatus === 'pending' && (
                <Pressable style={modal.cancelBtn} onPress={onCancel}>
                  <Ionicons name="close-circle-outline" size={18} color={RED} />
                  <Text style={modal.cancelBtnText}>Hủy vé này</Text>
                </Pressable>
              )}
            </ScrollView>
          )}
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const modal = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: NAVY,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '92%',
    borderTopWidth: 1,
    borderColor: BORDER,
  },
  handle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignSelf: 'center', marginTop: 12, marginBottom: 4,
  },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 16,
    borderBottomWidth: 1, borderBottomColor: BORDER,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerTitle: { fontSize: 13, fontWeight: '800', color: YELLOW, letterSpacing: 1.5 },
  closeBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center', justifyContent: 'center',
  },
  scroll: { paddingBottom: Platform.OS === 'ios' ? 48 : 28 },

  /* QR */
  qrWrap: { alignItems: 'center', paddingVertical: 28, paddingHorizontal: 20 },
  qrBox: {
    width: 192, height: 192,
    backgroundColor: '#fff',
    borderRadius: 20, padding: 10,
    alignItems: 'center', justifyContent: 'center',
    ...Platform.select({
      ios: { shadowColor: PURPLE, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.4, shadowRadius: 20 },
      android: { elevation: 10 },
    }),
  },
  qrBoxEmpty: { backgroundColor: CARD2, borderWidth: 1, borderColor: BORDER },
  qrImg: { width: '100%', height: '100%', borderRadius: 12 },
  qrMissingText: { color: DIM, fontSize: 12, marginTop: 10 },
  statusPill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderWidth: 1, borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 6, marginTop: 16,
  },
  statusPillText: { fontSize: 12, fontWeight: '800', letterSpacing: 0.5 },
  ticketCode: { color: DIM, fontSize: 12, letterSpacing: 1.5, marginTop: 10, fontWeight: '600' },
  qrNote: { color: DIM, fontSize: 11, fontStyle: 'italic', marginTop: 4 },

  /* Movie title */
  movieTitleWrap: {
    marginHorizontal: 20, marginBottom: 4,
    paddingBottom: 16,
    borderBottomWidth: 1, borderBottomColor: BORDER,
  },
  movieTitle: {
    fontSize: 20, fontWeight: '900', color: WHITE,
    textAlign: 'center', letterSpacing: 0.3, lineHeight: 26,
  },

  /* Section card */
  section: {
    margin: 16, marginTop: 14,
    backgroundColor: CARD,
    borderRadius: 16, padding: 20,
    borderWidth: 1, borderColor: BORDER,
  },
  infoGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  divider: { height: 1, backgroundColor: BORDER, marginVertical: 12 },
  priceRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginTop: 10,
  },
  priceLabel: { fontSize: 13, color: MUTED, fontWeight: '600' },
  priceValue: { fontSize: 20, fontWeight: '900', color: YELLOW, letterSpacing: 0.5 },
  priceSecondary: { fontSize: 14, color: WHITE, fontWeight: '700' },

  /* Note & cancel */
  note: {
    textAlign: 'center', fontSize: 11, color: DIM,
    fontStyle: 'italic', paddingHorizontal: 24, marginBottom: 20,
  },
  cancelBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    marginHorizontal: 16, marginBottom: 8,
    paddingVertical: 14, borderRadius: 14,
    borderWidth: 1.5, borderColor: 'rgba(229,115,115,0.4)',
    borderStyle: 'dashed', backgroundColor: 'rgba(229,115,115,0.05)',
  },
  cancelBtnText: { fontSize: 15, fontWeight: '800', color: RED },
});

/* ══════════════════════ MAIN SCREEN ══════════════════════ */
export default function TicketsScreen() {
  const { tickets, cancelTicket, fetchTickets, loading } = useTickets();

  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Khớp web TransactionHistory.jsx: cùng 1 danh sách giao dịch có 3 loại (vé/bắp nước/điểm).
  const [activeTab, setActiveTab] = useState<'ticket_online' | 'food' | 'points'>('ticket_online');
  const [loadingOthers, setLoadingOthers] = useState(false);
  // /me/transactions trả 1 luồng phân trang GỘP cả "food" và "points" theo thời gian — 2 tab bên dưới
  // lọc theo type TỪ luồng đã tải, nên cuộn tải thêm ở 1 trong 2 tab sẽ tải thêm cho cả luồng chung
  // (giống hạn chế đã chấp nhận ở web: lọc theo loại chỉ áp dụng trên dữ liệu đã tải, không xuyên trang).
  const [allTx, setAllTx] = useState<Transaction[]>([]);
  const [txHasMore, setTxHasMore] = useState(true);
  const [txLoadingMore, setTxLoadingMore] = useState(false);
  const nextTxPageRef = useRef(0);
  const TX_PAGE_SIZE = 10;

  const foodOrders = useMemo(() => allTx.filter((t) => t.type === 'food'), [allTx]);
  const pointsLogs = useMemo(() => allTx.filter((t) => t.type === 'points'), [allTx]);

  const fetchOtherTransactions = useCallback(async (reset: boolean) => {
    if (reset) setLoadingOthers(true);
    try {
      const targetPage = reset ? 0 : nextTxPageRef.current;
      const data = await apiClient.get(`${API_ENDPOINTS.MY_TRANSACTIONS}?page=${targetPage}&size=${TX_PAGE_SIZE}`) as
        { content?: Transaction[]; totalPages?: number } | null;
      const content = Array.isArray(data?.content) ? (data!.content as Transaction[]) : [];
      setAllTx(prev => (reset ? content : [...prev, ...content]));
      nextTxPageRef.current = targetPage + 1;
      setTxHasMore(targetPage + 1 < (data?.totalPages || 0));
    } catch {
      if (reset) setAllTx([]);
    } finally {
      setLoadingOthers(false);
      setTxLoadingMore(false);
    }
  }, []);

  const handleOtherTxEndReached = () => {
    if (txLoadingMore || !txHasMore || loadingOthers) return;
    setTxLoadingMore(true);
    fetchOtherTransactions(false);
  };

  useFocusEffect(
    useCallback(() => { fetchTickets(); fetchOtherTransactions(true); }, [fetchTickets, fetchOtherTransactions])
  );

  useEffect(() => {
    if (!selectedTicket) return;
    const updated = tickets.find((t) => t.id === selectedTicket.id);
    if (updated && updated !== selectedTicket) setSelectedTicket(updated);
  }, [selectedTicket, tickets]);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchTickets(), fetchOtherTransactions(true)]);
    setRefreshing(false);
  };

  const handleCancel = () => {
    if (!selectedTicket) return;
    Alert.alert(
      'Hủy vé',
      'Bạn có chắc muốn hủy đơn vé đang chờ thanh toán này không?',
      [
        { text: 'Giữ vé', style: 'cancel' },
        {
          text: 'Xác nhận hủy',
          style: 'destructive',
          onPress: async () => {
            try {
              await cancelTicket(selectedTicket.id);
              setModalVisible(false);
            } catch (err) {
              Alert.alert('Không thể hủy', err instanceof Error ? err.message : 'Vui lòng thử lại sau.');
            }
          },
        },
      ],
    );
  };

  const isTicketTab = activeTab === 'ticket_online';
  const activeLoading = isTicketTab ? loading : loadingOthers;
  const activeCount = isTicketTab ? tickets.length : activeTab === 'food' ? foodOrders.length : pointsLogs.length;

  const TABS: { key: typeof activeTab; label: string; icon: React.ComponentProps<typeof Ionicons>['name'] }[] = [
    { key: 'ticket_online', label: 'Vé xem phim', icon: 'ticket-outline' },
    { key: 'food', label: 'Bắp nước', icon: 'fast-food-outline' },
    { key: 'points', label: 'Điểm', icon: 'star-outline' },
  ];

  return (
    <SafeAreaView style={styles.container}>

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerBadge}>
          <Ionicons name="ticket" size={13} color={YELLOW} />
          <Text style={styles.headerTitle}>GIAO DỊCH CỦA TÔI</Text>
        </View>
        <Pressable onPress={onRefresh} hitSlop={10} style={styles.refreshBtn}>
          <Ionicons name="refresh-outline" size={18} color={MUTED} />
        </Pressable>
      </View>

      {/* Tabs — khớp web TransactionHistory.jsx (vé / bắp nước / điểm) */}
      <View style={styles.tabBar}>
        {TABS.map((t) => {
          const active = t.key === activeTab;
          return (
            <Pressable
              key={t.key}
              style={[styles.tabBtn, active && styles.tabBtnActive]}
              onPress={() => setActiveTab(t.key)}
            >
              <Ionicons name={t.icon} size={14} color={active ? '#0d0e28' : MUTED} />
              <Text style={[styles.tabBtnText, active && styles.tabBtnTextActive]} numberOfLines={1}>
                {t.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Loading */}
      {activeLoading && !refreshing && (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={YELLOW} size="large" />
        </View>
      )}

      {/* Empty */}
      {!activeLoading && activeCount === 0 && (
        <View style={styles.empty}>
          <View style={styles.emptyIconWrap}>
            <Ionicons name={TABS.find((t) => t.key === activeTab)!.icon} size={52} color={DIM} />
          </View>
          <Text style={styles.emptyTitle}>
            {isTicketTab ? 'Chưa có vé nào' : activeTab === 'food' ? 'Chưa có đơn bắp nước nào' : 'Chưa có lịch sử điểm'}
          </Text>
          <Text style={styles.emptySub}>
            {isTicketTab ? 'Hãy chọn phim yêu thích và đặt vé ngay!' : activeTab === 'food' ? 'Đặt bắp nước để xem lịch sử tại đây.' : 'Mua vé/bắp nước để bắt đầu tích điểm.'}
          </Text>
          <Pressable style={styles.emptyRefreshBtn} onPress={onRefresh}>
            <Ionicons name="refresh-outline" size={14} color={YELLOW} />
            <Text style={styles.emptyRefreshText}>Tải lại</Text>
          </Pressable>
        </View>
      )}

      {/* List: Vé xem phim */}
      {!activeLoading && isTicketTab && tickets.length > 0 && (
        <FlatList
          data={tickets}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TicketCard
              ticket={item}
              onPress={() => { setSelectedTicket(item); setModalVisible(true); }}
            />
          )}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={YELLOW} colors={[YELLOW]} />
          }
        />
      )}

      {/* List: Bắp nước */}
      {!activeLoading && activeTab === 'food' && foodOrders.length > 0 && (
        <FlatList
          data={foodOrders}
          keyExtractor={(item, i) => String(item.id ?? item.orderCode ?? i)}
          renderItem={({ item }) => <FoodOrderCard tx={item} />}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          onEndReached={handleOtherTxEndReached}
          onEndReachedThreshold={0.4}
          ListFooterComponent={txLoadingMore ? (
            <View style={{ paddingVertical: 20 }}><ActivityIndicator size="small" color={YELLOW} /></View>
          ) : null}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={YELLOW} colors={[YELLOW]} />
          }
        />
      )}

      {/* List: Điểm thưởng */}
      {!activeLoading && activeTab === 'points' && pointsLogs.length > 0 && (
        <FlatList
          data={pointsLogs}
          keyExtractor={(item, i) => String(item.id ?? item.orderCode ?? i)}
          renderItem={({ item }) => <PointsLogCard tx={item} />}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          onEndReached={handleOtherTxEndReached}
          onEndReachedThreshold={0.4}
          ListFooterComponent={txLoadingMore ? (
            <View style={{ paddingVertical: 20 }}><ActivityIndicator size="small" color={YELLOW} /></View>
          ) : null}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={YELLOW} colors={[YELLOW]} />
          }
        />
      )}

      {/* Detail Modal */}
      <TicketDetailModal
        ticket={selectedTicket}
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onCancel={handleCancel}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: NAVY },

  /* Header */
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: BORDER,
    backgroundColor: NAVY,
  },
  headerBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    backgroundColor: 'rgba(212,226,25,0.08)',
    borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6,
    borderWidth: 1, borderColor: 'rgba(212,226,25,0.18)',
  },
  headerTitle: { fontSize: 12, fontWeight: '900', color: YELLOW, letterSpacing: 1.5 },
  refreshBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: BORDER,
  },

  /* Tabs */
  tabBar: {
    flexDirection: 'row', gap: 8,
    paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4,
  },
  tabBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5,
    paddingVertical: 9, borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1, borderColor: BORDER,
  },
  tabBtnActive: { backgroundColor: YELLOW, borderColor: YELLOW },
  tabBtnText: { fontSize: 11, fontWeight: '700', color: MUTED },
  tabBtnTextActive: { color: '#0d0e28' },

  /* Loading / empty */
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 },
  emptyIconWrap: {
    width: 96, height: 96, borderRadius: 48,
    backgroundColor: 'rgba(255,255,255,0.04)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: BORDER, marginBottom: 20,
  },
  emptyTitle: { fontSize: 20, fontWeight: '800', color: WHITE, marginBottom: 8 },
  emptySub: { fontSize: 13, color: MUTED, textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  emptyRefreshBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 20, paddingVertical: 10,
    backgroundColor: 'rgba(212,226,25,0.08)',
    borderRadius: 10, borderWidth: 1, borderColor: 'rgba(212,226,25,0.2)',
  },
  emptyRefreshText: { fontSize: 13, fontWeight: '700', color: YELLOW },

  list: { padding: 16, paddingBottom: 32 },
});
