import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import BottomNavigation from '../components/BottomNavigation';
import CenteredStatusModal from '../components/CenteredStatusModal';
import ScreenHeader from '../components/ScreenHeader';
import LiftPressable from '../components/LiftPressable';
import { PayoutMethod, useAuth } from '@/context/AuthContext';
import { showAlert } from '@/utils/showAlert';

const METHOD_OPTIONS: {
  key: PayoutMethod;
  label: string;
  hint: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  bg: string;
}[] = [
  {
    key: 'jazzcash',
    label: 'JazzCash',
    hint: '11-digit wallet',
    icon: 'phone-portrait-outline',
    color: '#DC2626',
    bg: '#FEE2E2',
  },
  {
    key: 'easypaisa',
    label: 'EasyPaisa',
    hint: '11-digit wallet',
    icon: 'wallet-outline',
    color: '#16A34A',
    bg: '#DCFCE7',
  },
  {
    key: 'bank',
    label: 'Bank',
    hint: 'Account or IBAN',
    icon: 'card-outline',
    color: '#323a8f',
    bg: '#EEF2FF',
  },
  {
    key: 'none',
    label: 'None',
    hint: 'Remove method',
    icon: 'close-circle-outline',
    color: '#64748B',
    bg: '#F1F5F9',
  },
];

