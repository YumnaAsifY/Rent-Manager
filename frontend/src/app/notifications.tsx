import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  StatusBar,
  ActivityIndicator,
  Alert,
  Platform,
  Modal,
  Pressable,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useCallback, useState } from 'react';

import BottomNavigation from '../components/BottomNavigation';
import ScreenHeader from '../components/ScreenHeader';
import { useAuth } from '@/context/AuthContext';
import { ApiError } from '@/services/api';
import {
  AppNotification,
  deleteNotification,
  deleteNotifications,
  fetchMyNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from '@/services/notifications';

const { width } = Dimensions.get('window');
const isWeb = width > 768;

export default function NotificationsScreen() {
  const router = useRouter();
  const { token } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [menuNotification, setMenuNotification] =
    useState<AppNotification | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadNotifications = useCallback(async () => {
    if (!token) {
      setNotifications([]);
      setLoading(false);
      setErrorMessage('Authentication required');
      return;
    }

    setLoading(true);
    setErrorMessage('');

    try {
      const data = await fetchMyNotifications(token);
      setNotifications(data);
    } catch (error) {
      setNotifications([]);
      setErrorMessage(
        error instanceof ApiError
          ? error.message
          : 'Unable to load notifications.'
      );
    } finally {
      setLoading(false);
    }
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      void loadNotifications();
      setSelectionMode(false);
      setSelectedIds([]);
      setMenuNotification(null);
    }, [loadNotifications])
  );

  const unreadCount = notifications.filter((item) => !item.isRead).length;
  const allSelected =
    notifications.length > 0 && selectedIds.length === notifications.length;

  const confirmAction = (
    title: string,
    message: string,
    onConfirm: () => void
  ) => {
    if (Platform.OS === 'web') {
      if (window.confirm(`${title}\n\n${message}`)) {
        onConfirm();
      }
      return;
    }

    Alert.alert(title, message, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: onConfirm },
    ]);
  };

  const exitSelectionMode = () => {
    setSelectionMode(false);
    setSelectedIds([]);
  };

  const enterSelectionMode = () => {
    setMenuNotification(null);
    setSelectionMode(true);
    setSelectedIds([]);
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (allSelected) {
      setSelectedIds([]);
      return;
    }
    setSelectedIds(notifications.map((item) => item.id));
  };

  const handleNotificationPress = async (notification: AppNotification) => {
    if (selectionMode) {
      toggleSelect(notification.id);
      return;
    }

    if (!token) {
      return;
    }

    if (!notification.isRead) {
      try {
        const updated = await markNotificationAsRead(token, notification.id);
        setNotifications((prev) =>
          prev.map((item) =>
            item.id === notification.id ? { ...item, ...updated } : item
          )
        );
      } catch {
        // Still allow navigation even if mark-read fails.
      }
    }

    if (notification.relatedRequestId) {
      router.push(`/request-details/${notification.relatedRequestId}` as any);
      return;
    }

    if (notification.type === 'rental_request_accepted') {
      router.push('/rentals' as any);
    }
  };

  const handleMarkAllRead = async () => {
    if (!token || unreadCount === 0) {
      return;
    }

    try {
      await markAllNotificationsAsRead(token);
      setNotifications((prev) =>
        prev.map((item) => ({ ...item, isRead: true, read: true }))
      );
    } catch {
      // Keep existing list; mark-all can be retried.
    }
  };

  const removeFromState = (ids: string[]) => {
    const idSet = new Set(ids);
    setNotifications((prev) => prev.filter((item) => !idSet.has(item.id)));
    setSelectedIds((prev) => prev.filter((id) => !idSet.has(id)));
  };

  const runDeleteOne = async (notificationId: string) => {
    if (!token || isDeleting) {
      return;
    }

    setIsDeleting(true);
    setMenuNotification(null);

    try {
      await deleteNotification(token, notificationId);
      removeFromState([notificationId]);
    } catch (error) {
      Alert.alert(
        'Error',
        error instanceof ApiError
          ? error.message
          : 'Unable to delete notification.'
      );
    } finally {
      setIsDeleting(false);
    }
  };

  const runDeleteSelected = async () => {
    if (!token || selectedIds.length === 0 || isDeleting) {
      return;
    }

    setIsDeleting(true);

    try {
      await deleteNotifications(token, selectedIds);
      removeFromState(selectedIds);
      exitSelectionMode();
    } catch (error) {
      Alert.alert(
        'Error',
        error instanceof ApiError
          ? error.message
          : 'Unable to delete selected notifications.'
      );
    } finally {
      setIsDeleting(false);
    }
  };

  const confirmDeleteOne = (notification: AppNotification) => {
    setMenuNotification(null);
    confirmAction(
      'Delete notification?',
      'This notification will be permanently deleted.',
      () => {
        void runDeleteOne(notification.id);
      }
    );
  };

  const confirmDeleteSelected = () => {
    const count = selectedIds.length;
    confirmAction(
      'Delete selected notifications?',
      count === notifications.length
        ? 'All selected notifications will be deleted.'
        : `${count} selected notification${count === 1 ? '' : 's'} will be deleted.`,
      () => {
        void runDeleteSelected();
      }
    );
  };

  const renderNotificationCard = (notification: AppNotification) => {
    const isUnread = !notification.isRead;
    const isSelected = selectedIds.includes(notification.id);

    return (
      <TouchableOpacity
        key={notification.id}
        style={[
          styles.card,
          isWeb && styles.cardWeb,
          isUnread && styles.cardUnread,
          isSelected && styles.cardSelected,
        ]}
        onPress={() => void handleNotificationPress(notification)}
        activeOpacity={0.7}
      >
        {selectionMode ? (
          <View style={styles.checkboxWrap}>
            <Ionicons
              name={isSelected ? 'checkbox' : 'square-outline'}
              size={22}
              color={isSelected ? '#1A237E' : '#94A3B8'}
            />
          </View>
        ) : null}

        <View style={styles.cardContent}>
          <View style={styles.cardHeaderRow}>
            <Text
              style={[
                styles.notificationTitle,
                isUnread && styles.notificationTitleUnread,
              ]}
            >
              {notification.title}
            </Text>
            {isUnread && !selectionMode ? (
              <View style={styles.unreadDot} />
            ) : null}
            {!selectionMode ? (
              <TouchableOpacity
                style={styles.menuButton}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                onPress={() => setMenuNotification(notification)}
              >
                <Ionicons name="ellipsis-vertical" size={18} color="#64748B" />
              </TouchableOpacity>
            ) : null}
          </View>
          <Text style={styles.notificationMessage}>{notification.message}</Text>
          <Text style={styles.notificationTime}>{notification.time}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1a237e" />
        <Text style={styles.loadingText}>Loading notifications...</Text>
      </View>
    );
  }

  const headerRight = selectionMode ? (
    <View style={styles.headerActions}>
      <TouchableOpacity onPress={exitSelectionMode} style={styles.headerAction}>
        <Text style={styles.headerActionText}>Cancel</Text>
      </TouchableOpacity>
      {notifications.length > 0 ? (
        <TouchableOpacity onPress={handleSelectAll} style={styles.headerAction}>
          <Text style={styles.headerActionText}>
            {allSelected ? 'Clear' : 'Select All'}
          </Text>
        </TouchableOpacity>
      ) : null}
    </View>
  ) : notifications.length > 0 ? (
    <View style={styles.headerActions}>
      <TouchableOpacity onPress={enterSelectionMode} style={styles.headerAction}>
        <Text style={styles.headerActionText}>Select</Text>
      </TouchableOpacity>
      {unreadCount > 0 ? (
        <TouchableOpacity
          onPress={() => void handleMarkAllRead()}
          style={styles.headerAction}
        >
          <Text style={styles.headerActionText}>Mark all read</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  ) : unreadCount > 0 ? (
    <TouchableOpacity
      onPress={() => void handleMarkAllRead()}
      style={styles.markAllButton}
    >
      <Text style={styles.markAllText}>Mark all read</Text>
    </TouchableOpacity>
  ) : null;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1A237E" />

      <ScreenHeader
        title="Notifications"
        variant="dark"
        rightAction={headerRight}
      />

      {selectionMode && selectedIds.length > 0 ? (
        <View style={styles.selectionBar}>
          <Text style={styles.selectionCount}>
            {selectedIds.length} selected
          </Text>
          <TouchableOpacity
            style={[styles.deleteSelectedButton, isDeleting && styles.disabled]}
            onPress={confirmDeleteSelected}
            disabled={isDeleting}
          >
            {isDeleting ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.deleteSelectedText}>Delete Selected</Text>
            )}
          </TouchableOpacity>
        </View>
      ) : null}

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {errorMessage ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.errorText}>{errorMessage}</Text>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={() => void loadNotifications()}
            >
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : notifications.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="notifications-off-outline" size={60} color="#CBD5E1" />
            <Text style={styles.emptyText}>No notifications</Text>
            <Text style={styles.emptySubText}>You're all caught up!</Text>
          </View>
        ) : (
          <>
            {unreadCount > 0 && (
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>New</Text>
              </View>
            )}

            {notifications
              .filter((notification) => !notification.isRead)
              .map((notification) => renderNotificationCard(notification))}

            {notifications.filter((notification) => notification.isRead)
              .length > 0 && (
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Earlier</Text>
              </View>
            )}

            {notifications
              .filter((notification) => notification.isRead)
              .map((notification) => renderNotificationCard(notification))}
          </>
        )}
      </ScrollView>

      <Modal
        visible={Boolean(menuNotification)}
        transparent
        animationType="fade"
        onRequestClose={() => setMenuNotification(null)}
      >
        <Pressable
          style={styles.menuOverlay}
          onPress={() => setMenuNotification(null)}
        >
          <View style={styles.menuCard}>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                if (menuNotification) {
                  confirmDeleteOne(menuNotification);
                }
              }}
            >
              <Ionicons name="trash-outline" size={18} color="#EF4444" />
              <Text style={styles.menuDeleteText}>Delete</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => setMenuNotification(null)}
            >
              <Text style={styles.menuCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>

      <BottomNavigation />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#64748B',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  headerAction: {
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  headerActionText: {
    fontSize: 13,
    color: '#ffffff',
    fontWeight: '500',
  },
  markAllButton: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  markAllText: {
    fontSize: 13,
    color: '#ffffff',
    fontWeight: '500',
  },
  selectionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#EEF2FF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E7FF',
  },
  selectionCount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A237E',
  },
  deleteSelectedButton: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    minWidth: 120,
    alignItems: 'center',
  },
  deleteSelectedText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  disabled: {
    opacity: 0.7,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 30,
    flexGrow: 1,
  },
  sectionHeader: {
    marginBottom: 12,
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    padding: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  cardWeb: {
    width: '100%',
  },
  cardUnread: {
    borderLeftWidth: 4,
    borderLeftColor: '#1a237e',
    backgroundColor: '#FAFBFF',
  },
  cardSelected: {
    borderColor: '#1A237E',
    backgroundColor: '#F5F7FF',
  },
  checkboxWrap: {
    marginRight: 12,
    marginTop: 2,
  },
  cardContent: {
    flex: 1,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    flex: 1,
  },
  notificationTitleUnread: {
    color: '#1a237e',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#1a237e',
    marginLeft: 8,
  },
  menuButton: {
    marginLeft: 8,
    padding: 2,
  },
  notificationMessage: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 4,
    lineHeight: 20,
  },
  notificationTime: {
    fontSize: 12,
    color: '#94A3B8',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A',
    marginTop: 12,
  },
  emptySubText: {
    fontSize: 14,
    color: '#94A3B8',
    marginTop: 4,
  },
  errorText: {
    fontSize: 15,
    color: '#EF4444',
    textAlign: 'center',
    marginBottom: 12,
  },
  retryButton: {
    backgroundColor: '#1A237E',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  menuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.35)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  menuCard: {
    width: '100%',
    maxWidth: 280,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 18,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  menuDeleteText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#EF4444',
  },
  menuCancelText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#64748B',
  },
});
