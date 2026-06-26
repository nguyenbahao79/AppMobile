import React, { useCallback, useEffect, useState } from 'react';
import { View, StyleSheet, FlatList, Image, Pressable, Modal, SafeAreaView, Platform, ScrollView , RefreshControl } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { AppHeader } from '@/components/layout/app-header';
import { ThemedText } from '@/components/base/themed-text';
import { ThemedView } from '@/components/base/themed-view';
import { IconSymbol } from '@/components/base/icon-symbol';
import { useTickets, Ticket } from '@/context/TicketContext';


export default function TicketsScreen() {
  const { tickets, cancelTicket, fetchTickets, loading } = useTickets();
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const isDark = colorScheme === 'dark';

  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      fetchTickets();
    }, [fetchTickets])
  );

  useEffect(() => {
    if (!selectedTicket) return;
    const updatedTicket = tickets.find((ticket) => ticket.id === selectedTicket.id);
    if (updatedTicket && updatedTicket !== selectedTicket) {
      setSelectedTicket(updatedTicket);
    }
  }, [selectedTicket, tickets]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchTickets();
    setRefreshing(false);
  };

  const handleTicketPress = (ticket: Ticket) => {
    setSelectedTicket(ticket);
    setModalVisible(true);
  };

  const renderTicketItem = ({ item }: { item: Ticket }) => (
    <Pressable 
      style={({ pressed }) => [
        styles.ticketCard, 
        isDark && styles.ticketCardDark,
        pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] }
      ]}
      onPress={() => handleTicketPress(item)}
    >
      <Image source={{ uri: item.moviePoster }} style={styles.poster} />
      <View style={styles.ticketInfo}>
        <ThemedText type="defaultSemiBold" style={styles.movieTitle} numberOfLines={1}>
          {item.movieTitle}
        </ThemedText>
        <View style={styles.dateTimeRow}>
          <IconSymbol name="calendar" size={14} color={theme.tabIconDefault} />
          <ThemedText style={styles.dateTimeText}>{item.date}</ThemedText>
          <IconSymbol name="clock" size={14} color={theme.tabIconDefault} style={{ marginLeft: 10 }} />
          <ThemedText style={styles.dateTimeText}>{item.time}</ThemedText>
        </View>
        <View style={styles.seatsRow}>
          <IconSymbol name="ticket.fill" size={14} color={theme.tint} />
          <ThemedText style={[styles.seatsText, { color: theme.tint }]}>
            Ghế: {item.seats.join(', ')}
          </ThemedText>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: item.status === 'active' ? '#34C75920' : '#FF3B3020' }]}>
          <View style={[styles.statusDot, { backgroundColor: item.status === 'active' ? '#34C759' : '#FF3B30' }]} />
          <ThemedText style={[styles.statusText, { color: item.status === 'active' ? '#34C759' : '#FF3B30' }]}>
            {item.status === 'active' ? 'Sắp diễn ra' : 'Đã hủy'}
          </ThemedText>
        </View>
      </View>
      <IconSymbol name="chevron.right" size={20} color={theme.tabIconDefault} />
    </Pressable>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <AppHeader title="Vé của tôi" showNotification={false} />
      
      {tickets.length === 0 && !loading ? (
        <View style={styles.emptyContainer}>
          <IconSymbol name="ticket" size={80} color={theme.tabIconDefault + '40'} />
          <ThemedText style={styles.emptyText}>Bạn chưa có vé nào</ThemedText>
          <ThemedText style={styles.emptySubText}>Hãy chọn phim và đặt vé ngay nhé!</ThemedText>
          <Pressable onPress={onRefresh} style={{ marginTop: 20 }}>
            <ThemedText style={{ color: theme.tint }}>Tải lại</ThemedText>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={tickets}
          renderItem={renderTicketItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.tint} />
          }
        />
      )}

      {/* Ticket Detail Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <ThemedView style={[styles.modalContent, isDark && styles.modalContentDark]}>
            <View style={styles.modalHeader}>
              <ThemedText type="subtitle">Chi tiết vé</ThemedText>
              <Pressable onPress={() => setModalVisible(false)} style={styles.closeBtn}>
                <IconSymbol name="xmark.circle.fill" size={28} color={theme.tabIconDefault} />
              </Pressable>
            </View>

            {selectedTicket && (
              <ScrollView 
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.modalScrollContent}
              >
                <View style={styles.qrContainer}>
                  {selectedTicket.qrCode ? (
                    <Image source={{ uri: selectedTicket.qrCode }} style={styles.qrCode} />
                  ) : (
                    <View style={[styles.qrCode, styles.qrMissing]}>
                      <IconSymbol name="qrcode" size={56} color={theme.tabIconDefault} />
                      <ThemedText style={styles.qrMissingText}>QR chưa sẵn sàng</ThemedText>
                    </View>
                  )}
                  <ThemedText style={styles.ticketId}>Mã vé: {selectedTicket.ticketCode || selectedTicket.id}</ThemedText>
                  {selectedTicket.qrToken ? (
                    <ThemedText style={styles.qrSecureText}>QR bảo mật do hệ thống mã hóa</ThemedText>
                  ) : null}
                </View>

                <View style={styles.detailSection}>
                  <ThemedText type="defaultSemiBold" style={styles.detailMovieTitle}>
                    {selectedTicket.movieTitle}
                  </ThemedText>
                  
                  <View style={styles.infoGrid}>
                    <View style={styles.infoItem}>
                      <ThemedText style={styles.infoLabel}>Ngày</ThemedText>
                      <ThemedText style={styles.infoValue}>{selectedTicket.date}</ThemedText>
                    </View>
                    <View style={styles.infoItem}>
                      <ThemedText style={styles.infoLabel}>Giờ chiếu</ThemedText>
                      <ThemedText style={styles.infoValue}>{selectedTicket.time}</ThemedText>
                    </View>
                    <View style={styles.infoItem}>
                      <ThemedText style={styles.infoLabel}>Phòng chiếu</ThemedText>
                      <ThemedText style={styles.infoValue}>{selectedTicket.roomName || '—'}</ThemedText>
                    </View>
                    <View style={styles.infoItem}>
                      <ThemedText style={styles.infoLabel}>Chi nhánh</ThemedText>
                      <ThemedText style={styles.infoValue}>{selectedTicket.cinemaName || '—'}</ThemedText>
                    </View>
                    <View style={styles.infoItem}>
                      <ThemedText style={styles.infoLabel}>Ghế</ThemedText>
                      <ThemedText style={styles.infoValue}>{selectedTicket.seats.join(', ')}</ThemedText>
                    </View>
                  </View>

                  <View style={styles.divider} />

                  <View style={styles.priceRow}>
                    <ThemedText style={styles.infoLabel}>Tổng tiền</ThemedText>
                    <ThemedText type="subtitle" style={{ color: theme.tint }}>
                      {selectedTicket.totalPrice.toLocaleString('vi-VN')}đ
                    </ThemedText>
                  </View>
                  <View style={styles.priceRow}>
                    <ThemedText style={styles.infoLabel}>Thanh toán qua</ThemedText>
                    <ThemedText style={styles.infoValue}>{selectedTicket.paymentMethod}</ThemedText>
                  </View>
                </View>

                <ThemedText style={styles.noteText}>
                  * Vui lòng đưa mã QR này cho nhân viên tại quầy để soát vé. QR không chứa thông tin vé ở dạng đọc được.
                </ThemedText>

                {selectedTicket.status === 'active' && (
                  <Pressable 
                    style={styles.cancelTicketBtn}
                    onPress={() => {
                      cancelTicket(selectedTicket.id);
                      setModalVisible(false);
                    }}
                  >
                    <ThemedText style={{ color: '#FF3B30', fontWeight: 'bold' }}>Hủy vé này</ThemedText>
                  </Pressable>
                )}
              </ScrollView>
            )}
          </ThemedView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  listContent: { padding: 20 },
  ticketCard: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 12,
    marginBottom: 16,
    alignItems: 'center',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8 },
      android: { elevation: 4 },
    }),
  },
  ticketCardDark: { backgroundColor: '#1C1C1E' },
  poster: { width: 80, height: 110, borderRadius: 12 },
  ticketInfo: { flex: 1, marginLeft: 15, justifyContent: 'center' },
  movieTitle: { fontSize: 18, marginBottom: 6 },
  dateTimeRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  dateTimeText: { fontSize: 13, opacity: 0.6, marginLeft: 4 },
  seatsRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  seatsText: { fontSize: 13, fontWeight: '600', marginLeft: 4 },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3, marginRight: 6 },
  statusText: { fontSize: 11, fontWeight: '700' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyText: { fontSize: 20, fontWeight: 'bold', marginTop: 20 },
  emptySubText: { fontSize: 14, opacity: 0.5, marginTop: 8, textAlign: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 24,
    maxHeight: '90%',
  },
  modalContentDark: { backgroundColor: '#1C1C1E' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  closeBtn: { padding: 4 },
  modalScrollContent: { paddingBottom: Platform.OS === 'ios' ? 40 : 20 },
  qrContainer: { alignItems: 'center', marginBottom: 24 },
  qrCode: { width: 180, height: 180, backgroundColor: '#FFF', borderRadius: 20, padding: 10 },
  qrMissing: { alignItems: 'center', justifyContent: 'center' },
  qrMissingText: { marginTop: 8, fontSize: 12, opacity: 0.5 },
  ticketId: { marginTop: 12, opacity: 0.5, fontSize: 12, letterSpacing: 1 },
  qrSecureText: { marginTop: 6, opacity: 0.45, fontSize: 11, fontStyle: 'italic' },
  detailSection: { padding: 20, borderRadius: 24, backgroundColor: '#00000005', marginBottom: 20 },
  detailMovieTitle: { fontSize: 22, textAlign: 'center', marginBottom: 20 },
  infoGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  infoItem: { width: '45%', marginBottom: 16 },
  infoLabel: { fontSize: 12, opacity: 0.5, marginBottom: 4 },
  infoValue: { fontSize: 15, fontWeight: '600' },
  divider: { height: 1, backgroundColor: '#00000010', marginVertical: 10 },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
  noteText: { textAlign: 'center', fontSize: 12, opacity: 0.4, fontStyle: 'italic' },
  cancelTicketBtn: { 
    marginTop: 30, 
    marginBottom: 10, 
    paddingVertical: 16, 
    borderRadius: 16, 
    borderWidth: 1, 
    borderColor: '#FF3B30', 
    alignItems: 'center', 
    borderStyle: 'dashed' 
  },
});
