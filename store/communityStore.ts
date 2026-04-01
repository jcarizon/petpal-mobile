import { create } from 'zustand';
import api from '../lib/api';
import { useAuthStore } from './authStore';
import {
  Alert,
  Sighting,
  Badge,
  LeaderboardEntry,
  CreateAlertRequest,
  CreateSightingRequest,
  AlertFilters,
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
  _count?: { sightings?: number };
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
  petName: a.pet?.name,
  petBreed: a.pet?.breed,
  petSpecies: a.pet?.species,
  userPhone: a.contactPhone,
  latitude: a.lastSeenLatitude ?? a.latitude ?? 0,
  longitude: a.lastSeenLongitude ?? a.longitude ?? 0,
  city: a.lastSeenAddress ?? a.city ?? '',
  sightingCount: a._count?.sightings ?? a.sightingCount ?? 0,
  createdAt: a.createdAt,
  updatedAt: a.updatedAt,
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
  user?: { id: string; name?: string; avatarUrl?: string };
};

const normalizeSighting = (s: ApiSighting, fallbackUserName?: string): Sighting => ({
  id: s.id,
  alertId: s.alertId,
  userId: s.userId,
  userName: s.userName ?? s.user?.name ?? fallbackUserName ?? 'Anonymous',
  description: s.description,
  latitude: s.latitude,
  longitude: s.longitude,
  photoUrl: s.photoUrl ?? s.imageUrl,
  createdAt: s.createdAt,
});

interface CommunityState {
  alerts: Alert[];
  selectedAlert: Alert | null;
  sightings: Record<string, Sighting[]>;
  badges: Badge[];
  leaderboard: LeaderboardEntry[];
  isLoading: boolean;
  error: string | null;

  fetchAlerts: (filters?: AlertFilters) => Promise<void>;
  fetchAlert: (id: string) => Promise<void>;
  createAlert: (data: CreateAlertRequest) => Promise<Alert>;
  resolveAlert: (id: string) => Promise<void>;

  fetchSightings: (alertId: string) => Promise<void>;
  createSighting: (alertId: string, data: CreateSightingRequest) => Promise<void>;

  fetchBadges: () => Promise<void>;
  fetchLeaderboard: (city?: string) => Promise<void>;

  clearError: () => void;
}

export const useCommunityStore = create<CommunityState>((set) => ({
  alerts: [],
  selectedAlert: null,
  sightings: {},
  badges: [],
  leaderboard: [],
  isLoading: false,
  error: null,

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

      const query = params.toString();
      const response = await api.get(`/community/lost-found${query ? `?${query}` : ''}`);
      const alerts = unwrapApiData<ApiAlert[]>(response.data);
      set({ alerts: Array.isArray(alerts) ? alerts.map(normalizeAlert) : [], isLoading: false });
    } catch (err) {
      const message = (err as { message: string }).message ?? 'Failed to fetch alerts';
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

  fetchBadges: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.get<Badge[]>('/users/me/badges');
      set({ badges: response.data, isLoading: false });
    } catch (err) {
      const message = (err as { message: string }).message ?? 'Failed to fetch badges';
      set({ error: message, isLoading: false });
    }
  },

  fetchLeaderboard: async (city?: string) => {
    set({ isLoading: true, error: null });
    try {
      const query = city ? `?city=${encodeURIComponent(city)}` : '';
      const response = await api.get<LeaderboardEntry[]>(`/users/leaderboard${query}`);
      set({ leaderboard: response.data, isLoading: false });
    } catch (err) {
      const message = (err as { message: string }).message ?? 'Failed to fetch leaderboard';
      set({ error: message, isLoading: false });
    }
  },

  clearError: () => set({ error: null }),
}));