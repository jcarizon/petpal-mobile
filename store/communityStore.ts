import { create } from 'zustand';
import api from '../lib/api';
import { useAuthStore } from './authStore';
import {
  Alert,
  AlertInterest,
  Sighting,
  Badge,
  LeaderboardEntry,
  PetEvent,
  CreateAlertRequest,
  CreateSightingRequest,
  CreateInterestRequest,
  AlertFilters,
  AlertStatus,
} from '../types';

const unwrapApiData = <T>(payload: unknown): T => {
  const maybeWrapped = payload as { data?: unknown };
  return ((maybeWrapped?.data ?? payload) as T);
};

type ApiAlert = {
  id: string;
  userId: string;
  type: string;
  status?: string;
  title: string;
  description?: string;
  photoUrl?: string;
  imageUrl?: string;
  contactPhone?: string;
  latitude?: number;
  longitude?: number;
  city?: string;
  lastSeenLatitude?: number;
  lastSeenLongitude?: number;
  lastSeenAddress?: string;
  sightingCount?: number;
  _count?: { sightings?: number; interests?: number };
  createdAt: string;
  updatedAt: string;
  user?: { id: string; name: string; avatarUrl?: string };
  pet?: {
    id: string;
    name?: string;
    breed?: string;
    species?: string;
    photoUrl?: string;
  } | null;
  sightings?: ApiSighting[];

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
};

const normalizeAlert = (a: ApiAlert): Alert => ({
  id: a.id,
  userId: a.userId,
  userName: a.user?.name ?? '',
  type: (a.type?.toLowerCase() ?? 'lost') as Alert['type'],
  status: (a.status?.toLowerCase() ?? 'active') as Alert['status'],
  title: a.title,
  description: a.description,
  photoUrl: a.photoUrl ?? a.imageUrl ?? a.pet?.photoUrl,
  photos: Array.isArray((a as Record<string, unknown>).alertPhotos)
    ? ((a as Record<string, unknown>).alertPhotos as Array<{ url: string }>).map((p) => p.url)
    : (a.photoUrl ?? a.imageUrl ? [a.photoUrl ?? a.imageUrl ?? ''].filter(Boolean) : undefined),
  petName:    a.pet?.name,
  petBreed:   a.pet?.breed   ?? (a as Record<string, unknown>).petBreed   as string | undefined,
  petSpecies: a.pet?.species ?? (a as Record<string, unknown>).petSpecies as string | undefined,
  userPhone: a.contactPhone,
  latitude: a.lastSeenLatitude ?? a.latitude ?? 0,
  longitude: a.lastSeenLongitude ?? a.longitude ?? 0,
  city: a.lastSeenAddress ?? a.city ?? '',
  sightingCount: a._count?.sightings ?? a.sightingCount ?? 0,
  interestCount: a._count?.interests,
  createdAt: a.createdAt,
  updatedAt: a.updatedAt,

  // Adoption fields
  adoptionReason: a.adoptionReason,
  adoptionFee: a.adoptionFee,
  isNeutered: a.isNeutered,
  isVaccinated: a.isVaccinated,
  idealOwnerNote: a.idealOwnerNote,

  // Playmate fields
  playmatePreferredArea: a.playmatePreferredArea,
  playmateSchedule: a.playmateSchedule,
  playmatePreferredSize: a.playmatePreferredSize as Alert['playmatePreferredSize'],
  playmateEnergyLevel: a.playmateEnergyLevel as Alert['playmateEnergyLevel'],
  playmateVaccineRequired: a.playmateVaccineRequired,
});

type ApiSighting = {
  id: string;
  alertId: string;
  userId: string;
  description: string;
  latitude: number;
  longitude: number;
  photoUrl?: string;
  imageUrl?: string;
  createdAt: string;
  userName?: string;
  user?: { id: string; name?: string; avatarUrl?: string; phone?: string };
};

const normalizeSighting = (s: ApiSighting, fallbackUserName?: string): Sighting => ({
  id: s.id,
  alertId: s.alertId,
  userId: s.userId,
  userName: s.userName ?? s.user?.name ?? fallbackUserName ?? 'Anonymous',
  userPhone: s.user?.phone ?? undefined,
  description: s.description,
  latitude: s.latitude,
  longitude: s.longitude,
  photoUrl: s.photoUrl ?? s.imageUrl,
  createdAt: s.createdAt,
});

