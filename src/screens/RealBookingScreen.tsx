import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
  Platform,
} from 'react-native';
import { Image } from 'expo-image';
import { Href, Stack, useLocalSearchParams, useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { Ionicons } from '@expo/vector-icons';

import { useAuth } from '@/context/AuthContext';
import { Movie } from '@/mocks/movies';
import { bookingService, PayosStatus, Product, Seat, Showtime, TicketQuote, webReturnUrl } from '@/services/bookingService';
import { movieService } from '@/services/movieService';
import { meService, MyVoucher } from '@/services/meService';
import ZoomableSeatMap from '@/components/ZoomableSeatMap';

// ─── Theme ───────────────────────────────────────────────────────────────────
const NAVY   = '#0d0d2b';
const CARD   = '#14143a';
const PURPLE = '#8b00ff';
const PINK   = '#ff2d78';
const YELLOW = '#d4ff00';
const WHITE  = '#f0f0ff';
const MUTED  = 'rgba(240,240,255,0.5)';
const BORDER = 'rgba(255,255,255,0.08)';

// ─── Helpers ─────────────────────────────────────────────────────────────────
const formatMoney = (value?: number) => `${Number(value || 0).toLocaleString('vi-VN')}đ`;
const seatLabel   = (seat: Seat) => `${seat.row}${seat.number}`;

const normalizeText = (value?: string) =>
  String(value || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

const isCoupleSeat = (seat: Seat) => {
  const name = normalizeText(seat.seatTypeName);
  return Boolean(seat.coupleSeat) || name.includes('doi') || name.includes('couple') || name.includes('double');
};

const formatDate = (value?: string) => {
  if (!value) return '—';
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${mm}/${dd}/${date.getFullYear()}`;
};

const sortSeats = (items: Seat[]) =>
  [...items].sort(
    (a, b) =>
      String(a.row || '').localeCompare(String(b.row || ''), 'vi', { numeric: true }) ||
      Number(a.x || 0) - Number(b.x || 0) ||
      String(a.number || '').localeCompare(String(b.number || ''), 'vi', { numeric: true })
  );

const calculateSeatPrice = (showtime: Showtime | null, seat: Seat) => {
  if (!showtime) return 0;
  const unit = Number(showtime.price || 0) + Number(seat.seatTypeSurcharge || 0);
  return unit * (isCoupleSeat(seat) ? 2 : 1);
};

function isSeatLocked(seat: Seat, selectedShowtime?: Showtime | null) {
  const status = String(seat.status || '').toLowerCase();
  return (
    selectedShowtime?.bookedSeatIds.includes(seat.seatId) ||
    status === 'locked' || status === 'maintenance' || status === 'sold' || status === '0'
  );
}

/**
 * Khớp BE SeatLayoutRules / web seatLayoutRules.js: không chừa đúng 1 ghế trống kẹp giữa hai
 * ghế đã chiếm trên cùng hàng. Chỉ báo lỗi khi CHÍNH lựa chọn hiện tại làm phát sinh ghế mồ côi
 * MỚI — nếu ghế mồ côi đã tồn tại sẵn (vd. do quầy bán vé tạo ra ở giao dịch khác), không chặn
 * các lựa chọn khác không liên quan.
 */
function findOrphanSeatIds(allSeats: Seat[], blockedSeatIds: Set<number>) {
  const orphans = new Set<number>();
  const byRow = new Map<string, Seat[]>();
  allSeats.forEach((seat) => {
    const row = seat.row || '?';
    byRow.set(row, [...(byRow.get(row) || []), seat]);
  });
  for (const rowSeats of byRow.values()) {
    const sorted = sortSeats(rowSeats);
    for (let i = 0; i < sorted.length; i++) {
      const current = sorted[i];
      if (blockedSeatIds.has(current.seatId) || isCoupleSeat(current)) continue;
      const left  = sorted[i - 1];
      const right = sorted[i + 1];
      if (left && blockedSeatIds.has(left.seatId) && right && blockedSeatIds.has(right.seatId)) {
        orphans.add(current.seatId);
      }
    }
  }
  return orphans;
}

function checkNoNewSingleSeatOrphanInRows(
  allSeats: Seat[],
  existingBlockedSeatIds: Set<number>,
  newlySelectedSeatIds: number[]
) {
  if (!allSeats.length) return { ok: true as const };

  const orphansBefore = findOrphanSeatIds(allSeats, existingBlockedSeatIds);

  const after = new Set(existingBlockedSeatIds);
  newlySelectedSeatIds.forEach((id) => after.add(id));
  const orphansAfter = findOrphanSeatIds(allSeats, after);

  for (const id of orphansAfter) {
    if (!orphansBefore.has(id)) {
      const seat = allSeats.find((s) => s.seatId === id);
      const label = seat ? seatLabel(seat) : '';
      return {
        ok: false as const,
        message: `Không được chừa 1 ghế trống lẻ giữa hàng (ghế ${label}). Chọn thêm ghế bên cạnh hoặc bỏ ghế khác.`,
      };
    }
  }
  return { ok: true as const };
}

function makeHolderId() {
  return `mobile-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

// ─── Step config ──────────────────────────────────────────────────────────────
const STEPS = [
  { step: 1, label: 'Suất chiếu', icon: 'film-outline'   },
  { step: 2, label: 'Chọn ghế',   icon: 'grid-outline'    },
  { step: 3, label: 'Bắp & nước', icon: 'fast-food-outline'},
  { step: 4, label: 'Thanh toán', icon: 'card-outline'    },
] as const;

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function RealBookingScreen() {
  const { id }    = useLocalSearchParams();
  const router    = useRouter();
  const { session } = useAuth();

  const [movie,            setMovie]            = useState<Movie | null>(null);
  const [showtimes,        setShowtimes]        = useState<Showtime[]>([]);
  const [selectedShowtimeId, setSelectedShowtimeId] = useState<number | null>(null);
  const [seats,            setSeats]            = useState<Seat[]>([]);
  const [products,         setProducts]         = useState<Product[]>([]);
  const [selectedSeatIds,  setSelectedSeatIds]  = useState<number[]>([]);
  const [cart,             setCart]             = useState<Record<number, number>>({});
  const [quote,            setQuote]            = useState<TicketQuote | null>(null);
  const [holderId]                              = useState(makeHolderId);
  const [step,             setStep]             = useState(1);
  const [loading,          setLoading]          = useState(true);
  const [stepLoading,      setStepLoading]      = useState(false);
  const [myVouchers,       setMyVouchers]       = useState<MyVoucher[]>([]);
  const [selectedVoucher,  setSelectedVoucher]  = useState<MyVoucher | null>(null);
  const [showVoucherPicker, setShowVoucherPicker] = useState(false);
  const [peerHeldSeatIds,  setPeerHeldSeatIds]  = useState<number[]>([]);
  const [abuseWarning,     setAbuseWarning]     = useState(false);

  const selectedShowtime = useMemo(
    () => showtimes.find((s) => s.id === selectedShowtimeId) ?? null,
    [selectedShowtimeId, showtimes]
  );
  const selectedSeats = useMemo(
    () => seats.filter((s) => selectedSeatIds.includes(s.seatId)),
    [seats, selectedSeatIds]
  );
  const snackLines = useMemo(
    () => Object.entries(cart)
      .map(([pid, qty]) => ({ productId: Number(pid), quantity: qty }))
      .filter((i) => i.productId > 0 && i.quantity > 0),
    [cart]
  );
  const localSeatTotal = useMemo(() => {
    if (!selectedShowtime) return 0;
    return selectedSeats.reduce((t, s) => t + calculateSeatPrice(selectedShowtime, s), 0);
  }, [selectedSeats, selectedShowtime]);
  const localSnackTotal = useMemo(
    () => snackLines.reduce((t, item) => {
      const p = products.find((x) => x.productId === item.productId);
      return t + Number(p?.price || 0) * item.quantity;
    }, 0),
    [products, snackLines]
  );
  const total             = quote?.finalAmount ?? localSeatTotal + localSnackTotal;
  const selectedSeatLabels = useMemo(() => sortSeats(selectedSeats).map(seatLabel), [selectedSeats]);

  // ── Effects (logic unchanged) ─────────────────────────────────────────────
  useEffect(() => {
    let mounted = true;
    async function load() {
      if (!id) return;
      setLoading(true);
      try {
        const [movieData, showtimeData] = await Promise.all([
          movieService.getMovieDetail(String(id)),
          bookingService.getShowtimesByMovie(String(id)),
        ]);
        if (!mounted) return;
        // Chỉ hiện suất "Sắp chiếu" — khớp cách lọc ở POS (Sales.jsx), ẩn suất đã bắt đầu/đã chiếu xong.
        const upcoming = showtimeData.filter((st) => st.status === 'Sắp chiếu');
        setMovie(movieData);
        setShowtimes(upcoming);
        setSelectedShowtimeId(upcoming[0]?.id ?? null);
      } catch (e: any) {
        Alert.alert('Không tải được dữ liệu đặt vé', e.message || 'Vui lòng kiểm tra kết nối.');
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, [id]);

  useEffect(() => {
    let mounted = true;
    async function loadShowtime() {
      if (!selectedShowtime) { setSeats([]); setProducts([]); return; }
      setStepLoading(true);
      setSelectedSeatIds([]);
      setCart({});
      setQuote(null);
      try {
        const [seatData, productData] = await Promise.all([
          bookingService.getSeatsByRoom(selectedShowtime.roomId),
          bookingService.getProducts(selectedShowtime.cinemaId),
        ]);
        if (!mounted) return;
        setSeats(seatData);
        setProducts(productData);
      } catch (e: any) {
        Alert.alert('Không tải được phòng chiếu', e.message || 'Vui lòng thử suất chiếu khác.');
      } finally {
        if (mounted) setStepLoading(false);
      }
    }
    loadShowtime();
    return () => { mounted = false; };
  }, [selectedShowtime]);

  useEffect(() => {
    if (!selectedShowtime) return;
    const t = setTimeout(() => {
      bookingService.holdSeats(selectedShowtime.id, holderId, selectedSeatIds)
        .then((warning) => setAbuseWarning(warning))
        .catch(() => {});
    }, 400);
    return () => clearTimeout(t);
  }, [holderId, selectedSeatIds, selectedShowtime]);

  useEffect(() => {
    if (!selectedShowtime) { setPeerHeldSeatIds([]); return; }
    let cancelled = false;
    const fetch = async () => {
      try {
        const ids = await bookingService.getPeerHolds(selectedShowtime.id, holderId);
        if (!cancelled) setPeerHeldSeatIds(ids);
      } catch {}
    };
    fetch();
    const iv = setInterval(fetch, 2000);
    return () => { cancelled = true; clearInterval(iv); };
  }, [holderId, selectedShowtime]);

  useEffect(() => {
    if (!selectedShowtime || selectedSeatIds.length === 0) return;
    const t = setTimeout(() => {
      bookingService.holdSeats(selectedShowtime.id, holderId, []).catch(() => {});
      setSelectedSeatIds([]);
      setQuote(null);
      Alert.alert('Hết thời gian giữ ghế', 'Ghế đã hết thời gian giữ 5 phút. Vui lòng chọn lại.');
    }, 5 * 60 * 1000);
    return () => clearTimeout(t);
  }, [holderId, selectedSeatIds, selectedShowtime]);

  useEffect(() => {
    return () => {
      if (!selectedShowtime) return;
      bookingService.holdSeats(selectedShowtime.id, holderId, []).catch(() => {});
    };
  }, [holderId, selectedShowtime]);

  // ── Seat layout ───────────────────────────────────────────────────────────
  const seatLayout = useMemo(() => {
    const valid = seats.filter((s) => Number.isFinite(Number(s.x)) && Number.isFinite(Number(s.y)));
    if (!valid.length) return { rows: [] as { y: number; label: string; cells: (Seat | null)[] }[], minX: 0, maxX: 0 };
    const xs   = valid.map((s) => Number(s.x));
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const ys   = Array.from(new Set(valid.map((s) => Number(s.y)))).sort((a, b) => a - b);
    return {
      minX, maxX,
      rows: ys.map((y) => {
        const rowSeats = valid.filter((s) => Number(s.y) === y);
        const byX      = new Map(rowSeats.map((s) => [Number(s.x), s]));
        const first    = sortSeats(rowSeats)[0];
        const cells: (Seat | null)[] = [];
        for (let x = minX; x <= maxX; x++) {
          const seat = byX.get(x) || null;
          cells.push(seat);
          // Ghế đôi chiếm luôn ô lưới kế bên (nếu trống) để không chừa khoảng hở giả.
          if (seat && isCoupleSeat(seat) && !byX.get(x + 1)) x += 1;
        }
        return { y, label: first?.row || String(y), cells };
      }),
    };
  }, [seats]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const toggleSeat = (seat: Seat) => {
    if (isSeatLocked(seat, selectedShowtime)) return;
    if (peerHeldSeatIds.includes(seat.seatId) && !selectedSeatIds.includes(seat.seatId)) return;
    setQuote(null);
    setSelectedSeatIds((cur) => {
      if (cur.includes(seat.seatId)) return cur.filter((id) => id !== seat.seatId);
      const existingBlocked = new Set<number>();
      seats.forEach((s) => { if (isSeatLocked(s, selectedShowtime)) existingBlocked.add(s.seatId); });
      cur.forEach((id) => existingBlocked.add(id));
      const rule = checkNoNewSingleSeatOrphanInRows(seats, existingBlocked, [seat.seatId]);
      if (!rule.ok) { Alert.alert('Không thể chọn ghế này', rule.message); return cur; }
      return [...cur, seat.seatId];
    });
  };

  const updateCart = (productId: number, delta: number) => {
    setQuote(null);
    setCart((cur) => ({ ...cur, [productId]: Math.max(0, (cur[productId] || 0) + delta) }));
  };

  const refreshQuote = async (voucher: MyVoucher | null = selectedVoucher) => {
    if (!selectedShowtime || selectedSeatIds.length === 0) return null;
    const data = await bookingService.quote({
      showtimeId: selectedShowtime.id,
      seatIds: selectedSeatIds,
      snacks: snackLines,
      userVoucherId: voucher?.userVoucherId,
    });
    setQuote(data);
    return data;
  };

  const handleSelectVoucher = async (voucher: MyVoucher | null) => {
    setSelectedVoucher(voucher);
    setShowVoucherPicker(false);
    try { await refreshQuote(voucher); }
    catch (e: any) { Alert.alert('Không áp dụng được voucher', e.message || 'Vui lòng thử lại.'); }
  };

  const handleCheckout = async () => {
    if (!selectedShowtime) return;
    setStepLoading(true);
    try {
      // Dùng đúng URL thật của web (https://...) làm returnUrl/cancelUrl — giống hệt luồng
      // thanh toán trên web, đã chứng minh hoạt động ổn định. Deep link scheme riêng của app
      // (moviezone://...) không đáng tin cậy để PayOS tự redirect quay lại sau khi thanh toán.
      const returnUrl = webReturnUrl('/payment/success');
      const cancelUrl = webReturnUrl('/payment/cancel');
      const response  = await bookingService.checkout({
        showtimeId: selectedShowtime.id,
        seatIds: selectedSeatIds,
        clientHoldId: holderId,
        snacks: snackLines,
        userVoucherId: selectedVoucher?.userVoucherId,
        returnUrl,
        cancelUrl,
      });
      const checkoutUrl    = response.payos?.checkoutUrl;
      const payosOrderCode = response.payosOrderCode;
      if (checkoutUrl && payosOrderCode) {
        await handlePayosCheckout(checkoutUrl, payosOrderCode, returnUrl);
      } else {
        Alert.alert('Đã tạo đơn', `Mã đơn: ${response.payosOrderCode || response.orderOnlineId}`);
      }
    } catch (e: any) {
      Alert.alert('Không tạo được đơn thanh toán', e.message || 'Vui lòng thử lại.');
    } finally {
      setStepLoading(false);
    }
  };

  /** Mở trang thanh toán PayOS thật trong app (giống web) thay vì tự vẽ QR + poll — PayOS xác
   * nhận thanh toán qua webhook phía server, không phụ thuộc app còn mở/nền hay không. Sau khi
   * người dùng đóng trang thanh toán, kiểm tra lại trạng thái 1 lần (thử thêm lần 2 nếu còn đang
   * chờ, đề phòng webhook chưa kịp xử lý) để quyết định giữ hay hủy đơn. */
  const handlePayosCheckout = async (checkoutUrl: string, orderCode: number, returnUrl: string) => {
    await WebBrowser.openAuthSessionAsync(checkoutUrl, returnUrl);

    let status: PayosStatus = 'PENDING';
    try {
      status = await bookingService.checkPayosStatus(orderCode);
      if (status === 'PENDING') {
        await new Promise((resolve) => setTimeout(resolve, 2000));
        status = await bookingService.checkPayosStatus(orderCode);
      }
    } catch {
      // Giữ nguyên PENDING — xử lý như chưa xác nhận được ở nhánh dưới.
    }

    if (status === 'PAID') {
      Alert.alert('Thanh toán thành công 🎉', 'Vé của bạn đã được xác nhận!', [
        { text: 'Xem vé', onPress: () => router.replace('/user/(tabs)/tickets' as Href) },
      ]);
    } else {
      bookingService.cancelPendingOrder(orderCode).catch(() => {});
      Alert.alert('Đã hủy thanh toán', 'Đơn đặt vé đã được hủy. Bạn có thể chọn suất khác hoặc thanh toán lại.');
    }
  };

  const handleNext = async () => {
    if (step === 1 && !selectedShowtime) {
      Alert.alert('Thông báo', 'Phim này chưa có suất chiếu khả dụng.');
      return;
    }
    if (step === 2 && selectedSeatIds.length === 0) {
      Alert.alert('Thông báo', 'Vui lòng chọn ít nhất một ghế.');
      return;
    }
    if (step === 3) {
      if (!session?.user) {
        Alert.alert('Cần đăng nhập', 'Vui lòng đăng nhập để đặt vé online.', [
          { text: 'Đăng nhập', onPress: () => router.replace('/(auth)/login' as Href) },
          { text: 'Ở lại', style: 'cancel' },
        ]);
        return;
      }
      setStepLoading(true);
      try {
        setSelectedVoucher(null);
        await refreshQuote(null);
        meService.getMyVouchers()
          .then((rows) => setMyVouchers(rows.filter((r) => r.status === 1)))
          .catch(() => setMyVouchers([]));
        setStep(4);
      } catch (e: any) {
        Alert.alert('Không báo giá được', e.message || 'Vui lòng thử lại.');
      } finally {
        setStepLoading(false);
      }
      return;
    }
    if (step === 4) { await handleCheckout(); return; }
    setStep((c) => c + 1);
  };

  const handleBack = () => {
    if (step > 1) { setStep((c) => c - 1); return; }
    router.back();
  };

  const handleCancel = () => {
    Alert.alert('Hủy đặt vé', 'Bạn có muốn thoát khỏi màn đặt vé không?', [
      { text: 'Tiếp tục đặt', style: 'cancel' },
      { text: 'Thoát', style: 'destructive', onPress: () => router.back() },
    ]);
  };

  // ── Loading / Error ───────────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={[s.fill, s.center]}>
        <Stack.Screen options={{ headerShown: false }} />
        <StatusBar barStyle="light-content" backgroundColor={NAVY} />
        <ActivityIndicator size="large" color={YELLOW} />
        <Text style={s.loadingText}>Đang tải thông tin đặt vé...</Text>
      </View>
    );
  }

  if (!movie) {
    return (
      <View style={[s.fill, s.center]}>
        <Stack.Screen options={{ headerShown: false }} />
        <Text style={{ color: MUTED, fontSize: 16 }}>Không tìm thấy phim.</Text>
      </View>
    );
  }

  const stepTitle = STEPS[step - 1]?.label ?? '';

  // ── Render helpers ────────────────────────────────────────────────────────

  const InfoRow = ({ label, value }: { label: string; value?: string | null }) => (
    <View style={s.infoRow}>
      <Text style={s.infoLabel}>{label}</Text>
      <Text style={s.infoValue} numberOfLines={2}>{value || '—'}</Text>
    </View>
  );

  const BookingInfoCard = () => (
    movie ? (
      <View style={s.infoCard}>
        <Image
          source={movie.poster || movie.posterUrl || ''}
          style={s.infoPoster}
          contentFit="cover"
        />
        <View style={s.infoBody}>
          <Text style={s.infoTitle} numberOfLines={2}>{movie.title}</Text>
          <InfoRow label="Rạp"    value={selectedShowtime?.cinemaName} />
          <InfoRow label="Phòng"  value={selectedShowtime?.roomName} />
          <InfoRow label="Suất"   value={selectedShowtime ? `${selectedShowtime.time} • ${formatDate(selectedShowtime.date)}` : undefined} />
          {selectedSeatLabels.length > 0 && <InfoRow label="Ghế" value={selectedSeatLabels.join(', ')} />}
        </View>
      </View>
    ) : null
  );

  const renderSeat = (seat: Seat) => {
    const selected  = selectedSeatIds.includes(seat.seatId);
    const locked    = isSeatLocked(seat, selectedShowtime);
    const peerHeld  = !selected && !locked && peerHeldSeatIds.includes(seat.seatId);
    const couple    = isCoupleSeat(seat);

    let bg     = 'transparent';
    let border = seat.seatTypeColor || '#0d6efd';
    let tc     = seat.seatTypeColor || '#0d6efd';

    if (locked)   { bg = 'rgba(255,255,255,0.1)'; border = 'rgba(255,255,255,0.15)'; tc = 'rgba(255,255,255,0.2)'; }
    if (peerHeld) { bg = '#ff980033'; border = '#ff9800'; tc = '#ff9800'; }
    if (selected) { bg = PURPLE;      border = PURPLE;    tc = '#fff'; }

    return (
      <Pressable
        key={seat.seatId}
        style={[s.seat, couple && s.doubleSeat, { backgroundColor: bg, borderColor: border }]}
        onPress={() => toggleSeat(seat)}
      >
        <Text style={[s.seatText, { color: tc }]}>{seatLabel(seat)}</Text>
        {couple && <Text style={[s.coupleTag, { color: tc }]}>2</Text>}
      </Pressable>
    );
  };

  // ── Main render ───────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={s.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={NAVY} />
      <Stack.Screen options={{ headerShown: false }} />

      {/* ── Custom header ── */}
      <View style={s.header}>
        <Pressable onPress={handleBack} style={s.headerBtn}>
          <Ionicons name="arrow-back" size={20} color={WHITE} />
        </Pressable>
        <View style={s.headerCenter}>
          <Text style={s.headerTitle}>{stepTitle}</Text>
          <Text style={s.headerSub} numberOfLines={1}>{movie.title}</Text>
        </View>
        <Pressable onPress={handleCancel} style={s.headerBtn}>
          <Text style={s.cancelText}>Hủy</Text>
        </Pressable>
      </View>

      {/* ── Step progress ── */}
      <View style={s.stepBar}>
        {STEPS.map(({ step: st, label, icon }) => {
          const done    = st < step;
          const active  = st === step;
          const pending = st > step;
          return (
            <View key={st} style={s.stepItem}>
              <View style={[
                s.stepCircle,
                done    && { backgroundColor: PURPLE, borderColor: PURPLE },
                active  && { backgroundColor: PINK,   borderColor: PINK   },
                pending && { backgroundColor: 'transparent', borderColor: BORDER },
              ]}>
                {done
                  ? <Ionicons name="checkmark" size={13} color="#fff" />
                  : <Ionicons name={icon as any} size={13} color={active ? '#fff' : MUTED} />
                }
              </View>
              <Text style={[s.stepLabel, active && { color: PINK }, done && { color: PURPLE }]}>
                {label}
              </Text>
              {st < 4 && <View style={[s.stepLine, done && { backgroundColor: PURPLE }]} />}
            </View>
          );
        })}
      </View>

      {/* ── Content ── */}
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>

        {/* ══ STEP 1: Suất chiếu ══ */}
        {step === 1 && (
          <View style={s.pad}>
            {showtimes.length === 0 ? (
              <View style={s.emptyCard}>
                <Ionicons name="film-outline" size={48} color={MUTED} />
                <Text style={s.emptyText}>Phim này chưa có suất chiếu trong 7 ngày tới.</Text>
              </View>
            ) : (
              showtimes.map((st) => {
                const active = selectedShowtimeId === st.id;
                return (
                  <Pressable
                    key={st.id}
                    style={[s.showtimeCard, active && { borderColor: PINK, borderWidth: 2 }]}
                    onPress={() => setSelectedShowtimeId(st.id)}
                  >
                    {/* Left accent */}
                    <View style={[s.showtimeAccent, { backgroundColor: active ? PINK : PURPLE + '60' }]} />

                    <View style={s.showtimeBody}>
                      <View style={s.showtimeTopRow}>
                        <View style={s.showtimeTimeBadge}>
                          <Ionicons name="time-outline" size={13} color={YELLOW} />
                          <Text style={s.showtimeTime}>{st.time}</Text>
                        </View>
                        <Text style={s.showtimeDate}>{formatDate(st.date)}</Text>
                        <View style={[s.statusPill, active && { backgroundColor: PINK + '33', borderColor: PINK }]}>
                          <Text style={[s.statusPillText, active && { color: PINK }]}>
                            {active ? 'Đã chọn' : st.status || 'Khả dụng'}
                          </Text>
                        </View>
                      </View>

                      <View style={s.showtimeMeta}>
                        <Ionicons name="location-outline" size={12} color={MUTED} />
                        <Text style={s.showtimeMetaText} numberOfLines={1}>
                          {st.cinemaName} • {st.roomName}
                        </Text>
                      </View>
                      {!!st.cinemaAddress && (
                        <Text style={s.showtimeAddr} numberOfLines={1}>{st.cinemaAddress}</Text>
                      )}
                    </View>

                    <View style={s.showtimePriceCol}>
                      <Text style={s.showtimePriceLabel}>từ</Text>
                      <Text style={s.showtimePrice}>{formatMoney(st.price)}</Text>
                    </View>
                  </Pressable>
                );
              })
            )}
          </View>
        )}

        {/* ══ STEP 2: Chọn ghế ══ */}
        {step === 2 && (
          <View style={s.pad}>
            <BookingInfoCard />

            {stepLoading ? (
              <View style={s.center}>
                <ActivityIndicator size="large" color={PURPLE} />
                <Text style={[s.emptyText, { marginTop: 12 }]}>Đang tải sơ đồ ghế...</Text>
              </View>
            ) : (
              <>
                {/* Screen indicator */}
                <View style={s.screenWrap}>
                  <View style={s.screenBar}>
                    <View style={[s.screenHalf, { backgroundColor: PURPLE }]} />
                    <View style={[s.screenHalf, { backgroundColor: PINK }]} />
                  </View>
                  <Text style={s.screenLabel}>MÀN HÌNH</Text>
                </View>

                {seatLayout.rows.length === 0 ? (
                  <View style={s.emptyCard}>
                    <Ionicons name="grid-outline" size={48} color={MUTED} />
                    <Text style={s.emptyText}>Phòng chiếu này chưa có sơ đồ ghế.</Text>
                  </View>
                ) : (
                  <>
                    <ZoomableSeatMap height={340}>
                      <View style={s.seatMap}>
                        {seatLayout.rows.map((row) => (
                          <View key={row.y} style={s.seatRow}>
                            <Text style={s.rowLabel}>{row.label}</Text>
                            <View style={s.seatCells}>
                              {row.cells.map((seat, idx) =>
                                seat
                                  ? renderSeat(seat)
                                  : <View key={`${row.y}-${idx}`} style={s.seatGap} />
                              )}
                            </View>
                          </View>
                        ))}
                      </View>
                    </ZoomableSeatMap>
                    <Text style={s.zoomHint}>Chụm 2 ngón để phóng to, kéo để xem chi tiết ghế</Text>
                  </>
                )}

                {/* Legend */}
                <View style={s.legend}>
                  {[
                    { color: '#0d6efd', label: 'Trống' },
                    { color: PURPLE,    label: 'Đang chọn' },
                    { color: '#ff9800', label: 'Người khác giữ' },
                    { color: 'rgba(255,255,255,0.15)', label: 'Đã bán/khóa' },
                  ].map(({ color, label }) => (
                    <View key={label} style={s.legendItem}>
                      <View style={[s.legendDot, { backgroundColor: color, borderColor: color }]} />
                      <Text style={s.legendLabel}>{label}</Text>
                    </View>
                  ))}
                </View>

                <Text style={s.seatNote}>
                  Không được chừa 1 ghế trống lẻ giữa hàng • Ghế đôi tính giá cho 2 người
                </Text>

                {abuseWarning && (
                  <View style={s.abuseWarningBox}>
                    <Ionicons name="warning-outline" size={18} color="#ff6b7a" />
                    <Text style={s.abuseWarningText}>
                      Bạn đang giữ/huỷ ghế nhiều lần liên tục trong thời gian ngắn. Nếu tiếp tục, tài khoản sẽ bị khoá.
                    </Text>
                  </View>
                )}
              </>
            )}
          </View>
        )}

        {/* ══ STEP 3: Bắp & nước ══ */}
        {step === 3 && (
          <View style={s.pad}>
            <BookingInfoCard />

            <View style={s.sectionHeader}>
              <Ionicons name="fast-food-outline" size={16} color={YELLOW} />
              <Text style={s.sectionLabel}>Bắp & nước</Text>
            </View>

            {products.length === 0 ? (
              <View style={s.emptyCard}>
                <Ionicons name="fast-food-outline" size={48} color={MUTED} />
                <Text style={s.emptyText}>Rạp này chưa có sản phẩm bán kèm.</Text>
              </View>
            ) : (
              products.map((product) => (
                <View key={product.productId} style={s.productCard}>
                  <Image
                    source={{ uri: product.image || '' }}
                    style={s.productImg}
                    contentFit="cover"
                  />
                  <View style={s.productBody}>
                    <Text style={s.productName}>{product.name}</Text>
                    {!!product.description && (
                      <Text style={s.productDesc} numberOfLines={2}>{product.description}</Text>
                    )}
                    <Text style={s.productPrice}>{formatMoney(product.price)}</Text>
                  </View>
                  <View style={s.qtyRow}>
                    <Pressable
                      style={s.qtyBtn}
                      onPress={() => updateCart(product.productId, -1)}
                    >
                      <Ionicons name="remove" size={16} color={WHITE} />
                    </Pressable>
                    <Text style={s.qtyVal}>{cart[product.productId] || 0}</Text>
                    <Pressable
                      style={[s.qtyBtn, { backgroundColor: PURPLE }]}
                      onPress={() => updateCart(product.productId, 1)}
                    >
                      <Ionicons name="add" size={16} color="#fff" />
                    </Pressable>
                  </View>
                </View>
              ))
            )}
          </View>
        )}

        {/* ══ STEP 4: Thanh toán ══ */}
        {step === 4 && (
          <View style={s.pad}>
            <View style={s.sectionHeader}>
              <Ionicons name="receipt-outline" size={16} color={YELLOW} />
              <Text style={s.sectionLabel}>Tóm tắt đơn hàng</Text>
            </View>

            <View style={s.summaryCard}>
              {/* Movie + showtime info */}
              <View style={s.summaryRow}>
                <Text style={s.summaryLbl}>Phim</Text>
                <Text style={s.summaryVal}>{movie.title}</Text>
              </View>
              <View style={s.summaryRow}>
                <Text style={s.summaryLbl}>Suất chiếu</Text>
                <Text style={s.summaryVal}>
                  {selectedShowtime ? `${selectedShowtime.time} • ${formatDate(selectedShowtime.date)}` : '—'}
                </Text>
              </View>
              <View style={s.summaryRow}>
                <Text style={s.summaryLbl}>Rạp</Text>
                <Text style={s.summaryVal}>{selectedShowtime?.cinemaName || '—'}</Text>
              </View>
              <View style={s.summaryRow}>
                <Text style={s.summaryLbl}>Địa chỉ</Text>
                <Text style={s.summaryVal}>{selectedShowtime?.cinemaAddress || '—'}</Text>
              </View>
              <View style={s.summaryRow}>
                <Text style={s.summaryLbl}>Phòng</Text>
                <Text style={s.summaryVal}>{selectedShowtime?.roomName || '—'}</Text>
              </View>
              <View style={s.summaryRow}>
                <Text style={s.summaryLbl}>Ghế</Text>
                <Text style={[s.summaryVal, { color: YELLOW }]}>{selectedSeatLabels.join(', ')}</Text>
              </View>
              {!!quote?.rankName && (
                <View style={s.summaryRow}>
                  <Text style={s.summaryLbl}>Hạng</Text>
                  <Text style={[s.summaryVal, { color: PURPLE }]}>{quote.rankName}</Text>
                </View>
              )}

              <View style={s.divider} />

              {/* Price breakdown */}
              <View style={s.summaryRow}>
                <Text style={s.summaryLbl}>Tiền vé</Text>
                <Text style={s.summaryVal}>{formatMoney(quote?.ticketTotal ?? localSeatTotal)}</Text>
              </View>
              {localSnackTotal > 0 && (
                <View style={s.summaryRow}>
                  <Text style={s.summaryLbl}>Bắp & nước</Text>
                  <Text style={s.summaryVal}>{formatMoney(quote?.snackTotal ?? localSnackTotal)}</Text>
                </View>
              )}
              {!!quote?.voucherDiscount && (
                <View style={s.summaryRow}>
                  <Text style={s.summaryLbl}>Voucher</Text>
                  <Text style={[s.summaryVal, { color: '#34C759' }]}>-{formatMoney(quote.voucherDiscount)}</Text>
                </View>
              )}
              {!!quote?.membershipDiscountPercent && (
                <View style={s.summaryRow}>
                  <Text style={s.summaryLbl}>Ưu đãi hạng</Text>
                  <Text style={[s.summaryVal, { color: '#34C759' }]}>-{quote.membershipDiscountPercent}%</Text>
                </View>
              )}
            </View>

            {/* Voucher picker */}
            <Pressable
              style={s.voucherRow}
              onPress={() => setShowVoucherPicker((v) => !v)}
            >
              <View style={[s.voucherIcon, { backgroundColor: PURPLE + '33' }]}>
                <Ionicons name="gift-outline" size={18} color={PURPLE} />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={s.voucherTitle}>
                  {selectedVoucher ? selectedVoucher.voucher?.code : 'Chọn voucher'}
                </Text>
                <Text style={s.voucherSub}>
                  {myVouchers.length === 0
                    ? 'Bạn chưa có voucher khả dụng'
                    : `${myVouchers.length} voucher trong ví`}
                </Text>
              </View>
              <Ionicons
                name={showVoucherPicker ? 'chevron-up' : 'chevron-down'}
                size={16}
                color={MUTED}
              />
            </Pressable>

            {showVoucherPicker && (
              <View style={s.voucherList}>
                <Pressable style={s.voucherOption} onPress={() => handleSelectVoucher(null)}>
                  <Text style={s.voucherOptionTitle}>Không dùng voucher</Text>
                </Pressable>
                {myVouchers.map((mv) => (
                  <Pressable
                    key={mv.userVoucherId}
                    style={[s.voucherOption, selectedVoucher?.userVoucherId === mv.userVoucherId && { borderLeftColor: PURPLE, borderLeftWidth: 3 }]}
                    onPress={() => handleSelectVoucher(mv)}
                  >
                    <Text style={s.voucherOptionTitle}>{mv.voucher?.code}</Text>
                    <Text style={s.voucherOptionSub}>
                      Giảm {mv.voucher?.discountType?.toLowerCase().includes('fixed')
                        ? formatMoney(mv.voucher.value)
                        : `${mv.voucher?.value}%`}
                    </Text>
                  </Pressable>
                ))}
              </View>
            )}

            {/* Payment method */}
            <View style={s.paymentCard}>
              <View style={[s.voucherIcon, { backgroundColor: YELLOW + '22' }]}>
                <Ionicons name="card-outline" size={18} color={YELLOW} />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={s.voucherTitle}>Thanh toán qua PayOS</Text>
                <Text style={s.voucherSub}>Đơn tự hủy sau 5 phút nếu chưa hoàn tất</Text>
              </View>
              <View style={s.payosBadge}>
                <Text style={s.payosBadgeText}>PayOS</Text>
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      {/* ── Footer ── */}
      <View style={s.footer}>
        <View>
          <Text style={s.totalLabel}>Tổng cộng</Text>
          <Text style={s.totalPrice}>{formatMoney(total)}</Text>
        </View>
        <Pressable
          style={({ pressed }) => [s.nextBtn, (pressed || stepLoading) && { opacity: 0.75 }]}
          onPress={handleNext}
          disabled={stepLoading}
        >
          {stepLoading
            ? <ActivityIndicator color="#fff" size="small" />
            : <>
                <Text style={s.nextBtnText}>
                  {step === 4 ? 'Xác nhận & Thanh toán' : 'Tiếp theo'}
                </Text>
                {step < 4 && <Ionicons name="arrow-forward" size={16} color="#fff" />}
              </>
          }
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  safeArea:    { flex: 1, backgroundColor: NAVY },
  fill:        { flex: 1, backgroundColor: NAVY },
  center:      { alignItems: 'center', justifyContent: 'center' },
  loadingText: { color: MUTED, marginTop: 14, fontSize: 13 },
  scroll:      { paddingBottom: 24 },
  pad:         { paddingHorizontal: 16, paddingTop: 12 },

  // Header
  header:       { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: BORDER },
  headerBtn:    { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle:  { fontSize: 15, fontWeight: '700', color: WHITE },
  headerSub:    { fontSize: 11, color: MUTED, marginTop: 1 },
  cancelText:   { color: PINK, fontWeight: '700', fontSize: 13 },

  // Step bar
  stepBar:     { flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: 12, paddingVertical: 14 },
  stepItem:    { flex: 1, alignItems: 'center', position: 'relative' },
  stepCircle:  { width: 30, height: 30, borderRadius: 15, borderWidth: 1.5, borderColor: BORDER, alignItems: 'center', justifyContent: 'center', marginBottom: 5 },
  stepLabel:   { fontSize: 9, color: MUTED, fontWeight: '600', textAlign: 'center' },
  stepLine:    { position: 'absolute', top: 15, left: '60%', right: '-40%', height: 1.5, backgroundColor: BORDER },

  // Info card
  infoCard:    { flexDirection: 'row', backgroundColor: CARD, borderRadius: 16, padding: 12, marginBottom: 16, borderWidth: 1, borderColor: BORDER },
  infoPoster:  { width: 68, height: 98, borderRadius: 10, backgroundColor: '#1a1a3a' },
  infoBody:    { flex: 1, marginLeft: 12 },
  infoTitle:   { fontSize: 14, fontWeight: '800', color: WHITE, marginBottom: 8, lineHeight: 19 },
  infoRow:     { flexDirection: 'row', marginBottom: 4 },
  infoLabel:   { width: 46, fontSize: 10, color: MUTED },
  infoValue:   { flex: 1, fontSize: 11, fontWeight: '600', color: WHITE },

  // Showtime card
  showtimeCard:     { flexDirection: 'row', backgroundColor: CARD, borderRadius: 16, marginBottom: 10, borderWidth: 1, borderColor: BORDER, overflow: 'hidden' },
  showtimeAccent:   { width: 4 },
  showtimeBody:     { flex: 1, padding: 14 },
  showtimeTopRow:   { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  showtimeTimeBadge:{ flexDirection: 'row', alignItems: 'center', gap: 4 },
  showtimeTime:     { fontSize: 16, fontWeight: '800', color: WHITE },
  showtimeDate:     { flex: 1, fontSize: 12, color: MUTED },
  statusPill:       { borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3, backgroundColor: PURPLE + '22', borderWidth: 1, borderColor: PURPLE + '50' },
  statusPillText:   { fontSize: 9, fontWeight: '800', color: PURPLE },
  showtimeMeta:     { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 2 },
  showtimeMetaText: { fontSize: 12, color: MUTED, flex: 1 },
  showtimeAddr:     { fontSize: 11, color: MUTED + '80', marginTop: 2 },
  showtimePriceCol: { justifyContent: 'center', alignItems: 'flex-end', paddingRight: 14, paddingVertical: 14 },
  showtimePriceLabel:{ fontSize: 9, color: MUTED, marginBottom: 2 },
  showtimePrice:    { fontSize: 13, fontWeight: '800', color: YELLOW },

  // Screen indicator
  screenWrap:  { alignItems: 'center', marginBottom: 16, marginTop: 4 },
  screenBar:   { flexDirection: 'row', width: '75%', height: 5, borderRadius: 3, overflow: 'hidden', marginBottom: 6 },
  screenHalf:  { flex: 1 },
  screenLabel: { fontSize: 9, letterSpacing: 5, color: MUTED },

  // Seat map
  seatMap:   { paddingRight: 16, paddingBottom: 8 },
  seatRow:   { flexDirection: 'row', alignItems: 'center', marginBottom: 5 },
  rowLabel:  { width: 22, fontSize: 11, color: MUTED, textAlign: 'center' },
  seatCells: { flexDirection: 'row' },
  seat:      { width: 30, height: 30, borderWidth: 1.5, borderRadius: 7, marginHorizontal: 2, justifyContent: 'center', alignItems: 'center' },
  doubleSeat:{ width: 62 },
  seatGap:   { width: 30, height: 30, marginHorizontal: 2 },
  seatText:  { fontSize: 9, fontWeight: '700' },
  coupleTag: { position: 'absolute', right: 3, bottom: 1, fontSize: 7, fontWeight: '900' },
  zoomHint:  { textAlign: 'center', fontSize: 10, color: MUTED, marginTop: 6 },

  // Legend
  legend:      { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 12, marginTop: 16 },
  legendItem:  { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot:   { width: 14, height: 14, borderRadius: 4 },
  legendLabel: { fontSize: 11, color: MUTED },
  seatNote:    { textAlign: 'center', fontSize: 11, color: MUTED, marginTop: 10, lineHeight: 17, paddingHorizontal: 16 },
  abuseWarningBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: 'rgba(220,53,69,0.15)', borderWidth: 1, borderColor: 'rgba(220,53,69,0.4)',
    borderRadius: 10, padding: 12, marginTop: 12, marginHorizontal: 16,
  },
  abuseWarningText: { flex: 1, fontSize: 12, lineHeight: 17, color: '#ff6b7a' },

  // Section header
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  sectionLabel:  { fontSize: 12, fontWeight: '800', color: YELLOW, textTransform: 'uppercase', letterSpacing: 1 },

  // Product card
  productCard: { flexDirection: 'row', backgroundColor: CARD, borderRadius: 16, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: BORDER, alignItems: 'center' },
  productImg:  { width: 68, height: 68, borderRadius: 12, backgroundColor: '#1a1a3a' },
  productBody: { flex: 1, marginLeft: 12 },
  productName: { fontSize: 14, fontWeight: '700', color: WHITE, marginBottom: 3 },
  productDesc: { fontSize: 11, color: MUTED, lineHeight: 16 },
  productPrice:{ fontSize: 14, fontWeight: '800', color: YELLOW, marginTop: 4 },
  qtyRow:      { flexDirection: 'row', alignItems: 'center', gap: 0 },
  qtyBtn:      { width: 30, height: 30, borderRadius: 8, backgroundColor: CARD, borderWidth: 1, borderColor: BORDER, alignItems: 'center', justifyContent: 'center' },
  qtyVal:      { width: 32, textAlign: 'center', fontSize: 15, fontWeight: '800', color: WHITE },

  // Summary card
  summaryCard: { backgroundColor: CARD, borderRadius: 18, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: BORDER },
  summaryRow:  { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10, gap: 16 },
  summaryLbl:  { fontSize: 13, color: MUTED },
  summaryVal:  { flex: 1, fontSize: 13, fontWeight: '700', color: WHITE, textAlign: 'right' },
  divider:     { height: 1, backgroundColor: BORDER, marginVertical: 10 },

  // Voucher
  voucherRow:   { flexDirection: 'row', alignItems: 'center', backgroundColor: CARD, borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: BORDER },
  voucherIcon:  { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  voucherTitle: { fontSize: 14, fontWeight: '700', color: WHITE, marginBottom: 2 },
  voucherSub:   { fontSize: 11, color: MUTED },
  voucherList:  { backgroundColor: CARD, borderRadius: 14, overflow: 'hidden', marginBottom: 10, borderWidth: 1, borderColor: BORDER },
  voucherOption:{ padding: 14, borderBottomWidth: 1, borderBottomColor: BORDER },
  voucherOptionTitle: { fontSize: 13, fontWeight: '700', color: WHITE },
  voucherOptionSub:   { fontSize: 11, color: MUTED, marginTop: 2 },

  // Payment card
  paymentCard:  { flexDirection: 'row', alignItems: 'center', backgroundColor: CARD, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: BORDER },
  payosBadge:   { backgroundColor: YELLOW + '22', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1, borderColor: YELLOW + '40' },
  payosBadgeText:{ fontSize: 10, fontWeight: '800', color: YELLOW },

  // Empty state
  emptyCard: { alignItems: 'center', backgroundColor: CARD, borderRadius: 18, padding: 40, borderWidth: 1, borderColor: BORDER },
  emptyText: { color: MUTED, fontSize: 14, marginTop: 12, textAlign: 'center', lineHeight: 20 },

  // Footer
  footer:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, paddingBottom: Platform.OS === 'ios' ? 24 : 16, backgroundColor: CARD, borderTopWidth: 1, borderTopColor: BORDER },
  totalLabel: { fontSize: 11, color: MUTED, marginBottom: 2 },
  totalPrice: { fontSize: 22, fontWeight: '900', color: YELLOW },
  nextBtn:    { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: PURPLE, borderRadius: 14, paddingHorizontal: 20, paddingVertical: 14 },
  nextBtnText:{ color: '#fff', fontSize: 14, fontWeight: '800' },
});
