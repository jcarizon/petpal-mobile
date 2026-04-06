import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Pressable,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Plus, Syringe, Search, Megaphone, Sparkles, CircleDashed, Star, Fish, Bird, Rabbit } from 'lucide-react-native';
import { Colors } from '../../constants/colors';
import { PetCard } from '../../components/pet/PetCard';
import { AlertCard } from '../../components/community/AlertCard';
import { Card, PageBanner } from '../../components/ui';
import { Loading } from '../../components/ui/Loading';
import { useAuthStore } from '../../store/authStore';
import { usePetStore } from '../../store/petStore';
import { useCommunityStore } from '../../store/communityStore';
import { getGreeting } from '../../lib/utils';
import { useLocation } from '../../hooks/useLocation';

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const {
    pets,
    fetchPets,
    healthScores,
    fetchHealthRecords,
    isLoading: petsLoading,
  } = usePetStore();
  const { alerts, fetchAlerts, isLoading: alertsLoading } = useCommunityStore();
  const { coordinates } = useLocation();
  const [refreshing, setRefreshing] = React.useState(false);

  useEffect(() => {
    fetchPets();
    fetchAlerts({ radiusKm: 10 });
  }, [fetchPets, fetchAlerts]);

  useEffect(() => {
    pets.forEach((pet) => {
      const existingScore = healthScores[pet.id];
      if (!existingScore || existingScore.score == null) {
        fetchHealthRecords(pet.id);
      }
    });
  }, [pets, healthScores, fetchHealthRecords]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchPets(), fetchAlerts({ radiusKm: 10 })]);
    setRefreshing(false);
  };

  const recentAlerts = alerts.slice(0, 3);
  const greeting = getGreeting();
  const userName = user?.name?.split(' ')[0] ?? 'Friend';
  const petLabel = `${pets.length} pet${pets.length === 1 ? '' : 's'}`;
  const alertLabel = `${recentAlerts.length} alert${recentAlerts.length === 1 ? '' : 's'}`;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
        <ScrollView
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={Colors.primary} />
        }
        contentInsetAdjustmentBehavior="never"
      >
        <PageBanner
          title={`${greeting}, ${userName}`}
          subtitle="Everything your pet needs, in one place."
          helper={`${petLabel} · ${alertLabel} nearby`}
          iconNode={
            <View style={styles.bannerIconRow}>
              <Sparkles size={14} color={Colors.textInverse} />
              <Star size={12} color={Colors.textInverse} />
            </View>
          }
          rightNode={
            <View style={styles.bannerAvatar}>
              <Text style={styles.bannerAvatarText}>{user?.name?.charAt(0).toUpperCase() ?? 'U'}</Text>
              <View style={styles.bannerAvatarBadge}>
                <Star size={10} color={Colors.textInverse} fill={Colors.textInverse} />
              </View>
            </View>
          }
        />

        {/* Pet Carousel */}
        <View style={[styles.section, styles.sectionCard]}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <CircleDashed size={18} color={Colors.primary} />
              <Text style={styles.sectionTitle}>My Pets</Text>
            </View>
            <TouchableOpacity onPress={() => router.push('/(tabs)/pets')}>
              <Text style={styles.seeAll}>See all</Text>
            </TouchableOpacity>
          </View>

          {petsLoading ? (
            <Loading size="small" />
          ) : pets.length === 0 ? (
            <Card style={styles.emptyPets}>
              <View style={styles.emptyPetsDecor}>
                <CircleDashed size={32} color={Colors.primaryLight} />
              </View>
              <Text style={styles.emptyPetsText}>Add your first furry friend</Text>
              <TouchableOpacity
                style={styles.addPetButton}
                onPress={() => router.push('/pet/add')}
              >
                <Text style={styles.addPetButtonText}>+ Add Pet</Text>
              </TouchableOpacity>
            </Card>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.petRow}>
              {pets.map((pet) => (
                <PetCard
                  key={pet.id}
                  pet={pet}
                  onPress={() => router.push(`/pet/${pet.id}`)}
                  healthScore={healthScores[pet.id]?.score ?? null}
                />
              ))}
              <TouchableOpacity
                style={styles.addPetCard}
                activeOpacity={0.82}
                onPress={() => router.push('/pet/add')}
              >
                <View style={styles.addPetIcon}>
                  <Plus size={28} color={Colors.primary} />
                </View>
                <Text style={styles.addPetCardText}>Add Pet</Text>
              </TouchableOpacity>
            </ScrollView>
          )}
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <View style={styles.sectionTitleRow}>
            <Star size={18} color={Colors.secondary} />
            <Text style={styles.sectionTitle}>Quick Actions</Text>
          </View>
          <View style={styles.quickActions}>
            <Pressable
              style={({ pressed }) => [
                styles.quickAction,
                { backgroundColor: Colors.primaryBg, borderColor: Colors.primary },
                pressed && styles.pressedScale,
              ]}
              onPress={() => router.push('/pet/add')}
            >
              <View style={[styles.quickActionIconWrap, { backgroundColor: Colors.primary }]}>
                <Syringe size={16} color={Colors.textInverse} />
              </View>
              <Text style={[styles.quickActionText, { color: Colors.primary }]}>Add Record</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [
                styles.quickAction,
                { backgroundColor: '#FEF2F2', borderColor: Colors.error },
                pressed && styles.pressedScale,
              ]}
              onPress={() => router.push('/alert/create')}
            >
              <View style={[styles.quickActionIconWrap, { backgroundColor: Colors.error }]}>
                <Megaphone size={16} color={Colors.textInverse} />
              </View>
              <Text style={[styles.quickActionText, { color: Colors.error }]}>Report Lost</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [
                styles.quickAction,
                { backgroundColor: Colors.secondaryBg, borderColor: Colors.secondary },
                pressed && styles.pressedScale,
              ]}
              onPress={() => router.push('/(tabs)/services')}
            >
              <View style={[styles.quickActionIconWrap, { backgroundColor: Colors.secondary }]}>
                <Search size={16} color={Colors.textInverse} />
              </View>
              <Text style={[styles.quickActionText, { color: Colors.secondary }]}>Services</Text>
            </Pressable>
          </View>
        </View>

        {/* Community Alerts Snippet */}
        <View style={[styles.section, styles.sectionCard]}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <Megaphone size={18} color={Colors.error} />
              <Text style={styles.sectionTitle}>Community Alerts</Text>
            </View>
            <TouchableOpacity onPress={() => router.push('/(tabs)/community')}>
              <Text style={styles.seeAll}>See all</Text>
            </TouchableOpacity>
          </View>

          {alertsLoading ? (
            <Loading size="small" />
          ) : recentAlerts.length === 0 ? (
            <View style={styles.noAlertsContainer}>
              <CircleDashed size={24} color={Colors.neutral300} />
              <Text style={styles.noAlertsText}>No alerts nearby</Text>
              <Text style={styles.noAlertsSubtext}>Your neighborhood is safe!</Text>
            </View>
          ) : (
            <View style={styles.alertsList}>
              {recentAlerts.map((alert, index) => (
                <View key={alert.id} style={styles.alertItem}>
                  <AlertCard
                    alert={alert}
                    userLatitude={coordinates?.latitude}
                    userLongitude={coordinates?.longitude}
                    onPress={() => router.push(`/alert/${alert.id}`)}
                  />
                </View>
              ))}
            </View>
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
  contentContainer: {
    paddingTop: 0,
    paddingBottom: 132,
  },
  bannerIconRow: {
    flexDirection: 'row',
    gap: 4,
    alignItems: 'center',
  },
  bannerAvatar: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  bannerAvatarText: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.textInverse,
  },
  bannerAvatarBadge: {
    position: 'absolute',
    right: -4,
    bottom: -4,
    width: 22,
    height: 22,
    borderRadius: 12,
    backgroundColor: Colors.secondary,
    borderWidth: 2,
    borderColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  section: {
    paddingHorizontal: 20,
    marginTop: 18,
    marginBottom: 10,
    gap: 12,
  },
  sectionCard: {
    marginHorizontal: 20,
    marginTop: 0,
    marginBottom: 4,
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 14,
    borderRadius: 18,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: Colors.neutral900,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 5,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
  emptyPetsDecor: {
    backgroundColor: Colors.primaryBg,
    padding: 16,
    borderRadius: 50,
    marginBottom: 4,
  },
  emptyPetsText: {
    fontSize: 16,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  addPetButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  addPetButtonText: {
    color: Colors.textInverse,
    fontWeight: '700',
    fontSize: 14,
  },
  addPetCard: {
    width: 120,
    minHeight: 148,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primaryBg,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: Colors.primary,
    borderStyle: 'dashed',
    gap: 8,
  },
  addPetIcon: {
    backgroundColor: Colors.surface,
    padding: 12,
    borderRadius: 50,
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  addPetCardText: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: '700',
  },
  petRow: {
    gap: 16,
    paddingRight: 12,
    paddingVertical: 8,
  },
  quickActions: {
    flexDirection: 'row',
    gap: 14,
  },
  quickAction: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 110,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1.5,
    gap: 10,
    position: 'relative',
    overflow: 'hidden',
  },
  quickActionIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActionText: {
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  pressedScale: {
    transform: [{ scale: 0.97 }],
  },
  alertsList: {
    gap: 12,
  },
  alertItem: {
    marginBottom: 2,
  },
  noAlertsContainer: {
    alignItems: 'center',
    padding: 24,
    backgroundColor: Colors.neutral50,
    borderRadius: 12,
  },
  noAlertsText: {
    fontSize: 16,
    color: Colors.textSecondary,
    fontWeight: '500',
    marginTop: 8,
  },
  noAlertsSubtext: {
    fontSize: 13,
    color: Colors.textDisabled,
    marginTop: 4,
  },
});