type ApiInterest = {
  id: string;
  alertId: string;
  userId: string;
  message?: string | null;
  createdAt: string;
  user?: { id: string; name?: string; avatarUrl?: string; phone?: string };
};

const normalizeInterest = (i: ApiInterest): import('../types').AlertInterest => ({
  id: i.id,
  alertId: i.alertId,
  userId: i.userId,
  userName: i.user?.name ?? '',
  userAvatarUrl: i.user?.avatarUrl,
  userPhone: i.user?.phone ?? undefined,
  message: i.message ?? undefined,
  createdAt: i.createdAt,
});

interface CommunityState {
  alerts: Alert[];
  activeFilters: AlertFilters;
  selectedAlert: Alert | null;
  sightings: Record<string, Sighting[]>;
  interests: Record<string, AlertInterest[]>;
  events: PetEvent[];
  selectedEvent: PetEvent | null;
  badges: Badge[];
  leaderboard: LeaderboardEntry[];
  isLoading: boolean;
  error: string | null;

  fetchAlerts: (filters?: AlertFilters) => Promise<void>;
  setFilters: (filters: AlertFilters) => void;
  clearSelectedAlert: () => void;
  fetchUserAlerts: (userId: string) => Promise<void>;
  fetchAlert: (id: string) => Promise<void>;
  createAlert: (data: CreateAlertRequest) => Promise<Alert>;
  resolveAlert: (id: string) => Promise<void>;

  fetchSightings: (alertId: string) => Promise<void>;
  createSighting: (alertId: string, data: CreateSightingRequest) => Promise<void>;

  fetchInterests: (alertId: string) => Promise<void>;
  createInterest: (alertId: string, data: CreateInterestRequest) => Promise<void>;
  withdrawInterest: (alertId: string) => Promise<void>;

  fetchEvent: (id: string) => Promise<void>;
  rsvpEvent: (eventId: string) => Promise<void>;

  fetchBadges: () => Promise<void>;
  fetchLeaderboard: (city?: string) => Promise<void>;

  clearError: () => void;
}

