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
  RentalRequestItem,
  fetchMyRentalRequests,
  fetchOwnerRentalRequests,
  getAssetImageUrl,
} from '@/services/rentalRequests';

const { width, height } = Dimensions.get('window');
const isWeb = width > 768;

export default function RequestsScreen() {
  const router = useRouter();
  const { token } = useAuth();
  const [incoming, setIncoming] = useState<RentalRequestItem[]>([]);
  const [sent, setSent] = useState<RentalRequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);

  const loadRequests = useCallback(async () => {
    if (!token) {
      setIncoming([]);
      setSent([]);
      setLoading(false);
      setErrorMessage('Authentication required');
      return;
    }

    setLoading(true);
    setErrorMessage('');

    try {
      const [ownerRequests, tenantRequests] = await Promise.all([
        fetchOwnerRentalRequests(token),
        fetchMyRentalRequests(token),
      ]);
      setIncoming(ownerRequests);
      setSent(tenantRequests);
    } catch (error) {
      setIncoming([]);
      setSent([]);
      setErrorMessage(
        error instanceof ApiError
          ? error.message
          : 'Unable to load requests. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      void loadRequests();
    }, [loadRequests])
  );

  const renderRequestCard = (request: RentalRequestItem, showTenant: boolean) => {
    const imageUrl = getAssetImageUrl(request.image);

    return (
      <TouchableOpacity
        key={`${showTenant ? 'in' : 'sent'}-${request.id}`}
        style={[styles.card, isWeb && styles.cardWeb]}
        onPress={() => router.push(`/request-details/${request.id}` as any)}
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
            <Text style={styles.assetName}>{request.assetName}</Text>
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
          <Text style={styles.locationText}>
            {request.location || 'Location unavailable'}
          </Text>
          <Text style={styles.dateText}>
            {request.startDate || 'N/A'} → {request.endDate || 'N/A'}
          </Text>
          {showTenant && request.tenantName ? (
            <View style={styles.metaRow}>
              <Ionicons name="person-outline" size={14} color="#64748B" />
              <Text style={styles.metaText}>{request.tenantName}</Text>
            </View>
          ) : null}
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1a237e" />
        <Text style={styles.loadingText}>Loading requests...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1A237E" />

      <ScreenHeader title="Requests" variant="dark" />

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
              onPress={() => void loadRequests()}
            >
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <Text style={styles.sectionTitle}>Incoming Requests</Text>
            {incoming.length === 0 ? (
              <Text style={styles.sectionEmpty}>No incoming requests.</Text>
            ) : (
              incoming.map((request) => renderRequestCard(request, true))
            )}

            <Text style={[styles.sectionTitle, styles.sectionSpacing]}>
              Sent Requests
            </Text>
            {sent.length === 0 ? (
              <Text style={styles.sectionEmpty}>No sent requests.</Text>
            ) : (
              sent.map((request) => renderRequestCard(request, false))
            )}
          </>
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
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 12,
  },
  sectionSpacing: {
    marginTop: 12,
  },
  sectionEmpty: {
    fontSize: 14,
    color: '#94A3B8',
    marginBottom: 16,
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
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  locationText: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 2,
  },
  dateText: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 2,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 13,
    color: '#64748B',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
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
