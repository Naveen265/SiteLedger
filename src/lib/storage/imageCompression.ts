import imageCompression from 'browser-image-compression';
import { IMAGE_UPLOAD } from '@/config/constants';

/**
 * Client side image compression.
 * Site photos are taken on phones on bad networks. Compressing before upload
 * is the difference between a photo attaching in two seconds and a report the
 * engineer abandons.
 */

/** Compresses to the target longest edge and quality, returning a File. */
export async function compressImage(file: File): Promise<File> {
  // Anything already small enough is passed through untouched.
  if (file.size <= IMAGE_UPLOAD.maxSizeMB * 1024 * 1024) return file;

  try {
    return await imageCompression(file, {
      maxSizeMB: IMAGE_UPLOAD.maxSizeMB,
      maxWidthOrHeight: IMAGE_UPLOAD.maxWidthOrHeight,
      initialQuality: IMAGE_UPLOAD.quality,
      useWebWorker: true,
      fileType: 'image/jpeg',
    });
  } catch {
    // A compression failure must never block a capture. Upload the original.
    return file;
  }
}

/** Builds a local preview URL for a picked file, before it is uploaded. */
export function previewUrl(file: File): string {
  return URL.createObjectURL(file);
}
