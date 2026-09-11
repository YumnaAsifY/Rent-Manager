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
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useCallback, useState } from 'react';

import BottomNavigation from '../../components/BottomNavigation';
import ScreenHeader from '../../components/ScreenHeader';
import { useAuth } from '@/context/AuthContext';
import { ApiError } from '@/services/api';
import { Rental, fetchMyRentals } from '@/services/rentals';
import {
  createPaymentSession,
  openSafepayCheckout,
  verifyPayment,
} from '@/services/payments';
import ViewLocationButton from '../../components/ViewLocationButton';

const { width } = Dimensions.get('window');
const isWeb = width > 768;

export default function PaymentScreen() {
  const router = useRouter();
  const { token } = useAuth();
  const [rentals, setRentals] = useState<Rental[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [payingRentalId, setPayingRentalId] = useState<string | null>(null);

  const loadRentals = useCallback(async () => {
    if (!token) {
      setRentals([]);
      setLoading(false);
      setErrorMessage('Authentication required');
      return;
    }

    setLoading(true);
    setErrorMessage('');

    try {
      const data = await fetchMyRentals(token);
      setRentals(data.filter((r) => r.status === 'Active'));
    } catch (error) {
      setRentals([]);
      setErrorMessage(
        error instanceof ApiError
          ? error.message
          : 'Unable to load rentals. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      void loadRentals();
    }, [loadRentals])
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

      // Web redirects away. Native returns here after browser closes.
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

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1a237e" />
        <Text style={styles.loadingText}>Loading payments...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1A237E" />
      <ScreenHeader title="Payment" variant="dark" />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.hint}>
          Pay rent securely via Safepay. You will be redirected to the checkout
          page.
        </Text>

        {errorMessage ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.errorText}>{errorMessage}</Text>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={() => void loadRentals()}
            >
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : rentals.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="card-outline" size={60} color="#CBD5E1" />
            <Text style={styles.emptyText}>No active rentals to pay.</Text>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={() => router.push('/rentals' as any)}
            >
              <Text style={styles.retryButtonText}>Go to My Rentals</Text>
            </TouchableOpacity>
          </View>
        ) : (
          rentals.map((rental) => {
            const isPaying = payingRentalId === rental.id;
            const canPay =
              rental.monthlyRent != null && rental.monthlyRent > 0;

            return (
              <View
                key={rental.id}
                style={[styles.card, isWeb && styles.cardWeb]}
              >
                <View style={styles.cardBody}>
                  <Text style={styles.assetName}>{rental.name}</Text>
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
                </View>

                <TouchableOpacity
                  style={[
                    styles.payButton,
                    (!canPay || isPaying) && styles.payButtonDisabled,
                  ]}
                  disabled={!canPay || Boolean(payingRentalId)}
                  onPress={() => void handlePay(rental)}
                  activeOpacity={0.85}
                >
                  {isPaying ? (
                    <ActivityIndicator color="#ffffff" size="small" />
                  ) : (
                    <>
                      <Ionicons name="card-outline" size={18} color="#ffffff" />
                      <Text style={styles.payButtonText}>Pay with Safepay</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            );
          })
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
    backgroundColor: '#1A237E',
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
  assetName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  location: {
    fontSize: 14,
    color: '#64748B',
  },
  rent: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A237E',
  },
  payButton: {
    backgroundColor: '#1A237E',
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
});
