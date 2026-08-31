/**
 * Every enum in the database, mirrored once here.
 * UI code must derive its option lists from these arrays rather than repeating
 * string literals, so adding a status never means hunting through components.
 */

export const ROLES = ['owner', 'pm', 'site', 'procurement', 'accounts'] as const;
export type Role = (typeof ROLES)[number];

export const SITE_LEVELS = ['engineer', 'supervisor'] as const;
export type SiteLevel = (typeof SITE_LEVELS)[number];

export const MEMBER_STATUSES = ['active', 'invited', 'disabled'] as const;
export type MemberStatus = (typeof MEMBER_STATUSES)[number];

export const PROJECT_STATUSES = ['planning', 'active', 'on_hold', 'completed', 'archived'] as const;
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

export const PROJECT_TYPES = ['residential', 'commercial', 'infra', 'interior'] as const;
export type ProjectType = (typeof PROJECT_TYPES)[number];

export const TASK_STATUSES = [
  'created', 'assigned', 'in_progress', 'completed', 'verified', 'on_hold', 'cancelled',
] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export const PRIORITIES = ['low', 'medium', 'high', 'critical'] as const;
export type Priority = (typeof PRIORITIES)[number];

export const ISSUE_STATUSES = ['open', 'assigned', 'in_progress', 'resolved', 'closed'] as const;
export type IssueStatus = (typeof ISSUE_STATUSES)[number];

export const MATERIAL_REQUEST_STATUSES = [
  'submitted', 'approved', 'rejected', 'ordered', 'fulfilled',
] as const;
export type MaterialRequestStatus = (typeof MATERIAL_REQUEST_STATUSES)[number];

export const PO_STATUSES = [
  'draft', 'pending_approval', 'approved', 'partially_received', 'received', 'cancelled',
] as const;
export type PurchaseOrderStatus = (typeof PO_STATUSES)[number];

export const STOCK_MOVEMENT_TYPES = [
  'receipt', 'issue', 'adjustment', 'transfer_in', 'transfer_out',
] as const;
export type StockMovementType = (typeof STOCK_MOVEMENT_TYPES)[number];

export const ASSET_TYPES = ['machine', 'vehicle', 'reusable_set', 'small_tool'] as const;
export type AssetType = (typeof ASSET_TYPES)[number];

export const ASSET_OWNERSHIPS = ['owned', 'rented'] as const;
export type AssetOwnership = (typeof ASSET_OWNERSHIPS)[number];

export const ASSET_STATUSES = ['in_use', 'idle', 'under_repair', 'returned'] as const;
export type AssetStatus = (typeof ASSET_STATUSES)[number];

export const ASSET_MOVEMENT_TYPES = [
  'checkout', 'transfer', 'return_to_yard', 'return_to_vendor', 'repair_out', 'repair_in',
] as const;
export type AssetMovementType = (typeof ASSET_MOVEMENT_TYPES)[number];

export const ASSET_COST_TYPES = ['rental', 'repair', 'transport'] as const;
export type AssetCostType = (typeof ASSET_COST_TYPES)[number];

export const EXPENSE_CATEGORIES = ['labour', 'material', 'equipment', 'transport', 'misc'] as const;
export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

export const EXPENSE_STATUSES = ['submitted', 'approved', 'rejected'] as const;
export type ExpenseStatus = (typeof EXPENSE_STATUSES)[number];

export const DOC_TYPES = [
  'drawing', 'boq', 'contract', 'report', 'photo', 'invoice', 'certificate', 'other',
] as const;
export type DocType = (typeof DOC_TYPES)[number];

export const DOC_VISIBILITIES = ['project_team', 'office_only'] as const;
export type DocVisibility = (typeof DOC_VISIBILITIES)[number];

export const APPROVAL_KINDS = ['expense', 'purchase_order'] as const;
export type ApprovalKind = (typeof APPROVAL_KINDS)[number];

/** Attendance is stored as a day fraction so wage maths stays a single formula. */
export const DAY_VALUES = [
  { value: 1, key: 'present' },
  { value: 0.5, key: 'half_day' },
  { value: 0, key: 'absent' },
] as const;

export const WORKER_CATEGORIES = [
  'unskilled', 'semi_skilled', 'skilled', 'mason', 'carpenter', 'steel_fixer', 'operator', 'supervisor',
] as const;
export type WorkerCategory = (typeof WORKER_CATEGORIES)[number];

export const MATERIAL_UNITS = ['bag', 'kg', 'ton', 'cum', 'sqm', 'nos', 'litre', 'metre'] as const;
export type MaterialUnit = (typeof MATERIAL_UNITS)[number];
