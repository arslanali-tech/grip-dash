import { supabase } from '@/lib/supabaseClient';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const toUuidOrNull = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return UUID_REGEX.test(trimmed) ? trimmed : null;
};

type PostgrestLikeError = {
  code?: string | null;
  message?: string | null;
  details?: string | null;
  hint?: string | null;
};

const isMissingClientIdColumnError = (error: PostgrestLikeError | null | undefined): boolean => {
  if (!error) return false;
  const code = `${error.code ?? ''}`;
  const text = `${error.message ?? ''} ${error.details ?? ''} ${error.hint ?? ''}`.toLowerCase();
  const mentionsClientId = text.includes('client_id');
  const indicatesMissingColumn =
    text.includes('does not exist') ||
    text.includes('schema cache') ||
    text.includes('could not find the') ||
    text.includes('column');

  return (
    mentionsClientId &&
    (indicatesMissingColumn || code === '42703' || code === 'PGRST204' || code === 'PGRST100')
  );
};
const DIARY_EVENTS_CLIENT_ID_COLUMN_CACHE_KEY = 'grip.diary_events.client_id_column_available';

const readCachedColumnAvailability = (key: string): boolean | null => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(key);
    if (raw === 'true') return true;
    if (raw === 'false') return false;
  } catch {
    // ignore storage access failures
  }
  return null;
};

const writeCachedColumnAvailability = (key: string, available: boolean): void => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, available ? 'true' : 'false');
  } catch {
    // ignore storage access failures
  }
};

let diaryEventsClientIdColumnAvailable: boolean | null =
  readCachedColumnAvailability(DIARY_EVENTS_CLIENT_ID_COLUMN_CACHE_KEY);

// The client_id column is guaranteed to exist after the
// 20260210_fix_complete_client_data_isolation migration. Clear any stale
// negative cache so we always include client_id in writes.
if (diaryEventsClientIdColumnAvailable === false) {
  diaryEventsClientIdColumnAvailable = null;
  writeCachedColumnAvailability(DIARY_EVENTS_CLIENT_ID_COLUMN_CACHE_KEY, true);
}

