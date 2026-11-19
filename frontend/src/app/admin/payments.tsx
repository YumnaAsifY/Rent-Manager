import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Platform,
  useWindowDimensions,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import AdminShell from '@/components/admin/AdminShell';
import { subscribeAdminRefresh } from '@/utils/adminRefresh';
import { readAdminCache, writeAdminCache } from '@/utils/adminScreenCache';
import LiftPressable from '@/components/LiftPressable';
import { useAuth } from '@/context/AuthContext';
import { ApiError } from '@/services/api';
import {
  AdminPayment,
  fetchAdminPayments,
  settleAdminPayment,
} from '@/services/payments';

type FilterKey = 'all' | 'pending_settlement' | 'settled';

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'pending_settlement', label: 'Pending Settlement' },
  { key: 'settled', label: 'Settled' },
];

function formatMoney(amount: number) {
  return `Rs ${amount.toLocaleString('en-PK')}`;
}

export default function AdminPaymentsScreen() {
  const { token } = useAuth();
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && width >= 768;
  const [filter, setFilter] = useState<FilterKey>('all');
  const initialPayments = readAdminCache<AdminPayment[]>('admin-payments:all');
  const [payments, setPayments] = useState<AdminPayment[]>(initialPayments ?? []);
  const [loading, setLoading] = useState(initialPayments === undefined);
  const [errorMessage, setErrorMessage] = useState('');
  const [settlingId, setSettlingId] = useState<string | null>(null);

  const loadPayments = useCallback(async () => {
    const cacheKey = `admin-payments:${filter}`;

    if (!token) {
      setPayments([]);
      setLoading(false);
      setErrorMessage('Authentication required');
      return;
    }

    const cached = readAdminCache<AdminPayment[]>(cacheKey);
    if (cached === undefined) {
      setPayments([]);
      setLoading(true);
    } else {
      setPayments(cached);
      setLoading(false);
    }
    setErrorMessage('');

    try {
      const data = await fetchAdminPayments(token, filter);
      writeAdminCache(cacheKey, data);
      setPayments(data);
    } catch (error) {
      if (readAdminCache<AdminPayment[]>(cacheKey) === undefined) {
        setPayments([]);
        setErrorMessage(
          error instanceof ApiError
            ? error.message
            : 'Unable to load payments. Please try again.'
        );
      }
    } finally {
      setLoading(false);
    }
  }, [filter, token]);

  useFocusEffect(
    useCallback(() => {
      void loadPayments();
      return subscribeAdminRefresh(() => {
        void loadPayments();
      });
    }, [loadPayments])
  );

  const markSettled = (payment: AdminPayment) => {
    if (!token) {
      return;
    }

    const apply = async () => {
      setSettlingId(payment.id);
      try {
        const updated = await settleAdminPayment(token, payment.id);
        setPayments((prev) => {
          const next = prev
            .map((item) => (item.id === updated.id ? updated : item))
            .filter((item) =>
              filter === 'all' ? true : item.status === filter
            );
          writeAdminCache(`admin-payments:${filter}`, next);
          return next;
        });
      } catch (error) {
        const message =
          error instanceof ApiError
            ? error.message
            : 'Unable to mark payment as settled.';
        if (Platform.OS === 'web') {
          window.alert(message);
        } else {
          Alert.alert('Error', message);
        }
      } finally {
        setSettlingId(null);
      }
    };

    if (Platform.OS === 'web') {
      const confirmed = window.confirm(
        'Mark this payment as settled? Confirm only after you paid the owner.'
      );
      if (confirmed) {
        void apply();
      }
      return;
    }

    Alert.alert(
      'Mark Settled',
      'Confirm only after you paid the owner share.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Mark Settled', onPress: () => void apply() },
      ]
    );
  };

  return (
    <AdminShell title="Payments">
      <View style={styles.flex}>
        <View style={[styles.filtersRow, isDesktop && styles.filtersRowDesktop]}>
          {FILTERS.map((item) => {
            const active = filter === item.key;
            return (
              <TouchableOpacity
                key={item.key}
                style={[
                  styles.filterChip,
                  active && styles.filterChipActive,
                  isDesktop && styles.filterChipDesktop,
                ]}
                onPress={() => {
                  if (item.key === filter) {
                    return;
                  }
                  const cached = readAdminCache<AdminPayment[]>(
                    `admin-payments:${item.key}`
                  );
                  setFilter(item.key);
                  setErrorMessage('');
                  if (cached === undefined) {
                    setPayments([]);
                    setLoading(true);
                  } else {
                    setPayments(cached);
                    setLoading(false);
                  }
                }}
                activeOpacity={0.75}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    active && styles.filterChipTextActive,
                  ]}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[
            styles.listContent,
            isDesktop && styles.listContentDesktop,
          ]}
          showsVerticalScrollIndicator={false}
        >
          {loading ? (
            <View style={styles.emptyState}>
              <ActivityIndicator size="large" color="#5B4DFF" />
              <Text style={styles.emptyText}>Loading payments...</Text>
            </View>
          ) : errorMessage ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>{errorMessage}</Text>
              <TouchableOpacity style={styles.settleBtn} onPress={() => void loadPayments()}>
                <Text style={styles.settleBtnText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : payments.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="card-outline" size={40} color="#9FA8DA" />
              <Text style={styles.emptyTitle}>No payments yet</Text>
              <Text style={styles.emptyText}>
                Nothing matches this filter right now.
              </Text>
            </View>
          ) : (
            payments.map((payment) => {
              const isPending = payment.status === 'pending_settlement';
              const profitPercent = payment.adminProfitPercent ?? 3;

              return (
                <View
                  key={payment.id}
                  style={[styles.card, isDesktop && styles.cardDesktop]}
                >
                  <View style={styles.cardTop}>
                    <View style={styles.cardTopLeft}>
                      <Text style={styles.assetName}>{payment.assetName}</Text>
                      <Text style={styles.dateText}>{payment.date}</Text>
                    </View>
                    <View
                      style={[
                        styles.statusBadge,
                        isPending
                          ? styles.statusPending
                          : styles.statusSettled,
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusText,
                          isPending
                            ? styles.statusTextPending
                            : styles.statusTextSettled,
                        ]}
                      >
                        {isPending ? 'Pending Settlement' : 'Settled'}
                      </Text>
                    </View>
                  </View>

                  <View
                    style={[
                      styles.metaGrid,
                      isDesktop && styles.metaGridDesktop,
                    ]}
                  >
                    <View style={styles.metaItem}>
                      <Text style={styles.metaLabel}>Tenant</Text>
                      <Text style={styles.metaValue}>{payment.tenantName}</Text>
                    </View>
                    <View style={styles.metaItem}>
                      <Text style={styles.metaLabel}>Owner</Text>
                      <Text style={styles.metaValue}>{payment.ownerName}</Text>
                    </View>
                    <View style={styles.metaItem}>
                      <Text style={styles.metaLabel}>Total</Text>
                      <Text style={styles.metaValueStrong}>
                        {formatMoney(payment.totalAmount)}
                      </Text>
                    </View>
                    <View style={styles.metaItem}>
                      <Text style={styles.metaLabel}>
                        Admin commission ({profitPercent}%)
                      </Text>
                      <Text style={styles.metaProfit}>
                        {formatMoney(payment.adminProfitAmount)}
                      </Text>
                    </View>
                    <View style={styles.metaItem}>
                      <Text style={styles.metaLabel}>Owner share</Text>
                      <Text style={styles.metaValueStrong}>
                        {formatMoney(payment.ownerShareAmount)}
                      </Text>
                    </View>
                    <View style={styles.metaItem}>
                      <Text style={styles.metaLabel}>Owner payout</Text>
                      <Text style={styles.metaValue}>
                        {payment.ownerPayoutMethod} · {payment.ownerPayoutDetails}
                      </Text>
                    </View>
                  </View>

                  {isPending ? (
                    <LiftPressable
                      style={styles.settleBtn}
                      onPress={() => markSettled(payment)}
                      disabled={settlingId === payment.id}
                    >
                      {settlingId === payment.id ? (
                        <ActivityIndicator color="#ffffff" />
                      ) : (
                        <>
                          <Ionicons
                            name="checkmark-done-outline"
                            size={18}
                            color="#ffffff"
                          />
                          <Text style={styles.settleBtnText}>Mark Settled</Text>
                        </>
                      )}
                    </LiftPressable>
                  ) : (
                    <View style={styles.settledRow}>
                      <Ionicons
                        name="checkmark-circle"
                        size={18}
                        color="#2EAD6E"
                      />
                      <Text style={styles.settledLabel}>Settled with owner</Text>
                    </View>
                  )}
                </View>
              );
            })
          )}
        </ScrollView>
      </View>
    </AdminShell>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  filtersRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 8,
  },
  filtersRowDesktop: {
    paddingHorizontal: 28,
    paddingTop: 20,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#E8EAF6',
  },
  filterChipDesktop: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  filterChipActive: {
    backgroundColor: '#5B4DFF',
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#3949AB',
  },
  filterChipTextActive: {
    color: '#ffffff',
  },
  scroll: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 28,
    gap: 12,
  },
  listContentDesktop: {
    paddingHorizontal: 28,
    paddingBottom: 40,
    gap: 14,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E8EAF6',
  },
  emptyTitle: {
    marginTop: 12,
    fontSize: 17,
    fontWeight: '700',
    color: '#5B4DFF',
  },
  emptyText: {
    marginTop: 6,
    fontSize: 14,
    color: '#5C6BC0',
    textAlign: 'center',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E8EAF6',
  },
  cardDesktop: {
    padding: 20,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 14,
  },
  cardTopLeft: {
    flex: 1,
  },
  assetName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#5B4DFF',
    marginBottom: 4,
  },
  dateText: {
    fontSize: 12,
    color: '#7986CB',
  },
  statusBadge: {
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  statusPending: {
    backgroundColor: '#FFF3E0',
  },
  statusSettled: {
    backgroundColor: '#E8F5E9',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  statusTextPending: {
    color: '#EF6C00',
  },
  statusTextSettled: {
    color: '#2E7D32',
  },
  metaGrid: {
    gap: 10,
  },
  metaGridDesktop: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  metaItem: {
    minWidth: '30%' as any,
    flexGrow: 1,
  },
  metaLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#9FA8DA',
    marginBottom: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  metaValue: {
    fontSize: 14,
    color: '#283593',
    fontWeight: '500',
  },
  metaValueStrong: {
    fontSize: 15,
    color: '#5B4DFF',
    fontWeight: '700',
  },
  metaProfit: {
    fontSize: 15,
    color: '#E53935',
    fontWeight: '700',
  },
  settleBtn: {
    marginTop: 16,
    backgroundColor: '#5B4DFF',
    borderRadius: 12,
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  settleBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  settledRow: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  settledLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2EAD6E',
  },
});
