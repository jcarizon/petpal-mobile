import { create } from 'zustand';
import api from '../lib/api';
import {
  Pet,
  HealthRecord,
  Reminder,
  CreatePetRequest,
  UpdatePetRequest,
  CreateHealthRecordRequest,
  CreateReminderRequest,
  HealthScoreBreakdown,
  PetDiary,
  CreateDiaryRequest,
} from '../types';
import { calculateHealthScore } from '../lib/utils';

const unwrapApiData = <T>(payload: unknown): T => {
  const maybeWrapped = payload as { data?: unknown };
  return ((maybeWrapped?.data ?? payload) as T);
};

interface PetState {
  pets: Pet[];
  selectedPet: Pet | null;
  healthRecords: Record<string, HealthRecord[]>; // petId -> records
  reminders: Record<string, Reminder[]>; // petId -> reminders
  healthScores: Record<string, HealthScoreBreakdown>; // petId -> score
  diaries: Record<string, PetDiary[]>; // petId -> diaries
  isLoading: boolean;
  error: string | null;

  // Pet CRUD
  fetchPets: () => Promise<void>;
  fetchPet: (id: string) => Promise<void>;
  createPet: (data: CreatePetRequest) => Promise<Pet>;
  updatePet: (id: string, data: UpdatePetRequest) => Promise<void>;
  deletePet: (id: string) => Promise<void>;
  setSelectedPet: (pet: Pet | null) => void;

  // Health Records
  fetchHealthRecords: (petId: string) => Promise<void>;
  createHealthRecord: (petId: string, data: CreateHealthRecordRequest) => Promise<void>;
  updateHealthRecord: (petId: string, recordId: string, data: Partial<CreateHealthRecordRequest>) => Promise<void>;
  deleteHealthRecord: (petId: string, recordId: string) => Promise<void>;

  // Reminders
  fetchReminders: (petId: string) => Promise<void>;
  createReminder: (petId: string, data: CreateReminderRequest) => Promise<void>;

  // Health Score
  fetchHealthScore: (petId: string) => Promise<void>;

  // Pet Diaries
  fetchDiaries: (petId: string) => Promise<void>;
  createDiary: (petId: string, data: CreateDiaryRequest) => Promise<void>;
  updateDiary: (petId: string, diaryId: string, data: Partial<CreateDiaryRequest>) => Promise<void>;
  deleteDiary: (petId: string, diaryId: string) => Promise<void>;

  clearError: () => void;
}

