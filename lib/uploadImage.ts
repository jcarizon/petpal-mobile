/**
 * lib/uploadImage.ts
 *
 * Uploads a local file URI to the backend's /api/uploads/image endpoint,
 * which proxies directly to Cloudinary via the pet-service.
 *
 * Usage:
 *   const url = await uploadImage(localUri, 'pets');
 *
 * The function accepts an optional `onProgress` callback (0–100) so callers
 * can drive a progress indicator.
 */

import api from './api';
import { Config } from '../constants/config';

export type UploadFolder = 'pets' | 'alerts' | 'diaries' | 'sightings';

export interface UploadResult {
  url: string;
  publicId: string;
  width: number;
  height: number;
}

export interface UploadOptions {
  folder?: UploadFolder;
  /** Called with a value 0–100 as bytes are sent. */
  onProgress?: (percent: number) => void;
}

/**
 * Returns true if the URI is a local file (needs to be uploaded).
 * Remote URLs (http/https) are returned as-is.
 */
export function isLocalUri(uri: string): boolean {
  return uri.startsWith('file://') || uri.startsWith('content://') || uri.startsWith('/');
}

/**
 * Resolves a URI:
 * - If it's already a remote URL, return it immediately.
 * - If it's a local URI, upload it and return the Cloudinary URL.
 *
 * Throws on upload failure.
 */
export async function resolveImageUrl(
  uri: string | undefined,
  options: UploadOptions = {}
): Promise<string | undefined> {
  if (!uri) return undefined;
  if (!isLocalUri(uri)) return uri; // already a remote URL
  return uploadImage(uri, options);
}

/**
 * Uploads a local file URI to Cloudinary via the backend.
 * Returns the public Cloudinary URL on success.
 */
export async function uploadImage(
  localUri: string,
  options: UploadOptions = {}
): Promise<string> {
  const { folder = 'pets', onProgress } = options;

  // Derive filename and MIME type from the URI
  const filename = localUri.split('/').pop() ?? `upload_${Date.now()}.jpg`;
  const ext = filename.split('.').pop()?.toLowerCase() ?? 'jpg';
  const mimeMap: Record<string, string> = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp',
    gif: 'image/gif',
    heic: 'image/heic',
    heif: 'image/heif',
  };
  const mimeType = mimeMap[ext] ?? 'image/jpeg';

  const formData = new FormData();
  // React Native's FormData accepts this object shape for binary blobs
  formData.append('file', {
    uri: localUri,
    name: filename,
    type: mimeType,
  } as unknown as Blob);

  const response = await api.post<{
    success: boolean;
    data: UploadResult;
  }>(`/uploads/image?folder=${folder}`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    onUploadProgress: onProgress
      ? (progressEvent) => {
          const total = progressEvent.total ?? 1;
          const percent = Math.round((progressEvent.loaded / total) * 100);
          onProgress(Math.min(percent, 99)); // cap at 99 until server confirms
        }
      : undefined,
    timeout: 60_000, // images can be large — use a longer timeout
  });

  if (!response.data?.data?.url) {
    throw new Error('Upload succeeded but no URL was returned');
  }

  onProgress?.(100);
  return response.data.data.url;
}