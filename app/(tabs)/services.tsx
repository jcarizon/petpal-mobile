import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  RefreshControl,
  Modal,
  Linking,
  TouchableWithoutFeedback,
  Platform,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { LayoutGrid, LocateFixed, Map, MapPin, MapPinOff, RotateCcw, Search, SlidersHorizontal } from 'lucide-react-native';
import MapView, { Marker, Circle, PROVIDER_GOOGLE } from 'react-native-maps';
import { Colors } from '../../constants/colors';
import { ServiceCard } from '../../components/services/ServiceCard';
import { EmptyState } from '../../components/ui/EmptyState';
import { Loading } from '../../components/ui/Loading';
import { PageBanner } from '../../components/ui';
import { useServices } from '../../hooks/useServices';
import { useLocation } from '../../hooks/useLocation';
import { ServiceType } from '../../types';
import { Config } from '../../constants/config';
import { useToast } from '../../components/ui';
import { formatServiceType } from '../../lib/utils';

// Haversine formula to calculate distance between two coordinates in km
const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

// Helper to get marker color based on service type
const getMarkerColor = (type: ServiceType | string): string => {
  switch (type) {
    case 'vet': return Colors.serviceVet;
    case 'groomer': return Colors.serviceGroomer;
    case 'pet_shop': return Colors.servicePetShop;
    case 'boarding': return Colors.serviceBoarding;
    case 'park': return Colors.servicePark;
    default: return Colors.primary;
  }
};

// Check if service is a combination (offers multiple service types)
const isCombinationService = (types?: ServiceType[]): boolean => {
  return (types?.length ?? 0) > 1;
};

// Custom marker component for services
const ServiceMarker = ({ service, onPress }: { service: { type: ServiceType; types?: ServiceType[] }; onPress: () => void }) => {
  const types = service.types ?? [service.type];
  const isCombo = isCombinationService(types);
  
  if (!isCombo) {
    return null; // Use default pinColor marker
  }
  
  // For combination services, render a custom marker with multiple color dots
  return (
    <View style={markerStyles.container}>
      <View style={markerStyles.pin}>
        <View style={markerStyles.colorRow}>
          {types.slice(0, 3).map((t, i) => (
            <View key={i} style={[markerStyles.colorDot, { backgroundColor: getMarkerColor(t) }]} />
          ))}
        </View>
      </View>
      <View style={markerStyles.pinTip} />
    </View>
  );
};

const markerStyles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  pin: {
    backgroundColor: Colors.surface,
    borderRadius: 8,
    padding: 4,
    borderWidth: 2,
    borderColor: Colors.neutral300,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 5,
  },
  colorRow: {
    flexDirection: 'row',
    gap: 3,
  },
  colorDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  pinTip: {
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: Colors.neutral300,
    marginTop: -1,
  },
});

const SERVICE_TYPES: Array<{
  key: ServiceType | 'all';
  label: string;
}> = [
  { key: 'all', label: 'All' },
  { key: 'vet', label: 'Vets' },
  { key: 'groomer', label: 'Groomers' },
  { key: 'pet_shop', label: 'Pet Shop' },
  { key: 'park', label: 'Parks' },
  { key: 'boarding', label: 'Boarding' },
];

const RADIUS_OPTIONS: Array<{ key: number; label: string }> = [
  { key: 1, label: '1km' },
  { key: 5, label: '5km' },
  { key: 10, label: '10km' },
  { key: 25, label: '25km' },
];

