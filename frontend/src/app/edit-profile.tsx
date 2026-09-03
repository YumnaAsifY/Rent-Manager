import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';

import { useRouter } from 'expo-router';
import { useState } from 'react';

import BottomNavigation from '../components/BottomNavigation';
import ScreenHeader from '../components/ScreenHeader';

import { useAuth } from '@/context/AuthContext';

export default function EditProfileScreen() {
  const router = useRouter();

  const {
    user,
    updateProfile,
  } = useAuth();

  // Start with the user's real current information
  const [name, setName] = useState(
    user?.name || ''
  );

  const [phone, setPhone] = useState(
    user?.phoneNumber || ''
  );

  const [isSaving, setIsSaving] = useState(false);

  // Allow numbers only, maximum 11 digits
  const validatePhoneNumber = (text: string) => {
    const numericText = text.replace(
      /[^0-9]/g,
      ''
    );

    if (numericText.length <= 11) {
      setPhone(numericText);
    }
  };

  const handleSaveChanges = async () => {
    const trimmedName = name.trim();
    const trimmedPhone = phone.trim();

    // Name validation
    if (!trimmedName) {
      Alert.alert(
        'Error',
        'Please enter your full name.'
      );
      return;
    }

    // Phone validation
    if (!trimmedPhone) {
      Alert.alert(
        'Error',
        'Please enter your phone number.'
      );
      return;
    }

    if (trimmedPhone.length !== 11) {
      Alert.alert(
        'Error',
        'Phone number must be exactly 11 digits.'
      );
      return;
    }

    try {
      setIsSaving(true);

      // Real backend update
      await updateProfile(
        trimmedName,
        trimmedPhone
      );

      Alert.alert(
        'Success',
        'Profile updated successfully!',
        [
          {
            text: 'OK',
            onPress: () => {
              router.back();
            },
          },
        ]
      );
    } catch (error: any) {
      console.error(
        'Update profile error:',
        error
      );

      Alert.alert(
        'Error',
        error?.message ||
          'Unable to update profile. Please try again.'
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle="light-content"
        backgroundColor="#1A237E"
      />

      <ScreenHeader
        title="Edit Profile"
        variant="dark"
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={
          styles.scrollContent
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Full Name */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>
            Full Name
          </Text>

          <TextInput
            style={styles.input}
            placeholder="Enter your full name"
            placeholderTextColor="#94A3B8"
            value={name}
            onChangeText={setName}
            editable={!isSaving}
            autoCapitalize="words"
          />
        </View>

        {/* Phone Number */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>
            Phone Number
          </Text>

          <TextInput
            style={styles.input}
            placeholder="Enter 11-digit phone number"
            placeholderTextColor="#94A3B8"
            keyboardType="phone-pad"
            value={phone}
            onChangeText={validatePhoneNumber}
            maxLength={11}
            editable={!isSaving}
          />

          {phone.length > 0 &&
            phone.length !== 11 && (
              <Text
                style={styles.validationText}
              >
                Phone number must be 11 digits
              </Text>
            )}
        </View>

        {/* Save Button */}
        <TouchableOpacity
          style={[
            styles.saveButton,
            isSaving &&
              styles.saveButtonDisabled,
          ]}
          onPress={() =>
            void handleSaveChanges()
          }
          disabled={isSaving}
          activeOpacity={0.8}
        >
          {isSaving ? (
            <ActivityIndicator
              color="#FFFFFF"
            />
          ) : (
            <Text style={styles.saveButtonText}>
              Save Changes
            </Text>
          )}
        </TouchableOpacity>

        <View
          style={styles.bottomSpacing}
        />
      </ScrollView>

      <BottomNavigation />
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
    paddingTop: 24,
    paddingBottom: 100,
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

  validationText: {
    fontSize: 12,
    color: '#EF4444',
    marginTop: 4,
  },

  saveButton: {
    height: 54,
    backgroundColor: '#1A237E',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
    shadowColor: '#1A237E',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },

  saveButtonDisabled: {
    opacity: 0.7,
  },

  saveButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    letterSpacing: 1,
  },

  bottomSpacing: {
    height: 20,
  },
});