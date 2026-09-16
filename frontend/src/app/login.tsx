import { View, Text, TextInput, TouchableOpacity, StyleSheet, StatusBar, ScrollView } from 'react-native';
import { useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/context/AuthContext';
import { ApiError, apiRequest } from '@/services/api';
import { showAlert } from '@/utils/showAlert';
import CenteredStatusModal from '../components/CenteredStatusModal';

export default function LoginScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    registered?: string | string[];
    email?: string | string[];
  }>();
  const registeredFlag = Array.isArray(params.registered)
    ? params.registered[0]
    : params.registered;
  const registeredEmailParam = Array.isArray(params.email)
    ? params.email[0]
    : params.email;

  const { login } = useAuth();
  const [email, setEmail] = useState(registeredEmailParam || '');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{
    email?: string;
    password?: string;
  }>({});
  const [showRegistered, setShowRegistered] = useState(registeredFlag === '1');
  const [showPendingModal, setShowPendingModal] = useState(false);
  const [verificationPendingEmail, setVerificationPendingEmail] = useState('');
  const [resending, setResending] = useState(false);
  const [resendNote, setResendNote] = useState('');

  const handleResendVerification = async (targetEmail: string) => {
    const normalized = targetEmail.trim().toLowerCase();
    if (!normalized || resending) {
      return;
    }

    setResending(true);
    setResendNote('');
    try {
      const data = await apiRequest<{ message?: string }>(
        '/api/auth/resend-verification',
        {
          method: 'POST',
          body: JSON.stringify({ email: normalized }),
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

  const handleLogin = async () => {
    setLoginError('');
    setResendNote('');
    const nextErrors: { email?: string; password?: string } = {};
    if (!email.trim()) {
      nextErrors.email = 'Required Email';
    }
    if (!password) {
      nextErrors.password = 'Required Password';
    }
    setFieldErrors(nextErrors);
    if (nextErrors.email || nextErrors.password) {
      return;
    }
    if (isSubmitting) {
      return;
    }
    setIsSubmitting(true);
    try {
      const loggedInUser = await login(email.trim().toLowerCase(), password);
      setPassword('');
      showAlert('Successfully logged in', undefined, () => {
        router.replace(
          loggedInUser.role === 'admin' ? '/admin' : '/home'
        );
      });
    } catch (error) {
      if (error instanceof ApiError && error.status === 0) {
        showAlert('Login Failed', error.message);
      } else if (
        error instanceof ApiError &&
        error.code === 'EMAIL_NOT_VERIFIED'
      ) {
        setVerificationPendingEmail(email.trim().toLowerCase());
        setShowPendingModal(true);
      } else if (error instanceof ApiError) {
        setLoginError(
          error.status === 403
            ? error.message || 'This account has been deactivated.'
            : 'Incorrect email or password.'
        );
      } else {
        showAlert('Login Failed', 'Unable to connect to server');
      }
    } finally {
      setIsSubmitting(false);
    }
  };
  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      {/* CONTENT */}
      <View style={styles.content}>
        {/* WELCOME BACK TITLE */}
        <Text style={styles.title}>Welcome Back!</Text>
        <Text style={styles.subtitle}>Login to your account</Text>
        {/* FORM */}
        <View style={styles.form}>
          {/* 1. Email */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your email"
              placeholderTextColor="#999"
              keyboardType="email-address"
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                setLoginError('');
                setFieldErrors((prev) => ({ ...prev, email: undefined }));
              }}
            />
            {fieldErrors.email ? (
              <Text style={styles.validationText}>{fieldErrors.email}</Text>
            ) : null}
          </View>
          {/* 2. Password */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Password</Text>
            <View style={styles.passwordInputWrapper}>
              <TextInput
                style={[styles.input, styles.passwordInput]}
                placeholder="Enter your password"
                placeholderTextColor="#999"
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={(text) => {
                  setPassword(text);
                  setLoginError('');
                  setFieldErrors((prev) => ({ ...prev, password: undefined }));
                }}
              />
              <TouchableOpacity
                style={styles.visibilityButton}
                onPress={() => setShowPassword((visible) => !visible)}
                accessibilityRole="button"
                accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
              >
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={22}
                  color="#666666"
                />
              </TouchableOpacity>
            </View>
            {fieldErrors.password ? (
              <Text style={styles.validationText}>{fieldErrors.password}</Text>
            ) : loginError ? (
              <Text style={styles.validationText}>{loginError}</Text>
            ) : null}
          </View>
          {/* FORGOT PASSWORD? */}
          <TouchableOpacity style={styles.forgotPasswordContainer}
           onPress={() => router.push('/forgot-password')} >
            <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
          </TouchableOpacity>
          {/* LOGIN BUTTON */}
          <TouchableOpacity
            style={[styles.loginButton, isSubmitting && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={isSubmitting}
          >
            <Text style={styles.loginButtonText}>
              {isSubmitting ? 'Logging in...' : 'Login'}
            </Text>
          </TouchableOpacity>
          {verificationPendingEmail ? (
            <View style={styles.resendWrap}>
              <TouchableOpacity
                style={styles.resendButton}
                onPress={() =>
                  void handleResendVerification(
                    email.trim().toLowerCase() || verificationPendingEmail
                  )
                }
                disabled={resending}
              >
                <Text style={styles.resendButtonText}>
                  {resending ? 'Sending...' : 'Resend Verification Email'}
                </Text>
              </TouchableOpacity>
              {resendNote ? (
                <Text style={styles.resendNoteText}>{resendNote}</Text>
              ) : null}
            </View>
          ) : null}
          {/* DON'T HAVE ACCOUNT? - REGISTER NOW */}
          <TouchableOpacity style={styles.registerContainer}
          onPress={() => router.push('/registration')} >
            <Text style={styles.registerText}>
              Don't have an account? <Text style={styles.registerTextBold}>Register Now</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </View>
      <CenteredStatusModal
        visible={showRegistered}
        variant="success"
        title="Registration Successful!"
        message={`A verification link has been sent to your registered email:\n\n${
          registeredEmailParam || email
        }\n\nPlease check your email and verify your account before logging in.`}
        buttonLabel="OK"
        onButtonPress={() => setShowRegistered(false)}
      />
      <CenteredStatusModal
        visible={showPendingModal}
        variant="info"
        title="Email Verification Pending"
        message="Please check your registered email and verify your account before logging in."
        buttonLabel="OK"
        onButtonPress={() => setShowPendingModal(false)}
      />
    </ScrollView>
  );
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  // CONTENT STYLES
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 30,
  },
  // TITLE STYLES
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#323a8f',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    marginBottom: 30,
  },
  // FORM STYLES
  form: {
    flex: 1,
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
  // FORGOT PASSWORD
  forgotPasswordContainer: {
    alignItems: 'flex-end',
    marginBottom: 20,
  },
  forgotPasswordText: {
    fontSize: 14,
    color: '#323a8f',
    fontWeight: '600',
  },
  // LOGIN BUTTON (Same as Registration)
  loginButton: {
    height: 54,
    backgroundColor: '#323a8f',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
    boxShadow: '0px 4px 8px rgba(26, 35, 126, 0.3)',
    elevation: 5,
  },
  loginButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  buttonDisabled: {
    opacity: 0.65,
  },
  resendWrap: {
    marginTop: 14,
    alignItems: 'center',
  },
  resendButton: {
    paddingVertical: 8,
    paddingHorizontal: 8,
  },
  resendButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#323a8f',
    textAlign: 'center',
  },
  resendNoteText: {
    marginTop: 6,
    fontSize: 13,
    color: '#323a8f',
    textAlign: 'center',
  },
  // REGISTER LINK - Don't have an account?
  registerContainer: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 10,
  },
  registerText: {
    fontSize: 16,
    color: '#000000',
    textAlign: 'center',
  },
  registerTextBold: {
    fontWeight: 'bold',
    color: '#323a8f',
  },
});