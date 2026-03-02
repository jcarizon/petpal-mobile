import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors } from '../../constants/colors';
import { Service } from '../../types';
import { formatServiceType, formatDistance, calculateDistance } from '../../lib/utils';
import { RatingStars } from './RatingStars';
import { Badge } from '../ui/Badge';

interface ServiceCardProps {
  service: Service;
  userLatitude?: number;
  userLongitude?: number;
  onPress: () => void;
}

const SERVICE_ICONS: Record<string, string> = {
  vet: '🏥',
  groomer: '✂️',
  pet_shop: '🛒',
  park: '🌳',
  boarding: '🏠',
  other: '📍',
};

export function ServiceCard({ service, userLatitude, userLongitude, onPress }: ServiceCardProps) {
  const distance =
    userLatitude !== undefined && userLongitude !== undefined
      ? calculateDistance(userLatitude, userLongitude, service.latitude, service.longitude)
      : null;

  const icon = SERVICE_ICONS[service.type] ?? '📍';

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.iconContainer}>
        <Text style={styles.icon}>{icon}</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.titleRow}>
          <Text style={styles.name} numberOfLines={1}>
            {service.name}
          </Text>
          {service.isVerified && (
            <Badge label="✓" variant="default" size="sm" />
          )}
        </View>

        <Text style={styles.type}>{formatServiceType(service.type)}</Text>

        <RatingStars rating={service.rating} reviewCount={service.reviewCount} size="sm" />

        <View style={styles.meta}>
          <Text style={styles.address} numberOfLines={1}>
            {service.address}
          </Text>
          {distance !== null && (
            <Text style={styles.distance}>{formatDistance(distance)}</Text>
          )}
        </View>

        {service.isHighlyRecommended && (
          <Badge label="⭐ Highly Recommended" variant="warning" size="sm" style={styles.recommendedBadge} />
        )}
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
    padding: 14,
    marginBottom: 10,
    shadowColor: Colors.neutral900,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  iconContainer: {
    width: 50,
    height: 50,
    borderRadius: 12,
    backgroundColor: Colors.primaryBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    fontSize: 24,
  },
  content: {
    flex: 1,
    gap: 4,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  name: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textPrimary,
    flex: 1,
  },
  type: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  meta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  address: {
    fontSize: 12,
    color: Colors.textSecondary,
    flex: 1,
  },
  distance: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: '600',
  },
  recommendedBadge: {
    marginTop: 4,
  },
});
