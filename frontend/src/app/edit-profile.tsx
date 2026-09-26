import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  StatusBar,
  TextInput,
  ActivityIndicator,
} from 'react-native';

import { useRouter } from 'expo-router';
import { useState } from 'react';

import BottomNavigation from '../components/BottomNavigation';
import ScreenHeader from '../components/ScreenHeader';
import LiftPressable from '../components/LiftPressable';

import { useAuth } from '@/context/AuthContext';
import { apiRequest } from '@/services/api';
import { showAlert } from '@/utils/showAlert';

export default function EditProfileScreen() {
  const router = useRouter();

  const { user, token, updateProfile } = useAuth();

  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phoneNumber || '');
  const [email, setEmail] = useState(user?.email || '');
  const [emailError, setEmailError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isResending, setIsResending] = useState(false);

  const pendingEmail = user?.pendingEmail || '';

  const isGmailAddress = (value: string) => {
    const trimmedEmail = value.trim();
    return (
      trimmedEmail === trimmedEmail.toLowerCase() &&
      /^[^\s@]+@gmail\.com$/.test(trimmedEmail)
    );
  };

  const validatePhoneNumber = (text: string) => {
    const numericText = text.replace(/[^0-9]/g, '');
    if (numericText.length <= 11) {
      setPhone(numericText);
    }
  };

  const handleSaveChanges = async () => {
    const trimmedName = name.trim() || user?.name?.trim() || '';
    const trimmedPhone = phone.trim() || user?.phoneNumber?.trim() || '';
    const trimmedEmail = (
      email.trim() ||
      user?.email ||
      ''
    ).toLowerCase();
    setEmailError('');

    if (phone.trim() && phone.trim().length !== 11) {
      showAlert('Error', 'Phone number must be exactly 11 digits.');
      return;
    }

    if (email.trim() && !isGmailAddress(email.trim().toLowerCase())) {
      setEmailError('Please enter a valid lowercase Gmail address');
      return;
    }

    try {
      setIsSaving(true);
      await updateProfile(trimmedName, trimmedPhone, undefined, trimmedEmail);
      const waitingVerify = trimmedEmail !== (user?.email || '').toLowerCase();
      showAlert(
        waitingVerify ? 'Verify your new email' : 'Successfully changed',
        waitingVerify
          ? 'Pending: please verify the new Gmail. A link was sent there. Your current email stays until you verify.'
          : undefined,
        () => {
          router.back();
        }
      );
    } catch (error: any) {
      console.error('Update profile error:', error);
      showAlert(
        'Error',
        error?.message || 'Unable to update profile. Please try again.'
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleResendPending = async () => {
    if (!token || !pendingEmail || isResending) {
      return;
    }

    try {
      setIsResending(true);
      const data = await apiRequest<{ message?: string }>(
        '/api/auth/resend-verification',
        {
          method: 'POST',
          body: JSON.stringify({ email: user?.email || pendingEmail }),
        },
        token
      );
      showAlert(
        'Verification sent',
        data.message || 'A verification link has been sent to your new email.'
      );
    } catch (error: any) {
      showAlert(
        'Error',
        error?.message || 'Unable to send verification email.'
      );
    } finally {
      setIsResending(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#323a8f" />

      <ScreenHeader title="Edit Profile" variant="dark" />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Full Name</Text>
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

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Phone Number</Text>
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
          {phone.length > 0 && phone.length !== 11 ? (
            <Text style={styles.validationText}>
              Phone number must be 11 digits
            </Text>
          ) : null}
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter your Gmail"
            placeholderTextColor="#94A3B8"
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={(text) => {
              setEmail(text);
              setEmailError('');
            }}
            editable={!isSaving}
          />
          {emailError ? (
            <Text style={styles.validationText}>{emailError}</Text>
          ) : null}
          {pendingEmail ? (
            <Text style={styles.pendingText}>
              Pending: {pendingEmail}. Verify this Gmail first. Your current
              email stays until then.
            </Text>
          ) : null}
        </View>

        <LiftPressable
          style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
          onPress={() => void handleSaveChanges()}
          disabled={isSaving}
        >
          {isSaving ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.saveButtonText}>Save Changes</Text>
          )}
        </LiftPressable>

        {pendingEmail ? (
          <LiftPressable
            style={[styles.resendButton, isResending && styles.saveButtonDisabled]}
            onPress={() => void handleResendPending()}
            disabled={isResending || isSaving}
          >
            {isResending ? (
              <ActivityIndicator color="#323a8f" />
            ) : (
              <Text style={styles.resendButtonText}>Resend verification</Text>
            )}
          </LiftPressable>
        ) : null}

        <View style={styles.bottomSpacing} />
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
  pendingText: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 6,
    lineHeight: 18,
  },
  saveButton: {
    height: 54,
    backgroundColor: '#323a8f',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
    shadowColor: '#323a8f',
    shadowOffset: { width: 0, height: 4 },
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
  resendButton: {
    height: 48,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#323a8f',
  },
  resendButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#323a8f',
  },
  bottomSpacing: {
    height: 20,
  },
});
