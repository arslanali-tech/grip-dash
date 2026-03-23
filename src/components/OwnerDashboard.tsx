import { UsersIcon, ShoppingCartIcon, SearchIcon, BarChart3Icon, KeyIcon, CreditCardIcon, SendIcon, BellIcon, SunIcon, MoonIcon, SettingsIcon, HomeIcon, TentIcon, PrinterIcon, DollarSignIcon, LayoutTemplateIcon, FileTextIcon, CalendarIcon, BriefcaseIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useOwnerStore, OwnerViewType } from '@/stores/ownerStore';
import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { Agency, getOrCreateOwnerAgency } from '@/lib/ownerApi';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

// Import Owner Dashboard Views
import { ClientsView } from './views/ClientsView';
import { CreateOrderFormView } from './views/CreateOrderFormView';
import { ProspectsView } from './views/ProspectsView';
import { OwnerAnalyticsView } from './views/OwnerAnalyticsView';
import { PasswordsView } from './views/PasswordsView';
import { BillingView } from './views/BillingView';
import { ClientUpdatesView } from './views/ClientUpdatesView';
import { HouseKeepingView } from './views/HouseKeepingView';
import { BusinessManagerView } from './views/BusinessManagerView';
import { BaseCampView } from './views/BaseCampView';
import { InvoiceTemplateView } from './views/InvoiceTemplateView';
import { ComplianceDocumentsView } from './views/ComplianceDocumentsView';
import { ComplianceTasksList } from './ComplianceTasksList';
import { ComingSoonView } from './views/ComingSoonView';
import { StationeryRequestDialog } from './StationeryRequestDialog';
import { InvoiceGeneratorDialog } from './InvoiceGeneratorDialog';
import { globalIconColors, AllViewTypes } from '@/lib/globalIconColors';
import { OwnerSummaryCards } from './OwnerSummaryCards';
import { NotificationsPanel } from './NotificationsPanel';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface NavItem {
  id: OwnerViewType;
  label: string;
  icon: React.ElementType;
}

const navItems: NavItem[] = [
  { id: 'clients', label: 'Clients', icon: UsersIcon },
  { id: 'create-order', label: 'Create Order', icon: ShoppingCartIcon },
  { id: 'prospects', label: 'Prospects', icon: SearchIcon },
  { id: 'analytics', label: 'Analytics', icon: BarChart3Icon },
  { id: 'passwords', label: 'Passwords', icon: KeyIcon },
  { id: 'billing', label: 'Billing', icon: CreditCardIcon },
  { id: 'client-updates', label: 'Client Updates', icon: SendIcon },
  { id: 'compliance-tasks-list', label: 'Compliance Tasks List', icon: FileTextIcon },
];

