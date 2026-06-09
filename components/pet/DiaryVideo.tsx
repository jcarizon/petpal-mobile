import React, { useRef, useState, useCallback, useEffect } from 'react';
import { View, TouchableOpacity, StyleSheet, Dimensions, ActivityIndicator } from 'react-native';
import { Video, AVPlaybackStatus, ResizeMode, VideoReadyForDisplayEvent } from 'expo-av';
import { Play, Volume2, VolumeX, RotateCcw } from 'lucide-react-native';
import { Colors } from '../../constants/colors';

interface Props {
  uri: string;
  /** Fallback height used until natural video dimensions are known. */
  height?: number;
  autoPlay?: boolean;
  /** When false the video is paused (e.g. when scrolled out of viewport). */
  isActive?: boolean;
  onPlaybackEnd?: () => void;
  /** Fill the parent container absolutely (story fullscreen mode). Skips auto-height. */
  cover?: boolean;
}

const W = Dimensions.get('window').width;
const FALLBACK_H = Math.round(W * 0.65);

export function DiaryVideo({
  uri,
  height = FALLBACK_H,
  autoPlay = false,
  isActive = true,
  onPlaybackEnd,
  cover = false,
}: Props) {
  const videoRef = useRef<Video>(null);
  const didFinishRef = useRef(false);

  const [playing, setPlaying] = useState(autoPlay);
  const [muted, setMuted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [displayHeight, setDisplayHeight] = useState(height);
  const [progress, setProgress] = useState(0); // 0–1

  // Pause when scrolled out of view
  useEffect(() => {
    if (!isActive && playing) {
      videoRef.current?.pauseAsync().catch(() => {});
      setPlaying(false);
    }
  }, [isActive]);

  // onReadyForDisplay fires as soon as first frame is ready — even without autoPlay.
  // This is the reliable way to get naturalSize regardless of play state.
  const handleReadyForDisplay = useCallback((event: VideoReadyForDisplayEvent) => {
    if (!cover) {
      const { width: vw, height: vh } = event.naturalSize;
      if (vw && vh) {
        const natural = (W / vw) * vh;
        const clamped = Math.min(Math.max(natural, W * 0.45), W * 1.6);
        setDisplayHeight(clamped);
      }
    }
    setLoading(false);
  }, [cover]);

  const handleStatus = useCallback((status: AVPlaybackStatus) => {
    if (!status.isLoaded) return;
    setLoading(false);

    // Progress bar
    if (status.durationMillis && status.positionMillis != null) {
      setProgress(status.positionMillis / status.durationMillis);
    }

    if (status.didJustFinish) {
      didFinishRef.current = true;
      setPlaying(false);
      setProgress(1);
      onPlaybackEnd?.();
    }
  }, [onPlaybackEnd]);

  const toggle = async () => {
    if (playing) {
      await videoRef.current?.pauseAsync();
      setPlaying(false);
    } else {
      if (didFinishRef.current) {
        didFinishRef.current = false;
        await videoRef.current?.replayAsync();
      } else {
        await videoRef.current?.playAsync();
      }
      setPlaying(true);
    }
  };

  const rewind = async () => {
    const status = await videoRef.current?.getStatusAsync();
    if (!status?.isLoaded) return;
    const target = Math.max(0, (status.positionMillis ?? 0) - 10_000);
    await videoRef.current?.setPositionAsync(target);
    setProgress(target / (status.durationMillis ?? 1));
    // Resume playback if it was playing
    if (playing) await videoRef.current?.playAsync();
  };

  const toggleMute = async () => {
    const next = !muted;
    setMuted(next);
    await videoRef.current?.setIsMutedAsync(next);
  };

  return (
    <View style={cover ? styles.coverContainer : [styles.container, { height: displayHeight }]}>
      <Video
        ref={videoRef}
        source={{ uri }}
        style={cover ? StyleSheet.absoluteFillObject : styles.video}
        resizeMode={ResizeMode.COVER}
        shouldPlay={autoPlay}
        isLooping={false}
        isMuted={muted}
        useNativeControls={false}
        onReadyForDisplay={handleReadyForDisplay}
        onPlaybackStatusUpdate={handleStatus}
      />

      {/* Tap to play/pause */}
      <TouchableOpacity style={styles.overlay} onPress={toggle} activeOpacity={0.85}>
        {loading ? (
          <ActivityIndicator color="#fff" size="large" />
        ) : !playing ? (
          <View style={styles.playBtn}>
            <Play size={28} color="#fff" fill="#fff" />
          </View>
        ) : null}
      </TouchableOpacity>

      {/* Controls row: rewind + mute */}
      {!loading && (
        <View style={styles.controls} pointerEvents="box-none">
          <TouchableOpacity style={styles.controlBtn} onPress={rewind}>
            <RotateCcw size={16} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.controlBtn} onPress={toggleMute}>
            {muted ? <VolumeX size={16} color="#fff" /> : <Volume2 size={16} color="#fff" />}
          </TouchableOpacity>
        </View>
      )}

      {/* Progress bar */}
      {!loading && (
        <View style={styles.progressTrack} pointerEvents="none">
          <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { width: '100%', backgroundColor: '#000', position: 'relative', overflow: 'hidden' },
  coverContainer: { ...StyleSheet.absoluteFillObject, backgroundColor: '#000', overflow: 'hidden' },
  video: { width: '100%', height: '100%' },
  overlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center' },
  playBtn: {
    width: 58, height: 58, borderRadius: 29,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center', alignItems: 'center',
  },
  controls: {
    position: 'absolute', bottom: 12, right: 10,
    flexDirection: 'row', gap: 8,
  },
  controlBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center', alignItems: 'center',
  },
  progressTrack: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    height: 3, backgroundColor: 'rgba(255,255,255,0.25)',
  },
  progressFill: { height: '100%', backgroundColor: Colors.primary },
});
