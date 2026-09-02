import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  Pressable,
  ScrollView,
  SafeAreaView,
  Platform,
  Alert,
} from 'react-native';
import { useRouter, Href, useFocusEffect } from 'expo-router';
import { IconSymbol } from '@/components/base/icon-symbol';
import { useAuth } from '@/context/AuthContext';
import { useTickets } from '@/context/TicketContext';
import { meService, MembershipRank } from '@/services/meService';

// ─── Web theme colors ─────────────────────────────────────────────────────────
const C = {
  bg:       '#0f102a',
  card:     '#141632',
  border:   'rgba(255,255,255,0.07)',
  purple:   '#7b1fa2',
  pink:     '#e91e8c',
  yellow:   '#d4e219',
  text:     '#FFFFFF',
  muted:    'rgba(255,255,255,0.45)',
  divider:  'rgba(255,255,255,0.06)',
} as const;

// ─── Rank helpers ─────────────────────────────────────────────────────────────
// BE không trả màu theo hạng — chỉ dùng bảng màu này để tô viền/badge cho đẹp mắt,
// mọi dữ liệu khác (tên hạng, ngưỡng chi tiêu, % giảm giá, điểm thưởng) lấy thật từ API
// (giống web `TabRank` trong Profile.jsx), không còn hardcode.
const RANK_COLORS = ['#CD7F32', '#9E9E9E', '#FFD700', '#B0C4DE', '#7b1fa2', '#e91e8c'];
const FALLBACK_COLOR = '#9E9E9E';

/** Khớp logic web: hạng hiện tại = hạng có minSpending lớn nhất mà tổng chi tiêu vẫn >= nó. */
function findCurrentRankIndex(ranks: MembershipRank[], totalSpending: number) {
  let idx = -1;
  for (let i = 0; i < ranks.length; i++) {
    if (totalSpending >= Number(ranks[i].minSpending ?? 0)) idx = i;
  }
  return idx;
}

function calcProgress(spending: number, current: MembershipRank | null, next: MembershipRank | null) {
  if (!next) return 100;
  const curMin  = Number(current?.minSpending ?? 0);
  const nextMin = Number(next.minSpending ?? 0);
  if (nextMin <= curMin) return 0;
  return Math.min(100, Math.max(0, ((spending - curMin) / (nextMin - curMin)) * 100));
}

