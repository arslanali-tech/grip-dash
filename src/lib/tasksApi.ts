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
const TASKS_CLIENT_ID_COLUMN_CACHE_KEY = 'grip.tasks.client_id_column_available';

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

let tasksClientIdColumnAvailable: boolean | null =
  readCachedColumnAvailability(TASKS_CLIENT_ID_COLUMN_CACHE_KEY);

// The client_id column is guaranteed to exist after the
// 20260210_fix_complete_client_data_isolation migration. Clear any stale
// negative cache so we always include client_id in writes.
if (tasksClientIdColumnAvailable === false) {
  tasksClientIdColumnAvailable = null;
  writeCachedColumnAvailability(TASKS_CLIENT_ID_COLUMN_CACHE_KEY, true);
}

export type TaskStatus = 'todo' | 'in_progress' | 'done';
export type TaskRecurrence = 'none' | 'daily' | 'weekly' | 'monthly';

export interface TaskRow {
  id: string;
  agency_id: string;
  client_id: string | null;
  branch_id: string | null;
  title: string;
  description: string | null;
  category: string;
  status: TaskStatus;
  due_at: string | null;
  show_on_calendar: boolean;
  recurrence: TaskRecurrence;
  assigned_to_staff_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

export interface FetchTasksInput {
  agencyId: string;
  clientId?: string | null;
  branchId?: string | null;
  assignedToStaffId?: string | null;
  /** optional: only tasks whose due_at is within [from,to] (ISO) */
  dueFrom?: string;
  dueTo?: string;
  includeNoDueDate?: boolean;
  status?: TaskStatus;
  limit?: number;
}

export async function fetchTasks(input: FetchTasksInput): Promise<TaskRow[]> {
  const safeAgencyId = toUuidOrNull(input.agencyId);
  if (!safeAgencyId) {
    console.warn('fetchTasks skipped: invalid agencyId', { agencyId: input.agencyId });
    return [];
  }
  const safeClientId = toUuidOrNull(input.clientId);
  if (!safeClientId && input.clientId) {
    console.warn('fetchTasks ignoring invalid clientId filter', { clientId: input.clientId });
  }

  const safeBranchId = toUuidOrNull(input.branchId);
  if (!safeBranchId && input.branchId) {
    console.warn('fetchTasks ignoring invalid branchId filter', { branchId: input.branchId });
  }

  const safeAssignedToStaffId = toUuidOrNull(input.assignedToStaffId);
  if (!safeAssignedToStaffId && input.assignedToStaffId) {
    console.warn('fetchTasks ignoring invalid assignedToStaffId filter', { assignedToStaffId: input.assignedToStaffId });
  }
  const buildQuery = (includeClientIdFilter: boolean) => {
    let q = supabase
      .from('tasks')
      .select('*')
      .eq('agency_id', safeAgencyId)
      .order('due_at', { ascending: true, nullsFirst: true })
      .order('created_at', { ascending: false });

    if (includeClientIdFilter && safeClientId) {
      q = q.eq('client_id', safeClientId);
    }
    if (safeBranchId) {
      q = q.eq('branch_id', safeBranchId);
    }
    if (safeAssignedToStaffId) {
      q = q.eq('assigned_to_staff_id', safeAssignedToStaffId);
    }
    if (input.status) {
      q = q.eq('status', input.status);
    }
    if (input.dueFrom) {
      q = q.gte('due_at', input.dueFrom);
    }
    if (input.dueTo) {
      q = q.lte('due_at', input.dueTo);
    }
    if (input.limit) {
      q = q.limit(input.limit);
    }
    return q;
  };

  const shouldUseClientIdFilter = !!safeClientId && tasksClientIdColumnAvailable !== false;
  let { data, error } = await buildQuery(shouldUseClientIdFilter);
  if (!error && shouldUseClientIdFilter) {
    tasksClientIdColumnAvailable = true;
    writeCachedColumnAvailability(TASKS_CLIENT_ID_COLUMN_CACHE_KEY, true);
  }
  if (error && shouldUseClientIdFilter && isMissingClientIdColumnError(error as PostgrestLikeError)) {
    tasksClientIdColumnAvailable = false;
    writeCachedColumnAvailability(TASKS_CLIENT_ID_COLUMN_CACHE_KEY, false);
    console.warn('tasks.client_id column missing; retrying fetchTasks without client_id filter');
    ({ data, error } = await buildQuery(false));
  }
  if (error) {
    console.error('Error fetching tasks', error);
    return [];
  }

  return (data as TaskRow[]) ?? [];
}

export type CreateTaskInput = Omit<
  TaskRow,
  'id' | 'created_at' | 'updated_at' | 'completed_at'
> & {
  completed_at?: string | null;
};

export async function createTask(input: CreateTaskInput): Promise<TaskRow | null> {
  const safeAgencyId = toUuidOrNull(input.agency_id);
  if (!safeAgencyId) {
    console.error('createTask aborted: invalid agency_id', { agency_id: input.agency_id });
    return null;
  }

  const safeClientId = toUuidOrNull(input.client_id);
  if (input.client_id && !safeClientId) {
    console.warn('createTask coercing invalid client_id to null', { client_id: input.client_id });
  }

  const safeBranchId = toUuidOrNull(input.branch_id);
  if (input.branch_id && !safeBranchId) {
    console.warn('createTask coercing invalid branch_id to null', { branch_id: input.branch_id });
  }

  const safeAssignedToStaffId = toUuidOrNull(input.assigned_to_staff_id);
  if (input.assigned_to_staff_id && !safeAssignedToStaffId) {
    console.warn('createTask coercing invalid assigned_to_staff_id to null', {
      assigned_to_staff_id: input.assigned_to_staff_id,
    });
  }

  const safeCreatedBy = toUuidOrNull(input.created_by);
  if (input.created_by && !safeCreatedBy) {
    console.warn('createTask coercing invalid created_by to null', { created_by: input.created_by });
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
  const initialAssignedToStaffId =
    safeAssignedToStaffId ?? (enforcePersonalScope ? authContext.staffId : null);

  const buildInsertPayload = ({
    includeClientIdColumn,
    branchId,
    assignedToStaffId,
  }: {
    includeClientIdColumn: boolean;
    branchId: string | null;
    assignedToStaffId: string | null;
  }) => ({
    agency_id: safeAgencyId,
    ...(includeClientIdColumn ? { client_id: effectiveClientId ?? null } : {}),
    branch_id: branchId,
    title: input.title,
    description: input.description ?? null,
    category: input.category ?? 'general',
    status: input.status ?? 'todo',
    due_at: input.due_at ?? null,
    show_on_calendar: input.show_on_calendar ?? false,
    recurrence: input.recurrence ?? 'none',
    assigned_to_staff_id: assignedToStaffId,
    created_by: effectiveCreatedBy ?? null,
    completed_at: input.completed_at ?? null,
    updated_at: new Date().toISOString(),
  });

  // Always include client_id – the column is guaranteed to exist and the
  // server-side BEFORE INSERT trigger will auto-populate it when NULL.
  const shouldIncludeClientIdColumn = true;
  let attemptBranchId: string | null = initialBranchId ?? null;
  let attemptAssignedToStaffId: string | null = initialAssignedToStaffId ?? null;

  console.info('createTask context', {
    role,
    effectiveClientId,
    effectiveCreatedBy,
    initialBranchId,
    initialAssignedToStaffId,
    enforceBranchScope,
    enforcePersonalScope,
  });

  let { data, error } = await supabase
    .from('tasks')
    .insert(
      buildInsertPayload({
        includeClientIdColumn: shouldIncludeClientIdColumn,
        branchId: attemptBranchId,
        assignedToStaffId: attemptAssignedToStaffId,
      })
    )
    .select('*')
    .single();

  if (!error) {
    tasksClientIdColumnAvailable = true;
    writeCachedColumnAvailability(TASKS_CLIENT_ID_COLUMN_CACHE_KEY, true);
  }

  // If insert is blocked by RLS, retry with less restrictive scope.
  if (
    error &&
    isRlsDeniedError(error as PostgrestLikeError) &&
    attemptAssignedToStaffId
  ) {
    console.warn('createTask retrying without assigned_to_staff_id due to RLS', error);
    attemptAssignedToStaffId = null;
    ({ data, error } = await supabase
      .from('tasks')
      .insert(
        buildInsertPayload({
          includeClientIdColumn: shouldIncludeClientIdColumn,
          branchId: attemptBranchId,
          assignedToStaffId: attemptAssignedToStaffId,
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
    console.warn('createTask retrying without branch_id due to RLS', error);
    attemptBranchId = null;
    ({ data, error } = await supabase
      .from('tasks')
      .insert(
        buildInsertPayload({
          includeClientIdColumn: shouldIncludeClientIdColumn,
          branchId: attemptBranchId,
          assignedToStaffId: attemptAssignedToStaffId,
        })
      )
      .select('*')
      .single());
  }

  if (error) {
    console.error('Error creating task', {
      error,
      role,
      effectiveClientId,
      attemptBranchId,
      attemptAssignedToStaffId,
    });
    return null;
  }

  return (data as TaskRow) ?? null;
}

export type UpdateTaskInput = Partial<
  Pick<
    TaskRow,
    | 'branch_id'
    | 'title'
    | 'description'
    | 'category'
    | 'status'
    | 'due_at'
    | 'show_on_calendar'
    | 'recurrence'
    | 'assigned_to_staff_id'
    | 'completed_at'
  >
>;

export async function updateTask(id: string, input: UpdateTaskInput): Promise<TaskRow | null> {
  const payload: Record<string, unknown> = {
    ...input,
    updated_at: new Date().toISOString(),
  };

  if (Object.prototype.hasOwnProperty.call(input, 'branch_id')) {
    payload.branch_id = toUuidOrNull(input.branch_id);
  }

  if (Object.prototype.hasOwnProperty.call(input, 'assigned_to_staff_id')) {
    payload.assigned_to_staff_id = toUuidOrNull(input.assigned_to_staff_id);
  }

  const { data, error } = await supabase
    .from('tasks')
    .update(payload)
    .eq('id', id)
    .select('*')
    .single();

  if (error) {
    console.error('Error updating task', error);
    return null;
  }

  return (data as TaskRow) ?? null;
}

export async function deleteTask(id: string): Promise<void> {
  const { error } = await supabase.from('tasks').delete().eq('id', id);
  if (error) {
    console.error('Error deleting task', error);
  }
}

export async function setTaskCompleted(id: string, completed: boolean): Promise<TaskRow | null> {
  const now = new Date().toISOString();
  return updateTask(id, {
    status: completed ? 'done' : 'todo',
    completed_at: completed ? now : null,
  });
}
