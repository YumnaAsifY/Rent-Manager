import { forwardRef, useImperativeHandle, useMemo, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';

import { API_BASE_URL } from '@/services/api';

export type LeafletWebMapApi = {
  placePin: (lat: number, lng: number, label: string) => void;
};

type LeafletWebMapProps = {
  picker?: boolean;
  initialLat?: number;
  initialLng?: number;
  initialLabel?: string;
  zoom?: number;
  onSelect?: (address: string) => void;
  onReady?: (api: LeafletWebMapApi) => void;
};

function escapeJs(value: string) {
  return JSON.stringify(value);
}

function buildHtml(options: {
  picker: boolean;
  lat: number;
  lng: number;
  zoom: number;
  label: string;
  apiBase: string;
}) {
  const { picker, lat, lng, zoom, label, apiBase } = options;
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <style>
    html, body, #map { margin:0; padding:0; height:100%; width:100%; }
    body { background:#E2E8F0; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script>
    const API = ${escapeJs(apiBase)};
    const PICKER = ${picker ? 'true' : 'false'};
    const map = L.map('map').setView([${lat}, ${lng}], ${zoom});
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap'
    }).addTo(map);
    let marker = L.marker([${lat}, ${lng}]).addTo(map);
    marker.bindPopup(${escapeJs(label)}).openPopup();

    function placePin(lat, lng, label) {
      marker.setLatLng([lat, lng]);
      marker.bindPopup(label || 'Selected location').openPopup();
      map.flyTo([lat, lng], 15);
    }
    window.placePin = placePin;

    async function reverseGeocode(lat, lng) {
      try {
        const res = await fetch(API + '/api/geocode/reverse?lat=' + encodeURIComponent(lat) + '&lon=' + encodeURIComponent(lng));
        const data = await res.json();
        if (data && data.display_name) return data.display_name;
      } catch (e) {}
      return lat.toFixed(5) + ', ' + lng.toFixed(5);
    }

    if (PICKER) {
      map.on('click', async function (event) {
        const lat = event.latlng.lat;
        const lng = event.latlng.lng;
        placePin(lat, lng, 'Selected location');
        const address = await reverseGeocode(lat, lng);
        placePin(lat, lng, address);
        if (window.ReactNativeWebView) {
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'select', address: address }));
        }
      });
    }

    setTimeout(function () { map.invalidateSize(); }, 200);
    setTimeout(function () { map.invalidateSize(); }, 600);
    if (window.ReactNativeWebView) {
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'ready' }));
    }
  </script>
</body>
</html>`;
}

const LeafletWebMap = forwardRef<LeafletWebMapApi, LeafletWebMapProps>(
  function LeafletWebMap(
    {
      picker = false,
      initialLat = 31.5204,
      initialLng = 74.3587,
      initialLabel = 'Lahore',
      zoom,
      onSelect,
      onReady,
    },
    ref
  ) {
    const webRef = useRef<WebView>(null);
    const html = useMemo(
      () =>
        buildHtml({
          picker,
          lat: initialLat,
          lng: initialLng,
          zoom: zoom ?? (picker ? 12 : 16),
          label: initialLabel,
          apiBase: API_BASE_URL.replace(/\/+$/, ''),
        }),
      [picker, initialLat, initialLng, initialLabel, zoom]
    );

    useImperativeHandle(ref, () => ({
      placePin: (lat: number, lng: number, label: string) => {
        const js = `window.placePin(${lat},${lng},${JSON.stringify(label)}); true;`;
        webRef.current?.injectJavaScript(js);
      },
    }));

    return (
      <View style={styles.wrap}>
        <WebView
          ref={webRef}
          originWhitelist={['*']}
          source={{ html }}
          style={styles.web}
          javaScriptEnabled
          domStorageEnabled
          setSupportMultipleWindows={false}
          nestedScrollEnabled
          mixedContentMode="always"
          onMessage={(event) => {
            try {
              const data = JSON.parse(event.nativeEvent.data) as {
                type?: string;
                address?: string;
              };
              if (data.type === 'ready') {
                onReady?.({
                  placePin: (lat, lng, label) => {
                    const js = `window.placePin(${lat},${lng},${JSON.stringify(label)}); true;`;
                    webRef.current?.injectJavaScript(js);
                  },
                });
              }
              if (data.type === 'select' && data.address) {
                onSelect?.(data.address);
              }
            } catch {
              // Ignore malformed messages.
            }
          }}
        />
      </View>
    );
  }
);

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    minHeight: 220,
    backgroundColor: '#E2E8F0',
  },
  web: {
    flex: 1,
    backgroundColor: 'transparent',
  },
});

export default LeafletWebMap;
