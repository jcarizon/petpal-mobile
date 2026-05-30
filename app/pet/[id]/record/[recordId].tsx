import React, { useState, useEffect, useMemo } from 'react';
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
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Edit3, Trash2, ArrowLeft } from 'lucide-react-native';
import { Colors } from '../../../../constants/colors';
import { Input } from '../../../../components/ui/Input';
import { Button } from '../../../../components/ui/Button';
import { DateTimeField, ScreenHeader, useToast } from '../../../../components/ui';
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

export default function EditHealthRecordScreen() {
  const { id, recordId } = useLocalSearchParams<{ id: string; recordId: string }>();
  const router = useRouter();
  const { healthRecords, updateHealthRecord, deleteHealthRecord, isLoading } = usePetStore();
  const { showToast } = useToast();

  const record = healthRecords[id ?? '']?.find((r) => r.id === recordId);
  const [isEditing, setIsEditing] = useState(false);

  const [type, setType] = useState<HealthRecordType>('vaccination');
  const [title, setTitle] = useState('');
  const [date, setDate] = useState<Date>(new Date());
  const [vetName, setVetName] = useState('');
  const [notes, setNotes] = useState('');
  const [nextDueDate, setNextDueDate] = useState<Date | null>(null);
  const [errors, setErrors] = useState<{ title?: string; date?: string; nextDueDate?: string }>({});

  const isFormValid = useMemo(() => {
    const trimmedTitle = title.trim();
    const hasValidTitle = trimmedTitle.length >= 3;
    const isDateInFuture = date.getTime() > Date.now();
    const isNextDueBeforeDate = nextDueDate ? nextDueDate.getTime() < date.getTime() : false;

    return hasValidTitle && !isDateInFuture && !isNextDueBeforeDate;
  }, [title, date, nextDueDate]);

  useEffect(() => {
    if (record) {
      setType(record.type as HealthRecordType);
      setTitle(record.title);
      setDate(new Date(record.date));
      setVetName(record.vetName || '');
      setNotes(record.notes || '');
      setNextDueDate(record.nextDueDate ? new Date(record.nextDueDate) : null);
    }
  }, [record]);

  if (!record) {
    return (
      <SafeAreaView style={styles.container}>
        <ScreenHeader
          title="Edit Record"
          subtitle="Health record not found"
        />
      </SafeAreaView>
    );
  }

  const validate = (): boolean => {
    const newErrors: typeof errors = {};
    if (!title.trim()) {
      newErrors.title = 'Title is required';
    } else if (title.trim().length < 3) {
      newErrors.title = 'Title should be at least 3 characters';
    }

    if (date.getTime() > Date.now()) {
      newErrors.date = 'Record date cannot be in the future';
    }

    if (nextDueDate && nextDueDate.getTime() < date.getTime()) {
      newErrors.nextDueDate = 'Next due date must be later than record date';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate() || !id || !recordId) return;

    try {
      const data: Partial<CreateHealthRecordRequest> = {
        type,
        title: title.trim(),
        date: date.toISOString(),
        vetName: vetName.trim() || undefined,
        notes: notes.trim() || undefined,
        nextDueDate: nextDueDate ? nextDueDate.toISOString() : undefined,
      };

      await updateHealthRecord(id, recordId, data);
      showToast({
        type: 'success',
        title: 'Health record updated',
        message: 'Your pet history has been updated.',
      });
      router.back();
    } catch (error) {
      showToast({
        type: 'error',
        title: 'Failed to update record',
        message: (error as { message?: string })?.message ?? 'Please try again.',
      });
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Health Record',
      'Are you sure you want to delete this record? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteHealthRecord(id!, recordId!);
              showToast({
                type: 'success',
                title: 'Record deleted',
                message: 'The health record has been removed.',
              });
              router.back();
            } catch (error) {
              showToast({
                type: 'error',
                title: 'Failed to delete record',
                message: 'Please try again.',
              });
            }
          },
        },
      ]
    );
  };

  const recordTypeInfo = useMemo(() => RECORD_TYPES.find((rt) => rt.key === record?.type), [record?.type]);

  return (
    <>
      {isEditing ? (
        <KeyboardAvoidingView
          style={styles.container}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <ScreenHeader
            title="Edit Health Record"
            subtitle="Update or delete this record"
          />
          <ScrollView
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
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
                    <Text style={[styles.typeLabel, type === rt.key && styles.typeLabelSelected]}>{rt.label}</Text>
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

            <DateTimeField
              label="Date & Time *"
              value={date}
              onChange={(value) => {
                setDate(value);
                if (errors.date) setErrors((prev) => ({ ...prev, date: undefined }));
              }}
              mode="datetime"
              maximumDate={new Date()}
              error={errors.date}
            />

            <Input
              label="Veterinarian (optional)"
              placeholder="Dr. Smith"
              value={vetName}
              onChangeText={setVetName}
            />

            <Input
              label="Notes (optional)"
              placeholder="Any additional notes..."
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={3}
            />

            <DateTimeField
              label="Next Due Date (optional)"
              value={nextDueDate}
              onChange={setNextDueDate}
              mode="date"
              minimumDate={date}
              error={errors.nextDueDate}
            />

            <Button
              title="Save Changes"
              onPress={handleSubmit}
              fullWidth
              size="lg"
              disabled={isLoading || !isFormValid}
            />

            <View style={styles.deleteButtonContainer}>
              <Button
                title="Delete Record"
                variant="ghost"
                onPress={handleDelete}
                fullWidth
                size="lg"
                style={styles.deleteButton}
              />
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      ) : (
        <SafeAreaView style={styles.viewContainer}>
          <View style={styles.viewHeader}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <ArrowLeft size={20} color={Colors.textSecondary} />
            </TouchableOpacity>
            <Text style={styles.viewTitle}>Health Record</Text>
            <TouchableOpacity onPress={() => setIsEditing(true)} style={styles.editButton}>
              <Edit3 size={20} color={Colors.primary} />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.viewContent} showsVerticalScrollIndicator={false}>
            <View style={styles.viewCard}>
              <View style={styles.viewTypeRow}>
                <Text style={styles.viewTypeEmoji}>{recordTypeInfo?.emoji}</Text>
                <View style={styles.viewTypeInfo}>
                  <Text style={styles.viewTypeLabel}>{recordTypeInfo?.label}</Text>
                  <Text style={styles.viewDate}>{record ? new Date(record.date).toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' }) : ''}</Text>
                </View>
              </View>
              <Text style={styles.viewTitleText}>{record?.title}</Text>
              {record?.notes && (
                <View style={styles.viewNotesSection}>
                  <Text style={styles.viewNotesLabel}>Notes</Text>
                  <Text style={styles.viewNotesText}>{record.notes}</Text>
                </View>
              )}
              {record?.vetName && (
                <View style={styles.viewField}>
                  <Text style={styles.viewFieldLabel}>Veterinarian</Text>
                  <Text style={styles.viewFieldText}>{record.vetName}</Text>
                </View>
              )}
              {record?.nextDueDate && (
                <View style={styles.viewField}>
                  <Text style={styles.viewFieldLabel}>Next Due</Text>
                  <Text style={styles.viewFieldText}>
                    {new Date(record.nextDueDate).toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
                  </Text>
                </View>
              )}
            </View>
          </ScrollView>
        </SafeAreaView>
)}
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  viewContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  viewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.neutral100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  editButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primaryBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewContent: {
    padding: 20,
  },
  viewCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    gap: 12,
  },
  viewTypeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  viewTypeEmoji: {
    fontSize: 32,
  },
  viewTypeInfo: {
    flex: 1,
  },
  viewTypeLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  viewDate: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  viewTitleText: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  viewNotesSection: {
    marginTop: 8,
  },
  viewNotesLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  viewNotesText: {
    fontSize: 15,
    color: Colors.textPrimary,
  },
  viewField: {
    marginTop: 4,
  },
  viewFieldLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  viewFieldText: {
    fontSize: 15,
    color: Colors.textPrimary,
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
  deleteButtonContainer: {
    marginTop: 16,
  },
  deleteButton: {
    marginTop: 8,
    borderColor: Colors.error,
  },
});
