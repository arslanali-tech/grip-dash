import type { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabaseClient';

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

/**
 * On first successful sign-in, sync any pending invitation record:
 * - Apply `role` (and optional `metadata`) to user.user_metadata
 * - Mark invitation as accepted
 */
export async function syncPendingInvitationForUser(user: User): Promise<void> {
  if (!user.email) return;

  const email = normalizeEmail(user.email);

  const { data, error } = await supabase
    .from('invitations')
    .select('*')
    .eq('email', email)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.warn('Could not fetch pending invitation (continuing):', error.message);
    return;
  }

  if (!data) return;

  const invitation: any = data;
  const invitedRole = (invitation.role as string | undefined) ?? undefined;
  const invitedMetadata = (invitation.metadata as Record<string, unknown> | null) ?? {};

  // 1) Update user metadata (best-effort)
  try {
    const currentMeta = ((user.user_metadata ?? {}) as Record<string, unknown>) ?? {};
    const nextMeta: Record<string, unknown> = {
      ...currentMeta,
      ...invitedMetadata,
    };

    if (invitedRole) {
      nextMeta.role = invitedRole;
    }

    const needsRoleUpdate = invitedRole && currentMeta.role !== invitedRole;
    const needsMetaUpdate = Object.keys(invitedMetadata).some((k) => currentMeta[k] !== invitedMetadata[k]);

    if (needsRoleUpdate || needsMetaUpdate) {
      const { error: updateUserError } = await supabase.auth.updateUser({ data: nextMeta });
      if (updateUserError) {
        console.error('Could not update user metadata from invitation:', updateUserError.message);
      }
    }
  } catch (e) {
    console.error('Unexpected error updating user metadata from invitation:', e);
  }

  // 2) Mark invitation accepted (best-effort)
  try {
    const acceptedAt = new Date().toISOString();
    const acceptPayload = {
      status: 'accepted',
      accepted_at: acceptedAt,
      accepted_user_id: user.id,
    };

    const { error: acceptError } = await supabase.from('invitations').update(acceptPayload).eq('id', invitation.id);

    if (acceptError) {
      // Fallback for older schemas without accepted_at/accepted_user_id columns.
      const { error: fallbackError } = await supabase
        .from('invitations')
        .update({ status: 'accepted' })
        .eq('id', invitation.id);

      if (fallbackError) {
        console.warn('Could not mark invitation accepted:', fallbackError.message);
      }
    }
  } catch (e) {
    console.error('Unexpected error marking invitation accepted:', e);
  }
}
