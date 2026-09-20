import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  ActivityIndicator,
  Linking,
  Alert,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useCallback, useState } from 'react';

import BottomNavigation from '../../components/BottomNavigation';
import ScreenHeader from '../../components/ScreenHeader';
import LiftPressable from '../../components/LiftPressable';
import { useAuth } from '@/context/AuthContext';
import { ApiError } from '@/services/api';
import {
  Rental,
  fetchRentalById,
} from '@/services/rentals';
import ViewLocationButton from '../../components/ViewLocationButton';
import {
  createPaymentSession,
  openSafepayCheckout,
  verifyPayment,
} from '@/services/payments';

export default function RentalDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string | string[] }>();
  const rentalId = Array.isArray(id) ? id[0] : id;
  const { token } = useAuth();
  const [rental, setRental] = useState<Rental | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [paying, setPaying] = useState(false);

  const loadRental = useCallback(async () => {
    if (!token || !rentalId) {
      setRental(null);
      setLoading(false);
      setErrorMessage(!token ? 'Authentication required' : 'Rental not found');
      return;
    }

    setLoading(true);
    setErrorMessage('');

    try {
      const data = await fetchRentalById(token, rentalId);
      setRental(data);
    } catch (error) {
      setRental(null);
      setErrorMessage(
        error instanceof ApiError
          ? error.message
          : 'Unable to load rental details.'
      );
    } finally {
      setLoading(false);
    }
  }, [rentalId, token]);

  useFocusEffect(
    useCallback(() => {
      void loadRental();
    }, [loadRental])
  );

  const openOwnerDialer = async (phoneNumber: string) => {
    const cleaned = phoneNumber.replace(/[^\d+]/g, '');
    if (!cleaned) {
      return;
    }

    const url = `tel:${cleaned}`;

    try {
      const canOpen = await Linking.canOpenURL(url);
      if (!canOpen && Platform.OS === 'web') {
        window.location.href = url;
        return;
      }

      if (canOpen) {
        await Linking.openURL(url);
        return;
      }

      Alert.alert('Unable to dial', 'Calling is not supported on this device.');
    } catch {
      Alert.alert('Unable to dial', 'Could not open the phone dialer.');
    }
  };

  const handlePayRent = async () => {
    if (!token || !rental) {
      return;
    }

    if (rental.monthlyRent == null || rental.monthlyRent <= 0) {
      const message = 'This rental has no monthly rent set.';
      if (Platform.OS === 'web') {
        window.alert(message);
      } else {
        Alert.alert('Cannot pay', message);
      }
      return;
    }

    setPaying(true);
    try {
      const result = await createPaymentSession(token, rental.id);
      await openSafepayCheckout(result.checkoutUrl);

      if (Platform.OS !== 'web') {
        await verifyPayment(token, {
          paymentId: result.payment.id,
        });
        router.push(
          `/payment/success?paymentId=${encodeURIComponent(result.payment.id)}` as any
        );
      }
    } catch (error) {
      const message =
        error instanceof ApiError
          ? error.message
          : 'Unable to start Safepay checkout. Please try again.';

      if (Platform.OS === 'web') {
        window.alert(message);
      } else {
        Alert.alert('Payment error', message);
      }
    } finally {
      setPaying(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#323a8f" />
        <Text style={styles.loadingText}>Loading details...</Text>
      </View>
    );
  }

  if (!rental) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#323a8f" />
        <ScreenHeader title="Rental Detail" variant="dark" />
        <View style={styles.notFoundContainer}>
          <Ionicons name="alert-circle-outline" size={60} color="#CBD5E1" />
          <Text style={styles.notFoundText}>
            {errorMessage || 'Rental not found'}
          </Text>
        </View>
      </View>
    );
  }

  const hasDescription = Boolean(rental.description?.trim());

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#323a8f" />

      <ScreenHeader title="Rental Detail" variant="dark" />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.detailCard}>
          <View style={styles.detailHeaderRow}>
            <Text style={styles.detailName}>{rental.name}</Text>
            <View
              style={[
                styles.statusBadge,
                { backgroundColor: getStatusBg(rental.status) },
              ]}
            >
              <Text
                style={[
                  styles.statusText,
                  { color: getStatusColor(rental.status) },
                ]}
              >
                {rental.status}
              </Text>
            </View>
          </View>

          {rental.type ? (
            <Text style={styles.detailType}>{rental.type}</Text>
          ) : null}
          <Text style={styles.detailLocation}>
            {rental.location || 'Location unavailable'}
          </Text>
          <ViewLocationButton location={rental.location} />
          {rental.rent ? (
            <Text style={styles.detailRent}>{rental.rent}</Text>
          ) : null}

          {hasDescription ? (
            <>
              <View style={styles.divider} />
              <Text style={styles.descriptionTitle}>Description</Text>
              <Text style={styles.descriptionText}>{rental.description}</Text>
            </>
          ) : null}

          <View style={styles.divider} />

          <View style={styles.leaseDatesContainer}>
            <Text style={styles.leaseTitle}>Lease Details</Text>

            <View style={styles.dateRow}>
              <View style={styles.dateItem}>
                <View style={styles.dateIconRow}>
                  <Ionicons name="calendar-outline" size={16} color="#323a8f" />
                  <Text style={styles.dateLabel}>Start Date</Text>
                </View>
                <Text style={styles.dateValue}>{rental.startDate || 'N/A'}</Text>
              </View>

              <View style={styles.dateItem}>
                <View style={styles.dateIconRow}>
                  <Ionicons name="calendar-outline" size={16} color="#323a8f" />
                  <Text style={styles.dateLabel}>End Date</Text>
                </View>
                <Text style={styles.dateValue}>{rental.endDate || 'N/A'}</Text>
              </View>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.ownerRow}>
            <Ionicons name="person-outline" size={18} color="#64748B" />
            <Text style={styles.ownerLabel}>Owner:</Text>
            <Text style={styles.ownerName}>
              {rental.ownerName || 'Unavailable'}
            </Text>
          </View>

          {rental.ownerPhone ? (
            <View style={styles.ownerRow}>
              <Ionicons name="call-outline" size={18} color="#64748B" />
              <Text style={styles.ownerLabel}>Contact:</Text>
              <TouchableOpacity
                onPress={() => void openOwnerDialer(rental.ownerPhone!)}
                accessibilityRole="link"
                accessibilityLabel={`Call owner at ${rental.ownerPhone}`}
              >
                <Text style={styles.ownerPhone}>{rental.ownerPhone}</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          {rental.status === 'Removed' && rental.removalReason ? (
            <>
              <View style={styles.divider} />
              <Text style={styles.leaseTitle}>Removal reason</Text>
              <Text style={styles.removalReason}>{rental.removalReason}</Text>
            </>
          ) : null}

          {rental.monthlyRent != null &&
          rental.monthlyRent > 0 &&
          rental.status === 'Active' &&
          rental.canPayRent ? (
            <>
              <View style={styles.divider} />
              {rental.isOverdue ? (
                <Text style={styles.overdueText}>
                  Your rent is overdue — pay now via Safepay.
                </Text>
              ) : null}
              <Text style={styles.feeNote}>
                A 3% platform fee is included. The owner receives 97%.
              </Text>
              <LiftPressable
                style={[styles.payButton, paying && styles.payButtonDisabled]}
                disabled={paying}
                onPress={() => void handlePayRent()}
              >
                {paying ? (
                  <ActivityIndicator color="#ffffff" size="small" />
                ) : (
                  <>
                    <Ionicons name="card-outline" size={18} color="#ffffff" />
                    <Text style={styles.payButtonText}>Pay with Safepay</Text>
                  </>
                )}
              </LiftPressable>
            </>
          ) : null}
        </View>
      </ScrollView>

      <BottomNavigation />
    </View>
  );
}

