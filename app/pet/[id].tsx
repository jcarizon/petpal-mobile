import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  RefreshControl,
  Dimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
  StatusBar,
  Pressable,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Plus, AlertTriangle, ArrowLeft, ArrowRight, Check, Edit3, FileText, PawPrint, CalendarDays, Scale, Lightbulb, X, Activity, Stethoscope, Syringe, BookMarked, Bell, List } from 'lucide-react-native';
import { Colors } from '../../constants/colors';
import { HealthScore } from '../../components/pet/HealthScore';
import { Loading } from '../../components/ui/Loading';
import { usePetStore } from '../../store/petStore';
import { calculateAge, formatDate, formatHealthRecordType, formatPetType } from '../../lib/utils';
import { HealthRecordType, PetType, UpdatePetRequest } from '../../types';
import { Input, DateTimeField, Badge } from '../../components/ui';

const { height, width } = Dimensions.get('window');
const HERO_BASE_HEIGHT = Math.max(height * 0.5, 400);

type EditFormFields = {
  name: string;
  breed: string;
  type: PetType;
  description: string;
  behaviour: string;
  birthDate: string;
  weight: string;
};

const PET_TYPES: Array<{ key: PetType; label: string; emoji: string }> = [
  { key: 'dog', label: 'Dog', emoji: '🐕' },
  { key: 'cat', label: 'Cat', emoji: '🐈' },
  { key: 'bird', label: 'Bird', emoji: '🦜' },
  { key: 'rabbit', label: 'Rabbit', emoji: '🐇' },
  { key: 'hamster', label: 'Hamster', emoji: '🐹' },
  { key: 'fish', label: 'Fish', emoji: '🐟' },
  { key: 'other', label: 'Other', emoji: '🐾' },
];

const editSteps: Array<{
  key: keyof EditFormFields;
  label: string;
  placeholder?: string;
  multiline?: boolean;
  keyboardType?: 'default' | 'decimal-pad';
}> = [
  { key: 'name', label: 'Pet name', placeholder: 'e.g., Chopper' },
  { key: 'breed', label: 'Breed or species', placeholder: 'e.g., Labrador' },
  { key: 'type', label: 'Type', placeholder: 'dog, cat, etc.' },
  { key: 'description', label: 'Description', multiline: true, placeholder: 'Calm, playful, etc.' },
  { key: 'behaviour', label: 'Behaviour notes', multiline: true, placeholder: 'Friendly, shy, loves to play' },
  { key: 'birthDate', label: 'Birth date' },
  { key: 'weight', label: 'Weight (kg)', keyboardType: 'decimal-pad', placeholder: 'e.g., 12.5' },
];

