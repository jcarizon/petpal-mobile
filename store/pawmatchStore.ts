import { create } from 'zustand';
import api from '../lib/api';
import {
  MatchMode,
  SwipeDirection,
  PawMatchProfile,
  PawMatch,
  PawMatchConversation,
  PawMatchMessage,
  SwipeResult,
  CreatePawMatchProfileRequest,
} from '../types';

const unwrapApiData = <T>(payload: unknown): T => {
  const maybeWrapped = payload as { data?: unknown };
  return ((maybeWrapped?.data ?? payload) as T);
};

interface PawMatchState {
  activeMode: MatchMode | null;
  candidates: Partial<Record<MatchMode, PawMatchProfile[]>>;
  matches: PawMatch[];
  profiles: Record<string, PawMatchProfile[]>; // petId → profiles
  conversations: Record<string, PawMatchConversation>; // matchId → conversation
  isLoading: boolean;
  error: string | null;

  setMode: (mode: MatchMode) => void;
  fetchProfiles: (petId: string) => Promise<void>;
  upsertProfile: (data: CreatePawMatchProfileRequest) => Promise<PawMatchProfile>;
  updateProfile: (profileId: string, data: Partial<CreatePawMatchProfileRequest>) => Promise<void>;
  deleteProfile: (profileId: string) => Promise<void>;
  fetchCandidates: (petId: string, mode: MatchMode, filters?: Record<string, string | number>) => Promise<void>;
  removeTopCandidate: (mode: MatchMode) => void;
  swipe: (fromProfileId: string, toProfileId: string, mode: MatchMode, direction: SwipeDirection) => Promise<SwipeResult>;
  fetchMatches: (petId: string, mode?: MatchMode) => Promise<void>;
  unmatch: (matchId: string) => Promise<void>;
  fetchConversation: (matchId: string) => Promise<void>;
  sendMessage: (matchId: string, senderPetId: string, content?: string, mediaUrl?: string) => Promise<PawMatchMessage>;
  clearError: () => void;
}

