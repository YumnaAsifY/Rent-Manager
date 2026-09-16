import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useCallback, useState } from 'react';

import { useAuth } from '@/context/AuthContext';
import { fetchUnreadNotificationsCount } from '@/services/notifications';

interface HeaderProps {
  userName: string;
  onMenuPress?: () => void;
}

export default function Header({ userName, onMenuPress }: HeaderProps) {
  const router = useRouter();
  const { token } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  useFocusEffect(
    useCallback(() => {
      let isMounted = true;

      const loadUnread = async () => {
        if (!token) {
          if (isMounted) {
            setUnreadCount(0);
          }
          return;
        }

        try {
          const count = await fetchUnreadNotificationsCount(token);
          if (isMounted) {
            setUnreadCount(count);
          }
        } catch {
          if (isMounted) {
            setUnreadCount(0);
          }
        }
      };

      void loadUnread();

      return () => {
        isMounted = false;
      };
    }, [token])
  );

  return (
    <View style={styles.headerContainer}>
      <View style={styles.headerContent}>
        <View style={styles.headerRow}>
          {onMenuPress ? (
            <TouchableOpacity
              style={styles.menuButton}
              onPress={onMenuPress}
              accessibilityRole="button"
              accessibilityLabel="Open menu"
            >
              <Ionicons name="menu" size={28} color="#FFFFFF" />
            </TouchableOpacity>
          ) : null}
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{userName}</Text>
            <Text style={styles.welcomeText}>Welcome to Rent Manager</Text>
          </View>
          <TouchableOpacity
            style={styles.notificationButton}
            onPress={() => router.push('/notifications' as any)}
            activeOpacity={0.7}
          >
            <Ionicons name="notifications-outline" size={28} color="#FFFFFF" />
            {unreadCount > 0 ? (
              <View style={styles.notificationBadge}>
                <Text style={styles.notificationBadgeText}>
                  {unreadCount > 9 ? '9+' : unreadCount}
                </Text>
              </View>
            ) : null}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    backgroundColor: '#323a8f',
    minHeight: Platform.OS === 'web' ? 56 : 88,
    paddingTop: Platform.OS === 'web' ? 10 : 42,
    paddingBottom: 10,
    paddingHorizontal: 16,
  },
  headerContent: {
    maxWidth: 1200,
    alignSelf: 'center',
    width: '100%',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  menuButton: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  welcomeText: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.85)',
    fontWeight: '500',
  },
  notificationButton: {
    padding: 8,
    position: 'relative',
  },
  notificationBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
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
});
