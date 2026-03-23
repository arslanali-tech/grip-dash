import { useState, useRef, useEffect } from 'react';
import { XIcon, MailIcon, PhoneIcon, MapPinIcon, CalendarIcon, EditIcon, FileTextIcon, PoundSterlingIcon, CheckCircle2Icon, XCircleIcon, MinusCircleIcon, PlusIcon, SaveIcon, UserIcon, UploadCloudIcon, FileIcon, DownloadIcon, TrashIcon, AlertTriangleIcon, MoreHorizontalIcon, ShareIcon, CopyIcon, MoveIcon, BellIcon, EyeIcon, PencilIcon, Loader2Icon, HistoryIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Movement, MovementNote, PropertyOffer, useDashboardStore } from '@/stores/dashboardStore';
import { useAuthStore } from '@/stores/authStore';
import { getUserRole } from '@/lib/ownerAccess';
import { StatusBadge } from './StatusBadge';
import { cn } from '@/lib/utils';
import { addMovementNote, addMovementOffer, deleteMovement, fetchMovementNotes, fetchMovementOffers, fetchMovementStatusHistory, fetchMovementsByAddress, MovementStatusHistoryItem, resolveClientIdForUser, updateMovement, updateMovementOffer, type Movement as ApiMovement, type MovementOffer as ApiMovementOffer } from '@/lib/dashboardApi';
import { fetchClientBranches, fetchClientBranchesForAgency } from '@/lib/ownerApi';
import { createFolder, deleteDocument as deleteHubDocument, fetchDocuments, fetchFolders, formatDate, formatFileSize, getDocumentDownloadUrl, HubDocumentRow, uploadDocument } from '@/lib/hubDocumentsApi';
import { getViewingArrangementLabel, normalizeViewingArrangement, type ViewingArrangement } from '@/lib/viewingArrangements';
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

interface PropertyDetailViewProps {
  property: Movement;
  onClose: () => void;
  onStatusChange?: (...args: any[]) => void;
}

type PropertyDocument = HubDocumentRow;

