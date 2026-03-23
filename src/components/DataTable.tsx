import React, { useEffect, useState } from 'react';
import { ArrowUpDownIcon, MoreHorizontalIcon } from 'lucide-react';
import { PropertyDetailView } from './PropertyDetailView';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { StatusBadge } from './StatusBadge';
import { useDashboardStore, Movement, MovementStatus } from '@/stores/dashboardStore';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { Card, CardContent } from '@/components/ui/card';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

type SortField = 'property' | 'price' | 'date' | 'status' | 'createdAt';
type SortDirection = 'asc' | 'desc';

const normalizeMovementKeyPart = (value: string | null | undefined): string =>
  (value ?? '').trim().toLowerCase();

const getMovementGroupKey = (movement: Pick<Movement, 'address' | 'property' | 'type'>): string => {
  const address = normalizeMovementKeyPart(movement.address);
  const property = normalizeMovementKeyPart(movement.property);
  const type = normalizeMovementKeyPart(movement.type);
  return `${address}|${property}|${type}`;
};

const getOfferTimestamp = (offer: NonNullable<Movement['offers']>[number]): number => {
  const parsed = new Date(offer.submittedDate).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
};

const formatCurrency = (value: number): string => `\u00A3${value.toLocaleString()}`;

const statusHoverColors: Record<MovementStatus, string> = {
  offer: 'hover:bg-[#4169E1]/10',
  'let-offer': 'hover:bg-[#9370DB]/10',
  'on-books': 'hover:bg-[#FFB800]/10',
  abort: 'hover:bg-[#4169E1]/10',
  'aml-referral': 'hover:bg-teal-50 dark:hover:bg-teal-950/20',
  'back-on': 'hover:bg-muted/50',
  completed: 'hover:bg-[#9370DB]/10',
  exchanged: 'hover:bg-[#2E8B57]/10',
  'legal-referral': 'hover:bg-teal-50 dark:hover:bg-teal-950/20',
  'legal-signup': 'hover:bg-teal-50 dark:hover:bg-teal-950/20',
  'mortgage-referral': 'hover:bg-teal-50 dark:hover:bg-teal-950/20',
  'mortgage-signup': 'hover:bg-teal-50 dark:hover:bg-teal-950/20',
  'on-books-status': 'hover:bg-[#FFB800]/10',
  'price-change': 'hover:bg-muted/50',
  sale: 'hover:bg-[#FF6347]/10',
  valuation: 'hover:bg-[#EC4899]/10',
  'valuation-referral': 'hover:bg-muted/50',
  'withdrawn-sales': 'hover:bg-muted/50',
  let: 'hover:bg-[#00CED1]/10',
  'back-on-let': 'hover:bg-[#4169E1]/10',
  withdrawn: 'hover:bg-destructive/10',
};

