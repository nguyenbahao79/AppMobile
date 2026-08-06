import React, { useCallback, useState } from 'react';
import { View, StyleSheet, FlatList, Pressable, SafeAreaView, ActivityIndicator, Alert, RefreshControl } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { ThemedText } from '@/components/base/themed-text';
import { AppHeader } from '@/components/layout/app-header';
import { IconSymbol } from '@/components/base/icon-symbol';
import { useAuth } from '@/context/AuthContext';
import { voucherService, PublicVoucher } from '@/services/voucherService';
import { meService, MyVoucher } from '@/services/meService';

function formatDiscount(v: PublicVoucher) {
  const isFixed = v.discountType?.toLowerCase().includes('fixed') || v.discountType?.toLowerCase().includes('amount');
  return isFixed ? `${v.value.toLocaleString('vi-VN')}đ` : `${v.value}%`;
}

export default function VouchersScreen() {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const isDark = colorScheme === 'dark';
  const { session } = useAuth();
  const myPoints = session?.user?.points ?? 0;

  const [tab, setTab] = useState<'catalog' | 'mine'>('catalog');
  const [catalog, setCatalog] = useState<PublicVoucher[]>([]);
  const [wallet, setWallet] = useState<MyVoucher[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [redeemingId, setRedeemingId] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      const [catalogData, walletData] = await Promise.all([
        voucherService.getPublicVouchers(),
        meService.getMyVouchers().catch(() => []),
      ]);
      setCatalog(catalogData.filter((v) => v.status === 1));
      setWallet(walletData);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const redeemedVoucherIds = new Set(wallet.map((w) => w.voucher?.id).filter(Boolean));

  const handleRedeem = async (voucher: PublicVoucher) => {
    setRedeemingId(voucher.id);
    try {
      await meService.redeemVoucher(voucher.id);
      Alert.alert('Thành công', 'Đã nhận voucher vào ví của bạn.');
      await load();
    } catch (error: any) {
      Alert.alert('Không đổi được', error.message || 'Vui lòng thử lại sau.');
    } finally {
      setRedeemingId(null);
    }
  };

  const renderCatalogItem = ({ item }: { item: PublicVoucher }) => {
    const alreadyRedeemed = redeemedVoucherIds.has(item.id);
    const notEnoughPoints = item.pointVoucher > myPoints;
    return (
      <View style={[styles.card, isDark && styles.cardDark]}>
        <View style={styles.cardStripe} />
        <View style={styles.cardBody}>
          <ThemedText type="defaultSemiBold" style={styles.code}>{item.code}</ThemedText>
          <ThemedText style={styles.discount}>Giảm {formatDiscount(item)}</ThemedText>
          {item.minOrderValue > 0 && (
            <ThemedText style={styles.meta}>Đơn tối thiểu {item.minOrderValue.toLocaleString('vi-VN')}đ</ThemedText>
          )}
          <ThemedText style={styles.meta}>
            {item.pointVoucher > 0 ? `${item.pointVoucher} điểm` : 'Miễn phí'}
          </ThemedText>
        </View>
        {alreadyRedeemed ? (
          <View style={[styles.actionBtn, styles.actionBtnDone]}>
            <ThemedText style={styles.actionTextDone}>✓ Đã đổi</ThemedText>
          </View>
        ) : (
          <Pressable
            style={[styles.actionBtn, { backgroundColor: notEnoughPoints ? '#8E8E9330' : theme.tint }]}
            disabled={notEnoughPoints || redeemingId === item.id}
            onPress={() => handleRedeem(item)}
          >
            <ThemedText style={styles.actionText}>
              {redeemingId === item.id ? '...' : notEnoughPoints ? 'Không đủ điểm' : 'Đổi ngay'}
            </ThemedText>
          </Pressable>
        )}
      </View>
    );
  };

  const renderWalletItem = ({ item }: { item: MyVoucher }) => {
    const used = item.status === 0;
    return (
      <View style={[styles.card, isDark && styles.cardDark, used && { opacity: 0.5 }]}>
        <View style={[styles.cardStripe, used && { backgroundColor: '#8E8E93' }]} />
        <View style={styles.cardBody}>
          <ThemedText type="defaultSemiBold" style={styles.code}>{item.voucher?.code}</ThemedText>
          <ThemedText style={styles.discount}>Giảm {item.voucher ? formatDiscount(item.voucher) : ''}</ThemedText>
        </View>
        <ThemedText style={[styles.walletStatus, { color: used ? '#8E8E93' : '#34C759' }]}>
          {used ? 'Đã dùng' : 'Còn hạn'}
        </ThemedText>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <AppHeader title="Voucher" showNotification={false} />
      <View style={styles.tabBar}>
        <Pressable style={[styles.tabBtn, tab === 'catalog' && { borderBottomColor: theme.tint, borderBottomWidth: 2 }]} onPress={() => setTab('catalog')}>
          <ThemedText style={tab === 'catalog' ? { color: theme.tint, fontWeight: 'bold' } : { opacity: 0.6 }}>Kho voucher</ThemedText>
        </Pressable>
        <Pressable style={[styles.tabBtn, tab === 'mine' && { borderBottomColor: theme.tint, borderBottomWidth: 2 }]} onPress={() => setTab('mine')}>
          <ThemedText style={tab === 'mine' ? { color: theme.tint, fontWeight: 'bold' } : { opacity: 0.6 }}>Ví của tôi ({wallet.length})</ThemedText>
        </Pressable>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.tint} />
        </View>
      ) : tab === 'catalog' ? (
        catalog.length === 0 ? (
          <View style={styles.center}>
            <IconSymbol name="gift.fill" size={64} color={theme.tabIconDefault + '40'} />
            <ThemedText style={styles.emptyText}>Chưa có voucher nào</ThemedText>
          </View>
        ) : (
          <FlatList
            data={catalog}
            keyExtractor={(item) => String(item.id)}
            contentContainerStyle={styles.list}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FFFFFF" colors={['#FFFFFF']} progressBackgroundColor="#1C1C1E" />}
            renderItem={renderCatalogItem}
          />
        )
      ) : wallet.length === 0 ? (
        <View style={styles.center}>
          <IconSymbol name="gift.fill" size={64} color={theme.tabIconDefault + '40'} />
          <ThemedText style={styles.emptyText}>Bạn chưa có voucher nào</ThemedText>
        </View>
      ) : (
        <FlatList
          data={wallet}
          keyExtractor={(item) => String(item.userVoucherId)}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FFFFFF" colors={['#FFFFFF']} progressBackgroundColor="#1C1C1E" />}
          renderItem={renderWalletItem}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  emptyText: { marginTop: 16, fontSize: 16, opacity: 0.6, textAlign: 'center' },
  tabBar: { flexDirection: 'row', paddingHorizontal: 20 },
  tabBtn: { flex: 1, alignItems: 'center', paddingVertical: 12 },
  list: { padding: 20 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 14,
    overflow: 'hidden',
  },
  cardDark: { backgroundColor: '#1C1C1E' },
  cardStripe: { width: 6, alignSelf: 'stretch', backgroundColor: '#AF52DE' },
  cardBody: { flex: 1, padding: 14 },
  code: { fontSize: 16, letterSpacing: 1 },
  discount: { fontSize: 14, marginTop: 4, opacity: 0.8 },
  meta: { fontSize: 12, opacity: 0.5, marginTop: 2 },
  actionBtn: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, marginRight: 14 },
  actionBtnDone: { backgroundColor: 'transparent', borderWidth: 1, borderColor: '#34C759' },
  actionText: { color: '#FFFFFF', fontSize: 12, fontWeight: 'bold' },
  actionTextDone: { color: '#34C759', fontSize: 12, fontWeight: 'bold' },
  walletStatus: { fontSize: 12, fontWeight: 'bold', marginRight: 14 },
});
