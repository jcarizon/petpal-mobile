import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Share,
  Dimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { Eye, MessageCircle, Send, MapPin } from 'lucide-react-native';
import { Colors } from '../../constants/colors';
import { Alert, AlertType } from '../../types';
import { formatRelativeDate, calculateDistance, formatDistance } from '../../lib/utils';

// ── Layout constants ──────────────────────────────────────────────────────────
const CARD_WIDTH = Dimensions.get('window').width - 40; // 20px list padding each side
const IMAGE_HEIGHT = Math.round(CARD_WIDTH * 1.05);     // slightly taller than square

// ── Type config (exported for reuse elsewhere) ────────────────────────────────
export const TYPE_CONFIG: Record<AlertType, {
  color: string;
  bgColor: string;
  label: string;
  emoji: string;
  ctaLabel: (petName?: string) => string;
}> = {
  lost:     { color: '#EF4444', bgColor: '#FEF2F2', label: 'LOST',     emoji: '🚨', ctaLabel: (n) => `I Saw ${n || 'This Pet'}!`         },
  found:    { color: '#10B981', bgColor: '#ECFDF5', label: 'FOUND',    emoji: '🐾', ctaLabel: () => 'This Is My Pet!'                      },
  adoption: { color: '#8B5CF6', bgColor: '#F5F3FF', label: 'ADOPTION', emoji: '🏠', ctaLabel: (n) => `Adopt ${n || 'This Pet'}`           },
  playmate: { color: '#F59E0B', bgColor: '#FFFBEB', label: 'PLAYMATE', emoji: '🐶', ctaLabel: (n) => `Meet ${n || 'This Pet'}`            },
};

// ── Props ─────────────────────────────────────────────────────────────────────
interface AlertCardProps {
  alert: Alert;
  userLatitude?: number;
  userLongitude?: number;
  onPress: () => void;
  onSightingsPress?: () => void;
  onFormPress?: () => void;
}

