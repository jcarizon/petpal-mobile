import { create } from 'zustand';
import api from '../lib/api';
import { NotificationLog } from '../types';

interface NotificationState {
  notifications: NotificationLog[];
  isLoading: boolean;
  error: string | null;
  hasMore: boolean;
  page: number;

  fetchNotifications: (reset?: boolean) => Promise<void>;
  clearError: () => void;
}

const unwrap = <T>(payload: unknown): T => {
  const wrapped = payload as { data?: unknown };
  return (wrapped?.data ?? payload) as T;
};

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  isLoading: false,
  error: null,
  hasMore: true,
  page: 1,

  fetchNotifications: async (reset = false) => {
    const { page, isLoading, hasMore } = get();
    if (isLoading || (!hasMore && !reset)) return;

    const currentPage = reset ? 1 : page;
    set({ isLoading: true, error: null, ...(reset ? { page: 1, hasMore: true } : {}) });

    try {
      const response = await api.get(`/notifications/history?page=${currentPage}&limit=20`);
      const list = unwrap<NotificationLog[]>(response.data);
      const items = Array.isArray(list) ? list : [];

      set((state) => ({
        notifications: reset ? items : [...state.notifications, ...items],
        isLoading: false,
        hasMore: items.length === 20,
        page: currentPage + 1,
      }));
    } catch (err) {
      set({
        error: (err as { message?: string })?.message ?? 'Failed to load notifications',
        isLoading: false,
      });
    }
  },

  clearError: () => set({ error: null }),
}));
