import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput,
  TouchableOpacity, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { Colors } from '../../../constants/colors';
import { Button } from '../../../components/ui/Button';
import { DateTimeField } from '../../../components/ui/DateTimeField';
import { ImageUploader, useToast } from '../../../components/ui';
import api from '../../../lib/api';

export default function CreateEventScreen() {
  const router = useRouter();
  const { showToast } = useToast();

  const [title, setTitle] = useState('');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [imageUrl, setImageUrl] = useState<string | undefined>();
  const [maxRsvps, setMaxRsvps] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!title.trim()) { Alert.alert('Required', 'Please enter an event title.'); return; }
    if (!location.trim()) { Alert.alert('Required', 'Please enter a location.'); return; }
    if (!startDate) { Alert.alert('Required', 'Please select a start date and time.'); return; }
    if (isUploading) { showToast({ type: 'warning', title: 'Image uploading', message: 'Please wait for the image to finish uploading.' }); return; }

    setIsSubmitting(true);
    try {
      await api.post('/community/events', {
        title: title.trim(),
        location: location.trim(),
        description: description.trim() || undefined,
        startDate: startDate.toISOString(),
        endDate: endDate ? endDate.toISOString() : undefined,
        imageUrl: imageUrl || undefined,
        maxRsvps: maxRsvps ? Number(maxRsvps) : undefined,
      });
      showToast({ type: 'success', title: 'Event created!', message: 'Your event is now live in the community.' });
      router.back();
    } catch (err) {
      Alert.alert('Error', (err as { message?: string }).message ?? 'Failed to create event. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ChevronLeft size={22} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create Event</Text>
        <View style={{ width: 36 }} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={styles.form} showsVerticalScrollIndicator={false}>

          {/* Cover image */}
          <View style={styles.field}>
            <Text style={styles.label}>Cover Image (Optional)</Text>
            <ImageUploader
              value={imageUrl}
              onChange={setImageUrl}
              folder="events"
              shape="rect"
              width="100%"
              height={180}
              onUploadStart={() => setIsUploading(true)}
              onUploadEnd={(err) => {
                setIsUploading(false);
                if (err) showToast({ type: 'warning', title: 'Upload failed', message: 'Event will be saved without a cover image.' });
              }}
            />
          </View>

          {/* Title */}
          <View style={styles.field}>
            <Text style={styles.label}>Event Title *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Saturday Morning Dog Walk"
              placeholderTextColor={Colors.textDisabled}
              value={title}
              onChangeText={setTitle}
              maxLength={100}
            />
          </View>

          {/* Location */}
          <View style={styles.field}>
            <Text style={styles.label}>Location *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Ayala Center Cebu, IT Park"
              placeholderTextColor={Colors.textDisabled}
              value={location}
              onChangeText={setLocation}
              maxLength={200}
            />
          </View>

          {/* Start date */}
          <View style={styles.field}>
            <DateTimeField
              label="Start Date & Time *"
              value={startDate}
              onChange={setStartDate}
              mode="datetime"
              minimumDate={new Date()}
            />
          </View>

          {/* End date */}
          <View style={styles.field}>
            <DateTimeField
              label="End Date & Time (Optional)"
              value={endDate}
              onChange={setEndDate}
              mode="datetime"
              minimumDate={startDate ?? new Date()}
            />
          </View>

          {/* Description */}
          <View style={styles.field}>
            <Text style={styles.label}>Description (Optional)</Text>
            <TextInput
              style={[styles.input, styles.textarea]}
              placeholder="Tell people what to expect…"
              placeholderTextColor={Colors.textDisabled}
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              maxLength={1000}
            />
          </View>

          {/* Max RSVPs */}
          <View style={styles.field}>
            <Text style={styles.label}>Max RSVPs (Optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="Leave blank for unlimited"
              placeholderTextColor={Colors.textDisabled}
              value={maxRsvps}
              onChangeText={setMaxRsvps}
              keyboardType="number-pad"
              maxLength={6}
            />
          </View>

          <Button
            title="Create Event"
            onPress={handleSubmit}
            isLoading={isSubmitting || isUploading}
            disabled={!title.trim() || !location.trim() || !startDate}
            style={styles.submitBtn}
          />
        </ScrollView>
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
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.neutral100, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '700', color: Colors.textPrimary },
  form: { padding: 20, paddingBottom: 48 },
  field: { marginBottom: 20 },
  label: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary, marginBottom: 8 },
  input: {
    backgroundColor: Colors.surface, borderRadius: 12, padding: 14,
    fontSize: 15, color: Colors.textPrimary,
    borderWidth: 1, borderColor: Colors.border,
  },
  textarea: { minHeight: 100, paddingTop: 14 },
  submitBtn: { marginTop: 8 },
});
