import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Image,
  ActivityIndicator,
  Alert,
  Platform,
  Linking,
} from 'react-native';
import { useLocalSearchParams, useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useCallback, useState } from 'react';

import BottomNavigation from '../../components/BottomNavigation';
import ScreenHeader from '../../components/ScreenHeader';
import { useAuth } from '@/context/AuthContext';
import { ApiError } from '@/services/api';
import {
  RentalRequestItem,
  acceptRentalRequest,
  fetchRentalRequestById,
  getAssetImageUrl,
  rejectRentalRequest,
} from '@/services/rentalRequests';
import ViewLocationButton from '../../components/ViewLocationButton';
import { submitReport } from '@/services/reports';

export default function RequestDetailsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string | string[] }>();
  const requestId = Array.isArray(id) ? id[0] : id;
  const { token } = useAuth();
  const [request, setRequest] = useState<RentalRequestItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [isReporting, setIsReporting] = useState(false);

  const loadRequest = useCallback(async () => {
    if (!token || !requestId) {
      setRequest(null);
      setLoading(false);
      setErrorMessage(!token ? 'Authentication required' : 'Request not found');
      return;
    }

    setLoading(true);
    setErrorMessage('');

    try {
      const data = await fetchRentalRequestById(token, requestId);
      setRequest(data);
    } catch (error) {
      setRequest(null);
      setErrorMessage(
        error instanceof ApiError
          ? error.message
          : 'Unable to load request details.'
      );
    } finally {
      setLoading(false);
    }
  }, [requestId, token]);

  useFocusEffect(
    useCallback(() => {
      void loadRequest();
    }, [loadRequest])
  );

  const openDialer = async (phoneNumber: string) => {
    const cleaned = phoneNumber.replace(/[^\d+]/g, '');
    if (!cleaned) {
      return;
    }

    const url = `tel:${cleaned}`;
    try {
      const canOpen = await Linking.canOpenURL(url);
      if (!canOpen && Platform.OS === 'web') {
        window.location.href = url;
        return;
      }
      if (canOpen) {
        await Linking.openURL(url);
      }
    } catch {
      Alert.alert('Unable to dial', 'Could not open the phone dialer.');
    }
  };

  const runAccept = async () => {
    if (!token || !requestId || isUpdating) {
      return;
    }

    setIsUpdating(true);
    try {
      const updated = await acceptRentalRequest(token, requestId);
      setRequest(updated);
      Alert.alert('Success', 'Request accepted successfully!');
    } catch (error) {
      Alert.alert(
        'Error',
        error instanceof ApiError
          ? error.message
          : 'Unable to accept this request.'
      );
    } finally {
      setIsUpdating(false);
    }
  };

  const handleAccept = () => {
    if (Platform.OS === 'web') {
      const confirmed = window.confirm(
        'Are you sure you want to accept this request?'
      );
      if (confirmed) {
        void runAccept();
      }
      return;
    }

    Alert.alert(
      'Accept Request?',
      'Are you sure you want to accept this request?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: () => {
            void runAccept();
          },
        },
      ]
    );
  };

  const runReject = async () => {
    if (!token || !requestId || isUpdating) {
      return;
    }

    setIsUpdating(true);
    try {
      const updated = await rejectRentalRequest(token, requestId);
      setRequest(updated);
      Alert.alert('Rejected', 'Request has been rejected.');
    } catch (error) {
      Alert.alert(
        'Error',
        error instanceof ApiError
          ? error.message
          : 'Unable to reject this request.'
      );
    } finally {
      setIsUpdating(false);
    }
  };

  const handleReject = () => {
    if (Platform.OS === 'web') {
      const confirmed = window.confirm(
        'Are you sure you want to reject this rental request?'
      );
      if (confirmed) {
        void runReject();
      }
      return;
    }

    Alert.alert(
      'Reject Request?',
      'Are you sure you want to reject this rental request?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm Reject',
          style: 'destructive',
          onPress: () => {
            void runReject();
          },
        },
      ]
    );
  };

  const handleOwnerReport = (
    type: 'spam_misuse' | 'unpaid_rent',
    title: string,
    message: string
  ) => {
    if (!token || !requestId || isReporting) {
      return;
    }

    const run = async () => {
      setIsReporting(true);
      try {
        await submitReport(token, { type, requestId });
        const ok = 'Report submitted. Admin will review it.';
        if (Platform.OS === 'web') {
          window.alert(ok);
        } else {
          Alert.alert('Reported', ok);
        }
      } catch (error) {
        const text =
          error instanceof ApiError
            ? error.message
            : 'Unable to submit report.';
        if (Platform.OS === 'web') {
          window.alert(text);
        } else {
          Alert.alert('Error', text);
        }
      } finally {
        setIsReporting(false);
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm(message)) {
        void run();
      }
      return;
    }

    Alert.alert(title, message, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Report', style: 'destructive', onPress: () => void run() },
    ]);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1a237e" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  if (!request) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#1A237E" />
        <ScreenHeader title="Request Details" variant="dark" />
        <View style={styles.notFoundContainer}>
          <Ionicons name="alert-circle-outline" size={60} color="#CBD5E1" />
          <Text style={styles.notFoundText}>
            {errorMessage || 'Request not found'}
          </Text>
        </View>
      </View>
    );
  }

  const imageUrl = getAssetImageUrl(request.image);
  const hasDescription = Boolean(request.description?.trim());
  const isOwner = request.viewerRole === 'owner';
  const isPending = request.status === 'Pending';

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1A237E" />

      <ScreenHeader title="Request Details" variant="dark" />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.imageContainer}>
          {imageUrl ? (
            <Image
              source={{ uri: imageUrl }}
              style={styles.detailImage}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.imagePlaceholder}>
              <Ionicons name="home-outline" size={36} color="#CBD5E1" />
            </View>
          )}
        </View>

        <View style={styles.detailCard}>
          <View style={styles.detailHeaderRow}>
            <Text style={styles.detailName}>{request.assetName}</Text>
            <View
              style={[
                styles.statusBadge,
                { backgroundColor: getStatusBg(request.status) },
              ]}
            >
              <Text
                style={[
                  styles.statusText,
                  { color: getStatusColor(request.status) },
                ]}
              >
                {request.status}
              </Text>
            </View>
          </View>

          {request.assetType ? (
            <Text style={styles.detailType}>{request.assetType}</Text>
          ) : null}
          <Text style={styles.detailLocation}>
            {request.location || 'Location unavailable'}
          </Text>
          <ViewLocationButton location={request.location} />
          {request.rent ? (
            <Text style={styles.detailRent}>{request.rent}</Text>
          ) : null}

          {hasDescription ? (
            <>
              <View style={styles.divider} />
              <Text style={styles.sectionTitle}>Description</Text>
              <Text style={styles.descriptionText}>{request.description}</Text>
            </>
          ) : null}

          <View style={styles.divider} />

          <Text style={styles.sectionTitle}>Requested Lease</Text>
          <View style={styles.dateRow}>
            <View style={styles.dateItem}>
              <Text style={styles.dateLabel}>Start Date</Text>
              <Text style={styles.dateValue}>{request.startDate || 'N/A'}</Text>
            </View>
            <View style={styles.dateItem}>
              <Text style={styles.dateLabel}>End Date</Text>
              <Text style={styles.dateValue}>{request.endDate || 'N/A'}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          {isOwner ? (
            <>
              <Text style={styles.sectionTitle}>Tenant Information</Text>
              <View style={styles.infoRow}>
                <Ionicons name="person-outline" size={18} color="#64748B" />
                <Text style={styles.infoLabel}>Name:</Text>
                <Text style={styles.infoValue}>
                  {request.tenantName || 'Unavailable'}
                </Text>
              </View>
              {request.tenantPhone ? (
                <View style={styles.infoRow}>
                  <Ionicons name="call-outline" size={18} color="#64748B" />
                  <Text style={styles.infoLabel}>Phone:</Text>
                  <TouchableOpacity
                    onPress={() => void openDialer(request.tenantPhone!)}
                  >
                    <Text style={styles.phoneLink}>{request.tenantPhone}</Text>
                  </TouchableOpacity>
                </View>
              ) : null}

              {isPending ? (
                <View style={styles.actionContainer}>
                  <TouchableOpacity
                    style={[styles.rejectButton, isUpdating && styles.disabled]}
                    onPress={handleReject}
                    disabled={isUpdating}
                  >
                    <Text style={styles.rejectButtonText}>Reject</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.acceptButton, isUpdating && styles.disabled]}
                    onPress={handleAccept}
                    disabled={isUpdating}
                  >
                    {isUpdating ? (
                      <ActivityIndicator color="#FFFFFF" />
                    ) : (
                      <Text style={styles.acceptButtonText}>Accept</Text>
                    )}
                  </TouchableOpacity>
                </View>
              ) : (
                <Text style={styles.phaseNote}>
                  This request is {request.status.toLowerCase()}.
                </Text>
              )}

              <TouchableOpacity
                style={styles.reportLink}
                onPress={() =>
                  handleOwnerReport(
                    'spam_misuse',
                    'Report user',
                    'Report this tenant for spam or platform misuse?'
                  )
                }
                disabled={isReporting}
              >
                <Text style={styles.reportLinkText}>Report spam / misuse</Text>
              </TouchableOpacity>

              {request.status === 'Accepted' ? (
                <TouchableOpacity
                  style={styles.reportLink}
                  onPress={() =>
                    handleOwnerReport(
                      'unpaid_rent',
                      'Report unpaid rent',
                      'Report that this tenant has not paid rent?'
                    )
                  }
                  disabled={isReporting}
                >
                  <Text style={styles.reportLinkText}>Report unpaid rent</Text>
                </TouchableOpacity>
              ) : null}
            </>
          ) : (
            <>
              <Text style={styles.sectionTitle}>Owner</Text>
              <View style={styles.infoRow}>
                <Ionicons name="person-outline" size={18} color="#64748B" />
                <Text style={styles.infoLabel}>Name:</Text>
                <Text style={styles.infoValue}>
                  {request.ownerName || 'Unavailable'}
                </Text>
              </View>
              {request.ownerPhone ? (
                <View style={styles.infoRow}>
                  <Ionicons name="call-outline" size={18} color="#64748B" />
                  <Text style={styles.infoLabel}>Phone:</Text>
                  <Text style={styles.infoValue}>{request.ownerPhone}</Text>
                </View>
              ) : null}
              <Text style={styles.phaseNote}>
                {request.status === 'Pending'
                  ? 'Waiting for the owner to accept or reject this request.'
                  : `This request was ${request.status.toLowerCase()}.`}
              </Text>
              {request.status === 'Accepted' ? (
                <TouchableOpacity
                  style={styles.linkButton}
                  onPress={() => router.push('/rentals' as any)}
                >
                  <Text style={styles.linkButtonText}>Open My Rentals</Text>
                </TouchableOpacity>
              ) : null}
            </>
          )}
        </View>
      </ScrollView>

      <BottomNavigation />
    </View>
  );
}

