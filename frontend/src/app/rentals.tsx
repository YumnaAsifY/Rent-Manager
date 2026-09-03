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
import { useCallback, useState } from 'react';

import BottomNavigation from '../components/BottomNavigation';
import ScreenHeader from '../components/ScreenHeader';
import { useAuth } from '@/context/AuthContext';
import { ApiError } from '@/services/api';
import {
  Rental,
  fetchMyRentals,
  getRentalImageUrl,
} from '@/services/rentals';

const { width, height } = Dimensions.get('window');
const isWeb = width > 768;

export default function RentalsScreen() {
  const router = useRouter();
  const { token } = useAuth();
  const [rentals, setRentals] = useState<Rental[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);

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
    }, [loadRentals])
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1a237e" />
        <Text style={styles.loadingText}>Loading rentals...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1A237E" />

      <ScreenHeader title="My Rentals" variant="dark" />

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

            return (
              <TouchableOpacity
                key={rental.id}
                style={[styles.card, isWeb && styles.cardWeb]}
                onPress={() =>
                  router.push(`/rental-detail/${rental.id}` as any)
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
                  {rental.rent ? (
                    <Text style={styles.rentText}>{rental.rent}</Text>
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

const getStatusColor = (status: string) => {
  if (status === 'Active') return '#22C55E';
  if (status === 'Expired') return '#8B5CF6';
  return '#6B7280';
};

const getStatusBg = (status: string) => {
  if (status === 'Active') return '#DCFCE7';
  if (status === 'Expired') return '#EDE9FE';
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
    borderRadius: 12,
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
