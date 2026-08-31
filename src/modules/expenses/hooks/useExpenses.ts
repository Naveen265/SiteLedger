import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { useTranslate } from '@/contexts/I18nContext';
import { toUserMessage } from '@/lib/supabase/errors';
import type { ExpenseInput } from '@/lib/validation';
import { createExpense, decideExpense, fetchExpenses } from '../api/expensesApi';

/** Reads expenses across the given projects. */
export function useExpenses(projectIds: string[]) {
  return useQuery({
    queryKey: ['expenses', ...projectIds],
    enabled: projectIds.length > 0,
    queryFn: () => fetchExpenses(projectIds),
  });
}

/** Submits an expense with its receipt photo. */
export function useCreateExpense(projectId: string) {
  const client = useQueryClient();
  const { user } = useAuth();
  const { notify } = useToast();
  const t = useTranslate();

  return useMutation({
    mutationFn: ({ input, receiptPath }: { input: ExpenseInput; receiptPath: string | null }) =>
      createExpense(input, projectId, user!.id, receiptPath),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ['expenses'] });
      notify(t('common.saved'), 'success');
    },
    onError: (error) => notify(toUserMessage(error), 'error'),
  });
}

/** Approves or rejects an expense. */
export function useDecideExpense() {
  const client = useQueryClient();
  const { user } = useAuth();
  const { notify } = useToast();
  const t = useTranslate();

  return useMutation({
    mutationFn: ({ expenseId, decision }: { expenseId: string; decision: 'approved' | 'rejected' }) =>
      decideExpense(expenseId, decision, user!.id),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ['expenses'] });
      notify(t('common.saved'), 'success');
    },
    onError: (error) => notify(toUserMessage(error), 'error'),
  });
}
