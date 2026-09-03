import Constants from 'expo-constants';
import { Platform } from 'react-native';

const configuredApiUrl = process.env.EXPO_PUBLIC_API_URL?.trim();

const resolveApiBaseUrl = () => {
  // Laptop/web must talk to the local backend — never a stale LAN IP.
  if (Platform.OS === 'web') {
    return 'http://localhost:5000';
  }

  // Expo Go: use the same host the phone already connected to via QR.
  const hostUri = Constants.expoConfig?.hostUri ?? '';
  const host = hostUri.split(':')[0];

  if (host && host !== 'localhost' && host !== '127.0.0.1') {
    return `http://${host}:5000`;
  }

  if (configuredApiUrl) {
    return configuredApiUrl.replace(/\/+$/, '');
  }

  return 'http://localhost:5000';
};

export const API_BASE_URL = resolveApiBaseUrl();

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
  token?: string | null
): Promise<T> {
  const headers = new Headers(options.headers);

  if (options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  const responseText = await response.text();
  let data: unknown = {};

  if (responseText) {
    try {
      data = JSON.parse(responseText);
    } catch {
      data = {};
    }
  }

  if (!response.ok) {
    const message =
      typeof data === 'object' &&
      data !== null &&
      'message' in data &&
      typeof data.message === 'string'
        ? data.message
        : 'Request failed';

    throw new ApiError(message, response.status);
  }

  return data as T;
}
