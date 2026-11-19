const SEARCH_HEADERS = {
  'User-Agent': 'RentManager/1.0 (location picker)',
  Accept: 'application/json',
  'Accept-Language': 'en',
};

async function fetchJson(url, timeoutMs = 6000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      headers: SEARCH_HEADERS,
      signal: controller.signal,
    });
    if (!response.ok) {
      const error = new Error('Geocode request failed');
      error.status = 502;
      throw error;
    }
    return response.json();
  } finally {
    clearTimeout(timer);
  }
}

function mapNominatimPlace(item) {
  if (!item || item.lat == null || item.lon == null) {
    return null;
  }

  return {
    lat: String(item.lat),
    lon: String(item.lon),
    name: item.name || '',
    display_name: item.display_name || item.name || '',
  };
}

function mapPhotonPlace(feature) {
  const coords = feature && feature.geometry && feature.geometry.coordinates;
  const props = (feature && feature.properties) || {};
  if (!Array.isArray(coords) || coords.length < 2) {
    return null;
  }

  const parts = [
    props.name,
    props.street,
    props.locality,
    props.district,
    props.city,
    props.county,
    props.state,
    props.country,
  ].filter(Boolean);

  const displayName = [...new Set(parts)].join(', ');

  return {
    lat: String(coords[1]),
    lon: String(coords[0]),
    name: props.name || '',
    display_name: displayName,
  };
}

function rankScore(item, query) {
  const q = query.trim().toLowerCase();
  const display = String(item.display_name || '').toLowerCase();
  const name = String(item.name || '').toLowerCase();
  const firstPart = display.split(',')[0].trim();

  if (display === q || name === q || firstPart === q) {
    return 0;
  }
  if (name.startsWith(q) || firstPart.startsWith(q) || display.startsWith(q)) {
    return 1;
  }
  if (name.includes(q) || firstPart.includes(q)) {
    return 2;
  }
  if (display.includes(q)) {
    return 3;
  }
  return 4;
}

function uniquePlaces(places) {
  const seen = new Set();
  return places.filter((place) => {
    if (!place) {
      return false;
    }
    const key = `${place.display_name}|${Number(place.lat).toFixed(5)}|${Number(
      place.lon
    ).toFixed(5)}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function queryVariants(query) {
  const variants = [query];
  const lower = query.toLowerCase();
  if (!/\bpakistan\b|\bpk\b/.test(lower)) {
    variants.push(`${query}, Pakistan`);
  }
  return variants;
}

async function searchPhoton(query) {
  const data = await fetchJson(
    `https://photon.komoot.io/api/?q=${encodeURIComponent(
      query
    )}&limit=10&lang=en&lat=30.3753&lon=69.3451`
  );
  const features = data && Array.isArray(data.features) ? data.features : [];
  return features.map(mapPhotonPlace).filter(Boolean);
}

async function searchNominatim(query) {
  const data = await fetchJson(
    `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=10&addressdetails=0&accept-language=en&countrycodes=pk&q=${encodeURIComponent(
      query
    )}`
  );
  return (Array.isArray(data) ? data : []).map(mapNominatimPlace).filter(Boolean);
}

exports.search = async (req, res) => {
  try {
    const query = String(req.query.q || '').trim();
    if (!query) {
      return res.status(400).json({ message: 'Search query is required' });
    }

    let places = [];

    for (const variant of queryVariants(query)) {
      try {
        places = uniquePlaces(places.concat(await searchNominatim(variant)));
      } catch {
        // Photon is only used when Nominatim does not answer.
      }

      if (places.length > 0) {
        break;
      }

      try {
        places = uniquePlaces(places.concat(await searchPhoton(variant)));
      } catch {
        // Keep going if Photon does not answer.
      }

      if (places.length > 0) {
        break;
      }
    }

    // If Pakistan-only Nominatim found nothing, try worldwide Nominatim once.
    if (places.length === 0) {
      try {
        const data = await fetchJson(
          `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=10&accept-language=en&q=${encodeURIComponent(
            query
          )}`
        );
        places = (Array.isArray(data) ? data : [])
          .map(mapNominatimPlace)
          .filter(Boolean);
      } catch {
        places = [];
      }
    }

    places = uniquePlaces(places).sort(
      (a, b) => rankScore(a, query) - rankScore(b, query)
    );

    return res.json({
      results: places,
      result: places[0] || null,
    });
  } catch (error) {
    return res.status(error.status || 500).json({
      message: 'Location search failed. Try again.',
    });
  }
};

exports.reverse = async (req, res) => {
  try {
    const lat = Number(req.query.lat);
    const lon = Number(req.query.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      return res.status(400).json({ message: 'Valid lat and lon are required' });
    }

    const data = await fetchJson(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&accept-language=en&lat=${encodeURIComponent(
        lat
      )}&lon=${encodeURIComponent(lon)}`
    );

    return res.json({
      display_name: data?.display_name || `${lat.toFixed(5)}, ${lon.toFixed(5)}`,
    });
  } catch (error) {
    return res.status(error.status || 500).json({
      message: 'Address lookup failed',
    });
  }
};
