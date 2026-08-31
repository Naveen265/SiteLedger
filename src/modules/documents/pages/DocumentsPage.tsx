import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { FileUp, FolderOpen } from 'lucide-react';
import { PageHeader } from '@/components/patterns/PageHeader';
import { DataTable, type Column } from '@/components/patterns/DataTable';
import { FilterBar, FilterSelect } from '@/components/patterns/FilterBar';
import { Button } from '@/components/ui/Button';
import { StatusChip } from '@/components/ui/StatusChip';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslate } from '@/contexts/I18nContext';
import { useTableState } from '@/hooks/useTableState';
import { formatDate } from '@/lib/format/date';
import { resolveStorageUrl } from '@/lib/storage';
import { DOC_TYPES } from '@/types/enums';
import type { SiteDocument } from '@/types/domain';
import { useDocuments } from '../hooks/useDocuments';
import { UploadDocumentDialog } from '../components/UploadDocumentDialog';

/** Formats a byte count for display, in the unit that reads best. */
function formatBytes(bytes: number | null): string {
  if (!bytes) return '-';
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Documents: a store for drawings, contracts and certificates. */
export function DocumentsPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const t = useTranslate();
  const { can } = useAuth();
  const { data, isLoading, isError, refetch } = useDocuments();
  const [isUploadOpen, setIsUploadOpen] = useState(false);

  // Documents marked office only are hidden from anyone without that permission.
  const visible = useMemo(
    () =>
      (data ?? []).filter(
        (document) =>
          (!projectId || document.project_id === projectId || document.project_id === null) &&
          (document.visibility === 'project_team' || can('document.viewOfficeOnly')),
      ),
    [data, projectId, can],
  );

  const table = useTableState({
    rows: visible,
    searchFields: [(document) => document.name],
    initialSortKey: 'date',
    initialSortDirection: 'desc',
    comparators: {
      name: (a, b) => a.name.localeCompare(b.name),
      date: (a, b) => a.created_at.localeCompare(b.created_at),
    },
  });

  const rows = useMemo(() => {
    const type = table.filters.type ?? 'all';
    return table.rows.filter((document) => type === 'all' || document.doc_type === type);
  }, [table.rows, table.filters]);

  /** Opens a stored document in a new tab through a signed URL. */
  const open = async (document: SiteDocument) => {
    const url = await resolveStorageUrl('documents', document.storage_path);
    window.open(url, '_blank', 'noopener');
  };

  const columns = useMemo<Column<SiteDocument>[]>(
    () => [
      { key: 'name', header: t('common.name'), sortable: true, render: (d) => d.name },
      { key: 'type', header: t('documents.docType'), render: (d) => t(`documents.type.${d.doc_type}`) },
      {
        key: 'visibility', header: t('documents.visibility'), hideOnMobile: true,
        render: (d) => (
          <StatusChip
            label={d.visibility === 'office_only' ? t('documents.visibilityOffice') : t('documents.visibilityProject')}
            tone={d.visibility === 'office_only' ? 'info' : 'neutral'}
            size="sm"
          />
        ),
      },
      { key: 'size', header: t('common.total'), align: 'right', hideOnMobile: true, render: (d) => formatBytes(d.size_bytes) },
      { key: 'date', header: t('common.date'), align: 'right', sortable: true, render: (d) => formatDate(d.created_at) },
    ],
    [t],
  );

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title={t('documents.title')}
        actions={
          can('document.upload') && (
            <Button icon={<FileUp className="size-4" />} onClick={() => setIsUploadOpen(true)}>
              {t('documents.upload')}
            </Button>
          )
        }
      />

      <FilterBar
        search={table.search}
        onSearchChange={table.setSearch}
        hasActiveFilters={table.hasActiveFilters}
        onClear={table.clearFilters}
      >
        <FilterSelect
          label={t('documents.docType')}
          value={table.filters.type ?? 'all'}
          onChange={(value) => table.setFilter('type', value)}
          options={[
            { value: 'all', label: t('common.all') },
            ...DOC_TYPES.map((type) => ({ value: type, label: t(`documents.type.${type}`) })),
          ]}
        />
      </FilterBar>

      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(document) => document.id}
        isLoading={isLoading}
        isError={isError}
        onRetry={() => void refetch()}
        onRowClick={(document) => void open(document)}
        emptyMessage={t('documents.empty')}
        emptyAction={
          can('document.upload') && (
            <Button icon={<FolderOpen className="size-4" />} onClick={() => setIsUploadOpen(true)}>
              {t('documents.upload')}
            </Button>
          )
        }
        sortKey={table.sortKey}
        sortDirection={table.sortDirection}
        onSort={table.toggleSort}
        pagination={table}
      />

      <UploadDocumentDialog
        open={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        projectId={projectId ?? null}
      />
    </div>
  );
}
