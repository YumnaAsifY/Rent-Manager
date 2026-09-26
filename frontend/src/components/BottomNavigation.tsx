import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  useWindowDimensions,
  Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, usePathname, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';

import { useAuth } from '@/context/AuthContext';
import { fetchMyPendingRequestsCount } from '@/services/rentalRequests';

export const navigationTabs = [
  { name: 'Home', icon: 'home', path: '/home' },
  { name: 'Requests', icon: 'mail', path: '/requests' },
  { name: 'Payment', icon: 'card', path: '/payment' },
  { name: 'Profile', icon: 'person', path: '/profile' },
];

export default function BottomNavigation() {
  const router = useRouter();
  const pathname = usePathname();
  const { width } = useWindowDimensions();
  const { token } = useAuth();
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  useEffect(() => {
    if (Platform.OS === 'web') {
      return;
    }

    const showEvent =
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent =
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, () => {
      setIsKeyboardVisible(true);
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      setIsKeyboardVisible(false);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  useFocusEffect(
    useCallback(() => {
      let isMounted = true;

      const loadCount = async () => {
        if (!token) {
          if (isMounted) {
            setPendingRequestsCount(0);
          }
          return;
        }

        try {
          const count = await fetchMyPendingRequestsCount(token);
          if (isMounted) {
            setPendingRequestsCount(count);
          }
        } catch {
          if (isMounted) {
            setPendingRequestsCount(0);
          }
        }
      };

      void loadCount();

      return () => {
        isMounted = false;
      };
    }, [token])
  );

  if ((Platform.OS === 'web' && width >= 768) || isKeyboardVisible) {
    return null;
  }

  return (
    <View style={styles.container}>
      {navigationTabs.map((tab) => {
        const isActive =
          pathname === tab.path ||
          (tab.path === '/payment' && pathname.startsWith('/payment'));
        const showBadge = tab.name === 'Requests' && pendingRequestsCount > 0;

        return (
          <TouchableOpacity
            key={tab.name}
            style={styles.tab}
            onPress={() => router.push(tab.path as any)}
            activeOpacity={0.7}
          >
            <View style={styles.iconWrapper}>
              <Ionicons
                name={isActive ? (tab.icon as any) : (`${tab.icon}-outline` as any)}
                size={24}
                color={isActive ? '#323a8f' : '#999999'}
              />
              {showBadge && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>
                    {pendingRequestsCount > 9 ? '9+' : pendingRequestsCount}
                  </Text>
                </View>
              )}
            </View>
            <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>
              {tab.name}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    paddingTop: 10,
    paddingBottom: Platform.OS === 'ios' ? 30 : 16,
    borderTopWidth: 1,
    borderTopColor: '#e8eaf6',
    justifyContent: 'space-around',
  },
  tab: {
    alignItems: 'center',
    flex: 1,
  },
  iconWrapper: {
    position: 'relative',
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badge: {
    position: 'absolute',
    top: -6,
    right: -10,
    backgroundColor: '#EF4444',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  tabLabel: {
    fontSize: 10,
    color: '#999999',
    marginTop: 4,
  },
  tabLabelActive: {
    color: '#323a8f',
    fontWeight: '600',
  },
});
