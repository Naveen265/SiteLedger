import { supabase } from '@/lib/supabase/client';
import { unwrap } from '@/lib/supabase/errors';
import { rupeesToPaise } from '@/lib/format/currency';
import { nullIfEmpty, type AdvanceInput, type ContractorInput, type WorkerInput } from '@/lib/validation';
import type { Attendance, Contractor, WageAdvance, Worker } from '@/types/domain';

/**
 * Labour reads and writes.
 * Attendance is editable, and every edit is written to the audit log by a
 * database trigger. Making corrections impossible is the incumbent's failure,
 * not a feature to copy.
 */

/** Lists the company's workers with their contractor. */
export async function fetchWorkers(companyId: string): Promise<Worker[]> {
  return unwrap(
    await supabase
      .from('workers')
      .select('*, contractor:contractors(*)')
      .eq('company_id', companyId)
      .eq('is_active', true)
      .order('full_name'),
  ) as Worker[];
}

/** Lists the company's labour contractors. */
export async function fetchContractors(companyId: string): Promise<Contractor[]> {
  return unwrap(
    await supabase.from('contractors').select('*').eq('company_id', companyId).order('name'),
  ) as Contractor[];
}

/** Creates or updates a worker, converting the typed rate into paise. */
export async function saveWorker(
  input: WorkerInput,
  companyId: string,
  workerId?: string,
): Promise<Worker> {
  const row = {
    company_id: companyId,
    full_name: input.full_name,
    phone: nullIfEmpty(input.phone),
    category: input.category,
    daily_rate_paise: rupeesToPaise(input.daily_rate_rupees),
    contractor_id: input.contractor_id ?? null,
  };

  return unwrap(
    workerId
      ? await supabase.from('workers').update(row).eq('id', workerId).select().single()
      : await supabase.from('workers').insert(row).select().single(),
  ) as Worker;
}

/** Deactivates a worker. Workers are never deleted, so history stays intact. */
export async function deactivateWorker(workerId: string): Promise<void> {
  const { error } = await supabase.from('workers').update({ is_active: false }).eq('id', workerId);
  if (error) throw error;
}

/** Creates a labour contractor. */
export async function saveContractor(input: ContractorInput, companyId: string): Promise<Contractor> {
  return unwrap(
    await supabase
      .from('contractors')
      .insert({
        name: input.name,
        contact_phone: nullIfEmpty(input.contact_phone),
        company_id: companyId,
      })
      .select()
      .single(),
  ) as Contractor;
}

/** Reads attendance for a project across a date range. */
export async function fetchAttendance(
  projectId: string,
  from: string,
  to: string,
): Promise<Attendance[]> {
  return unwrap(
    await supabase
      .from('attendance')
      .select('*, worker:workers(*, contractor:contractors(*))')
      .eq('project_id', projectId)
      .gte('attendance_date', from)
      .lte('attendance_date', to),
  ) as Attendance[];
}

export type AttendanceMark = {
  worker_id: string;
  day_value: number;
  overtime_hours: number;
};

/**
 * Saves a whole day's attendance in one write.
 * The unique constraint on project, worker and date means a repeated save
 * merges rather than doubling, which is what makes an offline replay safe.
 */
export async function saveAttendance(
  projectId: string,
  date: string,
  marks: AttendanceMark[],
  markedBy: string,
): Promise<void> {
  if (marks.length === 0) return;

  const { error } = await supabase.from('attendance').upsert(
    marks.map((mark) => ({
      project_id: projectId,
      worker_id: mark.worker_id,
      attendance_date: date,
      day_value: mark.day_value,
      overtime_hours: mark.overtime_hours,
      marked_by: markedBy,
    })),
    { onConflict: 'project_id,worker_id,attendance_date' },
  );
  if (error) throw error;
}

/** Reads wage advances for a company across a date range. */
export async function fetchAdvances(
  companyId: string,
  from: string,
  to: string,
): Promise<WageAdvance[]> {
  return unwrap(
    await supabase
      .from('wage_advances')
      .select('*, worker:workers!inner(*)')
      .eq('worker.company_id', companyId)
      .gte('advance_date', from)
      .lte('advance_date', to),
  ) as WageAdvance[];
}

/** Records a wage advance against a worker. */
export async function recordAdvance(input: AdvanceInput, recordedBy: string): Promise<void> {
  const { error } = await supabase.from('wage_advances').insert({
    worker_id: input.worker_id,
    project_id: input.project_id ?? null,
    amount_paise: rupeesToPaise(input.amount_rupees),
    advance_date: input.advance_date,
    recorded_by: recordedBy,
    note: nullIfEmpty(input.note),
  });
  if (error) throw error;
}
