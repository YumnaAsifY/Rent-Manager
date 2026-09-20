import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  ActivityIndicator,
  Alert,
  Platform,
  TextInput,
  Modal,
} from 'react-native';
import { useLocalSearchParams, useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useCallback, useState } from 'react';
import DateTimePicker from '@react-native-community/datetimepicker';

import BottomNavigation from '../../components/BottomNavigation';
import ScreenHeader from '../../components/ScreenHeader';
import LiftPressable from '../../components/LiftPressable';
import { useAuth } from '@/context/AuthContext';
import { ApiError } from '@/services/api';
import {
  Asset,
  assignAssetToTenant,
  deleteAsset,
  fetchAssetById,
  removeTenantFromAsset,
} from '@/services/assets';
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

export default function AssetDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string | string[] }>();
  const assetId = Array.isArray(id) ? id[0] : id;
  const { token } = useAuth();
  const [asset, setAsset] = useState<Asset | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [showAssignForm, setShowAssignForm] = useState(false);
  const [tenantEmail, setTenantEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [startDateError, setStartDateError] = useState('');
  const [endDateError, setEndDateError] = useState('');
  const [isAssigning, setIsAssigning] = useState(false);
  const [showAssignSuccess, setShowAssignSuccess] = useState(false);
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [startDateText, setStartDateText] = useState('');
  const [endDateText, setEndDateText] = useState('');
  const [showRemoveForm, setShowRemoveForm] = useState(false);
  const [removeReason, setRemoveReason] = useState('');
  const [removeReasonError, setRemoveReasonError] = useState('');
  const [isRemovingTenant, setIsRemovingTenant] = useState(false);
  const [showRemoveSuccess, setShowRemoveSuccess] = useState(false);

  const formatDate = (date: Date) =>
    date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

  const onStartDateChange = (_event: unknown, selectedDate?: Date) => {
    if (Platform.OS !== 'ios') {
      setShowStartPicker(false);
    }
    if (selectedDate) {
      setStartDate(selectedDate);
      setStartDateText(formatDate(selectedDate));
      setStartDateError('');
    }
  };

  const onEndDateChange = (_event: unknown, selectedDate?: Date) => {
    if (Platform.OS !== 'ios') {
      setShowEndPicker(false);
    }
    if (selectedDate) {
      setEndDate(selectedDate);
      setEndDateText(formatDate(selectedDate));
      setEndDateError('');
    }
  };

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
      const data = await fetchAssetById(token, assetId);
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

  const runDelete = async () => {
    if (!token || !assetId || isDeleting) {
      return;
    }

    setIsDeleting(true);

    try {
      await deleteAsset(token, assetId);
      router.back();
    } catch (error) {
      Alert.alert(
        'Error',
        error instanceof ApiError
          ? error.message
          : 'Unable to delete this asset.'
      );
    } finally {
      setIsDeleting(false);
    }
  };

  const confirmDelete = () => {
    if (Platform.OS === 'web') {
      const confirmed = window.confirm(
        'Are you sure you want to delete this asset?'
      );
      if (confirmed) {
        void runDelete();
      }
      return;
    }

    Alert.alert('Delete Asset', 'Are you sure you want to delete this asset?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          void runDelete();
        },
      },
    ]);
  };

  const handleAssignAsset = async () => {
    if (!token || !assetId || isAssigning) {
      return;
    }

    const email = tenantEmail.trim();
    const nextEmailError = email ? '' : 'Please enter email';
    const nextStartError = startDateText ? '' : 'Please select start date';
    let nextEndError = endDateText ? '' : 'Please select end date';

    if (startDateText && endDateText) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(endDate);
      end.setHours(0, 0, 0, 0);

      if (end.getTime() <= start.getTime()) {
        nextEndError = 'Lease end date must be after the start date';
      }
    }

    setEmailError(nextEmailError);
    setStartDateError(nextStartError);
    setEndDateError(nextEndError);

    if (nextEmailError || nextStartError || nextEndError) {
      return;
    }

    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(0, 0, 0, 0);

    setIsAssigning(true);

    try {
      const updated = await assignAssetToTenant(
        token,
        assetId,
        email,
        start.toISOString(),
        end.toISOString()
      );
      setAsset(updated);
      setShowAssignForm(false);
      setTenantEmail('');
      setStartDateText('');
      setEndDateText('');
      setEmailError('');
      setStartDateError('');
      setEndDateError('');
      setShowAssignSuccess(true);
    } catch (error) {
      setEmailError(
        error instanceof ApiError
          ? error.message
          : 'This user is not registered in the app'
      );
    } finally {
      setIsAssigning(false);
    }
  };

  const handleRemoveTenant = async () => {
    if (!token || !assetId || isRemovingTenant) {
      return;
    }

    const reason = removeReason.trim();
    if (!reason) {
      setRemoveReasonError('Please provide a reason');
      return;
    }

    setIsRemovingTenant(true);
    setRemoveReasonError('');

    try {
      const updated = await removeTenantFromAsset(token, assetId, reason);
      setAsset(updated);
      setShowRemoveForm(false);
      setRemoveReason('');
      setShowRemoveSuccess(true);
    } catch (error) {
      setRemoveReasonError(
        error instanceof ApiError
          ? error.message
          : 'Unable to remove tenant. Please try again.'
      );
    } finally {
      setIsRemovingTenant(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#323a8f" />
        <Text style={styles.loadingText}>Loading details...</Text>
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

  const isRented = asset.status === 'Rented';
  const isAvailable = asset.status === 'Available';
  const hasDescription = Boolean(asset.description?.trim());

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
                { backgroundColor: getStatusBg(asset.status) },
              ]}
            >
              <Text
                style={[
                  styles.statusText,
                  { color: getStatusColor(asset.status) },
                ]}
              >
                {asset.status}
              </Text>
            </View>
          </View>

          {asset.leaseEnded && asset.status === 'Rented' ? (
            <Text style={styles.leaseEndedText}>Lease Ended</Text>
          ) : null}

          <Text style={styles.detailType}>{asset.type}</Text>
          <Text style={styles.detailLocation}>{asset.location}</Text>
          <ViewLocationButton location={asset.location} />
          {asset.rent ? (
            <Text style={styles.detailRent}>{asset.rent}</Text>
          ) : null}

          {hasDescription ? (
            <>
              <View style={styles.divider} />
              <Text style={styles.descriptionTitle}>Description</Text>
              <Text style={styles.descriptionText}>{asset.description}</Text>
            </>
          ) : null}

          {isRented && (
            <>
              <View style={styles.divider} />

              <Text style={styles.sectionTitle}>Tenant Details</Text>

              <View style={styles.tenantCard}>
                <View style={styles.tenantRow}>
                  <Ionicons name="person-outline" size={18} color="#64748B" />
                  <Text style={styles.tenantLabel}>Name:</Text>
                  <Text style={styles.tenantValue}>
                    {asset.tenantName || 'N/A'}
                  </Text>
                </View>

                {asset.tenantPhone ? (
                  <View style={styles.tenantRow}>
                    <Ionicons name="call-outline" size={18} color="#64748B" />
                    <Text style={styles.tenantLabel}>Phone:</Text>
                    <Text style={styles.tenantValue}>{asset.tenantPhone}</Text>
                  </View>
                ) : null}

                <View style={styles.leaseDatesContainer}>
                  <Text style={styles.leaseTitle}>Lease Dates</Text>
                  <View style={styles.dateRow}>
                    <View style={styles.dateItem}>
                      <View style={styles.dateIconRow}>
                        <Ionicons
                          name="calendar-outline"
                          size={16}
                          color="#323a8f"
                        />
                        <Text style={styles.dateLabel}>Start Date</Text>
                      </View>
                      <Text style={styles.dateValue}>
                        {asset.startDate || 'N/A'}
                      </Text>
                    </View>

                    <View style={styles.dateItem}>
                      <View style={styles.dateIconRow}>
                        <Ionicons
                          name="calendar-outline"
                          size={16}
                          color="#323a8f"
                        />
                        <Text style={styles.dateLabel}>End Date</Text>
                      </View>
                      <Text style={styles.dateValue}>
                        {asset.endDate || 'N/A'}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            </>
          )}

          {isAvailable ? (
            <View style={styles.actionRow}>
              <TouchableOpacity
                style={styles.actionIconButton}
                onPress={() =>
                  router.push(`/edit-asset/${asset.id}` as any)
                }
                accessibilityLabel="Edit asset"
                activeOpacity={0.8}
              >
                <Ionicons name="create-outline" size={22} color="#323a8f" />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionIconButton, styles.deleteIconButton]}
                onPress={confirmDelete}
                disabled={isDeleting}
                accessibilityLabel="Delete asset"
                activeOpacity={0.8}
              >
                {isDeleting ? (
                  <ActivityIndicator size="small" color="#EF4444" />
                ) : (
                  <Ionicons name="trash-outline" size={22} color="#EF4444" />
                )}
              </TouchableOpacity>
            </View>
          ) : null}
        </View>

        {isAvailable ? (
          <View style={styles.assignSection}>
            <TouchableOpacity
              style={styles.assignToggleButton}
              onPress={() => {
                setShowAssignForm((prev) => !prev);
                setEmailError('');
                setStartDateError('');
                setEndDateError('');
              }}
              activeOpacity={0.85}
            >
              <Text style={styles.assignToggleText}>
                Assign Asset to Tenant
              </Text>
            </TouchableOpacity>
            {showAssignForm ? (
              <View style={styles.assignForm}>
                <Text style={styles.modalLabel}>Enter email</Text>
                <TextInput
                  style={styles.assignInput}
                  placeholder="Enter tenant's email"
                  placeholderTextColor="#94A3B8"
                  value={tenantEmail}
                  onChangeText={(text) => {
                    setTenantEmail(text.toLowerCase());
                    setEmailError('');
                  }}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  editable={!isAssigning}
                />
                {emailError ? (
                  <Text style={styles.assignErrorText}>{emailError}</Text>
                ) : null}
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
                          setStartDateError('');
                        }}
                        style={{
                          flex: 1,
                          border: 'none',
                          outline: 'none',
                          backgroundColor: 'transparent',
                          fontSize: 14,
                          color: startDateText ? '#1A1A1A' : '#94A3B8',
                          fontFamily: 'inherit',
                          width: '100%',
                        }}
                      />
                      <Ionicons name="calendar-outline" size={18} color="#323a8f" />
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
                        <Ionicons name="calendar-outline" size={18} color="#323a8f" />
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
                {startDateError ? (
                  <Text style={styles.assignErrorText}>{startDateError}</Text>
                ) : null}

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
                          setEndDateError('');
                        }}
                        style={{
                          flex: 1,
                          border: 'none',
                          outline: 'none',
                          backgroundColor: 'transparent',
                          fontSize: 14,
                          color: endDateText ? '#1A1A1A' : '#94A3B8',
                          fontFamily: 'inherit',
                          width: '100%',
                        }}
                      />
                      <Ionicons name="calendar-outline" size={18} color="#323a8f" />
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
                        <Ionicons name="calendar-outline" size={18} color="#323a8f" />
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
                {endDateError ? (
                  <Text style={styles.assignErrorText}>{endDateError}</Text>
                ) : null}
                <LiftPressable
                  style={[
                    styles.assignSubmitButton,
                    isAssigning && styles.assignSubmitDisabled,
                  ]}
                  onPress={() => void handleAssignAsset()}
                  disabled={isAssigning}
                >
                  {isAssigning ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <Text style={styles.assignSubmitText}>Assign Asset</Text>
                  )}
                </LiftPressable>
              </View>
            ) : null}
          </View>
        ) : null}

        {isRented && !asset.leaseEnded ? (
          <View style={styles.assignSection}>
            <TouchableOpacity
              style={styles.removeToggleButton}
              onPress={() => {
                setShowRemoveForm((prev) => !prev);
                setRemoveReasonError('');
              }}
              activeOpacity={0.85}
            >
              <Text style={styles.removeToggleText}>Remove this tenant</Text>
            </TouchableOpacity>
            {showRemoveForm ? (
              <View style={styles.assignForm}>
                <Text style={styles.modalLabel}>Provide reason</Text>
                <TextInput
                  style={[styles.assignInput, styles.reasonInput]}
                  placeholder="Write your reason"
                  placeholderTextColor="#94A3B8"
                  value={removeReason}
                  onChangeText={(text) => {
                    setRemoveReason(text);
                    setRemoveReasonError('');
                  }}
                  multiline
                  textAlignVertical="top"
                  editable={!isRemovingTenant}
                />
                {removeReasonError ? (
                  <Text style={styles.assignErrorText}>{removeReasonError}</Text>
                ) : null}
                <LiftPressable
                  style={[
                    styles.assignSubmitButton,
                    isRemovingTenant && styles.assignSubmitDisabled,
                  ]}
                  onPress={() => void handleRemoveTenant()}
                  disabled={isRemovingTenant}
                >
                  {isRemovingTenant ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <Text style={styles.assignSubmitText}>Submit</Text>
                  )}
                </LiftPressable>
              </View>
            ) : null}
          </View>
        ) : null}
      </ScrollView>

      <BottomNavigation />

      <Modal
        visible={showAssignSuccess}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAssignSuccess(false)}
      >
        <View style={styles.successOverlay}>
          <View style={styles.successCard}>
            <View style={styles.successIconWrap}>
              <Ionicons name="checkmark" size={36} color="#FFFFFF" />
            </View>
            <Text style={styles.successTitle}>
              Asset has been assigned to the tenant
            </Text>
            <LiftPressable
              style={styles.successButton}
              onPress={() => setShowAssignSuccess(false)}
            >
              <Text style={styles.successButtonText}>OK</Text>
            </LiftPressable>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showRemoveSuccess}
        transparent
        animationType="fade"
        onRequestClose={() => setShowRemoveSuccess(false)}
      >
        <View style={styles.successOverlay}>
          <View style={styles.successCard}>
            <View style={styles.successIconWrap}>
              <Ionicons name="checkmark" size={36} color="#FFFFFF" />
            </View>
            <Text style={styles.successTitle}>
              Tenant has been removed
            </Text>
            <LiftPressable
              style={styles.successButton}
              onPress={() => setShowRemoveSuccess(false)}
            >
              <Text style={styles.successButtonText}>OK</Text>
            </LiftPressable>
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
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 10,
    marginTop: 18,
  },
  actionIconButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteIconButton: {
    backgroundColor: '#FEF2F2',
  },
  assignSection: {
    marginTop: 14,
    alignSelf: 'flex-start',
    width: 230,
  },
  assignToggleButton: {
    alignSelf: 'flex-start',
    backgroundColor: '#323a8f',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  assignToggleText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  removeToggleButton: {
    alignSelf: 'flex-start',
    backgroundColor: '#EF4444',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  removeToggleText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  assignForm: {
    alignSelf: 'flex-start',
    width: 230,
    marginTop: 10,
  },
  assignInput: {
    width: 230,
    height: 44,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 12,
    fontSize: 13,
    color: '#1A1A1A',
    backgroundColor: '#F8FAFC',
    marginBottom: 0,
  },
  reasonInput: {
    height: 90,
    paddingTop: 10,
  },
  modalInputContainer: {
    marginTop: 4,
    marginBottom: 4,
    width: 230,
  },
  modalLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 6,
  },
  modalInput: {
    width: 230,
    height: 44,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
  },
  modalInputText: {
    fontSize: 13,
    color: '#94A3B8',
    flex: 1,
    marginRight: 6,
  },
  assignErrorText: {
    marginTop: 6,
    marginBottom: 10,
    fontSize: 12,
    color: '#EF4444',
    width: 230,
  },
  assignSubmitButton: {
    marginTop: 10,
    alignSelf: 'flex-start',
    backgroundColor: '#323a8f',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    minWidth: 120,
    alignItems: 'center',
  },
  assignSubmitDisabled: {
    opacity: 0.65,
  },
  assignSubmitText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  successOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  successCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingVertical: 32,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  successIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#22C55E',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
    textAlign: 'center',
    marginBottom: 20,
  },
  successButton: {
    minWidth: 120,
    backgroundColor: '#323a8f',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 28,
    alignItems: 'center',
  },
  successButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
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
  leaseEndedText: {
    fontSize: 13,
    color: '#EF4444',
    fontWeight: '600',
    marginBottom: 6,
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
  descriptionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  descriptionText: {
    fontSize: 14,
    color: '#64748B',
    lineHeight: 22,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 12,
  },
  tenantCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  tenantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 6,
  },
  tenantLabel: {
    fontSize: 14,
    color: '#64748B',
  },
  tenantValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1A1A1A',
  },
  leaseDatesContainer: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  leaseTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 6,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 8,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    gap: 8,
  },
  dateItem: {
    flex: 1,
    alignItems: 'flex-start',
    paddingHorizontal: 2,
  },
  dateIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 2,
  },
  dateLabel: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '500',
  },
  dateValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1A1A1A',
    paddingLeft: 20,
  },
});
