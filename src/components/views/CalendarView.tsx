import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  format,
  startOfWeek,
  endOfWeek,
  addDays,
  isSameDay,
  isToday,
  parseISO,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  addMonths,
  subMonths,
  isBefore,
  isAfter,
  isWithinInterval,
  setHours,
  setMinutes,
  setSeconds,
  isSameWeek,
  addHours,
  isTomorrow,
  startOfDay,
  endOfDay,
  parse,
  isValid,
} from 'date-fns';
import { 
  MapPinIcon, 
  ClockIcon, 
  UserIcon, 
  CalendarDaysIcon, 
  ListChecksIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CalendarIcon,
  PlusIcon,
  ChevronDownIcon,
  MoreHorizontalIcon,
  FilterIcon,
  SearchIcon,
  MenuIcon,
  XIcon,
  CheckCircle2Icon,
  RefreshCwIcon
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { ValuationFeedbackDialog } from '../ValuationFeedbackDialog';
import { DiaryEventDetailsDialog } from '../DiaryEventDetailsDialog';
import { CreateEventDialog } from '../CreateEventDialog';
import { AddPropertyDialog } from '../AddPropertyDialog';
import { TaskEditDialog } from '../TaskEditDialog';
import { MileageLogDialog } from '../MileageLogDialog';
import { useMileageStore } from '@/stores/mileageStore';
import { confirmDialog } from '@/hooks/use-confirm';
import { useAuthStore } from '@/stores/authStore';
import { useDashboardStore } from '@/stores/dashboardStore';
import {
  addMovementNote,
  fetchMovementsByAddress,
  fetchClientBranches as fetchClientBranchesForAgencyFallback,
  resolveAgencyIdForUser,
  resolveClientIdForUser,
  createMovement,
  updateMovement,
} from '@/lib/dashboardApi';
import {
  fetchClientBranches,
  fetchClientBranchesForAgency,
  fetchClientStaffForAgency,
  fetchClientStaffForClient,
  type ClientStaffRow,
} from '@/lib/ownerApi';
import {
  fetchDiaryEvents as fetchDiaryEventRows,
  createDiaryEvent as createDiaryEventRow,
  updateDiaryEvent as updateDiaryEventRow,
  type DiaryEventRow,
} from '@/lib/diaryApi';
import {
  fetchTasks as fetchTaskRows,
  createTask as createTaskRow,
  updateTask as updateTaskRow,
  deleteTask as deleteTaskRow,
  setTaskCompleted as setTaskCompletedRow,
  type TaskRow,
} from '@/lib/tasksApi';
import { createMileageLog as createMileageLogRow } from '@/lib/mileageApi';
import { buildAppointmentDateTime } from '@/lib/appointmentDateTime';

interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  allDay?: boolean;
  /** Event type/category (e.g. viewing, valuation, meeting, task, etc.) */
  category: string;
  color: string;
  borderColor?: string;
  /** Optional: which branch this event belongs to (used for branch calendars + filtering) */
  branchId?: string | null;
  /** Optional: which staff member this event belongs to (used for personal calendars + filtering) */
  staffId?: string | null;
  attended?: boolean | null;
  vendorName?: string;
  propertyAddress?: string;
  feedback?: {
    status: 'attended' | 'not-attended' | 'rescheduled' | 'cancelled';
    reason?: string;
    rescheduleDate?: string;
    rescheduleTime?: string;
    notes?: string;
  };
}

interface TaskItem {
  id: string;
  title: string;
  description?: string;
  date: string;
  rawDate: Date;
  time: string;
  tag: string;
  completed: boolean;
  recurrence?: 'none' | 'daily' | 'weekly' | 'monthly';
}


const timeSlots = Array.from({ length: 24 }, (_, i) => `${i}:00`);
const timeSlotHours = Array.from({ length: 24 }, (_, i) => i);

type CalendarCategoryType = 'event' | 'staff';
interface CalendarCategory {
  id: string;
  label: string;
  color: string;
  type: CalendarCategoryType;
}

interface DraggedCalendarEventPayload {
  eventId: string;
  durationMinutes: number;
  startHour: number;
  startMinutes: number;
}

const initialEventCategories: CalendarCategory[] = [
  { id: 'viewing', label: 'Viewings', color: 'bg-purple-500', type: 'event' },
  { id: 'valuation', label: 'Valuations', color: 'bg-pink-600', type: 'event' },
  { id: 'photo-measure', label: 'Photo & Measure', color: 'bg-green-500', type: 'event' },
  { id: 'meeting', label: 'Meetings', color: 'bg-blue-500', type: 'event' },
  { id: 'task', label: 'Tasks', color: 'bg-slate-500', type: 'event' },
  { id: 'holiday', label: 'Holidays', color: 'bg-green-500', type: 'event' },
  { id: 'conference', label: 'Conferences', color: 'bg-green-500', type: 'event' },
];

const BUILT_IN_EVENT_CATEGORY_IDS = new Set(initialEventCategories.map((cat) => cat.id));

interface CalendarViewProps {
  agencyId?: string;
  branchId?: string;
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const toUuidOrNull = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return UUID_REGEX.test(trimmed) ? trimmed : null;
};
const parseNumber = (value: string | undefined | null): number | null => {
  if (!value) return null;
  const cleaned = value.replace(/[^0-9.]/g, '');
  if (!cleaned) return null;
  const num = Number(cleaned);
  return Number.isNaN(num) ? null : num;
};

const formatFeedbackStatusLabel = (
  status: NonNullable<CalendarEvent['feedback']>['status']
): string => {
  switch (status) {
    case 'attended':
      return 'Attended';
    case 'not-attended':
      return 'Not Attended';
    case 'rescheduled':
      return 'Rescheduled';
    case 'cancelled':
      return 'Cancelled';
    default:
      return 'Updated';
  }
};

const buildMovementNoteFromFeedback = (
  feedback: CalendarEvent['feedback'],
  eventStart: Date
): string | null => {
  if (!feedback) return null;

  const reason = feedback.reason?.trim();
  const notes = feedback.notes?.trim();
  const hasReschedule = !!(feedback.rescheduleDate && feedback.rescheduleTime);

  if (!reason && !notes && !hasReschedule) return null;

  const sections: string[] = [
    `Valuation feedback (${format(eventStart, 'dd MMM yyyy HH:mm')}): ${formatFeedbackStatusLabel(feedback.status)}`,
  ];

  if (hasReschedule) {
    const rescheduledStart = buildAppointmentDateTime(
      feedback.rescheduleDate as string,
      feedback.rescheduleTime as string
    );
    sections.push(
      `Rescheduled to: ${
        rescheduledStart
          ? format(rescheduledStart, 'dd MMM yyyy HH:mm')
          : `${feedback.rescheduleDate} ${feedback.rescheduleTime}`
      }`
    );
  }

  if (reason) sections.push(`Reason: ${reason}`);
  if (notes) sections.push(`Notes: ${notes}`);

  const combined = sections.join('\n').trim();
  return combined.length > 0 ? combined : null;
};

