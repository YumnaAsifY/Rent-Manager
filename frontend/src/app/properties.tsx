import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  StatusBar,
  Alert,
  Platform,
  Image,
  ActivityIndicator,
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
  Asset,
  deleteAsset,
  fetchMyAssets,
  getAssetImageUrl,
  makeAssetAvailable,
} from '@/services/assets';

const { width, height } = Dimensions.get('window');
const isWeb = width > 768;

export default function MyAssetsScreen() {
  const router = useRouter();
  const { token } = useAuth();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdatingId, setIsUpdatingId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const [menuAsset, setMenuAsset] = useState<Asset | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadAssets = useCallback(async () => {
    if (!token) {
      setAssets([]);
      setIsLoading(false);
      setErrorMessage('Authentication required');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');

    try {
      const data = await fetchMyAssets(token);
      setAssets(data);
    } catch (error) {
      setAssets([]);
      setErrorMessage(
        error instanceof ApiError
          ? error.message
          : 'Unable to load assets. Please try again.'
      );
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      void loadAssets();
    }, [loadAssets])
  );

  const confirmMakeAvailable = (assetId: string) => {
    const runUpdate = async () => {
      if (!token || isUpdatingId) {
        return;
      }

      setIsUpdatingId(assetId);

      try {
        const updated = await makeAssetAvailable(token, assetId);
        setAssets((prev) =>
          prev.map((asset) => (asset.id === assetId ? updated : asset))
        );
      } catch (error) {
        Alert.alert(
          'Error',
          error instanceof ApiError
            ? error.message
            : 'Unable to make this asset available.'
        );
      } finally {
        setIsUpdatingId(null);
      }
    };

    if (Platform.OS === 'web') {
      const confirmed = window.confirm(
        'Are you sure you want to make this asset available?'
      );
      if (confirmed) {
        void runUpdate();
      }
      return;
    }

    Alert.alert(
      'Make Available',
      'Are you sure you want to make this asset available?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Make Available',
          onPress: () => {
            void runUpdate();
          },
        },
      ]
    );
  };

  const runDeleteAsset = async (assetId: string) => {
    if (!token || isDeleting) {
      return;
    }

    setIsDeleting(true);
    setMenuAsset(null);

    try {
      await deleteAsset(token, assetId);
      setAssets((prev) => prev.filter((asset) => asset.id !== assetId));
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

  const confirmDeleteAsset = (asset: Asset) => {
    setMenuAsset(null);

    const runDelete = () => {
      void runDeleteAsset(asset.id);
    };

    if (Platform.OS === 'web') {
      const confirmed = window.confirm(
        'Are you sure you want to delete this asset?'
      );
      if (confirmed) {
        runDelete();
      }
      return;
    }

    Alert.alert(
      'Delete Asset',
      'Are you sure you want to delete this asset?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: runDelete,
        },
      ]
    );
  };

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

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1A237E" />

      <ScreenHeader title="My Assets" variant="dark" />

      {isLoading ? (
        <View style={styles.centeredState}>
          <ActivityIndicator size="large" color="#1A237E" />
          <Text style={styles.stateText}>Loading assets...</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {errorMessage ? (
            <View style={styles.centeredState}>
              <Text style={styles.errorText}>{errorMessage}</Text>
              <TouchableOpacity style={styles.retryButton} onPress={() => void loadAssets()}>
                <Text style={styles.retryButtonText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : assets.length === 0 ? (
            <View style={styles.centeredState}>
              <Text style={styles.emptyText}>No asset yet.</Text>
            </View>
          ) : (
            assets.map((asset) => {
              const showMakeAvailable =
                asset.status === 'Rented' && asset.leaseStatus === 'ended';
              const canDelete = asset.status === 'Available';
              const imageUrl = getAssetImageUrl(asset.image);

              return (
                <View
                  key={asset.id}
                  style={[styles.cardWrapper, isWeb && styles.cardWeb]}
                >
                  <TouchableOpacity
                    style={styles.card}
                    onPress={() =>
                      router.push(`/property-details/${asset.id}` as any)
                    }
                    activeOpacity={0.7}
                  >
                    <TouchableOpacity
                      style={styles.imageContainer}
                      activeOpacity={0.85}
                      disabled={!imageUrl}
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
                        <View style={styles.imagePlaceholder}>
                          <Ionicons name="home-outline" size={30} color="#CBD5E1" />
                        </View>
                      )}
                    </TouchableOpacity>

                    <View style={styles.cardContent}>
                      <View style={styles.cardTitleRow}>
                        <Text style={styles.assetName}>{asset.name}</Text>
                        {canDelete ? (
                          <TouchableOpacity
                            style={styles.menuButton}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                            onPress={() => setMenuAsset(asset)}
                          >
                            <Ionicons
                              name="ellipsis-vertical"
                              size={18}
                              color="#64748B"
                            />
                          </TouchableOpacity>
                        ) : null}
                      </View>
                      <Text style={styles.locationText}>{asset.location}</Text>
                      <Text style={styles.typeText}>{asset.type}</Text>
                      {asset.rent ? (
                        <Text style={styles.rentText}>{asset.rent}</Text>
                      ) : null}

                      <View style={styles.statusRow}>
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

                        {asset.leaseStatus === 'ended' &&
                          asset.status === 'Rented' && (
                            <Text style={styles.leaseEndedText}>Lease Ended</Text>
                          )}
                      </View>
                    </View>
                  </TouchableOpacity>

                  {showMakeAvailable && (
                    <TouchableOpacity
                      style={[
                        styles.makeAvailableButton,
                        isUpdatingId === asset.id && styles.buttonDisabled,
                      ]}
                      onPress={() => confirmMakeAvailable(asset.id)}
                      activeOpacity={0.7}
                      disabled={isUpdatingId === asset.id}
                    >
                      <Text style={styles.makeAvailableText}>
                        {isUpdatingId === asset.id
                          ? 'Updating...'
                          : 'Make Available'}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              );
            })
          )}

          <View style={styles.bottomSpacing} />
        </ScrollView>
      )}

      <View style={styles.fabWrapper}>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => router.push('/add-asset' as any)}
        >
          <Ionicons name="add" size={22} color="#1A237E" />
          <Text style={styles.addButtonText}>Add asset</Text>
        </TouchableOpacity>
      </View>

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

      <Modal
        visible={Boolean(menuAsset)}
        transparent
        animationType="fade"
        onRequestClose={() => setMenuAsset(null)}
      >
        <Pressable
          style={styles.menuOverlay}
          onPress={() => setMenuAsset(null)}
        >
          <View style={styles.menuCard}>
            <TouchableOpacity
              style={styles.menuItem}
              disabled={isDeleting}
              onPress={() => {
                if (menuAsset) {
                  confirmDeleteAsset(menuAsset);
                }
              }}
            >
              {isDeleting ? (
                <ActivityIndicator color="#EF4444" size="small" />
              ) : (
                <>
                  <Ionicons name="trash-outline" size={18} color="#EF4444" />
                  <Text style={styles.menuDeleteText}>Delete</Text>
                </>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => setMenuAsset(null)}
            >
              <Text style={styles.menuCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
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
    paddingBottom: 120,
    flexGrow: 1,
  },
  centeredState: {
    flex: 1,
    minHeight: 220,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  stateText: {
    marginTop: 12,
    fontSize: 15,
    color: '#64748B',
  },
  emptyText: {
    fontSize: 16,
    color: '#64748B',
    fontWeight: '500',
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
  cardWrapper: {
    marginBottom: 16,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    overflow: 'hidden',
  },
  cardWeb: {
    width: '100%',
  },
  card: {
    flexDirection: 'row',
    padding: 12,
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
  },
  imagePlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardContent: {
    flex: 1,
    justifyContent: 'center',
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 2,
  },
  assetName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    flex: 1,
  },
  menuButton: {
    padding: 2,
  },
  locationText: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 2,
  },
  typeText: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 2,
  },
  rentText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A237E',
    marginBottom: 4,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
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
  leaseEndedText: {
    fontSize: 11,
    color: '#EF4444',
    fontWeight: '500',
  },
  makeAvailableButton: {
    backgroundColor: '#1A237E',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    marginHorizontal: 12,
    marginBottom: 12,
    alignSelf: 'flex-start',
  },
  makeAvailableText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  buttonDisabled: {
    opacity: 0.65,
  },
  bottomSpacing: {
    height: 20,
  },
  fabWrapper: {
    position: 'absolute',
    bottom: 80,
    left: 20,
    right: 20,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#1A237E',
    borderRadius: 12,
    paddingVertical: 14,
    gap: 8,
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A237E',
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
