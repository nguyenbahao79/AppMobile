import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator, Alert, Platform, Pressable,
  SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import { Image } from 'expo-image';
import { Href, router } from 'expo-router';
import * as ExpoLinking from 'expo-linking';

import { IconSymbol } from '@/components/base/icon-symbol';
import { useAuth } from '@/context/AuthContext';
import { bookingService, Product } from '@/services/bookingService';
import { cinemaService, Cinema } from '@/services/cinemaService';
import { foodOrderService } from '@/services/foodOrderService';
import { API_ENDPOINTS } from '@/api/config';
import PayosQrModal from '@/components/PayosQrModal';

/* ── Theme ───────────────────────────────────────────────────────── */
const C = {
  bg:      '#0f102a',
  card:    '#141632',
  border:  'rgba(255,255,255,0.07)',
  purple:  '#7b1fa2',
  pink:    '#e91e8c',
  yellow:  '#d4e219',
  text:    '#FFFFFF',
  muted:   'rgba(255,255,255,0.45)',
  divider: 'rgba(255,255,255,0.06)',
} as const;

const cardShadow = Platform.select({
  ios:     { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 12 },
  android: { elevation: 7 },
}) ?? {};

const formatMoney = (value?: number) => `${Number(value || 0).toLocaleString('vi-VN')}đ`;

