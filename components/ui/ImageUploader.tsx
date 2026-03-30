/**
 * components/ui/ImageUploader.tsx
 *
 * Drop-in image picker + upload component.
 *
 * Props:
 *   value        — current image URI (local or remote)
 *   onChange     — called with the resolved Cloudinary URL after a successful upload
 *                  OR called with the local URI immediately so the UI feels responsive
 *   folder       — Cloudinary upload folder ('pets' | 'alerts' | 'diaries' | 'sightings')
 *   shape        — 'circle' (avatar) | 'rect' (banner/photo)
 *   placeholder  — content to render when no image is selected
 *   onUploadStart / onUploadEnd — lifecycle hooks so parent can disable Submit
 */

import React, { useState } from 'react';
import {
  View,
  Image,
  TouchableOpacity,
  StyleSheet,
  Text,
  ActivityIndicator,
  ViewStyle,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Camera, RefreshCw } from 'lucide-react-native';
import { Colors } from '../../constants/colors';
import { UploadFolder, resolveImageUrl } from '../../lib/uploadImage';

interface ImageUploaderProps {
  value?: string;
  onChange: (url: string) => void;
  folder?: UploadFolder;
  shape?: 'circle' | 'rect';
  width?: number;
  height?: number;
  placeholder?: React.ReactNode;
  onUploadStart?: () => void;
  onUploadEnd?: (error?: Error) => void;
  style?: ViewStyle;
  disabled?: boolean;
}

export function ImageUploader({
  value,
  onChange,
  folder = 'pets',
  shape = 'circle',
  width = 100,
  height = 100,
  placeholder,
  onUploadStart,
  onUploadEnd,
  style,
  disabled = false,
}: ImageUploaderProps) {
  const [progress, setProgress] = useState<number | null>(null);
  const isUploading = progress !== null;

  const handlePick = async () => {
    if (disabled || isUploading) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: shape === 'circle' ? [1, 1] : [4, 3],
      quality: 0.85,
    });

    if (result.canceled || !result.assets[0]) return;

    const localUri = result.assets[0].uri;

    // Show the local image immediately for snappy UX
    onChange(localUri);
    onUploadStart?.();
    setProgress(0);

    try {
      const remoteUrl = await resolveImageUrl(localUri, {
        folder,
        onProgress: (pct) => setProgress(pct),
      });

      if (remoteUrl) {
        onChange(remoteUrl);
      }
      onUploadEnd?.();
    } catch (err) {
      // Keep showing local URI but notify parent
      const error = err instanceof Error ? err : new Error('Upload failed');
      onUploadEnd?.(error);
    } finally {
      setProgress(null);
    }
  };

  const borderRadius = shape === 'circle' ? width / 2 : 12;

  return (
    <TouchableOpacity
      onPress={handlePick}
      activeOpacity={0.8}
      disabled={disabled || isUploading}
      style={[{ width, height }, style]}
    >
      <View style={[styles.wrapper, { width, height, borderRadius }]}>
        {value ? (
          <Image
            source={{ uri: value }}
            style={[styles.image, { borderRadius }]}
          />
        ) : placeholder ? (
          <View style={[styles.placeholder, { borderRadius }]}>{placeholder}</View>
        ) : (
          <View style={[styles.placeholder, { borderRadius }]}>
            <Camera size={24} color={Colors.textSecondary} />
            <Text style={styles.placeholderText}>Add Photo</Text>
          </View>
        )}

        {/* Uploading overlay */}
        {isUploading && (
          <View style={[styles.overlay, { borderRadius }]}>
            <ActivityIndicator size="small" color={Colors.textInverse} />
            <Text style={styles.progressText}>{progress}%</Text>
          </View>
        )}

        {/* Edit badge (when image exists and not uploading) */}
        {value && !isUploading && (
          <View style={styles.editBadge}>
            <RefreshCw size={10} color={Colors.textInverse} />
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    overflow: 'hidden',
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  placeholder: {
    width: '100%',
    height: '100%',
    backgroundColor: Colors.neutral100,
    borderWidth: 2,
    borderColor: Colors.border,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  placeholderText: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  progressText: {
    color: Colors.textInverse,
    fontSize: 12,
    fontWeight: '700',
  },
  editBadge: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
});