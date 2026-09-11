import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Platform,
  useWindowDimensions,
  Alert,
} from 'react-native';
import { useCallback, useState } from 'react';
import {
  useFocusEffect,
  useLocalSearchParams,
  useRouter,
} from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import AdminShell from '@/components/admin/AdminShell';
import { useAuth } from '@/context/AuthContext';
import { ApiError } from '@/services/api';
import {
  AdminUser,
  fetchAdminUserById,
  setAdminUserActive,
} from '@/services/adminUsers';

const REASON_OPTIONS = [
  { id: 'fraud_scam' as const, label: 'Fraud / scam' },
  { id: 'platform_misuse' as const, label: 'Spam / misuse' },
  { id: 'non_payment' as const, label: 'Unpaid rent' },
];

const reasonLabel = (reason?: string | null) => {
  const found = REASON_OPTIONS.find((item) => item.id === reason);
  return found?.label || reason || '—';
};

export default function AdminUserDetailScreen() {
  const router = useRouter();
  const { token } = useAuth();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && width >= 768;
  const [user, setUser] = useState<AdminUser | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [showReasons, setShowReasons] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let mounted = true;

      const load = async () => {
        if (!token || !id) {
          if (mounted) {
            setUser(null);
            setErrorMessage(!token ? 'Authentication required' : 'User not found');
          }
          return;
        }

        try {
          const data = await fetchAdminUserById(token, String(id));
          if (mounted) {
            setUser(data);
            setErrorMessage('');
          }
        } catch (error) {
          if (mounted) {
            setUser(null);
            setErrorMessage(
              error instanceof ApiError ? error.message : 'User not found'
            );
          }
        }
      };

      void load();
      return () => {
        mounted = false;
      };
    }, [id, token])
  );

  const toggleActive = (
    deactivationReason?: 'fraud_scam' | 'platform_misuse' | 'non_payment'
  ) => {
    if (!user || !token) {
      return;
    }

    const nextActive = !user.isActive;
    if (!nextActive && !deactivationReason) {
      setShowReasons(true);
      return;
    }

    const title = nextActive ? 'Activate User' : 'Deactivate User';
    const message = nextActive
      ? `Allow ${user.name} to log in again?`
      : `Block ${user.name} from logging in?`;

    const apply = async () => {
      try {
        const updated = await setAdminUserActive(
          token,
          user.id,
          nextActive,
          deactivationReason
        );
        setUser(updated);
        setShowReasons(false);
      } catch (error) {
        const text =
          error instanceof ApiError
            ? error.message
            : 'Unable to update user status.';
        if (Platform.OS === 'web') {
          window.alert(text);
        } else {
          Alert.alert('Error', text);
        }
      }
    };

    if (Platform.OS === 'web') {
      const confirmed = window.confirm(`${title}\n\n${message}`);
      if (confirmed) {
        void apply();
      }
      return;
    }

    Alert.alert(title, message, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: nextActive ? 'Activate' : 'Deactivate',
        style: nextActive ? 'default' : 'destructive',
        onPress: () => void apply(),
      },
    ]);
  };

  return (
    <AdminShell title="User Detail" hideBottomNav>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.body,
          isDesktop && styles.bodyDesktop,
        ]}
        showsVerticalScrollIndicator={false}
      >
        <TouchableOpacity
          style={styles.backRow}
          onPress={() => router.push('/admin/users' as any)}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={20} color="#1A237E" />
          <Text style={styles.backText}>Back to Users</Text>
        </TouchableOpacity>

        {!user ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>User not found</Text>
            <Text style={styles.emptyText}>
              {errorMessage || 'This user was not found.'}
            </Text>
          </View>
        ) : (
          <View style={[styles.card, isDesktop && styles.cardDesktop]}>
            <View style={styles.headerRow}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {user.name.charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={styles.headerInfo}>
                <Text style={styles.name}>{user.name}</Text>
                <View
                  style={[
                    styles.badge,
                    user.isActive ? styles.badgeActive : styles.badgeInactive,
                  ]}
                >
                  <Text
                    style={[
                      styles.badgeText,
                      user.isActive
                        ? styles.badgeTextActive
                        : styles.badgeTextInactive,
                    ]}
                  >
                    {user.isActive ? 'Active' : 'Deactivated'}
                  </Text>
                </View>
              </View>
            </View>

            <View style={[styles.infoGrid, isDesktop && styles.infoGridDesktop]}>
              <InfoRow label="Email" value={user.email} />
              <InfoRow label="Phone" value={user.phone} />
              <InfoRow
                label="Payout"
                value={
                  user.ownerPayoutMethod && user.ownerPayoutDetails
                    ? `${user.ownerPayoutMethod} · ${user.ownerPayoutDetails}`
                    : 'Not saved'
                }
              />
              <InfoRow label="Joined" value={user.joinedAt} />
              <InfoRow
                label="Assets"
                value={String(user.assetsCount)}
              />
              <InfoRow
                label="Rentals"
                value={String(user.rentalsCount)}
              />
              {!user.isActive ? (
                <InfoRow
                  label="Block reason"
                  value={reasonLabel(user.deactivationReason)}
                />
              ) : null}
            </View>

            {showReasons && user.isActive ? (
              <View style={styles.reasonBox}>
                <Text style={styles.reasonTitle}>Select a reason</Text>
                {REASON_OPTIONS.map((option) => (
                  <TouchableOpacity
                    key={option.id}
                    style={styles.reasonBtn}
                    onPress={() => toggleActive(option.id)}
                  >
                    <Text style={styles.reasonBtnText}>{option.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            ) : (
            <TouchableOpacity
              style={[
                styles.actionBtn,
                user.isActive ? styles.deactivateBtn : styles.activateBtn,
              ]}
              onPress={() => toggleActive()}
              activeOpacity={0.85}
            >
              <Ionicons
                name={user.isActive ? 'ban-outline' : 'checkmark-circle-outline'}
                size={18}
                color="#ffffff"
              />
              <Text style={styles.actionBtnText}>
                {user.isActive ? 'Deactivate' : 'Activate'}
              </Text>
            </TouchableOpacity>
            )}
          </View>
        )}
      </ScrollView>
    </AdminShell>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoItem}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  body: {
    padding: 16,
    paddingBottom: 28,
  },
  bodyDesktop: {
    padding: 28,
    paddingBottom: 40,
    maxWidth: 720,
  },
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 14,
  },
  backText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A237E',
  },
  emptyCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: '#E8EAF6',
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1A237E',
    marginBottom: 6,
  },
  emptyText: {
    fontSize: 14,
    color: '#5C6BC0',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E8EAF6',
  },
  cardDesktop: {
    padding: 24,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 20,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#E8EAF6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 26,
    fontWeight: '700',
    color: '#1A237E',
  },
  headerInfo: {
    flex: 1,
    gap: 8,
  },
  name: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1A237E',
  },
  badge: {
    alignSelf: 'flex-start',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeActive: {
    backgroundColor: '#E8F5E9',
  },
  badgeInactive: {
    backgroundColor: '#FFEBEE',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  badgeTextActive: {
    color: '#2E7D32',
  },
  badgeTextInactive: {
    color: '#C62828',
  },
  infoGrid: {
    gap: 14,
    marginBottom: 22,
  },
  infoGridDesktop: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  infoItem: {
    minWidth: '40%' as any,
    flexGrow: 1,
  },
  infoLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#9FA8DA',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    marginBottom: 3,
  },
  infoValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#283593',
  },
  actionBtn: {
    minHeight: 48,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  deactivateBtn: {
    backgroundColor: '#C62828',
  },
  activateBtn: {
    backgroundColor: '#2E7D32',
  },
  actionBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  reasonBox: {
    gap: 8,
  },
  reasonTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#5C6BC0',
    marginBottom: 4,
  },
  reasonBtn: {
    borderWidth: 1,
    borderColor: '#C62828',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  reasonBtnText: {
    color: '#C62828',
    fontWeight: '600',
    fontSize: 14,
  },
});
