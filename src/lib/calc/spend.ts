import { format } from 'date-fns';
import type { AssetCost, Expense, GoodsReceipt, PurchaseOrder } from '@/types/domain';
import type { ExpenseCategory } from '@/types/enums';
import { sumBy } from '@/lib/utils/collections';
import { calculateReceivedValuePaise } from './materials';

/**
 * Project spend visibility. This is not accounting: there is no ledger, no
 * double entry and no profit and loss. It answers "where did the money go".
 */

export type SpendBreakdown = Record<ExpenseCategory, number>;

/** An empty breakdown, so every consumer starts from the same shape. */
function emptyBreakdown(): SpendBreakdown {
  return { labour: 0, material: 0, equipment: 0, transport: 0, misc: 0 };
}

/**
 * Total project spend, grouped by category.
 * Adds approved expenses, the value of goods received on purchase orders,
 * wages payable, and equipment rental and repair costs. Expenses still
 * awaiting approval are not included.
 */
export function calculateSpendBreakdown(input: {
  expenses: Expense[];
  purchaseOrders: PurchaseOrder[];
  goodsReceipts: GoodsReceipt[];
  assetCosts: AssetCost[];
  labourPayablePaise: number;
}): SpendBreakdown {
  const breakdown = emptyBreakdown();

  for (const expense of input.expenses) {
    if (expense.status !== 'approved') continue;
    breakdown[expense.category] += expense.amount_paise;
  }

  for (const order of input.purchaseOrders) {
    breakdown.material += calculateReceivedValuePaise(order, input.goodsReceipts);
  }

  for (const cost of input.assetCosts) {
    breakdown[cost.cost_type === 'transport' ? 'transport' : 'equipment'] += cost.amount_paise;
  }

  breakdown.labour += input.labourPayablePaise;
  return breakdown;
}

/** Sums a breakdown into a single figure. */
export function totalSpendPaise(breakdown: SpendBreakdown): number {
  return Object.values(breakdown).reduce((total, value) => total + value, 0);
}

export type MonthlySpendPoint = { month: string } & SpendBreakdown;

/** Groups approved expenses and asset costs into a month-by-category series. */
export function calculateMonthlySpend(
  expenses: Expense[],
  assetCosts: AssetCost[],
): MonthlySpendPoint[] {
  const byMonth = new Map<string, SpendBreakdown>();

  /** Adds an amount into the right month and category bucket. */
  const add = (dateIso: string, category: ExpenseCategory, paise: number) => {
    const month = format(new Date(dateIso), 'yyyy-MM');
    const bucket = byMonth.get(month) ?? emptyBreakdown();
    bucket[category] += paise;
    byMonth.set(month, bucket);
  };

  for (const expense of expenses) {
    if (expense.status !== 'approved') continue;
    add(expense.spent_on, expense.category, expense.amount_paise);
  }
  for (const cost of assetCosts) {
    add(cost.incurred_on, cost.cost_type === 'transport' ? 'transport' : 'equipment', cost.amount_paise);
  }

  return Array.from(byMonth.entries())
    .map(([month, breakdown]) => ({ month, ...breakdown }))
    .sort((a, b) => a.month.localeCompare(b.month));
}

/** Spend against budget as a percentage, or null when no budget is set. */
export function calculateBudgetUsagePct(
  spentPaise: number,
  budgetPaise: number | null,
): number | null {
  if (!budgetPaise || budgetPaise <= 0) return null;
  return Math.round((spentPaise / budgetPaise) * 100);
}

/** Whether an amount needs approval from a higher role than the submitter. */
export function needsApproval(amountPaise: number, thresholdPaise: number | null): boolean {
  if (thresholdPaise === null) return false;
  return amountPaise > thresholdPaise;
}

/** Sums expenses that are still waiting for someone to act on them. */
export function calculatePendingApprovalPaise(expenses: Expense[]): number {
  return sumBy(expenses.filter((e) => e.status === 'submitted'), (e) => e.amount_paise);
}
