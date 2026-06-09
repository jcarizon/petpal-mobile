import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Service } from '../types';

const STORAGE_KEY = 'pawrok_saved_services';

interface SavedServicesState {
  savedIds: string[];
  snapshots: Record<string, Service>;
  init: () => Promise<void>;
  toggleSave: (service: Service) => void;
  isSaved: (id: string) => boolean;
  getSavedServices: () => Service[];
}

export const useSavedServicesStore = create<SavedServicesState>((set, get) => ({
  savedIds: [],
  snapshots: {},

  init: async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as { ids: string[]; snapshots: Record<string, Service> };
      set({ savedIds: parsed.ids ?? [], snapshots: parsed.snapshots ?? {} });
    } catch {
      // corrupt storage — start fresh
    }
  },

  toggleSave: (service: Service) => {
    const { savedIds, snapshots } = get();
    const alreadySaved = savedIds.includes(service.id);
    const nextIds = alreadySaved
      ? savedIds.filter((id) => id !== service.id)
      : [...savedIds, service.id];
    const nextSnapshots = { ...snapshots };
    if (alreadySaved) {
      delete nextSnapshots[service.id];
    } else {
      nextSnapshots[service.id] = service;
    }
    set({ savedIds: nextIds, snapshots: nextSnapshots });
    AsyncStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ ids: nextIds, snapshots: nextSnapshots })
    ).catch(() => undefined);
  },

  isSaved: (id: string) => get().savedIds.includes(id),

  getSavedServices: () => {
    const { savedIds, snapshots } = get();
    return savedIds.map((id) => snapshots[id]).filter(Boolean) as Service[];
  },
}));
