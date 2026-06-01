import React, { useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ActivityIndicator, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Heart, Home, Users, PawPrint, ChevronRight } from 'lucide-react-native';
import { MatchStories } from '../../../components/pawmatch/MatchStories';
import { Colors } from '../../../constants/colors';
import { usePetStore } from '../../../store/petStore';
import { usePawMatchStore } from '../../../store/pawmatchStore';
import { MatchMode } from '../../../types';

const MODES: {
  mode: MatchMode;
  label: string;
  subtitle: string;
  icon: React.ReactNode;
  color: string;
  bg: string;
}[] = [
  { mode: 'BREED',    label: 'Breed',    subtitle: 'Find a mate',          icon: <Heart size={28} color={Colors.error} />, color: Colors.error, bg: '#FFF1F2' },
  { mode: 'ADOPT',    label: 'Adopt',    subtitle: 'Find a forever home',  icon: <Home  size={28} color="#7C3AED" />, color: '#7C3AED', bg: '#F5F3FF' },
  { mode: 'PLAYDATE', label: 'Playdate', subtitle: 'Find a play companion',icon: <Users size={28} color="#0891B2" />, color: '#0891B2', bg: '#E0F2FE' },
];

export default function PawMatchHome() {
  const router = useRouter();
  const { pets, fetchPets, isLoading: petsLoading } = usePetStore();
  const { profiles, matches, fetchProfiles, fetchMatches, setMode } = usePawMatchStore();

  useEffect(() => { fetchPets(); }, []);

  useEffect(() => {
    // Sequential fetches to avoid concurrent writes to the shared matches array
    const load = async () => {
      for (const pet of pets) {
        fetchProfiles(pet.id);
        await fetchMatches(pet.id);
      }
    };
    if (pets.length > 0) load();
  }, [pets.length]);

  // How many pets have an active profile for a given mode
  const activePetCount = (mode: MatchMode) =>
    pets.filter((pet) =>
      (profiles[pet.id] ?? []).some((p) => p.mode === mode && p.isActive)
    ).length;

  const uniqueMatches = [...new Map(matches.map((m) => [m.id, m])).values()];

  const matchCount = (mode: MatchMode) =>
    uniqueMatches.filter((m) => m.isActive && m.mode === mode).length;

  const totalMatches = uniqueMatches.filter((m) => m.isActive).length;

  const handleModePress = (mode: MatchMode) => {
    setMode(mode);
    router.push({ pathname: '/pawmatch/swipe', params: { mode } });
  };

  if (petsLoading && pets.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator color={Colors.primary} style={{ marginTop: 60 }} />
      </SafeAreaView>
    );
  }

  if (pets.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>PawMatch</Text>
        </View>
        <View style={styles.emptyState}>
          <PawPrint size={48} color={Colors.neutral400} />
          <Text style={styles.emptyTitle}>No pets yet</Text>
          <Text style={styles.emptyText}>Add a pet to start matching</Text>
          <TouchableOpacity style={styles.addPetBtn} onPress={() => router.push('/pet/add')}>
            <Text style={styles.addPetBtnText}>Add a Pet</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>PawMatch</Text>
        <Text style={styles.subtitle}>Swipe to connect your pets</Text>
      </View>

      <MatchStories />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Mode tiles */}
        {MODES.map(({ mode, label, subtitle, icon, color, bg }) => {
          const active = activePetCount(mode);
          const matches = matchCount(mode);
          const hasActive = active > 0;

          return (
            <TouchableOpacity
              key={mode}
              style={[styles.modeTile, { borderLeftColor: color }, !hasActive && styles.modeTileInactive]}
              onPress={() => handleModePress(mode)}
              activeOpacity={0.82}
            >
              <View style={[styles.modeIcon, { backgroundColor: bg }]}>{icon}</View>

              <View style={styles.modeInfo}>
                <Text style={styles.modeLabel}>{label}</Text>
                <Text style={styles.modeSubtitle}>{subtitle}</Text>
                <Text style={[styles.modeActive, { color: hasActive ? Colors.success : Colors.textDisabled }]}>
                  {hasActive
                    ? `${active} pet${active !== 1 ? 's' : ''} active`
                    : 'Set up from a pet\'s profile'}
                </Text>
              </View>

              <View style={styles.modeRight}>
                {matches > 0 && (
                  <View style={[styles.badge, { backgroundColor: color }]}>
                    <Text style={styles.badgeText}>{matches}</Text>
                  </View>
                )}
                <ChevronRight size={20} color={hasActive ? Colors.neutral400 : Colors.neutral300} />
              </View>
            </TouchableOpacity>
          );
        })}

        {/* Matches shortcut */}
        <TouchableOpacity
          style={styles.matchesRow}
          onPress={() => router.push('/(tabs)/pawmatch/matches')}
        >
          <Heart size={18} color={Colors.primary} />
          <Text style={styles.matchesRowText}>
            {totalMatches > 0
              ? `View ${totalMatches} active match${totalMatches !== 1 ? 'es' : ''}`
              : 'View matches'}
          </Text>
          <ChevronRight size={16} color={Colors.primary} />
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12 },
  title: { fontSize: 28, fontWeight: '800', color: Colors.textPrimary },
  subtitle: { fontSize: 14, color: Colors.textSecondary, marginTop: 2 },
  content: { padding: 16, paddingBottom: 100 },

  modeTile: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.surface, borderRadius: 18, padding: 18,
    marginBottom: 14, borderLeftWidth: 4,
    elevation: 2, shadowColor: Colors.neutral900,
    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 8,
  },
  modeTileInactive: { opacity: 0.7 },
  modeIcon: { width: 56, height: 56, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  modeInfo: { flex: 1 },
  modeLabel: { fontSize: 18, fontWeight: '800', color: Colors.textPrimary },
  modeSubtitle: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  modeActive: { fontSize: 12, fontWeight: '600', marginTop: 5 },
  modeRight: { alignItems: 'center', gap: 6 },
  badge: { width: 22, height: 22, borderRadius: 11, justifyContent: 'center', alignItems: 'center' },
  badgeText: { fontSize: 11, fontWeight: '700', color: '#fff' },

  matchesRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: Colors.primaryBg, borderRadius: 14,
    paddingHorizontal: 16, paddingVertical: 14, marginTop: 4,
  },
  matchesRowText: { flex: 1, fontSize: 14, fontWeight: '600', color: Colors.primary },

  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary },
  emptyText: { fontSize: 14, color: Colors.textSecondary },
  addPetBtn: { marginTop: 8, backgroundColor: Colors.primary, borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12 },
  addPetBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
