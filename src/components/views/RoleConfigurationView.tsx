import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  UserIcon,
  ShieldCheckIcon,
  SettingsIcon,
  SaveIcon,
  UsersIcon,
  Building2Icon,
  BarChart3Icon,
  BriefcaseIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useBusinessConfigStore, UserRole, RoleVisibilityConfig } from '@/stores/businessConfigStore';
import { DASHBOARD_MODULES, DashboardModuleId } from '@/lib/dashboardModules';
import { useToast } from '@/hooks/use-toast';

interface RoleConfigurationViewProps {
  agencyId?: string;
}

const roleIcons: Record<UserRole, React.ElementType> = {
  owner: ShieldCheckIcon,
  branch_manager: UsersIcon,
  negotiator: UserIcon,
  prospector: UserIcon,
  admin: SettingsIcon,
};

const roleColors: Record<UserRole, string> = {
  owner: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  branch_manager: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  negotiator: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  prospector: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  admin: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

export function RoleConfigurationView({ agencyId }: RoleConfigurationViewProps) {
  const { toast } = useToast();
  const {
    roleConfigs,
    updateRoleConfig,
    sectionConfigs,
  } = useBusinessConfigStore();

  const [selectedRole, setSelectedRole] = useState<UserRole>('branch_manager');
  const [hasChanges, setHasChanges] = useState(false);

  const currentConfig = roleConfigs.find(c => c.role === selectedRole);

  const handleModuleToggle = (moduleId: DashboardModuleId, enabled: boolean) => {
    if (!currentConfig) return;

    const updatedModules = enabled
      ? [...new Set([...currentConfig.enabledModules, moduleId])]
      : currentConfig.enabledModules.filter(m => m !== moduleId);

    updateRoleConfig(selectedRole, { enabledModules: updatedModules });
    setHasChanges(true);
  };

  const handleSectionToggle = (sectionKey: string, enabled: boolean) => {
    if (!currentConfig) return;

    const updatedSections = enabled
      ? [...new Set([...currentConfig.enabledSections, sectionKey])]
      : currentConfig.enabledSections.filter(s => s !== sectionKey);

    updateRoleConfig(selectedRole, { enabledSections: updatedSections });
    setHasChanges(true);
  };

  const handlePermissionToggle = (permission: keyof RoleVisibilityConfig, enabled: boolean) => {
    updateRoleConfig(selectedRole, { [permission]: enabled });
    setHasChanges(true);
  };

  const handleSave = () => {
    // In production, this would save to the database
    toast({
      title: 'Configuration Saved',
      description: `Role permissions for ${currentConfig?.label} have been updated.`,
    });
    setHasChanges(false);
  };

  if (!currentConfig) {
    return <div className="p-6 text-muted-foreground">No role configuration found.</div>;
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Role Configuration</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Configure visibility rules and permissions for each user role
          </p>
        </div>
        {hasChanges && (
          <Button onClick={handleSave} className="gap-2">
            <SaveIcon className="h-4 w-4" />
            Save Changes
          </Button>
        )}
      </div>

      {/* Role Selector */}
      <div className="flex flex-wrap gap-2">
        {roleConfigs.map((config) => {
          const Icon = roleIcons[config.role];
          const isSelected = selectedRole === config.role;

          return (
            <button
              key={config.role}
              onClick={() => setSelectedRole(config.role)}
              className={cn(
                'flex items-center gap-2 px-4 py-2.5 rounded-lg border transition-all',
                isSelected
                  ? 'border-primary bg-primary/5 text-primary'
                  : 'border-border bg-card text-muted-foreground hover:bg-accent'
              )}
            >
              <Icon className="h-4 w-4" strokeWidth={1.5} />
              <span className="font-medium">{config.label}</span>
            </button>
          );
        })}
      </div>

      {/* Role Details */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Dashboard Modules Access */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3Icon className="h-5 w-5 text-primary" strokeWidth={1.5} />
              Dashboard Modules
            </CardTitle>
            <CardDescription>
              Select which dashboard modules this role can access
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {DASHBOARD_MODULES.map((module) => {
              const isEnabled = currentConfig.enabledModules.includes(module.id);

              return (
                <label
                  key={module.id}
                  className="flex items-center justify-between p-3 rounded-lg border border-border bg-background hover:bg-accent/50 cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Checkbox
                      checked={isEnabled}
                      onCheckedChange={(checked) => handleModuleToggle(module.id, checked === true)}
                    />
                    <span className="font-medium text-foreground">{module.label}</span>
                  </div>
                  <Badge variant={isEnabled ? 'default' : 'secondary'} className="text-xs">
                    {isEnabled ? 'Enabled' : 'Disabled'}
                  </Badge>
                </label>
              );
            })}
          </CardContent>
        </Card>

        {/* Business Manager Sections */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BriefcaseIcon className="h-5 w-5 text-primary" strokeWidth={1.5} />
              Business Manager Sections
            </CardTitle>
            <CardDescription>
              Select which Business Manager sections this role can access
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {sectionConfigs
              .filter(s => !['role-configuration', 'module-configuration'].includes(s.key))
              .map((section) => {
                const isEnabled = currentConfig.enabledSections.includes(section.key);

                return (
                  <label
                    key={section.id}
                    className="flex items-center justify-between p-3 rounded-lg border border-border bg-background hover:bg-accent/50 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Checkbox
                        checked={isEnabled}
                        onCheckedChange={(checked) => handleSectionToggle(section.key, checked === true)}
                      />
                      <span className="font-medium text-foreground">{section.label}</span>
                    </div>
                    <Badge variant={isEnabled ? 'default' : 'secondary'} className="text-xs">
                      {isEnabled ? 'Enabled' : 'Disabled'}
                    </Badge>
                  </label>
                );
              })}
          </CardContent>
        </Card>

        {/* Permissions */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheckIcon className="h-5 w-5 text-primary" strokeWidth={1.5} />
              Special Permissions
            </CardTitle>
            <CardDescription>
              Configure special permissions and capabilities for this role
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="flex items-center justify-between p-4 rounded-lg border border-border bg-background">
                <div className="space-y-1">
                  <p className="font-medium text-foreground">View Analytics</p>
                  <p className="text-xs text-muted-foreground">Access to business analytics</p>
                </div>
                <Switch
                  checked={currentConfig.canViewAnalytics}
                  onCheckedChange={(checked) => handlePermissionToggle('canViewAnalytics', checked)}
                />
              </div>

              <div className="flex items-center justify-between p-4 rounded-lg border border-border bg-background">
                <div className="space-y-1">
                  <p className="font-medium text-foreground">Manage Staff</p>
                  <p className="text-xs text-muted-foreground">Add, edit, remove staff</p>
                </div>
                <Switch
                  checked={currentConfig.canManageStaff}
                  onCheckedChange={(checked) => handlePermissionToggle('canManageStaff', checked)}
                />
              </div>

              <div className="flex items-center justify-between p-4 rounded-lg border border-border bg-background">
                <div className="space-y-1">
                  <p className="font-medium text-foreground">Manage Branches</p>
                  <p className="text-xs text-muted-foreground">Create and manage branches</p>
                </div>
                <Switch
                  checked={currentConfig.canManageBranches}
                  onCheckedChange={(checked) => handlePermissionToggle('canManageBranches', checked)}
                />
              </div>

              <div className="flex items-center justify-between p-4 rounded-lg border border-border bg-background">
                <div className="space-y-1">
                  <p className="font-medium text-foreground">Business Manager</p>
                  <p className="text-xs text-muted-foreground">Access Business Manager</p>
                </div>
                <Switch
                  checked={currentConfig.canAccessBusinessManager}
                  onCheckedChange={(checked) => handlePermissionToggle('canAccessBusinessManager', checked)}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Role Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Role Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <Badge className={roleColors[selectedRole]}>
                {currentConfig.label}
              </Badge>
            </div>
            <div className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">{currentConfig.enabledModules.length}</span> modules enabled
            </div>
            <div className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">{currentConfig.enabledSections.length}</span> sections enabled
            </div>
            <div className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">
                {[
                  currentConfig.canViewAnalytics,
                  currentConfig.canManageStaff,
                  currentConfig.canManageBranches,
                  currentConfig.canAccessBusinessManager,
                ].filter(Boolean).length}
              </span> special permissions
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
