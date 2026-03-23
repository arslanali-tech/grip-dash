import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  XIcon, 
  TrendingUpIcon, 
  MessageSquareIcon, 
  CalendarIcon, 
  CheckSquareIcon,
  UserXIcon,
  ChevronRightIcon,
  ClockIcon,
  HomeIcon,
  UsersIcon
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, isToday, isYesterday, startOfWeek, endOfWeek, isSameDay, subDays, startOfDay, endOfDay, addDays } from 'date-fns';
import { useDashboardStore } from '@/stores/dashboardStore';
import { ScrollArea } from '@/components/ui/scroll-area';
import { fetchRecentTeamMessages } from '@/lib/teamChatApi';
import { fetchDiaryEvents } from '@/lib/diaryApi';
import { fetchTasks } from '@/lib/tasksApi';

interface DailyBriefingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userBranch: string;
  agencyId?: string | null;
}

interface TeamMessage {
  id: string;
  sender: string;
  content: string;
  timestamp: string;
  channel: string;
}

interface CalendarEvent {
  id: string;
  title: string;
  time: string;
  type: 'viewing' | 'valuation' | 'meeting';
  location?: string;
}

interface Task {
  id: string;
  title: string;
  priority: 'high' | 'medium' | 'low';
  dueTime?: string;
}

interface StaffAbsence {
  id: string;
  name: string;
  reason: string;
  returnDate?: string;
}

