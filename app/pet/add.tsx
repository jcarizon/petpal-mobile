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
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Camera, PawPrint } from 'lucide-react-native';
import { Colors } from '../../constants/colors';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { DateTimeField, ScreenHeader, useToast } from '../../components/ui';
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
  const { showToast } = useToast();

  const [name, setName] = useState('');
  const [type, setType] = useState<PetType>('dog');
  const [breed, setBreed] = useState('');
  const [birthDate, setBirthDate] = useState<Date | null>(null);
  const [weight, setWeight] = useState('');
  const [photoUrl, setPhotoUrl] = useState<string | undefined>();
  const [errors, setErrors] = useState<{ name?: string; birthDate?: string; weight?: string }>({});

  const validate = (): boolean => {
    const newErrors: typeof errors = {};
    if (!name.trim()) {
      newErrors.name = 'Pet name is required';
    } else if (name.trim().length < 2) {
      newErrors.name = 'Name should be at least 2 characters';
    }

    if (weight) {
      const parsedWeight = parseFloat(weight);
      if (isNaN(parsedWeight) || parsedWeight <= 0) {
        newErrors.weight = 'Weight must be a positive number';
      } else if (parsedWeight > 200) {
        newErrors.weight = 'Weight looks too high. Check value in kg';
      }
    }

    if (birthDate && birthDate.getTime() > Date.now()) {
      newErrors.birthDate = 'Birth date cannot be in the future';
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
        birthDate: birthDate ? birthDate.toISOString().slice(0, 10) : undefined,
        weight: weight ? parseFloat(weight) : undefined,
        photoUrl,
      };

      if (isEdit && id) {
        await updatePet(id, data);
      } else {
        await createPet(data);
      }
      showToast({
        type: 'success',
        title: isEdit ? 'Pet updated' : 'Pet added',
        message: isEdit ? 'Your pet profile was updated successfully.' : 'Your pet profile is ready.',
      });
      router.back();
    } catch (error) {
      showToast({
        type: 'error',
        title: 'Failed to save pet',
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
        title={isEdit ? 'Edit Pet' : 'Add Pet'}
        subtitle={isEdit ? 'Update your pet details and health profile' : 'Create a pet profile to track health and reminders'}
      />
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
              <Camera size={24} color={Colors.textSecondary} />
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

        <DateTimeField
          label="Birth Date (optional)"
          value={birthDate}
          onChange={(value) => {
            setBirthDate(value);
            if (errors.birthDate) setErrors((prev) => ({ ...prev, birthDate: undefined }));
          }}
          mode="date"
          maximumDate={new Date()}
          error={errors.birthDate}
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
    fontSize: 0,
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
