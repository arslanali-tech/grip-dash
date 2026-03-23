import { useState, useEffect } from 'react';
import { BellIcon, MessageSquareIcon, MegaphoneIcon, Loader2Icon, CalendarCheckIcon, CalendarXIcon, PrinterIcon, DollarSignIcon, ClipboardCheckIcon } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { fetchClientUpdates } from '@/lib/ownerApi';
import { fetchRecentTeamMessages } from '@/lib/teamChatApi';
import { fetchInAppNotifications, markNotificationRead, notifyRoles } from '@/lib/notificationsApi';
import { fetchHousekeepingRequestById, updateHousekeepingRequest } from '@/lib/housekeepingApi';
import { NotificationActionDialog } from './NotificationActionDialog';
import { useAuthStore } from '@/stores/authStore';
import { getUserRole } from '@/lib/ownerAccess';
import { notifyError, notifySuccess } from '@/lib/notify';

export interface NotificationItem {
  id: string;
  type: 'update' | 'team_message' | 'housekeeping';
  housekeepingType?: string;
  relatedId?: string | null;
  title: string;
  body: string;
  time: string;
  createdAt: Date;
  isRead?: boolean;
}

interface NotificationsPanelProps {
  open: boolean;
  agencyId: string | null;
  className?: string;
}

const normalizeRoleForNotifications = (role: string | null): string | undefined => {
  const normalized = role?.trim().toLowerCase();
  if (!normalized) return undefined;
  if (normalized === 'agency_user') return 'client';
  if (normalized === 'branch manager') return 'branch_manager';
  return normalized;
};

const isHousekeepingActionable = (type?: string) =>
  type === 'holiday_request' || type === 'absence_request';

