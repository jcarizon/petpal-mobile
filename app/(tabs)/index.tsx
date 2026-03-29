import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Pressable,
  Animated,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Plus, Syringe, Search, Megaphone, PawPrint, BellRing, ChevronRight } from 'lucide-react-native';
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
  const entryAnim = React.useRef(new Animated.Value(0)).current;

  useEffect(() => {
    fetchPets();
    fetchAlerts({ radiusKm: 10 });
  }, [fetchPets, fetchAlerts]);

  useEffect(() => {
    Animated.timing(entryAnim, {
      toValue: 1,
      duration: 420,
      useNativeDriver: true,
    }).start();
  }, [entryAnim]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchPets(), fetchAlerts({ radiusKm: 10 })]);
    setRefreshing(false);
  };

  const recentAlerts = alerts.slice(0, 3);
  const greeting = getGreeting();
  const userName = user?.name?.split(' ')[0] ?? 'Friend';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={Colors.primary} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>{greeting},</Text>
            <Text style={styles.name}>{userName} 👋</Text>
            <Text style={styles.subtitle}>Everything your pet needs, in one place.</Text>
          </View>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {user?.name?.charAt(0).toUpperCase() ?? 'U'}
            </Text>
          </View>
        </View>

        <Animated.View
          style={{
            opacity: entryAnim,
            marginBottom: 18,
            transform: [
              {
                translateY: entryAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [8, 0],
                }),
              },
            ],
          }}
        >
          <LinearGradient
            colors={[Colors.primaryDark, Colors.primary, Colors.primaryLight]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroCard}
          >
            <View style={styles.heroTopRow}>
              <View style={styles.heroChip}>
                <PawPrint size={14} color={Colors.textInverse} />
                <Text style={styles.heroChipText}>{pets.length} pets</Text>
              </View>
              <View style={styles.heroChip}>
                <BellRing size={14} color={Colors.textInverse} />
                <Text style={styles.heroChipText}>{recentAlerts.length} alerts</Text>
              </View>
            </View>
            <Text style={styles.heroTitle}>Stay on top of your pet care</Text>
            <Text style={styles.heroDescription}>Track records, explore nearby services, and act fast on community alerts.</Text>
            <Pressable
              style={({ pressed }) => [styles.heroButton, pressed && styles.pressedScale]}
              onPress={() => router.push('/pet/add')}
            >
              <Text style={styles.heroButtonText}>Add New Pet</Text>
              <ChevronRight size={16} color={Colors.primaryDark} />
            </Pressable>
          </LinearGradient>
        </Animated.View>

        {/* Pet Carousel */}
        <View style={[styles.section, styles.sectionCard]}>
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
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.petRow}>
              {pets.map((pet) => (
                <PetCard
                  key={pet.id}
                  pet={pet}
                  onPress={() => router.push(`/pet/${pet.id}`)}
                />
              ))}
              <TouchableOpacity
                style={styles.addPetCard}
                activeOpacity={0.82}
                onPress={() => router.push('/pet/add')}
              >
                <Plus size={28} color={Colors.textSecondary} />
                <Text style={styles.addPetCardText}>Add Pet</Text>
              </TouchableOpacity>
            </ScrollView>
          )}
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
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
                { backgroundColor: Colors.neutral50, borderColor: Colors.error },
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
            <View style={styles.alertsList}>
              {recentAlerts.map((alert) => (
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
    paddingBottom: 132,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 8,
  },
  greeting: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  name: {
    fontSize: 26,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  subtitle: {
    marginTop: 2,
    fontSize: 13,
    color: Colors.textSecondary,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: Colors.primaryBg,
  },
  avatarText: {
    color: Colors.textInverse,
    fontWeight: '700',
    fontSize: 18,
  },
  heroCard: {
    marginHorizontal: 20,
    marginTop: 0,
    borderRadius: 20,
    padding: 18,
    gap: 10,
  },
  heroTopRow: {
    flexDirection: 'row',
    gap: 8,
  },
  heroChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
  },
  heroChipText: {
    color: Colors.textInverse,
    fontSize: 12,
    fontWeight: '700',
  },
  heroTitle: {
    color: Colors.textInverse,
    fontSize: 21,
    fontWeight: '800',
  },
  heroDescription: {
    color: Colors.textInverse,
    opacity: 0.95,
    fontSize: 13,
    lineHeight: 18,
  },
  heroButton: {
    marginTop: 4,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.surface,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  heroButtonText: {
    color: Colors.primaryDark,
    fontSize: 13,
    fontWeight: '800',
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
    width: 120,
    minHeight: 148,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.neutral100,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderStyle: 'dashed',
    gap: 8,
    shadowColor: Colors.neutral900,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  addPetCardText: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '600',
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
    borderRadius: 14,
    borderWidth: 1,
    gap: 10,
  },
  quickActionIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
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
  noAlertsText: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    padding: 20,
  },
});
