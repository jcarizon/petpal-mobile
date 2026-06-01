import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  KeyboardAvoidingView, Platform, Alert, Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import {
  ArrowLeft, Trash2, Plus, X, Clock,
  Facebook, Instagram, Globe, Phone, Mail, MapPin,
} from 'lucide-react-native';
import { Colors } from '../../../constants/colors';
import { Input } from '../../../components/ui/Input';
import { Button } from '../../../components/ui/Button';
import { ImageUploader } from '../../../components/ui/ImageUploader';
import { Loading } from '../../../components/ui/Loading';
import { useToast } from '../../../components/ui';
import { useService } from '../../../hooks/useServices';
import api from '../../../lib/api';
import { uploadImage } from '../../../lib/uploadImage';

const SERVICE_TYPES = [
  { label: '🏥 Vet Clinic',          value: 'VET' },
  { label: '🚑 Emergency Vet',        value: 'VETERINARY_EMERGENCY' },
  { label: '✂️ Grooming',             value: 'GROOMER' },
  { label: '🛍️ Pet Store',            value: 'PET_STORE' },
  { label: '🏨 Pet Hotel',            value: 'PET_HOTEL' },
  { label: '🌞 Daycare',              value: 'DAYCARE' },
  { label: '🎓 Trainer',              value: 'TRAINER' },
  { label: '💆 Spa',                  value: 'SPA' },
  { label: '🏠 Shelter',              value: 'SHELTER' },
  { label: '📸 Photography',          value: 'PHOTOGRAPHY' },
  { label: '🚗 Transportation',       value: 'TRANSPORTATION' },
  { label: '💊 Pharmacy',             value: 'PHARMACY' },
] as const;

const DAYS    = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;
const DAY_LBL: Record<string, string> = { mon:'Mon', tue:'Tue', wed:'Wed', thu:'Thu', fri:'Fri', sat:'Sat', sun:'Sun' };
const TAGS        = ['Walk-in welcome','Appointment only','Mobile service','24/7 Available','Pickup & delivery','Home visits'];
const SPECIALTIES = ['Dogs','Cats','Birds','Rabbits','Exotic animals','Senior pets','Puppies & kittens','Large breeds'];

const TO_BACKEND: Record<string, string> = {
  vet:'VET', emergency_vet:'VETERINARY_EMERGENCY', groomer:'GROOMER', pet_store:'PET_STORE',
  pet_shop:'PET_STORE', pet_hotel:'PET_HOTEL', boarding:'PET_HOTEL', daycare:'DAYCARE',
  trainer:'TRAINER', park:'TRAINER', spa:'SPA', shelter:'SHELTER',
  photography:'PHOTOGRAPHY', transportation:'TRANSPORTATION', pharmacy:'PHARMACY', other:'TRAINER',
};

