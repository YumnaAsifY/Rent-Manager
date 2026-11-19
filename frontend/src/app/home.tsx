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
import { LinearGradient } from 'expo-linear-gradient';
import { useState, useCallback } from 'react';

import Header from '../components/Header';
import BottomNavigation, {
  navigationTabs,
} from '../components/BottomNavigation';

import { useAuth } from '@/context/AuthContext';
import { fetchMyAssetsCount } from '@/services/assets';
import { fetchMyRentalsCount } from '@/services/rentals';
import { fetchMyPendingRequestsCount } from '@/services/rentalRequests';
import {
  AppNotification,
  fetchMyNotifications,
  fetchUnreadNotificationsCount,
  markNotificationAsRead,
} from '@/services/notifications';

type HomeCard = {
  id: number;
  title: string;
  value?: string;
  subtitle?: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  cardBg: string;
  iconColor: string;
  iconBg: string;
  actionLabel?: string;
};

function activityIcon(type: string): keyof typeof Ionicons.glyphMap {
  if (type.startsWith('payment_')) {
    return 'card-outline';
  }
  if (type === 'tenancy_cancelled' || type.startsWith('cancellation_')) {
    return 'close-circle-outline';
  }
  if (type.includes('request') || type === 'asset_assigned') {
    return 'document-text-outline';
  }
  return 'notifications-outline';
}

function activityTint(type: string) {
  if (type.startsWith('payment_')) {
    return { backgroundColor: '#E7F8EE', color: '#16A34A' };
  }
  if (type === 'tenancy_cancelled' || type.startsWith('cancellation_')) {
    return { backgroundColor: '#FDECEC', color: '#DC2626' };
  }
  return { backgroundColor: '#EEF0FF', color: '#4F46E5' };
}

