import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, SafeAreaView, ScrollView, StyleSheet, View } from 'react-native';
import { Href, Stack, useRouter } from 'expo-router';
import * as ExpoLinking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';

import { IconSymbol } from '@/components/base/icon-symbol';
import { ThemedText } from '@/components/base/themed-text';
import { ThemedView } from '@/components/base/themed-view';
import { Colors } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { bookingService, Product } from '@/services/bookingService';
import { cinemaService, Cinema } from '@/services/cinemaService';
import { foodOrderService } from '@/services/foodOrderService';

const formatMoney = (value?: number) => `${Number(value || 0).toLocaleString('vi-VN')}đ`;

export default function FoodOrderScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const isDark = colorScheme === 'dark';

  const [step, setStep] = useState(1);
  const [cinemas, setCinemas] = useState<Cinema[]>([]);
  const [selectedCinemaId, setSelectedCinemaId] = useState<number | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<Record<number, number>>({});
  const [loading, setLoading] = useState(true);
  const [stepLoading, setStepLoading] = useState(false);

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
    return () => {
      mounted = false;
    };
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
    return () => {
      mounted = false;
    };
  }, [selectedCinemaId]);

  const cartLines = useMemo(
    () =>
      Object.entries(cart)
        .map(([productId, quantity]) => ({ productId: Number(productId), quantity }))
        .filter((item) => item.productId > 0 && item.quantity > 0),
    [cart]
  );

  const total = useMemo(
    () =>
      cartLines.reduce((sum, item) => {
        const product = products.find((p) => p.productId === item.productId);
        return sum + Number(product?.price || 0) * item.quantity;
      }, 0),
    [cartLines, products]
  );

  const updateCart = (productId: number, delta: number) => {
    setCart((current) => ({ ...current, [productId]: Math.max(0, (current[productId] || 0) + delta) }));
  };

  const handleCheckout = async () => {
    if (!session?.user) {
      Alert.alert('Cần đăng nhập khách hàng', 'Vui lòng đăng nhập tài khoản khách để đặt bắp nước online.', [
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
      const checkoutUrl = response.payos?.checkoutUrl;
      const payosOrderCode = response.payosOrderCode;
      if (checkoutUrl && payosOrderCode) {
        const result = await WebBrowser.openAuthSessionAsync(checkoutUrl, returnUrl);
        try {
          await foodOrderService.confirmPayos(payosOrderCode);
          Alert.alert('Thanh toán thành công', 'Đơn bắp nước của bạn đã được xác nhận.', [
            { text: 'OK', onPress: () => router.back() },
          ]);
        } catch {
          if (result.type === 'success') {
            Alert.alert('Đang xử lý', 'Hệ thống đang xác nhận thanh toán với PayOS. Vui lòng kiểm tra lại sau ít phút.');
          } else {
            foodOrderService.cancelPendingOrder(payosOrderCode).catch(() => {});
            Alert.alert('Chưa thanh toán', 'Đơn bắp nước chưa được thanh toán và đã được hủy.');
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

  const handleNext = () => {
    if (step === 1) {
      if (!selectedCinemaId) {
        Alert.alert('Thông báo', 'Vui lòng chọn rạp.');
        return;
      }
      setStep(2);
      return;
    }
    if (step === 2) {
      if (cartLines.length === 0) {
        Alert.alert('Thông báo', 'Vui lòng chọn ít nhất một sản phẩm.');
        return;
      }
      handleCheckout();
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep((current) => current - 1);
      return;
    }
    router.back();
  };

  if (loading) {
    return (
      <ThemedView style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={theme.tint} />
      </ThemedView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <Stack.Screen
        options={{
          title: step === 1 ? 'Chọn rạp' : 'Chọn bắp nước',
          headerLeft: () => (
            <Pressable onPress={handleBack} style={styles.headerAction}>
              <IconSymbol name="chevron.left" size={24} color={theme.text} />
            </Pressable>
          ),
        }}
      />

      <View style={styles.progressBar}>
        {[1, 2].map((item) => (
          <View key={item} style={[styles.progressStep, { backgroundColor: item <= step ? theme.tint : isDark ? '#333' : '#eee' }]} />
        ))}
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {step === 1 && (
          <View style={styles.stepContainer}>
            {cinemas.length === 0 ? (
              <ThemedView style={[styles.emptyCard, isDark && styles.cardDark]}>
                <ThemedText>Chưa có rạp nào để chọn.</ThemedText>
              </ThemedView>
            ) : (
              cinemas.map((cinema) => (
                <Pressable
                  key={cinema.cinemaId}
                  style={[
                    styles.cinemaCard,
                    isDark && styles.cardDark,
                    selectedCinemaId === cinema.cinemaId && { borderColor: theme.tint, borderWidth: 2 },
                  ]}
                  onPress={() => setSelectedCinemaId(cinema.cinemaId)}
                >
                  <IconSymbol name="mappin.and.ellipse" size={20} color={theme.tint} />
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <ThemedText type="defaultSemiBold">{cinema.name}</ThemedText>
                    <ThemedText style={styles.address} numberOfLines={2}>{cinema.address}</ThemedText>
                  </View>
                </Pressable>
              ))
            )}
          </View>
        )}

        {step === 2 && (
          <View style={styles.stepContainer}>
            {stepLoading ? (
              <ActivityIndicator size="large" color={theme.tint} />
            ) : products.length === 0 ? (
              <ThemedView style={[styles.emptyCard, isDark && styles.cardDark]}>
                <ThemedText>Rạp này chưa có sản phẩm bán.</ThemedText>
              </ThemedView>
            ) : (
              products.map((product) => (
                <ThemedView key={product.productId} style={[styles.productItem, isDark && styles.cardDark]}>
                  <Image source={{ uri: product.image || 'https://placehold.co/140x140?text=Snack' }} style={styles.productImage} />
                  <View style={styles.productInfo}>
                    <ThemedText style={styles.productName}>{product.name}</ThemedText>
                    {!!product.description && <ThemedText style={styles.productDesc} numberOfLines={2}>{product.description}</ThemedText>}
                    <ThemedText style={[styles.productPrice, { color: theme.tint }]}>{formatMoney(product.price)}</ThemedText>
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
            {products.length > 0 && (
              <ThemedText style={styles.expiryNote}>
                Đơn sẽ tự hủy sau 5 phút nếu chưa hoàn tất thanh toán.
              </ThemedText>
            )}
          </View>
        )}
      </ScrollView>

      <ThemedView style={[styles.footer, isDark && styles.cardDark]}>
        <View style={{ flex: 1 }}>
          <ThemedText style={styles.totalLabel}>Tổng cộng</ThemedText>
          <ThemedText type="title" style={[styles.totalPrice, { color: theme.tint }]}>{formatMoney(total)}</ThemedText>
        </View>
        <Pressable
          style={[styles.confirmButton, { backgroundColor: theme.tint }, stepLoading && { opacity: 0.6 }]}
          onPress={handleNext}
          disabled={stepLoading}
        >
          {stepLoading ? <ActivityIndicator color="#FFF" /> : <ThemedText style={styles.confirmButtonText}>{step === 2 ? 'Thanh toán' : 'Tiếp tục'}</ThemedText>}
        </Pressable>
      </ThemedView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center' },
  headerAction: { paddingHorizontal: 16 },
  progressBar: { flexDirection: 'row', paddingHorizontal: 20, height: 4, marginTop: 10 },
  progressStep: { flex: 1, height: 4, borderRadius: 2, marginHorizontal: 2 },
  scrollContent: { paddingBottom: 24 },
  stepContainer: { paddingHorizontal: 20, paddingTop: 16 },
  emptyCard: { padding: 18, borderRadius: 18, backgroundColor: '#FFF' },
  cardDark: { backgroundColor: '#1C1C1E' },
  cinemaCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  address: { fontSize: 12, opacity: 0.6, marginTop: 4, lineHeight: 17 },
  productItem: { flexDirection: 'row', padding: 12, borderRadius: 16, backgroundColor: '#FFF', marginBottom: 12, alignItems: 'center' },
  productImage: { width: 70, height: 70, borderRadius: 12, backgroundColor: '#EEE' },
  productInfo: { flex: 1, marginLeft: 15 },
  productName: { fontSize: 16, fontWeight: 'bold' },
  productDesc: { fontSize: 12, opacity: 0.6, marginTop: 2 },
  productPrice: { fontSize: 15, fontWeight: 'bold', marginTop: 4 },
  qtyContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#00000008', borderRadius: 10, padding: 4 },
  qtyBtn: { width: 28, height: 28, justifyContent: 'center', alignItems: 'center' },
  qtyText: { marginHorizontal: 10, fontWeight: 'bold', fontSize: 16 },
  expiryNote: { textAlign: 'center', fontSize: 12, opacity: 0.55, marginTop: 8 },
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
