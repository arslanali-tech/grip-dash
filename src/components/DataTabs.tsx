import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useDashboardStore, MovementTab } from '@/stores/dashboardStore';
import { cn } from '@/lib/utils';

export function DataTabs() {
  const { currentTab, setCurrentTab } = useDashboardStore();

  return (
    <Tabs value={currentTab} onValueChange={(value) => setCurrentTab(value as MovementTab)}>
      <TabsList className="bg-transparent text-muted-foreground flex w-max h-auto gap-2 p-0">
        <TabsTrigger 
          value="all" 
          className={cn(
            "px-4 py-2 text-sm rounded-lg border border-transparent transition-all font-medium text-muted-foreground",
            "data-[state=active]:border-primary/20 data-[state=active]:bg-primary/5 data-[state=active]:text-primary data-[state=active]:shadow-none",
            "hover:bg-accent/50 hover:text-foreground"
          )}
        >
          All
        </TabsTrigger>
        <TabsTrigger 
          value="sales"
          className={cn(
            "px-4 py-2 text-sm rounded-lg border border-transparent transition-all font-medium text-muted-foreground",
            "data-[state=active]:border-primary/20 data-[state=active]:bg-primary/5 data-[state=active]:text-primary data-[state=active]:shadow-none",
            "hover:bg-accent/50 hover:text-foreground"
          )}
        >
          Sales
        </TabsTrigger>
        <TabsTrigger 
          value="lettings"
          className={cn(
            "px-4 py-2 text-sm rounded-lg border border-transparent transition-all font-medium text-muted-foreground",
            "data-[state=active]:border-primary/20 data-[state=active]:bg-primary/5 data-[state=active]:text-primary data-[state=active]:shadow-none",
            "hover:bg-accent/50 hover:text-foreground"
          )}
        >
          Lettings
        </TabsTrigger>
      </TabsList>
    </Tabs>
  );
}
