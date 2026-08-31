import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Bar, BarChart, CartesianGrid, Tooltip, XAxis, YAxis } from 'recharts';
import { CheckCircle2, Plus, Truck } from 'lucide-react';
import { PageHeader } from '@/components/patterns/PageHeader';
import { DataTable, type Column } from '@/components/patterns/DataTable';
import { ChartCard } from '@/components/charts/ChartCard';
import { ChartTooltip } from '@/components/charts/ChartTooltip';
import { axisProps, chartTheme } from '@/components/charts/theme';
import { Button } from '@/components/ui/Button';
import { StatusChip, type StatusTone } from '@/components/ui/StatusChip';
import { Tabs } from '@/components/ui/Tabs';
import { useAuth } from '@/contexts/AuthContext';
import { useProject } from '@/contexts/ProjectContext';
import { useTranslate } from '@/contexts/I18nContext';
import { formatPaise } from '@/lib/format/currency';
import { formatDate } from '@/lib/format/date';
import { calculatePoTotalPaise } from '@/lib/calc/materials';
import { PO_STATUSES } from '@/types/enums';
import type { PurchaseOrder, Vendor } from '@/types/domain';
import {
  useApprovePurchaseOrder, useGoodsReceipts, usePurchaseOrders, useVendors,
} from '../hooks/useProcurement';
import { PurchaseOrderDialog } from '../components/PurchaseOrderDialog';
import { GoodsReceiptDialog } from '../components/GoodsReceiptDialog';
import { VendorDialog } from '../components/VendorDialog';
import { RequestApprovalList } from '../components/RequestApprovalList';

/** Maps a purchase order status to its chip tone. */
const PO_TONE: Record<string, StatusTone> = {
  draft: 'neutral',
  pending_approval: 'risk',
  approved: 'info',
  partially_received: 'risk',
  received: 'ontrack',
  cancelled: 'neutral',
};

/**
 * The procurement desk.
 * Requests, orders, receipts and vendors are four views of one lifecycle, so
 * they sit on one screen and nothing is entered twice between them.
 */
