import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Image,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Edit3, ArrowLeft, Lock, BookOpen, Clock, Trash2, ImageIcon, Video, X } from 'lucide-react-native';
import { Colors } from '../../../../constants/colors';
import { Button } from '../../../../components/ui/Button';
import { ImageUploader, ScreenHeader, useToast } from '../../../../components/ui';
import { usePetStore } from '../../../../store/petStore';
import { useAuthStore } from '../../../../store/authStore';
import { DiaryVideo } from '../../../../components/pet/DiaryVideo';
import { uploadImage } from '../../../../lib/uploadImage';
import { StoryVideoPreviewModal } from '../../../../components/diary/StoryVideoPreviewModal';
import { DiaryMood, DiaryActivity, CreateDiaryRequest } from '../../../../types';

const W = Dimensions.get('window').width;

const moodOptions: { value: DiaryMood; label: string; emoji: string }[] = [
  { value: 'happy', label: 'Happy', emoji: '😊' },
  { value: 'excited', label: 'Excited', emoji: '🤩' },
  { value: 'calm', label: 'Calm', emoji: '😌' },
  { value: 'tired', label: 'Tired', emoji: '😴' },
  { value: 'anxious', label: 'Anxious', emoji: '😰' },
  { value: 'sick', label: 'Sick', emoji: '🤒' },
  { value: 'playful', label: 'Playful', emoji: '😜' },
];

const activityOptions: { value: DiaryActivity; label: string }[] = [
  { value: 'walk', label: 'Walk' },
  { value: 'play', label: 'Play Time' },
  { value: 'training', label: 'Training' },
  { value: 'grooming', label: 'Grooming' },
  { value: 'vet_visit', label: 'Vet Visit' },
  { value: 'feeding', label: 'Feeding' },
  { value: 'sleeping', label: 'Sleeping' },
  { value: 'swimming', label: 'Swimming' },
  { value: 'other', label: 'Other' },
];

