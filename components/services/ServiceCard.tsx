import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking, Animated } from 'react-native';
import { Navigation, Phone } from 'lucide-react-native';
import { Colors } from '../../constants/colors';
import { Service } from '../../types';
import { formatServiceType, formatDistance, calculateDistance } from '../../lib/utils';
import { Badge } from '../ui/Badge';
import { LinearGradient } from 'expo-linear-gradient';

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

  const [scale] = React.useState(new Animated.Value(1));
  const handlePressIn = () => {
    Animated.spring(scale, {
      toValue: 0.97,
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

  const isMultiType = service.types && service.types.length > 1;

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <TouchableOpacity
        style={styles.card}
        onPress={onPress}
        activeOpacity={0.9}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        accessibilityRole="button"
      >
        <LinearGradient
          colors={[Colors.heroGradientStart, Colors.heroGradientEnd]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.accentGradient}
        />

        <View style={styles.iconContainer}>
          <Text style={styles.icon}>{icon}</Text>
        </View>

        <View style={styles.content}>
          <View style={styles.titleRow}>
            <Text style={styles.name} numberOfLines={1}>
              {service.name}
            </Text>
            {service.isVerified && (
              <Badge label="Verified" variant="default" size="sm" />
            )}
          </View>

          <Text style={styles.type}>
            {isMultiType ? 'Multi-service provider' : formatServiceType(service.type)}
          </Text>

          <View style={styles.ratingRow}>
            <View style={styles.ratingBadge}>
              <Text style={styles.ratingText}>{service.rating.toFixed(1)}</Text>
            </View>
            <Text style={styles.ratingMeta}>{`${service.reviewCount} reviews`}</Text>
          </View>

          <Text style={styles.address} numberOfLines={2}>
            {service.address}
          </Text>

          <View style={styles.infoRow}>
            <Text style={styles.distance}>
              {distance !== null ? formatDistance(distance) : 'Distance TBD'}
            </Text>
            {service.city ? (
              <Text style={styles.city}>{service.city}</Text>
            ) : null}
          </View>

          {service.isHighlyRecommended && (
            <Badge
              label="⭐ Highly Recommended"
              variant="warning"
              size="sm"
              style={styles.recommendedBadge}
            />
          )}

          <View style={styles.ctaRow}>
            {service.phone ? (
              <TouchableOpacity style={[styles.ctaButton, styles.ctaPrimary]} onPress={callService}>
                <LinearGradient
                  colors={[Colors.heroGradientStart, Colors.heroGradientEnd]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.gradientButton}
                >
                  <Phone size={14} color={Colors.textInverse} />
                  <Text style={[styles.ctaText, styles.ctaTextInverse]}>Call</Text>
                </LinearGradient>
              </TouchableOpacity>
            ) : null}

            <TouchableOpacity style={[styles.ctaButton, styles.ctaSecondary]} onPress={handleDirections}>
              <LinearGradient
                colors={[Colors.cardGradientStart, Colors.cardGradientEnd]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.gradientButton}
              >
                <Navigation size={14} color={Colors.accentText} />
                <Text style={[styles.ctaText, { color: Colors.accentText }]}>Directions</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 16,
    paddingTop: 22,
    marginBottom: 12,
    shadowColor: Colors.neutral900,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
    overflow: 'hidden',
  },
  accentGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 6,
  },
  iconContainer: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: Colors.primaryBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  icon: {
    fontSize: 24,
  },
  content: {
    flex: 1,
    gap: 6,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  name: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.textPrimary,
    flex: 1,
  },
  type: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ratingBadge: {
    borderRadius: 10,
    backgroundColor: Colors.primaryBg,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  ratingText: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.primary,
  },
  ratingMeta: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  address: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  distance: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primary,
  },
  city: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  recommendedBadge: {
    marginTop: 4,
  },
  ctaRow: {
    marginTop: 10,
    flexDirection: 'row',
    gap: 8,
  },
  ctaButton: {
    flex: 1,
  },
  gradientButton: {
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  ctaText: {
    fontSize: 13,
    fontWeight: '700',
  },
  ctaTextInverse: {
    color: Colors.textInverse,
  },
  ctaPrimary: {},
  ctaSecondary: {
    borderWidth: 1,
    borderColor: Colors.cardGradientEnd,
  },
});
