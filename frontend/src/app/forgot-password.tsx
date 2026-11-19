import { View, Text, TextInput, TouchableOpacity, StyleSheet, StatusBar, ScrollView } from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import EvilIcons from '@expo/vector-icons/EvilIcons';

import { ApiError, apiRequest } from '@/services/api';
import { showAlert } from '@/utils/showAlert';
import LiftPressable from '../components/LiftPressable';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [linkSent, setLinkSent] = useState(false);

  const isGmailAddress = (value: string) => {
    const trimmedEmail = value.trim();

    return (
      trimmedEmail === trimmedEmail.toLowerCase() &&
      /^[^\s@]+@gmail\.com$/.test(trimmedEmail)
    );
  };

  const handleSendResetLink = async () => {
    setEmailError('');

    if (!email) {
      showAlert('Error', 'Please enter your email');
      return;
    }

    if (!isGmailAddress(email)) {
      setEmailError('Please enter a valid lowercase Gmail address');
      return;
    }

    if (isSubmitting) {
      return;
    }

    setIsSubmitting(true);

    try {
      await apiRequest<{ message: string }>('/api/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({
          email: email.trim(),
        }),
      });

      const sentTo = email.trim();
      setLinkSent(true);
      showAlert(
        'Reset link sent',
        `We sent a password reset link to ${sentTo}.`
      );
    } catch (error) {
      showAlert(
        'Error',
        error instanceof ApiError
          ? error.message
          : 'Unable to send reset link. Please try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <EvilIcons name="lock" size={80} color="#5B4DFF" />  
        </View>

        <Text style={styles.title}>Forgot Password</Text>
        
        <Text style={styles.subtitle}>
          Enter your registered email address and we'll send you a link to reset your password.
        </Text>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter your email"
            placeholderTextColor="#999"
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={(text) => {
              setEmail(text);
              setEmailError('');
              setLinkSent(false);
            }}
            editable={!isSubmitting}
          />
          {emailError ? (
            <Text style={styles.validationText}>{emailError}</Text>
          ) : null}
        </View>

        <LiftPressable
          style={[styles.sendButton, isSubmitting && styles.buttonDisabled]}
          onPress={() => void handleSendResetLink()}
          disabled={isSubmitting}
        >
          <Text style={styles.sendButtonText}>
            {isSubmitting
              ? 'Sending...'
              : linkSent
                ? 'Resend link'
                : 'Send reset link'}
          </Text>
        </LiftPressable>

        <TouchableOpacity 
          style={styles.backToLoginContainer}
          onPress={() => router.push('/login')}
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
  iconContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#5B4DFF',
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
    marginBottom: 20,
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
  validationText: {
    fontSize: 12,
    color: '#FF5722',
    marginTop: 4,
  },
  sendButton: {
    height: 54,
    backgroundColor: '#5B4DFF',
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
  sendButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
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
    color: '#5B4DFF',
  },
});