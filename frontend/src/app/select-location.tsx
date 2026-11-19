import { createElement, useEffect, useRef, useState } from 'react';
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import ScreenHeader from '../components/ScreenHeader';
import LiftPressable from '../components/LiftPressable';
import LeafletWebMap from '../components/LeafletWebMap';
import { API_BASE_URL } from '@/services/api';
import { publishLocationPick } from '@/utils/locationPicker';

type LeafletMap = {
  remove: () => void;
  invalidateSize: () => void;
  flyTo: (center: [number, number], zoom: number) => void;
  on: (
    event: string,
    handler: (event: { latlng: { lat: number; lng: number } }) => void
  ) => void;
  setView: (center: [number, number], zoom: number) => LeafletMap;
};

type LeafletMarker = {
  setLatLng: (latlng: { lat: number; lng: number }) => LeafletMarker;
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

async function reverseGeocode(lat: number, lng: number) {
  try {
    const response = await fetch(
      `${API_BASE_URL}/api/geocode/reverse?lat=${encodeURIComponent(
        lat
      )}&lon=${encodeURIComponent(lng)}`
    );
    const data = (await response.json()) as { display_name?: string };
    if (data?.display_name) {
      return data.display_name;
    }
  } catch {
    // Use coordinates if address lookup fails.
  }

  return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
}

type PlaceResult = {
  lat: string;
  lon: string;
  name?: string;
  display_name?: string;
};


async function searchBackend(query: string) {
  const response = await fetch(
    `${API_BASE_URL}/api/geocode/search?q=${encodeURIComponent(query)}`
  );
  const data = (await response.json()) as {
    results?: PlaceResult[];
    result?: PlaceResult | null;
    message?: string;
  };
  if (!response.ok) {
    throw new Error(data.message || 'Location search failed');
  }
  if (Array.isArray(data.results) && data.results.length > 0) {
    return data.results;
  }
  if (data.result) {
    return [data.result];
  }
  return [];
}

async function searchPlaces(query: string) {
  return searchBackend(query);
}

type MapApi = {
  placePin: (lat: number, lng: number, label: string) => void;
};

function WebLeafletMap({
  onSelect,
  onReady,
}: {
  onSelect: (location: string) => void;
  onReady?: (api: MapApi) => void;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const onSelectRef = useRef(onSelect);
  const onReadyRef = useRef(onReady);
  onSelectRef.current = onSelect;
  onReadyRef.current = onReady;

  useEffect(() => {
    let map: LeafletMap | null = null;
    let cancelled = false;

    const setup = async () => {
      loadStylesheet(LEAFLET_CSS);
      await loadScript(LEAFLET_JS);
      if (cancelled || !containerRef.current || !window.L) {
        return;
      }

      const leaflet = window.L;
      const instance = leaflet
        .map(containerRef.current)
        .setView([31.5204, 74.3587], 12);
      map = instance;

      leaflet
        .tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          attribution: '&copy; OpenStreetMap',
        })
        .addTo(instance);

      let marker: LeafletMarker | null = null;

      const placePin = (lat: number, lng: number, label: string) => {
        const latlng = { lat, lng };
        if (marker) {
          marker.setLatLng(latlng);
        } else {
          marker = leaflet.marker(latlng).addTo(instance);
        }
        marker.bindPopup(label).openPopup();
        instance.flyTo([lat, lng], 15);
      };

      onReadyRef.current?.({ placePin });

      instance.on('click', async (event) => {
        const { lat, lng } = event.latlng;
        placePin(lat, lng, 'Selected location');
        const address = await reverseGeocode(lat, lng);
        placePin(lat, lng, address);
        onSelectRef.current(address);
      });

      setTimeout(() => instance.invalidateSize(), 200);
      setTimeout(() => instance.invalidateSize(), 600);
    };

    void setup();

    return () => {
      cancelled = true;
      map?.remove();
    };
  }, []);

  return createElement('div', {
    ref: containerRef,
    style: {
      width: '100%',
      height: '100%',
      minHeight: 420,
      cursor: 'crosshair',
    },
  });
}

