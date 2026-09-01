-- =============================================================================
-- SiteLedger 0006: owner-managed team accounts
--
-- Site staff in this market frequently have no reliable email address, so the
-- owner issues credentials directly, the way an administrator does in a
-- workplace suite. An employee signs in with a company code and a username;
-- there is no self-service password reset, because the owner is the recovery
-- path.
--
-- Supabase Auth requires an email, so one is synthesised and never shown to
-- anyone:  <username>@<company_code>.siteledger.app  (both lowercased).
-- It is derived, not stored and looked up, which means signing in needs no
-- username lookup endpoint and therefore exposes no way to enumerate accounts.
-- =============================================================================

-- The short code an employee types when signing in. Uppercase, unique across
-- SiteLedger because it forms part of the synthetic address.
alter table companies add column if not exists code text;

create unique index if not exists companies_code_key
  on companies (upper(code)) where code is not null;

-- The username is unique within a company, not globally, which is the whole
-- point of pairing it with the company code.
alter table company_members add column if not exists username text;

create unique index if not exists company_members_username_key
  on company_members (company_id, lower(username)) where username is not null;

-- Set by the owner when issuing or resetting a password. While true the
-- interface allows nothing except choosing a new password.
alter table profiles add column if not exists must_change_password boolean not null default false;

-- -----------------------------------------------------------------------------
-- Give every existing company a code derived from its name, so the sign-in
-- form works for tenants created before this migration.
-- -----------------------------------------------------------------------------
update companies
set code = upper(regexp_replace(substring(name from 1 for 8), '[^a-zA-Z0-9]', '', 'g'))
where code is null or code = '';

-- A name of only punctuation would leave this empty; fall back to the id.
update companies
set code = 'CO' || upper(substring(replace(id::text, '-', '') from 1 for 6))
where code is null or code = '';

-- -----------------------------------------------------------------------------
-- Owners manage their own team. The service function performs the writes, but
-- these policies keep the rules true for any other path as well.
-- -----------------------------------------------------------------------------

-- A user may always clear their own must_change_password flag by choosing a
-- new password; profiles_update already restricts this to their own row.

drop policy if exists company_members_delete on company_members;

-- Members are disabled, never deleted, so their history stays attached.
create policy company_members_disable on company_members for update
  using (company_id = auth_company_id() and auth_role() = 'owner')
  with check (company_id = auth_company_id() and auth_role() = 'owner');

comment on column company_members.username is
  'Login name within the company. Combined with companies.code to derive the auth email.';
comment on column profiles.must_change_password is
  'True after an owner issues or resets a password. Blocks the app until changed.';
