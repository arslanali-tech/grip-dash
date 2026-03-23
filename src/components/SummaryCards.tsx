import React, { useState, useRef, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUpIcon, FileTextIcon, ClipboardCheckIcon, PoundSterlingIcon, PercentIcon, BanknoteIcon, HandshakeIcon, PlusIcon, GripVerticalIcon, XIcon, SettingsIcon, CheckCircle2Icon } from 'lucide-react';
import { useDashboardStore } from '@/stores/dashboardStore';
import { useBranchGoalsStore } from '@/stores/branchGoalsStore';
import { useAuthStore } from '@/stores/authStore';
import { cn } from '@/lib/utils';
import { calculateMovementRevenue, dedupeMovementsByListing, getMovementIdentityKey, isB2BReferralMovement } from '@/lib/movementMetrics';
import { Progress } from '@/components/ui/progress';
import { Label } from '@/components/ui/label';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';

interface SummaryCardData {
  id: string;
  title: string;
  value: string | number | React.ReactNode;
  icon: React.ElementType;
  iconColor: string;
  progress: number;
  progressColor: string;
  targetValue?: number;
  isCustom?: boolean;
}

const DEFAULT_TARGETS = {
  salesCount: 30,
  salesValue: 1500000,
  instructions: 25,
  valuations: 10,
  exchangedCount: 5,
  avgFee: 2.0,
};

const BASE_SUMMARY_CARD_IDS = [
  'b2b-referrals',
  'total-sales-value',
  'on-books',
  'valuations',
  'exchanged',
  'avg-fee',
];

const SUMMARY_CARDS_STORAGE_PREFIX = 'movements-summary-cards:v1';

interface PersistedCustomCard {
  id: string;
  title: string;
  value: string;
  targetValue: number;
}

interface PersistedSummaryCardsSettings {
  cardOrder?: string[];
  customCards?: PersistedCustomCard[];
  dateRangeFilter?: 'week' | 'month' | 'year';
}

