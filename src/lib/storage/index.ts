import { env } from '@/config/env';
import { newId } from '@/lib/utils/id';
import { supabaseStorageProvider } from './providers/supabaseStorage';
import { compressImage } from './imageCompression';
import type { StorageBucket, StorageProvider, UploadResult } from './types';

/** Providers available to the app, keyed by the value of VITE_STORAGE_PROVIDER. */
const PROVIDERS: Record<string, StorageProvider> = {
  supabase: supabaseStorageProvider,
};

/** Returns the configured storage provider. */
export function getStorageProvider(): StorageProvider {
  return PROVIDERS[env.storageProvider] ?? supabaseStorageProvider;
}

/**
 * Builds a storage path that starts with the company id.
 * Prefixing by tenant is what lets one storage policy isolate every company.
 */
export function buildStoragePath(companyId: string, scope: string, filename: string): string {
  const extension = filename.includes('.') ? filename.split('.').pop() : 'jpg';
  return `${companyId}/${scope}/${newId()}.${extension}`;
}

/**
 * The single entry point for uploading a photo.
 * Compresses first, then hands the result to whichever provider is configured.
 */
export async function uploadPhoto(input: {
  companyId: string;
  bucket: StorageBucket;
  scope: string;
  file: File;
  onProgress?: (percent: number) => void;
}): Promise<UploadResult> {
  const compressed = await compressImage(input.file);
  const path = buildStoragePath(input.companyId, input.scope, input.file.name);
  return getStorageProvider().upload({
    bucket: input.bucket,
    path,
    file: compressed,
    contentType: compressed.type,
    onProgress: input.onProgress,
  });
}

/**
 * Uploads a non-image file such as a drawing or an invoice PDF.
 * Compression is skipped, everything else is identical.
 */
export async function uploadFile(input: {
  companyId: string;
  bucket: StorageBucket;
  scope: string;
  file: File;
  onProgress?: (percent: number) => void;
}): Promise<UploadResult> {
  const path = buildStoragePath(input.companyId, input.scope, input.file.name);
  return getStorageProvider().upload({
    bucket: input.bucket,
    path,
    file: input.file,
    contentType: input.file.type,
    onProgress: input.onProgress,
  });
}

/** Resolves a stored path to a renderable URL. */
export function resolveStorageUrl(bucket: StorageBucket, path: string): Promise<string> {
  return getStorageProvider().getUrl(bucket, path);
}

export { compressImage, previewUrl } from './imageCompression';
export type { StorageBucket, StorageProvider, UploadResult } from './types';
