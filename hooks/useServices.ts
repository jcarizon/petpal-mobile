import { useQuery, keepPreviousData } from '@tanstack/react-query';
import api from '../lib/api';
import { Service, ServiceFilters } from '../types';

type BackendServiceType = 'VET' | 'GROOMER' | 'PET_STORE' | 'PET_HOTEL' | 'TRAINER';

type BackendService = {
  id: string;
  name: string;
  type: BackendServiceType;
  types?: BackendServiceType[]; // Multiple service types for combination businesses
  address: string;
  city: string;
  latitude: number;
  longitude: number;
  phone?: string | null;
  website?: string | null;
  description?: string | null;
  isVerified: boolean;
  averageRating: number;
  reviewCount: number;
  createdAt: string;
  updatedAt: string;
};

type ApiWrapped<T> = {
  success: boolean;
  data: T;
};

const toBackendType = (type?: ServiceFilters['type']): BackendServiceType | undefined => {
  if (!type) return undefined;
  const map: Record<Exclude<ServiceFilters['type'], undefined>, BackendServiceType> = {
    vet: 'VET',
    groomer: 'GROOMER',
    pet_shop: 'PET_STORE',
    park: 'TRAINER',
    boarding: 'PET_HOTEL',
    other: 'TRAINER',
  };
  return map[type];
};

const fromBackendType = (type: BackendServiceType): Service['type'] => {
  const map: Record<BackendServiceType, Service['type']> = {
    VET: 'vet',
    GROOMER: 'groomer',
    PET_STORE: 'pet_shop',
    PET_HOTEL: 'boarding',
    TRAINER: 'other',
  };
  return map[type] ?? 'other';
};

const normalizeService = (service: BackendService): Service => ({
  id: service.id,
  name: service.name,
  type: fromBackendType(service.type),
  types: service.types?.map(fromBackendType),
  address: service.address,
  city: service.city,
  latitude: service.latitude,
  longitude: service.longitude,
  phone: service.phone ?? undefined,
  website: service.website ?? undefined,
  description: service.description ?? undefined,
  rating: Number(service.averageRating ?? 0),
  reviewCount: Number(service.reviewCount ?? 0),
  isVerified: Boolean(service.isVerified),
  isHighlyRecommended: Number(service.averageRating ?? 0) >= 4.7 && Number(service.reviewCount ?? 0) >= 10,
  createdAt: service.createdAt,
  updatedAt: service.updatedAt,
});

export function useServices(filters?: ServiceFilters) {
  const query = useQuery({
    queryKey: ['services', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      const backendType = toBackendType(filters?.type);
      if (backendType) params.append('type', backendType);
      if (filters?.city) params.append('city', filters.city);
      if (filters?.latitude !== undefined) params.append('lat', String(filters.latitude));
      if (filters?.longitude !== undefined) params.append('lng', String(filters.longitude));
      if (filters?.radiusKm !== undefined) params.append('radius', String(filters.radiusKm));
      if (filters?.query) params.append('q', filters.query);

      const q = params.toString();
      const response = await api.get<ApiWrapped<BackendService[]>>(`/services${q ? `?${q}` : ''}`);
      const rawServices = Array.isArray(response.data?.data) ? response.data.data : [];
      return rawServices.map(normalizeService);
    },
    placeholderData: keepPreviousData, // Keep showing old data while fetching new
  });

  return {
    services: query.data ?? [],
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error,
    refetch: query.refetch,
  };
}

export function useService(id: string) {
  const query = useQuery({
    queryKey: ['service', id],
    queryFn: async () => {
      const response = await api.get<ApiWrapped<BackendService>>(`/services/${id}`);
      const payload = response.data?.data;
      return payload ? normalizeService(payload) : undefined;
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