export default function EditDiaryScreen() {
  const { id, diaryId } = useLocalSearchParams<{ id: string; diaryId: string }>();
  const router = useRouter();
  const { pets, diaries, updateDiary, deleteDiary, isLoading } = usePetStore();
  const { user } = useAuthStore();

  const diary = diaries[id ?? '']?.find((d) => d.id === diaryId);
  const pet = pets.find((p) => p.id === id);
  const isOwner = !!user && !!pet && pet.ownerId === user.id;

  // Non-owners are redirected to the story viewer
  useEffect(() => {
    if (pet && user && !isOwner) {
      router.replace({
        pathname: '/pawmatch/story/[petId]',
        params: { petId: id, context: 'community' },
      });
    }
  }, [pet, user, isOwner]);
  const { showToast } = useToast();
  const [isEditing, setIsEditing] = useState(false);

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [mood, setMood] = useState<DiaryMood | undefined>(undefined);
  const [activity, setActivity] = useState<DiaryActivity | undefined>(undefined);
  const [editImageUrl, setEditImageUrl] = useState<string | undefined>();
  const [editVideoUrl, setEditVideoUrl] = useState<string | undefined>();
  const [editVideoName, setEditVideoName] = useState<string | undefined>();
  const [editMediaType, setEditMediaType] = useState<'photo' | 'video'>('photo');
  const [isUploading, setIsUploading] = useState(false);
  const [pendingVideoUri, setPendingVideoUri] = useState<string | undefined>();
  const [storyOrientation, setStoryOrientation] = useState<'portrait' | 'landscape'>('portrait');

  const confirmMediaReplace = (message: string, onConfirm: () => void) => {
    Alert.alert('Replace Media', message, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Replace', style: 'destructive', onPress: onConfirm },
    ]);
  };

  const isStoryMode = diary?.visibility === 'MATCHES_ONLY' || diary?.storyExpiresAt != null;

  const handleChangeOrientation = (next: 'portrait' | 'landscape') => {
    if (next === storyOrientation) return;
    if (editImageUrl || editVideoUrl) {
      Alert.alert(
        'Change Orientation',
        'Your media was cropped for the previous orientation and will be removed. Continue?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Continue',
            onPress: () => {
              setStoryOrientation(next);
              setEditImageUrl(undefined);
              setEditVideoUrl(undefined);
              setEditVideoName(undefined);
              setPendingVideoUri(undefined);
            },
          },
        ]
      );
    } else {
      setStoryOrientation(next);
    }
  };

  const pickVideo = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permission required', 'Allow access to your media library.'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      allowsEditing: false,
      videoMaxDuration: 120,
      quality: 0.8,
    });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    if (isStoryMode) {
      setPendingVideoUri(asset.uri);
      return;
    }
    setIsUploading(true);
    try {
      const url = await uploadImage(asset.uri, { folder: 'diaries' });
      setEditVideoUrl(url);
      setEditVideoName(asset.fileName ?? 'video.mp4');
    } catch {
      showToast({ type: 'warning', title: 'Video upload failed', message: 'Changes will be saved without the video.' });
    } finally {
      setIsUploading(false);
    }
  };

  const pickPhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permission required', 'Allow access to your media library.'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: isStoryMode,
      aspect: isStoryMode ? (storyOrientation === 'landscape' ? [16, 9] : [9, 16]) : undefined,
      quality: 0.85,
    });
    if (result.canceled || !result.assets[0]) return;
    setIsUploading(true);
    try {
      const url = await uploadImage(result.assets[0].uri, { folder: 'diaries' });
      setEditImageUrl(url);
    } catch {
      showToast({ type: 'warning', title: 'Photo upload failed', message: '' });
    } finally {
      setIsUploading(false);
    }
  };

  const handlePickEditVideo = () => {
    if (editVideoUrl) {
      confirmMediaReplace('This will replace the current video.', pickVideo);
    } else {
      pickVideo();
    }
  };

  const handleConfirmVideoPreview = async () => {
    if (!pendingVideoUri) return;
    const uri = pendingVideoUri;
    setPendingVideoUri(undefined);
    setIsUploading(true);
    try {
      const url = await uploadImage(uri, { folder: 'diaries' });
      setEditVideoUrl(url);
      setEditVideoName('video.mp4');
    } catch {
      showToast({ type: 'warning', title: 'Video upload failed', message: 'Changes will be saved without the video.' });
    } finally {
      setIsUploading(false);
    }
  };

  useEffect(() => {
    if (diary) {
      setTitle(diary.title);
      setContent(diary.content);
      setMood(diary.mood);
      setActivity(diary.activity);
      setStoryOrientation((diary.storyOrientation as 'portrait' | 'landscape') ?? 'portrait');
      if (diary.videoUrl) { setEditVideoUrl(diary.videoUrl); setEditMediaType('video'); }
      else { setEditImageUrl(diary.imageUrl); setEditMediaType('photo'); }
    }
  }, [diary]);

  if (!diary) {
    return (
      <SafeAreaView style={styles.viewContainer}>
        <ScreenHeader title="Edit Diary" subtitle="Diary entry not found" />
      </SafeAreaView>
    );
  }

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert('Error', 'Please enter a title');
      return;
    }
    if (!content.trim()) {
      Alert.alert('Error', 'Please enter some content');
      return;
    }

    try {
      const diaryData: Partial<CreateDiaryRequest> = {
        title: title.trim(),
        content: content.trim(),
        mood,
        activity,
        imageUrl: editMediaType === 'photo' ? editImageUrl : undefined,
        videoUrl: editMediaType === 'video' ? editVideoUrl : undefined,
        ...(isStoryMode && { storyOrientation }),
      };
      await updateDiary(id!, diaryId!, diaryData);
      router.back();
    } catch (error) {
      Alert.alert('Error', 'Failed to update diary entry');
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Diary Entry',
      'Are you sure you want to delete this diary entry? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteDiary(id!, diaryId!);
              router.back();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete diary entry');
            }
          },
        },
      ]
    );
};

  const handleMakePrivate = () => {
    Alert.alert('Make Private', 'Remove this entry from the community feed?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Make Private',
        style: 'destructive',
        onPress: async () => {
          try { await updateDiary(id!, diaryId!, { visibility: 'PRIVATE' }); }
          catch { Alert.alert('Error', 'Failed to update visibility'); }
        },
      },
    ]);
  };

  const handleShareAsStory = async () => {
    try {
      await updateDiary(id!, diaryId!, { shareAsStory: true } as any);
      Alert.alert('Shared!', 'This diary will appear in story circles for 24 hours.');
    } catch {
      Alert.alert('Error', 'Failed to share as story');
    }
  };

  const handleRemoveFromStory = async () => {
    try {
      await updateDiary(id!, diaryId!, { shareAsStory: false } as any);
    } catch {
      Alert.alert('Error', 'Failed to remove from story');
    }
  };

  const storyExpiresAt = diary?.storyExpiresAt ? new Date(diary.storyExpiresAt) : null;
  const storyActive = storyExpiresAt != null && storyExpiresAt > new Date();
  const hoursLeft = storyActive ? Math.ceil((storyExpiresAt!.getTime() - Date.now()) / 3_600_000) : 0;

  const moodInfo = useMemo(() => moodOptions.find((m) => m.value === diary?.mood), [diary?.mood]);
  const activityInfo = useMemo(() => activityOptions.find((a) => a.value === diary?.activity), [diary?.activity]);

