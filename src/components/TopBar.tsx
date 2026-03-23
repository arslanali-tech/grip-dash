import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeftIcon, ChevronRightIcon, ChevronDownIcon, LayoutDashboardIcon, TrendingUpIcon, SearchIcon, BarChart3Icon, UsersIcon, Building2Icon, UserCheckIcon, CheckSquareIcon, SettingsIcon, BellIcon, MenuIcon, SunIcon, MoonIcon, SparklesIcon, MessageSquareIcon, BriefcaseIcon, CalendarIcon, ListChecksIcon, PoundSterlingIcon, BookOpenIcon, HomeIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useDashboardStore, ViewType } from '@/stores/dashboardStore';
import { useBranchManagerStore } from '@/stores/branchManagerStore';
import { useNegotiatorStore } from '@/stores/negotiatorStore';
import { useProspectorStore } from '@/stores/prospectorStore';
import { LiveDateTime } from './LiveDateTime';
import { cn } from '@/lib/utils';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { globalIconColors, AllViewTypes } from '@/lib/globalIconColors';
import { LogOutIcon, NotebookPenIcon } from 'lucide-react';
import { TutorialOverlay } from './TutorialOverlay';
import { NotificationActionDialog } from './NotificationActionDialog';
import { ThinkPadDialog } from './ThinkPadDialog';
import { NotificationsPanel } from './NotificationsPanel';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useAuthStore } from '@/stores/authStore';
import { useOwnerStore } from '@/stores/ownerStore';
import { getUserRole } from '@/lib/ownerAccess';
import { useBusinessConfigStore, UserRole } from '@/stores/businessConfigStore';
import { DashboardModuleId, isModuleEnabledWithLegacyFallback } from '@/lib/dashboardModules';
import { confirmDialog } from '@/hooks/use-confirm';
import { supabase } from '@/lib/supabaseClient';
import { fetchChannelUnreadCounts, fetchDirectMessageConversations, fetchTeamChannels } from '@/lib/teamChatApi';
import { isManagerLikeRole } from '@/lib/staffRoles';

interface NavItem {
  id: ViewType;
  label: string;
  icon: React.ElementType;
}

const baseNavItems: NavItem[] = [
  { id: 'movements', label: 'Movements', icon: TrendingUpIcon },
  { id: 'genius-calendar', label: 'Diary', icon: CalendarIcon },
  { id: 'prospecting', label: 'Prospecting', icon: SearchIcon },
  { id: 'business-analytics', label: 'Business Analytics', icon: BarChart3Icon },
  { id: 'business-manager', label: 'Business Manager', icon: BriefcaseIcon },
  { id: 'buyers-sellers', label: 'Referrals', icon: UserCheckIcon },
  { id: 'tasks', label: 'The Hub', icon: LayoutDashboardIcon }, // Document storage & management
  { id: 'team-chat', label: 'Team Chat', icon: MessageSquareIcon },
  { id: 'genius', label: 'Genius', icon: SparklesIcon },
];

const negotiatorNavItems: NavItem[] = [
  ...baseNavItems.filter((item) => item.id !== 'business-manager'),
  { id: 'my-analytics', label: 'My Analytics', icon: BarChart3Icon },
  { id: 'house-keeping', label: 'Housekeeping', icon: HomeIcon },
];

const prospectorNavItems: NavItem[] = [
  { id: 'prospecting', label: 'Prospecting', icon: SearchIcon },
  { id: 'prospecting-analytics', label: 'My Analytics', icon: BarChart3Icon },
  { id: 'house-keeping', label: 'Housekeeping', icon: HomeIcon },
];

const navItemToModuleId: Partial<Record<ViewType, DashboardModuleId>> = {
  'movements': 'movements',
  'genius-calendar': 'genius-calendar',
  'prospecting': 'prospecting',
  'business-analytics': 'business-analytics',
  'my-analytics': 'my-analytics',
  'prospecting-analytics': 'prospecting-analytics',
  'business-manager': 'business-manager',
  'buyers-sellers': 'buyers-sellers',
  'tasks': 'tasks',
  'team-chat': 'team-chat',
  'genius': 'genius',
};

