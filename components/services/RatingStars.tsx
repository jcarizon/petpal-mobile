import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../../constants/colors';

interface RatingStarsProps {
  rating: number;
  reviewCount?: number;
  size?: 'sm' | 'md' | 'lg';
}

export function RatingStars({ rating, reviewCount, size = 'md' }: RatingStarsProps) {
  const sizes = {
    sm: { star: 12, text: 11 },
    md: { star: 16, text: 13 },
    lg: { star: 20, text: 15 },
  };

  const s = sizes[size];
  const fullStars = Math.floor(rating);
  const hasHalf = rating - fullStars >= 0.5;

  return (
    <View style={styles.container}>
      <View style={styles.stars}>
        {[1, 2, 3, 4, 5].map((star) => {
          const filled = star <= fullStars;
          const half = !filled && star === fullStars + 1 && hasHalf;
          return (
            <Text
              key={star}
              style={[
                styles.star,
                { fontSize: s.star },
                { color: filled || half ? Colors.secondary : Colors.neutral300 },
              ]}
            >
              {filled ? '★' : half ? '⯨' : '★'}
            </Text>
          );
        })}
      </View>
      <Text style={[styles.rating, { fontSize: s.text }]}>
        {rating.toFixed(1)}
      </Text>
      {reviewCount !== undefined && (
        <Text style={[styles.count, { fontSize: s.text }]}>
          ({reviewCount})
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  stars: {
    flexDirection: 'row',
    gap: 1,
  },
  star: {
    fontWeight: '400',
  },
  rating: {
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  count: {
    color: Colors.textSecondary,
  },
});
