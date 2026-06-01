import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  KeyboardAvoidingView, Platform, Switch, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import {
  ArrowLeft, MapPin, Plus, X, Clock,
  Facebook, Instagram, Globe, Phone, Mail,
} from 'lucide-react-native';
import { Colors } from '../../constants/colors';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { ImageUploader } from '../../components/ui/ImageUploader';
import { useToast } from '../../components/ui';
import { useLocation } from '../../hooks/useLocation';
import api from '../../lib/api';
import { uploadImage } from '../../lib/uploadImage';

// ── Constants ─────────────────────────────────────────────────────────────────

const SERVICE_TYPES = [
  { label: '🏥 Veterinary Clinic',    value: 'VET' },
  { label: '🚑 Emergency Vet',         value: 'VETERINARY_EMERGENCY' },
  { label: '✂️ Grooming Salon',        value: 'GROOMER' },
  { label: '🛍️ Pet Store',             value: 'PET_STORE' },
  { label: '🏨 Pet Hotel / Boarding',  value: 'PET_HOTEL' },
  { label: '🌞 Doggy Daycare',         value: 'DAYCARE' },
  { label: '🎓 Pet Trainer',           value: 'TRAINER' },
  { label: '💆 Pet Spa & Wellness',    value: 'SPA' },
  { label: '🏠 Animal Shelter',        value: 'SHELTER' },
  { label: '📸 Pet Photography',       value: 'PHOTOGRAPHY' },
  { label: '🚗 Pet Transportation',    value: 'TRANSPORTATION' },
  { label: '💊 Pet Pharmacy',          value: 'PHARMACY' },
] as const;

const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;
const DAY_LABELS: Record<string, string> = {
  mon: 'Mon', tue: 'Tue', wed: 'Wed', thu: 'Thu',
  fri: 'Fri', sat: 'Sat', sun: 'Sun',
};

const TAGS = [
  'Walk-in welcome', 'Appointment only', 'Mobile service',
  '24/7 Available', 'Pickup & delivery', 'Home visits',
];
const SPECIALTIES = [
  'Dogs', 'Cats', 'Birds', 'Rabbits', 'Exotic animals',
  'Senior pets', 'Puppies & kittens', 'Large breeds',
];

type ServiceTypeValue = typeof SERVICE_TYPES[number]['value'];

// ── Component ─────────────────────────────────────────────────────────────────