export function ProcurementPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const t = useTranslate();
  const { can } = useAuth();
  const { projects } = useProject();
  const [tab, setTab] = useState<'requests' | 'orders' | 'receipts' | 'vendors'>('requests');
  const [isPoOpen, setIsPoOpen] = useState(false);
  const [isVendorOpen, setIsVendorOpen] = useState(false);
  const [receiptForPo, setReceiptForPo] = useState<PurchaseOrder | null>(null);

  const ordersQuery = usePurchaseOrders();
  const vendorsQuery = useVendors();
  const receiptsQuery = useGoodsReceipts(projectId ?? null);
  const approve = useApprovePurchaseOrder();

  const projectOrders = useMemo(
    () => (ordersQuery.data ?? []).filter((order) => order.project_id === projectId),
    [ordersQuery.data, projectId],
  );

  const statusData = useMemo(
    () =>
      PO_STATUSES.map((status) => ({
        status: t(`procurement.poStatus.${status}`),
        count: projectOrders.filter((order) => order.status === status).length,
      })).filter((row) => row.count > 0),
    [projectOrders, t],
  );

  const orderColumns = useMemo<Column<PurchaseOrder>[]>(
    () => [
      { key: 'po', header: t('procurement.poNumber'), render: (order) => order.po_number },
      { key: 'vendor', header: t('common.vendor'), render: (order) => order.vendor?.name ?? '-' },
      {
        key: 'expected', header: t('procurement.expectedDate'), hideOnMobile: true,
        render: (order) => (order.expected_date ? formatDate(order.expected_date) : '-'),
      },
      {
        key: 'value', header: t('common.total'), align: 'right',
        render: (order) => formatPaise(calculatePoTotalPaise(order)),
      },
      {
        key: 'status', header: t('common.status'),
        render: (order) => (
          <StatusChip
            label={t(`procurement.poStatus.${order.status}`)}
            tone={PO_TONE[order.status]}
            size="sm"
          />
        ),
      },
      {
        key: 'actions', header: t('common.actions'), align: 'right',
        render: (order) => (
          <div className="flex justify-end gap-2">
            {order.status === 'pending_approval' && can('po.approve') && (
              <Button
                size="sm"
                variant="secondary"
                icon={<CheckCircle2 className="size-3.5" />}
                onClick={(event) => { event.stopPropagation(); approve.mutate(order.id); }}
              >
                {t('common.approve')}
              </Button>
            )}
            {(order.status === 'approved' || order.status === 'partially_received') &&
              can('stock.receive') && (
                <Button
                  size="sm"
                  onClick={(event) => { event.stopPropagation(); setReceiptForPo(order); }}
                >
                  {t('procurement.recordGrn')}
                </Button>
              )}
          </div>
        ),
      },
    ],
    [t, can, approve],
  );

  const vendorColumns = useMemo<Column<Vendor>[]>(
    () => [
      { key: 'name', header: t('common.name'), render: (vendor) => vendor.name },
      { key: 'gstin', header: t('procurement.gstin'), hideOnMobile: true, render: (vendor) => vendor.gstin ?? '-' },
      { key: 'phone', header: t('common.phone'), render: (vendor) => vendor.contact_phone ?? '-' },
      { key: 'email', header: t('common.email'), hideOnMobile: true, render: (vendor) => vendor.contact_email ?? '-' },
    ],
    [t],
  );

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title={t('procurement.desk')}
        actions={
          <>
            {can('vendor.manage') && (
              <Button variant="secondary" icon={<Plus className="size-4" />} onClick={() => setIsVendorOpen(true)}>
                {t('procurement.addVendor')}
              </Button>
            )}
            {can('po.create') && (
              <Button icon={<Truck className="size-4" />} onClick={() => setIsPoOpen(true)}>
                {t('procurement.createPo')}
              </Button>
            )}
          </>
        }
      />

      <Tabs
        value={tab}
        onChange={(value) => setTab(value as typeof tab)}
        items={[
          { value: 'requests', label: t('materials.requests') },
          { value: 'orders', label: t('procurement.purchaseOrders'), count: projectOrders.length },
          { value: 'receipts', label: t('procurement.grn'), count: (receiptsQuery.data ?? []).length },
          { value: 'vendors', label: t('procurement.vendors'), count: (vendorsQuery.data ?? []).length },
        ]}
      />

      {tab === 'requests' && (
        <RequestApprovalList projectIds={projects.map((project) => project.id)} />
      )}

      {tab === 'orders' && (
        <div className="flex flex-col gap-4">
          <DataTable
            columns={orderColumns}
            rows={projectOrders}
            rowKey={(order) => order.id}
            isLoading={ordersQuery.isLoading}
            isError={ordersQuery.isError}
            onRetry={() => void ordersQuery.refetch()}
            emptyMessage={t('procurement.emptyPo')}
            emptyAction={
              can('po.create') && (
                <Button icon={<Plus className="size-4" />} onClick={() => setIsPoOpen(true)}>
                  {t('procurement.createPo')}
                </Button>
              )
            }
          />

          <ChartCard
            chartId="purchaseOrderStatus"
            isLoading={ordersQuery.isLoading}
            isEmpty={statusData.length === 0}
            emptyMessage={t('procurement.emptyPo')}
          >
            <BarChart data={statusData} layout="vertical" margin={{ left: 24 }}>
              <CartesianGrid strokeDasharray="2 4" stroke={chartTheme.border} horizontal={false} />
              <XAxis type="number" allowDecimals={false} {...axisProps} />
              <YAxis type="category" dataKey="status" width={120} {...axisProps} />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: chartTheme.border, opacity: 0.3 }} />
              <Bar dataKey="count" name={t('procurement.purchaseOrders')} fill={chartTheme.primary} radius={[0, 3, 3, 0]} />
            </BarChart>
          </ChartCard>
        </div>
      )}

      {tab === 'receipts' && (
        <DataTable
          columns={[
            { key: 'date', header: t('common.date'), render: (receipt) => formatDate(receipt.received_date) },
            {
              key: 'lines', header: t('procurement.receivedQuantity'), align: 'right',
              render: (receipt) => (receipt.items ?? []).length,
            },
            { key: 'note', header: t('common.note'), hideOnMobile: true, render: (receipt) => receipt.note ?? '-' },
          ]}
          rows={receiptsQuery.data ?? []}
          rowKey={(receipt) => receipt.id}
          isLoading={receiptsQuery.isLoading}
          emptyMessage={t('procurement.emptyPo')}
        />
      )}

      {tab === 'vendors' && (
        <DataTable
          columns={vendorColumns}
          rows={vendorsQuery.data ?? []}
          rowKey={(vendor) => vendor.id}
          isLoading={vendorsQuery.isLoading}
          emptyMessage={t('procurement.emptyVendors')}
          emptyAction={
            can('vendor.manage') && (
              <Button icon={<Plus className="size-4" />} onClick={() => setIsVendorOpen(true)}>
                {t('procurement.addVendor')}
              </Button>
            )
          }
        />
      )}

      <PurchaseOrderDialog open={isPoOpen} onClose={() => setIsPoOpen(false)} projectId={projectId!} />
      <VendorDialog open={isVendorOpen} onClose={() => setIsVendorOpen(false)} />
      <GoodsReceiptDialog
        purchaseOrder={receiptForPo}
        projectId={projectId!}
        onClose={() => setReceiptForPo(null)}
      />
    </div>
  );
}
