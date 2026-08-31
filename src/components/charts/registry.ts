/**
 * The chart registry.
 * Every chart in the product is listed here with the explain entry that
 * describes it. A unit test asserts each entry has a matching explain key in
 * the message files, so a chart can never ship without its explanation.
 */

export type ChartId =
  | 'portfolioProgress'
  | 'progressOverTime'
  | 'labourHeadcount'
  | 'labourCost'
  | 'topMaterials'
  | 'stockOnHand'
  | 'spendByCategory'
  | 'issueAgeing'
  | 'taskStatus'
  | 'equipmentUtilisation'
  | 'purchaseOrderStatus'
  | 'dprCompliance';

export type ChartDefinition = {
  id: ChartId;
  /** Message key for the chart title shown in the card header. */
  titleKey: string;
  /** Name of the explain entry, always equal to the chart id. */
  explain: ChartId;
  /** Where the chart appears, for documentation and for the reports hub. */
  surfaces: string[];
};

export const CHART_REGISTRY: Record<ChartId, ChartDefinition> = {
  portfolioProgress: {
    id: 'portfolioProgress', titleKey: 'company.portfolioProgress',
    explain: 'portfolioProgress', surfaces: ['company'],
  },
  progressOverTime: {
    id: 'progressOverTime', titleKey: 'reports.progress',
    explain: 'progressOverTime', surfaces: ['dashboard', 'reports'],
  },
  labourHeadcount: {
    id: 'labourHeadcount', titleKey: 'labour.headcount',
    explain: 'labourHeadcount', surfaces: ['dashboard', 'labour'],
  },
  labourCost: {
    id: 'labourCost', titleKey: 'reports.labour',
    explain: 'labourCost', surfaces: ['labour', 'reports'],
  },
  topMaterials: {
    id: 'topMaterials', titleKey: 'materials.title',
    explain: 'topMaterials', surfaces: ['materials', 'reports'],
  },
  stockOnHand: {
    id: 'stockOnHand', titleKey: 'materials.onHand',
    explain: 'stockOnHand', surfaces: ['materials'],
  },
  spendByCategory: {
    id: 'spendByCategory', titleKey: 'expenses.title',
    explain: 'spendByCategory', surfaces: ['dashboard', 'expenses', 'reports'],
  },
  issueAgeing: {
    id: 'issueAgeing', titleKey: 'issues.ageing',
    explain: 'issueAgeing', surfaces: ['issues'],
  },
  taskStatus: {
    id: 'taskStatus', titleKey: 'reports.taskStatus',
    explain: 'taskStatus', surfaces: ['dashboard', 'tasks'],
  },
  equipmentUtilisation: {
    id: 'equipmentUtilisation', titleKey: 'equipment.utilisation',
    explain: 'equipmentUtilisation', surfaces: ['equipment', 'reports'],
  },
  purchaseOrderStatus: {
    id: 'purchaseOrderStatus', titleKey: 'procurement.purchaseOrders',
    explain: 'purchaseOrderStatus', surfaces: ['procurement'],
  },
  dprCompliance: {
    id: 'dprCompliance', titleKey: 'reports.dailyReports',
    explain: 'dprCompliance', surfaces: ['company', 'dashboard'],
  },
};

/** Every chart definition, for the registry test and the reports hub. */
export const ALL_CHARTS = Object.values(CHART_REGISTRY);
