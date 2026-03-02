import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthTokens } from '../types';

// ─── Secure Storage (tokens) ─────────────────────────────────────────────────

const ACCESS_TOKEN_KEY = 'petpal_access_token';
const REFRESH_TOKEN_KEY = 'petpal_refresh_token';

export async function saveTokens(tokens: AuthTokens): Promise<void> {
  await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, tokens.accessToken);
  await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, tokens.refreshToken);
}

export async function getTokens(): Promise<AuthTokens | null> {
  const accessToken = await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
  const refreshToken = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);

  if (!accessToken || !refreshToken) return null;
  return { accessToken, refreshToken };
}

export async function clearTokens(): Promise<void> {
  await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
  await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
}

// ─── AsyncStorage (general app data) ────────────────────────────────────────

const ONBOARDING_KEY = 'petpal_onboarding_complete';
const PUSH_TOKEN_KEY = 'petpal_push_token';
const LOCATION_PERMISSION_KEY = 'petpal_location_permission';
const NOTIFICATION_PERMISSION_KEY = 'petpal_notification_permission';

export async function setOnboardingComplete(): Promise<void> {
  await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
}

export async function isOnboardingComplete(): Promise<boolean> {
  const value = await AsyncStorage.getItem(ONBOARDING_KEY);
  return value === 'true';
}

export async function savePushToken(token: string): Promise<void> {
  await AsyncStorage.setItem(PUSH_TOKEN_KEY, token);
}

export async function getPushToken(): Promise<string | null> {
  return AsyncStorage.getItem(PUSH_TOKEN_KEY);
}

export async function setLocationPermission(granted: boolean): Promise<void> {
  await AsyncStorage.setItem(LOCATION_PERMISSION_KEY, granted ? 'true' : 'false');
}

export async function getLocationPermission(): Promise<boolean | null> {
  const value = await AsyncStorage.getItem(LOCATION_PERMISSION_KEY);
  if (value === null) return null;
  return value === 'true';
}

export async function setNotificationPermission(granted: boolean): Promise<void> {
  await AsyncStorage.setItem(NOTIFICATION_PERMISSION_KEY, granted ? 'true' : 'false');
}

export async function getNotificationPermission(): Promise<boolean | null> {
  const value = await AsyncStorage.getItem(NOTIFICATION_PERMISSION_KEY);
  if (value === null) return null;
  return value === 'true';
}

export async function clearAllStorage(): Promise<void> {
  await clearTokens();
  const keys = [ONBOARDING_KEY, PUSH_TOKEN_KEY, LOCATION_PERMISSION_KEY, NOTIFICATION_PERMISSION_KEY];
  await AsyncStorage.multiRemove(keys);
}
