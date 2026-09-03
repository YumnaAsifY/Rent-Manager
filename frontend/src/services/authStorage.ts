import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const AUTH_TOKEN_KEY = 'rent_manager_auth_token';

export async function getStoredToken(): Promise<string | null> {
  if (Platform.OS === 'web') {
    return globalThis.localStorage?.getItem(AUTH_TOKEN_KEY) ?? null;
  }

  return SecureStore.getItemAsync(AUTH_TOKEN_KEY);
}

export async function storeToken(token: string): Promise<void> {
  if (Platform.OS === 'web') {
    globalThis.localStorage?.setItem(AUTH_TOKEN_KEY, token);
    return;
  }

  await SecureStore.setItemAsync(AUTH_TOKEN_KEY, token);
}

export async function removeStoredToken(): Promise<void> {
  if (Platform.OS === 'web') {
    globalThis.localStorage?.removeItem(AUTH_TOKEN_KEY);
    return;
  }

  await SecureStore.deleteItemAsync(AUTH_TOKEN_KEY);
}