export function DataTable() {
  const isMobile = useIsMobile();
  const { filteredMovements, movements, updateMovementStatus, agencyId } = useDashboardStore();
  const [sortField, setSortField] = useState<SortField>('createdAt');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [selectedProperty, setSelectedProperty] = useState<Movement | null>(null);
  const [displayCount, setDisplayCount] = useState(isMobile ? 10 : 12); // Adjust initial display count for mobile

  useEffect(() => {
    if (!selectedProperty) return;
    const refreshed = filteredMovements.find((movement) => movement.id === selectedProperty.id);
    if (refreshed && refreshed !== selectedProperty) {
      setSelectedProperty(refreshed);
    }
  }, [filteredMovements, selectedProperty]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const latestOfferByGroup = React.useMemo(() => {
    const latestOffers = new Map<string, NonNullable<Movement['offers']>[number]>();

    movements.forEach((movement) => {
      const groupKey = getMovementGroupKey(movement);
      if (!groupKey) return;

      (movement.offers ?? []).forEach((offer) => {
        const currentLatest = latestOffers.get(groupKey);
        if (!currentLatest || getOfferTimestamp(offer) >= getOfferTimestamp(currentLatest)) {
          latestOffers.set(groupKey, offer);
        }
      });
    });

    return latestOffers;
  }, [movements]);

  const getLatestOffer = (movement: Movement) =>
    movement.offers?.[0] ?? latestOfferByGroup.get(getMovementGroupKey(movement));

  const getDisplayPrice = (movement: Movement) => {
    const latestOffer = getLatestOffer(movement);
    const isOfferStage = movement.status === 'offer' || movement.status === 'let-offer';

    if (
      isOfferStage &&
      typeof latestOffer?.amount === 'number' &&
      Number.isFinite(latestOffer.amount) &&
      latestOffer.amount > 0
    ) {
      return latestOffer.amount;
    }

    return movement.price;
  };

  const sortedMovements = React.useMemo(() => {
    return [...filteredMovements].sort((a, b) => {
      let comparison = 0;
      
      switch (sortField) {
        case 'property':
          comparison = a.property.localeCompare(b.property);
          break;
        case 'price':
          comparison = getDisplayPrice(a) - getDisplayPrice(b);
          break;
        case 'date':
          comparison = new Date(a.date).getTime() - new Date(b.date).getTime();
          break;
        case 'status':
          comparison = a.status.localeCompare(b.status);
          break;
        case 'createdAt':
          comparison =
            new Date(a.createdAt || a.date).getTime() -
            new Date(b.createdAt || b.date).getTime();
          break;
      }
      
      // For ties, use created_at as tiebreaker so newer rows stay on top.
      if (comparison === 0 && a.createdAt && b.createdAt) {
        comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      }
      
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [filteredMovements, sortField, sortDirection, latestOfferByGroup]);

  const displayedMovements = React.useMemo(() => {
    return sortedMovements.slice(0, displayCount);
  }, [sortedMovements, displayCount]);

  const hasMore = sortedMovements.length > displayCount;

  const handleLoadMore = () => {
    setDisplayCount(prev => prev + (isMobile ? 10 : 12)); // Load more based on device
  };

  if (sortedMovements.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-border bg-card p-12 text-center">
        <img
          src="https://c.animaapp.com/mjhelv55slzlFZ/img/ai_2.png"
          alt="empty state illustration"
          className="mb-6 h-48 w-auto object-contain"
          loading="lazy"
        />
        <h3 className="mb-2 font-heading text-xl font-semibold text-foreground">
          No movements found
        </h3>
        <p className="text-muted-foreground">
          Try adjusting your filters or search query
        </p>
      </div>
    );
  }


  return (
    <TooltipProvider>
      {selectedProperty && (
        <PropertyDetailView 
          property={selectedProperty} 
          onClose={() => setSelectedProperty(null)}
          onStatusChange={updateMovementStatus}
        />
      )}
      
      <Card className="rounded-lg border border-border bg-card">
        {isMobile ? (
          <div className="flex flex-col gap-3 p-3">
            {displayedMovements.map((movement) => (
              <Card
                key={movement.id}
                onClick={() => setSelectedProperty(movement)}
                className={cn(
                  'bg-card text-card-foreground cursor-pointer transition-colors duration-150 hover:shadow-lg',
                  statusHoverColors[movement.status]
                )}
              >
                <CardContent className="p-4">
                  <div className="flex flex-col items-start mb-2">
                    <p className="text-base font-medium text-foreground line-clamp-2">
                      {movement.address}
                    </p>
                    <p className="text-sm font-semibold text-foreground mt-1">
                      {formatCurrency(getDisplayPrice(movement))}
                      {movement.type === 'letting' && '/mo'}
                    </p>
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground mt-3 pt-3 border-t border-border">
                    <span>
                      {new Date(movement.date).toLocaleDateString('en-GB', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric'
                      })}
                    </span>
                    <StatusBadge
                      status={movement.status}
                      movementId={movement.id}
                      movementType={movement.type}
                      agencyId={agencyId}
                      onStatusChange={(id, newStatus, offerDetails, exchangeDetails, backOnDetails, legalReferralDetails, priceChangeDetails, abortDetails, amlReferralDetails, legalSignupDetails, saleDetails) => updateMovementStatus(id, newStatus, offerDetails, exchangeDetails, backOnDetails, legalReferralDetails, priceChangeDetails, abortDetails, amlReferralDetails, legalSignupDetails, saleDetails)}
                    />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <div className="min-w-max">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableHead className="text-foreground text-center">
                    <Button
                      variant="ghost"
                      onClick={() => handleSort('date')}
                      className="bg-transparent text-foreground hover:bg-accent hover:text-accent-foreground w-full justify-center"
                    >
                      Date
                      <ArrowUpDownIcon className="ml-2 h-4 w-4" strokeWidth={1.5} />
                    </Button>
                  </TableHead>
                  <TableHead className="text-foreground text-center">
                    <Button
                      variant="ghost"
                      onClick={() => handleSort('status')}
                      className="bg-transparent text-foreground hover:bg-accent hover:text-accent-foreground w-full justify-center"
                    >
                      Status
                      <ArrowUpDownIcon className="ml-2 h-4 w-4" strokeWidth={1.5} />
                    </Button>
                  </TableHead>
                  <TableHead className="text-foreground text-left">
                    <Button
                      variant="ghost"
                      onClick={() => handleSort('property')}
                      className="bg-transparent text-foreground hover:bg-accent hover:text-accent-foreground w-full justify-start"
                    >
                      Property
                      <ArrowUpDownIcon className="ml-2 h-4 w-4" strokeWidth={1.5} />
                    </Button>
                  </TableHead>
                  <TableHead className="text-foreground text-left">Description</TableHead>
                  <TableHead className="text-foreground text-left">Type</TableHead>
                  <TableHead className="text-foreground text-left">
                    <Button
                      variant="ghost"
                      onClick={() => handleSort('price')}
                      className="bg-transparent text-foreground hover:bg-accent hover:text-accent-foreground w-full justify-start"
                    >
                      Price
                      <ArrowUpDownIcon className="ml-2 h-4 w-4" strokeWidth={1.5} />
                    </Button>
                  </TableHead>
                  <TableHead className="text-foreground text-left">Fee £</TableHead>
                  <TableHead className="text-foreground text-left">Fee %</TableHead>
                  <TableHead className="text-foreground text-left">Board</TableHead>
                  <TableHead className="text-foreground text-left">TR (days)</TableHead>
                  <TableHead className="text-foreground text-left">SM</TableHead>
                  <TableHead className="text-foreground text-left">Notes</TableHead>
                  <TableHead className="text-foreground text-left">Agent</TableHead>
                  <TableHead className="text-foreground text-left">Branch</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayedMovements.map((movement) => {
                  const latestOffer = getLatestOffer(movement);
                  const displayPrice = getDisplayPrice(movement);
                  const offerAmountLabel =
                    latestOffer && latestOffer.amount > 0
                      ? `${formatCurrency(latestOffer.amount)}${movement.type === 'letting' ? '/mo' : ''}`
                      : null;
                  return (
                  <TableRow
                    key={movement.id}
                    onClick={() => setSelectedProperty(movement)}
                    className={cn(
                      'transition-colors duration-150 cursor-pointer',
                      statusHoverColors[movement.status]
                    )}
                  >
                    <TableCell className="font-medium text-muted-foreground text-center">
                      {new Date(movement.date).toLocaleDateString('en-GB', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric'
                      })}
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()} className="text-center">
                      <div className="flex justify-center">
                        <StatusBadge
                          status={movement.status}
                          movementId={movement.id}
                          movementType={movement.type}
                          agencyId={agencyId}
                          onStatusChange={(id, newStatus, offerDetails, exchangeDetails, backOnDetails, legalReferralDetails, priceChangeDetails, abortDetails, amlReferralDetails, legalSignupDetails, saleDetails) => updateMovementStatus(id, newStatus, offerDetails, exchangeDetails, backOnDetails, legalReferralDetails, priceChangeDetails, abortDetails, amlReferralDetails, legalSignupDetails, saleDetails)}
                        />
                      </div>
                    </TableCell>
                    <TableCell className="font-medium text-foreground text-left">
                      {['mortgage-referral', 'aml-referral', 'legal-referral', 'mortgage-signup', 'legal-signup'].includes(movement.status) 
                        ? movement.address
                        : movement.address}
                    </TableCell>
                    <TableCell className="font-medium text-muted-foreground text-left">
                      {['mortgage-referral', 'aml-referral', 'legal-referral', 'mortgage-signup', 'legal-signup'].includes(movement.status) 
                        ? <span className="text-sm">{movement.property}</span>
                        : movement.property}
                    </TableCell>
                    <TableCell className="font-medium text-foreground text-left">
                      {['mortgage-referral', 'aml-referral', 'legal-referral', 'mortgage-signup', 'legal-signup'].includes(movement.status) 
                        ? '-'
                        : <span className="capitalize">{movement.type}</span>}
                    </TableCell>
                    <TableCell className="font-medium text-foreground text-left">
                      {['mortgage-referral', 'aml-referral', 'legal-referral', 'mortgage-signup', 'legal-signup'].includes(movement.status) 
                        ? '-'
                        : (
                          <div className="flex items-center gap-2">
                            <span>
                              {formatCurrency(displayPrice)}
                              {movement.type === 'letting' && '/mo'}
                            </span>
                            {latestOffer && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700 cursor-help">
                                    {offerAmountLabel ? `Offer ${offerAmountLabel}` : 'Offer'}
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent className="bg-popover text-popover-foreground border border-border shadow-lg">
                                  <p className="text-sm">Offer Amount: {formatCurrency(latestOffer.amount ?? 0)}</p>
                                  {latestOffer.buyer && <p className="text-xs">Buyer: {latestOffer.buyer}</p>}
                                  {latestOffer.notes && <p className="text-xs">Notes: {latestOffer.notes}</p>}
                                </TooltipContent>
                              </Tooltip>
                            )}
                          </div>
                        )}
                    </TableCell>
                    <TableCell className="font-medium text-foreground text-left">
                      {movement.feeAmount ? formatCurrency(movement.feeAmount) : '-'}
                    </TableCell>
                    <TableCell className="font-medium text-foreground text-left">
                      {['mortgage-referral', 'aml-referral', 'legal-referral', 'mortgage-signup', 'legal-signup'].includes(movement.status) 
                        ? '-'
                        : (movement.feePercentage ? `${movement.feePercentage}%` : '-')}
                    </TableCell>
                    <TableCell className="font-medium text-foreground text-left">
                      {['mortgage-referral', 'aml-referral', 'legal-referral', 'mortgage-signup', 'legal-signup'].includes(movement.status) 
                        ? '-'
                        : (movement.board ? 'Yes' : 'No')}
                    </TableCell>
                    <TableCell className="font-medium text-foreground text-left">
                      {['mortgage-referral', 'aml-referral', 'legal-referral', 'mortgage-signup', 'legal-signup'].includes(movement.status) 
                        ? '-'
                        : (() => {
                            const onBooksDate = new Date(movement.date);
                            const today = new Date();
                            const agencyPeriodDays = 98;
                            const endDate = new Date(onBooksDate);
                            endDate.setDate(endDate.getDate() + agencyPeriodDays);
                            
                            const daysRemaining = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                            
                            if (daysRemaining < 0) {
                              return <span className="text-red-600 font-semibold">-{Math.abs(daysRemaining)}</span>;
                            } else if (daysRemaining <= 7) {
                              return <span className="text-red-600 font-semibold">{daysRemaining}</span>;
                            } else if (daysRemaining <= 14) {
                              return <span className="text-orange-600 font-semibold">{daysRemaining}</span>;
                            } else {
                              return <span className="text-foreground">{daysRemaining}</span>;
                            }
                          })()}
                    </TableCell>
                    <TableCell className="font-medium text-foreground text-left">
                      {['mortgage-referral', 'aml-referral', 'legal-referral', 'mortgage-signup', 'legal-signup'].includes(movement.status) 
                        ? '-'
                        : (movement.motivatedSeller ? (
                            <div className="flex items-center gap-2">
                              <div className={cn(
                                "h-3 w-3 rounded-full",
                                movement.motivatedSeller === 'green' ? 'bg-green-500' :
                                movement.motivatedSeller === 'yellow' ? 'bg-yellow-500' :
                                'bg-red-500'
                              )} />
                              <span className="capitalize">
                                {movement.motivatedSeller === 'green' ? 'High' :
                                 movement.motivatedSeller === 'yellow' ? 'Medium' :
                                 'Low'}
                              </span>
                            </div>
                          ) : '-')}
                    </TableCell>
                    <TableCell className="font-medium text-foreground text-left">
                      {movement.notes ? (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className={cn(
                              "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border cursor-help transition-colors",
                              movement.hasNewNote 
                                ? "bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-800 hover:bg-red-100 dark:hover:bg-red-900/40"
                                : "bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/40"
                            )}>
                              <div className={cn(
                                "h-1.5 w-1.5 rounded-full animate-pulse",
                                movement.hasNewNote ? "bg-red-500" : "bg-blue-500"
                              )} />
                              <span className={cn(
                                "text-xs font-medium",
                                movement.hasNewNote 
                                  ? "text-red-700 dark:text-red-400" 
                                  : "text-blue-700 dark:text-blue-400"
                              )}>View</span>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent 
                            side="top" 
                            className="max-w-[400px] bg-popover text-popover-foreground border border-border shadow-lg p-4"
                          >
                            <div className="space-y-2">
                              <p className="text-xs font-semibold text-foreground">Property Notes</p>
                              <p className="text-sm whitespace-normal leading-relaxed">{movement.notes}</p>
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      ) : (
                        <span className="text-muted-foreground text-xs">-</span>
                      )}
                    </TableCell>
                    <TableCell className="font-medium text-foreground text-left">{movement.agent}</TableCell>
                    <TableCell className="font-medium text-muted-foreground text-left">{movement.branch}</TableCell>
                  </TableRow>
                  );
                })}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
        
        {hasMore && (
          <div className="flex justify-center p-4 border-t border-border">
            <Button
              onClick={handleLoadMore}
              variant="outline"
              className="bg-background text-foreground border-border hover:bg-accent hover:text-accent-foreground"
            >
              Load More
            </Button>
          </div>
        )}
      </Card>
    </TooltipProvider>
  );
}
