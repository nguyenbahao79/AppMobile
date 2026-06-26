import React, { useState } from 'react';
import { StyleSheet, Text, View, Pressable, Modal, ScrollView, Alert } from 'react-native';
// Note: expo-camera needs to be installed via npx expo install expo-camera
// If not installed, this code will show a placeholder UI
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { IconSymbol } from '@/components/base/icon-symbol';

import { apiClient } from '@/api/client';
import { API_ENDPOINTS } from '@/api/config';

type ScannedOrder = {
  orderCode: string;
  customerName?: string;
  status?: number;
  finalAmount?: number;
  paymentMethod?: string;
  tickets?: {
    movieTitle?: string;
    showtime?: string;
    roomName?: string;
    seatNumber?: string;
    seatTypeName?: string;
    price?: number;
  }[];
  foods?: {
    productName?: string;
    quantity?: number;
    price?: number;
  }[];
};

export default function QRScannerScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [ticketData, setTicketData] = useState<ScannedOrder | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];

  if (!permission) {
    return <View style={[styles.container, { backgroundColor: theme.background }]} />;
  }

  if (!permission.granted) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background, justifyContent: 'center', padding: 24 }]}>
        <Text style={[styles.message, { color: theme.text }]}>Ứng dụng cần quyền camera để quét mã QR.</Text>
        <Pressable style={[styles.permissionButton, { backgroundColor: theme.tint }]} onPress={requestPermission}>
          <Text style={styles.permissionButtonText}>Cho phép camera</Text>
        </Pressable>
      </View>
    );
  }

  const handleBarcodeScanned = async ({ data }: { data: string }) => {
    if (scanned) return;
    setScanned(true);
    
    try {
      const response = await apiClient.post(API_ENDPOINTS.VERIFY_TICKET, { qrToken: data.trim() });
      if (response) {
        const verified = response as {
          orderCode?: string;
          ticketCode?: string;
          customerName?: string;
          status?: number;
          movieTitle?: string;
          showtime?: string;
          roomName?: string;
          seatNumber?: string;
        };
        setTicketData({
          orderCode: verified.orderCode || verified.ticketCode || '—',
          customerName: verified.customerName,
          status: verified.status,
          tickets: [{
            movieTitle: verified.movieTitle,
            showtime: verified.showtime,
            roomName: verified.roomName,
            seatNumber: verified.seatNumber,
          }],
        });
        setModalVisible(true);
      }
    } catch (error: any) {
      const message = error.message || 'Không tìm thấy thông tin vé này.';
      const isAuthError = /chưa đăng nhập|token|quyền truy cập|unauthor/i.test(message);
      Alert.alert(isAuthError ? 'Phiên nhân viên không hợp lệ' : 'Lỗi mã QR',
        isAuthError ? 'Vui lòng đăng xuất và đăng nhập lại bằng chế độ Nhân viên trước khi quét QR.' : message, [
        { text: 'Quét lại', onPress: () => setScanned(false) }
      ]);
    }
  };

  const verifyTicket = async () => {
    if (!ticketData) return;
    setIsVerifying(true);
    Alert.alert(
      'Đã kiểm tra thông tin',
      'BE hiện chưa có API lưu trạng thái đã soát vé, nên app chỉ xác nhận hiển thị thông tin đơn.',
      [{ text: 'Quét tiếp', onPress: () => { setModalVisible(false); setScanned(false); } }]
    );
    setIsVerifying(false);
  };

  return (
    <View style={styles.container}>
      <CameraView
        style={StyleSheet.absoluteFillObject}
        onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
        barcodeScannerSettings={{
          barcodeTypes: ['qr'],
        }}
      >
        <View style={styles.overlay}>
          <View style={styles.unfocusedContainer} />
          <View style={styles.middleContainer}>
            <View style={styles.unfocusedContainer} />
            <View style={styles.focusedContainer}>
              <View style={styles.cornerTopLeft} />
              <View style={styles.cornerTopRight} />
              <View style={styles.cornerBottomLeft} />
              <View style={styles.cornerBottomRight} />
            </View>
            <View style={styles.unfocusedContainer} />
          </View>
          <View style={styles.unfocusedContainer}>
            <Text style={styles.scanText}>Đưa mã QR đơn vé vào khung quét</Text>
          </View>
        </View>
      </CameraView>

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.background }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Thông tin đơn vé</Text>
              <Pressable onPress={() => { setModalVisible(false); setScanned(false); }}>
                <IconSymbol name="xmark" size={24} color={theme.text} />
              </Pressable>
            </View>

            {ticketData && (
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={[styles.statusBadge, { backgroundColor: ticketData.status === 1 ? '#4CD964' : '#FF9500' }]}>
                  <Text style={styles.statusBadgeText}>{ticketData.status === 1 ? 'ĐÃ THANH TOÁN' : 'CHƯA HOÀN TẤT'}</Text>
                </View>

                <View style={styles.ticketDetailSection}>
                  <Text style={[styles.detailLabel, { color: theme.tabIconDefault }]}>MÃ ĐƠN</Text>
                  <Text style={[styles.detailValue, { color: theme.text }]}>{ticketData.orderCode}</Text>
                </View>

                <View style={styles.ticketDetailSection}>
                  <Text style={[styles.detailLabel, { color: theme.tabIconDefault }]}>KHÁCH HÀNG</Text>
                  <Text style={[styles.detailValue, { color: theme.text }]}>{ticketData.customerName}</Text>
                </View>

                {(ticketData.tickets ?? []).map((ticket, index) => (
                  <View key={`${ticket.seatNumber}-${index}`} style={styles.ticketDetailSection}>
                    <Text style={[styles.detailLabel, { color: theme.tabIconDefault }]}>VÉ {index + 1}</Text>
                    <Text style={[styles.detailValue, { color: theme.text }]}>{ticket.movieTitle}</Text>
                    <Text style={[styles.detailSubValue, { color: theme.tabIconDefault }]}>
                      {ticket.showtime} • {ticket.roomName} • Ghế {ticket.seatNumber}
                    </Text>
                  </View>
                ))}

                <View style={styles.extrasSection}>
                  <Text style={[styles.detailLabel, { color: theme.tabIconDefault }]}>BẮP NƯỚC</Text>
                  {(ticketData.foods ?? []).map((food, i) => (
                    <View key={i} style={styles.extraItem}>
                      <IconSymbol name="popcorn.fill" size={16} color={theme.tint} />
                      <Text style={[styles.extraText, { color: theme.text }]}>
                        {food.productName} x{food.quantity}
                      </Text>
                    </View>
                  ))}
                </View>

                <Pressable 
                  style={[
                    styles.verifyButton, 
                    { backgroundColor: ticketData.status === 1 ? theme.tint : theme.tabIconDefault }
                  ]}
                  onPress={verifyTicket}
                  disabled={ticketData.status !== 1 || isVerifying}
                >
                  <Text style={styles.verifyButtonText}>
                    {isVerifying ? 'Đang xử lý...' : ticketData.status === 1 ? 'Xác nhận đã kiểm tra' : 'Đơn chưa thanh toán'}
                  </Text>
                </Pressable>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  overlay: {
    flex: 1,
  },
  unfocusedContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  middleContainer: {
    flexDirection: 'row',
    height: 250,
  },
  focusedContainer: {
    width: 250,
    position: 'relative',
  },
  cornerTopLeft: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 30,
    height: 30,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderColor: '#FFF',
  },
  cornerTopRight: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 30,
    height: 30,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderColor: '#FFF',
  },
  cornerBottomLeft: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    width: 30,
    height: 30,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderColor: '#FFF',
  },
  cornerBottomRight: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 30,
    height: 30,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderColor: '#FFF',
  },
  scanText: {
    color: '#FFF',
    fontSize: 16,
    marginTop: 20,
  },
  message: {
    textAlign: 'center',
    paddingBottom: 20,
    fontSize: 16,
  },
  permissionButton: {
    paddingHorizontal: 25,
    paddingVertical: 12,
    borderRadius: 12,
  },
  permissionButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    height: '80%',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginBottom: 20,
  },
  statusBadgeText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
  ticketDetailSection: {
    marginBottom: 15,
  },
  detailLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  detailSubValue: {
    fontSize: 13,
    marginTop: 4,
  },
  extrasSection: {
    marginTop: 10,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#333',
    marginBottom: 30,
  },
  extraItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4,
  },
  extraText: {
    marginLeft: 10,
    fontSize: 16,
  },
  verifyButton: {
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  verifyButtonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
