import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors } from '../../constants/colors';
import { HealthRecord } from '../../types';
import { formatHealthRecordType } from '../../lib/utils';

const RECORD_ICONS: Record<string, string> = {
  vaccination: '💉',
  vet_visit: '🏥',
  grooming: '✂️',
  medication: '💊',
  weight: '⚖️',
  deworming: '🔬',
  dental: '🦷',
  surgery: '🩺',
  other: '📋',
};

interface HealthRecordItemProps {
  record: HealthRecord;
  onPress?: () => void;
}

export function HealthRecordItem({ record, onPress }: HealthRecordItemProps) {
  const icon = RECORD_ICONS[record.type] ?? '📋';

  const content = (
    <>
      <View style={styles.iconContainer}>
        <Text style={styles.icon}>{icon}</Text>
      </View>
      <View style={styles.content}>
        <View style={styles.row}>
          <Text style={styles.title}>{record.title}</Text>
          <Text style={styles.type}>{formatHealthRecordType(record.type)}</Text>
        </View>
        {record.vetName && (
          <Text style={styles.vet}>Dr. {record.vetName}</Text>
        )}
        {record.notes && (
          <Text style={styles.notes} numberOfLines={2}>
            {record.notes}
          </Text>
        )}
        {record.nextDueDate && (
          <Text style={styles.nextDue}>
            Next due: {new Date(record.nextDueDate).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })}
          </Text>
        )}
      </View>
    </>
  );

  if (onPress) {
    return (
      <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.7}>
        {content}
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.container}>
      {content}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.primaryBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    fontSize: 18,
  },
  content: {
    flex: 1,
    gap: 3,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
    flex: 1,
  },
  type: {
    fontSize: 11,
    color: Colors.primary,
    fontWeight: '500',
    backgroundColor: Colors.primaryBg,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  vet: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  notes: {
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 16,
  },
  nextDue: {
    fontSize: 11,
    color: Colors.warning,
    fontWeight: '500',
  },
});
