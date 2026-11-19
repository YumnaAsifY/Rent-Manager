import { View, Text, StyleSheet } from 'react-native';

interface StatusBadgeProps {
  text: string;
  variant?: 'pending' | 'active' | 'completed';
}

export default function StatusBadge({ text, variant = 'pending' }: StatusBadgeProps) {
  const getBadgeColor = () => {
    switch (variant) {
      case 'pending':
        return '#ff6f00';
      case 'active':
        return '#5B4DFF';
      case 'completed':
        return '#2e7d32';
      default:
        return '#ff6f00';
    }
  };

  return (
    <View style={[styles.badge, { backgroundColor: getBadgeColor() + '15' }]}>
      <Text style={[styles.badgeText, { color: getBadgeColor() }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
});