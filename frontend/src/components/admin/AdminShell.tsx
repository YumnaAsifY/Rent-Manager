import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  useWindowDimensions,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { usePathname, useRouter } from 'expo-router';
import { ReactNode } from 'react';

import { useAuth } from '@/context/AuthContext';

import AdminBottomNav from './AdminBottomNav';
import { adminTabs } from './adminNav';

type AdminShellProps = {
  title: string;
  children: ReactNode;
  /** Hide bottom nav on phone (e.g. user detail) */
  hideBottomNav?: boolean;
};

export default function AdminShell({
  title,
  children,
  hideBottomNav = false,
}: AdminShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { logout } = useAuth();
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && width >= 768;

  const performLogout = async () => {
    try {
      await logout();
      router.replace('/login' as any);
    } catch (error) {
      console.error('Logout error:', error);
      Alert.alert('Error', 'Unable to log out. Please try again.');
    }
  };

  const handleLogout = () => {
    if (Platform.OS === 'web') {
      const confirmed = window.confirm('Are you sure you want to logout?');
      if (confirmed) {
        void performLogout();
      }
      return;
    }

    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: () => void performLogout() },
    ]);
  };

  if (isDesktop) {
    return (
      <View style={styles.desktopShell}>
        <View style={styles.sidebar}>
          <View style={styles.sidebarBrandRow}>
            <View style={styles.sidebarBrand}>
              <Ionicons name="shield-checkmark" size={26} color="#ffffff" />
              <Text style={styles.sidebarBrandText}>Admin Panel</Text>
            </View>
          </View>

          <View style={styles.sidebarNavigation}>
            {adminTabs.map((tab) => {
              const isActive = tab.match(pathname);

              return (
                <TouchableOpacity
                  key={tab.name}
                  style={[
                    styles.sidebarItem,
                    isActive && styles.sidebarItemActive,
                  ]}
                  onPress={() => router.push(tab.path as any)}
                  activeOpacity={0.75}
                >
                  <Ionicons
                    name={
                      isActive
                        ? (tab.icon as any)
                        : (`${tab.icon}-outline` as any)
                    }
                    size={22}
                    color="#ffffff"
                  />
                  <Text style={styles.sidebarItemText}>{tab.name}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.sidebarFooter}>
            <View style={styles.sidebarFooterDivider} />
            <TouchableOpacity
              style={styles.sidebarItem}
              onPress={handleLogout}
              activeOpacity={0.75}
            >
              <Ionicons name="log-out-outline" size={22} color="#ffffff" />
              <Text style={styles.sidebarItemText}>Logout</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.desktopMain}>
          <View style={styles.desktopHeader}>
            <Text style={styles.desktopTitle}>{title}</Text>
          </View>
          <View style={styles.desktopContent}>{children}</View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.mobileShell}>
      <View style={styles.mobileHeader}>
        <Text style={styles.mobileTitle}>{title}</Text>
        <TouchableOpacity
          style={styles.mobileLogoutBtn}
          onPress={handleLogout}
          accessibilityRole="button"
          accessibilityLabel="Logout"
        >
          <Ionicons name="log-out-outline" size={22} color="#1A237E" />
        </TouchableOpacity>
      </View>

      <View style={styles.mobileContent}>{children}</View>

      {!hideBottomNav && <AdminBottomNav />}
    </View>
  );
}

const styles = StyleSheet.create({
  desktopShell: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#F5F5F5',
    minHeight: Platform.OS === 'web' ? ('100vh' as any) : undefined,
  },
  sidebar: {
    width: 250,
    backgroundColor: '#1A237E',
    paddingHorizontal: 16,
    paddingTop: 22,
    paddingBottom: 24,
  },
  sidebarBrandRow: {
    paddingBottom: 28,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.18)',
  },
  sidebarBrand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  sidebarBrandText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
  },
  sidebarNavigation: {
    flex: 1,
    paddingTop: 24,
    gap: 10,
  },
  sidebarItem: {
    minHeight: 52,
    borderRadius: 12,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  sidebarItemActive: {
    backgroundColor: '#505BD4',
  },
  sidebarItemText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },
  sidebarFooter: {
    paddingTop: 8,
  },
  sidebarFooterDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.18)',
    marginBottom: 10,
  },
  desktopMain: {
    flex: 1,
    minWidth: 0,
  },
  desktopHeader: {
    minHeight: 72,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#E8EAF6',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  desktopTitle: {
    color: '#1A237E',
    fontSize: 22,
    fontWeight: '700',
  },
  desktopContent: {
    flex: 1,
  },
  mobileShell: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  mobileHeader: {
    minHeight: 56,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#E8EAF6',
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 8 : 0,
  },
  mobileTitle: {
    color: '#1A237E',
    fontSize: 20,
    fontWeight: '700',
  },
  mobileLogoutBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#E8EAF6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mobileContent: {
    flex: 1,
  },
});
