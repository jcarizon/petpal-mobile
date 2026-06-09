import React from 'react';
import {
  Modal, View, Text, TouchableOpacity, StyleSheet, Dimensions, StatusBar,
} from 'react-native';
import { X } from 'lucide-react-native';
import { Video, ResizeMode } from 'expo-av';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DiaryVideo } from '../pet/DiaryVideo';
import { Colors } from '../../constants/colors';

const { width: W } = Dimensions.get('window');
const FRAME_W = W - 80;
const FRAME_H = Math.round(FRAME_W * 16 / 9);

interface Props {
  visible: boolean;
  uri: string;
  orientation: 'portrait' | 'landscape';
  onOrientationChange: (o: 'portrait' | 'landscape') => void;
  onConfirm: () => void;
  onCancel: () => void;
}

export function StoryVideoPreviewModal({
  visible, uri, orientation, onOrientationChange, onConfirm, onCancel,
}: Props) {
  if (!uri) return null;

  const hint = orientation === 'portrait'
    ? 'Landscape video is cropped to fill the portrait frame.'
    : 'Video shown in original landscape ratio with black bars.';

  return (
    <Modal visible={visible} animationType="slide" statusBarTranslucent>
      <View style={styles.screen}>
        <StatusBar barStyle="light-content" />
        <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity style={styles.closeBtn} onPress={onCancel}>
              <X size={22} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Story Preview</Text>
            <View style={styles.headerSpacer} />
          </View>

          {/* Orientation toggle */}
          <View style={styles.toggleRow}>
            <TouchableOpacity
              style={[styles.toggleBtn, orientation === 'portrait' && styles.toggleBtnActive]}
              onPress={() => onOrientationChange('portrait')}
            >
              <Text style={[styles.toggleText, orientation === 'portrait' && styles.toggleTextActive]}>
                Portrait (9:16)
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toggleBtn, orientation === 'landscape' && styles.toggleBtnActive]}
              onPress={() => onOrientationChange('landscape')}
            >
              <Text style={[styles.toggleText, orientation === 'landscape' && styles.toggleTextActive]}>
                Landscape (16:9)
              </Text>
            </TouchableOpacity>
          </View>

          {/* Preview frame — always 9:16, video fills or letterboxes based on orientation */}
          <View style={styles.frameArea}>
            <View style={styles.frame}>
              {orientation === 'portrait' ? (
                <DiaryVideo uri={uri} cover autoPlay isActive={visible} />
              ) : (
                // Contain mode: shows landscape video letterboxed in the portrait frame
                <Video
                  source={{ uri }}
                  style={StyleSheet.absoluteFillObject}
                  resizeMode={ResizeMode.CONTAIN}
                  shouldPlay={visible}
                  isLooping={false}
                  isMuted={false}
                  useNativeControls={false}
                />
              )}
            </View>
            <Text style={styles.hint}>{hint}</Text>
          </View>

          {/* Actions */}
          <View style={styles.actions}>
            <TouchableOpacity style={styles.confirmBtn} onPress={onConfirm}>
              <Text style={styles.confirmText}>Use This</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.rePickBtn} onPress={onCancel}>
              <Text style={styles.rePickText}>Choose Different Video</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#111' },
  safeArea: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
  },
  closeBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontSize: 15, fontWeight: '700', color: '#fff' },
  headerSpacer: { width: 36 },
  toggleRow: {
    flexDirection: 'row', gap: 8,
    paddingHorizontal: 40, marginBottom: 16,
  },
  toggleBtn: {
    flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: 'center',
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.2)',
  },
  toggleBtnActive: {
    backgroundColor: Colors.primary, borderColor: Colors.primary,
  },
  toggleText: { fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.6)' },
  toggleTextActive: { color: '#fff' },
  frameArea: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14 },
  frame: {
    width: FRAME_W, height: FRAME_H,
    borderRadius: 14, overflow: 'hidden',
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.15)',
  },
  hint: {
    fontSize: 12, color: 'rgba(255,255,255,0.5)',
    textAlign: 'center', lineHeight: 18, paddingHorizontal: 32,
  },
  actions: { padding: 20, gap: 10 },
  confirmBtn: {
    backgroundColor: Colors.primary, borderRadius: 14,
    paddingVertical: 14, alignItems: 'center',
  },
  confirmText: { fontSize: 15, fontWeight: '700', color: '#fff' },
  rePickBtn: {
    borderRadius: 14, paddingVertical: 14, alignItems: 'center',
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.2)',
  },
  rePickText: { fontSize: 14, fontWeight: '600', color: 'rgba(255,255,255,0.75)' },
});
