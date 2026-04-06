import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  ScrollView,
  Animated,
  Pressable,
  Dimensions,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowRight, ChevronLeft, ChevronRight, Check, X, Sparkles } from 'lucide-react-native';
import { Colors } from '../../constants/colors';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Card, ImageUploader, DateTimeField, ScreenHeader, useToast } from '../../components/ui';
import { usePetStore } from '../../store/petStore';
import { PetType, CreatePetRequest } from '../../types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const STEP_ANIMATION_DURATION = 300;

const PET_TYPES: Array<{ key: PetType; emoji: string; label: string }> = [
  { key: 'dog', emoji: '🐕', label: 'Dog' },
  { key: 'cat', emoji: '🐈', label: 'Cat' },
  { key: 'bird', emoji: '🦜', label: 'Bird' },
  { key: 'rabbit', emoji: '🐇', label: 'Rabbit' },
  { key: 'hamster', emoji: '🐹', label: 'Hamster' },
  { key: 'fish', emoji: '🐟', label: 'Fish' },
  { key: 'other', emoji: '🐾', label: 'Other' },
];

const STEPS = ['Type', 'Details', 'More', 'Photo'];
const STEP_HELPERS = [
  'Pick the right species so tips stay relevant.',
  'Give them a name, breed and story.',
  'Add routine, weight, and birthday info.',
  'Let their personality shine with a photo.',
];

