import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'pawrok_rsvp_events';

interface RsvpState {
  rsvpedIds: string[];
  init: () => Promise<void>;
  markRsvped: (eventId: string) => void;
  isRsvped: (eventId: string) => boolean;
}

export const useRsvpStore = create<RsvpState>((set, get) => ({
  rsvpedIds: [],

  init: async () => {
    try {
      const raw = await AsyncStorage.getItem(KEY);
      if (raw) set({ rsvpedIds: JSON.parse(raw) as string[] });
    } catch {}
  },

  markRsvped: (eventId) => {
    if (get().rsvpedIds.includes(eventId)) return;
    const next = [...get().rsvpedIds, eventId];
    set({ rsvpedIds: next });
    AsyncStorage.setItem(KEY, JSON.stringify(next)).catch(() => {});
  },

  isRsvped: (eventId) => get().rsvpedIds.includes(eventId),
}));
