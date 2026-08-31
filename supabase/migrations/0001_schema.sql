-- =============================================================================
-- SiteLedger 0001: schema
--
-- Conventions applied to every table:
--   id           uuid primary key default gen_random_uuid()
--   created_at   timestamptz not null default now()
--   updated_at   timestamptz not null default now()
--   company_id   uuid not null references companies(id)   [tenant scoped rows]
--
-- All money is stored in paise as bigint, never as a float.
-- All quantities are numeric, never float.
-- Stock on hand is never a stored column: it is a view over stock_movements.
-- =============================================================================

create extension if not exists "pgcrypto";

-- Keeps updated_at honest without every write having to remember to set it.
create or replace function set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- Tenancy and identity
-- -----------------------------------------------------------------------------

create type role_key as enum ('owner', 'pm', 'site', 'procurement', 'accounts');
create type site_level_key as enum ('engineer', 'supervisor');
create type member_status as enum ('active', 'invited', 'disabled');
create type approval_kind as enum ('expense', 'purchase_order');

create table companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text,
  gstin text,
  address text,
  logo_url text,
  default_locale text not null default 'en',
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  phone text,
  email text,
  avatar_url text,
  locale text not null default 'en',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table company_members (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  profile_id uuid not null references profiles(id) on delete cascade,
  role role_key not null,
  site_level site_level_key,
  status member_status not null default 'active',
  invited_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, profile_id)
);

create table approval_thresholds (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  kind approval_kind not null,
  amount_paise bigint not null,
  approver_role role_key not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, kind)
);

-- -----------------------------------------------------------------------------
-- Projects
-- -----------------------------------------------------------------------------

create type project_status as enum ('planning', 'active', 'on_hold', 'completed', 'archived');
create type project_type as enum ('residential', 'commercial', 'infra', 'interior');

create table projects (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  name text not null,
  code text,
  type project_type,
  client_name text,
  address text,
  lat numeric,
  lng numeric,
  start_date date,
  planned_end_date date,
  status project_status not null default 'planning',
  budget_paise bigint,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table project_members (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  profile_id uuid not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, profile_id)
);

-- -----------------------------------------------------------------------------
-- Work
-- -----------------------------------------------------------------------------

create type priority_key as enum ('low', 'medium', 'high', 'critical');
create type task_status as enum (
  'created', 'assigned', 'in_progress', 'completed', 'verified', 'on_hold', 'cancelled'
);

create table tasks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  title text not null,
  description text,
  assignee_profile_id uuid references profiles(id),
  -- Subcontractors are data objects, not logins, so they are assigned by name.
  assignee_name_text text,
  start_date date,
  due_date date,
  priority priority_key not null default 'medium',
  status task_status not null default 'created',
  progress_pct int not null default 0 check (progress_pct between 0 and 100),
  verified_by uuid references profiles(id),
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table task_comments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references tasks(id) on delete cascade,
  author_profile_id uuid not null references profiles(id),
  body text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table task_photos (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references tasks(id) on delete cascade,
  storage_path text not null,
  caption text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- Daily progress reports
-- -----------------------------------------------------------------------------

create table dprs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  report_date date not null,
  submitted_by uuid not null references profiles(id),
  submitted_at timestamptz not null default now(),
  note text,
  tomorrow_plan text,
  weather text,
  -- Seconds from opening the form to a successful submit, so the sub 60 second
  -- target is measured rather than assumed.
  dpr_timing_seconds int,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, report_date, submitted_by)
);

