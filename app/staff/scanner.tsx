import React, { useState } from 'react';
import {
  StyleSheet, Text, View, TouchableOpacity, ScrollView, ActivityIndicator, Alert,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { apiClient } from '@/api/client';
import { API_ENDPOINTS } from '@/api/config';
import { useAuth } from '@/context/AuthContext';

const NAVY   = '#0d0d2b';
const CARD   = '#14143a';
const PURPLE = '#8b00ff';
const PINK   = '#ff2d78';
const YELLOW = '#d4ff00';
const WHITE  = '#f0f0ff';
const MUTED  = 'rgba(240,240,255,0.5)';
const BORDER = 'rgba(255,255,255,0.1)';
const GREEN  = '#00d68f';

const FRAME_SIZE   = 250;
const CORNER_SIZE  = 32;
const CORNER_THICK = 4;

type TicketInfo = {
  movieTitle?: string;
  showtime?: string;
  roomName?: string;
  seatNumber?: string;
  seatTypeName?: string;
};
type FoodInfo = { productName?: string; quantity?: number };
type ScannedOrder = {
  qrToken: string;
  orderCode: string;
  customerName?: string;
  status?: number;
  finalAmount?: number;
  tickets?: TicketInfo[];
  foods?: FoodInfo[];
  checkedIn?: boolean;
  checkedInAt?: string;
};

type Phase =
  | { name: 'idle' }
  | { name: 'scanning' }
  | { name: 'success'; data: ScannedOrder }
  | { name: 'error'; message: string };

/* ── Info row helper ── */
function InfoRow({ label, value }: { label: string; value?: string | number | null }) {
  if (value == null || value === '') return null;
  return (
    <View style={ir.row}>
      <Text style={ir.label}>{label}</Text>
      <Text style={ir.value}>{String(value)}</Text>
    </View>
  );
}
const ir = StyleSheet.create({
  row: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: BORDER,
  },
  label: { fontSize: 12, fontWeight: '600', color: MUTED },
  value: { fontSize: 14, fontWeight: '700', color: WHITE, maxWidth: '60%', textAlign: 'right' },
});

