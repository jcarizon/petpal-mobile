import React from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors } from '../../constants/colors';
import { Pet } from '../../types';
import { calculateAge } from '../../lib/utils';

interface PetCardProps {
  pet: Pet;
  onPress: () => void;
}

function getHealthScoreColor(score: number): string {
  if (score >= 80) return Colors.healthExcellent;
  if (score >= 60) return Colors.healthGood;
  if (score >= 40) return Colors.healthFair;
  return Colors.healthPoor;
}

export function PetCard({ pet, onPress }: PetCardProps) {
  const scoreColor = getHealthScoreColor(pet.healthScore ?? 70);

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.photoContainer}>
        {pet.photoUrl ? (
          <Image source={{ uri: pet.photoUrl }} style={styles.photo} />
        ) : (
          <View style={[styles.photoPlaceholder]}>
            <Text style={styles.photoEmoji}>
              {pet.type === 'dog' ? '🐕' : pet.type === 'cat' ? '🐈' : '🐾'}
            </Text>
          </View>
        )}
        <View style={[styles.scoreBadge, { backgroundColor: scoreColor }]}>
          <Text style={styles.scoreText}>{pet.healthScore ?? '–'}</Text>
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
    shadowColor: Colors.neutral900,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.09,
    shadowRadius: 6,
    elevation: 3,
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
