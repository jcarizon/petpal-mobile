import React, { useEffect, useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  RefreshControl,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BellOff, Plus, Bell, Search, SlidersHorizontal, MapPin, Navigation } from 'lucide-react-native';
import { Colors } from '../../constants/colors';
import { AlertCard } from '../../components/community/AlertCard';
import { Tabs } from '../../components/ui/Tabs';
import { EmptyState } from '../../components/ui/EmptyState';
import { Loading } from '../../components/ui/Loading';
import { PageBanner } from '../../components/ui';
import { useCommunityStore } from '../../store/communityStore';
import { useLocation } from '../../hooks/useLocation';
import { Alert as AlertType, AlertType as AlertTypeEnum } from '../../types';

const TABS = [
  { key: 'all',      label: 'All'      },
  { key: 'lost',     label: 'Lost'     },
  { key: 'found',    label: 'Found'    },
  { key: 'adoption', label: 'Adoption' },
  { key: 'playmate', label: 'Playmate' },
];

export default function CommunityScreen() {
  const router = useRouter();
  const { alerts, fetchAlerts, isLoading, activeFilters } = useCommunityStore();
  const {
    coordinates,
    hasPermission,
    isLoading: locationLoading,
    error: locationError,
    getCurrentLocation,
    requestPermission,
  } = useLocation();

  const [activeTab, setActiveTab]   = useState('all');
  const [refreshing, setRefreshing] = useState(false);
  // Request location on mount
  useEffect(() => {
    getCurrentLocation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const mergedFilters = useMemo(() => ({
    ...activeFilters,
    type:      activeTab === 'all' ? undefined : activeTab as AlertTypeEnum,
    latitude:  coordinates?.latitude,
    longitude: coordinates?.longitude,
  }), [activeFilters, activeTab, coordinates]);

  const load = useCallback(() => {
    fetchAlerts(mergedFilters);
  }, [fetchAlerts, mergedFilters]);

  // Only fetch alerts when we actually have coordinates
  useEffect(() => {
    if (coordinates) load();
  }, [load, coordinates]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await getCurrentLocation();
    await fetchAlerts(mergedFilters);
    setRefreshing(false);
  };

  const handleEnableLocation = async () => {
    const granted = await requestPermission();
    if (granted) {
      await getCurrentLocation();
    } else {
      // Open app settings so user can grant it manually
      Linking.openSettings();
    }
  };

  const filterCount = useMemo(() => {
    let n = 0;
    if (activeFilters.search?.trim())                          n++;
    if (activeFilters.species)                                 n++;
    if (activeFilters.breed?.trim())                           n++;
    if (activeFilters.dateRange && activeFilters.dateRange !== 'any') n++;
    if (activeFilters.sortBy === 'nearest')                    n++;
    if (activeFilters.radiusKm && activeFilters.radiusKm !== 10) n++;
    return n;
  }, [activeFilters]);

  // ── Location permission gate ──────────────────────────────────────────────
  if (!locationLoading && !hasPermission && !coordinates) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <PageBanner
          title="Community"
          subtitle="Find and report lost or found pets in your neighborhood."
          iconNode={<BellOff size={18} color={Colors.textInverse} />}
          rightNode={
            <TouchableOpacity style={styles.headerBtn} onPress={() => router.push('/notifications')}>
              <Bell size={18} color={Colors.textInverse} />
            </TouchableOpacity>
          }
        />
        <View style={styles.permissionContainer}>
          <View style={styles.permissionIconWrap}>
            <MapPin size={40} color={Colors.primary} />
          </View>
          <Text style={styles.permissionTitle}>Location Required</Text>
          <Text style={styles.permissionBody}>
            PetPal uses your location to show lost pets, found animals, and community alerts within 10 km of you. Your location is never shared publicly.
          </Text>
          <TouchableOpacity style={styles.permissionBtn} onPress={handleEnableLocation}>
            <Navigation size={16} color={Colors.surface} />
            <Text style={styles.permissionBtnText}>Enable Location Access</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── Getting location ──────────────────────────────────────────────────────
  if (locationLoading && !coordinates) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <PageBanner
          title="Community"
          subtitle="Find and report lost or found pets in your neighborhood."
          iconNode={<BellOff size={18} color={Colors.textInverse} />}
        />
        <View style={styles.permissionContainer}>
          <Loading />
          <Text style={styles.locationLoadingText}>Getting your location…</Text>
        </View>
      </SafeAreaView>
    );
  }

  // ── Location error (GPS failed, no coords) ────────────────────────────────
  if (!coordinates && locationError) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <PageBanner
          title="Community"
          subtitle="Find and report lost or found pets in your neighborhood."
          iconNode={<BellOff size={18} color={Colors.textInverse} />}
        />
        <View style={styles.permissionContainer}>
          <View style={styles.permissionIconWrap}>
            <Navigation size={40} color={Colors.error} />
          </View>
          <Text style={styles.permissionTitle}>Location Unavailable</Text>
          <Text style={styles.permissionBody}>
            Unable to get your location. A location is required to show nearby alerts within your area.
          </Text>
          <TouchableOpacity style={styles.permissionBtn} onPress={handleEnableLocation}>
            <Navigation size={16} color={Colors.surface} />
            <Text style={styles.permissionBtnText}>Retry Location</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── Main screen ───────────────────────────────────────────────────────────
  if (isLoading && alerts.length === 0) {
    return <Loading fullScreen />;
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <PageBanner
        title="Community"
        subtitle="Find and report lost or found pets in your neighborhood."
        helper={coordinates ? `Showing alerts within ${activeFilters.radiusKm ?? 10} km of you.` : undefined}
        iconNode={<BellOff size={18} color={Colors.textInverse} />}
        rightNode={
          <View style={styles.headerButtons}>
            <TouchableOpacity style={styles.headerBtn} onPress={() => router.push('/notifications')}>
              <Bell size={18} color={Colors.textInverse} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.headerBtn, { backgroundColor: Colors.textInverse }]}
              onPress={() => router.push('/alert/create')}
            >
              <Plus size={18} color={Colors.primary} />
            </TouchableOpacity>
          </View>
        }
      />

      {/* Search bar */}
      <TouchableOpacity
        style={styles.searchBar}
        activeOpacity={0.7}
        onPress={() => router.push('/community/filter')}
      >
        <Search size={16} color={Colors.textSecondary} />
        <Text
          style={[styles.searchBarText, activeFilters.search ? styles.searchBarTextFilled : null]}
          numberOfLines={1}
        >
          {activeFilters.search?.trim() || 'Search alerts…'}
        </Text>
        <View style={styles.searchBarRight}>
          {filterCount > 0 && (
            <View style={styles.filterBadge}>
              <Text style={styles.filterBadgeText}>{filterCount}</Text>
            </View>
          )}
          <SlidersHorizontal size={16} color={filterCount > 0 ? Colors.primary : Colors.textSecondary} />
        </View>
      </TouchableOpacity>

      {/* Type tabs */}
      <View style={styles.tabsContainer}>
        <Tabs tabs={TABS} activeTab={activeTab} onTabChange={setActiveTab} />
      </View>

      {/* Alert list */}
      <FlatList
        data={alerts as AlertType[]}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={styles.alertGap} />}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={Colors.primary} />
        }
        contentInsetAdjustmentBehavior="never"
        ListEmptyComponent={
          <EmptyState
            iconNode={<BellOff size={54} color={Colors.textSecondary} />}
            title="No alerts in your area"
            description={`No alerts found within ${activeFilters.radiusKm ?? 10} km. Try increasing the radius in filters.`}
            actionLabel="Report Alert"
            onAction={() => router.push('/alert/create')}
          />
        }
        renderItem={({ item }) => (
          <AlertCard
            alert={item}
            userLatitude={coordinates?.latitude}
            userLongitude={coordinates?.longitude}
            onPress={() => router.push(`/alert/${item.id}`)}
            onSightingsPress={() => router.push(`/alert/${item.id}?openModal=sightings`)}
            onFormPress={() => router.push(`/alert/${item.id}?openModal=form`)}
          />
        )}
      />

      {/* FAB — create alert */}
      <Pressable
        style={({ pressed }) => [styles.fab, pressed && styles.fabPressed]}
        onPress={() => router.push('/alert/create')}
      >
        <Plus size={24} color={Colors.textInverse} />
      </Pressable>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  headerBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // ── Permission ──
  permissionContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 36,
    gap: 16,
  },
  permissionIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.primaryBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  permissionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  permissionBody: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  permissionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
    backgroundColor: Colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 14,
  },
  permissionBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.surface,
  },
  locationLoadingText: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 12,
  },
  // ── Location error banner ──
  // ── Search bar ──
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 20,
    marginTop: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    backgroundColor: Colors.surface,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  searchBarText: {
    flex: 1,
    fontSize: 14,
    color: Colors.textSecondary,
  },
  searchBarTextFilled: {
    color: Colors.textPrimary,
    fontWeight: '500',
  },
  searchBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  filterBadge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  filterBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.surface,
  },
  // ── Tabs + list ──
  tabsContainer: {
    marginTop: 10,
    marginBottom: 12,
    marginHorizontal: 20,
  },
  list: {
    paddingTop: 0,
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  alertGap: {
    height: 12,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.error,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.error,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  fabPressed: {
    transform: [{ scale: 0.96 }],
  },
});
