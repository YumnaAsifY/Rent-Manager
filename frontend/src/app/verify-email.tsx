import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import CenteredStatusModal from '../components/CenteredStatusModal';
import { ApiError, apiRequest } from '@/services/api';

type VerifyStatus =
  | 'loading'
  | 'verified'
  | 'email_updated'
  | 'already_verified'
  | 'expired'
  | 'email_change_expired'
  | 'invalid';

export default function VerifyEmailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ token?: string | string[] }>();
  const rawToken = Array.isArray(params.token) ? params.token[0] : params.token;
  const [status, setStatus] = useState<VerifyStatus>('loading');
  const [resendEmail, setResendEmail] = useState('');
  const [resending, setResending] = useState(false);
  const [resendNote, setResendNote] = useState('');

  useEffect(() => {
    const verify = async () => {
      if (!rawToken) {
        setStatus('invalid');
        return;
      }

      try {
        const data = await apiRequest<{ status?: string; message?: string }>(
          `/api/auth/verify-email?token=${encodeURIComponent(rawToken)}`,
          { method: 'GET' }
        );

        if (data.status === 'already_verified') {
          setStatus('already_verified');
          return;
        }

        if (data.status === 'email_updated') {
          setStatus('email_updated');
          return;
        }

        setStatus('verified');
      } catch (error) {
        if (
          error instanceof ApiError &&
          (error.code === 'VERIFICATION_EXPIRED' ||
            error.code === 'EMAIL_CHANGE_EXPIRED')
        ) {
          setStatus(
            error.code === 'EMAIL_CHANGE_EXPIRED'
              ? 'email_change_expired'
              : 'expired'
          );
          return;
        }
        setStatus('invalid');
      }
    };

    void verify();
  }, [rawToken]);

  const goToLogin = () => {
    router.replace('/login' as any);
  };

  const handleResend = async () => {
    const email = resendEmail.trim().toLowerCase();
    if (!email || resending) {
      return;
    }

    setResending(true);
    setResendNote('');
    try {
      const data = await apiRequest<{ message?: string }>(
        '/api/auth/resend-verification',
        {
          method: 'POST',
          body: JSON.stringify({ email }),
        }
      );
      setResendNote(
        data.message ||
          'A verification link has been sent to your registered email.'
      );
    } catch (error) {
      setResendNote(
        error instanceof ApiError
          ? error.message
          : 'Unable to send verification email.'
      );
    } finally {
      setResending(false);
    }
  };

  if (status === 'loading') {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#323a8f" />
        <Text style={styles.loadingText}>Verifying your email...</Text>
      </View>
    );
  }

  if (status === 'verified') {
    return (
      <View style={styles.page}>
        <CenteredStatusModal
          visible
          variant="success"
          title="Email Verified Successfully!"
          message="Your email has been verified successfully. You can now log in to Rent Manager."
          buttonLabel="Go to Login"
          onButtonPress={goToLogin}
        />
      </View>
    );
  }

  if (status === 'email_updated') {
    return (
      <View style={styles.page}>
        <CenteredStatusModal
          visible
          variant="success"
          title="New Email Verified"
          message="Your new email has been verified. You can now log in with this email."
          buttonLabel="Go to Login"
          onButtonPress={goToLogin}
        />
      </View>
    );
  }

  if (status === 'already_verified') {
    return (
      <View style={styles.page}>
        <CenteredStatusModal
          visible
          variant="info"
          title="Email Already Verified"
          message="Your email has already been verified. You can now log in."
          buttonLabel="Go to Login"
          onButtonPress={goToLogin}
        />
      </View>
    );
  }

  if (status === 'expired') {
    return (
      <View style={styles.page}>
        <CenteredStatusModal
          visible
          variant="error"
          title="Verification Link Expired"
          message="This verification link has expired. Please register again with this email."
          buttonLabel="Go to Register"
          onButtonPress={() => router.replace('/registration' as any)}
        />
      </View>
    );
  }

  if (status === 'email_change_expired') {
    return (
      <View style={styles.page}>
        <CenteredStatusModal
          visible
          variant="error"
          title="Verification Link Expired"
          message="This verification link has expired. Please update your email again from Edit Profile."
          buttonLabel="Go to Login"
          onButtonPress={goToLogin}
        />
      </View>
    );
  }

  return (
    <View style={styles.page}>
      <CenteredStatusModal
        visible
        variant="error"
        title="Invalid Verification Link"
        message="This verification link is invalid. Please request a new verification email."
        buttonLabel="Go to Login"
        onButtonPress={goToLogin}
        extra={
          <View style={styles.resendBox}>
            <TextInput
              style={styles.input}
              placeholder="Registered Gmail"
              placeholderTextColor="#94A3B8"
              autoCapitalize="none"
              keyboardType="email-address"
              value={resendEmail}
              onChangeText={setResendEmail}
            />
            {resendNote ? (
              <Text style={styles.note}>{resendNote}</Text>
            ) : null}
          </View>
        }
        secondaryLabel={
          resending ? 'Sending...' : 'Resend Verification Email'
        }
        onSecondaryPress={() => void handleResend()}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  loading: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 15,
    color: '#64748B',
  },
  resendBox: {
    width: '100%',
    marginBottom: 12,
  },
  input: {
    height: 44,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 15,
    color: '#1A1A1A',
    backgroundColor: '#FFFFFF',
  },
  note: {
    marginTop: 8,
    fontSize: 13,
    color: '#323a8f',
    textAlign: 'center',
  },
});