export default function EditServiceScreen() {
  const { id }    = useLocalSearchParams<{ id: string }>();
  const router    = useRouter();
  const { showToast } = useToast();
  const { service, isLoading } = useService(id);

  const [name,        setName]        = useState('');
  const [type,        setType]        = useState('VET');
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
  const [hoursEnabled, setHoursEnabled] = useState<Record<string, boolean>>({
    mon:true, tue:true, wed:true, thu:true, fri:true, sat:false, sun:false,
  });
  const [hoursValues, setHoursValues] = useState<Record<string, string>>({
    mon:'09:00-17:00', tue:'09:00-17:00', wed:'09:00-17:00',
    thu:'09:00-17:00', fri:'09:00-17:00', sat:'09:00-13:00', sun:'',
  });
  const [selectedTags,        setSelectedTags]        = useState<string[]>([]);
  const [selectedSpecialties, setSelectedSpecialties] = useState<string[]>([]);
  const [isLogoUploading,  setIsLogoUploading]  = useState(false);
  const [uploadingIdx,     setUploadingIdx]      = useState<number | null>(null);
  const [isSubmitting,     setIsSubmitting]      = useState(false);
  const [isDeleting,       setIsDeleting]        = useState(false);

  // Pre-fill from fetched service
  useEffect(() => {
    if (!service) return;
    setName(service.name);
    setType(TO_BACKEND[service.type] ?? 'VET');
    setDescription(service.description ?? '');
    setAddress(service.address);
    setCity(service.city);
    setPhone(service.phone ?? '');
    setEmail(service.email ?? '');
    setWebsite(service.website ?? '');
    setFacebook(service.facebook ?? '');
    setInstagram(service.instagram ?? '');
    setLogoUrl(service.logoUrl ?? '');
    setPhotos(service.photos ?? []);
    setSelectedTags(service.tags ?? []);
    setSelectedSpecialties(service.specialties ?? []);
    if (service.openingHours) {
      const enabled: Record<string, boolean> = {};
      const values:  Record<string, string>  = {};
      DAYS.forEach((d) => {
        enabled[d] = !!service.openingHours![d];
        values[d]  = service.openingHours![d] ?? '';
      });
      setHoursEnabled(enabled);
      setHoursValues(values);
    }
  }, [service]);

  if (isLoading) return <Loading fullScreen />;

  const buildHours = () => {
    const r: Record<string, string> = {};
    DAYS.forEach((d) => { if (hoursEnabled[d] && hoursValues[d]) r[d] = hoursValues[d]; });
    return Object.keys(r).length ? r : undefined;
  };

  const handleAddPhoto = async () => {
    if (photos.length >= 8) { Alert.alert('Limit reached', 'Up to 8 photos allowed.'); return; }
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsMultipleSelection: true,
      quality: 0.85, selectionLimit: 8 - photos.length,
    });
    if (result.canceled || !result.assets.length) return;
    setUploadingIdx(photos.length);
    try {
      const urls = await Promise.all(result.assets.map((a) => uploadImage(a.uri, { folder: 'pets' })));
      setPhotos((p) => [...p, ...urls]);
    } catch { Alert.alert('Upload failed'); } finally { setUploadingIdx(null); }
  };

  const handleSave = async () => {
    if (!name.trim() || !address.trim() || !city.trim()) {
      showToast({ type: 'error', title: 'Missing fields', message: 'Name, address and city are required.' });
      return;
    }
    setIsSubmitting(true);
    try {
      await api.put(`/services/${id}`, {
        name: name.trim(), type, description: description.trim() || undefined,
        address: address.trim(), city: city.trim(),
        phone: phone.trim() || undefined, email: email.trim() || undefined,
        website: website.trim() || undefined, facebook: facebook.trim() || undefined,
        instagram: instagram.trim() || undefined, logoUrl: logoUrl || undefined,
        photos, openingHours: buildHours(), tags: selectedTags, specialties: selectedSpecialties,
      });
      showToast({ type: 'success', title: 'Listing updated!', message: 'Your changes have been saved.' });
      router.back();
    } catch (err) {
      showToast({ type: 'error', title: 'Update failed', message: (err as { message?: string }).message ?? 'Please try again.' });
    } finally { setIsSubmitting(false); }
  };

  const handleDelete = () => {
    Alert.alert('Delete Listing', 'Are you sure you want to permanently delete this listing? This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        setIsDeleting(true);
        try {
          await api.delete(`/services/${id}`);
          showToast({ type: 'success', title: 'Listing deleted' });
          router.replace('/service/my-listings');
        } catch (err) {
          showToast({ type: 'error', title: 'Delete failed', message: (err as { message?: string }).message ?? 'Please try again.' });
          setIsDeleting(false);
        }
      }},
    ]);
  };

  const toggle = (arr: string[], setArr: (a: string[]) => void, val: string) =>
    setArr(arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ArrowLeft size={20} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Listing</Text>
        <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete} disabled={isDeleting}>
          <Trash2 size={18} color={Colors.error} />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

          <View style={styles.logoRow}>
            <ImageUploader value={logoUrl} onChange={setLogoUrl} folder="pets" shape="circle" width={80} height={80} onUploadStart={() => setIsLogoUploading(true)} onUploadEnd={() => setIsLogoUploading(false)} />
          </View>

          <Input label="Business Name *" value={name} onChangeText={setName} placeholder="Service name" />

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Service Type</Text>
            <View style={styles.chipRow}>
              {SERVICE_TYPES.map((t) => (
                <TouchableOpacity key={t.value} style={[styles.chip, type === t.value && styles.chipOn]} onPress={() => setType(t.value)}>
                  <Text style={[styles.chipText, type === t.value && styles.chipTextOn]}>{t.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <Input label="Description" value={description} onChangeText={setDescription} placeholder="About your service" multiline numberOfLines={3} style={{ minHeight: 80, textAlignVertical: 'top' }} />
          <Input label="Address *" value={address} onChangeText={setAddress} placeholder="Street address" />
          <Input label="City *" value={city} onChangeText={setCity} placeholder="City" />

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Contact</Text>
            <Input label="" value={phone} onChangeText={setPhone} placeholder="Phone" keyboardType="phone-pad" leftIcon={<Phone size={15} color={Colors.textSecondary} />} />
            <Input label="" value={email} onChangeText={setEmail} placeholder="Email" keyboardType="email-address" autoCapitalize="none" leftIcon={<Mail size={15} color={Colors.textSecondary} />} />
            <Input label="" value={website} onChangeText={setWebsite} placeholder="Website" autoCapitalize="none" leftIcon={<Globe size={15} color={Colors.textSecondary} />} />
            <Input label="" value={facebook} onChangeText={setFacebook} placeholder="Facebook URL" autoCapitalize="none" leftIcon={<Facebook size={15} color={Colors.textSecondary} />} />
            <Input label="" value={instagram} onChangeText={setInstagram} placeholder="Instagram (@handle)" autoCapitalize="none" leftIcon={<Instagram size={15} color={Colors.textSecondary} />} />
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}><Clock size={14} color={Colors.primary} /><Text style={styles.sectionLabel}>Opening Hours</Text></View>
            {DAYS.map((day) => (
              <View key={day} style={styles.hourRow}>
                <Switch value={hoursEnabled[day]} onValueChange={(v) => setHoursEnabled((p) => ({ ...p, [day]: v }))} trackColor={{ false: Colors.neutral200, true: Colors.primaryBg }} thumbColor={hoursEnabled[day] ? Colors.primary : Colors.neutral400} />
                <Text style={[styles.dayLabel, !hoursEnabled[day] && styles.dayLabelOff]}>{DAY_LBL[day]}</Text>
                {hoursEnabled[day] ? (
                  <Input label="" placeholder="09:00-17:00" value={hoursValues[day]} onChangeText={(v) => setHoursValues((p) => ({ ...p, [day]: v }))} style={styles.hourInput} containerStyle={styles.hourContainer} />
                ) : <Text style={styles.closedText}>Closed</Text>}
              </View>
            ))}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Tags</Text>
            <View style={styles.chipRow}>{TAGS.map((t) => <TouchableOpacity key={t} style={[styles.chip, selectedTags.includes(t) && styles.chipOn]} onPress={() => toggle(selectedTags, setSelectedTags, t)}><Text style={[styles.chipText, selectedTags.includes(t) && styles.chipTextOn]}>{t}</Text></TouchableOpacity>)}</View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Specialties</Text>
            <View style={styles.chipRow}>{SPECIALTIES.map((s) => <TouchableOpacity key={s} style={[styles.chip, selectedSpecialties.includes(s) && styles.chipOn]} onPress={() => toggle(selectedSpecialties, setSelectedSpecialties, s)}><Text style={[styles.chipText, selectedSpecialties.includes(s) && styles.chipTextOn]}>{s}</Text></TouchableOpacity>)}</View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Photos (up to 8)</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.photosRow}>
              {photos.map((url, i) => (
                <View key={i} style={styles.photoThumb}>
                  <ImageUploader value={url} onChange={(u) => setPhotos((p) => p.map((x, j) => j === i ? u : x))} folder="pets" shape="rect" width={90} height={90} disabled />
                  <TouchableOpacity style={styles.photoRemove} onPress={() => setPhotos((p) => p.filter((_, j) => j !== i))}><X size={12} color={Colors.surface} /></TouchableOpacity>
                </View>
              ))}
              {photos.length < 8 && (
                <TouchableOpacity style={styles.photoAdd} onPress={handleAddPhoto}><Plus size={24} color={Colors.neutral400} /></TouchableOpacity>
              )}
            </ScrollView>
          </View>

          <Button title="Save Changes" variant="primary" size="lg" fullWidth onPress={handleSave} isLoading={isSubmitting || isLogoUploading || uploadingIdx !== null} style={styles.saveBtn} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:      { flex: 1, backgroundColor: Colors.background },
  flex:           { flex: 1 },
  header:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: Colors.surface, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.border },
  backBtn:        { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.neutral100, alignItems: 'center', justifyContent: 'center' },
  headerTitle:    { fontSize: 17, fontWeight: '700', color: Colors.textPrimary },
  deleteBtn:      { width: 36, height: 36, borderRadius: 18, backgroundColor: '#FEF2F2', alignItems: 'center', justifyContent: 'center' },
  content:        { padding: 20, gap: 16, paddingBottom: 40 },
  logoRow:        { alignItems: 'center' },
  section:        { gap: 10 },
  sectionLabel:   { fontSize: 14, fontWeight: '700', color: Colors.textPrimary },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  chipRow:        { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip:           { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 16, borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.surface },
  chipOn:         { borderColor: Colors.primary, backgroundColor: Colors.primaryBg },
  chipText:       { fontSize: 12, fontWeight: '600', color: Colors.textSecondary },
  chipTextOn:     { color: Colors.primary },
  hourRow:        { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dayLabel:       { width: 32, fontSize: 13, fontWeight: '600', color: Colors.textPrimary },
  dayLabelOff:    { color: Colors.neutral400 },
  hourInput:      { flex: 1 },
  hourContainer:  { flex: 1, marginBottom: 0 },
  closedText:     { flex: 1, fontSize: 13, color: Colors.neutral400, fontStyle: 'italic' },
  photosRow:      { gap: 10, paddingVertical: 4 },
  photoThumb:     { position: 'relative' },
  photoRemove:    { position: 'absolute', top: 4, right: 4, width: 20, height: 20, borderRadius: 10, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center' },
  photoAdd:       { width: 90, height: 90, borderRadius: 10, borderWidth: 2, borderColor: Colors.neutral200, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.neutral50 },
  saveBtn:        { marginTop: 8 },
});
