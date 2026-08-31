import { useCallback, useState } from 'react';
import { Camera, Loader2, X } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { uploadPhoto, type StorageBucket } from '@/lib/storage';
import { previewUrl } from '@/lib/storage/imageCompression';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { useTranslate } from '@/contexts/I18nContext';
import { toUserMessage } from '@/lib/supabase/errors';
import { IconButton } from '@/components/ui/IconButton';

/**
 * Camera-first photo capture.
 * The file input opens the rear camera on Android, images are compressed
 * before they leave the device, and each upload reports its own progress so a
 * slow connection looks like progress rather than a frozen screen.
 */

export type UploadedPhoto = { path: string; previewUrl: string };

export function PhotoUploader({
  bucket, scope, value, onChange, max = 6, label, className,
}: {
  bucket: StorageBucket;
  /** Folder inside the company prefix, for example "dpr" or "issues". */
  scope: string;
  value: UploadedPhoto[];
  onChange: (photos: UploadedPhoto[]) => void;
  max?: number;
  label?: string;
  className?: string;
}) {
  const { user } = useAuth();
  const { notify } = useToast();
  const t = useTranslate();
  const [uploadingCount, setUploadingCount] = useState(0);

  /** Compresses and uploads every picked file, keeping successful ones. */
  const onPick = useCallback(
    async (files: FileList | null) => {
      if (!files || !user) return;

      const room = max - value.length;
      const picked = Array.from(files).slice(0, room);
      if (picked.length === 0) return;

      setUploadingCount((count) => count + picked.length);

      const uploaded: UploadedPhoto[] = [];
      for (const file of picked) {
        try {
          const result = await uploadPhoto({
            companyId: user.company_id,
            bucket,
            scope,
            file,
          });
          uploaded.push({ path: result.path, previewUrl: previewUrl(file) });
        } catch (error) {
          notify(toUserMessage(error), 'error');
        } finally {
          setUploadingCount((count) => count - 1);
        }
      }

      if (uploaded.length > 0) onChange([...value, ...uploaded]);
    },
    [bucket, scope, value, max, onChange, user, notify],
  );

  /** Removes a photo from the pending list, before the parent record is saved. */
  const removeAt = (index: number) => onChange(value.filter((_, i) => i !== index));

  const isFull = value.length + uploadingCount >= max;

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      {label && <span className="text-xs font-medium text-ink">{label}</span>}

      <div className="flex flex-wrap gap-2">
        {value.map((photo, index) => (
          <div key={photo.path} className="relative size-20 overflow-hidden rounded-[var(--radius-control)] border border-border">
            <img src={photo.previewUrl} alt="" className="size-full object-cover" />
            <IconButton
              label={t('common.removePhoto')}
              icon={<X className="size-3" />}
              size="sm"
              onClick={() => removeAt(index)}
              className="absolute right-0.5 top-0.5 size-6 bg-surface/90 hover:bg-surface"
            />
          </div>
        ))}

        {Array.from({ length: uploadingCount }).map((_, index) => (
          <div
            key={`uploading-${index}`}
            className="flex size-20 items-center justify-center rounded-[var(--radius-control)] border border-dashed border-border bg-surface-subtle"
          >
            <Loader2 className="size-4 animate-spin text-ink-faint" aria-hidden />
          </div>
        ))}

        {!isFull && (
          <label
            className={cn(
              'flex size-20 cursor-pointer flex-col items-center justify-center gap-1',
              'rounded-[var(--radius-control)] border border-dashed border-border-strong',
              'text-2xs text-ink-muted hover:bg-surface-subtle',
            )}
          >
            <Camera className="size-5" aria-hidden />
            {t('common.addPhoto')}
            <input
              type="file"
              accept="image/*"
              // The capture attribute opens the camera directly on Android.
              capture="environment"
              multiple
              className="sr-only"
              onChange={(event) => {
                void onPick(event.target.files);
                event.target.value = '';
              }}
            />
          </label>
        )}
      </div>
    </div>
  );
}
