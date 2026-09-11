import { Alert, Linking } from 'react-native';

export function hasUsableLocation(location?: string | null) {
  const query = typeof location === 'string' ? location.trim() : '';

  if (!query) {
    return false;
  }

  const normalized = query.toLowerCase();
  return (
    normalized !== 'location unavailable' &&
    normalized !== 'n/a' &&
    normalized !== 'unavailable'
  );
}

function openMapsInBrowser(url: string) {
  if (typeof window !== 'undefined' && typeof window.open === 'function') {
    window.open(url, '_blank', 'noopener,noreferrer');
    return true;
  }

  return false;
}

export async function openGoogleMapsLocation(location?: string | null) {
  const query = typeof location === 'string' ? location.trim() : '';

  if (!hasUsableLocation(query)) {
    return;
  }

  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    query
  )}`;

  try {
    const canOpen = await Linking.canOpenURL(mapsUrl);
    if (canOpen) {
      await Linking.openURL(mapsUrl);
      return;
    }

    await Linking.openURL(mapsUrl);
  } catch {
    if (openMapsInBrowser(mapsUrl)) {
      return;
    }

    Alert.alert(
      'Unable to open maps',
      'Please search this location in Google Maps.'
    );
  }
}
