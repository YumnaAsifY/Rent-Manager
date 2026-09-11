import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { useCallback, useState } from 'react';
import { useRouter, useFocusEffect } from 'expo-router';

import AdminShell from '@/components/admin/AdminShell';
import DashboardCard from '@/components/DashboardCard';
import { useAuth } from '@/context/AuthContext';
import { fetchAdminStats, type AdminStats } from '@/services/payments';

export default function AdminDashboardScreen() {
  const router = useRouter();
  const { token } = useAuth();
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && width >= 768;
  const [stats, setStats] = useState<AdminStats>({
    totalUsers: 0,
    activeUsers: 0,
    totalAssets: 0,
    pendingSettlements: 0,
  });

  useFocusEffect(
    useCallback(() => {
      let mounted = true;

      const load = async () => {
        if (!token) {
          return;
        }
        try {
          const data = await fetchAdminStats(token);
          if (mounted) {
            setStats(data);
          }
        } catch {
          if (mounted) {
            setStats({
              totalUsers: 0,
              activeUsers: 0,
              totalAssets: 0,
              pendingSettlements: 0,
            });
          }
        }
      };

      void load();
      return () => {
        mounted = false;
      };
    }, [token])
  );

  const cards = [
    {
      id: 'total-users',
      title: 'Total Users',
      value: String(stats.totalUsers),
      subtitle: 'Registered accounts',
      icon: 'people' as const,
      onPress: () => router.push('/admin/users' as any),
      cardBg: '#EEF4FF',
      iconColor: '#4A7CF7',
      iconBg: '#D6E4FF',
    },
    {
      id: 'active-users',
      title: 'Active Users',
      value: String(stats.activeUsers),
      subtitle: 'Can log in',
      icon: 'checkmark-circle' as const,
      onPress: () => router.push('/admin/users' as any),
      cardBg: '#F0FAF5',
      iconColor: '#2EAD6E',
      iconBg: '#D4F5E3',
    },
    {
      id: 'total-assets',
      title: 'Total Assets',
      value: String(stats.totalAssets),
      subtitle: 'Listed on platform',
      icon: 'home' as const,
      onPress: () => {},
      cardBg: '#FFF8EE',
      iconColor: '#E6A046',
      iconBg: '#FFE8C8',
    },
    {
      id: 'pending-settlements',
      title: 'Pending Settlements',
      value: String(stats.pendingSettlements),
      subtitle: 'Awaiting owner payout',
      icon: 'wallet' as const,
      onPress: () => router.push('/admin/payments' as any),
      cardBg: '#FFF5F5',
      iconColor: '#E53935',
      iconBg: '#FFCDD2',
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
        <View style={[styles.welcome, isDesktop && styles.welcomeDesktop]}>
          <Text style={styles.welcomeTitle}>Admin Dashboard</Text>
          <Text style={styles.welcomeSubtitle}>
            Overview of users, assets, and settlements
          </Text>
        </View>

        <View style={[styles.grid, isDesktop && styles.gridDesktop]}>
          {cards.map((card) => (
            <View
              key={card.id}
              style={[
                styles.cardWrap,
                isDesktop ? styles.cardWrapDesktop : styles.cardWrapMobile,
              ]}
            >
              <DashboardCard
                title={card.title}
                value={card.value}
                subtitle={card.subtitle}
                icon={card.icon}
                onPress={card.onPress}
                cardBg={card.cardBg}
                iconColor={card.iconColor}
                iconBg={card.iconBg}
                desktop={isDesktop}
              />
            </View>
          ))}
        </View>
      </ScrollView>
    </AdminShell>
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
  },
  welcome: {
    marginBottom: 16,
  },
  welcomeDesktop: {
    marginBottom: 22,
  },
  welcomeTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1A237E',
    marginBottom: 4,
  },
  welcomeSubtitle: {
    fontSize: 14,
    color: '#5C6BC0',
    lineHeight: 20,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  gridDesktop: {
    gap: 18,
  },
  cardWrap: {
    marginBottom: 4,
  },
  cardWrapMobile: {
    width: '48%',
  },
  cardWrapDesktop: {
    width: 'calc(50% - 9px)' as any,
    flexGrow: 0,
    flexShrink: 0,
  },
});
