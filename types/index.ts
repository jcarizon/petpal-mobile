// All TypeScript interfaces matching backend schemas

// ─── Auth ───────────────────────────────────────────────────────────────────

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  city: string;
  avatarUrl?: string;
  totalXP: number;
  createdAt: string;
  role: string;
  businessName?: string;
  businessBio?: string;
}

export type ProviderRole = 'SERVICE_PROVIDER' | 'VET' | 'GROOMER' | 'ADMIN';
export const isServiceProvider = (role?: string): boolean =>
  ['SERVICE_PROVIDER', 'VET', 'GROOMER', 'ADMIN'].includes(role ?? '');

export interface AuthTokens {
  accessToken: string;
  refreshToken?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  name: string;
  email: string;
  phone?: string;
  password: string;
  city: string;
}

export interface ResetPasswordRequest {
  token: string;
  password: string;
}

export interface AuthResponse {
  user: User;
  tokens: AuthTokens;
}

// ─── Pets ────────────────────────────────────────────────────────────────────

export type PetType = 'dog' | 'cat' | 'bird' | 'rabbit' | 'hamster' | 'fish' | 'other';

export interface Pet {
  id: string;
  userId: string;
  name: string;
  type: PetType;
  breed?: string;
  description?: string;
  behaviour?: string;
  birthDate?: string;
  weight?: number;
  photoUrl?: string;
  avatarUrl?: string;
  healthScore?: number;
  createdAt: string;
  updatedAt: string;
  species?: string;
  activeLostFoundAlert?: {
    id: string;
    type: 'lost' | 'found';
    status: 'active';
  } | null;
  photos?: PetPhoto[];
}

export interface PetPhoto {
  id: string;
  url: string;
  createdAt: string;
}

export interface CreatePetRequest {
  name: string;
  type: PetType;
  breed?: string;
  description?: string;
  behaviour?: string;
  birthDate?: string;
  weight?: number;
  photoUrl?: string;
}

export type UpdatePetRequest = Partial<CreatePetRequest>;

// ─── Health Records ──────────────────────────────────────────────────────────

export type HealthRecordType =
  | 'vaccination'
  | 'vet_visit'
  | 'grooming'
  | 'medication'
  | 'weight'
  | 'deworming'
  | 'dental'
  | 'surgery'
  | 'other';

