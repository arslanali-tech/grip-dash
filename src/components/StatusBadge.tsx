import { useState, useEffect } from 'react';
import { ChevronDownIcon } from 'lucide-react';
import { fetchB2BCompanies } from '@/lib/b2bApi';
import { addMovementNote, addMovementOffer, updateMovement } from '@/lib/dashboardApi';
import { uploadDocumentsToMovement } from '@/lib/movementDocuments';
import { MovementStatus, useDashboardStore } from '@/stores/dashboardStore';
import { useAuthStore } from '@/stores/authStore';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { OfferDialog } from './OfferDialog';
import { ExchangeDialog } from './ExchangeDialog';
import { BackOnDialog } from './BackOnDialog';
import { LegalReferralDialog } from './LegalReferralDialog';
import { PriceChangeDialog } from './PriceChangeDialog';
import { AbortDialog } from './AbortDialog';
import { AmlReferralDialog } from './AmlReferralDialog';
import { LegalSignupDialog } from './LegalSignupDialog';
import { SaleDialog } from './SaleDialog';
import { B2BReferralDialog } from './B2BReferralDialog';
import { OnBooksDialog, type OnBooksDialogSaveData } from './OnBooksDialog';

interface StatusBadgeProps {
  status: MovementStatus;
  movementId: string;
  movementType?: 'sale' | 'letting';
  agencyId?: string;
  onStatusChange?: (movementId: string, newStatus: MovementStatus, offerDetails?: { amount: string; buyer: string; notes: string }, exchangeDetails?: { exchangeDate: string; completionDate: string; invoiceLink?: string; boardCollectionLink?: string; notes: string }, backOnDetails?: { price: string; notes: string }, legalReferralDetails?: { client: string; vendor: string; notes: string }, priceChangeDetails?: { newPrice: string; notes: string }, abortDetails?: { nextStep: string; notes: string }, amlReferralDetails?: { price: string; broker: string; client: string; vendor: string; notes: string }, legalSignupDetails?: { price: string; broker: string; client: string; vendor: string; notes: string }, saleDetails?: { isSplitSale: string; agent: string; agentIds?: string[]; agreedPrice: string; buyerSeller: string; notes: string }) => void;
}

const statusConfig: Record<MovementStatus | 'add-new-offer', { label: string; className: string }> = {
  offer: {
    label: 'Offer',
    className: 'bg-blue-600 text-white hover:bg-blue-700',
  },
  'let-offer': {
    label: 'Let Offer',
    className: 'bg-purple-600 text-white hover:bg-purple-700',
  },
  'on-books': {
    label: 'On Books',
    className: 'bg-yellow-500 text-white hover:bg-yellow-600',
  },
  abort: {
    label: 'Abort',
    className: 'bg-blue-600 text-white hover:bg-blue-700',
  },
  'aml-referral': {
    label: 'AML',
    className: 'bg-teal-600 text-white hover:bg-teal-700',
  },
  'back-on': {
    label: 'Back On',
    className: 'bg-gray-600 text-white hover:bg-gray-700',
  },
  completed: {
    label: 'Completed',
    className: 'bg-purple-600 text-white hover:bg-purple-700',
  },
  exchanged: {
    label: 'Exchanged',
    className: 'bg-green-600 text-white hover:bg-green-700',
  },
  'legal-referral': {
    label: 'Legal',
    className: 'bg-teal-600 text-white hover:bg-teal-700',
  },
  'legal-signup': {
    label: 'Legal Signup',
    className: 'bg-teal-600 text-white hover:bg-teal-700',
  },
  'mortgage-referral': {
    label: 'Mortgage',
    className: 'bg-teal-600 text-white hover:bg-teal-700',
  },
  'mortgage-signup': {
    label: 'Mortgage Signup',
    className: 'bg-teal-600 text-white hover:bg-teal-700',
  },
  'on-books-status': {
    label: 'On Books',
    className: 'bg-yellow-500 text-white hover:bg-yellow-600',
  },
  'price-change': {
    label: 'Price Change (S)',
    className: 'bg-gray-600 text-white hover:bg-gray-700',
  },
  sale: {
    label: 'Sale',
    className: 'bg-orange-500 text-white hover:bg-orange-600',
  },
  valuation: {
    label: 'Valuation',
    className: 'bg-pink-600 text-white hover:bg-pink-700',
  },
  'valuation-referral': {
    label: 'Valuation Referral',
    className: 'bg-gray-600 text-white hover:bg-gray-700',
  },
  'withdrawn-sales': {
    label: 'Withdrawn Sales',
    className: 'bg-gray-600 text-white hover:bg-gray-700',
  },
  let: {
    label: 'Let',
    className: 'bg-cyan-600 text-white hover:bg-cyan-700',
  },
  'back-on-let': {
    label: 'Back On',
    className: 'bg-blue-600 text-white hover:bg-blue-700',
  },
  withdrawn: {
    label: 'Withdrawn',
    className: 'bg-red-600 text-white hover:bg-red-700',
  },
  'add-new-offer': {
    label: 'Add New Offer',
    className: 'bg-primary text-primary-foreground hover:bg-primary/90',
  },
};

