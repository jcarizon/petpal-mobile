import React, { useEffect, useState } from 'react';
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
import { FilePlus2, Check, ChevronLeft, ChevronRight, Clock, User, FileText, Calendar, Syringe, Sparkles, Bell } from 'lucide-react-native';
import { Colors } from '../../../../constants/colors';
import { Input } from '../../../../components/ui/Input';
import { Button } from '../../../../components/ui/Button';
import { DateTimeField, ScreenHeader, useToast } from '../../../../components/ui';
import { usePetStore } from '../../../../store/petStore';
import { HealthRecordType, CreateHealthRecordRequest, CreateReminderRequest } from '../../../../types';

const RECORD_TYPES: Array<{ key: HealthRecordType; emoji: string; label: string; quickDesc?: string }> = [
  { key: 'vaccination', emoji: '💉', label: 'Vaccine', quickDesc: 'Shots & boosters' },
  { key: 'vet_visit', emoji: '🏥', label: 'Vet Visit', quickDesc: 'Checkups & visits' },
  { key: 'grooming', emoji: '✂️', label: 'Grooming', quickDesc: 'Baths & haircuts' },
  { key: 'medication', emoji: '💊', label: 'Medication', quickDesc: 'Medicines & treatments' },
  { key: 'weight', emoji: '⚖️', label: 'Weight', quickDesc: 'Track weight changes' },
  { key: 'deworming', emoji: '🔬', label: 'Deworming', quickDesc: 'Parasite treatment' },
  { key: 'dental', emoji: '🦷', label: 'Dental', quickDesc: 'Teeth cleaning & care' },
  { key: 'surgery', emoji: '🩺', label: 'Surgery', quickDesc: 'Procedures & operations' },
  { key: 'other', emoji: '📋', label: 'Other', quickDesc: 'Miscellaneous records' },
];

const isValidRecordType = (value?: string): value is HealthRecordType =>
  Boolean(value && RECORD_TYPES.some((rt) => rt.key === value));

const QUICK_ADD_SUGGESTIONS: Record<HealthRecordType, { title: string; notes: string }> = {
  vaccination: { title: '', notes: 'Vaccine administered. Next due: ' },
  vet_visit: { title: '', notes: 'General checkup. All clear.' },
  grooming: { title: '', notes: 'Grooming session completed.' },
  medication: { title: '', notes: 'Medication given.' },
  weight: { title: '', notes: 'Weight recorded.' },
  deworming: { title: '', notes: 'Deworming treatment done.' },
  dental: { title: '', notes: 'Dental care completed.' },
  surgery: { title: '', notes: 'Surgery performed.' },
  other: { title: '', notes: '' },
};

