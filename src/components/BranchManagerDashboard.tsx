import { XIcon, LayoutDashboardIcon, TrendingUpIcon, SearchIcon, BarChart3Icon, UsersIcon, Building2Icon, UserCheckIcon, CheckSquareIcon, BellIcon, SunIcon, MoonIcon, SettingsIcon, HomeIcon, CalendarIcon, BriefcaseIcon, MessageSquareIcon, SparklesIcon, PercentIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useBranchManagerStore, BranchManagerViewType } from '@/stores/branchManagerStore';
import { useDashboardStore } from '@/stores/dashboardStore';
import type { DashboardModuleId } from '@/lib/dashboardModules';
import { cn } from '@/lib/utils';
import { useMemo, useState, useEffect } from 'react';
import { MovementsView } from './views/MovementsView';
import { BranchAnalyticsView } from './views/BranchAnalyticsView';
import { HouseKeepingView } from './views/HouseKeepingView';
import { ProspectingView } from './views/ProspectingView'; // Import ProspectingView
import { CalendarView } from './views/CalendarView';
import { BusinessManagerView } from './views/BusinessManagerView';
import { TasksView } from './views/TasksView';
import { TeamChatView } from './views/TeamChatView';
import { GeniusView } from './views/GeniusView';
import { ReferralPropertyView } from './views/ReferralPropertyView';
import { ComingSoonView } from './views/ComingSoonView';
import { CommissionsView } from './views/CommissionsView';
import { globalIconColors, AllViewTypes } from '@/lib/globalIconColors';
import { DailyBriefingDialog } from './DailyBriefingDialog';
import { NotificationsPanel } from './NotificationsPanel';
import { format } from 'date-fns';
import { useAuthStore } from '@/stores/authStore';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  DEFAULT_PROSPECTOR_DASHBOARD_CONFIG,
  fetchProspectorDashboardConfigByEmail,
  fetchProspectorDashboardConfigByStaffId,
  normalizeProspectorDashboardConfig,
} from '@/lib/prospectorDashboardConfig';

interface NavItem {
  id: BranchManagerViewType;
  label: string;
  icon: React.ElementType;
}

const navItems: NavItem[] = [
  { id: 'movements', label: 'Movements', icon: TrendingUpIcon },
  { id: 'genius-calendar', label: 'Diary', icon: CalendarIcon },
  { id: 'prospecting', label: 'Prospecting', icon: SearchIcon },
  { id: 'branch-analytics', label: 'Branch Analytics', icon: BarChart3Icon },
  { id: 'branch-management', label: 'Branch Management', icon: BriefcaseIcon },
  { id: 'buyers-sellers', label: 'Referrals', icon: UserCheckIcon },
  { id: 'tasks', label: 'The Hub', icon: LayoutDashboardIcon },
  { id: 'team-chat', label: 'Team Chat', icon: MessageSquareIcon },
  { id: 'genius', label: 'Genius', icon: SparklesIcon },
  // { id: 'commissions', label: 'Commissions', icon: PercentIcon },
];

const viewToModuleId: Partial<Record<BranchManagerViewType, DashboardModuleId>> = {
  movements: 'movements',
  'genius-calendar': 'genius-calendar',
  prospecting: 'prospecting',
  'branch-analytics': 'business-analytics',
  'branch-management': 'business-manager',
  'buyers-sellers': 'buyers-sellers',
  tasks: 'tasks',
  'team-chat': 'team-chat',
  genius: 'genius',
};

