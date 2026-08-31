import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query/keys';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { useTranslate } from '@/contexts/I18nContext';
import { toUserMessage } from '@/lib/supabase/errors';
import type { MaterialItemInput, MaterialRequestInput, StockIssueInput } from '@/lib/validation';
import {
  createMaterialRequest, decideMaterialRequest, fetchMaterialItems, fetchMaterialRequests,
  fetchPendingRequests, fetchStockMovements, issueStock, saveMaterialItem,
} from '../api/materialsApi';

/** Reads the company's material master. */
export function useMaterialItems() {
  const { user } = useAuth();
  return useQuery({
    queryKey: queryKeys.materialItems(user?.company_id ?? ''),
    enabled: Boolean(user),
    queryFn: () => fetchMaterialItems(user!.company_id),
  });
}

/** Reads the requests raised on a project. */
export function useMaterialRequests(projectId: string | null) {
  return useQuery({
    queryKey: queryKeys.materialRequests(projectId ?? ''),
    enabled: Boolean(projectId),
    queryFn: () => fetchMaterialRequests(projectId!),
  });
}

/** Reads requests awaiting action across every project the user can see. */
export function usePendingRequests(projectIds: string[]) {
  return useQuery({
    queryKey: ['materialRequests', 'pending', ...projectIds],
    enabled: projectIds.length > 0,
    queryFn: () => fetchPendingRequests(projectIds),
  });
}

/** Reads the movement ledger for a project. */
export function useStockMovements(projectId: string | null) {
  return useQuery({
    queryKey: queryKeys.stockMovements(projectId ?? ''),
    enabled: Boolean(projectId),
    queryFn: () => fetchStockMovements(projectId!),
  });
}

/** Creates or updates a material item. */
export function useSaveMaterialItem(itemId?: string) {
  const client = useQueryClient();
  const { user } = useAuth();
  const { notify } = useToast();
  const t = useTranslate();

  return useMutation({
    mutationFn: (input: MaterialItemInput) => saveMaterialItem(input, user!.company_id, itemId),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: queryKeys.materialItems(user!.company_id) });
      notify(t('common.saved'), 'success');
    },
    onError: (error) => notify(toUserMessage(error), 'error'),
  });
}

/** Raises a material request from site. */
export function useCreateMaterialRequest(projectId: string) {
  const client = useQueryClient();
  const { user } = useAuth();
  const { notify } = useToast();
  const t = useTranslate();

  return useMutation({
    mutationFn: (input: MaterialRequestInput) => createMaterialRequest(input, projectId, user!.id),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: queryKeys.materialRequests(projectId) });
      void client.invalidateQueries({ queryKey: ['materialRequests', 'pending'] });
      notify(t('common.saved'), 'success');
    },
    onError: (error) => notify(toUserMessage(error), 'error'),
  });
}

/** Approves or rejects a request. */
export function useDecideRequest(projectId?: string) {
  const client = useQueryClient();
  const { user } = useAuth();
  const { notify } = useToast();
  const t = useTranslate();

  return useMutation({
    mutationFn: ({ requestId, decision, reason }: {
      requestId: string;
      decision: 'approved' | 'rejected';
      reason?: string;
    }) => decideMaterialRequest(requestId, decision, user!.id, reason),
    onSuccess: () => {
      if (projectId) {
        void client.invalidateQueries({ queryKey: queryKeys.materialRequests(projectId) });
      }
      void client.invalidateQueries({ queryKey: ['materialRequests', 'pending'] });
      notify(t('common.saved'), 'success');
    },
    onError: (error) => notify(toUserMessage(error), 'error'),
  });
}

/** Issues stock from store to site. */
export function useIssueStock(projectId: string) {
  const client = useQueryClient();
  const { user } = useAuth();
  const { notify } = useToast();
  const t = useTranslate();

  return useMutation({
    mutationFn: (input: StockIssueInput) => issueStock(input, projectId, user!.id),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: queryKeys.stockMovements(projectId) });
      notify(t('common.saved'), 'success');
    },
    onError: (error) => notify(toUserMessage(error), 'error'),
  });
}
