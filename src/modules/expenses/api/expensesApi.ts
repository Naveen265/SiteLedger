import { supabase } from '@/lib/supabase/client';
import { unwrap } from '@/lib/supabase/errors';
import { rupeesToPaise } from '@/lib/format/currency';
import { nullIfEmpty, type ExpenseInput } from '@/lib/validation';
import type { Expense } from '@/types/domain';

/**
 * Expense reads and writes.
 * This answers "where is project money being spent". It is not accounting:
 * there is no ledger, no double entry and no profit and loss.
 */

const EXPENSE_SELECT =
  '*, submitter:profiles!expenses_submitted_by_fkey(*), project:projects(id, name)';

/** Lists expenses across the projects the user can see. */
export async function fetchExpenses(projectIds: string[]): Promise<Expense[]> {
  if (projectIds.length === 0) return [];
  return unwrap(
    await supabase
      .from('expenses')
      .select(EXPENSE_SELECT)
      .in('project_id', projectIds)
      .order('spent_on', { ascending: false }),
  ) as Expense[];
}

/** Submits an expense with its receipt photo. */
export async function createExpense(
  input: ExpenseInput,
  projectId: string,
  submittedBy: string,
  receiptPath: string | null,
): Promise<Expense> {
  return unwrap(
    await supabase
      .from('expenses')
      .insert({
        project_id: projectId,
        amount_paise: rupeesToPaise(input.amount_rupees),
        category: input.category,
        spent_on: input.spent_on,
        receipt_path: receiptPath,
        submitted_by: submittedBy,
        status: 'submitted',
        note: nullIfEmpty(input.note),
      })
      .select()
      .single(),
  ) as Expense;
}

/** Approves or rejects an expense, recording who decided and when. */
export async function decideExpense(
  expenseId: string,
  decision: 'approved' | 'rejected',
  approverProfileId: string,
): Promise<void> {
  const { error } = await supabase
    .from('expenses')
    .update({
      status: decision,
      approved_by: approverProfileId,
      approved_at: new Date().toISOString(),
    })
    .eq('id', expenseId);
  if (error) throw error;
}
