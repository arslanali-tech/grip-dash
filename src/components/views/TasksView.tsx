import { useState, useEffect } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import { 
  SearchIcon, FilterIcon, CalendarIcon, ChevronDownIcon, XIcon, FileTextIcon, PlusIcon, 
  FolderIcon, FileSpreadsheetIcon, PresentationIcon, VideoIcon, SparklesIcon, FormInputIcon, 
  ImageIcon, FileIcon, ArchiveIcon, MusicIcon, GlobeIcon, LinkIcon, Loader2Icon 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { ComplianceTasksList } from '../ComplianceTasksList';
import { DocumentUploadsList } from '../DocumentUploadsList';
import { ComingSoonView } from './ComingSoonView';
import { CalendarView } from './CalendarView';
import { PasswordsView } from './PasswordsView';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useDashboardStore } from '@/stores/dashboardStore';
import { useAuthStore } from '@/stores/authStore';
import { 
  fetchHubTabs, 
  initHubTabsForAgency, 
  createHubTab, 
  deleteHubTab, 
  generateSlug,
  HubTabRow 
} from '@/lib/hubConfigApi';

interface TasksViewProps {
  agencyId?: string;
  userId?: string;
}

export function TasksView({ agencyId: propAgencyId, userId }: TasksViewProps = {}) {
  const isMobile = useIsMobile();
  const { agencyId: storeAgencyId } = useDashboardStore();
  const { user } = useAuthStore();
  const agencyId = propAgencyId || storeAgencyId;
  
  const [primaryTab, setPrimaryTab] = useState('all-files');
  const [secondaryTab, setSecondaryTab] = useState('tasks');
  const [date, setDate] = useState<Date | undefined>(undefined);
  
  // Dynamic tabs state from database
  const [dynamicTabs, setDynamicTabs] = useState<HubTabRow[]>([]);
  const [loadingTabs, setLoadingTabs] = useState(true);
  const [searchValue, setSearchValue] = useState('');

  // Load tabs from database
  useEffect(() => {
    const loadTabs = async () => {
      if (!agencyId) {
        setLoadingTabs(false);
        return;
      }
      
      setLoadingTabs(true);
      try {
        // Initialize default tabs if none exist
        await initHubTabsForAgency(agencyId);
        
        const tabs = await fetchHubTabs(agencyId);
        setDynamicTabs(tabs);
      } catch (error) {
        console.error('Error loading tabs', error);
      } finally {
        setLoadingTabs(false);
      }
    };
    
    void loadTabs();
  }, [agencyId]);

  const generateValue = (label: string) => generateSlug(label);

  const handleSearchKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && searchValue.trim() && agencyId) {
      const newTabName = searchValue.trim();
      const newTabSlug = generateValue(newTabName);
      
      // Check if tab already exists
      const exists = dynamicTabs.some(t => t.slug === newTabSlug) || 
                     newTabSlug === 'all-files' || 
                     newTabSlug === 'all-folders';
      
      if (!exists) {
        // Create new tab in database
        const newTab = await createHubTab({
          agencyId,
          name: newTabName,
          slug: newTabSlug,
          createdBy: user?.id ?? null,
        });
        
        if (newTab) {
          setDynamicTabs(prev => [...prev, newTab]);
        }
      }
      
      setPrimaryTab(newTabSlug);
      setSearchValue('');
    }
  };

  const handleCloseTab = async (tab: HubTabRow, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent tab activation when closing
    
    // Only allow closing non-system tabs
    if (tab.is_system) return;
    
    // Delete tab from database (soft delete)
    const success = await deleteHubTab(tab.id);
    
    if (success) {
      const newTabs = dynamicTabs.filter(t => t.id !== tab.id);
      setDynamicTabs(newTabs);
      
      if (primaryTab === tab.slug) {
        setPrimaryTab('all-files');
      }
    }
  };

  const renderComingSoon = (viewType: string) => (
    <ComingSoonView view={viewType as any} />
  );

  const renderComplianceContent = () => (
    <Tabs value={secondaryTab} onValueChange={setSecondaryTab}>
      <div className="flex justify-between items-center mb-6 border-b border-border">
        <TabsList className="bg-transparent text-muted-foreground h-auto p-0 gap-8">
          <TabsTrigger 
              value="tasks" 
              className="px-0 py-3 text-sm font-semibold data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none border-b-2 border-transparent data-[state=active]:border-primary rounded-none transition-all"
          >
            Tasks
          </TabsTrigger>
          <TabsTrigger 
              value="compliance-calendar" 
              className="px-0 py-3 text-sm font-semibold data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none border-b-2 border-transparent data-[state=active]:border-primary rounded-none transition-all"
          >
            Compliance calendar
          </TabsTrigger>
        </TabsList>
        
        <div className="flex items-center gap-3 pb-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                  <Button size="sm" className="bg-primary text-primary-foreground shadow-md hover:shadow-lg hover:bg-primary/90 transition-all rounded-lg px-4">
                      <PlusIcon className="h-4 w-4 mr-2" /> New
                  </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 p-1">
                  <DropdownMenuItem className="gap-3 py-2 cursor-pointer">
                      <div className="flex items-center justify-center w-5 h-5">
                          <PlusIcon className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <span>New folder</span>
                  </DropdownMenuItem>
                  
                  <DropdownMenuSeparator className="my-1" />
                  
                  <DropdownMenuItem className="gap-3 py-2 cursor-pointer">
                      <div className="flex items-center justify-center w-5 h-5">
                          <FileTextIcon className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <span>File upload</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem className="gap-3 py-2 cursor-pointer">
                      <div className="flex items-center justify-center w-5 h-5">
                          <div className="h-4 w-4 border-2 border-muted-foreground rounded-sm" />
                      </div>
                      <span>Folder upload</span>
                  </DropdownMenuItem>

                  <DropdownMenuSeparator className="my-1" />

                  <DropdownMenuItem className="gap-3 py-2 cursor-pointer">
                      <div className="flex items-center justify-center w-5 h-5 bg-blue-500 rounded-[2px]">
                          <FileTextIcon className="h-3 w-3 text-white" />
                      </div>
                      <span>Google Docs</span>
                      <ChevronDownIcon className="h-3 w-3 ml-auto -rotate-90 opacity-50" />
                  </DropdownMenuItem>
                  <DropdownMenuItem className="gap-3 py-2 cursor-pointer">
                      <div className="flex items-center justify-center w-5 h-5 bg-green-500 rounded-[2px]">
                          <div className="h-3 w-3 bg-white/20" />
                      </div>
                      <span>Google Sheets</span>
                      <ChevronDownIcon className="h-3 w-3 ml-auto -rotate-90 opacity-50" />
                  </DropdownMenuItem>
                  <DropdownMenuItem className="gap-3 py-2 cursor-pointer">
                      <div className="flex items-center justify-center w-5 h-5 bg-yellow-500 rounded-[2px]">
                          <div className="h-3 w-3 bg-white/20" />
                      </div>
                      <span>Google Slides</span>
                      <ChevronDownIcon className="h-3 w-3 ml-auto -rotate-90 opacity-50" />
                  </DropdownMenuItem>
                  <DropdownMenuItem className="gap-3 py-2 cursor-pointer">
                      <div className="flex items-center justify-center w-5 h-5 bg-purple-500 rounded-[2px]">
                          <div className="h-3 w-3 bg-white/20" />
                      </div>
                      <span>Google Forms</span>
                      <ChevronDownIcon className="h-3 w-3 ml-auto -rotate-90 opacity-50" />
                  </DropdownMenuItem>
                  
                  <DropdownMenuItem className="gap-3 py-2 cursor-pointer">
                      <div className="flex items-center justify-center w-5 h-5">
                          <PlusIcon className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <span>More</span>
                      <ChevronDownIcon className="h-3 w-3 ml-auto -rotate-90 opacity-50" />
                  </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button size="sm" variant="outline" className="rounded-lg border-border hover:bg-accent hover:text-accent-foreground">
              Export <ChevronDownIcon className="h-3 w-3 ml-2 opacity-50" />
            </Button>
        </div>
      </div>

      {/* Content for Secondary Tabs */}
      <TabsContent value="tasks" className="mt-0">
        <ComplianceTasksList />
      </TabsContent>
      <TabsContent value="compliance-calendar" className="mt-0">
        <CalendarView />
      </TabsContent>
    </Tabs>
  );

  return (
    <div className={cn("space-y-4 relative z-10", isMobile ? "p-4" : "p-6 md:p-8")}>
      {/* Header Section */}
      <div className="flex flex-col items-center justify-center space-y-8 mb-10 py-12 bg-gradient-to-b from-background via-muted/10 to-muted/30 rounded-[2rem] border border-border/40 shadow-sm">
        <h1 className="text-5xl font-bold text-foreground tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-foreground via-foreground/90 to-foreground/70 drop-shadow-sm pb-2">
          Find easily. Work better.
        </h1>
        
        <div className="w-full max-w-3xl px-4">
            {/* Top Controls Row */}
            <div className="flex items-end pl-4">
                {/* Find Tab */}
                <div className="flex items-center gap-2 px-5 py-2.5 bg-background border border-b-0 border-border rounded-t-xl text-sm font-semibold text-foreground relative z-10 translate-y-[1px] shadow-[0_-2px_10px_rgba(0,0,0,0.02)]">
                    <SearchIcon className="h-4 w-4 text-primary" />
                    Find
                </div>

                {/* Type Dropdown */}
                <div className="ml-3 mb-1.5">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-muted-foreground hover:text-foreground font-medium hover:bg-background/50 transition-colors">
                                <FileTextIcon className="h-4 w-4" />
                                Type
                                <ChevronDownIcon className="h-3.5 w-3.5 opacity-50" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="w-56 p-1">
                            <DropdownMenuItem className="gap-3 py-2 cursor-pointer">
                                <FolderIcon className="h-4 w-4 text-gray-500" />
                                <span>Folders</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem className="gap-3 py-2 cursor-pointer">
                                <FileTextIcon className="h-4 w-4 text-blue-500" />
                                <span>Documents</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem className="gap-3 py-2 cursor-pointer">
                                <FileSpreadsheetIcon className="h-4 w-4 text-green-500" />
                                <span>Spreadsheets</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem className="gap-3 py-2 cursor-pointer">
                                <PresentationIcon className="h-4 w-4 text-yellow-500" />
                                <span>Presentations</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem className="gap-3 py-2 cursor-pointer">
                                <VideoIcon className="h-4 w-4 text-purple-500" />
                                <span>Vids</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem className="gap-3 py-2 cursor-pointer">
                                <SparklesIcon className="h-4 w-4 text-blue-400" />
                                <span>Gems</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem className="gap-3 py-2 cursor-pointer">
                                <FormInputIcon className="h-4 w-4 text-purple-600" />
                                <span>Forms</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem className="gap-3 py-2 cursor-pointer">
                                <ImageIcon className="h-4 w-4 text-red-500" />
                                <span>Photos & images</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem className="gap-3 py-2 cursor-pointer">
                                <FileIcon className="h-4 w-4 text-red-600" />
                                <span>PDFs</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem className="gap-3 py-2 cursor-pointer">
                                <VideoIcon className="h-4 w-4 text-red-500" />
                                <span>Videos</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem className="gap-3 py-2 cursor-pointer">
                                <ArchiveIcon className="h-4 w-4 text-gray-600" />
                                <span>Archives (zip)</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem className="gap-3 py-2 cursor-pointer">
                                <MusicIcon className="h-4 w-4 text-red-500" />
                                <span>Audio</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem className="gap-3 py-2 cursor-pointer">
                                <div className="h-4 w-4 bg-red-500 rounded-sm flex items-center justify-center">
                                    <div className="h-2 w-2 bg-white rounded-full" />
                                </div>
                                <span>Drawings</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem className="gap-3 py-2 cursor-pointer">
                                <GlobeIcon className="h-4 w-4 text-blue-500" />
                                <span>Sites</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem className="gap-3 py-2 cursor-pointer">
                                <LinkIcon className="h-4 w-4 text-gray-500" />
                                <span>Shortcuts</span>
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>

                {/* Date Picker */}
                <div className="ml-2 mb-1.5">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-muted-foreground hover:text-foreground font-medium hover:bg-background/50 transition-colors">
                                <CalendarIcon className="h-4 w-4" />
                                {date ? format(date, "MMM dd, yyyy") : "Modified"}
                                <ChevronDownIcon className="h-3.5 w-3.5 opacity-50" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="w-56 p-1">
                            <DropdownMenuItem className="py-2 cursor-pointer">
                                <span>Today</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem className="py-2 cursor-pointer">
                                <span>Last 7 days</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem className="py-2 cursor-pointer">
                                <span>Last 30 days</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem className="py-2 cursor-pointer">
                                <span>This year (2025)</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem className="py-2 cursor-pointer">
                                <span>Last year (2024)</span>
                            </DropdownMenuItem>
                            
                            <DropdownMenuSeparator className="my-1" />
                            
                            <Popover>
                                <PopoverTrigger asChild>
                                    <DropdownMenuItem className="py-2 cursor-pointer justify-between" onSelect={(e) => e.preventDefault()}>
                                        <span>Custom date range</span>
                                        <ChevronDownIcon className="h-3 w-3 -rotate-90 opacity-50" />
                                    </DropdownMenuItem>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start" side="right">
                                    <Calendar
                                        mode="single"
                                        selected={date}
                                        onSelect={setDate}
                                        initialFocus
                                    />
                                </PopoverContent>
                            </Popover>

                            <DropdownMenuSeparator className="my-1" />

                            <div className="flex items-center justify-between px-2 py-1.5">
                                <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground hover:text-foreground px-2" onClick={() => setDate(undefined)}>
                                    Clear all
                                </Button>
                                <div className="flex gap-1">
                                    <Button variant="ghost" size="sm" className="h-7 text-xs text-primary hover:text-primary/80 px-2">
                                        Cancel
                                    </Button>
                                    <Button variant="ghost" size="sm" className="h-7 text-xs text-primary hover:text-primary/80 px-2">
                                        Apply
                                    </Button>
                                </div>
                            </div>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>

            {/* Search Input Container */}
            <div className="relative w-full group">
                <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent rounded-2xl blur-md opacity-100 transition-opacity duration-500" />
                <div className="relative bg-background/80 backdrop-blur-md rounded-2xl rounded-tl-none border border-primary/30 shadow-lg hover:shadow-xl hover:border-primary/50 transition-all duration-300">
                    <Input 
                        className="border-none shadow-none focus-visible:ring-0 h-16 px-6 text-lg bg-transparent placeholder:text-muted-foreground/40 font-light tracking-wide" 
                        placeholder="Find all your assets by keywords..." 
                        value={searchValue}
                        onChange={(e) => setSearchValue(e.target.value)}
                        onKeyDown={handleSearchKeyDown}
                    />
                </div>
            </div>
        </div>
      </div>

      {/* Primary Tabs */}
      <Tabs value={primaryTab} onValueChange={setPrimaryTab} className="w-full">
        <div className="w-full overflow-x-auto pb-2">
          <TabsList className="bg-transparent text-muted-foreground flex w-max h-auto gap-2 p-0">
            {/* Static Tabs */}
            {['All Files', 'All Folders'].map((tab) => {
                const value = generateValue(tab);
                return (
                    <TabsTrigger 
                        key={value} 
                        value={value} 
                        className="px-5 py-2.5 text-sm rounded-xl border border-transparent data-[state=active]:border-primary/20 data-[state=active]:bg-primary/5 data-[state=active]:text-primary hover:bg-accent/50 hover:text-foreground transition-all font-medium text-muted-foreground"
                    >
                        {tab}
                    </TabsTrigger>
                )
            })}
            
            {/* Loading State */}
            {loadingTabs && (
              <div className="flex items-center gap-2 px-4 py-2 text-sm text-muted-foreground">
                <Loader2Icon className="h-4 w-4 animate-spin" />
                Loading tabs...
              </div>
            )}
            
            {/* Dynamic Tabs from Database */}
            {!loadingTabs && dynamicTabs.map((tab) => (
                <TabsTrigger 
                    key={tab.id} 
                    value={tab.slug} 
                    className="px-5 py-2.5 text-sm rounded-xl border border-transparent data-[state=active]:border-primary/20 data-[state=active]:bg-primary/5 data-[state=active]:text-primary hover:bg-accent/50 hover:text-foreground transition-all font-medium text-muted-foreground pr-2 group"
                >
                    {tab.name}
                    {!tab.is_system && (
                      <div 
                          role="button"
                          onClick={(e) => handleCloseTab(tab, e)}
                          className="ml-2 hover:bg-destructive/10 hover:text-destructive rounded-full p-0.5 transition-colors opacity-60 group-hover:opacity-100"
                      >
                          <XIcon className="h-3 w-3" />
                      </div>
                    )}
                </TabsTrigger>
            ))}
          </TabsList>
        </div>

        {/* Static Tab Content */}
        <TabsContent value="all-files" className="mt-8">
          <DocumentUploadsList filterType="all" />
        </TabsContent>
        <TabsContent value="all-folders" className="mt-8">
          <DocumentUploadsList filterType="folder" />
        </TabsContent>
        
        {/* Dynamic Tab Content */}
        {dynamicTabs.map((tab) => {
            if (tab.slug === 'compliance') {
                return (
                    <TabsContent key={tab.id} value="compliance" className="mt-8">
                        {renderComplianceContent()}
                    </TabsContent>
                );
            }

            if (tab.slug === 'passwords') {
                return (
                    <TabsContent key={tab.id} value="passwords" className="mt-8">
                        <PasswordsView agencyId={agencyId} />
                    </TabsContent>
                );
            }

            if (tab.slug === 'documents') {
                return (
                    <TabsContent key={tab.id} value="documents" className="mt-8">
                        <DocumentUploadsList filterType="all" />
                    </TabsContent>
                );
            }

            return (
                <TabsContent key={tab.id} value={tab.slug} className="mt-8">
                    {renderComingSoon(tab.slug)}
                </TabsContent>
            );
        })}
      </Tabs>
    </div>
  );
}