export function SummaryCards() {
  const { user } = useAuthStore();
  const { filteredMovements, agencyId } = useDashboardStore();
  const { goals, fetchGoals } = useBranchGoalsStore();
  const [isEditMode, setIsEditMode] = useState(false);
  const [addCardOpen, setAddCardOpen] = useState(false);
  const [dateRangeFilter, setDateRangeFilter] = useState<'week' | 'month' | 'year'>('month');
  const [customCards, setCustomCards] = useState<SummaryCardData[]>([]);
  const [cardOrder, setCardOrder] = useState<string[]>([...BASE_SUMMARY_CARD_IDS]);
  const [hasLoadedSettings, setHasLoadedSettings] = useState(false);

  const summaryCardsStorageKey = `${SUMMARY_CARDS_STORAGE_PREFIX}:${user?.id ?? 'anonymous'}`;

  useEffect(() => {
    if (agencyId) fetchGoals(agencyId);
  }, [agencyId, fetchGoals]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(summaryCardsStorageKey);
      if (!saved) return;

      const parsed = JSON.parse(saved) as PersistedSummaryCardsSettings;

      if (parsed.dateRangeFilter && ['week', 'month', 'year'].includes(parsed.dateRangeFilter)) {
        setDateRangeFilter(parsed.dateRangeFilter);
      }

      if (Array.isArray(parsed.customCards)) {
        const restoredCards = parsed.customCards
          .filter((card) => !!card?.id && !!card?.title)
          .map((card) => ({
            id: card.id,
            title: card.title,
            value: card.value,
            icon: TrendingUpIcon,
            iconColor: 'text-primary',
            progress: 50,
            progressColor: 'bg-primary',
            targetValue: Number(card.targetValue) || 0,
            isCustom: true,
          }));
        setCustomCards(restoredCards);
      } else {
        setCustomCards([]);
      }

      if (Array.isArray(parsed.cardOrder)) {
        setCardOrder(parsed.cardOrder.filter((id): id is string => typeof id === 'string'));
      } else {
        setCardOrder([...BASE_SUMMARY_CARD_IDS]);
      }
    } catch (error) {
      console.warn('Failed to restore summary card settings', error);
    } finally {
      setHasLoadedSettings(true);
    }
  }, [summaryCardsStorageKey]);

  // Use only the latest movement row per listing to avoid status-history row double counting.
  const latestMovements = useMemo(
    () => dedupeMovementsByListing(filteredMovements),
    [filteredMovements]
  );

  // Total Sales should be the sum of prices for movement rows currently at sale status.

  const totalSalesValue = useMemo(() => {
    return filteredMovements
      .filter((movement) => (movement.status ?? '').trim().toLowerCase() === 'sale')
      .reduce((sum, movement) => sum + (movement.price ?? 0), 0);
  }, [filteredMovements]);
  const valuationProgress = useMemo(() => {
    const valuationKeys = new Set<string>();
    const progressedKeys = new Set<string>();

    filteredMovements.forEach((movement) => {
      const key = getMovementIdentityKey(movement);
      const normalizedStatus = (movement.status ?? '').trim().toLowerCase();
      if (!key || !normalizedStatus) return;

      if (normalizedStatus === 'valuation') {
        valuationKeys.add(key);
        return;
      }

      progressedKeys.add(key);
    });

    let attendedCount = 0;
    valuationKeys.forEach((key) => {
      if (progressedKeys.has(key)) attendedCount += 1;
    });

    return {
      totalValuations: valuationKeys.size,
      attendedValuations: attendedCount,
    };
  }, [filteredMovements]);
  const valuations = valuationProgress.totalValuations;
  const attendedValuations = valuationProgress.attendedValuations;
  const onBooksKeys = useMemo(() => {
    const keys = new Set<string>();
    filteredMovements.forEach((m) => {
      if ((m.status ?? '').toLowerCase() === 'on-books') {
        keys.add(getMovementIdentityKey(m));
      }
    });
    return keys;
  }, [filteredMovements]);
  const onBooksCount = onBooksKeys.size;
  const exchangedKeys = useMemo(() => {
    const keys = new Set<string>();
    filteredMovements.forEach((m) => {
      if ((m.status ?? '').toLowerCase() === 'exchanged') {
        keys.add(getMovementIdentityKey(m));
      }
    });
    return keys;
  }, [filteredMovements]);
  const exchangedCount = exchangedKeys.size;

  // Targets from branch_goals (Supabase); fallback to defaults
  const targets = useMemo(() => {
    const active = goals.filter(g => g.status !== 'cancelled');
    const byType = (type: string) => active.filter(g => g.goal_type === type);
    const maxTarget = (type: string) => {
      const list = byType(type);
      if (list.length === 0) return null;
      return Math.max(...list.map(g => g.target_value));
    };
    return {
      salesCount: maxTarget('instructions') ?? DEFAULT_TARGETS.salesCount,
      salesValue: maxTarget('revenue') ?? DEFAULT_TARGETS.salesValue,
      instructions: maxTarget('instructions') ?? DEFAULT_TARGETS.instructions,
      valuations: maxTarget('valuations') ?? DEFAULT_TARGETS.valuations,
      exchangedCount: maxTarget('completions') ?? DEFAULT_TARGETS.exchangedCount,
      avgFee: DEFAULT_TARGETS.avgFee,
    };
  }, [goals]);

  const calculateProgress = (current: number, target: number) => {
    if (target === 0) return 0;
    const percentageOfTarget = (current / target) * 100;
    return Math.min(percentageOfTarget * 0.8, 100);
  };

  // Card definitions (structure only); values/progress derived from current metrics below
  const cardDefs: Omit<SummaryCardData, 'value' | 'progress'>[] = [
    { id: 'b2b-referrals', title: 'B2B Referrals', icon: TrendingUpIcon, iconColor: 'text-teal-600', progressColor: 'bg-teal-600', targetValue: targets.salesCount },
    { id: 'total-sales-value', title: 'Total Sales £', icon: BanknoteIcon, iconColor: 'text-orange-600', progressColor: 'bg-orange-500', targetValue: targets.salesValue },
    { id: 'on-books', title: 'On Books', icon: FileTextIcon, iconColor: 'text-yellow-600', progressColor: 'bg-yellow-500', targetValue: targets.instructions },
    { id: 'valuations', title: 'Valuations', icon: ClipboardCheckIcon, iconColor: 'text-pink-600', progressColor: 'bg-pink-600', targetValue: targets.valuations },
    { id: 'exchanged', title: 'Exchanged', icon: HandshakeIcon, iconColor: 'text-green-600', progressColor: 'bg-green-600', targetValue: targets.exchangedCount },
    { id: 'avg-fee', title: 'Average Fee', icon: PercentIcon, iconColor: 'text-blue-600', progressColor: 'bg-blue-600', targetValue: targets.avgFee },
  ];

  // Build display cards from current Supabase-backed metrics (so values update when movements load)
  const cards = useMemo((): SummaryCardData[] => {
    const b2bCount = latestMovements.filter(isB2BReferralMovement).length;
    const b2bSum = latestMovements
      .filter(isB2BReferralMovement)
      .reduce((sum, m) => sum + calculateMovementRevenue(m), 0);
    const exchangedValue = filteredMovements
      .filter((m) => (m.status ?? '').toLowerCase() === 'exchanged')
      .reduce((sum, m) => sum + (m.price ?? 0), 0);
    // Average fee should use the best fee info per listing (even if a later status row dropped fee fields).
    const feeByListing = new Map<string, { price: number; fee: number }>();
    filteredMovements.forEach((m) => {
      const price = m.price ?? 0;
      if (price <= 0) return;
      const fee = calculateMovementRevenue(m);
      if (fee <= 0) return;
      const key = getMovementIdentityKey(m);
      const current = feeByListing.get(key);
      if (!current || fee > current.fee) {
        feeByListing.set(key, { price, fee });
      }
    });

    const feeValues = Array.from(feeByListing.values());
    const totalFee = feeValues.reduce((s, v) => s + v.fee, 0);
    const totalPrice = feeValues.reduce((s, v) => s + v.price, 0);
    const avgFeePct = totalPrice > 0 ? (totalFee / totalPrice) * 100 : 0;
    const avgFeeAmount = feeValues.length > 0 ? totalFee / feeValues.length : 0;
    const averageFee = Math.round(avgFeePct * 10) / 10;

    const build = (def: typeof cardDefs[0], value: React.ReactNode, progress: number): SummaryCardData => ({
      ...def,
      value,
      progress,
    });

    return [
      build(cardDefs[0], (
        <div className="flex items-baseline gap-2">
          <span>{b2bCount}</span>
          <span className="text-sm text-muted-foreground font-normal">£{b2bSum.toLocaleString()}</span>
        </div>
      ), calculateProgress(b2bCount, targets.salesCount)),
      build(cardDefs[1], (
        <div className="flex items-baseline gap-2">
          <span>£{totalSalesValue.toLocaleString()}</span>
        </div>
      ), calculateProgress(totalSalesValue, targets.salesValue)),
      build(cardDefs[2], (
        <div className="flex items-baseline gap-2">
          <span>{onBooksCount}</span>
          <span className="text-sm text-muted-foreground font-normal">
            ({valuations > 0 ? ((onBooksCount / valuations) * 100).toFixed(1) : 0}% conversion)
          </span>
        </div>
      ), calculateProgress(onBooksCount, targets.instructions)),
      build(cardDefs[3], (
        <div className="flex items-baseline gap-2">
          <span>{valuations}</span>
          <span className="text-sm text-muted-foreground font-normal">({attendedValuations} attended of {valuations})</span>
        </div>
      ), calculateProgress(valuations, targets.valuations)),
      build(cardDefs[4], (
        <div className="flex items-baseline gap-2">
          <span>{exchangedCount}</span>
          <span className="text-sm text-muted-foreground font-normal">£{exchangedValue.toLocaleString()}</span>
        </div>
      ), calculateProgress(exchangedCount, targets.exchangedCount)),
      build(cardDefs[5], (
        <div className="flex items-baseline gap-2">
          <span>{averageFee}%</span>
          <span className="text-sm text-muted-foreground font-normal">£{Math.round(avgFeeAmount).toLocaleString()}</span>
        </div>
      ), calculateProgress(averageFee, targets.avgFee)),
    ];
  }, [latestMovements, filteredMovements, totalSalesValue, onBooksCount, valuations, attendedValuations, exchangedCount, targets]);

  useEffect(() => {
    const builtInIds = cards.map((c) => c.id);
    const customIds = customCards.map((c) => c.id);
    const validIds = new Set([...builtInIds, ...customIds]);

    setCardOrder((prev) => {
      const deduped = Array.from(new Set(prev.filter((id) => validIds.has(id))));
      const missingBuiltIn = builtInIds.filter((id) => !deduped.includes(id));
      const missingCustom = customIds.filter((id) => !deduped.includes(id));
      const next = [...deduped, ...missingBuiltIn, ...missingCustom];

      if (next.length === prev.length && next.every((id, idx) => id === prev[idx])) {
        return prev;
      }
      return next;
    });
  }, [cards, customCards]);

  useEffect(() => {
    if (!hasLoadedSettings) return;
    try {
      const payload: PersistedSummaryCardsSettings = {
        cardOrder,
        customCards: customCards.map((card) => ({
          id: card.id,
          title: card.title,
          value: typeof card.value === 'number' ? String(card.value) : String(card.value ?? ''),
          targetValue: card.targetValue ?? 0,
        })),
        dateRangeFilter,
      };
      localStorage.setItem(summaryCardsStorageKey, JSON.stringify(payload));
    } catch (error) {
      console.warn('Failed to persist summary card settings', error);
    }
  }, [hasLoadedSettings, summaryCardsStorageKey, cardOrder, customCards, dateRangeFilter]);

  const displayCards = useMemo(() => {
    const all = [...cards, ...customCards];
    const byId = new Map(all.map((card) => [card.id, card]));
    const orderedIds = Array.from(new Set(cardOrder)).filter((id) => byId.has(id));
    return orderedIds
      .map((id) => byId.get(id))
      .filter((card): card is SummaryCardData => !!card);
  }, [cards, customCards, cardOrder]);

  // Drag and Drop Handlers
  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);

  const handleSort = () => {
    if (dragItem.current !== null && dragOverItem.current !== null && dragItem.current !== dragOverItem.current) {
      const ids = displayCards.map(c => c.id);
      const [removed] = ids.splice(dragItem.current, 1);
      ids.splice(dragOverItem.current, 0, removed);
      setCardOrder(ids);
      dragItem.current = null;
      dragOverItem.current = null;
    }
  };

  // Add Custom Card Logic
  const [newCardData, setNewCardData] = useState({
    title: '',
    value: '',
    target: '',
    icon: 'TrendingUpIcon',
  });

  const handleAddCard = () => {
    const newCard: SummaryCardData = {
      id: `custom-${Date.now()}`,
      title: newCardData.title,
      value: newCardData.value,
      icon: TrendingUpIcon,
      iconColor: 'text-primary',
      progress: 50,
      progressColor: 'bg-primary',
      targetValue: parseFloat(newCardData.target) || 0,
      isCustom: true,
    };
    setCustomCards(prev => [...prev, newCard]);
    setCardOrder(prev => [...prev, newCard.id]);
    setAddCardOpen(false);
    setNewCardData({ title: '', value: '', target: '', icon: 'TrendingUpIcon' });
  };

  const handleDeleteCard = (id: string) => {
    setCustomCards(prev => prev.filter(c => c.id !== id));
    setCardOrder(prev => prev.filter(i => i !== id));
  };

  return (
    <TooltipProvider>
      <div className="space-y-2">
        <div className="flex gap-3 overflow-x-auto snap-x snap-mandatory scrollbar-hide pb-2 xl:grid xl:grid-cols-6 xl:gap-4 xl:overflow-visible xl:snap-none xl:pb-0">
          {displayCards.map((card, index) => {
            const Icon = card.icon;
            const delay = `${index * 100}ms`;
            
            // Calculate percentage for tooltip (simplified for custom cards)
            let percentage = 0;
            let isOverTarget = false;
            if (card.targetValue && typeof card.value === 'number') {
               percentage = (card.value / card.targetValue) * 100;
               isOverTarget = percentage > 100;
            } else if (card.targetValue && typeof card.value === 'string') {
               const numVal = parseFloat(card.value.replace(/[^0-9.-]+/g,""));
               if (!isNaN(numVal)) {
                 percentage = (numVal / card.targetValue) * 100;
                 isOverTarget = percentage > 100;
               }
            }

            // Use new design for first card only as demo
            const useNewDesign = index === 0;
            
            return (
              <div
                key={card.id}
                draggable={isEditMode}
                onDragStart={() => (dragItem.current = index)}
                onDragEnter={() => (dragOverItem.current = index)}
                onDragEnd={handleSort}
                onDragOver={(e) => e.preventDefault()}
                className={cn(
                  "relative transition-all duration-200",
                  "snap-center shrink-0 w-[280px] xl:w-auto xl:shrink xl:snap-none",
                  isEditMode && "cursor-move hover:scale-105 opacity-90"
                )}
              >
                {isEditMode && card.isCustom && (
                  <button 
                    onClick={() => handleDeleteCard(card.id)}
                    className="absolute -top-2 -right-2 z-20 bg-destructive text-destructive-foreground rounded-full p-1 shadow-md hover:bg-destructive/90"
                  >
                    <XIcon className="h-3 w-3" />
                  </button>
                )}
                
                {false ? ( // Disable new design for now to keep all cards consistent
                  <Card className={cn(
                    'bg-white dark:bg-card text-card-foreground h-full rounded-2xl shadow-lg border-0',
                    isEditMode && "border-dashed border-2"
                  )}>
                    <CardHeader className="pb-3">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="p-2 rounded-lg bg-gray-100 dark:bg-muted">
                          <Icon className={cn("h-5 w-5", card.iconColor)} strokeWidth={1.5} />
                        </div>
                        <CardTitle className="text-sm font-bold text-gray-900 dark:text-foreground">
                          {card.title}
                        </CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3 pt-0">
                      <div>
                        <p className="text-xs text-gray-500 dark:text-muted-foreground mb-2">
                          {card.title} target: <span className="font-semibold text-gray-700 dark:text-foreground">{card.targetValue?.toLocaleString()}</span>
                        </p>
                        <div className="relative h-2 w-full bg-gray-200 dark:bg-muted rounded-full overflow-hidden">
                          <div 
                            className="h-full transition-all duration-500 rounded-full bg-blue-500"
                            style={{ width: `${Math.min(card.progress, 100)}%` }}
                          />
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-gray-500 dark:text-muted-foreground">Current:</p>
                          <p className="text-2xl font-bold text-blue-600 dark:text-primary">{card.value}</p>
                        </div>
                        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-100 dark:bg-green-900/30">
                          <CheckCircle2Icon className="h-3 w-3 text-green-600 dark:text-green-400" strokeWidth={2} />
                          <span className="text-xs font-semibold text-green-700 dark:text-green-400">On track</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Card 
                        className={cn(
                          'bg-card text-card-foreground h-full border-2 animate-in fade-in-50 slide-in-from-bottom-4 duration-500 hover:shadow-lg transition-all cursor-pointer',
                          isEditMode && "border-dashed",
                          !isEditMode && card.progressColor.replace('bg-', 'border-')
                        )}
                        style={{ animationDelay: delay }}
                      >
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                          <CardTitle className="text-xs font-medium text-foreground flex items-center gap-2">
                            {isEditMode && <GripVerticalIcon className="h-3 w-3 text-muted-foreground" />}
                            {card.title}
                          </CardTitle>
                          <Icon className={cn("h-4 w-4", card.iconColor)} strokeWidth={1.5} />
                        </CardHeader>
                        <CardContent>
                  <div className="text-xl font-semibold text-foreground mb-2">{card.value}</div>
                  <div className="relative h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                            <div 
                              className={cn("h-full transition-all duration-500", card.progressColor)} 
                              style={{ width: `${card.progress}%` }}
                            />
                            <div 
                              className="absolute top-0 bottom-0 w-0.5 bg-black/50 dark:bg-white/50 z-10" 
                              style={{ left: '80%' }}
                            />
                          </div>
                        </CardContent>
                      </Card>
                    </TooltipTrigger>
                    {!isEditMode && (
                      <TooltipContent side="bottom" sideOffset={5} className="bg-popover text-popover-foreground border border-border shadow-lg p-3 z-50">
                        <div className="space-y-1 text-xs">
                          <p className="font-semibold">Target: {card.targetValue?.toLocaleString()}</p>
                          <p className={cn("font-medium", isOverTarget ? "text-success" : "text-muted-foreground")}>
                            {isOverTarget ? `+${(percentage - 100).toFixed(1)}% Over Target` : `${percentage.toFixed(1)}% to Target`}
                          </p>
                        </div>
                      </TooltipContent>
                    )}
                  </Tooltip>
                )}
              </div>
            );
          })}
        </div>

        <div className="flex justify-end gap-2">
          {isEditMode ? (
            <>
              <div className="flex items-center gap-2 mr-4">
                <Label className="text-xs text-muted-foreground">Period:</Label>
                <div className="flex gap-1 bg-muted rounded-lg p-1">
                  <Button
                    size="sm"
                    variant={dateRangeFilter === 'week' ? 'default' : 'ghost'}
                    onClick={() => setDateRangeFilter('week')}
                    className="h-7 px-3 text-xs"
                  >
                    Week
                  </Button>
                  <Button
                    size="sm"
                    variant={dateRangeFilter === 'month' ? 'default' : 'ghost'}
                    onClick={() => setDateRangeFilter('month')}
                    className="h-7 px-3 text-xs"
                  >
                    Month
                  </Button>
                  <Button
                    size="sm"
                    variant={dateRangeFilter === 'year' ? 'default' : 'ghost'}
                    onClick={() => setDateRangeFilter('year')}
                    className="h-7 px-3 text-xs"
                  >
                    Year
                  </Button>
                </div>
              </div>
              <Button size="sm" variant="outline" onClick={() => setAddCardOpen(true)}>
                <PlusIcon className="h-4 w-4 mr-2" /> Add Card
              </Button>
              <Button size="sm" onClick={() => setIsEditMode(false)}>
                Done
              </Button>
            </>
          ) : (
            <Button size="sm" variant="ghost" onClick={() => setIsEditMode(true)} className="text-muted-foreground hover:text-foreground h-8 text-xs">
              <SettingsIcon className="h-3.5 w-3.5 mr-2" /> Customize Cards
            </Button>
          )}
        </div>

        <Dialog open={addCardOpen} onOpenChange={setAddCardOpen}>
          <DialogContent className="sm:max-w-[425px] bg-card text-card-foreground">
            <DialogHeader>
              <DialogTitle className="text-foreground">Add Custom Card</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="title" className="text-right text-foreground">Title</Label>
                <Input id="title" value={newCardData.title} onChange={(e) => setNewCardData({...newCardData, title: e.target.value})} className="col-span-3 bg-background text-foreground" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="value" className="text-right text-foreground">Value</Label>
                <Input id="value" value={newCardData.value} onChange={(e) => setNewCardData({...newCardData, value: e.target.value})} className="col-span-3 bg-background text-foreground" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="target" className="text-right text-foreground">Target</Label>
                <Input id="target" type="number" value={newCardData.target} onChange={(e) => setNewCardData({...newCardData, target: e.target.value})} className="col-span-3 bg-background text-foreground" />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleAddCard} className="bg-primary text-primary-foreground hover:bg-primary/90">Add Card</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}