const getStatusColor = (status: string) => {
  if (status === 'Active') return '#22C55E';
  if (status === 'Expired') return '#8B5CF6';
  if (status === 'Removed') return '#EF4444';
  return '#6B7280';
};

const getStatusBg = (status: string) => {
  if (status === 'Active') return '#DCFCE7';
  if (status === 'Expired') return '#EDE9FE';
  if (status === 'Removed') return '#FEE2E2';
  return '#F3F4F6';
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 30,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#64748B',
  },
  notFoundContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  notFoundText: {
    fontSize: 16,
    color: '#94A3B8',
    marginTop: 12,
    textAlign: 'center',
  },
  detailCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  detailHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  detailName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1A1A1A',
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  detailType: {
    fontSize: 15,
    color: '#475569',
    fontWeight: '500',
    marginBottom: 2,
  },
  detailLocation: {
    fontSize: 16,
    color: '#64748B',
  },
  detailRent: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#323a8f',
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 16,
  },
  descriptionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  descriptionText: {
    fontSize: 14,
    color: '#64748B',
    lineHeight: 22,
  },
  ownerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  ownerLabel: {
    fontSize: 14,
    color: '#64748B',
  },
  ownerName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1A1A1A',
  },
  ownerPhone: {
    fontSize: 14,
    fontWeight: '600',
    color: '#323a8f',
    textDecorationLine: 'underline',
  },
  leaseDatesContainer: {
    marginBottom: 4,
  },
  leaseTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  removalReason: {
    fontSize: 14,
    color: '#64748B',
    lineHeight: 22,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 8,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    gap: 4,
  },
  dateItem: {
    flex: 1,
    alignItems: 'flex-start',
    paddingHorizontal: 1,
  },
  dateIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 2,
  },
  dateLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
  },
  dateValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1A1A1A',
    paddingLeft: 20,
  },
  overdueText: {
    marginBottom: 12,
    fontSize: 13,
    color: '#B45309',
    fontWeight: '600',
    lineHeight: 18,
  },
  feeNote: {
    marginBottom: 12,
    fontSize: 12,
    color: '#64748B',
    lineHeight: 17,
  },
  payButton: {
    backgroundColor: '#323a8f',
    borderRadius: 12,
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  payButtonDisabled: {
    opacity: 0.6,
  },
  payButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
});
