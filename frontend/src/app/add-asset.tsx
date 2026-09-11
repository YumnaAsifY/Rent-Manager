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
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import * as ImagePicker from 'expo-image-picker';

import BottomNavigation from '../components/BottomNavigation';
import ScreenHeader from '../components/ScreenHeader';
import { useAuth } from '@/context/AuthContext';
import { ApiError } from '@/services/api';
import { createAsset } from '@/services/assets';
import ViewLocationButton from '../components/ViewLocationButton';

const { width } = Dimensions.get('window');

export default function AddAssetScreen() {
  const router = useRouter();
  const { token } = useAuth();
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
  const [formError, setFormError] = useState('');

  const assetTypes = ['House', 'Apartment', 'Shop', 'Plot'];

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
      setFormError('');
    }
  };

  const handleSaveAsset = async () => {
    setFormError('');

    if (!assetName.trim()) {
      setFormError('Asset name is required');
      return;
    }

    if (!assetType.trim()) {
      setFormError('Asset type is required');
      return;
    }

    if (!location.trim()) {
      setFormError('Location is required');
      return;
    }

    if (!image) {
      setFormError('Asset image is required');
      return;
    }

    if (!token) {
      setFormError('Authentication required');
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

      const successMessage = 'Your asset successfully added';

      if (Platform.OS === 'web') {
        window.alert(successMessage);
        router.back();
      } else {
        Alert.alert('Success', successMessage, [
          { text: 'OK', onPress: () => router.back() },
        ]);
      }
    } catch (error) {
      const message =
        error instanceof ApiError
          ? error.message
          : 'Unable to save asset. Please try again.';
      setFormError(message);
      Alert.alert('Error', message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1A237E" />

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
              setFormError('');
            }}
            editable={!isSubmitting}
          />
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
            <Ionicons name="chevron-down" size={20} color="#1a237e" />
          </TouchableOpacity>
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
              setFormError('');
            }}
            editable={!isSubmitting}
          />
          <ViewLocationButton location={location} />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Rent (PKR) — optional</Text>
          <TextInput
            style={styles.input}
            placeholder="30,000"
            placeholderTextColor="#94A3B8"
            keyboardType="numeric"
            value={monthlyRent}
            onChangeText={setMonthlyRent}
            editable={!isSubmitting}
          />
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
        </View>

        {formError ? <Text style={styles.validationText}>{formError}</Text> : null}

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
            {assetTypes.map((type) => (
              <TouchableOpacity
                key={type}
                style={[
                  styles.modalItem,
                  assetType === type && styles.modalItemActive,
                ]}
                onPress={() => {
                  setAssetType(type);
                  setDropdownVisible(false);
                  setFormError('');
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
                  <Ionicons name="checkmark" size={20} color="#1a237e" />
                )}
              </TouchableOpacity>
            ))}
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
  validationText: {
    fontSize: 13,
    color: '#EF4444',
    marginBottom: 8,
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
    backgroundColor: '#1a237e',
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
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
    color: '#1a237e',
    fontWeight: '600',
  },
});