export default function AddHealthRecordScreen() {
  const { id, type: suggestedType } = useLocalSearchParams<{
    id: string;
    type?: HealthRecordType;
  }>();
  const normalizedSuggestedType = isValidRecordType(suggestedType) ? suggestedType : undefined;
  const router = useRouter();
  const { createHealthRecord, createReminder, isLoading } = usePetStore();
  const { showToast } = useToast();

  const [type, setType] = useState<HealthRecordType>(normalizedSuggestedType ?? 'vaccination');
  const [title, setTitle] = useState('');
  const [date, setDate] = useState<Date>(new Date());
  const [vetName, setVetName] = useState('');
  const [notes, setNotes] = useState('');
  const [nextDueDate, setNextDueDate] = useState<Date | null>(null);
  const [createReminderEnabled, setCreateReminderEnabled] = useState(true);
  const [errors, setErrors] = useState<{ title?: string; date?: string; nextDueDate?: string }>({});
  const [showQuickFill, setShowQuickFill] = useState(false);

  useEffect(() => {
    if (normalizedSuggestedType) {
      setType(normalizedSuggestedType);
    }
  }, [normalizedSuggestedType]);

  const handleQuickFill = () => {
    const suggestion = QUICK_ADD_SUGGESTIONS[type];
    if (!title.trim()) {
      setTitle(suggestion.title);
    }
    if (!notes.trim()) {
      setNotes(suggestion.notes);
    }
    setShowQuickFill(false);
  };

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
    if (!validate() || !id) return;

    try {
      const data: CreateHealthRecordRequest = {
        type,
        title: title.trim(),
        date: date.toISOString(),
        vetName: vetName.trim() || undefined,
        notes: notes.trim() || undefined,
        nextDueDate: nextDueDate ? nextDueDate.toISOString() : undefined,
      };

      await createHealthRecord(id, data);

      if (nextDueDate && createReminderEnabled) {
        const reminderData: CreateReminderRequest = {
          title: `${title.trim()} - Next Due`,
          dueDate: nextDueDate.toISOString(),
          type,
          description: notes.trim() || undefined,
        };
        await createReminder(id, reminderData);
        showToast({
          type: 'success',
          title: 'Health record saved',
          message: 'Record saved and reminder created.',
        });
      } else {
        showToast({
          type: 'success',
          title: 'Health record saved',
          message: 'Your pet history has been updated.',
        });
      }
      router.back();
    } catch (error) {
      showToast({
        type: 'error',
        title: 'Failed to save record',
        message: (error as { message?: string })?.message ?? 'Please try again.',
      });
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScreenHeader
        title="Add Health Record"
        subtitle="Log visits, vaccinations, medication, and next due dates"
      />
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Record type selector - Enhanced with cards */}
        <View style={styles.typeSection}>
          <View style={styles.typeSectionHeader}>
            <Text style={styles.label}>Record Type</Text>
            <TouchableOpacity 
              style={styles.quickFillButton} 
              onPress={() => setShowQuickFill(true)}
            >
              <Sparkles size={14} color={Colors.secondary} />
              <Text style={styles.quickFillText}>Quick Fill</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.typeOptionsGrid}>
            {RECORD_TYPES.map((rt) => (
              <TouchableOpacity
                key={rt.key}
                style={[
                  styles.typeCard,
                  type === rt.key && styles.typeCardSelected,
                ]}
                onPress={() => setType(rt.key)}
              >
                <Text style={styles.typeCardEmoji}>{rt.emoji}</Text>
                <View style={styles.typeCardContent}>
                  <Text style={[
                    styles.typeCardLabel,
                    type === rt.key && styles.typeCardLabelSelected,
                  ]}>
                    {rt.label}
                  </Text>
                  {rt.quickDesc && (
                    <Text style={styles.typeCardDesc}>{rt.quickDesc}</Text>
                  )}
                </View>
                {type === rt.key && (
                  <View style={styles.typeCardCheck}>
                    <Check size={14} color={Colors.surface} strokeWidth={3} />
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Quick Fill Modal */}
        {showQuickFill && (
          <View style={styles.quickFillModalOverlay}>
            <TouchableOpacity 
              style={styles.quickFillModalBackdrop} 
              activeOpacity={1}
              onPress={() => setShowQuickFill(false)}
            />
            <View style={styles.quickFillModalContent}>
              <View style={styles.quickFillModalHeader}>
                <Sparkles size={24} color={Colors.secondary} />
                <Text style={styles.quickFillModalTitle}>Quick Fill</Text>
              </View>
              <Text style={styles.quickFillModalDesc}>
                Pre-fill title and notes with typical details for {RECORD_TYPES.find(rt => rt.key === type)?.label.toLowerCase()} records.
              </Text>
              <View style={styles.quickFillModalActions}>
                <TouchableOpacity 
                  style={styles.quickFillCancelBtn}
                  onPress={() => setShowQuickFill(false)}
                >
                  <Text style={styles.quickFillCancelText}>Skip</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.quickFillConfirmBtn}
                  onPress={handleQuickFill}
                >
                  <Text style={styles.quickFillConfirmText}>Apply</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

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
          leftIcon={<User size={16} color={Colors.textSecondary} />}
        />

        <Input
          label="Notes (optional)"
          placeholder="Additional notes..."
          value={notes}
          onChangeText={setNotes}
          multiline
          numberOfLines={3}
          style={{ minHeight: 80, textAlignVertical: 'top' }}
          leftIcon={<FileText size={16} color={Colors.textSecondary} />}
        />

        <DateTimeField
          label="Next Due Date (optional)"
          value={nextDueDate}
          onChange={(value) => {
            setNextDueDate(value);
            if (errors.nextDueDate) setErrors((prev) => ({ ...prev, nextDueDate: undefined }));
          }}
          mode="date"
          minimumDate={date}
          error={errors.nextDueDate}
          leftIcon={<Calendar size={16} color={Colors.textSecondary} />}
        />

        {nextDueDate && (
          <TouchableOpacity
            style={styles.reminderToggle}
            onPress={() => setCreateReminderEnabled(!createReminderEnabled)}
            activeOpacity={0.7}
          >
            <View style={[styles.reminderCheckbox, createReminderEnabled && styles.reminderCheckboxChecked]}>
              {createReminderEnabled && <Check size={12} color={Colors.textInverse} strokeWidth={3} />}
            </View>
            <Bell size={16} color={Colors.textSecondary} />
            <Text style={styles.reminderToggleText}>Create reminder for this date</Text>
          </TouchableOpacity>
        )}

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
    gap: 20,
  },
  typeSection: {
    gap: 12,
  },
  typeSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  quickFillButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: Colors.secondaryBg,
    borderRadius: 12,
  },
  quickFillText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.secondary,
  },
  typeOptionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  typeCard: {
    width: '31%',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    gap: 6,
  },
  typeCardSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryBg,
  },
  typeCardEmoji: {
    fontSize: 24,
  },
  typeCardContent: {
    alignItems: 'center',
    gap: 2,
  },
  typeCardLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  typeCardLabelSelected: {
    color: Colors.primary,
  },
  typeCardDesc: {
    fontSize: 9,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  typeCardCheck: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickFillModalOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  },
  quickFillModalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  quickFillModalContent: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 340,
  },
  quickFillModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  quickFillModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  quickFillModalDesc: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
    marginBottom: 20,
  },
  quickFillModalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  quickFillCancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  quickFillCancelText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  quickFillConfirmBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    alignItems: 'center',
  },
  quickFillConfirmText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.surface,
  },
  submitButton: {
    marginTop: 8,
  },
  reminderToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    backgroundColor: Colors.neutral50,
    borderRadius: 12,
  },
  reminderCheckbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reminderCheckboxChecked: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  reminderToggleText: {
    flex: 1,
    fontSize: 14,
    color: Colors.textPrimary,
    fontWeight: '500',
  },
});
