import React from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { Button } from '../ui/Button';
import { ShareButton } from '../ui/ShareButton';
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
  const lastSeen = alert.description || `Last seen near ${alert.city}${alert.petName ? ", " + alert.petName : ''}.`;
  const petDetails = `Male, 3 years old, wearing blue collar.`;
  const notificationText = `${alert.sightingCount} people within 2km have been notified`;

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

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.85}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        accessibilityRole="button"
      >
        {/* Top row: avatar, LOST badge, time */}
        <View style={styles.topRow}>
          <View style={styles.imageContainer}>
            {alert.photoUrl ? (
              <Image source={{ uri: alert.photoUrl }} style={styles.image} />
            ) : (
              <View style={styles.imagePlaceholder}>
                <Text style={styles.imagePlaceholderText}>🐾</Text>
              </View>
            )}
          </View>
          <View style={styles.topInfo}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Badge
                label={isLost ? 'LOST' : 'FOUND'}
                style={styles.typeBadge}
                backgroundColor={isLost ? Colors.alertLost : Colors.alertFound}
                color={Colors.textInverse}
                size="sm"
              />
              <Text style={styles.timeTop}>{formatRelativeDate(new Date(alert.createdAt))}</Text>
            </View>
            <Text style={styles.title} numberOfLines={1}>
              {alert.petName ? `${alert.petName} - ${alert.petBreed || ''}`.trim() : alert.title}
            </Text>
          </View>
        </View>

        {/* Description */}
        <Text style={styles.description} numberOfLines={2}>{lastSeen} {petDetails}</Text>

        {/* Action buttons */}
        <View style={styles.actionsRow}>
          <Button title={isLost ? `I Saw ${alert.petName || 'this pet'}!` : 'This is my pet!'} variant="primary" size="md" style={styles.actionButton} onPress={onPress} />
          <ShareButton message={`Help find ${alert.petName || alert.title}! ${lastSeen}`} style={styles.actionButton} />
        </View>

        {/* Notification text */}
        <Text style={styles.notificationText}>{notificationText}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  imageContainer: {
    marginRight: 12,
  },
  image: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: Colors.neutral100,
  },
  imagePlaceholder: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: Colors.neutral100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imagePlaceholderText: {
    fontSize: 28,
  },
  topInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  typeBadge: {
    marginRight: 8,
  },
  timeTop: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '400',
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginTop: 2,
  },
  description: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 12,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  actionButton: {
    flex: 1,
    marginRight: 8,
    minWidth: 0,
  },
  notificationText: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
    marginLeft: 2,
  },
});
