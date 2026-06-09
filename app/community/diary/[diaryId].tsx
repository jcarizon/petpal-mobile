import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Image, TouchableOpacity,
  TextInput, FlatList, Alert, Share, KeyboardAvoidingView,
  Platform, ActivityIndicator, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, PawPrint, MessageCircle, Send, Trash2, Upload } from 'lucide-react-native';
import { Colors } from '../../../constants/colors';
import { useAuthStore } from '../../../store/authStore';
import { DiaryFeedEntry, DiaryReactionState, DiaryComment } from '../../../types';
import { DiaryVideo } from '../../../components/pet/DiaryVideo';
import { formatRelativeDate } from '../../../lib/utils';
import api from '../../../lib/api';
import { useCommunityStore } from '../../../store/communityStore';

const { width: W } = Dimensions.get('window');

const MOOD_EMOJI: Record<string, string> = {
  happy: '😊', excited: '🤩', calm: '😌', tired: '😴',
  anxious: '😰', sick: '🤒', playful: '😜',
};

export default function PublicDiaryScreen() {
  const { diaryId } = useLocalSearchParams<{ diaryId: string }>();
  const router = useRouter();
  const { user } = useAuthStore();

  const [diary, setDiary] = useState<DiaryFeedEntry | null>(null);
  const [imgHeight, setImgHeight] = useState(Math.round(W * 0.75));
  const [reaction, setReaction] = useState<DiaryReactionState>({ count: 0, reacted: false });
  const [comments, setComments] = useState<DiaryComment[]>([]);
  const [commentText, setCommentText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [reacting, setReacting] = useState(false);

  const inputRef = useRef<TextInput>(null);

  const load = useCallback(async () => {
    try {
      const [diaryRes, reactRes, commentsRes] = await Promise.all([
        api.get(`/pets/diary/public/${diaryId}`),
        api.get(`/pets/diary/${diaryId}/reactions`),
        api.get(`/pets/diary/${diaryId}/comments`),
      ]);
      setDiary(diaryRes.data?.data ?? diaryRes.data);
      setReaction(reactRes.data?.data ?? { count: 0, reacted: false });
      setComments(commentsRes.data?.data ?? []);
    } catch {
      Alert.alert('Error', 'Could not load this diary entry.');
      router.back();
    } finally {
      setLoading(false);
    }
  }, [diaryId]);

  useEffect(() => { load(); }, [load]);

  const handleReact = async () => {
    if (reacting) return;
    setReacting(true);
    // Optimistic update
    setReaction((r) => ({ count: r.reacted ? r.count - 1 : r.count + 1, reacted: !r.reacted }));
    try {
      const res = await api.post(`/pets/diary/${diaryId}/react`);
      const data = res.data?.data ?? res.data;
      setReaction(data);
      // Keep the community feed in sync so the card reflects this when navigating back
      useCommunityStore.getState().patchDiaryFeedEntry(diaryId, {
        reactionCount: data.count,
        userReacted: data.reacted,
      });
    } catch {
      // Revert on error
      setReaction((r) => ({ count: r.reacted ? r.count - 1 : r.count + 1, reacted: !r.reacted }));
    } finally {
      setReacting(false);
    }
  };

  const handleSendComment = async () => {
    if (!commentText.trim() || sending) return;
    const text = commentText.trim();
    setCommentText('');
    setSending(true);
    try {
      const res = await api.post(`/pets/diary/${diaryId}/comments`, { content: text });
      const comment = res.data?.data ?? res.data;
      setComments((prev) => [...prev, comment]);
    } catch {
      setCommentText(text);
      Alert.alert('Error', 'Could not send comment.');
    } finally {
      setSending(false);
    }
  };

  const handleDeleteComment = (commentId: string) => {
    Alert.alert('Delete Comment', 'Remove this comment?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/pets/diary/${diaryId}/comments/${commentId}`);
            setComments((prev) => prev.filter((c) => c.id !== commentId));
          } catch {
            Alert.alert('Error', 'Could not delete comment.');
          }
        },
      },
    ]);
  };

  const handleShare = async () => {
    if (!diary) return;
    try {
      await Share.share({
        message: `🐾 ${diary.pet.name}: ${diary.title}\n\n${diary.content}\n\nShared via PawRok`,
      });
    } catch { /* user cancelled */ }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator color={Colors.primary} style={{ marginTop: 60 }} size="large" />
      </SafeAreaView>
    );
  }

  if (!diary) return null;

  const moodEmoji = diary.mood ? (MOOD_EMOJI[diary.mood] ?? '🐾') : null;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
          <ArrowLeft size={20} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Diary</Text>
        <TouchableOpacity onPress={handleShare} style={styles.headerBtn}>
          <Upload size={20} color={Colors.textPrimary} />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
        <FlatList
          data={comments}
          keyExtractor={(c) => c.id}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          ListHeaderComponent={() => (
            <>
              {/* Pet info row */}
              <View style={styles.petRow}>
                {diary.pet.avatarUrl ? (
                  <Image source={{ uri: diary.pet.avatarUrl }} style={styles.petAvatar} />
                ) : (
                  <View style={[styles.petAvatar, styles.petAvatarFallback]}>
                    <Text style={{ fontSize: 20 }}>🐾</Text>
                  </View>
                )}
                <View style={styles.petInfo}>
                  <Text style={styles.petName}>{diary.pet.name}</Text>
                  {(diary.pet.breed || diary.pet.species) && (
                    <Text style={styles.petBreed}>
                      {[diary.pet.breed, diary.pet.species].filter(Boolean).join(' · ')}
                    </Text>
                  )}
                  <Text style={styles.postTime}>{formatRelativeDate(new Date(diary.createdAt))}</Text>
                </View>
              </View>

              {/* Media */}
              {diary.videoUrl
                ? <DiaryVideo uri={diary.videoUrl} />
                : diary.imageUrl
                ? <Image
                    source={{ uri: diary.imageUrl }}
                    style={[styles.coverImage, { height: imgHeight }]}
                    resizeMode="cover"
                    onLoad={(e) => {
                      const { width: iw, height: ih } = e.nativeEvent.source;
                      if (iw && ih) {
                        const natural = (W / iw) * ih;
                        setImgHeight(Math.min(Math.max(natural, W * 0.5), W * 1.8));
                      }
                    }}
                  />
                : null
              }

              {/* Badges */}
              <View style={styles.badgeRow}>
                {moodEmoji && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{moodEmoji} {diary.mood}</Text>
                  </View>
                )}
                {diary.activity && (
                  <View style={[styles.badge, { backgroundColor: Colors.neutral100 }]}>
                    <Text style={styles.badgeText}>{diary.activity.replace('_', ' ')}</Text>
                  </View>
                )}
              </View>

              {/* Title + Content */}
              <View style={styles.body}>
                <Text style={styles.title}>{diary.title}</Text>
                <Text style={styles.content}>{diary.content}</Text>
              </View>

              {/* Reaction row */}
              <View style={styles.reactionRow}>
                <TouchableOpacity style={styles.reactionBtn} onPress={handleReact} disabled={reacting}>
                  <PawPrint
                    size={24}
                    color={reaction.reacted ? Colors.primary : Colors.textSecondary}
                    fill={reaction.reacted ? Colors.primary : 'transparent'}
                  />
                  <Text style={[styles.reactionCount, reaction.reacted && { color: Colors.primary }]}>
                    {reaction.count > 0 ? reaction.count : ''}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.reactionBtn} onPress={() => inputRef.current?.focus()}>
                  <MessageCircle size={24} color={Colors.textSecondary} strokeWidth={1.8} />
                  <Text style={styles.reactionCount}>{comments.length > 0 ? comments.length : ''}</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.divider} />

              {/* Comments heading */}
              {comments.length > 0 && (
                <Text style={styles.commentsLabel}>
                  {comments.length} {comments.length === 1 ? 'Comment' : 'Comments'}
                </Text>
              )}
            </>
          )}
          renderItem={({ item }) => (
            <View style={styles.commentRow}>
              {item.user.avatarUrl ? (
                <Image source={{ uri: item.user.avatarUrl }} style={styles.commentAvatar} />
              ) : (
                <View style={[styles.commentAvatar, styles.commentAvatarFallback]}>
                  <Text style={styles.commentAvatarInitial}>
                    {(item.user.name ?? '?').charAt(0).toUpperCase()}
                  </Text>
                </View>
              )}
              <View style={styles.commentBubble}>
                <View style={styles.commentTop}>
                  <Text style={styles.commentName}>{item.user.name}</Text>
                  <Text style={styles.commentTime}>{formatRelativeDate(new Date(item.createdAt))}</Text>
                </View>
                <Text style={styles.commentText}>{item.content}</Text>
              </View>
              {item.userId === user?.id && (
                <TouchableOpacity onPress={() => handleDeleteComment(item.id)} style={styles.deleteBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Trash2 size={14} color={Colors.neutral400} />
                </TouchableOpacity>
              )}
            </View>
          )}
          ListEmptyComponent={
            <Text style={styles.noComments}>No comments yet. Be the first!</Text>
          }
        />

        {/* Comment input */}
        <View style={styles.inputRow}>
          <TextInput
            ref={inputRef}
            style={styles.input}
            placeholder="Add a comment…"
            placeholderTextColor={Colors.textDisabled}
            value={commentText}
            onChangeText={setCommentText}
            multiline
            returnKeyType="send"
            onSubmitEditing={handleSendComment}
          />
          <TouchableOpacity
            style={[styles.sendBtn, (!commentText.trim() || sending) && styles.sendBtnDisabled]}
            onPress={handleSendComment}
            disabled={!commentText.trim() || sending}
          >
            {sending
              ? <ActivityIndicator size="small" color="#fff" />
              : <Send size={18} color="#fff" />
            }
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: Colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.border,
  },
  headerBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.neutral100, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '700', color: Colors.textPrimary },

  scrollContent: { paddingBottom: 16 },

  petRow: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12, backgroundColor: Colors.surface },
  petAvatar: { width: 46, height: 46, borderRadius: 23 },
  petAvatarFallback: { backgroundColor: Colors.primaryBg, justifyContent: 'center', alignItems: 'center' },
  petInfo: { flex: 1 },
  petName: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
  petBreed: { fontSize: 13, color: Colors.textSecondary, marginTop: 1 },
  postTime: { fontSize: 12, color: Colors.neutral400, marginTop: 2 },

  coverImage: { width: W }, // height set dynamically via onLoad

  badgeRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4, backgroundColor: Colors.surface },
  badge: { backgroundColor: Colors.primaryBg, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4 },
  badgeText: { fontSize: 12, fontWeight: '600', color: Colors.primary, textTransform: 'capitalize' },

  body: { backgroundColor: Colors.surface, paddingHorizontal: 16, paddingBottom: 16 },
  title: { fontSize: 20, fontWeight: '800', color: Colors.textPrimary, marginBottom: 8, marginTop: 4 },
  content: { fontSize: 15, color: Colors.textPrimary, lineHeight: 23 },

  reactionRow: {
    flexDirection: 'row', gap: 20, paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: Colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: Colors.border,
  },
  reactionBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  reactionCount: { fontSize: 14, fontWeight: '600', color: Colors.textSecondary },

  divider: { height: 8, backgroundColor: Colors.background },

  commentsLabel: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4 },

  commentRow: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 10, gap: 10, alignItems: 'flex-start' },
  commentAvatar: { width: 34, height: 34, borderRadius: 17, flexShrink: 0 },
  commentAvatarFallback: { backgroundColor: Colors.primaryBg, justifyContent: 'center', alignItems: 'center' },
  commentAvatarInitial: { fontSize: 14, fontWeight: '700', color: Colors.primary },
  commentBubble: { flex: 1, backgroundColor: Colors.neutral100, borderRadius: 12, padding: 10 },
  commentTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 },
  commentName: { fontSize: 13, fontWeight: '700', color: Colors.textPrimary },
  commentTime: { fontSize: 11, color: Colors.neutral400 },
  commentText: { fontSize: 14, color: Colors.textPrimary, lineHeight: 19 },
  deleteBtn: { paddingTop: 10 },

  noComments: { textAlign: 'center', color: Colors.textDisabled, fontSize: 14, paddingVertical: 24 },

  inputRow: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 10,
    paddingHorizontal: 12, paddingVertical: 10,
    backgroundColor: Colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: Colors.border,
  },
  input: {
    flex: 1, backgroundColor: Colors.neutral100, borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 10, fontSize: 14,
    color: Colors.textPrimary, maxHeight: 100,
  },
  sendBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center' },
  sendBtnDisabled: { backgroundColor: Colors.neutral300 },
});