export default function FoodOrderScreen() {
  const { session } = useAuth();

  const [step, setStep] = useState(1);
  const [cinemas, setCinemas] = useState<Cinema[]>([]);
  const [selectedCinemaId, setSelectedCinemaId] = useState<number | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<Record<number, number>>({});
  const [loading, setLoading] = useState(true);
  const [stepLoading, setStepLoading] = useState(false);
  const [payosQr, setPayosQr] = useState<{ code: string; orderCode: number; amountVnd: number } | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        const data = await cinemaService.getCinemas();
        if (!mounted) return;
        setCinemas(data);
        setSelectedCinemaId(data[0]?.cinemaId ?? null);
      } catch (error: any) {
        Alert.alert('Không tải được danh sách rạp', error.message || 'Vui lòng thử lại.');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (!selectedCinemaId) return;
    let mounted = true;
    (async () => {
      setStepLoading(true);
      setCart({});
      try {
        const data = await bookingService.getProducts(selectedCinemaId);
        if (mounted) setProducts(data);
      } catch (error: any) {
        Alert.alert('Không tải được sản phẩm', error.message || 'Vui lòng thử lại.');
      } finally {
        if (mounted) setStepLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [selectedCinemaId]);

  const cartLines = useMemo(
    () =>
      Object.entries(cart)
        .map(([productId, quantity]) => ({ productId: Number(productId), quantity }))
        .filter(item => item.productId > 0 && item.quantity > 0),
    [cart]
  );

  const total = useMemo(
    () =>
      cartLines.reduce((sum, item) => {
        const product = products.find(p => p.productId === item.productId);
        return sum + Number(product?.price || 0) * item.quantity;
      }, 0),
    [cartLines, products]
  );

  const cartItemCount = cartLines.reduce((sum, l) => sum + l.quantity, 0);

  const updateCart = (productId: number, delta: number) => {
    setCart(current => ({ ...current, [productId]: Math.max(0, (current[productId] || 0) + delta) }));
  };

  const handleCheckout = async () => {
    if (!session?.user) {
      Alert.alert('Cần đăng nhập', 'Vui lòng đăng nhập để đặt bắp nước online.', [
        { text: 'Đăng nhập', onPress: () => router.replace('/(auth)/login' as Href) },
        { text: 'Ở lại', style: 'cancel' },
      ]);
      return;
    }
    if (!selectedCinemaId || cartLines.length === 0) return;
    setStepLoading(true);
    try {
      const returnUrl = ExpoLinking.createURL('payment-return');
      const response = await foodOrderService.checkout({
        cinemaId: selectedCinemaId,
        items: cartLines,
        returnUrl,
        cancelUrl: returnUrl,
      });
      const qrCode = response.payos?.qrCode;
      const payosOrderCode = response.payosOrderCode;
      if (qrCode && payosOrderCode) {
        setPayosQr({ code: qrCode, orderCode: payosOrderCode, amountVnd: response.amountVnd || 0 });
      } else {
        Alert.alert('Đã tạo đơn', `Mã đơn: ${response.payosOrderCode || response.orderOnlineId}`);
      }
    } catch (error: any) {
      Alert.alert('Không tạo được đơn thanh toán', error.message || 'Vui lòng thử lại.');
    } finally {
      setStepLoading(false);
    }
  };

  const handlePayosPaid = () => {
    setPayosQr(null);
    Alert.alert('Thanh toán thành công', 'Đơn bắp nước của bạn đã được xác nhận.', [
      { text: 'OK', onPress: () => router.back() },
    ]);
  };

  const handlePayosCancel = (reason: 'user' | 'expired' | 'cancelled_on_payos') => {
    const orderCode = payosQr?.orderCode;
    setPayosQr(null);
    if (orderCode) foodOrderService.cancelPendingOrder(orderCode).catch(() => {});
    if (reason === 'expired') {
      Alert.alert('Hết hạn thanh toán', 'Mã QR đã hết hạn và đơn bắp nước đã được hủy.');
    } else if (reason === 'cancelled_on_payos') {
      Alert.alert('Đã hủy thanh toán', 'Đơn bắp nước đã được hủy.');
    }
  };

  const handleNext = () => {
    if (step === 1) {
      if (!selectedCinemaId) { Alert.alert('Thông báo', 'Vui lòng chọn rạp.'); return; }
      setStep(2);
      return;
    }
    if (step === 2) {
      if (cartLines.length === 0) { Alert.alert('Thông báo', 'Vui lòng chọn ít nhất một sản phẩm.'); return; }
      handleCheckout();
    }
  };

  const handleBack = () => {
    if (step > 1) { setStep(s => s - 1); return; }
    router.back();
  };

  if (loading) {
    return (
      <SafeAreaView style={s.safe}>
        <View style={s.center}>
          <ActivityIndicator size="large" color={C.purple} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.safe}>
      {/* Header */}
      <View style={s.header}>
        <Pressable onPress={handleBack} style={s.backBtn} hitSlop={10}>
          <IconSymbol name="chevron.left" size={20} color={C.text} />
        </Pressable>
        <Text style={s.headerTitle}>
          {step === 1
            ? <><Text style={{ color: C.yellow }}>CHỌN</Text>{' RẠP'}</>
            : <>{'ĐẶT '}<Text style={{ color: C.pink }}>BẮP NƯỚC</Text></>
          }
        </Text>
        {step === 2 && cartItemCount > 0 ? (
          <View style={s.cartBadge}>
            <IconSymbol name="cart.fill" size={13} color={C.purple} />
            <Text style={s.cartBadgeText}>{cartItemCount}</Text>
          </View>
        ) : <View style={{ width: 40 }} />}
      </View>

      {/* Progress bar */}
      <View style={s.progressWrap}>
        {[1, 2].map(i => (
          <View key={i} style={[s.progressStep, i <= step && { backgroundColor: C.purple }]} />
        ))}
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scrollContent}>
        {/* ── Step 1: cinema selection ── */}
        {step === 1 && (
          <View style={s.stepWrap}>
            <Text style={s.stepLabel}>CHỌN RẠP ĐẶT BẮP NƯỚC</Text>
            {cinemas.length === 0 ? (
              <View style={s.emptyWrap}>
                <IconSymbol name="mappin.and.ellipse" size={40} color={C.muted} />
                <Text style={s.emptyText}>Chưa có rạp nào để chọn.</Text>
              </View>
            ) : (
              cinemas.map(cinema => {
                const selected = selectedCinemaId === cinema.cinemaId;
                return (
                  <Pressable
                    key={cinema.cinemaId}
                    style={[s.cinemaCard, selected && s.cinemaCardSelected]}
                    onPress={() => setSelectedCinemaId(cinema.cinemaId)}
                  >
                    <View style={[s.cinemaIconWrap, selected && { backgroundColor: C.purple + '30' }]}>
                      <IconSymbol name="mappin.and.ellipse" size={22} color={selected ? C.purple : C.muted} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[s.cinemaName, selected && { color: C.purple }]}>{cinema.name}</Text>
                      <Text style={s.cinemaAddress} numberOfLines={2}>{cinema.address}</Text>
                    </View>
                    {selected && <IconSymbol name="checkmark.circle.fill" size={20} color={C.purple} />}
                  </Pressable>
                );
              })
            )}
          </View>
        )}

        {/* ── Step 2: product selection ── */}
        {step === 2 && (
          <View style={s.stepWrap}>
            {stepLoading ? (
              <View style={s.center}>
                <ActivityIndicator size="large" color={C.purple} />
              </View>
            ) : products.length === 0 ? (
              <View style={s.emptyWrap}>
                <IconSymbol name="cart.fill" size={40} color={C.muted} />
                <Text style={s.emptyText}>Rạp này chưa có sản phẩm bán.</Text>
              </View>
            ) : (
              <>
                <Text style={s.stepLabel}>THỰC ĐƠN BẮP NƯỚC</Text>
                {products.map(product => {
                  const qty = cart[product.productId] || 0;
                  return (
                    <View key={product.productId} style={s.productCard}>
                      <Image
                        source={product.image || 'https://placehold.co/140x140?text=Snack'}
                        style={s.productImg}
                        contentFit="cover"
                      />
                      <View style={s.productInfo}>
                        <Text style={s.productName}>{product.name}</Text>
                        {!!product.description && (
                          <Text style={s.productDesc} numberOfLines={2}>{product.description}</Text>
                        )}
                        <Text style={s.productPrice}>{formatMoney(product.price)}</Text>
                      </View>
                      <View style={s.qtyWrap}>
                        {qty === 0 ? (
                          <TouchableOpacity
                            style={s.addBtn}
                            onPress={() => updateCart(product.productId, 1)}
                            activeOpacity={0.8}
                          >
                            <IconSymbol name="plus" size={13} color="#fff" />
                            <Text style={s.addBtnText}>Thêm</Text>
                          </TouchableOpacity>
                        ) : (
                          <View style={s.qtyControl}>
                            <TouchableOpacity
                              style={s.qtyBtnSm}
                              onPress={() => updateCart(product.productId, -1)}
                              activeOpacity={0.8}
                            >
                              <IconSymbol name="minus" size={12} color={C.text} />
                            </TouchableOpacity>
                            <Text style={s.qtyNum}>{qty}</Text>
                            <TouchableOpacity
                              style={[s.qtyBtnSm, { backgroundColor: C.purple }]}
                              onPress={() => updateCart(product.productId, 1)}
                              activeOpacity={0.8}
                            >
                              <IconSymbol name="plus" size={12} color="#fff" />
                            </TouchableOpacity>
                          </View>
                        )}
                      </View>
                    </View>
                  );
                })}
                <Text style={s.expiryNote}>Đơn sẽ tự hủy sau 5 phút nếu chưa hoàn tất thanh toán.</Text>
              </>
            )}
          </View>
        )}
      </ScrollView>

      {/* Footer */}
      <View style={s.footer}>
        <View>
          <Text style={s.totalLabel}>Tổng cộng</Text>
          <Text style={s.totalPrice}>{formatMoney(total)}</Text>
          {cartItemCount > 0 && <Text style={s.cartCount}>{cartItemCount} sản phẩm</Text>}
        </View>
        <TouchableOpacity
          style={[s.actionBtn, stepLoading && { opacity: 0.6 }]}
          onPress={handleNext}
          disabled={stepLoading}
          activeOpacity={0.85}
        >
          {stepLoading
            ? <ActivityIndicator color="#fff" />
            : <Text style={s.actionBtnText}>{step === 2 ? 'Thanh toán' : 'Tiếp tục'}</Text>
          }
        </TouchableOpacity>
      </View>

      <PayosQrModal
        visible={Boolean(payosQr)}
        qrCode={payosQr?.code ?? null}
        amountVnd={payosQr?.amountVnd}
        paymentQrUrl={API_ENDPOINTS.PAYMENT_QR_FOOD_ORDERS}
        onCheckStatus={() => foodOrderService.checkPayosStatus(payosQr!.orderCode)}
        onPaid={handlePayosPaid}
        onCancel={handlePayosCancel}
      />
    </SafeAreaView>
  );
}

