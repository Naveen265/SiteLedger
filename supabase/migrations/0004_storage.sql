-- =============================================================================
-- SiteLedger 0004: storage buckets and their policies.
--
-- Every bucket is private. The interface renders images through short lived
-- signed URLs, so a site photo is never readable by anyone outside the company.
--
-- Every object path begins with the company id, which is what lets one policy
-- isolate every tenant:  {company_id}/{scope}/{uuid}.{ext}
-- =============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('task-photos',      'task-photos',      false, 10485760,  array['image/jpeg','image/png','image/webp']),
  ('dpr-photos',       'dpr-photos',       false, 10485760,  array['image/jpeg','image/png','image/webp']),
  ('issue-photos',     'issue-photos',     false, 10485760,  array['image/jpeg','image/png','image/webp']),
  ('expense-receipts', 'expense-receipts', false, 10485760,  array['image/jpeg','image/png','image/webp','application/pdf']),
  ('challans',         'challans',         false, 10485760,  array['image/jpeg','image/png','image/webp','application/pdf']),
  ('asset-photos',     'asset-photos',     false, 10485760,  array['image/jpeg','image/png','image/webp']),
  ('avatars',          'avatars',          false, 2097152,   array['image/jpeg','image/png','image/webp']),
  -- Documents are larger and may be drawings or contracts, so the cap is 25 MB.
  ('documents',        'documents',        false, 26214400,  null)
on conflict (id) do nothing;

-- One policy set covers every bucket, because tenancy is encoded in the path.
create policy siteledger_storage_select on storage.objects for select
  using (
    bucket_id in (
      'task-photos','dpr-photos','issue-photos','expense-receipts',
      'challans','asset-photos','avatars','documents'
    )
    and (storage.foldername(name))[1] = auth_company_id()::text
  );

create policy siteledger_storage_insert on storage.objects for insert
  with check (
    bucket_id in (
      'task-photos','dpr-photos','issue-photos','expense-receipts',
      'challans','asset-photos','avatars','documents'
    )
    and (storage.foldername(name))[1] = auth_company_id()::text
  );

create policy siteledger_storage_update on storage.objects for update
  using (
    bucket_id in (
      'task-photos','dpr-photos','issue-photos','expense-receipts',
      'challans','asset-photos','avatars','documents'
    )
    and (storage.foldername(name))[1] = auth_company_id()::text
  );

create policy siteledger_storage_delete on storage.objects for delete
  using (
    bucket_id in (
      'task-photos','dpr-photos','issue-photos','expense-receipts',
      'challans','asset-photos','avatars','documents'
    )
    and (storage.foldername(name))[1] = auth_company_id()::text
    and owner = auth.uid()
  );
