import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../../constants/colors';
import { ServiceCard } from '../../components/services/ServiceCard';
import { EmptyState } from '../../components/ui/EmptyState';
import { Loading } from '../../components/ui/Loading';
import { Badge } from '../../components/ui/Badge';
import { useServices } from '../../hooks/useServices';
import { useLocation } from '../../hooks/useLocation';
import { ServiceType } from '../../types';
import { Config } from '../../constants/config';
import { formatServiceType } from '../../lib/utils';

const SERVICE_TYPES: Array<{ key: ServiceType | 'all'; label: string }> = [
  { key: 'all', label: 'All' },
  { key: 'vet', label: 'Vets' },
  { key: 'groomer', label: 'Groomers' },
  { key: 'pet_shop', label: 'Pet Shops' },
  { key: 'park', label: 'Parks' },
  { key: 'boarding', label: 'Boarding' },
];

const RADIUS_OPTIONS = [1, 5, 10, 25];

export default function ServicesScreen() {
  const router = useRouter();
  const { coordinates } = useLocation();
  const [selectedType, setSelectedType] = useState<ServiceType | 'all'>('all');
  const [selectedRadius, setSelectedRadius] = useState(Config.DEFAULT_RADIUS_KM);
  const [refreshing, setRefreshing] = useState(false);

  const { services, isLoading, refetch } = useServices({
    type: selectedType !== 'all' ? selectedType : undefined,
    latitude: coordinates?.latitude,
    longitude: coordinates?.longitude,
    radiusKm: selectedRadius,
  });

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  if (isLoading && services.length === 0) {
    return <Loading fullScreen />;
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Services</Text>
      </View>

      {/* Type filters */}
      <FlatList
        horizontal
        data={SERVICE_TYPES}
        keyExtractor={(item) => item.key}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterList}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[
              styles.filterChip,
              selectedType === item.key && styles.filterChipActive,
            ]}
            onPress={() => setSelectedType(item.key)}
          >
            <Text
              style={[
                styles.filterChipText,
                selectedType === item.key && styles.filterChipTextActive,
              ]}
            >
              {item.label}
            </Text>
          </TouchableOpacity>
        )}
      />

      {/* Radius filters */}
      <View style={styles.radiusRow}>
        <Text style={styles.radiusLabel}>Radius:</Text>
        <View style={styles.radiusOptions}>
          {RADIUS_OPTIONS.map((r) => (
            <TouchableOpacity
              key={r}
              style={[
                styles.radiusChip,
                selectedRadius === r && styles.radiusChipActive,
              ]}
              onPress={() => setSelectedRadius(r)}
            >
              <Text
                style={[
                  styles.radiusChipText,
                  selectedRadius === r && styles.radiusChipTextActive,
                ]}
              >
                {r}km
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Service list */}
      <FlatList
        data={services}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={Colors.primary} />
        }
        ListEmptyComponent={
          <EmptyState
            icon="📍"
            title="No services found"
            description="Try adjusting your filters or search radius."
          />
        }
        renderItem={({ item }) => (
          <ServiceCard
            service={item}
            userLatitude={coordinates?.latitude}
            userLongitude={coordinates?.longitude}
            onPress={() => router.push(`/service/${item.id}`)}
          />
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  filterList: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  filterChipActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryBg,
  },
  filterChipText: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  filterChipTextActive: {
    color: Colors.primary,
    fontWeight: '700',
  },
  radiusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 8,
    gap: 12,
  },
  radiusLabel: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  radiusOptions: {
    flexDirection: 'row',
    gap: 8,
  },
  radiusChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  radiusChipActive: {
    borderColor: Colors.secondary,
    backgroundColor: Colors.secondaryBg,
  },
  radiusChipText: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  radiusChipTextActive: {
    color: Colors.secondary,
    fontWeight: '700',
  },
  list: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
});
