import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Dimensions,
  Alert,
  Image,
  FlatList,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import * as ImagePicker from 'expo-image-picker';
import { ChevronDown, LocateFixed, PawPrint, X, Check, Plus, ImageIcon, Camera } from 'lucide-react-native';
import { Colors } from '../../constants/colors';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { ScreenHeader, useToast } from '../../components/ui';
import { useCommunityStore } from '../../store/communityStore';
import { usePetStore } from '../../store/petStore';
import { useLocation } from '../../hooks/useLocation';
import { AlertType, CreateAlertRequest, Coordinates } from '../../types';
import { uploadImage } from '../../lib/uploadImage';

const ALERT_TYPE_OPTIONS: Array<{
  type: AlertType;
  emoji: string;
  title: string;
  subtitle: string;
  color: string;
  bgColor: string;
}> = [
  { type: 'lost',     emoji: '🚨', title: 'Lost Pet',    subtitle: 'My pet is missing',       color: '#EF4444', bgColor: '#FEF2F2' },
  { type: 'found',    emoji: '🐾', title: 'Found Pet',   subtitle: 'I found a stray',          color: '#10B981', bgColor: '#ECFDF5' },
  { type: 'adoption', emoji: '🏠', title: 'For Adoption',subtitle: 'Looking for a new home',   color: '#8B5CF6', bgColor: '#F5F3FF' },
  { type: 'playmate', emoji: '🐶', title: 'Playmate',    subtitle: 'Looking for a playdate',   color: '#F59E0B', bgColor: '#FFFBEB' },
];

