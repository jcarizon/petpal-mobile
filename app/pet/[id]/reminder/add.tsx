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
import * as Notifications from 'expo-notifications';
import { Check, Sparkles, Bell, Calendar, FileText, User } from 'lucide-react-native';
import { Colors } from '../../../../constants/colors';
import { Input } from '../../../../components/ui/Input';
import { Button } from '../../../../components/ui/Button';
import { DateTimeField, ScreenHeader, useToast } from '../../../../components/ui';
import { usePetStore } from '../../../../store/petStore';
import { CreateReminderRequest, HealthRecordType } from '../../../../types';
import { scheduleLocalNotification } from '../../../../lib/notifications';

const REMINDER_TYPES: Array<{ key: HealthRecordType; emoji: string; label: string; quickDesc?: string }> = [
  { key: 'vaccination', emoji: '💉', label: 'Vaccination', quickDesc: 'Shots & boosters' },
  { key: 'vet_visit', emoji: '🏥', label: 'Vet Visit', quickDesc: 'Checkups & visits' },
  { key: 'grooming', emoji: '✂️', label: 'Grooming', quickDesc: 'Baths & haircuts' },
  { key: 'medication', emoji: '💊', label: 'Medication', quickDesc: 'Medicines & treatments' },
  { key: 'deworming', emoji: '🔬', label: 'Deworming', quickDesc: 'Parasite treatment' },
  { key: 'dental', emoji: '🦷', label: 'Dental', quickDesc: 'Teeth cleaning & care' },
  { key: 'other', emoji: '📋', label: 'Other', quickDesc: 'Miscellaneous' },
];

const QUICK_REMINDER_SUGGESTIONS: Record<HealthRecordType, { title: string; description: string }> = {
  vaccination: { title: 'Annual Vaccination Due', description: 'Time for annual vaccination booster.' },
  vet_visit: { title: 'Vet Checkup', description: 'Schedule regular health checkup.' },
  grooming: { title: 'Grooming Session', description: 'Time for grooming appointment.' },
  medication: { title: 'Medication Due', description: 'Administer medication.' },
  deworming: { title: 'Deworming Treatment', description: 'Schedule deworming.' },
  dental: { title: 'Dental Check', description: 'Regular dental care checkup.' },
  other: { title: '', description: '' },
};