function fmtMoney(v: number) {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}tr`;
  if (v >= 1_000)     return `${Math.round(v / 1_000)}k`;
  return `${v}`;
}

function getInitials(name?: string) {
  return String(name || '?')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(-2)
    .map(w => w[0])
    .join('')
    .toUpperCase() || '?';
}

// ─── Types ────────────────────────────────────────────────────────────────────
type MenuItem = {
  icon: string;
  title: string;
  accent: string;
  route?: string;
  action?: () => void;
  badge?: string;
};

// ─── Component ───────────────────────────────────────────────────────────────
export default function ProfileScreen() {
  const router = useRouter();
  const { session, logout, refreshUser } = useAuth();
  const { tickets }                      = useTickets();

  const [ranks, setRanks] = useState<MembershipRank[]>([]);

  useFocusEffect(useCallback(() => {
    refreshUser();
    meService.getMembershipRanks().then(setRanks).catch(() => {});
  }, []));
  const user = session?.user;

  const avatarUrl     = user?.avatar?.trim() || '';
  const totalSpending = user?.totalSpending ?? 0;
  const rankIdx       = findCurrentRankIndex(ranks, totalSpending);
  const currentRank   = rankIdx >= 0 ? ranks[rankIdx] : null;
  const nextRank      = rankIdx >= 0 && rankIdx < ranks.length - 1 ? ranks[rankIdx + 1] : (ranks.length && rankIdx < 0 ? ranks[0] : null);
  const rankColor     = RANK_COLORS[Math.max(0, rankIdx) % RANK_COLORS.length] || FALLBACK_COLOR;
  const rankLabel     = user?.rankName || currentRank?.rankName || '—';
  const rankProgress  = calcProgress(totalSpending, currentRank, nextRank);
  const spendToNext   = nextRank ? Math.max(0, Number(nextRank.minSpending ?? 0) - totalSpending) : 0;
  const usedCount     = tickets.filter(t => t.status === 'used').length;

  const menuSections: { title: string; items: MenuItem[] }[] = [
    {
      title: 'Tài khoản',
      items: [
        { icon: 'person.fill',        title: 'Thông tin cá nhân',       accent: C.purple, route: '/user/edit-profile'        },
        { icon: 'lock.fill',          title: 'Bảo mật & Mật khẩu',      accent: '#007AFF', route: '/user/security'           },
        { icon: 'ticket.fill',        title: 'Lịch sử đặt vé',          accent: C.pink,   route: '/user/(tabs)/tickets' },
        { icon: 'heart.fill',         title: 'Phim yêu thích',          accent: '#FF3B30', route: '/user/favorites'          },
        { icon: 'gift.fill',          title: 'Voucher của tôi',          accent: '#AF52DE', route: '/user/vouchers'           },
        { icon: 'star.fill',          title: 'Lịch sử điểm thưởng',    accent: C.yellow,  route: '/user/points-history'     },
      ],
    },
    {
      title: 'Khám phá',
      items: [
        { icon: 'popcorn.fill',            title: 'Đặt bắp nước',        accent: '#FF9500', route: '/user/food-order' },
        { icon: 'mappin.and.ellipse',      title: 'Hệ thống rạp',        accent: '#34C759', route: '/user/cinemas'   },
        { icon: 'newspaper.fill',          title: 'Tin tức & Sự kiện',   accent: C.purple,  route: '/user/news'      },
        { icon: 'questionmark.circle.fill',title: 'Trợ giúp & Hỗ trợ',  accent: '#8E8E93',
          action: () => Alert.alert('Hỗ trợ khách hàng', 'Email: support@cinema.com\nHotline: 1900 1234') },
      ],
    },
  ];

  const handlePress = (item: MenuItem) => {
    if (item.route)  router.push(item.route as Href);
    else if (item.action) item.action();
  };

  const handleLogout = () => {
    Alert.alert('Đăng xuất', 'Bạn có chắc chắn muốn đăng xuất không?', [
      { text: 'Hủy', style: 'cancel' },
      { text: 'Đăng xuất', style: 'destructive',
        onPress: () => { logout(); router.replace('/(auth)/login' as Href); } },
    ]);
  };

  const [deletingAccount, setDeletingAccount] = useState(false);

  const handleDeleteAccount = () => {
    Alert.alert(
      'Xóa tài khoản',
      'Thông tin đăng ký (tên, email, số điện thoại, ảnh đại diện, ngày sinh, mật khẩu) sẽ bị xóa và bạn sẽ bị đăng xuất ngay lập tức. Lịch sử vé/đơn hàng vẫn được lưu lại. Hành động này không thể hoàn tác. Bạn có chắc chắn muốn tiếp tục?',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa tài khoản', style: 'destructive',
          onPress: async () => {
            setDeletingAccount(true);
            try {
              await meService.deleteAccount();
              logout();
              router.replace('/(auth)/login' as Href);
            } catch (error: any) {
              Alert.alert('Không xóa được tài khoản', error?.message || 'Vui lòng thử lại sau.');
            } finally {
              setDeletingAccount(false);
            }
          },
        },
      ],
    );
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.pageHeader}>
        <Text style={styles.pageHeaderTitle}>Hồ sơ</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* ── Hero Card ── */}
        <View style={styles.heroCard}>
          {/* Gradient stripe (purple → pink using two halves) */}
          <View style={styles.stripeRow}>
            <View style={[styles.stripeHalf, { backgroundColor: C.purple }]} />
            <View style={[styles.stripeHalf, { backgroundColor: C.pink }]} />
          </View>

          <View style={styles.heroBody}>
            <Pressable onPress={() => router.push('/user/edit-profile' as Href)} style={styles.avatarWrap}>
              {avatarUrl ? (
                <Image source={{ uri: avatarUrl }} style={[styles.avatar, { borderColor: rankColor }]} />
              ) : (
                <View style={[styles.avatar, styles.avatarFallback, { borderColor: rankColor }]}>
                  <Text style={styles.avatarInitials}>{getInitials(user?.fullname)}</Text>
                </View>
              )}
              <View style={[styles.cameraBtn, { backgroundColor: rankColor }]}>
                <IconSymbol name="camera.fill" size={9} color="#fff" />
              </View>
            </Pressable>

            <View style={styles.heroInfo}>
              <Text style={styles.heroName} numberOfLines={1}>
                {user?.fullname || 'Khách hàng'}
              </Text>
              <Text style={styles.heroEmail} numberOfLines={1}>
                {user?.email || user?.phone || ''}
              </Text>
              <View style={[styles.rankBadge, { borderColor: rankColor + '80' }]}>
                <View style={[styles.rankDot, { backgroundColor: rankColor }]} />
                <Text style={[styles.rankBadgeText, { color: rankColor }]}>Hạng {rankLabel}</Text>
              </View>
            </View>

            <Pressable onPress={() => router.push('/user/edit-profile' as Href)} style={styles.editBtn}>
              <IconSymbol name="pencil" size={15} color={C.purple} />
            </Pressable>
          </View>
        </View>

        {/* ── Stats Grid (2 thẻ/hàng) ── */}
        <View style={styles.statsRow}>
          {(() => {
            const items = [
              { label: 'Vé đã đặt',   value: String(tickets.length), icon: 'ticket.fill',    color: C.pink   },
              { label: 'Đã xem',       value: String(usedCount),       icon: 'film.fill',      color: C.purple },
              { label: 'Điểm thưởng', value: String(user?.points ?? 0), icon: 'star.fill',    color: C.yellow },
              { label: 'Chi tiêu',     value: fmtMoney(totalSpending),  icon: 'banknote.fill', color: '#34C759'},
            ] as const;
            const pairs = [items.slice(0, 2), items.slice(2, 4)];
            return pairs.map((pair, rowIdx) => (
              <View key={rowIdx} style={styles.statPairRow}>
                {pair.map((s, i) => (
                  <View key={i} style={styles.statCard}>
                    <View style={[styles.statIconWrap, { backgroundColor: s.color + '22' }]}>
                      <IconSymbol name={s.icon as any} size={17} color={s.color} />
                    </View>
                    <Text style={styles.statValue}>{s.value}</Text>
                    <Text style={styles.statLabel}>{s.label}</Text>
                  </View>
                ))}
              </View>
            ));
          })()}
        </View>

        {/* ── Rank Progress ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Hạng thành viên</Text>
          <View style={styles.rankCard}>
            <View style={styles.rankHeader}>
              <View style={[styles.rankIconWrap, { backgroundColor: rankColor + '22' }]}>
                <IconSymbol name="medal.fill" size={26} color={rankColor} />
              </View>
              <View style={styles.rankHeaderText}>
                <Text style={[styles.rankTitle, { color: rankColor }]}>Hạng {rankLabel}</Text>
                <Text style={styles.rankSub}>
                  {nextRank
                    ? `Còn ${fmtMoney(spendToNext)}đ để lên hạng ${nextRank.rankName}`
                    : ranks.length ? 'Bạn đã đạt hạng cao nhất!' : ''}
                </Text>
              </View>
            </View>

            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${rankProgress}%` as any, backgroundColor: rankColor }]} />
            </View>
            <View style={styles.progressLabelRow}>
              <Text style={styles.progressLabel}>{rankLabel}</Text>
              {nextRank && <Text style={styles.progressLabel}>{nextRank.rankName}</Text>}
            </View>

            <View style={styles.ranksRow}>
              {ranks.map((r, i) => {
                const c = RANK_COLORS[i % RANK_COLORS.length] || FALLBACK_COLOR;
                return (
                  <View key={r.id ?? i} style={styles.rankStep}>
                    <View style={[styles.rankStepDot, {
                      backgroundColor: rankIdx >= i ? c : c + '22',
                      borderColor: c,
                    }]}>
                      <IconSymbol name="star.fill" size={12} color={rankIdx >= i ? '#fff' : c + '80'} />
                    </View>
                    <Text style={[styles.rankStepLabel, { color: rankIdx >= i ? c : C.muted }]}>
                      {r.rankName}
                    </Text>
                  </View>
                );
              })}
            </View>

            {currentRank && (
              <View style={styles.benefitRow}>
                {currentRank.discountPercent > 0 && (
                  <View style={styles.benefit}>
                    <IconSymbol name="percent" size={13} color={rankColor} />
                    <Text style={styles.benefitText}>Giảm {currentRank.discountPercent}% mỗi vé</Text>
                  </View>
                )}
                {currentRank.bonusPoint != null && (
                  <View style={styles.benefit}>
                    <IconSymbol name="star.circle.fill" size={13} color={rankColor} />
                    <Text style={styles.benefitText}>+{currentRank.bonusPoint} điểm thưởng</Text>
                  </View>
                )}
              </View>
            )}
          </View>
        </View>

        {/* ── Menu Sections ── */}
        {menuSections.map((sec, sIdx) => (
          <View key={sIdx} style={styles.section}>
            <Text style={styles.sectionTitle}>{sec.title}</Text>
            <View style={styles.menuCard}>
              {sec.items.map((item, iIdx) => (
                <Pressable
                  key={iIdx}
                  style={({ pressed }) => [
                    styles.menuRow,
                    iIdx < sec.items.length - 1 && styles.menuRowBorder,
                    pressed && { backgroundColor: 'rgba(255,255,255,0.04)' },
                  ]}
                  onPress={() => handlePress(item)}
                >
                  <View style={styles.menuLeft}>
                    <View style={[styles.menuIconWrap, { backgroundColor: item.accent + '22' }]}>
                      <IconSymbol name={item.icon as any} size={18} color={item.accent} />
                    </View>
                    <Text style={styles.menuTitle}>{item.title}</Text>
                  </View>
                  <View style={styles.menuRight}>
                    {item.badge && (
                      <View style={styles.badgePill}>
                        <Text style={styles.badgeText}>{item.badge}</Text>
                      </View>
                    )}
                    <IconSymbol name="chevron.right" size={13} color="rgba(255,255,255,0.25)" />
                  </View>
                </Pressable>
              ))}
            </View>
          </View>
        ))}

        {/* ── Logout ── */}
        <Pressable
          style={({ pressed }) => [styles.logoutBtn, pressed && { opacity: 0.7 }]}
          onPress={handleLogout}
        >
          <IconSymbol name="rectangle.portrait.and.arrow.right" size={18} color="#FF3B30" />
          <Text style={styles.logoutText}>Đăng xuất</Text>
        </Pressable>

        {/* ── Delete account ── */}
        <Pressable
          style={({ pressed }) => [styles.deleteAccountBtn, (pressed || deletingAccount) && { opacity: 0.6 }]}
          onPress={handleDeleteAccount}
          disabled={deletingAccount}
        >
          <IconSymbol name="trash.fill" size={16} color="rgba(255,59,48,0.6)" />
          <Text style={styles.deleteAccountText}>
            {deletingAccount ? 'Đang xóa tài khoản...' : 'Xóa tài khoản'}
          </Text>
        </Pressable>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const cardShadow = Platform.select({
  ios:     { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 12 },
  android: { elevation: 8 },
}) ?? {};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: C.bg },
  scroll:   { paddingBottom: 20 },

  // ── Hero ──
  heroCard: {
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 10,
    borderRadius: 22,
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.border,
    overflow: 'hidden',
    ...cardShadow,
  },
  stripeRow:  { flexDirection: 'row', height: 5 },
  stripeHalf: { flex: 1 },
  heroBody:   { flexDirection: 'row', alignItems: 'center', padding: 18 },
  avatarWrap: { position: 'relative', marginRight: 14 },
  avatar:     { width: 74, height: 74, borderRadius: 37, borderWidth: 3 },
  cameraBtn:  {
    position: 'absolute', bottom: 0, right: 0,
    width: 22, height: 22, borderRadius: 11,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: C.card,
  },
  avatarFallback: {
    backgroundColor: C.purple,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios:     { shadowColor: C.pink, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.6, shadowRadius: 14 },
      android: { elevation: 10 },
    }),
  },
  avatarInitials: {
    color: '#fff',
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: 2,
  },
  heroInfo:  { flex: 1 },
  heroName:  { fontSize: 17, fontWeight: '700', color: C.text, marginBottom: 3 },
  heroEmail: { fontSize: 12, color: C.muted, marginBottom: 8 },
  rankBadge: {
    flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start',
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 10, borderWidth: 1,
  },
  rankDot:      { width: 6, height: 6, borderRadius: 3, marginRight: 5 },
  rankBadgeText:{ fontSize: 11, fontWeight: '700' },
  editBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: C.purple + '22',
    justifyContent: 'center', alignItems: 'center',
  },

  // ── Stats ──
  statsRow: { paddingHorizontal: 12, marginBottom: 6, gap: 10 },
  statPairRow: { flexDirection: 'row', gap: 10 },
  statCard: {
    flex: 1,
    padding: 14, borderRadius: 18,
    backgroundColor: C.card,
    borderWidth: 1, borderColor: C.border,
    alignItems: 'flex-start',
    ...cardShadow,
  },
  statIconWrap: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  statValue:    { fontSize: 20, fontWeight: '800', color: C.text, marginBottom: 2 },
  statLabel:    { fontSize: 11, color: C.muted },

  // ── Sections ──
  section:      { paddingHorizontal: 16, marginBottom: 14 },
  sectionTitle: {
    fontSize: 11, fontWeight: '700', textTransform: 'uppercase',
    letterSpacing: 0.9, color: C.muted,
    marginBottom: 8, marginLeft: 4,
  },

  // ── Rank Card ──
  rankCard: {
    borderRadius: 20, padding: 18,
    backgroundColor: C.card,
    borderWidth: 1, borderColor: C.border,
    ...cardShadow,
  },
  rankHeader:     { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  rankIconWrap:   { width: 52, height: 52, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  rankHeaderText: { flex: 1 },
  rankTitle:      { fontSize: 17, fontWeight: '700', marginBottom: 3 },
  rankSub:        { fontSize: 12, color: C.muted },
  progressTrack:  { height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.08)', overflow: 'hidden', marginBottom: 6 },
  progressFill:   { height: 8, borderRadius: 4 },
  progressLabelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  progressLabel:    { fontSize: 10, color: C.muted },
  ranksRow:  { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  rankStep:  { alignItems: 'center' },
  rankStepDot: {
    width: 36, height: 36, borderRadius: 18, borderWidth: 2,
    justifyContent: 'center', alignItems: 'center', marginBottom: 5,
  },
  rankStepLabel: { fontSize: 10, fontWeight: '600' },
  benefitRow: {
    flexDirection: 'row', justifyContent: 'space-around',
    paddingTop: 14,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.divider,
  },
  benefit:     { flexDirection: 'row', alignItems: 'center' },
  benefitText: { fontSize: 12, color: C.muted, marginLeft: 5 },

  // ── Menu ──
  menuCard: {
    borderRadius: 20, overflow: 'hidden',
    backgroundColor: C.card,
    borderWidth: 1, borderColor: C.border,
    ...cardShadow,
  },
  menuRow:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14 },
  menuRowBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.divider },
  menuLeft:      { flexDirection: 'row', alignItems: 'center' },
  menuIconWrap:  { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  menuTitle:     { fontSize: 15, fontWeight: '500', color: C.text },
  menuRight:     { flexDirection: 'row', alignItems: 'center' },
  badgePill:     { backgroundColor: '#FF3B30', borderRadius: 10, paddingHorizontal: 7, paddingVertical: 2, marginRight: 8 },
  badgeText:     { color: '#fff', fontSize: 11, fontWeight: '700' },

  // ── Logout ──
  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    marginHorizontal: 16, marginTop: 8, paddingVertical: 15,
    borderRadius: 18, backgroundColor: '#FF3B3015',
    borderWidth: 1, borderColor: '#FF3B3030',
  },
  logoutText: { color: '#FF3B30', fontSize: 16, fontWeight: '700', marginLeft: 8 },

  // ── Delete account ──
  deleteAccountBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    marginHorizontal: 16, marginTop: 10, paddingVertical: 10,
  },
  deleteAccountText: { color: 'rgba(255,59,48,0.6)', fontSize: 13, fontWeight: '600', marginLeft: 6 },

  bottomSpacer: { height: 16 },

  // ── Page Header ──
  pageHeader: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  pageHeaderTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: C.yellow,
    textAlign: 'center',
  },
});
