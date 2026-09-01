import type {
  ApprovalKind, AssetCostType, AssetMovementType, AssetOwnership, AssetStatus, AssetType,
  DocType, DocVisibility, ExpenseCategory, ExpenseStatus, IssueStatus, MaterialRequestStatus,
  MemberStatus, Priority, ProjectStatus, ProjectType, PurchaseOrderStatus, Role, SiteLevel,
  StockMovementType, TaskStatus,
} from './enums';

/** Columns every table carries. */
export type BaseRow = {
  id: string;
  created_at: string;
  updated_at: string;
};

/** Columns every tenant-scoped table carries on top of the base. */
export type TenantRow = BaseRow & { company_id: string };

/* ------------------------------- Tenancy -------------------------------- */

export type Company = TenantRow & {
  name: string;
  type: string | null;
  gstin: string | null;
  address: string | null;
  logo_url: string | null;
  /** Short code staff type when signing in. Part of their derived login address. */
  code: string | null;
  default_locale: string;
  settings: Record<string, unknown> | null;
};

export type Profile = BaseRow & {
  full_name: string;
  phone: string | null;
  email: string | null;
  avatar_url: string | null;
  locale: string;
  /** True after an owner issues or resets a password. Blocks the app until changed. */
  must_change_password: boolean;
};

export type CompanyMember = TenantRow & {
  profile_id: string;
  role: Role;
  site_level: SiteLevel | null;
  status: MemberStatus;
  invited_by: string | null;
  username: string | null;
  profile?: Profile;
};

export type ApprovalThreshold = TenantRow & {
  kind: ApprovalKind;
  amount_paise: number;
  approver_role: Role;
};

/* ------------------------------- Projects ------------------------------- */

export type Project = TenantRow & {
  name: string;
  code: string | null;
  type: ProjectType | null;
  client_name: string | null;
  address: string | null;
  lat: number | null;
  lng: number | null;
  start_date: string | null;
  planned_end_date: string | null;
  status: ProjectStatus;
  budget_paise: number | null;
  description: string | null;
};

export type ProjectMember = BaseRow & { project_id: string; profile_id: string; profile?: Profile };

/* --------------------------------- Work --------------------------------- */

export type Task = BaseRow & {
  project_id: string;
  title: string;
  description: string | null;
  assignee_profile_id: string | null;
  assignee_name_text: string | null;
  start_date: string | null;
  due_date: string | null;
  priority: Priority;
  status: TaskStatus;
  progress_pct: number;
  verified_by: string | null;
  verified_at: string | null;
  assignee?: Profile;
};

export type TaskComment = BaseRow & { task_id: string; author_profile_id: string; body: string; author?: Profile };
export type TaskPhoto = BaseRow & { task_id: string; storage_path: string; caption: string | null };

/* --------------------------- Daily progress ----------------------------- */

export type Dpr = BaseRow & {
  project_id: string;
  report_date: string;
  submitted_by: string;
  submitted_at: string;
  note: string | null;
  tomorrow_plan: string | null;
  weather: string | null;
  /** Seconds from opening the form to a successful submit. Measures the 60s target. */
  dpr_timing_seconds: number | null;
  submitter?: Profile;
};

export type DprTaskProgress = BaseRow & {
  dpr_id: string;
  task_id: string;
  progress_pct: number;
  quantity: number | null;
  unit: string | null;
  task?: Task;
};

export type DprPhoto = BaseRow & { dpr_id: string; storage_path: string; caption: string | null };

/* -------------------------------- Labour -------------------------------- */

export type Contractor = TenantRow & { name: string; contact_phone: string | null };

export type Worker = TenantRow & {
  full_name: string;
  phone: string | null;
  category: string;
  daily_rate_paise: number;
  contractor_id: string | null;
  photo_path: string | null;
  is_active: boolean;
  contractor?: Contractor;
};

export type Attendance = BaseRow & {
  project_id: string;
  worker_id: string;
  attendance_date: string;
  /** 1 present, 0.5 half day, 0 absent. Kept as a fraction so wages are one formula. */
  day_value: number;
  overtime_hours: number;
  marked_by: string;
  worker?: Worker;
};

export type WageAdvance = BaseRow & {
  worker_id: string;
  project_id: string | null;
  amount_paise: number;
  advance_date: string;
  recorded_by: string;
  note: string | null;
  worker?: Worker;
};

/* ------------------------ Materials and procurement --------------------- */

export type MaterialItem = TenantRow & {
  name: string;
  unit: string;
  category: string | null;
  standard_rate_paise: number | null;
  low_stock_threshold: number | null;
};

export type MaterialRequest = BaseRow & {
  project_id: string;
  requested_by: string;
  needed_by: string | null;
  status: MaterialRequestStatus;
  approved_by: string | null;
  approved_at: string | null;
  reject_reason: string | null;
  note: string | null;
  items?: MaterialRequestItem[];
  requester?: Profile;
  project?: Project;
};

export type MaterialRequestItem = BaseRow & {
  request_id: string;
  material_item_id: string | null;
  free_text_name: string | null;
  quantity: number;
  unit: string;
  material_item?: MaterialItem;
};

