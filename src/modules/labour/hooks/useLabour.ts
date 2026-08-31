import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query/keys';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { useTranslate } from '@/contexts/I18nContext';
import { toUserMessage } from '@/lib/supabase/errors';
import type { AdvanceInput, ContractorInput, WorkerInput } from '@/lib/validation';
import {
  deactivateWorker, fetchAdvances, fetchAttendance, fetchContractors, fetchWorkers,
  recordAdvance, saveAttendance, saveContractor, saveWorker, type AttendanceMark,
} from '../api/labourApi';

/** Reads the company's active workers. */
export function useWorkers() {
  const { user } = useAuth();
  return useQuery({
    queryKey: queryKeys.workers(user?.company_id ?? ''),
    enabled: Boolean(user),
    queryFn: () => fetchWorkers(user!.company_id),
  });
}

/** Reads the company's labour contractors. */
export function useContractors() {
  const { user } = useAuth();
  return useQuery({
    queryKey: queryKeys.contractors(user?.company_id ?? ''),
    enabled: Boolean(user),
    queryFn: () => fetchContractors(user!.company_id),
  });
}

/** Reads attendance for a project across a date range. */
export function useAttendance(projectId: string | null, from: string, to: string) {
  return useQuery({
    queryKey: queryKeys.attendance(projectId ?? '', from, to),
    enabled: Boolean(projectId),
    queryFn: () => fetchAttendance(projectId!, from, to),
  });
}

/** Reads advances for the company across a date range. */
export function useAdvances(from: string, to: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: queryKeys.advances(user?.company_id ?? '', from, to),
    enabled: Boolean(user),
    queryFn: () => fetchAdvances(user!.company_id, from, to),
  });
}

/** Creates or updates a worker. */
export function useSaveWorker(workerId?: string) {
  const client = useQueryClient();
  const { user } = useAuth();
  const { notify } = useToast();
  const t = useTranslate();

  return useMutation({
    mutationFn: (input: WorkerInput) => saveWorker(input, user!.company_id, workerId),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: queryKeys.workers(user!.company_id) });
      notify(t('common.saved'), 'success');
    },
    onError: (error) => notify(toUserMessage(error), 'error'),
  });
}

/** Deactivates a worker without deleting their history. */
export function useDeactivateWorker() {
  const client = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: deactivateWorker,
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: queryKeys.workers(user!.company_id) });
    },
  });
}

/** Creates a labour contractor. */
export function useSaveContractor() {
  const client = useQueryClient();
  const { user } = useAuth();
  const { notify } = useToast();
  const t = useTranslate();

  return useMutation({
    mutationFn: (input: ContractorInput) => saveContractor(input, user!.company_id),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: queryKeys.contractors(user!.company_id) });
      notify(t('common.saved'), 'success');
    },
    onError: (error) => notify(toUserMessage(error), 'error'),
  });
}

/** Saves a whole day's attendance, merging rather than doubling on replay. */
export function useSaveAttendance(projectId: string, date: string) {
  const client = useQueryClient();
  const { user } = useAuth();
  const { notify } = useToast();
  const t = useTranslate();

  return useMutation({
    mutationFn: (marks: AttendanceMark[]) => saveAttendance(projectId, date, marks, user!.id),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ['attendance', projectId] });
      notify(t('labour.saved'), 'success');
    },
    onError: (error) => notify(toUserMessage(error), 'error'),
  });
}

/** Records a wage advance. */
export function useRecordAdvance() {
  const client = useQueryClient();
  const { user } = useAuth();
  const { notify } = useToast();
  const t = useTranslate();

  return useMutation({
    mutationFn: (input: AdvanceInput) => recordAdvance(input, user!.id),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ['advances'] });
      notify(t('common.saved'), 'success');
    },
    onError: (error) => notify(toUserMessage(error), 'error'),
  });
}
