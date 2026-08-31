import { z } from 'zod';
import {
  ASSET_OWNERSHIPS, ASSET_TYPES, DOC_TYPES, DOC_VISIBILITIES, EXPENSE_CATEGORIES,
  PRIORITIES, PROJECT_STATUSES, PROJECT_TYPES, TASK_STATUSES,
} from '@/types/enums';

/**
 * One schema per entity, shared by the form and the write path.
 * A field is validated once, here, so the message the user sees and the rule
 * the database enforces can never drift apart.
 */

/** A required text field, with a message that names what is missing. */
const requiredText = (field: string, max = 200) =>
  z.string().trim().min(1, `${field} is required.`).max(max, `${field} is too long.`);

/**
 * An optional text field.
 * Deliberately no `.transform()`: a transform makes a schema's input and output
 * types diverge, which breaks form typing. Empty strings become null in the
 * api layer, where the database row shape is built.
 */
const optionalText = (max = 2000) => z.string().trim().max(max).optional();

/** A rupee amount typed by a user, kept as rupees until it is converted. */
const rupees = z.coerce
  .number({ message: 'Enter a number.' })
  .min(0, 'Amount cannot be negative.');

/** An optional ISO date string from a date input. */
const optionalDate = z.string().optional();

/* ------------------------------- Company -------------------------------- */

export const companySchema = z.object({
  name: requiredText('Company name'),
  type: optionalText(80),
  gstin: z
    .string()
    .trim()
    .regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][0-9A-Z]Z[0-9A-Z]$/, 'Enter a valid 15 character GSTIN.')
    .or(z.literal(''))
    .optional(),
  address: optionalText(400),
  default_locale: z.enum(['en', 'ta', 'hi']),
});
export type CompanyInput = z.infer<typeof companySchema>;

export const inviteSchema = z.object({
  full_name: requiredText('Name'),
  phone: z
    .string()
    .trim()
    .regex(/^[0-9]{10}$/, 'Enter a 10 digit mobile number.')
    .or(z.literal(''))
    .optional(),
  email: z.string().trim().email('Enter a valid email address.'),
  role: z.enum(['owner', 'pm', 'site', 'procurement', 'accounts']),
  site_level: z.enum(['engineer', 'supervisor']).nullable().optional(),
  project_ids: z.array(z.string().uuid()).default([]),
});
export type InviteInput = z.infer<typeof inviteSchema>;

/* ------------------------------- Projects ------------------------------- */

export const projectSchema = z
  .object({
    name: requiredText('Project name'),
    code: optionalText(40),
    type: z.enum(PROJECT_TYPES).nullable().optional(),
    client_name: optionalText(160),
    address: optionalText(400),
    start_date: optionalDate,
    planned_end_date: optionalDate,
    status: z.enum(PROJECT_STATUSES),
    budget_rupees: rupees.nullable().optional(),
    description: optionalText(),
  })
  // A plan that ends before it starts is a data entry error, not a valid state.
  .refine(
    (value) =>
      !value.start_date || !value.planned_end_date || value.planned_end_date >= value.start_date,
    { message: 'The planned end date must be on or after the start date.', path: ['planned_end_date'] },
  );
export type ProjectInput = z.infer<typeof projectSchema>;

/* --------------------------------- Tasks -------------------------------- */

export const taskSchema = z
  .object({
    title: requiredText('Task title'),
    description: optionalText(),
    assignee_profile_id: z.string().uuid().nullable().optional(),
    assignee_name_text: optionalText(160),
    start_date: optionalDate,
    due_date: optionalDate,
    priority: z.enum(PRIORITIES),
    status: z.enum(TASK_STATUSES),
    progress_pct: z.coerce.number().min(0).max(100),
  })
  .refine((value) => !value.start_date || !value.due_date || value.due_date >= value.start_date, {
    message: 'The due date must be on or after the start date.',
    path: ['due_date'],
  });
export type TaskInput = z.infer<typeof taskSchema>;

/* --------------------------------- Labour ------------------------------- */

