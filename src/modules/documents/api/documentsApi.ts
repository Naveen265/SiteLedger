import { supabase } from '@/lib/supabase/client';
import { unwrap } from '@/lib/supabase/errors';
import type { DocumentInput } from '@/lib/validation';
import type { SiteDocument } from '@/types/domain';

/**
 * Document reads and writes.
 * This is a store, not an enterprise document management system: no version
 * diffing, no markup and no approval workflow.
 */

/** Lists the company's documents, newest first. */
export async function fetchDocuments(companyId: string): Promise<SiteDocument[]> {
  return unwrap(
    await supabase
      .from('documents')
      .select('*, project:projects(id, name)')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false }),
  ) as SiteDocument[];
}

/** Records an uploaded file against a project and a visibility level. */
export async function createDocument(input: {
  values: DocumentInput;
  companyId: string;
  storagePath: string;
  sizeBytes: number;
  uploadedBy: string;
}): Promise<SiteDocument> {
  return unwrap(
    await supabase
      .from('documents')
      .insert({
        company_id: input.companyId,
        project_id: input.values.project_id ?? null,
        name: input.values.name,
        doc_type: input.values.doc_type,
        storage_path: input.storagePath,
        size_bytes: input.sizeBytes,
        uploaded_by: input.uploadedBy,
        visibility: input.values.visibility,
      })
      .select()
      .single(),
  ) as SiteDocument;
}