/* ── Styles ──────────────────────────────────────────────────────── */
const s = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: C.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },

  /* Header */
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.divider,
  },
  backBtn:     { width: 40, height: 40, justifyContent: 'center' },
  headerTitle: { fontSize: 15, fontWeight: '800', color: C.text, letterSpacing: 1 },
  cartBadge: {
    width: 40, height: 28, borderRadius: 10,
    backgroundColor: C.purple + '25',
    flexDirection: 'row', gap: 3,
    justifyContent: 'center', alignItems: 'center',
  },
  cartBadgeText: { fontSize: 12, fontWeight: '700', color: C.purple },

  /* Progress */
  progressWrap: { flexDirection: 'row', paddingHorizontal: 16, gap: 6, paddingVertical: 10 },
  progressStep: { flex: 1, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.1)' },

  /* Content */
  scrollContent: { paddingBottom: 24 },
  stepWrap:      { paddingHorizontal: 16, paddingTop: 10 },
  stepLabel: {
    fontSize: 11, fontWeight: '800', color: C.muted, letterSpacing: 1.5,
    textTransform: 'uppercase', marginBottom: 12,
  },

  /* Empty */
  emptyWrap: { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyText: { fontSize: 14, color: C.muted, textAlign: 'center' },

  /* Cinema card */
  cinemaCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: C.card, borderRadius: 16, padding: 14, marginBottom: 10,
    borderWidth: 1, borderColor: C.border,
    ...cardShadow,
  },
  cinemaCardSelected: {
    borderColor: C.purple,
    backgroundColor: C.purple + '0D',
  },
  cinemaIconWrap: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.06)',
    justifyContent: 'center', alignItems: 'center',
  },
  cinemaName:    { fontSize: 14, fontWeight: '700', color: C.text, marginBottom: 3 },
  cinemaAddress: { fontSize: 12, color: C.muted, lineHeight: 17 },

  /* Product card */
  productCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: C.card, borderRadius: 16, padding: 12, marginBottom: 10,
    borderWidth: 1, borderColor: C.border,
    ...cardShadow,
  },
  productImg:  { width: 72, height: 72, borderRadius: 12, backgroundColor: C.card },
  productInfo: { flex: 1 },
  productName: { fontSize: 14, fontWeight: '700', color: C.text, lineHeight: 19 },
  productDesc: { fontSize: 11, color: C.muted, marginTop: 3, lineHeight: 16 },
  productPrice:{ fontSize: 15, fontWeight: '800', color: C.pink, marginTop: 5 },

  /* Qty controls */
  qtyWrap: { alignItems: 'center' },
  addBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: C.purple, borderRadius: 10,
    paddingHorizontal: 11, paddingVertical: 8,
  },
  addBtnText: { fontSize: 12, fontWeight: '700', color: '#fff' },
  qtyControl: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 10, overflow: 'hidden',
  },
  qtyBtnSm: {
    width: 30, height: 30, justifyContent: 'center', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  qtyNum: { width: 28, textAlign: 'center', fontSize: 14, fontWeight: '800', color: C.text },

  expiryNote: { textAlign: 'center', fontSize: 11, color: C.muted, marginTop: 8, marginBottom: 4 },

  /* Footer */
  footer: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 16,
    backgroundColor: C.card,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.divider,
  },
  totalLabel: { fontSize: 11, color: C.muted, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  totalPrice: { fontSize: 22, fontWeight: '800', color: C.yellow, lineHeight: 28, marginTop: 2 },
  cartCount:  { fontSize: 11, color: C.muted, marginTop: 2 },
  actionBtn: {
    minWidth: 130, paddingHorizontal: 24, paddingVertical: 14,
    borderRadius: 14, backgroundColor: C.purple,
    alignItems: 'center', justifyContent: 'center',
    ...Platform.select({
      ios:     { shadowColor: C.purple, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.45, shadowRadius: 8 },
      android: { elevation: 6 },
    }),
  },
  actionBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});
