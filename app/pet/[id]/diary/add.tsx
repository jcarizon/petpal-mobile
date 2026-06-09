import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Switch,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Image,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { Sparkles, Check, ImageIcon, Video, X } from 'lucide-react-native';
import { Colors } from '../../../../constants/colors';
import { Button } from '../../../../components/ui/Button';
import { ImageUploader, ScreenHeader, useToast } from '../../../../components/ui';
import { usePetStore } from '../../../../store/petStore';
import { uploadImage } from '../../../../lib/uploadImage';
import { DiaryMood, DiaryActivity, DiaryVisibility, CreateDiaryRequest } from '../../../../types';
import { DiaryVideo } from '../../../../components/pet/DiaryVideo';
import { StoryVideoPreviewModal } from '../../../../components/diary/StoryVideoPreviewModal';

const W = Dimensions.get('window').width;

const VISIBILITY_OPTIONS: { value: DiaryVisibility; label: string; desc: string }[] = [
  { value: 'PRIVATE',      label: 'Private',      desc: 'Only me' },
  { value: 'PUBLIC',       label: 'Public', desc: 'Posted to community feed' },
  { value: 'MATCHES_ONLY', label: 'Story',  desc: 'Shared to story circles'   },
];

const moodOptions: { value: DiaryMood; label: string; emoji: string; color: string }[] = [
  { value: 'happy', label: 'Happy', emoji: '😊', color: '#10B981' },
  { value: 'excited', label: 'Excited', emoji: '🤩', color: '#F59E0B' },
  { value: 'calm', label: 'Calm', emoji: '😌', color: '#3B82F6' },
  { value: 'tired', label: 'Tired', emoji: '😴', color: '#8B5CF6' },
  { value: 'anxious', label: 'Anxious', emoji: '😰', color: '#EF4444' },
  { value: 'sick', label: 'Sick', emoji: '🤒', color: '#DC2626' },
  { value: 'playful', label: 'Playful', emoji: '😜', color: '#EC4899' },
];

const activityOptions: { value: DiaryActivity; label: string; icon: string }[] = [
  { value: 'walk', label: 'Walk', icon: '🚶' },
  { value: 'play', label: 'Play Time', icon: '🎾' },
  { value: 'training', label: 'Training', icon: '🎓' },
  { value: 'grooming', label: 'Grooming', icon: '✨' },
  { value: 'vet_visit', label: 'Vet Visit', icon: '🏥' },
  { value: 'feeding', label: 'Feeding', icon: '🍖' },
  { value: 'sleeping', label: 'Sleeping', icon: '💤' },
  { value: 'swimming', label: 'Swimming', icon: '🏊' },
  { value: 'other', label: 'Other', icon: '📝' },
];

const QUICK_MOOD_SUGGESTIONS: Record<DiaryMood, { title: string; content: string }> = {
  happy: { title: 'A happy day!', content: 'Today was a great day. My pet was so happy and playful. ' },
  excited: { title: 'Excited adventure!', content: 'My pet was super excited today! So much energy and joy. ' },
  calm: { title: 'Peaceful day', content: 'A quiet and peaceful day. My pet enjoyed relaxing at home. ' },
  tired: { title: 'Rest day', content: 'My pet had a tiring day and got lots of rest. ' },
  anxious: { title: 'Anxious moments', content: 'My pet seemed a bit anxious today. Need to monitor this. ' },
  sick: { title: 'Not feeling well', content: 'My pet isn\'t feeling well today. Monitoring closely. ' },
  playful: { title: 'Playtime fun!', content: 'Had lots of fun playtime today! My pet loved it. ' },
};