/* ════════════════════ MAIN ════════════════════ */
export default function QRScannerScreen() {
  const { session } = useAuth();
  const [permission, requestPermission] = useCameraPermissions();
  const [phase, setPhase] = useState<Phase>({ name: 'idle' });
  const [scanned, setScanned] = useState(false);
  const [checkingIn, setCheckingIn] = useState(false);

  const staffName   = session?.staff?.fullname  || 'Nhân viên';
  const cinemaName  = session?.staff?.cinemaName || '';

  const startScan = () => {
    setScanned(false);
    setPhase({ name: 'scanning' });
  };

  const reset = () => {
    setScanned(false);
    setPhase({ name: 'idle' });
  };

  const handleBarcodeScanned = async ({ data }: { data: string }) => {
    if (scanned) return;
    setScanned(true);
    try {
      const qrToken = data.trim();
      const response = await apiClient.post(API_ENDPOINTS.VERIFY_TICKET, { qrToken });
      const r = (response ?? {}) as Record<string, any>;
      setPhase({
        name: 'success',
        data: {
          qrToken,
          orderCode: String(r.orderCode || r.ticketCode || '—'),
          customerName: r.customerName,
          status: r.status,
          finalAmount: r.finalAmount,
          tickets: [{
            movieTitle: r.movieTitle,
            showtime: r.showtime,
            roomName: r.roomName,
            seatNumber: r.seatNumber,
            seatTypeName: r.seatTypeName,
          }],
          foods: Array.isArray(r.foods) ? r.foods : [],
          checkedIn: Boolean(r.checkedIn),
          checkedInAt: r.checkedInAt,
        },
      });
    } catch (error: any) {
      setPhase({ name: 'error', message: error.message || 'Không tìm thấy thông tin vé này.' });
    }
  };

  const confirmCheckIn = async () => {
    if (phase.name !== 'success' || checkingIn) return;
    const { qrToken } = phase.data;
    setCheckingIn(true);
    try {
      const response = await apiClient.post(API_ENDPOINTS.CHECK_IN_TICKET, { qrToken });
      const r = (response ?? {}) as Record<string, any>;
      setPhase((prev) =>
        prev.name === 'success'
          ? { name: 'success', data: { ...prev.data, checkedIn: true, checkedInAt: r.checkedInAt } }
          : prev
      );
    } catch (error: any) {
      Alert.alert('Không xác nhận được', error.message || 'Vui lòng thử lại.');
    } finally {
      setCheckingIn(false);
    }
  };

  /* ── Camera permission loading ── */
  if (!permission) {
    return (
      <SafeAreaView style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.center}>
          <ActivityIndicator size="large" color={YELLOW} />
        </View>
      </SafeAreaView>
    );
  }

  /* ── Camera not granted ── */
  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.topBar}>
          <View style={styles.topBadge}>
            <Ionicons name="shield-checkmark" size={13} color={YELLOW} />
            <Text style={styles.topBadgeText}>NHÂN VIÊN SOÁT VÉ</Text>
          </View>
          <Text style={styles.staffNameText}>{staffName}</Text>
        </View>
        <View style={styles.center}>
          <Ionicons name="camera-outline" size={60} color={MUTED} />
          <Text style={styles.permText}>Ứng dụng cần quyền camera để quét mã QR vé</Text>
          <TouchableOpacity style={styles.primaryBtn} onPress={requestPermission}>
            <Ionicons name="camera" size={16} color="#fff" />
            <Text style={styles.primaryBtnText}>Cho phép camera</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  /* ════ PHASE: SCANNING ════ */
  if (phase.name === 'scanning') {
    return (
      <View style={{ flex: 1, backgroundColor: NAVY }}>
        <Stack.Screen options={{ headerShown: false }} />
        <CameraView
          style={StyleSheet.absoluteFillObject}
          onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
          barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        >
          <SafeAreaView style={{ flex: 1 }}>
            {/* Top bar */}
            <View style={styles.topBar}>
              <View style={styles.topBadge}>
                <Ionicons name="shield-checkmark" size={13} color={YELLOW} />
                <Text style={styles.topBadgeText}>ĐANG QUÉT</Text>
              </View>
              <TouchableOpacity style={styles.cancelBtn} onPress={reset}>
                <Ionicons name="close" size={16} color={WHITE} />
                <Text style={styles.cancelBtnText}>Huỷ</Text>
              </TouchableOpacity>
            </View>

            {/* QR frame */}
            <View style={styles.frameWrap}>
              <View style={styles.darkBand} />
              <View style={styles.frameRow}>
                <View style={styles.darkBand} />
                <View style={styles.frameBox}>
                  <View style={[styles.corner, styles.cTL]} />
                  <View style={[styles.corner, styles.cTR]} />
                  <View style={[styles.corner, styles.cBL]} />
                  <View style={[styles.corner, styles.cBR]} />
                  {scanned && <ActivityIndicator size="large" color={YELLOW} />}
                </View>
                <View style={styles.darkBand} />
              </View>
              <View style={[styles.darkBand, { justifyContent: 'center', alignItems: 'center' }]}>
                <View style={styles.hintRow}>
                  <Ionicons name="scan-outline" size={16} color={YELLOW} />
                  <Text style={styles.hintText}>Đưa mã QR vé vào khung quét</Text>
                </View>
              </View>
            </View>
          </SafeAreaView>
        </CameraView>
      </View>
    );
  }

  /* ════ PHASE: IDLE ════ */
  if (phase.name === 'idle') {
    return (
      <SafeAreaView style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />

        {/* Top bar */}
        <View style={styles.topBar}>
          <View style={styles.topBadge}>
            <Ionicons name="shield-checkmark" size={13} color={YELLOW} />
            <Text style={styles.topBadgeText}>NHÂN VIÊN SOÁT VÉ</Text>
          </View>
          <Text style={styles.staffNameText}>{staffName}</Text>
        </View>

        {/* Idle content */}
        <View style={styles.idleContent}>
          {/* Icon */}
          <View style={styles.qrIconWrap}>
            <Ionicons name="qr-code" size={80} color={YELLOW} />
          </View>

          <Text style={styles.idleTitle}>Soát vé bằng mã QR</Text>
          <Text style={styles.idleSub}>
            Nhấn nút bên dưới để mở camera và quét mã QR trên vé của khách hàng.
          </Text>

          {/* Staff info card */}
          <View style={styles.staffCard}>
            <View style={styles.staffCardRow}>
              <Ionicons name="person-circle-outline" size={16} color={MUTED} />
              <Text style={styles.staffCardText}>{staffName}</Text>
            </View>
            {!!cinemaName && (
              <View style={styles.staffCardRow}>
                <Ionicons name="business-outline" size={16} color={MUTED} />
                <Text style={styles.staffCardText}>{cinemaName}</Text>
              </View>
            )}
          </View>

          {/* Start scan button */}
          <TouchableOpacity style={styles.scanBtn} onPress={startScan} activeOpacity={0.85}>
            <Ionicons name="qr-code-outline" size={20} color="#fff" />
            <Text style={styles.scanBtnText}>Bắt đầu quét mã QR</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  /* ════ PHASE: SUCCESS / ERROR ════ */
  const isSuccess   = phase.name === 'success';
  const isPaid      = isSuccess && phase.data.status === 1;
  const isCheckedIn = isSuccess && Boolean(phase.data.checkedIn);
  const validTicket = isSuccess && isPaid;

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Top bar */}
      <View style={styles.topBar}>
        <View style={[styles.topBadge, { backgroundColor: validTicket ? 'rgba(0,214,143,0.12)' : 'rgba(255,45,120,0.12)', borderColor: validTicket ? 'rgba(0,214,143,0.25)' : 'rgba(255,45,120,0.25)' }]}>
          <Ionicons
            name={validTicket ? 'checkmark-circle' : 'close-circle'}
            size={13}
            color={validTicket ? GREEN : PINK}
          />
          <Text style={[styles.topBadgeText, { color: validTicket ? GREEN : PINK }]}>
            {isCheckedIn ? 'ĐÃ VÀO RẠP' : validTicket ? 'VÉ HỢP LỆ' : 'KHÔNG HỢP LỆ'}
          </Text>
        </View>
        <TouchableOpacity style={styles.cancelBtn} onPress={reset}>
          <Ionicons name="close" size={16} color={WHITE} />
          <Text style={styles.cancelBtnText}>Đóng</Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>

        {/* ── Success ── */}
        {isSuccess && (
          <>
            <View style={[styles.resultBadge, { backgroundColor: isCheckedIn ? GREEN : isPaid ? PURPLE : PINK }]}>
              <Ionicons name={isCheckedIn ? 'checkmark-done-circle' : isPaid ? 'checkmark-circle' : 'close-circle'} size={16} color="#fff" />
              <Text style={styles.resultBadgeText}>
                {isCheckedIn ? `ĐÃ VÀO RẠP LÚC ${phase.data.checkedInAt || ''}` : isPaid ? 'ĐÃ THANH TOÁN' : 'CHƯA HOÀN TẤT'}
              </Text>
            </View>

            <Text style={styles.orderCode}>{phase.data.orderCode}</Text>

            {/* Customer info */}
            <View style={styles.infoCard}>
              <View style={styles.cardHead}>
                <Ionicons name="person-outline" size={13} color={PURPLE} />
                <Text style={styles.cardHeadText}>THÔNG TIN ĐƠN</Text>
              </View>
              <InfoRow label="Khách hàng" value={phase.data.customerName} />
              {phase.data.finalAmount != null && (
                <InfoRow label="Tổng tiền" value={phase.data.finalAmount.toLocaleString('vi-VN') + '₫'} />
              )}
            </View>

            {/* Tickets */}
            {(phase.data.tickets ?? []).filter((t) => t.movieTitle).map((t, i) => (
              <View key={i} style={[styles.infoCard, { borderColor: 'rgba(139,0,255,0.25)' }]}>
                <View style={styles.cardHead}>
                  <Ionicons name="film-outline" size={13} color={PURPLE} />
                  <Text style={styles.cardHeadText}>VÉ {i + 1}</Text>
                </View>
                <Text style={styles.movieTitle}>{t.movieTitle}</Text>
                <InfoRow label="Suất chiếu" value={t.showtime} />
                <InfoRow label="Phòng chiếu" value={t.roomName} />
                <InfoRow
                  label="Ghế ngồi"
                  value={t.seatNumber
                    ? t.seatNumber + (t.seatTypeName ? ` (${t.seatTypeName})` : '')
                    : undefined}
                />
              </View>
            ))}

            {/* Foods */}
            {(phase.data.foods ?? []).length > 0 && (
              <View style={[styles.infoCard, { borderColor: 'rgba(212,255,0,0.2)' }]}>
                <View style={styles.cardHead}>
                  <Ionicons name="fast-food-outline" size={13} color={YELLOW} />
                  <Text style={[styles.cardHeadText, { color: YELLOW }]}>BẮP NƯỚC</Text>
                </View>
                {(phase.data.foods ?? []).map((f, i) => (
                  <Text key={i} style={styles.foodItem}>• {f.productName} x{f.quantity}</Text>
                ))}
              </View>
            )}

            {/* Check-in action */}
            {isPaid && !isCheckedIn && (
              <TouchableOpacity
                style={[styles.checkInBtn, checkingIn && { opacity: 0.7 }]}
                onPress={confirmCheckIn}
                activeOpacity={0.85}
                disabled={checkingIn}
              >
                {checkingIn ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Ionicons name="log-in-outline" size={20} color="#fff" />
                    <Text style={styles.checkInBtnText}>Xác nhận vào rạp</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
            {isCheckedIn && (
              <View style={styles.checkedInNote}>
                <Ionicons name="checkmark-done-circle" size={18} color={GREEN} />
                <Text style={styles.checkedInNoteText}>
                  Khách đã được soát vé lúc {phase.data.checkedInAt || '—'}
                </Text>
              </View>
            )}
          </>
        )}

        {/* ── Error ── */}
        {!isSuccess && (
          <View style={styles.errorBlock}>
            <View style={styles.errorIconWrap}>
              <Ionicons name="warning" size={44} color={PINK} />
            </View>
            <Text style={styles.errorTitle}>Không xác thực được</Text>
            <Text style={styles.errorMsg}>{(phase as any).message}</Text>
          </View>
        )}

        {/* Next scan button */}
        <TouchableOpacity style={styles.scanBtn} onPress={startScan} activeOpacity={0.85}>
          <Ionicons name="qr-code-outline" size={18} color="#fff" />
          <Text style={styles.scanBtnText}>Quét vé tiếp theo</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: NAVY },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 36 },

  /* Top bar */
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    backgroundColor: NAVY,
  },
  topBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(212,255,0,0.1)',
    borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5,
    borderWidth: 1, borderColor: 'rgba(212,255,0,0.2)',
  },
  topBadgeText: { fontSize: 10, fontWeight: '800', color: YELLOW, letterSpacing: 1 },
  staffNameText: { fontSize: 13, fontWeight: '700', color: WHITE },
  cancelBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6,
    borderWidth: 1, borderColor: BORDER,
  },
  cancelBtnText: { fontSize: 12, fontWeight: '700', color: WHITE },

  /* Permission */
  permText: {
    color: MUTED, fontSize: 14, textAlign: 'center',
    marginTop: 18, lineHeight: 22, marginBottom: 28,
  },
  primaryBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: PURPLE, borderRadius: 12,
    paddingVertical: 13, paddingHorizontal: 28,
  },
  primaryBtnText: { color: '#fff', fontSize: 15, fontWeight: '800' },

  /* Idle */
  idleContent: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  qrIconWrap: {
    width: 140, height: 140, borderRadius: 70,
    backgroundColor: 'rgba(212,255,0,0.06)',
    borderWidth: 2, borderColor: 'rgba(212,255,0,0.15)',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 28,
  },
  idleTitle: { fontSize: 22, fontWeight: '800', color: WHITE, marginBottom: 12, textAlign: 'center' },
  idleSub: { fontSize: 14, color: MUTED, textAlign: 'center', lineHeight: 22, marginBottom: 28 },
  staffCard: {
    backgroundColor: CARD,
    borderRadius: 12, borderWidth: 1, borderColor: BORDER,
    paddingVertical: 14, paddingHorizontal: 20,
    alignSelf: 'stretch', marginBottom: 28, gap: 8,
  },
  staffCardRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  staffCardText: { fontSize: 13, fontWeight: '600', color: MUTED },
  scanBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    backgroundColor: PURPLE, borderRadius: 14,
    paddingVertical: 15, paddingHorizontal: 32,
    alignSelf: 'stretch',
    shadowColor: PURPLE, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8,
    elevation: 6,
  },
  scanBtnText: { fontSize: 16, fontWeight: '800', color: '#fff' },

  /* Camera QR frame */
  frameWrap: { flex: 1 },
  darkBand: { flex: 1, backgroundColor: 'rgba(0,0,0,0.62)' },
  frameRow: { flexDirection: 'row', height: FRAME_SIZE },
  frameBox: { width: FRAME_SIZE, alignItems: 'center', justifyContent: 'center' },
  corner: { position: 'absolute', width: CORNER_SIZE, height: CORNER_SIZE },
  cTL: { top: 0, left: 0, borderTopWidth: CORNER_THICK, borderLeftWidth: CORNER_THICK, borderColor: YELLOW, borderTopLeftRadius: 4 },
  cTR: { top: 0, right: 0, borderTopWidth: CORNER_THICK, borderRightWidth: CORNER_THICK, borderColor: YELLOW, borderTopRightRadius: 4 },
  cBL: { bottom: 0, left: 0, borderBottomWidth: CORNER_THICK, borderLeftWidth: CORNER_THICK, borderColor: YELLOW, borderBottomLeftRadius: 4 },
  cBR: { bottom: 0, right: 0, borderBottomWidth: CORNER_THICK, borderRightWidth: CORNER_THICK, borderColor: YELLOW, borderBottomRightRadius: 4 },
  hintRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(212,255,0,0.08)',
    borderRadius: 10, paddingHorizontal: 16, paddingVertical: 8,
    borderWidth: 1, borderColor: 'rgba(212,255,0,0.15)',
  },
  hintText: { fontSize: 13, fontWeight: '700', color: YELLOW },

  /* Result */
  resultBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    alignSelf: 'flex-start', borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 6, marginBottom: 12,
  },
  resultBadgeText: { fontSize: 12, fontWeight: '800', color: '#fff', letterSpacing: 0.5 },
  orderCode: { fontSize: 24, fontWeight: '900', color: WHITE, marginBottom: 16, letterSpacing: 1 },

  infoCard: {
    backgroundColor: CARD, borderRadius: 12,
    paddingHorizontal: 14, paddingTop: 4, paddingBottom: 4,
    marginBottom: 12, borderWidth: 1, borderColor: BORDER,
  },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 10 },
  cardHeadText: { fontSize: 11, fontWeight: '800', color: PURPLE, letterSpacing: 1 },
  movieTitle: { fontSize: 16, fontWeight: '800', color: WHITE, paddingBottom: 6 },
  foodItem: { fontSize: 13, color: MUTED, paddingVertical: 4 },

  errorBlock: { alignItems: 'center', paddingVertical: 32 },
  errorIconWrap: {
    width: 96, height: 96, borderRadius: 48,
    backgroundColor: 'rgba(255,45,120,0.1)',
    borderWidth: 2, borderColor: 'rgba(255,45,120,0.2)',
    alignItems: 'center', justifyContent: 'center', marginBottom: 20,
  },
  errorTitle: { fontSize: 20, fontWeight: '800', color: WHITE, marginBottom: 10 },
  errorMsg: { fontSize: 14, color: MUTED, textAlign: 'center', lineHeight: 22, marginBottom: 28 },

  /* Check-in */
  checkInBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    backgroundColor: GREEN, borderRadius: 14,
    paddingVertical: 15, marginTop: 6, marginBottom: 6,
    shadowColor: GREEN, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 8,
    elevation: 6,
  },
  checkInBtnText: { fontSize: 16, fontWeight: '800', color: '#fff' },
  checkedInNote: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(0,214,143,0.1)', borderRadius: 12,
    borderWidth: 1, borderColor: 'rgba(0,214,143,0.25)',
    paddingVertical: 12, paddingHorizontal: 14,
    marginTop: 6, marginBottom: 6,
  },
  checkedInNoteText: { fontSize: 13, fontWeight: '700', color: GREEN, flex: 1 },
});
