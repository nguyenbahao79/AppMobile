import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { Href, Stack, useLocalSearchParams, useRouter } from 'expo-router';
import * as ExpoLinking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';

import { IconSymbol } from '@/components/base/icon-symbol';
import { ThemedText } from '@/components/base/themed-text';
import { ThemedView } from '@/components/base/themed-view';
import { Colors } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Movie } from '@/mocks/movies';
import { bookingService, Product, Seat, Showtime, TicketQuote } from '@/services/bookingService';
import { movieService } from '@/services/movieService';
import { meService, MyVoucher } from '@/services/meService';

const formatMoney = (value?: number) => `${Number(value || 0).toLocaleString('vi-VN')}đ`;
const seatLabel = (seat: Seat) => `${seat.row}${seat.number}`;
const normalizeText = (value?: string) =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

const isCoupleSeat = (seat: Seat) => {
  const name = normalizeText(seat.seatTypeName);
  return Boolean(seat.coupleSeat) || name.includes('doi') || name.includes('couple') || name.includes('double');
};

const formatDate = (value?: string) => {
  if (!value) return '—';
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('vi-VN');
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
    status === 'locked' ||
    status === 'maintenance' ||
    status === 'sold' ||
    status === '0'
  );
}

function checkNoSingleSeatOrphanInRows(allSeats: Seat[], blockedSeatIds: Set<number>) {
  if (!allSeats.length) return { ok: true };

  const byRow = new Map<string, Seat[]>();
  allSeats.forEach((seat) => {
    const row = seat.row || '?';
    byRow.set(row, [...(byRow.get(row) || []), seat]);
  });

  for (const rowSeats of byRow.values()) {
    const sorted = sortSeats(rowSeats);
    for (let i = 0; i < sorted.length; i += 1) {
      const current = sorted[i];
      if (blockedSeatIds.has(current.seatId) || isCoupleSeat(current)) continue;

      const left = sorted[i - 1];
      const right = sorted[i + 1];
      const leftBlocked = Boolean(left && blockedSeatIds.has(left.seatId));
      const rightBlocked = Boolean(right && blockedSeatIds.has(right.seatId));

      if (leftBlocked && rightBlocked) {
        return {
          ok: false,
          message: `Không được chừa 1 ghế trống lẻ giữa hàng (${seatLabel(current)}). Hãy chọn thêm ghế bên cạnh hoặc bỏ ghế khác.`,
        };
      }
    }
  }

  return { ok: true };
}

