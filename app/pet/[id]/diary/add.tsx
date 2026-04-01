import React, { useState } from 'react';
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
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../../../../constants/colors';
import { Button } from '../../../../components/ui/Button';
import { ImageUploader, ScreenHeader, useToast } from '../../../../components/ui';
import { usePetStore } from '../../../../store/petStore';
import { DiaryMood, DiaryActivity, CreateDiaryRequest } from '../../../../types';

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

export default function AddDiaryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { createDiary, isLoading } = usePetStore();
  const { showToast } = useToast();

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [mood, setMood] = useState<DiaryMood | undefined>(undefined);
  const [activity, setActivity] = useState<DiaryActivity | undefined>(undefined);
  // imageUrl is set to local URI on pick, then replaced with Cloudinary URL on upload.
  const [imageUrl, setImageUrl] = useState<string | undefined>();
  const [isUploading, setIsUploading] = useState(false);

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
      const diaryData: CreateDiaryRequest = {
        title: title.trim(),
        content: content.trim(),
        mood,
        activity,
        imageUrl, // Cloudinary URL or undefined
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

          {/* Mood */}
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

          {/* Activity */}
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
                  onPress={() =>
                    setActivity(activity === option.value ? undefined : option.value)
                  }
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

          {/* Photo — wired to Cloudinary via ImageUploader */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Add Photo (Optional)</Text>
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
                if (err) {
                  showToast({
                    type: 'warning',
                    title: 'Photo upload failed',
                    message: 'Entry will be saved without a photo.',
                  });
                }
              }}
            />
          </View>

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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  keyboardView: { flex: 1 },
  scrollView: { flex: 1, padding: 20 },
  inputGroup: { marginBottom: 20 },
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
  textArea: { minHeight: 120, paddingTop: 14 },
  optionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
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
  moodEmoji: { fontSize: 24 },
  moodLabel: { fontSize: 12, color: Colors.textSecondary, fontWeight: '500' },
  moodLabelSelected: { color: Colors.primary },
  activityGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  activityOption: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  activityOptionSelected: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  activityLabel: { fontSize: 14, color: Colors.textSecondary, fontWeight: '500' },
  activityLabelSelected: { color: Colors.surface },
  buttonContainer: { marginTop: 8, marginBottom: 32 },
});