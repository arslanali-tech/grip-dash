import { useState, useRef, useEffect, useMemo } from 'react';
import { XIcon, MapPinIcon, CalendarIcon, EditIcon, FileTextIcon, PoundSterlingIcon, CheckCircle2Icon, PlusIcon, SaveIcon, UploadCloudIcon, FileIcon, DownloadIcon, TrashIcon, AlertTriangleIcon, UserIcon, PhoneIcon, MailIcon, MoreHorizontalIcon, ShareIcon, CopyIcon, MoveIcon, BellIcon, EyeIcon, PencilIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Prospect, ProspectingStatus } from '@/stores/dashboardStore';
import { ProspectStatusBadge } from './ProspectStatusBadge';
import { cn } from '@/lib/utils';
import { deleteProspect, updateProspect } from '@/lib/dashboardApi';
import { useDashboardStore } from '@/stores/dashboardStore';
import { encodeProspectNotes } from '@/lib/prospectNotes';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ShareDocumentDialog } from './ShareDocumentDialog';
import { MoveCopyDocumentDialog } from './MoveCopyDocumentDialog';
import { DocumentReminderDialog } from './DocumentReminderDialog';

interface ProspectDetailViewFullProps {
  prospect: Prospect;
  onClose: () => void;
  onStatusChange?: (prospectId: string, newStatus: ProspectingStatus) => void;
}

interface ProspectNote {
  id: string;
  content: string;
  createdBy: string;
  createdAt: string;
}

interface ProspectDocument {
  id: string;
  name: string;
  type: string;
  size: string;
  uploadedBy: string;
  uploadedAt: string;
  url: string;
}

const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

const readFileAsDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
        return;
      }
      reject(new Error('Invalid file data.'));
    };
    reader.onerror = () => reject(reader.error ?? new Error('Failed to read file.'));
    reader.readAsDataURL(file);
  });

const mapPhotoUrlsToDocuments = (
  photoUrls: string[] | undefined,
  prospect: Prospect
): ProspectDocument[] => {
  if (!Array.isArray(photoUrls) || photoUrls.length === 0) return [];
  return photoUrls
    .map((url) => `${url ?? ''}`.trim())
    .filter((url) => url.length > 0)
    .map((url, index) => ({
      id: `photo-${prospect.id}-${index}`,
      name: `Photo ${index + 1}`,
      type: 'IMAGE',
      size: '--',
      uploadedBy: prospect.prospector,
      uploadedAt: prospect.date,
      url,
    }));
};

const mapProspectNotesToHistory = (prospect: Prospect): ProspectNote[] => {
  if (Array.isArray(prospect.noteHistory) && prospect.noteHistory.length > 0) {
    return prospect.noteHistory.map((entry, index) => ({
      id: `note-${prospect.id}-${index}-${entry.createdAt ?? 'na'}`,
      content: entry.content,
      createdBy: entry.createdBy?.trim() || prospect.prospector || 'Unknown',
      createdAt: entry.createdAt || prospect.date || new Date().toISOString(),
    }));
  }

  if (prospect.notes?.trim()) {
    return [
      {
        id: `note-${prospect.id}-fallback`,
        content: prospect.notes.trim(),
        createdBy: prospect.prospector || 'Unknown',
        createdAt: prospect.date || new Date().toISOString(),
      },
    ];
  }

  return [];
};

const formatProspectStatusLabel = (status: string): string =>
  status
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

const getProspectStatusDotColor = (status: string): string => {
  switch (status) {
    case 'canvassed':
      return 'bg-indigo-600';
    case 'not-available':
      return 'bg-gray-600';
    case 'opportunities':
      return 'bg-amber-500';
    case 'potential-seller':
      return 'bg-fuchsia-600';
    case 'sold-oa':
      return 'bg-rose-600';
    case 'valuation':
      return 'bg-emerald-600';
    default:
      return 'bg-blue-500';
  }
};

const getProspectStatusTextColor = (status: string): string => {
  switch (status) {
    case 'canvassed':
      return 'text-indigo-600';
    case 'not-available':
      return 'text-gray-600';
    case 'opportunities':
      return 'text-amber-600';
    case 'potential-seller':
      return 'text-fuchsia-600';
    case 'sold-oa':
      return 'text-rose-600';
    case 'valuation':
      return 'text-emerald-600';
    default:
      return 'text-blue-600';
  }
};

