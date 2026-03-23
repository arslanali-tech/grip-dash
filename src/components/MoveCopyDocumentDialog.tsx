import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CopyIcon, MoveIcon, FolderIcon, Loader2Icon } from 'lucide-react';
import { HubFolderRow } from '@/lib/hubDocumentsApi';

interface MoveCopyDocumentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentName: string;
  mode: 'move' | 'copy';
  folders?: HubFolderRow[];
  currentFolderId?: string | null;
  onConfirm?: (targetFolderId: string | null) => void;
}

export function MoveCopyDocumentDialog({ 
  open, 
  onOpenChange, 
  documentName, 
  mode,
  folders = [],
  currentFolderId,
  onConfirm
}: MoveCopyDocumentDialogProps) {
  const [destination, setDestination] = useState<string>('root');
  const [isLoading, setIsLoading] = useState(false);

  // Reset destination when dialog opens
  useEffect(() => {
    if (open) {
      setDestination('root');
    }
  }, [open]);

  // Build folder tree for display
  const buildFolderPath = (folderId: string): string => {
    const folder = folders.find(f => f.id === folderId);
    if (!folder) return '';
    
    if (folder.parent_folder_id) {
      const parentPath = buildFolderPath(folder.parent_folder_id);
      return parentPath ? `${parentPath} / ${folder.name}` : folder.name;
    }
    return folder.name;
  };

  const handleAction = async () => {
    if (onConfirm) {
      setIsLoading(true);
      try {
        const targetFolderId = destination === 'root' ? null : destination;
        await onConfirm(targetFolderId);
      } finally {
        setIsLoading(false);
      }
    } else {
      console.log(`${mode === 'move' ? 'Moving' : 'Copying'} ${documentName} to ${destination}`);
      onOpenChange(false);
    }
  };

  // Filter out current folder for move operation (can't move to same location)
  const availableFolders = folders.filter(f => f.id !== currentFolderId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] bg-card text-card-foreground">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            {mode === 'move' ? <MoveIcon className="h-5 w-5 text-primary" /> : <CopyIcon className="h-5 w-5 text-primary" />}
            {mode === 'move' ? 'Move' : 'Copy'} "{documentName}"
          </DialogTitle>
        </DialogHeader>
        
        <div className="py-4 space-y-4">
          <div className="space-y-2">
            <Label className="text-foreground">Destination Folder</Label>
            <Select value={destination} onValueChange={setDestination}>
              <SelectTrigger className="bg-background text-foreground border-border">
                <SelectValue placeholder="Select folder..." />
              </SelectTrigger>
              <SelectContent className="bg-popover text-popover-foreground max-h-60">
                <SelectItem value="root">
                  <div className="flex items-center gap-2">
                    <FolderIcon className="h-4 w-4 text-blue-500" />
                    / (Root)
                  </div>
                </SelectItem>
                {availableFolders.map((folder) => (
                  <SelectItem key={folder.id} value={folder.id}>
                    <div className="flex items-center gap-2">
                      <FolderIcon className="h-4 w-4 text-blue-500" />
                      / {buildFolderPath(folder.id)}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {availableFolders.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No other folders available. Create a folder first to {mode} items.
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="text-foreground hover:bg-accent" disabled={isLoading}>
            Cancel
          </Button>
          <Button 
            onClick={handleAction} 
            className="bg-primary text-primary-foreground hover:bg-primary/90"
            disabled={isLoading}
          >
            {isLoading && <Loader2Icon className="h-4 w-4 animate-spin mr-2" />}
            {mode === 'move' ? 'Move' : 'Copy'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