export interface DiaryEventRow {
  id: string;
  agency_id: string;
  client_id: string | null;
  branch_id: string | null;
  staff_id: string | null;
  title: string;
  description: string | null;
  category: string;
  start_at: string;
  end_at: string;
  all_day: boolean;
  location: string | null;
  guest_emails: string[] | null;
  vendor_name: string | null;
  property_address: string | null;
  feedback: any | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface FetchDiaryEventsInput {
  agencyId: string;
  clientId?: string | null;
  /** ISO string (timestamptz) */
  rangeStart: string;
  /** ISO string (timestamptz) */
  rangeEnd: string;
  branchId?: string | null;
  includeAgencyWide?: boolean;
  /** If provided, will filter staff_id to this staff (often combined with includeStaffNull) */
  staffId?: string | null;
  /** When staffId is provided, include staff_id IS NULL rows too (e.g. shared/branch diary) */
  includeStaffNull?: boolean;
}

export async function fetchDiaryEvents(input: FetchDiaryEventsInput): Promise<DiaryEventRow[]> {
  const safeAgencyId = toUuidOrNull(input.agencyId);
  if (!safeAgencyId) {
    console.warn('fetchDiaryEvents skipped: invalid agencyId', { agencyId: input.agencyId });
    return [];
  }
  const safeClientId = toUuidOrNull(input.clientId);
  if (!safeClientId && input.clientId) {
    console.warn('fetchDiaryEvents ignoring invalid clientId filter', { clientId: input.clientId });
  }

  const safeBranchId = toUuidOrNull(input.branchId);
  if (!safeBranchId && input.branchId) {
    console.warn('fetchDiaryEvents ignoring invalid branchId filter', { branchId: input.branchId });
  }

  const safeStaffId = toUuidOrNull(input.staffId);
  if (!safeStaffId && input.staffId) {
    console.warn('fetchDiaryEvents ignoring invalid staffId filter', { staffId: input.staffId });
  }
  const buildQuery = (includeClientIdFilter: boolean) => {
    let q = supabase
      .from('diary_events')
      .select('*')
      .eq('agency_id', safeAgencyId)
      // Overlap check: start_at <= rangeEnd AND end_at >= rangeStart
      .lte('start_at', input.rangeEnd)
      .gte('end_at', input.rangeStart)
      .order('start_at', { ascending: true });

    if (includeClientIdFilter && safeClientId) {
      q = q.eq('client_id', safeClientId);
    }
    if (safeBranchId) {
      if (input.includeAgencyWide) {
        q = q.or(`branch_id.eq.${safeBranchId},branch_id.is.null`);
      } else {
        q = q.eq('branch_id', safeBranchId);
      }
    }
    if (safeStaffId) {
      if (input.includeStaffNull) {
        q = q.or(`staff_id.eq.${safeStaffId},staff_id.is.null`);
      } else {
        q = q.eq('staff_id', safeStaffId);
      }
    }

    return q;
  };

  const shouldUseClientIdFilter = !!safeClientId && diaryEventsClientIdColumnAvailable !== false;
  let { data, error } = await buildQuery(shouldUseClientIdFilter);
  if (!error && shouldUseClientIdFilter) {
    diaryEventsClientIdColumnAvailable = true;
    writeCachedColumnAvailability(DIARY_EVENTS_CLIENT_ID_COLUMN_CACHE_KEY, true);
  }
  if (error && shouldUseClientIdFilter && isMissingClientIdColumnError(error as PostgrestLikeError)) {
    diaryEventsClientIdColumnAvailable = false;
    writeCachedColumnAvailability(DIARY_EVENTS_CLIENT_ID_COLUMN_CACHE_KEY, false);
    console.warn('diary_events.client_id column missing; retrying fetchDiaryEvents without client_id filter');
    ({ data, error } = await buildQuery(false));
  }
  if (error) {
    console.error('Error fetching diary events', error);
    return [];
  }
  return (data as DiaryEventRow[]) ?? [];
}

export interface CreateDiaryEventInput {
  agency_id: string;
  client_id?: string | null;
  branch_id?: string | null;
  staff_id?: string | null;
  title: string;
  description?: string | null;
  category: string;
  start_at: string;
  end_at: string;
  all_day?: boolean;
  location?: string | null;
  guest_emails?: string[] | null;
  vendor_name?: string | null;
  property_address?: string | null;
  feedback?: any | null;
  created_by?: string | null;
}


const isRlsDeniedError = (error: PostgrestLikeError | null | undefined): boolean => {
  if (!error) return false;
  const code = `${error.code ?? ''}`;
  const text = `${error.message ?? ''} ${error.details ?? ''} ${error.hint ?? ''}`.toLowerCase();
  return code === '42501' || text.includes('row-level security') || text.includes('permission denied');
};

const normalizeRole = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const normalized = value.trim().toLowerCase().replace(/[\s-]+/g, '_');
  return normalized || null;
};

const decodeJwtClaims = (accessToken: string | null | undefined): Record<string, any> | null => {
  if (!accessToken) return null;
  const decoder = (globalThis as any)?.atob;
  if (typeof decoder !== 'function') return null;
  try {
    const parts = accessToken.split('.');
    if (parts.length < 2) return null;
    const payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padding = payload.length % 4 === 0 ? '' : '='.repeat(4 - (payload.length % 4));
    return JSON.parse(decoder(payload + padding));
  } catch {
    return null;
  }
};

interface AuthWriteContext {
  userId: string | null;
  role: string | null;
  clientId: string | null;
  branchId: string | null;
  staffId: string | null;
}

const EMPTY_AUTH_WRITE_CONTEXT: AuthWriteContext = {
  userId: null,
  role: null,
  clientId: null,
  branchId: null,
  staffId: null,
};

