import { View, Text, TextInput, TouchableOpacity, StyleSheet, StatusBar, ScrollView } from 'react-native';
import { useEffect, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { ApiError, apiRequest } from '@/services/api';

export default function ResetPasswordScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ token?: string | string[] }>();
  const rawToken = Array.isArray(params.token) ? params.token[0] : params.token;

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const isPasswordValid = (pwd: string) => {
    const hasUpperCase = /[A-Z]/.test(pwd);
    const hasLowerCase = /[a-z]/.test(pwd);
    const hasNumber = /[0-9]/.test(pwd);
    const hasMinLength = pwd.length >= 8;
    return hasUpperCase && hasLowerCase && hasNumber && hasMinLength;
  };

  useEffect(() => {
    if (!successMessage) {
      return;
    }

    const timer = setTimeout(() => {
      router.replace('/login');
    }, 1800);

    return () => clearTimeout(timer);
  }, [router, successMessage]);

  const handleResetPassword = async () => {
    setFormError('');

    if (!rawToken) {
      setFormError('This reset link is invalid or has expired');
      return;
    }

    if (!newPassword || !confirmPassword) {
      setFormError('Please fill all fields');
      return;
    }

    if (!isPasswordValid(newPassword)) {
      setFormError(
        'New password must be at least 8 characters with uppercase, lowercase, and number'
      );
      return;
    }

    if (newPassword !== confirmPassword) {
      setFormError('Passwords do not match');
      return;
    }

    if (isSubmitting) {
      return;
    }

    setIsSubmitting(true);

    try {
      await apiRequest('/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({
          token: rawToken,
          newPassword,
        }),
      });

      setNewPassword('');
      setConfirmPassword('');
      setSuccessMessage('Password reset successfully!');
    } catch (error) {
      setFormError(
        error instanceof ApiError
          ? error.message
          : 'Unable to reset password. Please try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      <View style={styles.content}>
        <Text style={styles.title}>Reset Password</Text>
        <Text style={styles.subtitle}>
          Enter a new password for your Rent Manager account.
        </Text>

        {successMessage ? (
          <Text style={styles.successText}>{successMessage}</Text>
        ) : (
          <>
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
                    setFormError('');
                  }}
                  editable={!isSubmitting}
                />
                <TouchableOpacity
                  style={styles.visibilityButton}
                  onPress={() => setShowNewPassword((visible) => !visible)}
                  accessibilityRole="button"
                  accessibilityLabel={
                    showNewPassword ? 'Hide new password' : 'Show new password'
                  }
                >
                  <Ionicons
                    name={showNewPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={22}
                    color="#666666"
                  />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Confirm Password</Text>
              <View style={styles.passwordInputWrapper}>
                <TextInput
                  style={[styles.input, styles.passwordInput]}
                  placeholder="Confirm new password"
                  placeholderTextColor="#999"
                  secureTextEntry={!showConfirmPassword}
                  value={confirmPassword}
                  onChangeText={(text) => {
                    setConfirmPassword(text);
                    setFormError('');
                  }}
                  editable={!isSubmitting}
                />
                <TouchableOpacity
                  style={styles.visibilityButton}
                  onPress={() => setShowConfirmPassword((visible) => !visible)}
                  accessibilityRole="button"
                  accessibilityLabel={
                    showConfirmPassword
                      ? 'Hide confirm password'
                      : 'Show confirm password'
                  }
                >
                  <Ionicons
                    name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={22}
                    color="#666666"
                  />
                </TouchableOpacity>
              </View>
            </View>

            {formError ? (
              <Text style={styles.validationText}>{formError}</Text>
            ) : null}

            <TouchableOpacity
              style={[styles.resetButton, isSubmitting && styles.buttonDisabled]}
              onPress={() => void handleResetPassword()}
              disabled={isSubmitting}
            >
              <Text style={styles.resetButtonText}>Reset Password</Text>
            </TouchableOpacity>
          </>
        )}

        <TouchableOpacity
          style={styles.backToLoginContainer}
          onPress={() => router.replace('/login')}
        >
          <Text style={styles.backToLoginText}>
            Back to <Text style={styles.backToLoginBold}>Login</Text>
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

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
    marginBottom: 8,
  },
  successText: {
    fontSize: 16,
    color: '#2EAD6E',
    textAlign: 'center',
    fontWeight: '600',
    marginBottom: 20,
  },
  resetButton: {
    height: 54,
    backgroundColor: '#323a8f',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  buttonDisabled: {
    opacity: 0.65,
  },
  resetButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  backToLoginContainer: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 10,
  },
  backToLoginText: {
    fontSize: 16,
    color: '#000000',
    textAlign: 'center',
  },
  backToLoginBold: {
    fontWeight: 'bold',
    color: '#323a8f',
  },
});