export default function AddDiaryScreen() {
  const { id, visibility: paramVisibility } = useLocalSearchParams<{ id: string; visibility?: string }>();
  const router = useRouter();
  const { createDiary, isLoading } = usePetStore();
  const { showToast } = useToast();

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [mood, setMood] = useState<DiaryMood | undefined>(undefined);
  const [activity, setActivity] = useState<DiaryActivity | undefined>(undefined);
  const [imageUrl, setImageUrl] = useState<string | undefined>();
  const [videoUrl, setVideoUrl] = useState<string | undefined>();
  const [videoName, setVideoName] = useState<string | undefined>();
  const [isUploading, setIsUploading] = useState(false);
  const [pendingVideoUri, setPendingVideoUri] = useState<string | undefined>();
  const [mediaType, setMediaType] = useState<'photo' | 'video'>('photo');
  const [showQuickFill, setShowQuickFill] = useState(false);
  const [visibility, setVisibility] = useState<DiaryVisibility>(
    paramVisibility === 'PUBLIC' || paramVisibility === 'MATCHES_ONLY'
      ? (paramVisibility as DiaryVisibility)
      : 'PRIVATE'
  );
  const [shareAsStory, setShareAsStory] = useState(false);
  const [storyOrientation, setStoryOrientation] = useState<'portrait' | 'landscape'>('portrait');

  const handleChangeOrientation = (next: 'portrait' | 'landscape') => {
    if (next === storyOrientation) return;
    if (imageUrl || videoUrl) {
      Alert.alert(
        'Change Orientation',
        'Your media was cropped for the previous orientation and will be removed. Continue?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Continue',
            onPress: () => {
              setStoryOrientation(next);
              setImageUrl(undefined);
              setVideoUrl(undefined);
              setVideoName(undefined);
              setPendingVideoUri(undefined);
            },
          },
        ]
      );
    } else {
      setStoryOrientation(next);
    }
  };

  const handlePickVideo = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Allow access to your media library to upload a video.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      allowsEditing: false,
      videoMaxDuration: 120,
      quality: 0.8,
    });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    if (shareAsStory || visibility === 'MATCHES_ONLY') {
      setPendingVideoUri(asset.uri);
      return;
    }
    setIsUploading(true);
    try {
      const url = await uploadImage(asset.uri, { folder: 'diaries' });
      setVideoUrl(url);
      setVideoName(asset.fileName ?? 'video.mp4');
    } catch {
      showToast({ type: 'warning', title: 'Video upload failed', message: 'Entry will be saved without a video.' });
    } finally {
      setIsUploading(false);
    }
  };

  const handlePickStoryPhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Allow access to your media library.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: storyOrientation === 'landscape' ? [16, 9] : [9, 16],
      quality: 0.85,
    });
    if (result.canceled || !result.assets[0]) return;
    setIsUploading(true);
    try {
      const url = await uploadImage(result.assets[0].uri, { folder: 'diaries' });
      setImageUrl(url);
    } catch {
      showToast({ type: 'warning', title: 'Photo upload failed', message: 'Entry will be saved without a photo.' });
    } finally {
      setIsUploading(false);
    }
  };

  const handleConfirmVideoPreview = async () => {
    if (!pendingVideoUri) return;
    const uri = pendingVideoUri;
    setPendingVideoUri(undefined);
    setIsUploading(true);
    try {
      const url = await uploadImage(uri, { folder: 'diaries' });
      setVideoUrl(url);
      setVideoName('video.mp4');
    } catch {
      showToast({ type: 'warning', title: 'Video upload failed', message: 'Entry will be saved without a video.' });
    } finally {
      setIsUploading(false);
    }
  };

  const handleQuickFill = () => {
    if (mood) {
      const suggestion = QUICK_MOOD_SUGGESTIONS[mood];
      if (!title.trim()) {
        setTitle(suggestion.title);
      }
      if (!content.trim()) {
        setContent(suggestion.content);
      }
    }
    setShowQuickFill(false);
  };

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert('Error', 'Please enter a title');
      return;
    }
    if (!content.trim()) {
      Alert.alert('Error', 'Please enter some content');
      return;
    }
    if (isUploading) {
      showToast({
        type: 'warning',
        title: 'Photo still uploading',
        message: 'Please wait a moment before saving.',
      });
      return;
    }

    try {
      const isStory = shareAsStory || visibility === 'MATCHES_ONLY';
      const diaryData: CreateDiaryRequest = {
        title: title.trim(),
        content: content.trim(),
        mood,
        activity,
        imageUrl: mediaType === 'photo' ? imageUrl : undefined,
        videoUrl: mediaType === 'video' ? videoUrl : undefined,
        visibility,
        shareAsStory,
        storyOrientation: isStory ? storyOrientation : undefined,
      };
      await createDiary(id!, diaryData);
      router.back();
    } catch {
      Alert.alert('Error', 'Failed to create diary entry');
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScreenHeader title="New Diary Entry" subtitle="Document your pet's day" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView showsVerticalScrollIndicator={false} style={styles.scrollView}>
          {/* Title */}
          <View style={styles.inputGroup}>
            <View style={styles.labelRow}>
              <Text style={styles.label}>Title *</Text>
              <TouchableOpacity 
                style={styles.quickFillButton} 
                onPress={() => setShowQuickFill(true)}
                disabled={!mood}
              >
                <Sparkles size={14} color={mood ? Colors.secondary : Colors.neutral400} />
                <Text style={[styles.quickFillText, !mood && styles.quickFillTextDisabled]}>Quick Fill</Text>
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.input}
              placeholder="e.g., A great day at the park!"
              placeholderTextColor={Colors.textSecondary}
              value={title}
              onChangeText={setTitle}
              maxLength={100}
            />
          </View>

          {/* Mood - Enhanced Card UI */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>How is your pet feeling?</Text>
            <View style={styles.moodCardsContainer}>
              {moodOptions.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.moodCard,
                    mood === option.value && { backgroundColor: option.color + '20', borderColor: option.color },
                  ]}
                  onPress={() => setMood(mood === option.value ? undefined : option.value)}
                >
                  <Text style={styles.moodEmoji}>{option.emoji}</Text>
                  <Text style={[
                    styles.moodLabel,
                    mood === option.value && { color: option.color },
                  ]}>
                    {option.label}
                  </Text>
                  {mood === option.value && (
                    <View style={[styles.moodCheck, { backgroundColor: option.color }]}>
                      <Check size={12} color={Colors.surface} strokeWidth={3} />
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Activity - Enhanced Chip UI */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>What did you do today?</Text>
            <View style={styles.activityChipsContainer}>
              {activityOptions.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.activityChip,
                    activity === option.value && styles.activityChipSelected,
                  ]}
                  onPress={() =>
                    setActivity(activity === option.value ? undefined : option.value)
                  }
                >
                  <Text style={styles.activityIcon}>{option.icon}</Text>
                  <Text style={[
                    styles.activityLabel,
                    activity === option.value && styles.activityLabelSelected,
                  ]}>
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Content */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Tell us more *</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Write about your pet's day, special moments, behaviors, or anything you'd like to remember..."
              placeholderTextColor={Colors.textSecondary}
              value={content}
              onChangeText={setContent}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
            />
          </View>

          {/* Media — Photo or Video */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Add Media (Optional)</Text>

            {/* Type toggle */}
            <View style={styles.mediaToggleRow}>
              <TouchableOpacity
                style={[styles.mediaToggleBtn, mediaType === 'photo' && styles.mediaToggleBtnActive]}
                onPress={() => { setMediaType('photo'); setVideoUrl(undefined); setVideoName(undefined); }}
              >
                <ImageIcon size={16} color={mediaType === 'photo' ? Colors.primary : Colors.textSecondary} />
                <Text style={[styles.mediaToggleText, mediaType === 'photo' && styles.mediaToggleTextActive]}>Photo</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.mediaToggleBtn, mediaType === 'video' && styles.mediaToggleBtnActive]}
                onPress={() => { setMediaType('video'); setImageUrl(undefined); }}
              >
                <Video size={16} color={mediaType === 'video' ? Colors.primary : Colors.textSecondary} />
                <Text style={[styles.mediaToggleText, mediaType === 'video' && styles.mediaToggleTextActive]}>Video</Text>
              </TouchableOpacity>
            </View>

            {/* Orientation toggle — only for story posts */}
            {(shareAsStory || visibility === 'MATCHES_ONLY') && (
              <View style={styles.orientationRow}>
                <TouchableOpacity
                  style={[styles.orientationBtn, storyOrientation === 'portrait' && styles.orientationBtnActive]}
                  onPress={() => handleChangeOrientation('portrait')}
                >
                  <Text style={[styles.orientationText, storyOrientation === 'portrait' && styles.orientationTextActive]}>
                    Portrait (9:16)
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.orientationBtn, storyOrientation === 'landscape' && styles.orientationBtnActive]}
                  onPress={() => handleChangeOrientation('landscape')}
                >
                  <Text style={[styles.orientationText, storyOrientation === 'landscape' && styles.orientationTextActive]}>
                    Landscape (16:9)
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {mediaType === 'photo' ? (
              (shareAsStory || visibility === 'MATCHES_ONLY') ? (
                imageUrl ? (
                  <View style={styles.storyPhotoCard}>
                    {isUploading ? (
                      <View style={styles.storyPhotoThumb}>
                        <ActivityIndicator color={Colors.primary} />
                      </View>
                    ) : (
                      <Image source={{ uri: imageUrl }} style={styles.storyPhotoThumb} resizeMode="cover" />
                    )}
                    <View style={styles.storyPhotoCardBody}>
                      <Text style={styles.label}>Story Photo</Text>
                      <Text style={styles.storyPhotoCardSub}>Portrait crop (9:16) applied</Text>
                      <View style={styles.storyPhotoCardActions}>
                        <TouchableOpacity
                          style={styles.storyPhotoCardBtn}
                          onPress={handlePickStoryPhoto}
                          disabled={isUploading}
                        >
                          <Text style={styles.storyPhotoCardBtnText}>Replace</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.storyPhotoCardBtn, styles.storyPhotoCardBtnRemove]}
                          onPress={() => setImageUrl(undefined)}
                          disabled={isUploading}
                        >
                          <Text style={[styles.storyPhotoCardBtnText, styles.storyPhotoCardBtnRemoveText]}>Remove</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                ) : isUploading ? (
                  <View style={styles.videoUploading}>
                    <ActivityIndicator color={Colors.primary} size="large" />
                    <Text style={styles.videoUploadingText}>Uploading photo…</Text>
                  </View>
                ) : (
                  <TouchableOpacity style={styles.videoPicker} onPress={handlePickStoryPhoto}>
                    <View style={styles.videoPickerEmpty}>
                      <ImageIcon size={28} color={Colors.neutral400} />
                      <Text style={styles.videoPickerText}>Pick Story Photo</Text>
                      <Text style={styles.videoPickerSub}>Will be cropped to portrait (9:16)</Text>
                    </View>
                  </TouchableOpacity>
                )
              ) : (
                <ImageUploader
                  value={imageUrl}
                  onChange={setImageUrl}
                  folder="diaries"
                  shape="rect"
                  width="100%"
                  height={160}
                  onUploadStart={() => setIsUploading(true)}
                  onUploadEnd={(err) => {
                    setIsUploading(false);
                    if (err) showToast({ type: 'warning', title: 'Photo upload failed', message: 'Entry will be saved without a photo.' });
                  }}
                />
              )
            ) : isUploading ? (
              <View style={styles.videoUploading}>
                <ActivityIndicator color={Colors.primary} size="large" />
                <Text style={styles.videoUploadingText}>Uploading video…</Text>
              </View>
            ) : videoUrl ? (
              <View style={styles.videoPreviewWrap}>
                <DiaryVideo uri={videoUrl} height={Math.round((W - 40) * 0.6)} />
                <TouchableOpacity
                  style={styles.videoRemoveBtn}
                  onPress={() => { setVideoUrl(undefined); setVideoName(undefined); }}
                >
                  <X size={14} color="#fff" />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity style={styles.videoPicker} onPress={handlePickVideo}>
                <View style={styles.videoPickerEmpty}>
                  <Video size={28} color={Colors.neutral400} />
                  <Text style={styles.videoPickerText}>Tap to pick a video</Text>
                  <Text style={styles.videoPickerSub}>Max 2 minutes · MP4 or MOV</Text>
                </View>
              </TouchableOpacity>
            )}
          </View>

          {/* Visibility */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Who can see this entry?</Text>
            <View style={styles.visibilityRow}>
              {VISIBILITY_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  style={[styles.visibilityChip, visibility === opt.value && styles.visibilityChipActive]}
                  onPress={() => setVisibility(opt.value)}
                >
                  <Text style={[styles.visibilityChipLabel, visibility === opt.value && styles.visibilityChipLabelActive]}>{opt.label}</Text>
                  <Text style={[styles.visibilityChipDesc, visibility === opt.value && styles.visibilityChipDescActive]}>{opt.desc}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Share as Story toggle */}
          <View style={styles.storyToggleRow}>
            <View style={styles.storyToggleText}>
              <Text style={styles.label}>Share as Story</Text>
              <Text style={styles.storyToggleDesc}>
                Appears in story circles for 24 hours
              </Text>
            </View>
            <Switch
              value={shareAsStory}
              onValueChange={setShareAsStory}
              trackColor={{ false: Colors.neutral200, true: Colors.primary }}
              thumbColor={Colors.surface}
            />
          </View>

          {/* Quick Fill Modal */}
          {showQuickFill && mood && (
            <View style={styles.quickFillModalOverlay}>
              <TouchableOpacity 
                style={styles.quickFillModalBackdrop} 
                activeOpacity={1}
                onPress={() => setShowQuickFill(false)}
              />
              <View style={styles.quickFillModalContent}>
                <View style={styles.quickFillModalHeader}>
                  <Sparkles size={24} color={Colors.secondary} />
                  <Text style={styles.quickFillModalTitle}>Quick Fill</Text>
                </View>
                <Text style={styles.quickFillModalDesc}>
                  Pre-fill title and content with typical details for a {mood} mood.
                </Text>
                <View style={styles.quickFillModalActions}>
                  <TouchableOpacity 
                    style={styles.quickFillCancelBtn}
                    onPress={() => setShowQuickFill(false)}
                  >
                    <Text style={styles.quickFillCancelText}>Skip</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.quickFillConfirmBtn}
                    onPress={handleQuickFill}
                  >
                    <Text style={styles.quickFillConfirmText}>Apply</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}

          <View style={styles.buttonContainer}>
            <Button
              title="Save Diary Entry"
              onPress={handleSave}
              isLoading={isLoading || isUploading}
              disabled={!title.trim() || !content.trim()}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <StoryVideoPreviewModal
        visible={!!pendingVideoUri}
        uri={pendingVideoUri ?? ''}
        orientation={storyOrientation}
        onOrientationChange={setStoryOrientation}
        onConfirm={handleConfirmVideoPreview}
        onCancel={() => setPendingVideoUri(undefined)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  keyboardView: { flex: 1 },
  scrollView: { flex: 1, padding: 20 },
  inputGroup: { marginBottom: 24 },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  quickFillButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: Colors.secondaryBg,
    borderRadius: 12,
  },
  quickFillText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.secondary,
  },
  quickFillTextDisabled: {
    color: Colors.neutral400,
  },
  input: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: Colors.textPrimary,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  textArea: { minHeight: 120, paddingTop: 14 },
  moodCardsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  moodCard: {
    width: '30%',
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderRadius: 14,
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.border,
    alignItems: 'center',
    gap: 6,
    position: 'relative',
  },
  moodEmoji: { fontSize: 28 },
  moodLabel: { fontSize: 12, color: Colors.textSecondary, fontWeight: '600' },
  moodCheck: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityChipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  activityChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.border,
    gap: 6,
  },
  activityChipSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  activityIcon: { fontSize: 16 },
  activityLabel: { fontSize: 13, color: Colors.textSecondary, fontWeight: '600' },
  activityLabelSelected: { color: Colors.surface },
  buttonContainer: { marginTop: 8, marginBottom: 32 },
  mediaToggleRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  mediaToggleBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 9, borderRadius: 10, backgroundColor: Colors.neutral100, borderWidth: 1.5, borderColor: 'transparent' },
  mediaToggleBtnActive: { backgroundColor: Colors.primaryBg, borderColor: Colors.primary },
  mediaToggleText: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary },
  mediaToggleTextActive: { color: Colors.primary },
  videoPicker: { backgroundColor: Colors.surface, borderRadius: 12, borderWidth: 1.5, borderColor: Colors.border, borderStyle: 'dashed', minHeight: 100, justifyContent: 'center', alignItems: 'center', padding: 16 },
  videoPickerEmpty: { alignItems: 'center', gap: 6 },
  videoPickerText: { fontSize: 14, fontWeight: '600', color: Colors.textSecondary },
  videoPickerSub: { fontSize: 12, color: Colors.textDisabled },
  videoUploading: { height: 100, justifyContent: 'center', alignItems: 'center', gap: 10, backgroundColor: Colors.neutral100, borderRadius: 12 },
  videoUploadingText: { fontSize: 13, color: Colors.textSecondary },
  videoPreviewWrap: { borderRadius: 12, overflow: 'hidden', position: 'relative' },
  videoRemoveBtn: { position: 'absolute', top: 8, right: 8, width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', alignItems: 'center' },
  storyToggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, paddingVertical: 4 },
  storyToggleText: { flex: 1, marginRight: 12 },
  storyToggleDesc: { fontSize: 12, color: Colors.textDisabled, marginTop: 2 },
  visibilityRow: { flexDirection: 'row', gap: 8 },
  visibilityChip: {
    flex: 1, alignItems: 'center', padding: 12, borderRadius: 12,
    backgroundColor: Colors.surface, borderWidth: 1.5, borderColor: Colors.border,
  },
  visibilityChipActive: { borderColor: Colors.primary, backgroundColor: Colors.primaryBg },
  visibilityChipLabel: { fontSize: 13, fontWeight: '700', color: Colors.textSecondary },
  visibilityChipLabelActive: { color: Colors.primary },
  visibilityChipDesc: { fontSize: 11, color: Colors.textDisabled, marginTop: 2 },
  visibilityChipDescActive: { color: Colors.primaryDark },
  orientationRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  orientationBtn: {
    flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: 'center',
    borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.surface,
  },
  orientationBtnActive: { borderColor: Colors.primary, backgroundColor: Colors.primaryBg },
  orientationText: { fontSize: 12, fontWeight: '600', color: Colors.textSecondary },
  orientationTextActive: { color: Colors.primary },
  storyPhotoCard: {
    flexDirection: 'row', gap: 12, alignItems: 'center',
    backgroundColor: Colors.surface, borderRadius: 12,
    borderWidth: 1.5, borderColor: Colors.border, padding: 12,
  },
  storyPhotoThumb: {
    width: 72, height: 128, borderRadius: 8,
    backgroundColor: Colors.neutral100, overflow: 'hidden',
    justifyContent: 'center', alignItems: 'center',
  },
  storyPhotoCardBody: { flex: 1 },
  storyPhotoCardSub: { fontSize: 12, color: Colors.textSecondary, marginTop: 2, marginBottom: 12 },
  storyPhotoCardActions: { flexDirection: 'row', gap: 8 },
  storyPhotoCardBtn: {
    flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center',
    borderWidth: 1.5, borderColor: Colors.border,
  },
  storyPhotoCardBtnRemove: { borderColor: '#DC2626' },
  storyPhotoCardBtnText: { fontSize: 12, fontWeight: '700', color: Colors.textSecondary },
  storyPhotoCardBtnRemoveText: { color: '#DC2626' },
  quickFillModalOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  },
  quickFillModalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  quickFillModalContent: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 340,
  },
  quickFillModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  quickFillModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  quickFillModalDesc: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
    marginBottom: 20,
  },
  quickFillModalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  quickFillCancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  quickFillCancelText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  quickFillConfirmBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    alignItems: 'center',
  },
  quickFillConfirmText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.surface,
  },
});