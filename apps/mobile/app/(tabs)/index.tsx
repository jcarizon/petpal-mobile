import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../../constants/colors';
import { PetCard } from '../../components/pet/PetCard';
import { AlertCard } from '../../components/community/AlertCard';
import { Card } from '../../components/ui/Card';
import { Loading } from '../../components/ui/Loading';
import { useAuthStore } from '../../store/authStore';
import { usePetStore } from '../../store/petStore';
import { useCommunityStore } from '../../store/communityStore';
import { getGreeting } from '../../lib/utils';
import { useLocation } from '../../hooks/useLocation';

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { pets, fetchPets, isLoading: petsLoading } = usePetStore();
  const { alerts, fetchAlerts, isLoading: alertsLoading } = useCommunityStore();
  const { coordinates } = useLocation();
  const [refreshing, setRefreshing] = React.useState(false);

  useEffect(() => {
    fetchPets();
    fetchAlerts({ radiusKm: 10 });
  }, [fetchPets, fetchAlerts]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchPets(), fetchAlerts({ radiusKm: 10 })]);
    setRefreshing(false);
  };

  const recentAlerts = alerts.slice(0, 3);
  const greeting = getGreeting();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={Colors.primary} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>{greeting},</Text>
            <Text style={styles.name}>{user?.name?.split(' ')[0] ?? 'Friend'} 👋</Text>
          </View>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {user?.name?.charAt(0).toUpperCase() ?? 'U'}
            </Text>
          </View>
        </View>

        {/* Pet Carousel */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>My Pets</Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/pets')}>
              <Text style={styles.seeAll}>See all</Text>
            </TouchableOpacity>
          </View>

          {petsLoading ? (
            <Loading size="small" />
          ) : pets.length === 0 ? (
            <Card style={styles.emptyPets}>
              <Text style={styles.emptyPetsText}>🐾 Add your first pet</Text>
              <TouchableOpacity
                style={styles.addPetButton}
                onPress={() => router.push('/pet/add')}
              >
                <Text style={styles.addPetButtonText}>+ Add Pet</Text>
              </TouchableOpacity>
            </Card>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {pets.map((pet) => (
                <PetCard
                  key={pet.id}
                  pet={pet}
                  onPress={() => router.push(`/pet/${pet.id}`)}
                />
              ))}
              <TouchableOpacity
                style={styles.addPetCard}
                onPress={() => router.push('/pet/add')}
              >
                <Text style={styles.addPetIcon}>+</Text>
                <Text style={styles.addPetCardText}>Add Pet</Text>
              </TouchableOpacity>
            </ScrollView>
          )}
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.quickActions}>
            <TouchableOpacity
              style={[styles.quickAction, { backgroundColor: Colors.primaryBg }]}
              onPress={() => router.push('/pet/add')}
            >
              <Text style={styles.quickActionEmoji}>💉</Text>
              <Text style={[styles.quickActionText, { color: Colors.primary }]}>Add Record</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.quickAction, { backgroundColor: '#FEF2F2' }]}
              onPress={() => router.push('/alert/create')}
            >
              <Text style={styles.quickActionEmoji}>🚨</Text>
              <Text style={[styles.quickActionText, { color: Colors.error }]}>Report Lost</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.quickAction, { backgroundColor: Colors.secondaryBg }]}
              onPress={() => router.push('/(tabs)/services')}
            >
              <Text style={styles.quickActionEmoji}>📍</Text>
              <Text style={[styles.quickActionText, { color: Colors.secondary }]}>Services</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Community Alerts Snippet */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Community Alerts</Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/community')}>
              <Text style={styles.seeAll}>See all</Text>
            </TouchableOpacity>
          </View>

          {alertsLoading ? (
            <Loading size="small" />
          ) : recentAlerts.length === 0 ? (
            <Text style={styles.noAlertsText}>No alerts nearby</Text>
          ) : (
            recentAlerts.map((alert) => (
              <AlertCard
                key={alert.id}
                alert={alert}
                userLatitude={coordinates?.latitude}
                userLongitude={coordinates?.longitude}
                onPress={() => router.push(`/alert/${alert.id}`)}
              />
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  greeting: {
    fontSize: 16,
    color: Colors.textSecondary,
  },
  name: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: Colors.textInverse,
    fontWeight: '700',
    fontSize: 18,
  },
  section: {
    paddingHorizontal: 20,
    paddingTop: 24,
    gap: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  seeAll: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '600',
  },
  emptyPets: {
    alignItems: 'center',
    paddingVertical: 24,
    gap: 12,
  },
  emptyPetsText: {
    fontSize: 16,
    color: Colors.textSecondary,
  },
  addPetButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  addPetButtonText: {
    color: Colors.textInverse,
    fontWeight: '700',
    fontSize: 14,
  },
  addPetCard: {
    width: 100,
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.neutral100,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: Colors.border,
    borderStyle: 'dashed',
    gap: 8,
  },
  addPetIcon: {
    fontSize: 28,
    color: Colors.textSecondary,
  },
  addPetCardText: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  quickActions: {
    flexDirection: 'row',
    gap: 12,
  },
  quickAction: {
    flex: 1,
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    gap: 8,
  },
  quickActionEmoji: {
    fontSize: 24,
  },
  quickActionText: {
    fontSize: 12,
    fontWeight: '700',
  },
  noAlertsText: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    padding: 20,
  },
});
