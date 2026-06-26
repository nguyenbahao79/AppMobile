import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { Href, Stack, useLocalSearchParams, useRouter } from 'expo-router';

import { IconSymbol } from '@/components/base/icon-symbol';
import { ThemedText } from '@/components/base/themed-text';
import { ThemedView } from '@/components/base/themed-view';
import { Colors } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Movie } from '@/mocks/movies';
import { bookingService, Product, Seat, Showtime, TicketQuote } from '@/services/bookingService';
import { movieService } from '@/services/movieService';

const formatMoney = (value?: number) => `${Number(value || 0).toLocaleString('vi-VN')}đ`;
const seatLabel = (seat: Seat) => `${seat.row}${seat.number}`;

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
    return selectedSeats.reduce(
      (total, seat) => total + selectedShowtime.price + Number(seat.seatTypeSurcharge || 0),
      0
    );
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

  useEffect(() => {
    if (!selectedShowtime || selectedSeatIds.length === 0) return;

    bookingService.holdSeats(selectedShowtime.id, holderId, selectedSeatIds).catch(() => {
      // Checkout vẫn là bước kiểm tra cuối nếu giữ ghế tạm thất bại.
    });
  }, [holderId, selectedSeatIds, selectedShowtime]);

  const seatsByRow = useMemo(() => {
    const rows = new Map<string, Seat[]>();
    seats.forEach((seat) => {
      const row = seat.row || '?';
      rows.set(row, [...(rows.get(row) || []), seat]);
    });

    return Array.from(rows.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([row, rowSeats]) => [
        row,
        rowSeats.sort((a, b) => a.x - b.x || Number(a.number) - Number(b.number)),
      ] as const);
  }, [seats]);

  const toggleSeat = (seat: Seat) => {
    if (isSeatLocked(seat, selectedShowtime)) return;
    setQuote(null);
    setSelectedSeatIds((current) =>
      current.includes(seat.seatId)
        ? current.filter((seatId) => seatId !== seat.seatId)
        : [...current, seat.seatId]
    );
  };

  const updateCart = (productId: number, delta: number) => {
    setQuote(null);
    setCart((current) => ({
      ...current,
      [productId]: Math.max(0, (current[productId] || 0) + delta),
    }));
  };

  const refreshQuote = async () => {
    if (!selectedShowtime || selectedSeatIds.length === 0) return null;
    const data = await bookingService.quote({
      showtimeId: selectedShowtime.id,
      seatIds: selectedSeatIds,
      snacks: snackLines,
    });
    setQuote(data);
    return data;
  };

  const handleCheckout = async () => {
    if (!selectedShowtime) return;
    setStepLoading(true);
    try {
      const response = await bookingService.checkout({
        showtimeId: selectedShowtime.id,
        seatIds: selectedSeatIds,
        clientHoldId: holderId,
        snacks: snackLines,
      });

      const checkoutUrl = response.payos?.checkoutUrl;
      if (checkoutUrl) {
        await Linking.openURL(checkoutUrl);
        Alert.alert(
          'Đã mở PayOS',
          'Sau khi thanh toán xong, quay lại app và kéo xuống tải lại ở mục Vé của tôi.',
          [{ text: 'Xem vé', onPress: () => router.replace('/user/(tabs)/tickets' as Href) }]
        );
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
        await refreshQuote();
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

  const renderSeat = (seat: Seat) => {
    const selected = selectedSeatIds.includes(seat.seatId);
    const locked = isSeatLocked(seat, selectedShowtime);
    const color = locked ? '#8E8E93' : selected ? '#34C759' : seat.seatTypeColor || theme.tint;

    return (
      <Pressable
        key={seat.seatId}
        style={[
          styles.seat,
          seat.coupleSeat && styles.doubleSeat,
          { borderColor: color },
          (selected || locked) && { backgroundColor: color },
        ]}
        onPress={() => toggleSeat(seat)}
      >
        <ThemedText style={[styles.seatText, selected || locked ? { color: '#FFF' } : { color }]}>
          {seatLabel(seat)}
        </ThemedText>
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
                    <ThemedText style={styles.showtimeTime}>{showtime.time} • {showtime.date}</ThemedText>
                    <ThemedText style={styles.showtimeMeta}>
                      {showtime.cinemaName || 'Rạp'} • {showtime.roomName}
                    </ThemedText>
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
            {stepLoading ? (
              <ActivityIndicator size="large" color={theme.tint} />
            ) : (
              <>
                <View style={styles.screenContainer}>
                  <View style={[styles.screen, { backgroundColor: theme.tint }]} />
                  <ThemedText style={styles.screenText}>MÀN HÌNH</ThemedText>
                </View>

                <View style={styles.seatsContainer}>
                  {seatsByRow.map(([row, rowSeats]) => (
                    <View key={row} style={styles.row}>
                      <ThemedText style={styles.rowLabel}>{row}</ThemedText>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                        <View style={styles.seatsRow}>{rowSeats.map(renderSeat)}</View>
                      </ScrollView>
                    </View>
                  ))}
                </View>

                <View style={styles.legendRow}>
                  <ThemedText style={styles.legendLabel}>Xám: đã bán/khóa</ThemedText>
                  <ThemedText style={styles.legendLabel}>Xanh lá: đang chọn</ThemedText>
                </View>
              </>
            )}
          </View>
        )}

        {step === 3 && (
          <View style={styles.stepContainer}>
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
                <ThemedText style={styles.summaryValue}>{selectedShowtime?.time}, {selectedShowtime?.date}</ThemedText>
              </View>
              <View style={styles.summaryRow}>
                <ThemedText style={styles.summaryLabel}>Ghế</ThemedText>
                <ThemedText style={styles.summaryValue}>{selectedSeats.map(seatLabel).join(', ')}</ThemedText>
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

            <ThemedView style={[styles.payosCard, isDark && styles.cardDark]}>
              <IconSymbol name="creditcard.fill" size={24} color={theme.tint} />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <ThemedText style={styles.productName}>Thanh toán PayOS</ThemedText>
                <ThemedText style={styles.productDesc}>App sẽ mở cổng thanh toán của BE.</ThemedText>
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
            <ThemedText style={styles.confirmButtonText}>{step === 4 ? 'Thanh toán' : 'Tiếp tục'}</ThemedText>
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
  showtimeTime: { fontSize: 17, fontWeight: '800' },
  showtimeMeta: { fontSize: 13, opacity: 0.6, marginTop: 4 },
  showtimePrice: { fontSize: 13, fontWeight: '700' },
  screenContainer: { alignItems: 'center', marginBottom: 20, marginTop: 10 },
  screen: { width: '80%', height: 4, borderRadius: 2 },
  screenText: { marginTop: 8, fontSize: 10, letterSpacing: 6, opacity: 0.5 },
  seatsContainer: { gap: 8 },
  row: { flexDirection: 'row', alignItems: 'center' },
  rowLabel: { width: 24, fontSize: 12, opacity: 0.5 },
  seatsRow: { flexDirection: 'row', paddingVertical: 2 },
  seat: {
    width: 32,
    height: 32,
    borderWidth: 1.5,
    borderRadius: 8,
    marginHorizontal: 3,
    justifyContent: 'center',
    alignItems: 'center',
  },
  doubleSeat: { width: 66 },
  seatText: { fontSize: 9, fontWeight: 'bold' },
  legendRow: { flexDirection: 'row', justifyContent: 'center', gap: 14, marginTop: 18 },
  legendLabel: { fontSize: 12, opacity: 0.6 },
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
