import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  StatusBar,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { useLocalSearchParams, useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useCallback, useState } from 'react';

import BottomNavigation from '../../components/BottomNavigation';
import ScreenHeader from '../../components/ScreenHeader';
import LiftPressable from '../../components/LiftPressable';
import { useAuth } from '@/context/AuthContext';
import { ApiError } from '@/services/api';
import {
  AppNotification,
  fetchNotificationById,
} from '@/services/notifications';
import ViewLocationButton from '../../components/ViewLocationButton';

export default function CancellationDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string | string[] }>();
  const notificationId = Array.isArray(id) ? id[0] : id;
  const { token } = useAuth();
  const [notification, setNotification] = useState<AppNotification | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  const loadNotification = useCallback(async () => {
    if (!token || !notificationId) {
      setNotification(null);
      setLoading(false);
      setErrorMessage(
        !token ? 'Authentication required' : 'Notification not found'
      );
      return;
    }

    setLoading(true);
    setErrorMessage('');

    try {
      const data = await fetchNotificationById(token, notificationId);
      setNotification(data);
    } catch (error) {
      setNotification(null);
      setErrorMessage(
        error instanceof ApiError
          ? error.message
          : 'Unable to load cancellation details.'
      );
    } finally {
      setLoading(false);
    }
  }, [notificationId, token]);

  useFocusEffect(
    useCallback(() => {
      void loadNotification();
    }, [loadNotification])
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#323a8f" />
        <Text style={styles.loadingText}>Loading details...</Text>
      </View>
    );
  }

  if (!notification) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#323a8f" />
        <ScreenHeader
          title="Cancellation"
          variant="dark"
          fallbackHref="/notifications"
        />
        <View style={styles.notFoundContainer}>
          <Ionicons name="alert-circle-outline" size={48} color="#CBD5E1" />
          <Text style={styles.notFoundText}>
            {errorMessage || 'Notification not found'}
          </Text>
        </View>
      </View>
    );
  }

  const assetName = notification.cancellationAssetName || 'Asset';
  const assetType = notification.cancellationAssetType || '';
  const location = notification.cancellationAssetLocation || '';
  const ownerName = notification.cancellationOwnerName || 'The owner';
  const reason = notification.cancellationReason || notification.message;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#323a8f" />

      <ScreenHeader
        title="Cancellation"
        variant="dark"
        fallbackHref="/notifications"
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.detailCard}>
          <View style={styles.detailHeaderRow}>
            <Text style={styles.detailName}>{assetName}</Text>
            <View style={styles.statusBadge}>
              <Text style={styles.statusText}>Removed</Text>
            </View>
          </View>

          {assetType ? (
            <Text style={styles.detailType}>{assetType}</Text>
          ) : null}
          <Text style={styles.detailLocation}>
            {location || 'Location unavailable'}
          </Text>
          {location ? <ViewLocationButton location={location} /> : null}

          <View style={styles.divider} />

          <Text style={styles.sectionTitle}>Owner</Text>
          <View style={styles.infoRow}>
            <Ionicons name="person-outline" size={18} color="#64748B" />
            <Text style={styles.infoLabel}>Name:</Text>
            <Text style={styles.infoValue}>{ownerName}</Text>
          </View>

          <View style={styles.divider} />

          <Text style={styles.sectionTitle}>Reason</Text>
          <Text style={styles.reasonText}>{reason}</Text>

          <View style={styles.adminContactNote}>
            <Ionicons
              name="information-circle-outline"
              size={18}
              color="#323a8f"
            />
            <Text style={styles.adminContactNoteText}>
              Admin may contact you about this matter.
            </Text>
          </View>

          {notification.relatedRentalId ? (
            <LiftPressable
              style={styles.linkButton}
              onPress={() =>
                router.push(
                  `/rental-detail/${notification.relatedRentalId}` as any
                )
              }
            >
              <Text style={styles.linkButtonText}>Open My Rental</Text>
            </LiftPressable>
          ) : null}
        </View>
      </ScrollView>

      <BottomNavigation />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 30,
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
  notFoundContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  notFoundText: {
    fontSize: 16,
    color: '#94A3B8',
    marginTop: 12,
    textAlign: 'center',
  },
  detailCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  detailHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  detailName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1A1A1A',
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
    backgroundColor: '#FEE2E2',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#EF4444',
  },
  detailType: {
    fontSize: 15,
    color: '#475569',
    fontWeight: '500',
    marginBottom: 2,
  },
  detailLocation: {
    fontSize: 16,
    color: '#64748B',
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 6,
  },
  infoLabel: {
    fontSize: 14,
    color: '#64748B',
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1A1A1A',
  },
  reasonText: {
    fontSize: 14,
    color: '#64748B',
    lineHeight: 22,
  },
  adminContactNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    alignSelf: 'flex-start',
    gap: 6,
    marginTop: 14,
    maxWidth: 280,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
    backgroundColor: '#EEF2FF',
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  adminContactNoteText: {
    flexShrink: 1,
    fontSize: 12,
    lineHeight: 17,
    color: '#323a8f',
    fontWeight: '600',
  },
  linkButton: {
    marginTop: 20,
    backgroundColor: '#323a8f',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  linkButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 15,
  },
});
