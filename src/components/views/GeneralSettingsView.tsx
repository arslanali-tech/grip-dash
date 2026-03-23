import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { PaletteIcon, BellIcon, LayoutDashboardIcon, CalendarIcon, DollarSignIcon, RowsIcon, LanguagesIcon, SunIcon, MoonIcon, TagIcon, EditIcon, EyeIcon, EyeOffIcon, CarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export function GeneralSettingsView() {
  const [theme, setTheme] = useState('system');
  const [defaultDashboard, setDefaultDashboard] = useState('overview');
  const [defaultMovementTab, setDefaultMovementTab] = useState('all');
  const [branchesName, setBranchesName] = useState('branches');
  const [enableNotifications, setEnableNotifications] = useState(true);
  const [dateFormat, setDateFormat] = useState('dd/mm/yyyy');
  const [currencySymbol, setCurrencySymbol] = useState('£');
  const [tableRowDensity, setTableRowDensity] = useState('default');
  const [autoLoadMore, setAutoLoadMore] = useState(false);
  const [language, setLanguage] = useState('en');
  const [mileageUnit, setMileageUnit] = useState('miles');
  const [autoLogMileage, setAutoLogMileage] = useState(false);
  const [autoAttendAppointments, setAutoAttendAppointments] = useState(false);
  const [customizeStatusOpen, setCustomizeStatusOpen] = useState(false);
  const [customizeStagesOpen, setCustomizeStagesOpen] = useState(false);
  const [customizeToolbarOpen, setCustomizeToolbarOpen] = useState(false);

  const [movementStatuses, setMovementStatuses] = useState([
    { id: 'offer', label: 'Offer', color: '#4169E1', enabled: true },
    { id: 'on-books', label: 'On Books', color: '#FFB800', enabled: true },
    { id: 'sale', label: 'Sale', color: '#FF6347', enabled: true },
    { id: 'let', label: 'Let', color: '#00CED1', enabled: true },
    { id: 'exchanged', label: 'Exchanged', color: '#2E8B57', enabled: true },
    { id: 'completed', label: 'Completed', color: '#9370DB', enabled: true },
    { id: 'valuation', label: 'Valuation', color: '#FF8C69', enabled: true },
    { id: 'withdrawn', label: 'Withdrawn', color: '#DC2626', enabled: true },
    { id: 'abort', label: 'Abort', color: '#6B7280', enabled: false },
    { id: 'back-on', label: 'Back On', color: '#8B5CF6', enabled: false },
  ]);

  const [prospectingStages, setProspectingStages] = useState([
    { id: 'canvassed', label: 'Canvassed', color: '#4169E1', enabled: true },
    { id: 'opportunities', label: 'Opportunities', color: '#3B82F6', enabled: true },
    { id: 'potential-seller', label: 'Potential Seller', color: '#FFB800', enabled: true },
    { id: 'valuation', label: 'Valuation', color: '#2E8B57', enabled: true },
    { id: 'sold-oa', label: 'Sold OA', color: '#EF4444', enabled: true },
    { id: 'not-available', label: 'Not Available', color: '#6B7280', enabled: false },
  ]);

  const [toolbarItems, setToolbarItems] = useState([
    { id: 'movements', label: 'Movements', enabled: true },
    { id: 'genius-calendar', label: 'Diary', enabled: true },
    { id: 'prospecting', label: 'Prospecting', enabled: true },
    { id: 'business-analytics', label: 'Business Analytics', enabled: true },
    { id: 'business-manager', label: 'Business Manager', enabled: true },
    { id: 'buyers-sellers', label: 'Referrals', enabled: true },
    { id: 'tasks', label: 'The Hub', enabled: true },
    { id: 'team-chat', label: 'Team Chat', enabled: true },
    { id: 'genius', label: 'Genius', enabled: true },
  ]);

  const handleThemeChange = (newTheme: string) => {
    setTheme(newTheme);
    if (newTheme === 'system') {
      if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    } else if (newTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  // Mock function for saving settings
  const handleApplySettings = () => {
    console.log('Applying settings:', {
      theme,
      defaultDashboard,
      defaultMovementTab,
      branchesName,
      enableNotifications,
      dateFormat,
      currencySymbol,
      tableRowDensity,
      autoLoadMore,
      language,
      mileageUnit,
      autoLogMileage,
      autoAttendAppointments,
    });
    alert('Settings applied! (Check console for details)');
    // In a real app, you would dispatch these settings to a global store or API
  };

  const handleSaveMovementStatuses = () => {
    console.log('Saving movement statuses:', movementStatuses);
    setCustomizeStatusOpen(false);
    // In real app: save to backend/store
  };

  const handleSaveProspectingStages = () => {
    console.log('Saving prospecting stages:', prospectingStages);
    setCustomizeStagesOpen(false);
    // In real app: save to backend/store
  };

  const handleSaveToolbarItems = () => {
    console.log('Saving toolbar items:', toolbarItems);
    localStorage.setItem('toolbar-items', JSON.stringify(toolbarItems));
    setCustomizeToolbarOpen(false);
    // Trigger toolbar refresh
    window.dispatchEvent(new Event('toolbar-items-updated'));
  };

  return (
    <div className="relative z-10">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Toolbar Customization */}
        <Card className="bg-card text-card-foreground h-full">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-foreground flex items-center gap-2">
              <LayoutDashboardIcon className="h-5 w-5 text-indigo-500" strokeWidth={1.5} />
              Toolbar Items
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-foreground">Customize Toolbar</Label>
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => setCustomizeToolbarOpen(true)}
                className="gap-2"
              >
                <EditIcon className="h-3 w-3" strokeWidth={1.5} />
                Customize
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Choose which items appear in your main navigation toolbar
            </p>
          </CardContent>
        </Card>

          {/* Status & Stage Customization */}
        <Card className="bg-card text-card-foreground h-full">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-foreground flex items-center gap-2">
              <TagIcon className="h-5 w-5 text-indigo-500" strokeWidth={1.5} />
              Status & Stage Labels
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-foreground">Movement Statuses</Label>
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => setCustomizeStatusOpen(true)}
                className="gap-2"
              >
                <EditIcon className="h-3 w-3" strokeWidth={1.5} />
                Customize
              </Button>
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-foreground">Prospecting Stages</Label>
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => setCustomizeStagesOpen(true)}
                className="gap-2"
              >
                <EditIcon className="h-3 w-3" strokeWidth={1.5} />
                Customize
              </Button>
            </div>
          </CardContent>
        </Card>
          {/* Theme Preference */}
        <Card className="bg-card text-card-foreground h-full">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-foreground flex items-center gap-2">
              <PaletteIcon className="h-5 w-5 text-blue-500" strokeWidth={1.5} />
              Theme Preference
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="theme-select" className="text-foreground">App Theme</Label>
              <Select value={theme} onValueChange={handleThemeChange}>
                <SelectTrigger id="theme-select" className="w-[180px] bg-background text-foreground border-border">
                  <SelectValue placeholder="Select theme" />
                </SelectTrigger>
                <SelectContent className="bg-popover text-popover-foreground">
                  <SelectItem value="system">System</SelectItem>
                  <SelectItem value="light">Light</SelectItem>
                  <SelectItem value="dark">Dark</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="accent-color-select" className="text-foreground">Accent Color</Label>
              <Select value="default" onValueChange={() => {}}> {/* Placeholder for actual accent color logic */}
                <SelectTrigger id="accent-color-select" className="w-[180px] bg-background text-foreground border-border">
                  <SelectValue placeholder="Default" />
                </SelectTrigger>
                <SelectContent className="bg-popover text-popover-foreground">
                  <SelectItem value="default">Default (Blue)</SelectItem>
                  <SelectItem value="green">Green</SelectItem>
                  <SelectItem value="purple">Purple</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2 pt-2 border-t border-border">
              <Label htmlFor="login-bg-upload" className="text-foreground">Login Background Image</Label>
              <div className="flex flex-col gap-2">
                <input
                  id="login-bg-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onloadend = () => {
                        const base64String = reader.result as string;
                        localStorage.setItem('login-bg-image', base64String);
                        // Trigger re-render by dispatching event
                        window.dispatchEvent(new Event('login-bg-updated'));
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                />
                <label
                  htmlFor="login-bg-upload"
                  className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-border rounded-lg cursor-pointer bg-muted/30 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <svg className="w-8 h-8 mb-2 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    <p className="text-xs text-muted-foreground">
                      Click to upload or drag and drop
                    </p>
                    <p className="text-xs text-muted-foreground">
                      PNG, JPG, WEBP (max 5MB)
                    </p>
                  </div>
                </label>
                {localStorage.getItem('login-bg-image') && (
                  <div className="flex items-center justify-between p-2 rounded-md bg-background border border-border">
                    <span className="text-xs text-foreground">Custom image uploaded</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        localStorage.removeItem('login-bg-image');
                        window.dispatchEvent(new Event('login-bg-updated'));
                      }}
                      className="h-6 text-xs text-destructive hover:text-destructive"
                    >
                      Remove
                    </Button>
                  </div>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Upload an image to customize the login screen background
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Dashboard Defaults */}
        <Card className="bg-card text-card-foreground h-full">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-foreground flex items-center gap-2">
              <LayoutDashboardIcon className="h-5 w-5 text-purple-500" strokeWidth={1.5} />
              Dashboard Defaults
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="default-dashboard" className="text-foreground">Default Landing View</Label>
              <Select value={defaultDashboard} onValueChange={setDefaultDashboard}>
                <SelectTrigger id="default-dashboard" className="w-[180px] bg-background text-foreground border-border">
                  <SelectValue placeholder="Select view" />
                </SelectTrigger>
                <SelectContent className="bg-popover text-popover-foreground">
                  <SelectItem value="overview">Overview</SelectItem>
                  <SelectItem value="movements">Movements</SelectItem>
                  <SelectItem value="prospecting">Prospecting</SelectItem>
                  <SelectItem value="business-analytics">Business Analytics</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="default-movement-tab" className="text-foreground">Default Movements Tab</Label>
              <Select value={defaultMovementTab} onValueChange={setDefaultMovementTab}>
                <SelectTrigger id="default-movement-tab" className="w-[180px] bg-background text-foreground border-border">
                  <SelectValue placeholder="Select tab" />
                </SelectTrigger>
                <SelectContent className="bg-popover text-popover-foreground">
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="sales">Sales</SelectItem>
                  <SelectItem value="lettings">Lettings</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="branches-name" className="text-foreground">Default Branches Name</Label>
              <Select value={branchesName} onValueChange={setBranchesName}>
                <SelectTrigger id="branches-name" className="w-[180px] bg-background text-foreground border-border">
                  <SelectValue placeholder="Select name" />
                </SelectTrigger>
                <SelectContent className="bg-popover text-popover-foreground">
                  <SelectItem value="branches">Branches</SelectItem>
                  <SelectItem value="offices">Offices</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Notification Preferences */}
        <Card className="bg-card text-card-foreground h-full">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-foreground flex items-center gap-2">
              <BellIcon className="h-5 w-5 text-orange-500" strokeWidth={1.5} />
              Notification Preferences
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="enable-notifications" className="text-foreground">Enable Notifications</Label>
              <Switch
                id="enable-notifications"
                checked={enableNotifications}
                onCheckedChange={setEnableNotifications}
              />
            </div>
            <p className="text-sm text-muted-foreground">
              More granular notification settings will appear here.
            </p>
          </CardContent>
        </Card>

        {/* Data Display Preferences */}
        <Card className="bg-card text-card-foreground h-full">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-foreground flex items-center gap-2">
              <RowsIcon className="h-5 w-5 text-green-500" strokeWidth={1.5} />
              Data Display Preferences
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="date-format" className="text-foreground">Date Format</Label>
              <Select value={dateFormat} onValueChange={setDateFormat}>
                <SelectTrigger id="date-format" className="w-[180px] bg-background text-foreground border-border">
                  <SelectValue placeholder="Select format" />
                </SelectTrigger>
                <SelectContent className="bg-popover text-popover-foreground">
                  <SelectItem value="dd/mm/yyyy">DD/MM/YYYY</SelectItem>
                  <SelectItem value="mm/dd/yyyy">MM/DD/YYYY</SelectItem>
                  <SelectItem value="yyyy-mm-dd">YYYY-MM-DD</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="currency-symbol" className="text-foreground">Currency Symbol</Label>
              <Select value={currencySymbol} onValueChange={setCurrencySymbol}>
                <SelectTrigger id="currency-symbol" className="w-[180px] bg-background text-foreground border-border">
                  <SelectValue placeholder="Select symbol" />
                </SelectTrigger>
                <SelectContent className="bg-popover text-popover-foreground">
                  <SelectItem value="£">£ (GBP)</SelectItem>
                  <SelectItem value="$">$ (USD)</SelectItem>
                  <SelectItem value="€">€ (EUR)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="table-row-density" className="text-foreground">Table Row Density</Label>
              <Select value={tableRowDensity} onValueChange={setTableRowDensity}>
                <SelectTrigger id="table-row-density" className="w-[180px] bg-background text-foreground border-border">
                  <SelectValue placeholder="Select density" />
                </SelectTrigger>
                <SelectContent className="bg-popover text-popover-foreground">
                  <SelectItem value="compact">Compact</SelectItem>
                  <SelectItem value="default">Default</SelectItem>
                  <SelectItem value="comfortable">Comfortable</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="auto-load-more" className="text-foreground">Auto-load More Data</Label>
              <Switch
                id="auto-load-more"
                checked={autoLoadMore}
                onCheckedChange={setAutoLoadMore}
              />
            </div>
          </CardContent>
        </Card>

        {/* Language Settings */}
        <Card className="bg-card text-card-foreground h-full">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-foreground flex items-center gap-2">
              <LanguagesIcon className="h-5 w-5 text-cyan-500" strokeWidth={1.5} />
              Language Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="language-select" className="text-foreground">App Language</Label>
              <Select value={language} onValueChange={setLanguage}>
                <SelectTrigger id="language-select" className="w-[180px] bg-background text-foreground border-border">
                  <SelectValue placeholder="Select language" />
                </SelectTrigger>
                <SelectContent className="bg-popover text-popover-foreground">
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="es">Spanish</SelectItem>
                  <SelectItem value="fr">French</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Mileage & Appointments */}
        <Card className="bg-card text-card-foreground h-full">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-foreground flex items-center gap-2">
              <CarIcon className="h-5 w-5 text-emerald-500" strokeWidth={1.5} />
              Mileage & Appointments
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="mileage-unit" className="text-foreground">Distance Unit</Label>
              <Select value={mileageUnit} onValueChange={setMileageUnit}>
                <SelectTrigger id="mileage-unit" className="w-[180px] bg-background text-foreground border-border">
                  <SelectValue placeholder="Select unit" />
                </SelectTrigger>
                <SelectContent className="bg-popover text-popover-foreground">
                  <SelectItem value="miles">Miles</SelectItem>
                  <SelectItem value="km">Kilometers</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="auto-log-mileage" className="text-foreground">Auto-log Mileage</Label>
                <p className="text-xs text-muted-foreground">Automatically log distance from appointments</p>
              </div>
              <Switch
                id="auto-log-mileage"
                checked={autoLogMileage}
                onCheckedChange={setAutoLogMileage}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="auto-attend" className="text-foreground">Auto-attend Appointments</Label>
                <p className="text-xs text-muted-foreground">Mark diary appointments as attended unless deleted</p>
              </div>
              <Switch
                id="auto-attend"
                checked={autoAttendAppointments}
                onCheckedChange={setAutoAttendAppointments}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end pt-6">
        <Button className="bg-primary text-primary-foreground hover:bg-primary/90" onClick={handleApplySettings}>
          Apply Settings
        </Button>
      </div>

      {/* Movement Statuses Dialog */}
      <Dialog open={customizeStatusOpen} onOpenChange={setCustomizeStatusOpen}>
        <DialogContent className="sm:max-w-[600px] bg-card text-card-foreground max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-foreground text-xl">Customize Movement Statuses</DialogTitle>
            <p className="text-sm text-muted-foreground">Edit status labels and colors</p>
          </DialogHeader>
          <div className="space-y-3 py-4">
            {movementStatuses.map((status, index) => (
              <div key={status.id} className={cn(
                "flex items-center gap-3 p-3 rounded-lg border transition-all",
                status.enabled ? "border-border bg-muted/30" : "border-border bg-muted/10 opacity-50"
              )}>
                <Checkbox
                  checked={status.enabled}
                  onCheckedChange={(checked) => {
                    const updated = [...movementStatuses];
                    updated[index].enabled = !!checked;
                    setMovementStatuses(updated);
                  }}
                  className="shrink-0"
                />
                <input
                  type="color"
                  value={status.color}
                  onChange={(e) => {
                    const updated = [...movementStatuses];
                    updated[index].color = e.target.value;
                    setMovementStatuses(updated);
                  }}
                  className="h-10 w-16 rounded cursor-pointer shrink-0"
                  disabled={!status.enabled}
                />
                <Input
                  value={status.label}
                  onChange={(e) => {
                    const updated = [...movementStatuses];
                    updated[index].label = e.target.value;
                    setMovementStatuses(updated);
                  }}
                  className="flex-1 bg-background"
                  disabled={!status.enabled}
                />
                <div 
                  className="px-4 py-2 rounded-md text-white text-sm font-medium shrink-0"
                  style={{ backgroundColor: status.enabled ? status.color : '#9CA3AF' }}
                >
                  Preview
                </div>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCustomizeStatusOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveMovementStatuses} className="bg-primary text-primary-foreground hover:bg-primary/90">
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Toolbar Items Dialog */}
      <Dialog open={customizeToolbarOpen} onOpenChange={setCustomizeToolbarOpen}>
        <DialogContent className="sm:max-w-[600px] bg-card text-card-foreground max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-foreground text-xl">Customize Toolbar Items</DialogTitle>
            <p className="text-sm text-muted-foreground">Choose which items appear in your main navigation toolbar</p>
          </DialogHeader>
          <div className="space-y-3 py-4">
            {toolbarItems.map((item, index) => (
              <div key={item.id} className={cn(
                "flex items-center gap-3 p-3 rounded-lg border transition-all",
                item.enabled ? "border-border bg-muted/30" : "border-border bg-muted/10 opacity-50"
              )}>
                <Checkbox
                  checked={item.enabled}
                  onCheckedChange={(checked) => {
                    const updated = [...toolbarItems];
                    updated[index].enabled = !!checked;
                    setToolbarItems(updated);
                  }}
                  className="shrink-0"
                />
                <div className="flex-1">
                  <p className="font-medium text-foreground">{item.label}</p>
                  <p className="text-xs text-muted-foreground">
                    {item.id === 'movements' && 'Track property movements and sales pipeline'}
                    {item.id === 'genius-calendar' && 'Manage appointments and schedule'}
                    {item.id === 'prospecting' && 'Generate and track leads'}
                    {item.id === 'business-analytics' && 'View business performance metrics'}
                    {item.id === 'business-manager' && 'Manage P&L, staff, and branches'}
                    {item.id === 'buyers-sellers' && 'Handle property referrals'}
                    {item.id === 'tasks' && 'Document storage and management'}
                    {item.id === 'team-chat' && 'Team communication'}
                    {item.id === 'genius' && 'AI-powered insights and forecasting'}
                  </p>
                </div>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCustomizeToolbarOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveToolbarItems} className="bg-primary text-primary-foreground hover:bg-primary/90">
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Prospecting Stages Dialog */}
      <Dialog open={customizeStagesOpen} onOpenChange={setCustomizeStagesOpen}>
        <DialogContent className="sm:max-w-[600px] bg-card text-card-foreground max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-foreground text-xl">Customize Prospecting Stages</DialogTitle>
            <p className="text-sm text-muted-foreground">Edit stage labels and colors</p>
          </DialogHeader>
          <div className="space-y-3 py-4">
            {prospectingStages.map((stage, index) => (
              <div key={stage.id} className={cn(
                "flex items-center gap-3 p-3 rounded-lg border transition-all",
                stage.enabled ? "border-border bg-muted/30" : "border-border bg-muted/10 opacity-50"
              )}>
                <Checkbox
                  checked={stage.enabled}
                  onCheckedChange={(checked) => {
                    const updated = [...prospectingStages];
                    updated[index].enabled = !!checked;
                    setProspectingStages(updated);
                  }}
                  className="shrink-0"
                />
                <input
                  type="color"
                  value={stage.color}
                  onChange={(e) => {
                    const updated = [...prospectingStages];
                    updated[index].color = e.target.value;
                    setProspectingStages(updated);
                  }}
                  className="h-10 w-16 rounded cursor-pointer shrink-0"
                  disabled={!stage.enabled}
                />
                <Input
                  value={stage.label}
                  onChange={(e) => {
                    const updated = [...prospectingStages];
                    updated[index].label = e.target.value;
                    setProspectingStages(updated);
                  }}
                  className="flex-1 bg-background"
                  disabled={!stage.enabled}
                />
                <div 
                  className="px-4 py-2 rounded-md text-white text-sm font-medium shrink-0"
                  style={{ backgroundColor: stage.enabled ? stage.color : '#9CA3AF' }}
                >
                  Preview
                </div>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCustomizeStagesOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveProspectingStages} className="bg-primary text-primary-foreground hover:bg-primary/90">
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