export const usePetStore = create<PetState>((set, get) => ({
  pets: [],
  selectedPet: null,
  healthRecords: {},
  reminders: {},
  healthScores: {},
  diaries: {},
  isLoading: false,
  error: null,

  fetchPets: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.get<Pet[]>('/pets');
      const pets = unwrapApiData<Pet[]>(response.data);
      set({ pets: Array.isArray(pets) ? pets : [], isLoading: false });
    } catch (err) {
      const message = (err as { message: string }).message ?? 'Failed to fetch pets';
      set({ error: message, isLoading: false });
    }
  },

  fetchPet: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.get<Pet>(`/pets/${id}`);
      const pet = unwrapApiData<Pet>(response.data);
      set({ selectedPet: pet, isLoading: false });
    } catch (err) {
      const message = (err as { message: string }).message ?? 'Failed to fetch pet';
      set({ error: message, isLoading: false });
    }
  },

  createPet: async (data: CreatePetRequest): Promise<Pet> => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.post<Pet>('/pets', data);
      const newPet = unwrapApiData<Pet>(response.data);
      set((state) => ({ pets: [...state.pets, newPet], isLoading: false }));
      return newPet;
    } catch (err) {
      const message = (err as { message: string }).message ?? 'Failed to create pet';
      set({ error: message, isLoading: false });
      throw err;
    }
  },

  updatePet: async (id: string, data: UpdatePetRequest) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.put<Pet>(`/pets/${id}`, data);
      const updated = unwrapApiData<Pet>(response.data);
      set((state) => ({
        pets: state.pets.map((p) => (p.id === id ? updated : p)),
        selectedPet: state.selectedPet?.id === id ? updated : state.selectedPet,
        isLoading: false,
      }));
    } catch (err) {
      const message = (err as { message: string }).message ?? 'Failed to update pet';
      set({ error: message, isLoading: false });
      throw err;
    }
  },

  deletePet: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      await api.delete(`/pets/${id}`);
      set((state) => ({
        pets: state.pets.filter((p) => p.id !== id),
        selectedPet: state.selectedPet?.id === id ? null : state.selectedPet,
        isLoading: false,
      }));
    } catch (err) {
      const message = (err as { message: string }).message ?? 'Failed to delete pet';
      set({ error: message, isLoading: false });
      throw err;
    }
  },

  setSelectedPet: (pet: Pet | null) => set({ selectedPet: pet }),

  fetchHealthRecords: async (petId: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.get<HealthRecord[]>(`/pets/${petId}/health-records`);
      const records = unwrapApiData<HealthRecord[]>(response.data);

      // Calculate local health score
      const pet = get().pets.find((p) => p.id === petId) ?? get().selectedPet;
      const scoreBreakdown = pet ? calculateHealthScore(pet, records) : null;

      set((state) => ({
        healthRecords: { ...state.healthRecords, [petId]: records },
        ...(scoreBreakdown
          ? { healthScores: { ...state.healthScores, [petId]: scoreBreakdown } }
          : {}),
        isLoading: false,
      }));
    } catch (err) {
      const message = (err as { message: string }).message ?? 'Failed to fetch records';
      set({ error: message, isLoading: false });
    }
  },

  createHealthRecord: async (petId: string, data: CreateHealthRecordRequest) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.post<HealthRecord>(`/pets/${petId}/health-records`, data);
      const newRecord = unwrapApiData<HealthRecord>(response.data);
      set((state) => ({
        healthRecords: {
          ...state.healthRecords,
          [petId]: [newRecord, ...(state.healthRecords[petId] ?? [])],
        },
        isLoading: false,
      }));
    } catch (err) {
      const message = (err as { message: string }).message ?? 'Failed to add record';
      set({ error: message, isLoading: false });
      throw err;
    }
  },

  updateHealthRecord: async (petId: string, recordId: string, data: Partial<CreateHealthRecordRequest>) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.put<HealthRecord>(`/pets/${petId}/health-records/${recordId}`, data);
      const updated = unwrapApiData<HealthRecord>(response.data);
      set((state) => ({
        healthRecords: {
          ...state.healthRecords,
          [petId]: (state.healthRecords[petId] ?? []).map((r) => (r.id === recordId ? updated : r)),
        },
        isLoading: false,
      }));
    } catch (err) {
      const message = (err as { message: string }).message ?? 'Failed to update record';
      set({ error: message, isLoading: false });
      throw err;
    }
  },

  deleteHealthRecord: async (petId: string, recordId: string) => {
    set({ isLoading: true, error: null });
    try {
      await api.delete(`/pets/${petId}/health-records/${recordId}`);
      set((state) => ({
        healthRecords: {
          ...state.healthRecords,
          [petId]: (state.healthRecords[petId] ?? []).filter((r) => r.id !== recordId),
        },
        isLoading: false,
      }));
    } catch (err) {
      const message = (err as { message: string }).message ?? 'Failed to delete record';
      set({ error: message, isLoading: false });
      throw err;
    }
  },

  fetchReminders: async (petId: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.get<Reminder[]>(`/pets/${petId}/reminders`);
      const reminders = unwrapApiData<Reminder[]>(response.data);
      set((state) => ({
        reminders: { ...state.reminders, [petId]: Array.isArray(reminders) ? reminders : [] },
        isLoading: false,
      }));
    } catch (err) {
      const message = (err as { message: string }).message ?? 'Failed to fetch reminders';
      set({ error: message, isLoading: false });
    }
  },

  createReminder: async (petId: string, data: CreateReminderRequest) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.post<Reminder>(`/pets/${petId}/reminders`, data);
      const newReminder = unwrapApiData<Reminder>(response.data);
      set((state) => ({
        reminders: {
          ...state.reminders,
          [petId]: [...(state.reminders[petId] ?? []), newReminder],
        },
        isLoading: false,
      }));
    } catch (err) {
      const message = (err as { message: string }).message ?? 'Failed to create reminder';
      set({ error: message, isLoading: false });
      throw err;
    }
  },

  fetchHealthScore: async (petId: string) => {
    try {
      const response = await api.get<{ score: number }>(`/pets/${petId}/health-score`);
      const scoreData = unwrapApiData<{ score: number }>(response.data);
      // Merge API score if available
      set((state) => ({
        healthScores: {
          ...state.healthScores,
          [petId]: {
            ...(state.healthScores[petId] ?? {}),
            score: scoreData.score,
          } as HealthScoreBreakdown,
        },
      }));
    } catch {
      // Use locally calculated score as fallback
    }
  },

  // Pet Diaries
  fetchDiaries: async (petId: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.get<PetDiary[]>(`/pets/${petId}/diaries`);
      const diaries = unwrapApiData<PetDiary[]>(response.data);
      set((state) => ({
        diaries: { ...state.diaries, [petId]: Array.isArray(diaries) ? diaries : [] },
        isLoading: false,
      }));
    } catch (err) {
      const message = (err as { message: string }).message ?? 'Failed to fetch diaries';
      set({ error: message, isLoading: false });
    }
  },

  createDiary: async (petId: string, data: CreateDiaryRequest) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.post<PetDiary>(`/pets/${petId}/diaries`, data);
      const newDiary = unwrapApiData<PetDiary>(response.data);
      set((state) => ({
        diaries: {
          ...state.diaries,
          [petId]: [newDiary, ...(state.diaries[petId] ?? [])],
        },
        isLoading: false,
      }));
    } catch (err) {
      const message = (err as { message: string }).message ?? 'Failed to create diary';
      set({ error: message, isLoading: false });
      throw err;
    }
  },

  updateDiary: async (petId: string, diaryId: string, data: Partial<CreateDiaryRequest>) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.put<PetDiary>(`/pets/${petId}/diaries/${diaryId}`, data);
      const updated = unwrapApiData<PetDiary>(response.data);
      set((state) => ({
        diaries: {
          ...state.diaries,
          [petId]: (state.diaries[petId] ?? []).map((d) => (d.id === diaryId ? updated : d)),
        },
        isLoading: false,
      }));
    } catch (err) {
      const message = (err as { message: string }).message ?? 'Failed to update diary';
      set({ error: message, isLoading: false });
      throw err;
    }
  },

  deleteDiary: async (petId: string, diaryId: string) => {
    set({ isLoading: true, error: null });
    try {
      await api.delete(`/pets/${petId}/diaries/${diaryId}`);
      set((state) => ({
        diaries: {
          ...state.diaries,
          [petId]: (state.diaries[petId] ?? []).filter((d) => d.id !== diaryId),
        },
        isLoading: false,
      }));
    } catch (err) {
      const message = (err as { message: string }).message ?? 'Failed to delete diary';
      set({ error: message, isLoading: false });
      throw err;
    }
  },

  clearError: () => set({ error: null }),
}));
