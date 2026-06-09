import { create } from 'zustand';
import api from '../lib/api';
import { ChatConversation, ChatMessage } from '../types';

const unwrap = <T>(payload: unknown): T => {
  const w = payload as { data?: unknown };
  return (w?.data ?? payload) as T;
};

const dedup = <T extends { id: string }>(arr: T[]): T[] =>
  arr.filter((item, index, self) => self.findIndex((t) => t.id === item.id) === index);

interface ChatState {
  conversations: ChatConversation[];
  messages: Record<string, ChatMessage[]>;
  isLoading: boolean;
  isSending: boolean;
  unreadTotal: number;
  error: string | null;

  fetchConversations: (role?: 'all' | 'sent' | 'requests') => Promise<void>;
  fetchMessages: (conversationId: string) => Promise<void>;
  fetchUnreadCount: () => Promise<void>;
  initiateConversation: (alertId: string, recipientId: string) => Promise<ChatConversation>;
  sendMessage: (conversationId: string, content: string) => Promise<void>;
  acceptConversation: (conversationId: string) => Promise<void>;
  declineConversation: (conversationId: string) => Promise<void>;
  markRead: (conversationId: string) => Promise<void>;
  clearError: () => void;
  reset: () => void;
}

const BASE = '/community/chat/conversations';

export const useChatStore = create<ChatState>((set, get) => ({
  conversations: [],
  messages: {},
  isLoading: false,
  isSending: false,
  unreadTotal: 0,
  error: null,

  fetchConversations: async (role = 'all') => {
    set({ isLoading: true, error: null });
    try {
      const res = await api.get(`${BASE}?role=${role}`);
      const list = unwrap<ChatConversation[]>(res.data);
      set({ conversations: Array.isArray(list) ? list : [], isLoading: false });
    } catch (err) {
      set({ error: (err as { message?: string }).message ?? 'Failed to load chats', isLoading: false });
    }
  },

  fetchMessages: async (conversationId) => {
    set({ isLoading: true });
    try {
      const res = await api.get(`${BASE}/${conversationId}`);
      const data = unwrap<ChatConversation & { messages: ChatMessage[] }>(res.data);
      const msgs: ChatMessage[] = (data.messages ?? []).map((m: Record<string, unknown>) => ({
        id: m.id as string,
        conversationId: m.conversationId as string,
        senderId: m.senderId as string,
        senderName: ((m.sender as Record<string, unknown>)?.name ?? m.senderName ?? '') as string,
        content: m.content as string,
        isRead: m.isRead as boolean,
        createdAt: m.createdAt as string,
      }));

      // Update the conversation in the list with latest data
      set((state) => ({
        messages: { ...state.messages, [conversationId]: dedup(msgs) },
        conversations: state.conversations.map((c) =>
          c.id === conversationId ? { ...c, status: data.status, unreadCount: data.unreadCount } : c
        ),
        isLoading: false,
      }));
    } catch (err) {
      set({ error: (err as { message?: string }).message ?? 'Failed to load messages', isLoading: false });
    }
  },

  fetchUnreadCount: async () => {
    try {
      const res = await api.get(`${BASE}/unread`);
      const data = unwrap<{ total: number }>(res.data);
      set({ unreadTotal: data.total ?? 0 });
    } catch {
      // non-fatal
    }
  },

  initiateConversation: async (alertId, recipientId) => {
    set({ isLoading: true, error: null });
    try {
      const res = await api.post(BASE, { alertId, recipientId });
      const conv = unwrap<ChatConversation>(res.data);
      set((state) => ({
        conversations: state.conversations.some((c) => c.id === conv.id)
          ? state.conversations
          : [conv, ...state.conversations],
        isLoading: false,
      }));
      return conv;
    } catch (err) {
      set({ isLoading: false, error: (err as { message?: string }).message ?? 'Failed to start chat' });
      throw err;
    }
  },

  sendMessage: async (conversationId, content) => {
    set({ isSending: true });
    try {
      const res = await api.post(`${BASE}/${conversationId}/messages`, { content });
      const msg = unwrap<ChatMessage>(res.data);
      set((state) => {
        const existing = state.messages[conversationId] ?? [];
        // Guard against race condition where poll already added this message
        if (existing.some((m) => m.id === msg.id)) return { isSending: false };
        return {
          messages: { ...state.messages, [conversationId]: [...existing, msg] },
          isSending: false,
        };
      });
    } catch (err) {
      set({ isSending: false });
      throw err;
    }
  },

  acceptConversation: async (conversationId) => {
    await api.put(`${BASE}/${conversationId}/accept`);
    set((state) => ({
      conversations: state.conversations.map((c) =>
        c.id === conversationId ? { ...c, status: 'ACTIVE' } : c
      ),
    }));
  },

  declineConversation: async (conversationId) => {
    await api.put(`${BASE}/${conversationId}/decline`);
    set((state) => ({
      conversations: state.conversations.map((c) =>
        c.id === conversationId ? { ...c, status: 'DECLINED' } : c
      ),
    }));
  },

  markRead: async (conversationId) => {
    try {
      await api.put(`${BASE}/${conversationId}/read`);
      set((state) => ({
        messages: {
          ...state.messages,
          [conversationId]: (state.messages[conversationId] ?? []).map((m) => ({ ...m, isRead: true })),
        },
        conversations: state.conversations.map((c) =>
          c.id === conversationId ? { ...c, unreadCount: 0 } : c
        ),
        unreadTotal: Math.max(0, state.unreadTotal - (state.conversations.find((c) => c.id === conversationId)?.unreadCount ?? 0)),
      }));
    } catch {
      // non-fatal
    }
  },

  clearError: () => set({ error: null }),
  reset: () => set({ conversations: [], messages: {}, isLoading: false, isSending: false, unreadTotal: 0, error: null }),
}));
