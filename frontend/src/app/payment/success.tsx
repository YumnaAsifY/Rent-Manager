import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';

import ScreenHeader from '../../components/ScreenHeader';
import LiftPressable from '../../components/LiftPressable';
import { useAuth } from '@/context/AuthContext';
import { ApiError } from '@/services/api';
import {
  verifyPayment,
  type PaymentSessionPayment,
} from '@/services/payments';

/** Safepay redirect can corrupt paymentId — keep first 24-hex ObjectId. */
function normalizePaymentId(value?: string | string[]) {
  const candidates = Array.isArray(value) ? value : value ? [value] : [];
  for (const candidate of candidates) {
    const match = String(candidate).match(/[a-f0-9]{24}/i);
    if (match) {
      return match[0];
    }
  }
  return undefined;
}

/**
 * Safepay redirect success landing — verifies via paymentId (DB tracker).
 */
export default function PaymentSuccessScreen() {
  const router = useRouter();
  const { token } = useAuth();
  const params = useLocalSearchParams<{
    paymentId?: string | string[];
  }>();
  const paymentId = normalizePaymentId(params.paymentId);

  const [loading, setLoading] = useState(true);
  const [verified, setVerified] = useState(false);
  const [message, setMessage] = useState('');
  const [payment, setPayment] = useState<PaymentSessionPayment | null>(null);
  const verifiedRef = useRef(false);
  const lastVerifiedIdRef = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const runVerify = async () => {
      // Don't overwrite a successful result if params flicker/corrupt later.
      if (verifiedRef.current && lastVerifiedIdRef.current === paymentId) {
        if (!cancelled) {
          setLoading(false);
        }
        return;
      }

      if (!token) {
        if (!cancelled && !verifiedRef.current) {
          setLoading(false);
          setMessage('Please log in to confirm your payment.');
        }
        return;
      }

      if (!paymentId) {
        if (!cancelled && !verifiedRef.current) {
          setLoading(false);
          setMessage('Missing payment reference from Safepay.');
        }
        return;
      }

      try {
        const result = await verifyPayment(token, { paymentId });

        if (cancelled) {
          return;
        }

        if (result.verified) {
          verifiedRef.current = true;
          lastVerifiedIdRef.current = paymentId;
        }

        setVerified(result.verified);
        setPayment(result.payment);
        setMessage(
          result.verified
            ? 'Payment confirmed. Admin will settle the owner share.'
            : result.message ||
                'Payment not confirmed yet. Tap retry if you already paid.'
        );
      } catch (error) {
        if (cancelled || verifiedRef.current) {
          return;
        }

        setVerified(false);
        setMessage(
          error instanceof ApiError
            ? error.message
            : 'Unable to verify payment. Please try again.'
        );
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void runVerify();

    return () => {
      cancelled = true;
    };
  }, [paymentId, token]);

  const retryVerify = async () => {
    if (!token || !paymentId) {
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      const result = await verifyPayment(token, { paymentId });
      if (result.verified) {
        verifiedRef.current = true;
        lastVerifiedIdRef.current = paymentId;
      }
      setVerified(result.verified);
      setPayment(result.payment);
      setMessage(
        result.verified
          ? 'Payment confirmed. Admin will settle the owner share.'
          : result.message ||
              'Payment not confirmed yet. Tap retry if you already paid.'
      );
    } catch (error) {
      if (!verifiedRef.current) {
        setVerified(false);
        setMessage(
          error instanceof ApiError
            ? error.message
            : 'Unable to verify payment. Please try again.'
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#323a8f" />
      <ScreenHeader title="Payment" variant="dark" fallbackHref="/payment" />

      <View style={styles.body}>
        {loading ? (
          <>
            <ActivityIndicator size="large" color="#323a8f" />
            <Text style={styles.loadingText}>Confirming with Safepay...</Text>
          </>
        ) : (
          <>
            <View style={styles.iconWrap}>
              <Ionicons
                name={verified ? 'checkmark-circle' : 'alert-circle'}
                size={64}
                color={verified ? '#2EAD6E' : '#EF6C00'}
              />
            </View>
            <Text style={styles.title}>
              {verified ? 'Payment successful' : 'Payment pending'}
            </Text>
            <Text style={styles.subtitle}>{message}</Text>

            {payment ? (
              <>
                <Text style={styles.meta}>
                  Amount: Rs {Number(payment.totalAmount).toLocaleString('en-PK')}
                </Text>
                {payment.adminProfitPercent != null ? (
                  <Text style={styles.meta}>
                    Includes {payment.adminProfitPercent}% admin commission
                  </Text>
                ) : null}
                <Text style={styles.meta}>Status: {payment.status}</Text>
              </>
            ) : null}

            {!verified ? (
              <TouchableOpacity
                style={[styles.button, styles.secondaryButton]}
                onPress={() => void retryVerify()}
                activeOpacity={0.85}
              >
                <Text style={[styles.buttonText, styles.secondaryButtonText]}>
                  Retry verification
                </Text>
              </TouchableOpacity>
            ) : null}

            <LiftPressable
              style={styles.button}
              onPress={() =>
                router.replace({
                  pathname: '/payment',
                  params: { section: 'history' },
                } as any)
              }
            >
              <Text style={styles.buttonText}>Back to Payments</Text>
            </LiftPressable>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  body: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 40,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 14,
    fontSize: 15,
    color: '#64748B',
  },
  iconWrap: {
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#323a8f',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 16,
    maxWidth: 360,
  },
  meta: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 4,
  },
  button: {
    marginTop: 16,
    backgroundColor: '#323a8f',
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 14,
    minWidth: 200,
    alignItems: 'center',
  },
  buttonText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 15,
  },
  secondaryButton: {
    backgroundColor: '#E8EAF6',
    marginTop: 8,
  },
  secondaryButtonText: {
    color: '#323a8f',
  },
});
