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
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Camera, Edit3, ArrowLeft } from 'lucide-react-native';
import { Colors } from '../../../../constants/colors';
import { Button } from '../../../../components/ui/Button';
import { ScreenHeader } from '../../../../components/ui';
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

export default function EditDiaryScreen() {
  const { id, diaryId } = useLocalSearchParams<{ id: string; diaryId: string }>();
  const router = useRouter();
  const { diaries, updateDiary, deleteDiary, isLoading } = usePetStore();

  const diary = diaries[id ?? '']?.find((d) => d.id === diaryId);
  const [isEditing, setIsEditing] = useState(false);

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [mood, setMood] = useState<DiaryMood | undefined>(undefined);
  const [activity, setActivity] = useState<DiaryActivity | undefined>(undefined);

  useEffect(() => {
    if (diary) {
      setTitle(diary.title);
      setContent(diary.content);
      setMood(diary.mood);
      setActivity(diary.activity);
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

  const moodInfo = useMemo(() => moodOptions.find((m) => m.value === diary?.mood), [diary?.mood]);
  const activityInfo = useMemo(() => activityOptions.find((a) => a.value === diary?.activity), [diary?.activity]);

return (
    <>
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
            <View style={styles.viewCard}>
              <View style={styles.viewTypeRow}>
                <Text style={styles.viewTypeEmoji}>{moodInfo?.emoji}</Text>
                <View style={styles.viewTypeInfo}>
                  <Text style={styles.viewTypeLabel}>{moodInfo?.label}</Text>
                  <Text style={styles.viewDate}>{diary ? new Date(diary.createdAt).toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' }) : ''}</Text>
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

            {/* Photo Placeholder */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Add Photo (Optional)</Text>
              <TouchableOpacity style={styles.photoButton}>
                <Camera size={24} color={Colors.primary} />
                <Text style={styles.photoButtonText}>Change Photo</Text>
              </TouchableOpacity>
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
    borderWidth: 1,
    borderColor: Colors.border,
    borderStyle: 'dashed',
  },
  photoButtonText: {
    fontSize: 16,
    color: Colors.primary,
    fontWeight: '500',
  },
  buttonContainer: {
    marginTop: 8,
  },
  deleteButtonContainer: {
    marginTop: 16,
    marginBottom: 32,
  },
});
