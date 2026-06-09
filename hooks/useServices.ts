import { useInfiniteQuery, useQuery, keepPreviousData } from '@tanstack/react-query';
import { useMemo } from 'react';
import api from '../lib/api';
import { Service, ServiceFilters } from '../types';

type BackendServiceType =
  | 'VET' | 'VETERINARY_EMERGENCY' | 'GROOMER' | 'PET_STORE' | 'PET_HOTEL'
  | 'DAYCARE' | 'TRAINER' | 'SPA' | 'SHELTER' | 'PHOTOGRAPHY' | 'TRANSPORTATION' | 'PHARMACY';

type BackendService = {
  id: string;
  ownerId?: string;
  name: string;
  type: BackendServiceType;
  types?: BackendServiceType[];
  address: string;
  city: string;
  latitude: number;
  longitude: number;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  description?: string | null;
  logoUrl?: string | null;
  photos?: string[];
  openingHours?: Record<string, string> | null;
  tags?: string[];
  specialties?: string[];
  facebook?: string | null;
  instagram?: string | null;
  isVerified: boolean;
  averageRating: number;
  reviewCount: number;
  createdAt: string;
  updatedAt: string;
  owner?: { id: string; name: string; avatarUrl?: string | null };
};

type ApiWrapped<T> = {
  success: boolean;
  data: T;
};

const TO_BACKEND: Record<string, BackendServiceType> = {
  vet:            'VET',
  emergency_vet:  'VETERINARY_EMERGENCY',
  groomer:        'GROOMER',
  pet_store:      'PET_STORE',
  pet_shop:       'PET_STORE',   // legacy alias
  pet_hotel:      'PET_HOTEL',
  boarding:       'PET_HOTEL',   // legacy alias
  daycare:        'DAYCARE',
  trainer:        'TRAINER',
  park:           'TRAINER',     // legacy alias
  spa:            'SPA',
  shelter:        'SHELTER',
  photography:    'PHOTOGRAPHY',
  transportation: 'TRANSPORTATION',
  pharmacy:       'PHARMACY',
  other:          'TRAINER',     // legacy alias
};

const FROM_BACKEND: Record<BackendServiceType, Service['type']> = {
  VET:                    'vet',
  VETERINARY_EMERGENCY:   'emergency_vet',
  GROOMER:                'groomer',
  PET_STORE:              'pet_store',
  PET_HOTEL:              'pet_hotel',
  DAYCARE:                'daycare',
  TRAINER:                'trainer',
  SPA:                    'spa',
  SHELTER:                'shelter',
  PHOTOGRAPHY:            'photography',
  TRANSPORTATION:         'transportation',
  PHARMACY:               'pharmacy',
};

const toBackendType = (type?: ServiceFilters['type']): BackendServiceType | undefined =>
  type ? (TO_BACKEND[type] ?? undefined) : undefined;

const fromBackendType = (type: BackendServiceType): Service['type'] =>
  FROM_BACKEND[type] ?? 'vet';

const normalizeService = (service: BackendService): Service => ({
  id:                service.id,
  ownerId:           service.ownerId,
  ownerName:         service.owner?.name,
  ownerAvatarUrl:    service.owner?.avatarUrl ?? undefined,
  name:              service.name,
  type:              fromBackendType(service.type),
  types:             service.types?.map(fromBackendType),
  address:           service.address,
  city:              service.city,
  latitude:          service.latitude,
  longitude:         service.longitude,
  phone:             service.phone    ?? undefined,
  email:             service.email    ?? undefined,
  website:           service.website  ?? undefined,
  description:       service.description ?? undefined,
  logoUrl:           service.logoUrl  ?? undefined,
  photos:            service.photos   ?? [],
  openingHours:      service.openingHours ?? undefined,
  tags:              service.tags      ?? [],
  specialties:       service.specialties ?? [],
  facebook:          service.facebook  ?? undefined,
  instagram:         service.instagram ?? undefined,
  rating:            Number(service.averageRating ?? 0),
  reviewCount:       Number(service.reviewCount   ?? 0),
  isVerified:        Boolean(service.isVerified),
  isHighlyRecommended: Number(service.averageRating ?? 0) >= 4.7 && Number(service.reviewCount ?? 0) >= 10,
  createdAt:         service.createdAt,
  updatedAt:         service.updatedAt,
});

const PAGE_SIZE = 20;

export function useServices(filters?: ServiceFilters) {
  const query = useInfiniteQuery({
    queryKey: ['services', filters],
    queryFn: async ({ pageParam }: { pageParam: number }) => {
      const params = new URLSearchParams();
      const backendType = toBackendType(filters?.type);
      if (backendType) params.append('type', backendType);
      if (filters?.city) params.append('city', filters.city);
      if (filters?.latitude !== undefined) params.append('lat', String(filters.latitude));
      if (filters?.longitude !== undefined) params.append('lng', String(filters.longitude));
      if (filters?.radiusKm !== undefined) params.append('radius', String(filters.radiusKm));
      if (filters?.query) params.append('q', filters.query);
      params.append('page', String(pageParam));
      params.append('limit', String(PAGE_SIZE));

      const q = params.toString();
      const response = await api.get<ApiWrapped<BackendService[]>>(`/services${q ? `?${q}` : ''}`);
      const rawServices = Array.isArray(response.data?.data) ? response.data.data : [];
      return {
        services: rawServices.map(normalizeService),
        page: pageParam,
        hasMore: rawServices.length === PAGE_SIZE,
      };
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) => lastPage.hasMore ? lastPage.page + 1 : undefined,
    placeholderData: keepPreviousData,
    enabled: filters !== undefined,
  });

  const services = useMemo(
    () => query.data?.pages?.flatMap((p) => p.services) ?? [],
    [query.data],
  );

  return {
    services,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isFetchingNextPage: query.isFetchingNextPage,
    hasNextPage: !!query.hasNextPage,
    fetchNextPage: query.fetchNextPage,
    error: query.error,
    refetch: () => query.refetch(),
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
