-- =============================================================================
-- SiteLedger 0003: Row Level Security
--
-- Enabled on every table, no exceptions. The client is never trusted: the same
-- rules that hide a control in the interface refuse the write at the database.
--
-- Policy pattern:
--   select   company_id = auth_company_id(), plus has_project_access() on
--            project scoped tables. Owners bypass the project check.
--   insert   the same, plus a role check matching lib/auth/permissions.ts
--   update   the same
--   delete   denied everywhere. Rows are archived or status changed, never
--            deleted, so history and cost stay intact.
-- =============================================================================

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
    execute format('alter table %I enable row level security', target);
  end loop;
end $$;

-- -----------------------------------------------------------------------------
-- Tenancy and identity
-- -----------------------------------------------------------------------------

create policy companies_select on companies for select
  using (id = auth_company_id());

create policy companies_update on companies for update
  using (id = auth_company_id() and auth_role() = 'owner')
  with check (id = auth_company_id() and auth_role() = 'owner');

-- Any signed-in user may create the company they are about to own. The
-- create_company_with_owner function is the only path that uses this.
create policy companies_insert on companies for insert
  with check (auth.uid() is not null);

-- A user always sees their own profile, plus everyone in their company.
create policy profiles_select on profiles for select
  using (
    id = auth.uid()
    or exists (
      select 1 from company_members cm
      where cm.profile_id = profiles.id and cm.company_id = auth_company_id()
    )
  );

create policy profiles_update on profiles for update
  using (id = auth.uid())
  with check (id = auth.uid());

create policy profiles_insert on profiles for insert
  with check (id = auth.uid());

create policy company_members_select on company_members for select
  using (company_id = auth_company_id() or profile_id = auth.uid());

create policy company_members_insert on company_members for insert
  with check (
    -- Either the owner is inviting someone, or this is the first membership
    -- being created for a brand new company by its creator.
    (company_id = auth_company_id() and auth_role() = 'owner')
    or not exists (select 1 from company_members cm where cm.company_id = company_members.company_id)
  );

create policy company_members_update on company_members for update
  using (company_id = auth_company_id() and auth_role() = 'owner')
  with check (company_id = auth_company_id() and auth_role() = 'owner');

create policy approval_thresholds_select on approval_thresholds for select
  using (company_id = auth_company_id());

create policy approval_thresholds_write on approval_thresholds for insert
  with check (company_id = auth_company_id() and auth_role() in ('owner', 'accounts'));

create policy approval_thresholds_update on approval_thresholds for update
  using (company_id = auth_company_id() and auth_role() in ('owner', 'accounts'))
  with check (company_id = auth_company_id() and auth_role() in ('owner', 'accounts'));

-- -----------------------------------------------------------------------------
-- Projects
-- -----------------------------------------------------------------------------

create policy projects_select on projects for select
  using (company_id = auth_company_id() and has_project_access(id));

create policy projects_insert on projects for insert
  with check (company_id = auth_company_id() and auth_role() in ('owner', 'pm'));

create policy projects_update on projects for update
  using (company_id = auth_company_id() and auth_role() in ('owner', 'pm'))
  with check (company_id = auth_company_id() and auth_role() in ('owner', 'pm'));

create policy project_members_select on project_members for select
  using (has_project_access(project_id) or profile_id = auth.uid());

create policy project_members_write on project_members for insert
  with check (auth_role() in ('owner', 'pm') and has_project_access(project_id));

create policy project_members_delete on project_members for delete
  using (auth_role() in ('owner', 'pm') and has_project_access(project_id));

-- -----------------------------------------------------------------------------
-- Work
-- -----------------------------------------------------------------------------

create policy tasks_select on tasks for select
  using (has_project_access(project_id));

create policy tasks_insert on tasks for insert
  with check (has_project_access(project_id) and auth_role() in ('owner', 'pm'));