export function TopBar() {
  const { currentView, setCurrentView, userEnabledModules, staffMembers, agencyId, clientId, clientScopeIds, franchiseClients, setClientId } = useDashboardStore();
  const { setSelectedStaffMember: setSelectedBranchManager } = useBranchManagerStore();
  const { setSelectedStaffMember: setSelectedNegotiator } = useNegotiatorStore();
  const { setSelectedStaffMember: setSelectedProspector } = useProspectorStore();
  const { logout, user } = useAuthStore();

  // Derive first staff by role for dashboard switching (database-backed)
  const staffForSwitcher = useMemo(() => {
    const r = (s: string) => (s ?? '').toLowerCase();
    const branchManager = staffMembers.find(s => isManagerLikeRole(s.role) || r(s.role).includes('branch'));
    const negotiator = staffMembers.find(s => r(s.role).includes('negotiator'));
    const prospector = staffMembers.find(s => r(s.role).includes('prospector') || r(s.role).includes('sales') || r(s.role).includes('agent'));
    return {
      branchManager: branchManager ? { id: branchManager.id, name: branchManager.name, role: branchManager.role, branch: branchManager.branch } : null,
      negotiator: negotiator ? { id: negotiator.id, name: negotiator.name, role: negotiator.role, branch: negotiator.branch } : null,
      prospector: prospector ? { id: prospector.id, name: prospector.name, role: prospector.role, branch: prospector.branch } : null,
    };
  }, [staffMembers]);
  const displayName = (user?.user_metadata as any)?.full_name ?? (user?.user_metadata as any)?.name ?? user?.email?.split('@')[0] ?? 'User';
  const { isOpen: isOwnerDashboardOpen, setIsOpen: setOwnerIsOpen } = useOwnerStore();
  const { roleConfigs } = useBusinessConfigStore();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [tutorialOpen, setTutorialOpen] = useState(false);
  const [thinkPadOpen, setThinkPadOpen] = useState(false);
  const [notificationActionOpen, setNotificationActionOpen] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState<any>(null);
  const [visibleNavItems, setVisibleNavItems] = useState(baseNavItems);
  const [unreadChatMessages, setUnreadChatMessages] = useState(0);
  const navScrollRef = useRef<HTMLElement | null>(null);
  const [canScrollNavLeft, setCanScrollNavLeft] = useState(false);
  const [canScrollNavRight, setCanScrollNavRight] = useState(false);

  // Get user role for filtering
  const userRole = useMemo(() => {
    const role = getUserRole(user);
    const normalized = (role ?? '').trim().toLowerCase() as UserRole;
    return normalized || 'negotiator';
  }, [user]);

  const navItemsForRole = useMemo(() => {
    if (userRole === 'prospector') return prospectorNavItems;
    if (userRole === 'negotiator') return negotiatorNavItems;
    return baseNavItems;
  }, [userRole]);

  const channelLastSeenStorageKey = useMemo(
    () => `team-chat-last-seen-channels:${user?.id ?? 'anonymous'}:${agencyId ?? 'no-agency'}:${(clientScopeIds && clientScopeIds.length > 0 ? clientScopeIds.join(',') : clientId) ?? 'all'}`,
    [user?.id, agencyId, clientId, clientScopeIds]
  );

  const effectiveClientScope = clientScopeIds && clientScopeIds.length > 0 ? clientScopeIds : (clientId ?? undefined);

  const activeFranchiseClient = useMemo(
    () => franchiseClients.find((client) => client.id === clientId) ?? franchiseClients[0] ?? null,
    [clientId, franchiseClients]
  );

  // Load toolbar customization from localStorage and apply role-based filtering
  useEffect(() => {
    const loadToolbarItems = () => {
      // First, get localStorage config
      const saved = localStorage.getItem('toolbar-items');
      let localStorageConfig: { id: string; enabled: boolean }[] | null = null;
      
      if (saved) {
        try {
          localStorageConfig = JSON.parse(saved);
        } catch (e) {
          console.error('Failed to load toolbar items:', e);
        }
      }

      // Filter nav items based on user-specific DB config, role permissions, and localStorage
      const filtered = navItemsForRole.filter(item => {
        // First check user-specific enabled modules from database (if available)
        const moduleId = navItemToModuleId[item.id];

        if (moduleId && userEnabledModules !== null) {
          // User has specific module configuration from DB - use it
          if (!isModuleEnabledWithLegacyFallback(userEnabledModules, moduleId)) {
            return false;
          }
        } else if (moduleId) {
          // Fall back to role-based permissions if no user-specific config
          const roleConfig = roleConfigs.find(rc => rc.role === userRole);
          if (roleConfig && !roleConfig.enabledModules.includes(moduleId)) {
            return false;
          }
        }

        // Then check localStorage config (for toolbar customization)
        if (localStorageConfig) {
          const config = localStorageConfig.find((c) => c.id === item.id);
          if (config && !config.enabled) {
            return false;
          }
        }

        return true;
      });

      setVisibleNavItems(filtered);
    };

    loadToolbarItems();

    // Listen for toolbar updates
    window.addEventListener('toolbar-items-updated', loadToolbarItems);
    return () => window.removeEventListener('toolbar-items-updated', loadToolbarItems);
  }, [userRole, roleConfigs, navItemsForRole, userEnabledModules]);

  const updateNavScrollState = useCallback(() => {
    const nav = navScrollRef.current;
    if (!nav) {
      setCanScrollNavLeft(false);
      setCanScrollNavRight(false);
      return;
    }

    const left = nav.scrollLeft;
    const maxLeft = Math.max(0, nav.scrollWidth - nav.clientWidth);
    setCanScrollNavLeft(left > 2);
    setCanScrollNavRight(maxLeft - left > 2);
  }, []);

  useEffect(() => {
    const nav = navScrollRef.current;
    if (!nav) return;

    updateNavScrollState();

    const onScroll = () => updateNavScrollState();
    const onResize = () => updateNavScrollState();

    nav.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize);

    return () => {
      nav.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onResize);
    };
  }, [visibleNavItems, updateNavScrollState]);

  const scrollNavBy = (delta: number) => {
    const nav = navScrollRef.current;
    if (!nav) return;
    nav.scrollBy({ left: delta, behavior: 'smooth' });
  };

  const refreshUnreadChatCount = useCallback(async () => {
    if (!agencyId || !user?.id) {
      setUnreadChatMessages(0);
      return;
    }

    let lastSeenByChannel: Record<string, string> = {};
    try {
      const raw = localStorage.getItem(channelLastSeenStorageKey);
      if (raw) {
        const parsed = JSON.parse(raw) as Record<string, unknown>;
        if (parsed && typeof parsed === 'object') {
          Object.entries(parsed).forEach(([channelId, seenAt]) => {
            if (typeof seenAt === 'string') {
              lastSeenByChannel[channelId] = seenAt;
            }
          });
        }
      }
    } catch {
      lastSeenByChannel = {};
    }

    const channels = await fetchTeamChannels(agencyId, undefined, effectiveClientScope);
    const unreadByChannel = await fetchChannelUnreadCounts(
      agencyId,
      user.id,
      channels.map((channel) => channel.id),
      lastSeenByChannel,
      effectiveClientScope
    );
    const unreadChannelTotal = Object.values(unreadByChannel).reduce((sum, count) => sum + count, 0);

    const dmConversations = await fetchDirectMessageConversations(
      agencyId,
      user.id,
      effectiveClientScope
    );
    const unreadDmTotal = dmConversations.reduce(
      (sum, conversation) => sum + (conversation.unreadCount || 0),
      0
    );

    setUnreadChatMessages(unreadChannelTotal + unreadDmTotal);
  }, [agencyId, channelLastSeenStorageKey, effectiveClientScope, user?.id]);

  useEffect(() => {
    void refreshUnreadChatCount();
  }, [refreshUnreadChatCount]);

  useEffect(() => {
    if (!agencyId || !user?.id) return;

    const realtime = supabase
      .channel(`topbar_team_chat_${agencyId}_${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'team_messages', filter: `agency_id=eq.${agencyId}` },
        () => {
          void refreshUnreadChatCount();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'team_direct_messages', filter: `agency_id=eq.${agencyId}` },
        () => {
          void refreshUnreadChatCount();
        }
      )
      .subscribe();

    const handleLastSeenUpdated = () => {
      void refreshUnreadChatCount();
    };

    window.addEventListener('team-chat-last-seen-updated', handleLastSeenUpdated as EventListener);

    return () => {
      supabase.removeChannel(realtime);
      window.removeEventListener('team-chat-last-seen-updated', handleLastSeenUpdated as EventListener);
    };
  }, [agencyId, refreshUnreadChatCount, user?.id]);

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
    document.documentElement.classList.toggle('dark');
  };

  const clearAllSubDashboardStates = () => {
    setSelectedBranchManager(null);
    setSelectedNegotiator(null);
    setSelectedProspector(null);
  };

  return (
    <header className="flex h-16 items-center justify-between gap-3 border-b border-border bg-card px-4 sm:px-6">
      {/* Left Section: Logo */}
      <div className="flex shrink-0 items-center pr-2 sm:pr-3">
        <img
          src="https://c.animaapp.com/mjhelv55slzlFZ/img/brandmark-design.png"
          alt="GRIP Logo"
          className="h-[1.8rem] w-auto object-contain dark:invert"
          loading="lazy"
        />
      </div>

      {/* Center Section: Desktop Navigation */}
      <div className="hidden flex-1 min-w-0 items-center justify-center px-1 lg:flex">
        <div className="relative flex w-full items-center">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => scrollNavBy(-220)}
            className={cn(
              "absolute left-0 z-10 h-7 w-7 rounded-full border border-border bg-card/95 shadow-sm transition-opacity",
              canScrollNavLeft ? "opacity-100" : "pointer-events-none opacity-0"
            )}
            aria-label="Scroll navigation left"
          >
            <ChevronLeftIcon className="h-4 w-4" strokeWidth={1.5} />
          </Button>

          <nav
            ref={navScrollRef}
            className="mx-8 flex w-full min-w-0 items-center gap-1 overflow-x-auto whitespace-nowrap px-1 scrollbar-hide scroll-smooth"
            role="navigation"
            aria-label="Main navigation"
          >
            {visibleNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentView === item.id;
              
              return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setCurrentView(item.id);
                    }}
                    className={cn(
                      'flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 transition-all duration-200 border relative',
                      'hover:bg-accent hover:text-accent-foreground',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                      isActive
                        ? 'border-primary text-primary bg-transparent text-sm font-medium'
                        : 'border-transparent text-muted-foreground text-sm font-medium'
                    )}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    <Icon className={cn("h-4 w-4", isActive ? 'text-primary' : globalIconColors[item.id as AllViewTypes])} strokeWidth={1.5} />
                    <span>{item.label}</span>
                    {item.id === 'team-chat' && unreadChatMessages > 0 && (
                      <span className="absolute -top-1 -left-1 h-5 min-w-[20px] bg-red-500 px-1 text-white text-[10px] font-bold rounded-full shadow-sm border-2 border-background flex items-center justify-center">
                        {unreadChatMessages}
                      </span>
                    )}
                  </button>
              );
            })}
          </nav>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => scrollNavBy(220)}
            className={cn(
              "absolute right-0 z-10 h-7 w-7 rounded-full border border-border bg-card/95 shadow-sm transition-opacity",
              canScrollNavRight ? "opacity-100" : "pointer-events-none opacity-0"
            )}
            aria-label="Scroll navigation right"
          >
            <ChevronRightIcon className="h-4 w-4" strokeWidth={1.5} />
          </Button>
        </div>
      </div>

      {/* Right Section: Actions */}
      <div className="flex shrink-0 items-center gap-3 pl-2 sm:pl-3">
        {/* When an owner has "logged in as client" (Owner dashboard closed), show a quick
            way to jump back to the Owner dashboard. */}
        {user && !isOwnerDashboardOpen && getUserRole(user) === 'owner' && (
          <Button
            variant="outline"
            size="sm"
            className="hidden md:inline-flex border-primary text-primary bg-transparent hover:bg-primary/5"
            onClick={() => setOwnerIsOpen(true)}
          >
            Back to GRIP Owner
          </Button>
        )}
        {clientScopeIds && clientScopeIds.length > 1 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                className="hidden max-w-[220px] items-center gap-2 rounded-full border-border bg-background px-3 text-left text-sm font-medium text-foreground shadow-sm md:inline-flex"
              >
                <Building2Icon className="h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={1.5} />
                <span className="truncate">{activeFranchiseClient?.name ?? 'Franchise clients'}</span>
                <ChevronDownIcon className="h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={1.5} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64 bg-popover text-popover-foreground">
              <DropdownMenuLabel className="text-xs text-muted-foreground">
                Franchise clients
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {franchiseClients.map((client) => (
                <DropdownMenuItem
                  key={client.id}
                  className={cn('cursor-pointer gap-2', client.id === clientId && 'text-primary')}
                  onClick={() => setClientId(client.id)}
                >
                  <Building2Icon className="h-4 w-4 shrink-0" strokeWidth={1.5} />
                  <span className="truncate">{client.name}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
        {/* Mobile Menu */}
        <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="bg-transparent text-foreground hover:bg-accent hover:text-accent-foreground lg:hidden"
              aria-label="Open menu"
            >
              <MenuIcon className="h-5 w-5" strokeWidth={1.5} />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 bg-card">
            <nav className="flex flex-col gap-1 pt-8" role="navigation" aria-label="Mobile navigation">
              {visibleNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentView === item.id;
                
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setCurrentView(item.id);
                      setMobileMenuOpen(false);
                    }}
                    className={cn(
                      'flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-all duration-200',
                      'hover:bg-accent hover:text-accent-foreground',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                      isActive
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground'
                    )}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    <Icon className={cn("h-5 w-5 shrink-0", isActive ? 'text-primary-foreground' : globalIconColors[item.id as AllViewTypes])} strokeWidth={1.5} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </SheetContent>
        </Sheet>

        <Button
          variant="ghost"
          size="icon"
          onClick={() => {
            setCurrentView('genius-calendar');
            // Trigger task view mode in calendar
            setTimeout(() => {
              const event = new CustomEvent('switch-to-tasks-view');
              window.dispatchEvent(event);
            }, 100);
          }}
          className="bg-transparent text-foreground hover:bg-accent hover:text-accent-foreground"
          aria-label="My Tasks"
          title="My Tasks"
        >
          <ListChecksIcon className="h-5 w-5" strokeWidth={1.5} />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          onClick={() => setTutorialOpen(true)}
          className="bg-transparent text-foreground hover:bg-accent hover:text-accent-foreground"
          aria-label="Help & Tutorials"
          title="Help & Tutorials"
        >
          <BookOpenIcon className="h-5 w-5" strokeWidth={1.5} />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          onClick={() => setThinkPadOpen(true)}
          className="bg-transparent text-foreground hover:bg-accent hover:text-accent-foreground"
          aria-label="Think Pad"
          title="Think Pad"
        >
          <NotebookPenIcon className="h-5 w-5" strokeWidth={1.5} />
        </Button>

        <Popover open={notificationsOpen} onOpenChange={setNotificationsOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="bg-transparent text-foreground hover:bg-accent hover:text-accent-foreground relative"
              aria-label="Notifications"
            >
              <BellIcon className="h-5 w-5" strokeWidth={1.5} />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[340px] p-0 bg-popover text-popover-foreground" align="end" sideOffset={8}>
            <NotificationsPanel open={notificationsOpen} agencyId={agencyId} className="p-4" />
          </PopoverContent>
        </Popover>

        <TutorialOverlay
          open={tutorialOpen}
          onOpenChange={setTutorialOpen}
        />

        <ThinkPadDialog 
          open={thinkPadOpen} 
          onOpenChange={setThinkPadOpen} 
        />

        {selectedNotification && (
          <NotificationActionDialog
            open={notificationActionOpen}
            onOpenChange={setNotificationActionOpen}
            notification={selectedNotification}
            onAccept={(notes) => {
              console.log('Accepted:', selectedNotification, 'Notes:', notes);
              // In real app: update backend and calendar
              alert(`${selectedNotification.title} accepted!`);
              setSelectedNotification(null);
            }}
            onDecline={(reason) => {
              console.log('Declined:', selectedNotification, 'Reason:', reason);
              // In real app: update backend and notify requester
              alert(`${selectedNotification.title} declined. Reason: ${reason}`);
              setSelectedNotification(null);
            }}
          />
        )}

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
            <Button
              variant="ghost"
              className="bg-transparent text-foreground hover:bg-accent hover:text-accent-foreground h-9 px-3"
              aria-label="Dashboard switcher"
            >
              <span className="text-sm font-medium">{displayName}</span>
            </Button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="bg-popover text-popover-foreground w-60">
            <DropdownMenuLabel className="text-foreground">Switch Dashboard</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={() => {
                clearAllSubDashboardStates();
                setCurrentView('movements');
              }}
              className="text-foreground hover:bg-accent hover:text-accent-foreground cursor-pointer"
            >
              <LayoutDashboardIcon className="mr-2 h-4 w-4" strokeWidth={1.5} />
              Main Dashboard
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => {
                clearAllSubDashboardStates();
                if (staffForSwitcher.branchManager) setSelectedBranchManager(staffForSwitcher.branchManager);
              }}
              className="text-foreground hover:bg-accent hover:text-accent-foreground cursor-pointer"
              disabled={!staffForSwitcher.branchManager}
            >
              <UsersIcon className="mr-2 h-4 w-4" strokeWidth={1.5} />
              Branch Manager Dash{staffForSwitcher.branchManager ? ` (${staffForSwitcher.branchManager.name})` : ''}
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => {
                clearAllSubDashboardStates();
                if (staffForSwitcher.negotiator) setSelectedNegotiator(staffForSwitcher.negotiator);
              }}
              className="text-foreground hover:bg-accent hover:text-accent-foreground cursor-pointer"
              disabled={!staffForSwitcher.negotiator}
            >
              <UsersIcon className="mr-2 h-4 w-4" strokeWidth={1.5} />
              Negotiator Dash{staffForSwitcher.negotiator ? ` (${staffForSwitcher.negotiator.name})` : ''}
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => {
                clearAllSubDashboardStates();
                if (staffForSwitcher.prospector) setSelectedProspector(staffForSwitcher.prospector);
              }}
              className="text-foreground hover:bg-accent hover:text-accent-foreground cursor-pointer"
              disabled={!staffForSwitcher.prospector}
            >
              <UsersIcon className="mr-2 h-4 w-4" strokeWidth={1.5} />
              Prospector Dash{staffForSwitcher.prospector ? ` (${staffForSwitcher.prospector.name})` : ''}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={() => {
                clearAllSubDashboardStates();
                setCurrentView('settings');
              }}
              className="text-foreground hover:bg-accent hover:text-accent-foreground cursor-pointer"
            >
              <SettingsIcon className="mr-2 h-4 w-4" strokeWidth={1.5} />
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={async () => {
                const ok = await confirmDialog('Are you sure you want to log out?', {
                  title: 'Log out?',
                  confirmText: 'Log out',
                  variant: 'destructive',
                });
                if (ok) {
                  await logout();
                  // App.tsx will detect unauthenticated state and show LoginScreen
                }
              }}
              className="text-destructive hover:bg-destructive/10 hover:text-destructive cursor-pointer"
            >
              <LogOutIcon className="mr-2 h-4 w-4" strokeWidth={1.5} />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
