import { View, Text, StyleSheet, TouchableOpacity, StatusBar } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import ScreenHeader from '../../components/ScreenHeader';
import LiftPressable from '../../components/LiftPressable';

/**
 * Safepay redirect cancel landing (Phase 3).
 */
export default function PaymentCancelScreen() {
  const router = useRouter();
  const { paymentId } = useLocalSearchParams<{ paymentId?: string }>();

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <ScreenHeader title="Payment" variant="dark" fallbackHref="/payment" />

      <View style={styles.body}>
        <View style={styles.iconWrap}>
          <Ionicons name="close-circle" size={64} color="#E53935" />
        </View>
        <Text style={styles.title}>Payment cancelled</Text>
        <Text style={styles.subtitle}>
          You left Safepay checkout without completing payment. You can try
          again anytime.
        </Text>
        {paymentId ? (
          <Text style={styles.meta}>Payment ID: {paymentId}</Text>
        ) : null}

        <LiftPressable
          style={styles.button}
          onPress={() =>
            router.replace({
              pathname: '/payment',
            } as any)
          }
        >
          <Text style={styles.buttonText}>Back to Payments</Text>
        </LiftPressable>
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
  iconWrap: {
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#5B4DFF',
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
    fontSize: 12,
    color: '#94A3B8',
    marginBottom: 4,
  },
  button: {
    marginTop: 24,
    backgroundColor: '#5B4DFF',
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 14,
  },
  buttonText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 15,
  },
});
