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
  TouchableOpacity,
  TouchableWithoutFeedback,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as Haptics from 'expo-haptics';
import {
  Bell, LayoutGrid, LocateFixed, Map, MapPin, MapPinOff,
  RotateCcw, Search, SlidersHorizontal, Plus, Bookmark, X,
} from 'lucide-react-native';
import MapView, { Marker, Circle, PROVIDER_GOOGLE } from 'react-native-maps';
import { Colors } from '../../constants/colors';
import { ServiceCard } from '../../components/services/ServiceCard';
import { Tabs } from '../../components/ui/Tabs';
import { EmptyState } from '../../components/ui/EmptyState';
import { Loading } from '../../components/ui/Loading';
import { useServices } from '../../hooks/useServices';
import { useLocation } from '../../hooks/useLocation';
import { useAuthStore } from '../../store/authStore';
import { useSavedServicesStore } from '../../store/savedServicesStore';
import { isServiceProvider } from '../../types';
import { ServiceType, Service } from '../../types';
import { Config } from '../../constants/config';
import { useToast } from '../../components/ui';
import { formatServiceType } from '../../lib/utils';

// ─── Distance helpers ─────────────────────────────────────────────────────────

const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLng/2) * Math.sin(dLng/2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
};

// ─── Map marker helpers ───────────────────────────────────────────────────────

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

const isCombinationService = (types?: ServiceType[]): boolean => (types?.length ?? 0) > 1;

const ServiceMarker = ({ service }: { service: { type: ServiceType; types?: ServiceType[] } }) => {
  const types = service.types ?? [service.type];
  if (!isCombinationService(types)) return null;
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
  container:  { alignItems: 'center' },
  pin:        { backgroundColor: Colors.surface, borderRadius: 8, padding: 4, borderWidth: 2, borderColor: Colors.neutral300, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 3, elevation: 5 },
  colorRow:   { flexDirection: 'row', gap: 3 },
  colorDot:   { width: 10, height: 10, borderRadius: 5 },
  pinTip:     { width: 0, height: 0, borderLeftWidth: 6, borderRightWidth: 6, borderTopWidth: 8, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderTopColor: Colors.neutral300, marginTop: -1 },
});

// ─── Constants ────────────────────────────────────────────────────────────────

const SERVICE_TYPES: Array<{ key: ServiceType | 'all'; label: string; emoji: string }> = [
  { key: 'all',            label: 'All',           emoji: '🐾' },
  { key: 'vet',            label: 'Vets',          emoji: '🏥' },
  { key: 'emergency_vet',  label: 'Emergency',     emoji: '🚑' },
  { key: 'groomer',        label: 'Groomers',      emoji: '✂️' },
  { key: 'pet_store',      label: 'Pet Stores',    emoji: '🛍️' },
  { key: 'pet_hotel',      label: 'Hotels',        emoji: '🏨' },
  { key: 'daycare',        label: 'Daycare',       emoji: '🌞' },
  { key: 'trainer',        label: 'Trainers',      emoji: '🎓' },
  { key: 'spa',            label: 'Spa',           emoji: '💆' },
  { key: 'shelter',        label: 'Shelters',      emoji: '🏠' },
  { key: 'photography',    label: 'Photography',   emoji: '📸' },
  { key: 'transportation', label: 'Transport',     emoji: '🚗' },
  { key: 'pharmacy',       label: 'Pharmacy',      emoji: '💊' },
];

const RADIUS_OPTIONS: Array<{ key: number; label: string }> = [
  { key: 10,  label: '10km' },
  { key: 30,  label: '30km' },
  { key: 50,  label: '50km' },
  { key: 100, label: '100km' },
];

type SortBy = 'default' | 'top_rated' | 'most_reviews';
type MinRating = 0 | 3 | 4 | 4.5;

const SORT_OPTIONS: Array<{ key: SortBy; label: string }> = [
  { key: 'default',      label: 'Default' },
  { key: 'top_rated',    label: 'Top Rated' },
  { key: 'most_reviews', label: 'Most Reviews' },
];

const RATING_OPTIONS: Array<{ key: MinRating; label: string }> = [
  { key: 0,   label: 'Any' },
  { key: 3,   label: '3+ ★' },
  { key: 4,   label: '4+ ★' },
  { key: 4.5, label: '4.5+ ★' },
];