create table dpr_task_progress (
  id uuid primary key default gen_random_uuid(),
  dpr_id uuid not null references dprs(id) on delete cascade,
  task_id uuid not null references tasks(id) on delete cascade,
  progress_pct int not null check (progress_pct between 0 and 100),
  quantity numeric,
  unit text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table dpr_photos (
  id uuid primary key default gen_random_uuid(),
  dpr_id uuid not null references dprs(id) on delete cascade,
  storage_path text not null,
  caption text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- Labour
-- -----------------------------------------------------------------------------

create table contractors (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  name text not null,
  contact_phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table workers (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  full_name text not null,
  phone text,
  category text not null,
  daily_rate_paise bigint not null,
  contractor_id uuid references contractors(id),
  photo_path text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table attendance (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  worker_id uuid not null references workers(id) on delete cascade,
  attendance_date date not null,
  -- 1 present, 0.5 half day, 0 absent. A fraction keeps wages one formula.
  day_value numeric not null check (day_value in (0, 0.5, 1)),
  overtime_hours numeric not null default 0,
  marked_by uuid not null references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Same day duplicate attendance merges rather than doubling, which is what
  -- makes replaying a queued offline write safe.
  unique (project_id, worker_id, attendance_date)
);

create table wage_advances (
  id uuid primary key default gen_random_uuid(),
  worker_id uuid not null references workers(id) on delete cascade,
  project_id uuid references projects(id),
  amount_paise bigint not null,
  advance_date date not null,
  recorded_by uuid not null references profiles(id),
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- Materials and procurement
-- -----------------------------------------------------------------------------

create type material_request_status as enum (
  'submitted', 'approved', 'rejected', 'ordered', 'fulfilled'
);
create type po_status as enum (
  'draft', 'pending_approval', 'approved', 'partially_received', 'received', 'cancelled'
);
create type stock_movement_type as enum (
  'receipt', 'issue', 'adjustment', 'transfer_in', 'transfer_out'
);

create table material_items (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  name text not null,
  unit text not null,
  category text,
  standard_rate_paise bigint,
  low_stock_threshold numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table material_requests (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  requested_by uuid not null references profiles(id),
  needed_by date,
  status material_request_status not null default 'submitted',
  approved_by uuid references profiles(id),
  approved_at timestamptz,
  reject_reason text,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table material_request_items (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references material_requests(id) on delete cascade,
  material_item_id uuid references material_items(id),
  free_text_name text,
  quantity numeric not null,
  unit text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table vendors (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  name text not null,
  gstin text,
  contact_phone text,
  contact_email text,
  address text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table purchase_orders (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  project_id uuid not null references projects(id) on delete cascade,
  vendor_id uuid not null references vendors(id),
  po_number text not null,
  status po_status not null default 'draft',
  expected_date date,
  approved_by uuid references profiles(id),
  approved_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table purchase_order_items (
  id uuid primary key default gen_random_uuid(),
  purchase_order_id uuid not null references purchase_orders(id) on delete cascade,
  material_item_id uuid not null references material_items(id),
  quantity numeric not null,
  rate_paise bigint not null,
  gst_pct numeric not null default 0,
  -- Links the line back to the request that caused it, so the request stays
  -- the single system of record and nothing downstream is retyped.
  source_request_item_id uuid references material_request_items(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table goods_receipts (
  id uuid primary key default gen_random_uuid(),
  purchase_order_id uuid not null references purchase_orders(id) on delete cascade,
  project_id uuid not null references projects(id) on delete cascade,
  received_date date not null,
  received_by uuid not null references profiles(id),
  challan_path text,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table goods_receipt_items (
  id uuid primary key default gen_random_uuid(),
  goods_receipt_id uuid not null references goods_receipts(id) on delete cascade,
  purchase_order_item_id uuid not null references purchase_order_items(id),
  quantity_received numeric not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table stock_movements (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  material_item_id uuid not null references material_items(id),
  movement_type stock_movement_type not null,
  quantity numeric not null,
  reference_table text,
  reference_id uuid,
  issued_to_task_id uuid references tasks(id),
  moved_by uuid not null references profiles(id),
  moved_at timestamptz not null default now(),
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Stock on hand is a view, never a column. This is the only way it stays
-- consistent with corrections made to any receipt or issue.
create view v_stock_on_hand
with (security_invoker = true) as
select
  project_id,
  material_item_id,
  sum(
    case movement_type
      when 'receipt' then quantity
      when 'transfer_in' then quantity
      when 'adjustment' then quantity
      when 'issue' then -quantity
      when 'transfer_out' then -quantity
    end
  ) as quantity_on_hand
from stock_movements
group by project_id, material_item_id;

-- -----------------------------------------------------------------------------
-- Equipment and reusable assets
-- -----------------------------------------------------------------------------

create type asset_type_key as enum ('machine', 'vehicle', 'reusable_set', 'small_tool');
create type asset_ownership as enum ('owned', 'rented');
create type asset_status as enum ('in_use', 'idle', 'under_repair', 'returned');
create type asset_movement_type as enum (
  'checkout', 'transfer', 'return_to_yard', 'return_to_vendor', 'repair_out', 'repair_in'
);
create type asset_cost_type as enum ('rental', 'repair', 'transport');

create table assets (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  name text not null,
  asset_type asset_type_key not null,
  ownership asset_ownership not null,
  identifier text,
  -- A reusable set is one tracked object carrying a quantity, not N components.
  set_quantity numeric,
  purchase_value_paise bigint,
  rental_vendor_id uuid references vendors(id),
  rental_start_date date,
  rental_due_date date,
  rental_rate_paise bigint,
  status asset_status not null default 'idle',
  current_project_id uuid references projects(id),
  photo_path text,
  idle_threshold_days int not null default 7,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table asset_movements (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid not null references assets(id) on delete cascade,
  from_project_id uuid references projects(id),
  to_project_id uuid references projects(id),
  movement_type asset_movement_type not null,
  moved_at timestamptz not null default now(),
  moved_by uuid not null references profiles(id),
  condition_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table asset_costs (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid not null references assets(id) on delete cascade,
  project_id uuid references projects(id),
  cost_type asset_cost_type not null,
  amount_paise bigint not null,
  incurred_on date not null,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- Issues, expenses, documents
-- -----------------------------------------------------------------------------

create type issue_status as enum ('open', 'assigned', 'in_progress', 'resolved', 'closed');
create type issue_photo_kind as enum ('report', 'evidence');
create type expense_category as enum ('labour', 'material', 'equipment', 'transport', 'misc');
create type expense_status as enum ('submitted', 'approved', 'rejected');
create type doc_type_key as enum (
  'drawing', 'boq', 'contract', 'report', 'photo', 'invoice', 'certificate', 'other'
);
create type doc_visibility as enum ('project_team', 'office_only');

create table issues (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  title text not null,
  description text,
  area text,
  priority priority_key not null default 'medium',
  status issue_status not null default 'open',
  raised_by uuid not null references profiles(id),
  assignee_profile_id uuid references profiles(id),
  due_date date,
  resolution_note text,
  resolved_at timestamptz,
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table issue_photos (
  id uuid primary key default gen_random_uuid(),
  issue_id uuid not null references issues(id) on delete cascade,
  storage_path text not null,
  kind issue_photo_kind not null default 'report',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table issue_comments (
  id uuid primary key default gen_random_uuid(),
  issue_id uuid not null references issues(id) on delete cascade,
  author_profile_id uuid not null references profiles(id),
  body text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table expenses (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  amount_paise bigint not null,
  category expense_category not null,
  spent_on date not null,
  receipt_path text,
  submitted_by uuid not null references profiles(id),
  status expense_status not null default 'submitted',
  approved_by uuid references profiles(id),
  approved_at timestamptz,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table documents (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  project_id uuid references projects(id) on delete cascade,
  name text not null,
  doc_type doc_type_key not null default 'other',
  storage_path text not null,
  size_bytes bigint,
  uploaded_by uuid not null references profiles(id),
  visibility doc_visibility not null default 'project_team',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- Cross cutting
-- -----------------------------------------------------------------------------

create type notification_urgency as enum ('realtime', 'digest');
create type audit_action as enum ('insert', 'update', 'delete');

create table notifications (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  recipient_profile_id uuid not null references profiles(id) on delete cascade,
  kind text not null,
  title text not null,
  body text,
  deep_link text,
  entity_table text,
  entity_id uuid,
  urgency notification_urgency not null default 'digest',
  read_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table audit_log (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references companies(id) on delete cascade,
  table_name text not null,
  record_id uuid not null,
  action audit_action not null,
  actor_profile_id uuid references profiles(id),
  before jsonb,
  after jsonb,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- Indexes on every foreign key a dashboard filters by, so a twenty project
-- company aggregates fast rather than scanning.
-- -----------------------------------------------------------------------------

create index on company_members (profile_id);
create index on company_members (company_id, status);
create index on projects (company_id, status);
create index on project_members (profile_id);
create index on tasks (project_id, status);
create index on tasks (assignee_profile_id);
create index on tasks (project_id, due_date);
create index on dprs (project_id, report_date desc);
create index on dpr_task_progress (dpr_id);
create index on attendance (project_id, attendance_date);
create index on attendance (worker_id, attendance_date);
create index on workers (company_id, is_active);
create index on wage_advances (worker_id, advance_date);
create index on material_requests (project_id, status);
create index on material_request_items (request_id);
create index on purchase_orders (company_id, status);
create index on purchase_orders (project_id);
create index on purchase_order_items (purchase_order_id);
create index on goods_receipts (project_id, received_date desc);
create index on goods_receipt_items (goods_receipt_id);
create index on stock_movements (project_id, material_item_id);
create index on stock_movements (project_id, moved_at desc);
create index on assets (company_id, status);
create index on assets (current_project_id);
create index on asset_movements (asset_id, moved_at);
create index on asset_costs (project_id);
create index on issues (project_id, status);
create index on issues (assignee_profile_id);
create index on expenses (project_id, status);
create index on documents (company_id, project_id);
create index on notifications (recipient_profile_id, read_at);
create index on audit_log (table_name, record_id);

-- -----------------------------------------------------------------------------
-- updated_at triggers on every table
-- -----------------------------------------------------------------------------

do $$
declare
  target text;
begin
  foreach target in array array[
    'companies','profiles','company_members','approval_thresholds','projects','project_members',
    'tasks','task_comments','task_photos','dprs','dpr_task_progress','dpr_photos',
    'contractors','workers','attendance','wage_advances','material_items','material_requests',
    'material_request_items','vendors','purchase_orders','purchase_order_items','goods_receipts',
    'goods_receipt_items','stock_movements','assets','asset_movements','asset_costs',
    'issues','issue_photos','issue_comments','expenses','documents','notifications','audit_log'
  ]
  loop
    execute format(
      'create trigger %I before update on %I for each row execute function set_updated_at()',
      't_' || target || '_updated_at', target
    );
  end loop;
end $$;
