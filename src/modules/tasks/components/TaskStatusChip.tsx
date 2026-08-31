import { StatusChip, type StatusTone } from '@/components/ui/StatusChip';
import { useTranslate } from '@/contexts/I18nContext';
import type { TaskStatus } from '@/types/enums';

/** Maps a task status to the tone that carries its meaning. */
const STATUS_TONE: Record<TaskStatus, StatusTone> = {
  created: 'neutral',
  assigned: 'info',
  in_progress: 'info',
  completed: 'ontrack',
  verified: 'ontrack',
  on_hold: 'risk',
  cancelled: 'neutral',
};

/** The status chip used in the task list, the detail screen and the DPR. */
export function TaskStatusChip({ status, size = 'sm' }: { status: TaskStatus; size?: 'sm' | 'md' }) {
  const t = useTranslate();
  return <StatusChip label={t(`tasks.status.${status}`)} tone={STATUS_TONE[status]} size={size} />;
}

/** Maps a priority to its chip tone. */
export function PriorityChip({ priority, size = 'sm' }: { priority: string; size?: 'sm' | 'md' }) {
  const t = useTranslate();
  const tone: StatusTone =
    priority === 'critical' ? 'delayed' : priority === 'high' ? 'risk' : 'neutral';
  return <StatusChip label={t(`status.${priority}`)} tone={tone} size={size} />;
}