export default function HomeScreen() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, token, logout } = useAuth();
  const { width } = useWindowDimensions();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [ownedAssetsCount, setOwnedAssetsCount] = useState(0);
  const [myRentalsCount, setMyRentalsCount] = useState(0);
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0);
  const [recentActivity, setRecentActivity] = useState<AppNotification[]>([]);
  const isDesktop = Platform.OS === 'web' && width >= 768;
  const mobileCardWidth = (width - 16 * 2 - 12) / 2;
  const showDesktopSidebar = isDesktop && !sidebarCollapsed;

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
            setRecentActivity([]);
          }
          return;
        }

        try {
          const [assetsCount, rentalsCount, pendingCount, unreadCount, activity] =
            await Promise.all([
              fetchMyAssetsCount(token),
              fetchMyRentalsCount(token),
              fetchMyPendingRequestsCount(token),
              fetchUnreadNotificationsCount(token),
              fetchMyNotifications(token).catch(() => [] as AppNotification[]),
            ]);

          if (isMounted) {
            setOwnedAssetsCount(assetsCount);
            setMyRentalsCount(rentalsCount);
            setPendingRequestsCount(pendingCount);
            setUnreadNotificationsCount(unreadCount);
            setRecentActivity(activity.slice(0, 4));
          }
        } catch {
          if (isMounted) {
            setOwnedAssetsCount(0);
            setMyRentalsCount(0);
            setPendingRequestsCount(0);
            setUnreadNotificationsCount(0);
            setRecentActivity([]);
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

  const cards: HomeCard[] = [
    {
      id: 1,
      title: 'My Assets',
      value:
        ownedAssetsCount === 1 ? '1 Asset' : `${ownedAssetsCount} Assets`,
      icon: 'home',
      onPress: () => router.push('/properties' as any),
      cardBg: '#F4F1FF',
      iconColor: '#5B4DFF',
      iconBg: '#E4DEFF',
    },
    {
      id: 2,
      title: 'My Rentals',
      value: myRentalsCount === 1 ? '1 Rental' : `${myRentalsCount} Rentals`,
      icon: 'business',
      onPress: () => router.push('/rentals' as any),
      cardBg: '#EEFBF4',
      iconColor: '#16A34A',
      iconBg: '#D8F5E4',
    },
    {
      id: 4,
      title: 'Explore Assets',
      subtitle: 'Find your desired asset',
      icon: 'search',
      onPress: () => router.push('/exploree' as any),
      cardBg: '#F6F3FF',
      iconColor: '#7C3AED',
      iconBg: '#E9E0FF',
    },
  ];

  const hasPayout =
    Boolean(user?.payoutMethod) && user?.payoutMethod !== 'none';
  const payoutCard: HomeCard = {
    id: 5,
    title: 'Add payment method',
    value: hasPayout
      ? user?.payoutMethod === 'jazzcash'
        ? 'JazzCash'
        : user?.payoutMethod === 'easypaisa'
          ? 'EasyPaisa'
          : user?.payoutBankName || 'Bank'
      : 'Not added yet',
    subtitle: 'JazzCash, EasyPaisa or bank',
    icon: 'wallet',
    onPress: () => router.push('/add-payment-method' as any),
    cardBg: '#FFF6EE',
    iconColor: '#EA580C',
    iconBg: '#FFE6D2',
    actionLabel: hasPayout ? 'Manage method' : 'Add method',
  };

  const homeCards = [...cards, payoutCard];
  const firstName = (user?.name || 'User').trim().split(' ')[0] || 'User';
  const initial = firstName.charAt(0).toUpperCase();

  const openActivity = async (notification: AppNotification) => {
    if (!token) {
      return;
    }

    if (!notification.isRead) {
      try {
        await markNotificationAsRead(token, notification.id);
        setRecentActivity((prev) =>
          prev.map((item) =>
            item.id === notification.id
              ? { ...item, isRead: true, read: true }
              : item
          )
        );
        setUnreadNotificationsCount((count) => Math.max(0, count - 1));
      } catch {
        // Still open the related screen if marking read fails.
      }
    }

    if (notification.type === 'admin_dispute_email') {
      return;
    }

    if (notification.relatedRequestId) {
      router.push(`/request-details/${notification.relatedRequestId}` as any);
      return;
    }

    if (notification.type === 'tenancy_cancelled') {
      router.push(`/cancellation-detail/${notification.id}` as any);
      return;
    }

    if (
      notification.type === 'rental_request_accepted' ||
      notification.type === 'asset_assigned'
    ) {
      router.push('/rentals' as any);
      return;
    }

    if (notification.type.startsWith('payment_')) {
      if (
        notification.type === 'payment_received' ||
        notification.type === 'payment_settled' ||
        notification.type === 'payment_sent_to_admin'
      ) {
        router.push({
          pathname: '/payment',
          params: { section: 'history' },
        } as any);
        return;
      }

      if (notification.audience === 'owner') {
        if (notification.relatedAssetId) {
          router.push(`/property-details/${notification.relatedAssetId}` as any);
          return;
        }
        router.push('/properties' as any);
        return;
      }

      if (notification.relatedRentalId) {
        router.push(`/rental-detail/${notification.relatedRentalId}` as any);
        return;
      }

      router.push('/payment' as any);
      return;
    }

    router.push('/notifications' as any);
  };

  const renderStatCard = (card: HomeCard) => (
    <TouchableOpacity
      key={card.id}
      style={[styles.statCard, { backgroundColor: card.cardBg }]}
      onPress={card.onPress}
      activeOpacity={0.88}
    >
      <View style={[styles.statIcon, { backgroundColor: card.iconBg }]}>
        <Ionicons name={card.icon} size={22} color={card.iconColor} />
      </View>
      <Text style={styles.statTitle} numberOfLines={1}>
        {card.title}
      </Text>
      {card.value ? (
        <Text style={[styles.statValue, { color: card.iconColor }]} numberOfLines={1}>
          {card.value}
        </Text>
      ) : null}
      {card.subtitle ? (
        <Text style={styles.statSubtitle} numberOfLines={1}>
          {card.subtitle}
        </Text>
      ) : (
        <View style={styles.statSubtitleSpacer} />
      )}
      <View style={styles.statFooter}>
        <Text style={styles.statAction} numberOfLines={1}>
          {card.actionLabel || 'View Details'}
        </Text>
        <View style={[styles.statArrow, { backgroundColor: card.iconColor }]}>
          <Ionicons name="arrow-forward" size={14} color="#FFFFFF" />
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderActivity = () => (
    <View style={styles.activityCard}>
      <View style={styles.activityHeader}>
        <View style={styles.activityTitleRow}>
          <View style={styles.activityTitleIcon}>
            <Ionicons name="calendar-outline" size={16} color="#5B4DFF" />
          </View>
          <Text style={styles.activityTitle}>Recent Activity</Text>
        </View>
        <TouchableOpacity
          onPress={() => router.push('/notifications' as any)}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="View all notifications"
        >
          <Text style={styles.activityViewAll}>View all →</Text>
        </TouchableOpacity>
      </View>

      {recentActivity.length === 0 ? (
        <Text style={styles.activityEmpty}>No recent activity</Text>
      ) : (
        recentActivity.map((item, index) => {
          const tint = activityTint(item.type);
          return (
            <TouchableOpacity
              key={item.id}
              style={[
                styles.activityRow,
                index < recentActivity.length - 1 && styles.activityRowBorder,
              ]}
              onPress={() => void openActivity(item)}
              activeOpacity={0.75}
            >
              <View style={[styles.activityIconWrap, { backgroundColor: tint.backgroundColor }]}>
                <Ionicons name={activityIcon(item.type)} size={18} color={tint.color} />
              </View>
              <View style={styles.activityCopy}>
                <Text style={styles.activityItemTitle} numberOfLines={1}>
                  {item.title}
                </Text>
                <Text style={styles.activityItemMessage} numberOfLines={1}>
                  {item.message}
                </Text>
              </View>
              <Text style={styles.activityTime} numberOfLines={1}>
                {item.time}
              </Text>
              <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
            </TouchableOpacity>
          );
        })
      )}
    </View>
  );

  const renderSidebar = (desktop: boolean) => (
    <View style={desktop ? styles.sidebar : styles.mobileMenuCard}>
      {desktop ? (
        <View style={styles.sidebarBrandRow}>
          <View style={styles.sidebarBrand}>
            <View style={styles.sidebarLogo}>
              <Ionicons name="home" size={18} color="#FFFFFF" />
            </View>
            <View>
              <Text style={styles.sidebarBrandText}>RENT MANAGER</Text>
              <Text style={styles.sidebarBrandSub}>Welcome to Rent Manager</Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.sidebarCloseButton}
            onPress={() => setSidebarCollapsed(true)}
            accessibilityRole="button"
            accessibilityLabel="Close navigation menu"
          >
            <Ionicons name="menu" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      ) : null}

      <View style={desktop ? styles.sidebarNavigation : undefined}>
        {desktop
          ? navigationTabs.map((tab) => {
          const isActive = pathname === tab.path;
          const showBadge = tab.name === 'Requests' && pendingRequestsCount > 0;

          return (
            <TouchableOpacity
              key={tab.name}
              style={[
                desktop ? styles.sidebarItem : styles.mobileMenuRow,
                desktop && isActive && styles.sidebarItemActive,
              ]}
              onPress={() => {
                if (desktop) {
                  setSidebarCollapsed(false);
                } else {
                  setIsSidebarOpen(false);
                }
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
              <View style={desktop ? styles.sidebarIconWrapper : styles.mobileMenuIconWrap}>
                <Ionicons
                  name={
                    isActive
                      ? (tab.icon as any)
                      : (`${tab.icon}-outline` as any)
                  }
                  size={desktop ? 20 : 18}
                  color={desktop ? '#FFFFFF' : '#5B4DFF'}
                />
                {showBadge && desktop ? (
                  <View style={styles.sidebarBadge}>
                    <Text style={styles.sidebarBadgeText}>
                      {pendingRequestsCount > 9 ? '9+' : pendingRequestsCount}
                    </Text>
                  </View>
                ) : null}
              </View>
              <Text style={desktop ? styles.sidebarItemText : styles.mobileMenuItemText}>
                {tab.name}
              </Text>
              {showBadge && !desktop ? (
                <View style={styles.mobileBadge}>
                  <Text style={styles.sidebarBadgeText}>
                    {pendingRequestsCount > 9 ? '9+' : pendingRequestsCount}
                  </Text>
                </View>
              ) : null}
            </TouchableOpacity>
          );
        })
          : null}

        <TouchableOpacity
          style={[
            desktop ? styles.sidebarItem : styles.mobileMenuRow,
            desktop && pathname === '/contact' && styles.sidebarItemActive,
          ]}
          onPress={() => {
            if (!desktop) {
              setIsSidebarOpen(false);
            }
            router.push('/contact' as any);
          }}
          activeOpacity={0.75}
        >
          <View style={desktop ? styles.sidebarIconWrapper : styles.mobileMenuIconWrap}>
            <Ionicons
              name={
                (pathname === '/contact'
                  ? 'chatbubble-ellipses'
                  : 'chatbubble-ellipses-outline') as any
              }
              size={desktop ? 20 : 18}
              color={desktop ? '#FFFFFF' : '#5B4DFF'}
            />
          </View>
          <Text style={desktop ? styles.sidebarItemText : styles.mobileMenuItemText}>
            Contact Us
          </Text>
        </TouchableOpacity>
      </View>

      {desktop ? (
        <View style={styles.sidebarFooter}>
          <Text style={styles.sidebarTagline}>Better Rentals</Text>
          <Text style={styles.sidebarTaglineStrong}>Brighter Future</Text>
          <View style={styles.sidebarFooterDivider} />
          <TouchableOpacity
            style={styles.sidebarItem}
            onPress={handleLogoutPress}
            activeOpacity={0.75}
            accessibilityRole="button"
            accessibilityLabel="Logout"
          >
            <View style={styles.sidebarIconWrapper}>
              <Ionicons name="log-out-outline" size={20} color="#FFFFFF" />
            </View>
            <Text style={styles.sidebarItemText}>Logout</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
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
              <Ionicons name="log-out-outline" size={18} color="#E53935" />
            </View>
            <Text style={styles.mobileMenuLogoutText}>Logout</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );

  const renderHero = (desktop: boolean) => (
    <View style={desktop ? styles.hero : styles.heroMobile}>
      <Image
        source={require('@/assets/images/home-hero.png')}
        style={styles.heroImage}
        resizeMode="cover"
      />
      <LinearGradient
        colors={['#F7F8FF', 'rgba(247,248,255,0.72)', 'rgba(247,248,255,0)']}
        locations={[0, 0.42, 0.68]}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={desktop ? styles.heroCopy : styles.heroCopyMobile}>
        <Text style={styles.heroKicker}>WELCOME BACK, {firstName.toUpperCase()}</Text>
        <Text style={desktop ? styles.heroTitle : styles.heroTitleMobile}>
          Ease your renting system
        </Text>
        {desktop ? (
          <Text style={styles.heroSubtitle}>
            Manage your assets, rentals, and next move in one convenient place.
          </Text>
        ) : null}
        <TouchableOpacity
          style={styles.heroButton}
          onPress={() => router.push('/exploree' as any)}
          activeOpacity={0.85}
        >
          <Text style={styles.heroButtonText}>Explore Assets</Text>
          <Ionicons name="arrow-forward" size={14} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </View>
  );

  if (isDesktop) {
    return (
      <View style={styles.desktopShell}>
        <View style={styles.desktopMain}>
          <View style={styles.desktopHeader}>
            {!showDesktopSidebar ? (
              <TouchableOpacity
                style={styles.reopenButton}
                onPress={() => setSidebarCollapsed(false)}
                accessibilityRole="button"
                accessibilityLabel="Open navigation menu"
              >
                <Ionicons name="menu" size={22} color="#1B2346" />
              </TouchableOpacity>
            ) : (
              <View style={styles.headerSpacer} />
            )}

            <View style={styles.desktopHeaderActions}>
              <TouchableOpacity
                style={styles.desktopNotificationButton}
                onPress={() => router.push('/notifications' as any)}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="Open notifications"
              >
                <Ionicons name="notifications-outline" size={22} color="#1B2346" />
                {unreadNotificationsCount > 0 ? (
                  <View style={styles.notificationBadge}>
                    <Text style={styles.notificationBadgeText}>
                      {unreadNotificationsCount > 9 ? '9+' : unreadNotificationsCount}
                    </Text>
                  </View>
                ) : null}
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.userChip}
                onPress={() =>
                  router.push({
                    pathname: '/profile',
                    params: { source: 'header' },
                  } as any)
                }
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel="Open profile"
              >
                <View style={styles.userAvatar}>
                  <Text style={styles.userAvatarText}>{initial}</Text>
                </View>
                <View>
                  <Text style={styles.desktopUserName}>{user?.name || 'User'}</Text>
                  <Text style={styles.desktopWelcomeText}>Welcome to Rent Manager</Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView
            style={styles.desktopScrollView}
            contentContainerStyle={styles.desktopScrollContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.desktopContent}>
              {renderHero(true)}
              <View style={styles.desktopCardsGrid}>
                {homeCards.map((card) => (
                  <View key={card.id} style={styles.desktopCardWrapper}>
                    {renderStatCard(card)}
                  </View>
                ))}
              </View>
              {renderActivity()}
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
            <Pressable onPress={(event) => event.stopPropagation()}>
              {renderSidebar(false)}
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
        <View style={styles.mobileBody}>
          {renderHero(false)}
          <View style={styles.cardsGrid}>
            {homeCards.map((card) => (
              <View key={card.id} style={[styles.mobileCardSlot, { width: mobileCardWidth }]}>
                {renderStatCard(card)}
              </View>
            ))}
          </View>
          {renderActivity()}
        </View>
      </ScrollView>

      <BottomNavigation />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F6FB',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  mobileBody: {
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 14,
  },
  cardsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  mobileCardSlot: {
    minWidth: 0,
  },
  desktopShell: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#F4F6FB',
  },
  sidebar: {
    width: 248,
    backgroundColor: '#1B2346',
    paddingHorizontal: 16,
    paddingTop: 22,
    paddingBottom: 20,
  },
  sidebarBrandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 22,
  },
  sidebarBrand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    minWidth: 0,
  },
  sidebarLogo: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#5B4DFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sidebarBrandText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  sidebarBrandSub: {
    color: 'rgba(255,255,255,0.62)',
    fontSize: 11,
    marginTop: 2,
  },
  sidebarCloseButton: {
    width: 34,
    height: 34,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sidebarNavigation: {
    flex: 1,
    paddingTop: 8,
    gap: 6,
  },
  sidebarItem: {
    minHeight: 46,
    borderRadius: 12,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  sidebarItemActive: {
    backgroundColor: '#5B4DFF',
  },
  sidebarIconWrapper: {
    width: 24,
    height: 24,
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
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  sidebarFooter: {
    paddingTop: 8,
  },
  sidebarTagline: {
    color: 'rgba(255,255,255,0.72)',
    fontSize: 13,
    fontWeight: '600',
  },
  sidebarTaglineStrong: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    marginTop: 2,
    marginBottom: 14,
  },
  sidebarFooterDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.12)',
    marginBottom: 8,
  },
  mobileMenuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.28)',
    paddingTop: Platform.OS === 'ios' ? 96 : 88,
    paddingHorizontal: 14,
    alignItems: 'flex-start',
  },
  mobileMenuCard: {
    width: 240,
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
    width: 34,
    height: 34,
    borderRadius: 17,
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
    color: '#1B2346',
    fontSize: 15,
    fontWeight: '700',
    flex: 1,
  },
  mobileMenuLogoutText: {
    color: '#E53935',
    fontSize: 15,
    fontWeight: '700',
  },
  mobileBadge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
  },
  desktopMain: {
    flex: 1,
    minWidth: 0,
  },
  desktopHeader: {
    minHeight: 74,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E8ECF4',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
  },
  headerSpacer: {
    width: 8,
  },
  reopenButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F4F6FB',
  },
  desktopHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginLeft: 'auto',
  },
  desktopUserName: {
    color: '#1B2346',
    fontSize: 14,
    fontWeight: '700',
  },
  desktopWelcomeText: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '500',
    marginTop: 1,
  },
  userChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 999,
  },
  userAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#5B4DFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  userAvatarText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  desktopNotificationButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F4F6FB',
    position: 'relative',
  },
  notificationBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: '#EF4444',
    borderRadius: 10,
    minWidth: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 3,
  },
  notificationBadgeText: {
    fontSize: 9,
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
    paddingHorizontal: 24,
    paddingTop: 22,
    gap: 18,
  },
  hero: {
    height: 250,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: '#F7F8FF',
  },
  heroMobile: {
    height: 210,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#F7F8FF',
  },
  heroImage: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: '100%',
    height: '100%',
  },
  heroCopy: {
    width: '58%',
    minWidth: 280,
    maxWidth: 560,
    paddingHorizontal: 32,
    paddingVertical: 28,
    justifyContent: 'center',
    zIndex: 1,
    height: '100%',
  },
  heroCopyMobile: {
    width: '78%',
    paddingHorizontal: 18,
    paddingVertical: 18,
    justifyContent: 'center',
    zIndex: 1,
    height: '100%',
  },
  heroKicker: {
    color: '#5B4DFF',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  heroTitle: {
    color: '#1B2346',
    fontSize: 34,
    lineHeight: 40,
    fontWeight: '800',
    maxWidth: 460,
  },
  heroTitleMobile: {
    color: '#1B2346',
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '800',
  },
  heroSubtitle: {
    color: '#475569',
    fontSize: 14,
    lineHeight: 21,
    maxWidth: 420,
    marginTop: 10,
  },
  heroButton: {
    marginTop: 16,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#5B4DFF',
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  heroButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  desktopCardsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  desktopCardWrapper: {
    flexGrow: 1,
    flexBasis: 220,
    minWidth: 200,
  },
  statCard: {
    borderRadius: 20,
    padding: 16,
    minHeight: 176,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.8)',
    shadowColor: '#1B2346',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 2,
  },
  statIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  statTitle: {
    color: '#1B2346',
    fontSize: 15,
    fontWeight: '700',
  },
  statValue: {
    fontSize: 22,
    fontWeight: '800',
    marginTop: 4,
  },
  statSubtitle: {
    color: '#64748B',
    fontSize: 13,
    marginTop: 4,
  },
  statSubtitleSpacer: {
    height: 18,
  },
  statFooter: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  statAction: {
    color: '#64748B',
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  statArrow: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 6,
    borderWidth: 1,
    borderColor: '#EEF2F7',
    shadowColor: '#1B2346',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
    elevation: 2,
  },
  activityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  activityTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  activityTitleIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityTitle: {
    color: '#1B2346',
    fontSize: 16,
    fontWeight: '800',
  },
  activityViewAll: {
    color: '#5B4DFF',
    fontSize: 13,
    fontWeight: '700',
  },
  activityEmpty: {
    color: '#64748B',
    fontSize: 14,
    paddingVertical: 18,
  },
  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
  },
  activityRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  activityIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityCopy: {
    flex: 1,
    minWidth: 0,
  },
  activityItemTitle: {
    color: '#1B2346',
    fontSize: 14,
    fontWeight: '700',
  },
  activityItemMessage: {
    color: '#64748B',
    fontSize: 12,
    marginTop: 2,
  },
  activityTime: {
    color: '#94A3B8',
    fontSize: 12,
    maxWidth: 88,
  },
});
