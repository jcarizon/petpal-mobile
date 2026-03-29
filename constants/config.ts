import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Device from 'expo-device';

const getExpoLanApiUrl = (): string | null => {
  const hostUri =
    Constants.expoConfig?.hostUri ||
    (Constants as unknown as { manifest2?: { extra?: { expoGo?: { debuggerHost?: string } } } })
      .manifest2?.extra?.expoGo?.debuggerHost;

  if (!hostUri) return null;
  const host = hostUri.split(':')[0];
  if (!host || host === 'localhost' || host === '127.0.0.1') return null;
  return `http://${host}:3000/api`;
};

const getApiUrl = (): string => {
  const envUrl = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000/api';
  const isLoopbackUrl =
    envUrl.includes('localhost') ||
    envUrl.includes('127.0.0.1') ||
    envUrl.includes('10.0.2.2') ||
    envUrl.includes('10.0.3.2');

  if (Platform.OS === 'android') {
    if (Device.isDevice && isLoopbackUrl) {
      const localFallback = envUrl
        .replace('10.0.2.2', 'localhost')
        .replace('10.0.3.2', 'localhost')
        .replace('127.0.0.1', 'localhost');
      return getExpoLanApiUrl() ?? localFallback;
    }
    return envUrl.replace('localhost', '10.0.2.2').replace('127.0.0.1', '10.0.2.2');
  }

  return envUrl;
};

// App configuration constants
export const Config = {
  // API
  API_URL: getApiUrl(),
  API_TIMEOUT: 15000,

  // Cloudinary
  CLOUDINARY_CLOUD_NAME: process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME ?? '',
  CLOUDINARY_UPLOAD_PRESET: process.env.EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET ?? 'petpal_uploads',

  // Geofencing defaults (km)
  DEFAULT_RADIUS_KM: Number(process.env.EXPO_PUBLIC_DEFAULT_RADIUS_KM ?? 5),
  MAX_RADIUS_KM: Number(process.env.EXPO_PUBLIC_MAX_RADIUS_KM ?? 50),
  RADIUS_OPTIONS: [1, 5, 10, 25, 50],

  // Notifications
  REMINDER_DAYS_BEFORE: Number(process.env.EXPO_PUBLIC_REMINDER_DAYS_BEFORE ?? 3),

  // Pagination
  PAGE_SIZE: 20,
  LEADERBOARD_SIZE: 20,

  // Feature flags
  ENABLE_SMS: process.env.EXPO_PUBLIC_ENABLE_SMS === 'true',
  ENABLE_LEADERBOARD: process.env.EXPO_PUBLIC_ENABLE_LEADERBOARD !== 'false',

  // App version
  APP_VERSION: process.env.EXPO_PUBLIC_APP_VERSION ?? '1.0.0',

  // Health score
  HEALTH_SCORE_MAX: 100,
  HEALTH_SCORE_MIN: 0,

  // XP awards
  XP_ADD_PET: 50,
  XP_ADD_HEALTH_RECORD: 20,
  XP_REPORT_LOST: 30,
  XP_ADD_SIGHTING: 25,
  XP_WRITE_REVIEW: 15,
  XP_FIRST_LOGIN: 10,

  // Verified badge threshold
  VERIFIED_MIN_RATING: 4.7,
  VERIFIED_MIN_REVIEWS: 10,
} as const;

// City options for Cebu
export const CEBU_CITIES = [
  'Cebu City',
  'Mandaue City',
  'Lapu-Lapu City',
  'Talisay City',
  'Danao City',
  'Toledo City',
  'Carcar City',
  'Naga City',
  'Consolacion',
  'Liloan',
  'Cordova',
  'San Fernando',
  'Minglanilla',
  'Compostela',
  'Other',
] as const;

export type CebuCity = (typeof CEBU_CITIES)[number];
