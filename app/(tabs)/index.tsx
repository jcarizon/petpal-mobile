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
import { Plus, Bell, BellOff, SlidersHorizontal, MapPin, Navigation } from 'lucide-react-native';
import { Colors } from '../../constants/colors';
import { AlertCard } from '../../components/community/AlertCard';
import { StoryFeedCard } from '../../components/community/StoryFeedCard';
import { EventFeedCard } from '../../components/community/EventFeedCard';
import { Tabs } from '../../components/ui/Tabs';
import { EmptyState } from '../../components/ui/EmptyState';
import { Loading } from '../../components/ui/Loading';
import { MatchStories } from '../../components/pawmatch/MatchStories';
import { CreatePostSheet } from '../../components/community/CreatePostSheet';
import { useCommunityStore } from '../../store/communityStore';
import { usePetStore } from '../../store/petStore';
import { useLocation } from '../../hooks/useLocation';
import { Alert as AlertType, AlertType as AlertTypeEnum, FeedItem } from '../../types';

const TABS = [
  { key: 'all',     label: 'All'     },
  { key: 'lost',    label: 'Lost'    },
  { key: 'found',   label: 'Found'   },
  { key: 'diaries', label: 'Diaries' },
  { key: 'events',  label: 'Events'  },
];

type CommunityListItem =
  | { kind: 'intro' }
  | { kind: 'tabs' }
  | { kind: 'empty' }
  | { kind: 'alert'; alert: AlertType }
  | { kind: 'story'; story: FeedItem['story'] }
  | { kind: 'event'; event: FeedItem['event'] };

