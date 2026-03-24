import React, { useState } from 'react';
import { StyleSheet, Text, View, Pressable, Modal, ScrollView, Alert } from 'react-native';
// Note: expo-camera needs to be installed via npx expo install expo-camera
// If not installed, this code will show a placeholder UI
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import { TICKETS_MOCK, ScannedTicket } from '@/mocks/tickets';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { IconSymbol } from '@/components/base/icon-symbol';

export default function QRScannerScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [ticketData, setTicketData] = useState<ScannedTicket | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const router = useRouter();
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];

  if (!permission) {
    return <View style={styles.container} />;
  }

  if (!permission.granted) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background, justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={[styles.message, { color: theme.text }]}>We need your permission to show the camera</Text>
        <Pressable 
          style={[styles.permissionButton, { backgroundColor: theme.tint }]}
          onPress={requestPermission}
        >
          <Text style={styles.permissionButtonText}>Grant Permission</Text>
        </Pressable>
        <Pressable onPress={() => router.back()} style={{ marginTop: 20 }}>
          <Text style={{ color: theme.tabIconDefault }}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

  const handleBarcodeScanned = ({ data }: { data: string }) => {
    if (scanned) return;
    setScanned(true);
    
    // Check mock data
    const ticket = TICKETS_MOCK[data];
    if (ticket) {
      setTicketData(ticket);
      setModalVisible(true);
    } else {
      Alert.alert('Invalid QR Code', `No ticket found for ID: ${data}`, [
        { text: 'Scan Again', onPress: () => setScanned(false) }
      ]);
    }
  };

  const verifyTicket = () => {
    Alert.alert('Success', 'Ticket verified and marked as used.');
    setModalVisible(false);
    setScanned(false);
  };

  // For simulation in case camera is not accessible
  const simulateScan = (id: string) => {
    handleBarcodeScanned({ data: id });
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
            <Text style={styles.scanText}>Center the QR code in the box</Text>
            
            <View style={styles.simulationButtons}>
               <Pressable style={styles.simButton} onPress={() => simulateScan('TICKET_123')}>
                 <Text style={styles.simButtonText}>Test Valid Ticket</Text>
               </Pressable>
               <Pressable style={styles.simButton} onPress={() => simulateScan('TICKET_456')}>
                 <Text style={styles.simButtonText}>Test Used Ticket</Text>
               </Pressable>
            </View>
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
              <Text style={[styles.modalTitle, { color: theme.text }]}>Ticket Verification</Text>
              <Pressable onPress={() => { setModalVisible(false); setScanned(false); }}>
                <IconSymbol name="xmark" size={24} color={theme.text} />
              </Pressable>
            </View>

            {ticketData && (
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={[styles.statusBadge, { backgroundColor: ticketData.status === 'valid' ? '#4CD964' : '#FF3B30' }]}>
                  <Text style={styles.statusBadgeText}>{ticketData.status.toUpperCase()}</Text>
                </View>

                <View style={styles.ticketDetailSection}>
                  <Text style={[styles.detailLabel, { color: theme.tabIconDefault }]}>MOVIE</Text>
                  <Text style={[styles.detailValue, { color: theme.text }]}>{ticketData.movieTitle}</Text>
                </View>

                <View style={styles.ticketDetailSection}>
                  <Text style={[styles.detailLabel, { color: theme.tabIconDefault }]}>CUSTOMER</Text>
                  <Text style={[styles.detailValue, { color: theme.text }]}>{ticketData.customerName}</Text>
                </View>

                <View style={styles.ticketDetailSection}>
                  <Text style={[styles.detailLabel, { color: theme.tabIconDefault }]}>DATE & TIME</Text>
                  <Text style={[styles.detailValue, { color: theme.text }]}>{ticketData.dateTime}</Text>
                </View>

                <View style={styles.ticketDetailSection}>
                  <Text style={[styles.detailLabel, { color: theme.tabIconDefault }]}>SEATS</Text>
                  <Text style={[styles.detailValue, { color: theme.text }]}>{ticketData.seats.join(', ')}</Text>
                </View>

                <View style={styles.extrasSection}>
                  <Text style={[styles.detailLabel, { color: theme.tabIconDefault }]}>PRODUCTS INCLUDED</Text>
                  {ticketData.extras.map((extra, i) => (
                    <View key={i} style={styles.extraItem}>
                      <IconSymbol name="popcorn.fill" size={16} color={theme.tint} />
                      <Text style={[styles.extraText, { color: theme.text }]}>{extra}</Text>
                    </View>
                  ))}
                </View>

                <Pressable 
                  style={[
                    styles.verifyButton, 
                    { backgroundColor: ticketData.status === 'valid' ? theme.tint : theme.tabIconDefault }
                  ]}
                  onPress={verifyTicket}
                  disabled={ticketData.status !== 'valid'}
                >
                  <Text style={styles.verifyButtonText}>
                    {ticketData.status === 'valid' ? 'Confirm Check-in' : 'Cannot Verify'}
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
  simulationButtons: {
    marginTop: 30,
    width: '80%',
  },
  simButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    padding: 10,
    borderRadius: 8,
    marginVertical: 5,
    alignItems: 'center',
  },
  simButtonText: {
    color: '#FFF',
    fontSize: 12,
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
