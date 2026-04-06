import React from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { Colors } from '../../constants/colors';
import { Pet } from '../../types';
import { calculateAge } from '../../lib/utils';
 
interface PetCardProps {
  pet: Pet;
  onPress: () => void;
  healthScore?: number | null;
}

export function PetCard({ pet, onPress, healthScore }: PetCardProps) {
  function getHealthScoreColor(score: number): string {
    if (score >= 80) return Colors.healthExcellent;
    if (score >= 60) return Colors.healthGood;
    if (score >= 40) return Colors.healthFair;
    return Colors.healthPoor;
  }

  const resolvedScore =
    typeof healthScore !== 'undefined' ? healthScore : pet.healthScore;
  const hasScore = typeof resolvedScore === 'number' && !Number.isNaN(resolvedScore);
  const scoreColor = hasScore
    ? getHealthScoreColor(Math.round(resolvedScore))
    : Colors.neutral200;
  const [scale] = React.useState(new Animated.Value(1));

  const handlePressIn = () => {
    Animated.spring(scale, {
      toValue: 0.96,
      useNativeDriver: true,
      speed: 40,
      bounciness: 8,
    }).start();
  };
  const handlePressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      speed: 40,
      bounciness: 8,
    }).start();
  };

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <TouchableOpacity
        style={styles.card}
        onPress={onPress}
        activeOpacity={0.8}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        accessibilityRole="button"
      >
        <View style={styles.photoContainer}>
          {pet.photoUrl ? (
            <Image source={{ uri: pet.photoUrl }} style={styles.photo} />
          ) : (
            <View style={[styles.photoPlaceholder]}>
              <Text style={styles.photoEmoji}>
                {pet.type === 'dog' ? 'ðŸ•' : pet.type === 'cat' ? 'ðŸˆ' : 'ðŸ¾'}
              </Text>
            </View>
          )}
          <View style={[styles.scoreBadge, { backgroundColor: scoreColor }]}>
            <Text style={styles.scoreText}>
              {hasScore ? Math.round(resolvedScore) : '–'}
            </Text>
          </View>
        </View>

        <Text style={styles.name} numberOfLines={1}>
          {pet.name}
        </Text>
        <Text style={styles.breed} numberOfLines={1}>
          {pet.breed ?? pet.type}
        </Text>
        {pet.birthDate && (
          <Text style={styles.age}>{calculateAge(pet.birthDate)}</Text>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 120,
    minHeight: 148,
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  photoContainer: {
    position: 'relative',
    marginBottom: 10,
  },
  photo: {
    width: 72,
    height: 72,
    borderRadius: 36,
  },
  photoPlaceholder: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.primaryBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoEmoji: {
    fontSize: 36,
  },
  scoreBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.surface,
  },
  scoreText: {
    fontSize: 10,
    fontWeight: '800',
    color: Colors.textInverse,
  },
  name: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  breed: {
    fontSize: 12,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 2,
  },
  age: {
    fontSize: 11,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 2,
  },
});