export default function CreateServiceScreen() {
  const router        = useRouter();
  const { showToast } = useToast();
  const { coordinates, getCurrentLocation } = useLocation();

  // Core fields
  const [name,        setName]        = useState('');
  const [type,        setType]        = useState<ServiceTypeValue>('VET');
  const [description, setDescription] = useState('');
  const [address,     setAddress]     = useState('');
  const [city,        setCity]        = useState('');
  const [phone,       setPhone]       = useState('');
  const [email,       setEmail]       = useState('');
  const [website,     setWebsite]     = useState('');
  const [facebook,    setFacebook]    = useState('');
  const [instagram,   setInstagram]   = useState('');
  const [logoUrl,     setLogoUrl]     = useState('');
  const [photos,      setPhotos]      = useState<string[]>([]);

  // Hours: day → "09:00-17:00" or undefined (closed)
  const [hoursEnabled, setHoursEnabled] = useState<Record<string, boolean>>({
    mon: true, tue: true, wed: true, thu: true, fri: true, sat: false, sun: false,
  });
  const [hoursValues, setHoursValues] = useState<Record<string, string>>({
    mon: '09:00-17:00', tue: '09:00-17:00', wed: '09:00-17:00',
    thu: '09:00-17:00', fri: '09:00-17:00', sat: '09:00-13:00', sun: '',
  });

  // Tags & specialties
  const [selectedTags,       setSelectedTags]       = useState<string[]>([]);
  const [selectedSpecialties,setSelectedSpecialties]= useState<string[]>([]);

  // Upload states
  const [isLogoUploading, setIsLogoUploading] = useState(false);
  const [uploadingIdx,    setUploadingIdx]    = useState<number | null>(null);
  const [isSubmitting,    setIsSubmitting]    = useState(false);
  const [errors,          setErrors]          = useState<Record<string, string>>({});

  const validate = () => {
    const e: Record<string, string> = {};
    if (!name.trim())    e.name    = 'Service name is required';
    if (!address.trim()) e.address = 'Address is required';
    if (!city.trim())    e.city    = 'City is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleUseLocation = async () => {
    const coords = coordinates ?? await getCurrentLocation();
    if (coords) {
      showToast({ type: 'success', title: 'Location captured', message: 'Your current coordinates will be used.' });
    } else {
      showToast({ type: 'error', title: 'Location unavailable', message: 'Please enable location permissions.' });
    }
  };

  const handleAddPhoto = async () => {
    if (photos.length >= 8) { Alert.alert('Limit reached', 'You can add up to 8 photos.'); return; }
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permission required', 'Allow photo library access.'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.85,
      selectionLimit: 8 - photos.length,
    });
    if (result.canceled || !result.assets.length) return;
    const idx = photos.length;
    setUploadingIdx(idx);
    try {
      const urls = await Promise.all(
        result.assets.map((a) => uploadImage(a.uri, { folder: 'pets' }))
      );
      setPhotos((prev) => [...prev, ...urls]);
    } catch {
      Alert.alert('Upload failed', 'Could not upload one or more photos.');
    } finally {
      setUploadingIdx(null);
    }
  };

  const toggleTag = (tag: string) =>
    setSelectedTags((p) => p.includes(tag) ? p.filter((t) => t !== tag) : [...p, tag]);
  const toggleSpecialty = (s: string) =>
    setSelectedSpecialties((p) => p.includes(s) ? p.filter((x) => x !== s) : [...p, s]);

  const buildOpeningHours = () => {
    const result: Record<string, string> = {};
    DAYS.forEach((d) => {
      if (hoursEnabled[d] && hoursValues[d]) result[d] = hoursValues[d];
    });
    return Object.keys(result).length ? result : undefined;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    if (isLogoUploading || uploadingIdx !== null) {
      showToast({ type: 'warning', title: 'Photos still uploading', message: 'Please wait a moment.' });
      return;
    }
    let lat = coordinates?.latitude;
    let lng = coordinates?.longitude;
    if (!lat || !lng) {
      const coords = await getCurrentLocation();
      lat = coords?.latitude;
      lng = coords?.longitude;
    }
    if (!lat || !lng) {
      showToast({ type: 'error', title: 'Location required', message: 'Enable location to pin your listing on the map.' });
      return;
    }
    setIsSubmitting(true);
    try {
      await api.post('/services', {
        name:         name.trim(),
        type,
        description:  description.trim() || undefined,
        address:      address.trim(),
        city:         city.trim(),
        phone:        phone.trim()    || undefined,
        email:        email.trim()    || undefined,
        website:      website.trim()  || undefined,
        facebook:     facebook.trim() || undefined,
        instagram:    instagram.trim()|| undefined,
        logoUrl:      logoUrl         || undefined,
        photos,
        openingHours: buildOpeningHours(),
        tags:         selectedTags,
        specialties:  selectedSpecialties,
        latitude:     lat,
        longitude:    lng,
      });
      showToast({
        type: 'success',
        title: 'Listing submitted!',
        message: 'Your business will appear once reviewed by our team.',
      });
      router.back();
    } catch (err) {
      showToast({ type: 'error', title: 'Submission failed', message: (err as { message?: string }).message ?? 'Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ArrowLeft size={20} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add Service Listing</Text>
        <View style={{ width: 36 }} />
      </View>

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

          {/* Logo */}
          <View style={styles.logoRow}>
            <ImageUploader
              value={logoUrl}
              onChange={setLogoUrl}
              folder="pets"
              shape="circle"
              width={80}
              height={80}
              onUploadStart={() => setIsLogoUploading(true)}
              onUploadEnd={() => setIsLogoUploading(false)}
            />
            <Text style={styles.logoHint}>Tap to add a logo</Text>
          </View>

          {/* Name */}
          <Input label="Business Name *" placeholder="e.g. PawsUp Veterinary Clinic" value={name}
            onChangeText={(v) => { setName(v); if (errors.name) setErrors((p) => ({ ...p, name: '' })); }}
            error={errors.name} />

          {/* Type */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Service Type *</Text>
            <View style={styles.typeGrid}>
              {SERVICE_TYPES.map((t) => (
                <TouchableOpacity key={t.value} style={[styles.typeChip, type === t.value && styles.typeChipOn]} onPress={() => setType(t.value)}>
                  <Text style={[styles.typeChipText, type === t.value && styles.typeChipTextOn]}>{t.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Description */}
          <Input label="Description (optional)" placeholder="What makes your business special? Services offered, experience, etc." value={description} onChangeText={setDescription} multiline numberOfLines={3} style={{ minHeight: 80, textAlignVertical: 'top' }} />

          {/* Location */}
          <Input label="Address *" placeholder="123 Mabini St, Cebu City" value={address}
            onChangeText={(v) => { setAddress(v); if (errors.address) setErrors((p) => ({ ...p, address: '' })); }}
            error={errors.address} />
          <Input label="City *" placeholder="e.g. Cebu City" value={city}
            onChangeText={(v) => { setCity(v); if (errors.city) setErrors((p) => ({ ...p, city: '' })); }}
            error={errors.city} />
          <TouchableOpacity style={[styles.locationBtn, coordinates && styles.locationBtnActive]} onPress={handleUseLocation}>
            <MapPin size={16} color={coordinates ? Colors.primary : Colors.textSecondary} />
            <Text style={[styles.locationBtnText, coordinates && styles.locationBtnTextActive]}>
              {coordinates ? '✓ Location captured for map pin' : 'Use my current location'}
            </Text>
          </TouchableOpacity>

          {/* Contact */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Contact Details</Text>
            <Input label="" placeholder="Phone number" value={phone} onChangeText={setPhone} keyboardType="phone-pad"
              leftIcon={<Phone size={16} color={Colors.textSecondary} />} />
            <Input label="" placeholder="Email address" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none"
              leftIcon={<Mail size={16} color={Colors.textSecondary} />} />
            <Input label="" placeholder="Website URL" value={website} onChangeText={setWebsite} autoCapitalize="none"
              leftIcon={<Globe size={16} color={Colors.textSecondary} />} />
            <Input label="" placeholder="Facebook page URL" value={facebook} onChangeText={setFacebook} autoCapitalize="none"
              leftIcon={<Facebook size={16} color={Colors.textSecondary} />} />
            <Input label="" placeholder="Instagram handle (@yourpage)" value={instagram} onChangeText={setInstagram} autoCapitalize="none"
              leftIcon={<Instagram size={16} color={Colors.textSecondary} />} />
          </View>

          {/* Opening Hours */}
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Clock size={14} color={Colors.primary} />
              <Text style={styles.sectionLabel}>Opening Hours</Text>
            </View>
            {DAYS.map((day) => (
              <View key={day} style={styles.hourRow}>
                <Switch
                  value={hoursEnabled[day]}
                  onValueChange={(v) => setHoursEnabled((p) => ({ ...p, [day]: v }))}
                  trackColor={{ false: Colors.neutral200, true: Colors.primaryBg }}
                  thumbColor={hoursEnabled[day] ? Colors.primary : Colors.neutral400}
                />
                <Text style={[styles.dayLabel, !hoursEnabled[day] && styles.dayLabelOff]}>{DAY_LABELS[day]}</Text>
                {hoursEnabled[day] ? (
                  <Input
                    label=""
                    placeholder="09:00-17:00"
                    value={hoursValues[day]}
                    onChangeText={(v) => setHoursValues((p) => ({ ...p, [day]: v }))}
                    style={styles.hourInput}
                    containerStyle={styles.hourInputContainer}
                  />
                ) : (
                  <Text style={styles.closedText}>Closed</Text>
                )}
              </View>
            ))}
          </View>

          {/* Tags */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Tags (optional)</Text>
            <View style={styles.chipRow}>
              {TAGS.map((t) => (
                <TouchableOpacity key={t} style={[styles.chip, selectedTags.includes(t) && styles.chipOn]} onPress={() => toggleTag(t)}>
                  <Text style={[styles.chipText, selectedTags.includes(t) && styles.chipTextOn]}>{t}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Specialties */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Specialties (optional)</Text>
            <View style={styles.chipRow}>
              {SPECIALTIES.map((s) => (
                <TouchableOpacity key={s} style={[styles.chip, selectedSpecialties.includes(s) && styles.chipOn]} onPress={() => toggleSpecialty(s)}>
                  <Text style={[styles.chipText, selectedSpecialties.includes(s) && styles.chipTextOn]}>{s}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Photos */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Photos (up to 8)</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.photosRow}>
              {photos.map((url, i) => (
                <View key={i} style={styles.photoThumb}>
                  <ImageUploader value={url} onChange={(u) => setPhotos((p) => p.map((x, j) => j === i ? u : x))} folder="pets" shape="rect" width={90} height={90} disabled />
                  <TouchableOpacity style={styles.photoRemove} onPress={() => setPhotos((p) => p.filter((_, j) => j !== i))}>
                    <X size={12} color={Colors.surface} />
                  </TouchableOpacity>
                </View>
              ))}
              {photos.length < 8 && (
                <TouchableOpacity style={styles.photoAdd} onPress={handleAddPhoto}>
                  <Plus size={24} color={Colors.neutral400} />
                </TouchableOpacity>
              )}
            </ScrollView>
          </View>

          <View style={styles.notice}>
            <Text style={styles.noticeText}>📋 Your listing will be reviewed by PetPal admin before going live. This usually takes 1–2 business days.</Text>
          </View>

          <Button title="Submit Listing" variant="primary" size="lg" fullWidth onPress={handleSubmit} isLoading={isSubmitting || isLogoUploading || uploadingIdx !== null} style={styles.submitBtn} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container:         { flex: 1, backgroundColor: Colors.background },
  flex:              { flex: 1 },
  header:            { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: Colors.surface, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.border },
  backBtn:           { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.neutral100, alignItems: 'center', justifyContent: 'center' },
  headerTitle:       { fontSize: 17, fontWeight: '700', color: Colors.textPrimary },
  content:           { padding: 20, gap: 16, paddingBottom: 40 },
  logoRow:           { alignItems: 'center', gap: 6 },
  logoHint:          { fontSize: 12, color: Colors.textSecondary },
  section:           { gap: 10 },
  sectionLabel:      { fontSize: 14, fontWeight: '700', color: Colors.textPrimary },
  sectionHeaderRow:  { flexDirection: 'row', alignItems: 'center', gap: 6 },
  typeGrid:          { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  typeChip:          { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.surface },
  typeChipOn:        { borderColor: Colors.primary, backgroundColor: Colors.primaryBg },
  typeChipText:      { fontSize: 13, fontWeight: '600', color: Colors.textSecondary },
  typeChipTextOn:    { color: Colors.primary },
  locationBtn:       { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: 12, backgroundColor: Colors.neutral50, borderWidth: 1, borderColor: Colors.border },
  locationBtnActive: { backgroundColor: Colors.primaryBg, borderColor: Colors.primary + '40' },
  locationBtnText:   { fontSize: 13, fontWeight: '600', color: Colors.textSecondary },
  locationBtnTextActive: { color: Colors.primary },
  hourRow:           { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dayLabel:          { width: 32, fontSize: 13, fontWeight: '600', color: Colors.textPrimary },
  dayLabelOff:       { color: Colors.neutral400 },
  hourInput:         { flex: 1 },
  hourInputContainer:{ flex: 1, marginBottom: 0 },
  closedText:        { flex: 1, fontSize: 13, color: Colors.neutral400, fontStyle: 'italic' },
  chipRow:           { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip:              { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 16, borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.surface },
  chipOn:            { borderColor: Colors.primary, backgroundColor: Colors.primaryBg },
  chipText:          { fontSize: 12, fontWeight: '600', color: Colors.textSecondary },
  chipTextOn:        { color: Colors.primary },
  photosRow:         { gap: 10, paddingVertical: 4 },
  photoThumb:        { position: 'relative' },
  photoRemove:       { position: 'absolute', top: 4, right: 4, width: 20, height: 20, borderRadius: 10, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center' },
  photoAdd:          { width: 90, height: 90, borderRadius: 10, borderWidth: 2, borderColor: Colors.neutral200, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.neutral50 },
  notice:            { backgroundColor: Colors.secondaryBg, borderRadius: 10, padding: 14, borderLeftWidth: 3, borderLeftColor: Colors.secondary },
  noticeText:        { fontSize: 13, color: Colors.secondary, lineHeight: 19 },
  submitBtn:         { marginTop: 8 },
});
