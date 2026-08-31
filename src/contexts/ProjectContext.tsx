import { createContext, useCallback, useContext, useEffect, useMemo, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { unwrap } from '@/lib/supabase/errors';
import { queryKeys } from '@/lib/query/keys';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { useAuth } from './AuthContext';
import type { Project } from '@/types/domain';

/**
 * The project the user is currently looking at.
 * The selection is persisted per user in local storage and validated against
 * their access on load, so a user who loses access to a project does not land
 * on a blank screen.
 */

type ProjectContextValue = {
  projects: Project[];
  /** Projects that are not archived, which is what pickers should offer. */
  activeProjects: Project[];
  currentProject: Project | null;
  currentProjectId: string | null;
  setCurrentProjectId: (projectId: string | null) => void;
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
};

const ProjectContext = createContext<ProjectContextValue | null>(null);

export function ProjectProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const companyId = user?.company_id;

  // Row Level Security scopes this to projects the user may see, so the query
  // itself carries no access filter. Owners get everything in their company.
  const projectsQuery = useQuery({
    queryKey: queryKeys.projects(companyId ?? ''),
    enabled: Boolean(companyId),
    queryFn: async () =>
      unwrap(
        await supabase
          .from('projects')
          .select('*')
          .eq('company_id', companyId!)
          .order('created_at', { ascending: false }),
      ) as Project[],
  });

  const [storedProjectId, setStoredProjectId] = useLocalStorage<string | null>(
    `siteledger.project.${user?.id ?? 'anonymous'}`,
    null,
  );

  const projects = useMemo(() => projectsQuery.data ?? [], [projectsQuery.data]);

  const activeProjects = useMemo(
    () => projects.filter((project) => project.status !== 'archived'),
    [projects],
  );

  // Validate the stored selection against what the user can actually see, and
  // fall back to the first active project when the stored one is gone.
  useEffect(() => {
    if (projects.length === 0) return;
    const isValid = storedProjectId && projects.some((p) => p.id === storedProjectId);
    if (!isValid) setStoredProjectId(activeProjects[0]?.id ?? projects[0]?.id ?? null);
  }, [projects, activeProjects, storedProjectId, setStoredProjectId]);

  const currentProject = useMemo(
    () => projects.find((project) => project.id === storedProjectId) ?? null,
    [projects, storedProjectId],
  );

  const setCurrentProjectId = useCallback(
    (projectId: string | null) => setStoredProjectId(projectId),
    [setStoredProjectId],
  );

  const value = useMemo<ProjectContextValue>(
    () => ({
      projects,
      activeProjects,
      currentProject,
      currentProjectId: currentProject?.id ?? null,
      setCurrentProjectId,
      isLoading: projectsQuery.isLoading,
      isError: projectsQuery.isError,
      refetch: projectsQuery.refetch,
    }),
    [projects, activeProjects, currentProject, setCurrentProjectId,
     projectsQuery.isLoading, projectsQuery.isError, projectsQuery.refetch],
  );

  return <ProjectContext.Provider value={value}>{children}</ProjectContext.Provider>;
}

/** Reads the project context. Throws if used outside the provider. */
export function useProject(): ProjectContextValue {
  const context = useContext(ProjectContext);
  if (!context) throw new Error('useProject must be used inside ProjectProvider');
  return context;
}