export function CalendarView({ agencyId, branchId }: CalendarViewProps = {}) {
  const isMobile = useIsMobile();
  const { user } = useAuthStore();
  const { agencyId: agencyIdFromStore, clientId: clientIdFromStore, loadStaffMembers, loadMovements } = useDashboardStore();

  const userMeta = (user?.user_metadata as any) ?? {};
  const appMeta = (user?.app_metadata as any) ?? {};

  const metaAgencyId = toUuidOrNull(userMeta.agency_id ?? appMeta.agency_id ?? null);
  const metaClientId = toUuidOrNull(userMeta.client_id ?? appMeta.client_id ?? null);
  const metaBranchId = toUuidOrNull(userMeta.branch_id ?? appMeta.branch_id ?? null);
  const metaStaffId = toUuidOrNull(userMeta.staff_id ?? appMeta.staff_id ?? null);

  const effectiveBranchId = toUuidOrNull(branchId) ?? metaBranchId ?? null;
  const effectiveStaffId = metaStaffId ?? null;
  const effectiveBranchLabel =
    (typeof userMeta.branch_name === 'string' && userMeta.branch_name.trim()) ||
    (typeof userMeta.branch === 'string' && userMeta.branch.trim()) ||
    'My Branch';

  const [effectiveAgencyId, setEffectiveAgencyId] = useState<string | null>(
    toUuidOrNull(agencyId) ?? toUuidOrNull(agencyIdFromStore) ?? metaAgencyId ?? null
  );
  const [effectiveClientId, setEffectiveClientId] = useState<string | null>(
    metaClientId ?? toUuidOrNull(clientIdFromStore) ?? null
  );

  const [currentDate, setCurrentDate] = useState(new Date());
  const [activeCalendarTab, setActiveCalendarTab] = useState('my-calendar');
  const [selectedBranch, setSelectedBranch] = useState<string>('all');
  const [activeView, setActiveView] = useState('week');
  const [viewMode, setViewMode] = useState<'calendar' | 'tasks'>('calendar');
  const [eventCategories, setEventCategories] = useState(initialEventCategories);
  const [checkedCategories, setCheckedCategories] = useState<string[]>(
    initialEventCategories.map((cat) => cat.id)
  );
  const currentTimeLineRef = useRef<HTMLDivElement>(null);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [createEventOpen, setCreateEventOpen] = useState(false);
  const [clickedSlot, setClickedSlot] = useState<{ date: Date; hour: number } | null>(null);
  const [createEventCategoryId, setCreateEventCategoryId] = useState<string | null>(null);
  const [addCategoryOpen, setAddCategoryOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryColor, setNewCategoryColor] = useState('bg-blue-500');
  const [valuationFormOpen, setValuationFormOpen] = useState(false);
  const [valuationPrefill, setValuationPrefill] = useState<{ date: string; time: string } | null>(null);
  const [mileageLogOpen, setMileageLogOpen] = useState(false);
  const [eventForMileage, setEventForMileage] = useState<CalendarEvent | null>(null);

  const [clientBranches, setClientBranches] = useState<Array<{ id: string; name: string }>>([]);
  const [clientStaff, setClientStaff] = useState<ClientStaffRow[]>([]);
  const [structureLoading, setStructureLoading] = useState(false);

  const [loadingDiary, setLoadingDiary] = useState(false);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Task State
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [editingTask, setEditingTask] = useState<TaskItem | null>(null);
  const [editTaskOpen, setEditTaskOpen] = useState(false);
  const [newTaskInput, setNewTaskInput] = useState('');
  const [newTaskDescription, setNewTaskDescription] = useState('');
  const [newTaskDate, setNewTaskDate] = useState<Date | undefined>(new Date());
  const [taskSearchQuery, setTaskSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [autoAddToCalendar, setAutoAddToCalendar] = useState(false);
  const [taskSortBy, setTaskSortBy] = useState<'date-asc' | 'date-desc' | 'title'>('date-asc');
  const [hideCompleted, setHideCompleted] = useState(false);

  useEffect(() => {
    if (!createEventOpen) {
      setCreateEventCategoryId(null);
    }
  }, [createEventOpen]);

  const staffColors = [
    'bg-blue-500',
    'bg-emerald-500',
    'bg-purple-500',
    'bg-orange-500',
    'bg-cyan-500',
    'bg-pink-500',
    'bg-indigo-500',
  ];

  const normalizeCategoryLabel = (id: string) =>
    id
      .replace(/[-_]/g, ' ')
      .split(' ')
      .filter(Boolean)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');

  const getCategoryColor = (categoryId: string) => {
    return eventCategories.find((c) => c.id === categoryId)?.color ?? 'bg-blue-500';
  };

  const formatTaskDateLabel = (date: Date) => {
    if (isToday(date)) return 'Today';
    if (isTomorrow(date)) return 'Tomorrow';
    return format(date, 'EEE, MMM d');
  };

  const parseTaskTimeOnDate = (date: Date, time: string) => {
    if (!time) return date;

    // Prefer 12h display format used by the UI, fall back to 24h input.
    const parsed12 = parse(time, 'h:mm a', date);
    if (isValid(parsed12)) return parsed12;

    const parsed24 = parse(time, 'HH:mm', date);
    if (isValid(parsed24)) return parsed24;

    return date;
  };

  const normalizeBranchIdForWrite = (value: unknown): string | null => {
    const safe = toUuidOrNull(value);
    if (!safe) return null;
    if (clientBranches.length === 0) return safe;
    return clientBranches.some((branch) => branch.id === safe) ? safe : null;
  };

  const normalizeStaffIdForWrite = (value: unknown): string | null => {
    const safe = toUuidOrNull(value);
    if (!safe) return null;
    if (clientStaff.length === 0) return safe;
    return clientStaff.some((staff) => staff.id === safe) ? safe : null;
  };

  const mapTaskRowToTaskItem = (row: TaskRow): TaskItem => {
    const raw = row.due_at ? parseISO(row.due_at) : parseISO(row.created_at);

    return {
      id: row.id,
      title: row.title,
      description: row.description ?? undefined,
      date: formatTaskDateLabel(raw),
      rawDate: raw,
      time: row.due_at ? format(raw, 'h:mm a') : 'Anytime',
      tag: row.category ?? 'general',
      completed: row.status === 'done',
      recurrence: row.recurrence ?? 'none',
    };
  };

  const mapTaskRowToCalendarEvent = (row: TaskRow): CalendarEvent | null => {
    if (!row.show_on_calendar) return null;
    if (row.status === 'done') return null;
    if (!row.due_at) return null;

    const start = parseISO(row.due_at);
    return {
      id: `evt-task-${row.id}`,
      title: row.title,
      start,
      end: addHours(start, 1),
      category: 'task',
      color: 'bg-slate-500',
      allDay: false,
      branchId: row.branch_id,
      staffId: row.assigned_to_staff_id,
    };
  };

  const mapDiaryRowToCalendarEvent = (row: DiaryEventRow): CalendarEvent => {
    const start = parseISO(row.start_at);
    const end = parseISO(row.end_at);

    return {
      id: row.id,
      title: row.title,
      start,
      end,
      allDay: row.all_day,
      category: row.category,
      color: getCategoryColor(row.category),
      branchId: row.branch_id,
      staffId: row.staff_id,
      vendorName: row.vendor_name ?? undefined,
      propertyAddress: row.property_address ?? row.location ?? undefined,
      feedback: (row.feedback as any) ?? undefined,
    };
  };

  // Keep effective IDs in sync with props / metadata / store
  useEffect(() => {
    setEffectiveAgencyId(toUuidOrNull(agencyId) ?? toUuidOrNull(agencyIdFromStore) ?? metaAgencyId ?? null);
  }, [agencyId, metaAgencyId, agencyIdFromStore]);

  useEffect(() => {
    setEffectiveClientId(metaClientId ?? toUuidOrNull(clientIdFromStore) ?? null);
  }, [metaClientId, clientIdFromStore]);

  // Fallback: resolve IDs from DB when metadata/store isn't populated yet
  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      if (!user) return;

      if (!effectiveAgencyId) {
        const resolvedAgency = toUuidOrNull(await resolveAgencyIdForUser(user));
        if (!cancelled && resolvedAgency) {
          setEffectiveAgencyId(resolvedAgency);
        }
      }

      if (!effectiveClientId) {
        const resolvedClient = toUuidOrNull(await resolveClientIdForUser(user));
        if (!cancelled && resolvedClient) {
          setEffectiveClientId(resolvedClient);
        }
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [effectiveAgencyId, effectiveClientId, user]);

  // Default branch calendar selection for staff roles
  useEffect(() => {
    if (!effectiveBranchId) return;
    setSelectedBranch((prev) => (prev === 'all' ? effectiveBranchId : prev));
  }, [effectiveBranchId]);

  // Load staff members when agencyId is available (for AddPropertyDialog team member dropdown)
  useEffect(() => {
    if (effectiveAgencyId) {
      loadStaffMembers(effectiveAgencyId);
    }
  }, [effectiveAgencyId, loadStaffMembers]);

  // Load branches/staff lists (best-effort; depends on RLS)
  useEffect(() => {
    let cancelled = false;

    const run = async () => {

      setStructureLoading(true);
      let branches: Array<{ id: string; name: string }> = [];
      let staff: ClientStaffRow[] = [];

      if (effectiveClientId) {
        const [clientBranchesRows, clientStaffRows] = await Promise.all([
          fetchClientBranches(effectiveClientId),
          fetchClientStaffForClient(effectiveClientId),
        ]);
        branches = clientBranchesRows.map((branch) => ({ id: branch.id, name: branch.name }));
        staff = clientStaffRows;
      } else if (effectiveAgencyId) {
        const [agencyBranchRows, agencyStaffRows] = await Promise.all([
          fetchClientBranchesForAgency(effectiveAgencyId),
          fetchClientStaffForAgency(effectiveAgencyId),
        ]);
        branches = agencyBranchRows.map((branch) => ({ id: branch.id, name: branch.name }));
        staff = agencyStaffRows;
      }

      if (branches.length === 0 && effectiveAgencyId) {
        const fallbackBranches = await fetchClientBranchesForAgencyFallback(effectiveAgencyId);
        if (fallbackBranches.length > 0) {
          branches = fallbackBranches.map((branch) => ({ id: branch.id, name: branch.name }));
        }
      }

      if (effectiveBranchId && !branches.some((branch) => branch.id === effectiveBranchId)) {
        branches = [{ id: effectiveBranchId, name: effectiveBranchLabel }, ...branches];
      }

      if (cancelled) return;
      setClientBranches(branches);
      setClientStaff(staff);
      setStructureLoading(false);
    };

    void run().catch((err) => {
      console.error('Error loading calendar structure', err);
      if (!cancelled) setStructureLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [effectiveClientId, effectiveAgencyId, effectiveBranchId, effectiveBranchLabel]);

  // Merge staff into sidebar calendar filters
  useEffect(() => {
    if (clientStaff.length === 0) return;

    const staffCats: CalendarCategory[] = clientStaff.map((s, idx) => ({
      id: s.id,
      label: s.name,
      color: staffColors[idx % staffColors.length],
      type: 'staff',
    }));

    setEventCategories((prev) => {
      const existing = new Set(prev.map((c) => c.id));
      const next = [...prev];
      for (const cat of staffCats) {
        if (!existing.has(cat.id)) {
          next.unshift(cat);
          existing.add(cat.id);
        }
      }
      return next;
    });

    setCheckedCategories((prev) => {
      const next = new Set(prev);
      for (const cat of staffCats) next.add(cat.id);
      return Array.from(next);
    });
  }, [clientStaff]);

  // Fetch tasks (for list + calendar overlay)
  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      if (!effectiveAgencyId) {
        setTasks([]);
        setEvents([]);
        return;
      }

      setLoadingTasks(true);
      setLoadError(null);

      const rows = await fetchTaskRows({
        agencyId: effectiveAgencyId,
        clientId: effectiveClientId,
        limit: 500,
      });
      if (cancelled) return;

      const items = rows.map(mapTaskRowToTaskItem);
      const taskEvents = rows
        .map(mapTaskRowToCalendarEvent)
        .filter((e): e is CalendarEvent => !!e);

      setTasks(items);
      setEvents((prev) => {
        const nonTask = prev.filter((e) => !e.id.startsWith('evt-task-'));
        return [...nonTask, ...taskEvents];
      });

      setLoadingTasks(false);
    };

    void run().catch((err) => {
      console.error('Error loading tasks', err);
      if (!cancelled) {
        setLoadError('Failed to load tasks');
        setLoadingTasks(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [effectiveAgencyId, effectiveClientId]);

  // Fetch diary events for the visible range
  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      if (!effectiveAgencyId) return;

      setLoadingDiary(true);
      setLoadError(null);

      const rangeStartDate =
        activeView === 'day'
          ? currentDate
          : activeView === 'week'
          ? startOfWeek(currentDate, { weekStartsOn: 1 })
          : startOfWeek(startOfMonth(currentDate), { weekStartsOn: 1 });

      const rangeEndDate =
        activeView === 'day'
          ? currentDate
          : activeView === 'week'
          ? endOfWeek(currentDate, { weekStartsOn: 1 })
          : endOfWeek(endOfMonth(currentDate), { weekStartsOn: 1 });

      const rangeStart = startOfDay(rangeStartDate).toISOString();
      const rangeEnd = endOfDay(rangeEndDate).toISOString();

      const rows = await fetchDiaryEventRows({
        agencyId: effectiveAgencyId,
        clientId: effectiveClientId,
        rangeStart,
        rangeEnd,
      });

      if (cancelled) return;

      const diaryEvents = rows.map(mapDiaryRowToCalendarEvent);

      // Ensure any new categories appear in the filter list
      const categoryIds = new Set(rows.map((r) => r.category));
      setEventCategories((prev) => {
        const existing = new Set(prev.filter((c) => c.type === 'event').map((c) => c.id));
        const toAdd: CalendarCategory[] = [];
        for (const id of categoryIds) {
          if (!existing.has(id)) {
            toAdd.push({ id, label: normalizeCategoryLabel(id), color: 'bg-blue-500', type: 'event' });
          }
        }
        return toAdd.length ? [...prev, ...toAdd] : prev;
      });

      setCheckedCategories((prev) => {
        const next = new Set(prev);
        for (const id of categoryIds) next.add(id);
        return Array.from(next);
      });

      setEvents((prev) => {
        const taskEvents = prev.filter((e) => e.id.startsWith('evt-task-'));
        return [...diaryEvents, ...taskEvents];
      });

      setLoadingDiary(false);
    };

    void run().catch((err) => {
      console.error('Error loading diary events', err);
      if (!cancelled) {
        setLoadError('Failed to load diary events');
        setLoadingDiary(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [effectiveAgencyId, effectiveClientId, currentDate, activeView]);

  const filteredAndSortedTasks = useMemo(() => {
    let result = tasks;

    // Filter by search query
    if (taskSearchQuery) {
      const query = taskSearchQuery.toLowerCase();
      result = result.filter(t => t.title.toLowerCase().includes(query) || t.tag.toLowerCase().includes(query));
    }

    // Filter completed
    if (hideCompleted) {
      result = result.filter(t => !t.completed);
    }

    // Sort
    result = [...result].sort((a, b) => {
      if (taskSortBy === 'date-asc') {
        return a.rawDate.getTime() - b.rawDate.getTime();
      } else if (taskSortBy === 'date-desc') {
        return b.rawDate.getTime() - a.rawDate.getTime();
      } else if (taskSortBy === 'title') {
        return a.title.localeCompare(b.title);
      }
      return 0;
    });

    return result;
  }, [tasks, taskSearchQuery, taskSortBy, hideCompleted]);

  const handleAddTask = async () => {
    if (!newTaskInput.trim()) return;
    if (!effectiveAgencyId) {
      setLoadError('Missing agency context');
      return;
    }

    try {
      setLoadingTasks(true);
      setLoadError(null);

      const rawDate = newTaskDate || new Date();
      const dueAt = isToday(rawDate)
        ? new Date()
        : setHours(setMinutes(setSeconds(rawDate, 0), 0), 9);

      const created = await createTaskRow({
        agency_id: effectiveAgencyId,
        client_id: effectiveClientId,
        branch_id: normalizeBranchIdForWrite(effectiveBranchId),
        title: newTaskInput,
        description: newTaskDescription || null,
        category: 'general',
        status: 'todo',
        due_at: dueAt.toISOString(),
        show_on_calendar: autoAddToCalendar,
        recurrence: 'none',
        assigned_to_staff_id: normalizeStaffIdForWrite(effectiveStaffId),
        created_by: user?.id ?? null,
      });

      if (!created) {
        setLoadError('Failed to create task');
        return;
      }

      setTasks((prev) => [mapTaskRowToTaskItem(created), ...prev]);

      const maybeEvent = mapTaskRowToCalendarEvent(created);
      if (maybeEvent) {
        setEvents((prev) => {
          const nonTask = prev.filter((e) => !e.id.startsWith('evt-task-'));
          const taskEvents = [...prev.filter((e) => e.id.startsWith('evt-task-')), maybeEvent];
          return [...nonTask, ...taskEvents];
        });
      }

      setNewTaskInput('');
      setNewTaskDescription('');
      setNewTaskDate(new Date());
    } catch (err) {
      console.error('Error creating task', err);
      setLoadError('Failed to create task');
    } finally {
      setLoadingTasks(false);
    }
  };

  const toggleTaskCompletion = async (taskId: string) => {
    const existing = tasks.find((t) => t.id === taskId);
    if (!existing) return;

    const updated = await setTaskCompletedRow(taskId, !existing.completed);
    if (!updated) return;

    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId
          ? {
              ...t,
              completed: updated.status === 'done',
            }
          : t
      )
    );

    const taskEventId = `evt-task-${taskId}`;
    const maybeEvent = mapTaskRowToCalendarEvent(updated);
    setEvents((prev) => {
      const withoutTaskEvent = prev.filter((evt) => evt.id !== taskEventId);
      return maybeEvent ? [...withoutTaskEvent, maybeEvent] : withoutTaskEvent;
    });
  };

  const deleteTask = async (taskId: string) => {
    await deleteTaskRow(taskId);

    setTasks((prev) => prev.filter((t) => t.id !== taskId));
    setEvents((prev) => prev.filter((e) => e.id !== `evt-task-${taskId}`));
  };

  const handleUpdateTask = async (updatedTask: TaskItem) => {
    if (!effectiveAgencyId) {
      setLoadError('Missing agency context');
      return;
    }

    try {
      setLoadingTasks(true);
      setLoadError(null);

      const taskId = updatedTask.id.startsWith('evt-task-')
        ? updatedTask.id.replace('evt-task-', '')
        : updatedTask.id;

      const dueAt = updatedTask.rawDate
        ? parseTaskTimeOnDate(updatedTask.rawDate, updatedTask.time)
        : null;

      const exists = tasks.some((t) => t.id === taskId);
      const category = (updatedTask.tag || 'general').toLowerCase();
      const recurrence = updatedTask.recurrence ?? 'none';
      const dueAtIso = dueAt ? dueAt.toISOString() : null;

      // If this task doesn't exist yet (e.g. created from calendar via dialog), create it.
      if (!exists) {
        const created = await createTaskRow({
          agency_id: effectiveAgencyId,
          client_id: effectiveClientId,
          branch_id: normalizeBranchIdForWrite(effectiveBranchId),
          title: updatedTask.title,
          description: updatedTask.description ?? null,
          category,
          status: updatedTask.completed ? 'done' : 'todo',
          due_at: dueAtIso,
          show_on_calendar: true,
          recurrence,
          assigned_to_staff_id: normalizeStaffIdForWrite(effectiveStaffId),
          created_by: user?.id ?? null,
        });

        if (!created) {
          setLoadError('Failed to create task');
          return;
        }

        setTasks((prev) => [mapTaskRowToTaskItem(created), ...prev]);

        const maybeEvent = mapTaskRowToCalendarEvent(created);
        if (maybeEvent) {
          setEvents((prev) => {
            const nonTask = prev.filter((e) => !e.id.startsWith('evt-task-'));
            const taskEvents = [...prev.filter((e) => e.id.startsWith('evt-task-')), maybeEvent];
            return [...nonTask, ...taskEvents];
          });
        }

        return;
      }

      const updatedRow = await updateTaskRow(taskId, {
        title: updatedTask.title,
        description: updatedTask.description ?? null,
        category,
        recurrence,
        due_at: dueAtIso,
      });

      if (!updatedRow) {
        setLoadError('Failed to update task');
        return;
      }

      setTasks((prev) => prev.map((t) => (t.id === taskId ? mapTaskRowToTaskItem(updatedRow) : t)));

      setEvents((prev) => {
        const existingEventId = `evt-task-${taskId}`;
        const hasExisting = prev.some((e) => e.id === existingEventId);

        // If the task is on the calendar and has a due date, keep the overlay in sync.
        if (hasExisting && updatedRow.due_at) {
          const start = parseISO(updatedRow.due_at);
          return prev.map((evt) =>
            evt.id === existingEventId
              ? {
                  ...evt,
                  title: updatedRow.title,
                  start,
                  end: addHours(start, 1),
                }
              : evt
          );
        }

        return prev;
      });
    } catch (err) {
      console.error('Error updating task', err);
      setLoadError('Failed to update task');
    } finally {
      setLoadingTasks(false);
    }
  };

  useEffect(() => {
    const handleSwitchToTasks = () => {
      setViewMode('tasks');
    };

    window.addEventListener('switch-to-tasks-view', handleSwitchToTasks);
    return () => window.removeEventListener('switch-to-tasks-view', handleSwitchToTasks);
  }, []);

  // Date Calculations
  const startOfCurrentWeek = startOfWeek(currentDate, { weekStartsOn: 1 });
  const endOfCurrentWeek = endOfWeek(currentDate, { weekStartsOn: 1 });
  const daysInWeek = eachDayOfInterval({ start: startOfCurrentWeek, end: endOfCurrentWeek });

  const startOfCurrentMonth = startOfMonth(currentDate);
  const endOfCurrentMonth = endOfMonth(currentDate);
  const startOfMonthCalendar = startOfWeek(startOfCurrentMonth, { weekStartsOn: 1 });
  const endOfMonthCalendar = endOfWeek(endOfCurrentMonth, { weekStartsOn: 1 });
  const daysInMonthView = eachDayOfInterval({ start: startOfMonthCalendar, end: endOfMonthCalendar });
  const daysInMiniMonth = eachDayOfInterval({ start: startOfCurrentMonth, end: endOfCurrentMonth });
  
  const daysToRender = activeView === 'day' ? [currentDate] : daysInWeek;

  const handlePrevious = () => {
    if (activeView === 'day') setCurrentDate(addDays(currentDate, -1));
    else if (activeView === 'week') setCurrentDate(addDays(currentDate, -7));
    else if (activeView === 'month') setCurrentDate(subMonths(currentDate, 1));
  };

  const handleNext = () => {
    if (activeView === 'day') setCurrentDate(addDays(currentDate, 1));
    else if (activeView === 'week') setCurrentDate(addDays(currentDate, 7));
    else if (activeView === 'month') setCurrentDate(addMonths(currentDate, 1));
  };

  const handleToday = () => setCurrentDate(new Date());
  const handlePreviousMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const handleNextMonth = () => setCurrentDate(addMonths(currentDate, 1));

  const toggleCategory = (categoryId: string) => {
    setCheckedCategories(prev =>
      prev.includes(categoryId)
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  const allStaffCategoryIds = eventCategories
    .filter((c) => c.type === 'staff')
    .map((c) => c.id);
  const checkedStaffCategoryIds = allStaffCategoryIds.filter((id) => checkedCategories.includes(id));

  const filteredEvents = events.filter((event) => {
    // Tab scoping
    if (activeCalendarTab === 'my-calendar' && effectiveStaffId) {
      // Only my personal events + shared events
      if (event.staffId && event.staffId !== effectiveStaffId) return false;
    }

    if (activeCalendarTab === 'branch-calendar' && selectedBranch !== 'all') {
      // Branch filter (include agency-wide events where branchId is null)
      if (event.branchId !== selectedBranch && event.branchId !== null) return false;
    }

    // Event type/category filter
    const categoryOk = checkedCategories.includes(event.category);

    // Staff filter (only affects personal events)
    const staffOk =
      event.staffId == null ||
      allStaffCategoryIds.length === 0 ||
      checkedStaffCategoryIds.includes(event.staffId);

    return categoryOk && staffOk;
  });

  const eventCategoryOptions = useMemo(
    () =>
      eventCategories
        .filter((category) => category.type === 'event' && category.id !== 'task')
        .map((category) => ({ id: category.id, label: category.label })),
    [eventCategories]
  );

  const parseDraggedCalendarEventPayload = (raw: string): DraggedCalendarEventPayload | null => {
    try {
      const parsed = JSON.parse(raw) as DraggedCalendarEventPayload;
      if (!parsed?.eventId) return null;
      return {
        eventId: parsed.eventId,
        durationMinutes: Number.isFinite(parsed.durationMinutes) ? parsed.durationMinutes : 60,
        startHour: Number.isFinite(parsed.startHour) ? parsed.startHour : 9,
        startMinutes: Number.isFinite(parsed.startMinutes) ? parsed.startMinutes : 0,
      };
    } catch {
      return null;
    }
  };

  const moveCalendarEventToSlot = async (
    payload: DraggedCalendarEventPayload,
    day: Date,
    targetHour?: number
  ) => {
    const existingEvent = events.find((event) => event.id === payload.eventId);
    if (!existingEvent) return;

    const hour = typeof targetHour === 'number' ? targetHour : payload.startHour;
    const minute = Math.min(59, Math.max(0, payload.startMinutes));
    const duration = Math.max(15, payload.durationMinutes || 60);

    const nextStart = setSeconds(setMinutes(setHours(day, hour), minute), 0);
    const nextEnd = new Date(nextStart.getTime() + duration * 60 * 1000);

    if (
      existingEvent.start.getTime() === nextStart.getTime() &&
      existingEvent.end.getTime() === nextEnd.getTime()
    ) {
      return;
    }

    if (payload.eventId.startsWith('evt-task-')) {
      const taskId = payload.eventId.replace('evt-task-', '');
      const updatedTask = await updateTaskRow(taskId, {
        due_at: nextStart.toISOString(),
        show_on_calendar: true,
      });

      if (!updatedTask) {
        setLoadError('Failed to move task');
        return;
      }

      setTasks((prev) => prev.map((task) => (task.id === taskId ? mapTaskRowToTaskItem(updatedTask) : task)));

      const maybeTaskEvent = mapTaskRowToCalendarEvent(updatedTask);
      if (!maybeTaskEvent) {
        setEvents((prev) => prev.filter((event) => event.id !== payload.eventId));
        return;
      }

      setEvents((prev) =>
        prev.map((event) => (event.id === payload.eventId ? maybeTaskEvent : event))
      );
      return;
    }

    const updatedEvent = await updateDiaryEventRow(payload.eventId, {
      start_at: nextStart.toISOString(),
      end_at: nextEnd.toISOString(),
    });

    if (!updatedEvent) {
      setLoadError('Failed to move diary event');
      return;
    }

    setEvents((prev) =>
      prev.map((event) =>
        event.id === payload.eventId ? mapDiaryRowToCalendarEvent(updatedEvent) : event
      )
    );
  };

  const handleDroppedCategory = async (category: CalendarCategory, day: Date, hour: number) => {
    const isCustomCategory = category.type === 'event' && !BUILT_IN_EVENT_CATEGORY_IDS.has(category.id);

    if (category.id === 'valuation') {
      setValuationPrefill({
        date: format(day, 'yyyy-MM-dd'),
        time: `${hour.toString().padStart(2, '0')}:00`,
      });
      setValuationFormOpen(true);
      return;
    }

    if (category.id === 'task') {
      const start = setHours(setMinutes(day, 0), hour);
      setEditingTask({
        id: `new-task-${Date.now()}`,
        title: '',
        description: '',
        date: format(start, 'EEE, MMM d'),
        rawDate: start,
        time: format(start, 'h:mm a'),
        tag: 'general',
        completed: false,
        recurrence: 'none',
      });
      setEditTaskOpen(true);
      return;
    }

    if (category.id === 'meeting' || isCustomCategory) {
      setClickedSlot({ date: day, hour });
      setCreateEventCategoryId(category.id);
      setCreateEventOpen(true);
      return;
    }

    if (!effectiveAgencyId) {
      setLoadError('Missing agency context');
      return;
    }

    const start = setHours(setMinutes(day, 0), hour);
    const end = setHours(setMinutes(day, 0), hour + 1);

    const branchIdForEvent =
      activeCalendarTab === 'main-calendar'
        ? null
        : activeCalendarTab === 'branch-calendar'
        ? selectedBranchUuid ?? effectiveBranchId
        : effectiveBranchId;

    const staffIdForEvent = activeCalendarTab === 'my-calendar' ? effectiveStaffId : null;

    const created = await createDiaryEventRow({
      agency_id: effectiveAgencyId,
      client_id: effectiveClientId,
      branch_id: normalizeBranchIdForWrite(branchIdForEvent),
      staff_id: normalizeStaffIdForWrite(staffIdForEvent),
      title: category.label,
      description: null,
      category: category.id,
      start_at: start.toISOString(),
      end_at: end.toISOString(),
      all_day: false,
      location: null,
      guest_emails: null,
      created_by: user?.id ?? null,
    });

    if (!created) {
      setLoadError('Failed to create diary event');
      return;
    }

    setEvents((prev) => [...prev, mapDiaryRowToCalendarEvent(created)]);
  };

  const handleCalendarSlotDrop = (e: React.DragEvent<HTMLDivElement>, day: Date, hour: number) => {
    e.preventDefault();
    e.currentTarget.classList.remove('bg-primary/10');

    const eventPayload = parseDraggedCalendarEventPayload(e.dataTransfer.getData('calendarEvent'));
    if (eventPayload) {
      void moveCalendarEventToSlot(eventPayload, day, hour);
      return;
    }

    const categoryData = e.dataTransfer.getData('eventCategory');
    if (!categoryData) return;

    try {
      const category = JSON.parse(categoryData) as CalendarCategory;
      void handleDroppedCategory(category, day, hour);
    } catch (err) {
      console.error(err);
    }
  };

  const getEventsForDay = (day: Date) => {
    return filteredEvents.filter(event => isSameDay(event.start, day));
  };

  const getEventsForTimeSlot = (day: Date, hour: number) => {
    const slotStart = setHours(setMinutes(setSeconds(day, 0), 0), hour);
    const slotEnd = setHours(setMinutes(setSeconds(day, 59), 59), hour);

    return filteredEvents.filter(event =>
      !event.allDay &&
      isWithinInterval(event.start, { start: slotStart, end: slotEnd })
    ).sort((a, b) => a.start.getTime() - b.start.getTime());
  };

  const getAllDayEventsForDay = (day: Date) => {
    return filteredEvents.filter(event =>
      event.allDay && isSameDay(event.start, day)
    ).sort((a, b) => a.start.getTime() - b.start.getTime());
  };

  const getEventLabel = (category: string) => {
    switch (category) {
      case 'valuation': return 'VAL';
      case 'viewing': return 'VWG';
      case 'meeting': return 'MTG';
      case 'task': return 'TSK';
      case 'photo-measure': return 'P/M';
      case 'holiday': return 'HOL';
      case 'conference': return 'CNF';
      default: return category.substring(0, 3).toUpperCase();
    }
  };

  const renderEventHoverDetails = (event: CalendarEvent) => (
    <div className="space-y-2">
      <p className="text-sm font-semibold text-popover-foreground truncate">{event.title}</p>
      <div className="space-y-1.5 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <CalendarDaysIcon className="h-3.5 w-3.5" />
          <span>{format(event.start, 'EEE, MMM d, yyyy')}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <ClockIcon className="h-3.5 w-3.5" />
          <span>
            {format(event.start, 'HH:mm')} - {format(event.end, 'HH:mm')}
          </span>
        </div>
        {event.vendorName && (
          <div className="flex items-center gap-1.5">
            <UserIcon className="h-3.5 w-3.5" />
            <span className="truncate">{event.vendorName}</span>
          </div>
        )}
        {event.propertyAddress && (
          <div className="flex items-center gap-1.5">
            <MapPinIcon className="h-3.5 w-3.5" />
            <span className="truncate">{event.propertyAddress}</span>
          </div>
        )}
        {event.feedback?.status && (
          <div className="pt-1 text-[11px] font-medium text-foreground">
            Status: {formatFeedbackStatusLabel(event.feedback.status)}
          </div>
        )}
      </div>
      <p className="text-[10px] text-muted-foreground">Click for full details</p>
    </div>
  );

  useEffect(() => {
    if (currentTimeLineRef.current) {
      const parent = currentTimeLineRef.current.parentElement;
      if (parent) {
        parent.scrollTop = currentTimeLineRef.current.offsetTop - parent.clientHeight / 2;
      }
    }
  }, [activeView]);

  const now = new Date();
  const currentHour = now.getHours();
  const currentMinutes = now.getMinutes();
  const isCurrentWeek = isSameWeek(now, currentDate, { weekStartsOn: 1 });
  const selectedBranchUuid = selectedBranch !== 'all' ? toUuidOrNull(selectedBranch) : null;
  const validSelectedBranchUuid =
    selectedBranchUuid && clientBranches.some((branch) => branch.id === selectedBranchUuid)
      ? selectedBranchUuid
      : null;
  const branchLockedToEffectiveBranch =
    !!effectiveBranchId && clientBranches.some((branch) => branch.id === effectiveBranchId);
  const valuationDefaultBranchId = branchLockedToEffectiveBranch
    ? effectiveBranchId ?? undefined
    : validSelectedBranchUuid ?? undefined;

  const renderSidebarContent = () => (
    <div className="flex flex-col h-full space-y-6">
      {/* Mini Calendar */}
      <div className="bg-card rounded-xl border border-border p-4 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <Button variant="ghost" size="icon" onClick={handlePreviousMonth} className="h-7 w-7 hover:bg-accent">
            <ChevronLeftIcon className="h-4 w-4" />
          </Button>
          <span className="font-semibold text-sm">
            {format(currentDate, 'MMMM yyyy')}
          </span>
          <Button variant="ghost" size="icon" onClick={handleNextMonth} className="h-7 w-7 hover:bg-accent">
            <ChevronRightIcon className="h-4 w-4" />
          </Button>
        </div>
        <div className="grid grid-cols-7 text-center text-xs mb-2">
          {['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map(day => (
            <div key={day} className="text-muted-foreground font-medium py-1">{day}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 text-center text-sm gap-y-1">
          {Array.from({ length: startOfCurrentMonth.getDay() === 0 ? 6 : startOfCurrentMonth.getDay() - 1 }).map((_, i) => (
            <div key={`empty-start-${i}`} />
          ))}
          {daysInMiniMonth.map(day => (
            <div
              key={format(day, 'yyyy-MM-dd')}
              className={cn(
                'w-8 h-8 flex items-center justify-center rounded-full cursor-pointer text-xs transition-all mx-auto',
                isSameDay(day, currentDate) 
                  ? 'bg-primary text-primary-foreground font-bold shadow-md' 
                  : 'hover:bg-accent text-foreground',
                isToday(day) && !isSameDay(day, currentDate) && 'text-primary font-bold bg-primary/10'
              )}
              onClick={() => setCurrentDate(day)}
            >
              {format(day, 'd')}
            </div>
          ))}
        </div>
      </div>

      {/* Event Filters */}
      <div className="flex-1 overflow-y-auto pr-2">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-sm text-foreground">Calendars</h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setAddCategoryOpen(true)}
            className="h-6 w-6 p-0 hover:bg-accent rounded-full"
          >
            <PlusIcon className="h-3.5 w-3.5" />
          </Button>
        </div>
        <div className="space-y-1">
          {eventCategories.map(category => (
            <div 
              key={category.id} 
              className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent/50 transition-colors cursor-pointer group"
              onClick={() => toggleCategory(category.id)}
              draggable={category.type === 'event'}
              onDragStart={(e) => {
                if (category.type !== 'event') return;
                const data = JSON.stringify(category);
                e.dataTransfer.setData('eventCategory', data);
                e.dataTransfer.effectAllowed = 'copy';
              }}
            >
              <div className={cn(
                "w-3 h-3 rounded-full ring-2 ring-offset-2 ring-offset-background transition-all",
                category.color,
                !checkedCategories.includes(category.id) && "opacity-40 ring-transparent"
              )} />
              <span className={cn(
                "text-sm flex-1 transition-colors",
                !checkedCategories.includes(category.id) ? "text-muted-foreground" : "text-foreground font-medium"
              )}>
                {category.label}
              </span>
              {category.type === 'event' && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                  onClick={async (e) => {
                    e.stopPropagation();
                    const ok = await confirmDialog(`Delete "${category.label}"?`, {
                      title: 'Delete calendar?',
                      confirmText: 'Delete',
                      variant: 'destructive',
                    });
                    if (ok) {
                      setEventCategories((prev) => prev.filter((c) => c.id !== category.id));
                      setCheckedCategories((prev) => prev.filter((id) => id !== category.id));
                    }
                  }}
                >
                  <XIcon className="h-3 w-3" />
                </Button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const handleSelectedEventSave = (feedback: CalendarEvent['feedback']) => {
    if (!selectedEvent) return;
    void (async () => {
      const updatePayload: Record<string, any> = { feedback };
      let nextStart: Date | null = null;
      let nextEnd: Date | null = null;

      if (feedback?.status === 'rescheduled') {
        if (!feedback.rescheduleDate || !feedback.rescheduleTime) {
          setLoadError('Please choose a new date and time to reschedule');
          return;
        }

        const parsedStart = buildAppointmentDateTime(
          feedback.rescheduleDate,
          feedback.rescheduleTime
        );
        if (!parsedStart) {
          setLoadError('Invalid reschedule date/time');
          return;
        }

        const existingDurationMs = Math.max(
          15 * 60 * 1000,
          selectedEvent.end.getTime() - selectedEvent.start.getTime()
        );
        const parsedEnd = new Date(parsedStart.getTime() + existingDurationMs);

        updatePayload.start_at = parsedStart.toISOString();
        updatePayload.end_at = parsedEnd.toISOString();
        nextStart = parsedStart;
        nextEnd = parsedEnd;
      }

      const updated = await updateDiaryEventRow(selectedEvent.id, updatePayload);
      if (updated) {
        const updatedEvent = mapDiaryRowToCalendarEvent(updated);
        setEvents((prev) => prev.map((e) => (e.id === selectedEvent.id ? updatedEvent : e)));
      } else {
        // Best-effort fallback (keeps UI responsive if update fails)
        setEvents((prev) =>
          prev.map((e) =>
            e.id === selectedEvent.id
              ? {
                  ...e,
                  feedback,
                  start: nextStart ?? e.start,
                  end: nextEnd ?? e.end,
                }
              : e
          )
        );
      }

      if (selectedEvent.category === 'valuation' && effectiveAgencyId && selectedEvent.propertyAddress) {
        const movementNote = buildMovementNoteFromFeedback(feedback, selectedEvent.start);
        if (movementNote) {
          const propertyAddress = selectedEvent.propertyAddress.trim();
          if (propertyAddress) {
            try {
              const relatedMovements = await fetchMovementsByAddress(
                effectiveAgencyId,
                propertyAddress,
                effectiveClientId ?? undefined
              );

              if (relatedMovements.length > 0) {
                await Promise.all(
                  relatedMovements.map(async (movement) => {
                    const existingNotes = movement.notes?.trim() ?? '';
                    const nextNotes = existingNotes
                      ? existingNotes.includes(movementNote)
                        ? existingNotes
                        : `${existingNotes}\n\n${movementNote}`
                      : movementNote;
                    await updateMovement(movement.id, { notes: nextNotes });
                  })
                );
              }

              const latestMovementId = relatedMovements[0]?.id;
              if (latestMovementId) {
                const createdByDisplay =
                  (user?.user_metadata as any)?.name ??
                  (user?.app_metadata as any)?.name ??
                  user?.email ??
                  'User';
                await addMovementNote(latestMovementId, movementNote, createdByDisplay);
              }

              await loadMovements(effectiveAgencyId, effectiveClientId ?? undefined);
            } catch (movementSyncError) {
              console.error('Error syncing valuation feedback notes to movements', movementSyncError);
            }
          }
        }
      }

      setSelectedEvent(null);
    })();
  };

  return (
    <div className={cn("flex flex-col h-full bg-background", isMobile ? "p-0" : "p-6 md:p-8")}>
      {/* Modern Header */}
      <div className="flex flex-col gap-4 mb-6">
        {loadError && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-2 text-sm text-destructive">
            {loadError}
          </div>
        )}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Left: Date & Nav */}
          <div className="flex items-center gap-4">
            <div className="flex items-center bg-card border border-border rounded-lg p-1 shadow-sm">
              <Button variant="ghost" size="icon" onClick={handlePrevious} className="h-8 w-8 rounded-md">
                <ChevronLeftIcon className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={handleToday} className="h-8 px-3 text-xs font-medium">
                Today
              </Button>
              <Button variant="ghost" size="icon" onClick={handleNext} className="h-8 w-8 rounded-md">
                <ChevronRightIcon className="h-4 w-4" />
              </Button>
            </div>
            <h2 className="text-xl md:text-2xl font-bold text-foreground tracking-tight">
              {activeView === 'day' ? format(currentDate, 'MMMM d, yyyy') : format(currentDate, 'MMMM yyyy')}
            </h2>
          </div>

          {/* Right: Controls */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0 no-scrollbar">
            {/* View Switcher */}
            <div className="flex bg-muted/50 p-1 rounded-lg border border-border/50">
              {['day', 'week', 'month'].map((view) => (
                <button
                  key={view}
                  onClick={() => setActiveView(view)}
                  className={cn(
                    "px-3 py-1.5 text-xs font-medium rounded-md transition-all",
                    activeView === view 
                      ? "bg-background text-foreground shadow-sm" 
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {view.charAt(0).toUpperCase() + view.slice(1)}
                </button>
              ))}
            </div>

            <div className="w-px h-6 bg-border mx-1 hidden md:block" />

            {/* Mode Switcher */}
            <div className="flex bg-muted/50 p-1 rounded-lg border border-border/50">
              <button
                onClick={() => setViewMode('calendar')}
                className={cn(
                  "p-1.5 rounded-md transition-all",
                  viewMode === 'calendar' ? "bg-background text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"
                )}
                title="Calendar View"
              >
                <CalendarDaysIcon className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode('tasks')}
                className={cn(
                  "p-1.5 rounded-md transition-all",
                  viewMode === 'tasks' ? "bg-background text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"
                )}
                title="Tasks View"
              >
                <ListChecksIcon className="h-4 w-4" />
              </button>
            </div>

            {/* Mobile Filter Trigger */}
            {isMobile && (
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="outline" size="icon" className="h-9 w-9 ml-auto">
                    <FilterIcon className="h-4 w-4" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-[300px] sm:w-[400px]">
                  <SheetHeader className="mb-4">
                    <SheetTitle>Calendar Settings</SheetTitle>
                  </SheetHeader>
                  {renderSidebarContent()}
                </SheetContent>
              </Sheet>
            )}

              <Button 
                className="bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-4 shadow-sm ml-auto md:ml-0"
                onClick={() => {
                  setCreateEventCategoryId(null);
                  setCreateEventOpen(true);
                }}
                disabled={!effectiveAgencyId || loadingDiary}
              >
              <PlusIcon className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">New Event</span>
              <span className="sm:hidden">New</span>
            </Button>
          </div>
        </div>

        {/* Secondary Nav (Desktop Only) */}
        <div className="hidden md:flex items-center gap-4 border-b border-border pb-1">
          <Tabs value={activeCalendarTab} onValueChange={setActiveCalendarTab} className="w-auto">
            <TabsList className="bg-transparent p-0 h-auto gap-6">
              {['my-calendar', 'main-calendar', 'branch-calendar'].map(tab => (
                <TabsTrigger 
                  key={tab}
                  value={tab}
                  className="bg-transparent border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:shadow-none rounded-none px-1 py-2 text-sm font-medium text-muted-foreground data-[state=active]:text-foreground transition-all"
                >
                  {tab.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          
          {activeCalendarTab === 'branch-calendar' && (
            <Select value={selectedBranch} onValueChange={setSelectedBranch}>
              <SelectTrigger className="w-[220px] h-8 text-xs border-border bg-muted/30">
                <SelectValue placeholder={structureLoading ? 'Loading branches…' : 'Select Branch'} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Branches</SelectItem>
                {clientBranches.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden gap-6">
        {/* Desktop Sidebar */}
        {!isMobile && (
          <div className="w-64 shrink-0 hidden lg:block">
            {renderSidebarContent()}
          </div>
        )}

        {/* Main Content Area */}
        <div className="flex-1 bg-card rounded-xl border border-border shadow-sm overflow-hidden flex flex-col relative">
          {viewMode === 'tasks' ? (
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-muted/5">
              <div className="max-w-3xl mx-auto space-y-8">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-2xl font-bold text-foreground">My Tasks</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      {filteredAndSortedTasks.filter(t => !t.completed).length} tasks remaining
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {/* Search */}
                    {isSearchOpen ? (
                      <div className="relative animate-in fade-in slide-in-from-right-5 duration-200">
                        <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                        <Input 
                          autoFocus
                          placeholder="Search tasks..." 
                          value={taskSearchQuery}
                          onChange={(e) => setTaskSearchQuery(e.target.value)}
                          onBlur={() => !taskSearchQuery && setIsSearchOpen(false)}
                          className="pl-8 h-9 w-56 text-sm bg-background shadow-sm"
                        />
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="absolute right-0 top-0 h-9 w-9 hover:bg-transparent"
                          onClick={() => {
                            setTaskSearchQuery('');
                            setIsSearchOpen(false);
                          }}
                        >
                          <XIcon className="h-3 w-3 text-muted-foreground" />
                        </Button>
                      </div>
                    ) : (
                      <Button variant="outline" size="icon" className="h-9 w-9 bg-background shadow-sm" onClick={() => setIsSearchOpen(true)}>
                        <SearchIcon className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    )}

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="gap-2 h-9 text-sm bg-background shadow-sm">
                          <FilterIcon className="h-3.5 w-3.5" /> Sort & Filter
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-56">
                        <DropdownMenuLabel>Sort By</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => setTaskSortBy('date-asc')}>
                          Date (Earliest first)
                          {taskSortBy === 'date-asc' && <CheckCircle2Icon className="ml-auto h-3 w-3" />}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setTaskSortBy('date-desc')}>
                          Date (Latest first)
                          {taskSortBy === 'date-desc' && <CheckCircle2Icon className="ml-auto h-3 w-3" />}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setTaskSortBy('title')}>
                          Title (A-Z)
                          {taskSortBy === 'title' && <CheckCircle2Icon className="ml-auto h-3 w-3" />}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuLabel>Filter</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => setHideCompleted(!hideCompleted)}>
                          {hideCompleted ? 'Show Completed' : 'Hide Completed'}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
                
                {/* Add Task Input */}
                <div className="bg-card rounded-xl border border-border shadow-sm p-4 transition-all hover:shadow-md">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <PlusIcon className="h-5 w-5 text-primary" />
                    </div>
                    <Input 
                      placeholder="What needs to be done?" 
                      value={newTaskInput}
                      onChange={(e) => setNewTaskInput(e.target.value)}
                      className="border-0 border-b border-border rounded-none px-0 focus-visible:ring-0 focus-visible:border-primary text-base font-medium placeholder:text-muted-foreground/50 bg-transparent"
                    />
                  </div>
                  
                  <div className="flex items-center justify-between pl-11">
                    <div className="flex items-center gap-2">
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" size="sm" className={cn("h-8 px-3 text-xs font-normal rounded-full border-dashed", !newTaskDate && "text-muted-foreground")}>
                            <CalendarIcon className="h-3.5 w-3.5 mr-1.5" />
                            {newTaskDate ? format(newTaskDate, 'MMM d') : 'Due Date'}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={newTaskDate}
                            onSelect={setNewTaskDate}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      
                      <Input 
                        placeholder="Add details..." 
                        value={newTaskDescription}
                        onChange={(e) => setNewTaskDescription(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleAddTask();
                          }
                        }}
                        className="h-8 w-48 text-xs border-0 bg-muted/30 rounded-full px-3 focus-visible:ring-0"
                      />
                    </div>
                    
                    <Button
                      size="sm"
                      onClick={handleAddTask}
                      disabled={!newTaskInput.trim() || loadingTasks}
                      className="h-8 px-4 rounded-full shadow-sm"
                    >
                      {loadingTasks ? 'Saving…' : 'Add Task'}
                    </Button>
                  </div>
                  
                  <div className="flex items-center justify-end gap-2 mt-3 pt-3 border-t border-border/50">
                    <Switch 
                      id="auto-add-calendar" 
                      checked={autoAddToCalendar}
                      onCheckedChange={setAutoAddToCalendar}
                      className="scale-75"
                    />
                    <Label htmlFor="auto-add-calendar" className="text-xs text-muted-foreground cursor-pointer select-none">
                      Add to calendar
                    </Label>
                  </div>
                </div>

                {/* Task List */}
                <div className="space-y-3">
                  {filteredAndSortedTasks.map((task) => (
                    <div 
                      key={task.id} 
                      className={cn(
                        "group flex items-center gap-4 p-4 rounded-xl border border-border bg-card hover:shadow-md hover:border-primary/20 transition-all duration-200 cursor-pointer relative overflow-hidden",
                        task.completed ? "opacity-60 bg-muted/30" : "bg-white dark:bg-card"
                      )}
                      onClick={() => {
                        setEditingTask(task);
                        setEditTaskOpen(true);
                      }}
                    >
                      {/* Selection/Status Indicator Line */}
                      <div className={cn(
                        "absolute left-0 top-0 bottom-0 w-1 transition-colors",
                        task.completed ? "bg-muted-foreground/30" : "bg-primary"
                      )} />

                      <div className="mt-0.5" onClick={(e) => e.stopPropagation()}>
                        <input 
                          type="checkbox" 
                          checked={task.completed}
                          onChange={() => toggleTaskCompletion(task.id)}
                          className="h-5 w-5 rounded-full border-2 border-muted-foreground/30 text-primary focus:ring-primary cursor-pointer transition-all hover:border-primary" 
                        />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className={cn("text-sm font-semibold text-foreground truncate", task.completed && "line-through text-muted-foreground")}>
                            {task.title}
                          </p>
                          {task.recurrence && task.recurrence !== 'none' && (
                            <span className="flex items-center gap-1 text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded-full font-medium capitalize">
                              <RefreshCwIcon className="h-3 w-3" /> {task.recurrence}
                            </span>
                          )}
                        </div>
                        
                        {task.description && (
                          <p className={cn("text-xs text-muted-foreground truncate mb-2", task.completed && "line-through")}>
                            {task.description}
                          </p>
                        )}
                        
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span className={cn(
                            "flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-muted/50",
                            !task.completed && task.date === 'Today' ? "text-red-600 bg-red-50 font-medium" : ""
                          )}>
                            <CalendarIcon className="h-3.5 w-3.5" /> {task.date}
                          </span>
                          <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-muted/50">
                            <ClockIcon className="h-3.5 w-3.5" /> {task.time}
                          </span>
                          <span className="px-2 py-0.5 rounded-md bg-primary/10 text-primary font-medium text-[10px] uppercase tracking-wide">
                            {task.tag}
                          </span>
                        </div>
                      </div>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 text-muted-foreground hover:text-foreground">
                            <MoreHorizontalIcon className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); deleteTask(task.id); }} className="text-destructive focus:text-destructive">
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  ))}
                  {filteredAndSortedTasks.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                      <div className="h-12 w-12 rounded-full bg-muted/50 flex items-center justify-center mb-3">
                        <ListChecksIcon className="h-6 w-6 opacity-50" />
                      </div>
                      <p className="font-medium">No tasks found</p>
                      <p className="text-xs mt-1">Create a new task to get started</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : activeView === 'month' ? (
            /* Month View */
            <div className="flex-1 flex flex-col">
              <div className="grid grid-cols-7 border-b border-border bg-muted/30">
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                  <div key={day} className="py-2 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {isMobile ? day.charAt(0) : day}
                  </div>
                ))}
              </div>
              <div className="flex-1 grid grid-cols-7 grid-rows-5 lg:grid-rows-6 overflow-y-auto">
                {daysInMonthView.map((day, index) => {
                  const dayEvents = getEventsForDay(day);
                  const isCurrentMonth = isSameMonth(day, currentDate);
                  
                  return (
                    <div 
                      key={day.toISOString()} 
                      className={cn(
                        "border-b border-r border-border/50 p-1 min-h-[80px] relative group transition-colors hover:bg-muted/20",
                        !isCurrentMonth && "bg-muted/5 text-muted-foreground/50",
                        (index + 1) % 7 === 0 && "border-r-0"
                      )}
                      onClick={() => {
                        setClickedSlot({ date: day, hour: 9 });
                        setCreateEventCategoryId(null);
                        setCreateEventOpen(true);
                      }}
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.currentTarget.classList.add('bg-primary/10');
                      }}
                      onDragLeave={(e) => {
                        e.currentTarget.classList.remove('bg-primary/10');
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        e.currentTarget.classList.remove('bg-primary/10');

                        const eventPayload = parseDraggedCalendarEventPayload(e.dataTransfer.getData('calendarEvent'));
                        if (eventPayload) {
                          void moveCalendarEventToSlot(eventPayload, day);
                          return;
                        }

                        const categoryData = e.dataTransfer.getData('eventCategory');
                        if (!categoryData) return;

                        try {
                          const category = JSON.parse(categoryData) as CalendarCategory;
                          void handleDroppedCategory(category, day, 9);
                        } catch (err) {
                          console.error(err);
                        }
                      }}
                    >
                      <div className="flex justify-center sm:justify-start mb-1">
                        <span className={cn(
                          "text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full",
                          isToday(day) ? "bg-primary text-primary-foreground" : "text-foreground"
                        )}>
                          {format(day, 'd')}
                        </span>
                      </div>
                      
                      <div className="space-y-1">
                        {dayEvents.slice(0, isMobile ? 2 : 3).map((event) => (
                          <HoverCard key={event.id} openDelay={150}>
                            <HoverCardTrigger asChild>
                              <div
                                draggable
                                onDragStart={(e) => {
                                  const payload: DraggedCalendarEventPayload = {
                                    eventId: event.id,
                                    durationMinutes: Math.max(
                                      15,
                                      Math.round((event.end.getTime() - event.start.getTime()) / (1000 * 60))
                                    ),
                                    startHour: event.start.getHours(),
                                    startMinutes: event.start.getMinutes(),
                                  };
                                  e.dataTransfer.setData('calendarEvent', JSON.stringify(payload));
                                  e.dataTransfer.effectAllowed = 'move';
                                }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (event.category === 'task') {
                                    const taskId = event.id.startsWith('evt-task-') ? event.id.replace('evt-task-', '') : event.id;
                                    const existingTask = tasks.find(t => t.id === taskId);

                                    if (existingTask) {
                                      setEditingTask(existingTask);
                                    } else {
                                      setEditingTask({
                                        id: event.id,
                                        title: event.title,
                                        date: format(event.start, 'EEE, MMM d'),
                                        rawDate: event.start,
                                        time: format(event.start, 'h:mm a'),
                                        tag: 'General',
                                        completed: false,
                                        recurrence: 'none'
                                      });
                                    }
                                    setEditTaskOpen(true);
                                  } else {
                                    setSelectedEvent(event);
                                  }
                                }}
                                className={cn(
                                  "text-[10px] px-1.5 py-0.5 rounded truncate cursor-pointer text-white font-medium shadow-sm",
                                  event.color
                                )}
                              >
                                {event.title}
                              </div>
                            </HoverCardTrigger>
                            <HoverCardContent className="w-72 p-3" side="top" align="start">
                              {renderEventHoverDetails(event)}
                            </HoverCardContent>
                          </HoverCard>
                        ))}
                        {dayEvents.length > (isMobile ? 2 : 3) && (
                          <div className="text-[10px] text-muted-foreground pl-1 font-medium">
                            +{dayEvents.length - (isMobile ? 2 : 3)} more
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            /* Day/Week View */
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Header Row */}
              <div className="flex border-b border-border bg-muted/10">
                <div className="w-12 sm:w-16 shrink-0 border-r border-border bg-muted/20" />
                <div className={cn(
                  "grid flex-1",
                  activeView === 'day' ? "grid-cols-1" : "grid-cols-7"
                )}>
                  {daysToRender.map(day => (
                    <div 
                      key={day.toISOString()} 
                      className={cn(
                        "py-2 text-center border-r border-border/50 last:border-r-0",
                        isToday(day) && "bg-primary/5"
                      )}
                    >
                      <div className={cn(
                        "text-[10px] uppercase font-semibold mb-0.5",
                        isToday(day) ? "text-primary" : "text-muted-foreground"
                      )}>
                        {format(day, 'EEE')}
                      </div>
                      <div className={cn(
                        "text-lg font-bold w-8 h-8 flex items-center justify-center rounded-full mx-auto",
                        isToday(day) ? "bg-primary text-primary-foreground shadow-sm" : "text-foreground"
                      )}>
                        {format(day, 'd')}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Scrollable Grid */}
              <div className="flex-1 overflow-y-auto relative">
                <div className="flex min-h-[1440px]"> {/* 24h * 60px */}
                  {/* Time Axis */}
                  <div className="w-12 sm:w-16 shrink-0 border-r border-border bg-muted/5 text-xs text-muted-foreground font-medium">
                    {timeSlots.map((time, i) => (
                      <div key={time} className="h-[60px] text-center relative">
                        {i !== 0 && <span className="bg-background px-1 relative z-10">{time}</span>}
                      </div>
                    ))}
                  </div>

                  {/* Grid Columns */}
                  <div className={cn(
                    "grid flex-1 relative",
                    activeView === 'day' ? "grid-cols-1" : "grid-cols-7"
                  )}>
                    {/* Horizontal Lines */}
                    {timeSlots.map((_, i) => (
                      <div 
                        key={i} 
                        className="absolute w-full border-t border-border/30" 
                        style={{ top: `${i * 60}px` }} 
                      />
                    ))}

                    {/* Current Time Indicator */}
                    {isCurrentWeek && (
                      <div 
                        className="absolute left-0 right-0 z-20 pointer-events-none flex items-center"
                        style={{ top: `${(currentHour * 60) + currentMinutes}px` }}
                      >
                        <div className="w-full h-px bg-red-500 shadow-[0_0_4px_rgba(239,68,68,0.4)]" />
                        <div className="absolute -left-1.5 w-3 h-3 rounded-full bg-red-500 border-2 border-background" />
                      </div>
                    )}

                    {/* Day Columns */}
                    {daysToRender.map((day) => (
                      <div 
                        key={day.toISOString()} 
                        className={cn(
                          "relative border-r border-border/50 last:border-r-0 h-full",
                          isToday(day) && "bg-primary/5"
                        )}
                      >
                        {/* Clickable Slots */}
                        {timeSlotHours.map(hour => (
                          <div
                            key={hour}
                            className="absolute w-full h-[60px] hover:bg-primary/5 transition-colors cursor-pointer z-0"
                            style={{ top: `${hour * 60}px` }}
                            onClick={() => {
      setClickedSlot({ date: day, hour });
      setCreateEventCategoryId(null);
      setCreateEventOpen(true);
                            }}
                            onDragOver={(e) => {
                              e.preventDefault();
                              e.currentTarget.classList.add('bg-primary/10');
                            }}
                            onDragLeave={(e) => {
                              e.currentTarget.classList.remove('bg-primary/10');
                            }}
                            onDrop={(e) => handleCalendarSlotDrop(e, day, hour)}
                          />
                        ))}

                        {/* Render Events for this day */}
                        {getEventsForDay(day)
                          .filter((event) => !event.allDay)
                          .sort((a, b) => a.start.getTime() - b.start.getTime())
                          .map((event) => {
                            const durationMinutes = (event.end.getTime() - event.start.getTime()) / (1000 * 60);
                            const safeDurationMinutes = Math.max(15, durationMinutes);
                            const startSeconds = event.start.getSeconds();
                            const topOffset =
                              event.start.getHours() * 60 + event.start.getMinutes() + startSeconds / 60;
                            const height = safeDurationMinutes;

                            return (
                              <HoverCard key={event.id} openDelay={150}>
                                <HoverCardTrigger asChild>
                                  <div
                                    draggable
                                    onDragStart={(e) => {
                                      const payload: DraggedCalendarEventPayload = {
                                        eventId: event.id,
                                        durationMinutes: Math.max(15, Math.round(durationMinutes)),
                                        startHour: event.start.getHours(),
                                        startMinutes: event.start.getMinutes(),
                                      };
                                      e.dataTransfer.setData('calendarEvent', JSON.stringify(payload));
                                      e.dataTransfer.effectAllowed = 'move';
                                    }}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (event.category === 'task') {
                                        const taskId = event.id.startsWith('evt-task-') ? event.id.replace('evt-task-', '') : event.id;
                                        const existingTask = tasks.find(t => t.id === taskId);

                                        if (existingTask) {
                                          setEditingTask(existingTask);
                                        } else {
                                          setEditingTask({
                                            id: event.id,
                                            title: event.title,
                                            date: format(event.start, 'EEE, MMM d'),
                                            rawDate: event.start,
                                            time: format(event.start, 'h:mm a'),
                                            tag: 'General',
                                            completed: false,
                                            recurrence: 'none'
                                          });
                                        }
                                        setEditTaskOpen(true);
                                      } else {
                                        setSelectedEvent(event);
                                      }
                                    }}
                                    className={cn(
                                      "absolute left-1 right-1 rounded-md border border-white/20 shadow-sm cursor-pointer z-10 overflow-hidden hover:z-20 hover:shadow-md transition-all",
                                      event.color
                                    )}
                                    style={{ top: `${topOffset}px`, height: `${height}px` }}
                                  >
                                    <div className="px-2 py-1 h-full flex flex-col">
                                      <div className="flex items-center justify-between gap-1">
                                        {event.category === 'task' ? (
                                          <ListChecksIcon className="h-3 w-3 text-white" />
                                        ) : (
                                          <span className="text-[10px] font-bold text-white uppercase tracking-wider truncate">
                                            {getEventLabel(event.category)}
                                          </span>
                                        )}
                                        {event.feedback?.status && (
                                          <div className="w-1.5 h-1.5 rounded-full bg-white" />
                                        )}
                                      </div>
                                      <div className="text-xs font-semibold text-white truncate leading-tight">
                                        {event.title}
                                      </div>
                                      {event.propertyAddress && height > 40 && (
                                        <div className="text-[10px] text-white/90 truncate mt-auto">
                                          {event.propertyAddress}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </HoverCardTrigger>
                                <HoverCardContent className="w-72 p-3" side="top" align="start">
                                  {renderEventHoverDetails(event)}
                                </HoverCardContent>
                              </HoverCard>
                            );
                          })}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Dialogs */}
      <Dialog open={addCategoryOpen} onOpenChange={setAddCategoryOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Add Event Type</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} placeholder="e.g. Inspection" />
            </div>
            <div className="space-y-2">
              <Label>Color</Label>
              <div className="flex gap-2 flex-wrap">
                {['bg-blue-500', 'bg-green-500', 'bg-red-500', 'bg-yellow-500', 'bg-purple-500', 'bg-pink-500', 'bg-orange-500', 'bg-cyan-500'].map(color => (
                  <button
                    key={color}
                    className={cn("w-8 h-8 rounded-full transition-transform hover:scale-110", color, newCategoryColor === color && "ring-2 ring-offset-2 ring-foreground")}
                    onClick={() => setNewCategoryColor(color)}
                  />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setAddCategoryOpen(false)}>Cancel</Button>
            <Button onClick={() => {
              if (newCategoryName) {
                const newCat = { id: `cat-${Date.now()}`, label: newCategoryName, color: newCategoryColor, type: 'event' as const };
                setEventCategories([...eventCategories, newCat]);
                setCheckedCategories([...checkedCategories, newCat.id]);
                setAddCategoryOpen(false);
                setNewCategoryName('');
              }
            }}>Add</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <CreateEventDialog
        open={createEventOpen}
        onOpenChange={setCreateEventOpen}
        prefilledDate={clickedSlot?.date}
        prefilledTime={clickedSlot ? `${clickedSlot.hour.toString().padStart(2, '0')}:00` : undefined}
        prefilledCategory={createEventCategoryId ?? undefined}
        categories={eventCategoryOptions}
        onSave={(data) => {
          void (async () => {
            if (!effectiveAgencyId) {
              setLoadError('Missing agency context');
              return;
            }

            const [sh, sm] = data.startTime.split(':').map(Number);
            const [eh, em] = data.endTime.split(':').map(Number);
            const start = setMinutes(setHours(new Date(data.date), sh), sm);
            const end = setMinutes(setHours(new Date(data.date), eh), em);

            const branchIdForEvent =
              activeCalendarTab === 'main-calendar'
                ? null
                : activeCalendarTab === 'branch-calendar'
                ? validSelectedBranchUuid ?? effectiveBranchId
                : effectiveBranchId;

            const staffIdForEvent = activeCalendarTab === 'my-calendar' ? effectiveStaffId : null;

            const guestEmails = data.guests
              ? data.guests
                  .split(',')
                  .map((e) => e.trim())
                  .filter(Boolean)
              : [];

            const created = await createDiaryEventRow({
              agency_id: effectiveAgencyId,
              client_id: effectiveClientId,
              branch_id: normalizeBranchIdForWrite(branchIdForEvent),
              staff_id: normalizeStaffIdForWrite(staffIdForEvent),
              title: data.title,
              description: data.description ?? null,
              category: data.category,
              start_at: start.toISOString(),
              end_at: end.toISOString(),
              all_day: false,
              location: data.location ?? null,
              guest_emails: guestEmails.length ? guestEmails : null,
              created_by: user?.id ?? null,
            });

            if (!created) {
              setLoadError('Failed to create diary event');
              return;
            }

            const newEvent = mapDiaryRowToCalendarEvent(created);
            setEvents((prev) => [...prev, newEvent]);
            setClickedSlot(null);
            setCreateEventCategoryId(null);
          })();
        }}
      />

      {selectedEvent && selectedEvent.category === 'valuation' && (
        <ValuationFeedbackDialog
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
          onSave={handleSelectedEventSave}
          onLogMileage={() => {
            setEventForMileage(selectedEvent);
            setMileageLogOpen(true);
            setSelectedEvent(null); // Close feedback dialog to prevent overlap
          }}
        />
      )}

      {selectedEvent && selectedEvent.category !== 'valuation' && (
        <DiaryEventDetailsDialog
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
          onSave={handleSelectedEventSave}
          onLogMileage={() => {
            setEventForMileage(selectedEvent);
            setMileageLogOpen(true);
            setSelectedEvent(null); // Close details dialog to prevent overlap
          }}
        />
      )}

      {eventForMileage && (
        <MileageLogDialog
          open={mileageLogOpen}
          onOpenChange={setMileageLogOpen}
          event={eventForMileage}
          onSave={(data) => {
            void (async () => {
              if (effectiveAgencyId) {
                await createMileageLogRow({
                  agency_id: effectiveAgencyId,
                  branch_id: toUuidOrNull(eventForMileage.branchId) ?? effectiveBranchId,
                  staff_id: effectiveStaffId,
                  diary_event_id: eventForMileage.id,
                  task_id: null,
                  start_location: data.startLocation,
                  end_location: data.endLocation,
                  distance: data.distance,
                  is_return_trip: data.isReturnTrip,
                  total_distance: data.totalDistance,
                  logged_at: data.date,
                });
              }

              // Keep local store in sync (used elsewhere in UI)
              useMileageStore.getState().addLog({
                ...data,
                staffName: (userMeta?.name ?? user?.email ?? 'Current User') as string,
              });

              setMileageLogOpen(false);
              setEventForMileage(null);
            })();
          }}
        />
      )}

      <AddPropertyDialog
        open={valuationFormOpen}
        onOpenChange={setValuationFormOpen}
        preselectedStatus="valuation"
        prefilledDate={valuationPrefill?.date}
        prefilledTime={valuationPrefill?.time}
        branches={clientBranches}
        branchesLoading={structureLoading}
        defaultBranchId={valuationDefaultBranchId}
        lockBranch={false}
        staffMembers={clientStaff.map((s) => ({
          id: s.id,
          name: s.name,
          role: s.role,
          branch_id: s.branch_id,
        }))}
        staffLoading={structureLoading}
        onSave={(data) => {
          void (async () => {
            if (!data) return;
            if (!effectiveAgencyId) {
              setLoadError('Missing agency context');
              return;
            }

            const start = buildAppointmentDateTime(data.appointmentDate, data.appointmentTime);
            if (!start) {
              setLoadError('Invalid appointment date/time');
              return;
            }
            const end = addHours(start, 1);

            const created = await createDiaryEventRow({
              agency_id: effectiveAgencyId,
              client_id: effectiveClientId,
              branch_id: normalizeBranchIdForWrite(
                toUuidOrNull(data.branch) ?? valuationDefaultBranchId ?? null
              ),
              staff_id: null,
              title: 'Valuation',
              description: data.description ?? null,
              category: 'valuation',
              start_at: start.toISOString(),
              end_at: end.toISOString(),
              all_day: false,
              location: data.address ?? null,
              vendor_name: data.vendorName ?? null,
              property_address: data.address ?? null,
              created_by: user?.id ?? null,
            });

            if (!created) {
              setLoadError('Failed to create valuation');
              return;
            }

            const movementCreated = await createMovement(
              effectiveAgencyId,
              {
                branch_id: toUuidOrNull(data.branch) ?? valuationDefaultBranchId ?? null,
                property: data.description || undefined,
                address: data.address || undefined,
                type: data.salesOrLettings === 'lettings' ? 'letting' : 'sale',
                status: 'valuation',
                price: parseNumber(data.price),
                fee_percentage: data.typeOfFee === 'percentage' ? parseNumber(data.feePercentage) : null,
                fee_amount: data.typeOfFee === 'fixed' ? parseNumber(data.feeAmount) : null,
                date: new Date().toISOString().split('T')[0],
                agent: data.teamMember || undefined,
                board: false,
                notes: undefined,
                motivated_seller: data.motivatedSeller || undefined,
              },
              effectiveClientId ?? undefined
            );

            if (!movementCreated) {
              setLoadError('Valuation added to diary, but failed to add movement');
            } else {
              await loadMovements(effectiveAgencyId, effectiveClientId ?? undefined);
            }

            setEvents((prev) => [...prev, mapDiaryRowToCalendarEvent(created)]);
          })();
        }}
      />

      <TaskEditDialog
        open={editTaskOpen}
        onOpenChange={setEditTaskOpen}
        task={editingTask}
        onSave={handleUpdateTask}
        onDelete={deleteTask}
      />
    </div>
  );
}
