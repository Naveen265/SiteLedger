/**
 * The file storage contract.
 * Photos live in Supabase Storage today, which is free at the tier this
 * product starts on. Moving to S3 or Azure Blob later means writing one more
 * provider in this folder and changing VITE_STORAGE_PROVIDER. No screen, no
 * module and no query changes.
 */

/** Buckets the product writes to. Each maps to a policy in the database. */
export type StorageBucket =
  | 'task-photos'
  | 'dpr-photos'
  | 'issue-photos'
  | 'expense-receipts'
  | 'challans'
  | 'documents'
  | 'avatars'
  | 'asset-photos';

export type UploadInput = {
  bucket: StorageBucket;
  /** Path inside the bucket. Always starts with the company id for isolation. */
  path: string;
  file: File | Blob;
  contentType?: string;
  /** Called with 0 to 100 so the interface can show real upload progress. */
  onProgress?: (percent: number) => void;
};

export type UploadResult = { path: string; sizeBytes: number };

export interface StorageProvider {
  readonly id: string;
  /** Uploads a file and returns the stored path, never a public URL. */
  upload(input: UploadInput): Promise<UploadResult>;
  /** Resolves a stored path to a URL the browser can render. */
  getUrl(bucket: StorageBucket, path: string): Promise<string>;
  /** Removes a stored object. Used only when an upload is abandoned. */
  remove(bucket: StorageBucket, path: string): Promise<void>;
}
