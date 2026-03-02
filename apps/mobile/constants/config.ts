// App configuration constants
export const Config = {
  // API
  API_URL: process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000/api',
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
