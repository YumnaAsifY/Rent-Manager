import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  StatusBar,
  Image,
  ActivityIndicator,
  Modal,
  Alert,
  Platform,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useCallback, useState } from 'react';

import BottomNavigation from '../components/BottomNavigation';
import ScreenHeader from '../components/ScreenHeader';
import ViewLocationButton from '../components/ViewLocationButton';
import { useAuth } from '@/context/AuthContext';
import { ApiError } from '@/services/api';
import {
  Rental,
  fetchMyRentals,
  getRentalImageUrl,
  hideExpiredRentals,
} from '@/services/rentals';
import {
  getRentStatusColors,
  getTenantRentStatusLabel,
} from '@/utils/rentPaymentStatus';

const { width, height } = Dimensions.get('window');
const isWeb = width > 768;

export default function RentalsScreen() {
  const router = useRouter();
  const { token } = useAuth();
  const [rentals, setRentals] = useState<Rental[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isRemovingSelected, setIsRemovingSelected] = useState(false);

  const loadRentals = useCallback(async () => {
    if (!token) {
      setRentals([]);
      setLoading(false);
      setErrorMessage('Authentication required');
      return;
    }

    setLoading(true);
    setErrorMessage('');

    try {
      const data = await fetchMyRentals(token);
      setRentals(data);
    } catch (error) {
      setRentals([]);
      setErrorMessage(
        error instanceof ApiError
          ? error.message
          : 'Unable to load rentals. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      void loadRentals();
      setSelectionMode(false);
      setSelectedIds([]);
    }, [loadRentals])
  );

  const removableRentals = rentals.filter(
    (rental) => rental.status === 'Expired' || rental.status === 'Removed'
  );
  const allRemovableSelected =
    removableRentals.length > 0 &&
    selectedIds.length === removableRentals.length;

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
      { text: 'Remove', style: 'destructive', onPress: onConfirm },
    ]);
  };

  const exitSelectionMode = () => {
    setSelectionMode(false);
    setSelectedIds([]);
  };

  const enterSelectionMode = () => {
    setSelectionMode(true);
    setSelectedIds([]);
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (allRemovableSelected) {
      setSelectedIds([]);
      return;
    }
    setSelectedIds(removableRentals.map((item) => item.id));
  };

  const runRemoveSelected = async () => {
    const removableIds = selectedIds.filter((id) =>
      removableRentals.some((rental) => rental.id === id)
    );

    if (!token || removableIds.length === 0 || isRemovingSelected) {
      return;
    }

    setIsRemovingSelected(true);

    try {
      await hideExpiredRentals(token, removableIds);
      const idSet = new Set(removableIds);
      setRentals((current) => current.filter((rental) => !idSet.has(rental.id)));
      exitSelectionMode();
    } catch (error) {
      Alert.alert(
        'Error',
        error instanceof ApiError
          ? error.message
          : 'Unable to remove selected rentals. Please try again.'
      );
    } finally {
      setIsRemovingSelected(false);
    }
  };

  const confirmRemoveSelected = () => {
    const count = selectedIds.filter((id) =>
      removableRentals.some((rental) => rental.id === id)
    ).length;

    if (count === 0) {
      return;
    }

    confirmAction(
      'Remove selected rentals?',
      `${count} rental${count === 1 ? '' : 's'} will be removed from your list. Active rentals will not be affected.`,
      () => {
        void runRemoveSelected();
      }
    );
  };

  const handleCardPress = (rental: Rental) => {
    if (selectionMode) {
      if (rental.status === 'Expired' || rental.status === 'Removed') {
        toggleSelect(rental.id);
      }
      return;
    }

    router.push(`/rental-detail/${rental.id}` as any);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#323a8f" />
        <Text style={styles.loadingText}>Loading rentals...</Text>
      </View>
    );
  }

  const headerRight = selectionMode ? (
    <View style={styles.selectHeaderActions}>
      <TouchableOpacity onPress={exitSelectionMode} style={styles.selectHeaderAction}>
        <Text style={styles.selectHeaderActionText}>Cancel</Text>
      </TouchableOpacity>
      {removableRentals.length > 0 ? (
        <TouchableOpacity onPress={handleSelectAll} style={styles.selectHeaderAction}>
          <Text style={styles.selectHeaderActionText}>
            {allRemovableSelected ? 'Clear' : 'Select All'}
          </Text>
        </TouchableOpacity>
      ) : null}
    </View>
  ) : removableRentals.length > 0 ? (
    <TouchableOpacity onPress={enterSelectionMode} style={styles.selectHeaderAction}>
      <Text style={styles.selectHeaderActionText}>Select</Text>
    </TouchableOpacity>
  ) : null;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#323a8f" />

      <ScreenHeader
        title="My Rentals"
        variant="dark"
        rightAction={headerRight}
      />

      {selectionMode && selectedIds.length > 0 ? (
        <View style={styles.selectionBar}>
          <Text style={styles.selectionCount}>
            {selectedIds.length} selected
          </Text>
          <TouchableOpacity
            style={[
              styles.deleteSelectedButton,
              isRemovingSelected && styles.disabled,
            ]}
            onPress={confirmRemoveSelected}
            disabled={isRemovingSelected}
          >
            {isRemovingSelected ? (
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
              onPress={() => void loadRentals()}
            >
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : rentals.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="home-outline" size={60} color="#CBD5E1" />
            <Text style={styles.emptyText}>No rentals yet.</Text>
          </View>
        ) : (
          rentals.map((rental) => {
            const imageUrl = getRentalImageUrl(rental.image);
            const isRemovable =
              rental.status === 'Expired' || rental.status === 'Removed';
            const isSelected = selectedIds.includes(rental.id);

            return (
              <TouchableOpacity
                key={rental.id}
                style={[
                  styles.card,
                  isWeb && styles.cardWeb,
                  isSelected && styles.cardSelected,
                  selectionMode && !isRemovable && styles.cardLocked,
                ]}
                onPress={() => handleCardPress(rental)}
                activeOpacity={selectionMode && !isRemovable ? 1 : 0.7}
              >
                {selectionMode && isRemovable ? (
                  <View style={styles.checkboxWrap}>
                    <Ionicons
                      name={isSelected ? 'checkbox' : 'square-outline'}
                      size={22}
                      color={isSelected ? '#323a8f' : '#94A3B8'}
                    />
                  </View>
                ) : null}

                <TouchableOpacity
                  style={styles.imageContainer}
                  activeOpacity={0.85}
                  disabled={selectionMode || !imageUrl}
                  onPress={() => {
                    if (imageUrl) {
                      setPreviewImageUrl(imageUrl);
                    }
                  }}
                >
                  {imageUrl ? (
                    <Image
                      source={{ uri: imageUrl }}
                      style={styles.cardImage}
                      resizeMode="cover"
                    />
                  ) : (
                    <Ionicons name="home-outline" size={30} color="#CBD5E1" />
                  )}
                </TouchableOpacity>

                <View style={styles.cardContent}>
                  <View style={styles.cardHeaderRow}>
                    <Text style={styles.rentalName}>{rental.name}</Text>
                    <View
                      style={[
                        styles.statusBadge,
                        { backgroundColor: getStatusBg(rental.status) },
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusText,
                          { color: getStatusColor(rental.status) },
                        ]}
                      >
                        {rental.status}
                      </Text>
                    </View>
                  </View>
                  {rental.type ? (
                    <Text style={styles.typeText}>{rental.type}</Text>
                  ) : null}
                  <Text style={styles.locationText}>
                    {rental.location || 'Location unavailable'}
                  </Text>
                  <ViewLocationButton location={rental.location} />
                  {rental.rent ? (
                    <Text style={styles.rentText}>{rental.rent}</Text>
                  ) : null}
                  {getTenantRentStatusLabel(rental.rentPaymentStatus) ? (
                    <View
                      style={[
                        styles.paymentBadge,
                        {
                          backgroundColor: getRentStatusColors(
                            rental.rentPaymentStatus
                          ).backgroundColor,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.paymentBadgeText,
                          {
                            color: getRentStatusColors(
                              rental.rentPaymentStatus
                            ).color,
                          },
                        ]}
                      >
                        {getTenantRentStatusLabel(rental.rentPaymentStatus)}
                      </Text>
                    </View>
                  ) : null}
                </View>
                <TouchableOpacity
                  style={styles.detailArrow}
                  onPress={() =>
                    router.push(`/rental-detail/${rental.id}` as any)
                  }
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  accessibilityRole="button"
                  accessibilityLabel="View rental details"
                >
                  <Ionicons name="chevron-forward" size={14} color="#323a8f" />
                </TouchableOpacity>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      <BottomNavigation />

      <Modal
        visible={Boolean(previewImageUrl)}
        transparent
        animationType="fade"
        onRequestClose={() => setPreviewImageUrl(null)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalCloseButton}
            onPress={() => setPreviewImageUrl(null)}
          >
            <Ionicons name="close" size={28} color="#FFFFFF" />
          </TouchableOpacity>

          {previewImageUrl ? (
            <Image
              source={{ uri: previewImageUrl }}
              style={styles.modalImage}
              resizeMode="contain"
            />
          ) : null}

          <Text style={styles.modalHint}>Tap close to dismiss</Text>
        </View>
      </Modal>
    </View>
  );
}

const getStatusColor = (status: string) => {
  if (status === 'Active') return '#22C55E';
  if (status === 'Expired') return '#8B5CF6';
  if (status === 'Removed') return '#EF4444';
  return '#6B7280';
};

const getStatusBg = (status: string) => {
  if (status === 'Active') return '#DCFCE7';
  if (status === 'Expired') return '#EDE9FE';
  if (status === 'Removed') return '#FEE2E2';
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
    flexGrow: 1,
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
  selectHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  selectHeaderAction: {
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  selectHeaderActionText: {
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
    color: '#323a8f',
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
  card: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    padding: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  detailArrow: {
    position: 'absolute',
    right: 8,
    bottom: 8,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardWeb: {
    width: '100%',
  },
  cardSelected: {
    borderColor: '#323a8f',
    backgroundColor: '#F5F7FF',
  },
  cardLocked: {
    opacity: 0.55,
  },
  checkboxWrap: {
    marginRight: 12,
    justifyContent: 'center',
  },
  imageContainer: {
    width: 80,
    height: 80,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    overflow: 'hidden',
  },
  cardImage: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
  },
  cardContent: {
    flex: 1,
    justifyContent: 'center',
    paddingRight: 20,
    paddingBottom: 4,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  rentalName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    flex: 1,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  typeText: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 2,
  },
  locationText: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 2,
  },
  rentText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#323a8f',
    marginBottom: 4,
  },
  paymentBadge: {
    alignSelf: 'flex-start',
    marginTop: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    maxWidth: '100%',
  },
  paymentBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    width: '100%',
  },
  emptyText: {
    fontSize: 16,
    color: '#94A3B8',
    marginTop: 12,
  },
  errorText: {
    fontSize: 15,
    color: '#EF4444',
    textAlign: 'center',
    marginBottom: 12,
  },
  retryButton: {
    backgroundColor: '#323a8f',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.92)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCloseButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalImage: {
    width: width * 0.9,
    height: height * 0.7,
    borderRadius: 16,
  },
  modalHint: {
    position: 'absolute',
    bottom: 60,
    color: 'rgba(255,255,255,0.5)',
    fontSize: 14,
  },
});
