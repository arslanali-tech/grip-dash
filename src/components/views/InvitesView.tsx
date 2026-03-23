import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { RefreshCcwIcon, SendIcon } from 'lucide-react';
import {
  type InvitationRole,
  type InvitationRow,
  fetchInvitationsForAgency,
  inviteUserByEmail,
  resendInvitation,
} from '@/lib/ownerApi';
import { cn } from '@/lib/utils';

interface InvitesViewProps {
  agencyId: string;
}

const ROLE_OPTIONS: { value: InvitationRole; label: string }[] = [
  { value: 'agency_admin', label: 'Agency Admin' },
  { value: 'client', label: 'Client' },
  { value: 'branch_manager', label: 'Branch Manager' },
  { value: 'negotiator', label: 'Negotiator' },
  { value: 'prospector', label: 'Prospector' },
];

function formatRole(role: string) {
  const normalized = role.replace(/_/g, ' ').trim();
  return normalized
    .split(' ')
    .filter(Boolean)
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(' ');
}

function statusBadgeVariant(status: string | null | undefined): 'default' | 'secondary' | 'outline' {
  const s = (status ?? 'pending').toLowerCase();
  if (s === 'accepted') return 'default';
  if (s === 'pending') return 'secondary';
  return 'outline';
}

export function InvitesView({ agencyId }: InvitesViewProps) {
  const [invites, setInvites] = useState<InvitationRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<InvitationRole>('negotiator');

  const load = useCallback(async () => {
    if (!agencyId) return;
    setLoading(true);
    const rows = await fetchInvitationsForAgency(agencyId);
    setInvites(rows);
    setLoading(false);
  }, [agencyId]);

  useEffect(() => {
    void load();
  }, [load]);

  const sortedInvites = useMemo(() => {
    return [...invites].sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
  }, [invites]);

  const handleSend = async () => {
    const normalized = email.trim().toLowerCase();
    if (!normalized) return;

    setSending(true);
    await inviteUserByEmail(normalized, role, agencyId);
    setSending(false);
    setEmail('');
    await load();
  };

  const handleResend = async (invite: InvitationRow) => {
    setSending(true);
    await resendInvitation(invite as any);
    setSending(false);
    await load();
  };

  return (
    <div className="space-y-6">
      <Card className="bg-card text-card-foreground">
        <CardHeader>
          <CardTitle className="text-foreground">Invite a user</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-3">
            <div className="md:col-span-2 space-y-2">
              <label className="text-sm font-medium text-foreground" htmlFor="invite-email">
                Email
              </label>
              <Input
                id="invite-email"
                type="email"
                placeholder="user@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-background"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Role</label>
              <Select value={role} onValueChange={(v) => setRole(v as InvitationRole)}>
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  {ROLE_OPTIONS.map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              onClick={handleSend}
              disabled={sending || !email.trim()}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <SendIcon className="mr-2 h-4 w-4" strokeWidth={1.5} />
              {sending ? 'Sending…' : 'Send invite'}
            </Button>

            <Button variant="outline" onClick={load} disabled={loading} className="bg-background">
              <RefreshCcwIcon className="mr-2 h-4 w-4" strokeWidth={1.5} />
              Refresh
            </Button>
          </div>

          <p className="text-xs text-muted-foreground">
            Invites are sent via Supabase OTP / magic link.
          </p>
        </CardContent>
      </Card>

      <Card className="bg-card text-card-foreground">
        <CardHeader>
          <CardTitle className="text-foreground">Invitations</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading && <p className="text-sm text-muted-foreground">Loading invites…</p>}

          {!loading && sortedInvites.length === 0 && (
            <p className="text-sm text-muted-foreground">No invites yet.</p>
          )}

          {!loading && sortedInvites.length > 0 && (
            <div className="space-y-2">
              {sortedInvites.map((inv) => {
                const status = (inv.status ?? 'pending').toLowerCase();
                const canResend = status === 'pending';

                return (
                  <div
                    key={inv.id}
                    className={cn(
                      'flex flex-col gap-2 rounded-lg border border-border bg-background p-3 md:flex-row md:items-center md:justify-between',
                      status === 'accepted' && 'border-primary/20'
                    )}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="truncate font-medium text-foreground">{inv.email}</p>
                        <Badge variant={statusBadgeVariant(inv.status)}>
                          {status}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Role: {formatRole(inv.role)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Sent: {new Date(inv.created_at).toLocaleString()}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={!canResend || sending}
                        onClick={() => void handleResend(inv)}
                        className="bg-background"
                      >
                        <RefreshCcwIcon className="mr-2 h-4 w-4" strokeWidth={1.5} />
                        Resend
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
