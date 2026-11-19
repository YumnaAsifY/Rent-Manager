import { ReactNode } from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
  const insets = useSafeAreaInsets();
  const isDark = variant === 'dark';
  const foregroundColor = '#1B2346';
  const topInset = Platform.OS === 'web' ? 10 : Math.max(insets.top, 12);

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
        styles.lightHeader,
        Platform.OS !== 'web' && {
          paddingTop: topInset + 1,
          minHeight: topInset + 38,
          paddingBottom: 4,
        },
      ]}
    >
      <View style={styles.titleGroup}>
        {showBack && (
          <TouchableOpacity
            onPress={handleBack}
            style={[styles.backButton, isDark && styles.backButtonSoft]}
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
    minHeight: Platform.OS === 'web' ? 56 : 64,
    paddingTop: Platform.OS === 'web' ? 10 : 32,
    paddingBottom: Platform.OS === 'web' ? 10 : 4,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  lightHeader: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E8ECF4',
  },
  titleGroup: {
    minWidth: 0,
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Platform.OS === 'web' ? 0 : -4,
  },
  backButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
    borderRadius: 12,
  },
  backButtonSoft: {
    backgroundColor: '#F4F6FB',
  },
  title: {
    flexShrink: 1,
    fontSize: Platform.OS === 'web' ? 20 : 17,
    fontWeight: '800',
  },
  rightAction: {
    marginLeft: 12,
    alignItems: 'flex-end',
  },
});
