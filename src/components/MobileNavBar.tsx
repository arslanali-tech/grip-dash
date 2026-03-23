import React, { useState, useEffect, useMemo } from 'react';
import { TrendingUpIcon, BarChart3Icon, SparklesIcon, MoreHorizontalIcon, UsersIcon, Building2Icon, UserCheckIcon, CheckSquareIcon, LayoutDashboardIcon, SettingsIcon, SearchIcon, MessageSquareIcon, CalendarIcon, BriefcaseIcon, HomeIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useDashboardStore, ViewType } from '@/stores/dashboardStore';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { globalIconColors, AllViewTypes } from '@/lib/globalIconColors';
import { useAuthStore } from '@/stores/authStore';
import { getUserRole } from '@/lib/ownerAccess';
import { useBusinessConfigStore, UserRole } from '@/stores/businessConfigStore';
import { isModuleEnabledWithLegacyFallback, type DashboardModuleId } from '@/lib/dashboardModules';

interface NavItem {
  id: ViewType;
  label: string;
  icon: React.ElementType;
}

const mainNavItems: NavItem[] = [
  { id: 'movements', label: 'Movements', icon: TrendingUpIcon },
  { id: 'genius-calendar', label: 'Diary', icon: CalendarIcon },
  { id: 'prospecting', label: 'Prospecting', icon: SearchIcon },
  { id: 'team-chat', label: 'Team Chat', icon: MessageSquareIcon },
];

const moreNavItems: NavItem[] = [
  { id: 'business-analytics', label: 'Analytics', icon: BarChart3Icon },
  { id: 'my-analytics', label: 'My Analytics', icon: BarChart3Icon },
  { id: 'prospecting-analytics', label: 'Prospector Analytics', icon: BarChart3Icon },
  { id: 'business-manager', label: 'Business Manager', icon: BriefcaseIcon },
  { id: 'genius', label: 'Genius', icon: SparklesIcon },
  { id: 'staff', label: 'Staff', icon: UsersIcon },
  { id: 'branches', label: 'Branches', icon: Building2Icon },
  { id: 'buyers-sellers', label: 'Referrals', icon: UserCheckIcon },
  { id: 'tasks', label: 'The Hub', icon: LayoutDashboardIcon },
  { id: 'house-keeping', label: 'Housekeeping', icon: HomeIcon },
  { id: 'settings', label: 'Settings', icon: SettingsIcon },
];