export function OwnerDashboard() {
  const { currentView, setCurrentView, setIsOpen } = useOwnerStore();
  const [isDarkMode, setIsDarkMode] = useState(false);
  const { user, logout } = useAuthStore();
  const [agency, setAgency] = useState<Agency | null>(null);
  const [loadingAgency, setLoadingAgency] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  // When the Owner dashboard is mounted, mark it as "open" so App can
  // distinguish between Owner vs client main dashboard.
  useEffect(() => {
    setIsOpen(true);
  }, [setIsOpen]);

  useEffect(() => {
    const loadAgency = async () => {
      if (!user) return;
      setLoadingAgency(true);
      const result = await getOrCreateOwnerAgency(user.id);
      setAgency(result);
      setLoadingAgency(false);
    };
    void loadAgency();
  }, [user]);

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
    document.documentElement.classList.toggle('dark');
  };

  const renderView = () => {
    switch (currentView) {
      case 'clients':
        return <ClientsView agencyId={agency?.id} />;
      case 'create-order':
        return <CreateOrderFormView agencyId={agency?.id} />;
      case 'prospects':
        return <ProspectsView agencyId={agency?.id} />;
      case 'analytics':
        return <OwnerAnalyticsView agencyId={agency?.id} />;
      case 'passwords':
        return <PasswordsView agencyId={agency?.id} />;
      case 'billing':
        return <BillingView agencyId={agency?.id} />;
      case 'client-updates':
        return <ClientUpdatesView agencyId={agency?.id} />;
      case 'business-manager':
        return <BusinessManagerView agencyId={agency?.id} />;
      case 'base-camp':
        return <BaseCampView />;
      case 'stationery-request':
        return <StationeryRequestDialog open={true} onOpenChange={() => setCurrentView('house-keeping')} onSave={() => {}} />;
      case 'invoice-generator':
        return <InvoiceGeneratorDialog open={true} onOpenChange={() => setCurrentView('house-keeping')} onGenerate={() => {}} agencyId={agency?.id} />;
      case 'invoice-template':
        return <InvoiceTemplateView />;
      case 'compliance-documents':
        return <ComplianceDocumentsView />;
      case 'compliance-tasks-list':
        return agency ? (
          <ComplianceTasksList agencyId={agency.id} />
        ) : (
          <p className="text-sm text-muted-foreground">Loading agency for compliance tasks…</p>
        );
      default:
        return <ClientsView agencyId={agency?.id} />;
    }
  };

  return (
    <div className="flex min-h-screen w-full flex-col overflow-x-hidden bg-background">
      {/* Top Bar */}
      <header className="flex h-16 items-center border-b border-border bg-card px-4 md:px-6 shrink-0">
        <div className="flex w-full items-center justify-between gap-8">
          <div className="flex min-w-0 flex-1 items-center gap-8">
            <div className="flex items-center gap-4">
              <h1 className="font-heading text-xl font-semibold text-foreground whitespace-nowrap">
                GRIP Owner
              </h1>
            </div>

            {/* Navigation (desktop/tablet) */}
            <nav
              className="hidden min-w-0 flex-1 items-center gap-2 overflow-x-auto scrollbar-hide md:flex"
              role="navigation"
              aria-label="Owner Dashboard navigation"
            >
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentView === item.id;

                return (
                  <button
                    key={item.id}
                    onClick={() => setCurrentView(item.id)}
                    className={cn(
                      'flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium whitespace-nowrap border transition-all duration-200',
                      'hover:bg-accent/40 hover:text-foreground',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                      isActive
                        ? 'border-blue-500 bg-blue-50 text-blue-600 shadow-sm'
                        : 'border-transparent text-muted-foreground'
                    )}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    <Icon
                      className={cn('h-4 w-4', isActive ? 'text-blue-600' : 'text-muted-foreground')}
                      strokeWidth={1.5}
                    />
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
              <NotificationsPanel open={notificationsOpen} agencyId={agency?.id ?? null} className="p-4" />
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
              <button className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <Avatar className="h-9 w-9">
                  <AvatarImage src="https://c.animaapp.com/mjhelv55slzlFZ/img/ai_1.png" alt={user?.email ?? 'Owner Avatar'} />
                  <AvatarFallback className="bg-primary text-primary-foreground">GO</AvatarFallback>
                </Avatar>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-popover text-popover-foreground w-56">
              <DropdownMenuLabel className="text-xs text-muted-foreground truncate max-w-[200px]">
                {user?.email ?? 'Owner'}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />

              {/* Mobile / tablet navigation via avatar */}
              <DropdownMenuLabel className="text-[11px] text-muted-foreground">
                Navigate
              </DropdownMenuLabel>
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentView === item.id;
                return (
                  <DropdownMenuItem
                    key={item.id}
                    className={cn(
                      'flex items-center gap-2 cursor-pointer',
                      isActive && 'text-primary'
                    )}
                    onClick={() => {
                      setCurrentView(item.id);
                    }}
                  >
                    <Icon className="h-4 w-4" strokeWidth={1.5} />
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
      </div>

      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto px-4 py-6 md:px-8 md:py-8">
        <div className="mx-auto w-full max-w-6xl">
          {/* Summary Cards (Only on Analytics view) */}
          {currentView === 'analytics' && <OwnerSummaryCards agencyId={agency?.id} />}

          {renderView()}
        </div>
      </main>
    </div>
  );
}
