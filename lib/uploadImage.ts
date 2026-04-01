/**
 * lib/uploadImage.ts
 *
 * Uploads a local file URI to the backend's POST /api/uploads/image endpoint,
 * which proxies directly to Cloudinary via the pet-service.
 *
 * Usage:
 *   const url = await uploadImage(localUri, { folder: 'pets' });
 *   const url = await resolveImageUrl(maybeLocalUri, { folder: 'alerts' });
 */

import api from './api';

export type UploadFolder = 'pets' | 'alerts' | 'diaries' | 'sightings';

export interface UploadResult {
  url: string;
  publicId: string;
  width: number;
  height: number;
}

export interface UploadOptions {
  folder?: UploadFolder;
  /** Called with 0–100 as bytes are sent. */
  onProgress?: (percent: number) => void;
}

/**
 * Returns true if the URI is a local file that needs uploading.
 * Remote http/https URLs are already resolved and can be passed through.
 */
export function isLocalUri(uri: string): boolean {
  return (
    uri.startsWith('file://') ||
    uri.startsWith('content://') ||
    uri.startsWith('/')
  );
}

/**
 * Resolves a URI:
 *  - If already a remote URL → return as-is (no upload needed).
 *  - If a local file URI    → upload to Cloudinary and return the remote URL.
 *
 * Throws on upload failure. Returns undefined if uri is undefined.
 */
export async function resolveImageUrl(
  uri: string | undefined,
  options: UploadOptions = {}
): Promise<string | undefined> {
  if (!uri) return undefined;
  if (!isLocalUri(uri)) return uri;
  return uploadImage(uri, options);
}

/**
 * Uploads a local file URI to Cloudinary via the backend.
 * Returns the public Cloudinary HTTPS URL on success.
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
  // React Native FormData accepts this object shape for binary blobs
  formData.append('file', {
    uri: localUri,
    name: filename,
    type: mimeType,
  } as unknown as Blob);

  const response = await api.post<{ success: boolean; data: UploadResult }>(
    `/uploads/image?folder=${folder}`,
    formData,
    {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: onProgress
        ? (progressEvent) => {
            const total = progressEvent.total ?? 1;
            const percent = Math.round((progressEvent.loaded / total) * 100);
            onProgress(Math.min(percent, 99)); // cap at 99 until server confirms
          }
        : undefined,
      timeout: 60_000, // images can be large — longer timeout than the default
    }
  );

  if (!response.data?.data?.url) {
    throw new Error('Upload succeeded but no URL was returned from server');
  }

  onProgress?.(100);
  return response.data.data.url;
}