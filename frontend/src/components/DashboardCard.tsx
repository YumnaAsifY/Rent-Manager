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
  compact?: boolean;
  simple?: boolean;
  showViewDetails?: boolean;
  actionLabel?: string;
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
  compact = false,
  simple = false,
  showViewDetails = false,
  actionLabel = 'View Details',
  liftOnInteract = false,
}: DashboardCardProps) {
  return (
    <LiftPressable
      lift={liftOnInteract}
      style={[
        styles.card,
        isTablet && !compact && !desktop && styles.cardTablet,
        desktop && styles.cardDesktop,
        compact && styles.cardCompact,
        compact && simple && styles.cardCompactSimple,
        { backgroundColor: cardBg },
      ]}
      onPress={onPress}
    >
      <View style={[styles.cardBody, compact && styles.cardBodyCompact]}>
        <View style={styles.cardHeader}>
          <View style={[styles.iconContainer, { backgroundColor: iconBg }]}>
            <Ionicons name={icon} size={compact ? 24 : 28} color={iconColor} />
          </View>
          {badge && <StatusBadge text={badge} />}
          {compact && simple && showViewDetails ? (
            <Ionicons
              name="chevron-forward-circle"
              size={20}
              color={iconColor}
            />
          ) : null}
        </View>

        <Text
          style={[styles.cardTitle, compact && simple && styles.cardTitleSimple]}
          numberOfLines={desktop || compact ? 2 : undefined}
        >
          {title}
        </Text>

        {!simple && value ? (
          <Text
            style={[styles.cardValue, { color: iconColor }]}
            numberOfLines={1}
          >
            {value}
          </Text>
        ) : null}
        {!simple && subtitle ? (
          <Text style={styles.cardSubtitle} numberOfLines={compact ? 1 : 2}>
            {subtitle}
          </Text>
        ) : null}
      </View>

      {showViewDetails && !simple ? (
        <View style={styles.cardFooter}>
          <Text style={styles.cardAction} numberOfLines={1}>
            {actionLabel}
          </Text>
          <Ionicons
            name="chevron-forward-circle"
            size={22}
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
  cardCompact: {
    flex: 0,
    minWidth: 0,
    width: '100%',
    height: 180,
    marginBottom: 0,
    padding: 12,
    justifyContent: 'space-between',
    overflow: 'hidden',
  },
  cardCompactSimple: {
    padding: 12,
  },
  cardDesktop: {
    minWidth: 0,
    width: '100%',
    height: '100%',
    marginBottom: 0,
    paddingBottom: 14,
    overflow: 'visible',
  },
  cardBody: {
    flex: 1,
    minWidth: 0,
  },
  cardBodyCompact: {
    flex: 0,
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
  cardTitleSimple: {
    fontSize: 14,
    lineHeight: 18,
    marginBottom: 0,
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
    marginTop: 10,
    gap: 8,
    width: '100%',
    minWidth: 0,
    flexShrink: 0,
  },
  cardAction: {
    flex: 1,
    flexShrink: 1,
    minWidth: 0,
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
  },
});