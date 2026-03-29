import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { CheckCircle, Circle, Trash2, Bell } from 'lucide-react-native';
import { Colors } from '../../constants/colors';
import { Reminder } from '../../types';
import { formatDate } from '../../lib/utils';

const REMINDER_ICONS: Record<string, string> = {
  vaccination: '💉',
  vet_visit: '🏥',
  grooming: '✂️',
  medication: '💊',
  deworming: '🔬',
  dental: '🦷',
  other: '📋',
};

interface ReminderListProps {
  reminders: Reminder[];
  petId: string;
  onComplete: (petId: string, reminderId: string) => Promise<void>;
  onDelete: (petId: string, reminderId: string) => Promise<void>;
}

function getDueDateStatus(dueDate: string): {
  label: string;
  color: string;
  bgColor: string;
} {
  const now = new Date();
  const due = new Date(dueDate);
  const diffDays = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return { label: 'Overdue', color: Colors.error, bgColor: '#FEF2F2' };
  }
  if (diffDays <= 3) {
    return { label: `Due in ${diffDays}d`, color: Colors.warning, bgColor: Colors.secondaryBg };
  }
  if (diffDays <= 7) {
    return { label: `Due in ${diffDays}d`, color: Colors.info, bgColor: '#EFF6FF' };
  }
  return { label: formatDate(dueDate, 'short'), color: Colors.textSecondary, bgColor: Colors.neutral100 };
}

export function ReminderList({ reminders, petId, onComplete, onDelete }: ReminderListProps) {
  const pending = reminders.filter((r) => !r.isCompleted);
  const completed = reminders.filter((r) => r.isCompleted);

  const handleComplete = (reminder: Reminder) => {
    Alert.alert(
      'Mark as Complete',
      `Mark "${reminder.title}" as done?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Complete',
          onPress: () => onComplete(petId, reminder.id),
        },
      ]
    );
  };

  const handleDelete = (reminder: Reminder) => {
    Alert.alert(
      'Delete Reminder',
      `Delete "${reminder.title}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => onDelete(petId, reminder.id),
        },
      ]
    );
  };

  if (reminders.length === 0) {
    return (
      <View style={styles.empty}>
        <Bell size={40} color={Colors.textSecondary} />
        <Text style={styles.emptyTitle}>No reminders yet</Text>
        <Text style={styles.emptySubtitle}>
          Add a reminder to get notified before your pet's next appointment.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Pending reminders */}
      {pending.length > 0 && (
        <View style={styles.group}>
          <Text style={styles.groupLabel}>Upcoming</Text>
          {pending.map((reminder) => {
            const status = getDueDateStatus(reminder.dueDate);
            const icon = REMINDER_ICONS[reminder.type] ?? '📋';
            return (
              <View key={reminder.id} style={styles.item}>
                <TouchableOpacity
                  style={styles.checkButton}
                  onPress={() => handleComplete(reminder)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Circle size={22} color={Colors.primary} />
                </TouchableOpacity>

                <View style={styles.itemContent}>
                  <View style={styles.itemRow}>
                    <Text style={styles.itemEmoji}>{icon}</Text>
                    <Text style={styles.itemTitle} numberOfLines={1}>
                      {reminder.title}
                    </Text>
                  </View>
                  {reminder.description ? (
                    <Text style={styles.itemDescription} numberOfLines={1}>
                      {reminder.description}
                    </Text>
                  ) : null}
                  <View
                    style={[styles.dueBadge, { backgroundColor: status.bgColor }]}
                  >
                    <Text style={[styles.dueText, { color: status.color }]}>
                      {status.label}
                    </Text>
                  </View>
                </View>

                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => handleDelete(reminder)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Trash2 size={16} color={Colors.neutral400} />
                </TouchableOpacity>
              </View>
            );
          })}
        </View>
      )}

      {/* Completed reminders */}
      {completed.length > 0 && (
        <View style={styles.group}>
          <Text style={styles.groupLabel}>Completed</Text>
          {completed.map((reminder) => {
            const icon = REMINDER_ICONS[reminder.type] ?? '📋';
            return (
              <View key={reminder.id} style={[styles.item, styles.itemCompleted]}>
                <CheckCircle size={22} color={Colors.success} />
                <View style={styles.itemContent}>
                  <View style={styles.itemRow}>
                    <Text style={styles.itemEmoji}>{icon}</Text>
                    <Text style={[styles.itemTitle, styles.itemTitleCompleted]} numberOfLines={1}>
                      {reminder.title}
                    </Text>
                  </View>
                  <Text style={styles.completedDate}>
                    Due {formatDate(reminder.dueDate, 'short')}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => handleDelete(reminder)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Trash2 size={16} color={Colors.neutral400} />
                </TouchableOpacity>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 16,
  },
  group: {
    gap: 8,
  },
  groupLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  itemCompleted: {
    opacity: 0.6,
    backgroundColor: Colors.neutral50,
  },
  checkButton: {
    padding: 2,
  },
  deleteButton: {
    padding: 2,
  },
  itemContent: {
    flex: 1,
    gap: 4,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  itemEmoji: {
    fontSize: 14,
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
    flex: 1,
  },
  itemTitleCompleted: {
    textDecorationLine: 'line-through',
    color: Colors.textSecondary,
  },
  itemDescription: {
    fontSize: 12,
    color: Colors.textSecondary,
    paddingLeft: 20,
  },
  dueBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginLeft: 20,
  },
  dueText: {
    fontSize: 11,
    fontWeight: '700',
  },
  completedDate: {
    fontSize: 11,
    color: Colors.textSecondary,
    paddingLeft: 20,
  },
  empty: {
    alignItems: 'center',
    paddingVertical: 32,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  emptySubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 16,
  },
});