import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Alert,
  Platform,
  Modal,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useCallback, useState } from 'react';
import DateTimePicker from '@react-native-community/datetimepicker';

import BottomNavigation from '../../components/BottomNavigation';
import ScreenHeader from '../../components/ScreenHeader';
import { useAuth } from '@/context/AuthContext';
import { ApiError } from '@/services/api';
import {
  ExploreAsset,
  createRentalRequest,
  fetchExploreAssetById,
} from '@/services/rentalRequests';
import { submitReport } from '@/services/reports';
import ViewLocationButton from '../../components/ViewLocationButton';

const isWebPlatform = Platform.OS === 'web';

const toInputDateValue = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const parseInputDateValue = (value: string) => {
  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) {
    return null;
  }
  return new Date(year, month - 1, day);
};

export default function ExploreAssetDetailsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string | string[] }>();
  const assetId = Array.isArray(id) ? id[0] : id;
  const { token } = useAuth();

  const [asset, setAsset] = useState<ExploreAsset | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isReporting, setIsReporting] = useState(false);
  const [formError, setFormError] = useState('');

  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [startDateText, setStartDateText] = useState('');
  const [endDateText, setEndDateText] = useState('');

  const formatDate = (date: Date) =>
    date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

  const loadAsset = useCallback(async () => {
    if (!token || !assetId) {
      setAsset(null);
      setLoading(false);
      setErrorMessage(!token ? 'Authentication required' : 'Asset not found');
      return;
    }

    setLoading(true);
    setErrorMessage('');

    try {
      const data = await fetchExploreAssetById(token, assetId);
      setAsset(data);
    } catch (error) {
      setAsset(null);
      setErrorMessage(
        error instanceof ApiError
          ? error.message
          : 'Unable to load asset details.'
      );
    } finally {
      setLoading(false);
    }
  }, [assetId, token]);

  useFocusEffect(
    useCallback(() => {
      void loadAsset();
    }, [loadAsset])
  );

  const resetModal = () => {
    setModalVisible(false);
    setFormError('');
    setShowStartPicker(false);
    setShowEndPicker(false);
    setStartDateText('');
    setEndDateText('');
    setStartDate(new Date());
    setEndDate(new Date());
  };

  const onStartDateChange = (_event: unknown, selectedDate?: Date) => {
    if (Platform.OS !== 'ios') {
      setShowStartPicker(false);
    }
    if (selectedDate) {
      setStartDate(selectedDate);
      setStartDateText(formatDate(selectedDate));
      setFormError('');
    }
  };

  const onEndDateChange = (_event: unknown, selectedDate?: Date) => {
    if (Platform.OS !== 'ios') {
      setShowEndPicker(false);
    }
    if (selectedDate) {
      setEndDate(selectedDate);
      setEndDateText(formatDate(selectedDate));
      setFormError('');
    }
  };

  const openRequestModal = () => {
    setFormError('');
    setModalVisible(true);
  };

  const handleReportListing = () => {
    if (!token || !asset || isReporting || asset.isOwnedByMe) {
      return;
    }

    const run = async () => {
      setIsReporting(true);
      try {
        await submitReport(token, {
          type: 'fake_property',
          assetId: asset.id,
        });
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
      if (window.confirm('Report this listing as fake or misleading?')) {
        void run();
      }
      return;
    }

    Alert.alert('Report listing', 'Report this listing as fake or misleading?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Report', style: 'destructive', onPress: () => void run() },
    ]);
  };

  const handleSubmitRequest = async () => {
    if (!token || !asset) {
      return;
    }

    if (!startDateText || !endDateText) {
      setFormError('Please select both start and end dates');
      return;
    }

    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(0, 0, 0, 0);

    if (end.getTime() <= start.getTime()) {
      setFormError('Lease end date must be after the start date');
      return;
    }

    if (isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setFormError('');

    try {
      await createRentalRequest(token, {
        assetId: asset.id,
        leaseStartDate: start.toISOString(),
        leaseEndDate: end.toISOString(),
      });

      resetModal();
      Alert.alert('Success', 'Your rental request has been sent successfully!', [
        {
          text: 'OK',
          onPress: () => router.push('/requests' as any),
        },
      ]);
    } catch (error) {
      const message =
        error instanceof ApiError
          ? error.message
          : 'Unable to send rental request.';
      setFormError(message);
      Alert.alert('Error', message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const openOwnerDialer = async (phoneNumber: string) => {
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

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#323a8f" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  if (!asset) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#323a8f" />
        <ScreenHeader title="Asset Details" variant="dark" />
        <View style={styles.notFoundContainer}>
          <Ionicons name="alert-circle-outline" size={60} color="#CBD5E1" />
          <Text style={styles.notFoundText}>
            {errorMessage || 'Asset not found'}
          </Text>
        </View>
      </View>
    );
  }

  const isAvailable = asset.status === 'Available';
  const hasPendingRequest = asset.hasPendingRequest;
  const isOwnedByMe = Boolean(asset.isOwnedByMe);
  const hasDescription = Boolean(asset.description?.trim());
  const showRequestButton =
    isAvailable && !hasPendingRequest && !isOwnedByMe;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#323a8f" />

      <ScreenHeader title="Asset Details" variant="dark" />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.detailCard}>
          <View style={styles.detailHeaderRow}>
            <Text style={styles.detailName}>{asset.name}</Text>
            <View
              style={[
                styles.statusBadge,
                {
                  backgroundColor: hasPendingRequest
                    ? '#FEF3C7'
                    : getStatusBg(asset.status),
                },
              ]}
            >
              <Text
                style={[
                  styles.statusText,
                  {
                    color: hasPendingRequest
                      ? '#F59E0B'
                      : getStatusColor(asset.status),
                  },
                ]}
              >
                {hasPendingRequest ? 'Pending' : asset.status}
              </Text>
            </View>
          </View>

          <Text style={styles.detailType}>{asset.type}</Text>
          <Text style={styles.detailLocation}>{asset.location}</Text>
          <ViewLocationButton location={asset.location} />
          {asset.rent ? (
            <Text style={styles.detailRent}>{asset.rent}</Text>
          ) : null}

          {hasDescription ? (
            <>
              <View style={styles.divider} />
              <Text style={styles.sectionTitle}>Description</Text>
              <Text style={styles.descriptionText}>{asset.description}</Text>
            </>
          ) : null}

          <View style={styles.divider} />

          <Text style={styles.sectionTitle}>Owner</Text>
          <View style={styles.ownerRow}>
            <Ionicons name="person-outline" size={18} color="#64748B" />
            <Text style={styles.ownerLabel}>Name:</Text>
            <Text style={styles.ownerValue}>
              {asset.ownerName || 'Unavailable'}
            </Text>
          </View>
          {asset.ownerPhone ? (
            <View style={styles.ownerRow}>
              <Ionicons name="call-outline" size={18} color="#64748B" />
              <Text style={styles.ownerLabel}>Phone:</Text>
              <TouchableOpacity
                onPress={() => void openOwnerDialer(asset.ownerPhone!)}
              >
                <Text style={styles.ownerPhone}>{asset.ownerPhone}</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          {showRequestButton ? (
            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={styles.requestButton}
                onPress={openRequestModal}
              >
                <Text style={styles.requestButtonText}>Request</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          {hasPendingRequest ? (
            <View style={styles.buttonContainer}>
              <View style={[styles.requestButton, styles.requestButtonSent]}>
                <Text
                  style={[styles.requestButtonText, styles.requestButtonTextSent]}
                >
                  Pending
                </Text>
              </View>
            </View>
          ) : null}

          {isOwnedByMe && isAvailable ? (
            <Text style={styles.ownedHint}>
              This is your asset. You cannot request it.
            </Text>
          ) : null}

          {!isOwnedByMe ? (
            <TouchableOpacity
              style={styles.reportButton}
              onPress={handleReportListing}
              disabled={isReporting}
            >
              <Text style={styles.reportButtonText}>
                {isReporting ? 'Reporting...' : 'Report listing'}
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </ScrollView>

      <BottomNavigation />

      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={resetModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Lease Details</Text>

            <View style={styles.modalInputContainer}>
              <Text style={styles.modalLabel}>Start Date</Text>
              {isWebPlatform ? (
                <View style={styles.modalInput}>
                  <input
                    type="date"
                    value={startDateText ? toInputDateValue(startDate) : ''}
                    onChange={(event: { target: { value: string } }) => {
                      const parsed = parseInputDateValue(event.target.value);
                      if (!parsed) {
                        return;
                      }
                      setStartDate(parsed);
                      setStartDateText(formatDate(parsed));
                      setFormError('');
                    }}
                    style={{
                      flex: 1,
                      border: 'none',
                      outline: 'none',
                      backgroundColor: 'transparent',
                      fontSize: 15,
                      color: startDateText ? '#1A1A1A' : '#94A3B8',
                      fontFamily: 'inherit',
                      width: '100%',
                    }}
                  />
                  <Ionicons name="calendar-outline" size={20} color="#323a8f" />
                </View>
              ) : (
                <>
                  <TouchableOpacity
                    style={styles.modalInput}
                    onPress={() => setShowStartPicker(true)}
                  >
                    <Text
                      style={[
                        styles.modalInputText,
                        startDateText && { color: '#1A1A1A' },
                      ]}
                    >
                      {startDateText || 'Select Start Date'}
                    </Text>
                    <Ionicons name="calendar-outline" size={20} color="#323a8f" />
                  </TouchableOpacity>
                  {showStartPicker ? (
                    <DateTimePicker
                      value={startDate}
                      mode="date"
                      display="default"
                      onChange={onStartDateChange}
                    />
                  ) : null}
                </>
              )}
            </View>

            <View style={styles.modalInputContainer}>
              <Text style={styles.modalLabel}>End Date</Text>
              {isWebPlatform ? (
                <View style={styles.modalInput}>
                  <input
                    type="date"
                    value={endDateText ? toInputDateValue(endDate) : ''}
                    onChange={(event: { target: { value: string } }) => {
                      const parsed = parseInputDateValue(event.target.value);
                      if (!parsed) {
                        return;
                      }
                      setEndDate(parsed);
                      setEndDateText(formatDate(parsed));
                      setFormError('');
                    }}
                    style={{
                      flex: 1,
                      border: 'none',
                      outline: 'none',
                      backgroundColor: 'transparent',
                      fontSize: 15,
                      color: endDateText ? '#1A1A1A' : '#94A3B8',
                      fontFamily: 'inherit',
                      width: '100%',
                    }}
                  />
                  <Ionicons name="calendar-outline" size={20} color="#323a8f" />
                </View>
              ) : (
                <>
                  <TouchableOpacity
                    style={styles.modalInput}
                    onPress={() => setShowEndPicker(true)}
                  >
                    <Text
                      style={[
                        styles.modalInputText,
                        endDateText && { color: '#1A1A1A' },
                      ]}
                    >
                      {endDateText || 'Select End Date'}
                    </Text>
                    <Ionicons name="calendar-outline" size={20} color="#323a8f" />
                  </TouchableOpacity>
                  {showEndPicker ? (
                    <DateTimePicker
                      value={endDate}
                      mode="date"
                      display="default"
                      onChange={onEndDateChange}
                    />
                  ) : null}
                </>
              )}
            </View>

            {formError ? (
              <Text style={styles.formErrorText}>{formError}</Text>
            ) : null}

            <View style={styles.modalButtonRow}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={resetModal}
                disabled={isSubmitting}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalConfirmButton,
                  isSubmitting && styles.buttonDisabled,
                ]}
                onPress={() => void handleSubmitRequest()}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalConfirmText}>Send Request</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const getStatusColor = (status: string) => {
  if (status === 'Available') return '#22C55E';
  if (status === 'Rented') return '#EF4444';
  return '#6B7280';
};

const getStatusBg = (status: string) => {
  if (status === 'Available') return '#DCFCE7';
  if (status === 'Rented') return '#FEE2E2';
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
  detailCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
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
    color: '#323a8f',
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
  ownerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 6,
  },
  ownerLabel: {
    fontSize: 14,
    color: '#64748B',
  },
  ownerValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1A1A1A',
  },
  ownerPhone: {
    fontSize: 14,
    fontWeight: '600',
    color: '#323a8f',
    textDecorationLine: 'underline',
  },
  buttonContainer: {
    marginTop: 16,
  },
  requestButton: {
    backgroundColor: '#323a8f',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  requestButtonSent: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  requestButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  requestButtonTextSent: {
    color: '#F59E0B',
  },
  ownedHint: {
    marginTop: 12,
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
  },
  reportButton: {
    marginTop: 16,
    alignItems: 'center',
    paddingVertical: 10,
  },
  reportButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#EF4444',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 16,
    textAlign: 'center',
  },
  modalInputContainer: {
    marginBottom: 14,
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 6,
  },
  modalInput: {
    height: 50,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
  },
  modalInputText: {
    fontSize: 15,
    color: '#94A3B8',
  },
  formErrorText: {
    color: '#EF4444',
    fontSize: 13,
    marginBottom: 10,
  },
  modalButtonRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  modalCancelButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  modalCancelText: {
    color: '#64748B',
    fontWeight: '600',
  },
  modalConfirmButton: {
    flex: 1,
    backgroundColor: '#323a8f',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  modalConfirmText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.65,
  },
});