export function BranchManagerDashboard() {
  const { currentView, setCurrentView, selectedStaffMember, setSelectedStaffMember } = useBranchManagerStore();
  const { user, logout } = useAuthStore();
  const { agencyId: agencyIdFromStore, clientId: clientIdFromStore, userEnabledModules } = useDashboardStore();

  const [dashboardConfig, setDashboardConfig] = useState(DEFAULT_PROSPECTOR_DASHBOARD_CONFIG);

  useEffect(() => {
    let cancelled = false;
    const loadConfig = async () => {
      const staffId =
        selectedStaffMember?.id ??
        (user?.user_metadata as any)?.staff_id ??
        (user?.app_metadata as any)?.staff_id ??
        null;
      const config = staffId
        ? await fetchProspectorDashboardConfigByStaffId(staffId)
        : user?.email
          ? await fetchProspectorDashboardConfigByEmail(user.email)
          : null;
      if (!cancelled) {
        setDashboardConfig(config ?? DEFAULT_PROSPECTOR_DASHBOARD_CONFIG);
      }
    };
    void loadConfig();
    return () => {
      cancelled = true;
    };
  }, [selectedStaffMember?.id, user?.email]);

  const resolvedHousekeepingConfig = useMemo(
    () => normalizeProspectorDashboardConfig(dashboardConfig),
    [dashboardConfig]
  );

  const visibleNavItems = useMemo(() => {
    if (userEnabledModules === null) return navItems;
    const enabledSet = new Set(userEnabledModules);
    return navItems.filter((item) => {
      const moduleId = viewToModuleId[item.id];
      return moduleId ? enabledSet.has(moduleId) : true;
    });
  }, [userEnabledModules]);

  // When selectedStaffMember is set, we're in “Owner drill-in / impersonation” mode.
  // Otherwise, use the authenticated user's metadata.
  const isImpersonating = !!selectedStaffMember;
  const effectiveStaffMember =
    selectedStaffMember ??
    ({
      id: user?.id ?? 'current-user',
      name: (user?.user_metadata as any)?.name ?? user?.email ?? 'Branch Manager',
      role: 'Branch Manager',
      branch: (user?.user_metadata as any)?.branch ?? 'Your Branch',
    } as const);

  const [isDarkMode, setIsDarkMode] = useState(false);
  const [showDailyBriefing, setShowDailyBriefing] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  // Show daily briefing on first load
  useEffect(() => {
    const today = format(new Date(), 'yyyy-MM-dd');
    const lastShown = localStorage.getItem('daily-briefing-last-shown');
    
    if (lastShown !== today) {
      setTimeout(() => {
        setShowDailyBriefing(true);
        localStorage.setItem('daily-briefing-last-shown', today);
      }, 500);
    }
  }, []);

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
    document.documentElement.classList.toggle('dark');
  };

  useEffect(() => {
    console.log('BranchManagerDashboard: currentView changed to', currentView);
    console.log('BranchManagerDashboard: navItems array:', navItems);
    if (selectedStaffMember) {
      console.log('BranchManagerDashboard: selectedStaffMember:', selectedStaffMember);
    } else {
      console.log('BranchManagerDashboard: No staff member selected.');
    }
  }, [currentView, selectedStaffMember]);

  // Extract branch manager context from user metadata
  const agencyId =
    (user?.user_metadata as any)?.agency_id ??
    (user?.app_metadata as any)?.agency_id ??
    agencyIdFromStore;
  const clientId =
    (user?.user_metadata as any)?.client_id ??
    (user?.app_metadata as any)?.client_id ??
    clientIdFromStore;
  const branchId = (user?.user_metadata as any)?.branch_id;
  const branchName = (user?.user_metadata as any)?.branch ?? effectiveStaffMember.branch;

  const renderView = () => {
    console.log('BranchManagerDashboard rendering view:', currentView);
    switch (currentView) {
      case 'movements':
        return <MovementsView branchName={branchName} agencyId={agencyId} />;
      case 'genius-calendar':
        return <CalendarView agencyId={agencyId} branchId={branchId} />;
      case 'prospecting':
        return <ProspectingView agencyId={agencyId} branchId={branchId} />;
      case 'branch-analytics':
        return <BranchAnalyticsView agencyId={agencyId} branchId={branchId} branchName={branchName} />;
      case 'branch-management':
        return <BusinessManagerView agencyId={agencyId} branchId={branchId} branchName={branchName} />;
      case 'buyers-sellers':
        return <ReferralPropertyView agencyId={agencyId} branchId={branchId} branchName={branchName} />;
      case 'tasks':
        return <TasksView agencyId={agencyId} userId={user?.id} />;
      case 'team-chat':
        return <TeamChatView agencyId={agencyId} branchId={branchId} />;
      case 'genius':
        return <GeniusView />;
      case 'commissions':
        return <CommissionsView agencyId={agencyId} />;
      case 'house-keeping':
        return <HouseKeepingView agencyId={agencyId} visibleItems={resolvedHousekeepingConfig.housekeepingItems} />;
      case 'staff':
      case 'branches':
        return <ComingSoonView view={currentView as any} />;
      default:
        return <MovementsView branchName={branchName} agencyId={agencyId} />;
    }
  };

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden bg-background">
      {/* Top Bar */}
      <header className="flex h-16 items-center justify-between border-b border-border bg-card px-6 shrink-0">
        <div className="flex flex-1 items-center gap-8">
          <div className="flex items-center gap-4">
            {isImpersonating && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSelectedStaffMember(null)}
                className="bg-transparent text-foreground hover:bg-accent hover:text-accent-foreground"
                aria-label="Exit drill-in"
                title="Exit drill-in"
              >
                <XIcon className="h-5 w-5" strokeWidth={1.5} />
              </Button>
            )}
            <h1 className="font-heading text-[1.75rem] font-semibold text-foreground">
              GRIP
            </h1>
          </div>

          {/* Navigation */}
          <nav
            className="hidden min-w-0 max-w-full items-center gap-1 overflow-x-auto whitespace-nowrap scrollbar-hide lg:flex"
            role="navigation"
            aria-label="Branch Manager navigation"
          >
            {visibleNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentView === item.id;
              console.log('BranchManagerDashboard: Rendering nav item:', item.id, 'isActive:', isActive);
              
              return (
                <button
                  key={item.id}
                  onClick={() => setCurrentView(item.id)}
                  className={cn(
                    'flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200',
                    'hover:bg-accent hover:text-accent-foreground',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground'
                  )}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <Icon className={cn("h-4 w-4", isActive ? 'text-primary-foreground' : globalIconColors[item.id as AllViewTypes])} strokeWidth={1.5} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <Popover open={notificationsOpen} onOpenChange={setNotificationsOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="bg-transparent text-foreground hover:bg-accent hover:text-accent-foreground"
                aria-label="Notifications"
              >
                <BellIcon className="h-5 w-5" strokeWidth={1.5} />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[340px] p-0 bg-popover text-popover-foreground" align="end" sideOffset={8}>
              <NotificationsPanel open={notificationsOpen} agencyId={agencyId} className="p-4" />
            </PopoverContent>
          </Popover>

          <Button
            variant="ghost"
            size="icon"
            onClick={toggleDarkMode}
            className="bg-transparent text-foreground hover:bg-accent hover:text-accent-foreground"
            aria-label="Toggle dark mode"
          >
            {isDarkMode ? (
              <SunIcon className="h-5 w-5" strokeWidth={1.5} />
            ) : (
              <MoonIcon className="h-5 w-5" strokeWidth={1.5} />
            )}
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label="Account menu">
                <Avatar className="h-10 w-10">
                  <AvatarImage
                    src="https://c.animaapp.com/mjhelv55slzlFZ/img/ai_1.png"
                    alt={effectiveStaffMember.name}
                  />
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    {effectiveStaffMember.name
                      .split(' ')
                      .filter(Boolean)
                      .map((n) => n[0])
                      .join('')}
                  </AvatarFallback>
                </Avatar>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-popover text-popover-foreground w-56 lg:w-64">
              <DropdownMenuLabel className="text-xs text-muted-foreground truncate max-w-[200px]">
                {effectiveStaffMember.name}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="text-[11px] text-muted-foreground lg:hidden">
                Navigate
              </DropdownMenuLabel>
              {visibleNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentView === item.id;
                return (
                  <DropdownMenuItem
                    key={item.id}
                    className={cn(
                      'flex items-center gap-2 cursor-pointer',
                      isActive && 'text-primary bg-primary/10'
                    )}
                    onClick={() => {
                      setCurrentView(item.id);
                    }}
                  >
                    <Icon className={cn('h-4 w-4', isActive ? 'text-primary' : globalIconColors[item.id as AllViewTypes])} strokeWidth={1.5} />
                    <span>{item.label}</span>
                  </DropdownMenuItem>
                );
              })}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive hover:bg-destructive/10 hover:text-destructive cursor-pointer"
                onClick={async () => {
                  await logout();
                }}
              >
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        {renderView()}
      </main>

      {/* Daily Briefing Dialog */}
      <DailyBriefingDialog
        open={showDailyBriefing}
        onOpenChange={setShowDailyBriefing}
        userBranch={effectiveStaffMember.branch || 'Your Branch'}
        agencyId={agencyId}
      />
    </div>
  );
}
