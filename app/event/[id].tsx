import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Linking,
  Modal,
  FlatList,
  TextInput,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  CalendarDays,
  MapPin,
  Users,
  Clock,
  CheckCircle,
  ExternalLink,
  PawPrint,
  MessageCircle,
  Send,
} from 'lucide-react-native';
import { Colors } from '../../constants/colors';
import { Loading } from '../../components/ui/Loading';
import { Button } from '../../components/ui/Button';
import { useCommunityStore } from '../../store/communityStore';
import { useAuthStore } from '../../store/authStore';
import { formatRelativeDate } from '../../lib/utils';
import { EventReactionState, EventComment } from '../../types';
import api from '../../lib/api';

function formatEventDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-PH', {
    weekday: 'short',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function formatEventTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-PH', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

export default function EventDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuthStore();
  const { selectedEvent, fetchEvent, rsvpEvent, isLoading, error } = useCommunityStore();
  const [refreshing, setRefreshing] = useState(false);
  const [hasRsvped, setHasRsvped] = useState(false);
  const [rsvping, setRsvping] = useState(false);
  const [bannerHeight, setBannerHeight] = useState(220);

  // Reactions + comments
  const [reaction, setReaction] = useState<EventReactionState>({ count: 0, reacted: false });
  const [comments, setComments] = useState<EventComment[]>([]);
  const [commentCount, setCommentCount] = useState(0);
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [sendingComment, setSendingComment] = useState(false);
  const [reacting, setReacting] = useState(false);

  useEffect(() => {
    if (id) fetchEvent(id);
  }, [id, fetchEvent]);

  useEffect(() => {
    if (selectedEvent?.id === id && selectedEvent.hasRsvp) {
      setHasRsvped(true);
    }
  }, [selectedEvent?.id, selectedEvent?.hasRsvp]);

  // Fetch reaction + comment count when event loads
  useEffect(() => {
    if (!id) return;
    Promise.all([
      api.get(`/community/events/${id}/reactions`),
      api.get(`/community/events/${id}/comments?limit=1`),
    ]).then(([rRes, cRes]) => {
      setReaction(rRes.data?.data ?? { count: 0, reacted: false });
      setCommentCount(cRes.data?.meta?.total ?? 0);
    }).catch(() => {});
  }, [id]);

  const handleReact = async () => {
    if (reacting || !id) return;
    setReacting(true);
    setReaction((r) => ({ count: r.reacted ? r.count - 1 : r.count + 1, reacted: !r.reacted }));
    try {
      const res = await api.post(`/community/events/${id}/react`);
      setReaction(res.data?.data ?? { count: 0, reacted: false });
    } catch {
      setReaction((r) => ({ count: r.reacted ? r.count - 1 : r.count + 1, reacted: !r.reacted }));
    } finally {
      setReacting(false);
    }
  };

  const handleOpenComments = () => {
    if (!id) return;
    api.get(`/community/events/${id}/comments`)
      .then((res) => setComments(res.data?.data ?? []))
      .catch(() => {});
    setShowComments(true);
  };

  const handleSendComment = async () => {
    if (!commentText.trim() || sendingComment || !id) return;
    const text = commentText.trim();
    setCommentText('');
    setSendingComment(true);
    try {
      const res = await api.post(`/community/events/${id}/comments`, { content: text });
      setComments((prev) => [...prev, res.data?.data ?? res.data]);
      setCommentCount((n) => n + 1);
    } catch {
      setCommentText(text);
      Alert.alert('Error', 'Could not send comment.');
    } finally {
      setSendingComment(false);
    }
  };

  const handleDeleteComment = (commentId: string) => {
    Alert.alert('Delete Comment', 'Remove this comment?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/community/events/${id}/comments/${commentId}`);
            setComments((prev) => prev.filter((c) => c.id !== commentId));
            setCommentCount((n) => Math.max(0, n - 1));
          } catch { /* silent */ }
        },
      },
    ]);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    if (id) await fetchEvent(id);
    setRefreshing(false);
  };

  const handleRsvp = async () => {
    if (!user) {
      Alert.alert('Sign in required', 'Please sign in to RSVP to events.');
      return;
    }
    if (hasRsvped) return;
    setRsvping(true);
    try {
      await rsvpEvent(id!);
      setHasRsvped(true);
    } catch {
      Alert.alert('RSVP failed', 'You may have already RSVPed or the event is full.');
    } finally {
      setRsvping(false);
    }
  };

  const handleOpenMaps = (location: string) => {
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`;
    Linking.openURL(url);
  };

  if (isLoading && !selectedEvent) return <Loading fullScreen />;

  if (error && !selectedEvent) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <ArrowLeft size={20} color={Colors.textPrimary} />
          </TouchableOpacity>
        </View>
        <View style={styles.errorState}>
          <Text style={styles.errorTitle}>Event not found</Text>
          <Text style={styles.errorSub}>{error}</Text>
        </View>
      </SafeAreaView>
    );
  }

  const event = selectedEvent;
  if (!event) return <Loading fullScreen />;

  const isFull = event.maxRsvps !== undefined && event.rsvpCount >= event.maxRsvps;
  const spotsLeft = event.maxRsvps !== undefined ? event.maxRsvps - event.rsvpCount : null;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={20} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{event.title}</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={Colors.primary} />}
        contentContainerStyle={styles.scroll}
      >
        {/* Banner image — natural aspect ratio */}
        {event.imageUrl ? (
          <Image
            source={{ uri: event.imageUrl }}
            style={[styles.banner, { height: bannerHeight }]}
            resizeMode="cover"
            onLoad={(e) => {
              const { width: iw, height: ih } = e.nativeEvent.source;
              if (iw && ih) {
                const { width: screenW } = Dimensions.get('window');
                const natural = (screenW / iw) * ih;
                setBannerHeight(Math.min(Math.max(natural, screenW * 0.45), screenW * 1.4));
              }
            }}
          />
        ) : (
          <View style={styles.bannerPlaceholder}>
            <Text style={styles.bannerEmoji}>🎉</Text>
          </View>
        )}

        {/* Event card */}
        <View style={styles.card}>
          <Text style={styles.title}>{event.title}</Text>

          {event.description ? (
            <Text style={styles.description}>{event.description}</Text>
          ) : null}

          {/* Date & time */}
          <View style={styles.infoRow}>
            <View style={styles.infoIcon}>
              <CalendarDays size={16} color={Colors.primary} />
            </View>
            <View style={styles.infoText}>
              <Text style={styles.infoLabel}>Date</Text>
              <Text style={styles.infoValue}>{formatEventDate(event.startDate)}</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <View style={styles.infoIcon}>
              <Clock size={16} color={Colors.secondary} />
            </View>
            <View style={styles.infoText}>
              <Text style={styles.infoLabel}>Time</Text>
              <Text style={styles.infoValue}>
                {formatEventTime(event.startDate)}
                {event.endDate ? ` – ${formatEventTime(event.endDate)}` : ''}
              </Text>
            </View>
          </View>

          {/* Location */}
          <TouchableOpacity style={styles.infoRow} onPress={() => handleOpenMaps(event.location)} activeOpacity={0.7}>
            <View style={styles.infoIcon}>
              <MapPin size={16} color={Colors.error} />
            </View>
            <View style={styles.infoText}>
              <Text style={styles.infoLabel}>Location</Text>
              <Text style={[styles.infoValue, styles.infoLink]}>{event.location}</Text>
            </View>
            <ExternalLink size={14} color={Colors.primary} />
          </TouchableOpacity>

          {/* Attendees */}
          <View style={styles.infoRow}>
            <View style={styles.infoIcon}>
              <Users size={16} color={Colors.info} />
            </View>
            <View style={styles.infoText}>
              <Text style={styles.infoLabel}>Attendees</Text>
              <Text style={styles.infoValue}>
                {event.rsvpCount} going
                {spotsLeft !== null ? ` · ${isFull ? 'Full' : `${spotsLeft} spots left`}` : ''}
              </Text>
            </View>
          </View>
        </View>

        {/* RSVP section */}
        <View style={styles.rsvpCard}>
          {hasRsvped ? (
            <View style={styles.rsvpedRow}>
              <CheckCircle size={20} color={Colors.success} />
              <Text style={styles.rsvpedText}>You're going! See you there.</Text>
            </View>
          ) : (
            <>
              {isFull && (
                <Text style={styles.fullText}>This event is full.</Text>
              )}
              <Button
                title={isFull ? 'Event Full' : rsvping ? 'Confirming...' : 'RSVP — I\'m Going!'}
                variant="primary"
                fullWidth
                size="lg"
                onPress={handleRsvp}
                isLoading={rsvping}
              />
            </>
          )}
        </View>

        {/* Reaction + comment row */}
        <View style={styles.interactionRow}>
          <TouchableOpacity style={styles.interactionBtn} onPress={handleReact} disabled={reacting}>
            <PawPrint
              size={24}
              color={reaction.reacted ? Colors.primary : Colors.textSecondary}
              fill={reaction.reacted ? Colors.primary : 'transparent'}
            />
            <Text style={[styles.interactionCount, reaction.reacted && { color: Colors.primary }]}>
              {reaction.count > 0 ? reaction.count : 'React'}
            </Text>
          </TouchableOpacity>
          <View style={styles.interactionDivider} />
          <TouchableOpacity style={styles.interactionBtn} onPress={handleOpenComments}>
            <MessageCircle size={24} color={Colors.textSecondary} strokeWidth={1.8} />
            <Text style={styles.interactionCount}>
              {commentCount > 0 ? `${commentCount} Comments` : 'Comment'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Comments Modal */}
      <Modal visible={showComments} transparent animationType="slide" onRequestClose={() => setShowComments(false)}>
        <View style={styles.commentModalWrap}>
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => setShowComments(false)} />
          <View style={styles.commentSheet}>
            <View style={styles.commentSheetHandle} />
            <Text style={styles.commentSheetTitle}>
              Comments {commentCount > 0 ? `(${commentCount})` : ''}
            </Text>
            <FlatList
              data={comments}
              keyExtractor={(c) => c.id}
              style={styles.commentList}
              renderItem={({ item }) => (
                <View style={styles.commentRow}>
                  {item.user?.avatarUrl ? (
                    <Image source={{ uri: item.user.avatarUrl }} style={styles.commentAvatar} />
                  ) : (
                    <View style={[styles.commentAvatar, { backgroundColor: Colors.primaryBg, justifyContent: 'center', alignItems: 'center' }]}>
                      <Text style={{ fontSize: 13, fontWeight: '700', color: Colors.primary }}>
                        {(item.user?.name ?? '?').charAt(0).toUpperCase()}
                      </Text>
                    </View>
                  )}
                  <View style={styles.commentBubble}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={styles.commentName}>{item.user?.name}</Text>
                      <Text style={styles.commentTime}>{formatRelativeDate(new Date(item.createdAt))}</Text>
                    </View>
                    <Text style={styles.commentText}>{item.content}</Text>
                  </View>
                  {item.userId === user?.id && (
                    <TouchableOpacity onPress={() => handleDeleteComment(item.id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                      <Text style={{ fontSize: 18, color: Colors.neutral400 }}>×</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
              ListEmptyComponent={<Text style={styles.noComments}>No comments yet. Be the first!</Text>}
            />
            <View style={styles.commentInputRow}>
              <TextInput
                style={styles.commentInput}
                placeholder="Add a comment…"
                placeholderTextColor={Colors.textDisabled}
                value={commentText}
                onChangeText={setCommentText}
                multiline
              />
              <TouchableOpacity
                style={[styles.commentSendBtn, (!commentText.trim() || sendingComment) && styles.commentSendBtnDisabled]}
                onPress={handleSendComment}
                disabled={!commentText.trim() || sendingComment}
              >
                {sendingComment
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Send size={16} color="#fff" />
                }
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.neutral100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
    textAlign: 'center',
    marginHorizontal: 8,
  },
  scroll: {
    paddingBottom: 40,
  },
  banner: {
    width: '100%',
  }, // height set dynamically via onLoad
  bannerPlaceholder: {
    width: '100%',
    height: 180,
    backgroundColor: Colors.primaryBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerEmoji: {
    fontSize: 64,
  },
  card: {
    margin: 16,
    backgroundColor: Colors.surface,
    borderRadius: 18,
    padding: 20,
    gap: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: Colors.neutral900,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.textPrimary,
    letterSpacing: -0.3,
  },
  description: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 21,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  infoIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: Colors.neutral50,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  infoText: {
    flex: 1,
    gap: 1,
  },
  infoLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  infoLink: {
    color: Colors.primary,
    textDecorationLine: 'underline',
  },
  rsvpCard: {
    marginHorizontal: 16,
    marginTop: 4,
  },
  rsvpedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Colors.successBg,
    borderRadius: 14,
    padding: 16,
  },
  rsvpedText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.success,
  },
  fullText: {
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 8,
  },

  // Reaction + comment row
  interactionRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.surface,
    marginHorizontal: 16, marginTop: 12,
    borderRadius: 16, paddingVertical: 4,
    elevation: 1, shadowColor: Colors.neutral900,
    shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4,
  },
  interactionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12 },
  interactionCount: { fontSize: 14, fontWeight: '600', color: Colors.textSecondary },
  interactionDivider: { width: StyleSheet.hairlineWidth, height: 24, backgroundColor: Colors.border },

  // Comment sheet
  commentModalWrap: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.45)' },
  commentSheet: { backgroundColor: Colors.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingTop: 12, maxHeight: '70%' },
  commentSheetHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: Colors.neutral300, alignSelf: 'center', marginBottom: 12 },
  commentSheetTitle: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary, paddingHorizontal: 16, marginBottom: 8 },
  commentList: { maxHeight: 320 },
  commentRow: { flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: 16, paddingVertical: 8, gap: 10 },
  commentAvatar: { width: 34, height: 34, borderRadius: 17, flexShrink: 0, overflow: 'hidden' },
  commentBubble: { flex: 1, backgroundColor: Colors.neutral100, borderRadius: 12, padding: 10 },
  commentName: { fontSize: 12, fontWeight: '700', color: Colors.textPrimary },
  commentTime: { fontSize: 11, color: Colors.neutral400 },
  commentText: { fontSize: 13, color: Colors.textPrimary, marginTop: 3 },
  noComments: { textAlign: 'center', color: Colors.textDisabled, fontSize: 13, paddingVertical: 20 },
  commentInputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, paddingHorizontal: 12, paddingVertical: 10, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: Colors.border },
  commentInput: { flex: 1, backgroundColor: Colors.neutral100, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, fontSize: 14, color: Colors.textPrimary, maxHeight: 80 },
  commentSendBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center' },
  commentSendBtnDisabled: { backgroundColor: Colors.neutral300 },
  errorState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    gap: 8,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  errorSub: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
});
