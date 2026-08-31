import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils/cn';
import { resolveStorageUrl, type StorageBucket } from '@/lib/storage';
import { Skeleton } from '@/components/ui/Skeleton';

/**
 * Renders a photo held in private storage.
 * Storage paths are signed on demand and the signed URL is cached, so a grid
 * of thumbnails does not sign the same object repeatedly.
 */
export function StoredImage({
  bucket, path, alt, className,
}: {
  bucket: StorageBucket;
  path: string;
  alt: string;
  className?: string;
}) {
  const [url, setUrl] = useState<string | null>(null);
  const [hasFailed, setHasFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    resolveStorageUrl(bucket, path)
      .then((resolved) => { if (!cancelled) setUrl(resolved); })
      .catch(() => { if (!cancelled) setHasFailed(true); });
    return () => { cancelled = true; };
  }, [bucket, path]);

  if (hasFailed) {
    return (
      <div className={cn('flex items-center justify-center bg-surface-sunken text-2xs text-ink-faint', className)}>
        {alt}
      </div>
    );
  }

  if (!url) return <Skeleton className={className} />;

  return <img src={url} alt={alt} loading="lazy" className={cn('object-cover', className)} />;
}
