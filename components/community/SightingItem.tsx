import React from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import { Phone, MessageCircle } from 'lucide-react-native';
import { Colors } from '../../constants/colors';
import { Sighting } from '../../types';
import { formatRelativeDate } from '../../lib/utils';

interface SightingItemProps {
  sighting: Sighting;
  showContact?: boolean;
}

function openUrl(url: string) {
  Linking.canOpenURL(url).then((ok) => { if (ok) Linking.openURL(url); });
}

export function SightingItem({ sighting, showContact = false }: SightingItemProps) {
  const phone = sighting.userPhone;

  return (
    <View style={styles.container}>
      {/* Header: avatar + name + time */}
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

      {/* Description */}
      <Text style={styles.description}>{sighting.description}</Text>

      {/* Photo */}
      {sighting.photoUrl && (
        <Image source={{ uri: sighting.photoUrl }} style={styles.photo} />
      )}

      {/* Location */}
      <View style={styles.location}>
        <Text style={styles.locationText}>
          📍 {sighting.latitude.toFixed(4)}, {sighting.longitude.toFixed(4)}
        </Text>
      </View>

      {/* Contact buttons — only shown to alert owner */}
      {showContact && (
        phone ? (
          <View style={styles.contactRow}>
            <TouchableOpacity
              style={styles.contactBtn}
              onPress={() => openUrl(`tel:${phone.replace(/\s/g, '')}`)}
            >
              <Phone size={13} color={Colors.primary} />
              <Text style={styles.contactBtnText}>Call</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.contactBtn, styles.contactBtnSms]}
              onPress={() => openUrl(`sms:${phone.replace(/\s/g, '')}`)}
            >
              <MessageCircle size={13} color={Colors.textSecondary} />
              <Text style={[styles.contactBtnText, { color: Colors.textSecondary }]}>SMS</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <Text style={styles.noPhone}>No contact number added</Text>
        )
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
  contactRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 2,
  },
  contactBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: Colors.primaryBg,
    borderWidth: 1,
    borderColor: Colors.primary + '40',
  },
  contactBtnSms: {
    backgroundColor: Colors.neutral100,
    borderColor: Colors.border,
  },
  contactBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primary,
  },
  noPhone: {
    fontSize: 12,
    color: Colors.textDisabled,
    fontStyle: 'italic',
  },
});
