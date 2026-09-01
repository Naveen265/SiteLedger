import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { unwrap } from '@/lib/supabase/errors';
import { queryKeys } from '@/lib/query/keys';
import { useAuth } from './AuthContext';
import type { ApprovalThreshold, Company, CompanyMember } from '@/types/domain';
import type { ApprovalKind } from '@/types/enums';

/**
 * The tenant the signed-in user belongs to.
 * Company settings and approval thresholds are read once here and shared, so
 * no screen re-queries them and every threshold check uses the same numbers.
 */

type CompanyContextValue = {
  company: Company | null;
  members: CompanyMember[];
  thresholds: ApprovalThreshold[];
  isLoading: boolean;
  isError: boolean;
  /** The amount above which the given kind needs approval, or null if unset. */
  thresholdFor: (kind: ApprovalKind) => number | null;
  /** Members who are active, which is what every assignee picker should show. */
  activeMembers: CompanyMember[];
};

const CompanyContext = createContext<CompanyContextValue | null>(null);

export function CompanyProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const companyId = user?.company_id;

  const companyQuery = useQuery({
    queryKey: queryKeys.company(companyId ?? ''),
    enabled: Boolean(companyId),
    queryFn: async () =>
      unwrap(await supabase.from('companies').select('*').eq('id', companyId!).single()) as Company,
  });

  const membersQuery = useQuery({
    queryKey: queryKeys.companyMembers(companyId ?? ''),
    enabled: Boolean(companyId),
    queryFn: async () =>
      unwrap(
        await supabase
          .from('company_members')
          // Named explicitly for the same reason as in AuthContext: two
          // foreign keys from company_members reach profiles.
          .select('*, profile:profiles!company_members_profile_id_fkey(*)')
          .eq('company_id', companyId!)
          .order('created_at'),
      ) as CompanyMember[],
  });

  const thresholdsQuery = useQuery({
    queryKey: queryKeys.approvalThresholds(companyId ?? ''),
    enabled: Boolean(companyId),
    queryFn: async () =>
      unwrap(
        await supabase.from('approval_thresholds').select('*').eq('company_id', companyId!),
      ) as ApprovalThreshold[],
  });

  const value = useMemo<CompanyContextValue>(() => {
    const members = membersQuery.data ?? [];
    const thresholds = thresholdsQuery.data ?? [];

    return {
      company: companyQuery.data ?? null,
      members,
      thresholds,
      activeMembers: members.filter((member) => member.status === 'active'),
      isLoading: companyQuery.isLoading || membersQuery.isLoading || thresholdsQuery.isLoading,
      isError: companyQuery.isError || membersQuery.isError || thresholdsQuery.isError,
      /** Looks up the configured threshold amount for a kind of approval. */
      thresholdFor: (kind: ApprovalKind) =>
        thresholds.find((threshold) => threshold.kind === kind)?.amount_paise ?? null,
    };
  }, [companyQuery.data, companyQuery.isLoading, companyQuery.isError,
      membersQuery.data, membersQuery.isLoading, membersQuery.isError,
      thresholdsQuery.data, thresholdsQuery.isLoading, thresholdsQuery.isError]);

  return <CompanyContext.Provider value={value}>{children}</CompanyContext.Provider>;
}

/** Reads the company context. Throws if used outside the provider. */
export function useCompany(): CompanyContextValue {
  const context = useContext(CompanyContext);
  if (!context) throw new Error('useCompany must be used inside CompanyProvider');
  return context;
}