export default function AddReminderScreen() {
  const { id, reminderId } = useLocalSearchParams<{ id: string; reminderId?: string }>();
  const router = useRouter();
  const { reminders, createReminder, updateReminder, deleteReminder, completeReminder, fetchReminders, isLoading } = usePetStore();
  const { showToast } = useToast();

  const needsFetch = useMemo(() => {
    if (!reminderId || !id) return false;
    const petReminders = reminders[id];
    return !petReminders || !petReminders.some(r => r.id === reminderId);
  }, [reminderId, id, reminders[id]]);

  useEffect(() => {
    if (needsFetch && id) {
      fetchReminders(id);
    }
  }, [needsFetch, id, fetchReminders]);

  const existingReminder = reminderId ? reminders[id ?? '']?.find((r) => r.id === reminderId) : null;
  const isEditMode = !!existingReminder;
  const isCompleted = existingReminder?.isCompleted ?? false;
  const canEdit = !isEditMode || !isCompleted;

  useEffect(() => {
    if (existingReminder) {
      setType(existingReminder.type);
      setTitle(existingReminder.title);
      setDueDate(new Date(existingReminder.dueDate));
      setDescription(existingReminder.description || '');
    }
  }, [existingReminder]);

  const [type, setType] = useState<HealthRecordType>('vaccination');
  const [title, setTitle] = useState('');
  const [dueDate, setDueDate] = useState<Date | null>(null);
  const [description, setDescription] = useState('');
  const [errors, setErrors] = useState<{ title?: string; dueDate?: string }>({});
  const [showQuickFill, setShowQuickFill] = useState(false);

  const handleQuickFill = () => {
    const suggestion = QUICK_REMINDER_SUGGESTIONS[type];
    if (!title.trim()) {
      setTitle(suggestion.title);
    }
    if (!description.trim()) {
      setDescription(suggestion.description);
    }
    setShowQuickFill(false);
  };

  const validate = (): boolean => {
    const newErrors: typeof errors = {};
    if (!title.trim()) {
      newErrors.title = 'Title is required';
    } else if (title.trim().length < 3) {
      newErrors.title = 'Title must be at least 3 characters';
    }
    if (!dueDate && isEditMode) {
      newErrors.dueDate = 'Due date is required';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate() || !id) return;
    if (!isEditMode && !dueDate) {
      setErrors({ dueDate: 'Due date is required' });
      return;
    }

    try {
      if (isEditMode && reminderId) {
        const data: Partial<CreateReminderRequest> = {
          title: title.trim(),
          type,
          dueDate: dueDate?.toISOString(),
          description: description.trim() || undefined,
        };
        await updateReminder(id, reminderId, data);
        showToast({
          type: 'success',
          title: 'Reminder updated',
          message: 'Your changes have been saved.',
        });
      } else {
        if (!dueDate) return;
        
        const data: CreateReminderRequest = {
          title: title.trim(),
          type,
          dueDate: dueDate.toISOString(),
          description: description.trim() || undefined,
        };
        await createReminder(id, data);

        const threeDaysBefore = new Date(dueDate);
        threeDaysBefore.setDate(threeDaysBefore.getDate() - 3);
        
        const oneHourBefore = new Date(dueDate);
        oneHourBefore.setHours(oneHourBefore.getHours() - 1);
        
        let notificationDate: Date;
        let notificationMessage: string;
        
        if (threeDaysBefore.getTime() > Date.now()) {
          notificationDate = threeDaysBefore;
          notificationMessage = `Your pet has a reminder due in 3 days!`;
        } else if (oneHourBefore.getTime() > Date.now()) {
          notificationDate = oneHourBefore;
          notificationMessage = `Your pet has a reminder due soon!`;
        } else {
          notificationDate = new Date(Date.now() + 1000);
          notificationMessage = `Your pet has a reminder due very soon!`;
        }
        
        try {
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
        }

        showToast({
          type: 'success',
          title: 'Reminder set',
          message: `You'll be notified before the due date.`,
        });
      }
      router.back();
    } catch (error) {
      showToast({
        type: 'error',
        title: isEditMode ? 'Failed to update reminder' : 'Failed to set reminder',
        message: (error as { message?: string })?.message ?? 'Please try again.',
      });
    }
  };

  const handleComplete = async () => {
    if (!id || !reminderId) return;
    try {
      await completeReminder(id, reminderId);
      showToast({
        type: 'success',
        title: 'Reminder completed',
        message: 'Great job staying on top of your pet care!',
      });
      router.back();
    } catch (error) {
      showToast({
        type: 'error',
        title: 'Failed to complete reminder',
        message: 'Please try again.',
      });
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Reminder',
      'Are you sure you want to delete this reminder?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteReminder(id!, reminderId!);
              router.back();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete reminder');
            }
          },
        },
      ]
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScreenHeader
        title={isEditMode ? (isCompleted ? 'Completed Reminder' : 'Edit Reminder') : 'Set Reminder'}
        subtitle={isEditMode ? (isCompleted ? 'This reminder has been completed' : 'Update your reminder') : 'Get notified before the due date'}
      />
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.typeSection}>
          <View style={styles.typeSectionHeader}>
            <Text style={styles.label}>Reminder Type</Text>
            {canEdit && (
              <TouchableOpacity 
                style={styles.quickFillButton} 
                onPress={() => setShowQuickFill(true)}
              >
                <Sparkles size={14} color={Colors.secondary} />
                <Text style={styles.quickFillText}>Quick Fill</Text>
              </TouchableOpacity>
            )}
          </View>
          <View style={styles.typeOptionsGrid}>
            {REMINDER_TYPES.map((rt) => (
              <TouchableOpacity
                key={rt.key}
                style={[
                  styles.typeCard, 
                  type === rt.key && styles.typeCardSelected,
                  !canEdit && styles.typeCardDisabled,
                ]}
                onPress={canEdit ? () => setType(rt.key) : undefined}
                disabled={!canEdit}
              >
                <Text style={styles.typeCardEmoji}>{rt.emoji}</Text>
                <View style={styles.typeCardContent}>
                  <Text style={[
                    styles.typeCardLabel, 
                    type === rt.key && styles.typeCardLabelSelected,
                    !canEdit && styles.typeCardLabelDisabled,
                  ]}>
                    {rt.label}
                  </Text>
                  {rt.quickDesc && (
                    <Text style={styles.typeCardDesc}>{rt.quickDesc}</Text>
                  )}
                </View>
                {type === rt.key && canEdit && (
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
                Pre-fill title and description with typical details for {REMINDER_TYPES.find(rt => rt.key === type)?.label.toLowerCase()} reminders.
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
          editable={canEdit}
        />

        <DateTimeField
          label="Due Date & Time *"
          value={dueDate}
          onChange={(value) => {
            setDueDate(value);
            if (errors.dueDate) setErrors((prev) => ({ ...prev, dueDate: undefined }));
          }}
          mode="datetime"
          minimumDate={isEditMode ? undefined : new Date()}
          error={errors.dueDate}
          disabled={!canEdit}
        />

        <Input
          label="Notes (optional)"
          placeholder="Any additional details..."
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={3}
          style={{ minHeight: 80, textAlignVertical: 'top' }}
          editable={canEdit}
        />

        {!isEditMode && (
          <View style={styles.reminderNote}>
            <Bell size={16} color={Colors.secondary} />
            <Text style={styles.reminderNoteText}>
              A push notification will be sent before the due date.
            </Text>
          </View>
        )}

        {isEditMode && canEdit && (
          <Button
            title="Mark as Complete"
            variant="secondary"
            onPress={handleComplete}
            fullWidth
            size="lg"
          />
        )}

        {canEdit && (
          <Button
            title={isEditMode ? 'Save Changes' : 'Set Reminder'}
            variant="primary"
            onPress={handleSubmit}
            isLoading={isLoading}
            fullWidth
            size="lg"
            style={styles.submitButton}
          />
        )}

        {isEditMode && canEdit && (
          <Button
            title="Delete Reminder"
            variant="ghost"
            onPress={handleDelete}
            fullWidth
            size="lg"
          />
        )}

        {isEditMode && isCompleted && (
          <View style={styles.completedBadge}>
            <Text style={styles.completedBadgeText}>✓ This reminder has been completed</Text>
          </View>
        )}
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
    position: 'relative',
  },
  typeCardSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryBg,
  },
  typeCardDisabled: {
    opacity: 0.5,
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
  typeCardLabelDisabled: {
    color: Colors.neutral400,
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
  reminderNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
    flex: 1,
  },
  submitButton: {
    marginTop: 8,
  },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.successBg,
    borderRadius: 10,
    padding: 12,
    borderLeftWidth: 3,
    borderLeftColor: Colors.success,
    marginTop: 8,
  },
  completedBadgeText: {
    fontSize: 13,
    color: Colors.success,
    fontWeight: '600',
  },
});
