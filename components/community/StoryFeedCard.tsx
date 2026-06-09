import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { MapPin, BookOpen, PawPrint, MessageCircle } from 'lucide-react-native';
import { Colors } from '../../constants/colors';
import { DiaryFeedEntry } from '../../types';
import { formatRelativeDate, calculateDistance, formatDistance } from '../../lib/utils';
import api from '../../lib/api';
import { useCommunityStore } from '../../store/communityStore';
import { DiaryVideo } from '../pet/DiaryVideo';
import { UserAvatarBox } from '../ui/UserAvatarBox';

interface Props {
  entry: DiaryFeedEntry;
  userLatitude?: number;
  userLongitude?: number;
  isActive?: boolean; // false = scrolled out of view → pause video
}

const W = Dimensions.get('window').width;

const MOOD_EMOJI: Record<string, string> = {
  happy: '😊', excited: '🤩', calm: '😌', tired: '😴',
  anxious: '😰', sick: '🤒', playful: '😜',
};
const MOOD_BG: Record<string, string> = {
  happy: '#10B981', excited: '#F59E0B', calm: '#3B82F6',
  tired: '#8B5CF6', anxious: '#EF4444', sick: '#DC2626', playful: '#EC4899',
};

function StoryFeedCardComponent({ entry, userLatitude, userLongitude, isActive = true }: Props) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const [isTruncated, setIsTruncated] = useState(false);
  const [textExpanded, setTextExpanded] = useState(false);
  const [textTruncated, setTextTruncated] = useState(false);
  const [imgHeight, setImgHeight] = useState(Math.round(W * 0.65)); // start landscape, update on load
  const [reacted, setReacted] = useState(entry.userReacted ?? false);
  const [reactionCount, setReactionCount] = useState(entry.reactionCount ?? 0);
  const [reacting, setReacting] = useState(false);

  // Sync local state when the store entry is updated (e.g. reacted from detail screen)
  useEffect(() => {
    setReacted(entry.userReacted ?? false);
    setReactionCount(entry.reactionCount ?? 0);
  }, [entry.userReacted, entry.reactionCount]);

  const mood = entry.mood ?? 'calm';
  const moodEmoji = MOOD_EMOJI[mood] ?? '🐾';
  const moodBg = MOOD_BG[mood] ?? Colors.primary;

  const ownerLat = entry.pet.owner.latitude;
  const ownerLng = entry.pet.owner.longitude;
  const distance = userLatitude != null && userLongitude != null && ownerLat != null && ownerLng != null
    ? calculateDistance(userLatitude, userLongitude, ownerLat, ownerLng)
    : null;

  const hasMedia = !!(entry.videoUrl || entry.imageUrl);

  const onTextLayout = useCallback((e: { nativeEvent: { lines: unknown[] } }) => {
    if (!expanded) setIsTruncated(e.nativeEvent.lines.length >= 2);
  }, [expanded]);

  const onTextPostLayout = useCallback((e: { nativeEvent: { lines: unknown[] } }) => {
    if (!textExpanded) setTextTruncated(e.nativeEvent.lines.length >= 5);
  }, [textExpanded]);

  const handleReact = async () => {
    if (reacting) return;
    setReacting(true);
    const next = !reacted;
    setReacted(next);
    setReactionCount((n) => next ? n + 1 : Math.max(0, n - 1));
    try {
      const res = await api.post(`/pets/diary/${entry.id}/react`);
      const data = res.data?.data;
      if (data) {
        setReacted(data.reacted);
        setReactionCount(data.count);
        useCommunityStore.getState().patchDiaryFeedEntry(entry.id, {
          reactionCount: data.count,
          userReacted: data.reacted,
        });
      }
    } catch {
      setReacted(!next);
      setReactionCount((n) => !next ? n + 1 : Math.max(0, n - 1));
    } finally {
      setReacting(false);
    }
  };

  const handleOpenDiary = () => {
    router.push({ pathname: '/community/diary/[diaryId]', params: { diaryId: entry.id } });
  };

  return (
    <View style={styles.card}>
      {/* Header — owner name primary, pet info secondary */}
      <TouchableOpacity style={[styles.header, !hasMedia && styles.headerTextOnly]} onPress={handleOpenDiary} activeOpacity={0.8}>
        <UserAvatarBox
          avatarUrl={entry.pet.owner.avatarUrl ?? entry.pet.avatarUrl}
          name={entry.pet.owner.name}
          size={40}
        />
        <View style={styles.headerMid}>
          <Text style={styles.ownerName} numberOfLines={1}>{entry.pet.owner.name}</Text>
          <Text style={styles.petBreed} numberOfLines={1}>
            {entry.pet.name}{(entry.pet.breed || entry.pet.species) ? ` · ${[entry.pet.breed, entry.pet.species].filter(Boolean).join(' ')}` : ''}
          </Text>
          {(distance !== null || entry.pet.owner.city) && (
            <View style={styles.headerLocation}>
              <MapPin size={10} color={Colors.neutral400} />
              <Text style={styles.headerLocationText} numberOfLines={1}>
                {distance !== null ? formatDistance(distance) : entry.pet.owner.city}
                {distance !== null && entry.pet.owner.city ? ` · ${entry.pet.owner.city}` : ''}
              </Text>
            </View>
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

      {/* Visual — natural aspect ratio for both portrait and landscape */}
      {entry.videoUrl ? (
        <DiaryVideo uri={entry.videoUrl} isActive={isActive} autoPlay={isActive} />
      ) : entry.imageUrl ? (
        <TouchableOpacity onPress={handleOpenDiary} activeOpacity={0.95}>
          <Image
            source={{ uri: entry.imageUrl }}
            style={[styles.image, { height: imgHeight }]}
            resizeMode="cover"
            onLoad={(e) => {
              const { width: iw, height: ih } = e.nativeEvent.source;
              if (iw && ih) {
                // Scale to full width, cap at 1.5× width (portrait max) and 0.65× (landscape floor)
                const natural = (W / iw) * ih;
                setImgHeight(Math.min(Math.max(natural, W * 0.5), W * 1.5));
              }
            }}
          />
        </TouchableOpacity>
      ) : (
        <View style={styles.textPost}>
          {(entry.mood || entry.activity) && (
            <View style={styles.textPostMeta}>
              {entry.mood && (
                <View style={[styles.textPostMoodChip, { backgroundColor: moodBg + '18' }]}>
                  <Text style={[styles.textPostMoodChipText, { color: moodBg }]}>
                    {moodEmoji} {entry.mood}
                  </Text>
                </View>
              )}
              {entry.activity && (
                <View style={styles.textPostActivityChip}>
                  <Text style={styles.textPostActivityText}>{entry.activity.replace('_', ' ')}</Text>
                </View>
              )}
            </View>
          )}
          <TouchableOpacity onPress={handleOpenDiary} activeOpacity={0.85}>
            <Text style={styles.textPostTitle}>{entry.title}</Text>
          </TouchableOpacity>
          {entry.content ? (
            <>
              <Text
                style={styles.textPostContent}
                numberOfLines={textExpanded ? undefined : 5}
                onTextLayout={onTextPostLayout}
              >
                {entry.content}
              </Text>
              {!textExpanded && textTruncated ? (
                <TouchableOpacity onPress={() => setTextExpanded(true)} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                  <Text style={styles.textPostMore}>more</Text>
                </TouchableOpacity>
              ) : textExpanded ? (
                <TouchableOpacity onPress={() => setTextExpanded(false)} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                  <Text style={styles.textPostMore}>less</Text>
                </TouchableOpacity>
              ) : null}
            </>
          ) : null}
        </View>
      )}

      {/* Content body — full title+content for media posts; stripped for text-only posts */}
      {hasMedia ? (
        <View style={styles.body}>
          {(entry.mood || entry.activity) && (
            <View style={styles.textPostMeta}>
              {entry.mood && (
                <View style={[styles.textPostMoodChip, { backgroundColor: moodBg + '18' }]}>
                  <Text style={[styles.textPostMoodChipText, { color: moodBg }]}>
                    {moodEmoji} {entry.mood}
                  </Text>
                </View>
              )}
              {entry.activity && (
                <View style={styles.textPostActivityChip}>
                  <Text style={styles.textPostActivityText}>{entry.activity.replace('_', ' ')}</Text>
                </View>
              )}
            </View>
          )}
          <TouchableOpacity onPress={handleOpenDiary} activeOpacity={0.8}>
            <Text style={styles.title}>{entry.title}</Text>
          </TouchableOpacity>
          {expanded ? (
            <Text style={styles.content}>{entry.content}</Text>
          ) : (
            <Text style={styles.content} numberOfLines={2} onTextLayout={onTextLayout}>
              {entry.content}
            </Text>
          )}
          {!expanded && isTruncated ? (
            <TouchableOpacity onPress={() => setExpanded(true)} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
              <Text style={styles.more}>more</Text>
            </TouchableOpacity>
          ) : expanded ? (
            <TouchableOpacity onPress={() => setExpanded(false)} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
              <Text style={styles.more}>less</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      ) : null}

      {/* Reaction + comment bar — always below the description */}
      <View style={[styles.actionBar, !hasMedia && styles.actionBarTextOnly]}>
        <TouchableOpacity style={styles.actionBtn} onPress={handleReact} disabled={reacting}>
          <PawPrint
            size={22}
            color={reacted ? Colors.primary : Colors.textSecondary}
            fill={reacted ? Colors.primary : 'transparent'}
          />
          {reactionCount > 0 && (
            <Text style={[styles.actionCount, reacted && { color: Colors.primary }]}>
              {reactionCount}
            </Text>
          )}
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={handleOpenDiary}>
          <MessageCircle size={22} color={Colors.textSecondary} strokeWidth={1.8} />
          {(entry.commentCount ?? 0) > 0 && (
            <Text style={styles.actionCount}>{entry.commentCount}</Text>
          )}
        </TouchableOpacity>
      </View>

    </View>
  );
}

export const StoryFeedCard = React.memo(StoryFeedCardComponent);

const styles = StyleSheet.create({
  card: { backgroundColor: Colors.surface, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.border },
  header: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 10 },
  headerTextOnly: { paddingHorizontal: 14, paddingTop: 16, paddingBottom: 12 },
  avatar: { width: 40, height: 40, borderRadius: 20, flexShrink: 0 },
  headerMid: { flex: 1 },
  ownerName: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary },
  petBreed: { fontSize: 12, color: Colors.textSecondary, marginTop: 1 },
  headerRight: { alignItems: 'flex-end', gap: 3 },
  storyPill: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: Colors.primaryBg, borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3 },
  storyPillText: { fontSize: 10, fontWeight: '700', color: Colors.primary },
  time: { fontSize: 10, color: Colors.neutral400 },
  image: { width: W }, // height set dynamically via onLoad
  // Text-only post (no media)
  textPost: { paddingHorizontal: 14, paddingBottom: 20 },
  textPostMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
  textPostMoodChip: { flexDirection: 'row', alignItems: 'center', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  textPostMoodChipText: { fontSize: 12, fontWeight: '700', textTransform: 'capitalize' },
  textPostActivityChip: { backgroundColor: Colors.neutral100, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  textPostActivityText: { fontSize: 12, fontWeight: '600', color: Colors.textSecondary, textTransform: 'capitalize' },
  textPostTitle: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary, marginBottom: 4 },
  textPostContent: { fontSize: 13, color: Colors.textSecondary, lineHeight: 19 },
  textPostMore: { fontSize: 13, color: Colors.neutral400, marginTop: 4 },
  actionBar: { flexDirection: 'row', gap: 16, paddingHorizontal: 14, paddingVertical: 10 },
  actionBarTextOnly: { paddingHorizontal: 14, paddingTop: 4, paddingBottom: 16 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  actionCount: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary },
  body: { padding: 12 },
  title: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary, marginBottom: 4 },
  content: { fontSize: 13, color: Colors.textSecondary, lineHeight: 19 },
  more: { fontSize: 13, color: Colors.neutral400, marginTop: 4 },
  headerLocation: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 2 },
  headerLocationText: { fontSize: 11, color: Colors.neutral400, flex: 1 },
});
