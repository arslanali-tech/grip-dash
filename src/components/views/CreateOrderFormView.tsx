import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { FileSignatureIcon, CheckCircle2Icon, Loader2Icon, TrashIcon } from 'lucide-react';
import {
  createSignupOrder,
  deleteSignupOrder,
  fetchSignupOrders,
  getOrCreateClientForAgencyByEmail,
  sendMagicLinkToClientIfNeeded,
  sendSignupOrderAgreement,
  SignupOrderRow,
  updateSignupOrder,
} from '@/lib/ownerApi';
import { confirmDialog } from '@/hooks/use-confirm';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface CreateOrderFormViewProps {
  agencyId?: string;
}

const ORDER_STATUSES = ['sent', 'signed', 'canceled'] as const;

type OrderStatus = (typeof ORDER_STATUSES)[number];

export function CreateOrderFormView({ agencyId }: CreateOrderFormViewProps) {
  const [formData, setFormData] = useState({
    agencyName: '',
    contactName: '',
    email: '',
    phone: '',
    address: '',
    plan: '' as string,
    branches: '',
    users: '',
    notes: '',
  });

  const [orders, setOrders] = useState<SignupOrderRow[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [sendStatus, setSendStatus] = useState<'idle' | 'sending' | 'sent' | 'failed'>('idle');
  const [sendError, setSendError] = useState<string | null>(null);
  const [inviteStatus, setInviteStatus] = useState<'idle' | 'sending' | 'sent' | 'skipped' | 'failed'>('idle');
  const [inviteMessage, setInviteMessage] = useState<string | null>(null);
  const [magicLinkCooldownUntil, setMagicLinkCooldownUntil] = useState<number | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!agencyId) return;
      setLoadingOrders(true);
      const rows = await fetchSignupOrders(agencyId);
      setOrders(rows);
      setLoadingOrders(false);
    };
    void load();
  }, [agencyId]);

  const safeBranches = useMemo(() => {
    const n = Number(formData.branches);
    return Number.isFinite(n) ? n : undefined;
  }, [formData.branches]);

  const safeUsers = useMemo(() => {
    const n = Number(formData.users);
    return Number.isFinite(n) ? n : undefined;
  }, [formData.users]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!agencyId) {
      alert('Owner agency is still loading. Please try again in a moment.');
      return;
    }

    if (!formData.plan) {
      alert('Please select a plan.');
      return;
    }
    setIsSubmitting(true);
    setSendStatus('idle');
    setSendError(null);
    setInviteStatus('idle');
    setInviteMessage(null);

    const clientResult = await getOrCreateClientForAgencyByEmail(agencyId, {
      name: formData.agencyName,
      contact_name: formData.contactName,
      email: formData.email,
      phone: formData.phone,
      address: formData.address,
      package: formData.plan,
    });

    if (!clientResult) {
      alert('Could not create or find a client record for this order.');
      setIsSubmitting(false);
      return;
    }

    const { client, created: clientCreated } = clientResult;

    const created = await createSignupOrder(agencyId, {
      agency_name: formData.agencyName,
      contact_name: formData.contactName,
      email: formData.email,
      phone: formData.phone,
      address: formData.address,
      plan: formData.plan,
      branches: safeBranches,
      users: safeUsers,
      notes: formData.notes,
      status: 'sent',
      client_id: client.id,
    });

    if (!created) {
      alert('Could not create signup order. Please check your Supabase schema/RLS policies.');
      setIsSubmitting(false);
      return;
    }

    setOrders((prev) => [created, ...prev]);

    setSendStatus('sending');
    try {
      const envelope = await sendSignupOrderAgreement({
        recipientEmail: formData.email,
        recipientName: formData.contactName,
        emailSubject: `GRIP Service Agreement for ${formData.agencyName}`,
      });

      if (envelope) {
        setSendStatus('sent');
      } else {
        setSendStatus('failed');
        setSendError('Order saved, but sending the DocuSign agreement failed. Please retry later.');
      }
    } catch (err) {
      setSendStatus('failed');
      setSendError((err as Error)?.message ?? 'Unexpected error sending DocuSign envelope.');
    }
    const now = Date.now();
    if (magicLinkCooldownUntil && now < magicLinkCooldownUntil) {
      const secondsLeft = Math.ceil((magicLinkCooldownUntil - now) / 1000);
      setInviteStatus('failed');
      setInviteMessage(
        `Please wait ${secondsLeft} second${secondsLeft === 1 ? '' : 's'} before resending the magic link.`,
      );
    } else {
      setInviteStatus('sending');
      const magicLink = await sendMagicLinkToClientIfNeeded({
        email: formData.email,
        agencyId,
        metadata: {
          contact_name: formData.contactName,
          agency_name: formData.agencyName,
          order_id: created.id,
          client_id: client.id,
        },
        redirectToPath: '/login',
        clientIdOverride: client.id,
        forceSend: clientCreated,
      });

      if (magicLink.sent) {
        setInviteStatus('sent');
      } else if (magicLink.reason === 'client_exists') {
        setInviteStatus('skipped');
        setInviteMessage('Client already exists; login link not re-sent.');
      } else if (magicLink.reason === 'rate_limited') {
        setInviteStatus('failed');
        setInviteMessage('Too many requests. Please wait a minute before resending the magic link.');
      } else {
        setInviteStatus('failed');
        setInviteMessage(magicLink.errorMessage ?? 'Could not send magic login link.');
      }

      // 60 second cooldown to avoid Supabase OTP rate limiting
      setMagicLinkCooldownUntil(Date.now() + 60_000);
    }

    setIsSubmitting(false);
    setIsSuccess(true);
    setIsSuccess(true);
  };

  const handleReset = () => {
    setIsSuccess(false);
    setSendStatus('idle');
    setSendError(null);
    setInviteStatus('idle');
    setInviteMessage(null);
    setFormData({
      agencyName: '',
      contactName: '',
      email: '',
      phone: '',
      address: '',
      plan: '',
      branches: '',
      users: '',
      notes: '',
    });
  };

  const handleUpdateStatus = async (id: string, status: OrderStatus) => {
    const updated = await updateSignupOrder(id, { status });
    if (!updated) {
      alert('Could not update order status.');
      return;
    }
    setOrders((prev) => prev.map((o) => (o.id === id ? updated : o)));
  };

  const handleDelete = async (id: string) => {
    const ok = await confirmDialog('Delete this signup order? This cannot be undone.', {
      title: 'Delete signup order?',
      confirmText: 'Delete',
      variant: 'destructive',
    });
    if (!ok) return;

    await deleteSignupOrder(id);
    setOrders((prev) => prev.filter((o) => o.id !== id));
  };

  return (
    <div className="space-y-6 p-6 md:p-8 relative z-10">
      <div className="space-y-1 mb-6 max-w-4xl mx-auto">
        <h1 className="font-heading text-3xl font-semibold text-foreground flex items-center gap-3">
          <FileSignatureIcon className="h-8 w-8 text-primary" />
          New Client Signup
        </h1>
        <p className="text-muted-foreground">
          Generate a service agreement and send it to the client via DocuSign.
        </p>
      </div>

      <div className="max-w-4xl mx-auto">
        <Card className="bg-card text-card-foreground">
          <CardHeader>
            <CardTitle className="text-foreground">Client & Order Details</CardTitle>
          </CardHeader>
          <CardContent>
            {isSuccess ? (
              <div className="flex flex-col items-center justify-center py-12 text-center space-y-4">
                <div className="h-16 w-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center">
                  <CheckCircle2Icon className="h-8 w-8" />
                </div>
                <h3 className="text-2xl font-bold text-foreground">Order Created</h3>
                <p className="text-muted-foreground max-w-md">
                  Order saved for <strong>{formData.email}</strong>.
                </p>
                {sendStatus === 'sent' && (
                  <p className="text-sm text-green-600">DocuSign agreement sent to the client.</p>
                )}
                {sendStatus === 'failed' && (
                  <p className="text-sm text-destructive max-w-md">
                    {sendError ?? 'Could not send the DocuSign agreement.'}
                  </p>
                )}
                {inviteStatus === 'sent' && (
                  <p className="text-sm text-green-600">Magic login link sent to the client.</p>
                )}
                {inviteStatus === 'skipped' && (
                  <p className="text-sm text-muted-foreground">
                    Client already exists; login link not re-sent.
                  </p>
                )}
                {inviteStatus === 'failed' && (
                  <p className="text-sm text-destructive max-w-md">
                    {inviteMessage ?? 'Could not send the magic login link.'}
                  </p>
                )}
                <Button onClick={handleReset} variant="outline" className="mt-4">
                  Create Another Order
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Agency Information</h3>

                    <div className="space-y-2">
                      <Label htmlFor="agencyName">Agency Name</Label>
                      <Input
                        id="agencyName"
                        placeholder="e.g. Premier Estates"
                        value={formData.agencyName}
                        onChange={(e) => setFormData({ ...formData, agencyName: e.target.value })}
                        required
                        className="bg-background"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="address">Registered Address</Label>
                      <Input
                        id="address"
                        placeholder="Full business address"
                        value={formData.address}
                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                        className="bg-background"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="branches">No. of Branches</Label>
                        <Input
                          id="branches"
                          type="number"
                          placeholder="1"
                          value={formData.branches}
                          onChange={(e) => setFormData({ ...formData, branches: e.target.value })}
                          className="bg-background"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="users">User Licenses</Label>
                        <Input
                          id="users"
                          type="number"
                          placeholder="5"
                          value={formData.users}
                          onChange={(e) => setFormData({ ...formData, users: e.target.value })}
                          className="bg-background"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Primary Contact</h3>

                    <div className="space-y-2">
                      <Label htmlFor="contactName">Contact Name</Label>
                      <Input
                        id="contactName"
                        placeholder="Full name"
                        value={formData.contactName}
                        onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
                        required
                        className="bg-background"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email">Email Address</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="name@agency.com"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        required
                        className="bg-background"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone Number</Label>
                      <Input
                        id="phone"
                        type="tel"
                        placeholder="07700 900000"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        className="bg-background"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-4 pt-4 border-t border-border">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Subscription Plan</h3>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {['Standard', 'Pro', 'Enterprise'].map((plan) => (
                      <div
                        key={plan}
                        className={`cursor-pointer rounded-lg border-2 p-4 transition-all hover:border-primary ${formData.plan === plan ? 'border-primary bg-primary/5' : 'border-border bg-card'}`}
                        onClick={() => setFormData({ ...formData, plan })}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-semibold">{plan}</span>
                          {formData.plan === plan && <CheckCircle2Icon className="h-5 w-5 text-primary" />}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {plan === 'Standard' && 'Essential features for single branch agencies.'}
                          {plan === 'Pro' && 'Advanced analytics and multi-branch support.'}
                          {plan === 'Enterprise' && 'Custom solutions for large networks.'}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Additional Notes</Label>
                  <Textarea
                    id="notes"
                    placeholder="Any special terms or notes..."
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="bg-background min-h-[100px]"
                  />
                </div>

                <div className="flex justify-end pt-4">
                  <Button
                    type="submit"
                    className="bg-[#005CB9] hover:bg-[#00448a] text-white h-12 px-8 text-base font-semibold shadow-md transition-all hover:scale-[1.02]"
                    disabled={isSubmitting || !formData.plan || !agencyId}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2Icon className="mr-2 h-5 w-5 animate-spin" />
                        {sendStatus === 'sending' ? 'Sending DocuSign…' : 'Generating…'}
                      </>
                    ) : (
                      <>
                        <FileSignatureIcon className="mr-2 h-5 w-5" />
                        Generate &amp; Send via DocuSign
                      </>
                    )}
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
