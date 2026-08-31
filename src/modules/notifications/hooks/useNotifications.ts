import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query/keys';
import { useAuth } from '@/contexts/AuthContext';
import {
  fetchNotifications, markAllNotificationsRead, markNotificationRead,
} from '../api/notificationsApi';

/** Reads the signed-in user's notifications. */
export function useNotifications() {
  const { user } = useAuth();
  return useQuery({
    queryKey: queryKeys.notifications(user?.id ?? ''),
    enabled: Boolean(user),
    queryFn: () => fetchNotifications(user!.id),
    // The bell badge should feel live without polling aggressively.
    refetchInterval: 60_000,
  });
}

/** The unread count shown on the bell in both shells. */
export function useUnreadCount(): number {
  const { data } = useNotifications();
  return (data ?? []).filter((notification) => !notification.read_at).length;
}

/** Marks a single notification read, then refreshes the list. */
export function useMarkRead() {
  const client = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: markNotificationRead,
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: queryKeys.notifications(user?.id ?? '') });
    },
  });
}

/** Marks every unread notification read at once. */
export function useMarkAllRead() {
  const client = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: () => markAllNotificationsRead(user!.id),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: queryKeys.notifications(user?.id ?? '') });
    },
  });
}