function CommunityHeader({ router, showCreate, onCreatePress }: {
  router: ReturnType<typeof useRouter>;
  showCreate?: boolean;
  onCreatePress?: () => void;
}) {
  return (
    <View style={styles.header}>
      <Text style={styles.headerTitle}>Community</Text>
      <View style={styles.headerActions}>
        <TouchableOpacity style={styles.headerIconBtn} onPress={() => router.push('/notifications')}>
          <Bell size={20} color={Colors.textPrimary} />
        </TouchableOpacity>
        {showCreate && (
          <TouchableOpacity style={styles.headerCreateBtn} onPress={onCreatePress ?? (() => router.push('/alert/create'))}>
            <Plus size={18} color={Colors.surface} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

export default function CommunityScreen() {
  const router = useRouter();
  const { 
    alerts, 
    fetchAlerts, 
    fetchMoreAlerts,
    isLoading, 
    isLoadingMore,
    activeFilters, 
    events, 
    fetchEvents, 
    diaryFeed, 
    fetchDiaryFeed,
    fetchMoreDiaryFeed,
  } = useCommunityStore();
  const {
    coordinates,
    hasPermission,
    isLoading: locationLoading,
    error: locationError,
    getCurrentLocation,
    requestPermission,
  } = useLocation();

  const { pets } = usePetStore();
  const [activeTab, setActiveTab]     = useState('all');
  const [refreshing, setRefreshing]   = useState(false);
  const [showCreateSheet, setShowCreateSheet] = useState(false);

  useEffect(() => {
    getCurrentLocation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Only alerts respect the type filter — other feed sources always fetch all
  const mergedFilters = useMemo(() => ({
    ...activeFilters,
    type:      (activeTab === 'lost' || activeTab === 'found') ? activeTab as AlertTypeEnum : undefined,
    latitude:  coordinates?.latitude,
    longitude: coordinates?.longitude,
  }), [activeFilters, activeTab, coordinates]);

  const load = useCallback(() => {
    if (coordinates) {
      fetchAlerts(mergedFilters, 1, 20);
      fetchDiaryFeed(coordinates.latitude, coordinates.longitude, activeFilters.radiusKm ?? 25, 1, 20);
      fetchEvents();
    }
  }, [fetchAlerts, fetchDiaryFeed, fetchEvents, mergedFilters, coordinates, activeFilters.radiusKm]);

  useEffect(() => {
    if (coordinates) load();
  }, [load, coordinates]);

  // Build and sort the unified feed
  const unifiedFeed = useMemo((): FeedItem[] => {
    const items: FeedItem[] = [
      ...alerts.map((a) => ({ kind: 'alert' as const, sortDate: a.createdAt, alert: a })),
      ...diaryFeed.map((d) => ({ kind: 'story' as const, sortDate: d.createdAt, story: d })),
      ...events.map((e) => ({ kind: 'event' as const, sortDate: e.createdAt, event: e })),
    ];
    const filtered =
      activeTab === 'all'     ? items :
      activeTab === 'lost'    ? items.filter((i) => i.kind === 'alert' && i.alert?.type === 'lost') :
      activeTab === 'found'   ? items.filter((i) => i.kind === 'alert' && i.alert?.type === 'found') :
      activeTab === 'diaries' ? items.filter((i) => i.kind === 'story') :
      items.filter((i) => i.kind === 'event');
    return filtered.sort((a, b) => new Date(b.sortDate).getTime() - new Date(a.sortDate).getTime());
  }, [alerts, diaryFeed, events, activeTab]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      // Only refresh data with existing coordinates - don't re-fetch location
      // Location is already obtained on mount, no need to re-fetch on every refresh
      if (coordinates) {
        // Reset pagination to page 1 on refresh
        await Promise.all([
          fetchAlerts(mergedFilters, 1, 20),
          fetchDiaryFeed(coordinates.latitude, coordinates.longitude, activeFilters.radiusKm ?? 25, 1, 20),
          fetchEvents(),
        ]);
      }
    } finally {
      setRefreshing(false);
    }
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

  const handleLoadMore = useCallback(() => {
    if (activeTab === 'diaries') {
      if (coordinates) fetchMoreDiaryFeed(coordinates.latitude, coordinates.longitude, activeFilters.radiusKm ?? 25);
    } else if (activeTab === 'events') {
      // Events are loaded in full — no pagination
    } else {
      // 'all', 'lost', 'found': load more alerts
      fetchMoreAlerts(mergedFilters);
      // In 'all' tab also load more diaries so the merged feed stays balanced
      if (activeTab === 'all' && coordinates) {
        fetchMoreDiaryFeed(coordinates.latitude, coordinates.longitude, activeFilters.radiusKm ?? 25);
      }
    }
  }, [activeTab, coordinates, fetchMoreAlerts, fetchMoreDiaryFeed, mergedFilters, activeFilters.radiusKm]);

  const filterCount = useMemo(() => {
    let n = 0;
    if (activeFilters.species)                                 n++;
    if (activeFilters.breed?.trim())                           n++;
    if (activeFilters.dateRange && activeFilters.dateRange !== 'any') n++;
    if (activeFilters.sortBy === 'nearest')                    n++;
    if (activeFilters.radiusKm && activeFilters.radiusKm !== 10) n++;
    return n;
  }, [activeFilters]);

  const listData = useMemo<CommunityListItem[]>(() => {
    const feedRows: CommunityListItem[] = unifiedFeed.map((item) => {
      if (item.kind === 'story') return { kind: 'story' as const, story: item.story };
      if (item.kind === 'event') return { kind: 'event' as const, event: item.event };
      return { kind: 'alert' as const, alert: item.alert! };
    });
    return [
      { kind: 'intro' },
      { kind: 'tabs' },
      ...(feedRows.length > 0 ? feedRows : [{ kind: 'empty' as const }]),
    ];
  }, [unifiedFeed]);

  const renderListFooter = () => {
    if (!isLoadingMore) return null;
    return (
      <View style={styles.loadingFooter}>
        <Loading />
      </View>
    );
  };

  const renderItem = useCallback(({ item }: { item: CommunityListItem }) => {
    if (item.kind === 'intro') {
      return (
        <View>
          <CommunityHeader router={router} showCreate onCreatePress={() => setShowCreateSheet(true)} />
          <MatchStories />
        </View>
      );
    }

    if (item.kind === 'tabs') {
      return (
        <View style={styles.tabsContainer}>
          <View style={styles.tabsPill}>
            <Tabs tabs={TABS} activeTab={activeTab} onTabChange={setActiveTab} />
          </View>
          <TouchableOpacity
            style={styles.filterBtn}
            onPress={() => router.push('/community/filter')}
          >
            {filterCount > 0 && (
              <View style={styles.filterBadge}>
                <Text style={styles.filterBadgeText}>{filterCount}</Text>
              </View>
            )}
            <SlidersHorizontal size={18} color={filterCount > 0 ? Colors.primary : Colors.textSecondary} />
          </TouchableOpacity>
        </View>
      );
    }

    if (item.kind === 'empty') {
      return (
        <View style={styles.emptyWrap}>
          <EmptyState
            iconNode={<BellOff size={54} color={Colors.textSecondary} />}
            title="Nothing here yet"
            description="No posts found. Try a different tab or check back soon."
            actionLabel="Report Alert"
            onAction={() => router.push('/alert/create')}
          />
        </View>
      );
    }

    if (item.kind === 'story' && item.story) {
      return (
        <View style={styles.alertItem}>
          <StoryFeedCard
            entry={item.story}
            userLatitude={coordinates?.latitude}
            userLongitude={coordinates?.longitude}
          />
        </View>
      );
    }

    if (item.kind === 'event' && item.event) {
      return (
        <View style={styles.alertItem}>
          <EventFeedCard event={item.event} />
        </View>
      );
    }

    return (
      <View style={styles.alertItem}>
        <AlertCard
          alert={item.alert!}
          userLatitude={coordinates?.latitude}
          userLongitude={coordinates?.longitude}
          onPress={() => router.push(`/alert/${item.alert!.id}`)}
          onSightingsPress={() => router.push(`/alert/${item.alert!.id}?openModal=sightings`)}
          onFormPress={() => router.push(`/alert/${item.alert!.id}?openModal=form`)}
        />
      </View>
    );
  }, [activeTab, filterCount, coordinates, router]);

  // ── Location permission gate ──────────────────────────────────────────────
  if (!locationLoading && !hasPermission && !coordinates) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <CommunityHeader router={router} />
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
        <CommunityHeader router={router} />
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
        <CommunityHeader router={router} />
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
      {/* Alert list */}
      <FlatList
        data={listData}
        keyExtractor={(item) => {
          if (item.kind === 'alert') return 'alert-' + item.alert.id;
          if (item.kind === 'story') return 'story-' + item.story?.id;
          if (item.kind === 'event') return 'event-' + item.event?.id;
          return item.kind;
        }}
        contentContainerStyle={styles.list}
        stickyHeaderIndices={[1]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={Colors.primary} />
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={renderListFooter}
        contentInsetAdjustmentBehavior="never"
        removeClippedSubviews={true}
        maxToRenderPerBatch={10}
        updateCellsBatchingPeriod={50}
        renderItem={renderItem}
      />

      {/* FAB — create post */}
      <Pressable
        style={({ pressed }) => [styles.fab, pressed && styles.fabPressed]}
        onPress={() => setShowCreateSheet(true)}
      >
        <Plus size={24} color={Colors.textInverse} />
      </Pressable>

      <CreatePostSheet
        visible={showCreateSheet}
        onClose={() => setShowCreateSheet(false)}
        pets={pets}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  // ── Flat header ──
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
  // ── Tabs + list ──
  tabsContainer: {
    paddingTop: 10,
    paddingBottom: 12,
    paddingHorizontal: 20,
    backgroundColor: Colors.background,
    flexDirection: 'row',
    alignItems: 'center',
  },
  tabsPill: {
    flex: 1,
    minHeight: 46,
    backgroundColor: Colors.neutral100,
    borderRadius: 12,
    padding: 5,
    justifyContent: 'center',
  },
  filterBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
    position: 'relative',
  },
  filterBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    minWidth: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  filterBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: Colors.surface,
  },
  list: {
    paddingTop: 0,
    paddingBottom: 100,
  },
  alertItem: {
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  emptyWrap: {
    paddingHorizontal: 20,
  },
  loadingFooter: {
    paddingVertical: 20,
    alignItems: 'center',
    justifyContent: 'center',
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
