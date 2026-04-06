// Refined color system for consistent font hierarchy and banner gradients
export const Colors = {
  primary: '#0F8554',
  primaryLight: '#64D9A6',
  primaryDark: '#0A6B46',
  primaryBg: '#E6F9F2',

  secondary: '#F59E0B',
  secondaryLight: '#FCD34D',
  secondaryDark: '#C2410C',
  secondaryBg: '#FFF8E1',

  success: '#22C55E',
  successBg: '#DCFCE7',
  warning: '#F97316',
  error: '#EF4444',
  info: '#0EA5E9',

  neutral50: '#F5F7FA',
  neutral100: '#EFF2F7',
  neutral200: '#E3E7F0',
  neutral300: '#C8CBD7',
  neutral400: '#94A3B8',
  neutral500: '#64748B',
  neutral600: '#475569',
  neutral700: '#334155',
  neutral800: '#1E293B',
  neutral900: '#0F172A',

  background: '#F4F7FB',
  surface: '#FFFFFF',
  border: '#E2E8F0',

  textPrimary: '#0F172A',
  textSecondary: '#475569',
  textDisabled: '#94A3B8',
  textInverse: '#FFFFFF',

  heroGradientStart: '#0A6B46',
  heroGradientEnd: '#34D399',
  cardGradientStart: '#E6F9F2',
  cardGradientEnd: '#D1F5EC',
  bannerGradientStart: '#0F766E',
  bannerGradientMid: '#14B8A6',
  bannerGradientEnd: '#38BDF8',
  statChipBg: '#F1F9F6',
  accentText: '#047857',

  serviceVet: '#3B82F6',
  serviceGroomer: '#8B5CF6',
  servicePetShop: '#F59E0B',
  servicePark: '#10B981',
  serviceBoarding: '#EF4444',

  alertLost: '#EF4444',
  alertFound: '#10B981',

  healthExcellent: '#10B981', // 80-100
  healthGood: '#F59E0B',      // 60-79
  healthFair: '#F97316',      // 40-59
  healthPoor: '#EF4444',      // 0-39

  badgeVaxHero: '#3B82F6',
  badgeGroomingPro: '#8B5CF6',
  badgeRescueStar: '#EF4444',
  badgeVetRegular: '#10B981',
  badgeCommunityGuard: '#F59E0B',
  badgePetPalElite: '#F97316',
} as const;

export type ColorKey = keyof typeof Colors;
