import { useState, useEffect } from 'react';
import { LayoutDashboardIcon, TrendingUpIcon, UsersIcon, Building2Icon, UserCheckIcon, CheckSquareIcon, SettingsIcon, ChevronLeftIcon, ChevronRightIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDashboardStore, ViewType } from '@/stores/dashboardStore';
import { Button } from '@/components/ui/button';

interface SidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
}

interface NavItem {
  id: ViewType;
  label: string;
  icon: React.ElementType;
}

const navItems: NavItem[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboardIcon },
  { id: 'movements', label: 'Movements', icon: TrendingUpIcon },
  { id: 'team', label: 'Team', icon: UsersIcon },
  { id: 'branches', label: 'Branches', icon: Building2Icon },
  { id: 'buyers-sellers', label: 'Buyers/Sellers', icon: UserCheckIcon },
  { id: 'tasks', label: 'The   Hub', icon: CheckSquareIcon },
  { id: 'settings', label: 'Settings', icon: SettingsIcon },
];

export function Sidebar({ isCollapsed, onToggle }: SidebarProps) {
  const { currentView, setCurrentView } = useDashboardStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <aside
      className={cn(
        'relative flex h-full flex-col border-r border-border bg-card transition-all duration-300 ease-in-out',
        isCollapsed ? 'w-20' : 'w-64',
        !mounted && 'opacity-0'
      )}
    >
      <div className="flex h-16 items-center justify-between border-b border-border px-4">
        {!isCollapsed && (
          <h1 className="font-heading text-xl font-semibold text-foreground">
            Dashboard
          </h1>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggle}
          className="bg-transparent text-foreground hover:bg-accent hover:text-accent-foreground"
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? (
            <ChevronRightIcon className="h-5 w-5" strokeWidth={1.5} />
          ) : (
            <ChevronLeftIcon className="h-5 w-5" strokeWidth={1.5} />
          )}
        </Button>
      </div>

      <nav className="flex-1 space-y-1 p-4" role="navigation" aria-label="Main navigation">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;
          
          return (
            <button
              key={item.id}
              onClick={() => setCurrentView(item.id)}
              className={cn(
                'relative flex w-full items-center gap-3 rounded-lg px-3 py-3 text-sm font-normal transition-all duration-200',
                'hover:bg-accent hover:text-accent-foreground',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground'
              )}
              aria-current={isActive ? 'page' : undefined}
            >
              {isActive && (
                <span className="absolute left-0 top-0 h-full w-1 rounded-r-full bg-primary" />
              )}
              <Icon className="h-5 w-5 shrink-0" strokeWidth={1.5} />
              {!isCollapsed && (
                <span className="truncate">{item.label}</span>
              )}
            </button>
          );
        })}
      </nav>

      <div className="border-t border-border p-4">
        <div className="flex items-center gap-3">
          <img
            src="https://c.animaapp.com/mjhelv55slzlFZ/img/ai_1.png"
            alt="user avatar"
            className={cn(
              'rounded-full object-cover',
              isCollapsed ? 'h-10 w-10' : 'h-12 w-12'
            )}
            loading="lazy"
          />
          {!isCollapsed && (
            <div className="flex-1 overflow-hidden">
              <p className="truncate text-sm font-medium text-foreground">
                John Doe
              </p>
              <p className="truncate text-xs text-muted-foreground">
                Senior Agent
              </p>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