export default function ServicesScreen() {
  const router = useRouter();
  const mapCameraRef = useRef<any>(null);
  const insets = useSafeAreaInsets();
  const { coordinates, getCurrentLocation, isLoading: isLocationLoading } = useLocation();
  const { showToast } = useToast();
  const [selectedType, setSelectedType] = useState<ServiceType | 'all'>('all');
  const [selectedRadius, setSelectedRadius] = useState(Config.DEFAULT_RADIUS_KM);
  const [isFilterModalVisible, setFilterModalVisible] = useState(false);
  const [draftType, setDraftType] = useState<ServiceType | 'all'>('all');
  const [draftRadius, setDraftRadius] = useState(Config.DEFAULT_RADIUS_KM);
  const [viewMode, setViewMode] = useState<'cards' | 'map'>('cards');
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [nearMeEnabled, setNearMeEnabled] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery.trim());
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const selectedTypeLabel = SERVICE_TYPES.find((item) => item.key === selectedType)?.label ?? 'All';

  const { services, isLoading, isFetching, refetch } = useServices({
    type: selectedType !== 'all' ? selectedType : undefined,
    latitude: nearMeEnabled ? coordinates?.latitude : undefined,
    longitude: nearMeEnabled ? coordinates?.longitude : undefined,
    radiusKm: nearMeEnabled ? selectedRadius : undefined,
    query: !nearMeEnabled && debouncedSearchQuery ? debouncedSearchQuery : undefined,
  });

  // Auto-fetch location on mount
  useEffect(() => {
    if (!coordinates) {
      getCurrentLocation();
    }
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const triggerHaptic = (style: Haptics.ImpactFeedbackStyle = Haptics.ImpactFeedbackStyle.Light) => {
    void Haptics.impactAsync(style).catch(() => undefined);
  };

  const openFilterModal = () => {
    setDraftType(selectedType);
    setDraftRadius(selectedRadius);
    setFilterModalVisible(true);
  };

  const applyFilters = () => {
    setSelectedType(draftType);
    setSelectedRadius(draftRadius);
    setSelectedServiceId(null);
    setFilterModalVisible(false);
    triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
  };

  const applyFiltersInstant = (nextType: ServiceType | 'all', nextRadius: number) => {
    setDraftType(nextType);
    setDraftRadius(nextRadius);
    setSelectedType(nextType);
    setSelectedRadius(nextRadius);
    setSelectedServiceId(null);
    setFilterModalVisible(false);
    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
  };

  const mapRegion = useMemo(() => {
    // Prioritize user coordinates when Near Me is enabled
    if (nearMeEnabled && coordinates) {
      // Adjust zoom based on selected radius
      const delta = selectedRadius <= 1 ? 0.015 : selectedRadius <= 5 ? 0.05 : selectedRadius <= 10 ? 0.1 : 0.25;
      return {
        latitude: coordinates.latitude,
        longitude: coordinates.longitude,
        latitudeDelta: delta,
        longitudeDelta: delta,
      };
    }
    // When not near me or no coordinates, use first service or default
    const latitude = services[0]?.latitude ?? coordinates?.latitude ?? 10.3157;
    const longitude = services[0]?.longitude ?? coordinates?.longitude ?? 123.8854;
    return {
      latitude,
      longitude,
      latitudeDelta: 0.05,
      longitudeDelta: 0.05,
    };
  }, [nearMeEnabled, coordinates?.latitude, coordinates?.longitude, selectedRadius, services]);

  const selectedService = useMemo(
    () => services.find((service) => service.id === selectedServiceId) ?? null,
    [services, selectedServiceId]
  );

  // Filter services for map display - only show those within radius when Near Me is enabled
  const mapServices = useMemo(() => {
    if (!nearMeEnabled || !coordinates) {
      return services;
    }
    return services.filter((service) => {
      const distance = calculateDistance(
        coordinates.latitude,
        coordinates.longitude,
        service.latitude,
        service.longitude
      );
      return distance <= selectedRadius;
    });
  }, [services, nearMeEnabled, coordinates, selectedRadius]);

  if (isLoading && services.length === 0) {
    return <Loading fullScreen />;
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style="dark" />
      <PageBanner
        title="Services"
        subtitle="Discover trusted pet services near your current location."
        helper="Filters adjust your radius and categories. Switch between cards and map."
        iconNode={<MapPin size={18} color={Colors.textInverse} />}
        style={[styles.serviceBanner, { marginTop: 0 }]}
      />
      <View style={styles.screenBody}>
    <View style={styles.filterToolbar}>
        <View style={styles.filterToolbarLeft}>
          <Pressable
            style={({ pressed }) => [styles.filterButton, pressed && styles.pressedScale]}
            onPress={openFilterModal}
          >
            <SlidersHorizontal size={16} color={Colors.primary} />
            <Text style={styles.filterButtonText}>Filters</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.filterButton, 
              nearMeEnabled && styles.filterButtonActive,
              pressed && styles.pressedScale
            ]}
            onPress={async () => {
              if (!nearMeEnabled) {
                // Turning ON near me
                let coords = coordinates;
                if (!coords) {
                  coords = await getCurrentLocation();
                }
                if (!coords) {
                  showToast({
                    type: 'warning',
                    title: 'Location unavailable',
                    message: 'Please enable location services to find nearby services.',
                  });
                  return;
                }
                setNearMeEnabled(true);
                setSearchQuery('');
              } else {
                // Turning OFF near me
                setNearMeEnabled(false);
              }
              setSelectedServiceId(null);
              triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
            }}
          >
            <LocateFixed size={16} color={nearMeEnabled ? Colors.textInverse : Colors.primary} />
            <Text style={[styles.filterButtonText, nearMeEnabled && styles.filterButtonTextActive]}>
              Near Me
            </Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.resetIconBtn, pressed && styles.pressedScale]}
            onPress={() => {
              setSelectedType('all');
              setSelectedRadius(Config.DEFAULT_RADIUS_KM);
              setSelectedServiceId(null);
              setNearMeEnabled(true);
              setSearchQuery('');
              refetch();
            }}
          >
            <RotateCcw size={16} color={Colors.primary} />
          </Pressable>
        </View>
        <Text style={styles.filterSummary}>
          {nearMeEnabled ? `${selectedTypeLabel} • ${selectedRadius}km` : `${selectedTypeLabel} • Search`}
        </Text>
      </View>

      {/* Search bar when Near Me is off */}
      {!nearMeEnabled && (
        <View style={styles.searchContainer}>
          <Search size={18} color={Colors.textSecondary} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name or city..."
            placeholderTextColor={Colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
            onSubmitEditing={() => refetch()}
          />
        </View>
      )}

      <View style={styles.viewToggleRow}>
        <Pressable
          style={({ pressed }) => [styles.viewTogglePress, pressed && styles.pressedScale]}
          onPress={() => {
            setViewMode('cards');
            setSelectedServiceId(null);
          }}
        >
          {viewMode === 'cards' ? (
            <LinearGradient colors={[Colors.primaryLight, Colors.primary]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.viewToggleActive}>
              <LayoutGrid size={16} color={Colors.textInverse} />
              <Text style={styles.viewToggleTextActive}>Cards</Text>
            </LinearGradient>
          ) : (
            <View style={styles.viewToggleCard}>
              <LayoutGrid size={16} color={Colors.textSecondary} />
              <Text style={styles.viewToggleText}>Cards</Text>
            </View>
          )}
        </Pressable>

        <Pressable
          style={({ pressed }) => [styles.viewTogglePress, pressed && styles.pressedScale]}
          onPress={() => setViewMode('map')}
        >
          {viewMode === 'map' ? (
            <LinearGradient colors={[Colors.primaryLight, Colors.primary]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.viewToggleActive}>
              <Map size={16} color={Colors.textInverse} />
              <Text style={styles.viewToggleTextActive}>Map</Text>
            </LinearGradient>
          ) : (
            <View style={styles.viewToggleCard}>
              <Map size={16} color={Colors.textSecondary} />
              <Text style={styles.viewToggleText}>Map</Text>
            </View>
          )}
        </Pressable>
      </View>

      {viewMode === 'cards' ? (
        <FlatList
          data={services}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={Colors.primary} />
          }
          contentInsetAdjustmentBehavior="never"
          ListEmptyComponent={
            <EmptyState
              iconNode={<MapPinOff size={54} color={Colors.textSecondary} />}
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
              onDirections={() => {
                setViewMode('map');
                setSelectedServiceId(item.id);
                triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
              }}
            />
          )}
        />
      ) : nearMeEnabled && (!coordinates || isLocationLoading) ? (
        <View style={styles.mapLoadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.mapLoadingText}>Getting your location...</Text>
        </View>
      ) : mapServices.length > 0 ? (
        <View style={styles.mapContainer}>
          <MapView
            ref={mapCameraRef}
            style={styles.map}
            provider={PROVIDER_GOOGLE}
            region={mapRegion}
            showsUserLocation={nearMeEnabled && Boolean(coordinates)}
            showsMyLocationButton={false}
            onPress={() => setSelectedServiceId(null)}
          >
            {/* Radius circle when Near Me is enabled */}
            {nearMeEnabled && coordinates && (
              <Circle
                center={{
                  latitude: coordinates.latitude,
                  longitude: coordinates.longitude,
                }}
                radius={selectedRadius * 1000} // Convert km to meters
                strokeColor={Colors.primary}
                strokeWidth={2}
                fillColor={`${Colors.primary}20`}
              />
            )}
            {mapServices.map((service) => {
              const isCombo = isCombinationService(service.types);
              return (
                <Marker
                  key={service.id}
                  coordinate={{
                    latitude: service.latitude,
                    longitude: service.longitude,
                  }}
                  pinColor={isCombo ? undefined : getMarkerColor(service.type)}
                  onPress={() => {
                    setSelectedServiceId(service.id);
                    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
                  }}
                >
                  {isCombo && <ServiceMarker service={service} onPress={() => {}} />}
                </Marker>
              );
            })}
          </MapView>

          <View style={styles.mapLegend}>
            <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: Colors.serviceVet }]} /><Text style={styles.legendText}>Vet</Text></View>
            <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: Colors.serviceGroomer }]} /><Text style={styles.legendText}>Groomer</Text></View>
            <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: Colors.servicePetShop }]} /><Text style={styles.legendText}>Shop</Text></View>
            <View style={styles.legendItem}>
              <View style={styles.legendMulti}>
                <View style={[styles.legendMiniDot, { backgroundColor: Colors.serviceVet }]} />
                <View style={[styles.legendMiniDot, { backgroundColor: Colors.servicePetShop }]} />
              </View>
              <Text style={styles.legendText}>Multi</Text>
            </View>
          </View>
          {/* Loading indicator for background fetching */}
          {isFetching && (
            <View style={styles.mapLoadingOverlay}>
              <ActivityIndicator size="small" color={Colors.primary} />
            </View>
          )}
        </View>
      ) : (
        <View style={styles.mapEmptyWrap}>
          <EmptyState
            iconNode={<MapPinOff size={54} color={Colors.textSecondary} />}
            title="No services to map"
            description="Try adjusting your filters or search radius."
          />
        </View>
      )}

      <Modal
        visible={isFilterModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setFilterModalVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setFilterModalVisible(false)}>
          <View style={styles.modalBackdrop}>
            <TouchableWithoutFeedback onPress={() => {}}>
              <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Filters</Text>

            <Text style={styles.modalSectionTitle}>Service Type</Text>
            <View style={styles.optionWrap}>
              {SERVICE_TYPES.map((item) => (
                <Pressable
                  key={item.key}
                  style={({ pressed }) => [
                    styles.optionChip,
                    draftType === item.key && styles.optionChipActive,
                    pressed && styles.pressedScale,
                  ]}
                  onPress={() => {
                    applyFiltersInstant(item.key, draftRadius);
                  }}
                >
                  <Text style={[styles.optionChipText, draftType === item.key && styles.optionChipTextActive]}>
                    {item.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.modalSectionTitle}>Radius</Text>
            <View style={styles.optionWrap}>
              {RADIUS_OPTIONS.map((item) => (
                <Pressable
                  key={item.key}
                  style={({ pressed }) => [
                    styles.optionChip,
                    draftRadius === item.key && styles.optionChipActive,
                    pressed && styles.pressedScale,
                  ]}
                  onPress={() => {
                    applyFiltersInstant(draftType, item.key);
                  }}
                >
                  <Text style={[styles.optionChipText, draftRadius === item.key && styles.optionChipTextActive]}>
                    {item.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            <View style={styles.modalActions}>
              <Pressable
                style={({ pressed }) => [styles.modalSecondaryBtn, pressed && styles.pressedScale]}
                onPress={() => {
                  setDraftType('all');
                  setDraftRadius(Config.DEFAULT_RADIUS_KM);
                  setSelectedType('all');
                  setSelectedRadius(Config.DEFAULT_RADIUS_KM);
                  setSelectedServiceId(null);
                  setFilterModalVisible(false);
                  triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
                }}
              >
                <Text style={styles.modalSecondaryText}>Reset</Text>
              </Pressable>

              <Pressable
                style={({ pressed }) => [styles.modalPrimaryBtn, pressed && styles.pressedScale]}
                onPress={applyFilters}
              >
                <Text style={styles.modalPrimaryText}>Apply</Text>
              </Pressable>
            </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      <Modal
        visible={Boolean(selectedService)}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedServiceId(null)}
      >
        <Pressable style={styles.serviceModalBackdrop} onPress={() => setSelectedServiceId(null)}>
          <Pressable style={styles.serviceModalCard} onPress={() => {}}>
            {selectedService && (
              <>
                <View style={styles.serviceModalHeader}>
                  <View style={[styles.serviceModalTypeBadge, { backgroundColor: Colors.primaryBg }]}>
                    <Text style={styles.serviceModalTypeBadgeText}>{formatServiceType(selectedService.type)}</Text>
                  </View>
                  <Pressable
                    style={({ pressed }) => [styles.serviceModalCloseBtn, pressed && styles.pressedScale]}
                    onPress={() => setSelectedServiceId(null)}
                  >
                    <Text style={styles.serviceModalCloseText}>×</Text>
                  </Pressable>
                </View>

                <Text style={styles.serviceModalName}>{selectedService.name}</Text>
                <Text style={styles.serviceModalLocation}>{selectedService.city}</Text>
                <Text style={styles.serviceModalAddress}>{selectedService.address}</Text>

                {selectedService.rating ? (
                  <View style={styles.serviceModalRatingRow}>
                    <Text style={styles.serviceModalRatingStar}>★</Text>
                    <Text style={styles.serviceModalRatingText}>{selectedService.rating.toFixed(1)}</Text>
                    {selectedService.reviewCount ? (
                      <Text style={styles.serviceModalReviewCount}>({selectedService.reviewCount} reviews)</Text>
                    ) : null}
                  </View>
                ) : null}

                <View style={styles.serviceModalActions}>
                  <Pressable
                    style={({ pressed }) => [styles.serviceModalBtnSecondary, pressed && styles.pressedScale]}
                    onPress={() => {
                      triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
                      Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${selectedService.latitude},${selectedService.longitude}`);
                    }}
                  >
                    <MapPin size={16} color={Colors.primary} />
                    <Text style={styles.serviceModalBtnSecondaryText}>Directions</Text>
                  </Pressable>
                  <Pressable
                    style={({ pressed }) => [styles.serviceModalBtnPrimary, pressed && styles.pressedScale]}
                    onPress={() => {
                      triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
                      setSelectedServiceId(null);
                      router.push(`/service/${selectedService.id}`);
                    }}
                  >
                    <Text style={styles.serviceModalBtnPrimaryText}>View Full Details</Text>
                  </Pressable>
                </View>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  screenBody: {
    flex: 1,
  },
  serviceBanner: {
    marginTop: 0,
    marginBottom: 8,
  },
  section: {
    marginTop: 32,
    marginHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: Colors.textPrimary,
    marginLeft: 10,
    letterSpacing: 0.1,
  },
  seeAll: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '700',
    letterSpacing: 0.1,
  },
  filterToolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 10,
    gap: 10,
  },
  filterToolbarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  filterButton: {
    minHeight: 36,
    borderRadius: 10,
    borderWidth: 1.2,
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryBg,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  filterButtonActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  filterButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primary,
  },
  filterButtonTextActive: {
    color: Colors.textInverse,
  },
  resetIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1.2,
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterSummary: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginBottom: 12,
    paddingHorizontal: 12,
    height: 44,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: Colors.textPrimary,
    paddingVertical: 0,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(17,24,39,0.38)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
    gap: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  modalSectionTitle: {
    marginTop: 2,
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  optionWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  optionChip: {
    minHeight: 34,
    borderRadius: 999,
    borderWidth: 1.2,
    borderColor: Colors.neutral200,
    backgroundColor: Colors.surface,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionChipActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryBg,
  },
  optionChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  optionChipTextActive: {
    color: Colors.primary,
    fontWeight: '700',
  },
  modalActions: {
    marginTop: 8,
    flexDirection: 'row',
    gap: 10,
  },
  modalSecondaryBtn: {
    flex: 1,
    minHeight: 40,
    borderRadius: 10,
    borderWidth: 1.2,
    borderColor: Colors.neutral300,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalSecondaryText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  modalPrimaryBtn: {
    flex: 1,
    minHeight: 40,
    borderRadius: 10,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalPrimaryText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textInverse,
  },
  list: {
    paddingTop: 0,
    paddingHorizontal: 20,
    paddingBottom: 120,
  },
  viewToggleRow: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  viewTogglePress: {
    flex: 1,
    minHeight: 40,
  },
  viewToggleCard: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: Colors.neutral200,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  viewToggleActive: {
    flex: 1,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  viewToggleText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  viewToggleTextActive: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textInverse,
  },
  mapContainer: {
    flex: 1,
    position: 'relative',
  },
  map: {
    flex: 1,
  },
  mapLegend: {
    position: 'absolute',
    top: 10,
    right: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.neutral200,
    backgroundColor: Colors.surface,
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 4,
  },
  mapLoadingOverlay: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 9,
    height: 9,
    borderRadius: 999,
  },
  legendMulti: {
    flexDirection: 'row',
    gap: 2,
  },
  legendMiniDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  legendText: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  serviceModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(17,24,39,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  serviceModalCard: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 16,
    backgroundColor: Colors.surface,
    padding: 20,
    shadowColor: Colors.neutral900,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 12,
  },
  serviceModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  serviceModalTypeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  serviceModalTypeBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.primary,
    textTransform: 'uppercase',
  },
  serviceModalCloseBtn: {
    width: 28,
    height: 28,
    borderRadius: 999,
    backgroundColor: Colors.neutral100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  serviceModalCloseText: {
    fontSize: 20,
    lineHeight: 20,
    color: Colors.textSecondary,
  },
  serviceModalName: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  serviceModalLocation: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
    marginBottom: 2,
  },
  serviceModalAddress: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
    marginBottom: 8,
  },
  serviceModalRatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 16,
  },
  serviceModalRatingStar: {
    fontSize: 14,
    color: '#FBBF24',
  },
  serviceModalRatingText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  serviceModalReviewCount: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  serviceModalActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  serviceModalBtnSecondary: {
    flex: 1,
    minHeight: 44,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    backgroundColor: Colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  serviceModalBtnSecondaryText: {
    color: Colors.primary,
    fontSize: 13,
    fontWeight: '700',
  },
  serviceModalBtnPrimary: {
    flex: 1,
    minHeight: 44,
    borderRadius: 10,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  serviceModalBtnPrimaryText: {
    color: Colors.textInverse,
    fontSize: 13,
    fontWeight: '700',
  },
  mapLoadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  mapLoadingText: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  mapEmptyWrap: {
    flex: 1,
    paddingHorizontal: 20,
    paddingBottom: 120,
  },
  pressedScale: {
    transform: [{ scale: 0.97 }],
  },
});