const resolveAuthWriteContext = async (): Promise<AuthWriteContext> => {
  try {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data?.user) return EMPTY_AUTH_WRITE_CONTEXT;
    const { data: sessionData } = await supabase.auth.getSession();

    const user = data.user;
    const userMeta = (user.user_metadata as any) ?? {};
    const appMeta = (user.app_metadata as any) ?? {};
    const claims = decodeJwtClaims(sessionData?.session?.access_token);
    const claimMeta = (claims?.user_metadata as any) ?? {};

    const userId = toUuidOrNull(user.id);
    const role = normalizeRole(userMeta.role ?? appMeta.role ?? claims?.role ?? claimMeta.role);
    let branchId = toUuidOrNull(
      userMeta.branch_id ?? appMeta.branch_id ?? claims?.branch_id ?? claimMeta.branch_id ?? null
    );
    let staffId = toUuidOrNull(
      userMeta.staff_id ?? appMeta.staff_id ?? claims?.staff_id ?? claimMeta.staff_id ?? null
    );
    let clientId = toUuidOrNull(
      userMeta.client_id ?? appMeta.client_id ?? claims?.client_id ?? claimMeta.client_id ?? null
    );

    if (!clientId && user.email) {
      const normalizedEmail = user.email.trim().toLowerCase();

      const { data: clientRow, error: clientError } = await supabase
        .from('clients')
        .select('id')
        .ilike('email', normalizedEmail)
        .limit(1)
        .maybeSingle();
      if (!clientError) {
        clientId = toUuidOrNull((clientRow as any)?.id);
      }

      if (!clientId) {
        const { data: staffRow, error: staffError } = await supabase
          .from('client_staff')
          .select('id, client_id, branch_id')
          .ilike('email', normalizedEmail)
          .limit(1)
          .maybeSingle();
        if (!staffError) {
          clientId = toUuidOrNull((staffRow as any)?.client_id);
          if (!staffId) {
            staffId = toUuidOrNull((staffRow as any)?.id);
          }
          if (!branchId) {
            branchId = toUuidOrNull((staffRow as any)?.branch_id);
          }
        }
      }
    }

    return {
      userId,
      role,
      clientId,
      branchId,
      staffId,
    };
  } catch {
    return EMPTY_AUTH_WRITE_CONTEXT;
  }
};

const isBranchScopedRole = (role: string | null): boolean =>
  role === 'branch_manager' || role === 'negotiator' || role === 'prospector';

const isPersonalStaffRole = (role: string | null): boolean =>
  role === 'negotiator' || role === 'prospector';