const salesStatuses: (MovementStatus | 'add-new-offer')[] = [
  'valuation',
  'on-books',
  'add-new-offer',
  'sale',
  'completed',
  'exchanged',
  'price-change',
  'withdrawn',
  'abort',
];

const lettingsStatuses: (MovementStatus | 'add-new-offer')[] = [
  'valuation',
  'on-books',
  'add-new-offer',
  'let-offer',
  'let',
  'price-change',
  'withdrawn',
];

export function StatusBadge({ status, movementId, onStatusChange, movementType, agencyId }: StatusBadgeProps) {
  const [open, setOpen] = useState(false);
  const [offerDialogOpen, setOfferDialogOpen] = useState(false);
  const [exchangeDialogOpen, setExchangeDialogOpen] = useState(false);
  const [backOnDialogOpen, setBackOnDialogOpen] = useState(false);
  const [legalReferralDialogOpen, setLegalReferralDialogOpen] = useState(false);
  const [priceChangeDialogOpen, setPriceChangeDialogOpen] = useState(false);
  const [abortDialogOpen, setAbortDialogOpen] = useState(false);
  const [amlReferralDialogOpen, setAmlReferralDialogOpen] = useState(false);
  const [legalSignupDialogOpen, setLegalSignupDialogOpen] = useState(false);
  const [saleDialogOpen, setSaleDialogOpen] = useState(false);
  const [b2bReferralDialogOpen, setB2bReferralDialogOpen] = useState(false);
  const [onBooksDialogOpen, setOnBooksDialogOpen] = useState(false);
  const { loadMovements, clientId, movements } = useDashboardStore();
  const { user } = useAuthStore();
  const config = statusConfig[status];
  const movement = movements.find((item) => item.id === movementId);
  const createdByDisplay =
    (user?.user_metadata as any)?.name ??
    (user?.app_metadata as any)?.name ??
    undefined;

  // Check if this is a B2B referral status
  const isB2BReferral = ['mortgage-referral', 'aml-referral', 'legal-referral', 'mortgage-signup', 'legal-signup'].includes(status);

  // Determine which statuses to show based on movement type
  const allStatuses = movementType === 'letting' ? lettingsStatuses : salesStatuses;

  const [b2bCompanies, setB2bCompanies] = useState<Array<{ id: string; name: string; type: string }>>([]);
  useEffect(() => {
    if (!agencyId) return;
    fetchB2BCompanies(agencyId).then(list => setB2bCompanies(list.map(c => ({ id: c.id, name: c.name, type: c.type }))));
  }, [agencyId]);

  const persistStatusNote = async (rawNotes?: string) => {
    const notes = rawNotes?.trim();
    if (!notes) return;
    await Promise.all([
      updateMovement(movementId, { notes }),
      addMovementNote(movementId, notes, createdByDisplay),
    ]);
  };

  const parseNumberInput = (value: string): number | undefined => {
    const normalized = value.replace(/[^0-9.]/g, '').trim();
    if (!normalized) return undefined;
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : undefined;
  };

  const handleStatusChange = (selectedOption: MovementStatus | 'add-new-offer') => {
    if (selectedOption === 'add-new-offer' || selectedOption === 'let-offer') {
      console.log('StatusBadge: Opening offer dialog for movement:', movementId);
      setOfferDialogOpen(true);
      setOpen(false);
    } else if (selectedOption === 'exchanged') {
      setExchangeDialogOpen(true);
      setOpen(false);
    } else if (selectedOption === 'back-on') {
      setBackOnDialogOpen(true);
      setOpen(false);
    } else if (selectedOption === 'legal-referral') {
      setLegalReferralDialogOpen(true);
      setOpen(false);
    } else if (selectedOption === 'price-change') {
      setPriceChangeDialogOpen(true);
      setOpen(false);
    } else if (selectedOption === 'abort') {
      setAbortDialogOpen(true);
      setOpen(false);
    } else if (selectedOption === 'aml-referral') {
      setAmlReferralDialogOpen(true);
      setOpen(false);
    } else if (selectedOption === 'legal-signup') {
      setLegalSignupDialogOpen(true);
      setOpen(false);
    } else if (selectedOption === 'sale') {
      setSaleDialogOpen(true);
      setOpen(false);
    } else if (selectedOption === 'on-books' && status === 'valuation') {
      setOnBooksDialogOpen(true);
      setOpen(false);
    } else if (selectedOption === 'mortgage-referral' || selectedOption === 'aml-referral' || selectedOption === 'legal-referral' || selectedOption === 'mortgage-signup' || selectedOption === 'legal-signup') {
      // All B2B referral types open the same unified dialog
      setB2bReferralDialogOpen(true);
      setOpen(false);
    } else {
      if (onStatusChange) {
        onStatusChange(movementId, selectedOption);
      }
      setOpen(false);
    }
  };

  const handleOfferSave = async (data: {
    amount: number;
    buyer: string;
    status: string;
    submitted_date: string;
    notes?: string;
  }) => {
    const created = await addMovementOffer(movementId, {
      amount: data.amount,
      buyer: data.buyer,
      status: data.status,
      submitted_date: data.submitted_date,
      notes: data.notes,
    });

    if (!created) {
      alert('Failed to save offer. Please try again.');
      return false;
    }

    // Save offer notes to the movement's notes field.
    const updatePayload: Record<string, any> = {};
    const normalizedNotes = data.notes?.trim();
    if (normalizedNotes) {
      updatePayload.notes = normalizedNotes;
    }
    if (Object.keys(updatePayload).length > 0) {
      await updateMovement(movementId, updatePayload);
    }
    if (normalizedNotes) {
      await addMovementNote(movementId, normalizedNotes, createdByDisplay);
    }

    // Reload movements to reflect the new offer row and notes.
    if (agencyId) {
      await loadMovements(agencyId, clientId ?? undefined);
    }
    setOfferDialogOpen(false);
    setOpen(false);
    return true;
  };

  const handleExchangeSave = async (data: { exchangeDate: string; completionDate: string; invoiceLink: string; boardCollectionLink: string; notes: string }) => {
    // Save notes to the movement first so the new movement copy will include them
    await persistStatusNote(data.notes);
    if (onStatusChange) {
      onStatusChange(movementId, 'exchanged', undefined, data);
    }
    setExchangeDialogOpen(false);
  };

  const handleBackOnSave = async (data: { price: string; notes: string }) => {
    await persistStatusNote(data.notes);
    if (onStatusChange) {
      onStatusChange(movementId, 'back-on', undefined, undefined, data);
    }
    setBackOnDialogOpen(false);
  };

  const handleLegalReferralSave = async (data: { client: string; vendor: string; notes: string }) => {
    await persistStatusNote(data.notes);
    if (onStatusChange) {
      onStatusChange(movementId, 'legal-referral', undefined, undefined, undefined, data);
    }
    setLegalReferralDialogOpen(false);
  };

  const handlePriceChangeSave = async (data: { newPrice: string; notes: string }) => {
    await persistStatusNote(data.notes);
    if (onStatusChange) {
      onStatusChange(movementId, 'price-change', undefined, undefined, undefined, undefined, data);
    }
    setPriceChangeDialogOpen(false);
  };

  const handleAbortSave = async (data: { nextStep: string; notes: string }) => {
    await persistStatusNote(data.notes);
    if (onStatusChange) {
      onStatusChange(movementId, 'abort', undefined, undefined, undefined, undefined, undefined, data);
    }
    setAbortDialogOpen(false);
  };

  const handleAmlReferralSave = async (data: { price: string; broker: string; client: string; vendor: string; notes: string }) => {
    await persistStatusNote(data.notes);
    if (onStatusChange) {
      onStatusChange(movementId, 'aml-referral', undefined, undefined, undefined, undefined, undefined, undefined, data);
    }
    setAmlReferralDialogOpen(false);
  };

  const handleLegalSignupSave = async (data: { price: string; broker: string; client: string; vendor: string; notes: string }) => {
    await persistStatusNote(data.notes);
    if (onStatusChange) {
      onStatusChange(movementId, 'legal-signup', undefined, undefined, undefined, undefined, undefined, undefined, undefined, data);
    }
    setLegalSignupDialogOpen(false);
  };

  const handleSaleSave = async (data: { isSplitSale: string; agent: string; agentIds: string[]; agreedPrice: string; buyerSeller: string; notes: string }) => {
    await persistStatusNote(data.notes);
    if (onStatusChange) {
      onStatusChange(movementId, 'sale', undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, data);
    }
    setSaleDialogOpen(false);
  };

  const handleOnBooksSave = async (data: OnBooksDialogSaveData) => {
    const updatePayload: Record<string, any> = {};
    const normalizedAddress = data.address.trim();
    const normalizedProperty = data.property.trim();
    const normalizedAgent = data.agent.trim();
    const normalizedViewingNotes = data.viewingNotes.trim();
    const parsedPrice = parseNumberInput(data.price);
    const parsedFeeAmount = parseNumberInput(data.feeAmount);
    const parsedFeePercentage = parseNumberInput(data.feePercentage);

    if (normalizedAddress) updatePayload.address = normalizedAddress;
    if (normalizedProperty) updatePayload.property = normalizedProperty;
    if (normalizedAgent) updatePayload.agent = normalizedAgent;
    if (parsedPrice !== undefined) updatePayload.price = parsedPrice;
    if (parsedFeeAmount !== undefined) updatePayload.fee_amount = parsedFeeAmount;
    if (parsedFeePercentage !== undefined) updatePayload.fee_percentage = parsedFeePercentage;
    updatePayload.viewing_arrangements = data.viewingArrangement || null;
    updatePayload.viewing_notes = normalizedViewingNotes || null;
    if (data.motivatedSeller) updatePayload.motivated_seller = data.motivatedSeller;
    updatePayload.board = data.board === 'yes';

    if (Object.keys(updatePayload).length > 0) {
      const updatedMovement = await updateMovement(movementId, updatePayload);
      if (!updatedMovement) {
        alert('Failed to update On Books details. Please try again.');
        return;
      }
    }

    const normalizedNotes = data.notes.trim();
    const existingNotes = movement?.notes?.trim() ?? '';
    const shouldPersistNewNote = normalizedNotes.length > 0 && normalizedNotes !== existingNotes;
    if (shouldPersistNewNote) {
      await persistStatusNote(normalizedNotes);
    }

    if (onStatusChange) {
      const onBooksDetails = normalizedNotes
        ? { amount: '', buyer: '', notes: normalizedNotes }
        : undefined;
      onStatusChange(movementId, 'on-books', onBooksDetails);
    }

    setOnBooksDialogOpen(false);
  };

  const handleB2BReferralSave = (data: {
    referredTo: string;
    propertyAddress: string;
    transactionType: string;
    date: string;
    link: string;
    documents: File[];
    contactName: string;
    notes: string;
  }) => {
    console.log('StatusBadge: Received B2B referral data from dialog:', data);
    void (async () => {
      const normalizedNotes = data.notes?.trim();
      if (normalizedNotes) {
        await persistStatusNote(normalizedNotes);
      }

      const filesToUpload = Array.isArray(data.documents) ? data.documents : [];
      if (agencyId && filesToUpload.length > 0) {
        const uploadResult = await uploadDocumentsToMovement({
          agencyId,
          movementId,
          files: filesToUpload,
          clientId: clientId ?? undefined,
          createdBy: user?.id ?? null,
        });

        if (uploadResult.uploadedCount === 0) {
          alert('Status updated, but failed to upload documents.');
        } else if (uploadResult.failedCount > 0) {
          alert(
            `Status updated. Uploaded ${uploadResult.uploadedCount}/${filesToUpload.length} documents.`
          );
        }
      }

      if (agencyId) {
        await loadMovements(agencyId, clientId ?? undefined);
      }
    })();

    if (onStatusChange) {
      // Use mortgage-referral as the default status, but this could be dynamic based on company type
      onStatusChange(movementId, 'mortgage-referral');
    }
    setB2bReferralDialogOpen(false);
  };
  
  // If config is missing, fallback to a default
  const displayConfig = config || { label: status, className: 'bg-gray-600 text-white' };

  return (
    <>
      <OfferDialog
        open={offerDialogOpen}
        onOpenChange={setOfferDialogOpen}
        onSave={handleOfferSave}
        movementId={movementId}
        movementType={movementType}
      />
      <ExchangeDialog
        open={exchangeDialogOpen}
        onOpenChange={setExchangeDialogOpen}
        onSave={handleExchangeSave}
        movementId={movementId}
      />
      <BackOnDialog
        open={backOnDialogOpen}
        onOpenChange={setBackOnDialogOpen}
        onSave={handleBackOnSave}
        movementId={movementId}
      />
      <LegalReferralDialog
        open={legalReferralDialogOpen}
        onOpenChange={setLegalReferralDialogOpen}
        onSave={handleLegalReferralSave}
        movementId={movementId}
      />
      <PriceChangeDialog
        open={priceChangeDialogOpen}
        onOpenChange={setPriceChangeDialogOpen}
        onSave={handlePriceChangeSave}
        movementId={movementId}
      />
      <AbortDialog
        open={abortDialogOpen}
        onOpenChange={setAbortDialogOpen}
        onSave={handleAbortSave}
        movementId={movementId}
      />
      <AmlReferralDialog
        open={amlReferralDialogOpen}
        onOpenChange={setAmlReferralDialogOpen}
        onSave={handleAmlReferralSave}
        movementId={movementId}
      />
      <LegalSignupDialog
        open={legalSignupDialogOpen}
        onOpenChange={setLegalSignupDialogOpen}
        onSave={handleLegalSignupSave}
        movementId={movementId}
      />
      <SaleDialog
        open={saleDialogOpen}
        onOpenChange={setSaleDialogOpen}
        onSave={handleSaleSave}
        movementId={movementId}
      />
      <OnBooksDialog
        open={onBooksDialogOpen}
        onOpenChange={setOnBooksDialogOpen}
        movementId={movementId}
        movement={movement}
        onSave={handleOnBooksSave}
      />

      <B2BReferralDialog
        open={b2bReferralDialogOpen}
        onOpenChange={setB2bReferralDialogOpen}
        onSave={handleB2BReferralSave}
        movementId={movementId}
        availableCompanies={b2bCompanies}
      />
      
      <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button
          className={cn(
            'inline-flex items-center justify-center relative rounded-md px-3 py-1 text-xs font-medium transition-all hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 w-[130px] shadow-sm',
            displayConfig.className
          )}
        >
          <span className="text-center truncate px-2">{displayConfig.label}</span>
          <ChevronDownIcon className="h-3 w-3 opacity-60 absolute right-2" strokeWidth={2.5} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="bg-popover text-popover-foreground max-h-[400px] overflow-y-auto w-[220px]">
        {allStatuses.map((statusOption) => {
          const optionConfig = statusConfig[statusOption];
          return (
            <DropdownMenuItem
              key={statusOption}
              onClick={() => handleStatusChange(statusOption)}
              className="text-foreground hover:bg-accent hover:text-accent-foreground cursor-pointer"
            >
              {statusOption === 'add-new-offer' ? (
                <span className="mr-2 inline-block h-2.5 w-2.5 rounded-full bg-blue-500" />
              ) : (
                <span
                  className={cn(
                    'mr-2 inline-block h-2 w-2 rounded-sm',
                    optionConfig.className
                  )}
                />
              )}
              {optionConfig.label}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
    </>
  );
}
