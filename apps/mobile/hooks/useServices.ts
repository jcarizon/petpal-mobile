import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';
import { Service, ServiceFilters } from '../types';

export function useServices(filters?: ServiceFilters) {
  const query = useQuery({
    queryKey: ['services', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.type) params.append('type', filters.type);
      if (filters?.city) params.append('city', filters.city);
      if (filters?.latitude !== undefined) params.append('lat', String(filters.latitude));
      if (filters?.longitude !== undefined) params.append('lng', String(filters.longitude));
      if (filters?.radiusKm !== undefined) params.append('radius', String(filters.radiusKm));

      const q = params.toString();
      const response = await api.get<Service[]>(`/services${q ? `?${q}` : ''}`);
      return response.data;
    },
  });

  return {
    services: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}

export function useService(id: string) {
  const query = useQuery({
    queryKey: ['service', id],
    queryFn: async () => {
      const response = await api.get<Service>(`/services/${id}`);
      return response.data;
    },
    enabled: !!id,
  });

  return {
    service: query.data,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}
