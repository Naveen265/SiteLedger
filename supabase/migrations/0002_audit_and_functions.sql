-- =============================================================================
-- SiteLedger 0002: audit trail, tenancy helpers, and the transactional
-- functions the client calls.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Audit trail
--
-- Attached to the tables where corrections matter and where the incumbent
-- product fails: attendance, goods receipts, stock movements, asset movements,
-- wage advances and expenses. Records are correctable, and every correction is
-- recorded with who, when, and old to new.
-- -----------------------------------------------------------------------------

create or replace function audit_trigger() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_company_id uuid;
  v_record_id uuid;
begin
  v_record_id := coalesce(new.id, old.id);

  -- Resolve the tenant from whichever column this table carries.
  begin
    v_company_id := (to_jsonb(coalesce(new, old)) ->> 'company_id')::uuid;
  exception when others then
    v_company_id := null;
  end;

  if v_company_id is null then
    -- Project scoped tables reach the tenant through their project.
    begin
      select p.company_id into v_company_id
      from projects p
      where p.id = (to_jsonb(coalesce(new, old)) ->> 'project_id')::uuid;
    exception when others then
      v_company_id := null;
    end;
  end if;

  insert into audit_log (company_id, table_name, record_id, action, actor_profile_id, before, after)
  values (
    v_company_id,
    tg_table_name,
    v_record_id,
    lower(tg_op)::audit_action,
    auth.uid(),
    case when tg_op = 'INSERT' then null else to_jsonb(old) end,
    case when tg_op = 'DELETE' then null else to_jsonb(new) end
  );

  return coalesce(new, old);
end;
$$;

do $$
declare
  target text;
begin
  foreach target in array array[
    'attendance', 'goods_receipt_items', 'stock_movements',
    'asset_movements', 'wage_advances', 'expenses'
  ]
  loop
    execute format(
      'create trigger %I after insert or update or delete on %I for each row execute function audit_trigger()',
      't_' || target || '_audit', target
    );
  end loop;
end $$;

-- -----------------------------------------------------------------------------
-- Tenancy helpers used by every policy
--
-- Marked stable and security definer so a policy can read the membership table
-- without recursing back through that table's own policies.
-- -----------------------------------------------------------------------------

-- The company of the current user.
create or replace function auth_company_id() returns uuid
language sql stable security definer set search_path = public as $$
  select company_id
  from company_members
  where profile_id = auth.uid() and status = 'active'
  limit 1;
$$;

-- The role of the current user.
create or replace function auth_role() returns role_key
language sql stable security definer set search_path = public as $$
  select role
  from company_members
  where profile_id = auth.uid() and status = 'active'
  limit 1;
$$;

-- The site sub-permission of the current user, or null for other roles.
create or replace function auth_site_level() returns site_level_key
language sql stable security definer set search_path = public as $$
  select site_level
  from company_members
  where profile_id = auth.uid() and status = 'active'
  limit 1;
$$;

-- Whether the current user may see a given project. Owners and accounts see
-- every project in their company; everyone else sees only their assignments.
create or replace function has_project_access(p uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1
    from projects pr
    where pr.id = p
      and pr.company_id = auth_company_id()
      and (
        auth_role() in ('owner', 'accounts')
        or exists (
          select 1 from project_members pm
          where pm.project_id = p and pm.profile_id = auth.uid()
        )
      )
  );
$$;

-- Whether the current user may move a task to verified. Enforced here as well
-- as in the interface, so a direct API call cannot bypass the gate.
create or replace function can_verify_task() returns boolean
language sql stable security definer set search_path = public as $$
  select auth_role() in ('owner', 'pm')
      or (auth_role() = 'site' and auth_site_level() = 'engineer');
$$;

-- -----------------------------------------------------------------------------
-- Sign-up: create the company and make the creator its owner, atomically.
-- -----------------------------------------------------------------------------

