import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query/keys';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { useTranslate } from '@/contexts/I18nContext';
import { toUserMessage } from '@/lib/supabase/errors';
import { uploadFile } from '@/lib/storage';
import type { DocumentInput } from '@/lib/validation';
import { createDocument, fetchDocuments } from '../api/documentsApi';

/** Reads the company's documents. */
export function useDocuments() {
  const { user } = useAuth();
  return useQuery({
    queryKey: queryKeys.documents(user?.company_id ?? ''),
    enabled: Boolean(user),
    queryFn: () => fetchDocuments(user!.company_id),
  });
}

/**
 * Uploads a file and records it.
 * The upload happens first so a failed transfer never leaves a document row
 * pointing at nothing.
 */
export function useUploadDocument() {
  const client = useQueryClient();
  const { user } = useAuth();
  const { notify } = useToast();
  const t = useTranslate();

  return useMutation({
    mutationFn: async ({ values, file, onProgress }: {
      values: DocumentInput;
      file: File;
      onProgress?: (percent: number) => void;
    }) => {
      const uploaded = await uploadFile({
        companyId: user!.company_id,
        bucket: 'documents',
        scope: 'documents',
        file,
        onProgress,
      });
      return createDocument({
        values,
        companyId: user!.company_id,
        storagePath: uploaded.path,
        sizeBytes: uploaded.sizeBytes,
        uploadedBy: user!.id,
      });
    },
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: queryKeys.documents(user!.company_id) });
      notify(t('common.saved'), 'success');
    },
    onError: (error) => notify(toUserMessage(error), 'error'),
  });
}