// ── Component ─────────────────────────────────────────────────────────────────
export function AlertCard({ alert, userLatitude, userLongitude, onPress, onSightingsPress, onFormPress }: AlertCardProps) {
  const [expanded, setExpanded]     = useState(false);
  const [activeSlide, setActiveSlide] = useState(0);

  const config   = TYPE_CONFIG[alert.type] ?? TYPE_CONFIG.lost;
  const isLostFound = alert.type === 'lost' || alert.type === 'found';
  const count    = isLostFound ? alert.sightingCount : (alert.interestCount ?? 0);
  const distance = userLatitude != null && userLongitude != null
    ? calculateDistance(userLatitude, userLongitude, alert.latitude, alert.longitude)
    : null;

  // Use the photos array if present, otherwise fall back to single photoUrl
  const photos: string[] = (alert.photos && alert.photos.length > 0)
    ? alert.photos
    : alert.photoUrl ? [alert.photoUrl] : [];

  const description = alert.description?.trim() ||
    (alert.petName ? `${alert.petName} is ${alert.type === 'found' ? 'found' : 'missing'}. Please help!` : `See alert details for more information.`);

  const displayName = alert.userName || 'PetPal User';
  const subtitle    = [alert.petName, alert.petBreed].filter(Boolean).join(' · ') ||
                      (alert.petSpecies ? alert.petSpecies.charAt(0) + alert.petSpecies.slice(1).toLowerCase() : null) ||
                      alert.city;

  const handleShare = async () => {
    try {
      await Share.share({
        message: `${config.emoji} ${config.label}: ${alert.title}\n${description}\n\nShared via PetPal`,
      });
    } catch {}
  };

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const index = Math.round(e.nativeEvent.contentOffset.x / CARD_WIDTH);
    setActiveSlide(index);
  };

  return (
    <View style={styles.card}>

      {/* ── Header ──────────────────────────────────────────────── */}
      <TouchableOpacity style={styles.header} onPress={onPress} activeOpacity={0.8}>
        <View style={[styles.avatar, { backgroundColor: config.bgColor }]}>
          <Text style={styles.avatarEmoji}>{config.emoji}</Text>
        </View>

        <View style={styles.headerMid}>
          <Text style={styles.username} numberOfLines={1}>{displayName}</Text>
          {subtitle ? (
            <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text>
          ) : null}
        </View>

        <View style={styles.headerRight}>
          <View style={[styles.typePill, { backgroundColor: config.color }]}>
            <Text style={styles.typePillText}>{config.label}</Text>
          </View>
          <Text style={styles.time}>{formatRelativeDate(new Date(alert.createdAt))}</Text>
        </View>
      </TouchableOpacity>

      {/* ── Image / Carousel ────────────────────────────────────── */}
      {photos.length > 0 ? (
        <>
          <FlatList
            data={photos}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            keyExtractor={(_, i) => String(i)}
            onScroll={handleScroll}
            scrollEventThrottle={16}
            renderItem={({ item }) => (
              <TouchableOpacity activeOpacity={0.95} onPress={onPress}>
                <Image
                  source={{ uri: item }}
                  style={styles.image}
                  resizeMode="cover"
                />
              </TouchableOpacity>
            )}
          />
          {photos.length > 1 && (
            <View style={styles.dots}>
              {photos.map((_, i) => (
                <View
                  key={i}
                  style={[styles.dot, i === activeSlide && styles.dotActive]}
                />
              ))}
            </View>
          )}
        </>
      ) : (
        <TouchableOpacity
          style={[styles.imagePlaceholder, { backgroundColor: config.bgColor }]}
          activeOpacity={0.9}
          onPress={onPress}
        >
          <Text style={styles.placeholderEmoji}>{config.emoji}</Text>
          <Text style={[styles.placeholderLabel, { color: config.color }]}>
            {config.label} ALERT
          </Text>
          <Text style={styles.placeholderSub}>No photo available</Text>
        </TouchableOpacity>
      )}

      {/* ── Adoption fee chip (above actions) ───────────────────── */}
      {alert.type === 'adoption' && alert.adoptionFee !== undefined && (
        <View style={[styles.feePill, { backgroundColor: config.bgColor }]}>
          <Text style={[styles.feePillText, { color: config.color }]}>
            {alert.adoptionFee === 0 ? '🆓 Free to good home' : `₱${alert.adoptionFee} adoption fee`}
          </Text>
        </View>
      )}

      {/* ── Actions row ─────────────────────────────────────────── */}
      <View style={styles.actions}>
        <View style={styles.actionsLeft}>
          {/* Eye — sightings / interests */}
          <TouchableOpacity style={styles.actionBtn} onPress={onSightingsPress ?? onPress}>
            <Eye size={24} color={Colors.textPrimary} strokeWidth={1.8} />
            {count > 0 && <Text style={styles.actionCount}>{count}</Text>}
          </TouchableOpacity>

          {/* Comment — opens form modal */}
          <TouchableOpacity style={styles.actionBtn} onPress={onFormPress ?? onPress}>
            <MessageCircle size={24} color={Colors.textPrimary} strokeWidth={1.8} />
          </TouchableOpacity>
        </View>

        {/* Share */}
        <TouchableOpacity style={styles.actionBtn} onPress={handleShare}>
          <Send size={22} color={Colors.textPrimary} strokeWidth={1.8} />
        </TouchableOpacity>
      </View>

      {/* ── Description ─────────────────────────────────────────── */}
      <View style={styles.descWrap}>
        <Text style={styles.descText} numberOfLines={expanded ? undefined : 1}>
          <Text style={styles.descUsername}>{displayName} </Text>
          {description}
        </Text>
        {!expanded && description.length > 60 && (
          <TouchableOpacity onPress={() => setExpanded(true)} hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}>
            <Text style={styles.moreText}>more</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* ── Distance + location ─────────────────────────────────── */}
      {(distance !== null || alert.city) && (
        <View style={styles.locationRow}>
          <MapPin size={11} color={Colors.neutral400} />
          <Text style={styles.locationText}>
            {distance !== null ? `${formatDistance(distance)} away · ` : ''}{alert.city}
          </Text>
        </View>
      )}
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  avatarEmoji: {
    fontSize: 20,
  },
  headerMid: {
    flex: 1,
  },
  username: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textPrimary,
    lineHeight: 17,
  },
  subtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 16,
  },
  headerRight: {
    alignItems: 'flex-end',
    gap: 4,
    flexShrink: 0,
  },
  typePill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  typePillText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 0.5,
  },
  time: {
    fontSize: 11,
    color: Colors.neutral400,
  },

  // Image
  image: {
    width: CARD_WIDTH,
    height: IMAGE_HEIGHT,
  },
  imagePlaceholder: {
    width: CARD_WIDTH,
    height: IMAGE_HEIGHT * 0.6,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  placeholderEmoji: {
    fontSize: 52,
  },
  placeholderLabel: {
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 1,
  },
  placeholderSub: {
    fontSize: 12,
    color: Colors.neutral400,
  },

  // Dots
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 8,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.neutral300,
  },
  dotActive: {
    backgroundColor: Colors.textPrimary,
    width: 18,
  },

  // Fee chip
  feePill: {
    alignSelf: 'flex-start',
    marginHorizontal: 14,
    marginTop: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  feePillText: {
    fontSize: 12,
    fontWeight: '600',
  },

  // Actions
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 4,
  },
  actionsLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    padding: 6,
  },
  actionCount: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
  },

  // Description
  descWrap: {
    paddingHorizontal: 14,
    paddingBottom: 2,
    gap: 2,
  },
  descText: {
    fontSize: 13,
    color: Colors.textPrimary,
    lineHeight: 19,
  },
  descUsername: {
    fontWeight: '700',
  },
  moreText: {
    fontSize: 13,
    color: Colors.neutral400,
    fontWeight: '500',
  },

  // Location
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 14,
    paddingBottom: 12,
    paddingTop: 6,
  },
  locationText: {
    fontSize: 11,
    color: Colors.neutral400,
  },
});