create or replace function create_company_with_owner(
  p_company_name text,
  p_full_name text
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_company_id uuid;
begin
  if auth.uid() is null then
    raise exception 'You must be signed in to create a company.';
  end if;

  if exists (select 1 from company_members where profile_id = auth.uid()) then
    raise exception 'This account already belongs to a company.';
  end if;

  insert into companies (name) values (p_company_name) returning id into v_company_id;

  insert into profiles (id, full_name, email)
  values (auth.uid(), p_full_name, (select email from auth.users where id = auth.uid()))
  on conflict (id) do update set full_name = excluded.full_name;

  insert into company_members (company_id, profile_id, role, status)
  values (v_company_id, auth.uid(), 'owner', 'active');

  -- Sensible starting thresholds. Every firm draws this line differently, so
  -- these are defaults to edit, not rules baked into the product.
  insert into approval_thresholds (company_id, kind, amount_paise, approver_role)
  values
    (v_company_id, 'expense', 1000000, 'accounts'),
    (v_company_id, 'purchase_order', 5000000, 'owner');

  return v_company_id;
end;
$$;

-- -----------------------------------------------------------------------------
-- Submit a daily progress report.
--
-- Writes the report, its task progress rows, its photos and the updated
-- progress on each task as one transaction. Submitting therefore updates task
-- progress and project progress with no second entry anywhere.
-- -----------------------------------------------------------------------------

create or replace function submit_dpr(
  p_project_id uuid,
  p_submitted_by uuid,
  p_report_date date,
  p_note text,
  p_tomorrow_plan text,
  p_weather text,
  p_task_progress jsonb,
  p_photo_paths text[],
  p_timing_seconds int
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_dpr_id uuid;
  v_row jsonb;
  v_path text;
begin
  if not has_project_access(p_project_id) then
    raise exception 'You do not have access to this project.';
  end if;

  -- Resubmitting the same day replaces that day's figures rather than
  -- creating a second report for the same person and date.
  insert into dprs (
    project_id, report_date, submitted_by, note, tomorrow_plan, weather, dpr_timing_seconds
  )
  values (
    p_project_id, p_report_date, p_submitted_by, p_note, p_tomorrow_plan, p_weather, p_timing_seconds
  )
  on conflict (project_id, report_date, submitted_by) do update
    set note = excluded.note,
        tomorrow_plan = excluded.tomorrow_plan,
        weather = excluded.weather,
        dpr_timing_seconds = excluded.dpr_timing_seconds,
        submitted_at = now()
  returning id into v_dpr_id;

  delete from dpr_task_progress where dpr_id = v_dpr_id;

  for v_row in select * from jsonb_array_elements(coalesce(p_task_progress, '[]'::jsonb))
  loop
    insert into dpr_task_progress (dpr_id, task_id, progress_pct, quantity, unit)
    values (
      v_dpr_id,
      (v_row ->> 'task_id')::uuid,
      (v_row ->> 'progress_pct')::int,
      nullif(v_row ->> 'quantity', '')::numeric,
      nullif(v_row ->> 'unit', '')
    );

    -- The report is the single entry point: task progress updates from it,
    -- and a task that reaches 100 moves to completed, not to verified.
    update tasks
    set progress_pct = (v_row ->> 'progress_pct')::int,
        status = case
          when status in ('verified', 'cancelled') then status
          when (v_row ->> 'progress_pct')::int >= 100 then 'completed'::task_status
          when (v_row ->> 'progress_pct')::int > 0 then 'in_progress'::task_status
          else status
        end
    where id = (v_row ->> 'task_id')::uuid;
  end loop;

  foreach v_path in array coalesce(p_photo_paths, array[]::text[])
  loop
    insert into dpr_photos (dpr_id, storage_path) values (v_dpr_id, v_path);
  end loop;

  return v_dpr_id;
end;
$$;

-- -----------------------------------------------------------------------------
-- Record a goods receipt.
--
-- Writes the receipt, its lines, the matching stock movements and the new
-- order status as one transaction, so stock on hand and the order can never
-- disagree after a partial delivery.
-- -----------------------------------------------------------------------------

create or replace function record_goods_receipt(
  p_purchase_order_id uuid,
  p_project_id uuid,
  p_received_date date,
  p_received_by uuid,
  p_challan_path text,
  p_note text,
  p_items jsonb
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_receipt_id uuid;
  v_row jsonb;
  v_item purchase_order_items%rowtype;
  v_total_ordered numeric;
  v_total_received numeric;
begin
  if not has_project_access(p_project_id) then
    raise exception 'You do not have access to this project.';
  end if;

  insert into goods_receipts (
    purchase_order_id, project_id, received_date, received_by, challan_path, note
  )
  values (p_purchase_order_id, p_project_id, p_received_date, p_received_by, p_challan_path, p_note)
  returning id into v_receipt_id;

  for v_row in select * from jsonb_array_elements(coalesce(p_items, '[]'::jsonb))
  loop
    select * into v_item
    from purchase_order_items
    where id = (v_row ->> 'purchase_order_item_id')::uuid;

    insert into goods_receipt_items (goods_receipt_id, purchase_order_item_id, quantity_received)
    values (v_receipt_id, v_item.id, (v_row ->> 'quantity_received')::numeric);

    -- The receipt writes the movement. Stock is a view over these rows, so it
    -- is correct the moment the receipt lands, and stays correct if it is
    -- later corrected.
    insert into stock_movements (
      project_id, material_item_id, movement_type, quantity,
      reference_table, reference_id, moved_by, note
    )
    values (
      p_project_id, v_item.material_item_id, 'receipt',
      (v_row ->> 'quantity_received')::numeric,
      'goods_receipts', v_receipt_id, p_received_by, p_note
    );
  end loop;

  -- Recompute the order status from what has actually arrived.
  select coalesce(sum(quantity), 0) into v_total_ordered
  from purchase_order_items where purchase_order_id = p_purchase_order_id;

  select coalesce(sum(gri.quantity_received), 0) into v_total_received
  from goods_receipt_items gri
  join purchase_order_items poi on poi.id = gri.purchase_order_item_id
  where poi.purchase_order_id = p_purchase_order_id;

  update purchase_orders
  set status = case
    when v_total_received >= v_total_ordered then 'received'::po_status
    when v_total_received > 0 then 'partially_received'::po_status
    else status
  end
  where id = p_purchase_order_id;

  return v_receipt_id;
end;
$$;

-- -----------------------------------------------------------------------------
-- Keep a profile row in step with the auth user, so a newly signed-up user
-- always has somewhere to hang their name and locale.
-- -----------------------------------------------------------------------------

create or replace function handle_new_auth_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, full_name, email, phone)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    new.email,
    new.phone
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger t_auth_user_created
after insert on auth.users
for each row execute function handle_new_auth_user();
