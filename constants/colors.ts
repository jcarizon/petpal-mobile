// Exact landing page color palette
export const Colors = {
  // Primary Green - pet/nature/health - primary CTA
  primary: '#10B981',
  primaryLight: '#34D399',
  primaryDark: '#059669',
  primaryBg: '#ECFDF5',

  // Secondary Amber - warm accent, secondary CTA, warnings
  secondary: '#F59E0B',
  secondaryLight: '#FCD34D',
  secondaryDark: '#D97706',
  secondaryBg: '#FFFBEB',

  // Semantic
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  info: '#3B82F6',

  // Neutral scale (F9FAFB → 111827)
  neutral50: '#F9FAFB',
  neutral100: '#F3F4F6',
  neutral200: '#E5E7EB',
  neutral300: '#D1D5DB',
  neutral400: '#9CA3AF',
  neutral500: '#6B7280',
  neutral600: '#4B5563',
  neutral700: '#374151',
  neutral800: '#1F2937',
  neutral900: '#111827',

  // Backgrounds
  background: '#F9FAFB',
  surface: '#FFFFFF',
  border: '#E5E7EB',

  // Text
  textPrimary: '#111827',
  textSecondary: '#6B7280',
  textDisabled: '#9CA3AF',
  textInverse: '#FFFFFF',

  // Service type colors (map pins)
  serviceVet: '#3B82F6',
  serviceGroomer: '#8B5CF6',
  servicePetShop: '#F59E0B',
  servicePark: '#10B981',
  serviceBoarding: '#EF4444',

  // Alert type colors
  alertLost: '#EF4444',
  alertFound: '#10B981',

  // Health score colors
  healthExcellent: '#10B981', // 80-100
  healthGood: '#F59E0B',      // 60-79
  healthFair: '#F97316',      // 40-59
  healthPoor: '#EF4444',      // 0-39

  // Badge colors
  badgeVaxHero: '#3B82F6',
  badgeGroomingPro: '#8B5CF6',
  badgeRescueStar: '#EF4444',
  badgeVetRegular: '#10B981',
  badgeCommunityGuard: '#F59E0B',
  badgePetPalElite: '#F97316',
} as const;

export type ColorKey = keyof typeof Colors;
