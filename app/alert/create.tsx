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
} from 'react-native';
import { useRouter } from 'expo-router';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { ChevronDown, LocateFixed, Megaphone, PawPrint, Search, X, Check } from 'lucide-react-native';
import { Colors } from '../../constants/colors';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { ImageUploader, ScreenHeader, useToast } from '../../components/ui';
import { useCommunityStore } from '../../store/communityStore';
import { usePetStore } from '../../store/petStore';
import { useLocation } from '../../hooks/useLocation';
import { AlertType, CreateAlertRequest, Coordinates } from '../../types';

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
  // photoUrl is set to local URI immediately on pick, then replaced with
  // the Cloudinary URL once ImageUploader finishes uploading.
  const [photoUrl, setPhotoUrl] = useState<string | undefined>();
  const [isUploading, setIsUploading] = useState(false);
  const [errors, setErrors] = useState<{ title?: string; location?: string }>({});
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [tempCoordinates, setTempCoordinates] = useState<Coordinates | null>(coordinates);
  const mapRef = useRef<MapView>(null);

  useEffect(() => {
    fetchPets();
  }, [fetchPets]);

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
        if (pet.photoUrl) {
          setPhotoUrl(pet.photoUrl);
        }
      }
    } else if (!petId) {
      setDescription('');
      setPhotoUrl(undefined);
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
        // photoUrl is already a Cloudinary URL by the time we reach here.
        // ImageUploader handles the actual upload before calling onChange.
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

        {/* Alert photo — pick & upload handled by ImageUploader */}
        <View>
          <Text style={[styles.label, { marginBottom: 8 }]}>Photo (optional)</Text>
          <ImageUploader
            value={photoUrl}
            onChange={setPhotoUrl}
            folder="alerts"
            shape="rect"
            width={Dimensions.get('window').width - 40}
            height={200}
            onUploadStart={() => setIsUploading(true)}
            onUploadEnd={(err) => {
              setIsUploading(false);
              if (err) {
                showToast({
                  type: 'warning',
                  title: 'Photo upload failed',
                  message: 'Alert will be saved without a photo.',
                });
              }
            }}
          />
        </View>

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
});