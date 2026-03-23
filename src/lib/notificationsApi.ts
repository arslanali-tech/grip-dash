import { supabase } from '@/lib/supabaseClient';

export interface InAppNotificationRow {
  id: string;
  agency_id: string;
  recipient_role: string;
  recipient_user_id: string | null;
  title: string;
  body: string;
  type: string;
  related_id: string | null;
  is_read: boolean;
  created_at: string;
}

export async function createInAppNotification(input: {
  agencyId: string;
  recipientRole: string;
  recipientUserId?: string;
  title: string;
  body: string;
  type: string;
  relatedId?: string;
}): Promise<InAppNotificationRow | null> {
  const { data, error } = await supabase
    .from('in_app_notifications')
    .insert({
      agency_id: input.agencyId,
      recipient_role: input.recipientRole,
      recipient_user_id: input.recipientUserId ?? null,
      title: input.title,
      body: input.body,
      type: input.type,
      related_id: input.relatedId ?? null,
    })
    .select('*')
    .single();

  if (error) {
    console.error('Error creating in-app notification', error);
    return null;
  }

  return data as InAppNotificationRow;
}

/** Send the same notification to multiple roles at once. */
export async function notifyRoles(input: {
  agencyId: string;
  roles: string[];
  title: string;
  body: string;
  type: string;
  relatedId?: string;
}): Promise<void> {
  const rows = input.roles.map((role) => ({
    agency_id: input.agencyId,
    recipient_role: role,
    title: input.title,
    body: input.body,
    type: input.type,
    related_id: input.relatedId ?? null,
  }));

  const { error } = await supabase.from('in_app_notifications').insert(rows);
  if (error) {
    console.error('Error sending notifications to roles', error);
  }
}

export async function fetchInAppNotifications(
  agencyId: string,
  options?: { recipientRole?: string; unreadOnly?: boolean; limit?: number }
): Promise<InAppNotificationRow[]> {
  let q = supabase
    .from('in_app_notifications')
    .select('*')
    .eq('agency_id', agencyId)
    .order('created_at', { ascending: false });

  if (options?.recipientRole) {
    q = q.eq('recipient_role', options.recipientRole);
  }
  if (options?.unreadOnly) {
    q = q.eq('is_read', false);
  }
  if (options?.limit) {
    q = q.limit(options.limit);
  }

  const { data, error } = await q;
  if (error) {
    console.error('Error fetching in-app notifications', error);
    return [];
  }

  return (data as InAppNotificationRow[]) ?? [];
}

export async function markNotificationRead(id: string): Promise<void> {
  const { error } = await supabase
    .from('in_app_notifications')
    .update({ is_read: true })
    .eq('id', id);

  if (error) {
    console.error('Error marking notification as read', error);
  }
}

export async function markAllNotificationsRead(agencyId: string): Promise<void> {
  const { error } = await supabase
    .from('in_app_notifications')
    .update({ is_read: true })
    .eq('agency_id', agencyId)
    .eq('is_read', false);

  if (error) {
    console.error('Error marking all notifications as read', error);
  }
}
