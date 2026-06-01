import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, Image, StyleSheet, TouchableOpacity,
  Animated, Dimensions, PanResponder, ActivityIndicator,
  StatusBar,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { X, PawPrint } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '../../../lib/api';
import { formatRelativeDate } from '../../../lib/utils';
import { PetDiary } from '../../../types';
import { Colors } from '../../../constants/colors';

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

  const [diaries, setDiaries] = useState<PetDiary[]>([]);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(true);

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
    startAnim(STORY_DURATION);
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
      {entry.imageUrl ? (
        <Image source={{ uri: entry.imageUrl }} style={styles.bg} resizeMode="cover" />
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

        {/* Content card */}
        <View style={styles.content}>
          {entry.activity && (
            <View style={styles.activityBadge}>
              <Text style={styles.activityText}>{entry.activity.replace('_', ' ')}</Text>
            </View>
          )}
          <Text style={styles.storyTitle}>{entry.title}</Text>
          <Text style={styles.storyBody} numberOfLines={6}>{entry.content}</Text>
          <Text style={styles.storyDate}>
            {formatRelativeDate(new Date(entry.createdAt))}
          </Text>
        </View>
      </SafeAreaView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, width: W, height: H, backgroundColor: '#000' },
  loadingScreen: { flex: 1, backgroundColor: '#111', alignItems: 'center', justifyContent: 'center', gap: 16 },
  emptyText: { color: 'rgba(255,255,255,0.7)', fontSize: 16 },
  bg: { ...StyleSheet.absoluteFillObject },
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

  content: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    padding: 24, paddingBottom: 36,
    background: 'transparent',
  },
  activityBadge: {
    alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4, marginBottom: 10,
  },
  activityText: { color: '#fff', fontSize: 12, fontWeight: '700', textTransform: 'capitalize' },
  storyTitle: { fontSize: 24, fontWeight: '900', color: '#fff', marginBottom: 8, lineHeight: 30 },
  storyBody: { fontSize: 15, color: 'rgba(255,255,255,0.9)', lineHeight: 22, marginBottom: 12 },
  storyDate: { fontSize: 12, color: 'rgba(255,255,255,0.6)' },
});