export default function AddPetScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const isEdit = !!id;
  const { createPet, updatePet, isLoading } = usePetStore();
  const { showToast } = useToast();

  const [currentStep, setCurrentStep] = useState(0);
  const [name, setName] = useState('');
  const [type, setType] = useState<PetType>('dog');
  const [otherType, setOtherType] = useState('');
  const [breed, setBreed] = useState('');
  const [description, setDescription] = useState('');
  const [behaviour, setBehaviour] = useState('');
  const [birthDate, setBirthDate] = useState<Date | null>(null);
  const [weight, setWeight] = useState('');
  const [photoUrl, setPhotoUrl] = useState<string | undefined>();
  const [isUploading, setIsUploading] = useState(false);
  const [errors, setErrors] = useState<{ name?: string; birthDate?: string; weight?: string; photo?: string; otherType?: string }>({});
  
  const slideAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const confettiAnim = useRef(new Animated.Value(0)).current;
  
  const triggerStepTransition = (direction: 1 | -1, callback: () => void) => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: STEP_ANIMATION_DURATION / 2,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: direction * SCREEN_WIDTH * 0.3,
        duration: STEP_ANIMATION_DURATION,
        useNativeDriver: true,
      }),
    ]).start(() => {
      callback();
      slideAnim.setValue(-direction * SCREEN_WIDTH * 0.3);
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: STEP_ANIMATION_DURATION,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: STEP_ANIMATION_DURATION,
          useNativeDriver: true,
        }),
      ]).start();
    });
  };
  
  const animateProgress = (step: number) => {
    Animated.timing(progressAnim, {
      toValue: step,
      duration: 400,
      useNativeDriver: false,
    }).start();
  };

  const validateCurrentStep = (): boolean => {
    // Always clear all errors not relevant to the current step
    const newErrors: typeof errors = {};

    if (currentStep === 0) {
      if (type === 'other' && !otherType.trim()) {
        newErrors.otherType = 'Please specify the pet type';
      }
    } else if (currentStep === 1) {
      if (!name.trim()) {
        newErrors.name = 'Pet name is required';
      } else if (name.trim().length < 2) {
        newErrors.name = 'Name should be at least 2 characters';
      }
    } else if (currentStep === 2) {
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
    } else if (currentStep === 3) {
      if (!photoUrl) {
        newErrors.photo = 'Photo is required';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (!validateCurrentStep()) return;
    if (currentStep < STEPS.length - 1) {
      triggerStepTransition(1, () => {
        setCurrentStep(currentStep + 1);
        animateProgress(currentStep + 1);
      });
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      triggerStepTransition(-1, () => {
        setCurrentStep(currentStep - 1);
        animateProgress(currentStep - 1);
      });
    } else {
      router.back();
    }
  };

  const handleSubmit = async () => {
    if (!validateCurrentStep()) return;

    if (isUploading) {
      showToast({
        type: 'warning',
        title: 'Photo still uploading',
        message: 'Please wait a moment before saving.',
      });
      return;
    }

    try {
      const data: CreatePetRequest & { species?: string } = {
        name: name.trim(),
        type: type === 'other' ? 'other' : type,
        breed: breed.trim() || undefined,
        description: description.trim() || undefined,
        behaviour: behaviour.trim() || undefined,
        birthDate: birthDate ? birthDate.toISOString().slice(0, 10) : undefined,
        weight: weight ? parseFloat(weight) : undefined,
        photoUrl,
        ...(type === 'other' && otherType.trim() ? { species: otherType.trim() } : {}),
      };

      if (isEdit && id) {
        await updatePet(id, data);
      } else {
        await createPet(data);
      }

      showToast({
        type: 'success',
        title: isEdit ? 'Pet updated' : 'Pet added',
        message: isEdit
          ? 'Your pet profile was updated successfully.'
          : 'Your pet profile is ready.',
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

  const renderStep = () => {
    const stepContent = (() => {
      switch (currentStep) {
        case 0:
          return (
            <>
              <View style={styles.stepHeaderBadge}>
                <Sparkles size={14} color={Colors.primary} />
                <Text style={styles.stepHeaderBadgeText}>Step 1 of 4</Text>
              </View>
              <Text style={styles.stepTitle}>What type of pet?</Text>
              <Text style={styles.stepSubtitle}>Select your pet type to get started</Text>
              <View style={styles.typeOptionsGrid}>
                {PET_TYPES.map((pt) => (
                  <Pressable
                    key={pt.key}
                    onPress={() => setType(pt.key)}
                    style={({ pressed }) => [
                      styles.typeCard,
                      type === pt.key && styles.typeCardSelected,
                      pressed && styles.typeCardPressed,
                    ]}
                  >
                    <Text style={styles.typeCardEmoji}>{pt.emoji}</Text>
                    <Text style={[styles.typeCardLabel, type === pt.key && styles.typeCardLabelSelected]}>
                      {pt.label}
                    </Text>
                    {type === pt.key && (
                      <View style={styles.typeCardCheck}>
                        <Check size={12} color={Colors.surface} strokeWidth={3} />
                      </View>
                    )}
                  </Pressable>
                ))}
              </View>
              {type === 'other' && (
                <View style={{ marginTop: 18 }}>
                  <Input
                    label="What type?"
                    placeholder="e.g. Turtle, Lizard, etc."
                    value={otherType}
                    onChangeText={setOtherType}
                    error={errors.otherType}
                    autoFocus
                  />
                </View>
              )}
            </>
          );

        case 1:
          return (
            <>
              <View style={styles.stepHeaderBadge}>
                <Sparkles size={14} color={Colors.primary} />
                <Text style={styles.stepHeaderBadgeText}>Step 2 of 4</Text>
              </View>
              <Text style={styles.stepTitle}>What's their name?</Text>
              <Text style={styles.stepSubtitle}>Give your pet a unique name</Text>
              <View style={styles.inputGroup}>
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
                  label="Description (optional)"
                  placeholder="A brief description of your pet"
                  value={description}
                  onChangeText={setDescription}
                  multiline
                  numberOfLines={3}
                />
              </View>
            </>
          );

        case 2:
          return (
            <>
              <View style={styles.stepHeaderBadge}>
                <Sparkles size={14} color={Colors.primary} />
                <Text style={styles.stepHeaderBadgeText}>Step 3 of 4</Text>
              </View>
              <Text style={styles.stepTitle}>Behaviour & More</Text>
              <Text style={styles.stepSubtitle}>Tell us about your pet's personality</Text>
              <View style={styles.inputGroup}>
                <Input
                  label="Behaviour (optional)"
                  placeholder="e.g., Friendly, energetic, loves to play"
                  value={behaviour}
                  onChangeText={setBehaviour}
                  multiline
                  numberOfLines={3}
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
              </View>
            </>
          );

        case 3:
          return (
            <>
              <View style={styles.stepHeaderBadge}>
                <Sparkles size={14} color={Colors.primary} />
                <Text style={styles.stepHeaderBadgeText}>Step 4 of 4</Text>
              </View>
              <Text style={styles.stepTitle}>Add a photo</Text>
              <Text style={styles.stepSubtitle}>Upload a cute photo of your pet</Text>
              <View style={styles.photoSection}>
                <ImageUploader
                  value={photoUrl}
                  onChange={(url) => {
                    setPhotoUrl(url);
                    if (errors.photo) setErrors((prev) => ({ ...prev, photo: undefined }));
                  }}
                  folder="pets"
                  shape="circle"
                  width={180}
                  height={180}
                  onUploadStart={() => setIsUploading(true)}
                  onUploadEnd={(err) => {
                    setIsUploading(false);
                    if (err) {
                      showToast({
                        type: 'warning',
                        title: 'Photo upload failed',
                        message: 'Please try again.',
                      });
                    }
                  }}
                />
                {errors.photo && <Text style={styles.photoError}>{errors.photo}</Text>}
              </View>
            </>
          );

        default:
          return null;
      }
    })();

    return (
      <Animated.View
        style={[
          styles.stepCard,
          {
            opacity: fadeAnim,
            transform: [
              { translateX: slideAnim },
              {
                scale: fadeAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.95, 1],
                }),
              },
            ],
          },
        ]}
      >
        {stepContent}
      </Animated.View>
    );
  };

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1, 2, 3],
    outputRange: ['25%', '50%', '75%', '100%'],
  });

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.backButton} onPress={handleBack}>
            <ChevronLeft size={24} color={Colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{isEdit ? 'Edit Pet' : 'Add Pet'}</Text>
          <View style={styles.backButton} />
        </View>

        <View style={styles.progressSection}>
          <View style={styles.progressTrack}>
            <Animated.View style={[styles.progressFill, { width: progressWidth }]} />
          </View>
          <View style={styles.stepDotsRow}>
            {STEPS.map((_, index) => {
              const isActive = index === currentStep;
              const isCompleted = index < currentStep;
              return (
                <View key={index} style={styles.stepDotContainer}>
                  <View style={[
                    styles.stepDot,
                    isActive && styles.stepDotActive,
                    isCompleted && styles.stepDotCompleted,
                  ]}>
                    {isCompleted ? (
                      <Check size={12} color={Colors.textInverse} />
                    ) : (
                      <Text style={[
                        styles.stepDotText,
                        isActive && styles.stepDotTextActive,
                      ]}>
                        {index + 1}
                      </Text>
                    )}
                  </View>
                  <Text style={[
                    styles.stepLabel,
                    isActive && styles.stepLabelActive,
                  ]}>
                    {STEPS[index]}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>

        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {renderStep()}
        </ScrollView>

        <View style={[styles.footer, { paddingBottom: 16 + insets.bottom }]}> 
          {currentStep === STEPS.length - 1 ? (
            <Button
              title={isEdit ? 'Save Changes' : 'Add Pet'}
              variant="primary"
              onPress={handleSubmit}
              isLoading={isLoading || isUploading}
              fullWidth
              size="lg"
            />
          ) : (
            <Button
              title="Next"
              variant="primary"
              onPress={handleNext}
              fullWidth
              size="lg"
              rightIcon={<ChevronRight size={18} color={Colors.textInverse} />}
            />
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 0,
  },
  contentContainer: {
    paddingBottom: 32,
    overflow: 'visible',
  },
  stepCard: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 20,
    gap: 20,
  },
  stepContent: {
    flex: 1,
    gap: 18,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  inputGroup: {
    gap: 16,
  },
  stepSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 24,
  },
  typeOptionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  typeCard: {
    width: '31%',
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    gap: 6,
  },
  typeCardPressed: {
    transform: [{ scale: 0.96 }],
    opacity: 0.9,
  },
  typeCardSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryBg,
  },
  typeCardEmoji: {
    fontSize: 26,
  },
  typeCardLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  typeCardLabelSelected: {
    color: Colors.primary,
    fontWeight: '700',
  },
  typeCardCheck: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoSection: {
    alignItems: 'center',
    paddingTop: 20,
  },
  photoError: {
    color: Colors.error,
    fontSize: 13,
    marginTop: 12,
    textAlign: 'center',
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  heroBanner: {
    paddingHorizontal: 20,
    paddingBottom: 0,
  },
  heroGradient: {
    borderRadius: 20,
    padding: 20,
    gap: 12,
    minHeight: 180,
  },
  heroStepLabel: {
    fontSize: 12,
    letterSpacing: 1.2,
    fontWeight: '600',
    color: Colors.textInverse,
    textTransform: 'uppercase',
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.textInverse,
  },
  heroSubtitle: {
    fontSize: 14,
    color: Colors.textInverse,
    opacity: 0.9,
  },
  heroChips: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 6,
  },
  heroChip: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroChipActive: {
    backgroundColor: Colors.textInverse,
    borderColor: Colors.textInverse,
  },
  heroChipText: {
    color: Colors.textInverse,
    fontWeight: '700',
  },
  heroChipTextActive: {
    color: Colors.bannerGradientStart,
  },
  heroStepCircles: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  heroStepCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  heroStepCircleActive: {
    backgroundColor: Colors.textInverse,
    borderColor: Colors.textInverse,
  },
  heroStepCircleText: {
    fontSize: 12,
    color: Colors.textInverse,
    fontWeight: '700',
  },
  heroStepCircleTextActive: {
    color: Colors.bannerGradientStart,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  progressSection: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  progressTrack: {
    height: 6,
    backgroundColor: Colors.neutral200,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 3,
  },
  stepDotsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  stepDotContainer: {
    alignItems: 'center',
    gap: 6,
  },
  stepDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.neutral200,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  stepDotActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  stepDotCompleted: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  stepDotText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  stepDotTextActive: {
    color: Colors.textInverse,
  },
  stepLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  stepLabelActive: {
    color: Colors.primary,
    fontWeight: '700',
  },
  stepHeaderBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.primaryBg,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: 'flex-start',
    marginBottom: 16,
  },
  stepHeaderBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.primary,
  },
  typeOptionPressed: {
    transform: [{ scale: 0.96 }],
    opacity: 0.9,
  },
  typeOptionCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.neutral100,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  typeOptionCircleSelected: {
    backgroundColor: Colors.primaryBg,
  },
});
