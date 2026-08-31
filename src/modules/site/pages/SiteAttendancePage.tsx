import { useState } from 'react';
import { PageHeader } from '@/components/patterns/PageHeader';
import { Input } from '@/components/ui/Input';
import { useProject } from '@/contexts/ProjectContext';
import { useTranslate } from '@/contexts/I18nContext';
import { todayIso } from '@/lib/format/date';
import { AttendanceSheet } from '@/modules/labour/components/AttendanceSheet';
import { useAttendance, useSaveAttendance, useWorkers } from '@/modules/labour/hooks/useLabour';

/**
 * Attendance on the site shell.
 * The same sheet as the office screen, sized for a phone: two taps for a team
 * of thirty, then adjust the exceptions.
 */
export function SiteAttendancePage() {
  const t = useTranslate();
  const { currentProjectId } = useProject();
  const [date, setDate] = useState(todayIso());

  const workersQuery = useWorkers();
  const attendanceQuery = useAttendance(currentProjectId, date, date);
  const save = useSaveAttendance(currentProjectId ?? '', date);

  return (
    <div className="flex flex-col gap-3">
      <PageHeader title={t('labour.attendance')} />

      <Input
        label={t('common.date')}
        type="date"
        value={date}
        max={todayIso()}
        onChange={(event) => setDate(event.target.value)}
        wrapperClassName="max-w-44"
      />

      <AttendanceSheet
        key={date}
        workers={workersQuery.data ?? []}
        existing={attendanceQuery.data ?? []}
        isLoading={workersQuery.isLoading || attendanceQuery.isLoading}
        isSaving={save.isPending}
        onSave={(marks) => save.mutate(marks)}
      />
    </div>
  );
}