// ─── Header ───────────────────────────────────────────────────────────────────

function ServicesHeader({
  router,
  onAddService,
  viewMode,
  onToggleView,
}: {
  router: ReturnType<typeof useRouter>;
  onAddService: () => void;
  viewMode: 'cards' | 'map';
  onToggleView: () => void;
}) {
  return (
    <View style={styles.header}>
      <Text style={styles.headerTitle}>Services</Text>
      <View style={styles.headerActions}>
        <TouchableOpacity style={styles.headerIconBtn} onPress={() => router.push('/notifications')}>
          <Bell size={20} color={Colors.textPrimary} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.headerIconBtn} onPress={onToggleView}>
          {viewMode === 'cards' ? (
            <Map size={20} color={Colors.textPrimary} />
          ) : (
            <LayoutGrid size={20} color={Colors.textPrimary} />
          )}
        </TouchableOpacity>
        <TouchableOpacity style={styles.headerCreateBtn} onPress={onAddService}>
          <Plus size={18} color={Colors.surface} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Main screen ─────────────────────────────────────────────────────────────

export default function ServicesScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const savedStore = useSavedServicesStore();
  const canAddService = isServiceProvider(user?.role);

  const handleAddService = () => {
    if (canAddService) {
      router.push('/service/create');
    } else {
      router.push('/settings/become-provider');
    }
  };

  const mapCameraRef = useRef<any>(null);
  const { coordinates, getCurrentLocation, isLoading: isLocationLoading } = useLocation();
  const { showToast } = useToast();

  // ── Tab ───────────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<'all' | 'saved'>('all');

  // ── Applied filters ───────────────────────────────────────────────────────
  const [selectedType,   setSelectedType]   = useState<ServiceType | 'all'>('all');
  const [selectedRadius, setSelectedRadius] = useState(10);
  const [sortBy,         setSortBy]         = useState<SortBy>('default');
  const [minRating,      setMinRating]      = useState<MinRating>(0);

  // ── Draft filters (modal) ─────────────────────────────────────────────────
  const [isFilterModalVisible, setFilterModalVisible] = useState(false);
  const [draftType,      setDraftType]      = useState<ServiceType | 'all'>('all');
  const [draftRadius,    setDraftRadius]    = useState(10);
  const [draftSortBy,    setDraftSortBy]    = useState<SortBy>('default');
  const [draftMinRating, setDraftMinRating] = useState<MinRating>(0);

  // ── UI state ──────────────────────────────────────────────────────────────
  const [viewMode,          setViewMode]          = useState<'cards' | 'map'>('cards');
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null);
  const [refreshing,        setRefreshing]         = useState(false);
  const [nearMeEnabled,     setNearMeEnabled]      = useState(true);
  const [searchQuery,       setSearchQuery]        = useState('');
  const [debouncedSearch,   setDebouncedSearch]    = useState('');

  // Init saved store once on mount
  useEffect(() => { savedStore.init(); }, []);

  // Debounce search query
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchQuery.trim()), 500);
    return () => clearTimeout(t);
  }, [searchQuery]);

  const selectedTypeLabel = SERVICE_TYPES.find((i) => i.key === selectedType)?.label ?? 'All';

  const {
    services: rawServices, isLoading, isFetching,
    isFetchingNextPage, hasNextPage, fetchNextPage, refetch,
  } = useServices(
    activeTab === 'saved'
      ? undefined
      : {
          type: selectedType !== 'all' ? selectedType : undefined,
          latitude:  nearMeEnabled ? coordinates?.latitude  : undefined,
          longitude: nearMeEnabled ? coordinates?.longitude : undefined,
          radiusKm:  nearMeEnabled ? selectedRadius : undefined,
          query:     !nearMeEnabled && debouncedSearch ? debouncedSearch : undefined,
        }
  );

  // Background prefetch page 2 so load-more feels instant
  useEffect(() => {
    if (activeTab !== 'all' || !hasNextPage || isFetchingNextPage || isFetching) return;
    if (!rawServices || rawServices.length < 20) return;
    const t = setTimeout(() => fetchNextPage(), 2500);
    return () => clearTimeout(t);
  }, [rawServices?.length, hasNextPage, isFetchingNextPage, isFetching, activeTab]);

  const savedServices = useMemo(() => savedStore.getSavedServices(), [savedStore.savedIds]);

  // Apply client-side sort + rating filter
  const services = useMemo((): Service[] => {
    const base = activeTab === 'saved' ? savedServices : rawServices;
    const filtered = minRating > 0 ? base.filter((s) => s.rating >= minRating) : base;
    if (sortBy === 'top_rated')    return [...filtered].sort((a, b) => b.rating - a.rating);
    if (sortBy === 'most_reviews') return [...filtered].sort((a, b) => b.reviewCount - a.reviewCount);
    return filtered;
  }, [rawServices, savedServices, activeTab, sortBy, minRating]);

  useEffect(() => {
    if (!coordinates) getCurrentLocation();
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
    setDraftSortBy(sortBy);
    setDraftMinRating(minRating);
    setFilterModalVisible(true);
  };

  const applyFilters = () => {
    setSelectedType(draftType);
    setSelectedRadius(draftRadius);
    setSortBy(draftSortBy);
    setMinRating(draftMinRating);
    setSelectedServiceId(null);
    setFilterModalVisible(false);
    triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
  };

  // Instant-apply when tapping a chip in the modal (type / radius)
  const applyInstant = (
    nextType: ServiceType | 'all',
    nextRadius: number,
    nextSort: SortBy = draftSortBy,
    nextRating: MinRating = draftMinRating,
  ) => {
    setDraftType(nextType);   setSelectedType(nextType);
    setDraftRadius(nextRadius); setSelectedRadius(nextRadius);
    setDraftSortBy(nextSort);  setSortBy(nextSort);
    setDraftMinRating(nextRating); setMinRating(nextRating);
    setSelectedServiceId(null);
    setFilterModalVisible(false);
    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleToggleSave = (service: Service) => {
    triggerHaptic();
    const wasSaved = savedStore.isSaved(service.id);
    savedStore.toggleSave(service);
    showToast({
      type: 'success',
      title: wasSaved ? 'Removed from saved' : 'Service saved!',
      message: wasSaved ? undefined : 'Find it in the Saved tab.',
    });
  };

  const mapRegion = useMemo(() => {
    if (nearMeEnabled && coordinates) {
      const delta = selectedRadius <= 10 ? 0.12 : selectedRadius <= 30 ? 0.35 : selectedRadius <= 50 ? 0.60 : 1.20;
      return { latitude: coordinates.latitude, longitude: coordinates.longitude, latitudeDelta: delta, longitudeDelta: delta };
    }
    const latitude  = services[0]?.latitude  ?? coordinates?.latitude  ?? 10.3157;
    const longitude = services[0]?.longitude ?? coordinates?.longitude ?? 123.8854;
    return { latitude, longitude, latitudeDelta: 0.05, longitudeDelta: 0.05 };
  }, [nearMeEnabled, coordinates?.latitude, coordinates?.longitude, selectedRadius, services]);

  const selectedService = useMemo(
    () => services.find((s) => s.id === selectedServiceId) ?? null,
    [services, selectedServiceId]
  );

  const mapServices = useMemo(() => {
    if (!nearMeEnabled || !coordinates) return services;
    return services.filter((s) => calculateDistance(coordinates.latitude, coordinates.longitude, s.latitude, s.longitude) <= selectedRadius);
  }, [services, nearMeEnabled, coordinates, selectedRadius]);

  // Dismissible active filter chips
  const activeChips: Array<{ label: string; onDismiss: () => void }> = [];
  if (sortBy !== 'default') {
    const label = SORT_OPTIONS.find((o) => o.key === sortBy)?.label ?? sortBy;
    activeChips.push({ label, onDismiss: () => { setSortBy('default'); setDraftSortBy('default'); } });
  }
  if (minRating > 0) {
    activeChips.push({ label: `${minRating}+ ★`, onDismiss: () => { setMinRating(0); setDraftMinRating(0); } });
  }

  // Tab labels with saved count badge
  const screenTabs = useMemo(() => {
    const count = savedStore.savedIds.length;
    return [
      { key: 'all',   label: 'All' },
      { key: 'saved', label: count > 0 ? `Saved (${count})` : 'Saved' },
    ];
  }, [savedStore.savedIds.length]);

  // Summary text below filter buttons
  const filterSummary = useMemo(() => {
    if (activeTab === 'saved') return `${services.length} saved`;
    const parts = [selectedTypeLabel, nearMeEnabled ? `${selectedRadius}km` : 'Search'];
    if (sortBy !== 'default') parts.push(SORT_OPTIONS.find((o) => o.key === sortBy)?.label ?? '');
    return parts.join(' • ');
  }, [activeTab, selectedTypeLabel, nearMeEnabled, selectedRadius, sortBy, services.length]);

  if (isLoading && activeTab === 'all' && services.length === 0) {
    return <Loading fullScreen />;
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style="dark" />
      <ServicesHeader
        router={router}
        onAddService={handleAddService}
        viewMode={viewMode}
        onToggleView={() => { setViewMode(viewMode === 'cards' ? 'map' : 'cards'); setSelectedServiceId(null); }}
      />

      {/* ── All / Saved tabs + filter icon ── */}
      <View style={styles.tabsContainer}>
        <View style={styles.tabsPill}>
          <Tabs tabs={screenTabs} activeTab={activeTab} onTabChange={(k) => setActiveTab(k as 'all' | 'saved')} />
        </View>
        {activeTab === 'all' && (
          <TouchableOpacity style={styles.filterIconBtn} onPress={openFilterModal}>
            {(sortBy !== 'default' || minRating > 0) && (
              <View style={styles.filterIconBadge}>
                <Text style={styles.filterIconBadgeText}>
                  {(sortBy !== 'default' ? 1 : 0) + (minRating > 0 ? 1 : 0)}
                </Text>
              </View>
            )}
            <SlidersHorizontal
              size={18}
              color={(sortBy !== 'default' || minRating > 0) ? Colors.primary : Colors.textSecondary}
            />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.screenBody}>

        {/* ── Filter toolbar (All tab only) ── */}
        {activeTab === 'all' && (
          <View style={styles.filterToolbar}>
            <View style={styles.filterToolbarLeft}>
              <Pressable
                style={({ pressed }) => [
                  styles.filterButton,
                  nearMeEnabled && styles.filterButtonActive,
                  pressed && styles.pressedScale,
                ]}
                onPress={async () => {
                  if (!nearMeEnabled) {
                    let coords = coordinates;
                    if (!coords) coords = await getCurrentLocation();
                    if (!coords) {
                      showToast({ type: 'warning', title: 'Location unavailable', message: 'Please enable location services to find nearby services.' });
                      return;
                    }
                    setNearMeEnabled(true);
                    setSearchQuery('');
                  } else {
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
                  setSelectedType('all'); setDraftType('all');
                  setSelectedRadius(10); setDraftRadius(10);
                  setSortBy('default'); setDraftSortBy('default');
                  setMinRating(0); setDraftMinRating(0);
                  setSelectedServiceId(null);
                  setNearMeEnabled(true);
                  setSearchQuery('');
                  refetch();
                }}
              >
                <RotateCcw size={16} color={Colors.primary} />
              </Pressable>
            </View>
            <Text style={styles.filterSummary}>{filterSummary}</Text>
          </View>
        )}

        {/* ── Active filter chips ── */}
        {activeTab === 'all' && activeChips.length > 0 && (
          <View style={styles.activeChipsRow}>
            {activeChips.map((chip) => (
              <Pressable
                key={chip.label}
                style={styles.activeChip}
                onPress={() => { chip.onDismiss(); triggerHaptic(); }}
              >
                <Text style={styles.activeChipText}>{chip.label}</Text>
                <X size={11} color={Colors.primary} />
              </Pressable>
            ))}
          </View>
        )}

        {/* ── Saved tab filter summary ── */}
        {activeTab === 'saved' && (
          <View style={styles.savedSummaryRow}>
            <Text style={styles.filterSummary}>{filterSummary}</Text>
          </View>
        )}

        {/* ── Search bar (Near Me off, All tab) ── */}
        {activeTab === 'all' && !nearMeEnabled && (
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

        {/* ── Cards view ── */}
        {viewMode === 'cards' ? (
          <FlatList
            data={services}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.list}
            refreshControl={
              activeTab === 'all'
                ? <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={Colors.primary} />
                : undefined
            }
            contentInsetAdjustmentBehavior="never"
            onEndReached={() => {
              if (activeTab === 'all' && hasNextPage && !isFetchingNextPage) fetchNextPage();
            }}
            onEndReachedThreshold={0.3}
            ListFooterComponent={
              isFetchingNextPage
                ? <ActivityIndicator size="small" color={Colors.primary} style={{ marginVertical: 16 }} />
                : null
            }
            removeClippedSubviews={true}
            windowSize={5}
            initialNumToRender={5}
            maxToRenderPerBatch={5}
            updateCellsBatchingPeriod={80}
            ListEmptyComponent={
              activeTab === 'saved' ? (
                <EmptyState
                  iconNode={<Bookmark size={54} color={Colors.textSecondary} />}
                  title="No saved services"
                  description="Tap the bookmark icon on any service to save it here."
                />
              ) : (
                <EmptyState
                  iconNode={<MapPinOff size={54} color={Colors.textSecondary} />}
                  title="No services found"
                  description="Try adjusting your filters or search radius."
                />
              )
            }
            renderItem={({ item }) => (
              <ServiceCard
                service={item}
                userLatitude={coordinates?.latitude}
                userLongitude={coordinates?.longitude}
                isSaved={savedStore.isSaved(item.id)}
                onSave={() => handleToggleSave(item)}
                onPress={() => router.push(`/service/${item.id}`)}
                onDirections={() => {
                  setViewMode('map');
                  setSelectedServiceId(item.id);
                  triggerHaptic();
                }}
              />
            )}
          />

        // ── Map view ──
        ) : activeTab === 'all' && nearMeEnabled && (!coordinates || isLocationLoading) ? (
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
              showsUserLocation={activeTab === 'all' && nearMeEnabled && Boolean(coordinates)}
              showsMyLocationButton={false}
              onPress={() => setSelectedServiceId(null)}
            >
              {activeTab === 'all' && nearMeEnabled && coordinates && (
                <Circle
                  center={{ latitude: coordinates.latitude, longitude: coordinates.longitude }}
                  radius={selectedRadius * 1000}
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
                    coordinate={{ latitude: service.latitude, longitude: service.longitude }}
                    pinColor={isCombo ? undefined : getMarkerColor(service.type)}
                    onPress={() => { setSelectedServiceId(service.id); triggerHaptic(); }}
                  >
                    {isCombo && <ServiceMarker service={service} />}
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
      </View>

      {/* ── Filter modal ── */}
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

                <Text style={styles.modalSectionTitle}>Sort By</Text>
                <View style={styles.optionWrap}>
                  {SORT_OPTIONS.map((item) => (
                    <Pressable
                      key={item.key}
                      style={({ pressed }) => [styles.optionChip, draftSortBy === item.key && styles.optionChipActive, pressed && styles.pressedScale]}
                      onPress={() => setDraftSortBy(item.key)}
                    >
                      <Text style={[styles.optionChipText, draftSortBy === item.key && styles.optionChipTextActive]}>{item.label}</Text>
                    </Pressable>
                  ))}
                </View>

                <Text style={styles.modalSectionTitle}>Minimum Rating</Text>
                <View style={styles.optionWrap}>
                  {RATING_OPTIONS.map((item) => (
                    <Pressable
                      key={String(item.key)}
                      style={({ pressed }) => [styles.optionChip, draftMinRating === item.key && styles.optionChipActive, pressed && styles.pressedScale]}
                      onPress={() => setDraftMinRating(item.key)}
                    >
                      <Text style={[styles.optionChipText, draftMinRating === item.key && styles.optionChipTextActive]}>{item.label}</Text>
                    </Pressable>
                  ))}
                </View>

                <Text style={styles.modalSectionTitle}>Service Type</Text>
                <View style={styles.optionWrap}>
                  {SERVICE_TYPES.map((item) => (
                    <Pressable
                      key={item.key}
                      style={({ pressed }) => [styles.optionChip, draftType === item.key && styles.optionChipActive, pressed && styles.pressedScale]}
                      onPress={() => applyInstant(item.key, draftRadius, draftSortBy, draftMinRating)}
                    >
                      <Text style={[styles.optionChipText, draftType === item.key && styles.optionChipTextActive]}>{item.emoji} {item.label}</Text>
                    </Pressable>
                  ))}
                </View>

                <Text style={styles.modalSectionTitle}>Radius</Text>
                <View style={styles.optionWrap}>
                  {RADIUS_OPTIONS.map((item) => (
                    <Pressable
                      key={item.key}
                      style={({ pressed }) => [styles.optionChip, draftRadius === item.key && styles.optionChipActive, pressed && styles.pressedScale]}
                      onPress={() => applyInstant(draftType, item.key, draftSortBy, draftMinRating)}
                    >
                      <Text style={[styles.optionChipText, draftRadius === item.key && styles.optionChipTextActive]}>{item.label}</Text>
                    </Pressable>
                  ))}
                </View>

                <View style={styles.modalActions}>
                  <Pressable
                    style={({ pressed }) => [styles.modalSecondaryBtn, pressed && styles.pressedScale]}
                    onPress={() => {
                      setDraftType('all');      setSelectedType('all');
                      setDraftRadius(10); setSelectedRadius(10);
                      setDraftSortBy('default'); setSortBy('default');
                      setDraftMinRating(0);     setMinRating(0);
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

      {/* ── Map service popup modal ── */}
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
                <View style={styles.serviceModalAccent} />
                <View style={styles.serviceModalHeader}>
                  <View style={[styles.serviceModalTypeBadge, { backgroundColor: Colors.primaryBg }]}>
                    <Text style={styles.serviceModalTypeBadgeText}>{formatServiceType(selectedService.type)}</Text>
                  </View>
                  <View style={styles.serviceModalHeaderRight}>
                    <Pressable
                      style={({ pressed }) => [styles.serviceModalIconBtn, pressed && styles.pressedScale]}
                      onPress={() => handleToggleSave(selectedService)}
                    >
                      <Bookmark
                        size={16}
                        color={savedStore.isSaved(selectedService.id) ? Colors.secondary : Colors.textSecondary}
                        fill={savedStore.isSaved(selectedService.id) ? Colors.secondary : 'none'}
                      />
                    </Pressable>
                    <Pressable
                      style={({ pressed }) => [styles.serviceModalCloseBtn, pressed && styles.pressedScale]}
                      onPress={() => setSelectedServiceId(null)}
                    >
                      <Text style={styles.serviceModalCloseText}>×</Text>
                    </Pressable>
                  </View>
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
                      triggerHaptic();
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
                    <Text style={styles.serviceModalBtnPrimaryText}>View Details</Text>
                  </Pressable>
                </View>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },

  // ── Header ──
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: Colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerIconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.neutral100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCreateBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Tabs + filter icon (community screen pattern) ──
  tabsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 12,
    backgroundColor: Colors.background,
  },
  tabsPill: {
    flex: 1,
    minHeight: 46,
    backgroundColor: Colors.neutral100,
    borderRadius: 12,
    padding: 5,
    justifyContent: 'center',
  },
  filterIconBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
    position: 'relative',
  },
  filterIconBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    minWidth: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
    zIndex: 1,
  },
  filterIconBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: Colors.surface,
  },

  screenBody: {
    flex: 1,
  },

  // ── Filter toolbar ──
  filterToolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 6,
    gap: 10,
  },
  filterToolbarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  filterButton: {
    minHeight: 34,
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
    width: 34,
    height: 34,
    borderRadius: 10,
    borderWidth: 1.2,
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterSummary: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: '600',
    flexShrink: 1,
    textAlign: 'right',
  },

  // ── Active filter chips ──
  activeChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  activeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: Colors.primaryBg,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  activeChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.primary,
  },

  // ── Saved tab summary ──
  savedSummaryRow: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 6,
    alignItems: 'flex-end',
  },

  // ── Search ──
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginBottom: 10,
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

  // ── Cards list ──
  list: {
    paddingTop: 0,
    paddingHorizontal: 20,
    paddingBottom: 120,
  },

  // ── Map ──
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
  legendItem:    { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot:     { width: 9, height: 9, borderRadius: 999 },
  legendMulti:   { flexDirection: 'row', gap: 2 },
  legendMiniDot: { width: 6, height: 6, borderRadius: 3 },
  legendText:    { fontSize: 11, color: Colors.textSecondary, fontWeight: '600' },
  mapLoadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  mapLoadingText:      { fontSize: 14, color: Colors.textSecondary, fontWeight: '500' },
  mapEmptyWrap:        { flex: 1, paddingHorizontal: 20, paddingBottom: 120 },

  // ── Filter modal ──
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
  modalTitle:        { fontSize: 18, fontWeight: '800', color: Colors.textPrimary },
  modalSectionTitle: { marginTop: 2, fontSize: 13, fontWeight: '700', color: Colors.textSecondary },
  optionWrap:        { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
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
  optionChipActive:     { borderColor: Colors.primary, backgroundColor: Colors.primaryBg },
  optionChipText:       { fontSize: 12, fontWeight: '600', color: Colors.textSecondary },
  optionChipTextActive: { color: Colors.primary, fontWeight: '700' },
  modalActions:         { marginTop: 8, flexDirection: 'row', gap: 10 },
  modalSecondaryBtn: {
    flex: 1, minHeight: 40, borderRadius: 10,
    borderWidth: 1.2, borderColor: Colors.neutral300,
    alignItems: 'center', justifyContent: 'center',
  },
  modalSecondaryText: { fontSize: 13, fontWeight: '700', color: Colors.textSecondary },
  modalPrimaryBtn: {
    flex: 1, minHeight: 40, borderRadius: 10,
    backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  modalPrimaryText: { fontSize: 13, fontWeight: '700', color: Colors.textInverse },

  // ── Map service popup ──
  serviceModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(17,24,39,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  serviceModalCard: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 16,
    backgroundColor: Colors.surface,
    padding: 20,
    paddingTop: 16,
    shadowColor: Colors.neutral900,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 12,
    overflow: 'hidden',
  },
  serviceModalAccent: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    height: 4,
    backgroundColor: Colors.primary,
  },
  serviceModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  serviceModalTypeBadge: {
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6,
  },
  serviceModalTypeBadgeText: {
    fontSize: 11, fontWeight: '700', color: Colors.primary, textTransform: 'uppercase',
  },
  serviceModalHeaderRight: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
  },
  serviceModalIconBtn: {
    width: 28, height: 28, borderRadius: 999,
    backgroundColor: Colors.neutral100,
    alignItems: 'center', justifyContent: 'center',
  },
  serviceModalCloseBtn: {
    width: 28, height: 28, borderRadius: 999,
    backgroundColor: Colors.neutral100,
    alignItems: 'center', justifyContent: 'center',
  },
  serviceModalCloseText:   { fontSize: 20, lineHeight: 20, color: Colors.textSecondary },
  serviceModalName:        { fontSize: 20, fontWeight: '800', color: Colors.textPrimary, marginBottom: 4 },
  serviceModalLocation:    { fontSize: 14, fontWeight: '600', color: Colors.primary, marginBottom: 2 },
  serviceModalAddress:     { fontSize: 13, color: Colors.textSecondary, lineHeight: 18, marginBottom: 8 },
  serviceModalRatingRow:   { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 16 },
  serviceModalRatingStar:  { fontSize: 14, color: '#FBBF24' },
  serviceModalRatingText:  { fontSize: 14, fontWeight: '700', color: Colors.textPrimary },
  serviceModalReviewCount: { fontSize: 13, color: Colors.textSecondary },
  serviceModalActions: { flexDirection: 'row', gap: 10, marginTop: 4 },
  serviceModalBtnSecondary: {
    flex: 1, minHeight: 44, borderRadius: 10,
    borderWidth: 1.5, borderColor: Colors.primary,
    backgroundColor: Colors.surface,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
  },
  serviceModalBtnSecondaryText: { color: Colors.primary, fontSize: 13, fontWeight: '700' },
  serviceModalBtnPrimary: {
    flex: 1, minHeight: 44, borderRadius: 10,
    backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  serviceModalBtnPrimaryText: { color: Colors.textInverse, fontSize: 13, fontWeight: '700' },

  pressedScale: { transform: [{ scale: 0.97 }] },
});
