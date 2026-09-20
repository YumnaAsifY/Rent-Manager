// import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
// import { Ionicons } from '@expo/vector-icons';
// import StatusBadge from './StatusBadge';

// const { width } = Dimensions.get('window');
// const isTablet = width > 350;

// interface DashboardCardProps {
//   title: string;
//   value?: string;
//   subtitle?: string;
//   icon: keyof typeof Ionicons.glyphMap;
//   onPress: () => void;
//   badge?: string;
//   cardBg?: string;
//   iconColor?: string;
//   iconBg?: string;
// }

// export default function DashboardCard({
//   title,
//   value,
//   subtitle,
//   icon,
//   onPress,
//   badge,
//   cardBg = '#ffffff',
//   iconColor = '#323a8f',
//   iconBg = '#e3f2fd',
// }: DashboardCardProps) {
//   return (
//     <TouchableOpacity 
//       style={[styles.card, isTablet && styles.cardTablet, { backgroundColor: cardBg }]} 
//       onPress={onPress}
//       activeOpacity={0.8}
//     >
//       <View style={styles.cardHeader}>
//         <View style={[styles.iconContainer, { backgroundColor: iconBg }]}>
//           <Ionicons name={icon} size={28} color={iconColor} />
//         </View>
//         {badge && <StatusBadge text={badge} />}
//       </View>

//       <Text style={styles.cardTitle}>{title}</Text>

//       {value && <Text style={[styles.cardValue, { color: iconColor }]}>{value}</Text>}
//       {subtitle && <Text style={styles.cardSubtitle}>{subtitle}</Text>}

//       {/* ← ARROW ICON BHI HATA DIYA */}
//     </TouchableOpacity>
//   );
// }

// const styles = StyleSheet.create({
//   card: {
//     borderRadius: 16,
//     padding: 16,
//     shadowColor: '#000',
//     shadowOffset: { width: 0, height: 2 },
//     shadowOpacity: 0.06,
//     shadowRadius: 6,
//     elevation: 2,
//     borderWidth: 1,
//     borderColor: 'rgba(0,0,0,0.04)',
//     flex: 1,
//     minWidth: '100%',
//     marginBottom: 16,
//   },
//   cardTablet: {
//     minWidth: '45%',
//   },
//   cardHeader: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'center',
//     marginBottom: 12,
//   },
//   iconContainer: {
//     width: 48,
//     height: 48,
//     borderRadius: 12,
//     justifyContent: 'center',
//     alignItems: 'center',
//   },
//   cardTitle: {
//     fontSize: 16,
//     fontWeight: '600',
//     color: '#1a1a1a',
//     marginBottom: 4,
//   },
//   cardValue: {
//     fontSize: 22,
//     fontWeight: 'bold',
//     marginBottom: 12,
//   },
//   cardSubtitle: {
//     fontSize: 14,
//     color: '#666666',
//     marginBottom: 12,
//   },
// });
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import StatusBadge from './StatusBadge';
import LiftPressable from './LiftPressable';

const { width } = Dimensions.get('window');
const isTablet = width > 350;

interface DashboardCardProps {
  title: string;
  value?: string;
  subtitle?: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  badge?: string;
  cardBg?: string;
  iconColor?: string;
  iconBg?: string;
  desktop?: boolean;
  showViewDetails?: boolean;
  liftOnInteract?: boolean;
}

export default function DashboardCard({
  title,
  value,
  subtitle,
  icon,
  onPress,
  badge,
  cardBg = '#ffffff',
  iconColor = '#323a8f',
  iconBg = '#e3f2fd',
  desktop = false,
  showViewDetails = false,
  liftOnInteract = false,
}: DashboardCardProps) {
  return (
    <LiftPressable
      lift={liftOnInteract}
      style={[
        styles.card,
        isTablet && styles.cardTablet,
        desktop && styles.cardDesktop,
        { backgroundColor: cardBg },
      ]}
      onPress={onPress}
    >
      <View style={styles.cardHeader}>
        <View style={[styles.iconContainer, { backgroundColor: iconBg }]}>
          <Ionicons name={icon} size={28} color={iconColor} />
        </View>
        {badge && <StatusBadge text={badge} />}
      </View>

      <Text style={styles.cardTitle}>{title}</Text>

      {value && <Text style={[styles.cardValue, { color: iconColor }]}>{value}</Text>}
      {subtitle && <Text style={styles.cardSubtitle}>{subtitle}</Text>}

      {showViewDetails ? (
        <View style={styles.cardFooter}>
          <Text style={styles.cardAction}>View Details</Text>
          <Ionicons
            name="chevron-forward-circle"
            size={24}
            color={iconColor}
          />
        </View>
      ) : null}
    </LiftPressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.04)',
    flex: 1,
    minWidth: '100%',
    marginBottom: 16,
  },
  cardTablet: {
    minWidth: '45%',
  },
  cardDesktop: {
    minWidth: 0,
    marginBottom: 0,
    minHeight: 180,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  cardValue: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 12,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 15,
  },
  cardAction: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
});