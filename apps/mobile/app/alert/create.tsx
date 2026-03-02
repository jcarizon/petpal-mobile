import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Image,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Colors } from '../../constants/colors';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { useCommunityStore } from '../../store/communityStore';
import { useLocation } from '../../hooks/useLocation';
import { AlertType, CreateAlertRequest } from '../../types';

export default function CreateAlertScreen() {
  const router = useRouter();
  const { createAlert, isLoading } = useCommunityStore();
  const { coordinates, city, getCurrentLocation } = useLocation();
  const [type, setType] = useState<AlertType>('lost');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [petName, setPetName] = useState('');
  const [petBreed, setPetBreed] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [photoUrl, setPhotoUrl] = useState<string | undefined>();
  const [errors, setErrors] = useState<{ title?: string; location?: string }>({});

  const validate = (): boolean => {
    const newErrors: typeof errors = {};
    if (!title.trim()) newErrors.title = 'Title is required';
    if (!coordinates) newErrors.location = 'Location is required. Please enable location.';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setPhotoUrl(result.assets[0].uri);
    }
  };

  const handleGetLocation = async () => {
    const coords = await getCurrentLocation();
    if (!coords) {
      Alert.alert('Location Error', 'Could not get your location. Please enable permissions.');
    }
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    if (!coordinates) return;

    try {
      const data: CreateAlertRequest = {
        type,
        title: title.trim(),
        description: description.trim() || undefined,
        petName: petName.trim() || undefined,
        petBreed: petBreed.trim() || undefined,
        photoUrl,
        latitude: coordinates.latitude,
        longitude: coordinates.longitude,
        city: city ?? 'Cebu City',
      };

      const alert = await createAlert(data);
      router.replace(`/alert/${alert.id}`);
    } catch {
      Alert.alert('Error', 'Failed to create alert. Please try again.');
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Alert type */}
        <View style={styles.typeSection}>
          <Text style={styles.label}>Alert Type</Text>
          <View style={styles.typeOptions}>
            <TouchableOpacity
              style={[styles.typeOption, type === 'lost' && styles.typeOptionLost]}
              onPress={() => setType('lost')}
            >
              <Text style={styles.typeEmoji}>🚨</Text>
              <Text style={[styles.typeLabel, type === 'lost' && styles.typeLabelLost]}>Lost Pet</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.typeOption, type === 'found' && styles.typeOptionFound]}
              onPress={() => setType('found')}
            >
              <Text style={styles.typeEmoji}>✅</Text>
              <Text style={[styles.typeLabel, type === 'found' && styles.typeLabelFound]}>Found Pet</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Photo picker */}
        <TouchableOpacity style={styles.photoPicker} onPress={pickImage}>
          {photoUrl ? (
            <Image source={{ uri: photoUrl }} style={styles.photo} />
          ) : (
            <View style={styles.photoPlaceholder}>
              <Text style={styles.photoPlaceholderText}>📷</Text>
              <Text style={styles.photoPlaceholderLabel}>Add Photo</Text>
            </View>
          )}
        </TouchableOpacity>

        <Input
          label="Title *"
          placeholder="e.g., Lost golden retriever near SM Cebu"
          value={title}
          onChangeText={(text) => {
            setTitle(text);
            if (errors.title) setErrors((prev) => ({ ...prev, title: undefined }));
          }}
          error={errors.title}
        />

        <Input
          label="Pet Name (optional)"
          placeholder="Buddy"
          value={petName}
          onChangeText={setPetName}
        />

        <Input
          label="Pet Breed (optional)"
          placeholder="Golden Retriever"
          value={petBreed}
          onChangeText={setPetBreed}
        />

        <Input
          label="Description (optional)"
          placeholder="Last seen wearing a red collar..."
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={3}
          style={{ minHeight: 80, textAlignVertical: 'top' }}
        />

        <Input
          label="Contact Phone (optional)"
          placeholder="+63 9XX XXX XXXX"
          value={contactPhone}
          onChangeText={setContactPhone}
          keyboardType="phone-pad"
        />

        {/* Location */}
        <View style={styles.locationSection}>
          <Text style={styles.label}>Location *</Text>
          {coordinates ? (
            <View style={styles.locationSet}>
              <Text style={styles.locationText}>
                📍 {coordinates.latitude.toFixed(4)}, {coordinates.longitude.toFixed(4)}
                {city ? ` (${city})` : ''}
              </Text>
              <TouchableOpacity onPress={handleGetLocation}>
                <Text style={styles.updateLocation}>Update</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <Button
              title="📍 Use My Location"
              variant="outline"
              onPress={handleGetLocation}
              fullWidth
            />
          )}
          {errors.location && <Text style={styles.fieldError}>{errors.location}</Text>}
        </View>

        <Button
          title="Create Alert"
          variant="primary"
          onPress={handleSubmit}
          isLoading={isLoading}
          fullWidth
          size="lg"
          style={styles.submitButton}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: 20,
    gap: 16,
  },
  typeSection: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.textPrimary,
  },
  typeOptions: {
    flexDirection: 'row',
    gap: 12,
  },
  typeOption: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    gap: 4,
  },
  typeOptionLost: {
    borderColor: Colors.error,
    backgroundColor: '#FEF2F2',
  },
  typeOptionFound: {
    borderColor: Colors.success,
    backgroundColor: Colors.primaryBg,
  },
  typeEmoji: {
    fontSize: 28,
  },
  typeLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  typeLabelLost: {
    color: Colors.error,
  },
  typeLabelFound: {
    color: Colors.success,
  },
  photoPicker: {
    alignSelf: 'center',
  },
  photo: {
    width: '100%',
    height: 200,
    borderRadius: 12,
  },
  photoPlaceholder: {
    width: '100%',
    height: 160,
    borderRadius: 12,
    backgroundColor: Colors.neutral100,
    borderWidth: 2,
    borderColor: Colors.border,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  photoPlaceholderText: {
    fontSize: 36,
  },
  photoPlaceholderLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  locationSection: {
    gap: 8,
  },
  locationSet: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.primaryBg,
    padding: 12,
    borderRadius: 10,
  },
  locationText: {
    fontSize: 13,
    color: Colors.primary,
    flex: 1,
  },
  updateLocation: {
    fontSize: 13,
    color: Colors.primary,
    fontWeight: '700',
  },
  fieldError: {
    fontSize: 12,
    color: Colors.error,
  },
  submitButton: {
    marginTop: 8,
  },
});
