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
}

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

export type ServiceType = 'vet' | 'groomer' | 'pet_shop' | 'park' | 'boarding' | 'other';

export interface Service {
  id: string;
  name: string;
  type: ServiceType;
  types?: ServiceType[]; // All applicable service types for combination businesses
  address: string;
  city: string;
  latitude: number;
  longitude: number;
  phone?: string;
  website?: string;
  hours?: string;
  description?: string;
  photoUrls?: string[];
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

export type AlertType = 'lost' | 'found' | 'adoption' | 'playmate';
export type AlertStatus = 'active' | 'resolved';

export interface Alert {
  id: string;
  userId: string;
  userName: string;
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
  interestCount?: number;
  createdAt: string;
  updatedAt: string;
  petSpecies?: string;

  // Adoption fields
  adoptionReason?: string;
  adoptionFee?: number;
  isNeutered?: boolean;
  isVaccinated?: boolean;
  idealOwnerNote?: string;

  // Playmate fields
  playmatePreferredArea?: string;
  playmateSchedule?: string;
  playmatePreferredSize?: 'small' | 'medium' | 'large' | 'any';
  playmateEnergyLevel?: 'low' | 'medium' | 'high' | 'any';
  playmateVaccineRequired?: boolean;
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

  // Adoption fields
  adoptionReason?: string;
  adoptionFee?: number;
  isNeutered?: boolean;
  isVaccinated?: boolean;
  idealOwnerNote?: string;

  // Playmate fields
  playmatePreferredArea?: string;
  playmateSchedule?: string;
  playmatePreferredSize?: string;
  playmateEnergyLevel?: string;
  playmateVaccineRequired?: boolean;
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

// ─── Alert Interests ─────────────────────────────────────────────────────────

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
  | 'petpal_elite';

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
  createdAt: string;
  updatedAt: string;
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

export interface PetDiary {
  id: string;
  petId: string;
  title: string;
  content: string;
  mood?: DiaryMood;
  imageUrl?: string;
  activity?: DiaryActivity;
  createdAt: string;
  updatedAt: string;
}

export interface CreateDiaryRequest {
  title: string;
  content: string;
  mood?: DiaryMood;
  imageUrl?: string;
  activity?: DiaryActivity;
}
