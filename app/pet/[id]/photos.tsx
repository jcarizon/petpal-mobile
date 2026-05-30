import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Image, ActivityIndicator, Alert, ScrollView, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { ArrowLeft, Plus, X, ImageIcon } from 'lucide-react-native';
import { Colors } from '../../../constants/colors';
import { usePetStore } from '../../../store/petStore';
import { uploadImage } from '../../../lib/uploadImage';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GRID_PADDING = 16;
const GRID_GAP     = 10;
const COLS         = 3;
const CELL_SIZE    = (SCREEN_WIDTH - GRID_PADDING * 2 - GRID_GAP * (COLS - 1)) / COLS;
const MAX_PHOTOS   = 9;

export default function PetPhotosScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router  = useRouter();
  const { pets, selectedPet, addPetPhoto, deletePetPhoto, fetchPet } = usePetStore();

  const pet = selectedPet?.id === id ? selectedPet : pets.find((p) => p.id === id);

  const [uploading, setUploading]   = useState<Set<number>>(new Set());
  const [deleting,  setDeleting]    = useState<Set<string>>(new Set());

  // All photos: main avatar first, then gallery extras
  const allPhotos: Array<{ id: string; url: string; isMain: boolean }> = [
    ...(pet?.photoUrl ? [{ id: '__main__', url: pet.photoUrl, isMain: true }] : []),
    ...(pet?.photos ?? []).map((p) => ({ ...p, isMain: false })),
  ];

  // Build grid cells: filled photos + empty slots up to MAX_PHOTOS
  const cells = [
    ...allPhotos,
    ...Array(Math.max(0, MAX_PHOTOS - allPhotos.length)).fill(null),
  ].slice(0, MAX_PHOTOS);

  const requestPermission = async () => {
    const { status, canAskAgain } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status === 'granted') return true;
    if (!canAskAgain) {
      Alert.alert('Permission Required', 'Enable photo library access in Settings > PetPal > Photos.');
    }
    return false;
  };

  const handlePickMultiple = useCallback(async () => {
    if (!id) return;
    if (!(await requestPermission())) return;

    const remaining = MAX_PHOTOS - allPhotos.length;
    if (remaining <= 0) {
      Alert.alert('Gallery full', `You can add up to ${MAX_PHOTOS} photos.`);
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.85,
      selectionLimit: remaining,
    });

    if (result.canceled || !result.assets.length) return;

    const assets = result.assets.slice(0, remaining);
    const indices = assets.map((_, i) => allPhotos.length + i);
    setUploading(new Set(indices));

    try {
      await Promise.all(
        assets.map(async (asset, i) => {
          const url = await uploadImage(asset.uri, { folder: 'pets' });
          await addPetPhoto(id, url);
          setUploading((prev) => {
            const next = new Set(prev);
            next.delete(indices[i]);
            return next;
          });
        })
      );
      await fetchPet(id);
    } catch {
      Alert.alert('Upload failed', 'One or more photos could not be uploaded. Please try again.');
      setUploading(new Set());
    }
  }, [id, allPhotos.length, addPetPhoto, fetchPet]);

  const handleDeletePhoto = useCallback(async (photoId: string) => {
    if (!id || photoId === '__main__') return;
    Alert.alert('Remove photo', 'Remove this photo from the gallery?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          setDeleting((prev) => new Set(prev).add(photoId));
          try {
            await deletePetPhoto(id, photoId);
          } catch {
            Alert.alert('Error', 'Could not remove the photo.');
          } finally {
            setDeleting((prev) => { const s = new Set(prev); s.delete(photoId); return s; });
          }
        },
      },
    ]);
  }, [id, deletePetPhoto]);

  const isAddingAny = uploading.size > 0;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ArrowLeft size={20} color={Colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>{pet?.name ?? 'Pet'}'s Photos</Text>
          <Text style={styles.headerSub}>{allPhotos.length} / {MAX_PHOTOS} photos</Text>
        </View>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Photo grid */}
        <View style={styles.grid}>
          {cells.map((cell, index) => {
            const isUploading = uploading.has(index);

            if (!cell && !isUploading) {
              // Empty slot
              return (
                <TouchableOpacity
                  key={`empty-${index}`}
                  style={[styles.cell, styles.cellEmpty]}
                  onPress={handlePickMultiple}
                  activeOpacity={0.7}
                >
                  <Plus size={28} color={Colors.neutral300} strokeWidth={1.5} />
                </TouchableOpacity>
              );
            }

            if (isUploading) {
              return (
                <View key={`uploading-${index}`} style={[styles.cell, styles.cellUploading]}>
                  <ActivityIndicator color={Colors.primary} />
                  <Text style={styles.uploadingText}>Uploading…</Text>
                </View>
              );
            }

            const photo = cell as { id: string; url: string; isMain: boolean };
            const isDeleting = deleting.has(photo.id);

            return (
              <View key={photo.id} style={styles.cell}>
                <Image source={{ uri: photo.url }} style={styles.photo} resizeMode="cover" />
                {/* Main badge */}
                {photo.isMain && (
                  <View style={styles.mainBadge}>
                    <Text style={styles.mainBadgeText}>Main</Text>
                  </View>
                )}
                {/* Delete button (not for main photo) */}
                {!photo.isMain && (
                  <TouchableOpacity
                    style={styles.deleteBtn}
                    onPress={() => handleDeletePhoto(photo.id)}
                    disabled={isDeleting}
                  >
                    {isDeleting
                      ? <ActivityIndicator size="small" color={Colors.surface} />
                      : <X size={14} color={Colors.surface} strokeWidth={2.5} />}
                  </TouchableOpacity>
                )}
              </View>
            );
          })}
        </View>

        {/* Add photos button */}
        {allPhotos.length < MAX_PHOTOS && (
          <TouchableOpacity
            style={[styles.addBtn, isAddingAny && styles.addBtnDisabled]}
            onPress={handlePickMultiple}
            disabled={isAddingAny}
            activeOpacity={0.8}
          >
            {isAddingAny
              ? <ActivityIndicator color={Colors.surface} />
              : <ImageIcon size={20} color={Colors.surface} />}
            <Text style={styles.addBtnText}>
              {isAddingAny ? 'Uploading…' : `Add Photos from Gallery`}
            </Text>
          </TouchableOpacity>
        )}

        <Text style={styles.hint}>
          Tap any photo to view it · Tap + to add · Tap ✕ to remove
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:       { flex: 1, backgroundColor: Colors.background },
  header:          { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: Colors.surface, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.border },
  backBtn:         { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.neutral100, alignItems: 'center', justifyContent: 'center' },
  headerCenter:    { alignItems: 'center' },
  headerTitle:     { fontSize: 16, fontWeight: '700', color: Colors.textPrimary },
  headerSub:       { fontSize: 12, color: Colors.textSecondary, marginTop: 1 },
  content:         { paddingHorizontal: GRID_PADDING, paddingTop: 20, paddingBottom: 40, gap: 24 },
  grid:            { flexDirection: 'row', flexWrap: 'wrap', gap: GRID_GAP },
  cell:            { width: CELL_SIZE, height: CELL_SIZE, borderRadius: 14, overflow: 'hidden', position: 'relative' },
  cellEmpty:       { backgroundColor: Colors.neutral100, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: Colors.neutral200, borderStyle: 'dashed' },
  cellUploading:   { backgroundColor: Colors.neutral100, alignItems: 'center', justifyContent: 'center', gap: 6 },
  uploadingText:   { fontSize: 10, color: Colors.textSecondary },
  photo:           { width: '100%', height: '100%' },
  mainBadge:       { position: 'absolute', bottom: 6, left: 6, backgroundColor: Colors.primary, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3 },
  mainBadgeText:   { fontSize: 10, fontWeight: '700', color: Colors.surface },
  deleteBtn:       { position: 'absolute', top: 6, right: 6, width: 24, height: 24, borderRadius: 12, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center' },
  addBtn:          { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: Colors.primary, borderRadius: 14, paddingVertical: 15 },
  addBtnDisabled:  { opacity: 0.6 },
  addBtnText:      { fontSize: 15, fontWeight: '700', color: Colors.surface },
  hint:            { fontSize: 12, color: Colors.neutral400, textAlign: 'center' },
});