const isValidAccountHolderName = (value: string) =>
  /^[A-Za-z][A-Za-z '\u2019-]*$/.test(value.trim());

export default function AddPaymentMethodScreen() {
  const { width } = useWindowDimensions();
  const isWide = width > 768;
  const { user, updateProfile } = useAuth();

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
  const [payoutAccountNameError, setPayoutAccountNameError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  useFocusEffect(
    useCallback(() => {
      setPayoutMethod(user?.payoutMethod || 'none');
      setPayoutAccountName(user?.payoutAccountName || '');
      setPayoutNumber(user?.payoutNumber || '');
      setPayoutBankName(user?.payoutBankName || '');
      setPayoutAccountNameError('');
    }, [
      user?.payoutMethod,
      user?.payoutAccountName,
      user?.payoutNumber,
      user?.payoutBankName,
    ])
  );

  const validateWalletNumber = (text: string) => {
    const numericText = text.replace(/[^0-9]/g, '');
    if (numericText.length <= 11) {
      setPayoutNumber(numericText);
    }
  };

  const handleSave = async () => {
    if (!user) {
      return;
    }

    if (payoutMethod !== 'none') {
      if (!payoutAccountName.trim()) {
        setPayoutAccountNameError('Please enter the account holder name.');
        return;
      }

      if (!isValidAccountHolderName(payoutAccountName)) {
        setPayoutAccountNameError(
          'Use letters, spaces, hyphen and apostrophe only.'
        );
        return;
      }

      if (payoutMethod === 'bank') {
        if (!payoutBankName.trim()) {
          showAlert('Error', 'Please enter the bank name.');
          return;
        }

        if (payoutNumber.replace(/\s+/g, '').length < 8) {
          showAlert('Error', 'Enter a valid bank account number or IBAN.');
          return;
        }
      } else if (payoutNumber.length !== 11) {
        showAlert('Error', 'Wallet number must be exactly 11 digits.');
        return;
      }
    }

    try {
      setIsSaving(true);
      await updateProfile(user.name, user.phoneNumber, {
        payoutMethod,
        payoutAccountName: payoutAccountName.trim(),
        payoutNumber: payoutNumber.replace(/\s+/g, ''),
        payoutBankName: payoutBankName.trim(),
      });
      setShowSuccess(true);
    } catch (error: any) {
      showAlert(
        'Error',
        error?.message || 'Unable to save payment method. Please try again.'
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#323a8f" />
      <ScreenHeader title="Add payment method" variant="dark" />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          isWide && styles.scrollContentWide,
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.introCard}>
          <View style={styles.introIcon}>
            <Ionicons name="wallet-outline" size={26} color="#323a8f" />
          </View>
          <Text style={styles.introTitle}>Where should rent be sent?</Text>
          <Text style={styles.introText}>
            Pick JazzCash, EasyPaisa, or bank. Admin uses this to send your
            share manually. You get 97% of each rent; 3% is admin commission.
            The same details show on Profile.
          </Text>
        </View>

        <Text style={styles.sectionLabel}>Choose a method</Text>
        <View style={styles.methodGrid}>
          {METHOD_OPTIONS.map((option) => {
            const active = payoutMethod === option.key;
            return (
              <LiftPressable
                key={option.key}
                style={[
                  styles.methodCard,
                  isWide && styles.methodCardWide,
                  active && styles.methodCardActive,
                ]}
                onPress={() => setPayoutMethod(option.key)}
                disabled={isSaving}
              >
                <View
                  style={[styles.methodIconWrap, { backgroundColor: option.bg }]}
                >
                  <Ionicons name={option.icon} size={22} color={option.color} />
                </View>
                <Text
                  style={[
                    styles.methodLabel,
                    active && styles.methodLabelActive,
                  ]}
                >
                  {option.label}
                </Text>
                <Text style={styles.methodHint}>{option.hint}</Text>
              </LiftPressable>
            );
          })}
        </View>

        {payoutMethod !== 'none' ? (
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>Account details</Text>

            <Text style={styles.fieldLabel}>Account holder name</Text>
            <TextInput
              style={styles.input}
              placeholder="Name on the account"
              placeholderTextColor="#94A3B8"
              value={payoutAccountName}
              onChangeText={(text) => {
                setPayoutAccountName(text);
                if (!text.trim()) {
                  setPayoutAccountNameError('');
                  return;
                }
                setPayoutAccountNameError(
                  isValidAccountHolderName(text)
                    ? ''
                    : 'Use letters, spaces, hyphen and apostrophe only.'
                );
              }}
              editable={!isSaving}
              autoCapitalize="words"
            />
            {payoutAccountNameError ? (
              <Text style={styles.errorText}>{payoutAccountNameError}</Text>
            ) : null}

            {payoutMethod === 'bank' ? (
              <>
                <Text style={styles.fieldLabel}>Bank name</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. HBL, Meezan"
                  placeholderTextColor="#94A3B8"
                  value={payoutBankName}
                  onChangeText={setPayoutBankName}
                  editable={!isSaving}
                  autoCapitalize="words"
                />
              </>
            ) : null}

            <Text style={styles.fieldLabel}>
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
        ) : (
          <View style={styles.formCard}>
            <Text style={styles.noneHint}>
              No payout method. Admin will not have an account on file until
              you add one.
            </Text>
          </View>
        )}

        <LiftPressable
          style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
          onPress={() => void handleSave()}
          disabled={isSaving}
        >
          {isSaving ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.saveButtonText}>Save payment method</Text>
          )}
        </LiftPressable>
      </ScrollView>

      <BottomNavigation />

      <CenteredStatusModal
        visible={showSuccess}
        title="Saved"
        message="Your payment method is updated. Profile and admin payout use the same details."
        buttonLabel="OK"
        onButtonPress={() => setShowSuccess(false)}
      />
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
    paddingTop: 20,
    paddingBottom: 32,
  },
  scrollContentWide: {
    maxWidth: 720,
    width: '100%',
    alignSelf: 'center',
  },
  introCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E8EAF6',
    marginBottom: 22,
  },
  introIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  introTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  introText: {
    fontSize: 14,
    lineHeight: 21,
    color: '#64748B',
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  methodGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  methodCard: {
    width: '47%',
    flexGrow: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1.5,
    borderColor: '#E8EAF6',
  },
  methodCardWide: {
    width: '23%',
    flexGrow: 0,
  },
  methodCardActive: {
    borderColor: '#323a8f',
    backgroundColor: '#F8FAFF',
  },
  methodIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  methodLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1E293B',
  },
  methodLabelActive: {
    color: '#323a8f',
  },
  methodHint: {
    marginTop: 4,
    fontSize: 12,
    color: '#94A3B8',
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E8EAF6',
    marginBottom: 20,
  },
  formTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 14,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 8,
    marginTop: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#0F172A',
    backgroundColor: '#F8FAFC',
    marginBottom: 12,
  },
  errorText: {
    marginTop: -8,
    marginBottom: 12,
    fontSize: 12,
    color: '#EF4444',
  },
  noneHint: {
    fontSize: 14,
    lineHeight: 21,
    color: '#64748B',
  },
  saveButton: {
    backgroundColor: '#323a8f',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
