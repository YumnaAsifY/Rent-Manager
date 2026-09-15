import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Platform,
  useWindowDimensions,
  TextInput,
} from 'react-native';
import { useCallback, useMemo, useState } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import AdminShell from '@/components/admin/AdminShell';
import { useAuth } from '@/context/AuthContext';
import { ApiError } from '@/services/api';
import {
  AdminUser,
  fetchAdminUsers,
} from '@/services/adminUsers';

export default function AdminUsersScreen() {
  const router = useRouter();
  const { token } = useAuth();
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && width >= 768;
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [search, setSearch] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  useFocusEffect(
    useCallback(() => {
      let mounted = true;

      const load = async () => {
        if (!token) {
          if (mounted) {
            setUsers([]);
            setErrorMessage('Authentication required');
          }
          return;
        }

        try {
          const data = await fetchAdminUsers(token);
          if (mounted) {
            setUsers(data);
            setErrorMessage('');
          }
        } catch (error) {
          if (mounted) {
            setUsers([]);
            setErrorMessage(
              error instanceof ApiError
                ? error.message
                : 'Unable to load users.'
            );
          }
        }
      };

      void load();
      return () => {
        mounted = false;
      };
    }, [token])
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) {
      return users;
    }
    return users.filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.phone.includes(q)
    );
  }, [search, users]);

  return (
    <AdminShell title="Users">
      <View style={styles.flex}>
        <View style={[styles.searchWrap, isDesktop && styles.searchWrapDesktop]}>
          <Ionicons name="search" size={18} color="#7986CB" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search name, email, phone"
            placeholderTextColor="#9FA8DA"
            value={search}
            onChangeText={setSearch}
            autoCapitalize="none"
          />
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[
            styles.listContent,
            isDesktop && styles.listContentDesktop,
          ]}
          showsVerticalScrollIndicator={false}
        >
          {errorMessage ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>{errorMessage}</Text>
            </View>
          ) : filtered.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="people-outline" size={40} color="#9FA8DA" />
              <Text style={styles.emptyTitle}>No users found</Text>
              <Text style={styles.emptyText}>
                Try a different search, or clear the filter.
              </Text>
            </View>
          ) : (
            filtered.map((user) => (
              <TouchableOpacity
                key={user.id}
                style={[styles.card, isDesktop && styles.cardDesktop]}
                onPress={() => router.push(`/admin/users/${user.id}` as any)}
                activeOpacity={0.75}
              >
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {user.name.charAt(0).toUpperCase()}
                  </Text>
                </View>

                <View style={styles.cardBody}>
                  <View style={styles.cardTopRow}>
                    <Text style={styles.name} numberOfLines={1}>
                      {user.name}
                    </Text>
                    <View
                      style={[
                        styles.badge,
                        user.isActive ? styles.badgeActive : styles.badgeInactive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.badgeText,
                          user.isActive
                            ? styles.badgeTextActive
                            : styles.badgeTextInactive,
                        ]}
                      >
                        {user.isActive ? 'Active' : 'Deactivated'}
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.email} numberOfLines={1}>
                    {user.email}
                  </Text>
                  <Text style={styles.phone}>{user.phone}</Text>

                  <View style={styles.countsRow}>
                    <Text style={styles.countText}>
                      {user.assetsCount} assets
                    </Text>
                    <Text style={styles.countDot}>·</Text>
                    <Text style={styles.countText}>
                      {user.rentalsCount} rentals
                    </Text>
                  </View>
                </View>

                <Ionicons name="chevron-forward" size={20} color="#9FA8DA" />
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      </View>
    </AdminShell>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 16,
    marginTop: 14,
    marginBottom: 8,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E8EAF6',
    paddingHorizontal: 14,
    minHeight: 46,
  },
  searchWrapDesktop: {
    marginHorizontal: 28,
    marginTop: 20,
    maxWidth: 420,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#323a8f',
    outlineStyle: 'none' as any,
  },
  scroll: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 28,
    gap: 10,
  },
  listContentDesktop: {
    paddingHorizontal: 28,
    paddingBottom: 40,
    gap: 12,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E8EAF6',
  },
  emptyTitle: {
    marginTop: 12,
    fontSize: 17,
    fontWeight: '700',
    color: '#323a8f',
  },
  emptyText: {
    marginTop: 6,
    fontSize: 14,
    color: '#5C6BC0',
    textAlign: 'center',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E8EAF6',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  cardDesktop: {
    padding: 16,
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#E8EAF6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#323a8f',
  },
  cardBody: {
    flex: 1,
    minWidth: 0,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  name: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: '#323a8f',
  },
  badge: {
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgeActive: {
    backgroundColor: '#E8F5E9',
  },
  badgeInactive: {
    backgroundColor: '#FFEBEE',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  badgeTextActive: {
    color: '#2E7D32',
  },
  badgeTextInactive: {
    color: '#C62828',
  },
  email: {
    fontSize: 13,
    color: '#5C6BC0',
    marginBottom: 2,
  },
  phone: {
    fontSize: 13,
    color: '#7986CB',
  },
  countsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
  },
  countText: {
    fontSize: 12,
    color: '#9FA8DA',
    fontWeight: '600',
  },
  countDot: {
    fontSize: 12,
    color: '#C5CAE9',
  },
});
