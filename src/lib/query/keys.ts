/**
 * Every query key in the product, built here.
 * Centralising them means an invalidation after a mutation can never miss a
 * cache because a key was spelled differently in two files.
 */
export const queryKeys = {
  session: ['session'] as const,
  company: (companyId: string) => ['company', companyId] as const,
  companyMembers: (companyId: string) => ['company', companyId, 'members'] as const,
  approvalThresholds: (companyId: string) => ['company', companyId, 'thresholds'] as const,

  projects: (companyId: string) => ['projects', companyId] as const,
  project: (projectId: string) => ['project', projectId] as const,
  projectMembers: (projectId: string) => ['project', projectId, 'members'] as const,

  tasks: (projectId: string) => ['tasks', projectId] as const,
  task: (taskId: string) => ['task', taskId] as const,
  taskComments: (taskId: string) => ['task', taskId, 'comments'] as const,

  dprs: (projectId: string) => ['dprs', projectId] as const,
  dpr: (dprId: string) => ['dpr', dprId] as const,

  workers: (companyId: string) => ['workers', companyId] as const,
  contractors: (companyId: string) => ['contractors', companyId] as const,
  attendance: (projectId: string, from: string, to: string) =>
    ['attendance', projectId, from, to] as const,
  advances: (companyId: string, from: string, to: string) =>
    ['advances', companyId, from, to] as const,

  materialItems: (companyId: string) => ['materialItems', companyId] as const,
  materialRequests: (projectId: string) => ['materialRequests', projectId] as const,
  pendingRequests: (companyId: string) => ['materialRequests', companyId, 'pending'] as const,
  stockMovements: (projectId: string) => ['stockMovements', projectId] as const,

  vendors: (companyId: string) => ['vendors', companyId] as const,
  purchaseOrders: (companyId: string) => ['purchaseOrders', companyId] as const,
  purchaseOrder: (poId: string) => ['purchaseOrder', poId] as const,
  goodsReceipts: (projectId: string) => ['goodsReceipts', projectId] as const,

  assets: (companyId: string) => ['assets', companyId] as const,
  asset: (assetId: string) => ['asset', assetId] as const,
  assetMovements: (assetId: string) => ['asset', assetId, 'movements'] as const,
  assetCosts: (companyId: string) => ['assetCosts', companyId] as const,

  issues: (projectId: string) => ['issues', projectId] as const,
  companyIssues: (companyId: string) => ['issues', 'company', companyId] as const,
  issue: (issueId: string) => ['issue', issueId] as const,

  expenses: (companyId: string) => ['expenses', companyId] as const,
  documents: (companyId: string) => ['documents', companyId] as const,
  notifications: (profileId: string) => ['notifications', profileId] as const,
  auditLog: (table: string, recordId: string) => ['auditLog', table, recordId] as const,
} as const;
