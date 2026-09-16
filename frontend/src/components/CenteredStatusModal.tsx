import { ReactNode } from 'react';
import {
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type CenteredStatusModalProps = {
  visible: boolean;
  title: string;
  message: string;
  buttonLabel: string;
  onButtonPress: () => void;
  variant?: 'success' | 'info' | 'error';
  extra?: ReactNode;
  secondaryLabel?: string;
  onSecondaryPress?: () => void;
};

const ICON_BY_VARIANT = {
  success: { name: 'checkmark' as const, backgroundColor: '#22C55E' },
  info: { name: 'mail-outline' as const, backgroundColor: '#323a8f' },
  error: { name: 'close' as const, backgroundColor: '#EF4444' },
};

export default function CenteredStatusModal({
  visible,
  title,
  message,
  buttonLabel,
  onButtonPress,
  variant = 'success',
  extra,
  secondaryLabel,
  onSecondaryPress,
}: CenteredStatusModalProps) {
  const icon = ICON_BY_VARIANT[variant];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onButtonPress}
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View
            style={[styles.iconWrap, { backgroundColor: icon.backgroundColor }]}
          >
            <Ionicons name={icon.name} size={36} color="#FFFFFF" />
          </View>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>
          {extra}
          <TouchableOpacity
            style={styles.button}
            onPress={onButtonPress}
            activeOpacity={0.85}
          >
            <Text style={styles.buttonText}>{buttonLabel}</Text>
          </TouchableOpacity>
          {secondaryLabel && onSecondaryPress ? (
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={onSecondaryPress}
              activeOpacity={0.85}
            >
              <Text style={styles.secondaryButtonText}>{secondaryLabel}</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingVertical: 32,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
    textAlign: 'center',
    marginBottom: 10,
  },
  message: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  button: {
    minWidth: 140,
    backgroundColor: '#323a8f',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 28,
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryButton: {
    marginTop: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  secondaryButtonText: {
    color: '#323a8f',
    fontSize: 14,
    fontWeight: '700',
  },
});
