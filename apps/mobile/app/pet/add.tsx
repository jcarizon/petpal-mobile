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
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../../constants/colors';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { usePetStore } from '../../store/petStore';
import { PetType, CreatePetRequest } from '../../types';

const PET_TYPES: Array<{ key: PetType; emoji: string; label: string }> = [
  { key: 'dog', emoji: '🐕', label: 'Dog' },
  { key: 'cat', emoji: '🐈', label: 'Cat' },
  { key: 'bird', emoji: '🦜', label: 'Bird' },
  { key: 'rabbit', emoji: '🐇', label: 'Rabbit' },
  { key: 'hamster', emoji: '🐹', label: 'Hamster' },
  { key: 'fish', emoji: '🐟', label: 'Fish' },
  { key: 'other', emoji: '🐾', label: 'Other' },
];

export default function AddPetScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const isEdit = !!id;
  const { createPet, updatePet, isLoading } = usePetStore();

  const [name, setName] = useState('');
  const [type, setType] = useState<PetType>('dog');
  const [breed, setBreed] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [weight, setWeight] = useState('');
  const [photoUrl, setPhotoUrl] = useState<string | undefined>();
  const [errors, setErrors] = useState<{ name?: string; birthDate?: string; weight?: string }>({});

  const validate = (): boolean => {
    const newErrors: typeof errors = {};
    if (!name.trim()) newErrors.name = 'Pet name is required';
    if (weight && isNaN(parseFloat(weight))) newErrors.weight = 'Enter a valid weight';
    if (birthDate && !/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) {
      newErrors.birthDate = 'Use format YYYY-MM-DD';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setPhotoUrl(result.assets[0].uri);
      // TODO: Upload to Cloudinary and use returned URL
    }
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    try {
      const data: CreatePetRequest = {
        name: name.trim(),
        type,
        breed: breed.trim() || undefined,
        birthDate: birthDate.trim() || undefined,
        weight: weight ? parseFloat(weight) : undefined,
        photoUrl,
      };

      if (isEdit && id) {
        await updatePet(id, data);
      } else {
        await createPet(data);
      }
      router.back();
    } catch {
      Alert.alert('Error', 'Failed to save pet. Please try again.');
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

        {/* Pet type selector */}
        <View style={styles.typeSection}>
          <Text style={styles.label}>Pet Type</Text>
          <View style={styles.typeOptions}>
            {PET_TYPES.map((pt) => (
              <TouchableOpacity
                key={pt.key}
                style={[styles.typeOption, type === pt.key && styles.typeOptionSelected]}
                onPress={() => setType(pt.key)}
              >
                <Text style={styles.typeEmoji}>{pt.emoji}</Text>
                <Text style={[styles.typeLabel, type === pt.key && styles.typeLabelSelected]}>
                  {pt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <Input
          label="Pet Name *"
          placeholder="Buddy"
          value={name}
          onChangeText={(text) => {
            setName(text);
            if (errors.name) setErrors((prev) => ({ ...prev, name: undefined }));
          }}
          error={errors.name}
        />

        <Input
          label="Breed (optional)"
          placeholder="Golden Retriever"
          value={breed}
          onChangeText={setBreed}
        />

        <Input
          label="Birth Date (optional)"
          placeholder="YYYY-MM-DD"
          value={birthDate}
          onChangeText={(text) => {
            setBirthDate(text);
            if (errors.birthDate) setErrors((prev) => ({ ...prev, birthDate: undefined }));
          }}
          error={errors.birthDate}
          keyboardType="numeric"
        />

        <Input
          label="Weight (kg, optional)"
          placeholder="5.5"
          value={weight}
          onChangeText={(text) => {
            setWeight(text);
            if (errors.weight) setErrors((prev) => ({ ...prev, weight: undefined }));
          }}
          error={errors.weight}
          keyboardType="decimal-pad"
        />

        <Button
          title={isEdit ? 'Save Changes' : 'Add Pet'}
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
  photoPicker: {
    alignSelf: 'center',
    marginBottom: 8,
  },
  photo: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  photoPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.neutral100,
    borderWidth: 2,
    borderColor: Colors.border,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  photoPlaceholderText: {
    fontSize: 28,
  },
  photoPlaceholderLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: '500',
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
    flexWrap: 'wrap',
    gap: 8,
  },
  typeOption: {
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    gap: 4,
    minWidth: 72,
  },
  typeOptionSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryBg,
  },
  typeEmoji: {
    fontSize: 24,
  },
  typeLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  typeLabelSelected: {
    color: Colors.primary,
    fontWeight: '700',
  },
  submitButton: {
    marginTop: 8,
  },
});
