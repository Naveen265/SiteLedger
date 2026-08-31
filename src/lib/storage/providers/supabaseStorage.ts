import { supabase } from '@/lib/supabase/client';
import { toUserMessage } from '@/lib/supabase/errors';
import type { StorageBucket, StorageProvider, UploadInput, UploadResult } from '../types';

/**
 * Supabase Storage provider.
 * Buckets are private; the interface renders images through short lived signed
 * URLs, so a photo is never readable by anyone outside the company.
 */

/** Signed URLs are cached for this long, comfortably inside their lifetime. */
const SIGNED_URL_TTL_SECONDS = 60 * 60;

/** In-memory cache so a list of thirty thumbnails does not sign thirty times. */
const urlCache = new Map<string, { url: string; expiresAt: number }>();

export const supabaseStorageProvider: StorageProvider = {
  id: 'supabase',

  /** Uploads the file and reports coarse progress around the network call. */
  async upload({ bucket, path, file, contentType, onProgress }: UploadInput): Promise<UploadResult> {
    onProgress?.(10);
    const { error } = await supabase.storage.from(bucket).upload(path, file, {
      contentType: contentType ?? (file instanceof File ? file.type : 'application/octet-stream'),
      upsert: true,
    });
    if (error) throw new Error(toUserMessage(error));
    onProgress?.(100);
    return { path, sizeBytes: file.size };
  },

  /** Signs a private object so an img tag can render it. */
  async getUrl(bucket: StorageBucket, path: string): Promise<string> {
    const key = `${bucket}/${path}`;
    const cached = urlCache.get(key);
    if (cached && cached.expiresAt > Date.now()) return cached.url;

    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(path, SIGNED_URL_TTL_SECONDS);
    if (error || !data) throw new Error(toUserMessage(error));

    urlCache.set(key, {
      url: data.signedUrl,
      // Expire the cache entry a minute early to avoid a race at the boundary.
      expiresAt: Date.now() + (SIGNED_URL_TTL_SECONDS - 60) * 1000,
    });
    return data.signedUrl;
  },

  /** Deletes an object, used when a user removes a photo before saving. */
  async remove(bucket: StorageBucket, path: string): Promise<void> {
    const { error } = await supabase.storage.from(bucket).remove([path]);
    if (error) throw new Error(toUserMessage(error));
  },
};
