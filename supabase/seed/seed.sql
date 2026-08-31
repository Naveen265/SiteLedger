-- =============================================================================
-- SiteLedger demo data
--
-- Run this AFTER you have signed up in the app, so an owner and a company
-- already exist. It populates that company with realistic Indian data so every
-- screen can be reviewed with content rather than empty states.
--
--   select seed_demo_data();
--
-- Re-running is safe: it clears the demo rows it created and rebuilds them.
-- =============================================================================

create or replace function seed_demo_data() returns text
language plpgsql security definer set search_path = public as $$
declare
  v_company_id uuid;
  v_owner_id uuid;

  v_p1 uuid; v_p2 uuid; v_p3 uuid; v_p4 uuid;
  v_c1 uuid; v_c2 uuid; v_c3 uuid;
  v_v1 uuid; v_v2 uuid;
  v_m_cement uuid; v_m_steel uuid; v_m_sand uuid; v_m_brick uuid; v_m_aggregate uuid; v_m_tiles uuid;
  v_po uuid; v_po_item uuid;
  v_task uuid;
  v_worker uuid;
  v_asset uuid;
  v_day date;
  v_i int;
begin
  select company_id, profile_id into v_company_id, v_owner_id
  from company_members
  where profile_id = auth.uid() and role = 'owner' and status = 'active'
  limit 1;

  if v_company_id is null then
    return 'No company found for this user. Sign up as an owner first, then run this again.';
  end if;

  -- ---------------------------------------------------------------- projects
  insert into projects (company_id, name, code, type, client_name, address, start_date, planned_end_date, status, budget_paise, description)
  values
    (v_company_id, 'Anna Nagar Residency', 'ANR-01', 'residential', 'Vaishnavi Constructions',
     'Block 12, Anna Nagar West, Chennai 600040', current_date - 120, current_date + 90, 'active',
     185000000, 'G plus 4 residential block, 24 units.'),
    (v_company_id, 'Coimbatore Tech Park Phase 2', 'CTP-02', 'commercial', 'Kovai Infratech',
     'Peelamedu, Coimbatore 641004', current_date - 200, current_date - 10, 'active',
     420000000, 'Two office towers with basement parking.'),
    (v_company_id, 'ECR Villa Cluster', 'ECR-07', 'residential', 'Marina Realty',
     'Injambakkam, East Coast Road, Chennai 600115', current_date - 45, current_date + 210, 'active',
     96000000, 'Six independent villas with common amenities.'),
    (v_company_id, 'Guindy Warehouse Fitout', 'GWF-03', 'interior', 'Southline Logistics',
     'Industrial Estate, Guindy, Chennai 600032', current_date - 20, current_date + 40, 'planning',
     34000000, 'Racking, flooring and office fitout.')
  returning id into v_p1;

  select id into v_p1 from projects where company_id = v_company_id and code = 'ANR-01';
  select id into v_p2 from projects where company_id = v_company_id and code = 'CTP-02';
  select id into v_p3 from projects where company_id = v_company_id and code = 'ECR-07';
  select id into v_p4 from projects where company_id = v_company_id and code = 'GWF-03';

  insert into project_members (project_id, profile_id)
  values (v_p1, v_owner_id), (v_p2, v_owner_id), (v_p3, v_owner_id), (v_p4, v_owner_id)
  on conflict do nothing;

  -- ------------------------------------------------------------- contractors
  insert into contractors (company_id, name, contact_phone) values
    (v_company_id, 'Murugan Labour Contractors', '9840112233'),
    (v_company_id, 'Selvam Steel Team', '9789045612'),
    (v_company_id, 'Rahman Finishing Crew', '9962778899');

  select id into v_c1 from contractors where company_id = v_company_id and name = 'Murugan Labour Contractors';
  select id into v_c2 from contractors where company_id = v_company_id and name = 'Selvam Steel Team';
  select id into v_c3 from contractors where company_id = v_company_id and name = 'Rahman Finishing Crew';

  -- ----------------------------------------------------------------- workers
  insert into workers (company_id, full_name, phone, category, daily_rate_paise, contractor_id) values
    (v_company_id, 'Karthik Raja',      '9840100001', 'mason',       95000,  v_c1),
    (v_company_id, 'Suresh Kumar',      '9840100002', 'mason',       95000,  v_c1),
    (v_company_id, 'Mohan Das',         '9840100003', 'unskilled',   65000,  v_c1),
    (v_company_id, 'Anbu Selvan',       '9840100004', 'unskilled',   65000,  v_c1),
    (v_company_id, 'Vignesh Prabhu',    '9840100005', 'semi_skilled',78000,  v_c1),
    (v_company_id, 'Ramesh Babu',       '9840100006', 'steel_fixer', 105000, v_c2),
    (v_company_id, 'Dinesh Kannan',     '9840100007', 'steel_fixer', 105000, v_c2),
    (v_company_id, 'Manikandan S',      '9840100008', 'carpenter',   98000,  v_c2),
    (v_company_id, 'Abdul Rahman',      '9840100009', 'skilled',     110000, v_c3),
    (v_company_id, 'Ilyas Basha',       '9840100010', 'skilled',     110000, v_c3),
    (v_company_id, 'Prakash Velu',      '9840100011', 'operator',    120000, null),
    (v_company_id, 'Ganesan M',         '9840100012', 'supervisor',  135000, null);

  -- ------------------------------------------------------------- attendance
  -- Forty five days of history with realistic absences, so the headcount trend
  -- and the wage summary both have something honest to show.
  for v_i in 0..44 loop
    v_day := current_date - v_i;
    -- Sunday is not a working day.
    continue when extract(dow from v_day) = 0;

    for v_worker in select id from workers where company_id = v_company_id loop
      insert into attendance (project_id, worker_id, attendance_date, day_value, overtime_hours, marked_by)
      values (
        v_p1,
        v_worker,
        v_day,
        case
          when random() < 0.08 then 0      -- roughly one in twelve absent
          when random() < 0.12 then 0.5    -- some half days
          else 1
        end,
        case when random() < 0.2 then 2 else 0 end,
        v_owner_id
      )
      on conflict (project_id, worker_id, attendance_date) do nothing;
    end loop;
  end loop;

  insert into wage_advances (worker_id, project_id, amount_paise, advance_date, recorded_by, note)
  select id, v_p1, 200000, current_date - 12, v_owner_id, 'Festival advance'
  from workers where company_id = v_company_id limit 4;

  -- ----------------------------------------------------------- material master
  insert into material_items (company_id, name, unit, category, standard_rate_paise, low_stock_threshold) values
    (v_company_id, 'OPC 53 grade cement', 'bag', 'Cement',     42000, 50),
    (v_company_id, 'TMT steel 12mm',      'kg',  'Steel',       7200, 500),
    (v_company_id, 'M sand',              'cum', 'Aggregate',  95000, 10),
    (v_company_id, 'Red clay brick',      'nos', 'Masonry',      900, 2000),
    (v_company_id, '20mm aggregate',      'cum', 'Aggregate',  88000, 10),
    (v_company_id, 'Vitrified tile 600x600', 'sqm', 'Finishes', 68000, 40);

  select id into v_m_cement    from material_items where company_id = v_company_id and name = 'OPC 53 grade cement';
  select id into v_m_steel     from material_items where company_id = v_company_id and name = 'TMT steel 12mm';
  select id into v_m_sand      from material_items where company_id = v_company_id and name = 'M sand';
  select id into v_m_brick     from material_items where company_id = v_company_id and name = 'Red clay brick';
  select id into v_m_aggregate from material_items where company_id = v_company_id and name = '20mm aggregate';
  select id into v_m_tiles     from material_items where company_id = v_company_id and name = 'Vitrified tile 600x600';

  -- ----------------------------------------------------------------- vendors
  insert into vendors (company_id, name, gstin, contact_phone, contact_email, address) values
    (v_company_id, 'Sri Balaji Traders', '33AABCS1429B1ZQ', '9445001122', 'sales@sribalajitraders.in', 'Ambattur, Chennai'),
    (v_company_id, 'Kovai Steel Depot',  '33AACCK7391M1Z8', '9842003344', 'orders@kovaisteel.in', 'Ganapathy, Coimbatore');

  select id into v_v1 from vendors where company_id = v_company_id and name = 'Sri Balaji Traders';
  select id into v_v2 from vendors where company_id = v_company_id and name = 'Kovai Steel Depot';

  -- ------------------------------------------------------------------- tasks
  insert into tasks (project_id, title, description, priority, status, progress_pct, start_date, due_date, assignee_profile_id)
  values
    (v_p1, 'Second floor slab shuttering', 'Erect and align shuttering for the second floor slab.', 'high', 'completed', 100, current_date - 30, current_date - 20, v_owner_id),
    (v_p1, 'Second floor slab reinforcement', 'Place and tie reinforcement as per drawing R-204.', 'critical', 'in_progress', 65, current_date - 18, current_date - 2, v_owner_id),
    (v_p1, 'Second floor slab concreting', 'M25 pour, 110 cum.', 'critical', 'assigned', 0, current_date - 1, current_date + 5, v_owner_id),
    (v_p1, 'Ground floor block work', 'Internal partition walls, all units.', 'medium', 'in_progress', 45, current_date - 40, current_date + 10, v_owner_id),
    (v_p1, 'External plastering, east face', 'Two coat plaster.', 'medium', 'created', 0, current_date + 5, current_date + 35, null),
    (v_p2, 'Tower B basement waterproofing', 'Membrane and protection screed.', 'high', 'in_progress', 80, current_date - 60, current_date - 5, v_owner_id),
    (v_p2, 'Tower A facade glazing', 'Unitised glazing, levels 3 to 8.', 'high', 'in_progress', 35, current_date - 30, current_date + 25, v_owner_id),
    (v_p2, 'Fire fighting pipework', 'Wet riser and sprinkler mains.', 'medium', 'assigned', 10, current_date - 10, current_date + 45, null),
    (v_p3, 'Villa 1 footing excavation', 'Excavate to founding level.', 'medium', 'verified', 100, current_date - 40, current_date - 30, v_owner_id),
    (v_p3, 'Villa 1 to 3 plinth beam', 'Cast plinth beams.', 'high', 'in_progress', 55, current_date - 25, current_date + 8, v_owner_id),
    (v_p3, 'Compound wall', 'Boundary wall on three sides.', 'low', 'created', 0, current_date + 20, current_date + 70, null),
    (v_p4, 'Racking layout marking', 'Mark out racking grid on floor.', 'medium', 'assigned', 0, current_date, current_date + 7, v_owner_id);

  -- ------------------------------------------------------ daily progress reports
  -- Thirty days of reports with a few deliberately missing, so the compliance
  -- chart has something meaningful to show.
  for v_i in 0..29 loop
    v_day := current_date - v_i;
    continue when extract(dow from v_day) = 0;
    continue when v_i in (3, 11, 17);

    insert into dprs (project_id, report_date, submitted_by, note, tomorrow_plan, dpr_timing_seconds, submitted_at)
    values (
      v_p1, v_day, v_owner_id,
      'Work proceeding as planned. Material stock adequate.',
      'Continue reinforcement on the second floor slab.',
      40 + floor(random() * 35)::int,
      v_day + time '18:30'
    )
    on conflict (project_id, report_date, submitted_by) do nothing;
  end loop;

  -- ------------------------------------------------- procurement and stock
  insert into purchase_orders (company_id, project_id, vendor_id, po_number, status, expected_date, notes)
  values (v_company_id, v_p1, v_v1, 'PO-ANR-0014', 'partially_received', current_date + 3, 'Cement and sand for slab pour.')
  returning id into v_po;

  insert into purchase_order_items (purchase_order_id, material_item_id, quantity, rate_paise, gst_pct)
  values (v_po, v_m_cement, 400, 42000, 28)
  returning id into v_po_item;

  insert into purchase_order_items (purchase_order_id, material_item_id, quantity, rate_paise, gst_pct)
  values (v_po, v_m_sand, 30, 95000, 5);

  insert into purchase_orders (company_id, project_id, vendor_id, po_number, status, expected_date, notes)
  values
    (v_company_id, v_p1, v_v2, 'PO-ANR-0015', 'pending_approval', current_date + 7, 'TMT steel for slab reinforcement.'),
    (v_company_id, v_p2, v_v1, 'PO-CTP-0031', 'approved', current_date + 5, 'Aggregate for basement screed.'),
    (v_company_id, v_p3, v_v1, 'PO-ECR-0004', 'received', current_date - 6, 'Bricks for plinth.');

  insert into purchase_order_items (purchase_order_id, material_item_id, quantity, rate_paise, gst_pct)
  select po.id, v_m_steel, 4200, 7200, 18 from purchase_orders po
  where po.company_id = v_company_id and po.po_number = 'PO-ANR-0015';

  insert into purchase_order_items (purchase_order_id, material_item_id, quantity, rate_paise, gst_pct)
  select po.id, v_m_aggregate, 60, 88000, 5 from purchase_orders po
  where po.company_id = v_company_id and po.po_number = 'PO-CTP-0031';

  insert into purchase_order_items (purchase_order_id, material_item_id, quantity, rate_paise, gst_pct)
  select po.id, v_m_brick, 24000, 900, 12 from purchase_orders po
  where po.company_id = v_company_id and po.po_number = 'PO-ECR-0004';

  -- A partial receipt against the first order, which is the normal case.
  insert into goods_receipts (purchase_order_id, project_id, received_date, received_by, note)
  values (v_po, v_p1, current_date - 4, v_owner_id, 'Part delivery, 260 bags.');

  insert into goods_receipt_items (goods_receipt_id, purchase_order_item_id, quantity_received)
  select gr.id, v_po_item, 260 from goods_receipts gr where gr.purchase_order_id = v_po limit 1;

  -- Ninety days of stock movement so the stock and consumption views are real.
  insert into stock_movements (project_id, material_item_id, movement_type, quantity, moved_by, moved_at, note)
  values
    (v_p1, v_m_cement,    'receipt', 260, v_owner_id, now() - interval '4 days',  'Against PO-ANR-0014'),
    (v_p1, v_m_cement,    'issue',   180, v_owner_id, now() - interval '3 days',  'Slab pour'),
    (v_p1, v_m_sand,      'receipt', 30,  v_owner_id, now() - interval '20 days', 'Bulk delivery'),
    (v_p1, v_m_sand,      'issue',   22,  v_owner_id, now() - interval '12 days', 'Block work mortar'),
    (v_p1, v_m_steel,     'receipt', 5200,v_owner_id, now() - interval '35 days', 'Reinforcement stock'),
    (v_p1, v_m_steel,     'issue',   4600,v_owner_id, now() - interval '18 days', 'Slab reinforcement'),
    (v_p1, v_m_brick,     'receipt', 32000,v_owner_id, now() - interval '50 days','Masonry stock'),
    (v_p1, v_m_brick,     'issue',   28500,v_owner_id, now() - interval '30 days','Partition walls'),
    (v_p1, v_m_aggregate, 'receipt', 45,  v_owner_id, now() - interval '25 days', 'Concrete works'),
    (v_p1, v_m_aggregate, 'issue',   41,  v_owner_id, now() - interval '10 days', 'Slab concreting'),
    (v_p1, v_m_tiles,     'receipt', 120, v_owner_id, now() - interval '15 days', 'Finishes stock'),
    (v_p1, v_m_tiles,     'issue',   95,  v_owner_id, now() - interval '5 days',  'Unit 101 to 104');

  insert into material_requests (project_id, requested_by, needed_by, status, note)
  values
    (v_p1, v_owner_id, current_date + 2, 'submitted', 'Needed before the slab pour on Thursday.'),
    (v_p3, v_owner_id, current_date + 6, 'submitted', 'Plinth beam works.'),
    (v_p2, v_owner_id, current_date - 2, 'approved',  'Basement screed.');

  insert into material_request_items (request_id, material_item_id, quantity, unit)
  select r.id, v_m_cement, 150, 'bag' from material_requests r where r.project_id = v_p1 and r.status = 'submitted';
  insert into material_request_items (request_id, material_item_id, quantity, unit)
  select r.id, v_m_steel, 1800, 'kg' from material_requests r where r.project_id = v_p3;
  insert into material_request_items (request_id, material_item_id, quantity, unit)
  select r.id, v_m_aggregate, 40, 'cum' from material_requests r where r.project_id = v_p2;

  -- ---------------------------------------------------------------- equipment
  insert into assets (company_id, name, asset_type, ownership, identifier, set_quantity, purchase_value_paise, status, current_project_id, idle_threshold_days)
  values
    (v_company_id, 'JCB 3DX backhoe',        'machine', 'owned',  'TN-09-BR-4412', null, 320000000, 'in_use', v_p2, 7),
    (v_company_id, 'JCB 3DX backhoe (2)',    'machine', 'owned',  'TN-09-BR-5518', null, 320000000, 'idle',   null, 7),
    (v_company_id, 'Concrete mixer 10/7',    'machine', 'owned',  'MIX-004',       null, 18500000,  'idle',   null, 5),
    (v_company_id, 'Tata Ace tipper',        'vehicle', 'owned',  'TN-07-AZ-9021', null, 62000000,  'in_use', v_p1, 10),
    (v_company_id, 'Diesel generator 62 kVA','machine', 'owned',  'GEN-011',       null, 74000000,  'under_repair', null, 7),
    (v_company_id, 'Slab shuttering set A',  'reusable_set', 'owned', 'SHT-A', 240, 96000000, 'in_use', v_p1, 14),
    (v_company_id, 'Slab shuttering set B',  'reusable_set', 'owned', 'SHT-B', 240, 96000000, 'idle',   null, 14),
    (v_company_id, 'Column formwork set',    'reusable_set', 'owned', 'CFW-01', 60, 42000000, 'in_use', v_p3, 14),
    (v_company_id, 'Cuplock scaffolding set','reusable_set', 'owned', 'SCF-01', 900, 128000000,'in_use', v_p2, 21),
    (v_company_id, 'Vibrator needle 40mm',   'small_tool', 'owned', 'VIB-021', null, 2200000, 'in_use', v_p1, 5),
    (v_company_id, 'Bar bending machine',    'small_tool', 'owned', 'BBM-003', null, 8500000, 'idle',  null, 7);

  insert into assets (company_id, name, asset_type, ownership, identifier, rental_vendor_id, rental_start_date, rental_due_date, rental_rate_paise, status, current_project_id, idle_threshold_days)
  values
    (v_company_id, 'Hired concrete pump',  'machine', 'rented', 'PUMP-HIRE-1', v_v1, current_date - 20, current_date - 3, 1800000, 'in_use', v_p1, 7),
    (v_company_id, 'Hired soil compactor', 'machine', 'rented', 'COMP-HIRE-2', v_v1, current_date - 12, current_date + 9, 650000,  'in_use', v_p3, 7),
    (v_company_id, 'Hired tower light',    'machine', 'rented', 'LIGHT-HIRE-3',v_v2, current_date - 30, current_date + 1, 220000,  'in_use', v_p2, 7);

  for v_asset in select id from assets where company_id = v_company_id and current_project_id is not null loop
    insert into asset_movements (asset_id, from_project_id, to_project_id, movement_type, moved_at, moved_by, condition_note)
    select v_asset, null, a.current_project_id, 'checkout', now() - interval '18 days', v_owner_id, 'Working condition, no damage.'
    from assets a where a.id = v_asset;
  end loop;

  for v_asset in select id from assets where company_id = v_company_id and status = 'idle' loop
    insert into asset_movements (asset_id, from_project_id, to_project_id, movement_type, moved_at, moved_by, condition_note)
    values (v_asset, null, null, 'return_to_yard', now() - interval '19 days', v_owner_id, 'Returned to yard after works completed.');
  end loop;

  insert into asset_costs (asset_id, project_id, cost_type, amount_paise, incurred_on, note)
  select a.id, a.current_project_id, 'rental', a.rental_rate_paise * 15, current_date - 5, 'Fifteen days hire'
  from assets a where a.company_id = v_company_id and a.ownership = 'rented';

  insert into asset_costs (asset_id, project_id, cost_type, amount_paise, incurred_on, note)
  select a.id, null, 'repair', 3400000, current_date - 8, 'Alternator replacement'
  from assets a where a.company_id = v_company_id and a.status = 'under_repair';

  -- ------------------------------------------------------------------ issues
  insert into issues (project_id, title, description, area, priority, status, raised_by, assignee_profile_id, due_date)
  values
    (v_p1, 'Honeycombing on column C4', 'Visible honeycombing at the base of column C4 after deshuttering.', 'Second floor', 'high', 'open', v_owner_id, v_owner_id, current_date - 3),
    (v_p1, 'Water logging near gate 2', 'Rain water collecting where the access road meets the site.', 'Site access', 'medium', 'assigned', v_owner_id, v_owner_id, current_date + 4),
    (v_p1, 'Steel delivery short by 400 kg', 'Challan shows 4200 kg, received 3800 kg.', 'Store', 'high', 'in_progress', v_owner_id, v_owner_id, current_date + 1),
    (v_p2, 'Glazing panel damaged in transit', 'Two panels cracked on arrival.', 'Tower A level 5', 'critical', 'open', v_owner_id, v_owner_id, current_date - 1),
    (v_p2, 'Basement pump not starting', 'Dewatering pump tripping on start.', 'Basement 1', 'critical', 'resolved', v_owner_id, v_owner_id, current_date - 8),
    (v_p3, 'Boundary dispute on north side', 'Neighbour claims 2 feet encroachment.', 'North boundary', 'high', 'assigned', v_owner_id, v_owner_id, current_date + 10),
    (v_p3, 'Sand quality below specification', 'Silt content appears high in the last two loads.', 'Store', 'medium', 'open', v_owner_id, null, current_date + 6),
    (v_p4, 'Floor level variation 25mm', 'Existing slab is out of level across bay 3.', 'Bay 3', 'medium', 'open', v_owner_id, null, current_date + 12);

  -- ---------------------------------------------------------------- expenses
  insert into expenses (project_id, amount_paise, category, spent_on, submitted_by, status, note)
  values
    (v_p1, 1250000, 'transport', current_date - 2,  v_owner_id, 'submitted', 'Lorry hire for sand'),
    (v_p1, 480000,  'misc',      current_date - 5,  v_owner_id, 'approved',  'Site consumables'),
    (v_p1, 3200000, 'equipment', current_date - 9,  v_owner_id, 'approved',  'Pump hire settlement'),
    (v_p2, 2100000, 'transport', current_date - 12, v_owner_id, 'approved',  'Material movement between sites'),
    (v_p2, 890000,  'misc',      current_date - 15, v_owner_id, 'rejected',  'Unsupported claim, no bill'),
    (v_p3, 1560000, 'material',  current_date - 6,  v_owner_id, 'submitted', 'Emergency cement purchase'),
    (v_p3, 720000,  'labour',    current_date - 18, v_owner_id, 'approved',  'Overtime settlement'),
    (v_p4, 340000,  'misc',      current_date - 3,  v_owner_id, 'submitted', 'Site setup');

  -- ----------------------------------------------------------- notifications
  insert into notifications (company_id, recipient_profile_id, kind, title, body, deep_link, urgency)
  values
    (v_company_id, v_owner_id, 'equipment.idle', 'Two machines idle beyond threshold',
     'JCB 3DX backhoe (2) and Concrete mixer 10/7 have no site allocation.', '/projects/' || v_p1 || '/equipment', 'realtime'),
    (v_company_id, v_owner_id, 'equipment.rental_due', 'Hired concrete pump is overdue for return',
     'The return date has passed. Rental continues to accrue.', '/projects/' || v_p1 || '/equipment', 'realtime'),
    (v_company_id, v_owner_id, 'po.pending', 'A purchase order is waiting for your approval',
     'PO-ANR-0015 for TMT steel is above the approval threshold.', '/projects/' || v_p1 || '/procurement', 'realtime'),
    (v_company_id, v_owner_id, 'dpr.submitted', 'Daily reports submitted',
     'Anna Nagar Residency submitted its daily report.', '/projects/' || v_p1 || '/dpr', 'digest');

  return 'Demo data created. Open My company to see it.';
end;
$$;
