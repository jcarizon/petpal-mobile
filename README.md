# PetPal Mobile 🐾

A production-ready React Native Expo mobile application for pet health management, community alerts, and local services discovery.

## 📱 Features

### P0 (Core MVP)
- **Pet Health Tracker** - CRUD pets, health records timeline, health score (0-100), smart suggestions
- **Smart Reminders** - Push notifications 3 days before due dates
- **Services Directory** - Map view with radius filtering, reviews & ratings
- **Lost & Found Alerts** - Post alerts, radius-based push, crowdsourced sightings
- **Authentication** - Email/password, JWT tokens, auto-login, forgot password

### P1 (Community)
- Service reviews & ratings with verified badges
- Achievement badges (6 types)
- XP system with leaderboard (top 20, city-filterable)
- User profile with XP bar, level, badges

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn
- Expo CLI: `npm install -g expo-cli`
- iOS Simulator (macOS) or Android Emulator

### Installation

```bash
cd apps/mobile
npm install
```

### Configuration

```bash
cp .env.example .env
# Edit .env with your API URL and Cloudinary credentials
```

### Running

```bash
# Start Expo dev server
npx expo start

# Run on iOS
npx expo start --ios

# Run on Android
npx expo start --android
```

## 🏗️ Architecture

### Tech Stack
- **React Native** with Expo SDK 51
- **Expo Router** (file-based routing)
- **TypeScript** strict mode
- **Zustand** for state management
- **TanStack Query** for API caching
- **Axios** with JWT interceptors

### File Structure
```
apps/mobile/
├── app/           # Expo Router screens
│   ├── (auth)/   # Auth stack (splash, onboarding, login, register)
│   ├── (tabs)/   # Main tabs (home, pets, community, services, profile)
│   ├── pet/      # Pet detail screens
│   ├── service/  # Service detail screen
│   ├── alert/    # Alert screens
│   └── event/    # Event screens
├── components/    # Reusable components
│   ├── ui/       # Generic UI (Button, Input, Card, Badge, etc.)
│   ├── pet/      # Pet-specific components
│   ├── community/ # Community components
│   └── services/ # Services components
├── store/        # Zustand stores
├── hooks/        # Custom React hooks
├── lib/          # Utilities (api, storage, notifications, utils)
├── constants/    # Colors, config, strings
└── types/        # TypeScript interfaces
```

### Color Palette
| Name | Hex | Usage |
|------|-----|-------|
| Primary Green | `#10B981` | CTA buttons, health indicators |
| Secondary Amber | `#F59E0B` | Warnings, ratings |
| Error Red | `#EF4444` | Lost alerts, errors |
| Info Blue | `#3B82F6` | Informational |

### API Integration
- Centralized Axios client at `lib/api.ts`
- Automatic JWT token refresh on 401
- User-friendly error messages
- Feature-based Zustand stores

## 📦 Building for Production

```bash
# Build for iOS
eas build --platform ios

# Build for Android
eas build --platform android

# Build for both
eas build --platform all
```

## 🧪 Type Checking

```bash
npx tsc --noEmit
```

## 🔧 Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `EXPO_PUBLIC_API_URL` | Backend API URL | `http://localhost:3000/api` |
| `EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name | - |
| `EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET` | Cloudinary upload preset | `petpal_uploads` |
| `EXPO_PUBLIC_DEFAULT_RADIUS_KM` | Default search radius | `5` |
| `EXPO_PUBLIC_REMINDER_DAYS_BEFORE` | Days before reminder fires | `3` |

## 📋 Deep Linking

The app supports deep linking via `petpal://` scheme:
- `petpal://alert/:id` → Alert detail screen
- `petpal://pet/:id` → Pet detail screen
- `petpal://profile` → Profile screen (badges)

## 🏆 Badge System

| Badge | Trigger |
|-------|---------|
| Vax Hero | Add 3+ vaccination records |
| Grooming Pro | Add 5+ grooming records |
| Rescue Star | Report lost/found pet |
| Vet Regular | Add 3+ vet visit records |
| Community Guard | Post 5+ sightings |
| PetPal Elite | Reach Level 10 |

## 📊 Health Score Calculation

Starting from 100 points, deductions apply:
- No vaccination records: -20 pts
- Overdue vaccination: -15 pts
- No vet visits: -10 pts
- Overdue vet visit (6+ months): -10 pts
- No deworming: -5 pts
- No grooming (dogs/cats): -5 pts
- Overdue follow-ups: -5 pts each (max -20)

## 🤝 Contributing

1. Follow the existing TypeScript strict mode patterns
2. Use existing UI components from `components/ui/`
3. Add API calls to the appropriate Zustand store
4. Use TanStack Query for data fetching where applicable

## 📄 License

ISC