const mapApiOfferToPropertyOffer = (offer: ApiMovementOffer): PropertyOffer => ({
  id: offer.id || `offer-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  amount: Number(offer.amount ?? 0),
  buyer: offer.buyer ?? '',
  status: (offer.status as PropertyOffer['status']) ?? 'pending',
  submittedDate: offer.submitted_date ?? offer.created_at ?? new Date().toISOString(),
  notes: offer.notes ?? undefined,
});

const sortMovementNotes = (notes: MovementNote[]) =>
  notes.slice().sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

const normalizeNoteContent = (content: string) => content.trim().replace(/\s+/g, ' ').toLowerCase();
const UUID_LIKE_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const EMAIL_LIKE_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;
const toFiniteNumber = (value: unknown, fallback = 0): number => {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : fallback;
  }
  if (typeof value === 'string') {
    const cleaned = value.replace(/[^0-9.-]/g, '').trim();
    if (!cleaned) return fallback;
    const parsed = Number(cleaned);
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  return fallback;
};

const calculateFeeAmount = (
  price: unknown,
  feePercentage: unknown,
  fallbackFeeAmount = 0
): number => {
  const normalizedPrice = toFiniteNumber(price, 0);
  const normalizedFeePercentage = toFiniteNumber(feePercentage, 0);
  if (normalizedPrice > 0 && normalizedFeePercentage > 0) {
    const calculated = (normalizedPrice * normalizedFeePercentage) / 100;
    return Math.round(calculated * 100) / 100;
  }
  return toFiniteNumber(fallbackFeeAmount, 0);
};

const calculateFeePercentage = (
  price: unknown,
  feeAmount: unknown,
  fallbackFeePercentage = 0
): number => {
  const normalizedPrice = toFiniteNumber(price, 0);
  const normalizedFeeAmount = toFiniteNumber(feeAmount, 0);
  if (normalizedPrice > 0 && normalizedFeeAmount >= 0) {
    const calculated = (normalizedFeeAmount / normalizedPrice) * 100;
    return Math.round(calculated * 100) / 100;
  }
  return toFiniteNumber(fallbackFeePercentage, 0);
};

const buildEditedPropertyState = (property: Movement) => {
  const price = toFiniteNumber(property.price, 0);
  let feePercentage = toFiniteNumber(property.feePercentage, 0);
  let feeAmount = toFiniteNumber(property.feeAmount, 0);
  if (price > 0) {
    if (feePercentage > 0) {
      feeAmount = calculateFeeAmount(price, feePercentage, feeAmount);
    } else if (feeAmount > 0) {
      feePercentage = calculateFeePercentage(price, feeAmount, feePercentage);
    }
  }

  return {
    address: property.address,
    description: property.property,
    price,
    type: property.type || 'sale',
    agent: property.agent || '',
    branch: property.branch || '',
    board: property.board || false,
    agencyPeriod: '14',
    agencyTerms: 'Sole',
    feePercentage,
    feeAmount,
    motivatedSeller: property.motivatedSeller || '',
    notes: property.notes || '',
    acquisitionChannel: 'Rightmove',
  };
};

const getFeeInputModeFromProperty = (property: Movement): 'percentage' | 'amount' =>
  toFiniteNumber(property.feePercentage, 0) > 0 ? 'percentage' : 'amount';

const mergeMovementNotes = (notes: MovementNote[]) => {
  const deduped = new Map<string, MovementNote>();
  for (const note of notes) {
    const normalizedContent = normalizeNoteContent(note.content);
    const timestamp = new Date(note.createdAt).getTime();
    const minuteBucket = Number.isFinite(timestamp) ? Math.floor(timestamp / 60000) : note.createdAt;
    const key = `${normalizedContent}|${minuteBucket}`;
    if (!deduped.has(key)) {
      deduped.set(key, note);
    }
  }
  return sortMovementNotes(Array.from(deduped.values()));
};

const getMovementTimestamp = (movement: Pick<ApiMovement, 'updated_at' | 'created_at' | 'date'>): number => {
  const updatedAt = movement.updated_at ? new Date(movement.updated_at).getTime() : NaN;
  if (Number.isFinite(updatedAt)) return updatedAt;
  const createdAt = movement.created_at ? new Date(movement.created_at).getTime() : NaN;
  if (Number.isFinite(createdAt)) return createdAt;
  const date = movement.date ? new Date(movement.date).getTime() : NaN;
  return Number.isFinite(date) ? date : 0;
};

const resolveViewingInstructions = (
  movementRows: Array<
    Pick<ApiMovement, 'viewing_arrangements' | 'viewing_notes' | 'updated_at' | 'created_at' | 'date'>
  >,
  fallback: { arrangement?: ViewingArrangement; notes?: string }
): { arrangement?: ViewingArrangement; notes?: string } => {
  const latestWithViewingData = movementRows
    .slice()
    .sort((left, right) => getMovementTimestamp(right) - getMovementTimestamp(left))
    .find((movement) => {
      const hasArrangement = !!normalizeViewingArrangement(movement.viewing_arrangements);
      const hasNotes =
        typeof movement.viewing_notes === 'string' && movement.viewing_notes.trim().length > 0;
      return hasArrangement || hasNotes;
    });

  if (!latestWithViewingData) {
    return fallback;
  }

  const arrangement = normalizeViewingArrangement(latestWithViewingData.viewing_arrangements);
  const notes =
    typeof latestWithViewingData.viewing_notes === 'string' &&
    latestWithViewingData.viewing_notes.trim().length > 0
      ? latestWithViewingData.viewing_notes.trim()
      : undefined;

  return {
    arrangement: arrangement ?? fallback.arrangement,
    notes: notes ?? fallback.notes,
  };
};

export function PropertyDetailView({ property, onClose, onStatusChange }: PropertyDetailViewProps) {
  const { agencyId, loadMovements } = useDashboardStore();
  const { user } = useAuthStore();
  const userRole = getUserRole(user);
  const isClientUser = userRole === 'client' || userRole === 'agency_user';
  const isBranchManager = userRole === 'branch_manager';
  const branchIdFromMeta = (user?.user_metadata as any)?.branch_id as string | undefined;
  const [activeTab, setActiveTab] = useState('notes');
  const [newNote, setNewNote] = useState('');
  const [noteHistory, setNoteHistory] = useState<MovementNote[]>(property.noteHistory || []);
  const [pinnedViewingInstructions, setPinnedViewingInstructions] = useState<{
    arrangement?: ViewingArrangement;
    notes?: string;
  }>({
    arrangement: property.viewingArrangement,
    notes: property.viewingNotes,
  });
  const [offers, setOffers] = useState<PropertyOffer[]>(property.offers || []);
  const [addOfferOpen, setAddOfferOpen] = useState(false);
  const [newOfferAmount, setNewOfferAmount] = useState('');
  const [newOfferBuyer, setNewOfferBuyer] = useState('');
  const [newOfferNotes, setNewOfferNotes] = useState('');
  const [currentStatus, setCurrentStatus] = useState(property.status);
  const [isEditMode, setIsEditMode] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [documents, setDocuments] = useState<PropertyDocument[]>([]);
  const [documentsLoading, setDocumentsLoading] = useState(false);
  const [documentsUploading, setDocumentsUploading] = useState(false);
  const [movementFolderId, setMovementFolderId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [statusHistory, setStatusHistory] = useState<MovementStatusHistoryItem[]>([]);
  const [statusHistoryLoading, setStatusHistoryLoading] = useState(false);
  const [statusHistoryLoaded, setStatusHistoryLoaded] = useState(false);
  const [propertyMovements, setPropertyMovements] = useState<ApiMovement[]>([]);
  const [propertyMovementsLoaded, setPropertyMovementsLoaded] = useState(false);

  // Document Action States
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [moveCopyDialogOpen, setMoveCopyDialogOpen] = useState(false);
  const [reminderDialogOpen, setReminderDialogOpen] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<PropertyDocument | null>(null);
  const [moveCopyMode, setMoveCopyMode] = useState<'move' | 'copy'>('copy');
  const [branchOptions, setBranchOptions] = useState<{ id: string; name: string }[]>([]);
  const [branchesLoading, setBranchesLoading] = useState(false);
  const [resolvedClientId, setResolvedClientId] = useState<string | null>(null);
  const [selectedBranchId, setSelectedBranchId] = useState<string | null>(null);
  const [editedProperty, setEditedProperty] = useState(() => buildEditedPropertyState(property));
  const [feeInputMode, setFeeInputMode] = useState<'percentage' | 'amount'>(() =>
    getFeeInputModeFromProperty(property)
  );
  const movementFolderName = `Movement-${property.id}`;
  const currentUserDisplayName =
    (user?.user_metadata as any)?.name ??
    (user?.app_metadata as any)?.name ??
    property.agent ??
    user?.email ??
    null;
  const resolveNoteAuthorName = (createdByRaw?: string | null) => {
    const candidate = (createdByRaw ?? '').trim();
    if (!candidate) return property.agent || currentUserDisplayName || 'User';
    if (user?.id && candidate === user.id) {
      return currentUserDisplayName || property.agent || 'User';
    }
    if (UUID_LIKE_REGEX.test(candidate)) {
      return property.agent || currentUserDisplayName || 'User';
    }
    if (EMAIL_LIKE_REGEX.test(candidate)) {
      const currentEmail = (user?.email ?? '').trim().toLowerCase();
      if (currentEmail && candidate.toLowerCase() === currentEmail && currentUserDisplayName) {
        return currentUserDisplayName;
      }
      return property.agent || currentUserDisplayName || candidate;
    }
    return candidate;
  };
  const effectiveClientId =
    resolvedClientId ??
    (user?.user_metadata as any)?.client_id ??
    (user?.app_metadata as any)?.client_id ??
    null;

  // Resolve client id for client / branch manager users
  useEffect(() => {
    if (!user || (!isClientUser && !isBranchManager)) {
      setResolvedClientId(null);
      return;
    }

    let cancelled = false;
    const run = async () => {
      const metaClientId =
        (user.user_metadata as any)?.client_id ??
        (user.app_metadata as any)?.client_id ??
        null;

      if (metaClientId && isBranchManager) {
        if (!cancelled) setResolvedClientId(metaClientId);
        return;
      }

      const resolved = await resolveClientIdForUser(user);
      if (!cancelled) setResolvedClientId(resolved);
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [user?.id, user?.email, isClientUser, isBranchManager]);

  // Load branches for assignment selector
  useEffect(() => {
    const loadBranches = async () => {
      if (isClientUser || isBranchManager) {
        const clientId =
          resolvedClientId ??
          (user?.user_metadata as any)?.client_id ??
          (user?.app_metadata as any)?.client_id ??
          null;
        if (!clientId) {
          setBranchOptions([]);
          return;
        }
        setBranchesLoading(true);
        const rows = await fetchClientBranches(clientId);
        let options = rows.map((b) => ({ id: b.id, name: b.name }));
        if (isBranchManager && branchIdFromMeta) {
          const match = options.find((b) => b.id === branchIdFromMeta);
          if (match) options = [match];
        }
        setBranchOptions(options);
        setBranchesLoading(false);
        return;
      }

      if (!agencyId) {
        setBranchOptions([]);
        return;
      }
      setBranchesLoading(true);
      const rows = await fetchClientBranchesForAgency(agencyId);
      setBranchOptions(rows.map((b) => ({ id: b.id, name: b.name })));
      setBranchesLoading(false);
    };
    void loadBranches();
  }, [agencyId, resolvedClientId, isClientUser, isBranchManager, branchIdFromMeta, user?.user_metadata, user?.app_metadata]);

  useEffect(() => {
    if (isBranchManager && branchIdFromMeta) {
      setSelectedBranchId(branchIdFromMeta);
      return;
    }
    if (selectedBranchId || branchOptions.length === 0) return;
    const match = branchOptions.find((b) => b.name === property.branch);
    if (match) {
      setSelectedBranchId(match.id);
      setEditedProperty((prev) => ({ ...prev, branch: match.name }));
    }
  }, [branchOptions, branchIdFromMeta, isBranchManager, property.branch, selectedBranchId]);

  useEffect(() => {
    const match = branchOptions.find((b) => b.id === selectedBranchId);
    if (match && editedProperty.branch !== match.name) {
      setEditedProperty((prev) => ({ ...prev, branch: match.name }));
    }
  }, [branchOptions, editedProperty.branch, selectedBranchId]);

  useEffect(() => {
    setCurrentStatus(property.status);
  }, [property.status]);

  useEffect(() => {
    setOffers(property.offers || []);
  }, [property.id]);

  useEffect(() => {
    setPinnedViewingInstructions({
      arrangement: property.viewingArrangement,
      notes: property.viewingNotes,
    });
  }, [property.id, property.viewingArrangement, property.viewingNotes]);

  useEffect(() => {
    if (isEditMode) return;
    setEditedProperty(buildEditedPropertyState(property));
    setFeeInputMode(getFeeInputModeFromProperty(property));
  }, [
    property.id,
    property.address,
    property.property,
    property.price,
    property.type,
    property.agent,
    property.branch,
    property.board,
    property.feePercentage,
    property.feeAmount,
    property.motivatedSeller,
    property.notes,
    isEditMode,
  ]);

  const handlePriceInputChange = (value: string) => {
    const nextPrice = toFiniteNumber(value, 0);
    setEditedProperty((prev) => {
      if (feeInputMode === 'amount') {
        return {
          ...prev,
          price: nextPrice,
          feePercentage: calculateFeePercentage(nextPrice, prev.feeAmount, prev.feePercentage),
        };
      }
      return {
        ...prev,
        price: nextPrice,
        feeAmount: calculateFeeAmount(nextPrice, prev.feePercentage, prev.feeAmount),
      };
    });
  };

  const handleFeePercentageInputChange = (value: string) => {
    const nextFeePercentage = toFiniteNumber(value, 0);
    setFeeInputMode('percentage');
    setEditedProperty((prev) => ({
      ...prev,
      feePercentage: nextFeePercentage,
      feeAmount: calculateFeeAmount(prev.price, nextFeePercentage, prev.feeAmount),
    }));
  };

  const handleFeeAmountInputChange = (value: string) => {
    const nextFeeAmount = toFiniteNumber(value, 0);
    setFeeInputMode('amount');
    setEditedProperty((prev) => ({
      ...prev,
      feeAmount: nextFeeAmount,
      feePercentage: calculateFeePercentage(prev.price, nextFeeAmount, prev.feePercentage),
    }));
  };

  const findMovementFolder = async () => {
    if (!agencyId) return null;
    const folders = await fetchFolders({
      agencyId,
      clientId: effectiveClientId,
      parentFolderId: null,
      searchQuery: movementFolderName,
    });
    return folders.find((folder) => folder.name === movementFolderName) ?? null;
  };

  const ensureMovementFolder = async () => {
    if (!agencyId) return null;
    const existing = await findMovementFolder();
    if (existing) return existing;
    return createFolder({
      agencyId,
      clientId: effectiveClientId,
      name: movementFolderName,
      parentFolderId: null,
      category: 'Movements',
      isPublic: false,
      branchId: selectedBranchId ?? null,
      createdBy: user?.id ?? null,
    });
  };

  const loadMovementDocuments = async (folderId: string) => {
    if (!agencyId) return;
    setDocumentsLoading(true);
    try {
      const docs = await fetchDocuments({ agencyId, clientId: effectiveClientId, folderId });
      setDocuments(docs);
    } finally {
      setDocumentsLoading(false);
    }
  };

  useEffect(() => {
    if (!agencyId) return;
    let cancelled = false;
    const run = async () => {
      const existing = await findMovementFolder();
      if (cancelled) return;
      if (existing) {
        setMovementFolderId(existing.id);
        await loadMovementDocuments(existing.id);
      } else {
        setMovementFolderId(null);
        setDocuments([]);
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [agencyId, property.id]);

  // Load movement notes and include notes saved on movement rows (status/prospect notes).
  useEffect(() => {
    const loadNotes = async () => {
      try {
        const clientId =
          resolvedClientId ??
          (user?.user_metadata as any)?.client_id ??
          (user?.app_metadata as any)?.client_id ??
          undefined;

        const [savedNotes, relatedMovements] = await Promise.all([
          fetchMovementNotes(property.id),
          agencyId && property.address
            ? fetchMovementsByAddress(agencyId, property.address, clientId)
            : Promise.resolve([] as ApiMovement[]),
        ]);
        const fallbackViewingInstructions = {
          arrangement: property.viewingArrangement,
          notes: property.viewingNotes,
        };

        const dbNotes: MovementNote[] = savedNotes.map((n) => ({
          id: n.id,
          content: n.content,
          createdBy: resolveNoteAuthorName(n.created_by),
          createdAt: n.created_at,
        }));
        const dbNoteContents = new Set(
          dbNotes
            .map((note) => normalizeNoteContent(note.content))
            .filter((normalized) => normalized.length > 0)
        );

        const movementRows = relatedMovements.length
          ? relatedMovements
          : [
              {
                id: property.id,
                date: property.date ?? null,
                notes: property.notes ?? null,
                agent: property.agent ?? null,
                viewing_arrangements: property.viewingArrangement ?? null,
                viewing_notes: property.viewingNotes ?? null,
                created_at: property.createdAt ?? property.date,
                updated_at: property.createdAt ?? property.date,
              } as ApiMovement,
            ];

        const rawRowNotes: MovementNote[] = movementRows
          .filter((movement) => typeof movement.notes === 'string' && movement.notes.trim().length > 0)
          .map((movement) => ({
            id: `movement-row-note-${movement.id}`,
            content: (movement.notes as string).trim(),
            createdBy: movement.agent || 'System',
            createdAt:
              movement.updated_at ??
              movement.created_at ??
              property.createdAt ??
              property.date ??
              new Date().toISOString(),
          }));
        const dedupedRowNotesByContent = new Map<string, MovementNote>();
        for (const rowNote of rawRowNotes) {
          const normalized = normalizeNoteContent(rowNote.content);
          if (!normalized || dbNoteContents.has(normalized)) continue;

          const existing = dedupedRowNotesByContent.get(normalized);
          if (!existing) {
            dedupedRowNotesByContent.set(normalized, rowNote);
            continue;
          }

          const rowTime = new Date(rowNote.createdAt).getTime();
          const existingTime = new Date(existing.createdAt).getTime();
          if (Number.isFinite(rowTime) && (!Number.isFinite(existingTime) || rowTime >= existingTime)) {
            dedupedRowNotesByContent.set(normalized, rowNote);
          }
        }
        const rowNotes = Array.from(dedupedRowNotesByContent.values());

        setPinnedViewingInstructions(
          resolveViewingInstructions(movementRows, fallbackViewingInstructions)
        );
        setNoteHistory(mergeMovementNotes([...dbNotes, ...rowNotes]));
      } catch (err) {
        console.error('Error fetching movement notes:', err);
        const fallbackNotes = property.notes?.trim()
          ? [
              {
                id: `movement-row-note-${property.id}`,
                content: property.notes.trim(),
                createdBy: property.agent || 'System',
                createdAt: property.createdAt ?? property.date ?? new Date().toISOString(),
              } as MovementNote,
            ]
          : [];
        setPinnedViewingInstructions({
          arrangement: property.viewingArrangement,
          notes: property.viewingNotes,
        });
        setNoteHistory(mergeMovementNotes([...(property.noteHistory || []), ...fallbackNotes]));
      }
    };
    void loadNotes();
  }, [
    property.id,
    property.address,
    property.agent,
    property.viewingArrangement,
    property.viewingNotes,
    property.notes,
    property.date,
    property.createdAt,
    property.noteHistory,
    agencyId,
    resolvedClientId,
    user?.id,
    user?.user_metadata,
    user?.app_metadata,
  ]);

  const refreshOffers = async (): Promise<void> => {
    try {
      const clientId =
        resolvedClientId ??
        (user?.user_metadata as any)?.client_id ??
        (user?.app_metadata as any)?.client_id ??
        undefined;

      let movementIds = [property.id];
      if (agencyId && property.address) {
        const relatedMovements = await fetchMovementsByAddress(agencyId, property.address, clientId);
        const targetAddress = (property.address ?? '').trim().toLowerCase();
        const targetType = (property.type ?? '').trim().toLowerCase();

        const sameListingMovements = relatedMovements.filter((movement) => {
          const movementAddress = (movement.address ?? '').trim().toLowerCase();
          const movementType = (movement.type ?? '').trim().toLowerCase();

          if (!movementAddress || movementAddress !== targetAddress) return false;
          if (targetType && movementType && movementType !== targetType) return false;
          return true;
        });

        if (sameListingMovements.length > 0) {
          movementIds = Array.from(new Set(sameListingMovements.map((movement) => movement.id)));
        }
      }

      if (!movementIds.includes(property.id)) {
        movementIds.unshift(property.id);
      }

      const offersByMovement = await Promise.all(movementIds.map((id) => fetchMovementOffers(id)));
      const allOffers = offersByMovement.flat();

      if (allOffers.length === 0) {
        setOffers(property.offers || []);
        return;
      }

      const dedupedById = new Map<string, ApiMovementOffer>();
      const offersWithoutId: ApiMovementOffer[] = [];

      for (const offer of allOffers) {
        if (offer.id) {
          dedupedById.set(offer.id, offer);
        } else {
          offersWithoutId.push(offer);
        }
      }

      const mergedOffers = [...Array.from(dedupedById.values()), ...offersWithoutId];
      mergedOffers.sort((a, b) => {
        const left = new Date(b.submitted_date ?? b.created_at ?? '').getTime();
        const right = new Date(a.submitted_date ?? a.created_at ?? '').getTime();
        return (Number.isFinite(left) ? left : 0) - (Number.isFinite(right) ? right : 0);
      });

      setOffers(mergedOffers.map(mapApiOfferToPropertyOffer));
    } catch (err) {
      console.error('Error fetching movement offers:', err);
      setOffers(property.offers || []);
    }
  };

  useEffect(() => {
    void refreshOffers();
  }, [
    property.id,
    property.address,
    property.property,
    property.type,
    property.offers,
    agencyId,
    resolvedClientId,
    user?.user_metadata,
    user?.app_metadata,
  ]);

  useEffect(() => {
    setStatusHistory([]);
    setStatusHistoryLoaded(false);
    setPropertyMovements([]);
    setPropertyMovementsLoaded(false);
  }, [property.id]);

  // Fetch status history and all property movements when history tab is active
  useEffect(() => {
    if (activeTab === 'history' && !statusHistoryLoaded) {
      const loadHistory = async () => {
        setStatusHistoryLoading(true);
        try {
          // Fetch status change history
          const history = await fetchMovementStatusHistory(property.id);
          setStatusHistory(history);

          // Fetch ALL movements for this property address
          if (agencyId && property.address) {
            const clientId =
              resolvedClientId ??
              (user?.user_metadata as any)?.client_id ??
              (user?.app_metadata as any)?.client_id ??
              undefined;
            const allMovements = await fetchMovementsByAddress(agencyId, property.address, clientId);
            setPropertyMovements(allMovements);
            setPropertyMovementsLoaded(true);
          }
        } catch (err) {
          console.error('Error fetching status history:', err);
        } finally {
          setStatusHistoryLoading(false);
          setStatusHistoryLoaded(true);
        }
      };
      void loadHistory();
    }
  }, [activeTab, property.id, statusHistoryLoaded, agencyId, property.address, resolvedClientId, user?.user_metadata, user?.app_metadata]);

  // Helper to get status color for timeline
  const getStatusColor = (status: string): string => {
    const colors: Record<string, string> = {
      'valuation': 'bg-orange-500',
      'on-books': 'bg-yellow-500',
      'offer': 'bg-blue-500',
      'sale': 'bg-green-500',
      'exchanged': 'bg-purple-500',
      'completed': 'bg-emerald-500',
      'abort': 'bg-red-500',
      'withdrawn': 'bg-gray-500',
    };
    return colors[status?.toLowerCase()] || 'bg-gray-400';
  };

  const getStatusTextColor = (status: string): string => {
    const colors: Record<string, string> = {
      'valuation': 'text-orange-600',
      'on-books': 'text-yellow-600',
      'offer': 'text-blue-600',
      'sale': 'text-green-600',
      'exchanged': 'text-purple-600',
      'completed': 'text-emerald-600',
      'abort': 'text-red-600',
      'withdrawn': 'text-gray-600',
    };
    return colors[status?.toLowerCase()] || 'text-gray-600';
  };

  const handleAddNote = async () => {
    const trimmedNote = newNote.trim();
    if (!trimmedNote) return;
    
    try {
      // Persist note to database
      const createdByDisplay =
        (user?.user_metadata as any)?.name ??
        (user?.app_metadata as any)?.name ??
        property.agent ??
        user?.email ??
        'User';
      const savedNote = await addMovementNote(property.id, trimmedNote, createdByDisplay);
      
      if (savedNote) {
        // Create local note object
        const note: MovementNote = {
          id: savedNote.id,
          content: savedNote.content,
          createdBy: createdByDisplay,
          createdAt: savedNote.created_at
        };
        
        // Update local state
        setNoteHistory((prev) => sortMovementNotes([...prev, note]));
        setNewNote('');
        
        // Update the movement's notes field to show in the table
        // Use the latest note content as the displayed note
        await updateMovement(property.id, { notes: trimmedNote });
        
        // Refresh movements table to show the note badge
        if (agencyId) {
          await loadMovements(agencyId);
        }
      }
    } catch (error) {
      console.error('Error adding note:', error);
    }
  };

  const handleAddOffer = async () => {
    if (!newOfferAmount.trim() || !newOfferBuyer.trim()) {
      alert('Please enter offer amount and buyer name');
      return;
    }

    const parsedAmount = parseFloat(newOfferAmount.replace(/[^0-9.]/g, ''));
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      alert('Please enter a valid offer amount');
      return;
    }

    const normalizedNotes = newOfferNotes.trim();

    try {
      const savedOffer = await addMovementOffer(property.id, {
        amount: parsedAmount,
        buyer: newOfferBuyer.trim(),
        status: 'pending',
        submitted_date: new Date().toISOString(),
        notes: normalizedNotes || undefined,
      });

      if (!savedOffer) {
        alert('Failed to save offer. Please try again.');
        return;
      }

      if (normalizedNotes) {
        const createdByDisplay =
          (user?.user_metadata as any)?.name ??
          (user?.app_metadata as any)?.name ??
          property.agent ??
          user?.email ??
          'User';
        await Promise.all([
          updateMovement(property.id, { notes: normalizedNotes }),
          addMovementNote(property.id, normalizedNotes, createdByDisplay),
        ]);
        setNoteHistory((prev) =>
          sortMovementNotes([
            ...prev,
            {
              id: `local-offer-note-${Date.now()}`,
              content: normalizedNotes,
              createdBy: createdByDisplay,
              createdAt: new Date().toISOString(),
            },
          ])
        );
      }

      if (agencyId) {
        await loadMovements(agencyId);
      }

      await refreshOffers();

      setNewOfferAmount('');
      setNewOfferBuyer('');
      setNewOfferNotes('');
      setAddOfferOpen(false);
    } catch (error) {
      console.error('Error adding offer:', error);
      alert('Failed to save offer. Please try again.');
    }
  };

  const handleOfferStatusChange = async (
    offerId: string,
    nextStatus: Extract<PropertyOffer['status'], 'accepted' | 'rejected'>
  ) => {
    if (!offerId || offerId.startsWith('offer-')) {
      await refreshOffers();
      alert('Offer is still syncing. Please try again.');
      return;
    }

    const updated = await updateMovementOffer(offerId, { status: nextStatus });
    if (!updated) {
      alert('Failed to update offer status. Please try again.');
      return;
    }

    setOffers((prev) => prev.map((offer) => (offer.id === offerId ? { ...offer, status: nextStatus } : offer)));

    if (agencyId) {
      await loadMovements(agencyId);
    }
    await refreshOffers();
  };

  const handlePopupStatusChange = (...args: any[]) => {
    const [, nextStatus] = args;
    if (nextStatus) {
      setCurrentStatus(nextStatus);
    }
    onStatusChange?.(...args);
  };

  const handleSaveDetails = async () => {
    console.log('Saving edited details:', editedProperty);
    const normalizedPrice = toFiniteNumber(editedProperty.price, 0);
    let normalizedFeePercentage = toFiniteNumber(editedProperty.feePercentage, 0);
    let normalizedFeeAmount = toFiniteNumber(editedProperty.feeAmount, 0);
    if (feeInputMode === 'amount') {
      normalizedFeePercentage = calculateFeePercentage(
        normalizedPrice,
        normalizedFeeAmount,
        normalizedFeePercentage
      );
    } else {
      normalizedFeeAmount = calculateFeeAmount(
        normalizedPrice,
        normalizedFeePercentage,
        normalizedFeeAmount
      );
    }

    try {
      await updateMovement(property.id, {
        address: editedProperty.address,
        property: editedProperty.description,
        price: normalizedPrice,
        type: editedProperty.type as 'sale' | 'letting',
        agent: editedProperty.agent,
        branch_id: selectedBranchId ?? null,
        board: editedProperty.board,
        fee_percentage: normalizedFeePercentage,
        fee_amount: normalizedFeeAmount,
        motivated_seller: editedProperty.motivatedSeller,
        notes: editedProperty.notes,
      });

      if (agencyId) {
        await loadMovements(agencyId);
      }
    } catch (error) {
      console.error('Error updating movement in Supabase', error);
    }

    setEditedProperty((prev) => ({
      ...prev,
      feePercentage: normalizedFeePercentage,
      feeAmount: normalizedFeeAmount,
    }));
    setIsEditMode(false);
  };

  const handleCancelEdit = () => {
    const match = branchOptions.find((b) => b.name === property.branch);
    if (isBranchManager && branchIdFromMeta) {
      setSelectedBranchId(branchIdFromMeta);
    } else {
      setSelectedBranchId(match?.id ?? null);
    }
    setEditedProperty(buildEditedPropertyState(property));
    setFeeInputMode(getFeeInputModeFromProperty(property));
    setIsEditMode(false);
  };

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || !agencyId) return;
    setDocumentsUploading(true);
    try {
      const folder = movementFolderId ? { id: movementFolderId } : await ensureMovementFolder();
      if (!folder?.id) {
        alert('Unable to create a document folder for this movement.');
        return;
      }
      setMovementFolderId(folder.id);

      const uploads = await Promise.all(
        Array.from(files).map((file) =>
          uploadDocument({
            agencyId,
            clientId: effectiveClientId,
            file,
            name: file.name,
            folderId: folder.id,
            category: 'Movements',
            isPublic: false,
            branchId: selectedBranchId ?? null,
            createdBy: user?.id ?? null,
          })
        )
      );

      if (!uploads.some(Boolean)) {
        alert('Failed to upload document(s).');
        return;
      }

      await loadMovementDocuments(folder.id);
    } finally {
      setDocumentsUploading(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    await handleFileUpload(e.dataTransfer.files);
  };

  const handleDeleteDocument = async (docId: string) => {
    const ok = await deleteHubDocument(docId);
    if (!ok) {
      alert('Failed to delete document.');
      return;
    }
    setDocuments(prev => prev.filter(d => d.id !== docId));
  };

  const handleOpenDocument = async (doc: PropertyDocument) => {
    if (!doc.storage_path) return;
    const url = await getDocumentDownloadUrl(doc.storage_path);
    if (!url) {
      alert('Unable to open document.');
      return;
    }
    window.open(url, '_blank');
  };

  const getDocumentTypeLabel = (doc: PropertyDocument) => {
    if (doc.mime_type) {
      const parts = doc.mime_type.split('/');
      return (parts[1] || parts[0] || 'FILE').toUpperCase();
    }
    const ext = doc.original_filename?.split('.').pop();
    return ext ? ext.toUpperCase() : 'FILE';
  };

  const handleDeleteProperty = async () => {
    console.log('Deleting property:', property.id);

    try {
      await deleteMovement(property.id);
      if (agencyId) {
        await loadMovements(agencyId);
      }
    } catch (error) {
      console.error('Error deleting movement from Supabase', error);
    }

    setDeleteConfirmOpen(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-background rounded-2xl shadow-2xl w-full max-w-4xl h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-card border-b border-border px-6 py-4 flex items-center justify-between">
          <div className="flex-1">
            {isEditMode ? (
              <div className="space-y-2">
                <Input
                  value={editedProperty.address}
                  onChange={(e) => setEditedProperty({ ...editedProperty, address: e.target.value })}
                  className="text-2xl font-bold h-auto py-1 px-2"
                />
                <Input
                  value={editedProperty.description}
                  onChange={(e) => setEditedProperty({ ...editedProperty, description: e.target.value })}
                  className="text-sm h-auto py-1 px-2"
                />
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3 mb-1">
                  <h1 className="text-2xl font-bold text-foreground">
                    {property.address}
                  </h1>
                  <span className="text-sm text-muted-foreground">
                    • Added {new Date(property.date).toLocaleDateString('en-GB', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric'
                    })}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">{property.property}</p>
              </>
            )}
          </div>
          
          <div className="flex items-center gap-3">
            <StatusBadge status={currentStatus} movementId={property.id} movementType={property.type} agencyId={agencyId} onStatusChange={handlePopupStatusChange} />
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

        {/* Property Details Grid */}
        <div className="bg-muted/30 px-6 py-4 border-b border-border">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 text-sm">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Price</p>
              {isEditMode ? (
                <Input
                  type="number"
                  value={editedProperty.price}
                  onChange={(e) => handlePriceInputChange(e.target.value)}
                  className="h-8"
                />
              ) : (
                <p className="text-foreground font-medium">
                  £{property.price.toLocaleString()}
                  {property.type === 'letting' && '/mo'}
                </p>
              )}
            </div>
            
            {(isEditMode || property.motivatedSeller) && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Seller Motivation</p>
                {isEditMode ? (
                  <Select
                    value={editedProperty.motivatedSeller || ''}
                    onValueChange={(value) => setEditedProperty({ ...editedProperty, motivatedSeller: value as any })}
                  >
                    <SelectTrigger className="h-8">
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="green">High</SelectItem>
                      <SelectItem value="yellow">Medium</SelectItem>
                      <SelectItem value="red">Low</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="flex items-center gap-2">
                    <div className={cn(
                      "h-3 w-3 rounded-full",
                      property.motivatedSeller === 'green' ? 'bg-green-500' :
                      property.motivatedSeller === 'yellow' ? 'bg-yellow-500' :
                      'bg-red-500'
                    )} />
                    <span className="text-foreground font-medium capitalize">
                      {property.motivatedSeller === 'green' ? 'High' :
                       property.motivatedSeller === 'yellow' ? 'Medium' :
                       'Low'}
                    </span>
                  </div>
                )}
              </div>
            )}
            
            {(isEditMode || property.board !== undefined) && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Board</p>
                {isEditMode ? (
                  <Select
                    value={editedProperty.board ? 'yes' : 'no'}
                    onValueChange={(value) => setEditedProperty({ ...editedProperty, board: value === 'yes' })}
                  >
                    <SelectTrigger className="h-8">
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="yes">Yes</SelectItem>
                      <SelectItem value="no">No</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <p className="text-foreground font-medium">{property.board ? 'Yes' : 'No'}</p>
                )}
              </div>
            )}
            
            {(isEditMode || property.feePercentage) && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Fee %</p>
                {isEditMode ? (
                  <Input
                    type="number"
                    value={editedProperty.feePercentage}
                    onChange={(e) => handleFeePercentageInputChange(e.target.value)}
                    className="h-8"
                  />
                ) : (
                  <p className="text-foreground font-medium">{property.feePercentage}%</p>
                )}
              </div>
            )}
            
            {(isEditMode || property.feeAmount) && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Fee £</p>
                {isEditMode ? (
                  <Input
                    type="number"
                    value={editedProperty.feeAmount}
                    onChange={(e) => handleFeeAmountInputChange(e.target.value)}
                    className="h-8"
                  />
                ) : (
                  <p className="text-foreground font-medium">£{property.feeAmount.toLocaleString()}</p>
                )}
              </div>
            )}
            
            <div>
              <p className="text-xs text-muted-foreground mb-1">Agent</p>
              {isEditMode ? (
                <Input
                  value={editedProperty.agent}
                  onChange={(e) => setEditedProperty({ ...editedProperty, agent: e.target.value })}
                  className="h-8"
                />
              ) : (
                <p className="text-foreground font-medium">{property.agent}</p>
              )}
            </div>
            
            <div>
              <p className="text-xs text-muted-foreground mb-1">Branch</p>
              {isEditMode ? (
                <Select
                  value={selectedBranchId ?? 'unassigned'}
                  onValueChange={(value) => {
                    if (value === 'unassigned') {
                      setSelectedBranchId(null);
                      return;
                    }
                    setSelectedBranchId(value);
                  }}
                  disabled={branchesLoading || (isBranchManager && !!branchIdFromMeta) || branchOptions.length === 0}
                >
                  <SelectTrigger className="h-8">
                    <SelectValue placeholder={branchesLoading ? 'Loading...' : 'Select branch'} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">Unassigned</SelectItem>
                    {branchOptions.map((branch) => (
                      <SelectItem key={branch.id} value={branch.id}>
                        {branch.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <p className="text-foreground font-medium">{property.branch}</p>
              )}
            </div>
            
            <div>
              <p className="text-xs text-muted-foreground mb-1">Date Added</p>
              <p className="text-foreground font-medium">
                {new Date(property.date).toLocaleDateString('en-GB', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric'
                })}
              </p>
            </div>
          </div>
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
                  value="offers" 
                  className="px-5 py-2.5 text-sm rounded-xl border border-transparent data-[state=active]:border-primary/20 data-[state=active]:bg-primary/5 data-[state=active]:text-primary data-[state=active]:shadow-none hover:bg-accent/50 hover:text-foreground transition-all font-medium text-muted-foreground"
                >
                  Offers
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
                  Documents
                </TabsTrigger>
                <TabsTrigger 
                  value="details" 
                  className="px-5 py-2.5 text-sm rounded-xl border border-transparent data-[state=active]:border-primary/20 data-[state=active]:bg-primary/5 data-[state=active]:text-primary data-[state=active]:shadow-none hover:bg-accent/50 hover:text-foreground transition-all font-medium text-muted-foreground"
                >
                  Edit Details
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-6 min-h-0">
              <TabsContent value="notes" className="mt-0 space-y-6">
                {(pinnedViewingInstructions.notes || pinnedViewingInstructions.arrangement) && (
                  <Card className="border-amber-300 bg-amber-50/80 shadow-sm dark:border-amber-800 dark:bg-amber-950/20">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="rounded-full bg-amber-100 p-2 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                          <AlertTriangleIcon className="h-4 w-4" strokeWidth={1.5} />
                        </div>
                        <div className="min-w-0 flex-1 space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-semibold text-foreground">Pinned Viewing Instructions</p>
                            <span className="rounded-full bg-amber-200 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-amber-800 dark:bg-amber-900/60 dark:text-amber-200">
                              Pinned
                            </span>
                          </div>
                          {pinnedViewingInstructions.arrangement && (
                            <p className="text-xs font-medium text-amber-900/80 dark:text-amber-200">
                              Viewing Arrangements: {getViewingArrangementLabel(pinnedViewingInstructions.arrangement)}
                            </p>
                          )}
                          {pinnedViewingInstructions.notes && (
                            <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                              {pinnedViewingInstructions.notes}
                            </p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

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
                        disabled={!newNote.trim()}
                        size="sm"
                        className="bg-primary text-primary-foreground hover:bg-primary/90"
                      >
                        Add Note
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

              <TabsContent value="offers" className="mt-0 space-y-4">
                {/* Add New Offer Button */}
                <Card className="bg-primary/5 border-primary/20 border-dashed">
                  <CardContent className="p-3">
                    {!addOfferOpen ? (
                      <Button 
                        onClick={() => setAddOfferOpen(true)}
                        variant="ghost"
                        className="w-full text-primary hover:text-primary hover:bg-primary/10"
                      >
                        <PlusIcon className="h-4 w-4 mr-2" strokeWidth={1.5} />
                        Add New Offer
                      </Button>
                    ) : (
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-2">
                            <Label htmlFor="offer-amount" className="text-xs">Offer Amount</Label>
                            <Input
                              id="offer-amount"
                              placeholder="£450,000"
                              value={newOfferAmount}
                              onChange={(e) => setNewOfferAmount(e.target.value)}
                              className="h-9"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="offer-buyer" className="text-xs">Buyer Name</Label>
                            <Input
                              id="offer-buyer"
                              placeholder="John Smith"
                              value={newOfferBuyer}
                              onChange={(e) => setNewOfferBuyer(e.target.value)}
                              className="h-9"
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="offer-notes" className="text-xs">Notes (Optional)</Label>
                          <Textarea
                            id="offer-notes"
                            placeholder="Additional details..."
                            value={newOfferNotes}
                            onChange={(e) => setNewOfferNotes(e.target.value)}
                            className="min-h-[60px] resize-none"
                          />
                        </div>
                        <div className="flex justify-end gap-2">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => {
                              setAddOfferOpen(false);
                              setNewOfferAmount('');
                              setNewOfferBuyer('');
                              setNewOfferNotes('');
                            }}
                          >
                            Cancel
                          </Button>
                          <Button 
                            size="sm"
                            onClick={handleAddOffer}
                            className="bg-primary text-primary-foreground hover:bg-primary/90"
                          >
                            Add Offer
                          </Button>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Existing Offers */}
                {offers && offers.length > 0 ? (
                  <div className="space-y-3">
                    {offers.slice().reverse().map((offer) => {
                      const statusConfig = {
                        pending: { icon: MinusCircleIcon, color: 'text-yellow-600', bg: 'bg-yellow-50', label: 'Pending' },
                        accepted: { icon: CheckCircle2Icon, color: 'text-green-600', bg: 'bg-green-50', label: 'Accepted' },
                        rejected: { icon: XCircleIcon, color: 'text-red-600', bg: 'bg-red-50', label: 'Rejected' },
                        withdrawn: { icon: XCircleIcon, color: 'text-gray-600', bg: 'bg-gray-50', label: 'Withdrawn' }
                      };
                      const config = statusConfig[offer.status];
                      const StatusIcon = config.icon;

                      return (
                        <Card key={offer.id} className={cn("border-l-4 hover:shadow-md transition-shadow", 
                          offer.status === 'accepted' ? 'border-l-green-500' :
                          offer.status === 'rejected' ? 'border-l-red-500' :
                          offer.status === 'withdrawn' ? 'border-l-gray-500' :
                          'border-l-yellow-500'
                        )}>
                          <CardContent className="p-3">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-3">
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-xl font-bold text-foreground">
                                      £{offer.amount.toLocaleString()}
                                    </span>
                                  </div>
                                  <p className="text-xs text-muted-foreground mt-0.5">by {offer.buyer}</p>
                                </div>
                              </div>
                            </div>
                            
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <CalendarIcon className="h-3 w-3" strokeWidth={1.5} />
                                <span>
                                  {new Date(offer.submittedDate).toLocaleDateString('en-GB', {
                                    day: '2-digit',
                                    month: 'short',
                                    year: 'numeric'
                                  })}
                                </span>
                              </div>
                              
                              {offer.status === 'pending' ? (
                                <div className="flex gap-1">
                                  <Button 
                                    size="sm" 
                                    variant="outline"
                                    className="h-7 px-2 text-xs bg-green-50 text-green-700 border-green-200 hover:bg-green-100"
                                    onClick={() => {
                                      void handleOfferStatusChange(offer.id, 'accepted');
                                    }}
                                  >
                                    Accept
                                  </Button>
                                  <Button 
                                    size="sm" 
                                    variant="outline"
                                    className="h-7 px-2 text-xs bg-red-50 text-red-700 border-red-200 hover:bg-red-100"
                                    onClick={() => {
                                      void handleOfferStatusChange(offer.id, 'rejected');
                                    }}
                                  >
                                    Reject
                                  </Button>
                                </div>
                              ) : offer.status === 'accepted' ? (
                                <span className="text-xs font-medium text-green-600 flex items-center gap-1">
                                  <CheckCircle2Icon className="h-3 w-3" strokeWidth={2} />
                                  Accepted
                                </span>
                              ) : offer.status === 'rejected' ? (
                                <span className="text-xs font-medium text-red-600 flex items-center gap-1">
                                  <XCircleIcon className="h-3 w-3" strokeWidth={2} />
                                  Rejected
                                </span>
                              ) : null}
                            </div>
                            
                            {offer.notes && (
                              <div className="mt-2 pt-2 border-t border-border">
                                <p className="text-xs text-foreground">{offer.notes}</p>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <PoundSterlingIcon className="h-12 w-12 text-muted-foreground mx-auto mb-3" strokeWidth={1.5} />
                    <p className="text-muted-foreground">No offers received yet</p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="history" className="mt-0">
                <div className="space-y-4">
                  <h3 className="text-base font-semibold text-foreground">Property Movement History</h3>
                  
                  {statusHistoryLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2Icon className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : propertyMovements.length > 0 ? (
                    <div className="relative space-y-6 pl-6">
                      {/* Vertical connecting line */}
                      <div className="absolute left-[11px] top-2 bottom-2 w-0.5 bg-border" />
                      
                      {propertyMovements.map((mov) => (
                        <div key={mov.id} className="relative">
                          <div className={cn(
                            "absolute -left-[25px] top-1 h-3 w-3 rounded-full border-2 border-background shadow-sm",
                            getStatusColor(mov.status || '')
                          )} />
                          <div>
                            <p className="text-sm font-medium text-foreground">
                              <span className={cn("font-bold capitalize", getStatusTextColor(mov.status || ''))}>{mov.status}</span>
                              {mov.price ? <span className="text-muted-foreground ml-2">£{Number(mov.price).toLocaleString()}</span> : null}
                            </p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {new Date(mov.created_at).toLocaleDateString('en-GB', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                              {mov.agent ? ` by ${mov.agent}` : ' by System'}
                            </p>
                            {mov.notes && (
                              <p className="text-xs text-muted-foreground mt-1 italic">
                                "{mov.notes}"
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : statusHistory.length > 0 ? (
                    <div className="relative space-y-6 pl-6">
                      {/* Vertical connecting line */}
                      <div className="absolute left-[11px] top-2 bottom-2 w-0.5 bg-border" />
                      
                      {statusHistory.map((entry) => (
                        <div key={entry.id} className="relative">
                          <div className={cn(
                            "absolute -left-[25px] top-1 h-3 w-3 rounded-full border-2 border-background shadow-sm",
                            getStatusColor(entry.newStatus)
                          )} />
                          <div>
                            <p className="text-sm font-medium text-foreground">
                              {entry.previousStatus ? (
                                <>Status changed from <span className={cn("font-bold", getStatusTextColor(entry.previousStatus))}>{entry.previousStatus}</span> to </>
                              ) : (
                                <>Status set to </>
                              )}
                              <span className={cn("font-bold", getStatusTextColor(entry.newStatus))}>{entry.newStatus}</span>
                            </p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {new Date(entry.createdAt).toLocaleDateString('en-GB', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })} by {entry.changedByName || 'System'}
                            </p>
                            {entry.notes && (
                              <p className="text-xs text-muted-foreground mt-1 italic">
                                "{entry.notes}"
                              </p>
                            )}
                          </div>
                        </div>
                      ))}

                      {/* Property Added (always show at the bottom) */}
                      <div className="relative">
                        <div className="absolute -left-[25px] top-1 h-3 w-3 rounded-full bg-gray-400 border-2 border-background shadow-sm" />
                        <div>
                          <p className="text-sm font-medium text-foreground">
                            Property Added
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {new Date(property.date).toLocaleDateString('en-GB', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric'
                            })} by System
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="relative space-y-6 pl-6">
                      {/* Vertical connecting line */}
                      <div className="absolute left-[11px] top-2 bottom-2 w-0.5 bg-border" />
                      
                      {/* Current Status */}
                      <div className="relative">
                        <div className={cn(
                          "absolute -left-[25px] top-1 h-3 w-3 rounded-full border-2 border-background shadow-sm",
                          getStatusColor(property.status || '')
                        )} />
                        <div>
                          <p className="text-sm font-medium text-foreground">
                            Current Status: <span className={cn("font-bold", getStatusTextColor(property.status || ''))}>{property.status}</span>
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Assigned to {property.agent}
                          </p>
                        </div>
                      </div>

                      {/* Property Added */}
                      <div className="relative">
                        <div className="absolute -left-[25px] top-1 h-3 w-3 rounded-full bg-gray-400 border-2 border-background shadow-sm" />
                        <div>
                          <p className="text-sm font-medium text-foreground">
                            Property Added
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {new Date(property.date).toLocaleDateString('en-GB', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric'
                            })} by System
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="details" className="mt-0 space-y-6">
                {/* Full Edit Form */}
                <Card className="bg-muted/30 border-border">
                  <CardContent className="p-6 space-y-6">
                    {/* Basic Info */}
                    <div className="space-y-4">
                      <h3 className="text-sm font-semibold text-foreground border-b border-border pb-2">Basic Information</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-foreground">Address</Label>
                          <Input
                            value={editedProperty.address}
                            onChange={(e) => setEditedProperty({ ...editedProperty, address: e.target.value })}
                            className="bg-background"
                            placeholder="Enter property address"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-foreground">Description</Label>
                          <Input
                            value={editedProperty.description}
                            onChange={(e) => setEditedProperty({ ...editedProperty, description: e.target.value })}
                            className="bg-background"
                            placeholder="Property description"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Price & Type */}
                    <div className="space-y-4">
                      <h3 className="text-sm font-semibold text-foreground border-b border-border pb-2">Price & Type</h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label className="text-foreground">Price (£)</Label>
                          <Input
                            type="number"
                            value={editedProperty.price}
                            onChange={(e) => handlePriceInputChange(e.target.value)}
                            className="bg-background"
                            placeholder="Enter price"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-foreground">Type</Label>
                          <Select
                            value={editedProperty.type}
                            onValueChange={(value) => setEditedProperty({ ...editedProperty, type: value })}
                          >
                            <SelectTrigger className="bg-background">
                              <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="sale">Sale</SelectItem>
                              <SelectItem value="letting">Letting</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-foreground">Board</Label>
                          <Select
                            value={editedProperty.board ? 'yes' : 'no'}
                            onValueChange={(value) => setEditedProperty({ ...editedProperty, board: value === 'yes' })}
                          >
                            <SelectTrigger className="bg-background">
                              <SelectValue placeholder="Has board?" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="yes">Yes</SelectItem>
                              <SelectItem value="no">No</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>

                    {/* Fees */}
                    <div className="space-y-4">
                      <h3 className="text-sm font-semibold text-foreground border-b border-border pb-2">Fee Details</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-foreground">Fee Percentage (%)</Label>
                          <Input
                            type="number"
                            step="0.1"
                            value={editedProperty.feePercentage}
                            onChange={(e) => handleFeePercentageInputChange(e.target.value)}
                            className="bg-background"
                            placeholder="Enter fee %"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-foreground">Fee Amount (£)</Label>
                          <Input
                            type="number"
                            value={editedProperty.feeAmount}
                            onChange={(e) => handleFeeAmountInputChange(e.target.value)}
                            className="bg-background"
                            placeholder="Enter fee amount"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Agent & Branch */}
                    <div className="space-y-4">
                      <h3 className="text-sm font-semibold text-foreground border-b border-border pb-2">Assignment</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-foreground">Agent</Label>
                          <Input
                            value={editedProperty.agent}
                            onChange={(e) => setEditedProperty({ ...editedProperty, agent: e.target.value })}
                            className="bg-background"
                            placeholder="Agent name"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-foreground">Branch</Label>
                          <Select
                            value={selectedBranchId ?? 'unassigned'}
                            onValueChange={(value) => {
                              if (value === 'unassigned') {
                                setSelectedBranchId(null);
                                setEditedProperty((prev) => ({ ...prev, branch: '' }));
                                return;
                              }
                              setSelectedBranchId(value);
                              const match = branchOptions.find((b) => b.id === value);
                              setEditedProperty((prev) => ({ ...prev, branch: match?.name ?? '' }));
                            }}
                            disabled={branchesLoading || (isBranchManager && !!branchIdFromMeta) || branchOptions.length === 0}
                          >
                            <SelectTrigger className="bg-background">
                              <SelectValue
                                placeholder={
                                  branchesLoading
                                    ? 'Loading branches...'
                                    : branchOptions.length > 0
                                    ? 'Select branch'
                                    : 'No branches available'
                                }
                              />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="unassigned">Unassigned</SelectItem>
                              {branchOptions.map((branch) => (
                                <SelectItem key={branch.id} value={branch.id}>
                                  {branch.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>

                    {/* Motivation & Notes */}
                    <div className="space-y-4">
                      <h3 className="text-sm font-semibold text-foreground border-b border-border pb-2">Additional Details</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-foreground">Seller Motivation</Label>
                          <Select
                            value={editedProperty.motivatedSeller || 'none'}
                            onValueChange={(value) => setEditedProperty({ ...editedProperty, motivatedSeller: value === 'none' ? '' : value })}
                          >
                            <SelectTrigger className="bg-background">
                              <SelectValue placeholder="Select motivation" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">Not Set</SelectItem>
                              <SelectItem value="green">High (Green)</SelectItem>
                              <SelectItem value="yellow">Medium (Yellow)</SelectItem>
                              <SelectItem value="red">Low (Red)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-foreground">Agency Terms</Label>
                          <Select
                            value={editedProperty.agencyTerms}
                            onValueChange={(value) => setEditedProperty({ ...editedProperty, agencyTerms: value })}
                          >
                            <SelectTrigger className="bg-background">
                              <SelectValue placeholder="Select terms" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Sole">Sole Agency</SelectItem>
                              <SelectItem value="Multi">Multi Agency</SelectItem>
                              <SelectItem value="Joint Sole">Joint Sole</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-foreground">Notes</Label>
                        <Textarea
                          value={editedProperty.notes}
                          onChange={(e) => setEditedProperty({ ...editedProperty, notes: e.target.value })}
                          className="bg-background min-h-[100px]"
                          placeholder="Additional notes about the property..."
                        />
                      </div>
                    </div>

                    {/* Save Button */}
                    <div className="flex justify-end gap-2 pt-4 border-t border-border">
                      <Button 
                        variant="outline" 
                        onClick={handleCancelEdit}
                        className="border-border"
                      >
                        Reset
                      </Button>
                      <Button 
                        onClick={handleSaveDetails}
                        className="bg-primary text-primary-foreground hover:bg-primary/90"
                      >
                        <SaveIcon className="h-4 w-4 mr-2" />
                        Save All Changes
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="documents" className="mt-0 space-y-4">
                {/* Upload Area */}
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={cn(
                    "border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer",
                    isDragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                  )}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    className="hidden"
                    onChange={(e) => handleFileUpload(e.target.files)}
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                  />
                  <UploadCloudIcon className="h-10 w-10 text-muted-foreground mx-auto mb-3" strokeWidth={1.5} />
                  <p className="text-sm font-medium text-foreground mb-1">
                    Drop files here or click to upload
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Supports PDF, DOC, DOCX, JPG, PNG (max 10MB)
                  </p>
                </div>

                {/* Documents List */}
                {documentsLoading || documentsUploading ? (
                  <div className="flex items-center justify-center py-8 text-muted-foreground gap-2">
                    <Loader2Icon className="h-5 w-5 animate-spin" />
                    <span>{documentsUploading ? 'Uploading documents…' : 'Loading documents…'}</span>
                  </div>
                ) : documents.length > 0 ? (
                  <div className="space-y-2">
                    {documents.map((doc) => (
                      <Card key={doc.id} className="bg-card border-border hover:shadow-md transition-shadow">
                        <CardContent className="p-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                                <FileIcon className="h-5 w-5 text-primary" strokeWidth={1.5} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-foreground truncate">{doc.name}</p>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                                  <span>{getDocumentTypeLabel(doc)}</span>
                                  <span>•</span>
                                  <span>{formatFileSize(doc.file_size)}</span>
                                  <span>•</span>
                                  <span>{formatDate(doc.created_at)}</span>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-1">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button 
                                    variant="ghost" 
                                    size="icon"
                                    className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                  >
                                    <MoreHorizontalIcon className="h-4 w-4" strokeWidth={1.5} />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-48">
                                  <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                  <DropdownMenuItem onSelect={() => handleOpenDocument(doc)}>
                                    <EyeIcon className="mr-2 h-4 w-4" /> View
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onSelect={() => handleOpenDocument(doc)}>
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
                                    onSelect={() => handleDeleteDocument(doc.id)}
                                  >
                                    <TrashIcon className="mr-2 h-4 w-4" /> Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <FileTextIcon className="h-12 w-12 text-muted-foreground mx-auto mb-3" strokeWidth={1.5} />
                    <p>No documents uploaded yet</p>
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
            onClick={() => setDeleteConfirmOpen(true)}
          >
            <TrashIcon className="h-4 w-4" strokeWidth={1.5} />
            Delete Property
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
        <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
          <AlertDialogContent className="bg-card text-card-foreground">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-foreground flex items-center gap-2">
                <AlertTriangleIcon className="h-5 w-5 text-destructive" strokeWidth={1.5} />
                Delete Property
              </AlertDialogTitle>
              <AlertDialogDescription className="text-muted-foreground">
                Are you sure you want to delete this property?
                <div className="mt-3 p-3 rounded-lg bg-muted/50 border border-border">
                  <p className="font-semibold text-foreground">{property.address}</p>
                  <p className="text-sm text-muted-foreground mt-1">{property.property}</p>
                </div>
                <p className="mt-3 text-destructive font-medium">
                  This action cannot be undone. All property data, notes, offers, and documents will be permanently removed.
                </p>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="bg-background text-foreground border-border hover:bg-accent">
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction 
                onClick={handleDeleteProperty}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete Property
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
