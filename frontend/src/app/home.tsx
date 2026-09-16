import {
  View,
  ScrollView,
  StyleSheet,
  Text,
  Image,
  Platform,
  TouchableOpacity,
  useWindowDimensions,
  Alert,
  Modal,
  Pressable,
} from 'react-native';
import { usePathname, useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useState, useCallback } from 'react';

import Header from '../components/Header';
import DashboardCard from '../components/DashboardCard';
import BottomNavigation, {
  navigationTabs,
} from '../components/BottomNavigation';

import { useAuth } from '@/context/AuthContext';
import { fetchMyAssetsCount } from '@/services/assets';
import { fetchMyRentalsCount } from '@/services/rentals';
import { fetchMyPendingRequestsCount } from '@/services/rentalRequests';
import { fetchUnreadNotificationsCount } from '@/services/notifications';

export default function HomeScreen() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, token, logout } = useAuth();
  const { width } = useWindowDimensions();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [ownedAssetsCount, setOwnedAssetsCount] = useState(0);
  const [myRentalsCount, setMyRentalsCount] = useState(0);
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0);
  const isDesktop = Platform.OS === 'web' && width >= 768;

  useFocusEffect(
    useCallback(() => {
      let isMounted = true;

      const loadHomeCounts = async () => {
        if (!token) {
          if (isMounted) {
            setOwnedAssetsCount(0);
            setMyRentalsCount(0);
            setPendingRequestsCount(0);
            setUnreadNotificationsCount(0);
          }
          return;
        }

        try {
          const [assetsCount, rentalsCount, pendingCount, unreadCount] =
            await Promise.all([
              fetchMyAssetsCount(token),
              fetchMyRentalsCount(token),
              fetchMyPendingRequestsCount(token),
              fetchUnreadNotificationsCount(token),
            ]);

          if (isMounted) {
            setOwnedAssetsCount(assetsCount);
            setMyRentalsCount(rentalsCount);
            setPendingRequestsCount(pendingCount);
            setUnreadNotificationsCount(unreadCount);
          }
        } catch {
          if (isMounted) {
            setOwnedAssetsCount(0);
            setMyRentalsCount(0);
            setPendingRequestsCount(0);
            setUnreadNotificationsCount(0);
          }
        }
      };

      void loadHomeCounts();

      return () => {
        isMounted = false;
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
      const confirmed = window.confirm('Are you sure you want to logout?');
      if (confirmed) {
        void performLogout();
      }
      return;
    }

    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', onPress: () => void performLogout() },
    ]);
  };

  const cards = [
    {
      id: 1,
      title: 'My Assets',
      value:
        ownedAssetsCount === 1
          ? '1 Asset'
          : `${ownedAssetsCount} Assets`,
      icon: 'home' as const,
      onPress: () => router.push('/properties' as any),
      cardBg: '#EEF4FF',
      iconColor: '#4A7CF7',
      iconBg: '#D6E4FF',
    },
    {
      id: 2,
      title: 'My Rentals',
      value:
        myRentalsCount === 1
          ? '1 Rental'
          : `${myRentalsCount} Rentals`,
      icon: 'business' as const,
      onPress: () => router.push('/rentals' as any),
      cardBg: '#F0FAF5',
      iconColor: '#2EAD6E',
      iconBg: '#D4F5E3',
    },
    {
      id: 4,
      title: 'Explore Assets',
      subtitle: 'Find your next asset',
      icon: 'search' as const,
      onPress: () => router.push('/exploree' as any),
      cardBg: '#F5F1FF',
      iconColor: '#8B5CF6',
      iconBg: '#E8DFFF',
    },
  ];

  if (isDesktop) {
    return (
      <View style={styles.desktopShell}>
        {isSidebarOpen && (
          <View style={styles.sidebar}>
            <View style={styles.sidebarBrandRow}>
              <View style={styles.sidebarBrand}>
                <Ionicons name="business" size={26} color="#ffffff" />
                <Text style={styles.sidebarBrandText}>Rent Manager</Text>
              </View>
              <TouchableOpacity
                style={styles.sidebarCloseButton}
                onPress={() => setIsSidebarOpen(false)}
                accessibilityRole="button"
                accessibilityLabel="Close navigation menu"
              >
                <Ionicons name="close" size={24} color="#ffffff" />
              </TouchableOpacity>
            </View>

            <View style={styles.sidebarNavigation}>
              {navigationTabs.map((tab) => {
                const isActive = pathname === tab.path;
                const showBadge =
                  tab.name === 'Requests' && pendingRequestsCount > 0;

                return (
                  <TouchableOpacity
                    key={tab.name}
                    style={[
                      styles.sidebarItem,
                      isActive && styles.sidebarItemActive,
                    ]}
                    onPress={() => {
                      setIsSidebarOpen(false);
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
                    <View style={styles.sidebarIconWrapper}>
                      <Ionicons
                        name={
                          isActive
                            ? (tab.icon as any)
                            : (`${tab.icon}-outline` as any)
                        }
                        size={23}
                        color="#ffffff"
                      />
                      {showBadge && (
                        <View style={styles.sidebarBadge}>
                          <Text style={styles.sidebarBadgeText}>
                            {pendingRequestsCount > 9
                              ? '9+'
                              : pendingRequestsCount}
                          </Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.sidebarItemText}>{tab.name}</Text>
                  </TouchableOpacity>
                );
              })}
              <TouchableOpacity
                style={[
                  styles.sidebarItem,
                  pathname === '/contact' && styles.sidebarItemActive,
                ]}
                onPress={() => {
                  setIsSidebarOpen(false);
                  router.push('/contact' as any);
                }}
                activeOpacity={0.75}
              >
                <View style={styles.sidebarIconWrapper}>
                  <Ionicons
                    name={
                      (pathname === '/contact'
                        ? 'chatbubble-ellipses'
                        : 'chatbubble-ellipses-outline') as any
                    }
                    size={23}
                    color="#ffffff"
                  />
                </View>
                <Text style={styles.sidebarItemText}>Contact Us</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.sidebarFooter}>
              <View style={styles.sidebarFooterDivider} />
              <TouchableOpacity
                style={styles.sidebarItem}
                onPress={handleLogoutPress}
                activeOpacity={0.75}
                accessibilityRole="button"
                accessibilityLabel="Logout"
              >
                <View style={styles.sidebarIconWrapper}>
                  <Ionicons
                    name="log-out-outline"
                    size={23}
                    color="#ffffff"
                  />
                </View>
                <Text style={styles.sidebarItemText}>Logout</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        <View style={styles.desktopMain}>
          <View style={styles.desktopHeader}>
            <View style={styles.desktopHeaderContent}>
              <TouchableOpacity
                style={styles.menuButton}
                onPress={() => setIsSidebarOpen((open) => !open)}
                accessibilityRole="button"
                accessibilityLabel="Open navigation menu"
              >
                <Ionicons name="menu" size={30} color="#FFFFFF" />
              </TouchableOpacity>

              <View style={styles.desktopUserInfo}>
                <Text style={styles.desktopUserName}>
                  {user?.name || 'User'}
                </Text>
                <Text style={styles.desktopWelcomeText}>
                  Welcome to Rent Manager
                </Text>
              </View>

              <View style={styles.desktopHeaderActions}>
                <TouchableOpacity
                  style={styles.desktopNotificationButton}
                  onPress={() => router.push('/notifications' as any)}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name="notifications-outline"
                    size={28}
                    color="#FFFFFF"
                  />
                  {unreadNotificationsCount > 0 ? (
                    <View style={styles.notificationBadge}>
                      <Text style={styles.notificationBadgeText}>
                        {unreadNotificationsCount > 9
                          ? '9+'
                          : unreadNotificationsCount}
                      </Text>
                    </View>
                  ) : null}
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.desktopProfileButton}
                  onPress={() =>
                    router.push({
                      pathname: '/profile',
                      params: { source: 'header' },
                    } as any)
                  }
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel="Open profile"
                >
                  <Ionicons name="person" size={20} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            </View>
          </View>

          <ScrollView
            style={styles.desktopScrollView}
            contentContainerStyle={styles.desktopScrollContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.desktopContent}>
              <View style={styles.hero}>
                <Image
                  source={require('@/assets/images/home-hero.png')}
                  style={styles.heroImage}
                  resizeMode="cover"
                />
                <View style={styles.heroCopy}>
                  <Text style={styles.heroTitle}>
                    Ease your renting system
                  </Text>
                  <View style={styles.heroAccent} />
                  <Text style={styles.heroSubtitle}>
                    Manage your properties, rentals, and next move in one
                    convenient place.
                  </Text>
                </View>
              </View>

              <View style={styles.desktopCardsGrid}>
                {cards.map((card) => (
                  <View key={card.id} style={styles.desktopCardWrapper}>
                    <DashboardCard
                      title={card.title}
                      value={card.value}
                      subtitle={card.subtitle}
                      icon={card.icon}
                      onPress={card.onPress}
                      cardBg={card.cardBg}
                      iconColor={card.iconColor}
                      iconBg={card.iconBg}
                      desktop
                      showViewDetails
                    />
                  </View>
                ))}
              </View>

              <View style={styles.desktopBannerContainer}>
                <View style={styles.banner}>
                  <View style={styles.bannerContent}>
                    <Text style={styles.bannerTitle}>
                      Find Your Dream Asset
                    </Text>
                    <Text style={styles.bannerSubtitle}>
                      Browse thousands of rental properties in your area
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          </ScrollView>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {isSidebarOpen ? (
        <Modal
          visible={isSidebarOpen}
          transparent
          animationType="fade"
          onRequestClose={() => setIsSidebarOpen(false)}
        >
          <Pressable
            style={styles.mobileMenuOverlay}
            onPress={() => setIsSidebarOpen(false)}
          >
            <Pressable
              style={styles.mobileMenuCard}
              onPress={(event) => event.stopPropagation()}
            >
              <TouchableOpacity
                style={styles.mobileMenuRow}
                onPress={() => {
                  setIsSidebarOpen(false);
                  router.push('/contact' as any);
                }}
                activeOpacity={0.75}
              >
                <View style={styles.mobileMenuIconWrap}>
                  <Ionicons
                    name="chatbubble-ellipses-outline"
                    size={20}
                    color="#323a8f"
                  />
                </View>
                <Text style={styles.mobileMenuItemText}>Contact Us</Text>
              </TouchableOpacity>

              <View style={styles.mobileMenuDivider} />

              <TouchableOpacity
                style={styles.mobileMenuRow}
                onPress={() => {
                  setIsSidebarOpen(false);
                  handleLogoutPress();
                }}
                activeOpacity={0.75}
              >
                <View style={[styles.mobileMenuIconWrap, styles.mobileMenuLogoutIcon]}>
                  <Ionicons name="log-out-outline" size={20} color="#E53935" />
                </View>
                <Text style={styles.mobileMenuLogoutText}>Logout</Text>
              </TouchableOpacity>
            </Pressable>
          </Pressable>
        </Modal>
      ) : null}

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Header
          userName={user?.name || 'User'}
          onMenuPress={() => setIsSidebarOpen(true)}
        />

        <View style={styles.cardsGrid}>
          {cards.map((card) => (
            <DashboardCard
              key={card.id}
              title={card.title}
              value={card.value}
              subtitle={card.subtitle}
              icon={card.icon}
              onPress={card.onPress}
              cardBg={card.cardBg}
              iconColor={card.iconColor}
              iconBg={card.iconBg}
              showViewDetails
            />
          ))}
        </View>

        {/* Explore Banner */}
        <View style={styles.bannerContainer}>
          <View style={styles.banner}>
            <View style={styles.bannerContent}>
              <Text style={styles.bannerTitle}>Find Your Dream Asset</Text>
              <Text style={styles.bannerSubtitle}>
                Browse thousands of rental properties in your area
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>

      <BottomNavigation />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  cardsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    gap: 16,
  },
  bannerContainer: {
    paddingHorizontal: 20,
    marginTop: 8,
  },
  banner: {
    backgroundColor: '#323a8f',
    borderRadius: 16,
    padding: 24,
    minHeight: 120,
    justifyContent: 'center',
  },
  bannerContent: {
    maxWidth: 600,
  },
  bannerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 8,
  },
  bannerSubtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.85)',
  },
  desktopShell: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#f5f5f5',
  },
  sidebar: {
    width: 250,
    backgroundColor: '#323a8f',
    paddingHorizontal: 16,
    paddingTop: 22,
    paddingBottom: 24,
  },
  sidebarBrandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  sidebarCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
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
    backgroundColor: '#505bd4',
  },
  sidebarIconWrapper: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  sidebarBadge: {
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
  sidebarBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: 'bold',
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
  mobileMenuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.28)',
    paddingTop: Platform.OS === 'ios' ? 96 : 88,
    paddingHorizontal: 14,
    alignItems: 'flex-start',
  },
  mobileMenuCard: {
    width: 220,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#E8EAF6',
    shadowColor: '#1A237E',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 18,
    elevation: 14,
  },
  mobileMenuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  mobileMenuIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mobileMenuLogoutIcon: {
    backgroundColor: '#FFEBEE',
  },
  mobileMenuDivider: {
    height: 1,
    backgroundColor: '#EEF2FF',
    marginHorizontal: 14,
  },
  mobileMenuItemText: {
    color: '#323a8f',
    fontSize: 15,
    fontWeight: '700',
  },
  mobileMenuLogoutText: {
    color: '#E53935',
    fontSize: 15,
    fontWeight: '700',
  },
  desktopMain: {
    flex: 1,
    minWidth: 0,
  },
  desktopHeader: {
    minHeight: 82,
    backgroundColor: '#323a8f',
    borderBottomWidth: 1,
    borderBottomColor: '#2c337d',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  desktopHeaderContent: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuButton: {
    width: 46,
    height: 46,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 18,
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  desktopUserInfo: {
    flex: 1,
  },
  desktopUserName: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  desktopWelcomeText: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 14,
    fontWeight: '500',
  },
  desktopHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  desktopProfileButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  desktopNotificationButton: {
    padding: 10,
    position: 'relative',
  },
  notificationBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#EF4444',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  notificationBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  desktopScrollView: {
    flex: 1,
  },
  desktopScrollContent: {
    paddingBottom: 32,
  },
  desktopContent: {
    width: '100%',
  },
  hero: {
    height: 360,
    overflow: 'hidden',
    justifyContent: 'center',
    backgroundColor: '#f5f5f5',
  },
  heroImage: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: '100%',
    height: '100%',
  },
  heroCopy: {
    width: '40%',
    minWidth: 300,
    paddingHorizontal: 42,
    paddingVertical: 34,
    justifyContent: 'center',
    zIndex: 1,
  },
  heroTitle: {
    color: '#323a8f',
    fontSize: 40,
    lineHeight: 46,
    fontWeight: 'bold',
    maxWidth: 420,
  },
  heroAccent: {
    width: 72,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#505bd4',
    marginTop: 18,
    marginBottom: 18,
  },
  heroSubtitle: {
    color: '#283593',
    fontSize: 17,
    lineHeight: 26,
    maxWidth: 420,
  },
  desktopCardsGrid: {
    flexDirection: 'row',
    gap: 18,
    marginTop: -24,
    marginHorizontal: 28,
    zIndex: 1,
  },
  desktopCardWrapper: {
    flex: 1,
    minWidth: 0,
  },
  desktopBannerContainer: {
    marginTop: 22,
    marginHorizontal: 28,
  },
});