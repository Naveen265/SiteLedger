import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query/keys';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { useTranslate } from '@/contexts/I18nContext';
import { toUserMessage } from '@/lib/supabase/errors';
import type { AssetInput } from '@/lib/validation';
import type { Asset, AssetCost } from '@/types/domain';
import type { AssetMovementType } from '@/types/enums';
import {
  fetchAsset, fetchAssetCosts, fetchAssetMovements, fetchAssets,
  moveAsset, recordAssetCost, saveAsset,
} from '../api/equipmentApi';

/** Reads the company's asset register. */
export function useAssets() {
  const { user } = useAuth();
  return useQuery({
    queryKey: queryKeys.assets(user?.company_id ?? ''),
    enabled: Boolean(user),
    queryFn: () => fetchAssets(user!.company_id),
  });
}

/** Reads one asset. */
export function useAsset(assetId: string | null) {
  return useQuery({
    queryKey: queryKeys.asset(assetId ?? ''),
    enabled: Boolean(assetId),
    queryFn: () => fetchAsset(assetId!),
  });
}

/** Reads an asset's full movement history. */
export function useAssetMovements(assetId: string | null) {
  return useQuery({
    queryKey: queryKeys.assetMovements(assetId ?? ''),
    enabled: Boolean(assetId),
    queryFn: () => fetchAssetMovements(assetId!),
  });
}

/** Reads rental and repair costs across the company. */
export function useAssetCosts() {
  const { user } = useAuth();
  return useQuery({
    queryKey: queryKeys.assetCosts(user?.company_id ?? ''),
    enabled: Boolean(user),
    queryFn: () => fetchAssetCosts(user!.company_id),
  });
}

/** Creates or updates an asset. */
export function useSaveAsset(assetId?: string) {
  const client = useQueryClient();
  const { user } = useAuth();
  const { notify } = useToast();
  const t = useTranslate();

  return useMutation({
    mutationFn: (input: AssetInput) => saveAsset(input, user!.company_id, assetId),
    onSuccess: (asset) => {
      void client.invalidateQueries({ queryKey: queryKeys.assets(user!.company_id) });
      void client.invalidateQueries({ queryKey: queryKeys.asset(asset.id) });
      notify(t('common.saved'), 'success');
    },
    onError: (error) => notify(toUserMessage(error), 'error'),
  });
}

/** Checks out, transfers, returns or sends an asset for repair. */
export function useMoveAsset() {
  const client = useQueryClient();
  const { user } = useAuth();
  const { notify } = useToast();
  const t = useTranslate();

  return useMutation({
    mutationFn: (input: {
      asset: Asset;
      movementType: AssetMovementType;
      toProjectId: string | null;
      conditionNote: string | null;
    }) => moveAsset({ ...input, movedBy: user!.id }),
    onSuccess: (_result, variables) => {
      void client.invalidateQueries({ queryKey: queryKeys.assets(user!.company_id) });
      void client.invalidateQueries({ queryKey: queryKeys.asset(variables.asset.id) });
      void client.invalidateQueries({ queryKey: queryKeys.assetMovements(variables.asset.id) });
      notify(t('common.saved'), 'success');
    },
    onError: (error) => notify(toUserMessage(error), 'error'),
  });
}

/** Records a rental, repair or transport cost against an asset. */
export function useRecordAssetCost() {
  const client = useQueryClient();
  const { user } = useAuth();
  const { notify } = useToast();
  const t = useTranslate();

  return useMutation({
    mutationFn: (input: {
      assetId: string;
      projectId: string | null;
      costType: AssetCost['cost_type'];
      amountRupees: number;
      incurredOn: string;
      note: string | null;
    }) => recordAssetCost(input),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: queryKeys.assetCosts(user!.company_id) });
      notify(t('common.saved'), 'success');
    },
    onError: (error) => notify(toUserMessage(error), 'error'),
  });
}
