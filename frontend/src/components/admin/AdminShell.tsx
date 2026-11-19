import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  useWindowDimensions,
  Alert,
  Modal,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, usePathname, useRouter } from 'expo-router';
import { ReactNode, useCallback, useState } from 'react';

import { useAuth } from '@/context/AuthContext';
import { fetchUnreadNotificationsCount } from '@/services/notifications';

import AdminBottomNav from './AdminBottomNav';
import { openAdminScreen } from '@/utils/adminRefresh';

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
  const { logout, token } = useAuth();
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && width >= 768;
  const [homeMenuOpen, setHomeMenuOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const isAdminHome = adminTabs[0].match(pathname);

  useFocusEffect(
    useCallback(() => {
      let mounted = true;

      const loadCount = async () => {
        if (!token) {
          if (mounted) {
            setUnreadCount(0);
          }
          return;
        }

        try {
          const count = await fetchUnreadNotificationsCount(token);
          if (mounted) {
            setUnreadCount(count);
          }
        } catch {
          if (mounted) {
            setUnreadCount(0);
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

  const openProfile = () => {
    setHomeMenuOpen(false);
    openAdminScreen(router, pathname, '/profile');
  };

  const openNotifications = () => {
    setHomeMenuOpen(false);
    openAdminScreen(router, pathname, '/notifications');
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
                  onPress={() => openAdminScreen(router, pathname, tab.path)}
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
            <View style={styles.headerActions}>
              <TouchableOpacity
                style={styles.bellButton}
                onPress={openNotifications}
                accessibilityRole="button"
                accessibilityLabel="Notifications"
              >
                <Ionicons
                  name="notifications-outline"
                  size={24}
                  color="#1B2346"
                />
                {unreadCount > 0 ? (
                  <View style={styles.bellBadge}>
                    <Text style={styles.bellBadgeText}>
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </Text>
                  </View>
                ) : null}
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.profileButton}
                onPress={openProfile}
                accessibilityRole="button"
                accessibilityLabel="Open profile"
              >
                <Ionicons name="person" size={20} color="#1B2346" />
              </TouchableOpacity>
            </View>
          </View>
          <View style={styles.desktopContent}>{children}</View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.mobileShell}>
      <View style={styles.mobileHeader}>
        {isAdminHome ? (
          <TouchableOpacity
            style={styles.mobileMenuBtn}
            onPress={() => setHomeMenuOpen(true)}
            accessibilityRole="button"
            accessibilityLabel="Open menu"
          >
            <Ionicons name="menu" size={26} color="#1B2346" />
          </TouchableOpacity>
        ) : (
          <Text style={styles.mobileTitle}>{title}</Text>
        )}
        <View style={styles.mobileHeaderActions}>
          <TouchableOpacity
            style={styles.bellButton}
            onPress={openNotifications}
            accessibilityRole="button"
            accessibilityLabel="Notifications"
          >
            <Ionicons name="notifications-outline" size={24} color="#1B2346" />
            {unreadCount > 0 ? (
              <View style={styles.bellBadge}>
                <Text style={styles.bellBadgeText}>
                  {unreadCount > 9 ? '9+' : unreadCount}
                </Text>
              </View>
            ) : null}
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.mobileProfileButton}
            onPress={openProfile}
            accessibilityRole="button"
            accessibilityLabel="Open profile"
          >
            <Ionicons name="person" size={20} color="#1B2346" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.mobileContent}>{children}</View>

      {!hideBottomNav && <AdminBottomNav />}

      <Modal
        visible={homeMenuOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setHomeMenuOpen(false)}
      >
        <Pressable
          style={styles.menuOverlay}
          onPress={() => setHomeMenuOpen(false)}
        >
          <Pressable style={styles.menuCard} onPress={() => undefined}>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setHomeMenuOpen(false);
                openAdminScreen(router, pathname, '/admin/asset-categories');
              }}
              activeOpacity={0.75}
            >
              <Ionicons name="layers-outline" size={20} color="#5B4DFF" />
              <Text style={styles.menuItemText}>Asset Category</Text>
            </TouchableOpacity>
            <View style={styles.menuDivider} />
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setHomeMenuOpen(false);
                handleLogout();
              }}
              activeOpacity={0.75}
            >
              <Ionicons name="log-out-outline" size={20} color="#E53935" />
              <Text style={[styles.menuItemText, styles.menuItemDanger]}>
                Logout
              </Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  desktopShell: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#F4F6FB',
    minHeight: Platform.OS === 'web' ? ('100vh' as any) : undefined,
  },
  sidebar: {
    width: 250,
    backgroundColor: '#1B2346',
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
    backgroundColor: '#5B4DFF',
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
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E8ECF4',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 28,
  },
  profileButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#E8ECF4',
    backgroundColor: '#F4F6FB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  bellButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bellBadge: {
    position: 'absolute',
    top: 2,
    right: 0,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#E53935',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  bellBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  desktopTitle: {
    color: '#1B2346',
    fontSize: 22,
    fontWeight: '700',
  },
  desktopContent: {
    flex: 1,
  },
  mobileShell: {
    flex: 1,
    backgroundColor: '#F4F6FB',
  },
  mobileHeader: {
    minHeight: 56,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E8ECF4',
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 8 : 0,
  },
  mobileTitle: {
    color: '#1B2346',
    fontSize: 20,
    fontWeight: '700',
  },
  mobileProfileButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#E8ECF4',
    backgroundColor: '#F4F6FB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mobileHeaderActions: {
    marginLeft: 'auto',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  mobileMenuBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.35)',
    paddingTop: Platform.OS === 'ios' ? 64 : 56,
    paddingHorizontal: 12,
    alignItems: 'flex-start',
  },
  menuCard: {
    minWidth: 220,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingVertical: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 16,
    elevation: 10,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  menuItemText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#5B4DFF',
  },
  menuItemDanger: {
    color: '#E53935',
  },
  menuDivider: {
    height: 1,
    backgroundColor: '#EEF2FF',
    marginHorizontal: 12,
  },
  mobileContent: {
    flex: 1,
  },
});
