import React, { useState, useMemo, useEffect } from 'react';
import RealBookingScreen from '@/screens/RealBookingScreen';
import { View, StyleSheet, Pressable, ScrollView, SafeAreaView, Alert, Image, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter, Stack, Href } from 'expo-router';
import { MOVIES , Movie } from '@/mocks/movies';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { ThemedText } from '@/components/base/themed-text';
import { ThemedView } from '@/components/base/themed-view';
import { IconSymbol } from '@/components/base/icon-symbol';
import { useTickets, Ticket } from '@/context/TicketContext';

import { movieService } from '@/services/movieService';


// Cấu trúc ghế
const ROWS_NORMAL = ['A', 'B', 'C'];
const ROWS_VIP = ['D', 'E', 'F', 'G'];
const ROWS_DOUBLE = ['H'];
const COLS = 8;
const COLS_DOUBLE = 4;

const PRICES = {
  NORMAL: 100000,
  VIP: 150000,
  DOUBLE: 350000,
};

// Sản phẩm đi kèm
const PRODUCTS = [
  { id: 'p1', name: 'Combo Đơn', description: '1 Bắp lớn + 1 Nước ngọt lớn', price: 85000, image: 'https://images.unsplash.com/photo-1572177191856-3cde618dee1f?w=400' },
  { id: 'p2', name: 'Combo Đôi', description: '1 Bắp lớn + 2 Nước ngọt lớn', price: 115000, image: 'https://aeonmall-binhtan.com.vn/wp-content/uploads/2020/10/t9-1.jpg' },
  { id: 'p3', name: 'Nước ngọt', description: 'Pepsi / Coca / Sprite (Size L)', price: 35000, image: 'https://cdn.tgdd.vn/Products/Images/2443/76467/bhx/nuoc-ngot-coca-cola-320ml-202308151410191834.jpg' },
];

