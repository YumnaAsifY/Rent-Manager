import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  TextInput,
  Image,
  Alert,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useState } from 'react';
import * as ImagePicker from 'expo-image-picker';

import BottomNavigation from '../../components/BottomNavigation';
import ScreenHeader from '../../components/ScreenHeader';
import LiftPressable from '../../components/LiftPressable';
import { useAuth } from '@/context/AuthContext';
import { ApiError } from '@/services/api';
import {
  fetchAssetById,
  getAssetImageUrl,
  updateAsset,
} from '@/services/assets';
import { fetchAssetCategories } from '@/services/assetCategories';
import {
  consumeLocationPick,
  subscribeLocationPick,
} from '@/utils/locationPicker';

export default function EditAssetScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string | string[] }>();
  const assetId = Array.isArray(id) ? id[0] : id;
  const { token } = useAuth();

  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [assetName, setAssetName] = useState('');
  const [assetType, setAssetType] = useState('');
  const [location, setLocation] = useState('');
  const [monthlyRent, setMonthlyRent] = useState('');
  const [description, setDescription] = useState('');
  const [image, setImage] = useState<string | null>(null);
  const [imageMimeType, setImageMimeType] = useState<string | null>(null);
  const [imageFileName, setImageFileName] = useState<string | null>(null);
  const [dropdownVisible, setDropdownVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [assetTypes, setAssetTypes] = useState<string[]>([]);
  const [fieldErrors, setFieldErrors] = useState<{
    name?: string;
    type?: string;
    location?: string;
    rent?: string;
    image?: string;
  }>({});
  const [originalValues, setOriginalValues] = useState<{
    name: string;
    type: string;
    location: string;
    monthlyRent: string;
    description: string;
    image: string | null;
  } | null>(null);

  useEffect(() => {
    let mounted = true;

    const loadAsset = async () => {
      if (!token || !assetId) {
        if (mounted) {
          setIsLoading(false);
          setLoadError(!token ? 'Authentication required' : 'Asset not found');
        }
        return;
      }

      try {
        const asset = await fetchAssetById(token, assetId);
        if (!mounted) {
          return;
        }

        if (asset.status !== 'Available') {
          setLoadError('Only available assets can be edited.');
          setIsLoading(false);
          return;
        }

        setAssetName(asset.name);
        setAssetType(asset.type);
        setLocation(asset.location);
        setMonthlyRent(
          asset.monthlyRent != null ? String(asset.monthlyRent) : ''
        );
        setDescription(asset.description || '');
        setImage(getAssetImageUrl(asset.image));
        setOriginalValues({
          name: asset.name,
          type: asset.type,
          location: asset.location,
          monthlyRent:
            asset.monthlyRent != null ? String(asset.monthlyRent) : '',
          description: asset.description || '',
          image: getAssetImageUrl(asset.image),
        });
        setLoadError('');
      } catch (error) {
        if (mounted) {
          setLoadError(
            error instanceof ApiError
              ? error.message
              : 'Unable to load asset details.'
          );
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    void loadAsset();

    return () => {
      mounted = false;
    };
  }, [assetId, token]);

  useEffect(() => {
    return subscribeLocationPick((pickedLocation) => {
      setLocation(pickedLocation);
      setFieldErrors((prev) => ({ ...prev, location: undefined }));
    });
  }, []);

  useFocusEffect(
    useCallback(() => {
      let mounted = true;
      const pickedLocation = consumeLocationPick();
      if (pickedLocation) {
        setLocation(pickedLocation);
        setFieldErrors((prev) => ({ ...prev, location: undefined }));
      }

      const loadTypes = async () => {
        if (!token) {
          if (mounted) {
            setAssetTypes([]);
          }
          return;
        }

        try {
          const categories = await fetchAssetCategories(token);
          if (mounted) {
            setAssetTypes(categories.map((category) => category.name));
          }
        } catch {
          if (mounted) {
            setAssetTypes([]);
          }
        }
      };

      void loadTypes();
      return () => {
        mounted = false;
      };
    }, [token])
  );

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission Required',
        'Please allow access to your gallery to upload images.'
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled) {
      const picked = result.assets[0];
      setImage(picked.uri);
      setImageMimeType(picked.mimeType ?? null);
      setImageFileName(picked.fileName ?? null);
      setFieldErrors((prev) => ({ ...prev, image: undefined }));
    }
  };

  const handleCancel = () => {
    router.back();
  };

  const handleSaveChanges = async () => {
    if (!originalValues || !token || !assetId || isSubmitting) {
      return;
    }

    setFieldErrors({});

    const normalizeRent = (value: string) =>
      String(value).replace(/,/g, '').trim();

    const name = assetName.trim() || originalValues.name;
    const type = assetType.trim() || originalValues.type;
    const nextLocation = location.trim() || originalValues.location;
    const parsedRent = Number(normalizeRent(monthlyRent));
    const nextRent =
      !monthlyRent.trim() || Number.isNaN(parsedRent) || parsedRent <= 0
        ? originalValues.monthlyRent
        : monthlyRent;
    const nextDescription = description.trim()
      ? description
      : originalValues.description;
    const nextImage = image || originalValues.image;

    const unchanged =
      name === originalValues.name.trim() &&
      type === originalValues.type.trim() &&
      nextLocation === originalValues.location.trim() &&
      normalizeRent(nextRent) === normalizeRent(originalValues.monthlyRent) &&
      nextDescription.trim() === originalValues.description.trim() &&
      nextImage === originalValues.image;

    if (unchanged) {
      setShowSuccess(true);
      return;
    }

    setIsSubmitting(true);

    try {
      await updateAsset(token, assetId, {
        name,
        type,
        location: nextLocation,
        description: nextDescription,
        monthlyRent: nextRent,
        imageUri: nextImage,
        imageMimeType,
        imageFileName,
      });
      setShowSuccess(true);
    } catch (error) {
      Alert.alert(
        'Error',
        error instanceof ApiError
          ? error.message
          : 'Unable to save changes. Please try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#323a8f" />
        <Text style={styles.loadingText}>Loading asset...</Text>
      </View>
    );
  }

  if (loadError) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#323a8f" />
        <ScreenHeader title="Edit Asset" variant="dark" />
        <View style={styles.loadingContainer}>
          <Text style={styles.errorText}>{loadError}</Text>
          <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#323a8f" />
      <ScreenHeader title="Edit Asset" variant="dark" />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Asset Name</Text>
          <TextInput
            style={styles.input}
            placeholder="House #12"
            placeholderTextColor="#94A3B8"
            value={assetName}
            onChangeText={(text) => {
              setAssetName(text);
              setFieldErrors((prev) => ({ ...prev, name: undefined }));
            }}
            editable={!isSubmitting}
          />
          {fieldErrors.name ? (
            <Text style={styles.fieldErrorText}>{fieldErrors.name}</Text>
          ) : null}
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Asset Type</Text>
          <TouchableOpacity
            style={styles.dropdown}
            onPress={() => setDropdownVisible(true)}
            disabled={isSubmitting}
          >
            <Text style={[styles.dropdownText, !assetType && { color: '#94A3B8' }]}>
              {assetType || 'Select Type'}
            </Text>
            <Ionicons name="chevron-down" size={20} color="#323a8f" />
          </TouchableOpacity>
          {fieldErrors.type ? (
            <Text style={styles.fieldErrorText}>{fieldErrors.type}</Text>
          ) : null}
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Location</Text>
          <TextInput
            style={styles.input}
            placeholder="Lahore"
            placeholderTextColor="#94A3B8"
            value={location}
            onChangeText={(text) => {
              setLocation(text);
              setFieldErrors((prev) => ({ ...prev, location: undefined }));
            }}
            editable={!isSubmitting}
          />
          <LiftPressable
            style={styles.mapButton}
            onPress={() => {
              router.push({
                pathname: '/select-location',
                params: location.trim() ? { q: location.trim() } : {},
              } as any);
            }}
            disabled={isSubmitting}
          >
            <Ionicons name="map-outline" size={16} color="#FFFFFF" />
            <Text style={styles.mapButtonText}>Select Location on Map</Text>
          </LiftPressable>
          {fieldErrors.location ? (
            <Text style={styles.fieldErrorText}>{fieldErrors.location}</Text>
          ) : null}
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Rent (PKR)</Text>
          <TextInput
            style={styles.input}
            placeholder="30,000"
            placeholderTextColor="#94A3B8"
            keyboardType="numeric"
            value={monthlyRent}
            onChangeText={(text) => {
              setMonthlyRent(text);
              setFieldErrors((prev) => ({ ...prev, rent: undefined }));
            }}
            editable={!isSubmitting}
          />
          {fieldErrors.rent ? (
            <Text style={styles.fieldErrorText}>{fieldErrors.rent}</Text>
          ) : null}
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Description — optional</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Describe your asset..."
            placeholderTextColor="#94A3B8"
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            value={description}
            onChangeText={setDescription}
            editable={!isSubmitting}
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Asset Image</Text>
          <TouchableOpacity
            style={styles.imageUpload}
            onPress={() => void pickImage()}
            disabled={isSubmitting}
          >
            {image ? (
              <Image source={{ uri: image }} style={styles.uploadedImage} />
            ) : (
              <View style={styles.uploadPlaceholder}>
                <Ionicons name="camera-outline" size={40} color="#CBD5E1" />
                <Text style={styles.uploadText}>Tap to upload image</Text>
              </View>
            )}
          </TouchableOpacity>
          {fieldErrors.image ? (
            <Text style={styles.fieldErrorText}>{fieldErrors.image}</Text>
          ) : null}
        </View>

        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={handleCancel}
            disabled={isSubmitting}
            activeOpacity={0.85}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          <LiftPressable
            style={[styles.saveButton, isSubmitting && styles.buttonDisabled]}
            onPress={() => void handleSaveChanges()}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.saveButtonText}>Save Changes</Text>
            )}
          </LiftPressable>
        </View>
      </ScrollView>

      <BottomNavigation />

      <Modal
        visible={showSuccess}
        transparent
        animationType="fade"
        onRequestClose={() => router.back()}
      >
        <View style={styles.successOverlay}>
          <View style={styles.successCard}>
            <View style={styles.successIconWrap}>
              <Ionicons name="checkmark" size={36} color="#FFFFFF" />
            </View>
            <Text style={styles.successTitle}>Successfully changed</Text>
            <LiftPressable
              style={styles.successButton}
              onPress={() => router.back()}
            >
              <Text style={styles.successButtonText}>OK</Text>
            </LiftPressable>
          </View>
        </View>
      </Modal>

      <Modal
        visible={dropdownVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setDropdownVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setDropdownVisible(false)}
        >
          <View style={styles.modalContent}>
            {assetTypes.length === 0 ? (
              <Text style={styles.modalEmptyText}>
                No asset types available. Ask admin to add a category.
              </Text>
            ) : (
              assetTypes.map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.modalItem,
                    assetType === type && styles.modalItemActive,
                  ]}
                  onPress={() => {
                    setAssetType(type);
                    setDropdownVisible(false);
                    setFieldErrors((prev) => ({ ...prev, type: undefined }));
                  }}
                >
                  <Text
                    style={[
                      styles.modalItemText,
                      assetType === type && styles.modalItemTextActive,
                    ]}
                  >
                    {type}
                  </Text>
                  {assetType === type ? (
                    <Ionicons name="checkmark" size={20} color="#323a8f" />
                  ) : null}
                </TouchableOpacity>
              ))
            )}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 24,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#64748B',
  },
  errorText: {
    fontSize: 15,
    color: '#EF4444',
    textAlign: 'center',
    marginBottom: 16,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 120,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 6,
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#1A1A1A',
    backgroundColor: '#FFFFFF',
  },
  textArea: {
    height: 120,
    paddingTop: 12,
  },
  dropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 50,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
  },
  dropdownText: {
    fontSize: 16,
    color: '#1A1A1A',
  },
  fieldErrorText: {
    fontSize: 13,
    color: '#EF4444',
    marginTop: 6,
  },
  mapButton: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#323a8f',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    marginTop: 8,
  },
  mapButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  imageUpload: {
    width: 180,
    height: 160,
    alignSelf: 'flex-start',
    borderWidth: 2,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    borderStyle: 'dashed',
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  uploadPlaceholder: {
    alignItems: 'center',
    gap: 8,
  },
  uploadText: {
    fontSize: 14,
    color: '#94A3B8',
  },
  uploadedImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 8,
  },
  cancelButton: {
    height: 44,
    paddingHorizontal: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748B',
  },
  saveButton: {
    height: 44,
    paddingHorizontal: 20,
    backgroundColor: '#323a8f',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
  },
  buttonDisabled: {
    opacity: 0.65,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
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
  modalContent: {
    width: '80%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 8,
    maxHeight: 360,
  },
  modalEmptyText: {
    padding: 20,
    textAlign: 'center',
    color: '#64748B',
  },
  modalItem: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalItemActive: {
    backgroundColor: '#EEF2FF',
  },
  modalItemText: {
    fontSize: 16,
    color: '#1A1A1A',
  },
  modalItemTextActive: {
    color: '#323a8f',
    fontWeight: '600',
  },
});
