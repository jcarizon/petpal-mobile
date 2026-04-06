import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BellOff, Plus } from 'lucide-react-native';
import { Colors } from '../../constants/colors';
import { AlertCard } from '../../components/community/AlertCard';
import { Tabs } from '../../components/ui/Tabs';
import { EmptyState } from '../../components/ui/EmptyState';
import { Loading } from '../../components/ui/Loading';
import { PageBanner } from '../../components/ui';
import { useCommunityStore } from '../../store/communityStore';
import { useLocation } from '../../hooks/useLocation';
import { useAuthStore } from '../../store/authStore';
import { Alert as AlertType } from '../../types';

const TABS = [
  { key: 'all', label: 'All' },
  { key: 'lost', label: 'Lost' },
  { key: 'found', label: 'Found' },
  { key: 'me', label: 'Me' },
];

export default function CommunityScreen() {
  const router = useRouter();
  const { alerts, fetchAlerts, isLoading } = useCommunityStore();
  const { coordinates } = useLocation();
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState('all');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchAlerts({
      latitude: coordinates?.latitude,
      longitude: coordinates?.longitude,
      radiusKm: 10,
    });
  }, [fetchAlerts, coordinates]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchAlerts({
      latitude: coordinates?.latitude,
      longitude: coordinates?.longitude,
      radiusKm: 10,
    });
    setRefreshing(false);
  };

  const filteredAlerts = alerts.filter((a: AlertType) => {
    if (activeTab === 'all') return true;
    if (activeTab === 'me') return a.userId === user?.id;
    return a.type === activeTab;
  });

  if (isLoading && alerts.length === 0) {
    return <Loading fullScreen />;
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <PageBanner
        title="Community"
        subtitle="Find and report lost or found pets in your neighborhood."
        helper="Switch between tabs to focus on lost or found alerts."
        iconNode={<BellOff size={18} color={Colors.textInverse} />}
        rightNode={
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => router.push('/alert/create')}
          >
            <Plus size={20} color={Colors.primary} />
          </TouchableOpacity>
        }
      />

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <Tabs tabs={TABS} activeTab={activeTab} onTabChange={setActiveTab} />
      </View>

      {/* Alert List */}
      <FlatList
        data={filteredAlerts}
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
            description="Be the first to report a lost or found pet."
            actionLabel="Report Alert"
            onAction={() => router.push('/alert/create')}
          />
        }
        renderItem={({ item }) => (
          <View style={styles.alertCardWrap}>
            <AlertCard
              alert={item}
              userLatitude={coordinates?.latitude}
              userLongitude={coordinates?.longitude}
              onPress={() => router.push(`/alert/${item.id}`)}
            />
          </View>
        )}
      />

      {/* FAB */}
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
  addButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.textInverse,
    alignItems: 'center',
    justifyContent: 'center',
  },
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
  alertCardWrap: {
    marginBottom: 2,
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
