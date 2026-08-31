import { supabase } from '@/lib/supabase/client';
import { unwrap } from '@/lib/supabase/errors';
import type { Notification } from '@/types/domain';

/**
 * Notification reads and writes.
 * The in-app centre is the source of truth; a push is only ever a subset of
 * what is here.
 */

/** Lists the notifications addressed to one person, newest first. */
export async function fetchNotifications(profileId: string): Promise<Notification[]> {
  return unwrap(
    await supabase
      .from('notifications')
      .select('*')
      .eq('recipient_profile_id', profileId)
      .order('created_at', { ascending: false })
      .limit(100),
  ) as Notification[];
}

/** Marks one notification as read. */
export async function markNotificationRead(id: string): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

/** Marks every unread notification for a person as read. */
export async function markAllNotificationsRead(profileId: string): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('recipient_profile_id', profileId)
    .is('read_at', null);
  if (error) throw error;
}
