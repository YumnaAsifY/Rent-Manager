import { createElement, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import LeafletWebMap from '@/components/LeafletWebMap';
import { API_BASE_URL } from '@/services/api';

type LeafletMap = {
  remove: () => void;
  invalidateSize: () => void;
  setView: (center: [number, number], zoom: number) => LeafletMap;
};

type LeafletMarker = {
  addTo: (map: LeafletMap) => LeafletMarker;
  bindPopup: (content: string) => LeafletMarker;
  openPopup: () => LeafletMarker;
};

type LeafletNamespace = {
  map: (element: HTMLElement) => LeafletMap;
  tileLayer: (
    url: string,
    options: { maxZoom: number; attribution: string }
  ) => { addTo: (map: LeafletMap) => void };
  marker: (latlng: { lat: number; lng: number }) => LeafletMarker;
};

declare global {
  interface Window {
    L?: LeafletNamespace;
  }
}

const LEAFLET_CSS = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
const LEAFLET_JS = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';

function loadStylesheet(href: string) {
  if (typeof document === 'undefined') {
    return;
  }
  if (document.querySelector(`link[href="${href}"]`)) {
    return;
  }
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = href;
  document.head.appendChild(link);
}

function loadScript(src: string) {
  return new Promise<void>((resolve, reject) => {
    if (typeof document === 'undefined') {
      reject(new Error('No document'));
      return;
    }

    if (window.L) {
      resolve();
      return;
    }

    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing) {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error('Leaflet failed')));
      return;
    }

    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Leaflet failed'));
    document.body.appendChild(script);
  });
}

function parseCoordinates(location: string) {
  const match = location
    .trim()
    .match(/^(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)$/);
  if (!match) {
    return null;
  }

  const lat = Number(match[1]);
  const lng = Number(match[2]);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return null;
  }

  return { lat, lng, label: location.trim() };
}

async function resolveLocationPoint(location: string) {
  const coordinates = parseCoordinates(location);
  if (coordinates) {
    return coordinates;
  }

  const response = await fetch(
    `${API_BASE_URL}/api/geocode/search?q=${encodeURIComponent(location)}`
  );
  const data = (await response.json()) as {
    results?: Array<{ lat: string; lon: string; display_name?: string; name?: string }>;
    result?: { lat: string; lon: string; display_name?: string; name?: string } | null;
  };

  const first =
    (Array.isArray(data.results) && data.results[0]) || data.result || null;
  if (!first) {
    return null;
  }

  const lat = Number(first.lat);
  const lng = Number(first.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return null;
  }

  return {
    lat,
    lng,
    label: first.display_name || first.name || location,
  };
}

type LocationMapModalProps = {
  visible: boolean;
  location: string;
  onClose: () => void;
};

export default function LocationMapModal({
  visible,
  location,
  onClose,
}: LocationMapModalProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [resolvedLabel, setResolvedLabel] = useState(location);

  const [point, setPoint] = useState<{
    lat: number;
    lng: number;
    label: string;
  } | null>(null);

  useEffect(() => {
    if (!visible) {
      return;
    }

    let cancelled = false;
    let map: LeafletMap | null = null;

    const setup = async () => {
      setLoading(true);
      setError('');
      setResolvedLabel(location);
      setPoint(null);

      try {
        const found = await resolveLocationPoint(location);
        if (cancelled) {
          return;
        }
        if (!found) {
          setError('Could not find this location on the map.');
          setLoading(false);
          return;
        }

        setResolvedLabel(found.label);
        setPoint({ lat: found.lat, lng: found.lng, label: found.label });

        if (Platform.OS !== 'web') {
          setLoading(false);
          return;
        }

        loadStylesheet(LEAFLET_CSS);
        await loadScript(LEAFLET_JS);
        if (cancelled) {
          return;
        }
        if (!containerRef.current) {
          await new Promise((resolve) => setTimeout(resolve, 80));
        }
        if (cancelled || !containerRef.current || !window.L) {
          return;
        }

        const leaflet = window.L;
        const instance = leaflet
          .map(containerRef.current)
          .setView([found.lat, found.lng], 16);
        map = instance;

        leaflet
          .tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '&copy; OpenStreetMap',
          })
          .addTo(instance);

        leaflet
          .marker({ lat: found.lat, lng: found.lng })
          .addTo(instance)
          .bindPopup(found.label)
          .openPopup();

        setTimeout(() => instance.invalidateSize(), 200);
        setTimeout(() => instance.invalidateSize(), 600);
        setLoading(false);
      } catch {
        if (!cancelled) {
          setError('Unable to load this location. Try again.');
          setLoading(false);
        }
      }
    };

    void setup();

    return () => {
      cancelled = true;
      map?.remove();
    };
  }, [visible, location]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.header}>
            <Text style={styles.title} numberOfLines={2}>
              {resolvedLabel || location}
            </Text>
            <TouchableOpacity onPress={onClose} hitSlop={10}>
              <Ionicons name="close" size={24} color="#1A1A1A" />
            </TouchableOpacity>
          </View>

          {Platform.OS === 'web' ? (
            <View style={styles.mapFrame}>
              {createElement('div', {
                ref: containerRef,
                style: {
                  width: '100%',
                  height: '100%',
                  minHeight: 360,
                },
              })}
              {loading ? (
                <View style={styles.mapStatus}>
                  <ActivityIndicator color="#5B4DFF" />
                  <Text style={styles.statusText}>Finding exact location...</Text>
                </View>
              ) : null}
              {error ? (
                <View style={styles.mapStatus}>
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              ) : null}
            </View>
          ) : (
            <View style={styles.mapFrame}>
              {loading ? (
                <View style={styles.mapStatus}>
                  <ActivityIndicator color="#5B4DFF" />
                  <Text style={styles.statusText}>Finding exact location...</Text>
                </View>
              ) : null}
              {error ? (
                <View style={styles.mapStatus}>
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              ) : point ? (
                <LeafletWebMap
                  initialLat={point.lat}
                  initialLng={point.lng}
                  initialLabel={point.label}
                  zoom={16}
                />
              ) : null}
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  card: {
    width: '100%',
    maxWidth: 720,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  title: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  mapFrame: {
    height: 420,
    backgroundColor: '#E2E8F0',
    position: 'relative',
  },
  mapStatus: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(248, 250, 252, 0.88)',
    gap: 8,
    paddingHorizontal: 20,
  },
  statusText: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
  },
  errorText: {
    fontSize: 14,
    color: '#B91C1C',
    textAlign: 'center',
  },
  nativeFallback: {
    minHeight: 220,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 12,
  },
  openMapsButton: {
    backgroundColor: '#5B4DFF',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  openMapsButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
});