export function NotificationsPanel({ open, agencyId, className }: NotificationsPanelProps) {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [notificationActionOpen, setNotificationActionOpen] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState<NotificationItem | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const user = useAuthStore((state) => state.user);
  const notificationRole = normalizeRoleForNotifications(getUserRole(user));
  const actorName =
    (user?.user_metadata as { full_name?: string; name?: string } | undefined)?.full_name ??
    (user?.user_metadata as { full_name?: string; name?: string } | undefined)?.name ??
    user?.email ??
    'Unknown User';

  useEffect(() => {
    if (!open || !agencyId) {
      setItems([]);
      return;
    }
    setLoading(true);
    const since = new Date();
    since.setDate(since.getDate() - 7); // last 7 days

    Promise.all([
      fetchClientUpdates(agencyId),
      fetchRecentTeamMessages(agencyId, { since, limit: 20 }),
      fetchInAppNotifications(agencyId, { recipientRole: notificationRole, limit: 30 }),
    ])
      .then(([updates, messages, inAppNotifs]) => {
        const fromUpdates: NotificationItem[] = (updates ?? []).map((u) => ({
          id: `update-${u.id}`,
          type: 'update',
          title: u.subject,
          body: u.content,
          time: u.created_at,
          createdAt: new Date(u.created_at),
        }));
        const fromMessages: NotificationItem[] = (messages ?? []).map((m) => {
          const channel = (m as { team_channels?: { name: string } | null })?.team_channels?.name ?? 'general';
          return {
            id: `msg-${m.id}`,
            type: 'team_message',
            title: `${m.sender_name ?? 'Someone'} in #${channel.replace(/\s+/g, '-').toLowerCase()}`,
            body: m.content,
            time: m.created_at,
            createdAt: new Date(m.created_at),
          };
        });
        const fromHousekeeping: NotificationItem[] = (inAppNotifs ?? []).map((n) => ({
          id: `hk-${n.id}`,
          type: 'housekeeping',
          housekeepingType: n.type,
          relatedId: n.related_id,
          title: n.title,
          body: n.body,
          time: n.created_at,
          createdAt: new Date(n.created_at),
          isRead: n.is_read,
        }));
        const merged = [...fromUpdates, ...fromMessages, ...fromHousekeeping].sort(
          (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
        );
        setItems(merged.slice(0, 30));
      })
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [open, agencyId, notificationRole]);

  const markAsRead = async (notification: NotificationItem) => {
    if (notification.type !== 'housekeeping' || notification.isRead) return;
    const realId = notification.id.replace('hk-', '');
    await markNotificationRead(realId);
    setItems((prev) =>
      prev.map((item) => (item.id === notification.id ? { ...item, isRead: true } : item))
    );
  };

  const handleNotificationClick = async (notification: NotificationItem) => {
    if (notification.type !== 'housekeeping') return;
    await markAsRead(notification);
    if (isHousekeepingActionable(notification.housekeepingType) && notification.relatedId) {
      setSelectedNotification(notification);
      setNotificationActionOpen(true);
    }
  };

  const handleHousekeepingDecision = async (
    nextStatus: 'approved' | 'rejected',
    notes?: string
  ) => {
    if (actionLoading || !agencyId || !selectedNotification?.relatedId) return;
    setActionLoading(true);

    try {
      const request = await fetchHousekeepingRequestById(selectedNotification.relatedId);
      if (!request) {
        notifyError('Request not found.');
        return;
      }

      if (request.status !== 'pending') {
        notifyError(`This request is already ${request.status}.`);
        return;
      }

      const existingPayload =
        request.payload && typeof request.payload === 'object'
          ? (request.payload as Record<string, unknown>)
          : {};

      const updated = await updateHousekeepingRequest(request.id, {
        status: nextStatus,
        payload: {
          ...existingPayload,
          decision: {
            status: nextStatus,
            notes: notes ?? null,
            decidedBy: actorName,
            decidedAt: new Date().toISOString(),
          },
        },
      });

      if (!updated) {
        notifyError('Failed to update the request status.');
        return;
      }

      const requestLabel =
        request.request_type === 'holiday_request'
          ? 'Holiday request'
          : request.request_type === 'absence_request'
          ? 'Absence request'
          : 'Request';
      const statusLabel = nextStatus === 'approved' ? 'approved' : 'rejected';

      await notifyRoles({
        agencyId,
        roles: ['branch_manager', 'owner', 'client'],
        title: `${requestLabel} ${statusLabel}`,
        body: `${request.staff_name ?? 'A staff member'} request was ${statusLabel}.`,
        type: request.request_type,
        relatedId: request.id,
      });

      notifySuccess(`${requestLabel} ${statusLabel}.`);
      setItems((prev) =>
        prev.map((item) => (item.id === selectedNotification.id ? { ...item, isRead: true } : item))
      );
      setNotificationActionOpen(false);
      setSelectedNotification(null);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className={cn('flex flex-col', className)}>
      <div className="flex items-center gap-2 px-1 pb-3 border-b border-border">
        <BellIcon className="h-5 w-5 text-primary" strokeWidth={1.5} />
        <h3 className="font-semibold text-foreground">Notifications</h3>
      </div>
      <ScrollArea className="h-[280px] mt-2 pr-2">
        {loading ? (
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            <Loader2Icon className="h-6 w-6 animate-spin" strokeWidth={1.5} />
          </div>
        ) : items.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">No notifications</p>
        ) : (
          <ul className="space-y-1">
            {items.map((n) => {
              const getHousekeepingIcon = () => {
                switch (n.housekeepingType) {
                  case 'holiday_request': return <CalendarCheckIcon className="h-4 w-4 text-green-500 shrink-0 mt-0.5" strokeWidth={1.5} />;
                  case 'absence_request': return <CalendarXIcon className="h-4 w-4 text-red-500 shrink-0 mt-0.5" strokeWidth={1.5} />;
                  case 'stationery_request': return <PrinterIcon className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" strokeWidth={1.5} />;
                  case 'invoice_request': return <DollarSignIcon className="h-4 w-4 text-green-600 shrink-0 mt-0.5" strokeWidth={1.5} />;
                  case 'staff_appraisal': return <ClipboardCheckIcon className="h-4 w-4 text-purple-500 shrink-0 mt-0.5" strokeWidth={1.5} />;
                  default: return <BellIcon className="h-4 w-4 text-warning shrink-0 mt-0.5" strokeWidth={1.5} />;
                }
              };

              return (
              <li
                key={n.id}
                onClick={() => {
                  void handleNotificationClick(n);
                }}
                className={cn(
                  'rounded-lg p-3 text-left border border-transparent hover:bg-accent/50 hover:border-border transition-colors cursor-pointer',
                  n.type === 'update' && 'bg-primary/5',
                  n.type === 'housekeeping' && !n.isRead && 'bg-warning/5 border-warning/20'
                )}
              >
                <div className="flex items-start gap-2">
                  {n.type === 'update' ? (
                    <MegaphoneIcon className="h-4 w-4 text-primary shrink-0 mt-0.5" strokeWidth={1.5} />
                  ) : n.type === 'housekeeping' ? (
                    getHousekeepingIcon()
                  ) : (
                    <MessageSquareIcon className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" strokeWidth={1.5} />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm text-foreground truncate">{n.title}</p>
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{n.body}</p>
                    <p className="text-[11px] text-muted-foreground mt-1">
                      {formatDistanceToNow(n.createdAt, { addSuffix: true })}
                    </p>
                  </div>
                </div>
              </li>
              );
            })}
          </ul>
        )}
      </ScrollArea>
      {selectedNotification && isHousekeepingActionable(selectedNotification.housekeepingType) && (
        <NotificationActionDialog
          open={notificationActionOpen}
          onOpenChange={(nextOpen) => {
            setNotificationActionOpen(nextOpen);
            if (!nextOpen) setSelectedNotification(null);
          }}
          notification={{
            type: selectedNotification.housekeepingType === 'absence_request' ? 'absence' : 'holiday',
            title: selectedNotification.title,
            description: selectedNotification.body,
            details: actionLoading ? 'Updating request...' : undefined,
          }}
          onAccept={(notes) => {
            void handleHousekeepingDecision('approved', notes);
          }}
          onDecline={(reason) => {
            void handleHousekeepingDecision('rejected', reason);
          }}
        />
      )}
    </div>
  );
}
