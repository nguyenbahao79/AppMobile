import React from 'react';
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
import { useRouter, Href } from 'expo-router';
import { IconSymbol } from '@/components/base/icon-symbol';
import { useAuth } from '@/context/AuthContext';
import { useTickets } from '@/context/TicketContext';

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

// ─── Rank config ──────────────────────────────────────────────────────────────
const RANKS = [
  { label: 'Đồng',     color: '#CD7F32', minSpend: 0,         maxSpend: 500_000   },
  { label: 'Bạc',      color: '#9E9E9E', minSpend: 500_000,   maxSpend: 2_000_000 },
  { label: 'Vàng',     color: '#FFD700', minSpend: 2_000_000, maxSpend: 5_000_000 },
  { label: 'Bạch Kim', color: '#B0C4DE', minSpend: 5_000_000, maxSpend: null      },
];

function detectRank(name?: string) {
  const n = (name ?? '').toLowerCase();
  if (n.includes('platinum') || n.includes('bạch')) return RANKS[3];
  if (n.includes('gold')     || n.includes('vàng')) return RANKS[2];
  if (n.includes('silver')   || n.includes('bạc'))  return RANKS[1];
  return RANKS[0];
}

function calcProgress(spending: number, rank: typeof RANKS[0]) {
  if (!rank.maxSpend) return 100;
  return Math.min(100, Math.max(0, ((spending - rank.minSpend) / (rank.maxSpend - rank.minSpend)) * 100));
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
  const { session, logout } = useAuth();
  const { tickets }         = useTickets();
  const user = session?.user;

  const avatarUrl     = user?.avatar?.trim() || '';
  const rankName      = user?.rankName || user?.membershipRankName || '';
  const rank          = detectRank(rankName);
  const rankIdx       = RANKS.indexOf(rank);
  const nextRank      = rankIdx < RANKS.length - 1 ? RANKS[rankIdx + 1] : null;
  const totalSpending = user?.totalSpending ?? 0;
  const rankProgress  = calcProgress(totalSpending, rank);
  const spendToNext   = nextRank ? Math.max(0, nextRank.minSpend - totalSpending) : 0;
  const usedCount     = tickets.filter(t => t.status === 'used').length;
  const activeCount   = tickets.filter(t => t.status === 'active').length;

  const menuSections: { title: string; items: MenuItem[] }[] = [
    {
      title: 'Tài khoản',
      items: [
        { icon: 'person.fill',        title: 'Thông tin cá nhân',       accent: C.purple, route: '/user/edit-profile'        },
        { icon: 'lock.fill',          title: 'Bảo mật & Mật khẩu',      accent: '#007AFF', route: '/user/security'           },
        { icon: 'ticket.fill',        title: 'Lịch sử đặt vé',          accent: C.pink,   route: '/user/(tabs)/tickets',
          badge: activeCount > 0 ? String(activeCount) : undefined },
        { icon: 'heart.fill',         title: 'Phim yêu thích',          accent: '#FF3B30', route: '/user/favorites'          },
        { icon: 'gift.fill',          title: 'Voucher của tôi',          accent: '#AF52DE', route: '/user/vouchers'           },
        { icon: 'star.fill',          title: 'Lịch sử điểm thưởng',    accent: C.yellow,  route: '/user/points-history'     },
        { icon: 'creditcard.fill',    title: 'Phương thức thanh toán',  accent: '#FF9500',
          action: () => Alert.alert('Thông báo', 'Chức năng thanh toán sẽ sớm ra mắt.') },
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
                <Image source={{ uri: avatarUrl }} style={[styles.avatar, { borderColor: rank.color }]} />
              ) : (
                <View style={[styles.avatar, styles.avatarFallback, { borderColor: rank.color }]}>
                  <Text style={styles.avatarInitials}>{getInitials(user?.fullname)}</Text>
                </View>
              )}
              <View style={[styles.cameraBtn, { backgroundColor: rank.color }]}>
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
              <View style={[styles.rankBadge, { borderColor: rank.color + '80' }]}>
                <View style={[styles.rankDot, { backgroundColor: rank.color }]} />
                <Text style={[styles.rankBadgeText, { color: rank.color }]}>Hạng {rank.label}</Text>
              </View>
            </View>

            <Pressable onPress={() => router.push('/user/edit-profile' as Href)} style={styles.editBtn}>
              <IconSymbol name="pencil" size={15} color={C.purple} />
            </Pressable>
          </View>
        </View>

        {/* ── Stats Grid ── */}
        <View style={styles.statsRow}>
          {([
            { label: 'Vé đã đặt',   value: String(tickets.length), icon: 'ticket.fill',    color: C.pink   },
            { label: 'Đã xem',       value: String(usedCount),       icon: 'film.fill',      color: C.purple },
            { label: 'Điểm thưởng', value: String(user?.points ?? 0), icon: 'star.fill',    color: C.yellow },
            { label: 'Chi tiêu',     value: fmtMoney(totalSpending),  icon: 'banknote.fill', color: '#34C759'},
          ] as const).map((s, i) => (
            <View key={i} style={styles.statCard}>
              <View style={[styles.statIconWrap, { backgroundColor: s.color + '22' }]}>
                <IconSymbol name={s.icon as any} size={17} color={s.color} />
              </View>
              <Text style={styles.statValue}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* ── Rank Progress ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Hạng thành viên</Text>
          <View style={styles.rankCard}>
            <View style={styles.rankHeader}>
              <View style={[styles.rankIconWrap, { backgroundColor: rank.color + '22' }]}>
                <IconSymbol name="medal.fill" size={26} color={rank.color} />
              </View>
              <View style={styles.rankHeaderText}>
                <Text style={[styles.rankTitle, { color: rank.color }]}>Hạng {rank.label}</Text>
                <Text style={styles.rankSub}>
                  {nextRank
                    ? `Còn ${fmtMoney(spendToNext)}đ để lên hạng ${nextRank.label}`
                    : 'Bạn đã đạt hạng cao nhất!'}
                </Text>
              </View>
            </View>

            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${rankProgress}%` as any, backgroundColor: rank.color }]} />
            </View>
            <View style={styles.progressLabelRow}>
              <Text style={styles.progressLabel}>{rank.label}</Text>
              {nextRank && <Text style={styles.progressLabel}>{nextRank.label}</Text>}
            </View>

            <View style={styles.ranksRow}>
              {RANKS.map((r, i) => (
                <View key={i} style={styles.rankStep}>
                  <View style={[styles.rankStepDot, {
                    backgroundColor: rankIdx >= i ? r.color : r.color + '22',
                    borderColor: r.color,
                  }]}>
                    <IconSymbol name="star.fill" size={12} color={rankIdx >= i ? '#fff' : r.color + '80'} />
                  </View>
                  <Text style={[styles.rankStepLabel, { color: rankIdx >= i ? r.color : C.muted }]}>
                    {r.label}
                  </Text>
                </View>
              ))}
            </View>

            <View style={styles.benefitRow}>
              <View style={styles.benefit}>
                <IconSymbol name="percent" size={13} color={rank.color} />
                <Text style={styles.benefitText}>Giảm {rankIdx * 5 + 5}% mỗi vé</Text>
              </View>
              <View style={styles.benefit}>
                <IconSymbol name="star.circle.fill" size={13} color={rank.color} />
                <Text style={styles.benefitText}>x{(rankIdx + 1).toFixed(1)} điểm thưởng</Text>
              </View>
            </View>
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
  statsRow: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12, marginBottom: 6 },
  statCard: {
    width: '47%', margin: '1.5%',
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
