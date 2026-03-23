import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { KeyIcon, MailIcon, ShieldCheckIcon, SearchIcon, PlusIcon, EyeIcon, EyeOffIcon, CopyIcon, TrashIcon, LockIcon } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { AddPasswordDialog } from '../AddPasswordDialog';
import { useAuthStore } from '@/stores/authStore';
import { supabase } from '@/lib/supabaseClient';
import { fetchClientsForAgency, PasswordVaultItemRow, fetchPasswordVaultItems, createPasswordVaultItem, deletePasswordVaultItem } from '@/lib/ownerApi';
import { confirmDialog } from '@/hooks/use-confirm';

interface PasswordsViewProps {
  agencyId?: string;
}

interface VaultItemUI {
  id: string;
  title: string;
  username: string;
  password: string;
  category: string;
  lastUpdated: string;
}

export function PasswordsView({ agencyId }: PasswordsViewProps) {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState('vault');
  const [selectedClient, setSelectedClient] = useState('');
  const [myEmail, setMyEmail] = useState('');
  const [vaultItems, setVaultItems] = useState<VaultItemUI[]>([]);
  const [clients, setClients] = useState<{ id: string; name: string; email: string }[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [addPasswordOpen, setAddPasswordOpen] = useState(false);
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const loadVault = async () => {
      if (!user) return;
      const rows = await fetchPasswordVaultItems(user.id);
      setVaultItems(
        rows.map((row: PasswordVaultItemRow) => ({
          id: row.id,
          title: row.title,
          username: row.username ?? '',
          password: row.secret,
          category: row.category ?? 'General',
          lastUpdated: new Date(row.updated_at || row.created_at).toISOString().slice(0, 10),
        }))
      );
    };
    void loadVault();
  }, [user]);

  useEffect(() => {
    const loadClients = async () => {
      if (!agencyId) return;
      const rows = await fetchClientsForAgency(agencyId);
      setClients(rows.map(r => ({ id: r.id, name: r.name, email: r.email })));
    };
    void loadClients();
  }, [agencyId]);

  const isValidEmail = (value: string | null | undefined) => {
    if (!value) return false;
    const email = value.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleRecoverMyPassword = async () => {
    const email = myEmail.trim();
    if (!isValidEmail(email)) {
      alert('Please enter a valid email address.');
      return;
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + '/reset-password',
    });

    if (error) {
      console.error('Error sending recovery email', error);
      alert('Could not send recovery email. Please try again.');
      return;
    }

    alert(`Password recovery link sent to ${email}`);
    setMyEmail('');
  };

  const handleRecoverClientPassword = async () => {
    if (!selectedClient) {
      alert('Please select a client.');
      return;
    }

    const client = clients.find(c => c.id === selectedClient);
    if (!client) {
      alert('Selected client not found in list.');
      return;
    }

    const email = (client.email ?? '').trim();
    if (!isValidEmail(email)) {
      alert(`This client does not have a valid email address: "${client.email ?? ''}"`);
      return;
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + '/reset-password',
    });

    if (error) {
      console.error('Error sending client recovery email', error);
      alert('Could not send client recovery email. Please try again.');
      return;
    }

    alert(`Password recovery link sent to ${client.name} (${email})`);
    setSelectedClient('');
  };

  const togglePasswordVisibility = (id: string) => {
    setVisiblePasswords(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    // In a real app, show a toast notification here
  };

  const handleDeleteItem = async (id: string) => {
    const ok = await confirmDialog('Are you sure you want to delete this item?', {
      title: 'Delete item?',
      confirmText: 'Delete',
      variant: 'destructive',
    });
    if (!ok) return;
    await deletePasswordVaultItem(id);
    setVaultItems(prev => prev.filter(item => item.id !== id));
  };

  const filteredVaultItems = vaultItems.filter(item => 
    item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 p-6 md:p-8 relative z-10">
      <div className="space-y-1 mb-6">
        <h1 className="font-heading text-3xl font-semibold text-foreground">
          Password Manager
        </h1>
        <p className="text-muted-foreground">
          Securely store and manage access credentials and recovery options.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-[400px] mb-6">
          <TabsTrigger value="vault">Password Vault</TabsTrigger>
          <TabsTrigger value="recovery">Recovery Tools</TabsTrigger>
        </TabsList>

        <TabsContent value="vault" className="space-y-4">
           <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
             <div className="relative w-full sm:w-72">
               <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
               <Input 
                 placeholder="Search vault..." 
                 value={searchQuery}
                 onChange={(e) => setSearchQuery(e.target.value)}
                 className="pl-9 bg-background"
               />
             </div>
             <Button
               onClick={() => setAddPasswordOpen(true)}
               className="w-full bg-primary text-primary-foreground hover:bg-primary/90 sm:w-auto"
             >
               <PlusIcon className="mr-2 h-4 w-4" /> Add Item
             </Button>
           </div>

           <Card className="bg-card text-card-foreground">
             <CardContent className="p-0">
               <Table>
                 <TableHeader>
                   <TableRow className="hover:bg-muted/50">
                     <TableHead>Title</TableHead>
                     <TableHead>Username/ID</TableHead>
                     <TableHead>Password/Code</TableHead>
                     <TableHead>Category</TableHead>
                     <TableHead className="text-right">Actions</TableHead>
                   </TableRow>
                 </TableHeader>
                 <TableBody>
                   {filteredVaultItems.map((item) => (
                     <TableRow key={item.id} className="hover:bg-muted/50">
                       <TableCell className="font-medium flex items-center gap-2">
                         <div className="p-2 rounded-full bg-primary/10 text-primary">
                           <LockIcon className="h-4 w-4" />
                         </div>
                         {item.title}
                       </TableCell>
                       <TableCell>{item.username}</TableCell>
                       <TableCell>
                         <div className="flex items-center gap-2">
                           <span className="font-mono text-sm">
                             {visiblePasswords[item.id] ? item.password : '••••••••'}
                           </span>
                           <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => togglePasswordVisibility(item.id)}>
                             {visiblePasswords[item.id] ? <EyeOffIcon className="h-3 w-3" /> : <EyeIcon className="h-3 w-3" />}
                           </Button>
                         </div>
                       </TableCell>
                       <TableCell>
                         <Badge variant="outline">{item.category}</Badge>
                       </TableCell>
                       <TableCell className="text-right">
                         <div className="flex justify-end gap-1">
                           <Button variant="ghost" size="icon" onClick={() => copyToClipboard(item.password)} title="Copy Password">
                             <CopyIcon className="h-4 w-4" />
                           </Button>
                           <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => handleDeleteItem(item.id)}>
                             <TrashIcon className="h-4 w-4" />
                           </Button>
                         </div>
                       </TableCell>
                     </TableRow>
                   ))}
                   {filteredVaultItems.length === 0 && (
                     <TableRow>
                       <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                         No items found. Add your first secure item.
                       </TableCell>
                     </TableRow>
                   )}
                 </TableBody>
               </Table>
             </CardContent>
           </Card>
        </TabsContent>

        <TabsContent value="recovery">
          <div className="grid gap-6 md:grid-cols-2">
            {/* My Password Recovery */}
            <Card className="bg-card text-card-foreground">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShieldCheckIcon className="h-5 w-5 text-primary" />
                  My Password
                </CardTitle>
                <CardDescription>
                  Forgot your password? Send a recovery link to your email.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="my-email">Email Address</Label>
                  <div className="relative">
                    <MailIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                      id="my-email" 
                      type="email" 
                      placeholder="your@email.com" 
                      className="pl-9 bg-background"
                      value={myEmail}
                      onChange={(e) => setMyEmail(e.target.value)}
                    />
                  </div>
                </div>
                <Button className="w-full bg-primary text-primary-foreground hover:bg-primary/90" onClick={handleRecoverMyPassword}>
                  Send Recovery Link
                </Button>
              </CardContent>
            </Card>

            {/* Client Password Recovery */}
            <Card className="bg-card text-card-foreground">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <KeyIcon className="h-5 w-5 text-primary" />
                  Client Passwords
                </CardTitle>
                <CardDescription>
                  Send a password reset link to a client.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="client-select">Select Client</Label>
                  <Select value={selectedClient} onValueChange={setSelectedClient}>
                    <SelectTrigger id="client-select" className="w-full bg-background border-border">
                      <SelectValue placeholder="Search for a client..." />
                    </SelectTrigger>
                    <SelectContent>
                      {clients.map((client) => (
                        <SelectItem key={client.id} value={client.id}>
                          {client.name} ({client.email})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button variant="outline" className="w-full" onClick={handleRecoverClientPassword}>
                  Send Client Recovery Link
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      <AddPasswordDialog 
        open={addPasswordOpen} 
        onOpenChange={setAddPasswordOpen} 
        onSave={async (newItem) => {
          if (!user) return;
          const created = await createPasswordVaultItem(user.id, {
            title: newItem.title,
            username: newItem.username,
            secret: newItem.password,
            category: newItem.category,
          });
          if (!created) {
            alert('Could not save password item.');
            return;
          }
          setVaultItems(prev => [
            ...prev,
            {
              id: created.id,
              title: created.title,
              username: created.username ?? '',
              password: created.secret,
              category: created.category ?? 'General',
              lastUpdated: new Date(created.updated_at || created.created_at).toISOString().slice(0, 10),
            },
          ]);
        }} 
      />
    </div>
  );
}
