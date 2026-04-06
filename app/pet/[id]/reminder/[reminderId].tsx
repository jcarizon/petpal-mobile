import React, { useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Edit3 } from 'lucide-react-native';
import { Colors } from '../../../../constants/colors';
import { ScreenHeader } from '../../../../components/ui';
import { usePetStore } from '../../../../store/petStore';
import { HealthRecordType } from '../../../../types';

const REMINDER_TYPE_INFO: Record<
  HealthRecordType,
  { label: string; emoji: string; description: string }
> = {
  vaccination: { label: 'Vaccination', emoji: '💉', description: 'Shots & boosters' },
  vet_visit: { label: 'Vet Visit', emoji: '🐾', description: 'Clinic appointments' },
  grooming: { label: 'Grooming', emoji: '✂️', description: 'Baths & haircuts' },
  medication: { label: 'Medication', emoji: '💊', description: 'Medicines & treatments' },
  weight: { label: 'Weight', emoji: '⚖️', description: 'Weigh-ins' },
  deworming: { label: 'Deworming', emoji: '🪲', description: 'Parasite care' },
  dental: { label: 'Dental', emoji: '🦷', description: 'Dental care' },
  surgery: { label: 'Surgery', emoji: '🧷', description: 'Procedures' },
  other: { label: 'Other', emoji: '📝', description: 'Misc reminders' },
};

export default function ReminderDetailScreen() {
  const { id, reminderId } = useLocalSearchParams<{ id: string; reminderId: string }>();
  const router = useRouter();
  const { reminders, fetchReminders } = usePetStore();

  const reminder = reminders[id ?? '']?.find((r) => r.id === reminderId);

  useEffect(() => {
    if (id && reminderId && !reminder) {
      fetchReminders(id);
    }
  }, [id, reminderId, reminder, fetchReminders]);

  if (!reminder) {
    return (
      <SafeAreaView style={styles.viewContainer}>
        <ScreenHeader title="Reminder" subtitle="Reminder not found" />
      </SafeAreaView>
    );
  }

  const typeInfo = useMemo(
    () => REMINDER_TYPE_INFO[reminder.type] ?? REMINDER_TYPE_INFO.other,
    [reminder.type]
  );

  const dueDateLabel = new Date(reminder.dueDate).toLocaleDateString('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  const handleEdit = () => {
    if (!id || !reminderId) return;
    router.push(`/pet/${id}/reminder/add?reminderId=${reminderId}`);
  };

  return (
    <SafeAreaView style={styles.viewContainer}>
      <View style={styles.viewHeader}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={20} color={Colors.textSecondary} />
        </TouchableOpacity>
        <Text style={styles.viewTitle}>Reminder</Text>
        <TouchableOpacity onPress={handleEdit} style={styles.editButton}>
          <Edit3 size={20} color={Colors.primary} />
        </TouchableOpacity>
      </View>
      <ScrollView contentContainerStyle={styles.viewContent} showsVerticalScrollIndicator={false}>
        <View style={styles.viewCard}>
          <View style={styles.viewTypeRow}>
            <Text style={styles.viewTypeEmoji}>{typeInfo.emoji}</Text>
            <View style={styles.viewTypeInfo}>
              <Text style={styles.viewTypeLabel}>{typeInfo.label}</Text>
              <Text style={styles.viewDate}>{dueDateLabel}</Text>
            </View>
          </View>
          <Text style={styles.viewTitleText}>{reminder.title}</Text>
          <View style={styles.viewField}>
            <Text style={styles.viewFieldLabel}>Due Date</Text>
            <Text style={styles.viewFieldText}>{dueDateLabel}</Text>
          </View>
          <View style={styles.viewField}>
            <Text style={styles.viewFieldLabel}>Status</Text>
            <View
              style={[
                styles.statusBadge,
                reminder.isCompleted ? styles.statusBadgeCompleted : styles.statusBadgePending,
              ]}
            >
              <Text style={styles.statusBadgeText}>
                {reminder.isCompleted ? 'Completed' : 'Pending'}
              </Text>
            </View>
          </View>
          {reminder.description ? (
            <View style={styles.viewField}>
              <Text style={styles.viewFieldLabel}>Notes</Text>
              <Text style={styles.viewFieldText}>{reminder.description}</Text>
            </View>
          ) : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
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
  viewField: {
    marginTop: 8,
  },
  viewFieldLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  viewFieldText: {
    fontSize: 15,
    color: Colors.textPrimary,
  },
  statusBadge: {
    marginTop: 4,
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
  },
  statusBadgeCompleted: {
    borderColor: Colors.success,
    backgroundColor: Colors.successBg,
  },
  statusBadgePending: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryBg,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
});
