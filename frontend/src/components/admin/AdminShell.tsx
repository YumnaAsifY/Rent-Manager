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
import { usePathname, useRouter } from 'expo-router';
import { ReactNode, useState } from 'react';

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
  const [homeMenuOpen, setHomeMenuOpen] = useState(false);
  const isAdminHome = adminTabs[0].match(pathname);

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
        {isAdminHome ? (
          <TouchableOpacity
            style={styles.mobileMenuBtn}
            onPress={() => setHomeMenuOpen(true)}
            accessibilityRole="button"
            accessibilityLabel="Open menu"
          >
            <Ionicons name="menu" size={26} color="#FFFFFF" />
          </TouchableOpacity>
        ) : (
          <Text style={styles.mobileTitle}>{title}</Text>
        )}
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
                router.push('/admin/asset-categories' as any);
              }}
              activeOpacity={0.75}
            >
              <Ionicons name="layers-outline" size={20} color="#323a8f" />
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
    backgroundColor: '#F5F5F5',
    minHeight: Platform.OS === 'web' ? ('100vh' as any) : undefined,
  },
  sidebar: {
    width: 250,
    backgroundColor: '#323a8f',
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
    backgroundColor: '#323a8f',
    borderBottomWidth: 1,
    borderBottomColor: '#2c337d',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  desktopTitle: {
    color: '#FFFFFF',
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
    backgroundColor: '#323a8f',
    borderBottomWidth: 1,
    borderBottomColor: '#2c337d',
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 8 : 0,
  },
  mobileTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
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
    color: '#323a8f',
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
