import React from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors } from '../../constants/colors';
import { Alert } from '../../types';
import { formatRelativeDate, calculateDistance, formatDistance } from '../../lib/utils';
import { Badge } from '../ui/Badge';

interface AlertCardProps {
  alert: Alert;
  userLatitude?: number;
  userLongitude?: number;
  onPress: () => void;
}

export function AlertCard({ alert, userLatitude, userLongitude, onPress }: AlertCardProps) {
  const distance =
    userLatitude !== undefined && userLongitude !== undefined
      ? calculateDistance(userLatitude, userLongitude, alert.latitude, alert.longitude)
      : null;

  const isLost = alert.type === 'lost';

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.imageContainer}>
        {alert.photoUrl ? (
          <Image source={{ uri: alert.photoUrl }} style={styles.image} />
        ) : (
          <View style={styles.imagePlaceholder}>
            <Text style={styles.imagePlaceholderText}>🐾</Text>
          </View>
        )}
        <Badge
          label={isLost ? 'LOST' : 'FOUND'}
          style={styles.typeBadge}
          backgroundColor={isLost ? Colors.alertLost : Colors.alertFound}
          color={Colors.textInverse}
          size="sm"
        />
      </View>

      <View style={styles.content}>
        <Text style={styles.title} numberOfLines={1}>
          {alert.title}
        </Text>
        {alert.petBreed && (
          <Text style={styles.breed} numberOfLines={1}>
            {alert.petBreed}
          </Text>
        )}
        <View style={styles.meta}>
          <Text style={styles.city}>{alert.city}</Text>
          {distance !== null && (
            <Text style={styles.distance}>{formatDistance(distance)}</Text>
          )}
        </View>
        <View style={styles.footer}>
          <Text style={styles.time}>
            {formatRelativeDate(new Date(alert.createdAt))}
          </Text>
          {alert.sightingCount > 0 && (
            <Text style={styles.sightings}>
              {alert.sightingCount} sighting{alert.sightingCount !== 1 ? 's' : ''}
            </Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    shadowColor: Colors.neutral900,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  imageContainer: {
    position: 'relative',
  },
  image: {
    width: 80,
    height: 80,
    borderRadius: 10,
  },
  imagePlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 10,
    backgroundColor: Colors.neutral100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imagePlaceholderText: {
    fontSize: 32,
  },
  typeBadge: {
    position: 'absolute',
    top: -4,
    left: -4,
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  breed: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  meta: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  city: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  distance: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  time: {
    fontSize: 11,
    color: Colors.textSecondary,
  },
  sightings: {
    fontSize: 11,
    color: Colors.info,
    fontWeight: '500',
  },
});
