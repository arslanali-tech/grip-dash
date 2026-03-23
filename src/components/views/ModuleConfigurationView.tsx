import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  LayoutGridIcon,
  SaveIcon,
  SearchIcon,
  SettingsIcon,
  CheckIcon,
  XIcon,
  GripVerticalIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useBusinessConfigStore, UserRole, ModuleConfig, SectionConfig } from '@/stores/businessConfigStore';
import { DASHBOARD_MODULES, DashboardModuleId } from '@/lib/dashboardModules';
import { useToast } from '@/hooks/use-toast';

interface ModuleConfigurationViewProps {
  agencyId?: string;
}

const allRoles: UserRole[] = ['owner', 'branch_manager', 'negotiator', 'prospector', 'admin'];

const roleLabels: Record<UserRole, string> = {
  owner: 'Owner',
  branch_manager: 'Branch Manager',
  negotiator: 'Negotiator',
  prospector: 'Prospector',
  admin: 'Admin',
};

export function ModuleConfigurationView({ agencyId }: ModuleConfigurationViewProps) {
  const { toast } = useToast();
  const {
    moduleConfigs,
    sectionConfigs,
    updateModuleConfig,
    updateSectionConfig,
    toggleModuleForRole,
    toggleSectionForRole,
  } = useBusinessConfigStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [hasChanges, setHasChanges] = useState(false);
  const [activeTab, setActiveTab] = useState<'modules' | 'sections'>('modules');

  const filteredModules = moduleConfigs.filter(m =>
    m.label.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredSections = sectionConfigs.filter(s =>
    s.label.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleModuleToggle = (moduleId: DashboardModuleId, enabled: boolean) => {
    updateModuleConfig(moduleId, { isEnabled: enabled });
    setHasChanges(true);
  };

  const handleSectionToggle = (sectionId: string, enabled: boolean) => {
    updateSectionConfig(sectionId, { isEnabled: enabled });
    setHasChanges(true);
  };

  const handleModuleRoleToggle = (moduleId: DashboardModuleId, role: UserRole, enabled: boolean) => {
    toggleModuleForRole(moduleId, role, enabled);
    setHasChanges(true);
  };

  const handleSectionRoleToggle = (sectionKey: string, role: UserRole, enabled: boolean) => {
    toggleSectionForRole(sectionKey, role, enabled);
    setHasChanges(true);
  };

  const handleSave = () => {
    // In production, this would save to the database
    toast({
      title: 'Configuration Saved',
      description: 'Module and section configurations have been updated.',
    });
    setHasChanges(false);
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Module & Section Configuration</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Configure which modules and sections are available for each role
          </p>
        </div>
        <div className="flex items-center gap-3">
          {hasChanges && (
            <Button onClick={handleSave} className="gap-2">
              <SaveIcon className="h-4 w-4" />
              Save Changes
            </Button>
          )}
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="flex items-center gap-2 border-b border-border pb-4">
        <button
          onClick={() => setActiveTab('modules')}
          className={cn(
            'px-4 py-2 rounded-lg font-medium transition-colors',
            activeTab === 'modules'
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-muted-foreground hover:bg-accent'
          )}
        >
          Dashboard Modules
        </button>
        <button
          onClick={() => setActiveTab('sections')}
          className={cn(
            'px-4 py-2 rounded-lg font-medium transition-colors',
            activeTab === 'sections'
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-muted-foreground hover:bg-accent'
          )}
        >
          Business Manager Sections
        </button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={`Search ${activeTab}...`}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Modules Configuration */}
      {activeTab === 'modules' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LayoutGridIcon className="h-5 w-5 text-primary" strokeWidth={1.5} />
              Dashboard Modules
            </CardTitle>
            <CardDescription>
              Enable or disable modules and configure role access
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border border-border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="w-[200px]">Module</TableHead>
                    <TableHead className="w-[100px] text-center">Status</TableHead>
                    {allRoles.map(role => (
                      <TableHead key={role} className="text-center w-[100px]">
                        {roleLabels[role]}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredModules.map((module) => (
                    <TableRow key={module.id} className="hover:bg-muted/30">
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <GripVerticalIcon className="h-4 w-4 text-muted-foreground cursor-grab" />
                          {module.label}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Switch
                          checked={module.isEnabled}
                          onCheckedChange={(checked) => handleModuleToggle(module.id, checked)}
                        />
                      </TableCell>
                      {allRoles.map(role => {
                        const isEnabled = module.enabledForRoles.includes(role);
                        return (
                          <TableCell key={role} className="text-center">
                            <Checkbox
                              checked={isEnabled && module.isEnabled}
                              disabled={!module.isEnabled}
                              onCheckedChange={(checked) =>
                                handleModuleRoleToggle(module.id, role, checked === true)
                              }
                            />
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sections Configuration */}
      {activeTab === 'sections' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <SettingsIcon className="h-5 w-5 text-primary" strokeWidth={1.5} />
              Business Manager Sections
            </CardTitle>
            <CardDescription>
              Enable or disable sections and configure role access
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border border-border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="w-[200px]">Section</TableHead>
                    <TableHead className="w-[80px] text-center">Order</TableHead>
                    <TableHead className="w-[100px] text-center">Status</TableHead>
                    {allRoles.map(role => (
                      <TableHead key={role} className="text-center w-[100px]">
                        {roleLabels[role]}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSections.map((section) => (
                    <TableRow key={section.id} className="hover:bg-muted/30">
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <GripVerticalIcon className="h-4 w-4 text-muted-foreground cursor-grab" />
                          {section.label}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className="text-xs">
                          {section.sortOrder}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Switch
                          checked={section.isEnabled}
                          onCheckedChange={(checked) => handleSectionToggle(section.id, checked)}
                        />
                      </TableCell>
                      {allRoles.map(role => {
                        const isEnabled = section.enabledForRoles.includes(role);
                        return (
                          <TableCell key={role} className="text-center">
                            <Checkbox
                              checked={isEnabled && section.isEnabled}
                              disabled={!section.isEnabled}
                              onCheckedChange={(checked) =>
                                handleSectionRoleToggle(section.key, role, checked === true)
                              }
                            />
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Legend */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 rounded border border-primary bg-primary/10 flex items-center justify-center">
                <CheckIcon className="h-3 w-3 text-primary" />
              </div>
              <span className="text-muted-foreground">Enabled for role</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 rounded border border-muted-foreground/30 bg-muted/50" />
              <span className="text-muted-foreground">Disabled for role</span>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={true} className="scale-75" disabled />
              <span className="text-muted-foreground">Module/Section enabled</span>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={false} className="scale-75" disabled />
              <span className="text-muted-foreground">Module/Section disabled</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