export function DailyBriefingDialog({ open, onOpenChange, userBranch, agencyId }: DailyBriefingDialogProps) {
  const { movements } = useDashboardStore();
  const [yesterdayMessages, setYesterdayMessages] = useState<TeamMessage[]>([]);
  const [loadingTeamUpdates, setLoadingTeamUpdates] = useState(false);

  // Yesterday's movements from Supabase-backed store (filter by branch and yesterday)
  const yesterdayMovements = movements.filter(m => {
    if (!m.date) return false;
    const moveDate = new Date(m.date);
    return isYesterday(moveDate) && m.branch === userBranch;
  }).slice(0, 5);

  // Team Updates from Supabase team_messages (last 24h)
  useEffect(() => {
    if (!open || !agencyId) {
      if (!agencyId) setYesterdayMessages([]);
      return;
    }
    setLoadingTeamUpdates(true);
    const since = subDays(new Date(), 1);
    fetchRecentTeamMessages(agencyId, { since, limit: 10 })
      .then((rows) => {
        const mapped: TeamMessage[] = rows.map((row) => ({
          id: row.id,
          sender: row.sender_name ?? 'Someone',
          content: row.content,
          timestamp: format(new Date(row.created_at), isYesterday(new Date(row.created_at)) ? "'Yesterday at' h:mm a" : "MMM d 'at' h:mm a"),
          channel: (row.team_channels as { name?: string } | null)?.name ?? 'general',
        }));
        setYesterdayMessages(mapped);
      })
      .catch(() => setYesterdayMessages([]))
      .finally(() => setLoadingTeamUpdates(false));
  }, [open, agencyId]);

  // Today's & this week's events from Supabase diary_events
  const [todayEvents, setTodayEvents] = useState<CalendarEvent[]>([]);
  const [weekEvents, setWeekEvents] = useState<CalendarEvent[]>([]);
  const [todayTasks, setTodayTasks] = useState<Task[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const staffAbsences: StaffAbsence[] = []; // No absences API yet; show empty

  useEffect(() => {
    if (!open || !agencyId) {
      setTodayEvents([]);
      setWeekEvents([]);
      return;
    }
    setLoadingEvents(true);
    const now = new Date();
    const todayStart = startOfDay(now).toISOString();
    const todayEnd = endOfDay(now).toISOString();
    const weekEnd = endOfDay(addDays(now, 7)).toISOString();
    Promise.all([
      fetchDiaryEvents({ agencyId, rangeStart: todayStart, rangeEnd: todayEnd }),
      fetchDiaryEvents({ agencyId, rangeStart: todayStart, rangeEnd: weekEnd }),
    ])
      .then(([todayRows, weekRows]) => {
        setTodayEvents(
          (todayRows ?? []).map((e) => ({
            id: e.id,
            title: e.title,
            time: format(new Date(e.start_at), 'h:mm a'),
            type: (e.category === 'valuation' ? 'valuation' : e.category === 'viewing' ? 'viewing' : 'meeting') as 'valuation' | 'viewing' | 'meeting',
            location: e.location ?? e.property_address ?? undefined,
          }))
        );
        setWeekEvents(
          (weekRows ?? []).filter((e) => !isToday(new Date(e.start_at))).slice(0, 10).map((e) => ({
            id: e.id,
            title: e.title,
            time: format(new Date(e.start_at), 'EEE h:mm a'),
            type: (e.category === 'valuation' ? 'valuation' : e.category === 'viewing' ? 'viewing' : 'meeting') as 'valuation' | 'viewing' | 'meeting',
            location: e.location ?? e.property_address ?? undefined,
          }))
        );
      })
      .catch(() => {
        setTodayEvents([]);
        setWeekEvents([]);
      })
      .finally(() => setLoadingEvents(false));
  }, [open, agencyId]);

  useEffect(() => {
    if (!open || !agencyId) {
      setTodayTasks([]);
      return;
    }
    setLoadingTasks(true);
    const now = new Date();
    const todayStart = startOfDay(now).toISOString().slice(0, 10);
    const todayEnd = endOfDay(now).toISOString().slice(0, 10);
    fetchTasks({ agencyId, dueFrom: todayStart, dueTo: todayEnd, status: 'todo', limit: 10 })
      .then((rows) => {
        setTodayTasks(
          (rows ?? []).map((t) => ({
            id: t.id,
            title: t.title ?? '',
            priority: (t.category === 'high' ? 'high' : t.category === 'medium' ? 'medium' : 'low') as 'high' | 'medium' | 'low',
            dueTime: t.due_at ? format(new Date(t.due_at), 'h:mm a') : undefined,
          }))
        );
      })
      .catch(() => setTodayTasks([]))
      .finally(() => setLoadingTasks(false));
  }, [open, agencyId]);

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'valuation': return HomeIcon;
      case 'viewing': return UsersIcon;
      case 'meeting': return MessageSquareIcon;
      default: return CalendarIcon;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-600 bg-red-100 dark:bg-red-900/30';
      case 'medium': return 'text-orange-600 bg-orange-100 dark:bg-orange-900/30';
      case 'low': return 'text-blue-600 bg-blue-100 dark:bg-blue-900/30';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[900px] bg-card text-card-foreground max-h-[90vh] p-0 flex flex-col">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-foreground text-2xl flex items-center gap-2">
                <ClockIcon className="h-6 w-6 text-primary" strokeWidth={1.5} />
                Good Morning! Here's Your Daily Briefing
              </DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground mt-1">
                {format(new Date(), 'EEEE, MMMM dd, yyyy')} • {userBranch}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 px-6 py-6">
          <div className="space-y-6">
            {/* Yesterday's Movements */}
            <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/20 dark:to-blue-900/20 border-blue-200 dark:border-blue-800">
              <CardHeader className="pb-3">
                <CardTitle className="text-foreground flex items-center gap-2">
                  <TrendingUpIcon className="h-5 w-5 text-blue-600" strokeWidth={1.5} />
                  Yesterday's Movements ({yesterdayMovements.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {yesterdayMovements.length > 0 ? (
                  <div className="space-y-2">
                    {yesterdayMovements.map((movement) => (
                      <div 
                        key={movement.id}
                        className="flex items-center justify-between p-3 rounded-lg bg-white dark:bg-card border border-border hover:shadow-sm transition-shadow"
                      >
                        <div className="flex-1">
                          <p className="font-medium text-foreground text-sm">{movement.address || movement.property || '—'}</p>
                          <p className="text-xs text-muted-foreground">
                            {(movement.status ?? '').replace(/-/g, ' ')} • {movement.agent || '—'}
                          </p>
                        </div>
                        <span className="text-sm font-semibold text-foreground">
                          £{(movement.price ?? 0).toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No movements recorded yesterday</p>
                )}
              </CardContent>
            </Card>

            {/* Yesterday's Team Messages (Supabase team_messages) */}
            <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950/20 dark:to-purple-900/20 border-purple-200 dark:border-purple-800">
              <CardHeader className="pb-3">
                <CardTitle className="text-foreground flex items-center gap-2">
                  <MessageSquareIcon className="h-5 w-5 text-purple-600" strokeWidth={1.5} />
                  Team Updates ({yesterdayMessages.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loadingTeamUpdates ? (
                  <p className="text-sm text-muted-foreground">Loading team updates…</p>
                ) : yesterdayMessages.length > 0 ? (
                  <div className="space-y-2">
                    {yesterdayMessages.map((message) => (
                      <div 
                        key={message.id}
                        className="p-3 rounded-lg bg-white dark:bg-card border border-border"
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-sm text-foreground">{message.sender}</span>
                          <span className="text-xs text-muted-foreground">in #{message.channel.replace(/\s+/g, '-').toLowerCase()}</span>
                        </div>
                        <p className="text-sm text-foreground/90">{message.content}</p>
                        <p className="text-xs text-muted-foreground mt-1">{message.timestamp}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No team updates in the last 24 hours</p>
                )}
              </CardContent>
            </Card>

            {/* Today's Schedule (Supabase diary_events) */}
            <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/20 dark:to-green-900/20 border-green-200 dark:border-green-800">
              <CardHeader className="pb-3">
                <CardTitle className="text-foreground flex items-center gap-2">
                  <CalendarIcon className="h-5 w-5 text-green-600" strokeWidth={1.5} />
                  Today's Schedule ({todayEvents.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loadingEvents ? (
                  <p className="text-sm text-muted-foreground">Loading schedule…</p>
                ) : todayEvents.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No events scheduled for today</p>
                ) : (
                <div className="space-y-2">
                  {todayEvents.map((event) => {
                    const EventIcon = getEventIcon(event.type);
                    return (
                      <div 
                        key={event.id}
                        className="flex items-center gap-3 p-3 rounded-lg bg-white dark:bg-card border border-border"
                      >
                        <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                          <EventIcon className="h-4 w-4 text-green-600" strokeWidth={1.5} />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-sm text-foreground">{event.title}</p>
                          <p className="text-xs text-muted-foreground">{event.location}</p>
                        </div>
                        <span className="text-sm font-semibold text-foreground">{event.time}</span>
                      </div>
                    );
                  })}
                </div>
                )}
              </CardContent>
            </Card>

            {/* This Week's Events (Supabase diary_events) */}
            <Card className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950/20 dark:to-orange-900/20 border-orange-200 dark:border-orange-800">
              <CardHeader className="pb-3">
                <CardTitle className="text-foreground flex items-center gap-2">
                  <CalendarIcon className="h-5 w-5 text-orange-600" strokeWidth={1.5} />
                  Rest of This Week ({weekEvents.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loadingEvents ? (
                  <p className="text-sm text-muted-foreground">Loading…</p>
                ) : weekEvents.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No upcoming events this week</p>
                ) : (
                <div className="space-y-2">
                  {weekEvents.map((event) => {
                    const EventIcon = getEventIcon(event.type);
                    return (
                      <div 
                        key={event.id}
                        className="flex items-center gap-3 p-3 rounded-lg bg-white dark:bg-card border border-border"
                      >
                        <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900/30">
                          <EventIcon className="h-4 w-4 text-orange-600" strokeWidth={1.5} />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-sm text-foreground">{event.title}</p>
                          <p className="text-xs text-muted-foreground">{event.location}</p>
                        </div>
                        <span className="text-sm font-semibold text-foreground">{event.time}</span>
                      </div>
                    );
                  })}
                </div>
                )}
              </CardContent>
            </Card>

            {/* Today's Tasks (Supabase tasks) */}
            <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-950/20 dark:to-yellow-900/20 border-yellow-200 dark:border-yellow-800">
              <CardHeader className="pb-3">
                <CardTitle className="text-foreground flex items-center gap-2">
                  <CheckSquareIcon className="h-5 w-5 text-yellow-600" strokeWidth={1.5} />
                  Today's Tasks ({todayTasks.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loadingTasks ? (
                  <p className="text-sm text-muted-foreground">Loading tasks…</p>
                ) : todayTasks.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No tasks due today</p>
                ) : (
                <div className="space-y-2">
                  {todayTasks.map((task) => (
                    <div 
                      key={task.id}
                      className="flex items-center gap-3 p-3 rounded-lg bg-white dark:bg-card border border-border"
                    >
                      <input 
                        type="checkbox" 
                        className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                      />
                      <div className="flex-1">
                        <p className="font-medium text-sm text-foreground">{task.title}</p>
                        {task.dueTime && (
                          <p className="text-xs text-muted-foreground">Due: {task.dueTime}</p>
                        )}
                      </div>
                      <span className={cn(
                        "text-xs font-medium px-2 py-1 rounded-full",
                        getPriorityColor(task.priority)
                      )}>
                        {task.priority}
                      </span>
                    </div>
                  ))}
                </div>
                )}
              </CardContent>
            </Card>

            {/* Staff Absences (no API yet; section only shown when data exists) */}
            {staffAbsences.length > 0 && (
              <Card className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950/20 dark:to-red-900/20 border-red-200 dark:border-red-800">
                <CardHeader className="pb-3">
                  <CardTitle className="text-foreground flex items-center gap-2">
                    <UserXIcon className="h-5 w-5 text-red-600" strokeWidth={1.5} />
                    Staff Off Today ({staffAbsences.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {staffAbsences.map((absence) => (
                      <div 
                        key={absence.id}
                        className="flex items-center justify-between p-3 rounded-lg bg-white dark:bg-card border border-border"
                      >
                        <div>
                          <p className="font-medium text-sm text-foreground">{absence.name}</p>
                          <p className="text-xs text-muted-foreground">{absence.reason}</p>
                        </div>
                        {absence.returnDate && (
                          <span className="text-xs text-muted-foreground">
                            Back {absence.returnDate}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </ScrollArea>

        <div className="px-6 py-4 border-t border-border shrink-0 flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Dismiss
          </Button>
          <Button
            onClick={() => onOpenChange(false)}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            Let's Go!
            <ChevronRightIcon className="ml-2 h-4 w-4" strokeWidth={1.5} />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