export type Vendor = TenantRow & {
  name: string;
  gstin: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  address: string | null;
};

export type PurchaseOrder = TenantRow & {
  project_id: string;
  vendor_id: string;
  po_number: string;
  status: PurchaseOrderStatus;
  expected_date: string | null;
  approved_by: string | null;
  approved_at: string | null;
  notes: string | null;
  vendor?: Vendor;
  project?: Project;
  items?: PurchaseOrderItem[];
};

export type PurchaseOrderItem = BaseRow & {
  purchase_order_id: string;
  material_item_id: string;
  quantity: number;
  rate_paise: number;
  gst_pct: number;
  source_request_item_id: string | null;
  material_item?: MaterialItem;
  received_quantity?: number;
};

export type GoodsReceipt = BaseRow & {
  purchase_order_id: string;
  project_id: string;
  received_date: string;
  received_by: string;
  challan_path: string | null;
  note: string | null;
  items?: GoodsReceiptItem[];
};

export type GoodsReceiptItem = BaseRow & {
  goods_receipt_id: string;
  purchase_order_item_id: string;
  quantity_received: number;
};

export type StockMovement = BaseRow & {
  project_id: string;
  material_item_id: string;
  movement_type: StockMovementType;
  quantity: number;
  reference_table: string | null;
  reference_id: string | null;
  issued_to_task_id: string | null;
  moved_by: string;
  moved_at: string;
  note: string | null;
  material_item?: MaterialItem;
};

/** Derived view: never a stored column. */
export type StockOnHand = {
  project_id: string;
  material_item_id: string;
  quantity_on_hand: number;
  material_item?: MaterialItem;
};

/* ------------------------------ Equipment ------------------------------- */

export type Asset = TenantRow & {
  name: string;
  asset_type: AssetType;
  ownership: AssetOwnership;
  identifier: string | null;
  set_quantity: number | null;
  purchase_value_paise: number | null;
  rental_vendor_id: string | null;
  rental_start_date: string | null;
  rental_due_date: string | null;
  rental_rate_paise: number | null;
  status: AssetStatus;
  current_project_id: string | null;
  photo_path: string | null;
  idle_threshold_days: number;
  current_project?: Project;
  rental_vendor?: Vendor;
};

export type AssetMovement = BaseRow & {
  asset_id: string;
  from_project_id: string | null;
  to_project_id: string | null;
  movement_type: AssetMovementType;
  moved_at: string;
  moved_by: string;
  condition_note: string | null;
  from_project?: Project;
  to_project?: Project;
};

export type AssetCost = BaseRow & {
  asset_id: string;
  project_id: string | null;
  cost_type: AssetCostType;
  amount_paise: number;
  incurred_on: string;
  note: string | null;
};

/* ---------------------- Issues, expenses, documents --------------------- */

export type Issue = BaseRow & {
  project_id: string;
  title: string;
  description: string | null;
  area: string | null;
  priority: Priority;
  status: IssueStatus;
  raised_by: string;
  assignee_profile_id: string | null;
  due_date: string | null;
  resolution_note: string | null;
  resolved_at: string | null;
  closed_at: string | null;
  assignee?: Profile;
  raiser?: Profile;
  photos?: IssuePhoto[];
  project?: Project;
};

export type IssuePhoto = BaseRow & { issue_id: string; storage_path: string; kind: 'report' | 'evidence' };
export type IssueComment = BaseRow & { issue_id: string; author_profile_id: string; body: string; author?: Profile };

export type Expense = BaseRow & {
  project_id: string;
  amount_paise: number;
  category: ExpenseCategory;
  spent_on: string;
  receipt_path: string | null;
  submitted_by: string;
  status: ExpenseStatus;
  approved_by: string | null;
  approved_at: string | null;
  note: string | null;
  submitter?: Profile;
  project?: Project;
};

export type SiteDocument = TenantRow & {
  project_id: string | null;
  name: string;
  doc_type: DocType;
  storage_path: string;
  size_bytes: number | null;
  uploaded_by: string;
  visibility: DocVisibility;
  project?: Project;
};

/* ----------------------------- Cross cutting ---------------------------- */

export type Notification = TenantRow & {
  recipient_profile_id: string;
  kind: string;
  title: string;
  body: string | null;
  deep_link: string | null;
  entity_table: string | null;
  entity_id: string | null;
  urgency: 'realtime' | 'digest';
  read_at: string | null;
};

export type AuditLogEntry = TenantRow & {
  table_name: string;
  record_id: string;
  action: 'insert' | 'update' | 'delete';
  actor_profile_id: string | null;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  occurred_at: string;
  actor?: Profile;
};

/** The signed-in user, flattened from profile plus membership. */
export type SessionUser = {
  id: string;
  full_name: string;
  phone: string | null;
  email: string | null;
  avatar_url: string | null;
  locale: string;
  company_id: string;
  role: Role;
  site_level: SiteLevel | null;
  status: MemberStatus;
  /** Login name within the company, for staff accounts issued by an owner. */
  username: string | null;
  must_change_password: boolean;
};