export const workerSchema = z.object({
  full_name: requiredText('Worker name'),
  phone: z
    .string()
    .trim()
    .regex(/^[0-9]{10}$/, 'Enter a 10 digit mobile number.')
    .or(z.literal(''))
    .optional(),
  category: requiredText('Category', 60),
  daily_rate_rupees: rupees.min(1, 'A daily rate is required to calculate wages.'),
  contractor_id: z.string().uuid().nullable().optional(),
});
export type WorkerInput = z.infer<typeof workerSchema>;

export const contractorSchema = z.object({
  name: requiredText('Contractor name'),
  contact_phone: z
    .string()
    .trim()
    .regex(/^[0-9]{10}$/, 'Enter a 10 digit mobile number.')
    .or(z.literal(''))
    .optional(),
});
export type ContractorInput = z.infer<typeof contractorSchema>;

export const advanceSchema = z.object({
  worker_id: z.string().uuid('Choose a worker.'),
  project_id: z.string().uuid().nullable().optional(),
  amount_rupees: rupees.min(1, 'Enter the advance amount.'),
  advance_date: z.string().min(1, 'Choose a date.'),
  note: optionalText(400),
});
export type AdvanceInput = z.infer<typeof advanceSchema>;

/* ------------------------------- Materials ------------------------------ */

export const materialItemSchema = z.object({
  name: requiredText('Material name'),
  unit: requiredText('Unit', 20),
  category: optionalText(80),
  standard_rate_rupees: rupees.nullable().optional(),
  low_stock_threshold: z.coerce.number().min(0).nullable().optional(),
});
export type MaterialItemInput = z.infer<typeof materialItemSchema>;

export const materialRequestSchema = z.object({
  needed_by: optionalDate,
  note: optionalText(500),
  items: z
    .array(
      z.object({
        material_item_id: z.string().uuid().nullable().optional(),
        free_text_name: optionalText(160),
        quantity: z.coerce.number().positive('Enter a quantity above zero.'),
        unit: requiredText('Unit', 20),
      }),
    )
    .min(1, 'Add at least one material to the request.'),
});
export type MaterialRequestInput = z.infer<typeof materialRequestSchema>;

export const stockIssueSchema = z.object({
  material_item_id: z.string().uuid('Choose a material.'),
  quantity: z.coerce.number().positive('Enter a quantity above zero.'),
  issued_to_task_id: z.string().uuid().nullable().optional(),
  note: optionalText(300),
});
export type StockIssueInput = z.infer<typeof stockIssueSchema>;

/* ------------------------------ Procurement ----------------------------- */

export const vendorSchema = z.object({
  name: requiredText('Vendor name'),
  gstin: optionalText(20),
  contact_phone: optionalText(20),
  contact_email: z.string().trim().email('Enter a valid email address.').or(z.literal('')).optional(),
  address: optionalText(400),
});
export type VendorInput = z.infer<typeof vendorSchema>;

export const purchaseOrderSchema = z.object({
  vendor_id: z.string().uuid('Choose a vendor.'),
  expected_date: optionalDate,
  notes: optionalText(500),
  items: z
    .array(
      z.object({
        material_item_id: z.string().uuid('Choose a material.'),
        quantity: z.coerce.number().positive('Enter a quantity above zero.'),
        rate_rupees: rupees.min(0.01, 'Enter the rate.'),
        gst_pct: z.coerce.number().min(0).max(100),
      }),
    )
    .min(1, 'Add at least one line to the order.'),
});
export type PurchaseOrderInput = z.infer<typeof purchaseOrderSchema>;

export const goodsReceiptSchema = z.object({
  received_date: z.string().min(1, 'Choose the date the goods arrived.'),
  note: optionalText(400),
  items: z
    .array(
      z.object({
        purchase_order_item_id: z.string().uuid(),
        quantity_received: z.coerce.number().min(0),
      }),
    )
    .min(1),
});
export type GoodsReceiptInput = z.infer<typeof goodsReceiptSchema>;

/* ------------------------------- Equipment ------------------------------ */

