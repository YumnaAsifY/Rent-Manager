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

import { PayoutMethod, useAuth } from '@/context/AuthContext';

const PAYOUT_OPTIONS: { key: PayoutMethod; label: string }[] = [
  { key: 'none', label: 'None' },
  { key: 'jazzcash', label: 'JazzCash' },
  { key: 'easypaisa', label: 'EasyPaisa' },
  { key: 'bank', label: 'Bank' },
];

export default function EditProfileScreen() {
  const router = useRouter();

  const {
    user,
    updateProfile,
  } = useAuth();

  const [name, setName] = useState(
    user?.name || ''
  );

  const [phone, setPhone] = useState(
    user?.phoneNumber || ''
  );

  const [payoutMethod, setPayoutMethod] = useState<PayoutMethod>(
    user?.payoutMethod || 'none'
  );
  const [payoutAccountName, setPayoutAccountName] = useState(
    user?.payoutAccountName || ''
  );
  const [payoutNumber, setPayoutNumber] = useState(user?.payoutNumber || '');
  const [payoutBankName, setPayoutBankName] = useState(
    user?.payoutBankName || ''
  );

  const [isSaving, setIsSaving] = useState(false);

  const validatePhoneNumber = (text: string) => {
    const numericText = text.replace(
      /[^0-9]/g,
      ''
    );

    if (numericText.length <= 11) {
      setPhone(numericText);
    }
  };

  const validateWalletNumber = (text: string) => {
    const numericText = text.replace(/[^0-9]/g, '');
    if (numericText.length <= 11) {
      setPayoutNumber(numericText);
    }
  };

  const handleSaveChanges = async () => {
    const trimmedName = name.trim();
    const trimmedPhone = phone.trim();

    if (!trimmedName) {
      Alert.alert(
        'Error',
        'Please enter your full name.'
      );
      return;
    }

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

    if (payoutMethod !== 'none') {
      if (!payoutAccountName.trim()) {
        Alert.alert('Error', 'Please enter the account holder name.');
        return;
      }

      if (payoutMethod === 'bank') {
        if (!payoutBankName.trim()) {
          Alert.alert('Error', 'Please enter the bank name.');
          return;
        }

        if (payoutNumber.replace(/\s+/g, '').length < 8) {
          Alert.alert('Error', 'Enter a valid bank account number or IBAN.');
          return;
        }
      } else if (payoutNumber.length !== 11) {
        Alert.alert('Error', 'Wallet number must be exactly 11 digits.');
        return;
      }
    }

    try {
      setIsSaving(true);

      await updateProfile(
        trimmedName,
        trimmedPhone,
        {
          payoutMethod,
          payoutAccountName: payoutAccountName.trim(),
          payoutNumber: payoutNumber.replace(/\s+/g, ''),
          payoutBankName: payoutBankName.trim(),
        }
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

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Owner payout method</Text>
          <Text style={styles.hintText}>
            Admin uses this to send your rent share (JazzCash, EasyPaisa, or bank).
          </Text>
          <View style={styles.methodRow}>
            {PAYOUT_OPTIONS.map((option) => {
              const active = payoutMethod === option.key;
              return (
                <TouchableOpacity
                  key={option.key}
                  style={[styles.methodChip, active && styles.methodChipActive]}
                  onPress={() => setPayoutMethod(option.key)}
                  disabled={isSaving}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.methodChipText,
                      active && styles.methodChipTextActive,
                    ]}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {payoutMethod !== 'none' ? (
          <>
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Account holder name</Text>
              <TextInput
                style={styles.input}
                placeholder="Name on JazzCash / bank account"
                placeholderTextColor="#94A3B8"
                value={payoutAccountName}
                onChangeText={setPayoutAccountName}
                editable={!isSaving}
                autoCapitalize="words"
              />
            </View>

            {payoutMethod === 'bank' ? (
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Bank name</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. HBL, Meezan"
                  placeholderTextColor="#94A3B8"
                  value={payoutBankName}
                  onChangeText={setPayoutBankName}
                  editable={!isSaving}
                  autoCapitalize="words"
                />
              </View>
            ) : null}

            <View style={styles.inputContainer}>
              <Text style={styles.label}>
                {payoutMethod === 'bank'
                  ? 'Account number / IBAN'
                  : 'Wallet number'}
              </Text>
              <TextInput
                style={styles.input}
                placeholder={
                  payoutMethod === 'bank'
                    ? 'Account number or IBAN'
                    : '11-digit wallet number'
                }
                placeholderTextColor="#94A3B8"
                keyboardType={payoutMethod === 'bank' ? 'default' : 'phone-pad'}
                value={payoutNumber}
                onChangeText={
                  payoutMethod === 'bank' ? setPayoutNumber : validateWalletNumber
                }
                maxLength={payoutMethod === 'bank' ? 34 : 11}
                editable={!isSaving}
                autoCapitalize="characters"
              />
            </View>
          </>
        ) : null}

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

  hintText: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 10,
    lineHeight: 18,
  },

  methodRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },

  methodChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#EEF2FF',
    borderWidth: 1,
    borderColor: '#C5CAE9',
  },

  methodChipActive: {
    backgroundColor: '#1A237E',
    borderColor: '#1A237E',
  },

  methodChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#3949AB',
  },

  methodChipTextActive: {
    color: '#FFFFFF',
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