export function ProspectDetailViewFull({ prospect, onClose, onStatusChange }: ProspectDetailViewFullProps) {
  const { agencyId, clientId, loadProspects } = useDashboardStore();
  const [activeTab, setActiveTab] = useState('notes');
  const [newNote, setNewNote] = useState('');
  const [noteHistory, setNoteHistory] = useState<ProspectNote[]>(
    () => mapProspectNotesToHistory(prospect)
  );
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [currentStatus, setCurrentStatus] = useState(prospect.stage);
  const [isEditMode, setIsEditMode] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [isDeletingProspect, setIsDeletingProspect] = useState(false);
  const [documents, setDocuments] = useState<ProspectDocument[]>(
    () => mapPhotoUrlsToDocuments(prospect.photos, prospect)
  );
  const [isSavingPhotos, setIsSavingPhotos] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [editForm, setEditForm] = useState({
    address: prospect.address ?? '',
    priceEst: prospect.priceEst?.toString() ?? '',
    hotCold: prospect.hotCold ?? 'incomplete',
    type: prospect.type ?? 'for-sale',
    prospector: prospect.prospector ?? '',
    notes: prospect.notes ?? '',
  });

  // Document Action States
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [moveCopyDialogOpen, setMoveCopyDialogOpen] = useState(false);
  const [reminderDialogOpen, setReminderDialogOpen] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<ProspectDocument | null>(null);
  const [moveCopyMode, setMoveCopyMode] = useState<'move' | 'copy'>('copy');
  const statusHistoryTimeline = useMemo(() => {
    const base =
      prospect.statusHistory && prospect.statusHistory.length > 0
        ? prospect.statusHistory
        : [
            {
              status: prospect.stage,
              changedAt: prospect.date || new Date().toISOString(),
              changedBy: prospect.prospector || 'System',
            },
          ];

    return base
      .map((entry) => ({
        status: `${entry.status ?? prospect.stage}`.trim().toLowerCase(),
        changedAt: entry.changedAt || prospect.date || new Date().toISOString(),
        changedBy: entry.changedBy || prospect.prospector || 'System',
      }))
      .sort((a, b) => new Date(b.changedAt).getTime() - new Date(a.changedAt).getTime());
  }, [prospect.statusHistory, prospect.stage, prospect.date, prospect.prospector]);

  useEffect(() => {
    setEditForm({
      address: prospect.address ?? '',
      priceEst: prospect.priceEst?.toString() ?? '',
      hotCold: prospect.hotCold ?? 'incomplete',
      type: prospect.type ?? 'for-sale',
      prospector: prospect.prospector ?? '',
      notes: prospect.notes ?? '',
    });
    setCurrentStatus(prospect.stage);
    setNoteHistory(mapProspectNotesToHistory(prospect));
    setDocuments(mapPhotoUrlsToDocuments(prospect.photos, prospect));
  }, [
    prospect.id,
    prospect.stage,
    prospect.notes,
    prospect.noteHistory,
    prospect.photos,
    prospect.prospector,
    prospect.date,
  ]);

  const handleAddNote = () => {
    if (!newNote.trim()) return;
    if (isSavingNotes) return;

    const previousHistory = noteHistory;
    const note: ProspectNote = {
      id: `n${Date.now()}`,
      content: newNote.trim(),
      createdBy: prospect.prospector,
      createdAt: new Date().toISOString(),
    };

    const nextHistory = [...previousHistory, note];
    setNoteHistory(nextHistory);
    setNewNote('');

    void (async () => {
      setIsSavingNotes(true);
      const encodedNotes = encodeProspectNotes(
        note.content,
        prospect.agent,
        documents.map((doc) => doc.url),
        nextHistory.map((entry) => ({
          content: entry.content,
          createdBy: entry.createdBy,
          createdAt: entry.createdAt,
        })),
        prospect.statusHistory
      );

      const updated = await updateProspect(prospect.id, { notes: encodedNotes });
      if (!updated) {
        alert('Failed to save note.');
        setNoteHistory(previousHistory);
        setNewNote(note.content);
        setIsSavingNotes(false);
        return;
      }

      if (agencyId) {
        await loadProspects(agencyId, clientId ?? undefined);
      }
      setIsSavingNotes(false);
    })();
  };

  const handleSaveDetails = async () => {
    const cleanedPrice = editForm.priceEst.replace(/[^0-9.]/g, '');
    const priceEstValue = cleanedPrice ? Number(cleanedPrice) : 0;
    const updated = await updateProspect(prospect.id, {
      address: editForm.address.trim() || undefined,
      price_est: Number.isNaN(priceEstValue) ? 0 : priceEstValue,
      hot_cold: editForm.hotCold,
      type: editForm.type,
      prospector: editForm.prospector.trim() || undefined,
      notes: encodeProspectNotes(
        editForm.notes,
        prospect.agent,
        documents.map((doc) => doc.url),
        noteHistory.map((entry) => ({
          content: entry.content,
          createdBy: entry.createdBy,
          createdAt: entry.createdAt,
        })),
        prospect.statusHistory
      ),
    });

    if (!updated) {
      alert('Failed to update prospect.');
      return;
    }

    if (agencyId) {
      await loadProspects(agencyId, clientId ?? undefined);
    }
    setIsEditMode(false);
  };

  const handleCancelEdit = () => {
    setEditForm({
      address: prospect.address ?? '',
      priceEst: prospect.priceEst?.toString() ?? '',
      hotCold: prospect.hotCold ?? 'incomplete',
      type: prospect.type ?? 'for-sale',
      prospector: prospect.prospector ?? '',
      notes: prospect.notes ?? '',
    });
    setIsEditMode(false);
  };

  const savePhotosToProspect = async (nextDocuments: ProspectDocument[]): Promise<boolean> => {
    if (isSavingPhotos) return false;
    setIsSavingPhotos(true);

    const encodedNotes = encodeProspectNotes(
      isEditMode ? editForm.notes : prospect.notes,
      prospect.agent,
      nextDocuments.map((doc) => doc.url),
      noteHistory.map((entry) => ({
        content: entry.content,
        createdBy: entry.createdBy,
        createdAt: entry.createdAt,
      })),
      prospect.statusHistory
    );
    const updated = await updateProspect(prospect.id, { notes: encodedNotes });
    if (!updated) {
      alert('Failed to save prospect photo(s).');
      setIsSavingPhotos(false);
      return false;
    }

    if (agencyId) {
      await loadProspects(agencyId, clientId ?? undefined);
    }
    setIsSavingPhotos(false);
    return true;
  };

  const handleFileUpload = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    if (isSavingPhotos) return;

    void (async () => {
      const selected = Array.from(files).filter((file) => file.type.startsWith('image/'));
      if (selected.length === 0) {
        alert('Please choose image files only.');
        return;
      }

      const oversized = selected.find((file) => file.size > MAX_PHOTO_BYTES);
      if (oversized) {
        alert(`"${oversized.name}" is larger than 5MB.`);
        return;
      }

      try {
        const newDocuments: ProspectDocument[] = [];
        for (const file of selected) {
          const dataUrl = await readFileAsDataUrl(file);
          newDocuments.push({
            id: `photo-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            name: file.name,
            type: file.name.split('.').pop()?.toUpperCase() || 'IMAGE',
            size: `${(file.size / 1024 / 1024).toFixed(2)} MB`,
            uploadedBy: prospect.prospector,
            uploadedAt: new Date().toISOString(),
            url: dataUrl,
          });
        }

        const nextDocuments = [...documents, ...newDocuments];
        setDocuments(nextDocuments);
        const saved = await savePhotosToProspect(nextDocuments);
        if (!saved) {
          setDocuments(documents);
        }
      } catch (error) {
        console.error('Failed to upload prospect photo(s)', error);
        alert('Failed to upload selected photo(s).');
      }
    })();
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (isSavingPhotos) return;
    handleFileUpload(e.dataTransfer.files);
  };

  const handleDeleteDocument = (docId: string) => {
    if (isSavingPhotos) return;
    void (async () => {
      const nextDocuments = documents.filter((doc) => doc.id !== docId);
      setDocuments(nextDocuments);
      const saved = await savePhotosToProspect(nextDocuments);
      if (!saved) {
        setDocuments(documents);
      }
    })();
  };

  const handleDeleteProspect = async () => {
    if (isDeletingProspect) return;

    setIsDeletingProspect(true);
    const deleted = await deleteProspect(prospect.id);

    if (!deleted) {
      alert('Failed to delete prospect. Please try again.');
      setIsDeletingProspect(false);
      return;
    }

    if (agencyId) {
      await loadProspects(agencyId, clientId ?? undefined);
    }

    setDeleteConfirmOpen(false);
    setIsDeletingProspect(false);
    onClose();
  };

  const displayType = isEditMode ? editForm.type : prospect.type;
  const displayPriceEst = isEditMode
    ? (editForm.priceEst.trim() || '0')
    : prospect.priceEst.toLocaleString();

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-background rounded-2xl shadow-2xl w-full max-w-4xl h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-card border-b border-border px-6 py-4 flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-1">
              {isEditMode ? (
                <Input
                  value={editForm.address}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, address: e.target.value }))}
                  className="text-2xl font-bold text-foreground h-10 px-2"
                />
              ) : (
                <h1 className="text-2xl font-bold text-foreground">
                  {prospect.address}
                </h1>
              )}
              <span className="text-sm text-muted-foreground">
                • Added {new Date(prospect.date).toLocaleDateString('en-GB', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric'
                })}
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              {displayType === 'for-sale' ? 'For Sale' : 'To Let'} • Est. £{displayPriceEst}
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <ProspectStatusBadge 
              status={currentStatus} 
              prospectId={prospect.id} 
              onStatusChange={onStatusChange} 
            />
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="rounded-full hover:bg-accent"
            >
              <XIcon className="h-5 w-5" strokeWidth={1.5} />
            </Button>
          </div>
        </div>

        {/* Prospect Details Grid */}
        <div className="bg-muted/30 px-6 py-4 border-b border-border">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 text-sm">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Price Estimate</p>
              {isEditMode ? (
                <Input
                  value={editForm.priceEst}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, priceEst: e.target.value }))}
                  className="h-8"
                />
              ) : (
                <p className="text-foreground font-medium">£{prospect.priceEst.toLocaleString()}</p>
              )}
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Hot/Cold</p>
              {isEditMode ? (
                <Select
                  value={editForm.hotCold}
                  onValueChange={(value) => setEditForm((prev) => ({ ...prev, hotCold: value as typeof prev.hotCold }))}
                >
                  <SelectTrigger className="h-8">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hot">Hot</SelectItem>
                    <SelectItem value="cold">Cold</SelectItem>
                    <SelectItem value="incomplete">Incomplete</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <div className="flex items-center gap-2">
                  <div className={cn(
                    "h-3 w-3 rounded-full",
                    prospect.hotCold === 'hot' ? 'bg-red-500' :
                    prospect.hotCold === 'cold' ? 'bg-blue-500' :
                    'bg-gray-400'
                  )} />
                  <span className="text-foreground font-medium capitalize">{prospect.hotCold}</span>
                </div>
              )}
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Type</p>
              {isEditMode ? (
                <Select
                  value={editForm.type}
                  onValueChange={(value) => setEditForm((prev) => ({ ...prev, type: value as typeof prev.type }))}
                >
                  <SelectTrigger className="h-8">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="for-sale">For Sale</SelectItem>
                    <SelectItem value="to-let">To Let</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <p className="text-foreground font-medium capitalize">{prospect.type.replace('-', ' ')}</p>
              )}
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Prospector</p>
              {isEditMode ? (
                <Input
                  value={editForm.prospector}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, prospector: e.target.value }))}
                  className="h-8"
                />
              ) : (
                <p className="text-foreground font-medium">{prospect.prospector}</p>
              )}
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Branch</p>
              <p className="text-foreground font-medium">{prospect.branch}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Movement Status</p>
              {prospect.movementBooked ? (
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                  <CheckCircle2Icon className="h-3 w-3" strokeWidth={2} />
                  Booked
                </span>
              ) : (
                <p className="text-muted-foreground font-medium">Not Booked</p>
              )}
            </div>
          </div>
          {isEditMode && (
            <div className="mt-4">
              <Label htmlFor="prospect-notes" className="text-xs text-muted-foreground mb-2 block">
                Notes
              </Label>
              <Textarea
                id="prospect-notes"
                value={editForm.notes}
                onChange={(e) => setEditForm((prev) => ({ ...prev, notes: e.target.value }))}
                className="min-h-[90px] bg-background"
              />
            </div>
          )}
        </div>

        {/* Tabs Section */}
        <div className="flex-1 overflow-hidden flex flex-col min-h-0">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
            <div className="bg-background px-6 py-3 shrink-0">
              <TabsList className="bg-transparent border-0 p-0 gap-2 h-auto">
                <TabsTrigger 
                  value="notes" 
                  className="px-5 py-2.5 text-sm rounded-xl border border-transparent data-[state=active]:border-primary/20 data-[state=active]:bg-primary/5 data-[state=active]:text-primary data-[state=active]:shadow-none hover:bg-accent/50 hover:text-foreground transition-all font-medium text-muted-foreground"
                >
                  Notes
                </TabsTrigger>
                <TabsTrigger 
                  value="history" 
                  className="px-5 py-2.5 text-sm rounded-xl border border-transparent data-[state=active]:border-primary/20 data-[state=active]:bg-primary/5 data-[state=active]:text-primary data-[state=active]:shadow-none hover:bg-accent/50 hover:text-foreground transition-all font-medium text-muted-foreground"
                >
                  History
                </TabsTrigger>
                <TabsTrigger 
                  value="documents" 
                  className="px-5 py-2.5 text-sm rounded-xl border border-transparent data-[state=active]:border-primary/20 data-[state=active]:bg-primary/5 data-[state=active]:text-primary data-[state=active]:shadow-none hover:bg-accent/50 hover:text-foreground transition-all font-medium text-muted-foreground"
                >
                  Photo
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-6 min-h-0">
              <TabsContent value="notes" className="mt-0 space-y-6">
                {/* Add New Note */}
                <Card className="bg-muted/30 border-border">
                  <CardContent className="p-4 space-y-3">
                    <Label htmlFor="new-note" className="text-sm font-semibold text-foreground">
                      Add New Note
                    </Label>
                    <Textarea
                      id="new-note"
                      placeholder="Type your note here..."
                      value={newNote}
                      onChange={(e) => setNewNote(e.target.value)}
                      className="min-h-[100px] bg-background resize-none"
                    />
                    <div className="flex justify-end">
                      <Button 
                        onClick={handleAddNote}
                        disabled={!newNote.trim() || isSavingNotes}
                        size="sm"
                        className="bg-primary text-primary-foreground hover:bg-primary/90"
                      >
                        {isSavingNotes ? 'Saving...' : 'Add Note'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Notes History */}
                <div className="space-y-3">
                  {noteHistory.length > 0 ? (
                    noteHistory.slice().reverse().map((note) => (
                      <Card key={note.id} className="bg-card border-border hover:shadow-md transition-shadow">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                                <span className="text-xs font-semibold text-primary">
                                  {note.createdBy.split(' ').map(n => n[0]).join('')}
                                </span>
                              </div>
                              <div>
                                <p className="text-sm font-semibold text-foreground">{note.createdBy}</p>
                                <p className="text-xs text-muted-foreground">
                                  {new Date(note.createdAt).toLocaleDateString('en-GB', {
                                    day: '2-digit',
                                    month: 'short',
                                    year: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </p>
                              </div>
                            </div>
                          </div>
                          <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                            {note.content}
                          </p>
                        </CardContent>
                      </Card>
                    ))
                  ) : (
                    <div className="text-center py-12">
                      <FileTextIcon className="h-12 w-12 text-muted-foreground mx-auto mb-3" strokeWidth={1.5} />
                      <p className="text-muted-foreground">No notes yet. Add your first note above.</p>
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="history" className="mt-0">
                <div className="space-y-4">
                  <h3 className="text-base font-semibold text-foreground">Status History</h3>

                  {statusHistoryTimeline.length > 0 ? (
                    <div className="relative space-y-6 pl-6">
                      <div className="absolute left-[11px] top-2 bottom-2 w-0.5 bg-border" />

                      {statusHistoryTimeline.map((entry, index) => (
                        <div key={`${entry.status}-${entry.changedAt}-${index}`} className="relative">
                          <div
                            className={cn(
                              'absolute -left-[25px] top-1 h-3 w-3 rounded-full border-2 border-background shadow-sm',
                              getProspectStatusDotColor(entry.status)
                            )}
                          />
                          <div>
                            <p className="text-sm font-medium text-foreground">
                              Status changed to{' '}
                              <span
                                className={cn(
                                  'font-bold',
                                  getProspectStatusTextColor(entry.status)
                                )}
                              >
                                {formatProspectStatusLabel(entry.status)}
                              </span>
                            </p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {index === 0
                                ? 'Current status'
                                : `${new Date(entry.changedAt).toLocaleDateString('en-GB', {
                                    day: '2-digit',
                                    month: 'short',
                                    year: 'numeric',
                                  })} by ${entry.changedBy}`}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <p>No status history yet.</p>
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="documents" className="mt-0 space-y-4">
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={cn(
                    "border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer",
                    isDragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/50",
                    isSavingPhotos && "opacity-60 cursor-not-allowed"
                  )}
                  onClick={() => {
                    if (isSavingPhotos) return;
                    fileInputRef.current?.click();
                  }}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={(e) => {
                      handleFileUpload(e.target.files);
                      e.currentTarget.value = '';
                    }}
                  />
                  <UploadCloudIcon className="h-10 w-10 text-muted-foreground mx-auto mb-3" strokeWidth={1.5} />
                  <p className="text-sm font-medium text-foreground mb-1">
                    Drop photo here or click to upload
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Supports JPG, PNG, WEBP (max 5MB)
                  </p>
                  {isSavingPhotos ? (
                    <p className="text-xs text-primary mt-2">Saving photo changes...</p>
                  ) : null}
                </div>

                {documents.length > 0 ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {documents.map((doc) => (
                      <Card key={doc.id} className="bg-card border-border hover:shadow-md transition-shadow overflow-hidden group">
                        <CardContent className="p-0 relative">
                          {/* Photo Preview */}
                          <div className="aspect-video bg-muted flex items-center justify-center relative">
                            <img 
                              src={doc.url}
                              alt={doc.name}
                              className="w-full h-full object-cover"
                            />
                            {/* Overlay with actions */}
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button 
                                    variant="secondary" 
                                    size="sm"
                                    className="h-8 px-3 text-xs gap-2"
                                  >
                                    Actions <MoreHorizontalIcon className="h-3 w-3" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="center" className="w-48">
                                  <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                  <DropdownMenuItem>
                                    <EyeIcon className="mr-2 h-4 w-4" /> View
                                  </DropdownMenuItem>
                                  <DropdownMenuItem>
                                    <DownloadIcon className="mr-2 h-4 w-4" /> Download
                                  </DropdownMenuItem>
                                  <DropdownMenuItem>
                                    <PencilIcon className="mr-2 h-4 w-4" /> Rename
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem onSelect={() => {
                                    setTimeout(() => {
                                      setSelectedDoc(doc);
                                      setShareDialogOpen(true);
                                    }, 0);
                                  }}>
                                    <ShareIcon className="mr-2 h-4 w-4" /> Share
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onSelect={() => {
                                    setTimeout(() => {
                                      setSelectedDoc(doc);
                                      setMoveCopyMode('copy');
                                      setMoveCopyDialogOpen(true);
                                    }, 0);
                                  }}>
                                    <CopyIcon className="mr-2 h-4 w-4" /> Copy to...
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onSelect={() => {
                                    setTimeout(() => {
                                      setSelectedDoc(doc);
                                      setMoveCopyMode('move');
                                      setMoveCopyDialogOpen(true);
                                    }, 0);
                                  }}>
                                    <MoveIcon className="mr-2 h-4 w-4" /> Move to...
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onSelect={() => {
                                    setTimeout(() => {
                                      setSelectedDoc(doc);
                                      setReminderDialogOpen(true);
                                    }, 0);
                                  }}>
                                    <BellIcon className="mr-2 h-4 w-4" /> Set Reminder
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem 
                                    className="text-destructive focus:text-destructive"
                                    disabled={isSavingPhotos}
                                    onSelect={() => handleDeleteDocument(doc.id)}
                                  >
                                    <TrashIcon className="mr-2 h-4 w-4" /> Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </div>
                          {/* Photo Info */}
                          <div className="p-3">
                            <p className="text-sm font-medium text-foreground truncate">{doc.name}</p>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                              <span>{doc.size}</span>
                              <span>•</span>
                              <span>
                                {new Date(doc.uploadedAt).toLocaleDateString('en-GB', {
                                  day: '2-digit',
                                  month: 'short'
                                })}
                              </span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <FileTextIcon className="h-12 w-12 text-muted-foreground mx-auto mb-3" strokeWidth={1.5} />
                    <p>No photos uploaded yet</p>
                  </div>
                )}
              </TabsContent>
            </div>
          </Tabs>
        </div>

        {selectedDoc && (
          <>
            <ShareDocumentDialog 
              open={shareDialogOpen} 
              onOpenChange={setShareDialogOpen} 
              documentName={selectedDoc.name} 
            />
            <MoveCopyDocumentDialog 
              open={moveCopyDialogOpen} 
              onOpenChange={setMoveCopyDialogOpen} 
              documentName={selectedDoc.name} 
              mode={moveCopyMode} 
            />
            <DocumentReminderDialog 
              open={reminderDialogOpen} 
              onOpenChange={setReminderDialogOpen} 
              documentName={selectedDoc.name} 
            />
          </>
        )}

        {/* Footer Actions */}
        <div className="bg-muted/30 border-t border-border px-6 py-4 flex items-center justify-between gap-2">
          <Button 
            variant="destructive" 
            size="sm" 
            className="gap-2"
            disabled={isDeletingProspect}
            onClick={() => setDeleteConfirmOpen(true)}
          >
            <TrashIcon className="h-4 w-4" strokeWidth={1.5} />
            Delete Prospect
          </Button>

          <div className="flex items-center gap-2">
            {isEditMode ? (
              <>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="gap-2 border-border hover:bg-accent hover:text-accent-foreground"
                  onClick={handleCancelEdit}
                >
                  <XIcon className="h-4 w-4" strokeWidth={1.5} />
                  Cancel
                </Button>
                <Button 
                  size="sm" 
                  className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
                  onClick={handleSaveDetails}
                >
                  <CheckCircle2Icon className="h-4 w-4" strokeWidth={1.5} />
                  Save Changes
                </Button>
              </>
            ) : (
              <Button 
                size="sm" 
                className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
                onClick={() => setIsEditMode(true)}
              >
                <EditIcon className="h-4 w-4" strokeWidth={1.5} />
                Edit Details
              </Button>
            )}
          </div>
        </div>

        {/* Delete Confirmation Dialog */}
        <AlertDialog
          open={deleteConfirmOpen}
          onOpenChange={(open) => {
            if (isDeletingProspect) return;
            setDeleteConfirmOpen(open);
          }}
        >
          <AlertDialogContent className="bg-card text-card-foreground">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-foreground flex items-center gap-2">
                <AlertTriangleIcon className="h-5 w-5 text-destructive" strokeWidth={1.5} />
                Delete Prospect
              </AlertDialogTitle>
              <AlertDialogDescription className="text-muted-foreground">
                Are you sure you want to delete this prospect?
                <div className="mt-3 p-3 rounded-lg bg-muted/50 border border-border">
                  <p className="font-semibold text-foreground">{prospect.address}</p>
                  <p className="text-sm text-muted-foreground mt-1">Est. £{prospect.priceEst.toLocaleString()}</p>
                </div>
                <p className="mt-3 text-destructive font-medium">
                  This action cannot be undone. All prospect data, notes, and documents will be permanently removed.
                </p>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel
                className="bg-background text-foreground border-border hover:bg-accent"
                disabled={isDeletingProspect}
              >
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction 
                onClick={handleDeleteProspect}
                disabled={isDeletingProspect}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {isDeletingProspect ? 'Deleting...' : 'Delete Prospect'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
