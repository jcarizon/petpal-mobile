import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { Heart, Activity, Calendar } from 'lucide-react-native';
import { Colors } from '../../constants/colors';
import { Card } from '../ui/Card';
import { PetDiary, DiaryMood, DiaryActivity } from '../../types';
import { formatDate } from '../../lib/utils';

const moodEmojis: Record<DiaryMood, string> = {
  happy: '😊',
  excited: '🤩',
  calm: '😌',
  tired: '😴',
  anxious: '😰',
  sick: '🤒',
  playful: '😜',
};

const activityLabels: Record<DiaryActivity, string> = {
  walk: 'Walk',
  play: 'Play Time',
  training: 'Training',
  grooming: 'Grooming',
  vet_visit: 'Vet Visit',
  feeding: 'Feeding',
  sleeping: 'Sleeping',
  swimming: 'Swimming',
  other: 'Other',
};

interface DiaryCardProps {
  diary: PetDiary;
  onPress?: () => void;
}

export function DiaryCard({ diary, onPress }: DiaryCardProps) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
      <Card style={styles.card}>
        <View style={styles.header}>
          <View style={styles.dateContainer}>
            <Calendar size={14} color={Colors.textSecondary} />
            <Text style={styles.date}>{formatDate(diary.createdAt)}</Text>
          </View>
          {diary.mood && (
            <View style={styles.moodContainer}>
              <Text style={styles.moodEmoji}>{moodEmojis[diary.mood]}</Text>
              <Text style={styles.moodText}>{diary.mood}</Text>
            </View>
          )}
        </View>

        <Text style={styles.title}>{diary.title}</Text>
        <Text style={styles.content} numberOfLines={3}>
          {diary.content}
        </Text>

        {diary.imageUrl && (
          <Image source={{ uri: diary.imageUrl }} style={styles.image} />
        )}

        {diary.activity && (
          <View style={styles.footer}>
            <View style={styles.activityBadge}>
              <Activity size={12} color={Colors.primary} />
              <Text style={styles.activityText}>{activityLabels[diary.activity]}</Text>
            </View>
          </View>
        )}
      </Card>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 12,
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  date: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  moodContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.primaryBg,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  moodEmoji: {
    fontSize: 14,
  },
  moodText: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 6,
  },
  content: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  image: {
    width: '100%',
    height: 150,
    borderRadius: 8,
    marginTop: 12,
  },
  footer: {
    flexDirection: 'row',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  activityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.secondaryBg,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  activityText: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
});
