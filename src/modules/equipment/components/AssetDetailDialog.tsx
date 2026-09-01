import { useMemo, useState } from 'react';
import { subDays } from 'date-fns';
import { ArrowRightLeft, LogOut, Undo2, Wrench } from 'lucide-react';
import { Dialog } from '@/components/ui/Dialog';
import { AsyncButton } from '@/components/ui/AsyncButton';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { StatusChip } from '@/components/ui/StatusChip';
import { MetricTile } from '@/components/patterns/MetricTile';
import { ListSkeleton } from '@/components/skeletons';
import { useProject } from '@/contexts/ProjectContext';
import { useTranslate } from '@/contexts/I18nContext';
import { useToast } from '@/contexts/ToastContext';
import { formatDate, formatDateTime } from '@/lib/format/date';
import { formatCount } from '@/lib/format/number';
import { calculateAssetUtilisation, calculateRentalDaysRemaining } from '@/lib/calc/equipment';
import type { AssetMovementType } from '@/types/enums';
import { useAsset, useAssetMovements, useMoveAsset } from '../hooks/useEquipment';

/**
 * Asset detail with its full movement history.
 * Every figure here comes from the movement log: days in use, days idle and
 * whether a rental is overdue. Nothing is a counter kept in sync by hand.
 */
export function AssetDetailDialog({
  assetId, onClose,
}: {
  assetId: string | null;
  onClose: () => void;
}) {
  const t = useTranslate();
  const { notify } = useToast();
  const { activeProjects } = useProject();
  const assetQuery = useAsset(assetId);
  const movementsQuery = useAssetMovements(assetId);
  const move = useMoveAsset();

  const [targetProjectId, setTargetProjectId] = useState('');
  const [conditionNote, setConditionNote] = useState('');

  const asset = assetQuery.data;
  const movements = useMemo(() => movementsQuery.data ?? [], [movementsQuery.data]);

  const utilisation = useMemo(
    () => (asset ? calculateAssetUtilisation(asset, movements, subDays(new Date(), 30)) : null),
    [asset, movements],
  );

  /**
   * Performs a movement, guarding against checking out an allocated asset.
   * Awaited so the button that was pressed stays busy until it settles; the
   * five buttons here share one mutation, so its pending flag cannot be used.
   */
  const performMove = async (movementType: AssetMovementType) => {
    if (!asset) return;

    if (movementType === 'checkout' && asset.current_project_id) {
      notify(t('equipment.alreadyAllocated'), 'error');
      return;
    }
    if ((movementType === 'checkout' || movementType === 'transfer') && !targetProjectId) {
      notify(t('errors.required'), 'error');
      return;
    }

    await move.mutateAsync({
      asset,
      movementType,
      toProjectId:
        movementType === 'checkout' || movementType === 'transfer' ? targetProjectId : null,
      conditionNote: conditionNote || null,
    });
    setConditionNote('');
  };

  const rentalRemaining = asset ? calculateRentalDaysRemaining(asset) : null;

  return (
    <Dialog
      open={Boolean(assetId)}
      onClose={onClose}
      title={asset?.name ?? t('equipment.title')}
      description={asset ? t(`equipment.type.${asset.asset_type}`) : undefined}
      size="lg"
    >
      {assetQuery.isLoading || !asset || !utilisation ? (
        <ListSkeleton rows={4} />
      ) : (
        <div className="flex flex-col gap-5">
          <div className="flex flex-wrap items-center gap-2">
            <StatusChip
              label={t(`equipment.status.${asset.status}`)}
              tone={asset.status === 'in_use' ? 'ontrack' : asset.status === 'under_repair' ? 'risk' : 'idle'}
            />
            <StatusChip label={t(`equipment.own.${asset.ownership}`)} tone="neutral" />
            {rentalRemaining !== null && rentalRemaining < 0 && (
              <StatusChip label={t('equipment.rentalOverdue')} tone="delayed" />
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <MetricTile
              label={t('equipment.daysInUse')}
              value={formatCount(utilisation.days_in_use)}
              explain="equipmentUtilisation"
            />
            <MetricTile
              label={t('equipment.idleDays')}
              value={formatCount(utilisation.current_idle_days)}
              explain="idleDays"
              tone={utilisation.is_idle_beyond_threshold ? 'risk' : 'default'}
            />
            <MetricTile
              label={t('equipment.currentSite')}
              value={asset.current_project?.name ?? '-'}
            />
          </div>

          {/* Movement controls. Which ones apply depends on where it is now. */}
          <div className="flex flex-col gap-3 rounded-[var(--radius-card)] border border-border p-3">
            <Select
              label={t('common.site')}
              placeholder={t('common.selectPlaceholder')}
              options={activeProjects.map((project) => ({ value: project.id, label: project.name }))}
              value={targetProjectId}
              onChange={(event) => setTargetProjectId(event.target.value)}
            />
            <Textarea
              label={t('equipment.conditionNote')}
              rows={2}
              value={conditionNote}
              onChange={(event) => setConditionNote(event.target.value)}
            />

            <div className="flex flex-wrap gap-2">
              {!asset.current_project_id && (
                <AsyncButton size="sm" icon={<LogOut className="size-3.5" />} onClick={() => performMove('checkout')}>
                  {t('equipment.checkOut')}
                </AsyncButton>
              )}
              {asset.current_project_id && (
                <AsyncButton
                  size="sm"
                  icon={<ArrowRightLeft className="size-3.5" />}
                  onClick={() => performMove('transfer')}
                >
                  {t('equipment.transfer')}
                </AsyncButton>
              )}
              <AsyncButton
                size="sm"
                variant="secondary"
                icon={<Undo2 className="size-3.5" />}
                onClick={() => performMove('return_to_yard')}
              >
                {t('equipment.returnToYard')}
              </AsyncButton>
              {asset.ownership === 'rented' && (
                <AsyncButton
                  size="sm"
                  variant="secondary"
                  onClick={() => performMove('return_to_vendor')}
                >
                  {t('equipment.returnToVendor')}
                </AsyncButton>
              )}
              <AsyncButton
                size="sm"
                variant="secondary"
                icon={<Wrench className="size-3.5" />}
                onClick={() => performMove(asset.status === 'under_repair' ? 'repair_in' : 'repair_out')}
              >
                {asset.status === 'under_repair'
                  ? t('equipment.markRepairDone')
                  : t('equipment.markUnderRepair')}
              </AsyncButton>
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs font-medium text-ink">{t('equipment.movementHistory')}</p>
            {movements.length === 0 ? (
              <p className="text-xs text-ink-muted">{t('reports.empty')}</p>
            ) : (
              <ol className="flex flex-col gap-2.5 border-l border-border pl-4">
                {[...movements].reverse().map((movement) => (
                  <li key={movement.id} className="relative">
                    <span className="absolute -left-[21px] top-1.5 size-2 rounded-full bg-primary" aria-hidden />
                    <p className="text-xs text-ink">
                      {t(`equipment.${movement.movement_type === 'checkout' ? 'checkOut' : movement.movement_type === 'transfer' ? 'transfer' : movement.movement_type === 'return_to_yard' ? 'returnToYard' : movement.movement_type === 'return_to_vendor' ? 'returnToVendor' : movement.movement_type === 'repair_out' ? 'markUnderRepair' : 'markRepairDone'}`)}
                      {movement.to_project?.name ? ` · ${movement.to_project.name}` : ''}
                    </p>
                    <p className="text-2xs text-ink-muted">{formatDateTime(movement.moved_at)}</p>
                    {movement.condition_note && (
                      <p className="measure mt-0.5 text-2xs text-ink-muted">{movement.condition_note}</p>
                    )}
                  </li>
                ))}
              </ol>
            )}
          </div>

          {asset.ownership === 'rented' && asset.rental_due_date && (
            <p className="text-2xs text-ink-muted">
              {t('equipment.rentalDue')}: {formatDate(asset.rental_due_date)}
              {rentalRemaining !== null && ` · ${formatCount(Math.abs(rentalRemaining))} ${t('common.days')}`}
            </p>
          )}
        </div>
      )}
    </Dialog>
  );
}
