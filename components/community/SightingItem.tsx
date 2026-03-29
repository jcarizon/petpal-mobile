import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { Colors } from '../../constants/colors';
import { Sighting } from '../../types';
import { formatRelativeDate } from '../../lib/utils';

interface SightingItemProps {
  sighting: Sighting;
}

export function SightingItem({ sighting }: SightingItemProps) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {(sighting.userName ?? 'U').charAt(0).toUpperCase()}
          </Text>
        </View>
        <View style={styles.meta}>
          <Text style={styles.name}>{sighting.userName ?? 'Anonymous'}</Text>
          <Text style={styles.time}>
            {formatRelativeDate(new Date(sighting.createdAt))}
          </Text>
        </View>
      </View>

      <Text style={styles.description}>{sighting.description}</Text>

      {sighting.photoUrl && (
        <Image source={{ uri: sighting.photoUrl }} style={styles.photo} />
      )}

      <View style={styles.location}>
        <Text style={styles.locationText}>
          📍 {sighting.latitude.toFixed(4)}, {sighting.longitude.toFixed(4)}
        </Text>
      </View>
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
    backgroundColor: Colors.primary,
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
  time: {
    fontSize: 11,
    color: Colors.textSecondary,
  },
  description: {
    fontSize: 14,
    color: Colors.textPrimary,
    lineHeight: 20,
  },
  photo: {
    width: '100%',
    height: 160,
    borderRadius: 10,
  },
  location: {
    backgroundColor: Colors.neutral100,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  locationText: {
    fontSize: 11,
    color: Colors.textSecondary,
  },
});
