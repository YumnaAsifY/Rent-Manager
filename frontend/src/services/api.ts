import Constants from 'expo-constants';
import { NativeModules, Platform } from 'react-native';

const configuredApiUrl = process.env.EXPO_PUBLIC_API_URL?.trim();

const extractLanIp = (value: unknown) => {
  if (!value) {
    return null;
  }

  const match = String(value).match(/(\d{1,3}(?:\.\d{1,3}){3})/);
  const ip = match && match[1];

  if (!ip || ip === '127.0.0.1' || ip.startsWith('0.')) {
    return null;
  }

  return ip;
};

const resolveApiBaseUrl = () => {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined') {
      const host = window.location.hostname;
      if (host && host !== 'localhost' && host !== '127.0.0.1') {
        return 'http://' + host + ':5000';
      }
    }
    return 'http://localhost:5000';
  }

  const extra = Constants.expoConfig && Constants.expoConfig.extra;
  const extraApiUrl =
    extra && typeof extra.apiUrl === 'string' ? extra.apiUrl.trim() : '';

  if (extraApiUrl) {
    return extraApiUrl.replace(/\/+$/, '');
  }

  if (configuredApiUrl) {
    return configuredApiUrl.replace(/\/+$/, '');
  }

  const expoGo = Constants.expoGoConfig || {};
  const manifest = Constants.manifest || {};
  const manifest2 = Constants.manifest2 || {};
  const expoGoFromManifest =
    manifest2.extra && manifest2.extra.expoGo ? manifest2.extra.expoGo : {};

  const lanIp =
    extractLanIp(Constants.expoConfig && Constants.expoConfig.hostUri) ||
    extractLanIp(expoGo.debuggerHost) ||
    extractLanIp(expoGoFromManifest.debuggerHost) ||
    extractLanIp(manifest.debuggerHost) ||
    extractLanIp(Constants.linkingUri) ||
    extractLanIp(NativeModules.SourceCode && NativeModules.SourceCode.scriptURL);

  if (lanIp) {
    return 'http://' + lanIp + ':5000';
  }

  return 'http://localhost:5000';
};

export const API_BASE_URL = resolveApiBaseUrl();

export class ApiError extends Error {
  status: number;
  code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

export async function apiRequest<T = unknown>(
  path: string,
  options: RequestInit = {},
  token?: string
): Promise<T> {
  const headers = new Headers(options.headers);

  if (options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  if (token) {
    headers.set('Authorization', 'Bearer ' + token);
  }

  try {
    const response = await fetch(API_BASE_URL + path, {
      ...options,
      headers,
    });

    const responseText = await response.text();
    let data: { message?: string; code?: string } = {};

    if (responseText) {
      try {
        data = JSON.parse(responseText) as { message?: string };
      } catch (parseError) {
        data = {};
      }
    }

    if (!response.ok) {
      const message =
        data && typeof data.message === 'string'
          ? data.message
          : 'Request failed';

      throw new ApiError(
        message,
        response.status,
        data && typeof data.code === 'string' ? data.code : undefined
      );
    }

    return data as T;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    throw new ApiError(
      'Unable to connect to server (' +
        API_BASE_URL +
        '). Use the same Wi-Fi as your laptop, run backend on port 5000, and start Expo with LAN (not tunnel).',
      0
    );
  }
}