-- The verified gate, enforced at the database. A supervisor can update a task
-- but cannot be the one who moves it to verified, through any client.
create policy tasks_update on tasks for update
  using (has_project_access(project_id))
  with check (
    has_project_access(project_id)
    and (status <> 'verified' or can_verify_task())
  );

create policy task_comments_select on task_comments for select
  using (exists (select 1 from tasks t where t.id = task_id and has_project_access(t.project_id)));

create policy task_comments_insert on task_comments for insert
  with check (
    author_profile_id = auth.uid()
    and exists (select 1 from tasks t where t.id = task_id and has_project_access(t.project_id))
  );

create policy task_photos_select on task_photos for select
  using (exists (select 1 from tasks t where t.id = task_id and has_project_access(t.project_id)));

create policy task_photos_insert on task_photos for insert
  with check (exists (select 1 from tasks t where t.id = task_id and has_project_access(t.project_id)));

-- -----------------------------------------------------------------------------
-- Daily progress reports
-- -----------------------------------------------------------------------------

create policy dprs_select on dprs for select using (has_project_access(project_id));

create policy dprs_insert on dprs for insert
  with check (
    has_project_access(project_id)
    and submitted_by = auth.uid()
    and (auth_role() in ('pm', 'owner') or (auth_role() = 'site' and auth_site_level() = 'engineer'))
  );

create policy dprs_update on dprs for update
  using (has_project_access(project_id) and submitted_by = auth.uid())
  with check (has_project_access(project_id) and submitted_by = auth.uid());

create policy dpr_task_progress_select on dpr_task_progress for select
  using (exists (select 1 from dprs d where d.id = dpr_id and has_project_access(d.project_id)));

create policy dpr_task_progress_write on dpr_task_progress for insert
  with check (exists (select 1 from dprs d where d.id = dpr_id and has_project_access(d.project_id)));

create policy dpr_photos_select on dpr_photos for select
  using (exists (select 1 from dprs d where d.id = dpr_id and has_project_access(d.project_id)));

create policy dpr_photos_write on dpr_photos for insert
  with check (exists (select 1 from dprs d where d.id = dpr_id and has_project_access(d.project_id)));

-- -----------------------------------------------------------------------------
-- Labour
-- -----------------------------------------------------------------------------

create policy contractors_select on contractors for select using (company_id = auth_company_id());
create policy contractors_write on contractors for insert
  with check (company_id = auth_company_id() and auth_role() in ('owner', 'pm', 'site'));
create policy contractors_update on contractors for update
  using (company_id = auth_company_id() and auth_role() in ('owner', 'pm'))
  with check (company_id = auth_company_id());

create policy workers_select on workers for select using (company_id = auth_company_id());
create policy workers_write on workers for insert
  with check (company_id = auth_company_id() and auth_role() in ('owner', 'pm', 'site'));
create policy workers_update on workers for update
  using (company_id = auth_company_id() and auth_role() in ('owner', 'pm', 'site'))
  with check (company_id = auth_company_id());

-- Attendance is editable on purpose. Corrections are the point; the audit
-- trigger records who changed what.
create policy attendance_select on attendance for select using (has_project_access(project_id));
create policy attendance_write on attendance for insert
  with check (has_project_access(project_id) and auth_role() in ('owner', 'pm', 'site'));
create policy attendance_update on attendance for update
  using (has_project_access(project_id) and auth_role() in ('owner', 'pm', 'site'))
  with check (has_project_access(project_id));

create policy wage_advances_select on wage_advances for select
  using (exists (select 1 from workers w where w.id = worker_id and w.company_id = auth_company_id()));
create policy wage_advances_write on wage_advances for insert
  with check (
    auth_role() in ('owner', 'pm', 'accounts')
    and exists (select 1 from workers w where w.id = worker_id and w.company_id = auth_company_id())
  );
create policy wage_advances_update on wage_advances for update
  using (auth_role() in ('owner', 'pm', 'accounts'))
  with check (auth_role() in ('owner', 'pm', 'accounts'));