export const assetSchema = z
  .object({
    name: requiredText('Asset name'),
    asset_type: z.enum(ASSET_TYPES),
    ownership: z.enum(ASSET_OWNERSHIPS),
    identifier: optionalText(80),
    set_quantity: z.coerce.number().min(1).nullable().optional(),
    purchase_value_rupees: rupees.nullable().optional(),
    rental_vendor_id: z.string().uuid().nullable().optional(),
    rental_start_date: optionalDate,
    rental_due_date: optionalDate,
    rental_rate_rupees: rupees.nullable().optional(),
    idle_threshold_days: z.coerce.number().min(1).max(365),
  })
  // A rented asset without a return date is exactly the gear that gets lost.
  .refine((value) => value.ownership !== 'rented' || Boolean(value.rental_due_date), {
    message: 'A rented asset needs a return due date so the reminder can fire.',
    path: ['rental_due_date'],
  })
  // A reusable set is tracked by quantity, so the quantity is not optional.
  .refine((value) => value.asset_type !== 'reusable_set' || Boolean(value.set_quantity), {
    message: 'A reusable set needs a quantity, for example the number of panels.',
    path: ['set_quantity'],
  });
export type AssetInput = z.infer<typeof assetSchema>;

export const assetMovementSchema = z.object({
  to_project_id: z.string().uuid().nullable().optional(),
  condition_note: optionalText(400),
});
export type AssetMovementInput = z.infer<typeof assetMovementSchema>;

/* --------------------------------- Issues ------------------------------- */

export const issueSchema = z.object({
  title: requiredText('Issue title'),
  description: optionalText(),
  area: optionalText(120),
  priority: z.enum(PRIORITIES),
  assignee_profile_id: z.string().uuid().nullable().optional(),
  due_date: optionalDate,
});
export type IssueInput = z.infer<typeof issueSchema>;

export const issueResolutionSchema = z.object({
  resolution_note: requiredText('Resolution note', 1000),
});
export type IssueResolutionInput = z.infer<typeof issueResolutionSchema>;

/* -------------------------------- Expenses ------------------------------ */

export const expenseSchema = z.object({
  amount_rupees: rupees.min(1, 'Enter the amount spent.'),
  category: z.enum(EXPENSE_CATEGORIES),
  spent_on: z.string().min(1, 'Choose the date the money was spent.'),
  note: optionalText(500),
});
export type ExpenseInput = z.infer<typeof expenseSchema>;

/* ------------------------------- Documents ------------------------------ */

export const documentSchema = z.object({
  name: requiredText('Document name'),
  doc_type: z.enum(DOC_TYPES),
  visibility: z.enum(DOC_VISIBILITIES),
  project_id: z.string().uuid().nullable().optional(),
});
export type DocumentInput = z.infer<typeof documentSchema>;

/* ---------------------------------- DPR --------------------------------- */

export const dprSchema = z.object({
  report_date: z.string().min(1),
  note: optionalText(1000),
  tomorrow_plan: optionalText(1000),
  weather: optionalText(80),
  task_progress: z.array(
    z.object({
      task_id: z.string().uuid(),
      progress_pct: z.coerce.number().min(0).max(100),
      quantity: z.coerce.number().nullable().optional(),
      unit: optionalText(20),
    }),
  ),
});
export type DprInput = z.infer<typeof dprSchema>;

/* ---------------------------------- Auth -------------------------------- */

export const signInSchema = z.object({
  identifier: z.string().trim().min(1, 'Enter your email address.'),
  password: z.string().min(6, 'Your password is at least 6 characters.').optional(),
});
export type SignInFormInput = z.infer<typeof signInSchema>;

export const signUpSchema = z.object({
  full_name: requiredText('Your name'),
  identifier: z.string().trim().email('Enter a valid email address.'),
  password: z.string().min(8, 'Choose a password of at least 8 characters.'),
  company_name: requiredText('Company name'),
});
export type SignUpFormInput = z.infer<typeof signUpSchema>;

/**
 * Normalises an optional form string for storage.
 * Forms produce an empty string where the user typed nothing; the database
 * wants null, so the conversion happens once, here, on the way to a row.
 */
export function nullIfEmpty(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}
