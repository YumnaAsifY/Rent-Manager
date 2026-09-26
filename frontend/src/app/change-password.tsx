import { View, Text, TextInput, TouchableOpacity, StyleSheet, StatusBar, ScrollView, Image } from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { useAuth } from '@/context/AuthContext';
import { ApiError } from '@/services/api';
import { showAlert } from '@/utils/showAlert';
import LiftPressable from '../components/LiftPressable';

export default function ChangePasswordScreen() {
  const router = useRouter();
  const { changePassword } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentPasswordError, setCurrentPasswordError] = useState('');
  const [newPasswordError, setNewPasswordError] = useState('');

  // ============================================
  // 🔽 VALIDATION FUNCTIONS
  // ============================================

  // New password validation
  const isPasswordValid = (pwd: string) => {
    const hasUpperCase = /[A-Z]/.test(pwd);
    const hasLowerCase = /[a-z]/.test(pwd);
    const hasNumber = /[0-9]/.test(pwd);
    const hasMinLength = pwd.length >= 8;
    return hasUpperCase && hasLowerCase && hasNumber && hasMinLength;
  };

  const goToProfile = () => {
    router.replace('/profile');
  };

  // ============================================
  // 🔽 HANDLE CHANGE PASSWORD
  // ============================================

  const handleChangePassword = async () => {
    setCurrentPasswordError('');
    setNewPasswordError('');

    // 1. Sab fields fill hain?
    if (!currentPassword || !newPassword || !confirmPassword) {
      showAlert('Error', 'Please fill all fields');
      return;
    }

    // 2. New password valid?
    if (!isPasswordValid(newPassword)) {
      showAlert(
        'Error',
        'New password must be at least 8 characters with uppercase, lowercase, and number'
      );
      return;
    }

    // 3. New password and confirm password match?
    if (newPassword !== confirmPassword) {
      showAlert('Error', 'Passwords do not match');
      return;
    }

    // 4. Current password and new password same nahi hona chahiye
    if (currentPassword === newPassword) {
      setNewPasswordError(
        'New password must be different from your current password.'
      );
      return;
    }

    if (isSubmitting) {
      return;
    }

    setIsSubmitting(true);

    try {
      await changePassword(currentPassword, newPassword);

      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');

      showAlert('Password changed', undefined, goToProfile);
    } catch (error) {
      const message =
        error instanceof ApiError
          ? error.message
          : 'Password could not be changed. Please try again.';

      if (message.toLowerCase().includes('current password is incorrect')) {
        setCurrentPasswordError('Current password is incorrect.');
      } else if (
        message.toLowerCase().includes('must be different from current password')
      ) {
        setNewPasswordError(
          'New password must be different from your current password.'
        );
      } else {
        showAlert('Error', 'Password could not be changed. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // ============================================
  // 🔽 UI
  // ============================================

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      <View style={styles.content}>
        {/* 🖼️ IMAGE - Top Center (Same position as lock icon) */}
        <View style={styles.imageContainer}>
          <Image
            source={require('@/assets/images/shield-lock-outline.svg')}  // ← APNI IMAGE KA NAME
            style={styles.image}
            resizeMode="contain"
          />
        </View>

        <Text style={styles.title}>Change Password</Text>

        <Text style={styles.subtitle}>
          Enter your current password and set a new password.
        </Text>

        {/* Current Password */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Current Password</Text>
          <View style={styles.passwordInputWrapper}>
            <TextInput
              style={[styles.input, styles.passwordInput]}
              placeholder="Enter current password"
              placeholderTextColor="#999"
              secureTextEntry={!showCurrentPassword}
              value={currentPassword}
              onChangeText={(text) => {
                setCurrentPassword(text);
                setCurrentPasswordError('');
              }}
              editable={!isSubmitting}
            />
            <TouchableOpacity
              style={styles.visibilityButton}
              onPress={() => setShowCurrentPassword((visible) => !visible)}
              accessibilityRole="button"
              accessibilityLabel={
                showCurrentPassword ? 'Hide current password' : 'Show current password'
              }
            >
              <Ionicons
                name={showCurrentPassword ? 'eye-outline' : 'eye-off-outline'}
                size={22}
                color="#666666"
              />
            </TouchableOpacity>
          </View>
          {currentPasswordError ? (
            <Text style={styles.validationText}>{currentPasswordError}</Text>
          ) : null}
        </View>

        {/* New Password */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>New Password</Text>
          <View style={styles.passwordInputWrapper}>
            <TextInput
              style={[styles.input, styles.passwordInput]}
              placeholder="Min 8 chars (Uppercase, Lowercase, Number)"
              placeholderTextColor="#999"
              secureTextEntry={!showNewPassword}
              value={newPassword}
              onChangeText={(text) => {
                setNewPassword(text);
                setNewPasswordError('');
              }}
              editable={!isSubmitting}
            />
            <TouchableOpacity
              style={styles.visibilityButton}
              onPress={() => setShowNewPassword((visible) => !visible)}
              accessibilityRole="button"
              accessibilityLabel={showNewPassword ? 'Hide new password' : 'Show new password'}
            >
              <Ionicons
                name={showNewPassword ? 'eye-outline' : 'eye-off-outline'}
                size={22}
                color="#666666"
              />
            </TouchableOpacity>
          </View>
          {newPasswordError ? (
            <Text style={styles.validationText}>{newPasswordError}</Text>
          ) : newPassword.length > 0 && !isPasswordValid(newPassword) ? (
            <Text style={styles.validationText}>
              Password must have uppercase, lowercase, and number
            </Text>
          ) : null}
        </View>

        {/* Confirm Password */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Confirm Password</Text>
          <View style={styles.passwordInputWrapper}>
            <TextInput
              style={[styles.input, styles.passwordInput]}
              placeholder="Confirm new password"
              placeholderTextColor="#999"
              secureTextEntry={!showConfirmPassword}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              editable={!isSubmitting}
            />
            <TouchableOpacity
              style={styles.visibilityButton}
              onPress={() => setShowConfirmPassword((visible) => !visible)}
              accessibilityRole="button"
              accessibilityLabel={
                showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'
              }
            >
              <Ionicons
                name={showConfirmPassword ? 'eye-outline' : 'eye-off-outline'}
                size={22}
                color="#666666"
              />
            </TouchableOpacity>
          </View>
          {confirmPassword.length > 0 && newPassword !== confirmPassword && (
            <Text style={styles.validationText}>Passwords do not match</Text>
          )}
        </View>

        {/* Change Password Button */}
        <LiftPressable
          style={[styles.changeButton, isSubmitting && styles.buttonDisabled]}
          onPress={() => void handleChangePassword()}
          disabled={isSubmitting}
        >
          <Text style={styles.changeButtonText}>Change Password</Text>
        </LiftPressable>
      </View>
    </ScrollView>
  );
}

// ============================================
// 🔽 STYLES
// ============================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 30,
  },
  // Image Container - Same as lock icon position
  imageContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  image: {
    width: 100,
    height: 100,
    resizeMode: 'contain',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#323a8f',
    textAlign: 'center',
    marginBottom: 12,
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 24,
  },
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 4,
  },
  input: {
    height: 52,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#000',
    backgroundColor: '#f5f5f5',
    width: '100%',
  },
  passwordInputWrapper: {
    position: 'relative',
    justifyContent: 'center',
  },
  passwordInput: {
    paddingRight: 52,
  },
  visibilityButton: {
    position: 'absolute',
    right: 4,
    width: 48,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
  },
  validationText: {
    fontSize: 12,
    color: '#FF5722',
    marginTop: 4,
  },
  changeButton: {
    height: 54,
    backgroundColor: '#323a8f',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
    boxShadow: '0px 4px 8px rgba(26, 35, 126, 0.3)',
    elevation: 5,
  },
  buttonDisabled: {
    opacity: 0.65,
  },
  changeButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
});