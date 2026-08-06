import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

import type { AuthResponse } from '@/services/authService';

const ACCESS_TOKEN_KEY = 'moviezone.accessToken';
const REFRESH_TOKEN_KEY = 'moviezone.refreshToken';
const SESSION_KEY = 'moviezone.session';

// expo-secure-store chỉ có bản triển khai cho iOS/Android (Keychain/Keystore),
// không hỗ trợ web — trên web phải dùng AsyncStorage (đã có polyfill localStorage).
const isWeb = Platform.OS === 'web';

async function getItem(key: string): Promise<string | null> {
  return isWeb ? AsyncStorage.getItem(key) : SecureStore.getItemAsync(key);
}

async function setItem(key: string, value: string): Promise<void> {
  await (isWeb ? AsyncStorage.setItem(key, value) : SecureStore.setItemAsync(key, value));
}

async function deleteItem(key: string): Promise<void> {
  await (isWeb ? AsyncStorage.removeItem(key) : SecureStore.deleteItemAsync(key));
}

export type StoredTokens = { token: string | null; refreshToken: string | null };

export async function getTokens(): Promise<StoredTokens> {
  const [token, refreshToken] = await Promise.all([
    getItem(ACCESS_TOKEN_KEY),
    getItem(REFRESH_TOKEN_KEY),
  ]);
  return { token, refreshToken };
}

export async function setTokens(tokens: StoredTokens): Promise<void> {
  await Promise.all([
    tokens.token ? setItem(ACCESS_TOKEN_KEY, tokens.token) : deleteItem(ACCESS_TOKEN_KEY),
    tokens.refreshToken ? setItem(REFRESH_TOKEN_KEY, tokens.refreshToken) : deleteItem(REFRESH_TOKEN_KEY),
  ]);
}

export async function clearTokens(): Promise<void> {
  await Promise.all([deleteItem(ACCESS_TOKEN_KEY), deleteItem(REFRESH_TOKEN_KEY)]);
}

export async function getStoredSession(): Promise<AuthResponse | null> {
  const raw = await AsyncStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthResponse;
  } catch {
    return null;
  }
}

export async function setStoredSession(session: AuthResponse): Promise<void> {
  await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export async function clearStoredSession(): Promise<void> {
  await AsyncStorage.removeItem(SESSION_KEY);
}
