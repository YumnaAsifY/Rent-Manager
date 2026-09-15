import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  StatusBar,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { useRouter, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useCallback, useState } from 'react';

import BottomNavigation from '../../components/BottomNavigation';
import ScreenHeader from '../../components/ScreenHeader';
import { useAuth } from '@/context/AuthContext';
import { ApiError } from '@/services/api';
import { Rental, fetchMyRentals } from '@/services/rentals';
import {
  createPaymentSession,
  fetchPaymentHistory,
  getPaymentHistoryStatusLabel,
  openSafepayCheckout,
  PaymentHistoryItem,
  verifyPayment,
} from '@/services/payments';
import ViewLocationButton from '../../components/ViewLocationButton';

const { width } = Dimensions.get('window');
const isWeb = width > 768;

type PaymentSection = 'pay' | 'history';

export default function PaymentScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ section?: string | string[] }>();
  const sectionParam = Array.isArray(params.section)
    ? params.section[0]
    : params.section;
  const { token } = useAuth();
  const [activeSection, setActiveSection] = useState<PaymentSection>(
    sectionParam === 'history' ? 'history' : 'pay'
  );
  const [rentals, setRentals] = useState<Rental[]>([]);
  const [history, setHistory] = useState<PaymentHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [payingRentalId, setPayingRentalId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!token) {
      setRentals([]);
      setHistory([]);
      setLoading(false);
      setErrorMessage('Authentication required');
      return;
    }

    setLoading(true);
    setErrorMessage('');

    try {
      const [rentalData, historyData] = await Promise.all([
        fetchMyRentals(token),
        fetchPaymentHistory(token),
      ]);

      setRentals(rentalData);
      setHistory(historyData);
    } catch (error) {
      setRentals([]);
      setHistory([]);
      setErrorMessage(
        error instanceof ApiError
          ? error.message
          : 'Unable to load payments. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      if (sectionParam === 'history') {
        setActiveSection('history');
      }
      void loadData();
    }, [loadData, sectionParam])
  );

  const payableRentals = rentals.filter(
    (rental) =>
      rental.monthlyRent != null &&
      rental.monthlyRent > 0 &&
      rental.canPayRent
  );

  const isTenant = rentals.some(
    (rental) => rental.monthlyRent != null && rental.monthlyRent > 0
  );

  const handlePay = async (rental: Rental) => {
    if (!token) {
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

    setPayingRentalId(rental.id);

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
      setPayingRentalId(null);
    }
  };

  const renderHistoryCard = (item: PaymentHistoryItem) => {
    const statusLabel = getPaymentHistoryStatusLabel(item);
    const isSettled =
      item.viewerRole === 'tenant'
        ? item.status === 'settled'
        : item.status === 'settled';
    const isPending =
      item.viewerRole === 'owner' && item.status === 'pending_settlement';

    return (
      <View key={item.id} style={[styles.card, isWeb && styles.cardWeb]}>
        <View style={styles.historyHeader}>
          <Text style={styles.assetName}>{item.assetName}</Text>
          <View
            style={[
              styles.statusBadge,
              isSettled && styles.statusBadgeSettled,
              isPending && styles.statusBadgePending,
            ]}
          >
            <Text
              style={[
                styles.statusBadgeText,
                isSettled && styles.statusBadgeTextSettled,
                isPending && styles.statusBadgeTextPending,
              ]}
            >
              {statusLabel}
            </Text>
          </View>
        </View>

        {item.viewerRole === 'owner' ? (
          <Text style={styles.historyMeta}>Tenant: {item.tenantName}</Text>
        ) : (
          <Text style={styles.historyMeta}>Owner: {item.ownerName}</Text>
        )}

        {item.assetLocation ? (
          <Text style={styles.location}>{item.assetLocation}</Text>
        ) : null}

        <Text style={styles.historyAmount}>
          {item.viewerRole === 'owner'
            ? `Your share: Rs. ${item.ownerShareAmount.toLocaleString('en-PK')}`
            : `Amount: Rs. ${item.totalAmount.toLocaleString('en-PK')}`}
        </Text>

        <Text style={styles.historyDate}>Paid: {item.paidDate || '—'}</Text>
        {item.settledDate ? (
          <Text style={styles.historyDate}>Settled: {item.settledDate}</Text>
        ) : null}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#323a8f" />
        <Text style={styles.loadingText}>Loading payments...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#323a8f" />
      <ScreenHeader title="Payment" variant="dark" />

      <View style={styles.sectionTabs}>
        {isTenant ? (
          <TouchableOpacity
            style={[
              styles.sectionTab,
              activeSection === 'pay' && styles.sectionTabActive,
            ]}
            onPress={() => setActiveSection('pay')}
          >
            <Text
              style={[
                styles.sectionTabText,
                activeSection === 'pay' && styles.sectionTabTextActive,
              ]}
            >
              Pay
            </Text>
          </TouchableOpacity>
        ) : null}
        <TouchableOpacity
          style={[
            styles.sectionTab,
            activeSection === 'history' && styles.sectionTabActive,
            !isTenant && styles.sectionTabFull,
          ]}
          onPress={() => setActiveSection('history')}
        >
          <Text
            style={[
              styles.sectionTabText,
              activeSection === 'history' && styles.sectionTabTextActive,
            ]}
          >
            History
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {errorMessage ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.errorText}>{errorMessage}</Text>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={() => void loadData()}
            >
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : activeSection === 'pay' && isTenant ? (
          <>
            <Text style={styles.hint}>
              Pay rent securely via Safepay. You will be redirected to the
              checkout page.
            </Text>

            {payableRentals.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="checkmark-circle-outline" size={60} color="#22C55E" />
                <Text style={styles.emptyText}>
                  {rentals.length === 0
                    ? 'No rentals to pay.'
                    : 'You are caught up for now. No payment due.'}
                </Text>
                {rentals.length === 0 ? (
                  <TouchableOpacity
                    style={styles.retryButton}
                    onPress={() => router.push('/rentals' as any)}
                  >
                    <Text style={styles.retryButtonText}>Go to My Rentals</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            ) : (
              payableRentals.map((rental) => {
                const isPaying = payingRentalId === rental.id;

                return (
                  <View
                    key={rental.id}
                    style={[styles.card, isWeb && styles.cardWeb]}
                  >
                    <View style={styles.cardBody}>
                      <View style={styles.cardTitleRow}>
                        <Text style={styles.assetName}>{rental.name}</Text>
                        {rental.status === 'Expired' ? (
                          <View style={styles.expiredBadge}>
                            <Text style={styles.expiredBadgeText}>Expired</Text>
                          </View>
                        ) : null}
                      </View>
                      <Text style={styles.location}>
                        {rental.location || 'Location unavailable'}
                      </Text>
                      <ViewLocationButton location={rental.location} />
                      <Text style={styles.rent}>
                        {rental.rent ||
                          (rental.monthlyRent != null
                            ? `Rs. ${rental.monthlyRent.toLocaleString('en-PK')} / month`
                            : 'Rent not set')}
                      </Text>
                      {rental.isOverdue ? (
                        <Text style={styles.overdueText}>
                          Your rent is overdue — pay now via Safepay.
                        </Text>
                      ) : null}
                    </View>

                    <TouchableOpacity
                      style={[
                        styles.payButton,
                        isPaying && styles.payButtonDisabled,
                      ]}
                      disabled={Boolean(payingRentalId)}
                      onPress={() => void handlePay(rental)}
                      activeOpacity={0.85}
                    >
                      {isPaying ? (
                        <ActivityIndicator color="#ffffff" size="small" />
                      ) : (
                        <>
                          <Ionicons
                            name="card-outline"
                            size={18}
                            color="#ffffff"
                          />
                          <Text style={styles.payButtonText}>
                            Pay with Safepay
                          </Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                );
              })
            )}
          </>
        ) : (
          <>
            <Text style={styles.hint}>
              {isTenant
                ? 'Your rent payments and settlement status.'
                : 'Rent received from tenants and your settlement status.'}
            </Text>

            {history.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="receipt-outline" size={60} color="#CBD5E1" />
                <Text style={styles.emptyText}>No payment history yet.</Text>
              </View>
            ) : (
              history.map(renderHistoryCard)
            )}
          </>
        )}
      </ScrollView>

      <BottomNavigation />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  sectionTabs: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 12,
    gap: 10,
  },
  sectionTab: {
    flex: 1,
    minHeight: 42,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTabFull: {
    flex: 1,
  },
  sectionTabActive: {
    backgroundColor: '#323a8f',
    borderColor: '#323a8f',
  },
  sectionTabText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748B',
  },
  sectionTabTextActive: {
    color: '#FFFFFF',
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
  hint: {
    fontSize: 14,
    color: '#64748B',
    lineHeight: 20,
    marginBottom: 16,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 16,
  },
  emptyText: {
    marginTop: 12,
    fontSize: 16,
    color: '#94A3B8',
    textAlign: 'center',
  },
  errorText: {
    fontSize: 15,
    color: '#DC2626',
    textAlign: 'center',
    marginBottom: 12,
  },
  retryButton: {
    marginTop: 12,
    backgroundColor: '#323a8f',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
  },
  retryButtonText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 14,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  cardWeb: {
    maxWidth: 720,
    alignSelf: 'center',
    width: '100%',
  },
  cardBody: {
    marginBottom: 14,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 4,
  },
  assetName: {
    flex: 1,
    fontSize: 17,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  expiredBadge: {
    backgroundColor: '#FEE2E2',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  expiredBadgeText: {
    color: '#B91C1C',
    fontSize: 11,
    fontWeight: '700',
  },
  location: {
    fontSize: 14,
    color: '#64748B',
  },
  rent: {
    marginTop: 8,
    fontSize: 16,
    fontWeight: '700',
    color: '#323a8f',
  },
  overdueText: {
    marginTop: 10,
    fontSize: 13,
    color: '#B45309',
    fontWeight: '600',
    lineHeight: 18,
  },
  payButton: {
    backgroundColor: '#323a8f',
    borderRadius: 12,
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  payButtonDisabled: {
    opacity: 0.55,
  },
  payButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  historyHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 8,
  },
  statusBadge: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#E0E7FF',
  },
  statusBadgePending: {
    backgroundColor: '#FEF3C7',
  },
  statusBadgeSettled: {
    backgroundColor: '#DCFCE7',
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#323a8f',
  },
  statusBadgeTextPending: {
    color: '#B45309',
  },
  statusBadgeTextSettled: {
    color: '#15803D',
  },
  historyMeta: {
    fontSize: 14,
    color: '#475569',
    marginBottom: 4,
  },
  historyAmount: {
    marginTop: 8,
    fontSize: 15,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  historyDate: {
    marginTop: 4,
    fontSize: 13,
    color: '#64748B',
  },
});
