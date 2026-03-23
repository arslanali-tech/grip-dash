import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CreditCardIcon, CheckCircle2Icon, PlusIcon, ExternalLinkIcon, TrashIcon, PencilIcon } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  createSubscription,
  deleteSubscription,
  fetchClientsForAgency,
  fetchSubscriptions,
  SubscriptionRow,
  updateSubscription,
} from '@/lib/ownerApi';
import { confirmDialog } from '@/hooks/use-confirm';

interface BillingViewProps {
  agencyId?: string;
}

type SubscriptionStatus = 'active' | 'past_due' | 'canceled';

export function BillingView({ agencyId }: BillingViewProps) {
  const [subscriptions, setSubscriptions] = useState<SubscriptionRow[]>([]);
  const [loading, setLoading] = useState(false);

  const [clients, setClients] = useState<{ id: string; name: string }[]>([]);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<SubscriptionRow | null>(null);
  const [form, setForm] = useState({
    client_id: '' as string,
    plan: 'Standard',
    amount: '100',
    currency: 'GBP',
    status: 'active' as SubscriptionStatus,
    next_billing_date: '' as string,
  });

  const clientNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of clients) map.set(c.id, c.name);
    return map;
  }, [clients]);

  const formatMoney = (amount: number, currency?: string | null) => {
    const ccy = (currency ?? 'GBP').toUpperCase();
    const symbol = ccy === 'GBP' ? '£' : ccy === 'USD' ? '$' : '';
    return `${symbol}${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const handleConnectGoCardless = () => {
    window.open('https://gocardless.com/', '_blank');
  };

  useEffect(() => {
    const load = async () => {
      if (!agencyId) return;
      setLoading(true);
      const [subs, clientRows] = await Promise.all([
        fetchSubscriptions(agencyId),
        fetchClientsForAgency(agencyId),
      ]);
      setSubscriptions(subs);
      setClients(clientRows.map((c) => ({ id: c.id, name: c.name })));
      setLoading(false);
    };

    void load();
  }, [agencyId]);

  const openCreate = () => {
    setEditing(null);
    setForm({
      client_id: '',
      plan: 'Standard',
      amount: '100',
      currency: 'GBP',
      status: 'active',
      next_billing_date: '',
    });
    setDialogOpen(true);
  };

  const openEdit = (row: SubscriptionRow) => {
    setEditing(row);
    setForm({
      client_id: row.client_id ?? '',
      plan: row.plan,
      amount: String(row.amount),
      currency: row.currency ?? 'GBP',
      status: (row.status as SubscriptionStatus) ?? 'active',
      next_billing_date: row.next_billing_date ?? '',
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!agencyId) {
      alert('Owner agency is still loading. Please try again in a moment.');
      return;
    }

    if (!form.client_id.trim()) {
      alert('Please select a client.');
      return;
    }

    if (!form.plan.trim()) {
      alert('Please enter a subscription plan.');
      return;
    }

    const amount = Number(form.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      alert('Please enter a valid amount.');
      return;
    }

    if (editing) {
      const saved = await updateSubscription(editing.id, {
        client_id: form.client_id,
        plan: form.plan.trim(),
        amount,
        currency: form.currency,
        status: form.status,
        next_billing_date: form.next_billing_date || null,
      });

      if (!saved) {
        alert('Could not update subscription.');
        return;
      }

      setSubscriptions((prev) => prev.map((s) => (s.id === saved.id ? saved : s)));
      setDialogOpen(false);
      return;
    }

    const created = await createSubscription(agencyId, {
      client_id: form.client_id,
      plan: form.plan.trim(),
      amount,
      currency: form.currency,
      status: form.status,
      next_billing_date: form.next_billing_date || null,
    });

    if (!created) {
      alert('Could not create subscription.');
      return;
    }

    setSubscriptions((prev) => [created, ...prev]);
    setDialogOpen(false);
  };

  const handleDelete = async (id: string) => {
    const ok = await confirmDialog('Delete this subscription? This cannot be undone.', {
      title: 'Delete subscription?',
      confirmText: 'Delete',
      variant: 'destructive',
    });
    if (!ok) return;

    await deleteSubscription(id);
    setSubscriptions((prev) => prev.filter((s) => s.id !== id));
  };

  const badgeClass = (status: string) => {
    if (status === 'active') return 'bg-green-100 text-green-800';
    if (status === 'past_due') return 'bg-red-100 text-red-800';
    if (status === 'canceled') return 'bg-gray-100 text-gray-700';
    return 'bg-muted text-muted-foreground';
  };

  return (
    <div className="space-y-6 p-6 md:p-8 relative z-10">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <h1 className="font-heading text-3xl font-semibold text-foreground">Billing & Subscriptions</h1>
          <p className="text-muted-foreground">Manage client subscriptions and payments.</p>
        </div>
        <Button className="w-full bg-[#00B4E2] hover:bg-[#009bc2] text-white md:w-auto" onClick={handleConnectGoCardless}>
          <ExternalLinkIcon className="mr-2 h-4 w-4" />
          Go to GoCardless Dashboard
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="bg-card text-card-foreground">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCardIcon className="h-5 w-5 text-primary" />
              Payment Gateway
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between p-4 border border-border rounded-lg bg-muted/20">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 bg-white rounded-full flex items-center justify-center shadow-sm">
                  <svg viewBox="0 0 24 24" className="h-6 w-6 text-[#00B4E2]" fill="currentColor">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
                  </svg>
                </div>
                <div>
                  <p className="font-semibold text-foreground">GoCardless</p>
                  <p className="text-xs text-muted-foreground">Direct Debit Payments</p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-success text-sm font-medium">
                <CheckCircle2Icon className="h-4 w-4" />
                Connected
              </div>
            </div>
            <div className="mt-4">
              <Button variant="outline" className="w-full" onClick={handleConnectGoCardless}>
                Manage GoCardless Settings
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card text-card-foreground">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button className="w-full justify-start" variant="outline" onClick={openCreate} disabled={!agencyId}>
              <PlusIcon className="mr-2 h-4 w-4" />
              Create Subscription
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-card text-card-foreground">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Client Subscriptions</CardTitle>
          <Button onClick={openCreate} className="bg-primary text-primary-foreground" disabled={!agencyId}>
            <PlusIcon className="mr-2 h-4 w-4" /> New
          </Button>
        </CardHeader>
        <CardContent>
          {!agencyId && <p className="text-sm text-muted-foreground">Loading owner agency…</p>}
          {agencyId && loading && <p className="text-sm text-muted-foreground">Loading subscriptions…</p>}

          {agencyId && !loading && (
            <div className="rounded-md border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Client</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Next Billing</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {subscriptions.map((sub) => (
                    <TableRow key={sub.id}>
                      <TableCell className="font-medium">
                        {sub.client_id ? clientNameById.get(sub.client_id) ?? sub.client_id : '—'}
                      </TableCell>
                      <TableCell>{sub.plan}</TableCell>
                      <TableCell>{formatMoney(Number(sub.amount), sub.currency)}</TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${badgeClass(sub.status)}`}>
                          {sub.status}
                        </span>
                      </TableCell>
                      <TableCell>{sub.next_billing_date ?? '—'}</TableCell>
                      <TableCell className="text-right">
                        <div className="inline-flex items-center gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openEdit(sub)} title="Edit">
                            <PencilIcon className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:bg-destructive/10"
                            onClick={() => handleDelete(sub.id)}
                            title="Delete"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}

                  {subscriptions.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        No subscriptions found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit subscription' : 'Create subscription'}</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label>Client *</Label>
              <Select value={form.client_id} onValueChange={(v) => setForm((p) => ({ ...p, client_id: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a client" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label>Plan *</Label>
              <Input
                value={form.plan}
                placeholder="e.g. Standard"
                onChange={(e) => setForm((p) => ({ ...p, plan: e.target.value }))}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label>Amount</Label>
                <Input type="number" value={form.amount} onChange={(e) => setForm((p) => ({ ...p, amount: e.target.value }))} />
              </div>
              <div className="grid gap-2">
                <Label>Currency</Label>
                <Input value={form.currency} onChange={(e) => setForm((p) => ({ ...p, currency: e.target.value }))} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm((p) => ({ ...p, status: v as SubscriptionStatus }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">active</SelectItem>
                    <SelectItem value="past_due">past_due</SelectItem>
                    <SelectItem value="canceled">canceled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Next billing date</Label>
                <Input
                  type="date"
                  value={form.next_billing_date}
                  onChange={(e) => setForm((p) => ({ ...p, next_billing_date: e.target.value }))}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              className="bg-primary text-primary-foreground"
              onClick={handleSave}
              disabled={
                !agencyId ||
                !form.client_id.trim() ||
                !form.plan.trim() ||
                !Number.isFinite(Number(form.amount)) ||
                Number(form.amount) <= 0
              }
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
