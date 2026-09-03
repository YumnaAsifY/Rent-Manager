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
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useCallback, useMemo, useState } from 'react';

import BottomNavigation from '../components/BottomNavigation';
import ScreenHeader from '../components/ScreenHeader';
import { useAuth } from '@/context/AuthContext';
import { ApiError } from '@/services/api';
import {
  ExploreAsset,
  fetchExploreAssets,
  getAssetImageUrl,
} from '@/services/rentalRequests';

const { width, height } = Dimensions.get('window');
const isWeb = width > 768;

const TYPE_FILTERS = [
  'View All',
  'Plot',
  'Apartment',
  'House',
  'Shop',
] as const;

type TypeFilter = (typeof TYPE_FILTERS)[number];

export default function ExploreAssetsScreen() {
  const router = useRouter();
  const { token } = useAuth();
  const [assets, setAssets] = useState<ExploreAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [selectedType, setSelectedType] = useState<TypeFilter>('View All');
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);

  const loadAssets = useCallback(async () => {
    if (!token) {
      setAssets([]);
      setLoading(false);
      setErrorMessage('Authentication required');
      return;
    }

    setLoading(true);
    setErrorMessage('');

    try {
      const data = await fetchExploreAssets(token);
      setAssets(data);
    } catch (error) {
      setAssets([]);
      setErrorMessage(
        error instanceof ApiError
          ? error.message
          : 'Unable to load assets. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      void loadAssets();
    }, [loadAssets])
  );

  const filteredAssets = useMemo(() => {
    if (selectedType === 'View All') {
      return assets;
    }

    return assets.filter(
      (asset) => asset.type.trim().toLowerCase() === selectedType.toLowerCase()
    );
  }, [assets, selectedType]);

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

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1a237e" />
        <Text style={styles.loadingText}>Loading assets...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1A237E" />

      <ScreenHeader title="Explore Assets" variant="dark" />

      <View style={styles.filterSection}>
        <Text style={styles.filterLabel}>Asset Type</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          {TYPE_FILTERS.map((type) => {
            const isActive = selectedType === type;

            return (
              <TouchableOpacity
                key={type}
                style={[
                  styles.filterChip,
                  isActive && styles.filterChipActive,
                ]}
                onPress={() => setSelectedType(type)}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    isActive && styles.filterChipTextActive,
                  ]}
                >
                  {type}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

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
              onPress={() => void loadAssets()}
            >
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : filteredAssets.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="search-outline" size={60} color="#CBD5E1" />
            <Text style={styles.emptyText}>
              {assets.length === 0
                ? 'No assets available.'
                : `No ${selectedType} assets found.`}
            </Text>
          </View>
        ) : (
          filteredAssets.map((asset) => {
            const imageUrl = getAssetImageUrl(asset.image);
            const badgeLabel = asset.hasPendingRequest
              ? 'Pending'
              : asset.status;

            return (
              <TouchableOpacity
                key={asset.id}
                style={[styles.card, isWeb && styles.cardWeb]}
                onPress={() =>
                  router.push(`/explore-details/${asset.id}` as any)
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
                  <View style={styles.cardHeaderRow}>
                    <Text style={styles.assetName}>{asset.name}</Text>
                    <View
                      style={[
                        styles.statusBadge,
                        {
                          backgroundColor: asset.hasPendingRequest
                            ? '#FEF3C7'
                            : getStatusBg(asset.status),
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusText,
                          {
                            color: asset.hasPendingRequest
                              ? '#F59E0B'
                              : getStatusColor(asset.status),
                          },
                        ]}
                      >
                        {badgeLabel}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.typeText}>{asset.type}</Text>
                  <Text style={styles.locationText}>{asset.location}</Text>
                  {asset.rent ? (
                    <Text style={styles.rentText}>{asset.rent}</Text>
                  ) : null}
                </View>
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  filterSection: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E8EEF7',
    paddingTop: 14,
    paddingBottom: 14,
    paddingLeft: 20,
    shadowColor: '#1A237E',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  filterLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1A237E',
    marginBottom: 10,
    letterSpacing: 0.2,
  },
  filterRow: {
    paddingRight: 20,
    gap: 10,
    alignItems: 'center',
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 22,
    backgroundColor: '#EEF2FF',
    borderWidth: 1,
    borderColor: '#D6DEFF',
  },
  filterChipActive: {
    backgroundColor: '#1A237E',
    borderColor: '#1A237E',
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#3949AB',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
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
  },
  cardWeb: {
    width: '100%',
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
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  assetName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
    marginLeft: 8,
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
    color: '#1A237E',
    marginBottom: 4,
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
    backgroundColor: '#1A237E',
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
