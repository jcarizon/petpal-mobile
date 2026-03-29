// All UI copy strings
export const Strings = {
  // App
  APP_NAME: 'PetPal',
  APP_TAGLINE: 'Your pet\'s health companion',

  // Onboarding
  ONBOARDING_1_TITLE: 'Track Your Pet\'s Health',
  ONBOARDING_1_DESC: 'Monitor vaccinations, vet visits, and health records all in one place.',
  ONBOARDING_2_TITLE: 'Find Nearby Services',
  ONBOARDING_2_DESC: 'Discover vets, groomers, pet shops, and parks near you with real reviews.',
  ONBOARDING_3_TITLE: 'Community Alerts',
  ONBOARDING_3_DESC: 'Help reunite lost pets and connect with your local pet community.',
  ONBOARDING_SKIP: 'Skip',
  ONBOARDING_NEXT: 'Next',
  ONBOARDING_GET_STARTED: 'Get Started',

  // Auth
  LOGIN_TITLE: 'Welcome back',
  LOGIN_SUBTITLE: 'Sign in to your PetPal account',
  LOGIN_EMAIL: 'Email address',
  LOGIN_PASSWORD: 'Password',
  LOGIN_FORGOT: 'Forgot password?',
  LOGIN_SUBMIT: 'Sign In',
  LOGIN_REGISTER_PROMPT: 'Don\'t have an account?',
  LOGIN_REGISTER_LINK: 'Sign up',

  REGISTER_TITLE: 'Create account',
  REGISTER_SUBTITLE: 'Join the PetPal community',
  REGISTER_NAME: 'Full name',
  REGISTER_EMAIL: 'Email address',
  REGISTER_PHONE: 'Phone number',
  REGISTER_PASSWORD: 'Password',
  REGISTER_CITY: 'City',
  REGISTER_SUBMIT: 'Create Account',
  REGISTER_LOGIN_PROMPT: 'Already have an account?',
  REGISTER_LOGIN_LINK: 'Sign in',

  FORGOT_TITLE: 'Reset password',
  FORGOT_SUBTITLE: 'Enter your email to receive a reset link',
  FORGOT_EMAIL: 'Email address',
  FORGOT_SUBMIT: 'Send Reset Link',
  FORGOT_SUCCESS: 'Reset link sent to your email',

  // Navigation tabs
  TAB_HOME: 'Home',
  TAB_PETS: 'My Pets',
  TAB_COMMUNITY: 'Community',
  TAB_SERVICES: 'Services',
  TAB_PROFILE: 'Profile',

  // Home
  HOME_GREETING_MORNING: 'Good morning',
  HOME_GREETING_AFTERNOON: 'Good afternoon',
  HOME_GREETING_EVENING: 'Good evening',
  HOME_NO_PETS: 'Add your first pet',
  HOME_REMINDERS_TITLE: 'Today\'s Reminders',
  HOME_NO_REMINDERS: 'No reminders today',
  HOME_ALERTS_TITLE: 'Community Alerts',
  HOME_QUICK_ACTIONS: 'Quick Actions',
  HOME_ADD_RECORD: 'Add Record',
  HOME_REPORT_LOST: 'Report Lost',
  HOME_BROWSE_SERVICES: 'Browse Services',

  // Pets
  PETS_TITLE: 'My Pets',
  PETS_ADD: 'Add Pet',
  PETS_NO_PETS: 'No pets yet',
  PETS_NO_PETS_DESC: 'Add your first pet to start tracking their health.',
  PET_HEALTH_SCORE: 'Health Score',
  PET_ADD_RECORD: 'Add Health Record',
  PET_EDIT: 'Edit Pet',
  PET_DELETE: 'Delete Pet',
  PET_DELETE_CONFIRM: 'Are you sure you want to delete this pet?',
  PET_TIMELINE_TITLE: 'Health Timeline',
  PET_SUGGESTIONS_TITLE: 'Smart Suggestions',
  PET_REMINDERS_TITLE: 'Reminders',

  // Community
  COMMUNITY_TITLE: 'Community',
  COMMUNITY_ALL: 'All',
  COMMUNITY_LOST: 'Lost',
  COMMUNITY_FOUND: 'Found',
  COMMUNITY_CREATE_ALERT: 'Report Alert',
  COMMUNITY_NO_ALERTS: 'No alerts in your area',
  COMMUNITY_NO_ALERTS_DESC: 'Be the first to report a lost or found pet.',
  SIGHTING_ADD: 'I Saw This Pet',

  // Services
  SERVICES_TITLE: 'Services',
  SERVICES_MAP_VIEW: 'Map',
  SERVICES_LIST_VIEW: 'List',
  SERVICES_FILTER_TYPE: 'Type',
  SERVICES_FILTER_RADIUS: 'Radius',
  SERVICES_NO_RESULTS: 'No services found',
  SERVICES_NO_RESULTS_DESC: 'Try adjusting your filters or search radius.',
  SERVICES_WRITE_REVIEW: 'Write a Review',

  // Profile
  PROFILE_TITLE: 'Profile',
  PROFILE_XP_LEVEL: 'Level',
  PROFILE_BADGES: 'Badges',
  PROFILE_MY_POSTS: 'My Posts',
  PROFILE_SETTINGS: 'Settings',
  PROFILE_NOTIFICATIONS: 'Notifications',
  PROFILE_LOCATION: 'Location',
  PROFILE_LOGOUT: 'Sign Out',
  PROFILE_LOGOUT_CONFIRM: 'Are you sure you want to sign out?',

  // Badge names
  BADGE_VAX_HERO: 'Vax Hero',
  BADGE_GROOMING_PRO: 'Grooming Pro',
  BADGE_RESCUE_STAR: 'Rescue Star',
  BADGE_VET_REGULAR: 'Vet Regular',
  BADGE_COMMUNITY_GUARD: 'Community Guard',
  BADGE_PETPAL_ELITE: 'PetPal Elite',

  // Common
  SAVE: 'Save',
  CANCEL: 'Cancel',
  DELETE: 'Delete',
  EDIT: 'Edit',
  ADD: 'Add',
  SUBMIT: 'Submit',
  LOADING: 'Loading...',
  ERROR_GENERIC: 'Something went wrong. Please try again.',
  ERROR_NETWORK: 'Network error. Check your connection.',
  ERROR_AUTH: 'Invalid email or password.',
  RETRY: 'Retry',
  SEE_ALL: 'See all',
  VERIFIED: 'Verified',
  HIGHLY_RECOMMENDED: 'Highly Recommended',
} as const;
