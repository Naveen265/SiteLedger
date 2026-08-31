import { useState } from 'react';
import { Upload } from 'lucide-react';
import { Dialog } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Progress } from '@/components/ui/Progress';
import { useTranslate } from '@/contexts/I18nContext';
import { DOC_TYPES, DOC_VISIBILITIES } from '@/types/enums';
import type { DocType, DocVisibility } from '@/types/enums';
import { useUploadDocument } from '../hooks/useDocuments';

/**
 * Upload a document.
 * Progress is reported for real, because site connections drop and a large
 * drawing needs to look like it is moving rather than frozen.
 */
export function UploadDocumentDialog({
  open, onClose, projectId,
}: {
  open: boolean;
  onClose: () => void;
  projectId: string | null;
}) {
  const t = useTranslate();
  const upload = useUploadDocument();
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState('');
  const [docType, setDocType] = useState<DocType>('drawing');
  const [visibility, setVisibility] = useState<DocVisibility>('project_team');
  const [progress, setProgress] = useState(0);

  /** Uploads the file, then records it against the project. */
  const submit = async () => {
    if (!file) return;
    await upload.mutateAsync({
      values: { name: name || file.name, doc_type: docType, visibility, project_id: projectId },
      file,
      onProgress: setProgress,
    });
    setFile(null);
    setName('');
    setProgress(0);
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={t('documents.upload')}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>{t('common.cancel')}</Button>
          <Button onClick={() => void submit()} isLoading={upload.isPending} disabled={!file}>
            {t('common.upload')}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-[var(--radius-card)] border border-dashed border-border-strong p-6 text-center hover:bg-surface-subtle">
          <Upload className="size-6 text-ink-faint" aria-hidden />
          <span className="text-xs text-ink">{file ? file.name : t('documents.upload')}</span>
          <input
            type="file"
            className="sr-only"
            onChange={(event) => {
              const picked = event.target.files?.[0] ?? null;
              setFile(picked);
              if (picked && !name) setName(picked.name);
            }}
          />
        </label>

        <Input
          label={t('common.name')}
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
        <Select
          label={t('documents.docType')}
          options={DOC_TYPES.map((type) => ({ value: type, label: t(`documents.type.${type}`) }))}
          value={docType}
          onChange={(event) => setDocType(event.target.value as DocType)}
        />
        <Select
          label={t('documents.visibility')}
          options={DOC_VISIBILITIES.map((value) => ({
            value,
            label: value === 'office_only' ? t('documents.visibilityOffice') : t('documents.visibilityProject'),
          }))}
          value={visibility}
          onChange={(event) => setVisibility(event.target.value as DocVisibility)}
        />

        {upload.isPending && <Progress value={progress} />}
      </div>
    </Dialog>
  );
}
