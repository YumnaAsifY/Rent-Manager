import { StyleSheet, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  hasUsableLocation,
  openGoogleMapsLocation,
} from '@/utils/openGoogleMapsLocation';

type ViewLocationButtonProps = {
  location?: string | null;
};

export default function ViewLocationButton({
  location,
}: ViewLocationButtonProps) {
  if (!hasUsableLocation(location)) {
    return null;
  }

  return (
    <TouchableOpacity
      style={styles.button}
      onPress={() => void openGoogleMapsLocation(location)}
      activeOpacity={0.85}
    >
      <Ionicons name="location" size={14} color="#FFFFFF" />
      <Text style={styles.label}>View Location</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#323a8f',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    marginTop: 8,
    marginBottom: 10,
  },
  label: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
});
