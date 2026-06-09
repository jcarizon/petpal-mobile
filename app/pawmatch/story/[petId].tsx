import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, Image, StyleSheet, TouchableOpacity,
  Animated, Dimensions, PanResponder, ActivityIndicator,
  StatusBar, Modal, FlatList, TextInput, Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { X, PawPrint, MessageCircle, Send } from 'lucide-react-native';
import { useAuthStore } from '../../../store/authStore';
import { DiaryReactionState, DiaryComment } from '../../../types';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '../../../lib/api';
import { formatRelativeDate } from '../../../lib/utils';
import { PetDiary } from '../../../types';
import { Colors } from '../../../constants/colors';
import { DiaryVideo } from '../../../components/pet/DiaryVideo';

const { width: W, height: H } = Dimensions.get('window');
const STORY_DURATION = 5000;

const MOOD_EMOJI: Record<string, string> = {
  happy: '😊', excited: '🤩', calm: '😌', tired: '😴',
  anxious: '😰', sick: '🤒', playful: '😜',
};
const MOOD_BG: Record<string, string> = {
  happy: '#10B981', excited: '#F59E0B', calm: '#3B82F6',
  tired: '#8B5CF6', anxious: '#EF4444', sick: '#DC2626', playful: '#EC4899',
};

export default function StoryScreen() {
  const { petId, context } = useLocalSearchParams<{ petId: string; context?: string }>();
  const router = useRouter();

  const { user } = useAuthStore();
  const [diaries, setDiaries] = useState<PetDiary[]>([]);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  // Reactions + comments per entry
  const [reaction, setReaction] = useState<DiaryReactionState>({ count: 0, reacted: false });
  const [comments, setComments] = useState<DiaryComment[]>([]);
  const [commentCount, setCommentCount] = useState(0);
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [sendingComment, setSendingComment] = useState(false);

  const progress = useRef(new Animated.Value(0)).current;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const animRef = useRef<Animated.CompositeAnimation | null>(null);
  const translateY = useRef(new Animated.Value(0)).current;
  const [paused, setPaused] = useState(false);
  const storyStartRef = useRef(Date.now());
  const totalPausedRef = useRef(0);
  const pauseStartRef = useRef<number | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const url = context === 'community'
          ? `/pets/diary/feed?petId=${petId}`
          : context === 'circles'
          ? `/pets/diary/matched/${petId}?storyOnly=true`
          : `/pets/diary/matched/${petId}`;
        const res = await api.get(url);
        const data = (res.data?.data ?? res.data) as PetDiary[];
        setDiaries(Array.isArray(data) ? data : []);
      } catch {
        setDiaries([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [petId, context]);

  const startAnim = (duration: number) => {
    animRef.current?.stop();
    animRef.current = Animated.timing(progress, {
      toValue: 1,
      duration,
      useNativeDriver: false,
    });
    animRef.current.start(({ finished }) => {
      if (finished) goNext();
    });
  };

  // Start / restart progress bar for current story
  useEffect(() => {
    if (diaries.length === 0) return;
    progress.setValue(0);
    storyStartRef.current = Date.now();
    totalPausedRef.current = 0;
    pauseStartRef.current = null;
    setPaused(false);
    // For video entries the timer doesn't auto-run — video's onPlaybackEnd calls goNext
    const entry = diaries[index];
    if (!entry?.videoUrl) startAnim(STORY_DURATION);
    return () => { animRef.current?.stop(); };
  }, [index, diaries.length]);

  const handlePause = () => {
    if (paused) return;
    animRef.current?.stop();
    pauseStartRef.current = Date.now();
    setPaused(true);
  };

  const handleResume = () => {
    if (!paused) return;
    if (pauseStartRef.current) {
      totalPausedRef.current += Date.now() - pauseStartRef.current;
      pauseStartRef.current = null;
    }
    const elapsed = Date.now() - storyStartRef.current - totalPausedRef.current;
    const remaining = Math.max(STORY_DURATION - elapsed, 0);
    if (remaining <= 0) { goNext(); return; }
    setPaused(false);
    startAnim(remaining);
  };

  // Fetch reaction + comment count when the current entry changes
  useEffect(() => {
    const entry = diaries[index];
    if (!entry?.id) return;
    setReaction({ count: 0, reacted: false });
    setCommentCount(0);
    Promise.all([
      api.get(`/pets/diary/${entry.id}/reactions`),
      api.get(`/pets/diary/${entry.id}/comments?limit=1`),
    ]).then(([rRes, cRes]) => {
      setReaction(rRes.data?.data ?? { count: 0, reacted: false });
      setCommentCount(cRes.data?.meta?.total ?? 0);
    }).catch(() => {});
  }, [index, diaries.length]);

  const handleReact = async () => {
    const entry = diaries[index];
    if (!entry?.id) return;
    setReaction((r) => ({ count: r.reacted ? r.count - 1 : r.count + 1, reacted: !r.reacted }));
    try {
      const res = await api.post(`/pets/diary/${entry.id}/react`);
      setReaction(res.data?.data ?? { count: 0, reacted: false });
    } catch {
      setReaction((r) => ({ count: r.reacted ? r.count - 1 : r.count + 1, reacted: !r.reacted }));
    }
  };

  const handleOpenComments = () => {
    const entry = diaries[index];
    if (!entry?.id) return;
    handlePause();
    api.get(`/pets/diary/${entry.id}/comments`)
      .then((res) => setComments(res.data?.data ?? []))
      .catch(() => {});
    setShowComments(true);
  };

  const handleCloseComments = () => {
    setShowComments(false);
    setCommentText('');
    handleResume();
  };

  const handleSendComment = async () => {
    const entry = diaries[index];
    if (!commentText.trim() || sendingComment || !entry?.id) return;
    const text = commentText.trim();
    setCommentText('');
    setSendingComment(true);
    try {
      const res = await api.post(`/pets/diary/${entry.id}/comments`, { content: text });
      const newComment = res.data?.data ?? res.data;
      setComments((prev) => [...prev, newComment]);
      setCommentCount((n) => n + 1);
    } catch {
      setCommentText(text);
      Alert.alert('Error', 'Could not send comment.');
    } finally {
      setSendingComment(false);
    }
  };

  const handleDeleteComment = (commentId: string) => {
    const entry = diaries[index];
    if (!entry?.id) return;
    Alert.alert('Delete Comment', 'Remove this comment?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/pets/diary/${entry.id}/comments/${commentId}`);
            setComments((prev) => prev.filter((c) => c.id !== commentId));
            setCommentCount((n) => Math.max(0, n - 1));
          } catch { /* silent */ }
        },
      },
    ]);
  };

  const goNext = () => {
    if (index < diaries.length - 1) {
      setIndex((i) => i + 1);
    } else {
      router.back();
    }
  };

  const goPrev = () => {
    if (index > 0) setIndex((i) => i - 1);
  };

  // Swipe-down to dismiss
  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => false,
    onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 10 && Math.abs(g.dy) > Math.abs(g.dx),
    onPanResponderMove: (_, g) => {
      if (g.dy > 0) translateY.setValue(g.dy);
    },
    onPanResponderRelease: (_, g) => {
      if (g.dy > 80) {
        Animated.timing(translateY, { toValue: H, duration: 200, useNativeDriver: true }).start(() => router.back());
      } else {
        Animated.spring(translateY, { toValue: 0, useNativeDriver: true }).start();
      }
    },
  });

  if (loading) {
    return (
      <View style={styles.loadingScreen}>
        <StatusBar barStyle="light-content" />
        <ActivityIndicator color="#fff" size="large" />
      </View>
    );
  }

  if (diaries.length === 0) {
    return (
      <View style={styles.loadingScreen}>
        <StatusBar barStyle="light-content" />
        <PawPrint size={48} color="rgba(255,255,255,0.5)" />
        <Text style={styles.emptyText}>No diary entries to show yet</Text>
        <TouchableOpacity style={styles.closeBtn} onPress={() => router.back()}>
          <X size={24} color="#fff" />
        </TouchableOpacity>
      </View>
    );
  }

  const entry = diaries[index];
  const mood = entry.mood ?? 'calm';
  const bgColor = MOOD_BG[mood] ?? '#334155';
  const emoji = MOOD_EMOJI[mood] ?? '🐾';

  return (
    <Animated.View
      style={[styles.screen, { transform: [{ translateY }] }]}
      {...panResponder.panHandlers}
    >
      <StatusBar barStyle="light-content" />

      {/* Background */}
      {entry.videoUrl ? (
        entry.storyOrientation === 'landscape' ? (
          <View style={[styles.bg, { justifyContent: 'center' }]}>
            <DiaryVideo uri={entry.videoUrl} autoPlay onPlaybackEnd={goNext} />
          </View>
        ) : (
          <DiaryVideo uri={entry.videoUrl} cover autoPlay onPlaybackEnd={goNext} />
        )
      ) : entry.imageUrl ? (
        <Image
          source={{ uri: entry.imageUrl }}
          style={styles.bg}
          resizeMode={entry.storyOrientation === 'landscape' ? 'contain' : 'cover'}
        />
      ) : (
        <View style={[styles.bg, { backgroundColor: bgColor }]} />
      )}

      {/* Dark overlay for readability */}
      <View style={styles.overlay} />

      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        {/* Progress bars */}
        <View style={styles.progressRow}>
          {diaries.map((_, i) => (
            <View key={i} style={styles.progressTrack}>
              <Animated.View
                style={[
                  styles.progressFill,
                  {
                    width: i < index
                      ? '100%'
                      : i === index
                      ? progress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] })
                      : '0%',
                  },
                ]}
              />
            </View>
          ))}
        </View>

        {/* Close */}
        <View style={styles.topRow}>
          <Text style={styles.moodEmoji}>{emoji}</Text>
          <TouchableOpacity style={styles.closeBtn} onPress={() => router.back()}>
            <X size={22} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Tap zones — long-press pauses, release resumes */}
        <View style={styles.tapZones} pointerEvents="box-none">
          <TouchableOpacity
            style={styles.tapLeft}
            activeOpacity={1}
            onPress={goPrev}
            onLongPress={handlePause}
            onPressOut={handleResume}
            delayLongPress={180}
          />
          <TouchableOpacity
            style={styles.tapRight}
            activeOpacity={1}
            onPress={goNext}
            onLongPress={handlePause}
            onPressOut={handleResume}
            delayLongPress={180}
          />
        </View>

        {/* Pause indicator */}
        {paused && (
          <View style={styles.pauseIndicator} pointerEvents="none">
            <View style={styles.pauseIcon}>
              <View style={styles.pauseBar} />
              <View style={styles.pauseBar} />
            </View>
          </View>
        )}

        {/* Action buttons — rendered after tapZones so they capture touches first */}
        <View style={styles.actionBar} pointerEvents="box-none">
          <TouchableOpacity style={styles.actionBtn} onPress={handleReact}>
            <PawPrint
              size={28}
              color={reaction.reacted ? Colors.primaryLight : '#fff'}
              fill={reaction.reacted ? Colors.primaryLight : 'transparent'}
            />
            {reaction.count > 0 && <Text style={styles.actionCount}>{reaction.count}</Text>}
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={handleOpenComments}>
            <MessageCircle size={26} color="#fff" strokeWidth={1.8} />
            {commentCount > 0 && <Text style={styles.actionCount}>{commentCount}</Text>}
          </TouchableOpacity>
        </View>

        {/* Content card */}
        <View style={styles.content}>
          {entry.activity && (
            <View style={styles.activityBadge}>
              <Text style={styles.activityText}>{entry.activity.replace('_', ' ')}</Text>
            </View>
          )}
          <Text style={styles.storyTitle}>{entry.title}</Text>
          <Text style={styles.storyBody} numberOfLines={4}>{entry.content}</Text>
          <Text style={styles.storyDate}>
            {formatRelativeDate(new Date(entry.createdAt))}
          </Text>
        </View>
      </SafeAreaView>

      {/* Comments sheet */}
      <Modal visible={showComments} transparent animationType="slide" onRequestClose={handleCloseComments}>
        <View style={styles.commentModalWrap}>
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={handleCloseComments} />
          <View style={styles.commentSheet}>
            <View style={styles.commentSheetHandle} />
            <Text style={styles.commentSheetTitle}>Comments</Text>
            <FlatList
              data={comments}
              keyExtractor={(c) => c.id}
              style={styles.commentList}
              renderItem={({ item }) => (
                <View style={styles.commentRow}>
                  <View style={styles.commentAvatarBox}>
                    {item.user?.avatarUrl
                      ? <Image source={{ uri: item.user.avatarUrl }} style={styles.commentAvatar} />
                      : <View style={[styles.commentAvatar, { backgroundColor: Colors.primaryBg, justifyContent: 'center', alignItems: 'center' }]}>
                          <Text style={{ fontSize: 13, fontWeight: '700', color: Colors.primary }}>
                            {(item.user?.name ?? '?').charAt(0).toUpperCase()}
                          </Text>
                        </View>
                    }
                  </View>
                  <View style={styles.commentBubble}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={styles.commentName}>{item.user?.name}</Text>
                      <Text style={styles.commentTime}>{formatRelativeDate(new Date(item.createdAt))}</Text>
                    </View>
                    <Text style={styles.commentText}>{item.content}</Text>
                  </View>
                  {item.userId === user?.id && (
                    <TouchableOpacity onPress={() => handleDeleteComment(item.id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                      <Text style={{ fontSize: 16, color: Colors.neutral400 }}>×</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
              ListEmptyComponent={<Text style={styles.noComments}>No comments yet</Text>}
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
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, width: W, height: H, backgroundColor: '#000' },
  loadingScreen: { flex: 1, backgroundColor: '#111', alignItems: 'center', justifyContent: 'center', gap: 16 },
  emptyText: { color: 'rgba(255,255,255,0.7)', fontSize: 16 },
  bg: { position: 'absolute', top: 0, left: 0, width: W, height: H },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.38)' },
  safeArea: { flex: 1 },

  progressRow: { flexDirection: 'row', paddingHorizontal: 8, paddingTop: 4, gap: 4 },
  progressTrack: { flex: 1, height: 3, backgroundColor: 'rgba(255,255,255,0.35)', borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#fff', borderRadius: 2 },

  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4 },
  moodEmoji: { fontSize: 28 },
  closeBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(0,0,0,0.3)', alignItems: 'center', justifyContent: 'center' },

  tapZones: { ...StyleSheet.absoluteFillObject, flexDirection: 'row', marginTop: 80 },
  tapLeft: { flex: 1 },
  tapRight: { flex: 2 },
  pauseIndicator: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center' },
  pauseIcon: { flexDirection: 'row', gap: 6 },
  pauseBar: { width: 5, height: 28, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.85)' },

  // Action bar — bottom-right, rendered after tapZones so touches are captured
  actionBar: {
    position: 'absolute', right: 16, bottom: 120,
    alignItems: 'center', gap: 18,
  },
  actionBtn: { alignItems: 'center', gap: 4 },
  actionCount: { fontSize: 12, fontWeight: '700', color: '#fff', textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 },

  content: {
    position: 'absolute', bottom: 0, left: 0, right: 60,
    padding: 24, paddingBottom: 36,
  },
  activityBadge: {
    alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4, marginBottom: 10,
  },
  activityText: { color: '#fff', fontSize: 12, fontWeight: '700', textTransform: 'capitalize' },
  storyTitle: { fontSize: 22, fontWeight: '900', color: '#fff', marginBottom: 8, lineHeight: 28 },
  storyBody: { fontSize: 14, color: 'rgba(255,255,255,0.9)', lineHeight: 20, marginBottom: 10 },
  storyDate: { fontSize: 12, color: 'rgba(255,255,255,0.6)' },

  // Comment modal
  commentModalWrap: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  commentSheet: { backgroundColor: Colors.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingTop: 12, maxHeight: H * 0.65 },
  commentSheetHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: Colors.neutral300, alignSelf: 'center', marginBottom: 12 },
  commentSheetTitle: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary, paddingHorizontal: 16, marginBottom: 8 },
  commentList: { maxHeight: H * 0.4 },
  commentRow: { flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: 16, paddingVertical: 8, gap: 10 },
  commentAvatarBox: { flexShrink: 0 },
  commentAvatar: { width: 34, height: 34, borderRadius: 17 },
  commentBubble: { flex: 1, backgroundColor: Colors.neutral100, borderRadius: 12, padding: 10 },
  commentName: { fontSize: 12, fontWeight: '700', color: Colors.textPrimary },
  commentTime: { fontSize: 11, color: Colors.neutral400 },
  commentText: { fontSize: 13, color: Colors.textPrimary, marginTop: 3 },
  noComments: { textAlign: 'center', color: Colors.textDisabled, fontSize: 13, paddingVertical: 20 },
  commentInputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, paddingHorizontal: 12, paddingVertical: 10, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: Colors.border },
  commentInput: { flex: 1, backgroundColor: Colors.neutral100, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, fontSize: 14, color: Colors.textPrimary, maxHeight: 80 },
  commentSendBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center' },
  commentSendBtnDisabled: { backgroundColor: Colors.neutral300 },
});
