import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query/keys';
import { useAuth } from '@/contexts/AuthContext';
import { useCompany } from '@/contexts/CompanyContext';
import { useToast } from '@/contexts/ToastContext';
import { useTranslate } from '@/contexts/I18nContext';
import { toUserMessage } from '@/lib/supabase/errors';
import { needsApproval } from '@/lib/calc/spend';
import { rupeesToPaise } from '@/lib/format/currency';
import type { GoodsReceiptInput, PurchaseOrderInput, VendorInput } from '@/lib/validation';
import {
  approvePurchaseOrder, createPurchaseOrder, createVendor, fetchGoodsReceipts,
  fetchPurchaseOrder, fetchPurchaseOrders, fetchVendors, recordGoodsReceipt,
} from '../api/procurementApi';

/** Reads the company's vendors. */
export function useVendors() {
  const { user } = useAuth();
  return useQuery({
    queryKey: queryKeys.vendors(user?.company_id ?? ''),
    enabled: Boolean(user),
    queryFn: () => fetchVendors(user!.company_id),
  });
}

/** Reads the company's purchase orders. */
export function usePurchaseOrders() {
  const { user } = useAuth();
  return useQuery({
    queryKey: queryKeys.purchaseOrders(user?.company_id ?? ''),
    enabled: Boolean(user),
    queryFn: () => fetchPurchaseOrders(user!.company_id),
  });
}

/** Reads one purchase order. */
export function usePurchaseOrder(poId: string | null) {
  return useQuery({
    queryKey: queryKeys.purchaseOrder(poId ?? ''),
    enabled: Boolean(poId),
    queryFn: () => fetchPurchaseOrder(poId!),
  });
}

/** Reads the goods receipts recorded against a project. */
export function useGoodsReceipts(projectId: string | null) {
  return useQuery({
    queryKey: queryKeys.goodsReceipts(projectId ?? ''),
    enabled: Boolean(projectId),
    queryFn: () => fetchGoodsReceipts(projectId!),
  });
}

/** Creates a vendor. */
export function useCreateVendor() {
  const client = useQueryClient();
  const { user } = useAuth();
  const { notify } = useToast();
  const t = useTranslate();

  return useMutation({
    mutationFn: (input: VendorInput) => createVendor(input, user!.company_id),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: queryKeys.vendors(user!.company_id) });
      notify(t('common.saved'), 'success');
    },
    onError: (error) => notify(toUserMessage(error), 'error'),
  });
}

/**
 * Creates a purchase order.
 * Whether the order needs approval is decided here from the company threshold,
 * never guessed at the screen.
 */
export function useCreatePurchaseOrder(projectId: string) {
  const client = useQueryClient();
  const { user } = useAuth();
  const { thresholdFor } = useCompany();
  const { notify } = useToast();
  const t = useTranslate();

  return useMutation({
    mutationFn: (input: PurchaseOrderInput) => {
      const totalPaise = input.items.reduce(
        (sum, item) => sum + Math.round(item.quantity * rupeesToPaise(item.rate_rupees) * (1 + item.gst_pct / 100)),
        0,
      );
      return createPurchaseOrder(
        input,
        user!.company_id,
        projectId,
        needsApproval(totalPaise, thresholdFor('purchase_order')),
      );
    },
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: queryKeys.purchaseOrders(user!.company_id) });
      notify(t('common.saved'), 'success');
    },
    onError: (error) => notify(toUserMessage(error), 'error'),
  });
}

/** Approves a purchase order held above the threshold. */
export function useApprovePurchaseOrder() {
  const client = useQueryClient();
  const { user } = useAuth();
  const { notify } = useToast();
  const t = useTranslate();

  return useMutation({
    mutationFn: (poId: string) => approvePurchaseOrder(poId, user!.id),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: queryKeys.purchaseOrders(user!.company_id) });
      notify(t('common.saved'), 'success');
    },
    onError: (error) => notify(toUserMessage(error), 'error'),
  });
}

/** Records a goods receipt, which also writes the matching stock movements. */
export function useRecordGoodsReceipt(projectId: string) {
  const client = useQueryClient();
  const { user } = useAuth();
  const { notify } = useToast();
  const t = useTranslate();

  return useMutation({
    mutationFn: ({ purchaseOrderId, values, challanPath }: {
      purchaseOrderId: string;
      values: GoodsReceiptInput;
      challanPath: string | null;
    }) =>
      recordGoodsReceipt({
        purchaseOrderId,
        projectId,
        receivedBy: user!.id,
        challanPath,
        values,
      }),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: queryKeys.goodsReceipts(projectId) });
      void client.invalidateQueries({ queryKey: queryKeys.stockMovements(projectId) });
      void client.invalidateQueries({ queryKey: queryKeys.purchaseOrders(user!.company_id) });
      notify(t('common.saved'), 'success');
    },
    onError: (error) => notify(toUserMessage(error), 'error'),
  });
}
