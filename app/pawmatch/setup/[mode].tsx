import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Colors } from '../../../constants/colors';
import { usePetStore } from '../../../store/petStore';
import { usePawMatchStore } from '../../../store/pawmatchStore';
import { MatchMode } from '../../../types';

const INPUT_BORDER = Colors.border;

export default function PawMatchSetup() {
  const { mode, petId } = useLocalSearchParams<{ mode: MatchMode; petId: string }>();
  const router = useRouter();
  const { pets } = usePetStore();
  const { upsertProfile, isLoading } = usePawMatchStore();

  const pet = pets.find((p) => p.id === petId) ?? pets[0];

  const [bio, setBio] = useState('');
  const [radius, setRadius] = useState('25');
  const [pedigreeNote, setPedigreeNote] = useState('');
  const [adoptionFee, setAdoptionFee] = useState('');
  const [isNeutered, setIsNeutered] = useState(false);
  const [isVaccinated, setIsVaccinated] = useState(false);
  const [idealOwnerNote, setIdealOwnerNote] = useState('');
  const [preferredArea, setPreferredArea] = useState('');
  const [schedule, setSchedule] = useState('');
  const [preferredSize, setPreferredSize] = useState<'small' | 'medium' | 'large' | 'any'>('any');
  const [energyLevel, setEnergyLevel] = useState<'low' | 'medium' | 'high' | 'any'>('any');
  const [vaccineRequired, setVaccineRequired] = useState(false);

  const modeLabel = mode === 'BREED' ? 'Breed' : mode === 'ADOPT' ? 'Adopt' : 'Playdate';

  const handleSave = async () => {
    if (!pet) { Alert.alert('No pet found'); return; }
    if (!bio.trim()) { Alert.alert('Please add a short bio for your pet'); return; }

    try {
      await upsertProfile({
        petId: pet.id,
        mode,
        bio: bio.trim(),
        preferredRadius: Number(radius) || 25,
        ...(mode === 'BREED' && { pedigreeNote: pedigreeNote.trim() || undefined }),
        ...(mode === 'ADOPT' && {
          adoptionFee: adoptionFee ? Number(adoptionFee) : undefined,
          isNeutered,
          isVaccinated,
          idealOwnerNote: idealOwnerNote.trim() || undefined,
        }),
        ...(mode === 'PLAYDATE' && {
          preferredArea: preferredArea.trim() || undefined,
          schedule: schedule.trim() || undefined,
          preferredSize,
          energyLevel,
          vaccineRequired,
        }),
      });
      router.replace({ pathname: '/pawmatch/swipe', params: { mode, petId: pet!.id } });
    } catch {
      Alert.alert('Error', 'Failed to save profile. Please try again.');
    }
  };

  if (!pet) return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.noPet}>No pet found. Please add a pet first.</Text>
    </SafeAreaView>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>✕</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Set Up {modeLabel} Profile</Text>
      </View>

      <ScrollView contentContainerStyle={styles.form} showsVerticalScrollIndicator={false}>
        <Text style={styles.label}>Pet Bio *</Text>
        <TextInput value={bio} onChangeText={setBio} placeholder={`Describe ${pet.name}...`} multiline />

        <Text style={styles.label}>Search Radius (km)</Text>
        <TextInput value={radius} onChangeText={setRadius} placeholder="25" keyboardType="numeric" />

        {mode === 'BREED' && (
          <>
            <Text style={styles.label}>Pedigree Note</Text>
            <TextInput value={pedigreeNote} onChangeText={setPedigreeNote} placeholder="Optional pedigree info..." multiline />
          </>
        )}

        {mode === 'ADOPT' && (
          <>
            <Text style={styles.label}>Adoption Fee (₱)</Text>
            <TextInput value={adoptionFee} onChangeText={setAdoptionFee} placeholder="0 = Free" keyboardType="numeric" />
            <Toggle label="Neutered / Spayed" value={isNeutered} onChange={setIsNeutered} />
            <Toggle label="Vaccinated" value={isVaccinated} onChange={setIsVaccinated} />
            <Text style={styles.label}>Ideal Owner Note</Text>
            <TextInput value={idealOwnerNote} onChangeText={setIdealOwnerNote} placeholder="What kind of home are you looking for?" multiline />
          </>
        )}

        {mode === 'PLAYDATE' && (
          <>
            <Text style={styles.label}>Preferred Area</Text>
            <TextInput value={preferredArea} onChangeText={setPreferredArea} placeholder="e.g. Ayala, IT Park" />
            <Text style={styles.label}>Schedule</Text>
            <TextInput value={schedule} onChangeText={setSchedule} placeholder="e.g. Weekends 7–9 AM" />
            <Text style={styles.label}>Preferred Companion Size</Text>
            <ChipGroup options={['small', 'medium', 'large', 'any']} value={preferredSize} onChange={(v) => setPreferredSize(v as typeof preferredSize)} />
            <Text style={styles.label}>Energy Level</Text>
            <ChipGroup options={['low', 'medium', 'high', 'any']} value={energyLevel} onChange={(v) => setEnergyLevel(v as typeof energyLevel)} />
            <Toggle label="Require Vaccination from Other Pet" value={vaccineRequired} onChange={setVaccineRequired} />
          </>
        )}

        <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={isLoading}>
          <Text style={styles.saveBtnText}>{isLoading ? 'Saving…' : 'Save & Start Swiping'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function TextInput({ value, onChangeText, placeholder, multiline = false, keyboardType = 'default' }: {
  value: string; onChangeText: (v: string) => void; placeholder: string; multiline?: boolean; keyboardType?: 'default' | 'numeric';
}) {
  const { TextInput: RNTextInput } = require('react-native');
  return (
    <RNTextInput
      style={[{ borderWidth: 1, borderColor: INPUT_BORDER, borderRadius: 10, padding: 12, marginBottom: 14, fontSize: 14, color: Colors.textPrimary, backgroundColor: Colors.surface }, multiline && { height: 80, textAlignVertical: 'top' }]}
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={Colors.textDisabled}
      multiline={multiline}
      keyboardType={keyboardType}
    />
  );
}

function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <TouchableOpacity style={styles.toggleRow} onPress={() => onChange(!value)}>
      <Text style={styles.toggleLabel}>{label}</Text>
      <View style={[styles.toggleTrack, value && styles.toggleTrackOn]}>
        <View style={[styles.toggleThumb, value && styles.toggleThumbOn]} />
      </View>
    </TouchableOpacity>
  );
}

