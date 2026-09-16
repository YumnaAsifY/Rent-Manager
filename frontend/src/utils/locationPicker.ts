type LocationPickListener = (location: string) => void;

const STORAGE_KEY = 'rent-manager-picked-location';

let listener: LocationPickListener | null = null;
let lastPickedLocation = '';

export function subscribeLocationPick(fn: LocationPickListener) {
  listener = fn;
  return () => {
    if (listener === fn) {
      listener = null;
    }
  };
}

export function publishLocationPick(location: string) {
  const value = location.trim();
  if (!value) {
    return;
  }

  lastPickedLocation = value;

  try {
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem(STORAGE_KEY, value);
    }
  } catch {
    // Ignore storage errors; in-memory fallback still works.
  }

  listener?.(value);
}

export function consumeLocationPick() {
  let value = lastPickedLocation;

  try {
    if (typeof sessionStorage !== 'undefined') {
      value = sessionStorage.getItem(STORAGE_KEY) || value;
      sessionStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    // Ignore storage errors.
  }

  lastPickedLocation = '';
  return value.trim() ? value.trim() : null;
}
