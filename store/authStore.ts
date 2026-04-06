import { create } from 'zustand';
import api from '../lib/api';
import { saveTokens, clearTokens, getTokens } from '../lib/storage';
import { User, LoginRequest, RegisterRequest, AuthResponse, ResetPasswordRequest } from '../types';

const extractAuthPayload = (responseData: unknown): AuthResponse => {
  const payload = (responseData as { data?: unknown })?.data ?? responseData;
  const auth = payload as {
    user?: User;
    token?: string;
    tokens?: { accessToken?: string; refreshToken?: string };
  };

  const user = auth.user;
  const accessToken = auth.tokens?.accessToken ?? auth.token;
  const refreshToken = auth.tokens?.refreshToken ?? accessToken;

  if (!user || !accessToken) {
    throw new Error('Invalid auth response from server');
  }

  return {
    user,
    tokens: {
      accessToken,
      refreshToken,
    },
  };
};

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  // Actions
  login: (credentials: LoginRequest) => Promise<void>;
  register: (data: RegisterRequest) => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<boolean>;
  autoLogin: () => Promise<boolean>;
  updateProfile: (data: Partial<User>) => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
  resetPassword: (data: ResetPasswordRequest) => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,

  login: async (credentials: LoginRequest) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.post('/auth/login', credentials);
      const { user, tokens } = extractAuthPayload(response.data);
      await saveTokens(tokens);
      set({ user, isAuthenticated: true, isLoading: false });
    } catch (err) {
      const message = (err as { message: string }).message ?? 'Login failed';
      set({ error: message, isLoading: false });
      throw err;
    }
  },

  register: async (data: RegisterRequest) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.post('/auth/register', data);
      const { user, tokens } = extractAuthPayload(response.data);
      await saveTokens(tokens);
      set({ user, isAuthenticated: true, isLoading: false });
    } catch (err) {
      const message = (err as { message: string }).message ?? 'Registration failed';
      set({ error: message, isLoading: false });
      throw err;
    }
  },

  logout: async () => {
    set({ isLoading: true });
    try {
      await api.post('/auth/logout').catch(() => {
        // Ignore logout API errors - clear local state anyway
      });
    } finally {
      await clearTokens();
      set({ user: null, isAuthenticated: false, isLoading: false, error: null });
    }
  },

  refreshToken: async (): Promise<boolean> => {
    try {
      const tokens = await getTokens();
      if (!tokens?.refreshToken) return false;

      const response = await api.post<AuthResponse>('/auth/refresh', {
        refreshToken: tokens.refreshToken,
      });
      await saveTokens(response.data.tokens);
      return true;
    } catch {
      await clearTokens();
      set({ user: null, isAuthenticated: false });
      return false;
    }
  },

  autoLogin: async (): Promise<boolean> => {
    set({ isLoading: true });
    try {
      const tokens = await getTokens();
      if (!tokens?.accessToken) {
        set({ isLoading: false });
        return false;
      }

      const response = await api.get<User>('/auth/profile');
      set({ user: response.data, isAuthenticated: true, isLoading: false });
      return true;
    } catch {
      await clearTokens();
      set({ user: null, isAuthenticated: false, isLoading: false });
      return false;
    }
  },

  updateProfile: async (data: Partial<User>) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.put<User>('/auth/profile', data);
      set({ user: response.data, isLoading: false });
    } catch (err) {
      const message = (err as { message: string }).message ?? 'Update failed';
      set({ error: message, isLoading: false });
      throw err;
    }
  },

  forgotPassword: async (email: string) => {
    set({ isLoading: true, error: null });
    try {
      await api.post('/auth/forgot-password', { email });
      set({ isLoading: false });
    } catch (err) {
      const message = (err as { message: string }).message ?? 'Request failed';
      set({ error: message, isLoading: false });
      throw err;
    }
  },

  resetPassword: async (data: ResetPasswordRequest) => {
    set({ isLoading: true, error: null });
    try {
      await api.post('/auth/reset-password', data);
      set({ isLoading: false });
    } catch (err) {
      const message = (err as { message: string }).message ?? 'Reset failed';
      set({ error: message, isLoading: false });
      throw err;
    }
  },

  clearError: () => set({ error: null }),
}));

// Convenience selector
export const selectUser = (state: AuthState) => state.user;
export const selectIsAuthenticated = (state: AuthState) => state.isAuthenticated;
