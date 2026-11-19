import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, usePathname, useRouter } from 'expo-router';
import { ReactNode, useCallback, useState } from 'react';

import { useAuth } from '@/context/AuthContext';
import { fetchMyPendingRequestsCount } from '@/services/rentalRequests';
import { navigationTabs } from './BottomNavigation';

type OwnerShellProps = {
  children: ReactNode;
};

function isTabActive(path: string, pathname: string) {
  if (path === '/home') {
    return pathname === '/home';
  }
  if (path === '/requests') {
    return pathname === '/requests' || pathname.startsWith('/request-details');
  }
  if (path === '/payment') {
    return pathname === '/payment' || pathname.startsWith('/payment/');
  }
  if (path === '/profile') {
    return (
      pathname === '/profile' ||
      pathname.startsWith('/edit-profile') ||
      pathname.startsWith('/change-password')
    );
  }
  return pathname === path;
}

export default function OwnerShell({ children }: OwnerShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { logout, token } = useAuth();
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let mounted = true;

      const loadCount = async () => {
        if (!token) {
          if (mounted) {
            setPendingRequestsCount(0);
          }
          return;
        }

        try {
          const count = await fetchMyPendingRequestsCount(token);
          if (mounted) {
            setPendingRequestsCount(count);
          }
        } catch {
          if (mounted) {
            setPendingRequestsCount(0);
          }
        }
      };

      void loadCount();
      return () => {
        mounted = false;
      };
    }, [token])
  );

  const performLogout = async () => {
    try {
      await logout();
      router.replace('/login' as any);
    } catch (error) {
      console.error('Logout error:', error);
      Alert.alert('Error', 'Unable to log out. Please try again.');
    }
  };

  const handleLogoutPress = () => {
    if (Platform.OS === 'web') {
      if (window.confirm('Are you sure you want to logout?')) {
        void performLogout();
      }
      return;
    }

    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', onPress: () => void performLogout() },
    ]);
  };

  return (
    <View style={styles.shell}>
      {sidebarOpen ? (
      <View style={styles.sidebar}>
        <View style={styles.brandRow}>
          <View style={styles.logo}>
            <Ionicons name="home" size={18} color="#FFFFFF" />
          </View>
          <View style={styles.brandCopy}>
            <Text style={styles.brandText}>RENT MANAGER</Text>
            <Text style={styles.brandSub}>Welcome to Rent Manager</Text>
          </View>
          <TouchableOpacity
            style={styles.menuButton}
            onPress={() => setSidebarOpen(false)}
            accessibilityRole="button"
            accessibilityLabel="Close navigation menu"
          >
            <Ionicons name="menu" size={22} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        <View style={styles.nav}>
          {navigationTabs.map((tab) => {
            const isActive = isTabActive(tab.path, pathname);
            const showBadge = tab.name === 'Requests' && pendingRequestsCount > 0;

            return (
              <TouchableOpacity
                key={tab.name}
                style={[styles.item, isActive && styles.itemActive]}
                onPress={() => {
                  if (tab.path === '/profile') {
                    router.push({
                      pathname: '/profile',
                      params: { source: 'sidebar' },
                    } as any);
                    return;
                  }
                  router.push(tab.path as any);
                }}
                activeOpacity={0.75}
              >
                <View style={styles.iconWrap}>
                  <Ionicons
                    name={
                      isActive
                        ? (tab.icon as any)
                        : (`${tab.icon}-outline` as any)
                    }
                    size={20}
                    color="#FFFFFF"
                  />
                  {showBadge ? (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>
                        {pendingRequestsCount > 9 ? '9+' : pendingRequestsCount}
                      </Text>
                    </View>
                  ) : null}
                </View>
                <Text style={styles.itemText}>{tab.name}</Text>
              </TouchableOpacity>
            );
          })}

          <TouchableOpacity
            style={[styles.item, pathname === '/contact' && styles.itemActive]}
            onPress={() => router.push('/contact' as any)}
            activeOpacity={0.75}
          >
            <View style={styles.iconWrap}>
              <Ionicons
                name={
                  pathname === '/contact'
                    ? 'chatbubble-ellipses'
                    : 'chatbubble-ellipses-outline'
                }
                size={20}
                color="#FFFFFF"
              />
            </View>
            <Text style={styles.itemText}>Contact Us</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.tagline}>Better Rentals</Text>
          <Text style={styles.taglineStrong}>Brighter Future</Text>
          <View style={styles.divider} />
          <TouchableOpacity
            style={styles.item}
            onPress={handleLogoutPress}
            activeOpacity={0.75}
          >
            <View style={styles.iconWrap}>
              <Ionicons name="log-out-outline" size={20} color="#FFFFFF" />
            </View>
            <Text style={styles.itemText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </View>
      ) : (
        <View style={styles.sidebarCollapsed}>
          <TouchableOpacity
            style={styles.reopenButton}
            onPress={() => setSidebarOpen(true)}
            accessibilityRole="button"
            accessibilityLabel="Open navigation menu"
          >
            <Ionicons name="menu" size={22} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#F4F6FB',
    minHeight: Platform.OS === 'web' ? ('100vh' as any) : undefined,
  },
  sidebar: {
    width: 248,
    backgroundColor: '#1B2346',
    paddingHorizontal: 16,
    paddingTop: 22,
    paddingBottom: 20,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingBottom: 22,
  },
  brandCopy: {
    flex: 1,
    minWidth: 0,
  },
  menuButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sidebarCollapsed: {
    width: 64,
    backgroundColor: '#1B2346',
    paddingTop: 22,
    alignItems: 'center',
  },
  reopenButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#5B4DFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  brandSub: {
    color: 'rgba(255,255,255,0.62)',
    fontSize: 11,
    marginTop: 2,
  },
  nav: {
    flex: 1,
    paddingTop: 8,
    gap: 6,
  },
  item: {
    minHeight: 46,
    borderRadius: 12,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  itemActive: {
    backgroundColor: '#5B4DFF',
  },
  iconWrap: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -7,
    right: -10,
    minWidth: 18,
    height: 18,
    borderRadius: 10,
    paddingHorizontal: 4,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  itemText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  footer: {
    paddingTop: 8,
  },
  tagline: {
    color: 'rgba(255,255,255,0.72)',
    fontSize: 13,
    fontWeight: '600',
  },
  taglineStrong: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    marginTop: 2,
    marginBottom: 14,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.12)',
    marginBottom: 8,
  },
  content: {
    flex: 1,
    minWidth: 0,
    backgroundColor: '#F4F6FB',
  },
});
