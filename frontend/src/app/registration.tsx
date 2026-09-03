
import { View, Text, TextInput, TouchableOpacity, StyleSheet, StatusBar, Alert, ScrollView } from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { useAuth } from '@/context/AuthContext';
import { ApiError, apiRequest } from '@/services/api';

export default function RegistrationScreen() {
  const router = useRouter();
  const { login } = useAuth();
  const [name, setName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [emailValidationMessage, setEmailValidationMessage] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // ============================================
  // 🔽 VALIDATION FUNCTIONS
  // ============================================

  // Sirf numbers allow karo, max 11 digits
  const validatePhoneNumber = (text: string) => {
    const numericText = text.replace(/[^0-9]/g, '');
    if (numericText.length <= 11) {
      setPhoneNumber(numericText);
    }
  };

  // Password validation check
  const isPasswordValid = (pwd: string) => {
    const hasUpperCase = /[A-Z]/.test(pwd);
    const hasLowerCase = /[a-z]/.test(pwd);
    const hasNumber = /[0-9]/.test(pwd);
    const hasMinLength = pwd.length >= 8;
    return hasUpperCase && hasLowerCase && hasNumber && hasMinLength;
  };

  const isGmailAddress = (value: string) => {
    const trimmedEmail = value.trim();

    return (
      trimmedEmail === trimmedEmail.toLowerCase() &&
      /^[^\s@]+@gmail\.com$/.test(trimmedEmail)
    );
  };

  const handleEmailChange = (text: string) => {
    if (/[A-Z]/.test(text)) {
      setEmailValidationMessage('Email must contain lowercase letters only');
      return;
    }

    setEmail(text);
    setEmailValidationMessage(
      text.length > 0 && !isGmailAddress(text)
        ? 'Please enter a valid Gmail address'
        : ''
    );
  };

  // ============================================
  // 🔽 HANDLE REGISTER
  // ============================================

  const handleRegister = async() => {
    // 1. Sab fields fill hain?
    if (!name || !phoneNumber || !email || !password || !confirmPassword) {
      Alert.alert('Error', 'Please fill all fields');
      return;
    }

    if (!isGmailAddress(email)) {
      setEmailValidationMessage('Please enter a valid lowercase Gmail address');
      Alert.alert(
        'Invalid Email',
        'Please enter a valid lowercase Gmail address ending with @gmail.com'
      );
      return;
    }

    // 2. Phone number exactly 11 digits?
    if (phoneNumber.length !== 11) {
      Alert.alert('Error', 'Phone number must be exactly 11 digits');
      return;
    }

    // 3. Password valid?
    if (!isPasswordValid(password)) {
      Alert.alert(
        'Error',
        'Password must be at least 8 characters with uppercase, lowercase, and number'
      );
      return;
    }

    // 4. Password match?
    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }
try {
  await apiRequest('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      name,
      phoneNumber,
      email: email.trim(),
      password,
    }),
  });

  await login(email.trim(), password);
  setPassword('');
  setConfirmPassword('');
  Alert.alert('Success', 'Registration successful!');
  router.replace('/home');
} catch (error) {
  Alert.alert(
    'Error',
    error instanceof ApiError ? error.message : 'Could not connect to server'
  );
}
  }

  // ============================================
  // 🔽 UI
  // ============================================

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      <View style={styles.content}>
        <Text style={styles.title}>Register Now</Text>

        <View style={styles.form}>
          {/* Full Name */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Full Name</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your name"
              placeholderTextColor="#999"
              value={name}
              onChangeText={setName}
            />
          </View>

          {/* Phone Number - Only Numbers, Max 11 digits */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Phone Number</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter 11-digit phone number"
              placeholderTextColor="#999"
              keyboardType="phone-pad"
              value={phoneNumber}
              onChangeText={validatePhoneNumber}  // ← VALIDATION
              maxLength={11}
            />
          </View>

          {/* Email */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your email"
              placeholderTextColor="#999"
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={handleEmailChange}
            />
            {emailValidationMessage ? (
              <Text style={styles.validationText}>
                {emailValidationMessage}
              </Text>
            ) : null}
          </View>

          {/* Password - with validation */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Password</Text>
            <View style={styles.passwordInputWrapper}>
              <TextInput
                style={[styles.input, styles.passwordInput]}
                placeholder="Min 8 chars (Uppercase, Lowercase, Number)"
                placeholderTextColor="#999"
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={setPassword}  // ← VALIDATION
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
            {password.length > 0 && !isPasswordValid(password) && (
              <Text style={styles.validationText}>
                Password must have uppercase, lowercase, and number
              </Text>
            )}
          </View>

          {/* Confirm Password */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Confirm Password</Text>
            <View style={styles.passwordInputWrapper}>
              <TextInput
                style={[styles.input, styles.passwordInput]}
                placeholder="Confirm password"
                placeholderTextColor="#999"
                secureTextEntry={!showConfirmPassword}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
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
                  name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={22}
                  color="#666666"
                />
              </TouchableOpacity>
            </View>
            {/* 👇 YEH ADD KARO - Conditional Error Message */}
  {confirmPassword.length > 0 && password !== confirmPassword && (
    <Text style={styles.validationText}>Password does not match</Text>
  )}

            
          </View>

          {/* Register Button */}
          <TouchableOpacity style={styles.registerButton} onPress={handleRegister}>
            <Text style={styles.registerButtonText}>Register</Text>
          </TouchableOpacity>

          {/* Already registered? */}
          <TouchableOpacity
            style={styles.loginContainer}
            onPress={() => router.push('/login')}
          >
            <Text style={styles.loginText}>
              Already registered? <Text style={styles.loginTextBold}>Login</Text>
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
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1a237e',
    textAlign: 'center',
    marginBottom: 30,
    letterSpacing: 1,
  },
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
  registerButton: {
    height: 54,
    backgroundColor: '#1a237e',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
    shadowColor: '#1a237e',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  registerButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  loginContainer: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 10,
  },
  loginText: {
    fontSize: 16,
    color: '#000000',
    textAlign: 'center',
  },
  loginTextBold: {
    fontWeight: 'bold',
    color: '#1a237e',
  },
  
});