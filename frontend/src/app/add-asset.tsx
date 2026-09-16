import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  StatusBar,
  TextInput,
  Image,
  Alert,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useState, useEffect, useCallback } from 'react';
import * as ImagePicker from 'expo-image-picker';

import BottomNavigation from '../components/BottomNavigation';
import ScreenHeader from '../components/ScreenHeader';
import { useAuth } from '@/context/AuthContext';
import { ApiError } from '@/services/api';
import { createAsset } from '@/services/assets';
import { fetchAssetCategories } from '@/services/assetCategories';
import { subscribeLocationPick, consumeLocationPick } from '@/utils/locationPicker';
import {
  clearAddAssetDraft,
  readAddAssetDraft,
  writeAddAssetDraft,
} from '@/utils/addAssetDraft';

const { width } = Dimensions.get('window');

export default function AddAssetScreen() {
  const router = useRouter();
  const { token } = useAuth();
  const [assetName, setAssetName] = useState(
    () => readAddAssetDraft().assetName
  );
  const [assetType, setAssetType] = useState(
    () => readAddAssetDraft().assetType
  );
  const [location, setLocation] = useState(() => readAddAssetDraft().location);
  const [monthlyRent, setMonthlyRent] = useState(
    () => readAddAssetDraft().monthlyRent
  );
  const [description, setDescription] = useState(
    () => readAddAssetDraft().description
  );
  const [image, setImage] = useState<string | null>(
    () => readAddAssetDraft().image
  );
  const [imageMimeType, setImageMimeType] = useState<string | null>(
    () => readAddAssetDraft().imageMimeType
  );
  const [imageFileName, setImageFileName] = useState<string | null>(
    () => readAddAssetDraft().imageFileName
  );
  const [dropdownVisible, setDropdownVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{
    name?: string;
    type?: string;
    location?: string;
    rent?: string;
    image?: string;
  }>({});

  const [assetTypes, setAssetTypes] = useState<string[]>([]);

  useEffect(() => {
    writeAddAssetDraft({
      assetName,
      assetType,
      location,
      monthlyRent,
      description,
      image,
      imageMimeType,
      imageFileName,
    });
  }, [
    assetName,
    assetType,
    location,
    monthlyRent,
    description,
    image,
    imageMimeType,
    imageFileName,
  ]);

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

  const handleSaveAsset = async () => {
    const nextErrors: {
      name?: string;
      type?: string;
      location?: string;
      rent?: string;
      image?: string;
    } = {};

    if (!assetName.trim()) {
      nextErrors.name = 'Asset name is required';
    }

    if (!assetType.trim()) {
      nextErrors.type = 'Asset type is required';
    } else if (assetTypes.length > 0 && !assetTypes.includes(assetType)) {
      nextErrors.type = 'Select a valid asset type';
    }

    if (!location.trim()) {
      nextErrors.location = 'Location is required';
    }

    const parsedRent = Number(String(monthlyRent).replace(/,/g, '').trim());
    if (!String(monthlyRent).trim()) {
      nextErrors.rent = 'Rent is required';
    } else if (Number.isNaN(parsedRent) || parsedRent <= 0) {
      nextErrors.rent = 'Enter a valid rent amount';
    }

    if (!image) {
      nextErrors.image = 'Asset image is required';
    }

    setFieldErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    if (!image) {
      return;
    }

    if (!token) {
      Alert.alert('Error', 'Authentication required');
      return;
    }

    if (isSubmitting) {
      return;
    }

    setIsSubmitting(true);

    try {
      await createAsset(token, {
        name: assetName,
        type: assetType,
        location,
        description,
        monthlyRent,
        imageUri: image,
        imageMimeType,
        imageFileName,
      });

      setShowSuccess(true);
      clearAddAssetDraft();
    } catch (error) {
      const message =
        error instanceof ApiError
          ? error.message
          : 'Unable to save asset. Please try again.';
      Alert.alert('Error', message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#323a8f" />

      <ScreenHeader title="Add New Asset" variant="dark" />

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
          />
          <TouchableOpacity
            style={styles.mapButton}
            onPress={() => {
              writeAddAssetDraft({
                assetName,
                assetType,
                location,
                monthlyRent,
                description,
                image,
                imageMimeType,
                imageFileName,
              });
              router.push({
                pathname: '/select-location',
                params: location.trim() ? { q: location.trim() } : {},
              } as any);
            }}
            disabled={isSubmitting}
            activeOpacity={0.85}
          >
            <Ionicons name="map-outline" size={16} color="#FFFFFF" />
            <Text style={styles.mapButtonText}>Select Location on Map</Text>
          </TouchableOpacity>
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

        <View style={styles.bottomSpacing} />
      </ScrollView>

      <View style={styles.fabWrapper}>
        <TouchableOpacity
          style={[styles.saveButton, isSubmitting && styles.buttonDisabled]}
          onPress={() => void handleSaveAsset()}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.saveButtonText}>Save Asset</Text>
          )}
        </TouchableOpacity>
      </View>

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
            <Text style={styles.successTitle}>Asset Added Successfully!</Text>
            <TouchableOpacity
              style={styles.successButton}
              onPress={() => router.back()}
              activeOpacity={0.85}
            >
              <Text style={styles.successButtonText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal
        visible={dropdownVisible}
        transparent={true}
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
                {assetType === type && (
                  <Ionicons name="checkmark" size={20} color="#323a8f" />
                )}
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
  bottomSpacing: {
    height: 20,
  },
  fabWrapper: {
    position: 'absolute',
    bottom: 80,
    left: 20,
    right: 20,
  },
  saveButton: {
    height: 54,
    backgroundColor: '#323a8f',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    boxShadow: '0px 4px 8px rgba(26, 35, 126, 0.3)',
    elevation: 5,
  },
  buttonDisabled: {
    opacity: 0.65,
  },
  saveButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  mapButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
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
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 8,
    width: width * 0.85,
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  modalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  modalItemActive: {
    backgroundColor: '#F1F5F9',
  },
  modalItemText: {
    fontSize: 16,
    color: '#1A1A1A',
  },
  modalItemTextActive: {
    color: '#323a8f',
    fontWeight: '600',
  },
  modalEmptyText: {
    fontSize: 14,
    color: '#64748B',
    paddingVertical: 18,
    paddingHorizontal: 16,
    textAlign: 'center',
  },
});