-- -----------------------------------------------------------------------------
-- Materials and procurement
-- -----------------------------------------------------------------------------

create policy material_items_select on material_items for select using (company_id = auth_company_id());
create policy material_items_write on material_items for insert
  with check (company_id = auth_company_id() and auth_role() in ('owner', 'pm', 'procurement'));
create policy material_items_update on material_items for update
  using (company_id = auth_company_id() and auth_role() in ('owner', 'pm', 'procurement'))
  with check (company_id = auth_company_id());

create policy material_requests_select on material_requests for select
  using (has_project_access(project_id));
create policy material_requests_write on material_requests for insert
  with check (has_project_access(project_id) and requested_by = auth.uid());
create policy material_requests_update on material_requests for update
  using (has_project_access(project_id) and auth_role() in ('owner', 'pm', 'accounts', 'procurement'))
  with check (has_project_access(project_id));

create policy material_request_items_select on material_request_items for select
  using (exists (
    select 1 from material_requests r where r.id = request_id and has_project_access(r.project_id)
  ));
create policy material_request_items_write on material_request_items for insert
  with check (exists (
    select 1 from material_requests r where r.id = request_id and has_project_access(r.project_id)
  ));

create policy vendors_select on vendors for select using (company_id = auth_company_id());
create policy vendors_write on vendors for insert
  with check (company_id = auth_company_id() and auth_role() in ('owner', 'procurement'));
create policy vendors_update on vendors for update
  using (company_id = auth_company_id() and auth_role() in ('owner', 'procurement'))
  with check (company_id = auth_company_id());

create policy purchase_orders_select on purchase_orders for select
  using (company_id = auth_company_id() and has_project_access(project_id));
create policy purchase_orders_write on purchase_orders for insert
  with check (company_id = auth_company_id() and auth_role() in ('owner', 'pm', 'procurement'));
create policy purchase_orders_update on purchase_orders for update
  using (company_id = auth_company_id() and auth_role() in ('owner', 'pm', 'procurement', 'accounts'))
  with check (company_id = auth_company_id());

create policy purchase_order_items_select on purchase_order_items for select
  using (exists (
    select 1 from purchase_orders po
    where po.id = purchase_order_id and po.company_id = auth_company_id()
  ));
create policy purchase_order_items_write on purchase_order_items for insert
  with check (exists (
    select 1 from purchase_orders po
    where po.id = purchase_order_id and po.company_id = auth_company_id()
  ));

create policy goods_receipts_select on goods_receipts for select using (has_project_access(project_id));
create policy goods_receipts_write on goods_receipts for insert
  with check (has_project_access(project_id) and auth_role() in ('owner', 'pm', 'procurement', 'site'));
create policy goods_receipts_update on goods_receipts for update
  using (has_project_access(project_id) and auth_role() in ('owner', 'pm', 'procurement', 'site'))
  with check (has_project_access(project_id));

create policy goods_receipt_items_select on goods_receipt_items for select
  using (exists (
    select 1 from goods_receipts g where g.id = goods_receipt_id and has_project_access(g.project_id)
  ));
create policy goods_receipt_items_write on goods_receipt_items for insert
  with check (exists (
    select 1 from goods_receipts g where g.id = goods_receipt_id and has_project_access(g.project_id)
  ));
create policy goods_receipt_items_update on goods_receipt_items for update
  using (exists (
    select 1 from goods_receipts g where g.id = goods_receipt_id and has_project_access(g.project_id)
  ))
  with check (true);

create policy stock_movements_select on stock_movements for select using (has_project_access(project_id));
create policy stock_movements_write on stock_movements for insert
  with check (has_project_access(project_id) and auth_role() in ('owner', 'pm', 'procurement', 'site'));
create policy stock_movements_update on stock_movements for update
  using (has_project_access(project_id) and auth_role() in ('owner', 'pm', 'procurement', 'site'))
  with check (has_project_access(project_id));

-- -----------------------------------------------------------------------------
-- Equipment
-- -----------------------------------------------------------------------------

