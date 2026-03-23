import { useState, useEffect, useCallback } from 'react';
import { parseISO, isValid, addHours, setHours, setMinutes, setSeconds } from 'date-fns';
import { SearchIcon, FilterIcon, PlusIcon, ChevronDownIcon, ChevronLeftIcon, ChevronRightIcon, FileTextIcon, MoreHorizontalIcon, FolderIcon, FolderPlusIcon, ShareIcon, CopyIcon, MoveIcon, BellIcon, XIcon, HomeIcon, Loader2Icon, TrashIcon, DownloadIcon, PencilIcon, UploadIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import { CreateFolderDialog } from './CreateFolderDialog';
import { ShareDocumentDialog } from './ShareDocumentDialog';
import { MoveCopyDocumentDialog } from './MoveCopyDocumentDialog';
import { DocumentReminderDialog } from './DocumentReminderDialog';
import { UploadDocumentDialog } from './UploadDocumentDialog';
import { useDashboardStore } from '@/stores/dashboardStore';
import { useAuthStore } from '@/stores/authStore';
import { createDiaryEvent as createDiaryEventRow } from '@/lib/diaryApi';
import {
  HubItem,
  BreadcrumbItem,
  fetchHubItems,
  getFolderPath,
  createFolder,
  uploadDocument,
  deleteDocument,
  deleteFolder,
  updateDocument,
  updateFolder,
  moveDocument,
  moveFolder,
  copyDocument,
  getDocumentDownloadUrl,
  formatFileSize,
  formatDate,
  fetchAllFolders,
  HubFolderRow,
  uploadFolderWithContents,
  FolderUploadFile,
} from '@/lib/hubDocumentsApi';
import { fetchDocumentCategories, initHubCategoriesForAgency, HubCategoryRow } from '@/lib/hubConfigApi';
import { useToast } from '@/hooks/use-toast';

interface DocumentUploadsListProps {
  filterType?: 'all' | 'folder' | 'file';
}

export function DocumentUploadsList({ filterType = 'all' }: DocumentUploadsListProps) {
  const { agencyId, clientId } = useDashboardStore();
  const { user } = useAuthStore();
  const { toast } = useToast();

  // Core state
  const [items, setItems] = useState<HubItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbItem[]>([{ id: null, name: 'Root' }]);
  const [allFolders, setAllFolders] = useState<HubFolderRow[]>([]);

  // Search and filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [filterOpen, setFilterOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');
  
  // Dynamic categories
  const [categories, setCategories] = useState<HubCategoryRow[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(false);

  // Dialog states
  const [createFolderOpen, setCreateFolderOpen] = useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [moveCopyDialogOpen, setMoveCopyDialogOpen] = useState(false);
  const [reminderDialogOpen, setReminderDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  
  const [selectedItem, setSelectedItem] = useState<HubItem | null>(null);
  const [moveCopyMode, setMoveCopyMode] = useState<'move' | 'copy'>('copy');
  const [renameValue, setRenameValue] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);

  const itemsPerPage = 10;

  // Load items from database
  const loadItems = useCallback(async () => {
    if (!agencyId) return;
    
    setLoading(true);
    try {
      const data = await fetchHubItems({
        agencyId,
        clientId,
        folderId: currentFolderId,
        searchQuery: searchQuery || undefined,
        category: selectedCategory !== 'all' ? selectedCategory : undefined,
        filterType,
      });
      setItems(data);

      // Update breadcrumbs
      const path = await getFolderPath(currentFolderId, agencyId, clientId ?? null);
      setBreadcrumbs(path);

      // Load all folders for move/copy dialog
      const folders = await fetchAllFolders(agencyId, clientId ?? null);
      setAllFolders(folders);
    } catch (error) {
      console.error('Error loading items', error);
      toast({
        title: 'Error',
        description: 'Failed to load documents',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [agencyId, currentFolderId, searchQuery, selectedCategory, filterType, toast]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  // Load categories from DB
  useEffect(() => {
    const loadCategories = async () => {
      if (!agencyId) return;
      
      setLoadingCategories(true);
      try {
        await initHubCategoriesForAgency(agencyId);
        const cats = await fetchDocumentCategories(agencyId);
        setCategories(cats);
      } catch (error) {
        console.error('Error loading categories', error);
      } finally {
        setLoadingCategories(false);
      }
    };
    
    void loadCategories();
  }, [agencyId]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedCategory, currentFolderId]);

  // Pagination
  const totalPages = Math.ceil(items.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedItems = items.slice(startIndex, endIndex);

  // Navigate into folder
  const handleFolderClick = (folderId: string) => {
    setCurrentFolderId(folderId);
  };

  // Navigate via breadcrumb
  const handleBreadcrumbClick = (folderId: string | null) => {
    setCurrentFolderId(folderId);
  };

  // Create folder handler
  const handleCreateFolder = async (folderName: string) => {
    if (!agencyId) return;

    const result = await createFolder({
      agencyId,
      clientId: clientId ?? null,
      name: folderName,
      parentFolderId: currentFolderId,
      createdBy: user?.id ?? null,
    });

    if (result) {
      toast({
        title: 'Success',
        description: 'Folder created successfully',
      });
      loadItems();
    } else {
      toast({
        title: 'Error',
        description: 'Failed to create folder',
        variant: 'destructive',
      });
    }
  };

  // Upload document handler
  const handleDocumentUpload = async (data: { 
    file: File; 
    name: string; 
    category: string; 
    isPublic: boolean;
    isDateSensitive?: boolean;
    reminderDate?: string;
  }) => {
    if (!agencyId) return;

    const result = await uploadDocument({
      agencyId,
      clientId: clientId ?? null,
      file: data.file,
      name: data.name,
      folderId: currentFolderId,
      category: data.category,
      isPublic: data.isPublic,
      isDateSensitive: data.isDateSensitive,
      reminderDate: data.reminderDate,
      createdBy: user?.id ?? null,
    });

    if (result) {
      if (data.isDateSensitive && data.reminderDate) {
        const parsed = parseISO(data.reminderDate);
        if (isValid(parsed)) {
          const startDate = setSeconds(setMinutes(setHours(parsed, 9), 0), 0);
          const endDate = addHours(startDate, 1);
          const created = await createDiaryEventRow({
            agency_id: agencyId,
            title: `Document Reminder: ${data.name}`,
            description: `Reminder for document "${data.name}" in The Hub.`,
            category: 'document',
            start_at: startDate.toISOString(),
            end_at: endDate.toISOString(),
            all_day: false,
            location: 'The Hub',
            created_by: user?.id ?? null,
          });
          if (!created) {
            toast({
              title: 'Reminder not added',
              description: 'Document uploaded, but the diary reminder could not be created.',
              variant: 'destructive',
            });
          }
        } else {
          toast({
            title: 'Reminder date invalid',
            description: 'Document uploaded, but the reminder date could not be parsed.',
            variant: 'destructive',
          });
        }
      }
      toast({
        title: 'Success',
        description: 'Document uploaded successfully',
      });
      loadItems();
    } else {
      toast({
        title: 'Error',
        description: 'Failed to upload document',
        variant: 'destructive',
      });
    }
  };

  // Folder upload handler
  const handleFolderUpload = async (data: {
    files: FolderUploadFile[];
    category: string;
    isPublic: boolean;
  }) => {
    if (!agencyId) return;

    const result = await uploadFolderWithContents({
      agencyId,
      clientId: clientId ?? null,
      files: data.files,
      parentFolderId: currentFolderId,
      category: data.category,
      isPublic: data.isPublic,
      createdBy: user?.id ?? null,
    });

    if (result.success) {
      toast({
        title: 'Success',
        description: `Uploaded ${result.filesUploaded} files in ${result.foldersCreated} folders`,
      });
      loadItems();
    } else {
      toast({
        title: 'Partial Upload',
        description: `Uploaded ${result.filesUploaded} files with ${result.errors.length} errors`,
        variant: result.errors.length > 0 ? 'destructive' : 'default',
      });
      loadItems();
    }
  };

  // Delete handler
  const handleDelete = async () => {
    if (!selectedItem) return;

    setIsDeleting(true);
    try {
      let success = false;
      if (selectedItem.type === 'folder') {
        success = await deleteFolder(selectedItem.id);
      } else {
        success = await deleteDocument(selectedItem.id);
      }

      if (success) {
        toast({
          title: 'Success',
          description: `${selectedItem.type === 'folder' ? 'Folder' : 'Document'} deleted successfully`,
        });
        loadItems();
      } else {
        toast({
          title: 'Error',
          description: `Failed to delete ${selectedItem.type}`,
          variant: 'destructive',
        });
      }
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
      setSelectedItem(null);
    }
  };

  // Rename handler
  const handleRename = async () => {
    if (!selectedItem || !renameValue.trim()) return;

    setIsRenaming(true);
    try {
      let result = null;
      if (selectedItem.type === 'folder') {
        result = await updateFolder(selectedItem.id, { name: renameValue.trim() });
      } else {
        result = await updateDocument(selectedItem.id, { name: renameValue.trim() });
      }

      if (result) {
        toast({
          title: 'Success',
          description: 'Renamed successfully',
        });
        loadItems();
      } else {
        toast({
          title: 'Error',
          description: 'Failed to rename',
          variant: 'destructive',
        });
      }
    } finally {
      setIsRenaming(false);
      setRenameDialogOpen(false);
      setSelectedItem(null);
      setRenameValue('');
    }
  };

  // Download handler
  const handleDownload = async (item: HubItem) => {
    if (item.type !== 'file' || !item.storagePath) return;

    const url = await getDocumentDownloadUrl(item.storagePath);
    if (url) {
      window.open(url, '_blank');
    } else {
      toast({
        title: 'Error',
        description: 'Failed to get download link',
        variant: 'destructive',
      });
    }
  };

  // Move/Copy handler
  const handleMoveCopy = async (targetFolderId: string | null) => {
    if (!selectedItem || !agencyId) return;

    let success = false;
    if (moveCopyMode === 'move') {
      if (selectedItem.type === 'folder') {
        success = await moveFolder(selectedItem.id, targetFolderId);
      } else {
        success = await moveDocument(selectedItem.id, targetFolderId);
      }
    } else {
      if (selectedItem.type === 'file') {
        const result = await copyDocument(selectedItem.id, targetFolderId, agencyId);
        success = result !== null;
      }
    }

    if (success) {
      toast({
        title: 'Success',
        description: `${selectedItem.type === 'folder' ? 'Folder' : 'Document'} ${moveCopyMode === 'move' ? 'moved' : 'copied'} successfully`,
      });
      loadItems();
    } else {
      toast({
        title: 'Error',
        description: `Failed to ${moveCopyMode} ${selectedItem.type}`,
        variant: 'destructive',
      });
    }

    setMoveCopyDialogOpen(false);
    setSelectedItem(null);
  };

  return (
    <div className="space-y-6 relative z-10">
      {/* Header with Search and Filters */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex-1 flex items-center gap-2">
          {/* Placeholder for left-aligned content if any */}
        </div>

        <div className="flex items-center gap-2">
          {searchOpen ? (
            <div className="relative animate-in fade-in slide-in-from-right-5 duration-200">
              <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                autoFocus
                placeholder="Search documents..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onBlur={() => !searchQuery && setSearchOpen(false)}
                className="pl-9 h-9 w-64 bg-background text-foreground shadow-sm"
              />
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-9 w-9 hover:bg-transparent"
                onClick={() => {
                  setSearchQuery('');
                  setSearchOpen(false);
                }}
              >
                <XIcon className="h-4 w-4 text-muted-foreground" />
              </Button>
            </div>
          ) : (
            <Button
              variant="outline"
              size="icon"
              className="bg-background text-foreground border-border hover:bg-accent hover:text-accent-foreground h-9 w-9 shadow-sm"
              onClick={() => setSearchOpen(true)}
            >
              <SearchIcon className="h-4 w-4" strokeWidth={1.5} />
            </Button>
          )}

          <Popover open={filterOpen} onOpenChange={setFilterOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="icon" className="bg-background text-foreground border-border hover:bg-accent hover:text-accent-foreground">
                <FilterIcon className="h-5 w-5" strokeWidth={1.5} />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-4 bg-popover text-popover-foreground" align="end">
              <div className="grid gap-4">
                <div className="space-y-2">
                  <h4 className="font-medium leading-none text-foreground">Filter Documents</h4>
                  <p className="text-sm text-muted-foreground">
                    Refine your document list
                  </p>
                </div>
                <div className="grid gap-3">
                  <div className="grid gap-1.5">
                    <Label htmlFor="category" className="text-xs font-medium text-foreground">Category</Label>
                    <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                      <SelectTrigger id="category" className="h-8 w-full bg-background text-foreground border-border">
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent className="bg-popover text-popover-foreground">
                        <SelectItem value="all">All Categories</SelectItem>
                        {loadingCategories ? (
                          <SelectItem value="loading" disabled>Loading...</SelectItem>
                        ) : (
                          categories.map((cat) => (
                            <SelectItem key={cat.id} value={cat.slug}>{cat.name}</SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor="uploaded-by" className="text-xs font-medium text-foreground">Uploaded By</Label>
                    <Input 
                      id="uploaded-by" 
                      placeholder="Filter by user" 
                      className="h-8 bg-background text-foreground border-border" 
                    />
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor="date" className="text-xs font-medium text-foreground">Date</Label>
                    <Select>
                      <SelectTrigger id="date" className="h-8 w-full bg-background text-foreground border-border">
                        <SelectValue placeholder="Select date range" />
                      </SelectTrigger>
                      <SelectContent className="bg-popover text-popover-foreground">
                        <SelectItem value="all">All Time</SelectItem>
                        <SelectItem value="today">Today</SelectItem>
                        <SelectItem value="week">Last 7 Days</SelectItem>
                        <SelectItem value="month">Last 30 Days</SelectItem>
                        <SelectItem value="year">This Year</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="ghost" size="sm" onClick={() => setFilterOpen(false)} className="h-8 text-xs">Cancel</Button>
                  <Button size="sm" onClick={() => setFilterOpen(false)} className="h-8 text-xs bg-primary text-primary-foreground hover:bg-primary/90">Apply Filters</Button>
                </div>
              </div>
            </PopoverContent>
          </Popover>

          <Button 
            variant="outline" 
            className="bg-background text-foreground border-border hover:bg-accent hover:text-accent-foreground gap-2"
            onClick={() => setCreateFolderOpen(true)}
          >
            <FolderPlusIcon className="h-4 w-4" strokeWidth={1.5} />
            New Folder
          </Button>

          <Button className="bg-primary text-primary-foreground hover:bg-primary/90" onClick={() => setUploadDialogOpen(true)}>
            <PlusIcon className="mr-2 h-5 w-5" strokeWidth={1.5} />
            Upload New Doc
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="bg-background text-foreground border-border hover:bg-accent hover:text-accent-foreground">
                Export <ChevronDownIcon className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-popover text-popover-foreground">
              <DropdownMenuItem>Export as CSV</DropdownMenuItem>
              <DropdownMenuItem>Export as PDF</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Breadcrumb Navigation */}
      {breadcrumbs.length > 1 && (
        <div className="flex items-center gap-1 text-sm text-muted-foreground mb-4">
          {breadcrumbs.map((crumb, index) => (
            <div key={crumb.id ?? 'root'} className="flex items-center gap-1">
              {index > 0 && <ChevronRightIcon className="h-4 w-4" />}
              <button
                onClick={() => handleBreadcrumbClick(crumb.id)}
                className={cn(
                  "hover:text-foreground transition-colors",
                  index === breadcrumbs.length - 1 ? "text-foreground font-medium" : ""
                )}
              >
                {index === 0 ? (
                  <HomeIcon className="h-4 w-4" />
                ) : (
                  crumb.name
                )}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Documents Table */}
      <div className="rounded-lg border border-border bg-card">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2Icon className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableHead className="w-[40px] text-center">
                    <input type="checkbox" className="form-checkbox h-4 w-4 text-primary rounded border-gray-300" />
                  </TableHead>
                  <TableHead className="w-[40px] text-center"></TableHead>
                  <TableHead className="text-foreground">Name</TableHead>
                  <TableHead className="text-foreground">Date Modified</TableHead>
                  <TableHead className="text-foreground">Category</TableHead>
                  <TableHead className="text-foreground">Size</TableHead>
                  <TableHead className="text-right text-foreground">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedItems.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                      {searchQuery ? 'No items match your search' : 'No files or folders yet. Upload a document or create a folder to get started.'}
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedItems.map((item) => (
                    <TableRow 
                      key={item.id} 
                      className="hover:bg-accent/50 transition-colors duration-150 cursor-pointer"
                      onClick={() => item.type === 'folder' && handleFolderClick(item.id)}
                    >
                      <TableCell className="w-[40px] text-center" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          className="form-checkbox h-4 w-4 text-primary rounded border-gray-300"
                        />
                      </TableCell>
                      <TableCell className="w-[40px] text-center">
                        {item.type === 'folder' ? (
                          <FolderIcon className="h-4 w-4 text-blue-500 fill-blue-500/20" strokeWidth={1.5} />
                        ) : (
                          <FileTextIcon className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
                        )}
                      </TableCell>
                      <TableCell className="text-foreground font-medium">{item.name}</TableCell>
                      <TableCell className="text-muted-foreground">{formatDate(item.updatedAt)}</TableCell>
                      <TableCell className="text-foreground">{item.category}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {item.type === 'file' && item.fileSize ? formatFileSize(item.fileSize) : '-'}
                      </TableCell>
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="icon"
                              className="bg-transparent text-foreground hover:bg-accent hover:text-accent-foreground"
                            >
                              <MoreHorizontalIcon className="h-4 w-4" strokeWidth={1.5} />
                              <span className="sr-only">Open menu</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-popover text-popover-foreground">
                            <DropdownMenuLabel className="text-foreground">Actions</DropdownMenuLabel>
                            {item.type === 'folder' ? (
                              <DropdownMenuItem 
                                className="text-foreground hover:bg-accent hover:text-accent-foreground"
                                onSelect={() => handleFolderClick(item.id)}
                              >
                                <FolderIcon className="mr-2 h-4 w-4" /> Open
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem 
                                className="text-foreground hover:bg-accent hover:text-accent-foreground"
                                onSelect={() => handleDownload(item)}
                              >
                                <DownloadIcon className="mr-2 h-4 w-4" /> Download
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem 
                              className="text-foreground hover:bg-accent hover:text-accent-foreground"
                              onSelect={() => {
                                setSelectedItem(item);
                                setRenameValue(item.name);
                                setRenameDialogOpen(true);
                              }}
                            >
                              <PencilIcon className="mr-2 h-4 w-4" /> Rename
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              className="text-foreground hover:bg-accent hover:text-accent-foreground"
                              onSelect={() => {
                                setSelectedItem(item);
                                setShareDialogOpen(true);
                              }}
                            >
                              <ShareIcon className="mr-2 h-4 w-4" /> Share
                            </DropdownMenuItem>
                            {item.type === 'file' && (
                              <DropdownMenuItem 
                                className="text-foreground hover:bg-accent hover:text-accent-foreground"
                                onSelect={() => {
                                  setSelectedItem(item);
                                  setMoveCopyMode('copy');
                                  setMoveCopyDialogOpen(true);
                                }}
                              >
                                <CopyIcon className="mr-2 h-4 w-4" /> Copy to...
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem 
                              className="text-foreground hover:bg-accent hover:text-accent-foreground"
                              onSelect={() => {
                                setSelectedItem(item);
                                setMoveCopyMode('move');
                                setMoveCopyDialogOpen(true);
                              }}
                            >
                              <MoveIcon className="mr-2 h-4 w-4" /> Move to...
                            </DropdownMenuItem>
                            {item.type === 'file' && (
                              <DropdownMenuItem 
                                className="text-foreground hover:bg-accent hover:text-accent-foreground"
                                onSelect={() => {
                                  setSelectedItem(item);
                                  setReminderDialogOpen(true);
                                }}
                              >
                                <BellIcon className="mr-2 h-4 w-4" /> Set Reminder
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              className="text-destructive hover:bg-destructive hover:text-destructive-foreground"
                              onSelect={() => {
                                setSelectedItem(item);
                                setDeleteDialogOpen(true);
                              }}
                            >
                              <TrashIcon className="mr-2 h-4 w-4" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </div>
      </div>

      {/* Pagination */}
      {items.length > 0 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>Records {startIndex + 1}-{Math.min(endIndex, items.length)} of {items.length} records found</span>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeftIcon className="h-4 w-4" />
            </Button>
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map(page => (
              <Button
                key={page}
                variant={currentPage === page ? 'default' : 'ghost'}
                size="icon"
                onClick={() => setCurrentPage(page)}
              >
                {page}
              </Button>
            ))}
            {totalPages > 5 && <span>...</span>}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages || totalPages === 0}
            >
              <ChevronRightIcon className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Dialogs */}
      <CreateFolderDialog 
        open={createFolderOpen} 
        onOpenChange={setCreateFolderOpen} 
        onCreate={handleCreateFolder} 
      />

      <UploadDocumentDialog 
        open={uploadDialogOpen} 
        onOpenChange={setUploadDialogOpen} 
        onUpload={handleDocumentUpload}
        onFolderUpload={handleFolderUpload}
      />

      {selectedItem && (
        <>
          <ShareDocumentDialog 
            open={shareDialogOpen} 
            onOpenChange={(open) => {
              setShareDialogOpen(open);
              if (!open) setSelectedItem(null);
            }} 
            documentName={selectedItem.name} 
          />
          <MoveCopyDocumentDialog 
            open={moveCopyDialogOpen} 
            onOpenChange={(open) => {
              setMoveCopyDialogOpen(open);
              if (!open) setSelectedItem(null);
            }} 
            documentName={selectedItem.name} 
            mode={moveCopyMode}
            folders={allFolders}
            currentFolderId={currentFolderId}
            onConfirm={handleMoveCopy}
          />
          <DocumentReminderDialog 
            open={reminderDialogOpen} 
            onOpenChange={(open) => {
              setReminderDialogOpen(open);
              if (!open) setSelectedItem(null);
            }} 
            documentName={selectedItem.name} 
          />
        </>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{selectedItem?.name}". 
              {selectedItem?.type === 'folder' && ' All contents inside this folder will also be deleted.'}
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete} 
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? <Loader2Icon className="h-4 w-4 animate-spin mr-2" /> : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Rename Dialog */}
      <AlertDialog open={renameDialogOpen} onOpenChange={setRenameDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Rename {selectedItem?.type}</AlertDialogTitle>
            <AlertDialogDescription>
              Enter a new name for "{selectedItem?.name}"
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Input
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              placeholder="Enter new name"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleRename();
              }}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isRenaming}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleRename} 
              disabled={isRenaming || !renameValue.trim()}
            >
              {isRenaming ? <Loader2Icon className="h-4 w-4 animate-spin mr-2" /> : null}
              Rename
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
