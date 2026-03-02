import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Colors } from '../../../../constants/colors';
import { Input } from '../../../../components/ui/Input';
import { Button } from '../../../../components/ui/Button';
import { usePetStore } from '../../../../store/petStore';
import { HealthRecordType, CreateHealthRecordRequest } from '../../../../types';

const RECORD_TYPES: Array<{ key: HealthRecordType; emoji: string; label: string }> = [
  { key: 'vaccination', emoji: '💉', label: 'Vaccination' },
  { key: 'vet_visit', emoji: '🏥', label: 'Vet Visit' },
  { key: 'grooming', emoji: '✂️', label: 'Grooming' },
  { key: 'medication', emoji: '💊', label: 'Medication' },
  { key: 'weight', emoji: '⚖️', label: 'Weight' },
  { key: 'deworming', emoji: '🔬', label: 'Deworming' },
  { key: 'dental', emoji: '🦷', label: 'Dental' },
  { key: 'surgery', emoji: '🩺', label: 'Surgery' },
  { key: 'other', emoji: '📋', label: 'Other' },
];

export default function AddHealthRecordScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { createHealthRecord, isLoading } = usePetStore();

  const [type, setType] = useState<HealthRecordType>('vaccination');
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [vetName, setVetName] = useState('');
  const [notes, setNotes] = useState('');
  const [nextDueDate, setNextDueDate] = useState('');
  const [errors, setErrors] = useState<{ title?: string; date?: string; nextDueDate?: string }>({});

  const validate = (): boolean => {
    const newErrors: typeof errors = {};
    if (!title.trim()) newErrors.title = 'Title is required';
    if (!date) {
      newErrors.date = 'Date is required';
    } else if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      newErrors.date = 'Use format YYYY-MM-DD';
    }
    if (nextDueDate && !/^\d{4}-\d{2}-\d{2}$/.test(nextDueDate)) {
      newErrors.nextDueDate = 'Use format YYYY-MM-DD';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate() || !id) return;

    try {
      const data: CreateHealthRecordRequest = {
        type,
        title: title.trim(),
        date,
        vetName: vetName.trim() || undefined,
        notes: notes.trim() || undefined,
        nextDueDate: nextDueDate.trim() || undefined,
      };

      await createHealthRecord(id, data);
      router.back();
    } catch {
      Alert.alert('Error', 'Failed to add health record. Please try again.');
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Record type selector */}
        <View style={styles.typeSection}>
          <Text style={styles.label}>Record Type</Text>
          <View style={styles.typeOptions}>
            {RECORD_TYPES.map((rt) => (
              <TouchableOpacity
                key={rt.key}
                style={[styles.typeOption, type === rt.key && styles.typeOptionSelected]}
                onPress={() => setType(rt.key)}
              >
                <Text style={styles.typeEmoji}>{rt.emoji}</Text>
                <Text style={[styles.typeLabel, type === rt.key && styles.typeLabelSelected]}>
                  {rt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <Input
          label="Title *"
          placeholder="e.g., Annual rabies vaccine"
          value={title}
          onChangeText={(text) => {
            setTitle(text);
            if (errors.title) setErrors((prev) => ({ ...prev, title: undefined }));
          }}
          error={errors.title}
        />

        <Input
          label="Date *"
          placeholder="YYYY-MM-DD"
          value={date}
          onChangeText={(text) => {
            setDate(text);
            if (errors.date) setErrors((prev) => ({ ...prev, date: undefined }));
          }}
          error={errors.date}
          keyboardType="numeric"
        />

        <Input
          label="Veterinarian (optional)"
          placeholder="Dr. Smith"
          value={vetName}
          onChangeText={setVetName}
        />

        <Input
          label="Notes (optional)"
          placeholder="Additional notes..."
          value={notes}
          onChangeText={setNotes}
          multiline
          numberOfLines={3}
          style={{ minHeight: 80, textAlignVertical: 'top' }}
        />

        <Input
          label="Next Due Date (optional)"
          placeholder="YYYY-MM-DD"
          value={nextDueDate}
          onChangeText={(text) => {
            setNextDueDate(text);
            if (errors.nextDueDate) setErrors((prev) => ({ ...prev, nextDueDate: undefined }));
          }}
          error={errors.nextDueDate}
          keyboardType="numeric"
        />

        <Button
          title="Save Record"
          variant="primary"
          onPress={handleSubmit}
          isLoading={isLoading}
          fullWidth
          size="lg"
          style={styles.submitButton}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: 20,
    gap: 16,
  },
  typeSection: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.textPrimary,
  },
  typeOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  typeOption: {
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    gap: 3,
    minWidth: 68,
  },
  typeOptionSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryBg,
  },
  typeEmoji: {
    fontSize: 20,
  },
  typeLabel: {
    fontSize: 10,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  typeLabelSelected: {
    color: Colors.primary,
    fontWeight: '700',
  },
  submitButton: {
    marginTop: 8,
  },
});
