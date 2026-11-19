import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Platform,
  useWindowDimensions,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import { useCallback, useState } from 'react';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import AdminShell from '@/components/admin/AdminShell';
import { subscribeAdminRefresh } from '@/utils/adminRefresh';
import { readAdminCache, writeAdminCache } from '@/utils/adminScreenCache';
import { useAuth } from '@/context/AuthContext';
import { fetchAdminStats, type AdminStats } from '@/services/payments';

function greetingForHour(hour: number) {
  if (hour < 12) return 'Good Morning';
  if (hour < 17) return 'Good Afternoon';
  return 'Good Evening';
}

function formatToday(date: Date) {
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

type StatCard = {
  id: string;
  title: string;
  value: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  subtitleIcon: keyof typeof Ionicons.glyphMap;
  onPress?: () => void;
  cardBg: string;
  iconColor: string;
  iconBg: string;
  subtitleColor: string;
};

export default function AdminDashboardScreen() {
  const router = useRouter();
  const { token, user } = useAuth();
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && width >= 768;
  const initialStats = readAdminCache<AdminStats>('admin-stats');
  const [stats, setStats] = useState<AdminStats>(
    initialStats ?? {
      totalUsers: 0,
      activeUsers: 0,
      totalAssets: 0,
      pendingSettlements: 0,
    }
  );
  const [loading, setLoading] = useState(initialStats === undefined);
  const now = new Date();
  const adminName = user?.name?.trim().split(' ')[0] || 'Admin';

  const load = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }

    const cached = readAdminCache<AdminStats>('admin-stats');
    if (cached === undefined) {
      setLoading(true);
    } else {
      setStats(cached);
      setLoading(false);
    }

    try {
      const data = await fetchAdminStats(token);
      writeAdminCache('admin-stats', data);
      setStats(data);
    } catch {
      if (cached === undefined) {
        setStats({
          totalUsers: 0,
          activeUsers: 0,
          totalAssets: 0,
          pendingSettlements: 0,
        });
      }
    } finally {
      setLoading(false);
    }
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      void load();
      return subscribeAdminRefresh(() => {
        void load();
      });
    }, [load])
  );

  const cards: StatCard[] = [
    {
      id: 'total-users',
      title: 'Total Users',
      value: String(stats.totalUsers),
      subtitle: 'Registered accounts',
      icon: 'people',
      subtitleIcon: 'arrow-up',
      onPress: () => router.replace('/admin/users?view=total' as any),
      cardBg: '#F7F8FF',
      iconColor: '#5B6CFF',
      iconBg: '#E6E9FF',
      subtitleColor: '#22A06B',
    },
    {
      id: 'active-users',
      title: 'Active Users',
      value: String(stats.activeUsers),
      subtitle: 'Can log in',
      icon: 'checkmark-circle',
      subtitleIcon: 'ellipse',
      onPress: () => router.replace('/admin/users?view=manage' as any),
      cardBg: '#F3FBF6',
      iconColor: '#22A06B',
      iconBg: '#DDF6E8',
      subtitleColor: '#22A06B',
    },
    {
      id: 'total-assets',
      title: 'Total Assets',
      value: String(stats.totalAssets),
      subtitle: 'Listed on platform',
      icon: 'home',
      subtitleIcon: 'layers',
      cardBg: '#FFF9F1',
      iconColor: '#E6A23C',
      iconBg: '#FFE8C4',
      subtitleColor: '#E6A23C',
    },
    {
      id: 'pending-settlements',
      title: 'Pending Settlements',
      value: String(stats.pendingSettlements),
      subtitle: 'Awaiting owner payout',
      icon: 'wallet',
      subtitleIcon: 'time-outline',
      onPress: () => router.replace('/admin/payments' as any),
      cardBg: '#FFF6F7',
      iconColor: '#E85D6A',
      iconBg: '#FFE1E6',
      subtitleColor: '#E85D6A',
    },
  ];

  return (
    <AdminShell title="Dashboard">
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.body,
          isDesktop && styles.bodyDesktop,
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          <View style={styles.heroText}>
            <Text style={[styles.greeting, isDesktop && styles.greetingDesktop]}>
              {greetingForHour(now.getHours())},{'\n'}
              {adminName}{' '}
              <Text style={styles.wave}>👋</Text>
            </Text>
            <Text style={styles.heroSubtitle}>
              Here's what's happening with your platform today.
            </Text>
          </View>
          <View style={styles.dateChip}>
            <Ionicons name="calendar-outline" size={16} color="#5B4DFF" />
            <Text style={styles.dateText}>{formatToday(now)}</Text>
          </View>
        </View>

        {loading ? (
          <View style={styles.loadingState}>
            <ActivityIndicator size="large" color="#5B4DFF" />
          </View>
        ) : (
          <View style={styles.grid}>
            {cards.map((card) => {
              const body = (
                <>
                  <View style={styles.cardTop}>
                    <View style={[styles.iconBox, { backgroundColor: card.iconBg }]}>
                      <Ionicons name={card.icon} size={22} color={card.iconColor} />
                    </View>
                    {card.onPress ? (
                      <Ionicons name="chevron-forward" size={18} color="#C5CAD6" />
                    ) : null}
                  </View>
                  <Text style={styles.cardTitle}>{card.title}</Text>
                  <Text style={styles.cardValue}>{card.value}</Text>
                  <View style={styles.subtitleRow}>
                    <Ionicons
                      name={card.subtitleIcon}
                      size={12}
                      color={card.subtitleColor}
                    />
                    <Text style={styles.cardSubtitle}>{card.subtitle}</Text>
                  </View>
                </>
              );

              return card.onPress ? (
                <Pressable
                  key={card.id}
                  onPress={card.onPress}
                  style={({ pressed }) => [
                    styles.card,
                    isDesktop && styles.cardDesktop,
                    { backgroundColor: card.cardBg },
                    pressed && styles.cardPressed,
                  ]}
                >
                  {body}
                </Pressable>
              ) : (
                <View
                  key={card.id}
                  style={[
                    styles.card,
                    isDesktop && styles.cardDesktop,
                    { backgroundColor: card.cardBg },
                  ]}
                >
                  {body}
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </AdminShell>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  loadingState: {
    paddingVertical: 48,
    alignItems: 'center',
  },
  body: {
    padding: 16,
    paddingBottom: 28,
  },
  bodyDesktop: {
    padding: 28,
    paddingBottom: 40,
    maxWidth: 920,
    width: '100%',
    alignSelf: 'center',
  },
  hero: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 18,
  },
  heroText: {
    flex: 1,
    minWidth: 0,
  },
  greeting: {
    fontSize: 26,
    lineHeight: 32,
    fontWeight: '800',
    color: '#1B2346',
  },
  greetingDesktop: {
    fontSize: 32,
    lineHeight: 38,
  },
  wave: {
    fontSize: 24,
  },
  heroSubtitle: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 20,
    color: '#8B93A7',
  },
  dateChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E6EAF2',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 4,
  },
  dateText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1B2346',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  card: {
    flexGrow: 1,
    flexBasis: '46%',
    maxWidth: '48%',
    borderRadius: 22,
    padding: 14,
    minHeight: 148,
    ...Platform.select({
      ios: {
        shadowColor: '#1B2346',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.06,
        shadowRadius: 16,
      },
      android: {
        elevation: 2,
      },
      web: {
        boxShadow: '0 8px 24px rgba(27, 35, 70, 0.06)',
      },
    }),
  },
  cardDesktop: {
    flexBasis: '47%',
    maxWidth: '48%',
    minHeight: 168,
    padding: 18,
  },
  cardPressed: {
    opacity: 0.92,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  iconBox: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    marginTop: 12,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '700',
    color: '#1B2346',
  },
  cardValue: {
    marginTop: 8,
    fontSize: 30,
    lineHeight: 34,
    fontWeight: '800',
    color: '#1B2346',
  },
  subtitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  cardSubtitle: {
    flex: 1,
    minWidth: 0,
    fontSize: 12,
    lineHeight: 16,
    color: '#8B93A7',
  },
});
