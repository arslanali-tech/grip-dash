import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SettingsIcon, UploadCloudIcon, UsersIcon, TrashIcon, KeyIcon, RotateCcwIcon, LayoutGridIcon, ListIcon } from 'lucide-react';
import { DataUploadView } from './DataUploadView';
import { LeadGenUploadView } from './LeadGenUploadView';
import { APIConnectionsView } from './APIConnectionsView';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { GeneralSettingsView } from './GeneralSettingsView';

export function SettingsView() {
  const [activeSettingsTab, setActiveSettingsTab] = useState('data-upload');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list'); // Default to list view

  const settingsTabs = [
    { id: 'data-upload', label: 'Movements Data Upload', icon: UploadCloudIcon },
    { id: 'lead-gen-upload', label: 'Lead Gen Data Upload', icon: UsersIcon },
    { id: 'api-connections', label: 'API Connections', icon: KeyIcon },
    { id: 'general-settings', label: 'General Settings', icon: SettingsIcon },
    { id: 'user-management', label: 'User Management', icon: UsersIcon },
  ];

  const mockUsers = [
    { id: 'sarah', name: 'Sarah Johnson (Branch Manager)' },
    { id: 'michael', name: 'Michael Brown (Staff)' },
    { id: 'emma', name: 'Emma Wilson (Staff)' },
    { id: 'david', name: 'David Lee (Staff)' },
  ];

  const [deleteUserDialogOpen, setDeleteUserDialogOpen] = useState(false);
  const [changePasswordDialogOpen, setChangePasswordDialogOpen] = useState(false);
  const [recoverPasswordDialogOpen, setRecoverPasswordDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleDeleteUser = () => {
    console.log(`Deleting user: ${selectedUser}`);
    setDeleteUserDialogOpen(false);
    setSelectedUser('');
    // Implement actual deletion logic here
  };

  const handleChangePassword = () => {
    if (newPassword !== confirmPassword) {
      alert('New password and confirm password do not match.');
      return;
    }
    console.log(`Changing password for ${selectedUser} to ${newPassword}`);
    setChangePasswordDialogOpen(false);
    setSelectedUser('');
    setNewPassword('');
    setConfirmPassword('');
    // Implement actual password change logic here
  };

  const handleRecoverPassword = () => {
    console.log(`Recovering password for user: ${selectedUser}`);
    setRecoverPasswordDialogOpen(false);
    setSelectedUser('');
    // Implement actual password recovery logic here (e.g., send reset link)
  };

  const renderSettingsContent = () => {
    switch (activeSettingsTab) {
      case 'data-upload':
        return <DataUploadView />;
      case 'lead-gen-upload':
        return <LeadGenUploadView />;
      case 'api-connections':
        return <APIConnectionsView />;
      case 'general-settings':
        return <GeneralSettingsView />;
      case 'user-management':
        return (
          <Card className="bg-card text-card-foreground w-full md:w-1/2 lg:w-1/3">
            <CardHeader>
              <CardTitle className="text-foreground">User Management</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">Manage user accounts, passwords, and roles.</p>
              
              <div className="space-y-2">
                <Label htmlFor="select-user" className="text-foreground">Select User</Label>
                <Select value={selectedUser} onValueChange={setSelectedUser}>
                  <SelectTrigger id="select-user" className="w-full bg-background text-foreground border-border">
                    <SelectValue placeholder="Select a user" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover text-popover-foreground">
                    {mockUsers.map(user => (
                      <SelectItem key={user.id} value={user.id}>{user.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => setChangePasswordDialogOpen(true)} 
                  disabled={!selectedUser}
                  className="bg-background text-foreground border-border hover:bg-accent hover:text-accent-foreground"
                >
                  <KeyIcon className="mr-2 h-4 w-4" strokeWidth={1.5} />
                  Change Password
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setRecoverPasswordDialogOpen(true)} 
                  disabled={!selectedUser}
                  className="bg-background text-foreground border-border hover:bg-accent hover:text-accent-foreground"
                >
                  <RotateCcwIcon className="mr-2 h-4 w-4" strokeWidth={1.5} />
                  Recover Password
                </Button>
                <Button 
                  variant="destructive" 
                  onClick={() => setDeleteUserDialogOpen(true)} 
                  disabled={!selectedUser}
                  className="hover:bg-destructive/90"
                >
                  <TrashIcon className="mr-2 h-4 w-4" strokeWidth={1.5} />
                  Delete User
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      default:
        return <DataUploadView />;
    }
  };

  return (
    <div className="space-y-6 p-6 md:p-8 relative z-10">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 gap-4">
        <div className="space-y-1">
          <h1 className="font-heading text-3xl font-semibold text-foreground">
            Settings
          </h1>
          <p className="text-muted-foreground">
            Manage your dashboard settings and data.
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            onClick={() => setActiveSettingsTab('api-connections')}
            className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2"
          >
            <KeyIcon className="h-4 w-4" strokeWidth={1.5} />
            Connect API Source
          </Button>
          
          <div className="flex items-center gap-2 bg-muted p-1 rounded-lg">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('grid')}
              className="h-8 px-2"
            >
              <LayoutGridIcon className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
              className="h-8 px-2"
            >
              <ListIcon className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Internal Tabs for Settings */}
      <Tabs value={activeSettingsTab} onValueChange={setActiveSettingsTab} className="w-full">
        <div className={cn("mb-6 w-full overflow-x-auto pb-2", viewMode === 'grid' ? "hidden" : "block")}>
          <TabsList className="bg-transparent text-muted-foreground flex w-max h-auto gap-2 p-0">
            {settingsTabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <TabsTrigger 
                  key={tab.id}
                  value={tab.id} 
                  className={cn(
                    "flex-shrink-0 flex items-center gap-2 px-4 py-2 text-sm rounded-lg border border-transparent transition-all font-medium text-muted-foreground",
                    "data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:bg-transparent",
                    "hover:bg-accent hover:text-accent-foreground"
                  )}
                >
                  <Icon className="h-4 w-4" strokeWidth={1.5} />
                  {tab.label}
                </TabsTrigger>
              );
            })}
          </TabsList>
        </div>

        {viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {settingsTabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <Card 
                  key={tab.id} 
                  className={cn(
                    "cursor-pointer hover:border-primary transition-colors",
                    activeSettingsTab === tab.id ? "border-primary ring-1 ring-primary" : ""
                  )}
                  onClick={() => {
                    setActiveSettingsTab(tab.id);
                    setViewMode('list'); // Switch to list view to show content
                  }}
                >
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      {tab.label}
                    </CardTitle>
                    <Icon className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs text-muted-foreground">Click to manage {tab.label.toLowerCase()}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          renderSettingsContent()
        )}
      </Tabs>

      {/* Delete User Dialog */}
      <Dialog open={deleteUserDialogOpen} onOpenChange={setDeleteUserDialogOpen}>
        <DialogContent className="sm:max-w-[425px] bg-card text-card-foreground">
          <DialogHeader>
            <DialogTitle className="text-foreground">Confirm Deletion</DialogTitle>
          </DialogHeader>
          <div className="py-4 text-muted-foreground">
            Are you sure you want to delete user "{mockUsers.find(u => u.id === selectedUser)?.name}"? This action cannot be undone.
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleteUserDialogOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeleteUser}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Change Password Dialog */}
      <Dialog open={changePasswordDialogOpen} onOpenChange={setChangePasswordDialogOpen}>
        <DialogContent className="sm:max-w-[425px] bg-card text-card-foreground">
          <DialogHeader>
            <DialogTitle className="text-foreground">Change Password for {mockUsers.find(u => u.id === selectedUser)?.name}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="new-password">New Password</Label>
              <Input id="new-password" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="bg-background text-foreground" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm New Password</Label>
              <Input id="confirm-password" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="bg-background text-foreground" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setChangePasswordDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleChangePassword}>Change Password</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Recover Password Dialog */}
      <Dialog open={recoverPasswordDialogOpen} onOpenChange={setRecoverPasswordDialogOpen}>
        <DialogContent className="sm:max-w-[425px] bg-card text-card-foreground">
          <DialogHeader>
            <DialogTitle className="text-foreground">Recover Password for {mockUsers.find(u => u.id === selectedUser)?.name}</DialogTitle>
          </DialogHeader>
          <div className="py-4 text-muted-foreground">
            A password recovery link will be sent to the registered email of "{mockUsers.find(u => u.id === selectedUser)?.name}".
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRecoverPasswordDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleRecoverPassword}>Send Recovery Link</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
