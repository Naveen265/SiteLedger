import { useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query/keys';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { useTranslate } from '@/contexts/I18nContext';
import { toUserMessage } from '@/lib/supabase/errors';
import {
  createTeamMember, resetTeamPassword, setTeamMemberStatus,
  type CreateTeamMemberInput,
} from '../api/teamApi';

/** Creates a team login. Returns the username so it can be shown to the owner. */
export function useCreateTeamMember() {
  const client = useQueryClient();
  const { user } = useAuth();
  const { notify } = useToast();
  const t = useTranslate();

  return useMutation({
    mutationFn: (input: CreateTeamMemberInput) => createTeamMember(input),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: queryKeys.companyMembers(user!.company_id) });
      notify(t('common.saved'), 'success');
    },
    onError: (error) => notify(toUserMessage(error), 'error'),
  });
}

/** Sets a new password for someone who has forgotten theirs. */
export function useResetTeamPassword() {
  const { notify } = useToast();
  const t = useTranslate();

  return useMutation({
    mutationFn: ({ profileId, password }: { profileId: string; password: string }) =>
      resetTeamPassword(profileId, password),
    onSuccess: () => notify(t('team.passwordReset'), 'success'),
    onError: (error) => notify(toUserMessage(error), 'error'),
  });
}

/** Disables or re-enables a member. */
export function useSetTeamMemberStatus() {
  const client = useQueryClient();
  const { user } = useAuth();
  const { notify } = useToast();
  const t = useTranslate();

  return useMutation({
    mutationFn: ({ profileId, status }: { profileId: string; status: 'active' | 'disabled' }) =>
      setTeamMemberStatus(profileId, status),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: queryKeys.companyMembers(user!.company_id) });
      notify(t('common.saved'), 'success');
    },
    onError: (error) => notify(toUserMessage(error), 'error'),
  });
}