export default function PetDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const {
    pets,
    selectedPet,
    healthRecords,
    healthScores,
    diaries,
    reminders,
    fetchPet,
    fetchPets,
    fetchHealthRecords,
    fetchDiaries,
    fetchReminders,
    completeReminder,
    deleteReminder,
    deletePet,
    updatePet,
    isLoading,
  } = usePetStore();
  const [refreshing, setRefreshing] = React.useState(false);
  const [activeTab, setActiveTab] = useState('health');
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [showSuggestionsModal, setShowSuggestionsModal] = useState(false);
  const [showHealthScoreModal, setShowHealthScoreModal] = useState(false);
  const [showAddOptionsModal, setShowAddOptionsModal] = useState(false);
  const [showEditPetModal, setShowEditPetModal] = useState(false);
  const [showDataSliderModal, setShowDataSliderModal] = useState(false);
  const [dataSliderActiveTab, setDataSliderActiveTab] = useState<'health' | 'diary' | 'reminder'>('health');
  const [isUpdatingPet, setIsUpdatingPet] = useState(false);
  const [editForm, setEditForm] = useState<EditFormFields>({
    name: '',
    breed: '',
    type: 'dog',
    description: '',
    behaviour: '',
    birthDate: '',
    weight: '',
  });
  const [formErrors, setFormErrors] = useState<{ name?: string }>({});
  const [currentEditStep, setCurrentEditStep] = useState(0);
  const [editLaunchMode, setEditLaunchMode] = useState<'multi' | 'field'>('multi');

  const openEditModalForStep = (stepKey: keyof EditFormFields, mode: 'multi' | 'field') => {
    const stepIndex = editSteps.findIndex((step) => step.key === stepKey);
    if (stepIndex === -1) return;
    setCurrentEditStep(stepIndex);
    setEditLaunchMode(mode);
    setFormErrors((prev) => ({ ...prev, name: undefined }));
    setShowEditPetModal(true);
  };

  const handleEditIconPress = () => openEditModalForStep(editSteps[0].key, 'multi');
  const handleFieldEditPress = (fieldKey: keyof EditFormFields) =>
    openEditModalForStep(fieldKey, 'field');

  const petReminders = reminders[id ?? ''] ?? [];
  const insets = useSafeAreaInsets();
  const heroHeight = HERO_BASE_HEIGHT + insets.top;

  useEffect(() => {
    if (pets.length === 0) {
      fetchPets();
    }
  }, [fetchPets, pets.length]);

  useEffect(() => {
    if (id) {
      const existingPet = pets.find((p) => p.id === id);
      if (!existingPet || !selectedPet || selectedPet.id !== id) {
        fetchPet(id);
      }
      fetchHealthRecords(id);
      fetchDiaries(id);
      fetchReminders(id);
    }
  }, [id, fetchPet, fetchHealthRecords, fetchDiaries, fetchReminders, pets, selectedPet]);

  const petIndex = pets.findIndex((p) => p.id === id);
  const petCount = pets.length;
  const nextPet = petCount > 1 ? (pets[petIndex + 1] ?? pets[0]) : null;
  const prevPet = petCount > 1 ? (petIndex > 0 ? pets[petIndex - 1] : pets[petCount - 1]) : null;

  const handleNavigateToPet = (petId: string) => {
    router.replace({ pathname: '/pet/[id]', params: { id: petId } });
  };

  const handleRefresh = async () => {
    if (!id) return;
    setRefreshing(true);
    await Promise.all([
      fetchPet(id),
      fetchHealthRecords(id),
      fetchDiaries(id),
      fetchReminders(id),
    ]);
    setRefreshing(false);
  };

  const handleDelete = () => {
    Alert.alert('Delete Pet', 'Are you sure you want to delete this pet?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          if (id) {
            await deletePet(id);
            router.back();
          }
        },
      },
    ]);
  };

  const cachedPet = pets.find((p) => p.id === id);
  const activePet = (selectedPet && selectedPet.id === id) ? selectedPet : cachedPet;
  const pet = activePet;
  
  useEffect(() => {
    if (!pet) return;
    setEditForm({
      name: pet.name ?? '',
      breed: pet.breed ?? '',
      type: pet.type ?? 'dog',
      description: pet.description ?? '',
      behaviour: pet.behaviour ?? '',
      birthDate: pet.birthDate ?? '',
    weight: pet.weight ? pet.weight.toString() : '',
  });
  setFormErrors((prev) => ({ ...prev, name: undefined }));
  }, [pet]);
  const records = healthRecords[id ?? ''] ?? [];
  const scoreData = healthScores[id ?? ''];
  const petDiaries = diaries[id ?? ''] ?? [];

  const pendingReminders = petReminders.filter((reminder) => !reminder.isCompleted);
  const nextReminder = pendingReminders.length
    ? [...pendingReminders].sort(
        (a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
      )[0]
    : undefined;
  const latestRecord = records[0];
  const latestRecordHint = latestRecord
    ? `Last record · ${formatDate(latestRecord.date, 'relative')}`
    : 'Add a record to start tracking';
  const heroBreedLabel = pet?.breed ?? formatPetType(pet?.type ?? 'other');
  const heroStats = [
    { label: 'Age', value: pet?.birthDate ? calculateAge(pet.birthDate) : 'Unknown' },
    { label: 'Weight', value: pet?.weight ? `${pet.weight} kg` : 'Not logged' },
    { label: 'Type', value: pet ? formatPetType(pet.type) : 'Unknown' },
  ];
  const descriptionText = pet?.description ?? 'No description yet.';
  const behaviorText = pet?.behaviour ?? 'No behavior notes yet.';
  const healthLabelColors: Record<string, string> = {
    Excellent: Colors.healthExcellent,
    Good: Colors.healthGood,
    Fair: Colors.healthFair,
    Poor: Colors.healthPoor,
  };
  const healthLabel = scoreData?.label ?? 'Balanced';
  const healthLabelColor = healthLabelColors[healthLabel] ?? Colors.primary;
  const priorityColorMap = {
    high: Colors.error,
    medium: Colors.secondary,
    low: Colors.success,
  } as const;
  const suggestions = scoreData?.suggestions ?? [];
  const suggestionSummary =
    suggestions.length === 1
      ? `One recommendation to keep ${pet?.name ?? 'your pet'} thriving`
      : `${suggestions.length} recommended care actions`;
  const handleSuggestionPress = (type: HealthRecordType) => {
    if (!id) return;
    setShowSuggestionsModal(false);
    router.push(`/pet/${id}/record/add?type=${type}`);
  };

  const PET_EMOJI_MAP: Record<string, string> = {
    dog: '🐕',
    cat: '🐈',
    bird: '🦜',
    rabbit: '🐇',
    hamster: '🐹',
    fish: '🐟',
    other: '🐾',
  };
  const petEmoji = PET_EMOJI_MAP[pet?.type ?? 'other'] ?? '🐾';

  const gallerySource = useMemo(() => {
    const set = new Set<string>();
    if (pet?.photoUrl) {
      set.add(pet.photoUrl);
    }
    for (const record of records) {
      if (record.photoUrl) {
        set.add(record.photoUrl);
      }
    }
    return Array.from(set);
  }, [pet?.photoUrl, records]);
  const galleryItems = gallerySource.length > 0 ? gallerySource : ['placeholder'];
  const recordNotes = records.slice(0, 3).map((record) => ({
    id: record.id,
    title: record.title || formatHealthRecordType(record.type),
    date: formatDate(record.date, 'short'),
  }));
  const diaryNotes = petDiaries.slice(0, 3).map((diary) => ({
    id: diary.id,
    title: diary.title || diary.content,
    date: formatDate(diary.createdAt, 'short'),
  }));

  useEffect(() => {
    setGalleryIndex(0);
  }, [galleryItems.length]);

  const handleGalleryScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const idx = Math.round(event.nativeEvent.contentOffset.x / width);
    const safeIndex = Math.max(0, Math.min(idx, galleryItems.length - 1));
    setGalleryIndex(safeIndex);
  };

  const currentStepConfig = editSteps[currentEditStep];
  const isLastEditStep = currentEditStep === editSteps.length - 1;

  const handleEditFieldChange =
    (field: keyof EditFormFields) => (value: string) => {
      setEditForm((prev) => ({
        ...prev,
        [field]: field === 'type' ? (value as PetType) : value,
      }));
    };

  const validatePetForm = (): boolean => {
    const errors: typeof formErrors = {};
    if (!editForm.name.trim()) {
      errors.name = 'Name is required';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCloseEditModal = () => {
    setShowEditPetModal(false);
    setEditLaunchMode('multi');
    setCurrentEditStep(0);
    setFormErrors({});
  };

  const handleNextEditStep = () => {
    if (currentEditStep < editSteps.length - 1) {
      setCurrentEditStep((prev) => prev + 1);
    }
  };

  const handlePrevEditStep = () => {
    if (currentEditStep > 0) {
      setCurrentEditStep((prev) => prev - 1);
    } else {
      handleCloseEditModal();
    }
  };

  const handleSavePet = async () => {
    if (!pet || !id || !validatePetForm()) return;
    const payload: UpdatePetRequest = {
      name: editForm.name.trim() || undefined,
      breed: editForm.breed.trim() || undefined,
      description: editForm.description.trim() || undefined,
      behaviour: editForm.behaviour.trim() || undefined,
      birthDate: editForm.birthDate || undefined,
      type: editForm.type || undefined,
      weight: editForm.weight ? Number(editForm.weight) : undefined,
    };
    setIsUpdatingPet(true);
    try {
      await updatePet(id, payload);
      Alert.alert('Updated', 'Pet details have been saved.');
      handleCloseEditModal();
    } catch (error) {
      Alert.alert('Unable to save', 'Please try again later.');
    } finally {
      setIsUpdatingPet(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={Colors.primary} />
        }
        contentContainerStyle={styles.scrollContent}
      >
        <View
          style={[
            styles.heroBanner,
            {
              height: heroHeight,
            },
          ]}
        >
          <ScrollView
            horizontal
            pagingEnabled
            decelerationRate="fast"
            snapToAlignment="center"
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={handleGalleryScroll}
          >
            {galleryItems.map((imageUri, index) =>
              imageUri === 'placeholder' ? (
                <LinearGradient
                  key={`placeholder-${index}`}
                  colors={[Colors.neutral800, Colors.neutral900]}
                  style={[styles.heroImagePlaceholder, { width, height: heroHeight }]}
                >
                  <Text style={styles.placeholderEmoji}>{petEmoji}</Text>
                  <Text style={styles.placeholderText}>{pet?.name}</Text>
                  <Text style={styles.placeholderSubtext}>{pet?.breed ?? pet?.type}</Text>
                </LinearGradient>
              ) : (
                <Image
                  key={`${imageUri}-${index}`}
                  source={{ uri: imageUri }}
                  style={[styles.heroImage, { width, height: heroHeight }]}
                />
              )
            )}
          </ScrollView>
          <View style={[styles.heroHeaderControls, { paddingTop: 16 + insets.top }]}>
            <TouchableOpacity onPress={() => router.replace('/pets')} style={styles.backButton}>
              <ArrowLeft size={20} color={Colors.textInverse} />
            </TouchableOpacity>
            <View style={styles.headerActions}>
              <TouchableOpacity
                style={styles.headerAction}
                onPress={() => setShowAddOptionsModal(true)}
              >
                <Plus size={16} color={Colors.primary} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.headerAction}
                onPress={handleEditIconPress}
              >
                <Edit3 size={16} color={Colors.primary} />
              </TouchableOpacity>
              {scoreData && (
                <TouchableOpacity
                  style={styles.headerAction}
                  onPress={() => setShowHealthScoreModal(true)}
                >
                  <Stethoscope size={16} color={Colors.primary} />
                  <View style={[
                    styles.scoreBadge,
                    scoreData.score === 100 && styles.scoreBadgePerfect,
                  ]}>
                    <Text style={styles.scoreBadgeText}>{scoreData.score}</Text>
                  </View>
                </TouchableOpacity>
              )}
              {scoreData?.suggestions && scoreData.suggestions.length > 0 && (
                <TouchableOpacity
                  style={styles.headerAction}
                  onPress={() => setShowSuggestionsModal(true)}
                >
                  <Lightbulb size={16} color={Colors.secondary} />
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={styles.headerAction}
                onPress={() => setShowDataSliderModal(true)}
              >
                <List size={16} color={Colors.primary} />
              </TouchableOpacity>
            </View>
          </View>
          <View style={[styles.heroPagination, { bottom: heroHeight * 0.05 }]}>
            {galleryItems.map((_, idx) => (
              <View
                key={`hero-dot-${idx}`}
                style={[styles.heroDot, idx === galleryIndex && styles.heroDotActive]}
              />
            ))}
          </View>
          {prevPet && (
            <Pressable
              style={({ pressed }) => [
                styles.petPaginationCardLeft,
                pressed && styles.paginationCardPressed,
              ]}
              onPress={() => handleNavigateToPet(prevPet.id)}
            >
              {prevPet.photoUrl ? (
                <Image source={{ uri: prevPet.photoUrl }} style={styles.petPaginationImage} />
              ) : (
                <View style={styles.petPaginationPlaceholder}>
                  <Text style={styles.petPaginationEmoji}>
                    {prevPet.type === 'dog' ? '🐕' : prevPet.type === 'cat' ? '🐈' : '🐾'}
                  </Text>
                </View>
              )}
            </Pressable>
          )}
          {nextPet && (
            <Pressable
              style={({ pressed }) => [
                styles.petPaginationCardRight,
                pressed && styles.paginationCardPressed,
              ]}
              onPress={() => handleNavigateToPet(nextPet.id)}
            >
              {nextPet.photoUrl ? (
                <Image source={{ uri: nextPet.photoUrl }} style={styles.petPaginationImage} />
              ) : (
                <View style={styles.petPaginationPlaceholder}>
<Text style={styles.petPaginationEmoji}>
                    {nextPet.type === 'dog' ? '🐕' : nextPet.type === 'cat' ? '🐈' : '🐾'}
                  </Text>
                </View>
              )}
            </Pressable>
          )}
        </View>
        <View style={styles.infoCard}>
          <View style={styles.infoCardHeader}>
            <View style={styles.infoNameRow}>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => handleFieldEditPress('name')}
              >
                <Text style={styles.infoName}>{pet.name}</Text>
              </TouchableOpacity>
              {pet.activeLostFoundAlert && pet.activeLostFoundAlert.type === 'lost' && (
                <Badge
                  label="LOST"
                  backgroundColor={Colors.error}
                  color={Colors.surface}
                  size="sm"
                />
              )}
            </View>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => handleFieldEditPress('breed')}
            >
              <Text style={styles.infoBreed}>{heroBreedLabel}</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.infoStatRow}>
            <TouchableOpacity
              style={styles.statCard}
              activeOpacity={0.8}
              onPress={() => handleFieldEditPress('birthDate')}
            >
              <View style={styles.statIconBox}>
                <CalendarDays size={16} color={Colors.primary} />
              </View>
              <Text style={styles.statCardLabel}>Age</Text>
              <Text style={styles.statCardValue}>
                {pet?.birthDate ? calculateAge(pet.birthDate) : 'Unknown'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.statCard}
              activeOpacity={0.8}
              onPress={() => handleFieldEditPress('weight')}
            >
              <View style={[styles.statIconBox, { backgroundColor: Colors.secondaryBg }]}>
                <Scale size={16} color={Colors.secondary} />
              </View>
              <Text style={styles.statCardLabel}>Weight</Text>
              <Text style={styles.statCardValue}>
                {pet?.weight ? `${pet.weight} kg` : 'Not logged'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.statCard}
              activeOpacity={0.8}
              onPress={() => handleFieldEditPress('type')}
            >
              <View style={[styles.statIconBox, { backgroundColor: '#E0F2FE' }]}>
                <PawPrint size={16} color={Colors.info} />
              </View>
              <Text style={styles.statCardLabel}>Type</Text>
              <Text style={styles.statCardValue}>
                {pet ? formatPetType(pet.type) : 'Unknown'}
              </Text>
            </TouchableOpacity>
          </View>
          <View style={styles.infoDescriptionSection}>
            <TouchableOpacity
              style={styles.descriptionCard}
              activeOpacity={0.8}
              onPress={() => handleFieldEditPress('description')}
            >
              <View style={styles.descriptionCardHeader}>
                <View style={styles.descriptionIconBox}>
                  <FileText size={14} color={Colors.primary} />
                </View>
                <Text style={styles.descriptionCardLabel}>Description</Text>
              </View>
              <Text style={styles.descriptionCardText}>
                {pet.description || 'No description added yet'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.descriptionCard, { backgroundColor: Colors.secondaryBg }]}
              activeOpacity={0.8}
              onPress={() => handleFieldEditPress('behaviour')}
            >
              <View style={styles.descriptionCardHeader}>
                <View style={[styles.descriptionIconBox, { backgroundColor: Colors.surface }]}>
                  <PawPrint size={14} color={Colors.secondary} />
                </View>
                <Text style={[styles.descriptionCardLabel, { color: Colors.secondaryDark }]}>
                  Behaviour
                </Text>
              </View>
              <Text style={styles.descriptionCardText}>
                {pet.behaviour || 'No behaviour notes added yet'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Add Options Modal */}
        {showAddOptionsModal && (
          <View style={styles.modalOverlay}>
            <TouchableOpacity style={styles.modalBackdrop} onPress={() => setShowAddOptionsModal(false)} />
            <View style={styles.modalContent}>
              <View style={styles.modalHandle} />
              <View style={styles.modalHeader}>
                <View style={styles.modalTitleRow}>
                  <Plus size={20} color={Colors.primary} />
                  <Text style={styles.modalTitle}>Add New</Text>
                </View>
                <TouchableOpacity onPress={() => setShowAddOptionsModal(false)}>
                  <X size={20} color={Colors.textSecondary} />
                </TouchableOpacity>
              </View>
              <View style={styles.addOptionsGrid}>
                <TouchableOpacity 
                  style={styles.addOptionCard}
                  onPress={() => {
                    setShowAddOptionsModal(false);
                    router.push(`/pet/${id}/record/add`);
                  }}
                >
                  <View style={[styles.addOptionIcon, { backgroundColor: Colors.primaryBg }]}>
                    <Syringe size={24} color={Colors.primary} />
                  </View>
                  <Text style={styles.addOptionLabel}>Health</Text>
                  <Text style={styles.addOptionSubtitle}>Record, vaccine, vet visit</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.addOptionCard}
                  onPress={() => {
                    setShowAddOptionsModal(false);
                    router.push(`/pet/${id}/diary/add`);
                  }}
                >
                  <View style={[styles.addOptionIcon, { backgroundColor: Colors.secondaryBg }]}>
                    <BookMarked size={24} color={Colors.secondary} />
                  </View>
                  <Text style={styles.addOptionLabel}>Diary</Text>
                  <Text style={styles.addOptionSubtitle}>Log moments, notes</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.addOptionCard}
                  onPress={() => {
                    setShowAddOptionsModal(false);
                    router.push(`/pet/${id}/reminder/add`);
                  }}
                >
                  <View style={[styles.addOptionIcon, { backgroundColor: '#E0F2FE' }]}>
                    <Bell size={24} color={Colors.info} />
                  </View>
                  <Text style={styles.addOptionLabel}>Reminder</Text>
                  <Text style={styles.addOptionSubtitle}>Set alerts, schedules</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {/* Edit Pet Modal */}
        {showEditPetModal && pet && (
          <View style={styles.modalOverlay}>
              <TouchableOpacity
                style={styles.modalBackdrop}
                onPress={handleCloseEditModal}
              />
            <View style={styles.modalContent}>
              <View style={styles.modalHandle} />
              <View style={[styles.modalHeader, styles.editModalHeader]}>
                <View style={styles.modalTitleRow}>
                  <Edit3 size={20} color={Colors.primary} />
                  <Text style={styles.modalTitle}>Edit pet profile</Text>
                </View>
                <TouchableOpacity onPress={handleCloseEditModal}>
                  <X size={20} color={Colors.textSecondary} />
                </TouchableOpacity>
              </View>
              <ScrollView
                style={styles.editModalScroll}
                contentContainerStyle={styles.editModalContent}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                <View style={styles.editProgressContainer}>
                  <View style={styles.editProgressTrack}>
                    <View 
                      style={[
                        styles.editProgressFill, 
                        { width: `${(currentEditStep / (editSteps.length - 1)) * 100}%` }
                      ]} 
                    />
                  </View>
                  <View style={styles.editProgressDots}>
                    {editSteps.map((step, idx) => (
                      <TouchableOpacity
                        key={step.key}
                        style={[
                          styles.editProgressDot,
                          idx === currentEditStep && styles.editProgressDotActive,
                          idx < currentEditStep && styles.editProgressDotCompleted,
                        ]}
                        onPress={() => setCurrentEditStep(idx)}
                      >
                        {idx < currentEditStep ? (
                          <Check size={14} color={Colors.surface} strokeWidth={3} />
                        ) : (
                          <Text style={[
                            styles.editProgressDotText,
                            idx === currentEditStep && styles.editProgressDotTextActive,
                          ]}>
                            {idx + 1}
                          </Text>
                        )}
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
                <Text style={styles.editStepIndicator}>
                  {currentStepConfig.label}
                </Text>
                {currentStepConfig.key === 'type' ? (
                  <View style={styles.editTypeOptions}>
                    {PET_TYPES.map((pt) => (
                      <TouchableOpacity
                        key={pt.key}
                        style={[
                          styles.editTypeOption,
                          editForm.type === pt.key && styles.editTypeOptionActive,
                        ]}
                        onPress={() => handleEditFieldChange('type')(pt.key)}
                      >
                        <Text
                          style={[
                            styles.editTypeOptionEmoji,
                            editForm.type === pt.key && styles.editTypeOptionEmojiActive,
                          ]}
                        >
                          {pt.emoji}
                        </Text>
                        <Text
                          style={[
                            styles.editTypeOptionText,
                            editForm.type === pt.key && styles.editTypeOptionTextActive,
                          ]}
                        >
                          {pt.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                ) : currentStepConfig.key === 'birthDate' ? (
                  <DateTimeField
                    label=""
                    value={editForm.birthDate ? new Date(editForm.birthDate) : null}
                    onChange={(value) => {
                      handleEditFieldChange('birthDate')(value ? value.toISOString().split('T')[0] : '');
                    }}
                    mode="date"
                    maximumDate={new Date()}
                  />
                ) : (
                  <Input
                    placeholder={currentStepConfig.placeholder}
                    value={editForm[currentStepConfig.key]}
                    onChangeText={handleEditFieldChange(currentStepConfig.key)}
                    multiline={!!currentStepConfig.multiline}
                    numberOfLines={currentStepConfig.multiline ? 3 : undefined}
                    keyboardType={currentStepConfig.keyboardType}
                    error={currentStepConfig.key === 'name' ? formErrors.name : undefined}
                  />
                )}
                {editLaunchMode === 'field' ? (
                  <View style={styles.editModalActions}>
                    <TouchableOpacity
                      style={[
                        styles.editSubmitButton,
                        isUpdatingPet && styles.editSubmitButtonDisabled,
                      ]}
                      onPress={handleSavePet}
                      disabled={isUpdatingPet}
                    >
                      <Text style={styles.editSubmitButtonText}>
                        {isUpdatingPet ? 'Saving...' : 'Submit'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={styles.editModalActions}>
                    <TouchableOpacity
                      style={[
                        styles.editIconButton,
                        currentEditStep === 0 && styles.editIconButtonDisabled,
                      ]}
                      onPress={handlePrevEditStep}
                      disabled={currentEditStep === 0}
                      accessibilityLabel="Back"
                    >
                      <ArrowLeft 
                        size={18} 
                        color={currentEditStep === 0 ? Colors.neutral400 : Colors.textSecondary} 
                      />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.editSubmitButton,
                        isUpdatingPet && styles.editSubmitButtonDisabled,
                      ]}
                      onPress={isLastEditStep ? handleSavePet : handleNextEditStep}
                      disabled={isUpdatingPet}
                    >
                      <Text style={styles.editSubmitButtonText}>
                        {isUpdatingPet ? 'Saving...' : 'Submit'}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.editIconButton,
                        styles.editNextButton,
                        isUpdatingPet && isLastEditStep ? styles.editIconButtonDisabled : null,
                      ]}
                      onPress={isLastEditStep ? handleSavePet : handleNextEditStep}
                      disabled={isUpdatingPet && isLastEditStep}
                      accessibilityLabel={isLastEditStep ? 'Save changes' : 'Next step'}
                    >
                      <ArrowRight size={24} strokeWidth={3} color={Colors.surface} />
                    </TouchableOpacity>
                  </View>
                )}
              </ScrollView>
            </View>
          </View>
        )}

        {/* Health Score Modal */}
        {showHealthScoreModal && scoreData && (
          <View style={styles.modalOverlay}>
            <TouchableOpacity style={styles.modalBackdrop} onPress={() => setShowHealthScoreModal(false)} />
            <View style={styles.modalContent}>
              <View style={styles.modalHandle} />
              <View style={styles.modalHeader}>
                <View style={styles.modalTitleRow}>
                  <Activity size={20} color={Colors.primary} />
                  <Text style={styles.modalTitle}>Health Score</Text>
                </View>
                <TouchableOpacity onPress={() => setShowHealthScoreModal(false)}>
                  <X size={20} color={Colors.textSecondary} />
                </TouchableOpacity>
              </View>
              <View style={styles.healthScoreModalScore}>
                <HealthScore score={scoreData.score} size="lg" showLabel={false} />
              </View>
              {scoreData.deductions.length > 0 && (
                <View style={styles.deductionsModal}>
                  <Text style={styles.deductionsTitle}>Improvements</Text>
                  {scoreData.deductions.map((d, i) => (
                    <View key={i} style={styles.deductionItemModal}>
                      <View style={styles.deductionReasonRow}>
                        <AlertTriangle size={14} color={Colors.warning} />
                        <Text style={styles.deductionText}>{d.reason}</Text>
                      </View>
                      <Text style={styles.deductionPoints}>-{d.points}</Text>
                    </View>
                  ))}
                </View>
              )}
              <View style={styles.scoreFooterModal}>
                <View style={styles.scoreMetric}>
                  <Text style={styles.scoreMetricLabel}>Records</Text>
                  <Text style={styles.scoreMetricValue}>{records.length}</Text>
                </View>
                <View style={styles.scoreMetric}>
                  <Text style={styles.scoreMetricLabel}>Reminders</Text>
                  <Text style={styles.scoreMetricValue}>{pendingReminders.length}</Text>
                </View>
                <View style={styles.scoreMetric}>
                  <Text style={styles.scoreMetricLabel}>Last update</Text>
                  <Text style={styles.scoreMetricValue}>
                    {latestRecord ? formatDate(latestRecord.date, 'short') : '—'}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        )}
        {/* Suggestions Modal */}
        {showSuggestionsModal && suggestions.length > 0 && (
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={styles.modalBackdrop} onPress={() => setShowSuggestionsModal(false)} />
          <View style={styles.modalContent}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleRow}>
                <Lightbulb size={20} color={Colors.secondary} />
                <Text style={styles.modalTitle}>Smart Suggestions</Text>
              </View>
              <TouchableOpacity onPress={() => setShowSuggestionsModal(false)}>
                <X size={20} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <View style={styles.suggestionsIntroRow}>
              <Text style={styles.suggestionsModeTag}>Personalized care</Text>
              <Text style={styles.suggestionsIntroText}>{suggestionSummary}</Text>
            </View>
            <View style={styles.suggestionsList}>
              {suggestions.map((suggestion) => (
                <TouchableOpacity
                  key={suggestion.id}
                  style={styles.suggestionCard}
                  onPress={() => handleSuggestionPress(suggestion.type)}
                  activeOpacity={0.8}
                  accessibilityLabel={`Add ${formatHealthRecordType(suggestion.type)}`}
                >
                  <View style={styles.suggestionRow}>
                    <View
                      style={[
                        styles.suggestionPriority,
                        { borderColor: priorityColorMap[suggestion.priority] },
                      ]}
                    >
                      <Text
                        style={[
                          styles.suggestionPriorityText,
                          { color: priorityColorMap[suggestion.priority] },
                        ]}
                      >
                        {suggestion.priority.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.suggestionContent}>
                      <Text style={styles.suggestionTitle}>{suggestion.title}</Text>
                      <Text style={styles.suggestionDesc}>{suggestion.description}</Text>
                      <Text style={styles.suggestionMeta}>
                        {formatHealthRecordType(suggestion.type)} ·{' '}
                        {suggestion.priority.charAt(0).toUpperCase() + suggestion.priority.slice(1)}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      )}
      {/* Data Slider Modal */}
      {showDataSliderModal && (
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={styles.modalBackdrop} onPress={() => setShowDataSliderModal(false)} />
          <View style={styles.dataSliderModalContent}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleRow}>
                <List size={20} color={Colors.primary} />
                <Text style={styles.modalTitle}>Records</Text>
              </View>
              <TouchableOpacity onPress={() => setShowDataSliderModal(false)}>
                <X size={20} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <View style={styles.dataSliderTabs}>
              <TouchableOpacity 
                style={[styles.dataSliderTab, dataSliderActiveTab === 'health' && styles.dataSliderTabActive]}
                onPress={() => setDataSliderActiveTab('health')}
              >
                <Syringe size={16} color={dataSliderActiveTab === 'health' ? Colors.primary : Colors.textSecondary} />
                <Text style={[styles.dataSliderTabText, dataSliderActiveTab === 'health' && styles.dataSliderTabTextActive]}>Health</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.dataSliderTab, dataSliderActiveTab === 'diary' && styles.dataSliderTabActive]}
                onPress={() => setDataSliderActiveTab('diary')}
              >
                <BookMarked size={16} color={dataSliderActiveTab === 'diary' ? Colors.primary : Colors.textSecondary} />
                <Text style={[styles.dataSliderTabText, dataSliderActiveTab === 'diary' && styles.dataSliderTabTextActive]}>Diary</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.dataSliderTab, dataSliderActiveTab === 'reminder' && styles.dataSliderTabActive]}
                onPress={() => setDataSliderActiveTab('reminder')}
              >
                <Bell size={16} color={dataSliderActiveTab === 'reminder' ? Colors.primary : Colors.textSecondary} />
                <Text style={[styles.dataSliderTabText, dataSliderActiveTab === 'reminder' && styles.dataSliderTabTextActive]}>Reminders</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.dataSliderContent} showsVerticalScrollIndicator={false}>
              {dataSliderActiveTab === 'health' && (
                <View style={styles.dataSliderSection}>
                  {records.length > 0 ? records.map((record) => (
                    <TouchableOpacity key={record.id} style={styles.dataSliderItem} onPress={() => {
                      setShowDataSliderModal(false);
                      router.push(`/pet/${id}/record/${record.id}`);
                    }}>
                      <View style={[styles.dataSliderItemIcon, { backgroundColor: Colors.primaryBg }]}>
                        <Syringe size={16} color={Colors.primary} />
                      </View>
                      <View style={styles.dataSliderItemContent}>
                        <Text style={styles.dataSliderItemTitle}>{record.title || formatHealthRecordType(record.type)}</Text>
                        <Text style={styles.dataSliderItemDate}>{formatDate(record.date, 'short')}</Text>
                      </View>
                      <ArrowRight size={16} color={Colors.textSecondary} />
                    </TouchableOpacity>
                  )) : (
                    <View style={styles.dataSliderEmpty}>
                      <Text style={styles.dataSliderEmptyText}>No health records yet</Text>
                    </View>
                  )}
                </View>
              )}
              {dataSliderActiveTab === 'diary' && (
                <View style={styles.dataSliderSection}>
                  {petDiaries.length > 0 ? petDiaries.map((diary) => (
                    <TouchableOpacity key={diary.id} style={styles.dataSliderItem} onPress={() => {
                      setShowDataSliderModal(false);
                      router.push(`/pet/${id}/diary/${diary.id}`);
                    }}>
                      <View style={[styles.dataSliderItemIcon, { backgroundColor: Colors.secondaryBg }]}>
                        <BookMarked size={16} color={Colors.secondary} />
                      </View>
                      <View style={styles.dataSliderItemContent}>
                        <Text style={styles.dataSliderItemTitle}>{diary.title || diary.content}</Text>
                        <Text style={styles.dataSliderItemDate}>{formatDate(diary.createdAt, 'short')}</Text>
                      </View>
                      <ArrowRight size={16} color={Colors.textSecondary} />
                    </TouchableOpacity>
                  )) : (
                    <View style={styles.dataSliderEmpty}>
                      <Text style={styles.dataSliderEmptyText}>No diary entries yet</Text>
                    </View>
                  )}
                </View>
              )}
              {dataSliderActiveTab === 'reminder' && (
                <View style={styles.dataSliderSection}>
                  {petReminders.length > 0 ? petReminders.map((reminder) => (
                    <TouchableOpacity key={reminder.id} style={styles.dataSliderItem} onPress={() => {
                      setShowDataSliderModal(false);
                      router.push(`/pet/${id}/reminder/${reminder.id}`);
                    }}>
                      <View style={[styles.dataSliderItemIcon, { backgroundColor: '#E0F2FE' }]}>
                        <Bell size={16} color={Colors.info} />
                      </View>
                      <View style={styles.dataSliderItemContent}>
                        <Text style={styles.dataSliderItemTitle}>{reminder.title}</Text>
                        <Text style={styles.dataSliderItemDate}>{formatDate(reminder.dueDate, 'short')}</Text>
                      </View>
                      <ArrowRight size={16} color={Colors.textSecondary} />
                    </TouchableOpacity>
                  )) : (
                    <View style={styles.dataSliderEmpty}>
                      <Text style={styles.dataSliderEmptyText}>No reminders yet</Text>
                    </View>
                  )}
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    paddingBottom: 32,
    gap: 24,
  },
  heroBanner: {
    width: '100%',
    position: 'relative',
  },
  heroImage: {
    resizeMode: 'cover',
  },
  heroImagePlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderEmoji: {
    fontSize: 100,
    marginBottom: 16,
  },
  placeholderText: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.neutral300,
    marginBottom: 4,
  },
  placeholderSubtext: {
    fontSize: 14,
    color: Colors.neutral500,
    textTransform: 'capitalize',
  },
  heroHeaderControls: {
    position: 'absolute',
    top: 0,
    left: 20,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingTop: 16,
    zIndex: 15,
  },
  backButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.6)',
    backgroundColor: 'rgba(15,23,42,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20,
  },
  headerAction: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: Colors.textInverse,
    backgroundColor: Colors.secondaryBg,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  scoreBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreBadgePerfect: {
    backgroundColor: Colors.success,
  },
  scoreBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: Colors.surface,
  },
  headerActions: {
    flexDirection: 'column',
    gap: 8,
    alignItems: 'flex-end',
  },
  heroPagination: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  heroDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.6)',
  },
  heroDotActive: {
    backgroundColor: Colors.textInverse,
    width: 10,
    height: 6,
  },
  petPaginationCardLeft: {
    position: 'absolute',
    left: 0,
    top: height / 2 - 50,
    width: 80,
    height: 100,
    borderRadius: 16,
    overflow: 'hidden',
    transform: [{ translateX: -50 }, { rotate: '10deg' }],
    zIndex: 10,
    opacity: 0.7,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.6,
    shadowRadius: 16,
    elevation: 12,
  },
  petPaginationCardRight: {
    position: 'absolute',
    right: 0,
    top: height / 2 - 50,
    width: 80,
    height: 100,
    borderRadius: 16,
    overflow: 'hidden',
    transform: [{ translateX: 50 }, { rotate: '-10deg' }],
    zIndex: 10,
    opacity: 0.7,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.6,
    shadowRadius: 16,
    elevation: 12,
  },
  petPaginationImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  petPaginationPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: Colors.neutral800,
    alignItems: 'center',
    justifyContent: 'center',
  },
  petPaginationEmoji: {
    fontSize: 32,
  },
  navigationLoader: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.8)',
    zIndex: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  paginationCardPressed: {
    transform: [{ scale: 0.95 }],
  },
  heroInfoPanel: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 14,
    borderRadius: 24,
    overflow: 'hidden',
  },
  heroInfoGradient: {
    flex: 1,
    padding: 16,
    gap: 12,
  },
  heroBadgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoCard: {
    marginHorizontal: 20,
    marginTop: -32,
    borderRadius: 24,
    backgroundColor: Colors.surface,
    padding: 20,
    shadowColor: Colors.neutral900,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 6,
  },
  infoCardHeader: {
    marginBottom: 12,
  },
  infoNameRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  infoName: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.textPrimary,
    flex: 1,
  },
  infoBreed: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  aboutCard: {
    padding: 16,
    gap: 16,
  },
  aboutSection: {
    gap: 8,
  },
  aboutSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  aboutIconWrapper: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: Colors.primaryBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aboutLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  aboutText: {
    fontSize: 15,
    color: Colors.textPrimary,
    lineHeight: 22,
  },
  petDetails: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    gap: 8,
  },
  petDetailRow: {
    gap: 4,
  },
  petDetailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  petDetailIcon: {
    width: 20,
    height: 20,
    borderRadius: 5,
    backgroundColor: Colors.primaryBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  petDetailLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  petDetailValue: {
    fontSize: 14,
    color: Colors.textPrimary,
    lineHeight: 20,
  },
  infoStatRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.neutral50,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    gap: 6,
  },
  statIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: Colors.primaryBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statCardLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statCardValue: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  infoDescriptionSection: {
    marginTop: 12,
    gap: 10,
  },
  descriptionCard: {
    backgroundColor: Colors.primaryBg,
    borderRadius: 12,
    padding: 14,
    gap: 8,
  },
  descriptionCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  descriptionIconBox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  descriptionCardLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  descriptionCardText: {
    fontSize: 14,
    color: Colors.textPrimary,
    lineHeight: 20,
  },
  descriptionRow: {
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: 14,
    gap: 6,
  },
  behaviorRow: {
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: 12,
    marginTop: 6,
    gap: 6,
  },
  descriptionLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  descriptionText: {
    fontSize: 14,
    color: Colors.textPrimary,
  },
  appointmentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  appointmentText: {
    flex: 1,
    marginRight: 8,
  },
  appointmentTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  appointmentDetail: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  appointmentEdit: {
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  appointmentEditText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primary,
    textTransform: 'uppercase',
  },
  notesSection: {
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: 12,
  },
  notesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  notesTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  notesAction: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.primary,
  },
  noteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
  },
  noteBullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.primary,
    marginRight: 10,
  },
  noteText: {
    flex: 1,
  },
  noteDate: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  noteContent: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  noteEmpty: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontStyle: 'italic',
  },
  section: {
    paddingHorizontal: 20,
    gap: 12,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.neutral100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  addRecord: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '600',
  },
  healthLabelPill: {
    borderRadius: 999,
    borderWidth: 1.5,
    paddingHorizontal: 14,
    paddingVertical: 4,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  healthLabelText: {
    fontSize: 12,
    fontWeight: '700',
  },
  healthScoreCard: {
    alignItems: 'center',
    gap: 16,
    paddingVertical: 24,
  },
  scoreFooter: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 12,
  },
  scoreMetric: {
    minWidth: 100,
  },
  scoreMetricLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
  },
  scoreMetricValue: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  deductions: {
    width: '100%',
    gap: 8,
    marginTop: 12,
  },
  deductionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  },
  deductionReasonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  deductionText: {
    fontSize: 13,
    color: Colors.textSecondary,
    flex: 1,
  },
  deductionPoints: {
    fontSize: 13,
    color: Colors.error,
    fontWeight: '700',
  },
  suggestionCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  suggestionRow: {
    flexDirection: 'row',
    gap: 14,
    alignItems: 'flex-start',
  },
  suggestionPriority: {
    width: 36,
    height: 36,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.neutral200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  suggestionContent: {
    flex: 1,
    gap: 4,
  },
  suggestionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  suggestionDesc: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  suggestionMeta: {
    fontSize: 12,
    color: Colors.secondary,
    fontWeight: '600',
    marginTop: 4,
  },
  suggestionsList: {
    gap: 12,
    marginBottom: 4,
  },
  suggestionPriorityText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  suggestionActionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  suggestionActionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.primary,
  },
  suggestionsIntroRow: {
    marginBottom: 8,
    gap: 4,
  },
  suggestionsModeTag: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    color: Colors.primary,
    textTransform: 'uppercase',
  },
  suggestionsIntroText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  addRecordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    marginTop: 12,
  },
  actionButton: {
    flex: 1,
  },
  tabsWrapper: {
    marginBottom: 16,
  },
  tabContent: {
    gap: 12,
  },
  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingBottom: 34,
    maxHeight: '70%',
  },
  editModalScroll: {
    maxHeight: height * 0.6,
  },
  editModalContent: {
    gap: 12,
    paddingBottom: 12,
  },
  editModalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 10,
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  editModalButton: {
    flex: 1,
  },
  editIconButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
  },
  editIconButtonDisabled: {
    opacity: 0.6,
    borderColor: Colors.neutral300,
  },
  editNextButton: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary,
  },
  editSubmitButton: {
    flex: 1,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
    minHeight: 44,
  },
  editSubmitButtonText: {
    color: Colors.surface,
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  editSubmitRow: {
    width: '100%',
    paddingVertical: 8,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.neutral200,
  },
  editSubmitButtonDisabled: {
    opacity: 0.6,
  },
  editProgressContainer: {
    width: '100%',
    marginBottom: 24,
  },
  editProgressTrack: {
    height: 4,
    backgroundColor: Colors.neutral200,
    borderRadius: 2,
    marginBottom: 16,
    overflow: 'hidden',
  },
  editProgressFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 2,
  },
  editProgressDots: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  editProgressDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.surface,
    borderWidth: 2,
    borderColor: Colors.neutral200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editProgressDotActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary,
  },
  editProgressDotCompleted: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary,
  },
  editProgressDotText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  editProgressDotTextActive: {
    color: Colors.surface,
  },
  editStepIndicator: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 8,
    textAlign: 'center',
  },
  editTypeOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 8,
  },
  editTypeOption: {
    flexDirection: 'column',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    minWidth: 90,
    gap: 6,
  },
  editTypeOptionActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary,
  },
  editTypeOptionText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  editTypeOptionTextActive: {
    color: Colors.surface,
  },
  editTypeOptionEmoji: {
    fontSize: 28,
  },
  editTypeOptionEmojiActive: {
    color: Colors.surface,
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: Colors.neutral300,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  editModalHeader: {
    marginBottom: 12,
  },
  modalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  suggestionItem: {
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  healthScoreModalScore: {
    alignItems: 'center',
    gap: 12,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    marginBottom: 16,
  },
  deductionsModal: {
    gap: 10,
    marginBottom: 20,
  },
  deductionsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  deductionItemModal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: Colors.neutral50,
    borderRadius: 8,
  },
  scoreFooterModal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  addOptionsGrid: {
    gap: 12,
  },
  addOptionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 14,
  },
  addOptionIcon: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addOptionLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  addOptionSubtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
    flex: 1,
  },
  dataSliderModalContent: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingBottom: 34,
    maxHeight: '80%',
  },
  dataSliderTabs: {
    flexDirection: 'row',
    backgroundColor: Colors.neutral100,
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
  },
  dataSliderTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 8,
  },
  dataSliderTabActive: {
    backgroundColor: Colors.surface,
  },
  dataSliderTabText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  dataSliderTabTextActive: {
    color: Colors.primary,
  },
  dataSliderContent: {
    maxHeight: 400,
  },
  dataSliderSection: {
    gap: 12,
  },
  dataSliderItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: Colors.neutral50,
    borderRadius: 12,
    gap: 12,
  },
  dataSliderItemIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dataSliderItemContent: {
    flex: 1,
    gap: 2,
  },
  dataSliderItemTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  dataSliderItemDate: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  dataSliderEmpty: {
    padding: 24,
    alignItems: 'center',
  },
  dataSliderEmptyText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
});
