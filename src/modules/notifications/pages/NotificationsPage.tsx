import { useNavigate } from 'react-router-dom';
import { Bell, CheckCheck } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { PageHeader } from '@/components/patterns/PageHeader';
import { EmptyState } from '@/components/patterns/EmptyState';
import { ErrorState } from '@/components/patterns/ErrorState';
import { ListSkeleton } from '@/components/skeletons';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Tabs } from '@/components/ui/Tabs';
import { useTranslate } from '@/contexts/I18nContext';
import { formatRelative } from '@/lib/format/date';
import { useMarkAllRead, useMarkRead, useNotifications } from '../hooks/useNotifications';
import { useState } from 'react';

/**
 * The notification centre.
 * Split into what needs action and what is only information, because a single
 * undifferentiated list is what makes people stop reading notifications.
 */
export function NotificationsPage() {
  const t = useTranslate();
  const navigate = useNavigate();
  const { data, isLoading, isError, refetch } = useNotifications();
  const markRead = useMarkRead();
  const markAllRead = useMarkAllRead();
  const [tab, setTab] = useState<'action' | 'digest'>('action');

  const notifications = data ?? [];
  const actionNeeded = notifications.filter((n) => n.urgency === 'realtime');
  const digest = notifications.filter((n) => n.urgency === 'digest');
  const visible = tab === 'action' ? actionNeeded : digest;
  const unreadCount = notifications.filter((n) => !n.read_at).length;

  /** Marks the notification read and follows its deep link, if it has one. */
  const open = (id: string, deepLink: string | null, isRead: boolean) => {
    if (!isRead) markRead.mutate(id);
    if (deepLink) navigate(deepLink);
  };

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title={t('notifications.title')}
        actions={
          unreadCount > 0 && (
            <Button
              variant="secondary"
              size="sm"
              icon={<CheckCheck className="size-3.5" />}
              onClick={() => markAllRead.mutate()}
              isLoading={markAllRead.isPending}
            >
              {t('notifications.markAllRead')}
            </Button>
          )
        }
      />

      <Tabs
        value={tab}
        onChange={(value) => setTab(value as 'action' | 'digest')}
        items={[
          { value: 'action', label: t('notifications.actionNeeded'), count: actionNeeded.length },
          { value: 'digest', label: t('notifications.digest'), count: digest.length },
        ]}
      />

      {isLoading ? (
        <ListSkeleton />
      ) : isError ? (
        <ErrorState onRetry={() => void refetch()} />
      ) : visible.length === 0 ? (
        <Card>
          <EmptyState icon={<Bell className="size-6" />} message={t('notifications.empty')} />
        </Card>
      ) : (
        <ul className="flex flex-col gap-2">
          {visible.map((notification) => (
            <li key={notification.id}>
              <button
                type="button"
                onClick={() => open(notification.id, notification.deep_link, Boolean(notification.read_at))}
                className={cn(
                  'flex w-full items-start gap-3 rounded-[var(--radius-card)] border p-3 text-left',
                  'transition-colors duration-150 hover:bg-surface-subtle',
                  notification.read_at ? 'border-border bg-surface' : 'border-primary/30 bg-primary-subtle',
                )}
              >
                <span className="mt-0.5 shrink-0">
                  <Bell className={cn('size-4', notification.read_at ? 'text-ink-faint' : 'text-primary')} aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-xs font-medium text-ink">{notification.title}</span>
                  {notification.body && (
                    <span className="measure mt-0.5 block text-2xs text-ink-muted">{notification.body}</span>
                  )}
                </span>
                <span className="shrink-0 text-[10px] text-ink-faint">
                  {formatRelative(notification.created_at)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