export default function CreateAlertScreen() {
  const router = useRouter();
  const { petId: paramPetId } = useLocalSearchParams<{ petId?: string }>();
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
  const [photos,          setPhotos]          = useState<string[]>([]);
  const [isUploading,     setIsUploading]     = useState(false);
  const [showPhotoSource, setShowPhotoSource] = useState(false);
  const [showPetPhotos,   setShowPetPhotos]   = useState(false);
  const MAX_PHOTOS = 6;
  const [errors, setErrors] = useState<{ title?: string; location?: string }>({});

  // Adoption fields
  const [adoptionReason, setAdoptionReason] = useState('');
  const [adoptionFee, setAdoptionFee] = useState('');
  const [adoptionFeeIsFree, setAdoptionFeeIsFree] = useState(false);
  const [isNeutered, setIsNeutered] = useState<boolean | undefined>();
  const [isVaccinated, setIsVaccinated] = useState<boolean | undefined>();
  const [idealOwnerNote, setIdealOwnerNote] = useState('');

  // Playmate fields
  const [playmatePreferredArea, setPlaymatePreferredArea] = useState('');
  const [playmateSchedule, setPlaymateSchedule] = useState('');
  const [playmatePreferredSize, setPlaymatePreferredSize] = useState<string>('any');
  const [playmateEnergyLevel, setPlaymateEnergyLevel] = useState<string>('any');
  const [playmateVaccineRequired, setPlaymateVaccineRequired] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [tempCoordinates, setTempCoordinates] = useState<Coordinates | null>(coordinates);
  const mapRef = useRef<MapView>(null);

  useEffect(() => {
    fetchPets();
  }, [fetchPets]);

  // Pre-fill pet when navigated from pet detail with ?petId=
  useEffect(() => {
    if (paramPetId && pets.length > 0) {
      handlePetSelect(paramPetId);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paramPetId, pets]);

  useEffect(() => {
    if (coordinates) {
      setTempCoordinates(coordinates);
    }
  }, [coordinates]);

  const selectedPet = pets.find((p) => p.id === selectedPetId);

  const handlePetSelect = (petId: string | undefined) => {
    setSelectedPetId(petId);
    setShowPetPicker(false);
    
    if (petId && type === 'lost') {
      const pet = pets.find((p) => p.id === petId);
      if (pet) {
        if (!title.trim()) {
          setTitle(`Lost ${pet.name}${pet.breed ? ` - ${pet.breed}` : ''}`);
        }
        if (pet.description) {
          setDescription(pet.description);
        }
        if (pet.photoUrl && photos.length === 0) {
          setPhotos([pet.photoUrl]);
        }
      }
    } else if (!petId) {
      setDescription('');
      setPhotos([]);
    }
  };

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

  const handleOpenLocationModal = async () => {
    if (!tempCoordinates && coordinates) {
      setTempCoordinates(coordinates);
    } else if (!tempCoordinates) {
      const coords = await getCurrentLocation();
      if (coords) {
        setTempCoordinates(coords);
      }
    }
    setShowLocationModal(true);
  };

  const handleConfirmLocation = () => {
    if (tempCoordinates) {
      setShowLocationModal(false);
    } else {
      Alert.alert('Select Location', 'Please tap on the map to select a location.');
    }
  };

  const handleMapPress = (event: any) => {
    const { coordinate } = event.nativeEvent;
    setTempCoordinates({
      latitude: coordinate.latitude,
      longitude: coordinate.longitude,
    });
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    if (!coordinates) return;

    if (isUploading) {
      showToast({
        type: 'warning',
        title: 'Photo still uploading',
        message: 'Please wait a moment before posting.',
      });
      return;
    }

    try {
      const data: CreateAlertRequest = {
        type,
        title: title.trim(),
        description: description.trim() || undefined,
        petId: selectedPetId,
        contactPhone: contactPhone.trim() || undefined,
        photoUrl: photos[0],
        photos,
        latitude: coordinates.latitude,
        longitude: coordinates.longitude,
        city: city ?? 'Cebu City',

        // Adoption fields
        ...(type === 'adoption' && {
          adoptionReason: adoptionReason.trim() || undefined,
          adoptionFee: adoptionFeeIsFree ? 0 : (adoptionFee ? Number(adoptionFee) : undefined),
          isNeutered: isNeutered,
          isVaccinated: isVaccinated,
          idealOwnerNote: idealOwnerNote.trim() || undefined,
        }),

        // Playmate fields
        ...(type === 'playmate' && {
          playmatePreferredArea: playmatePreferredArea.trim() || undefined,
          playmateSchedule: playmateSchedule.trim() || undefined,
          playmatePreferredSize,
          playmateEnergyLevel,
          playmateVaccineRequired,
        }),
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
          <View style={styles.typeGrid}>
            {ALERT_TYPE_OPTIONS.map((opt) => {
              const isSelected = type === opt.type;
              return (
                <TouchableOpacity
                  key={opt.type}
                  style={[
                    styles.typeCard,
                    isSelected && { borderColor: opt.color, backgroundColor: opt.bgColor },
                  ]}
                  onPress={() => setType(opt.type)}
                >
                  <Text style={styles.typeCardEmoji}>{opt.emoji}</Text>
                  <Text style={[styles.typeCardTitle, isSelected && { color: opt.color }]}>
                    {opt.title}
                  </Text>
                  <Text style={styles.typeCardSubtitle}>{opt.subtitle}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Alert photos — multi-image carousel picker */}
        <View>
          <View style={styles.photosHeader}>
            <Text style={styles.label}>Photos (optional)</Text>
            <Text style={styles.photosCount}>{photos.length}/{MAX_PHOTOS}</Text>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.photosRow}>
            {/* Existing photo thumbnails */}
            {photos.map((url, i) => (
              <View key={`${url}-${i}`} style={styles.photoThumb}>
                <Image source={{ uri: url }} style={styles.photoThumbImg} resizeMode="cover" />
                {i === 0 && <View style={styles.photoThumbMainBadge}><Text style={styles.photoThumbMainText}>Cover</Text></View>}
                <TouchableOpacity
                  style={styles.photoThumbRemove}
                  onPress={() => setPhotos((prev) => prev.filter((_, idx) => idx !== i))}
                >
                  <X size={12} color="#fff" strokeWidth={3} />
                </TouchableOpacity>
              </View>
            ))}

            {/* Add button */}
            {photos.length < MAX_PHOTOS && (
              <TouchableOpacity
                style={styles.photoAddBtn}
                onPress={() => setShowPhotoSource(true)}
                disabled={isUploading}
              >
                {isUploading
                  ? <ActivityIndicator color={Colors.primary} />
                  : <Plus size={28} color={Colors.neutral400} strokeWidth={1.5} />}
              </TouchableOpacity>
            )}
          </ScrollView>
        </View>

        {/* Photo source picker modal */}
        <Modal visible={showPhotoSource} transparent animationType="slide" onRequestClose={() => setShowPhotoSource(false)}>
          <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setShowPhotoSource(false)} />
          <View style={styles.photoSourceSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.photoSourceTitle}>Add Photo</Text>
            <View style={styles.photoSourceOptions}>
              <TouchableOpacity style={styles.photoSourceBtn} onPress={async () => {
                setShowPhotoSource(false);
                setShowPetPhotos(true);
              }}>
                <View style={[styles.photoSourceIcon, { backgroundColor: Colors.primaryBg }]}>
                  <PawPrint size={26} color={Colors.primary} />
                </View>
                <Text style={styles.photoSourceLabel}>My Pet Photos</Text>
                <Text style={styles.photoSourceSub}>Choose from uploaded pet photos</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.photoSourceBtn} onPress={async () => {
                setShowPhotoSource(false);
                const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
                if (status !== 'granted') { Alert.alert('Permission needed', 'Allow access to your photo library.'); return; }
                const remaining = MAX_PHOTOS - photos.length;
                const result = await ImagePicker.launchImageLibraryAsync({
                  mediaTypes: ImagePicker.MediaTypeOptions.Images,
                  allowsMultipleSelection: true,
                  selectionLimit: remaining,
                  quality: 0.85,
                });
                if (!result.canceled && result.assets.length > 0) {
                  setIsUploading(true);
                  try {
                    const urls = await Promise.all(result.assets.map((a) => uploadImage(a.uri, { folder: 'alerts' })));
                    setPhotos((prev) => [...prev, ...urls].slice(0, MAX_PHOTOS));
                  } catch {
                    showToast({ type: 'warning', title: 'Upload failed', message: 'Some photos could not be uploaded.' });
                  } finally {
                    setIsUploading(false);
                  }
                }
              }}>
                <View style={[styles.photoSourceIcon, { backgroundColor: '#EFF6FF' }]}>
                  <ImageIcon size={26} color="#3B82F6" />
                </View>
                <Text style={styles.photoSourceLabel}>Camera Roll</Text>
                <Text style={styles.photoSourceSub}>Pick multiple from your gallery</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.photoSourceBtn} onPress={async () => {
                setShowPhotoSource(false);
                const { status } = await ImagePicker.requestCameraPermissionsAsync();
                if (status !== 'granted') { Alert.alert('Permission needed', 'Allow camera access.'); return; }
                const result = await ImagePicker.launchCameraAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.85 });
                if (!result.canceled && result.assets[0]) {
                  setIsUploading(true);
                  try {
                    const url = await uploadImage(result.assets[0].uri, { folder: 'alerts' });
                    setPhotos((prev) => [...prev, url].slice(0, MAX_PHOTOS));
                  } catch {
                    showToast({ type: 'warning', title: 'Upload failed', message: 'Photo could not be uploaded.' });
                  } finally {
                    setIsUploading(false);
                  }
                }
              }}>
                <View style={[styles.photoSourceIcon, { backgroundColor: '#F0FDF4' }]}>
                  <Camera size={26} color="#16A34A" />
                </View>
                <Text style={styles.photoSourceLabel}>Camera</Text>
                <Text style={styles.photoSourceSub}>Take a photo right now</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* My Pet Photos modal */}
        <Modal visible={showPetPhotos} transparent animationType="slide" onRequestClose={() => setShowPetPhotos(false)}>
          <View style={styles.modalFullOverlay}>
            <View style={styles.petPhotosSheet}>
              <View style={styles.petPhotosHeader}>
                <Text style={styles.photoSourceTitle}>My Pet Photos</Text>
                <TouchableOpacity onPress={() => setShowPetPhotos(false)}>
                  <X size={20} color={Colors.textSecondary} />
                </TouchableOpacity>
              </View>
              <FlatList
                data={(() => {
                  const allUrls: string[] = [];
                  pets.forEach((p) => {
                    if (p.photoUrl) allUrls.push(p.photoUrl);
                    (p.photos ?? []).forEach((ph) => allUrls.push(ph.url));
                  });
                  return [...new Set(allUrls)];
                })()}
                numColumns={3}
                keyExtractor={(url, i) => `${url}-${i}`}
                contentContainerStyle={styles.petPhotosGrid}
                ListEmptyComponent={<Text style={styles.petPhotosEmpty}>No pet photos yet. Add photos to your pets first.</Text>}
                renderItem={({ item: url }) => {
                  const selected = photos.includes(url);
                  return (
                    <TouchableOpacity
                      style={[styles.petPhotoCell, selected && styles.petPhotoCellSelected]}
                      onPress={() => {
                        if (selected) {
                          setPhotos((prev) => prev.filter((u) => u !== url));
                        } else if (photos.length < MAX_PHOTOS) {
                          setPhotos((prev) => [...prev, url]);
                        }
                      }}
                    >
                      <Image source={{ uri: url }} style={styles.petPhotoCellImg} resizeMode="cover" />
                      {selected && (
                        <View style={styles.petPhotoCellCheck}>
                          <Check size={14} color="#fff" strokeWidth={3} />
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                }}
              />
              <View style={styles.petPhotosFooter}>
                <Button title={`Done (${photos.length} selected)`} variant="primary" onPress={() => setShowPetPhotos(false)} fullWidth />
              </View>
            </View>
          </View>
        </Modal>

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

        {/* Link a pet (optional) */}
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
                {selectedPet
                  ? `${selectedPet.name}${selectedPet.breed ? ` · ${selectedPet.breed}` : ''}`
                  : 'Select one of your pets…'}
              </Text>
              <ChevronDown size={16} color={Colors.textSecondary} />
            </TouchableOpacity>
            {showPetPicker && (
              <View style={styles.petDropdown}>
                <TouchableOpacity
                  style={styles.petOption}
                  onPress={() => handlePetSelect(undefined)}
                >
                  <Text style={styles.petOptionText}>None</Text>
                </TouchableOpacity>
                {pets.map((pet) => (
                  <TouchableOpacity
                    key={pet.id}
                    style={[styles.petOption, selectedPetId === pet.id && styles.petOptionSelected]}
                    onPress={() => handlePetSelect(pet.id)}
                  >
                    <Text
                      style={[
                        styles.petOptionText,
                        selectedPetId === pet.id && styles.petOptionTextSelected,
                      ]}
                    >
                      {pet.name}
                      {pet.breed ? ` · ${pet.breed}` : ''}
                      {pet.species ? ` (${pet.species})` : ''}
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

        {/* Adoption-specific fields */}
        {type === 'adoption' && (
          <View style={styles.extraSection}>
            <Text style={styles.extraSectionTitle}>Adoption Details</Text>

            <Input
              label="Reason for rehoming (optional)"
              placeholder="e.g. Moving abroad, can't bring along"
              value={adoptionReason}
              onChangeText={setAdoptionReason}
              multiline
              numberOfLines={2}
              style={{ minHeight: 60, textAlignVertical: 'top' }}
            />

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Adoption fee</Text>
              <View style={styles.pillRow}>
                {[{ label: 'Free', value: true }, { label: 'Paid', value: false }].map((opt) => (
                  <TouchableOpacity
                    key={String(opt.value)}
                    style={[styles.pill, adoptionFeeIsFree === opt.value && styles.pillSelected]}
                    onPress={() => setAdoptionFeeIsFree(opt.value)}
                  >
                    <Text style={[styles.pillText, adoptionFeeIsFree === opt.value && styles.pillTextSelected]}>
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              {!adoptionFeeIsFree && (
                <Input
                  placeholder="Amount in PHP (e.g. 500)"
                  value={adoptionFee}
                  onChangeText={setAdoptionFee}
                  keyboardType="numeric"
                />
              )}
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Health status</Text>
              <View style={styles.toggleRow}>
                <TouchableOpacity
                  style={[styles.toggleChip, isNeutered === true && styles.toggleChipOn]}
                  onPress={() => setIsNeutered(isNeutered === true ? undefined : true)}
                >
                  {isNeutered === true && <Check size={12} color={Colors.textInverse} />}
                  <Text style={[styles.toggleChipText, isNeutered === true && styles.toggleChipTextOn]}>
                    Neutered
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.toggleChip, isVaccinated === true && styles.toggleChipOn]}
                  onPress={() => setIsVaccinated(isVaccinated === true ? undefined : true)}
                >
                  {isVaccinated === true && <Check size={12} color={Colors.textInverse} />}
                  <Text style={[styles.toggleChipText, isVaccinated === true && styles.toggleChipTextOn]}>
                    Vaccinated
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <Input
              label="Ideal owner note (optional)"
              placeholder="e.g. Best for families, loves kids"
              value={idealOwnerNote}
              onChangeText={setIdealOwnerNote}
              multiline
              numberOfLines={2}
              style={{ minHeight: 60, textAlignVertical: 'top' }}
            />
          </View>
        )}

        {/* Playmate-specific fields */}
        {type === 'playmate' && (
          <View style={styles.extraSection}>
            <Text style={styles.extraSectionTitle}>Playdate Details</Text>

            <Input
              label="Preferred play area (optional)"
              placeholder="e.g. IT Park, Lahug"
              value={playmatePreferredArea}
              onChangeText={setPlaymatePreferredArea}
            />

            <Input
              label="Schedule (optional)"
              placeholder="e.g. Weekend mornings"
              value={playmateSchedule}
              onChangeText={setPlaymateSchedule}
            />

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Preferred size</Text>
              <View style={styles.pillRow}>
                {['small', 'medium', 'large', 'any'].map((s) => (
                  <TouchableOpacity
                    key={s}
                    style={[styles.pill, playmatePreferredSize === s && styles.pillSelected]}
                    onPress={() => setPlaymatePreferredSize(s)}
                  >
                    <Text style={[styles.pillText, playmatePreferredSize === s && styles.pillTextSelected]}>
                      {s.charAt(0).toUpperCase() + s.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Energy level</Text>
              <View style={styles.pillRow}>
                {['low', 'medium', 'high', 'any'].map((e) => (
                  <TouchableOpacity
                    key={e}
                    style={[styles.pill, playmateEnergyLevel === e && styles.pillSelected]}
                    onPress={() => setPlaymateEnergyLevel(e)}
                  >
                    <Text style={[styles.pillText, playmateEnergyLevel === e && styles.pillTextSelected]}>
                      {e.charAt(0).toUpperCase() + e.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <TouchableOpacity
              style={[styles.toggleChip, playmateVaccineRequired && styles.toggleChipOn]}
              onPress={() => setPlaymateVaccineRequired((v) => !v)}
            >
              {playmateVaccineRequired && <Check size={12} color={Colors.success} />}
              <Text style={[styles.toggleChipText, playmateVaccineRequired && styles.toggleChipTextOn]}>
                Vaccine required
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Location */}
        <View style={styles.locationSection}>
          <Text style={styles.label}>Location *</Text>
          <TouchableOpacity
            style={styles.locationButton}
            onPress={handleOpenLocationModal}
          >
            <LocateFixed size={16} color={Colors.primary} />
            <Text style={styles.locationButtonText}>
              {tempCoordinates
                ? `${tempCoordinates.latitude.toFixed(4)}, ${tempCoordinates.longitude.toFixed(4)}`
                : 'Select location on map'}
            </Text>
          </TouchableOpacity>
          {errors.location && <Text style={styles.fieldError}>{errors.location}</Text>}
        </View>

        <Button
          title="Create Alert"
          variant="primary"
          onPress={handleSubmit}
          isLoading={isLoading || isUploading}
          fullWidth
          size="lg"
          style={styles.submitButton}
        />
      </ScrollView>

      {/* Location Modal */}
      {showLocationModal && (
        <View style={styles.modalOverlay}>
          <TouchableOpacity 
            style={styles.modalBackdrop} 
            activeOpacity={1}
            onPress={() => setShowLocationModal(false)} 
          />
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Location</Text>
              <TouchableOpacity onPress={() => setShowLocationModal(false)}>
                <X size={20} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <View style={styles.mapContainer}>
              <MapView
                ref={mapRef}
                style={styles.map}
                provider={PROVIDER_GOOGLE}
                region={{
                  latitude: tempCoordinates?.latitude ?? 10.3157,
                  longitude: tempCoordinates?.longitude ?? 123.9214,
                  latitudeDelta: 0.01,
                  longitudeDelta: 0.01,
                }}
                onPress={handleMapPress}
              >
                {tempCoordinates && (
                  <Marker
                    coordinate={{
                      latitude: tempCoordinates.latitude,
                      longitude: tempCoordinates.longitude,
                    }}
                  />
                )}
              </MapView>
            </View>
            <View style={styles.modalFooter}>
              <Text style={styles.modalHint}>Tap on the map to select a location</Text>
              <Button
                title="Confirm Location"
                variant="primary"
                onPress={handleConfirmLocation}
                fullWidth
              />
            </View>
          </View>
        </View>
      )}
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
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  typeCard: {
    width: '47%',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 8,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    gap: 4,
  },
  typeCardEmoji: {
    fontSize: 26,
    marginBottom: 2,
  },
  typeCardTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  typeCardSubtitle: {
    fontSize: 11,
    color: Colors.textSecondary,
    textAlign: 'center',
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
  locationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Colors.primaryBg,
    padding: 14,
    borderRadius: 10,
  },
  locationButtonText: {
    flex: 1,
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '500',
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
    padding: 20,
    paddingBottom: 34,
    height: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  mapContainer: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
  },
  map: {
    flex: 1,
  },
  modalFooter: {
    marginTop: 16,
    gap: 12,
  },
  modalHint: {
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  extraSection: {
    gap: 14,
    padding: 16,
    backgroundColor: Colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  extraSectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  fieldGroup: {
    gap: 8,
  },
  pillRow: {
    flexDirection: 'row',
    gap: 8,
  },
  pill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  pillSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryBg,
  },
  pillText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  pillTextSelected: {
    color: Colors.primary,
  },
  toggleRow: {
    flexDirection: 'row',
    gap: 10,
  },
  toggleChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  toggleChipOn: {
    borderColor: Colors.success,
    backgroundColor: '#ECFDF5',
  },
  toggleChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  toggleChipTextOn: {
    color: Colors.success,
  },

  // ── Multi-photo picker ────────────────────────────────────────────────────
  photosHeader:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  photosCount:         { fontSize: 12, color: Colors.textSecondary },
  photosRow:           { flexDirection: 'row', gap: 10, paddingVertical: 2 },
  photoThumb:          { width: 90, height: 90, borderRadius: 12, overflow: 'hidden', position: 'relative' },
  photoThumbImg:       { width: '100%', height: '100%' },
  photoThumbMainBadge: { position: 'absolute', bottom: 4, left: 4, backgroundColor: Colors.primary, borderRadius: 5, paddingHorizontal: 5, paddingVertical: 2 },
  photoThumbMainText:  { fontSize: 9, fontWeight: '700', color: Colors.surface },
  photoThumbRemove:    { position: 'absolute', top: 4, right: 4, width: 20, height: 20, borderRadius: 10, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center' },
  photoAddBtn:         { width: 90, height: 90, borderRadius: 12, backgroundColor: Colors.neutral100, borderWidth: 2, borderColor: Colors.neutral200, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center' },

  // photo source bottom sheet
  modalHandle:         { width: 36, height: 4, borderRadius: 2, backgroundColor: Colors.neutral300, alignSelf: 'center' as const, marginBottom: 12 },
  photoSourceSheet:    { backgroundColor: Colors.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingTop: 8, paddingBottom: Platform.OS === 'ios' ? 32 : 20 },
  photoSourceTitle:    { fontSize: 16, fontWeight: '700', color: Colors.textPrimary, textAlign: 'center', marginBottom: 16 },
  photoSourceOptions:  { flexDirection: 'row', justifyContent: 'space-around', paddingHorizontal: 16 },
  photoSourceBtn:      { alignItems: 'center', gap: 8, flex: 1 },
  photoSourceIcon:     { width: 64, height: 64, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  photoSourceLabel:    { fontSize: 13, fontWeight: '700', color: Colors.textPrimary, textAlign: 'center' },
  photoSourceSub:      { fontSize: 11, color: Colors.textSecondary, textAlign: 'center', lineHeight: 15 },

  // pet photos modal
  modalFullOverlay:    { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  petPhotosSheet:      { backgroundColor: Colors.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '80%' },
  petPhotosHeader:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.border },
  petPhotosGrid:       { padding: 8, gap: 4 },
  petPhotoCell:        { flex: 1, margin: 3, aspectRatio: 1, borderRadius: 10, overflow: 'hidden', position: 'relative' },
  petPhotoCellSelected:{ opacity: 0.85, borderWidth: 3, borderColor: Colors.primary },
  petPhotoCellImg:     { width: '100%', height: '100%' },
  petPhotoCellCheck:   { position: 'absolute', top: 4, right: 4, width: 22, height: 22, borderRadius: 11, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  petPhotosEmpty:      { textAlign: 'center', color: Colors.textSecondary, padding: 32, fontSize: 14, lineHeight: 22 },
  petPhotosFooter:     { padding: 16, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: Colors.border },
});