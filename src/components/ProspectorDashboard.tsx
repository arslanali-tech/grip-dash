import { XIcon, SearchIcon, BarChart3Icon, BellIcon, SunIcon, MoonIcon, HomeIcon, MessageSquareIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useProspectorStore, ProspectorViewType } from '@/stores/prospectorStore';
import { useDashboardStore } from '@/stores/dashboardStore';
import { isModuleEnabledWithLegacyFallback, type DashboardModuleId } from '@/lib/dashboardModules';
import { cn } from '@/lib/utils';
import { useMemo, useState, useEffect } from 'react';

// Import Prospector Dashboard Views
import { ProspectingView } from './views/ProspectingView';
import { ProspectingAnalyticsView } from './views/ProspectingAnalyticsView';
import { HouseKeepingView } from './views/HouseKeepingView';
import { TeamChatView } from './views/TeamChatView';
import { ComingSoonView } from './views/ComingSoonView';
import { globalIconColors, AllViewTypes } from '@/lib/globalIconColors';
import { useAuthStore } from '@/stores/authStore';
import { NotificationsPanel } from './NotificationsPanel';
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
  id: ProspectorViewType;
  label: string;
  icon: React.ElementType;
}

const navItemById: Record<ProspectorViewType, NavItem> = {
  prospecting: { id: 'prospecting', label: 'Prospecting', icon: SearchIcon },
  'prospecting-analytics': { id: 'prospecting-analytics', label: 'My Analytics', icon: BarChart3Icon },
  'house-keeping': { id: 'house-keeping', label: 'House Keeping', icon: HomeIcon },
  'team-chat': { id: 'team-chat', label: 'Team Chat', icon: MessageSquareIcon },
};

const viewToModuleId: Partial<Record<ProspectorViewType, DashboardModuleId>> = {
  prospecting: 'prospecting',
  'prospecting-analytics': 'prospecting-analytics',
  'team-chat': 'team-chat',
};

export function ProspectorDashboard() {
  const { currentView, setCurrentView, selectedStaffMember, setSelectedStaffMember } = useProspectorStore();
  const { user, logout } = useAuthStore();
  const { userEnabledModules, agencyId: agencyIdFromStore } = useDashboardStore();

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

  const resolvedConfig = useMemo(
    () => normalizeProspectorDashboardConfig(dashboardConfig),
    [dashboardConfig]
  );

  const orderedNavItems = useMemo(() => {
    const order = resolvedConfig.navItems.length > 0
      ? resolvedConfig.navItems
      : DEFAULT_PROSPECTOR_DASHBOARD_CONFIG.navItems;
    return order.map((id) => navItemById[id]).filter(Boolean);
  }, [resolvedConfig.navItems]);

  const visibleNavItems = useMemo(() => {
    if (userEnabledModules === null) return orderedNavItems;
    return orderedNavItems.filter((item) => {
      const moduleId = viewToModuleId[item.id];
      return moduleId ? isModuleEnabledWithLegacyFallback(userEnabledModules, moduleId) : true;
    });
  }, [orderedNavItems, userEnabledModules]);

  const isImpersonating = !!selectedStaffMember;
  const effectiveStaffMember =
    selectedStaffMember ??
    ({
      id: user?.id ?? 'current-user',
      name: (user?.user_metadata as any)?.name ?? user?.email ?? 'Prospector',
      role: 'Prospector',
      branch: (user?.user_metadata as any)?.branch ?? 'Your Branch',
    } as const);

  const [isDarkMode, setIsDarkMode] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const agencyId =
    (user?.user_metadata as any)?.agency_id ??
    (user?.app_metadata as any)?.agency_id ??
    agencyIdFromStore ??
    null;

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
    document.documentElement.classList.toggle('dark');
  };

  useEffect(() => {
    console.log('ProspectorDashboard: navItems array:', visibleNavItems);
    console.log('ProspectorDashboard: currentView:', currentView);
    if (selectedStaffMember) {
      console.log('ProspectorDashboard: selectedStaffMember:', selectedStaffMember);
    } else {
      console.log('ProspectorDashboard: No staff member selected.');
    }
  }, [visibleNavItems, currentView, selectedStaffMember]);

  useEffect(() => {
    if (visibleNavItems.length === 0) return;
    const isCurrentVisible = visibleNavItems.some((item) => item.id === currentView);
    if (!isCurrentVisible) {
      setCurrentView(visibleNavItems[0].id);
    }
  }, [visibleNavItems, currentView, setCurrentView]);

  const renderView = () => {
    console.log('ProspectorDashboard rendering view:', currentView);
    switch (currentView) {
      case 'prospecting':
        return <ProspectingView />;
      case 'prospecting-analytics':
        return <ProspectingAnalyticsView />;
      case 'house-keeping':
        return <HouseKeepingView visibleItems={resolvedConfig.housekeepingItems} />;
      case 'team-chat':
        return <TeamChatView />;
      default:
        return <ProspectingView />;
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
            aria-label="Prospector navigation"
          >
            {visibleNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentView === item.id;
              console.log('ProspectorDashboard: Rendering nav item:', item.id, 'isActive:', isActive);
              
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
                  <AvatarImage src="https://c.animaapp.com/mjhelv55slzlFZ/img/ai_1.png" alt={effectiveStaffMember.name} />
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
              <DropdownMenuLabel className="text-[11px] text-muted-foreground md:hidden">
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
    </div>
  );
}