export const useCommunityStore = create<CommunityState>((set) => ({
  alerts: [],
  activeFilters: { radiusKm: 10 },
  selectedAlert: null,
  sightings: {},
  interests: {},
  events: [],
  selectedEvent: null,
  badges: [],
  leaderboard: [],
  isLoading: false,
  error: null,

  setFilters: (filters: AlertFilters) => set({ activeFilters: filters }),
  clearSelectedAlert: () => set({ selectedAlert: null }),

  fetchAlerts: async (filters?: AlertFilters) => {
    set({ isLoading: true, error: null });
    try {
      const params = new URLSearchParams();
      if (filters?.type) params.append('type', filters.type);
      if (filters?.status) params.append('status', filters.status);
      if (filters?.latitude !== undefined) params.append('lat', String(filters.latitude));
      if (filters?.longitude !== undefined) params.append('lng', String(filters.longitude));
      if (filters?.radiusKm !== undefined) params.append('radius', String(filters.radiusKm));
      if (filters?.city) params.append('city', filters.city);
      if (filters?.search?.trim()) params.append('search', filters.search.trim());
      if (filters?.species) params.append('species', filters.species);
      if (filters?.breed?.trim()) params.append('breed', filters.breed.trim());
      if (filters?.dateRange && filters.dateRange !== 'any') params.append('dateRange', filters.dateRange);

      const query = params.toString();
      const response = await api.get(`/community/lost-found${query ? `?${query}` : ''}`);
      const rawAlerts = unwrapApiData<ApiAlert[]>(response.data);
      let normalized = Array.isArray(rawAlerts) ? rawAlerts.map(normalizeAlert) : [];

      // Client-side nearest sort (distance calc requires coordinates)
      if (filters?.sortBy === 'nearest' && filters.latitude != null && filters.longitude != null) {
        const uLat = filters.latitude;
        const uLng = filters.longitude;
        normalized = normalized.sort((a, b) => {
          const distA = Math.hypot(a.latitude - uLat, a.longitude - uLng);
          const distB = Math.hypot(b.latitude - uLat, b.longitude - uLng);
          return distA - distB;
        });
      }

      set({ alerts: normalized, isLoading: false });
    } catch (err) {
      const message = (err as { message: string }).message ?? 'Failed to fetch alerts';
      set({ error: message, isLoading: false });
    }
  },

  fetchUserAlerts: async (userId: string) => {
    set({ isLoading: true, error: null });
    try {
      const [activeRes, resolvedRes] = await Promise.all([
        api.get('/community/lost-found?status=ACTIVE'),
        api.get('/community/lost-found?status=RESOLVED'),
      ]);
      const activeAlerts = unwrapApiData<ApiAlert[]>(activeRes.data);
      const resolvedAlerts = unwrapApiData<ApiAlert[]>(resolvedRes.data);
      const userActive = Array.isArray(activeAlerts) ? activeAlerts.filter(a => a.userId === userId) : [];
      const userResolved = Array.isArray(resolvedAlerts) ? resolvedAlerts.filter(a => a.userId === userId) : [];
      const allAlerts = [...userActive, ...userResolved];
      set({ alerts: allAlerts.map(normalizeAlert), isLoading: false });
    } catch (err) {
      const message = (err as { message: string }).message ?? 'Failed to fetch user alerts';
      set({ error: message, isLoading: false });
    }
  },

  fetchAlert: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.get(`/community/lost-found/${id}`);
      const raw = unwrapApiData<ApiAlert>(response.data);
      const selectedAlert = normalizeAlert(raw);

      const embeddedSightings: Sighting[] = Array.isArray(raw.sightings)
        ? raw.sightings.map((s) => normalizeSighting(s))
        : [];

      set((state) => ({
        selectedAlert,
        sightings: embeddedSightings.length > 0
          ? { ...state.sightings, [id]: embeddedSightings }
          : state.sightings,
        isLoading: false,
      }));
    } catch (err) {
      const message = (err as { message: string }).message ?? 'Failed to fetch alert';
      set({ error: message, isLoading: false });
    }
  },

  createAlert: async (data: CreateAlertRequest): Promise<Alert> => {
    set({ isLoading: true, error: null });
    try {
      // P0 #3: photoUrl is already a Cloudinary URL (or undefined).
      // The screen uses ImageUploader which uploads before calling this action,
      // so no upload logic is needed here.
      const body: Record<string, unknown> = {
        type: data.type.toUpperCase(),
        title: data.title,
        description: data.description,
        contactPhone: data.contactPhone,
        lastSeenAddress: data.city,
        lastSeenLatitude: data.latitude,
        lastSeenLongitude: data.longitude,
        ...(data.petId ? { petId: data.petId } : {}),
        ...(data.photoUrl ? { photoUrl: data.photoUrl } : {}),

        // Adoption fields
        ...(data.adoptionReason !== undefined ? { adoptionReason: data.adoptionReason } : {}),
        ...(data.adoptionFee !== undefined ? { adoptionFee: data.adoptionFee } : {}),
        ...(data.isNeutered !== undefined ? { isNeutered: data.isNeutered } : {}),
        ...(data.isVaccinated !== undefined ? { isVaccinated: data.isVaccinated } : {}),
        ...(data.idealOwnerNote !== undefined ? { idealOwnerNote: data.idealOwnerNote } : {}),

        // Playmate fields
        ...(data.playmatePreferredArea !== undefined ? { playmatePreferredArea: data.playmatePreferredArea } : {}),
        ...(data.playmateSchedule !== undefined ? { playmateSchedule: data.playmateSchedule } : {}),
        ...(data.playmatePreferredSize !== undefined ? { playmatePreferredSize: data.playmatePreferredSize } : {}),
        ...(data.playmateEnergyLevel !== undefined ? { playmateEnergyLevel: data.playmateEnergyLevel } : {}),
        ...(data.playmateVaccineRequired !== undefined ? { playmateVaccineRequired: data.playmateVaccineRequired } : {}),
      };

      const response = await api.post('/community/lost-found', body);
      const newAlert = normalizeAlert(unwrapApiData<ApiAlert>(response.data));

      set((state) => ({
        alerts: [newAlert, ...state.alerts],
        isLoading: false,
      }));

      return newAlert;
    } catch (err) {
      const message = (err as { message: string }).message ?? 'Failed to create alert';
      set({ error: message, isLoading: false });
      throw err;
    }
  },

  resolveAlert: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.put(`/community/lost-found/${id}/status`, { status: 'RESOLVED' });
      const updated = normalizeAlert(unwrapApiData<ApiAlert>(response.data));
      set((state) => ({
        alerts: state.alerts.map((a) => (a.id === id ? updated : a)),
        selectedAlert: state.selectedAlert?.id === id ? updated : state.selectedAlert,
        isLoading: false,
      }));
    } catch (err) {
      const message = (err as { message: string }).message ?? 'Failed to resolve alert';
      set({ error: message, isLoading: false });
      throw err;
    }
  },

  fetchSightings: async (alertId: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.get(`/community/lost-found/${alertId}/sightings`);
      const list = unwrapApiData<ApiSighting[]>(response.data);
      set((state) => ({
        sightings: {
          ...state.sightings,
          [alertId]: Array.isArray(list) ? list.map((s) => normalizeSighting(s)) : [],
        },
        isLoading: false,
      }));
    } catch (err) {
      const message = (err as { message: string }).message ?? 'Failed to fetch sightings';
      set({ error: message, isLoading: false });
    }
  },

  createSighting: async (alertId: string, data: CreateSightingRequest) => {
    set({ isLoading: true, error: null });
    try {
      // P0 #3: photoUrl is already a Cloudinary URL (or undefined).
      // The caller (AlertDetailScreen) uses ImageUploader or passes a pre-uploaded URL.
      const body = {
        description: data.description,
        latitude: data.latitude,
        longitude: data.longitude,
        ...(data.photoUrl ? { photoUrl: data.photoUrl } : {}),
      };

      const response = await api.post(`/community/lost-found/${alertId}/sightings`, body);
      const raw = unwrapApiData<ApiSighting>(response.data);
      const currentUserName = useAuthStore.getState().user?.name;
      const newSighting = normalizeSighting(raw, currentUserName);

      set((state) => ({
        sightings: {
          ...state.sightings,
          [alertId]: [...(state.sightings[alertId] ?? []), newSighting],
        },
        selectedAlert:
          state.selectedAlert?.id === alertId
            ? {
                ...state.selectedAlert,
                sightingCount: (state.selectedAlert.sightingCount ?? 0) + 1,
              }
            : state.selectedAlert,
        alerts: state.alerts.map((a) =>
          a.id === alertId
            ? { ...a, sightingCount: (a.sightingCount ?? 0) + 1 }
            : a
        ),
        isLoading: false,
      }));
    } catch (err) {
      const message = (err as { message: string }).message ?? 'Failed to add sighting';
      set({ error: message, isLoading: false });
      throw err;
    }
  },

  fetchInterests: async (alertId: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.get(`/community/lost-found/${alertId}/interests`);
      const list = unwrapApiData<ApiInterest[]>(response.data);
      set((state) => ({
        interests: { ...state.interests, [alertId]: Array.isArray(list) ? list.map(normalizeInterest) : [] },
        isLoading: false,
      }));
    } catch (err) {
      const message = (err as { message: string }).message ?? 'Failed to fetch interests';
      set({ error: message, isLoading: false });
    }
  },

  createInterest: async (alertId: string, data: CreateInterestRequest) => {
    set({ isLoading: true, error: null });
    try {
      await api.post(`/community/lost-found/${alertId}/interests`, data);
      set((state) => ({
        alerts: state.alerts.map((a) =>
          a.id === alertId ? { ...a, interestCount: (a.interestCount ?? 0) + 1 } : a
        ),
        selectedAlert:
          state.selectedAlert?.id === alertId
            ? { ...state.selectedAlert, interestCount: (state.selectedAlert.interestCount ?? 0) + 1 }
            : state.selectedAlert,
        isLoading: false,
      }));
    } catch (err) {
      const message = (err as { message: string }).message ?? 'Failed to express interest';
      set({ error: message, isLoading: false });
      throw err;
    }
  },

  withdrawInterest: async (alertId: string) => {
    set({ isLoading: true, error: null });
    try {
      await api.delete(`/community/lost-found/${alertId}/interests/me`);
      set((state) => ({
        alerts: state.alerts.map((a) =>
          a.id === alertId ? { ...a, interestCount: Math.max(0, (a.interestCount ?? 1) - 1) } : a
        ),
        selectedAlert:
          state.selectedAlert?.id === alertId
            ? { ...state.selectedAlert, interestCount: Math.max(0, (state.selectedAlert.interestCount ?? 1) - 1) }
            : state.selectedAlert,
        isLoading: false,
      }));
    } catch (err) {
      const message = (err as { message: string }).message ?? 'Failed to withdraw interest';
      set({ error: message, isLoading: false });
      throw err;
    }
  },

  fetchEvent: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.get(`/community/events/${id}`);
      const raw = unwrapApiData<Record<string, unknown>>(response.data);
      const event: PetEvent = {
        id: raw.id as string,
        title: raw.title as string,
        description: raw.description as string | undefined,
        location: raw.location as string,
        latitude: raw.latitude as number | undefined,
        longitude: raw.longitude as number | undefined,
        startDate: raw.startDate as string,
        endDate: raw.endDate as string | undefined,
        imageUrl: raw.imageUrl as string | undefined,
        maxRsvps: raw.maxRsvps as number | undefined,
        rsvpCount: (raw._count as Record<string, number> | undefined)?.rsvps ?? 0,
        createdAt: raw.createdAt as string,
        updatedAt: raw.updatedAt as string,
      };
      set({ selectedEvent: event, isLoading: false });
    } catch (err) {
      set({ error: (err as { message: string }).message ?? 'Failed to fetch event', isLoading: false });
    }
  },

  rsvpEvent: async (eventId: string) => {
    set({ isLoading: true, error: null });
    try {
      await api.post(`/community/events/${eventId}/rsvp`);
      set((state) => ({
        selectedEvent: state.selectedEvent?.id === eventId
          ? { ...state.selectedEvent, rsvpCount: state.selectedEvent.rsvpCount + 1 }
          : state.selectedEvent,
        isLoading: false,
      }));
    } catch (err) {
      set({ error: (err as { message: string }).message ?? 'Failed to RSVP', isLoading: false });
      throw err;
    }
  },

  fetchBadges: async () => {
    set({ isLoading: true, error: null });
    try {
      const user = useAuthStore.getState().user;
      if (!user) {
        set({ isLoading: false });
        return;
      }
      const response = await api.get(`/gamification/badges/${user.id}`);
      const payload = unwrapApiData<unknown>(response.data);
      
      let badgeList: Badge[] = [];
      
      if (Array.isArray(payload)) {
        badgeList = (payload as Array<{ badge?: Badge; id?: string; earnedAt?: string }>).map((item) => ({
          id: item.badge?.id ?? item.id ?? '',
          type: item.badge?.type ?? 'vax_hero',
          name: item.badge?.name ?? 'Badge',
          description: item.badge?.description ?? '',
          iconUrl: item.badge?.iconUrl,
          earnedAt: item.earnedAt ?? item.badge?.earnedAt ?? new Date().toISOString(),
        }));
      } else if (Array.isArray((payload as { data?: unknown[] }).data)) {
        const data = (payload as { data: Array<{ badge?: Badge; id?: string; earnedAt?: string }> }).data;
        badgeList = data.map((item) => ({
          id: item.badge?.id ?? item.id ?? '',
          type: item.badge?.type ?? 'vax_hero',
          name: item.badge?.name ?? 'Badge',
          description: item.badge?.description ?? '',
          iconUrl: item.badge?.iconUrl,
          earnedAt: item.earnedAt ?? item.badge?.earnedAt ?? new Date().toISOString(),
        }));
      }

      set({ badges: badgeList, isLoading: false });
    } catch (err) {
      const message = (err as { message: string }).message ?? 'Failed to fetch badges';
      set({ error: message, isLoading: false });
    }
  },

  fetchLeaderboard: async (city?: string) => {
    set({ isLoading: true, error: null });
    try {
      const query = city ? `?city=${encodeURIComponent(city)}` : '';
      const response = await api.get<LeaderboardEntry[]>(`/gamification/leaderboard${query}`);
      set({ leaderboard: response.data, isLoading: false });
    } catch (err) {
      const message = (err as { message: string }).message ?? 'Failed to fetch leaderboard';
      set({ error: message, isLoading: false });
    }
  },

  clearError: () => set({ error: null }),
}));