function makeHolderId() {
  return `mobile-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export default function RealBookingScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { session } = useAuth();
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const isDark = colorScheme === 'dark';

  const [movie, setMovie] = useState<Movie | null>(null);
  const [showtimes, setShowtimes] = useState<Showtime[]>([]);
  const [selectedShowtimeId, setSelectedShowtimeId] = useState<number | null>(null);
  const [seats, setSeats] = useState<Seat[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedSeatIds, setSelectedSeatIds] = useState<number[]>([]);
  const [cart, setCart] = useState<Record<number, number>>({});
  const [quote, setQuote] = useState<TicketQuote | null>(null);
  const [holderId] = useState(makeHolderId);
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [stepLoading, setStepLoading] = useState(false);
  const [myVouchers, setMyVouchers] = useState<MyVoucher[]>([]);
  const [selectedVoucher, setSelectedVoucher] = useState<MyVoucher | null>(null);
  const [showVoucherPicker, setShowVoucherPicker] = useState(false);
  const [peerHeldSeatIds, setPeerHeldSeatIds] = useState<number[]>([]);

  const selectedShowtime = useMemo(
    () => showtimes.find((showtime) => showtime.id === selectedShowtimeId) ?? null,
    [selectedShowtimeId, showtimes]
  );

  const selectedSeats = useMemo(
    () => seats.filter((seat) => selectedSeatIds.includes(seat.seatId)),
    [seats, selectedSeatIds]
  );

  const snackLines = useMemo(
    () =>
      Object.entries(cart)
        .map(([productId, quantity]) => ({ productId: Number(productId), quantity }))
        .filter((item) => item.productId > 0 && item.quantity > 0),
    [cart]
  );

  const localSeatTotal = useMemo(() => {
    if (!selectedShowtime) return 0;
    return selectedSeats.reduce((total, seat) => total + calculateSeatPrice(selectedShowtime, seat), 0);
  }, [selectedSeats, selectedShowtime]);

  const localSnackTotal = useMemo(
    () =>
      snackLines.reduce((total, item) => {
        const product = products.find((p) => p.productId === item.productId);
        return total + Number(product?.price || 0) * item.quantity;
      }, 0),
    [products, snackLines]
  );

  const total = quote?.finalAmount ?? localSeatTotal + localSnackTotal;
  const selectedSeatLabels = useMemo(() => sortSeats(selectedSeats).map(seatLabel), [selectedSeats]);

  useEffect(() => {
    let mounted = true;

    async function loadInitialData() {
      if (!id) return;
      setLoading(true);
      try {
        const [movieData, showtimeData] = await Promise.all([
          movieService.getMovieDetail(String(id)),
          bookingService.getShowtimesByMovie(String(id)),
        ]);

        if (!mounted) return;
        setMovie(movieData);
        setShowtimes(showtimeData);
        setSelectedShowtimeId(showtimeData[0]?.id ?? null);
      } catch (error: any) {
        Alert.alert('Không tải được dữ liệu đặt vé', error.message || 'Vui lòng kiểm tra BE.');
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadInitialData();
    return () => {
      mounted = false;
    };
  }, [id]);

  useEffect(() => {
    let mounted = true;

    async function loadShowtimeDetails() {
      if (!selectedShowtime) {
        setSeats([]);
        setProducts([]);
        return;
      }

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
      } catch (error: any) {
        Alert.alert('Không tải được phòng chiếu', error.message || 'Vui lòng thử suất chiếu khác.');
      } finally {
        if (mounted) setStepLoading(false);
      }
    }

    loadShowtimeDetails();
    return () => {
      mounted = false;
    };
  }, [selectedShowtime]);

  /** Gia hạn ghế đang chọn — debounce 400ms, khớp hành vi web. */
  useEffect(() => {
    if (!selectedShowtime) return;
    const handle = setTimeout(() => {
      bookingService.holdSeats(selectedShowtime.id, holderId, selectedSeatIds).catch(() => {
        // Checkout vẫn là bước kiểm tra cuối nếu giữ ghế tạm thất bại.
      });
    }, 400);
    return () => clearTimeout(handle);
  }, [holderId, selectedSeatIds, selectedShowtime]);

  /** Ghế người khác đang giữ tạm — poll mỗi 2s, khớp hành vi web. */
  useEffect(() => {
    if (!selectedShowtime) {
      setPeerHeldSeatIds([]);
      return;
    }
    let cancelled = false;
    const fetchPeer = async () => {
      try {
        const ids = await bookingService.getPeerHolds(selectedShowtime.id, holderId);
        if (!cancelled) setPeerHeldSeatIds(ids);
      } catch {
        // bỏ qua — vẫn cho chọn ghế, BE sẽ chặn ở bước checkout nếu ghế đã bị người khác giữ
      }
    };
    fetchPeer();
    const iv = setInterval(fetchPeer, 2000);
    return () => {
      cancelled = true;
      clearInterval(iv);
    };
  }, [holderId, selectedShowtime]);

  /** Hết 5 phút giữ ghế kể từ lần chọn gần nhất — tự nhả ghế, khớp hành vi web. */
  useEffect(() => {
    if (!selectedShowtime || selectedSeatIds.length === 0) return undefined;
    const handle = setTimeout(() => {
      bookingService.holdSeats(selectedShowtime.id, holderId, []).catch(() => {});
      setSelectedSeatIds([]);
      setQuote(null);
      Alert.alert('Hết thời gian giữ ghế', 'Ghế đã hết thời gian giữ 5 phút. Vui lòng chọn lại ghế.');
    }, 5 * 60 * 1000);
    return () => clearTimeout(handle);
  }, [holderId, selectedSeatIds, selectedShowtime]);

  /** Đổi suất chiếu / rời màn đặt vé — nhả ghế đang giữ. */
  useEffect(() => {
    return () => {
      if (!selectedShowtime) return;
      bookingService.holdSeats(selectedShowtime.id, holderId, []).catch(() => {});
    };
  }, [holderId, selectedShowtime]);

  const seatLayout = useMemo(() => {
    const validSeats = seats.filter((seat) => Number.isFinite(Number(seat.x)) && Number.isFinite(Number(seat.y)));
    if (!validSeats.length) return { rows: [] as { y: number; label: string; cells: (Seat | null)[] }[], minX: 0, maxX: 0 };

    const xs = validSeats.map((seat) => Number(seat.x));
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const rows = Array.from(new Set(validSeats.map((seat) => Number(seat.y)))).sort((a, b) => a - b);

    return {
      minX,
      maxX,
      rows: rows.map((y) => {
        const rowSeats = validSeats.filter((seat) => Number(seat.y) === y);
        const byX = new Map(rowSeats.map((seat) => [Number(seat.x), seat]));
        const firstSeat = sortSeats(rowSeats)[0];
        const cells: (Seat | null)[] = [];
        for (let x = minX; x <= maxX; x += 1) {
          cells.push(byX.get(x) || null);
        }
        return { y, label: firstSeat?.row || String(y), cells };
      }),
    };
  }, [seats]);

  const toggleSeat = (seat: Seat) => {
    if (isSeatLocked(seat, selectedShowtime)) return;
    if (peerHeldSeatIds.includes(seat.seatId) && !selectedSeatIds.includes(seat.seatId)) return;
    setQuote(null);
    setSelectedSeatIds((current) => {
      if (current.includes(seat.seatId)) {
        return current.filter((seatId) => seatId !== seat.seatId);
      }

      const blockedSeatIds = new Set<number>();
      seats.forEach((item) => {
        if (isSeatLocked(item, selectedShowtime)) blockedSeatIds.add(item.seatId);
      });
      current.forEach((seatId) => blockedSeatIds.add(seatId));
      blockedSeatIds.add(seat.seatId);

      const rule = checkNoSingleSeatOrphanInRows(seats, blockedSeatIds);
      if (!rule.ok) {
        Alert.alert('Không thể chọn ghế này', rule.message);
        return current;
      }

      return [...current, seat.seatId];
    });
  };

  const updateCart = (productId: number, delta: number) => {
    setQuote(null);
    setCart((current) => ({
      ...current,
      [productId]: Math.max(0, (current[productId] || 0) + delta),
    }));
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
    try {
      await refreshQuote(voucher);
    } catch (error: any) {
      Alert.alert('Không áp dụng được voucher', error.message || 'Vui lòng thử lại.');
    }
  };

  const handleCheckout = async () => {
    if (!selectedShowtime) return;
    setStepLoading(true);
    try {
      const returnUrl = ExpoLinking.createURL('payment-return');
      const response = await bookingService.checkout({
        showtimeId: selectedShowtime.id,
        seatIds: selectedSeatIds,
        clientHoldId: holderId,
        snacks: snackLines,
        userVoucherId: selectedVoucher?.userVoucherId,
        returnUrl,
        cancelUrl: returnUrl,
      });

      const checkoutUrl = response.payos?.checkoutUrl;
      const payosOrderCode = response.payosOrderCode;
      if (checkoutUrl && payosOrderCode) {
        const result = await WebBrowser.openAuthSessionAsync(checkoutUrl, returnUrl);
        try {
          await bookingService.confirmPayos(payosOrderCode);
          Alert.alert('Thanh toán thành công', 'Vé của bạn đã được xác nhận.', [
            { text: 'Xem vé', onPress: () => router.replace('/user/(tabs)/tickets' as Href) },
          ]);
        } catch {
          if (result.type === 'success') {
            Alert.alert('Đang xử lý', 'Hệ thống đang xác nhận thanh toán với PayOS. Vui lòng kiểm tra lại ở mục Vé của tôi sau ít phút.');
          } else {
            bookingService.cancelPendingOrder(payosOrderCode).catch(() => {});
            Alert.alert('Chưa thanh toán', 'Đơn đặt vé chưa được thanh toán và đã được hủy.');
          }
        }
      } else {
        Alert.alert('Đã tạo đơn', `Mã đơn: ${response.payosOrderCode || response.orderOnlineId}`);
      }
    } catch (error: any) {
      Alert.alert('Không tạo được đơn thanh toán', error.message || 'Vui lòng thử lại.');
    } finally {
      setStepLoading(false);
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
        Alert.alert('Cần đăng nhập khách hàng', 'Vui lòng đăng nhập tài khoản khách để đặt vé online.', [
          { text: 'Đăng nhập', onPress: () => router.replace('/(auth)/login' as Href) },
          { text: 'Ở lại', style: 'cancel' },
        ]);
        return;
      }

      setStepLoading(true);
      try {
        setSelectedVoucher(null);
        await refreshQuote(null);
        meService
          .getMyVouchers()
          .then((rows) => setMyVouchers(rows.filter((row) => row.status === 1)))
          .catch(() => setMyVouchers([]));
        setStep(4);
      } catch (error: any) {
        Alert.alert('Không báo giá được', error.message || 'Vui lòng thử lại.');
      } finally {
        setStepLoading(false);
      }
      return;
    }

    if (step === 4) {
      await handleCheckout();
      return;
    }

    setStep((current) => current + 1);
  };

  const handleBack = () => {
    if (step > 1) {
      setStep((current) => current - 1);
      return;
    }
    router.back();
  };

  const handleCancel = () => {
    Alert.alert('Hủy đặt vé', 'Bạn có muốn thoát khỏi màn đặt vé không?', [
      { text: 'Tiếp tục đặt', style: 'cancel' },
      { text: 'Thoát', style: 'destructive', onPress: () => router.back() },
    ]);
  };

  const renderInfoLine = (label: string, value?: string | number | null) => (
    <View style={styles.infoLine}>
      <ThemedText style={styles.infoLineLabel}>{label}</ThemedText>
      <ThemedText style={styles.infoLineValue}>{value || '—'}</ThemedText>
    </View>
  );

  const renderBookingInfoCard = () => (
    movie ? (
      <ThemedView style={[styles.bookingInfoCard, isDark && styles.cardDark]}>
        <Image source={{ uri: movie.poster || movie.posterUrl || 'https://placehold.co/160x240?text=Movie' }} style={styles.bookingPoster} />
        <View style={styles.bookingInfoBody}>
          <ThemedText style={styles.bookingMovieTitle} numberOfLines={2}>{movie.title}</ThemedText>
          {renderInfoLine('Rạp', selectedShowtime?.cinemaName)}
          {renderInfoLine('Địa chỉ', selectedShowtime?.cinemaAddress)}
          {renderInfoLine('Phòng', selectedShowtime?.roomName)}
          {renderInfoLine('Suất chiếu', selectedShowtime ? `${formatDate(selectedShowtime.date)} • ${selectedShowtime.time}` : '—')}
          {selectedSeatLabels.length > 0 && renderInfoLine('Ghế', selectedSeatLabels.join(', '))}
        </View>
      </ThemedView>
    ) : null
  );

  const renderSeat = (seat: Seat) => {
    const selected = selectedSeatIds.includes(seat.seatId);
    const locked = isSeatLocked(seat, selectedShowtime);
    const peerHeld = !selected && !locked && peerHeldSeatIds.includes(seat.seatId);
    const color = locked ? '#8E8E93' : peerHeld ? '#FF9500' : selected ? '#34C759' : seat.seatTypeColor || theme.tint;
    const filled = selected || locked || peerHeld;
    const couple = isCoupleSeat(seat);

    return (
      <Pressable
        key={seat.seatId}
        style={[
          styles.seat,
          couple && styles.doubleSeat,
          { borderColor: color },
          filled && { backgroundColor: color },
        ]}
        onPress={() => toggleSeat(seat)}
      >
        <ThemedText style={[styles.seatText, filled ? { color: '#FFF' } : { color }]}>
          {seatLabel(seat)}
        </ThemedText>
        {couple && <ThemedText style={[styles.coupleMark, filled ? { color: '#FFF' } : { color }]}>2</ThemedText>}
      </Pressable>
    );
  };

  if (loading) {
    return (
      <ThemedView style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={theme.tint} />
      </ThemedView>
    );
  }

  if (!movie) {
    return (
      <ThemedView style={[styles.container, styles.center]}>
        <ThemedText>Không tìm thấy phim.</ThemedText>
      </ThemedView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <Stack.Screen
        options={{
          title: step === 1 ? 'Suất chiếu' : step === 2 ? 'Chọn ghế' : step === 3 ? 'Bắp & nước' : 'Thanh toán',
          headerLeft: () => (
            <Pressable onPress={handleBack} style={styles.headerAction}>
              <IconSymbol name="chevron.left" size={24} color={theme.text} />
            </Pressable>
          ),
          headerRight: () => (
            <Pressable onPress={handleCancel} style={styles.headerAction}>
              <ThemedText style={styles.cancelText}>Hủy</ThemedText>
            </Pressable>
          ),
        }}
      />

      <View style={styles.progressBar}>
        {[1, 2, 3, 4].map((item) => (
          <View
            key={item}
            style={[
              styles.progressStep,
              { backgroundColor: item <= step ? theme.tint : isDark ? '#333' : '#eee' },
            ]}
          />
        ))}
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {step === 1 && (
          <View style={styles.stepContainer}>
            <ThemedText type="subtitle" style={styles.sectionTitle}>{movie.title}</ThemedText>
            {showtimes.length === 0 ? (
              <ThemedView style={[styles.emptyCard, isDark && styles.cardDark]}>
                <ThemedText>Phim này chưa có suất chiếu trong 7 ngày tới.</ThemedText>
              </ThemedView>
            ) : (
              showtimes.map((showtime) => (
                <Pressable
                  key={showtime.id}
                  style={[
                    styles.showtimeCard,
                    isDark && styles.cardDark,
                    selectedShowtimeId === showtime.id && { borderColor: theme.tint, borderWidth: 2 },
                  ]}
                  onPress={() => setSelectedShowtimeId(showtime.id)}
                >
                  <View style={{ flex: 1 }}>
                    <View style={styles.showtimeTopLine}>
                      <ThemedText style={styles.showtimeTime}>{showtime.time} • {formatDate(showtime.date)}</ThemedText>
                      <ThemedText style={styles.statusPill}>{showtime.status || 'Sắp chiếu'}</ThemedText>
                    </View>
                    <ThemedText style={styles.showtimeMeta}>
                      {showtime.cinemaName || 'Rạp'} • {showtime.roomName}
                    </ThemedText>
                    {!!showtime.cinemaAddress && (
                      <ThemedText style={styles.showtimeAddress} numberOfLines={2}>
                        {showtime.cinemaAddress}
                      </ThemedText>
                    )}
                  </View>
                  <ThemedText style={[styles.showtimePrice, { color: theme.tint }]}>
                    từ {formatMoney(showtime.price)}
                  </ThemedText>
                </Pressable>
              ))
            )}
          </View>
        )}

        {step === 2 && (
          <View style={styles.stepContainer}>
            {renderBookingInfoCard()}
            {stepLoading ? (
              <ActivityIndicator size="large" color={theme.tint} />
            ) : (
              <>
                <View style={styles.screenContainer}>
                  <View style={[styles.screen, { backgroundColor: theme.tint }]} />
                  <ThemedText style={styles.screenText}>MÀN HÌNH</ThemedText>
                </View>

                {seatLayout.rows.length === 0 ? (
                  <ThemedView style={[styles.emptyCard, isDark && styles.cardDark]}>
                    <ThemedText>Phòng chiếu này chưa có sơ đồ ghế.</ThemedText>
                  </ThemedView>
                ) : (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View style={styles.seatsContainer}>
                      {seatLayout.rows.map((row) => (
                        <View key={row.y} style={styles.row}>
                          <ThemedText style={styles.rowLabel}>{row.label}</ThemedText>
                          <View style={styles.seatsRow}>
                            {row.cells.map((seat, index) =>
                              seat ? (
                                renderSeat(seat)
                              ) : (
                                <View key={`${row.y}-${index}`} style={styles.seatPlaceholder} />
                              )
                            )}
                          </View>
                        </View>
                      ))}
                    </View>
                  </ScrollView>
                )}

                <View style={styles.legendRow}>
                  <View style={styles.legendItem}><View style={[styles.legendDot, { borderColor: theme.tint }]} /><ThemedText style={styles.legendLabel}>Trống</ThemedText></View>
                  <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: '#34C759', borderColor: '#34C759' }]} /><ThemedText style={styles.legendLabel}>Đang chọn</ThemedText></View>
                  <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: '#FF9500', borderColor: '#FF9500' }]} /><ThemedText style={styles.legendLabel}>Người khác đang giữ</ThemedText></View>
                  <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: '#8E8E93', borderColor: '#8E8E93' }]} /><ThemedText style={styles.legendLabel}>Đã bán/khóa</ThemedText></View>
                </View>
                <ThemedText style={styles.seatRuleNote}>
                  Không được chừa 1 ghế trống lẻ giữa hàng. Ghế đôi tính giá cho 2 ghế.
                </ThemedText>
              </>
            )}
          </View>
        )}

        {step === 3 && (
          <View style={styles.stepContainer}>
            {renderBookingInfoCard()}
            <ThemedText type="subtitle" style={styles.sectionTitle}>Bắp & nước</ThemedText>
            {products.length === 0 ? (
              <ThemedView style={[styles.emptyCard, isDark && styles.cardDark]}>
                <ThemedText>Rạp này chưa có sản phẩm bán kèm.</ThemedText>
              </ThemedView>
            ) : (
              products.map((product) => (
                <ThemedView key={product.productId} style={[styles.productItem, isDark && styles.cardDark]}>
                  <Image
                    source={{ uri: product.image || 'https://placehold.co/140x140?text=Snack' }}
                    style={styles.productImage}
                  />
                  <View style={styles.productInfo}>
                    <ThemedText style={styles.productName}>{product.name}</ThemedText>
                    {!!product.description && (
                      <ThemedText style={styles.productDesc} numberOfLines={2}>{product.description}</ThemedText>
                    )}
                    <ThemedText style={[styles.productPrice, { color: theme.tint }]}>
                      {formatMoney(product.price)}
                    </ThemedText>
                  </View>
                  <View style={styles.qtyContainer}>
                    <Pressable onPress={() => updateCart(product.productId, -1)} style={styles.qtyBtn}>
                      <IconSymbol name="minus" size={16} color={theme.text} />
                    </Pressable>
                    <ThemedText style={styles.qtyText}>{cart[product.productId] || 0}</ThemedText>
                    <Pressable onPress={() => updateCart(product.productId, 1)} style={styles.qtyBtn}>
                      <IconSymbol name="plus" size={16} color={theme.text} />
                    </Pressable>
                  </View>
                </ThemedView>
              ))
            )}
          </View>
        )}

        {step === 4 && (
          <View style={styles.stepContainer}>
            <ThemedText type="subtitle" style={styles.sectionTitle}>Tóm tắt đơn hàng</ThemedText>
            <ThemedView style={[styles.summaryCard, isDark && styles.cardDark]}>
              <View style={styles.summaryRow}>
                <ThemedText style={styles.summaryLabel}>Phim</ThemedText>
                <ThemedText style={styles.summaryValue}>{movie.title}</ThemedText>
              </View>
              <View style={styles.summaryRow}>
                <ThemedText style={styles.summaryLabel}>Suất chiếu</ThemedText>
                <ThemedText style={styles.summaryValue}>{selectedShowtime ? `${formatDate(selectedShowtime.date)} • ${selectedShowtime.time}` : '—'}</ThemedText>
              </View>
              <View style={styles.summaryRow}>
                <ThemedText style={styles.summaryLabel}>Rạp</ThemedText>
                <ThemedText style={styles.summaryValue}>{selectedShowtime?.cinemaName || '—'}</ThemedText>
              </View>
              <View style={styles.summaryRow}>
                <ThemedText style={styles.summaryLabel}>Địa chỉ</ThemedText>
                <ThemedText style={styles.summaryValue}>{selectedShowtime?.cinemaAddress || '—'}</ThemedText>
              </View>
              <View style={styles.summaryRow}>
                <ThemedText style={styles.summaryLabel}>Phòng</ThemedText>
                <ThemedText style={styles.summaryValue}>{selectedShowtime?.roomName || '—'}</ThemedText>
              </View>
              <View style={styles.summaryRow}>
                <ThemedText style={styles.summaryLabel}>Ghế</ThemedText>
                <ThemedText style={styles.summaryValue}>{selectedSeatLabels.join(', ')}</ThemedText>
              </View>
              {!!quote?.rankName && (
                <View style={styles.summaryRow}>
                  <ThemedText style={styles.summaryLabel}>Hạng thành viên</ThemedText>
                  <ThemedText style={styles.summaryValue}>{quote.rankName}</ThemedText>
                </View>
              )}
              <View style={styles.divider} />
              <View style={styles.summaryRow}>
                <ThemedText style={styles.summaryLabel}>Tiền vé</ThemedText>
                <ThemedText style={styles.summaryValue}>{formatMoney(quote?.ticketTotal ?? localSeatTotal)}</ThemedText>
              </View>
              <View style={styles.summaryRow}>
                <ThemedText style={styles.summaryLabel}>Bắp nước</ThemedText>
                <ThemedText style={styles.summaryValue}>{formatMoney(quote?.snackTotal ?? localSnackTotal)}</ThemedText>
              </View>
              {!!quote?.voucherDiscount && (
                <View style={styles.summaryRow}>
                  <ThemedText style={styles.summaryLabel}>Voucher</ThemedText>
                  <ThemedText style={styles.summaryValue}>-{formatMoney(quote.voucherDiscount)}</ThemedText>
                </View>
              )}
            </ThemedView>

            <Pressable
              style={[styles.voucherCard, isDark && styles.cardDark]}
              onPress={() => setShowVoucherPicker((current) => !current)}
            >
              <IconSymbol name="gift.fill" size={22} color={theme.tint} />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <ThemedText style={styles.productName}>
                  {selectedVoucher ? selectedVoucher.voucher?.code : 'Chọn voucher'}
                </ThemedText>
                <ThemedText style={styles.productDesc}>
                  {myVouchers.length === 0 ? 'Bạn chưa có voucher khả dụng' : `${myVouchers.length} voucher trong ví`}
                </ThemedText>
              </View>
              <IconSymbol name={showVoucherPicker ? 'chevron.left' : 'chevron.right'} size={16} color={theme.tabIconDefault} />
            </Pressable>

            {showVoucherPicker && (
              <ThemedView style={[styles.voucherList, isDark && styles.cardDark]}>
                <Pressable style={styles.voucherOption} onPress={() => handleSelectVoucher(null)}>
                  <ThemedText style={styles.productName}>Không dùng voucher</ThemedText>
                </Pressable>
                {myVouchers.map((mv) => (
                  <Pressable key={mv.userVoucherId} style={styles.voucherOption} onPress={() => handleSelectVoucher(mv)}>
                    <ThemedText style={styles.productName}>{mv.voucher?.code}</ThemedText>
                    <ThemedText style={styles.productDesc}>
                      Giảm {mv.voucher?.discountType?.toLowerCase().includes('fixed')
                        ? formatMoney(mv.voucher.value)
                        : `${mv.voucher?.value}%`}
                    </ThemedText>
                  </Pressable>
                ))}
              </ThemedView>
            )}

            <ThemedView style={[styles.payosCard, isDark && styles.cardDark]}>
              <IconSymbol name="creditcard.fill" size={24} color={theme.tint} />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <ThemedText style={styles.productName}>Thanh toán PayOS</ThemedText>
                <ThemedText style={styles.productDesc}>
                  Đơn sẽ tự hủy sau 5 phút nếu chưa hoàn tất thanh toán.
                </ThemedText>
              </View>
            </ThemedView>
          </View>
        )}
      </ScrollView>

      <ThemedView style={[styles.footer, isDark && styles.cardDark]}>
        <View style={{ flex: 1 }}>
          <ThemedText style={styles.totalLabel}>Tổng cộng</ThemedText>
          <ThemedText type="title" style={[styles.totalPrice, { color: theme.tint }]}>
            {formatMoney(total)}
          </ThemedText>
        </View>

        <Pressable
          style={[styles.confirmButton, { backgroundColor: theme.tint }, stepLoading && { opacity: 0.6 }]}
          onPress={handleNext}
          disabled={stepLoading}
        >
          {stepLoading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
                <ThemedText style={styles.confirmButtonText}>{step === 4 ? 'Xác nhận thanh toán' : 'Tiếp tục'}</ThemedText>
          )}
        </Pressable>
      </ThemedView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center' },
  headerAction: { paddingHorizontal: 16 },
  cancelText: { color: '#FF3B30', fontWeight: 'bold' },
  progressBar: { flexDirection: 'row', paddingHorizontal: 20, height: 4, marginTop: 10 },
  progressStep: { flex: 1, height: 4, borderRadius: 2, marginHorizontal: 2 },
  scrollContent: { paddingBottom: 24 },
  stepContainer: { paddingHorizontal: 20, paddingTop: 16 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15 },
  emptyCard: { padding: 18, borderRadius: 18, backgroundColor: '#FFF' },
  cardDark: { backgroundColor: '#1C1C1E' },
  bookingInfoCard: {
    flexDirection: 'row',
    gap: 12,
    padding: 12,
    borderRadius: 18,
    backgroundColor: '#FFF',
    marginBottom: 16,
  },
  bookingPoster: { width: 72, height: 104, borderRadius: 12, backgroundColor: '#EEE' },
  bookingInfoBody: { flex: 1 },
  bookingMovieTitle: { fontSize: 17, fontWeight: '800', marginBottom: 8 },
  infoLine: { flexDirection: 'row', gap: 8, marginBottom: 4 },
  infoLineLabel: { width: 58, fontSize: 11, opacity: 0.5 },
  infoLineValue: { flex: 1, fontSize: 12, fontWeight: '600' },
  showtimeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  showtimeTopLine: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 },
  showtimeTime: { fontSize: 17, fontWeight: '800' },
  showtimeMeta: { fontSize: 13, opacity: 0.6, marginTop: 4 },
  showtimeAddress: { fontSize: 12, opacity: 0.5, marginTop: 4, lineHeight: 16 },
  showtimePrice: { fontSize: 13, fontWeight: '700' },
  statusPill: {
    overflow: 'hidden',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: '#34C75920',
    color: '#24A148',
    fontSize: 10,
    fontWeight: '800',
  },
  screenContainer: { alignItems: 'center', marginBottom: 20, marginTop: 10 },
  screen: { width: '80%', height: 4, borderRadius: 2 },
  screenText: { marginTop: 8, fontSize: 10, letterSpacing: 6, opacity: 0.5 },
  seatsContainer: { gap: 6, paddingRight: 20 },
  row: { flexDirection: 'row', alignItems: 'center' },
  rowLabel: { width: 24, fontSize: 12, opacity: 0.5 },
  seatsRow: { flexDirection: 'row', paddingVertical: 1 },
  seat: {
    width: 30,
    height: 30,
    borderWidth: 1.5,
    borderRadius: 7,
    marginHorizontal: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  doubleSeat: { width: 62 },
  seatPlaceholder: { width: 30, height: 30, marginHorizontal: 2 },
  seatText: { fontSize: 9, fontWeight: 'bold' },
  coupleMark: { position: 'absolute', right: 3, bottom: 1, fontSize: 7, fontWeight: '900', opacity: 0.85 },
  legendRow: { flexDirection: 'row', justifyContent: 'center', gap: 12, marginTop: 18, flexWrap: 'wrap' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 14, height: 14, borderRadius: 4, borderWidth: 1.5 },
  legendLabel: { fontSize: 12, opacity: 0.6 },
  seatRuleNote: { textAlign: 'center', fontSize: 12, opacity: 0.55, marginTop: 10, lineHeight: 17 },
  productItem: {
    flexDirection: 'row',
    padding: 12,
    borderRadius: 16,
    backgroundColor: '#FFF',
    marginBottom: 12,
    alignItems: 'center',
  },
  productImage: { width: 70, height: 70, borderRadius: 12, backgroundColor: '#EEE' },
  productInfo: { flex: 1, marginLeft: 15 },
  productName: { fontSize: 16, fontWeight: 'bold' },
  productDesc: { fontSize: 12, opacity: 0.6, marginTop: 2 },
  productPrice: { fontSize: 15, fontWeight: 'bold', marginTop: 4 },
  qtyContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#00000008', borderRadius: 10, padding: 4 },
  qtyBtn: { width: 28, height: 28, justifyContent: 'center', alignItems: 'center' },
  qtyText: { marginHorizontal: 10, fontWeight: 'bold', fontSize: 16 },
  summaryCard: { padding: 16, borderRadius: 20, backgroundColor: '#FFF' },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10, gap: 20 },
  summaryLabel: { fontSize: 14, opacity: 0.6 },
  summaryValue: { flex: 1, fontSize: 14, fontWeight: 'bold', textAlign: 'right' },
  divider: { height: 1, backgroundColor: '#00000010', marginVertical: 10 },
  voucherCard: {
    marginTop: 16,
    padding: 16,
    borderRadius: 18,
    backgroundColor: '#FFF',
    flexDirection: 'row',
    alignItems: 'center',
  },
  voucherList: {
    marginTop: 8,
    borderRadius: 18,
    backgroundColor: '#FFF',
    overflow: 'hidden',
  },
  voucherOption: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#00000008',
  },
  payosCard: {
    marginTop: 16,
    padding: 16,
    borderRadius: 18,
    backgroundColor: '#FFF',
    flexDirection: 'row',
    alignItems: 'center',
  },
  footer: {
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderTopWidth: 1,
    borderTopColor: '#00000008',
  },
  totalLabel: { fontSize: 12, opacity: 0.6 },
  totalPrice: { fontSize: 22, fontWeight: '800', lineHeight: 28 },
  confirmButton: { minWidth: 132, paddingHorizontal: 24, paddingVertical: 14, borderRadius: 16, alignItems: 'center' },
  confirmButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' },
});
