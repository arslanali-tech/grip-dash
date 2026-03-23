import React, { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UploadCloudIcon, FileIcon, FolderIcon, Loader2Icon, PlusIcon } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { SingleDatePicker } from './SingleDatePicker';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { format, parseISO } from 'date-fns';
import { useDashboardStore } from '@/stores/dashboardStore';
import { fetchDocumentCategories, initHubCategoriesForAgency, createHubCategory, generateSlug, HubCategoryRow } from '@/lib/hubConfigApi';
import { processFolderInput, FolderUploadFile } from '@/lib/hubDocumentsApi';

interface UploadDocumentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpload: (data: { 
    file: File; 
    name: string; 
    category: string; 
    isPublic: boolean;
    isDateSensitive?: boolean;
    reminderDate?: string;
  }) => void;
  onFolderUpload?: (data: {
    files: FolderUploadFile[];
    category: string;
    isPublic: boolean;
  }) => void;
}

export function UploadDocumentDialog({ open, onOpenChange, onUpload, onFolderUpload }: UploadDocumentDialogProps) {
  const { agencyId } = useDashboardStore();
  
  // Upload mode: file or folder
  const [uploadMode, setUploadMode] = useState<'file' | 'folder'>('file');
  
  // File upload state
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState('');
  
  // Folder upload state
  const [folderFiles, setFolderFiles] = useState<FolderUploadFile[]>([]);
  const [folderName, setFolderName] = useState('');
  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number; currentFile: string } | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  
  // Common state
  const [category, setCategory] = useState('General');
  const [isPublic, setIsPublic] = useState(false);
  const [isDateSensitive, setIsDateSensitive] = useState(false);
  const [reminderDate, setReminderDate] = useState('');
  
  // Dynamic categories
  const [categories, setCategories] = useState<HubCategoryRow[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [showAddCategory, setShowAddCategory] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  // Load categories from DB
  useEffect(() => {
    const loadCategories = async () => {
      if (!agencyId || !open) return;
      
      setLoadingCategories(true);
      try {
        // Initialize default categories if needed
        await initHubCategoriesForAgency(agencyId);
        
        const cats = await fetchDocumentCategories(agencyId);
        setCategories(cats);
        
        // Set default category if available
        if (cats.length > 0 && !cats.find(c => c.name === category)) {
          setCategory(cats[0].name);
        }
      } catch (error) {
        console.error('Error loading categories', error);
      } finally {
        setLoadingCategories(false);
      }
    };
    
    void loadCategories();
  }, [agencyId, open]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      setName(selectedFile.name);
    }
  };

  const handleFolderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = processFolderInput(e.target.files);
      setFolderFiles(files);
      
      // Extract root folder name from first file's path
      if (files.length > 0) {
        const firstPath = files[0].relativePath;
        const rootFolder = firstPath.split('/')[0];
        setFolderName(rootFolder);
      }
    }
  };

  const handleAddCategory = async () => {
    if (!agencyId || !newCategoryName.trim()) return;
    
    const result = await createHubCategory({
      agencyId,
      name: newCategoryName.trim(),
      slug: generateSlug(newCategoryName.trim()),
      type: 'document',
    });
    
    if (result) {
      setCategories(prev => [...prev, result]);
      setCategory(result.name);
      setNewCategoryName('');
      setShowAddCategory(false);
    }
  };

  const handleUpload = () => {
    if (file && name && (!isDateSensitive || reminderDate)) {
      onUpload({ 
        file, 
        name, 
        category, 
        isPublic,
        isDateSensitive,
        reminderDate: isDateSensitive ? reminderDate : undefined
      });
      resetForm();
      onOpenChange(false);
    }
  };

  const handleFolderUpload = async () => {
    if (folderFiles.length === 0 || !onFolderUpload) return;
    
    setIsUploading(true);
    try {
      await onFolderUpload({
        files: folderFiles,
        category,
        isPublic,
      });
      resetForm();
      onOpenChange(false);
    } finally {
      setIsUploading(false);
      setUploadProgress(null);
    }
  };

  const resetForm = () => {
    setFile(null);
    setName('');
    setFolderFiles([]);
    setFolderName('');
    setCategory(categories.length > 0 ? categories[0].name : 'General');
    setIsPublic(false);
    setIsDateSensitive(false);
    setReminderDate('');
    setUploadProgress(null);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const totalFolderSize = folderFiles.reduce((acc, f) => acc + f.file.size, 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px] bg-card text-card-foreground">
        <DialogHeader>
          <DialogTitle className="text-foreground text-xl flex items-center gap-2">
            <UploadCloudIcon className="h-5 w-5 text-primary" strokeWidth={1.5} />
            Upload Document
          </DialogTitle>
        </DialogHeader>
        
        <Tabs value={uploadMode} onValueChange={(v) => setUploadMode(v as 'file' | 'folder')} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="file" className="gap-2">
              <FileIcon className="h-4 w-4" /> Single File
            </TabsTrigger>
            <TabsTrigger value="folder" className="gap-2" disabled={!onFolderUpload}>
              <FolderIcon className="h-4 w-4" /> Folder
            </TabsTrigger>
          </TabsList>

          <TabsContent value="file" className="space-y-6 mt-0">
            {/* File Drop Area */}
            <div 
              className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:bg-muted/30 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                onChange={handleFileChange} 
              />
              {file ? (
                <div className="flex flex-col items-center gap-2">
                  <FileIcon className="h-10 w-10 text-primary" strokeWidth={1.5} />
                  <p className="text-sm font-medium text-foreground">{file.name}</p>
                  <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="mt-2 h-6 text-xs text-destructive hover:text-destructive hover:bg-destructive/10" 
                    onClick={(e) => { e.stopPropagation(); setFile(null); setName(''); }}
                  >
                    Remove
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <UploadCloudIcon className="h-10 w-10 text-muted-foreground" strokeWidth={1.5} />
                  <p className="text-sm font-medium text-foreground">Click to upload or drag and drop</p>
                  <p className="text-xs text-muted-foreground">PDF, DOC, XLS, JPG (max 50MB)</p>
                </div>
              )}
            </div>

            {/* Document Name */}
            <div className="space-y-2">
              <Label htmlFor="doc-name" className="text-foreground">Document Name</Label>
              <Input 
                id="doc-name" 
                value={name} 
                onChange={(e) => setName(e.target.value)} 
                placeholder="e.g. Q1 Financial Report"
                className="bg-background text-foreground"
              />
            </div>
          </TabsContent>

          <TabsContent value="folder" className="space-y-6 mt-0">
            {/* Folder Drop Area */}
            <div 
              className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:bg-muted/30 transition-colors"
              onClick={() => folderInputRef.current?.click()}
            >
              <input 
                type="file" 
                ref={folderInputRef} 
                className="hidden" 
                onChange={handleFolderChange}
                {...{ webkitdirectory: '', directory: '' } as React.InputHTMLAttributes<HTMLInputElement>}
                multiple
              />
              {folderFiles.length > 0 ? (
                <div className="flex flex-col items-center gap-2">
                  <FolderIcon className="h-10 w-10 text-primary fill-primary/20" strokeWidth={1.5} />
                  <p className="text-sm font-medium text-foreground">{folderName}</p>
                  <p className="text-xs text-muted-foreground">
                    {folderFiles.length} files • {formatFileSize(totalFolderSize)}
                  </p>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="mt-2 h-6 text-xs text-destructive hover:text-destructive hover:bg-destructive/10" 
                    onClick={(e) => { e.stopPropagation(); setFolderFiles([]); setFolderName(''); }}
                  >
                    Remove
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <FolderIcon className="h-10 w-10 text-muted-foreground" strokeWidth={1.5} />
                  <p className="text-sm font-medium text-foreground">Click to select a folder</p>
                  <p className="text-xs text-muted-foreground">All files and subfolders will be uploaded</p>
                </div>
              )}
            </div>

            {/* Upload Progress */}
            {uploadProgress && (
              <div className="space-y-2">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Uploading: {uploadProgress.currentFile}</span>
                  <span>{uploadProgress.current} / {uploadProgress.total}</span>
                </div>
                <Progress value={(uploadProgress.current / uploadProgress.total) * 100} />
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Common Options */}
        <div className="space-y-4 pt-2">
          {/* Category */}
          <div className="space-y-2">
            <Label htmlFor="doc-category" className="text-foreground">Category</Label>
            {loadingCategories ? (
              <div className="flex items-center gap-2 h-10 px-3 text-sm text-muted-foreground">
                <Loader2Icon className="h-4 w-4 animate-spin" />
                Loading categories...
              </div>
            ) : showAddCategory ? (
              <div className="flex gap-2">
                <Input
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="New category name"
                  className="bg-background text-foreground"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleAddCategory();
                    if (e.key === 'Escape') setShowAddCategory(false);
                  }}
                />
                <Button size="sm" onClick={handleAddCategory}>Add</Button>
                <Button size="sm" variant="ghost" onClick={() => setShowAddCategory(false)}>Cancel</Button>
              </div>
            ) : (
              <div className="flex gap-2">
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger id="doc-category" className="bg-background text-foreground border-border flex-1">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover text-popover-foreground">
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.name}>{cat.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button size="icon" variant="outline" onClick={() => setShowAddCategory(true)} title="Add new category">
                  <PlusIcon className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>

          {/* Public Toggle */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="is-public" className="text-foreground">Public Document</Label>
              <p className="text-xs text-muted-foreground">Visible to all staff members</p>
            </div>
            <Switch 
              id="is-public" 
              checked={isPublic} 
              onCheckedChange={setIsPublic} 
            />
          </div>

          {/* Date Sensitive - only for file upload */}
          {uploadMode === 'file' && (
            <>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="is-date-sensitive" className="text-foreground">Date Sensitive</Label>
                  <p className="text-xs text-muted-foreground">Set a reminder date for this document</p>
                </div>
                <Switch 
                  id="is-date-sensitive" 
                  checked={isDateSensitive} 
                  onCheckedChange={setIsDateSensitive} 
                />
              </div>

              {isDateSensitive && (
                <div className="space-y-2 animate-in slide-in-from-top-2">
                  <Label htmlFor="reminder-date" className="text-foreground">Reminder Date</Label>
                  <SingleDatePicker
                    date={reminderDate ? parseISO(reminderDate) : undefined}
                    onSelect={(date) => setReminderDate(date ? format(date, 'yyyy-MM-dd') : '')}
                    placeholder="Select date"
                  />
                </div>
              )}
            </>
          )}
        </div>

        <DialogFooter className="flex justify-between sm:justify-between pt-4">
          <Button 
            variant="ghost" 
            onClick={() => onOpenChange(false)}
            className="bg-transparent text-foreground hover:bg-accent hover:text-accent-foreground"
            disabled={isUploading}
          >
            Cancel
          </Button>
          {uploadMode === 'file' ? (
              <Button
                onClick={handleUpload}
                disabled={!file || (isDateSensitive && !reminderDate)}
                className="bg-primary text-primary-foreground hover:bg-primary/90"
              >
              Upload File
            </Button>
          ) : (
            <Button 
              onClick={handleFolderUpload} 
              disabled={folderFiles.length === 0 || isUploading} 
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {isUploading ? (
                <>
                  <Loader2Icon className="h-4 w-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                `Upload Folder (${folderFiles.length} files)`
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
