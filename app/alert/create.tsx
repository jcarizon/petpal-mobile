import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Image,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Camera, ChevronDown, LocateFixed, Megaphone, PawPrint, Search } from 'lucide-react-native';
import { Colors } from '../../constants/colors';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { ScreenHeader, useToast } from '../../components/ui';
import { useCommunityStore } from '../../store/communityStore';
import { usePetStore } from '../../store/petStore';
import { useLocation } from '../../hooks/useLocation';
import { AlertType, CreateAlertRequest } from '../../types';

export default function CreateAlertScreen() {
  const router = useRouter();
  const { createAlert, isLoading } = useCommunityStore();
  const { pets, fetchPets } = usePetStore();
  const { coordinates, city, getCurrentLocation } = useLocation();
  const { showToast } = useToast();

  const [type, setType] = useState<AlertType>('lost');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedPetId, setSelectedPetId] = useState<string | undefined>();
  const [showPetPicker, setShowPetPicker] = useState(false);
  const [contactPhone, setContactPhone] = useState('');
  const [photoUrl, setPhotoUrl] = useState<string | undefined>();
  const [errors, setErrors] = useState<{ title?: string; location?: string }>({});

  useEffect(() => {
    fetchPets();
  }, [fetchPets]);

  const selectedPet = pets.find((p) => p.id === selectedPetId);

  const validate = (): boolean => {
    const newErrors: typeof errors = {};
    if (!title.trim()) {
      newErrors.title = 'Title is required';
    } else if (title.trim().length < 5) {
      newErrors.title = 'Title should be at least 5 characters';
    }
    if (!coordinates) {
      newErrors.location = 'Location is required. Please enable location.';
    }
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
      showToast({
        type: 'warning',
        title: 'Location unavailable',
        message: 'Enable location permission and try again.',
      });
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
        petId: selectedPetId,
        contactPhone: contactPhone.trim() || undefined,
        photoUrl,
        latitude: coordinates.latitude,
        longitude: coordinates.longitude,
        city: city ?? 'Cebu City',
      };

      const alert = await createAlert(data);

      showToast({
        type: 'success',
        title: 'Alert posted',
        message: 'Your community alert is now live.',
      });
      router.replace(`/alert/${alert.id}`);
    } catch (error) {
      showToast({
        type: 'error',
        title: 'Failed to create alert',
        message: (error as { message?: string })?.message ?? 'Please try again.',
      });
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScreenHeader
        title="Create Alert"
        subtitle="Post a lost or found report for your nearby community"
      />
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
              <Megaphone size={24} color={type === 'lost' ? Colors.error : Colors.textSecondary} />
              <Text style={[styles.typeLabel, type === 'lost' && styles.typeLabelLost]}>
                Lost Pet
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.typeOption, type === 'found' && styles.typeOptionFound]}
              onPress={() => setType('found')}
            >
              <Search size={24} color={type === 'found' ? Colors.success : Colors.textSecondary} />
              <Text style={[styles.typeLabel, type === 'found' && styles.typeLabelFound]}>
                Found Pet
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Photo picker */}
        <TouchableOpacity style={styles.photoPicker} onPress={pickImage}>
          {photoUrl ? (
            <Image source={{ uri: photoUrl }} style={styles.photo} resizeMode="cover" />
          ) : (
            <View style={styles.photoPlaceholder}>
              <Camera size={24} color={Colors.textSecondary} />
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

        {/* Pet link — optional, pulls name/breed from the linked Pet record */}
        {pets.length > 0 && (
          <View style={styles.petSection}>
            <Text style={styles.label}>Link a Pet (optional)</Text>
            <TouchableOpacity
              style={styles.petPicker}
              onPress={() => setShowPetPicker((v) => !v)}
              activeOpacity={0.8}
            >
              <PawPrint size={16} color={selectedPet ? Colors.primary : Colors.textSecondary} />
              <Text style={[styles.petPickerText, selectedPet && styles.petPickerTextSelected]}>
                {selectedPet ? `${selectedPet.name}${selectedPet.breed ? ` · ${selectedPet.breed}` : ''}` : 'Select one of your pets…'}
              </Text>
              <ChevronDown size={16} color={Colors.textSecondary} />
            </TouchableOpacity>
            {showPetPicker && (
              <View style={styles.petDropdown}>
                <TouchableOpacity
                  style={styles.petOption}
                  onPress={() => { setSelectedPetId(undefined); setShowPetPicker(false); }}
                >
                  <Text style={styles.petOptionText}>None</Text>
                </TouchableOpacity>
                {pets.map((pet) => (
                  <TouchableOpacity
                    key={pet.id}
                    style={[styles.petOption, selectedPetId === pet.id && styles.petOptionSelected]}
                    onPress={() => { setSelectedPetId(pet.id); setShowPetPicker(false); }}
                  >
                    <Text style={[styles.petOptionText, selectedPetId === pet.id && styles.petOptionTextSelected]}>
                      {pet.name}{pet.breed ? ` · ${pet.breed}` : ''}{pet.species ? ` (${pet.species})` : ''}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        )}

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
              <Text style={styles.locationText} numberOfLines={1}>
                📍 {coordinates.latitude.toFixed(4)}, {coordinates.longitude.toFixed(4)}
                {city ? ` · ${city}` : ''}
              </Text>
              <TouchableOpacity onPress={handleGetLocation}>
                <Text style={styles.updateLocation}>Update</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <Button
              title="Use My Location"
              variant="outline"
              onPress={handleGetLocation}
              fullWidth
              leftIcon={<LocateFixed size={16} color={Colors.primary} />}
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
    alignSelf: 'stretch',
    width: '100%',
  },
  photo: {
    width: Dimensions.get('window').width - 40,
    height: 200,
    borderRadius: 12,
  },
  photoPlaceholder: {
    width: Dimensions.get('window').width - 40,
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
    marginRight: 8,
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
  petSection: {
    gap: 8,
  },
  petPicker: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  petPickerText: {
    flex: 1,
    fontSize: 14,
    color: Colors.textSecondary,
  },
  petPickerTextSelected: {
    color: Colors.textPrimary,
    fontWeight: '500',
  },
  petDropdown: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    overflow: 'hidden',
  },
  petOption: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  petOptionSelected: {
    backgroundColor: Colors.primaryBg,
  },
  petOptionText: {
    fontSize: 14,
    color: Colors.textPrimary,
  },
  petOptionTextSelected: {
    color: Colors.primary,
    fontWeight: '600',
  },
});