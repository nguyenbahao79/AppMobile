import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, AppState, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';

import { BASE_URL } from '@/api/config';
import { getAuthHeader } from '@/api/client';
import { PayosStatus } from '@/services/bookingService';

const CARD = '#14143a';
const PURPLE = '#8b00ff';
const PINK = '#ff2d78';
const YELLOW = '#d4ff00';
const WHITE = '#f0f0ff';
const MUTED = 'rgba(240,240,255,0.55)';
const BORDER = 'rgba(255,255,255,0.1)';

const POLL_INTERVAL_MS = 3000;
const LINK_LIFETIME_SEC = 300; // khớp expiredAt = now + 300s bên BE (PayOSService)

const formatMoney = (value?: number) => `${Number(value || 0).toLocaleString('vi-VN')}đ`;
const formatCountdown = (sec: number) => {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

type Props = {
  visible: boolean;
  qrCode: string | null;
  amountVnd?: number;
  paymentQrUrl: (qrCode: string) => string;
  onCheckStatus: () => Promise<PayosStatus>;
  onPaid: () => void;
  onCancel: (reason: 'user' | 'expired' | 'cancelled_on_payos') => void;
};

/** Hiển thị QR thanh toán PayOS ngay trong app + tự poll trạng thái — không mở trình duyệt ngoài. */
export default function PayosQrModal({ visible, qrCode, amountVnd, paymentQrUrl, onCheckStatus, onPaid, onCancel }: Props) {
  const [authHeader, setAuthHeader] = useState<Record<string, string>>({});
  const [secondsLeft, setSecondsLeft] = useState(LINK_LIFETIME_SEC);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const settledRef = useRef(false);

  const clearTimers = () => {
    if (pollRef.current) clearInterval(pollRef.current);
    if (tickRef.current) clearInterval(tickRef.current);
    pollRef.current = null;
    tickRef.current = null;
  };

  useEffect(() => {
    if (!visible || !qrCode) {
      clearTimers();
      return;
    }

    settledRef.current = false;
    setSecondsLeft(LINK_LIFETIME_SEC);
    getAuthHeader().then(setAuthHeader).catch(() => setAuthHeader({}));

    const runCheck = async () => {
      if (settledRef.current) return;
      try {
        const status = await onCheckStatus();
        if (status === 'PAID') {
          settledRef.current = true;
          clearTimers();
          onPaid();
        } else if (status === 'CANCELLED') {
          settledRef.current = true;
          clearTimers();
          onCancel('cancelled_on_payos');
        }
      } catch {
        // Lỗi mạng tạm thời khi poll — bỏ qua, thử lại ở lần poll kế tiếp.
      }
    };

    pollRef.current = setInterval(runCheck, POLL_INTERVAL_MS);

    // Người dùng thường rời app để mở app ngân hàng quét/xác nhận thanh toán — lúc đó app bị đưa
    // xuống nền và interval polling có thể bị hệ điều hành tạm dừng. Kiểm tra ngay khi quay lại
    // foreground để không bị "kẹt" chờ dù đã thanh toán xong.
    const appStateSub = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') runCheck();
    });

    tickRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          if (!settledRef.current) {
            settledRef.current = true;
            clearTimers();
            onCancel('expired');
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      appStateSub.remove();
      clearTimers();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, qrCode]);

  if (!visible || !qrCode) return null;

  const imageUri = `${BASE_URL}${paymentQrUrl(qrCode)}`;

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={() => onCancel('user')}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>Quét mã để thanh toán</Text>
          <Text style={styles.subtitle}>Mở app ngân hàng/ví điện tử bất kỳ, quét mã VietQR bên dưới</Text>

          <View style={styles.qrBox}>
            {Object.keys(authHeader).length === 0 ? (
              <ActivityIndicator color={PURPLE} />
            ) : (
              <Image
                source={{ uri: imageUri, headers: authHeader }}
                style={styles.qrImage}
                contentFit="contain"
                cachePolicy="none"
              />
            )}
          </View>

          {amountVnd != null && <Text style={styles.amount}>{formatMoney(amountVnd)}</Text>}

          <View style={styles.statusRow}>
            <ActivityIndicator size="small" color={YELLOW} />
            <Text style={styles.statusText}>Đang chờ thanh toán · hết hạn sau {formatCountdown(secondsLeft)}</Text>
          </View>

          <Pressable style={styles.cancelBtn} onPress={() => onCancel('user')}>
            <Text style={styles.cancelText}>Hủy thanh toán</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: CARD,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 20,
    alignItems: 'center',
  },
  title: { color: WHITE, fontSize: 18, fontWeight: '800', marginBottom: 4, textAlign: 'center' },
  subtitle: { color: MUTED, fontSize: 12, textAlign: 'center', marginBottom: 16 },
  qrBox: {
    width: 220,
    height: 220,
    backgroundColor: '#fff',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  qrImage: { width: 220, height: 220 },
  amount: { color: YELLOW, fontSize: 22, fontWeight: '900', marginTop: 16 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 14 },
  statusText: { color: MUTED, fontSize: 12 },
  cancelBtn: {
    marginTop: 18,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: PINK,
  },
  cancelText: { color: PINK, fontWeight: '700', fontSize: 13 },
});