export interface HealthRecord {
  id: string;
  petId: string;
  type: HealthRecordType;
  title: string;
  date: string;
  vetName?: string;
  notes?: string;
  photoUrl?: string;
  nextDueDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateHealthRecordRequest {
  type: HealthRecordType;
  title: string;
  date: string;
  vetName?: string;
  notes?: string;
  photoUrl?: string;
  nextDueDate?: string;
}

// ─── Reminders ───────────────────────────────────────────────────────────────

export interface Reminder {
  id: string;
  petId: string;
  title: string;
  dueDate: string;
  type: HealthRecordType;
  isCompleted: boolean;
  createdAt: string;
  description?: string;
}

export interface CreateReminderRequest {
  title: string;
  dueDate: string;
  type: HealthRecordType;
  description?: string;
}

// ─── Services ────────────────────────────────────────────────────────────────

export type ServiceType =
  | 'vet' | 'emergency_vet' | 'groomer' | 'pet_store' | 'pet_hotel'
  | 'daycare' | 'trainer' | 'spa' | 'shelter' | 'photography' | 'transportation' | 'pharmacy'
  // legacy aliases kept for backwards compat
  | 'pet_shop' | 'park' | 'boarding' | 'other';

export interface Service {
  id: string;
  ownerId?: string;
  ownerName?: string;
  ownerAvatarUrl?: string;
  name: string;
  type: ServiceType;
  types?: ServiceType[];
  address: string;
  city: string;
  latitude: number;
  longitude: number;
  phone?: string;
  email?: string;
  website?: string;
  description?: string;
  logoUrl?: string;
  photos: string[];
  openingHours?: Record<string, string>;
  tags?: string[];
  specialties?: string[];
  facebook?: string;
  instagram?: string;
  rating: number;
  reviewCount: number;
  isVerified: boolean;
  isHighlyRecommended: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ServiceFilters {
  type?: ServiceType;
  city?: string;
  latitude?: number;
  longitude?: number;
  radiusKm?: number;
  query?: string;
}

// ─── Reviews ─────────────────────────────────────────────────────────────────

export interface Review {
  id: string;
  serviceId: string;
  userId: string;
  userName: string;
  userAvatarUrl?: string;
  rating: number;
  comment?: string;
  createdAt: string;
}

export interface CreateReviewRequest {
  rating: number;
  comment?: string;
}

// ─── Alerts ──────────────────────────────────────────────────────────────────

export type AlertType = 'lost' | 'found';
export type AlertStatus = 'active' | 'resolved';

export interface Alert {
  id: string;
  userId: string;
  userName: string;
  userAvatarUrl?: string;
  userPhone?: string;
  contactPhone?: string;
  petId?: string | number;
  type: AlertType;
  status: AlertStatus;
  title: string;
  description?: string;
  photoUrl?: string;
  petName?: string;
  petBreed?: string;
  latitude: number;
  longitude: number;
  city: string;
  photos?: string[];
  sightingCount: number;
  createdAt: string;
  updatedAt: string;
  petSpecies?: string;
}

export interface CreateAlertRequest {
  type: AlertType;
  title: string;
  description?: string;
  photoUrl?: string;
  photos?: string[];
  petName?: string;
  petBreed?: string;
  latitude: number;
  longitude: number;
  city: string;
  contactPhone?: string;
  petId?: string | number;
}

export interface AlertFilters {
  type?: AlertType;
  status?: AlertStatus;
  latitude?: number;
  longitude?: number;
  radiusKm?: number;
  city?: string;
  search?: string;
  species?: string;
  breed?: string;
  dateRange?: 'any' | '24h' | '7d' | '30d';
  sortBy?: 'newest' | 'nearest';
}

// ─── Alert Interests (removed — moved to PawMatch) ───────────────────────────

export interface AlertInterest {
  id: string;
  alertId: string;
  userId: string;
  userName: string;
  userAvatarUrl?: string;
  userPhone?: string;
  message?: string;
  createdAt: string;
}

export interface CreateInterestRequest {
  message?: string;
}

// ─── Sightings ───────────────────────────────────────────────────────────────

export interface Sighting {
  id: string;
  alertId: string;
  userId: string;
  userName: string;
  userPhone?: string;
  description: string;
  latitude: number;
  longitude: number;
  photoUrl?: string;
  createdAt: string;
}

export interface CreateSightingRequest {
  description: string;
  latitude: number;
  longitude: number;
  photoUrl?: string;
}

// ─── Badges ──────────────────────────────────────────────────────────────────

export type BadgeType =
  | 'vax_hero'
  | 'grooming_pro'
  | 'rescue_star'
  | 'vet_regular'
  | 'community_guard'
  | 'pawrok_elite';

export interface Badge {
  id: string;
  type: BadgeType;
  name: string;
  description: string;
  iconUrl?: string;
  earnedAt: string;
}

// ─── Leaderboard ─────────────────────────────────────────────────────────────

export interface LeaderboardEntry {
  rank: number;
  id: string;
  name: string;
  avatarUrl?: string;
  city: string;
  totalXP: number;
  userId?: string;
  badgeCount: number;
}

// ─── Events ──────────────────────────────────────────────────────────────────

export interface PetEvent {
  id: string;
  title: string;
  description?: string;
  location: string;
  latitude?: number;
  longitude?: number;
  startDate: string;
  endDate?: string;
  imageUrl?: string;
  maxRsvps?: number;
  rsvpCount: number;
  hasRsvp?: boolean;
  reactionCount?: number;
  commentCount?: number;
  creatorId?: string;
  creatorName?: string;
  creatorAvatarUrl?: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Unified Community Feed ──────────────────────────────────────────────────

export interface DiaryFeedEntry extends PetDiary {
  pet: {
    id: string;
    name: string;
    avatarUrl?: string;
    species: string;
    breed?: string;
    owner: { id: string; name: string; avatarUrl?: string; city?: string; latitude?: number; longitude?: number };
  };
  reactionCount?: number;
  commentCount?: number;
  userReacted?: boolean;
}

export interface DiaryReactionState {
  count: number;
  reacted: boolean;
}

export interface EventReactionState {
  count: number;
  reacted: boolean;
}

export interface EventComment {
  id: string;
  eventId: string;
  userId: string;
  content: string;
  createdAt: string;
  user: { id: string; name: string; avatarUrl?: string };
}

export interface DiaryComment {
  id: string;
  diaryId: string;
  userId: string;
  content: string;
  createdAt: string;
  user: { id: string; name: string; avatarUrl?: string };
}

export type FeedItemKind = 'alert' | 'story' | 'event';

export interface FeedItem {
  kind: FeedItemKind;
  sortDate: string;
  alert?: Alert;
  story?: DiaryFeedEntry;
  event?: PetEvent;
}

// ─── Notifications ───────────────────────────────────────────────────────────

export type NotificationChannel = 'PUSH' | 'SMS' | 'EMAIL';
export type NotificationStatus = 'PENDING' | 'SENT' | 'FAILED';

export interface NotificationLog {
  id: string;
  userId: string;
  channel: NotificationChannel;
  type?: PushNotificationData['type'];
  title: string;
  body: string;
  status: NotificationStatus;
  sentAt?: string;
  createdAt: string;
}

// ─── API Response ────────────────────────────────────────────────────────────

export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export interface ApiError {
  message: string;
  code?: string;
  statusCode?: number;
}

// ─── Location ────────────────────────────────────────────────────────────────

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface LocationState {
  coordinates: Coordinates | null;
  city: string | null;
  hasPermission: boolean;
  isLoading: boolean;
  error: string | null;
}

// ─── Notifications ───────────────────────────────────────────────────────────

export interface PushNotificationData {
  type: 'reminder' | 'alert' | 'sighting' | 'badge' | 'interest' | 'level_up' | 'review' | 'welcome' | 'role_change' | 'service_verified' | 'chat_request' | 'chat_message' | 'chat_accepted';
  id?: string;
  conversationId?: string;
  title: string;
  body: string;
}

// ─── Chat ─────────────────────────────────────────────────────────────────────

export type ChatStatus = 'PENDING' | 'ACTIVE' | 'DECLINED';

export interface ChatConversation {
  id: string;
  alertId: string;
  alertTitle: string;
  initiatorId: string;
  initiatorName: string;
  recipientId: string;
  recipientName: string;
  status: ChatStatus;
  lastMessage?: string | null;
  lastMessageAt?: string | null;
  unreadCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  content: string;
  isRead: boolean;
  createdAt: string;
}

// ─── Health Score ────────────────────────────────────────────────────────────

export interface HealthScoreBreakdown {
  score: number;
  label: 'Excellent' | 'Good' | 'Fair' | 'Poor';
  deductions: {
    reason: string;
    points: number;
  }[];
  suggestions: HealthSuggestion[];
}

export interface HealthSuggestion {
  id: string;
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  type: HealthRecordType;
}

// ─── Pet Diary ──────────────────────────────────────────────────────────────

export type DiaryMood = 'happy' | 'excited' | 'calm' | 'tired' | 'anxious' | 'sick' | 'playful';

export type DiaryActivity =
  | 'walk'
  | 'play'
  | 'training'
  | 'grooming'
  | 'vet_visit'
  | 'feeding'
  | 'sleeping'
  | 'swimming'
  | 'other';

export type DiaryVisibility = 'PRIVATE' | 'PUBLIC' | 'MATCHES_ONLY';

export interface PetDiary {
  id: string;
  petId: string;
  title: string;
  content: string;
  mood?: DiaryMood;
  imageUrl?: string;
  videoUrl?: string;
  activity?: DiaryActivity;
  visibility: DiaryVisibility;
  storyExpiresAt?: string | null;
  storyOrientation?: 'portrait' | 'landscape';
  createdAt: string;
  updatedAt: string;
}

export interface CreateDiaryRequest {
  title: string;
  content: string;
  mood?: DiaryMood;
  imageUrl?: string;
  videoUrl?: string;
  activity?: DiaryActivity;
  visibility?: DiaryVisibility;
  shareAsStory?: boolean;
  storyOrientation?: 'portrait' | 'landscape';
}

// ─── PawMatch ────────────────────────────────────────────────────────────────

export type MatchMode = 'BREED' | 'ADOPT' | 'PLAYDATE';
export type SwipeDirection = 'LIKE' | 'PASS';

export interface PawMatchProfile {
  id: string;
  petId: string;
  mode: MatchMode;
  isActive: boolean;
  bio?: string;
  preferredRadius: number;
  // Breed
  pedigreeNote?: string;
  // Adopt
  adoptionFee?: number;
  isNeutered?: boolean;
  isVaccinated?: boolean;
  idealOwnerNote?: string;
  adoptionReason?: string;
  // Playdate
  preferredArea?: string;
  schedule?: string;
  preferredSize?: 'small' | 'medium' | 'large' | 'any';
  energyLevel?: 'low' | 'medium' | 'high' | 'any';
  vaccineRequired?: boolean;
  createdAt: string;
  updatedAt: string;
  pet?: {
    id: string;
    name: string;
    species: string;
    breed?: string;
    avatarUrl?: string;
    owner?: {
      id: string;
      name: string;
      city?: string;
      latitude?: number;
      longitude?: number;
    };
    photos?: { id: string; url: string }[];
  };
}

export interface SwipeResult {
  matched: boolean;
  matchId?: string;
  conversationId?: string;
  modeLabel?: string;
  petAName?: string;
  petBName?: string;
}

export interface AdoptionInterestResult {
  requested: boolean;
  profileId: string;
  petId: string;
  petName: string;
  ownerId: string;
  matchId?: string;
  conversationId?: string;
}

export interface PawMatch {
  id: string;
  mode: MatchMode;
  profileAId: string;
  profileBId: string;
  isActive: boolean;
  createdAt: string;
  profileA: PawMatchProfile;
  profileB: PawMatchProfile;
  conversation?: PawMatchConversation;
}

export interface PawMatchConversation {
  id: string;
  matchId: string;
  status: 'PENDING' | 'ACTIVE' | 'DECLINED';
  createdAt: string;
  messages: PawMatchMessage[];
}

export interface PawMatchMessage {
  id: string;
  conversationId: string;
  senderPetId: string;
  content?: string;
  mediaUrl?: string;
  readAt?: string;
  createdAt: string;
}

// ─── Unified Chat ────────────────────────────────────────────────────────────

export type ChatKind = 'community' | 'pawmatch';
export type ChatBadge = 'LOST' | 'FOUND' | 'BREED' | 'ADOPT' | 'PLAYDATE';

export interface UnifiedConversation {
  /** conversationId for community, matchId for pawmatch */
  id: string;
  kind: ChatKind;
  badge: ChatBadge;
  status: 'PENDING' | 'ACTIVE' | 'DECLINED';
  /** conversationId (for pawmatch messages endpoint) */
  conversationId?: string;
  otherPersonName: string;
  otherPersonAvatarUrl?: string;
  /** alert title OR "PetName · mode" */
  subtitle: string;
  lastMessage?: string;
  lastMessageAt?: string;
  unreadCount: number;
  /** true = current user started this conversation */
  isInitiator: boolean;
}

export interface CreatePawMatchProfileRequest {
  petId: string;
  mode: MatchMode;
  bio?: string;
  preferredRadius?: number;
  pedigreeNote?: string;
  adoptionFee?: number;
  isNeutered?: boolean;
  isVaccinated?: boolean;
  idealOwnerNote?: string;
  adoptionReason?: string;
  preferredArea?: string;
  schedule?: string;
  preferredSize?: 'small' | 'medium' | 'large' | 'any';
  energyLevel?: 'low' | 'medium' | 'high' | 'any';
  vaccineRequired?: boolean;
}