return (
    <>
      <StoryVideoPreviewModal
        visible={!!pendingVideoUri}
        uri={pendingVideoUri ?? ''}
        orientation={storyOrientation}
        onOrientationChange={setStoryOrientation}
        onConfirm={handleConfirmVideoPreview}
        onCancel={() => setPendingVideoUri(undefined)}
      />
      {!isEditing ? (
        <SafeAreaView style={styles.viewContainer}>
          <View style={styles.viewHeader}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <ArrowLeft size={20} color={Colors.textSecondary} />
            </TouchableOpacity>
            <Text style={styles.viewTitle}>Diary Entry</Text>
            <TouchableOpacity onPress={() => setIsEditing(true)} style={styles.editButton}>
              <Edit3 size={20} color={Colors.primary} />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.viewContent} showsVerticalScrollIndicator={false}>
            {/* Diary media */}
            {diary?.videoUrl && <DiaryVideo uri={diary.videoUrl} />}
            {!diary?.videoUrl && diary?.imageUrl && (
              <Image source={{ uri: diary.imageUrl }} style={styles.diaryImage} resizeMode="cover" />
            )}

            <View style={styles.viewCard}>
              <View style={styles.viewTypeRow}>
                <Text style={styles.viewTypeEmoji}>{moodInfo?.emoji ?? '🐾'}</Text>
                <View style={styles.viewTypeInfo}>
                  <Text style={styles.viewTypeLabel}>{moodInfo?.label}</Text>
                  <Text style={styles.viewDate}>{diary ? new Date(diary.createdAt).toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' }) : ''}</Text>
                </View>
                {/* Visibility badge */}
                <View style={[styles.visibilityBadge, diary?.visibility === 'PRIVATE' && styles.visibilityBadgePrivate]}>
                  <Text style={[styles.visibilityBadgeText, diary?.visibility === 'PRIVATE' && styles.visibilityBadgeTextPrivate]}>
                    {diary?.visibility === 'PRIVATE' ? 'Private' : diary?.visibility === 'PUBLIC' ? 'Public' : 'Matches'}
                  </Text>
                </View>
              </View>
              <Text style={styles.viewTitleText}>{diary?.title}</Text>
              <Text style={styles.viewContentText}>{diary?.content}</Text>
              {diary?.activity && (
                <View style={styles.viewField}>
                  <Text style={styles.viewFieldLabel}>Activity</Text>
                  <Text style={styles.viewFieldText}>{activityInfo?.label}</Text>
                </View>
              )}
            </View>

            {/* Owner actions */}
            <View style={styles.actionsCard}>
              <Text style={styles.actionsTitle}>Story &amp; Privacy</Text>

              {/* Story status */}
              {storyActive ? (
                <View style={styles.storyStatus}>
                  <Clock size={14} color={Colors.primary} />
                  <Text style={styles.storyStatusText}>
                    Active story · expires in {hoursLeft}h
                  </Text>
                </View>
              ) : storyExpiresAt ? (
                <View style={styles.storyStatus}>
                  <Clock size={14} color={Colors.textDisabled} />
                  <Text style={[styles.storyStatusText, { color: Colors.textDisabled }]}>Story expired</Text>
                </View>
              ) : null}

              <View style={styles.actionBtns}>
                {/* Make Private */}
                {diary?.visibility !== 'PRIVATE' && (
                  <TouchableOpacity style={styles.actionBtn} onPress={handleMakePrivate}>
                    <Lock size={15} color={Colors.error} />
                    <Text style={[styles.actionBtnText, { color: Colors.error }]}>Make Private</Text>
                  </TouchableOpacity>
                )}

                {/* Share / Remove Story */}
                {storyActive ? (
                  <TouchableOpacity style={styles.actionBtn} onPress={handleRemoveFromStory}>
                    <BookOpen size={15} color={Colors.textSecondary} />
                    <Text style={styles.actionBtnText}>Remove from Story</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity style={[styles.actionBtn, styles.actionBtnPrimary]} onPress={handleShareAsStory}>
                    <BookOpen size={15} color={Colors.primary} />
                    <Text style={[styles.actionBtnText, { color: Colors.primary }]}>Share as Story (24h)</Text>
                  </TouchableOpacity>
                )}

                {/* Delete */}
                <TouchableOpacity style={styles.actionBtn} onPress={handleDelete}>
                  <Trash2 size={15} color={Colors.textDisabled} />
                  <Text style={[styles.actionBtnText, { color: Colors.textDisabled }]}>Delete Entry</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </SafeAreaView>
      ) : (
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <ScreenHeader title="Edit Diary" subtitle="Update your diary entry" />
          <ScrollView showsVerticalScrollIndicator={false} style={styles.scrollView}>
            {/* Title Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Title *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., A great day at the park!"
                placeholderTextColor={Colors.textSecondary}
                value={title}
                onChangeText={setTitle}
                maxLength={100}
              />
            </View>

            {/* Mood Selection */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>How is your pet feeling?</Text>
              <View style={styles.optionsGrid}>
                {moodOptions.map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.moodOption,
                      mood === option.value && styles.moodOptionSelected,
                    ]}
                    onPress={() => setMood(mood === option.value ? undefined : option.value)}
                  >
                    <Text style={styles.moodEmoji}>{option.emoji}</Text>
                    <Text
                      style={[
                        styles.moodLabel,
                        mood === option.value && styles.moodLabelSelected,
                      ]}
                    >
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Activity Selection */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>What did you do today?</Text>
              <View style={styles.activityGrid}>
                {activityOptions.map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.activityOption,
                      activity === option.value && styles.activityOptionSelected,
                    ]}
                    onPress={() => setActivity(activity === option.value ? undefined : option.value)}
                  >
                    <Text
                      style={[
                        styles.activityLabel,
                        activity === option.value && styles.activityLabelSelected,
                      ]}
                    >
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Content Input */}
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
              <Text style={styles.label}>Media</Text>
              <View style={styles.mediaToggleRow}>
                <TouchableOpacity
                  style={[styles.mediaToggleBtn, editMediaType === 'photo' && styles.mediaToggleBtnActive]}
                  onPress={() => {
                    if (editMediaType === 'video' && editVideoUrl) {
                      confirmMediaReplace('Switch to photo? The current video will be removed.', () => {
                        setEditMediaType('photo');
                        setEditVideoUrl(undefined);
                        setEditVideoName(undefined);
                      });
                    } else {
                      setEditMediaType('photo');
                      setEditVideoUrl(undefined);
                      setEditVideoName(undefined);
                    }
                  }}
                >
                  <ImageIcon size={15} color={editMediaType === 'photo' ? Colors.primary : Colors.textSecondary} />
                  <Text style={[styles.mediaToggleText, editMediaType === 'photo' && styles.mediaToggleTextActive]}>Photo</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.mediaToggleBtn, editMediaType === 'video' && styles.mediaToggleBtnActive]}
                  onPress={() => {
                    if (editMediaType === 'photo' && editImageUrl) {
                      confirmMediaReplace('Switch to video? The current photo will be removed.', () => {
                        setEditMediaType('video');
                        setEditImageUrl(undefined);
                      });
                    } else {
                      setEditMediaType('video');
                      setEditImageUrl(undefined);
                    }
                  }}
                >
                  <Video size={15} color={editMediaType === 'video' ? Colors.primary : Colors.textSecondary} />
                  <Text style={[styles.mediaToggleText, editMediaType === 'video' && styles.mediaToggleTextActive]}>Video</Text>
                </TouchableOpacity>
              </View>

              {/* Orientation toggle — only for story posts */}
              {isStoryMode && (
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

              {editMediaType === 'photo' ? (
                editImageUrl ? (
                  <View style={styles.photoPreviewWrap}>
                    {isUploading ? (
                      <View style={styles.videoUploading}>
                        <ActivityIndicator color={Colors.primary} />
                        <Text style={styles.videoUploadingText}>Uploading…</Text>
                      </View>
                    ) : (
                      <Image source={{ uri: editImageUrl }} style={styles.photoPreview} resizeMode="cover" />
                    )}
                    <View style={styles.photoPreviewActions}>
                      <TouchableOpacity
                        style={styles.photoPreviewBtn}
                        onPress={() => confirmMediaReplace('Replace the current photo with a new one?', pickPhoto)}
                        disabled={isUploading}
                      >
                        <Text style={styles.photoPreviewBtnText}>Replace Photo</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.photoPreviewBtn, styles.photoPreviewBtnRemove]}
                        onPress={() => setEditImageUrl(undefined)}
                        disabled={isUploading}
                      >
                        <Text style={[styles.photoPreviewBtnText, styles.photoPreviewBtnTextRemove]}>Remove</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  <ImageUploader
                    value={editImageUrl}
                    onChange={setEditImageUrl}
                    folder="diaries"
                    shape="rect"
                    width="100%"
                    height={140}
                    onUploadStart={() => setIsUploading(true)}
                    onUploadEnd={(err) => {
                      setIsUploading(false);
                      if (err) showToast({ type: 'warning', title: 'Photo upload failed', message: '' });
                    }}
                  />
                )
              ) : isUploading ? (
                <View style={styles.videoUploading}>
                  <ActivityIndicator color={Colors.primary} />
                  <Text style={styles.videoUploadingText}>Uploading…</Text>
                </View>
              ) : editVideoUrl ? (
                <View style={styles.videoPreviewWrap}>
                  <DiaryVideo uri={editVideoUrl} height={Math.round((W - 80) * 0.6)} />
                  <TouchableOpacity style={styles.videoRemoveBtn} onPress={() => { setEditVideoUrl(undefined); setEditVideoName(undefined); }}>
                    <X size={14} color="#fff" />
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity style={styles.photoButton} onPress={handlePickEditVideo}>
                  <Video size={22} color={Colors.primary} />
                  <Text style={styles.photoButtonText}>Pick a video</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Save Button */}
            <View style={styles.buttonContainer}>
              <Button
                title="Save Changes"
                onPress={handleSave}
                isLoading={isLoading}
                disabled={!title.trim() || !content.trim()}
              />
            </View>

            {/* Delete Button */}
            <View style={styles.deleteButtonContainer}>
              <Button
                title="Delete Entry"
                variant="ghost"
                onPress={handleDelete}
              />
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  viewContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  viewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.neutral100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  editButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primaryBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewContent: {
    padding: 20,
  },
  viewCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    gap: 12,
  },
  viewTypeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  viewTypeEmoji: {
    fontSize: 32,
  },
  viewTypeInfo: {
    flex: 1,
  },
  viewTypeLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  viewDate: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  viewTitleText: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  viewContentText: {
    fontSize: 15,
    color: Colors.textPrimary,
    marginTop: 8,
  },
  viewField: {
    marginTop: 8,
  },
  viewFieldLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  viewFieldText: {
    fontSize: 15,
    color: Colors.textPrimary,
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
    padding: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 8,
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
  textArea: {
    minHeight: 120,
    paddingTop: 14,
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  moodOption: {
    width: '30%',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 12,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    gap: 4,
  },
  moodOptionSelected: {
    backgroundColor: Colors.primaryBg,
    borderColor: Colors.primary,
  },
  moodEmoji: {
    fontSize: 24,
  },
  moodLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  moodLabelSelected: {
    color: Colors.primary,
  },
  activityGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  activityOption: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  activityOptionSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  activityLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  activityLabelSelected: {
    color: Colors.surface,
  },
  photoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderStyle: 'dashed',
  },
  photoButtonText: {
    fontSize: 15,
    color: Colors.primary,
    fontWeight: '600',
  },
  orientationRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  orientationBtn: {
    flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: 'center',
    borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.surface,
  },
  orientationBtnActive: { borderColor: Colors.primary, backgroundColor: Colors.primaryBg },
  orientationText: { fontSize: 12, fontWeight: '600', color: Colors.textSecondary },
  orientationTextActive: { color: Colors.primary },
  mediaToggleRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  mediaToggleBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 8, borderRadius: 10, backgroundColor: Colors.neutral100, borderWidth: 1.5, borderColor: 'transparent' },
  mediaToggleBtnActive: { backgroundColor: Colors.primaryBg, borderColor: Colors.primary },
  mediaToggleText: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary },
  mediaToggleTextActive: { color: Colors.primary },
  videoUploading: { height: 80, justifyContent: 'center', alignItems: 'center', gap: 8, backgroundColor: Colors.neutral100, borderRadius: 12 },
  videoUploadingText: { fontSize: 13, color: Colors.textSecondary },
  videoPreviewWrap: { borderRadius: 12, overflow: 'hidden', position: 'relative' },
  videoRemoveBtn: { position: 'absolute', top: 8, right: 8, width: 26, height: 26, borderRadius: 13, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', alignItems: 'center' },
  buttonContainer: {
    marginTop: 8,
  },
  deleteButtonContainer: {
    marginTop: 16,
    marginBottom: 32,
  },
  diaryImage: { width: '100%', height: 220, borderRadius: 16, marginBottom: 12 },
  photoPreviewWrap: { borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: Colors.border },
  photoPreview: { width: '100%', height: 180 },
  photoPreviewActions: { flexDirection: 'row', gap: 8, padding: 8, backgroundColor: Colors.neutral100 },
  photoPreviewBtn: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 8, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border },
  photoPreviewBtnRemove: { borderColor: Colors.error + '40' },
  photoPreviewBtnText: { fontSize: 13, fontWeight: '600', color: Colors.primary },
  photoPreviewBtnTextRemove: { color: Colors.error },
  visibilityBadge: { backgroundColor: Colors.primaryBg, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 },
  visibilityBadgePrivate: { backgroundColor: Colors.neutral100 },
  visibilityBadgeText: { fontSize: 11, fontWeight: '700', color: Colors.primary },
  visibilityBadgeTextPrivate: { color: Colors.textDisabled },
  actionsCard: { marginTop: 16, backgroundColor: Colors.surface, borderRadius: 16, padding: 16, gap: 12 },
  actionsTitle: { fontSize: 13, fontWeight: '700', color: Colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 },
  storyStatus: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  storyStatusText: { fontSize: 13, fontWeight: '600', color: Colors.primary },
  actionBtns: { gap: 4 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, paddingHorizontal: 4 },
  actionBtnPrimary: { backgroundColor: Colors.primaryBg, borderRadius: 10, paddingHorizontal: 12 },
  actionBtnText: { fontSize: 14, fontWeight: '600', color: Colors.textSecondary },
});
