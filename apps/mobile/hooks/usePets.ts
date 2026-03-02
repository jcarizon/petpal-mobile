import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usePetStore } from '../store/petStore';
import api from '../lib/api';
import { Pet, HealthRecord, CreatePetRequest, UpdatePetRequest, CreateHealthRecordRequest } from '../types';

export function usePets() {
  const store = usePetStore();
  const queryClient = useQueryClient();

  const petsQuery = useQuery({
    queryKey: ['pets'],
    queryFn: async () => {
      const response = await api.get<Pet[]>('/pets');
      return response.data;
    },
  });

  const createPetMutation = useMutation({
    mutationFn: (data: CreatePetRequest) => api.post<Pet>('/pets', data).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pets'] });
    },
  });

  const updatePetMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdatePetRequest }) =>
      api.put<Pet>(`/pets/${id}`, data).then((r) => r.data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['pets'] });
      queryClient.invalidateQueries({ queryKey: ['pet', id] });
    },
  });

  const deletePetMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/pets/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pets'] });
    },
  });

  return {
    pets: petsQuery.data ?? [],
    isLoading: petsQuery.isLoading,
    error: petsQuery.error,
    refetch: petsQuery.refetch,
    createPet: createPetMutation.mutateAsync,
    updatePet: updatePetMutation.mutateAsync,
    deletePet: deletePetMutation.mutateAsync,
    isCreating: createPetMutation.isPending,
    isUpdating: updatePetMutation.isPending,
    isDeleting: deletePetMutation.isPending,
    // Store fallback
    storeError: store.error,
    clearError: store.clearError,
  };
}

export function usePet(id: string) {
  const query = useQuery({
    queryKey: ['pet', id],
    queryFn: async () => {
      const response = await api.get<Pet>(`/pets/${id}`);
      return response.data;
    },
    enabled: !!id,
  });

  return {
    pet: query.data,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}

export function useHealthRecords(petId: string) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['health-records', petId],
    queryFn: async () => {
      const response = await api.get<HealthRecord[]>(`/pets/${petId}/health-records`);
      return response.data;
    },
    enabled: !!petId,
  });

  const createMutation = useMutation({
    mutationFn: (data: CreateHealthRecordRequest) =>
      api.post<HealthRecord>(`/pets/${petId}/health-records`, data).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['health-records', petId] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (recordId: string) => api.delete(`/pets/${petId}/health-records/${recordId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['health-records', petId] });
    },
  });

  return {
    records: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    createRecord: createMutation.mutateAsync,
    deleteRecord: deleteMutation.mutateAsync,
    isCreating: createMutation.isPending,
  };
}
