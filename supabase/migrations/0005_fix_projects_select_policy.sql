-- =============================================================================
-- SiteLedger 0005: fix project creation
--
-- Symptom: creating a project failed with 42501, "new row violates row-level
-- security policy for table projects", for an owner who plainly had the right
-- to create it. Inserting without RETURNING succeeded; inserting with it did
-- not. The client always uses .select() after .insert(), so no project could
-- ever be created through the interface.
--
-- Cause: projects_select called has_project_access(id), which is a STABLE
-- SECURITY DEFINER function that runs its own SELECT against projects. When
-- Postgres applies the SELECT policy to the row produced by INSERT ... RETURNING,
-- that function evaluates against a snapshot taken before the current
-- statement, so the row being inserted is invisible to it. The policy therefore
-- denied a row the user had just legitimately created.
--
-- Fix: express the same rule against the row's own columns. A policy can read
-- the candidate row directly, so no snapshot problem arises. The rule itself is
-- unchanged: owners and accounts see every project in their company, everyone
-- else sees only the projects they are assigned to.
--
-- has_project_access stays as it is and remains correct everywhere else, because
-- every other table passes it a project_id that refers to an already committed
-- row in a different table.
-- =============================================================================

drop policy if exists projects_select on projects;

create policy projects_select on projects for select
  using (
    company_id = auth_company_id()
    and (
      auth_role() in ('owner', 'accounts')
      or exists (
        select 1
        from project_members pm
        where pm.project_id = projects.id
          and pm.profile_id = auth.uid()
      )
    )
  );