export default function SelectLocationScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ q?: string | string[] }>();
  const initialQuery =
    typeof params.q === 'string'
      ? params.q
      : Array.isArray(params.q)
        ? params.q[0] || ''
        : '';

  const [query, setQuery] = useState(initialQuery);
  const [searching, setSearching] = useState(false);
  const [suggestions, setSuggestions] = useState<PlaceResult[]>([]);
  const [searchNote, setSearchNote] = useState('');
  const mapApiRef = useRef<MapApi | null>(null);
  const searchRequestRef = useRef(0);

  const finishSelection = (location: string) => {
    const value = location.trim();
    if (!value) {
      return;
    }
    publishLocationPick(value);
    router.back();
  };

  const applyPlace = (place: PlaceResult) => {
    const lat = Number(place.lat);
    const lng = Number(place.lon);
    const label = place.display_name || place.name || query.trim();
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      mapApiRef.current?.placePin(lat, lng, label);
    }
    finishSelection(label);
  };

  const handleSearch = async (rawQuery?: string) => {
    const text = (rawQuery ?? query).trim();
    if (!text) {
      setSuggestions([]);
      setSearchNote('Type a place, then press Search.');
      return;
    }

    const requestId = searchRequestRef.current + 1;
    searchRequestRef.current = requestId;
    setSearching(true);
    setSearchNote('');
    setSuggestions([]);
    try {
      const results = await searchPlaces(text);
      if (requestId !== searchRequestRef.current) {
        return;
      }
      setSuggestions(results);
      if (results.length === 0) {
        setSearchNote('No match. Add the city, for example Khalid Road, Sheikhupura.');
        return;
      }
      setSearchNote('');
      const first = results[0];
      const lat = Number(first.lat);
      const lng = Number(first.lon);
      if (Number.isFinite(lat) && Number.isFinite(lng)) {
        mapApiRef.current?.placePin(
          lat,
          lng,
          first.display_name || first.name || text
        );
      }
    } catch (error) {
      if (requestId !== searchRequestRef.current) {
        return;
      }
      setSuggestions([]);
      setSearchNote(
        error instanceof Error
          ? error.message
          : 'Search could not reach the server. Keep the backend running, then try again.'
      );
    } finally {
      if (requestId === searchRequestRef.current) {
        setSearching(false);
      }
    }
  };

  return (
    <View style={styles.container}>
      <ScreenHeader title="Select Location" variant="dark" />

      <View style={styles.searchWrap}>
        <View style={styles.searchRow}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search a location in English..."
            placeholderTextColor="#94A3B8"
            value={query}
            onChangeText={setQuery}
            returnKeyType="search"
            onSubmitEditing={() => void handleSearch()}
          />
          <LiftPressable
            style={styles.searchButton}
            onPress={() => void handleSearch()}
            disabled={searching}
          >
            <Text style={styles.searchButtonText}>
              {searching ? '...' : 'Search'}
            </Text>
          </LiftPressable>
        </View>

        {searchNote ? <Text style={styles.searchNote}>{searchNote}</Text> : null}
      </View>

      {suggestions.length > 0 ? (
        <ScrollView
          style={styles.suggestionList}
          keyboardShouldPersistTaps="handled"
        >
          {suggestions.map((place, index) => {
            const label = place.display_name || place.name || '';
            return (
              <TouchableOpacity
                key={`${place.lat}-${place.lon}-${index}`}
                style={[
                  styles.suggestionRow,
                  index === 0 && styles.suggestionRowExact,
                ]}
                onPress={() => applyPlace(place)}
                activeOpacity={0.8}
              >
                <Text style={styles.suggestionTitle} numberOfLines={1}>
                  {place.name || label.split(',')[0]}
                </Text>
                <Text style={styles.suggestionSubtitle} numberOfLines={2}>
                  {label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      ) : (
      <View style={styles.mapWrap}>
        {Platform.OS === 'web' ? (
          <WebLeafletMap
            onSelect={finishSelection}
            onReady={(api) => {
              mapApiRef.current = api;
            }}
          />
        ) : (
          <LeafletWebMap
            picker
            zoom={12}
            onSelect={finishSelection}
            onReady={(api) => {
              mapApiRef.current = api;
            }}
          />
        )}
      </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  searchWrap: {
    zIndex: 20,
    elevation: 24,
    backgroundColor: '#FFFFFF',
  },
  searchNote: {
    paddingHorizontal: 16,
    paddingBottom: 10,
    color: '#B45309',
    fontSize: 13,
    lineHeight: 18,
  },
  suggestionList: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
  },
  suggestionBox: {
    maxHeight: 240,
    marginHorizontal: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },
  suggestionRow: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  suggestionRowExact: {
    backgroundColor: '#EEF2FF',
  },
  suggestionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  suggestionSubtitle: {
    marginTop: 2,
    fontSize: 12,
    color: '#64748B',
    lineHeight: 16,
  },
  searchInput: {
    flex: 1,
    height: 44,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 15,
    color: '#1A1A1A',
    backgroundColor: '#FFFFFF',
  },
  searchButton: {
    height: 44,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: '#5B4DFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  mapWrap: {
    flex: 1,
    minHeight: 420,
    backgroundColor: '#E2E8F0',
  },
});