create policy assets_select on assets for select using (company_id = auth_company_id());
create policy assets_write on assets for insert
  with check (company_id = auth_company_id() and auth_role() in ('owner', 'pm', 'procurement'));
create policy assets_update on assets for update
  using (company_id = auth_company_id() and auth_role() in ('owner', 'pm', 'procurement', 'site'))
  with check (company_id = auth_company_id());

create policy asset_movements_select on asset_movements for select
  using (exists (select 1 from assets a where a.id = asset_id and a.company_id = auth_company_id()));
create policy asset_movements_write on asset_movements for insert
  with check (
    auth_role() in ('owner', 'pm', 'procurement', 'site')
    and exists (select 1 from assets a where a.id = asset_id and a.company_id = auth_company_id())
  );
create policy asset_movements_update on asset_movements for update
  using (exists (select 1 from assets a where a.id = asset_id and a.company_id = auth_company_id()))
  with check (true);

create policy asset_costs_select on asset_costs for select
  using (exists (select 1 from assets a where a.id = asset_id and a.company_id = auth_company_id()));
create policy asset_costs_write on asset_costs for insert
  with check (
    auth_role() in ('owner', 'pm', 'procurement', 'accounts')
    and exists (select 1 from assets a where a.id = asset_id and a.company_id = auth_company_id())
  );

-- -----------------------------------------------------------------------------
-- Issues, expenses, documents
-- -----------------------------------------------------------------------------

create policy issues_select on issues for select using (has_project_access(project_id));
create policy issues_write on issues for insert
  with check (has_project_access(project_id) and raised_by = auth.uid());
create policy issues_update on issues for update
  using (has_project_access(project_id))
  with check (has_project_access(project_id));

create policy issue_photos_select on issue_photos for select
  using (exists (select 1 from issues i where i.id = issue_id and has_project_access(i.project_id)));
create policy issue_photos_write on issue_photos for insert
  with check (exists (select 1 from issues i where i.id = issue_id and has_project_access(i.project_id)));

create policy issue_comments_select on issue_comments for select
  using (exists (select 1 from issues i where i.id = issue_id and has_project_access(i.project_id)));
create policy issue_comments_write on issue_comments for insert
  with check (
    author_profile_id = auth.uid()
    and exists (select 1 from issues i where i.id = issue_id and has_project_access(i.project_id))
  );

create policy expenses_select on expenses for select using (has_project_access(project_id));
create policy expenses_write on expenses for insert
  with check (has_project_access(project_id) and submitted_by = auth.uid());
create policy expenses_update on expenses for update
  using (
    has_project_access(project_id)
    and (submitted_by = auth.uid() or auth_role() in ('owner', 'accounts', 'pm'))
  )
  with check (has_project_access(project_id));

-- Office-only documents are invisible to site and procurement roles.
create policy documents_select on documents for select
  using (
    company_id = auth_company_id()
    and (project_id is null or has_project_access(project_id))
    and (visibility = 'project_team' or auth_role() in ('owner', 'pm', 'accounts'))
  );
create policy documents_write on documents for insert
  with check (company_id = auth_company_id() and uploaded_by = auth.uid());
create policy documents_update on documents for update
  using (company_id = auth_company_id() and auth_role() in ('owner', 'pm'))
  with check (company_id = auth_company_id());

-- -----------------------------------------------------------------------------
-- Cross cutting
-- -----------------------------------------------------------------------------

create policy notifications_select on notifications for select
  using (recipient_profile_id = auth.uid());
create policy notifications_update on notifications for update
  using (recipient_profile_id = auth.uid())
  with check (recipient_profile_id = auth.uid());
create policy notifications_insert on notifications for insert
  with check (company_id = auth_company_id());

-- The audit log is readable by the office roles and written only by triggers,
-- which run as security definer and therefore bypass this policy.
create policy audit_log_select on audit_log for select
  using (company_id = auth_company_id() and auth_role() in ('owner', 'pm', 'accounts'));
