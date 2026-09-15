import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, usePathname } from 'expo-router';

import { adminTabs } from './adminNav';

export default function AdminBottomNav() {
  const router = useRouter();
  const pathname = usePathname();
  const { width } = useWindowDimensions();

  if (Platform.OS === 'web' && width >= 768) {
    return null;
  }

  return (
    <View style={styles.container}>
      {adminTabs.map((tab) => {
        const isActive = tab.match(pathname);

        return (
          <TouchableOpacity
            key={tab.name}
            style={styles.tab}
            onPress={() => router.push(tab.path as any)}
            activeOpacity={0.7}
          >
            <Ionicons
              name={
                isActive
                  ? (tab.icon as any)
                  : (`${tab.icon}-outline` as any)
              }
              size={24}
              color={isActive ? '#323a8f' : '#9E9E9E'}
            />
            <Text style={[styles.label, isActive && styles.labelActive]}>
              {tab.name}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#E8EAF6',
    paddingBottom: Platform.OS === 'ios' ? 20 : 10,
    paddingTop: 10,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.06,
        shadowRadius: 4,
      },
      android: {
        elevation: 8,
      },
      web: {
        boxShadow: '0 -2px 8px rgba(0,0,0,0.06)',
      },
    }),
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  label: {
    fontSize: 11,
    fontWeight: '500',
    color: '#9E9E9E',
  },
  labelActive: {
    color: '#323a8f',
    fontWeight: '700',
  },
});
