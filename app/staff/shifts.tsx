import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { staffService, StaffShift } from '@/services/staffService';
import { useAuth } from '@/context/AuthContext';

const NAVY     = '#0d0d2b';
const CARD_BG  = '#14143a';
const PURPLE   = '#8b00ff';
const YELLOW   = '#d4ff00';
const GREEN    = '#00c853';
const PINK     = '#ff2d78';
const OFF_WHITE = '#f0f0ff';
const MUTED    = 'rgba(240,240,255,0.5)';
const BORDER   = 'rgba(255,255,255,0.10)';

function formatDate(dateStr?: string) {
  if (!dateStr) return '--';
  const [y, m, d] = dateStr.split('-');
  return `${d}/${m}/${y}`;
}

function ShiftCard({ shift }: { shift: StaffShift }) {
  const isActive   = shift.status === 'Đang làm';
  const isUpcoming = shift.status === 'Sắp tới';

  const statusColor  = isActive ? GREEN : isUpcoming ? YELLOW : MUTED;
  const cardBorderColor = isActive ? 'rgba(0,200,83,0.35)' : BORDER;

  return (
    <View style={[styles.card, { borderColor: cardBorderColor }]}>
      {isActive && <View style={styles.activeStrip} />}

      <View style={styles.cardRow}>
        {/* Cột trái: ngày + loại ca */}
        <View style={styles.dateCol}>
          <Text style={styles.dateText}>{formatDate(shift.date)}</Text>
          <Text style={styles.shiftTypeText}>{shift.shiftType ?? ''}</Text>
        </View>

        {/* Cột giữa: giờ + vai trò */}
        <View style={styles.infoCol}>
          <Text style={styles.timeText}>
            {shift.startTime ?? '--'} – {shift.endTime ?? '--'}
          </Text>
          <View style={[styles.roleBadge, isActive && styles.roleBadgeActive]}>
            <Text style={[styles.roleText, isActive && styles.roleTextActive]}>
              {shift.role ?? ''}
            </Text>
          </View>
        </View>

        {/* Cột phải: status */}
        <View style={styles.statusCol}>
          <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
          <Text style={[styles.statusText, { color: statusColor }]}>
            {shift.status ?? ''}
          </Text>
        </View>
      </View>
    </View>
  );
}

export default function ShiftsScreen() {
  const { session } = useAuth();
  const [shifts, setShifts]           = useState<StaffShift[]>([]);
  const [activeShift, setActiveShift] = useState<StaffShift | null>(null);
  const [loading, setLoading]         = useState(true);
  const [refreshing, setRefreshing]   = useState(false);
  const [error, setError]             = useState('');

  const loadData = useCallback(async () => {
    try {
      const [myShifts, active] = await Promise.all([
        staffService.getMyShifts().catch(() => [] as StaffShift[]),
        staffService.getActiveShift().catch(() => null),
      ]);
      setShifts(myShifts);
      setActiveShift(active);
      setError('');
    } catch {
      setError('Không thể tải lịch làm. Vui lòng kéo xuống để thử lại.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const upcoming = shifts
    .filter((s) => s.status === 'Đang làm' || s.status === 'Sắp tới')
    .sort((a, b) => (a.rawStartTime ?? '').localeCompare(b.rawStartTime ?? ''));

  const past = shifts
    .filter((s) => s.status === 'Đã xong')
    .sort((a, b) => (b.rawStartTime ?? '').localeCompare(a.rawStartTime ?? ''));

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={YELLOW} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Lịch Làm Của Tôi</Text>
        {!!session?.staff?.cinemaName && (
          <Text style={styles.headerSub}>{session.staff.cinemaName}</Text>
        )}
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={YELLOW} />
        }
      >
        {/* Banner trạng thái ca */}
        <View style={[styles.banner, activeShift ? styles.bannerActive : styles.bannerInactive]}>
          <Ionicons
            name={activeShift ? 'checkmark-circle' : 'time-outline'}
            size={20}
            color={activeShift ? GREEN : YELLOW}
          />
          <Text style={[styles.bannerText, { color: activeShift ? GREEN : YELLOW }]}>
            {activeShift
              ? `Đang trong ca · ${activeShift.startTime} – ${activeShift.endTime}`
              : 'Ngoài giờ làm việc · Chỉ xem được lịch làm'}
          </Text>
        </View>

        {/* Lỗi */}
        {!!error && (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle-outline" size={16} color={PINK} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Ca hôm nay & sắp tới */}
        {upcoming.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Ca hôm nay & sắp tới</Text>
            {upcoming.map((s) => <ShiftCard key={s.id} shift={s} />)}
          </>
        )}

        {/* Lịch sử ca */}
        {past.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Lịch sử ca</Text>
            {past.map((s) => <ShiftCard key={s.id} shift={s} />)}
          </>
        )}

        {/* Trống */}
        {shifts.length === 0 && !error && (
          <View style={styles.emptyBox}>
            <Ionicons name="calendar-outline" size={48} color={MUTED} />
            <Text style={styles.emptyText}>Chưa có ca làm nào được phân công</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: NAVY,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: NAVY,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: OFF_WHITE,
  },
  headerSub: {
    fontSize: 13,
    color: MUTED,
    marginTop: 2,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginTop: 16,
    marginBottom: 4,
    borderWidth: 1,
  },
  bannerActive: {
    backgroundColor: 'rgba(0,200,83,0.08)',
    borderColor: 'rgba(0,200,83,0.3)',
  },
  bannerInactive: {
    backgroundColor: 'rgba(212,255,0,0.06)',
    borderColor: 'rgba(212,255,0,0.25)',
  },
  bannerText: {
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
    lineHeight: 18,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,45,120,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,45,120,0.3)',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginTop: 12,
  },
  errorText: {
    fontSize: 13,
    color: PINK,
    flex: 1,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: MUTED,
    marginTop: 20,
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  card: {
    backgroundColor: CARD_BG,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 10,
    overflow: 'hidden',
  },
  activeStrip: {
    height: 3,
    backgroundColor: GREEN,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 12,
  },
  dateCol: {
    width: 72,
    alignItems: 'center',
  },
  dateText: {
    fontSize: 13,
    fontWeight: '700',
    color: OFF_WHITE,
  },
  shiftTypeText: {
    fontSize: 11,
    color: MUTED,
    marginTop: 2,
  },
  infoCol: {
    flex: 1,
    gap: 6,
  },
  timeText: {
    fontSize: 15,
    fontWeight: '700',
    color: OFF_WHITE,
  },
  roleBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(139,0,255,0.2)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  roleBadgeActive: {
    backgroundColor: 'rgba(0,200,83,0.15)',
  },
  roleText: {
    fontSize: 11,
    fontWeight: '700',
    color: PURPLE,
  },
  roleTextActive: {
    color: GREEN,
  },
  statusCol: {
    alignItems: 'center',
    gap: 4,
    width: 52,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
    textAlign: 'center',
  },
  emptyBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 12,
  },
  emptyText: {
    fontSize: 14,
    color: MUTED,
    textAlign: 'center',
  },
});
