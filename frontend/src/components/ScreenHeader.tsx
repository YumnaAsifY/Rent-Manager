import { ReactNode } from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

type ScreenHeaderProps = {
  title: string;
  variant: 'light' | 'dark';
  showBack?: boolean;
  onBack?: () => void;
  /** Used when there is no history (e.g. Safepay redirect). */
  fallbackHref?: string;
  rightAction?: ReactNode;
};

export default function ScreenHeader({
  title,
  variant,
  showBack = true,
  onBack,
  fallbackHref = '/home',
  rightAction,
}: ScreenHeaderProps) {
  const router = useRouter();
  const isDark = variant === 'dark';
  const foregroundColor = isDark ? '#FFFFFF' : '#323a8f';

  const handleBack = () => {
    if (onBack) {
      onBack();
      return;
    }

    if (typeof router.canGoBack === 'function' && router.canGoBack()) {
      router.back();
      return;
    }

    router.replace(fallbackHref as any);
  };

  return (
    <View
      style={[
        styles.header,
        isDark ? styles.darkHeader : styles.lightHeader,
      ]}
    >
      <View style={styles.titleGroup}>
        {showBack && (
          <TouchableOpacity
            onPress={handleBack}
            style={styles.backButton}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Ionicons name="arrow-back" size={24} color={foregroundColor} />
          </TouchableOpacity>
        )}
        <Text
          style={[styles.title, { color: foregroundColor }]}
          numberOfLines={1}
        >
          {title}
        </Text>
      </View>

      {rightAction ? <View style={styles.rightAction}>{rightAction}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    width: '100%',
    minHeight: Platform.OS === 'web' ? 56 : 88,
    paddingTop: Platform.OS === 'web' ? 10 : 42,
    paddingBottom: 10,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  lightHeader: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E8EAF6',
  },
  darkHeader: {
    backgroundColor: '#323a8f',
  },
  titleGroup: {
    minWidth: 0,
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 4,
  },
  title: {
    flexShrink: 1,
    fontSize: 20,
    fontWeight: '600',
  },
  rightAction: {
    marginLeft: 12,
    alignItems: 'flex-end',
  },
});
