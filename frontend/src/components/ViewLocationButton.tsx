import { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import LocationMapModal from './LocationMapModal';
import { hasUsableLocation } from '@/utils/openGoogleMapsLocation';

type ViewLocationButtonProps = {
  location?: string | null;
};

export default function ViewLocationButton({
  location,
}: ViewLocationButtonProps) {
  const [visible, setVisible] = useState(false);

  if (!hasUsableLocation(location)) {
    return null;
  }

  return (
    <>
      <TouchableOpacity
        style={styles.button}
        onPress={(event) => {
          event.stopPropagation();
          setVisible(true);
        }}
        activeOpacity={0.85}
      >
        <Ionicons name="location" size={14} color="#FFFFFF" />
        <Text style={styles.label}>View Location</Text>
      </TouchableOpacity>
      <LocationMapModal
        visible={visible}
        location={location!.trim()}
        onClose={() => setVisible(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  button: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#5B4DFF',
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
