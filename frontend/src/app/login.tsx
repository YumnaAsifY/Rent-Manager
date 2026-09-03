import { View, Text, TextInput, TouchableOpacity, StyleSheet, StatusBar, Alert, ScrollView } from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/context/AuthContext';
import { ApiError } from '@/services/api';
export default function LoginScreen() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState('');
  const handleLogin = async () => {
    setLoginError('');
    if (!email.trim() || !password) {
      Alert.alert('Error', 'Please fill all fields');
      return;
    }
    if (isSubmitting) {
      return;
    }
    setIsSubmitting(true);
    try {
      await login(email.trim(), password);
      setPassword('');
      Alert.alert('Success', 'Login successful!');
      router.replace('/home');
    } catch (error) {
      if (error instanceof ApiError) {
        setLoginError('Incorrect email or password.');
      } else {
        Alert.alert('Login Failed', 'Unable to connect to server');
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
              }}
            />
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
            {loginError ? (
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
          {/* DON'T HAVE ACCOUNT? - REGISTER NOW */}
          <TouchableOpacity style={styles.registerContainer}
          onPress={() => router.push('/registration')} >
            <Text style={styles.registerText}>
              Don't have an account? <Text style={styles.registerTextBold}>Register Now</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </View>
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
    color: '#1a237e',
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
    color: '#1a237e',
    fontWeight: '600',
  },
  // LOGIN BUTTON (Same as Registration)
  loginButton: {
    height: 54,
    backgroundColor: '#1a237e',
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
    color: '#1a237e',
  },
});