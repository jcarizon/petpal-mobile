import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../../constants/colors';
import { HealthRecord } from '../../types';
import { formatDate, formatHealthRecordType } from '../../lib/utils';
import { HealthRecordItem } from './HealthRecordItem';

interface HealthTimelineProps {
  records: HealthRecord[];
  onRecordPress?: (record: HealthRecord) => void;
}

export function HealthTimeline({ records, onRecordPress }: HealthTimelineProps) {
  if (records.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>No health records yet</Text>
      </View>
    );
  }

  const sorted = [...records].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  return (
    <View style={styles.container}>
      {sorted.map((record, index) => (
        <View key={record.id} style={styles.timelineItem}>
          {/* Timeline line */}
          <View style={styles.lineContainer}>
            <View style={styles.dot} />
            {index < sorted.length - 1 && <View style={styles.line} />}
          </View>

          {/* Record content */}
          <View style={styles.content}>
            <Text style={styles.date}>{formatDate(record.date, 'long')}</Text>
            <HealthRecordItem record={record} onPress={() => onRecordPress?.(record)} />
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 0,
  },
  timelineItem: {
    flexDirection: 'row',
    gap: 12,
  },
  lineContainer: {
    alignItems: 'center',
    width: 16,
    paddingTop: 4,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.primary,
    borderWidth: 2,
    borderColor: Colors.primaryBg,
  },
  line: {
    flex: 1,
    width: 2,
    backgroundColor: Colors.border,
    marginTop: 4,
    minHeight: 20,
  },
  content: {
    flex: 1,
    paddingBottom: 16,
  },
  date: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginBottom: 6,
    fontWeight: '500',
  },
  empty: {
    padding: 24,
    alignItems: 'center',
  },
  emptyText: {
    color: Colors.textSecondary,
    fontSize: 14,
  },
});