export const usePawMatchStore = create<PawMatchState>((set, get) => ({
  activeMode: null,
  candidates: {},
  matches: [],
  profiles: {},
  conversations: {},
  isLoading: false,
  error: null,

  setMode: (mode) => set({ activeMode: mode }),

  fetchProfiles: async (petId) => {
    set({ isLoading: true, error: null });
    try {
      const res = await api.get(`/pawmatch/profiles/${petId}`);
      const profiles = unwrapApiData<PawMatchProfile[]>(res.data);
      set((s) => ({ profiles: { ...s.profiles, [petId]: profiles }, isLoading: false }));
    } catch (e: unknown) {
      set({ error: (e as { message?: string }).message ?? 'Failed to load profiles', isLoading: false });
    }
  },

  upsertProfile: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const res = await api.post('/pawmatch/profiles', data);
      const profile = unwrapApiData<PawMatchProfile>(res.data);
      set((s) => {
        const existing = s.profiles[data.petId] ?? [];
        const updated = existing.filter((p) => p.id !== profile.id);
        return { profiles: { ...s.profiles, [data.petId]: [profile, ...updated] }, isLoading: false };
      });
      return profile;
    } catch (e: unknown) {
      set({ error: (e as { message?: string }).message ?? 'Failed to save profile', isLoading: false });
      throw e;
    }
  },

  updateProfile: async (profileId, data) => {
    set({ isLoading: true, error: null });
    try {
      const res = await api.patch(`/pawmatch/profiles/${profileId}`, data);
      const updated = unwrapApiData<PawMatchProfile>(res.data);
      set((s) => {
        const petId = updated.petId;
        const existing = s.profiles[petId] ?? [];
        return {
          profiles: { ...s.profiles, [petId]: existing.map((p) => (p.id === profileId ? updated : p)) },
          isLoading: false,
        };
      });
    } catch (e: unknown) {
      set({ error: (e as { message?: string }).message ?? 'Failed to update profile', isLoading: false });
      throw e;
    }
  },

  deleteProfile: async (profileId) => {
    set({ isLoading: true, error: null });
    try {
      await api.delete(`/pawmatch/profiles/${profileId}`);
      set((s) => {
        const updatedProfiles = { ...s.profiles };
        for (const petId of Object.keys(updatedProfiles)) {
          updatedProfiles[petId] = updatedProfiles[petId].filter((p) => p.id !== profileId);
        }
        return { profiles: updatedProfiles, isLoading: false };
      });
    } catch (e: unknown) {
      set({ error: (e as { message?: string }).message ?? 'Failed to delete profile', isLoading: false });
      throw e;
    }
  },

  fetchCandidates: async (petId, mode, filters = {}) => {
    set({ isLoading: true, error: null });
    try {
      const params = new URLSearchParams({ petId, mode, ...Object.fromEntries(Object.entries(filters).map(([k, v]) => [k, String(v)])) });
      const res = await api.get(`/pawmatch/candidates?${params}`);
      const candidates = unwrapApiData<PawMatchProfile[]>(res.data);
      set((s) => ({ candidates: { ...s.candidates, [mode]: candidates }, isLoading: false }));
    } catch (e: unknown) {
      set({ error: (e as { message?: string }).message ?? 'Failed to load candidates', isLoading: false });
    }
  },

  removeTopCandidate: (mode) => {
    set((s) => {
      const current = s.candidates[mode] ?? [];
      return { candidates: { ...s.candidates, [mode]: current.slice(1) } };
    });
  },

  swipe: async (fromProfileId, toProfileId, mode, direction) => {
    try {
      const res = await api.post('/pawmatch/swipe', { fromProfileId, toProfileId, mode, direction });
      const result = unwrapApiData<SwipeResult>(res.data);
      get().removeTopCandidate(mode);
      if (result.matched) {
        // Refresh matches list in background
        const callerProfile = Object.values(get().profiles)
          .flat()
          .find((p) => p.id === fromProfileId);
        if (callerProfile) {
          get().fetchMatches(callerProfile.petId).catch(() => {});
        }
      }
      return result;
    } catch (e: unknown) {
      throw e;
    }
  },

  fetchMatches: async (petId, mode) => {
    set({ isLoading: true, error: null });
    try {
      const params = new URLSearchParams({ petId });
      if (mode) params.set('mode', mode);
      const res = await api.get(`/pawmatch/matches?${params}`);
      const fetched = unwrapApiData<PawMatch[]>(res.data);
      set((s) => {
        // Drop existing entries for this pet, add fresh ones, then dedupe by ID
        const fetchedIds = new Set(fetched.map((m) => m.id));
        const others = s.matches.filter(
          (m) => m.profileA.petId !== petId && m.profileB.petId !== petId && !fetchedIds.has(m.id)
        );
        const merged = [...others, ...fetched];
        // Final dedup guard against concurrent-call races
        const seen = new Set<string>();
        const deduped = merged.filter((m) => {
          if (seen.has(m.id)) return false;
          seen.add(m.id);
          return true;
        });
        return { matches: deduped, isLoading: false };
      });
    } catch (e: unknown) {
      set({ error: (e as { message?: string }).message ?? 'Failed to load matches', isLoading: false });
    }
  },

  unmatch: async (matchId) => {
    set({ isLoading: true, error: null });
    try {
      await api.delete(`/pawmatch/matches/${matchId}`);
      set((s) => ({ matches: s.matches.filter((m) => m.id !== matchId), isLoading: false }));
    } catch (e: unknown) {
      set({ error: (e as { message?: string }).message ?? 'Failed to unmatch', isLoading: false });
      throw e;
    }
  },

  fetchConversation: async (matchId) => {
    set({ isLoading: true, error: null });
    try {
      const res = await api.get(`/pawmatch/matches/${matchId}/conversation`);
      const conversation = unwrapApiData<PawMatchConversation>(res.data);
      set((s) => ({ conversations: { ...s.conversations, [matchId]: conversation }, isLoading: false }));
    } catch (e: unknown) {
      set({ error: (e as { message?: string }).message ?? 'Failed to load conversation', isLoading: false });
    }
  },

  sendMessage: async (matchId, senderPetId, content, mediaUrl) => {
    try {
      const res = await api.post('/pawmatch/messages', { matchId, senderPetId, content, mediaUrl });
      const message = unwrapApiData<PawMatchMessage>(res.data);
      set((s) => {
        const conv = s.conversations[matchId];
        if (!conv) return s;
        return {
          conversations: {
            ...s.conversations,
            [matchId]: { ...conv, messages: [...conv.messages, message] },
          },
        };
      });
      return message;
    } catch (e: unknown) {
      throw e;
    }
  },

  clearError: () => set({ error: null }),
}));