export async function createDiaryEvent(input: CreateDiaryEventInput): Promise<DiaryEventRow | null> {
  const safeAgencyId = toUuidOrNull(input.agency_id);
  if (!safeAgencyId) {
    console.error('createDiaryEvent aborted: invalid agency_id', { agency_id: input.agency_id });
    return null;
  }

  const safeClientId = toUuidOrNull(input.client_id);
  if (input.client_id && !safeClientId) {
    console.warn('createDiaryEvent coercing invalid client_id to null', { client_id: input.client_id });
  }

  const safeBranchId = toUuidOrNull(input.branch_id);
  if (input.branch_id && !safeBranchId) {
    console.warn('createDiaryEvent coercing invalid branch_id to null', { branch_id: input.branch_id });
  }

  const safeStaffId = toUuidOrNull(input.staff_id);
  if (input.staff_id && !safeStaffId) {
    console.warn('createDiaryEvent coercing invalid staff_id to null', { staff_id: input.staff_id });
  }

  const safeCreatedBy = toUuidOrNull(input.created_by);
  if (input.created_by && !safeCreatedBy) {
    console.warn('createDiaryEvent coercing invalid created_by to null', { created_by: input.created_by });
  }

  const authContext = await resolveAuthWriteContext();
  const role = authContext.role;
  const enforceBranchScope = isBranchScopedRole(role) || !!authContext.branchId;
  const enforcePersonalScope =
    isPersonalStaffRole(role) || (!!authContext.staffId && role !== 'branch_manager');

  const effectiveClientId = safeClientId ?? authContext.clientId;
  const effectiveCreatedBy = safeCreatedBy ?? authContext.userId;
  const initialBranchId =
    safeBranchId ?? (enforceBranchScope ? authContext.branchId : null);
  const initialStaffId =
    safeStaffId ?? (enforcePersonalScope ? authContext.staffId : null);

  const buildInsertPayload = ({
    includeClientIdColumn,
    branchId,
    staffId,
  }: {
    includeClientIdColumn: boolean;
    branchId: string | null;
    staffId: string | null;
  }) => ({
    agency_id: safeAgencyId,
    ...(includeClientIdColumn ? { client_id: effectiveClientId ?? null } : {}),
    branch_id: branchId,
    staff_id: staffId,
    title: input.title,
    description: input.description ?? null,
    category: input.category,
    start_at: input.start_at,
    end_at: input.end_at,
    all_day: input.all_day ?? false,
    location: input.location ?? null,
    guest_emails: input.guest_emails ?? null,
    vendor_name: input.vendor_name ?? null,
    property_address: input.property_address ?? null,
    feedback: input.feedback ?? null,
    created_by: effectiveCreatedBy ?? null,
    updated_at: new Date().toISOString(),
  });

  // Always include client_id – the column is guaranteed to exist and the
  // server-side BEFORE INSERT trigger will auto-populate it when NULL.
  const shouldIncludeClientIdColumn = true;
  let attemptBranchId: string | null = initialBranchId ?? null;
  let attemptStaffId: string | null = initialStaffId ?? null;

  console.info('createDiaryEvent context', {
    role,
    effectiveClientId,
    effectiveCreatedBy,
    initialBranchId,
    initialStaffId,
    enforceBranchScope,
    enforcePersonalScope,
  });

  let { data, error } = await supabase
    .from('diary_events')
    .insert(
      buildInsertPayload({
        includeClientIdColumn: shouldIncludeClientIdColumn,
        branchId: attemptBranchId,
        staffId: attemptStaffId,
      })
    )
    .select('*')
    .single();

  if (!error) {
    diaryEventsClientIdColumnAvailable = true;
    writeCachedColumnAvailability(DIARY_EVENTS_CLIENT_ID_COLUMN_CACHE_KEY, true);
  }

  // If insert is blocked by RLS, retry with less restrictive scope.
  if (
    error &&
    isRlsDeniedError(error as PostgrestLikeError) &&
    attemptStaffId
  ) {
    console.warn('createDiaryEvent retrying without staff_id due to RLS', error);
    attemptStaffId = null;
    ({ data, error } = await supabase
      .from('diary_events')
      .insert(
        buildInsertPayload({
          includeClientIdColumn: shouldIncludeClientIdColumn,
          branchId: attemptBranchId,
          staffId: attemptStaffId,
        })
      )
      .select('*')
      .single());
  }

  if (
    error &&
    isRlsDeniedError(error as PostgrestLikeError) &&
    attemptBranchId
  ) {
    console.warn('createDiaryEvent retrying without branch_id due to RLS', error);
    attemptBranchId = null;
    ({ data, error } = await supabase
      .from('diary_events')
      .insert(
        buildInsertPayload({
          includeClientIdColumn: shouldIncludeClientIdColumn,
          branchId: attemptBranchId,
          staffId: attemptStaffId,
        })
      )
      .select('*')
      .single());
  }

  if (error) {
    console.error('Error creating diary event', {
      error,
      role,
      effectiveClientId,
      attemptBranchId,
      attemptStaffId,
    });
    return null;
  }

  return (data as DiaryEventRow) ?? null;
}

export type UpdateDiaryEventInput = Partial<
  Pick<
    DiaryEventRow,
    | 'branch_id'
    | 'staff_id'
    | 'title'
    | 'description'
    | 'category'
    | 'start_at'
    | 'end_at'
    | 'all_day'
    | 'location'
    | 'guest_emails'
    | 'vendor_name'
    | 'property_address'
    | 'feedback'
  >
>;

export async function updateDiaryEvent(id: string, input: UpdateDiaryEventInput): Promise<DiaryEventRow | null> {
  const payload: Record<string, unknown> = {
    ...input,
    updated_at: new Date().toISOString(),
  };

  if (Object.prototype.hasOwnProperty.call(input, 'branch_id')) {
    payload.branch_id = toUuidOrNull(input.branch_id);
  }

  if (Object.prototype.hasOwnProperty.call(input, 'staff_id')) {
    payload.staff_id = toUuidOrNull(input.staff_id);
  }

  const { data, error } = await supabase
    .from('diary_events')
    .update(payload)
    .eq('id', id)
    .select('*')
    .single();

  if (error) {
    console.error('Error updating diary event', error);
    return null;
  }

  return (data as DiaryEventRow) ?? null;
}

export async function deleteDiaryEvent(id: string): Promise<void> {
  const { error } = await supabase.from('diary_events').delete().eq('id', id);
  if (error) {
    console.error('Error deleting diary event', error);
  }
}