export function MobileNavBar() {
  const { currentView, setCurrentView, userEnabledModules } = useDashboardStore();
  const { user } = useAuthStore();
  const { roleConfigs } = useBusinessConfigStore();

  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [visibleMainItems, setVisibleMainItems] = useState(mainNavItems);
  const [visibleMoreItems, setVisibleMoreItems] = useState(moreNavItems);

  const userRole = useMemo(() => {
    const role = getUserRole(user);
    const normalized = (role ?? '').trim().toLowerCase() as UserRole;
    return normalized || 'negotiator';
  }, [user]);

  const roleConfig = useMemo(() => roleConfigs.find((rc) => rc.role === userRole) ?? null, [roleConfigs, userRole]);

  const viewToModuleId = (view: ViewType): DashboardModuleId | null => {
    // Only some views are “modules” (the ones that should be role-gated)
    switch (view) {
      case 'movements':
      case 'genius-calendar':
      case 'prospecting':
      case 'business-analytics':
      case 'my-analytics':
      case 'prospecting-analytics':
      case 'business-manager':
      case 'buyers-sellers':
      case 'tasks':
      case 'team-chat':
      case 'genius':
        return view;
      default:
        return null;
    }
  };

  // Load toolbar customization from localStorage + apply role-based filtering
  useEffect(() => {
    const loadToolbarItems = () => {
      const saved = localStorage.getItem('toolbar-items');
      let toolbarConfig: any[] | null = null;

      if (saved) {
        try {
          toolbarConfig = JSON.parse(saved);
        } catch (e) {
          console.error('Failed to load toolbar items:', e);
        }
      }

      const isAllowedByRole = (view: ViewType) => {
        // Gate module views using enabledModules
        const moduleId = viewToModuleId(view);
        if (moduleId) {
          // Prefer per-user module configuration from DB (if present)
          if (userEnabledModules !== null) {
            return isModuleEnabledWithLegacyFallback(userEnabledModules, moduleId);
          }
          // Fall back to role defaults
          if (!roleConfig) return true;
          return roleConfig.enabledModules.includes(moduleId);
        }

        if (!roleConfig) return true;

        // Gate management screens using capability flags
        if (view === 'business-manager') return roleConfig.canAccessBusinessManager;
        if (view === 'staff') return roleConfig.canManageStaff;
        if (view === 'branches') return roleConfig.canManageBranches;

        return true;
      };

      const isEnabledByLocalStorage = (view: ViewType) => {
        if (!toolbarConfig) return true;
        const config = toolbarConfig.find((c: any) => c.id === view);
        return config ? !!config.enabled : true;
      };
      const applyRoleVisibility = (items: NavItem[]) => {
        switch (userRole) {
          case 'negotiator':
            return items.filter((item) => item.id !== 'business-manager' && item.id !== 'prospecting-analytics');
          case 'prospector':
            return items.filter((item) =>
              ['prospecting', 'prospecting-analytics', 'house-keeping'].includes(item.id)
            );
          default:
            return items;
        }
      };

      const filteredMain = applyRoleVisibility(
        mainNavItems.filter((item) => isAllowedByRole(item.id) && isEnabledByLocalStorage(item.id))
      );
      const filteredMore = applyRoleVisibility(
        moreNavItems.filter((item) => isAllowedByRole(item.id) && isEnabledByLocalStorage(item.id))
      );

      setVisibleMainItems(filteredMain);
      setVisibleMoreItems(filteredMore);
    };

    loadToolbarItems();

    window.addEventListener('toolbar-items-updated', loadToolbarItems);
    return () => window.removeEventListener('toolbar-items-updated', loadToolbarItems);
  }, [roleConfig, userRole, userEnabledModules]);

  const handleNavClick = (view: ViewType) => {
    setCurrentView(view);
    setMoreMenuOpen(false); // Close more menu if open
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 flex h-16 items-center justify-around border-t border-border bg-card md:hidden">
      {visibleMainItems.map((item) => {
        const Icon = item.icon;
        const isActive = currentView === item.id;
        return (
          <Button
            key={item.id}
            variant="ghost"
            size="icon"
            onClick={() => handleNavClick(item.id)}
            className={cn(
              'flex h-full flex-col items-center justify-center gap-1 rounded-none text-xs font-medium',
              isActive ? 'text-primary' : 'text-muted-foreground dark:text-white',
              'hover:bg-transparent hover:text-primary'
            )}
          >
            <Icon className={cn("h-5 w-5", isActive ? 'text-primary' : globalIconColors[item.id as AllViewTypes], 'dark:text-white')} strokeWidth={1.5} />
            <span>{item.label}</span>
          </Button>
        );
      })}

      <Popover open={moreMenuOpen} onOpenChange={setMoreMenuOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              'flex h-full flex-col items-center justify-center gap-1 rounded-none text-xs font-medium',
              moreMenuOpen ? 'text-primary' : 'text-muted-foreground dark:text-white',
              'hover:bg-transparent hover:text-primary'
            )}
          >
            <MoreHorizontalIcon className={cn("h-5 w-5", moreMenuOpen ? 'text-primary' : 'text-muted-foreground dark:text-white')} strokeWidth={1.5} />
            <span>More</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent 
          side="top" 
          align="center" 
          sideOffset={8}
          className="w-auto p-2 bg-card border-border shadow-xl mb-2"
        >
          <div className="grid grid-cols-3 gap-2">
            {visibleMoreItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentView === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  className={cn(
                    'flex flex-col items-center justify-center gap-2 p-3 rounded-lg transition-all duration-200 min-w-[80px]',
                    'hover:bg-accent',
                    isActive
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground'
                  )}
                >
                  <Icon className={cn("h-6 w-6", isActive ? 'text-primary' : globalIconColors[item.id as AllViewTypes])} strokeWidth={1.5} />
                  <span className="text-xs font-medium text-center leading-tight">{item.label}</span>
                </button>
              );
            })}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
