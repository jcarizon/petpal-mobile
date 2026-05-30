import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, RotateCcw } from 'lucide-react-native';
import { Colors } from '../../constants/colors';
import { useCommunityStore } from '../../store/communityStore';
import { AlertFilters } from '../../types';

// ── Option helpers ────────────────────────────────────────────────────────────

const RADIUS_OPTIONS: { label: string; value: number }[] = [
  { label: '10 km',  value: 10  },
  { label: '30 km',  value: 30  },
  { label: '50 km',  value: 50  },
  { label: '100 km', value: 100 },
];

const SPECIES_OPTIONS = ['Dog', 'Cat', 'Bird', 'Rabbit', 'Other'];
const SPECIES_VALUES: Record<string, string> = {
  Dog: 'DOG', Cat: 'CAT', Bird: 'BIRD', Rabbit: 'RABBIT', Other: 'OTHER',
};

const DATE_OPTIONS: { label: string; value: AlertFilters['dateRange'] }[] = [
  { label: 'Any time',     value: 'any' },
  { label: 'Last 24h',     value: '24h' },
  { label: 'Last 7 days',  value: '7d'  },
  { label: 'Last 30 days', value: '30d' },
];

const SORT_OPTIONS: { label: string; value: AlertFilters['sortBy'] }[] = [
  { label: '🕐 Newest first',  value: 'newest'  },
  { label: '📍 Nearest first', value: 'nearest' },
];

// ── Sub-components ────────────────────────────────────────────────────────────

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionLabel}>{label}</Text>
      {children}
    </View>
  );
}

function Chip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity
      style={[styles.chip, selected && styles.chipSelected]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{label}</Text>
    </TouchableOpacity>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function CommunityFilterScreen() {
  const router = useRouter();
  const { activeFilters, setFilters } = useCommunityStore();

  const [search,       setSearch]       = useState(activeFilters.search ?? '');
  const [radiusKm,     setRadiusKm]     = useState<number>(activeFilters.radiusKm ?? 10);
  const [species,      setSpecies]      = useState<string | undefined>(activeFilters.species);
  const [customSpecies,setCustomSpecies]= useState('');
  const [breed,        setBreed]        = useState(activeFilters.breed ?? '');
  const [dateRange,    setDateRange]    = useState<AlertFilters['dateRange']>(activeFilters.dateRange ?? 'any');
  const [sortBy,       setSortBy]       = useState<AlertFilters['sortBy']>(activeFilters.sortBy ?? 'newest');

  const handleApply = () => {
    const resolvedSpecies = species === 'OTHER' && customSpecies.trim()
      ? customSpecies.trim().toUpperCase()
      : species;

    setFilters({
      ...activeFilters,
      search:    search.trim() || undefined,
      radiusKm,
      species:   resolvedSpecies,
      breed:     breed.trim() || undefined,
      dateRange,
      sortBy,
    });
    router.back();
  };

  const handleReset = () => {
    setSearch('');
    setRadiusKm(10);
    setSpecies(undefined);
    setCustomSpecies('');
    setBreed('');
    setDateRange('any');
    setSortBy('newest');
    setFilters({ radiusKm: 10, sortBy: 'newest' });
    router.back();
  };

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <ArrowLeft size={20} color={Colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Filter Alerts</Text>
          <TouchableOpacity style={styles.resetBtn} onPress={handleReset}>
            <RotateCcw size={16} color={Colors.textSecondary} />
            <Text style={styles.resetText}>Reset</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Title search */}
          <Section label="Search by title">
            <View style={styles.inputWrap}>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. Lost golden retriever..."
                placeholderTextColor={Colors.textSecondary}
                value={search}
                onChangeText={setSearch}
                returnKeyType="search"
              />
            </View>
          </Section>

          {/* Radius */}
          <Section label="Search radius">
            <View style={styles.chipRow}>
              {RADIUS_OPTIONS.map((o) => (
                <Chip
                  key={o.value}
                  label={o.label}
                  selected={radiusKm === o.value}
                  onPress={() => setRadiusKm(o.value)}
                />
              ))}
            </View>
          </Section>

          {/* Species */}
          <Section label="Animal species">
            <View style={styles.chipRow}>
              {SPECIES_OPTIONS.map((s) => (
                <Chip
                  key={s}
                  label={s}
                  selected={species === SPECIES_VALUES[s]}
                  onPress={() => setSpecies(species === SPECIES_VALUES[s] ? undefined : SPECIES_VALUES[s])}
                />
              ))}
            </View>
            {species === 'OTHER' && (
              <View style={[styles.inputWrap, { marginTop: 10 }]}>
                <TextInput
                  style={styles.textInput}
                  placeholder="Specify species (e.g. Hamster, Turtle...)"
                  placeholderTextColor={Colors.textSecondary}
                  value={customSpecies}
                  onChangeText={setCustomSpecies}
                />
              </View>
            )}
          </Section>

          {/* Breed */}
          <Section label="Breed">
            <View style={styles.inputWrap}>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. Shih Tzu, Persian, Labrador..."
                placeholderTextColor={Colors.textSecondary}
                value={breed}
                onChangeText={setBreed}
              />
            </View>
          </Section>

          {/* Date posted */}
          <Section label="Date posted">
            <View style={styles.chipRow}>
              {DATE_OPTIONS.map((o) => (
                <Chip
                  key={o.value}
                  label={o.label}
                  selected={dateRange === o.value}
                  onPress={() => setDateRange(o.value)}
                />
              ))}
            </View>
          </Section>

          {/* Sort by */}
          <Section label="Sort by">
            <View style={styles.chipRow}>
              {SORT_OPTIONS.map((o) => (
                <Chip
                  key={o.value}
                  label={o.label}
                  selected={sortBy === o.value}
                  onPress={() => setSortBy(o.value)}
                />
              ))}
            </View>
          </Section>
        </ScrollView>

        {/* Apply button */}
        <View style={styles.footer}>
          <TouchableOpacity style={styles.applyBtn} onPress={handleApply} activeOpacity={0.85}>
            <Text style={styles.applyText}>Apply Filters</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.neutral100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  resetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  resetText: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 20,
    gap: 24,
  },
  section: {
    gap: 10,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  chipSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryBg,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  chipTextSelected: {
    color: Colors.primary,
  },
  inputWrap: {
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: 12,
    backgroundColor: Colors.surface,
    paddingHorizontal: 14,
    paddingVertical: 2,
  },
  textInput: {
    fontSize: 14,
    color: Colors.textPrimary,
    paddingVertical: 10,
  },
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingBottom: Platform.OS === 'ios' ? 28 : 16,
    backgroundColor: Colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
  },
  applyBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
  },
  applyText: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.surface,
  },
});
