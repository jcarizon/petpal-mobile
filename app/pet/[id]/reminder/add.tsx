import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { Colors } from '../../../../constants/colors';
import { Input } from '../../../../components/ui/Input';
import { Button } from '../../../../components/ui/Button';
import { DateTimeField, ScreenHeader, useToast } from '../../../../components/ui';
import { usePetStore } from '../../../../store/petStore';
import { CreateReminderRequest, HealthRecordType } from '../../../../types';
import { scheduleLocalNotification } from '../../../../lib/notifications';

const REMINDER_TYPES: Array<{ key: HealthRecordType; emoji: string; label: string }> = [
  { key: 'vaccination', emoji: '💉', label: 'Vaccination' },
  { key: 'vet_visit', emoji: '🏥', label: 'Vet Visit' },
  { key: 'grooming', emoji: '✂️', label: 'Grooming' },
  { key: 'medication', emoji: '💊', label: 'Medication' },
  { key: 'deworming', emoji: '🔬', label: 'Deworming' },
  { key: 'dental', emoji: '🦷', label: 'Dental' },
  { key: 'other', emoji: '📋', label: 'Other' },
];

export default function AddReminderScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { createReminder, isLoading } = usePetStore();
  const { showToast } = useToast();

  const [type, setType] = useState<HealthRecordType>('vaccination');
  const [title, setTitle] = useState('');
  const [dueDate, setDueDate] = useState<Date | null>(null);
  const [description, setDescription] = useState('');
  const [errors, setErrors] = useState<{ title?: string; dueDate?: string }>({});

  const validate = (): boolean => {
    const newErrors: typeof errors = {};
    if (!title.trim()) {
      newErrors.title = 'Title is required';
    } else if (title.trim().length < 3) {
      newErrors.title = 'Title must be at least 3 characters';
    }
    if (!dueDate) {
      newErrors.dueDate = 'Due date is required';
    } else if (dueDate.getTime() <= Date.now()) {
      newErrors.dueDate = 'Due date must be in the future';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate() || !id || !dueDate) return;

    try {
      const data: CreateReminderRequest = {
        title: title.trim(),
        type,
        dueDate: dueDate.toISOString(),
        description: description.trim() || undefined,
      };
      await createReminder(id, data);

      // Schedule local notification
      // If due date is more than 3 days away, notify 3 days before
      // If due date is more than 1 hour away, notify 1 hour before
      // Otherwise, notify immediately
      const threeDaysBefore = new Date(dueDate);
      threeDaysBefore.setDate(threeDaysBefore.getDate() - 3);
      
      const oneHourBefore = new Date(dueDate);
      oneHourBefore.setHours(oneHourBefore.getHours() - 1);
      
      let notificationDate: Date;
      let notificationMessage: string;
      
      if (threeDaysBefore.getTime() > Date.now()) {
        // More than 3 days away: notify 3 days before
        notificationDate = threeDaysBefore;
        notificationMessage = `Your pet has a reminder due in 3 days!`;
      } else if (oneHourBefore.getTime() > Date.now()) {
        // More than 1 hour away: notify 1 hour before
        notificationDate = oneHourBefore;
        notificationMessage = `Your pet has a reminder due soon!`;
      } else {
        // Less than 1 hour away: notify immediately
        notificationDate = new Date(Date.now() + 1000);
        notificationMessage = `Your pet has a reminder due very soon!`;
      }
      
      try {
        // For immediate notifications (less than 1 hour away), schedule for 1 second from now
        // This ensures the notification shows even when the app is in the foreground
        if (oneHourBefore.getTime() <= Date.now()) {
          await Notifications.scheduleNotificationAsync({
            content: {
              title: `⏰ Reminder: ${title.trim()}`,
              body: notificationMessage,
              data: { type: 'reminder', id },
              sound: true,
            },
            trigger: { seconds: 1 },
          });
        } else {
          await scheduleLocalNotification(
            `⏰ Reminder: ${title.trim()}`,
            notificationMessage,
            { date: notificationDate },
            { type: 'reminder', id }
          );
        }
      } catch (notifError) {
        console.error('Failed to schedule notification:', notifError);
        // Don't fail the reminder creation if notification fails
      }

      showToast({
        type: 'success',
        title: 'Reminder set',
        message: `You'll be notified before the due date.`,
      });
      router.back();
    } catch (error) {
      showToast({
        type: 'error',
        title: 'Failed to set reminder',
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
        title="Set Reminder"
        subtitle="Get notified before the due date"
      />
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Type selector */}
        <View style={styles.typeSection}>
          <Text style={styles.label}>Reminder Type</Text>
          <View style={styles.typeOptions}>
            {REMINDER_TYPES.map((rt) => (
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

        <DateTimeField
          label="Due Date & Time *"
          value={dueDate}
          onChange={(value) => {
            setDueDate(value);
            if (errors.dueDate) setErrors((prev) => ({ ...prev, dueDate: undefined }));
          }}
          mode="datetime"
          minimumDate={new Date()}
          error={errors.dueDate}
        />

        <Input
          label="Notes (optional)"
          placeholder="Any additional details..."
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={3}
          style={{ minHeight: 80, textAlignVertical: 'top' }}
        />

        <View style={styles.reminderNote}>
          <Text style={styles.reminderNoteText}>
            🔔 A push notification will be sent before the due date.
          </Text>
        </View>

        <Button
          title="Set Reminder"
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
  reminderNote: {
    backgroundColor: Colors.secondaryBg,
    borderRadius: 10,
    padding: 12,
    borderLeftWidth: 3,
    borderLeftColor: Colors.secondary,
  },
  reminderNoteText: {
    fontSize: 13,
    color: Colors.secondary,
    fontWeight: '500',
    lineHeight: 18,
  },
  submitButton: {
    marginTop: 8,
  },
});