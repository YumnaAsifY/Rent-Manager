import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useCallback, useState } from 'react';

import BottomNavigation from '../../components/BottomNavigation';
import ScreenHeader from '../../components/ScreenHeader';
import { useAuth } from '@/context/AuthContext';
import { ApiError } from '@/services/api';
import {
  Asset,
  fetchAssetById,
} from '@/services/assets';

export default function AssetDetailScreen() {
  const { id } = useLocalSearchParams<{ id?: string | string[] }>();
  const assetId = Array.isArray(id) ? id[0] : id;
  const { token } = useAuth();
  const [asset, setAsset] = useState<Asset | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

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

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1a237e" />
        <Text style={styles.loadingText}>Loading details...</Text>
      </View>
    );
  }

  if (!asset) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#1A237E" />
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
  const hasDescription = Boolean(asset.description?.trim());

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1A237E" />

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
                          color="#1a237e"
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
                          color="#1a237e"
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
        </View>
      </ScrollView>

      <BottomNavigation />
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
    marginBottom: 2,
  },
  detailRent: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a237e',
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
