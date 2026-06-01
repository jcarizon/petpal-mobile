import React, { useState, useCallback } from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { MapPin, BookOpen } from 'lucide-react-native';
import { Colors } from '../../constants/colors';
import { DiaryFeedEntry } from '../../types';
import { formatRelativeDate, calculateDistance, formatDistance } from '../../lib/utils';

interface Props {
  entry: DiaryFeedEntry;
  userLatitude?: number;
  userLongitude?: number;
}

const CARD_WIDTH = Dimensions.get('window').width - 40;

const MOOD_EMOJI: Record<string, string> = {
  happy: '😊', excited: '🤩', calm: '😌', tired: '😴',
  anxious: '😰', sick: '🤒', playful: '😜',
};
const MOOD_BG: Record<string, string> = {
  happy: '#10B981', excited: '#F59E0B', calm: '#3B82F6',
  tired: '#8B5CF6', anxious: '#EF4444', sick: '#DC2626', playful: '#EC4899',
};

function StoryFeedCardComponent({ entry, userLatitude, userLongitude }: Props) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const [isTruncated, setIsTruncated] = useState(false);

  const onTextLayout = useCallback((e: { nativeEvent: { lines: unknown[] } }) => {
    // Only measure when collapsed — if RN rendered 3+ lines it was cut to 2
    if (!expanded) setIsTruncated(e.nativeEvent.lines.length >= 2);
  }, [expanded]);

  const mood = entry.mood ?? 'calm';
  const moodEmoji = MOOD_EMOJI[mood] ?? '🐾';
  const moodBg = MOOD_BG[mood] ?? Colors.primary;

  const ownerLat = entry.pet.owner.latitude;
  const ownerLng = entry.pet.owner.longitude;
  const distance = userLatitude != null && userLongitude != null && ownerLat != null && ownerLng != null
    ? calculateDistance(userLatitude, userLongitude, ownerLat, ownerLng)
    : null;

  const handlePress = () => {
    router.push({ pathname: '/pawmatch/story/[petId]', params: { petId: entry.pet.id, context: 'community' } });
  };

  return (
    <View style={styles.card}>
      {/* Header */}
      <TouchableOpacity style={styles.header} onPress={handlePress} activeOpacity={0.8}>
        {entry.pet.avatarUrl ? (
          <Image source={{ uri: entry.pet.avatarUrl }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, { backgroundColor: moodBg + '30', justifyContent: 'center', alignItems: 'center' }]}>
            <Text style={{ fontSize: 22 }}>{moodEmoji}</Text>
          </View>
        )}
        <View style={styles.headerMid}>
          <Text style={styles.petName} numberOfLines={1}>{entry.pet.name}</Text>
          {(entry.pet.breed || entry.pet.species) && (
            <Text style={styles.petBreed} numberOfLines={1}>
              {[entry.pet.breed, entry.pet.species].filter(Boolean).join(' · ')}
            </Text>
          )}
        </View>
        <View style={styles.headerRight}>
          <View style={styles.storyPill}>
            <BookOpen size={10} color={Colors.primary} />
            <Text style={styles.storyPillText}>Diary</Text>
          </View>
          <Text style={styles.time}>{formatRelativeDate(new Date(entry.createdAt))}</Text>
        </View>
      </TouchableOpacity>

      {/* Visual: photo or mood banner */}
      <TouchableOpacity onPress={handlePress} activeOpacity={0.95}>
        {entry.imageUrl ? (
          <Image source={{ uri: entry.imageUrl }} style={styles.image} resizeMode="cover" />
        ) : (
          <View style={[styles.moodBanner, { backgroundColor: moodBg }]}>
            <Text style={styles.moodBannerEmoji}>{moodEmoji}</Text>
            {entry.activity && (
              <View style={styles.activityChip}>
                <Text style={styles.activityChipText}>{entry.activity.replace('_', ' ')}</Text>
              </View>
            )}
          </View>
        )}
      </TouchableOpacity>

      {/* Content */}
      <View style={styles.body}>
        {entry.mood && (
          <View style={styles.moodRow}>
            <Text style={styles.moodLabel}>{moodEmoji} {entry.mood}</Text>
            {entry.activity && (
              <View style={[styles.activityBadge, { backgroundColor: Colors.neutral100 }]}>
                <Text style={styles.activityBadgeText}>{entry.activity.replace('_', ' ')}</Text>
              </View>
            )}
          </View>
        )}
        <Text style={styles.title}>{entry.title}</Text>
        {expanded ? (
          <Text style={styles.content}>{entry.content}</Text>
        ) : (
          <Text
            style={styles.content}
            numberOfLines={2}
            onTextLayout={onTextLayout}
          >
            {entry.content}
          </Text>
        )}
        {!expanded && isTruncated && (
          <TouchableOpacity onPress={() => setExpanded(true)} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
            <Text style={styles.more}>more</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Footer */}
      {(distance !== null || entry.pet.owner.city) && (
        <View style={styles.footer}>
          <MapPin size={11} color={Colors.neutral400} />
          <Text style={styles.footerText}>
            {distance !== null ? formatDistance(distance) : entry.pet.owner.city}
            {distance !== null && entry.pet.owner.city ? ` · ${entry.pet.owner.city}` : ''}
          </Text>
        </View>
      )}
    </View>
  );
}

export const StoryFeedCard = React.memo(StoryFeedCardComponent);

const styles = StyleSheet.create({
  card: { backgroundColor: Colors.surface, borderRadius: 16, overflow: 'hidden', elevation: 2, shadowColor: Colors.neutral900, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 8 },
  header: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 10 },
  avatar: { width: 40, height: 40, borderRadius: 20, flexShrink: 0 },
  headerMid: { flex: 1 },
  petName: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary },
  petBreed: { fontSize: 12, color: Colors.textSecondary, marginTop: 1 },
  headerRight: { alignItems: 'flex-end', gap: 3 },
  storyPill: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: Colors.primaryBg, borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3 },
  storyPillText: { fontSize: 10, fontWeight: '700', color: Colors.primary },
  time: { fontSize: 10, color: Colors.neutral400 },
  image: { width: '100%', height: Math.round(CARD_WIDTH * 0.65) },
  moodBanner: { width: '100%', height: 160, justifyContent: 'center', alignItems: 'center', gap: 8 },
  moodBannerEmoji: { fontSize: 52 },
  activityChip: { backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4 },
  activityChipText: { color: '#fff', fontSize: 12, fontWeight: '700', textTransform: 'capitalize' },
  body: { padding: 12 },
  moodRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  moodLabel: { fontSize: 13, color: Colors.textSecondary, textTransform: 'capitalize' },
  activityBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 },
  activityBadgeText: { fontSize: 11, fontWeight: '600', color: Colors.textSecondary, textTransform: 'capitalize' },
  title: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary, marginBottom: 4 },
  content: { fontSize: 13, color: Colors.textSecondary, lineHeight: 19 },
  more: { fontSize: 13, color: Colors.neutral400, marginTop: 4 },
  footer: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingBottom: 12 },
  footerText: { fontSize: 11, color: Colors.neutral400 },
});
