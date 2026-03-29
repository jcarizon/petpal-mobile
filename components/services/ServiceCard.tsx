import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import { Navigation, Phone } from 'lucide-react-native';
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
  onDirections?: () => void;
}

const SERVICE_ICONS: Record<string, string> = {
  vet: '🏥',
  groomer: '✂️',
  pet_shop: '🛒',
  park: '🌳',
  boarding: '🏠',
  other: '📍',
};

export function ServiceCard({ service, userLatitude, userLongitude, onPress, onDirections }: ServiceCardProps) {
  const distance =
    userLatitude !== undefined && userLongitude !== undefined
      ? calculateDistance(userLatitude, userLongitude, service.latitude, service.longitude)
      : null;

  const icon = SERVICE_ICONS[service.type] ?? '📍';
  const handleDirections = () => {
    if (onDirections) {
      onDirections();
    } else {
      const url = `https://www.google.com/maps/search/?api=1&query=${service.latitude},${service.longitude}`;
      Linking.openURL(url);
    }
  };

  const callService = () => {
    if (!service.phone) return;
    Linking.openURL(`tel:${service.phone}`);
  };

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

        <View style={styles.ctaRow}>
          {service.phone ? (
            <TouchableOpacity style={styles.ctaButton} activeOpacity={0.85} onPress={callService}>
              <Phone size={14} color={Colors.primary} />
              <Text style={styles.ctaText}>Call</Text>
            </TouchableOpacity>
          ) : null}

          <TouchableOpacity style={styles.ctaButton} activeOpacity={0.85} onPress={handleDirections}>
            <Navigation size={14} color={Colors.primary} />
            <Text style={styles.ctaText}>Directions</Text>
          </TouchableOpacity>
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
  ctaRow: {
    marginTop: 6,
    flexDirection: 'row',
    gap: 8,
  },
  ctaButton: {
    minHeight: 30,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryBg,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ctaText: {
    color: Colors.primary,
    fontSize: 12,
    fontWeight: '700',
  },
});