const getStatusColor = (status: string) => {
  if (status === 'Pending') return '#F59E0B';
  if (status === 'Accepted') return '#22C55E';
  if (status === 'Rejected') return '#EF4444';
  return '#6B7280';
};

const getStatusBg = (status: string) => {
  if (status === 'Pending') return '#FEF3C7';
  if (status === 'Accepted') return '#DCFCE7';
  if (status === 'Rejected') return '#FEE2E2';
  return '#F3F4F6';
};

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
  imageContainer: {
    width: 160,
    height: 140,
    alignSelf: 'flex-start',
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
    overflow: 'hidden',
    marginBottom: 16,
  },
  detailImage: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
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
  detailRent: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1A237E',
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
  descriptionText: {
    fontSize: 14,
    color: '#64748B',
    lineHeight: 22,
  },
  dateRow: {
    flexDirection: 'row',
    gap: 12,
  },
  dateItem: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  dateLabel: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 4,
  },
  dateValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1A1A1A',
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
  phoneLink: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A237E',
    textDecorationLine: 'underline',
  },
  actionContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  rejectButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#EF4444',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  rejectButtonText: {
    color: '#EF4444',
    fontWeight: '600',
    fontSize: 15,
  },
  acceptButton: {
    flex: 1,
    backgroundColor: '#1A237E',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  acceptButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 15,
  },
  disabled: {
    opacity: 0.65,
  },
  phaseNote: {
    marginTop: 16,
    fontSize: 13,
    color: '#64748B',
    lineHeight: 20,
  },
  linkButton: {
    marginTop: 12,
    backgroundColor: '#1A237E',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  linkButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  reportLink: {
    marginTop: 12,
    alignItems: 'center',
    paddingVertical: 8,
  },
  reportLinkText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#EF4444',
  },
});
