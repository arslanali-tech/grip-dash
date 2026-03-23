import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { SendIcon, AlertCircleIcon, CheckCircle2Icon, ClockIcon, MessageSquareIcon, MegaphoneIcon } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import {
  ClientUpdateRow,
  createClientUpdate,
  fetchClientUpdates,
  fetchSupportTickets,
  SupportTicketRow,
} from '@/lib/ownerApi';
import { useAuthStore } from '@/stores/authStore';

interface SupportTicket {
  id: string;
  client: string;
  subject: string;
  status: 'open' | 'in-progress' | 'resolved';
  priority: 'low' | 'medium' | 'high';
  date: string;
}

interface ClientUpdatesViewProps {
  agencyId?: string;
}

export function ClientUpdatesView({ agencyId }: ClientUpdatesViewProps) {
  const [activeTab, setActiveTab] = useState('updates');
  const [updateType, setUpdateType] = useState<'update' | 'message'>('update');
  const [recipients, setRecipients] = useState('all');
  const [subject, setSubject] = useState('');
  const [content, setContent] = useState('');
  const [isSending, setIsSending] = useState(false);

  const [updates, setUpdates] = useState<ClientUpdateRow[]>([]);
  const [loadingUpdates, setLoadingUpdates] = useState(false);

  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const { user } = useAuthStore();

  useEffect(() => {
    const loadUpdates = async () => {
      if (!agencyId) return;
      setLoadingUpdates(true);
      const rows = await fetchClientUpdates(agencyId);
      setUpdates(rows);
      setLoadingUpdates(false);
    };

    void loadUpdates();
  }, [agencyId]);

  useEffect(() => {
    const loadTickets = async () => {
      const rows: SupportTicketRow[] = await fetchSupportTickets(agencyId);
      setTickets(
        rows.map((t) => ({
          id: t.id,
          client: t.client,
          subject: t.subject,
          status: t.status as SupportTicket['status'],
          priority: t.priority as SupportTicket['priority'],
          date: new Date(t.created_at).toISOString().slice(0, 10),
        }))
      );
    };
    void loadTickets();
  }, [agencyId]);

  const handleSendUpdate = async () => {
    if (!agencyId) {
      alert('No agency found for this owner.');
      return;
    }
    if (!subject.trim() || !content.trim()) {
      alert('Please enter subject and content.');
      return;
    }
    setIsSending(true);

    const created = await createClientUpdate(agencyId, {
      type: updateType,
      recipients,
      subject,
      content,
      createdBy: user?.id,
    });

    setIsSending(false);

    if (!created) {
      alert('Could not save update.');
      return;
    }

    setUpdates((prev) => [created, ...prev]);
    setSubject('');
    setContent('');
    alert('Update saved successfully (stored in Supabase).');
  };

  return (
    <div className="space-y-6 relative z-10">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <h1 className="font-heading text-3xl font-semibold text-foreground">
            Client Communication & Support
          </h1>
          <p className="text-muted-foreground">
            Manage platform updates, client messages, and support tickets.
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="w-full overflow-x-auto pb-2 mb-6">
          <TabsList className="bg-transparent text-muted-foreground flex w-max h-auto gap-2 p-0">
            <TabsTrigger 
                value="updates" 
                className="px-4 py-2 text-sm rounded-lg border border-transparent data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:bg-transparent hover:bg-accent hover:text-accent-foreground transition-all font-medium text-muted-foreground"
            >
                Updates & Messages
            </TabsTrigger>
            <TabsTrigger 
                value="support" 
                className="px-4 py-2 text-sm rounded-lg border border-transparent data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:bg-transparent hover:bg-accent hover:text-accent-foreground transition-all font-medium text-muted-foreground"
            >
                Support Tickets
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="updates" className="space-y-6">
          <Card className="bg-card text-card-foreground">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {updateType === 'update' ? <MegaphoneIcon className="h-5 w-5 text-primary" /> : <MessageSquareIcon className="h-5 w-5 text-primary" />}
                Compose {updateType === 'update' ? 'Platform Update' : 'Client Message'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Type</label>
                  <Select value={updateType} onValueChange={setUpdateType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="update">Platform Update</SelectItem>
                      <SelectItem value="message">Direct Message</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Recipients</label>
                  <Select value={recipients} onValueChange={setRecipients}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select recipients" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Clients</SelectItem>
                      <SelectItem value="active">Active Clients Only</SelectItem>
                      <SelectItem value="beta">Beta Testers</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Subject</label>
                <Input
                  placeholder={updateType === 'update' ? "e.g., New Feature Release: Analytics Dashboard" : "e.g., Important Account Notice"}
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Content</label>
                <Textarea
                  placeholder="Type your message here..."
                  className="min-h-[200px]"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                />
              </div>

              <div className="flex justify-end">
                <Button
                  className="bg-primary text-primary-foreground hover:bg-primary/90"
                  onClick={handleSendUpdate}
                  disabled={isSending}
                >
                  <SendIcon className="mr-2 h-4 w-4" />
                  {isSending ? 'Saving...' : `Send ${updateType === 'update' ? 'Update' : 'Message'}`}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card text-card-foreground">
            <CardHeader>
              <CardTitle>Recent Updates</CardTitle>
            </CardHeader>
            <CardContent>
              {!agencyId && <p className="text-sm text-muted-foreground">Loading owner agency…</p>}
              {agencyId && loadingUpdates && <p className="text-sm text-muted-foreground">Loading updates…</p>}

              {agencyId && !loadingUpdates && (
                <div className="rounded-md border border-border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Recipients</TableHead>
                        <TableHead>Subject</TableHead>
                        <TableHead>Content</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {updates.map((u) => (
                        <TableRow key={u.id}>
                          <TableCell className="text-xs text-muted-foreground">
                            {new Date(u.created_at).toLocaleDateString('en-GB')}
                          </TableCell>
                          <TableCell className="font-medium">{u.type}</TableCell>
                          <TableCell>{u.recipients}</TableCell>
                          <TableCell className="max-w-[220px] truncate">{u.subject}</TableCell>
                          <TableCell className="max-w-[260px] truncate text-muted-foreground">
                            {u.content}
                          </TableCell>
                        </TableRow>
                      ))}
                      {updates.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                            No updates yet.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="support" className="space-y-6">
          <Card className="bg-card text-card-foreground">
            <CardHeader>
              <CardTitle>Support Tickets</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border border-border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Client</TableHead>
                      <TableHead>Subject</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tickets.map((ticket) => (
                      <TableRow key={ticket.id}>
                        <TableCell className="font-medium">{ticket.id}</TableCell>
                        <TableCell>{ticket.client}</TableCell>
                        <TableCell>{ticket.subject}</TableCell>
                        <TableCell>
                          <span className={cn(
                            "inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium",
                            ticket.status === 'open' ? "bg-red-100 text-red-700" :
                            ticket.status === 'in-progress' ? "bg-yellow-100 text-yellow-700" :
                            "bg-green-100 text-green-700"
                          )}>
                            {ticket.status === 'open' && <AlertCircleIcon className="h-3 w-3" />}
                            {ticket.status === 'in-progress' && <ClockIcon className="h-3 w-3" />}
                            {ticket.status === 'resolved' && <CheckCircle2Icon className="h-3 w-3" />}
                            {ticket.status.replace('-', ' ')}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className={cn(
                            "inline-flex rounded-full px-2 py-1 text-xs font-medium",
                            ticket.priority === 'high' ? "bg-red-100 text-red-700" :
                            ticket.priority === 'medium' ? "bg-orange-100 text-orange-700" :
                            "bg-blue-100 text-blue-700"
                          )}>
                            {ticket.priority}
                          </span>
                        </TableCell>
                        <TableCell>{ticket.date}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm">View</Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