function ChipGroup({ options, value, onChange }: { options: string[]; value: string; onChange: (v: string) => void }) {
  return (
    <View style={styles.chipRow}>
      {options.map((opt) => (
        <TouchableOpacity
          key={opt}
          style={[styles.chip, value === opt && styles.chipActive]}
          onPress={() => onChange(opt)}
        >
          <Text style={[styles.chipText, value === opt && styles.chipTextActive]}>{opt}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  headerRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, gap: 12 },
  backBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: Colors.neutral100, justifyContent: 'center', alignItems: 'center' },
  backBtnText: { fontSize: 14, color: Colors.textSecondary },
  title: { fontSize: 20, fontWeight: '700', color: Colors.textPrimary, flex: 1 },
  form: { paddingHorizontal: 16, paddingBottom: 60 },
  label: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary, marginBottom: 6, marginTop: 4 },
  saveBtn: { backgroundColor: Colors.primary, borderRadius: 14, padding: 16, alignItems: 'center', marginTop: 16 },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, paddingVertical: 6 },
  toggleLabel: { fontSize: 14, color: Colors.textPrimary },
  toggleTrack: { width: 44, height: 26, borderRadius: 13, backgroundColor: Colors.neutral200, justifyContent: 'center', padding: 2 },
  toggleTrackOn: { backgroundColor: Colors.primary },
  toggleThumb: { width: 22, height: 22, borderRadius: 11, backgroundColor: Colors.surface, alignSelf: 'flex-start' },
  toggleThumbOn: { alignSelf: 'flex-end' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  chip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: Colors.neutral100 },
  chipActive: { backgroundColor: Colors.primary },
  chipText: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary },
  chipTextActive: { color: '#fff' },
  noPet: { padding: 24, fontSize: 15, color: Colors.textSecondary, textAlign: 'center' },
});
