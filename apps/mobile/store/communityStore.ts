import { create } from 'zustand';
import api from '../lib/api';
import {
  Alert,
  Sighting,
  Badge,
  LeaderboardEntry,
  CreateAlertRequest,
  CreateSightingRequest,
  AlertFilters,
} from '../types';

interface CommunityState {
  alerts: Alert[];
  selectedAlert: Alert | null;
  sightings: Record<string, Sighting[]>; // alertId -> sightings
  badges: Badge[];
  leaderboard: LeaderboardEntry[];
  isLoading: boolean;
  error: string | null;

  // Alerts
  fetchAlerts: (filters?: AlertFilters) => Promise<void>;
  fetchAlert: (id: string) => Promise<void>;
  createAlert: (data: CreateAlertRequest) => Promise<Alert>;
  resolveAlert: (id: string) => Promise<void>;

  // Sightings
  fetchSightings: (alertId: string) => Promise<void>;
  createSighting: (alertId: string, data: CreateSightingRequest) => Promise<void>;

  // Badges
  fetchBadges: () => Promise<void>;

  // Leaderboard
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
      const response = await api.get<Alert[]>(`/alerts${query ? `?${query}` : ''}`);
      set({ alerts: response.data, isLoading: false });
    } catch (err) {
      const message = (err as { message: string }).message ?? 'Failed to fetch alerts';
      set({ error: message, isLoading: false });
    }
  },

  fetchAlert: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.get<Alert>(`/alerts/${id}`);
      set({ selectedAlert: response.data, isLoading: false });
    } catch (err) {
      const message = (err as { message: string }).message ?? 'Failed to fetch alert';
      set({ error: message, isLoading: false });
    }
  },

  createAlert: async (data: CreateAlertRequest): Promise<Alert> => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.post<Alert>('/alerts', data);
      const newAlert = response.data;
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
      const response = await api.put<Alert>(`/alerts/${id}/resolve`);
      const updated = response.data;
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
      const response = await api.get<Sighting[]>(`/alerts/${alertId}/sightings`);
      set((state) => ({
        sightings: { ...state.sightings, [alertId]: response.data },
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
      const response = await api.post<Sighting>(`/alerts/${alertId}/sightings`, data);
      const newSighting = response.data;
      set((state) => ({
        sightings: {
          ...state.sightings,
          [alertId]: [...(state.sightings[alertId] ?? []), newSighting],
        },
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
