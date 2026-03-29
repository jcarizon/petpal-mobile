import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../../constants/colors';
import { Review } from '../../types';
import { formatDate } from '../../lib/utils';
import { RatingStars } from './RatingStars';

interface ReviewItemProps {
  review: Review;
}

export function ReviewItem({ review }: ReviewItemProps) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {review?.userName?.charAt(0).toUpperCase()}
          </Text>
        </View>
        <View style={styles.meta}>
          <Text style={styles.name}>{review?.userName}</Text>
          <Text style={styles.date}>{formatDate(review?.createdAt, 'short')}</Text>
        </View>
        <RatingStars rating={review?.rating} size="sm" />
      </View>

      {review?.comment && (
        <Text style={styles.comment}>{review?.comment}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.neutral50,
    borderRadius: 12,
    padding: 12,
    gap: 8,
    marginBottom: 8,
  },
  header: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: Colors.textInverse,
    fontWeight: '700',
    fontSize: 16,
  },
  meta: {
    flex: 1,
  },
  name: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  date: {
    fontSize: 11,
    color: Colors.textSecondary,
  },
  comment: {
    fontSize: 14,
    color: Colors.textPrimary,
    lineHeight: 20,
  },
});