// Phương thức thanh toán
const PAYMENT_METHODS = [
  { id: 'momo', name: 'Ví MoMo', icon: 'https://upload.wikimedia.org/wikipedia/vi/f/fe/MoMo_Logo.png' },
  { id: 'zalopay', name: 'ZaloPay', icon: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d0/Logo_ZaloPay.svg/2048px-Logo_ZaloPay.svg.png' },
  { id: 'vnpay', name: 'VNPay', icon: 'https://vnpay.vn/s1/statics.vnpay.vn/2023/6/0ox9x9s9ed611686559383349.png' },
  { id: 'card', name: 'Thẻ Quốc tế (Visa/Master)', icon: 'https://w7.pngtree.com/pngtree/png-images/20241011/png-clipart-credit-card-icon-design-on-transparent-background-payment-icon-symbol-concept-vector-design-image_13271714.png' },
];

const SOLD_SEATS = ['A3', 'B5', 'D4', 'E2', 'F7', 'H2'];
const DATES = ['20 Th10', '21 Th10', '22 Th10', '23 Th10', '24 Th10'];
const TIMES = ['10:00', '13:30', '16:45', '19:30', '21:00'];

export default RealBookingScreen;

export function LegacyBookingScreen() {
  const { id } = useLocalSearchParams();
  const [movie, setMovie] = useState<Movie | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { addTicket } = useTickets();
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const isDark = colorScheme === 'dark';

  useEffect(() => {
    const fetchMovie = async () => {
      if (!id) return;
      try {
        const data = await movieService.getMovieDetail(id as string);
        if (data) setMovie(data);
      } catch (error) {
        console.warn('Using mock movie for booking:', error);
        setMovie(MOVIES.find(m => m.id === id) || null);
      } finally {
        setLoading(false);
      }
    };
    fetchMovie();
  }, [id]);

  const [step, setStep] = useState(1); // 1: Showtime, 2: Seats, 3: Products, 4: Payment
  const [selectedSeats, setSelectedSeats] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState(DATES[0]);
  const [selectedTime, setSelectedTime] = useState(TIMES[0]);
  const [cart, setCart] = useState<{ [key: string]: number }>({});
  const [paymentMethod, setPaymentMethod] = useState(PAYMENT_METHODS[0].id);

  const toggleSeat = (seatId: string) => {
    if (SOLD_SEATS.includes(seatId)) return;
    if (selectedSeats.includes(seatId)) {
      setSelectedSeats(selectedSeats.filter(s => s !== seatId));
    } else {
      setSelectedSeats([...selectedSeats, seatId]);
    }
  };

  const updateCart = (productId: string, delta: number) => {
    const currentQty = cart[productId] || 0;
    const newQty = Math.max(0, currentQty + delta);
    setCart({ ...cart, [productId]: newQty });
  };

  const seatTotal = useMemo(() => {
    return selectedSeats.reduce((total, seatId) => {
      const row = seatId[0];
      if (ROWS_NORMAL.includes(row)) return total + PRICES.NORMAL;
      if (ROWS_VIP.includes(row)) return total + PRICES.VIP;
      if (ROWS_DOUBLE.includes(row)) return total + PRICES.DOUBLE;
      return total;
    }, 0);
  }, [selectedSeats]);

  const productTotal = useMemo(() => {
    return Object.keys(cart).reduce((total, id) => {
      const product = PRODUCTS.find(p => p.id === id);
      return total + (product?.price || 0) * cart[id];
    }, 0);
  }, [cart]);

  const grandTotal = seatTotal + productTotal;

  const handleCancel = () => {
    Alert.alert('Hủy đơn hàng', 'Bạn có chắc chắn muốn hủy quá trình đặt vé này không?', [
      { text: 'Tiếp tục mua', style: 'cancel' },
      { text: 'Hủy đơn', style: 'destructive', onPress: () => router.back() }
    ]);
  };

  const handlePayment = () => {
    Alert.alert(
      'Đang chuyển đến cổng thanh toán',
      `Hệ thống đang kết nối với ${PAYMENT_METHODS.find(m => m.id === paymentMethod)?.name}...`,
      [
        { text: 'Hủy', style: 'cancel' },
        { 
          text: 'Tiếp tục', 
          onPress: () => {
            // Tạo vé mới
            const newTicket: Ticket = {
              id: Math.random().toString(36).substr(2, 9).toUpperCase(),
              movieId: movie?.id || '',
              movieTitle: movie?.title || '',
              moviePoster: movie?.poster || '',
              date: selectedDate,
              time: selectedTime,
              seats: selectedSeats,
              totalPrice: grandTotal,
              paymentMethod: PAYMENT_METHODS.find(m => m.id === paymentMethod)?.name || '',
              bookingDate: new Date().toLocaleDateString('vi-VN'),
              status: 'active',
              qrCode: '',
            };
            
            addTicket(newTicket);

            Alert.alert('Thanh toán thành công', 'Cảm ơn bạn đã đặt vé!', [
              { text: 'Xem vé của tôi', onPress: () => router.replace('/user/(tabs)/tickets' as Href) }
            ]);
          } 
        }
      ]
    );
  };

  const handleNext = () => {
    if (step === 1 && (!selectedDate || !selectedTime)) {
      Alert.alert('Thông báo', 'Vui lòng chọn suất chiếu.');
      return;
    }
    if (step === 2 && selectedSeats.length === 0) {
      Alert.alert('Thông báo', 'Vui lòng chọn ghế.');
      return;
    }
    if (step === 4) {
      handlePayment();
      return;
    }
    setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
    else router.back();
  };

  if (loading) {
    return <ThemedView style={[styles.container, { alignItems: 'center', justifyContent: 'center' }]}><ActivityIndicator size="large" color={theme.tint} /></ThemedView>;
  }

  if (!movie) return null;

  const renderSeat = (seatId: string, isDouble = false) => {
    const isSelected = selectedSeats.includes(seatId);
    const isSold = SOLD_SEATS.includes(seatId);
    const row = seatId[0];
    let seatColor = '#8E8E93';
    if (!isSold) {
      if (isSelected) seatColor = '#34C759';
      else if (ROWS_NORMAL.includes(row)) seatColor = '#007AFF';
      else if (ROWS_VIP.includes(row)) seatColor = '#FF9500';
      else if (ROWS_DOUBLE.includes(row)) seatColor = '#FF3B30';
    }

    return (
      <Pressable
        key={seatId}
        style={[
          styles.seat,
          isDouble && styles.doubleSeat,
          { borderColor: seatColor },
          (isSelected || isSold) && { backgroundColor: seatColor }
        ]}
        onPress={() => toggleSeat(seatId)}
      >
        <ThemedText style={[
          styles.seatText, 
          (isSelected || isSold) && { color: '#FFF' },
          !isSelected && !isSold && { color: seatColor },
          { lineHeight: undefined }
        ]}>
          {seatId}
        </ThemedText>
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <Stack.Screen options={{ 
        title: step === 1 ? 'Suất chiếu' : step === 2 ? 'Chọn ghế' : step === 3 ? 'Bắp & Nước' : 'Thanh toán',
        headerLeft: () => (
          <Pressable onPress={handleBack} style={{ marginLeft: 16 }}>
            <IconSymbol name="chevron.left" size={24} color={theme.text} />
          </Pressable>
        ),
        headerRight: () => (
          <Pressable onPress={handleCancel} style={{ marginRight: 16 }}>
            <ThemedText style={{ color: '#FF3B30', fontWeight: 'bold' }}>Hủy đơn</ThemedText>
          </Pressable>
        )
      }} />

      {/* Progress Bar */}
      <View style={styles.progressBar}>
        {[1, 2, 3, 4].map((s) => (
          <View key={s} style={[
            styles.progressStep, 
            { backgroundColor: s <= step ? theme.tint : (isDark ? '#333' : '#eee') }
          ]} />
        ))}
      </View>
      
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        
        {/* STEP 1: SHOWTIME */}
        {step === 1 && (
          <View style={styles.stepContainer}>
            <ThemedText type="subtitle" style={styles.sectionTitle}>Chọn ngày</ThemedText>
            <View style={styles.chipGrid}>
              {DATES.map((date) => (
                <Pressable
                  key={date}
                  style={[
                    styles.chip,
                    { borderColor: theme.tint + '40' },
                    selectedDate === date && { backgroundColor: theme.tint, borderColor: theme.tint }
                  ]}
                  onPress={() => setSelectedDate(date)}
                >
                  <ThemedText style={[styles.chipText, selectedDate === date && { color: '#FFF' }]}>{date}</ThemedText>
                </Pressable>
              ))}
            </View>

            <ThemedText type="subtitle" style={[styles.sectionTitle, { marginTop: 30 }]}>Chọn suất chiếu</ThemedText>
            <View style={styles.chipGrid}>
              {TIMES.map((time) => (
                <Pressable
                  key={time}
                  style={[
                    styles.chip,
                    { borderColor: theme.tint + '40' },
                    selectedTime === time && { backgroundColor: theme.tint, borderColor: theme.tint }
                  ]}
                  onPress={() => setSelectedTime(time)}
                >
                  <ThemedText style={[styles.chipText, selectedTime === time && { color: '#FFF' }]}>{time}</ThemedText>
                </Pressable>
              ))}
            </View>
          </View>
        )}

        {/* STEP 2: SEATS */}
        {step === 2 && (
          <View style={styles.stepContainer}>
            <View style={styles.screenContainer}>
              <View style={[styles.screen, { backgroundColor: theme.tint }]} />
              <ThemedText style={styles.screenText}>MÀN HÌNH</ThemedText>
            </View>

            <View style={styles.seatsContainer}>
              {[...ROWS_NORMAL, ...ROWS_VIP].map((row) => (
                <View key={row} style={styles.row}>
                  <ThemedText style={styles.rowLabel}>{row}</ThemedText>
                  <View style={styles.seatsRow}>
                    {Array.from({ length: COLS }).map((_, col) => {
                      const seatId = `${row}${col + 1}`;
                      const isGap = col === 2 || col === 6;
                      return (
                        <View key={seatId} style={{ flexDirection: 'row' }}>
                          {renderSeat(seatId)}
                          {isGap && <View style={{ width: 10 }} />}
                        </View>
                      );
                    })}
                  </View>
                </View>
              ))}
              {ROWS_DOUBLE.map((row) => (
                <View key={row} style={styles.row}>
                  <ThemedText style={styles.rowLabel}>{row}</ThemedText>
                  <View style={styles.seatsRow}>
                    {Array.from({ length: COLS_DOUBLE }).map((_, col) => renderSeat(`${row}${col + 1}`, true))}
                  </View>
                </View>
              ))}
            </View>

            <View style={styles.legendContainer}>
              <View style={styles.legendRow}>
                <View style={styles.legendItem}><View style={[styles.legendBox, { borderColor: '#007AFF' }]} /><ThemedText style={styles.legendLabel}>Thường</ThemedText></View>
                <View style={styles.legendItem}><View style={[styles.legendBox, { borderColor: '#FF9500' }]} /><ThemedText style={styles.legendLabel}>VIP</ThemedText></View>
                <View style={styles.legendItem}><View style={[styles.legendBox, { borderColor: '#FF3B30', width: 24 }]} /><ThemedText style={styles.legendLabel}>Đôi</ThemedText></View>
              </View>
            </View>
          </View>
        )}

        {/* STEP 3: PRODUCTS */}
        {step === 3 && (
          <View style={styles.stepContainer}>
            <ThemedText type="subtitle" style={styles.sectionTitle}>Bắp & Nước</ThemedText>
            {PRODUCTS.map((product) => (
              <ThemedView key={product.id} style={[styles.productItem, isDark && styles.productItemDark]}>
                <Image source={{ uri: product.image }} style={styles.productImage} />
                <View style={styles.productInfo}>
                  <ThemedText style={styles.productName}>{product.name}</ThemedText>
                  <ThemedText style={styles.productDesc}>{product.description}</ThemedText>
                  <ThemedText style={[styles.productPrice, { color: theme.tint }]}>{product.price.toLocaleString('vi-VN')}đ</ThemedText>
                </View>
                <View style={styles.qtyContainer}>
                  <Pressable onPress={() => updateCart(product.id, -1)} style={styles.qtyBtn}>
                    <IconSymbol name="minus" size={16} color={theme.text} />
                  </Pressable>
                  <ThemedText style={styles.qtyText}>{cart[product.id] || 0}</ThemedText>
                  <Pressable onPress={() => updateCart(product.id, 1)} style={styles.qtyBtn}>
                    <IconSymbol name="plus" size={16} color={theme.text} />
                  </Pressable>
                </View>
              </ThemedView>
            ))}
          </View>
        )}

        {/* STEP 4: PAYMENT */}
        {step === 4 && (
          <View style={styles.stepContainer}>
            <ThemedText type="subtitle" style={styles.sectionTitle}>Tóm tắt đơn hàng</ThemedText>
            <ThemedView style={[styles.summaryCard, isDark && styles.summaryCardDark]}>
              <View style={styles.summaryRow}>
                <ThemedText style={styles.summaryLabel}>Phim:</ThemedText>
                <ThemedText style={styles.summaryValue}>{movie.title}</ThemedText>
              </View>
              <View style={styles.summaryRow}>
                <ThemedText style={styles.summaryLabel}>Suất chiếu:</ThemedText>
                <ThemedText style={styles.summaryValue}>{selectedTime}, {selectedDate}</ThemedText>
              </View>
              <View style={styles.summaryRow}>
                <ThemedText style={styles.summaryLabel}>Ghế:</ThemedText>
                <ThemedText style={styles.summaryValue}>{selectedSeats.join(', ')}</ThemedText>
              </View>
              {Object.keys(cart).some(id => cart[id] > 0) && (
                <View style={[styles.summaryRow, { borderTopWidth: 1, borderTopColor: '#00000010', paddingTop: 10, marginTop: 10 }]}>
                  <ThemedText style={styles.summaryLabel}>Bắp & Nước:</ThemedText>
                  <View style={{ flex: 1, alignItems: 'flex-end' }}>
                    {Object.keys(cart).map(id => cart[id] > 0 && (
                      <ThemedText key={id} style={styles.summaryValue}>
                        {PRODUCTS.find(p => p.id === id)?.name} x{cart[id]}
                      </ThemedText>
                    ))}
                  </View>
                </View>
              )}
            </ThemedView>

            <ThemedText type="subtitle" style={[styles.sectionTitle, { marginTop: 30 }]}>Phương thức thanh toán</ThemedText>
            {PAYMENT_METHODS.map((method) => (
              <Pressable 
                key={method.id} 
                style={[
                  styles.paymentItem, 
                  isDark && styles.paymentItemDark,
                  paymentMethod === method.id && { borderColor: theme.tint, borderWidth: 2 }
                ]}
                onPress={() => setPaymentMethod(method.id)}
              >
                <Image source={{ uri: method.icon }} style={styles.paymentIcon} />
                <ThemedText style={styles.paymentName}>{method.name}</ThemedText>
                <View style={[
                  styles.radioButton, 
                  { borderColor: theme.tabIconDefault },
                  paymentMethod === method.id && { borderColor: theme.tint, backgroundColor: theme.tint }
                ]}>
                  {paymentMethod === method.id && <View style={styles.radioButtonInner} />}
                </View>
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Footer */}
      <ThemedView style={[styles.footer, isDark && styles.footerDark]}>
        <View style={{ flex: 1 }}>
          <ThemedText style={styles.totalLabel}>Tổng cộng</ThemedText>
          <ThemedText type="title" style={[styles.totalPrice, { color: theme.tint, lineHeight: undefined }]}>
            {grandTotal.toLocaleString('vi-VN')}đ
          </ThemedText>
        </View>
        
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Pressable 
            style={({ pressed }) => [
              styles.confirmButton, 
              { backgroundColor: theme.tint, opacity: pressed ? 0.8 : 1 }
            ]} 
            onPress={handleNext}
          >
            <ThemedText style={styles.confirmButtonText}>
              {step === 4 ? 'Thanh toán' : 'Tiếp tục'}
            </ThemedText>
          </Pressable>
        </View>
      </ThemedView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  progressBar: { flexDirection: 'row', paddingHorizontal: 20, height: 4, marginTop: 10 },
  progressStep: { flex: 1, height: 4, borderRadius: 2, marginHorizontal: 2 },
  scrollContent: { paddingBottom: 20 },
  stepContainer: { paddingHorizontal: 20, paddingTop: 10 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15 },
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  chip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, borderWidth: 1, marginRight: 10, marginBottom: 10 },
  chipText: { fontSize: 14, fontWeight: '600' },
  screenContainer: { alignItems: 'center', marginBottom: 20, marginTop: 10 },
  screen: { width: '80%', height: 4, borderRadius: 2, elevation: 5 },
  screenText: { marginTop: 8, fontSize: 10, letterSpacing: 6, opacity: 0.5 },
  seatsContainer: { alignItems: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  rowLabel: { width: 20, fontSize: 12, opacity: 0.5 },
  seatsRow: { flexDirection: 'row', marginLeft: 5 },
  seat: { width: 28, height: 28, borderWidth: 1.5, borderRadius: 6, marginHorizontal: 3, justifyContent: 'center', alignItems: 'center' },
  doubleSeat: { width: 62 },
  seatText: { fontSize: 8, fontWeight: 'bold' },
  legendContainer: { marginTop: 20, alignItems: 'center' },
  legendRow: { flexDirection: 'row' },
  legendItem: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 8 },
  legendBox: { width: 14, height: 14, borderWidth: 1.5, borderRadius: 3 },
  legendLabel: { marginLeft: 5, fontSize: 11, opacity: 0.7 },
  productItem: { flexDirection: 'row', padding: 12, borderRadius: 16, backgroundColor: '#FFF', marginBottom: 12, alignItems: 'center' },
  productItemDark: { backgroundColor: '#1C1C1E' },
  productImage: { width: 70, height: 70, borderRadius: 12 },
  productInfo: { flex: 1, marginLeft: 15 },
  productName: { fontSize: 16, fontWeight: 'bold' },
  productDesc: { fontSize: 12, opacity: 0.6, marginTop: 2 },
  productPrice: { fontSize: 15, fontWeight: 'bold', marginTop: 4 },
  qtyContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#00000005', borderRadius: 10, padding: 4 },
  qtyBtn: { width: 28, height: 28, justifyContent: 'center', alignItems: 'center' },
  qtyText: { marginHorizontal: 12, fontWeight: 'bold', fontSize: 16 },
  summaryCard: { padding: 16, borderRadius: 20, backgroundColor: '#FFF', elevation: 2 },
  summaryCardDark: { backgroundColor: '#1C1C1E' },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  summaryLabel: { fontSize: 14, opacity: 0.6 },
  summaryValue: { fontSize: 14, fontWeight: 'bold', textAlign: 'right' },
  paymentItem: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 16, backgroundColor: '#FFF', marginBottom: 12, borderWidth: 2, borderColor: 'transparent' },
  paymentItemDark: { backgroundColor: '#1C1C1E' },
  paymentIcon: { width: 40, height: 40, borderRadius: 8 },
  paymentName: { flex: 1, marginLeft: 16, fontSize: 16, fontWeight: '500' },
  radioButton: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, justifyContent: 'center', alignItems: 'center' },
  radioButtonInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#FFF' },
  footer: { padding: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#FFF', borderTopWidth: 1, borderTopColor: '#00000005' },
  footerDark: { backgroundColor: '#1C1C1E' },
  totalLabel: { fontSize: 12, opacity: 0.6 },
  totalPrice: { fontSize: 22, fontWeight: '800' },
  confirmButton: { paddingHorizontal: 32, paddingVertical: 14, borderRadius: 16 },
  confirmButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' },
});
