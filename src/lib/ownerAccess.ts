import type { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabaseClient';

const DEFAULT_FALLBACK_OWNER_EMAILS: string[] = [
  // Backwards-compat: keep existing hard-coded owner emails as fallback.
  // Prefer configuring one of:
  // 1) user.app_metadata.role = 'owner'
  // 2) table: public.grip_owner_emails (with is_approved=true)
  // 3) env: VITE_GRIP_OWNER_EMAILS="a@b.com,c@d.com"
  'gripowner@example.com',
  'inovativeali@gmail.com',
];

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function normalizeUserRole(role: string | null | undefined): string | null {
  const normalized = role?.trim().toLowerCase();
  if (!normalized) return null;

  if (
    normalized === 'branch manager' ||
    normalized === 'branch_manager' ||
    normalized === 'manager' ||
    normalized === 'branch owner' ||
    normalized === 'administrator' ||
    normalized === 'assistant manager'
  ) {
    return 'branch_manager';
  }

  if (normalized === 'agency user' || normalized === 'agency_user' || normalized === 'agency') {
    return 'agency_user';
  }

  if (normalized === 'client user' || normalized === 'client_user') {
    return 'client';
  }

  if (normalized === 'agency admin' || normalized === 'agency_admin') {
    return 'agency_admin';
  }

  return normalized;
}

export function getUserRole(user: User | null): string | null {
  if (!user) return null;
  const appRole = (user.app_metadata as any)?.role;
  const userRole = (user.user_metadata as any)?.role;
  return normalizeUserRole((appRole ?? userRole ?? null) as string | null);
}

export function isOwnerByRole(user: User | null): boolean {
  return getUserRole(user) === 'owner';
}

function getFallbackOwnerEmails(): string[] {
  const fromEnvRaw = (import.meta.env.VITE_GRIP_OWNER_EMAILS as string | undefined) ?? '';
  const fromEnv = fromEnvRaw
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean)
    .map(normalizeEmail);

  if (fromEnv.length > 0) return fromEnv;
  return DEFAULT_FALLBACK_OWNER_EMAILS.map(normalizeEmail);
}

export async function isOwnerByApprovedEmail(email: string): Promise<boolean> {
  const normalized = normalizeEmail(email);

  // First try the DB-backed allow-list.
  try {
    const { data, error } = await supabase
      .from('grip_owner_emails')
      .select('email,is_approved')
      .eq('email', normalized)
      .eq('is_approved', true)
      .limit(1)
      .maybeSingle();

    if (error) {
      // Common during local dev if table/RLS isn't set up yet.
      console.warn('Could not check grip_owner_emails table:', error.message);
      return getFallbackOwnerEmails().includes(normalized);
    }

    return !!data;
  } catch (e) {
    console.warn('Unexpected error checking grip_owner_emails table:', e);
    return getFallbackOwnerEmails().includes(normalized);
  }
}

export async function resolveIsGripOwner(user: User): Promise<boolean> {
  if (isOwnerByRole(user)) return true;
  if (!user.email) return false;
  return isOwnerByApprovedEmail(user.email);
}
