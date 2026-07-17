import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

import type { AuthResponse } from '@/services/authService';

const ACCESS_TOKEN_KEY = 'moviezone.accessToken';
const REFRESH_TOKEN_KEY = 'moviezone.refreshToken';
const SESSION_KEY = 'moviezone.session';

export type StoredTokens = { token: string | null; refreshToken: string | null };

export async function getTokens(): Promise<StoredTokens> {
  const [token, refreshToken] = await Promise.all([
    SecureStore.getItemAsync(ACCESS_TOKEN_KEY),
    SecureStore.getItemAsync(REFRESH_TOKEN_KEY),
  ]);
  return { token, refreshToken };
}

export async function setTokens(tokens: StoredTokens): Promise<void> {
  await Promise.all([
    tokens.token
      ? SecureStore.setItemAsync(ACCESS_TOKEN_KEY, tokens.token)
      : SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY),
    tokens.refreshToken
      ? SecureStore.setItemAsync(REFRESH_TOKEN_KEY, tokens.refreshToken)
      : SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY),
  ]);
}

export async function clearTokens(): Promise<void> {
  await Promise.all([
    SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY),
    SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY),
  ]);
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
