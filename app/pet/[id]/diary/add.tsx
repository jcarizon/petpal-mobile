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
import { Sparkles, Check } from 'lucide-react-native';
import { Colors } from '../../../../constants/colors';
import { Button } from '../../../../components/ui/Button';
import { ImageUploader, ScreenHeader, useToast } from '../../../../components/ui';
import { usePetStore } from '../../../../store/petStore';
import { DiaryMood, DiaryActivity, CreateDiaryRequest } from '../../../../types';

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
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { createDiary, isLoading } = usePetStore();
  const { showToast } = useToast();

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [mood, setMood] = useState<DiaryMood | undefined>(undefined);
  const [activity, setActivity] = useState<DiaryActivity | undefined>(undefined);
  const [imageUrl, setImageUrl] = useState<string | undefined>();
  const [isUploading, setIsUploading] = useState(false);
  const [showQuickFill, setShowQuickFill] = useState(false);

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

          {/* Photo */}
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